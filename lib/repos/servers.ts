import { getDb, withTransaction } from '../db';
import type { Protocol } from '../types/servers.js';

export type ServerRow = {
  id: string;
  name: string;
  host: string;
  port: number;
  game_id: string | null;
  hidden: number;
  created_at: number;
  updated_at: number;
};

export type ServerRowWithGame = ServerRow & {
  protocol: Protocol | null;
  game_name: string | null;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateId(name: string): string {
  const db = getDb();
  const base = slugify(name);
  const existing = db
    .prepare(`SELECT id FROM servers WHERE id = ? OR id LIKE ?`)
    .all(base, `${base}-%`) as { id: string }[];

  if (existing.length === 0) return base;
  const ids = new Set(existing.map((r) => r.id));
  if (!ids.has(base)) return base;
  let n = 2;
  while (ids.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function listAll(): ServerRowWithGame[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT s.*, g.protocol, g.name AS game_name
       FROM servers s
       LEFT JOIN games g ON s.game_id = g.id
       ORDER BY s.created_at ASC`
    )
    .all() as ServerRowWithGame[];
}

export function listEnabled(): ServerRowWithGame[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT s.*, g.protocol, g.name AS game_name
       FROM servers s
       JOIN games g ON s.game_id = g.id
       WHERE s.hidden = 0
       ORDER BY s.created_at ASC`
    )
    .all() as ServerRowWithGame[];
}

export function getById(id: string): ServerRow | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM servers WHERE id = ?`).get(id) as ServerRow | undefined;
}

export function createServer(input: {
  name: string;
  host: string;
  port: number;
  game_id: string;
}): string {
  return withTransaction(() => {
    const id = generateId(input.name);
    const now = Date.now();
    getDb().prepare(
      `INSERT INTO servers (id, name, host, port, protocol, game_id, hidden, created_at, updated_at)
       VALUES (?, ?, ?, ?, '', ?, 0, ?, ?)`
    ).run(id, input.name, input.host, input.port, input.game_id, now, now);
    return id;
  });
}

export function updateServer(
  id: string,
  patch: Partial<Pick<ServerRow, 'name' | 'host' | 'port' | 'game_id'>>,
): void {
  const db = getDb();
  const ALLOWED = new Set(['name', 'host', 'port', 'game_id']);
  const fields = (Object.keys(patch) as (keyof typeof patch)[]).filter((f) => ALLOWED.has(f));
  if (fields.length === 0) return;

  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => patch[f]);
  values.push(Date.now() as never);

  db.prepare(`UPDATE servers SET ${setClauses}, updated_at = ? WHERE id = ?`).run(
    ...values,
    id,
  );
}

export function setHidden(id: string, hidden: boolean): void {
  const db = getDb();
  db.prepare(`UPDATE servers SET hidden = ?, updated_at = ? WHERE id = ?`).run(
    hidden ? 1 : 0,
    Date.now(),
    id,
  );
}

export function deleteServer(id: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM status_history WHERE server_id = ?`).run(id);
  db.prepare(`DELETE FROM server_status WHERE id = ?`).run(id);
  db.prepare(`DELETE FROM servers WHERE id = ?`).run(id);
}

export type StatusRow = {
  id: string;
  online: number;
  players: number | null;
};

export function getAllServerStatuses(): Map<string, StatusRow> {
  const db = getDb();
  const rows = db
    .prepare('SELECT id, online, players FROM server_status')
    .all() as StatusRow[];
  const map = new Map<string, StatusRow>();
  for (const row of rows) {
    map.set(row.id, row);
  }
  return map;
}
