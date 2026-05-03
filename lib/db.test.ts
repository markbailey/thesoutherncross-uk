import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getDb,
  closeDb,
  withTransaction,
  lastPollAt,
  setLastPollAt,
  pruneStatusHistory,
} from './db';

describe('db', () => {
  beforeEach(() => {
    closeDb();
    getDb({ dbPath: ':memory:' });
  });

  afterEach(() => {
    closeDb();
  });

  it('creates expected tables on init', () => {
    const db = getDb({ dbPath: ':memory:' });
    const rows = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('server_status','status_history','members','meta')`,
      )
      .all() as Array<{ name: string }>;
    const names = rows.map((r) => r.name).sort();
    expect(names).toEqual(['members', 'meta', 'server_status', 'status_history']);
  });

  it('lastPollAt returns null before any write and the stored value after', () => {
    expect(lastPollAt()).toBeNull();
    setLastPollAt(1_700_000_000_000);
    expect(lastPollAt()).toBe(1_700_000_000_000);
  });

  it('withTransaction rolls back on throw', () => {
    const db = getDb({ dbPath: ':memory:' });
    expect(() =>
      withTransaction(() => {
        db.prepare(`INSERT INTO meta (key, value) VALUES ('x', 'y')`).run();
        throw new Error('boom');
      }),
    ).toThrow('boom');
    const row = db.prepare(`SELECT value FROM meta WHERE key = 'x'`).get();
    expect(row).toBeUndefined();
  });

  it('withTransaction commits on success', () => {
    const db = getDb({ dbPath: ':memory:' });
    withTransaction(() => {
      db.prepare(`INSERT INTO meta (key, value) VALUES ('x', 'y')`).run();
    });
    const row = db.prepare(`SELECT value FROM meta WHERE key = 'x'`).get() as
      | { value: string }
      | undefined;
    expect(row?.value).toBe('y');
  });

  it('pruneStatusHistory deletes rows older than the retention window', () => {
    const db = getDb({ dbPath: ':memory:' });
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const insert = db.prepare(
      `INSERT INTO status_history (server_id, online, players, captured_at) VALUES (?, ?, ?, ?)`,
    );
    insert.run('s1', 1, 3, now - 100 * hour); // older than 72h
    insert.run('s1', 1, 4, now - 1 * hour); // recent
    insert.run('s2', 0, 0, now - 80 * hour); // older than 72h

    const deleted = pruneStatusHistory(72);
    expect(deleted).toBe(2);

    const remaining = db.prepare(`SELECT COUNT(*) AS c FROM status_history`).get() as {
      c: number;
    };
    expect(remaining.c).toBe(1);
  });

  it('getDb returns the same handle across calls', () => {
    const a = getDb({ dbPath: ':memory:' });
    const b = getDb();
    expect(a).toBe(b);
  });
});
