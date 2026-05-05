// better-sqlite3 singleton with migrations, WAL pragmas, and retention helpers.
// Every caller goes through getDb(); tests pass { dbPath: ':memory:' } for isolation.

import Database, { type Database as DbType } from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type GetDbOptions = {
  dbPath?: string;
};

let instance: DbType | null = null;

function defaultPath(): string {
  return process.env['DATABASE_URL'] ?? './data/app.sqlite';
}

function runMigrations(db: DbType): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS server_status (
      id TEXT PRIMARY KEY,
      online INTEGER NOT NULL,
      players INTEGER,
      max_players INTEGER,
      map TEXT,
      ping INTEGER,
      raw_json TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT NOT NULL,
      online INTEGER NOT NULL,
      players INTEGER,
      captured_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_status_history_server_captured
      ON status_history (server_id, captured_at);

    CREATE TABLE IF NOT EXISTS members (
      steamid TEXT PRIMARY KEY,
      persona TEXT,
      avatar TEXT,
      state INTEGER,
      game_id TEXT,
      game_name TEXT,
      last_logoff INTEGER,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS servers (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      host       TEXT NOT NULL,
      port       INTEGER NOT NULL,
      protocol   TEXT NOT NULL,
      hidden     INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

export function getDb(options?: GetDbOptions): DbType {
  if (instance) return instance;

  const dbPath = options?.dbPath ?? defaultPath();

  if (dbPath !== ':memory:') {
    try {
      mkdirSync(dirname(dbPath), { recursive: true });
    } catch {
      // parent may already exist or be unwritable — let Database() throw with a clearer message
    }
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  runMigrations(db);
  instance = db;
  return db;
}

export function closeDb(): void {
  if (instance) {
    try {
      instance.close();
    } catch {
      // closing a broken handle — swallow
    }
    instance = null;
  }
}

export function withTransaction<T>(fn: () => T): T {
  const db = getDb();
  const tx = db.transaction(fn);
  return tx();
}

const LAST_POLL_KEY = 'poller.lastPollAt';

export function lastPollAt(): number | null {
  const db = getDb();
  const row = db.prepare(`SELECT value FROM meta WHERE key = ?`).get(LAST_POLL_KEY) as
    | { value: string }
    | undefined;
  if (!row) return null;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : null;
}

export function setLastPollAt(ms: number): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(LAST_POLL_KEY, String(ms));
}

export function getMetaFlag(key: string): boolean {
  const db = getDb();
  const row = db.prepare(`SELECT value FROM meta WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  return row?.value === '1';
}

export function setMetaFlag(key: string, value: boolean): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value ? '1' : '0');
}

export function pruneStatusHistory(retentionHours = 72): number {
  const db = getDb();
  const cutoff = Date.now() - retentionHours * 60 * 60 * 1000;
  const result = db.prepare(`DELETE FROM status_history WHERE captured_at < ?`).run(cutoff);
  return Number(result.changes ?? 0);
}
