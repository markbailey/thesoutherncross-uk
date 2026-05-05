import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, closeDb } from '../db';
import {
  listAll,
  listEnabled,
  getById,
  createServer,
  updateServer,
  setHidden,
  deleteServer,
} from './servers';
import { createGame } from './games';

describe('servers repo', () => {
  let gameId: string;

  beforeEach(() => {
    closeDb();
    getDb({ dbPath: ':memory:' });
    gameId = createGame({ name: 'Test Game', protocol: 'source' });
  });

  afterEach(() => closeDb());

  describe('createServer', () => {
    it('persists a row and returns the generated id', () => {
      const id = createServer({ name: 'Minecraft Main', host: 'mc.example.com', port: 25565, game_id: gameId });
      expect(id).toBe('minecraft-main');
      const row = getById(id);
      expect(row).toMatchObject({ name: 'Minecraft Main', host: 'mc.example.com', port: 25565, game_id: gameId, hidden: 0 });
    });

    it('generates a numeric suffix on slug collision', () => {
      const id1 = createServer({ name: 'Test Server', host: 'a.example.com', port: 27015, game_id: gameId });
      const id2 = createServer({ name: 'Test Server', host: 'b.example.com', port: 27015, game_id: gameId });
      const id3 = createServer({ name: 'Test Server', host: 'c.example.com', port: 27015, game_id: gameId });
      expect(id1).toBe('test-server');
      expect(id2).toBe('test-server-2');
      expect(id3).toBe('test-server-3');
    });

    it('sets created_at and updated_at', () => {
      const before = Date.now();
      const id = createServer({ name: 'TS', host: 'h', port: 1, game_id: gameId });
      const after = Date.now();
      const row = getById(id)!;
      expect(row.created_at).toBeGreaterThanOrEqual(before);
      expect(row.created_at).toBeLessThanOrEqual(after);
      expect(row.updated_at).toBe(row.created_at);
    });
  });

  describe('listEnabled', () => {
    it('excludes hidden=1 servers', () => {
      const id1 = createServer({ name: 'Visible', host: 'a', port: 1, game_id: gameId });
      const id2 = createServer({ name: 'Hidden', host: 'b', port: 2, game_id: gameId });
      setHidden(id2, true);
      const list = listEnabled();
      expect(list.map((s) => s.id)).toContain(id1);
      expect(list.map((s) => s.id)).not.toContain(id2);
    });

    it('excludes servers with no game_id', () => {
      const db = getDb();
      const now = Date.now();
      db.prepare(
        `INSERT INTO servers (id, name, host, port, protocol, game_id, hidden, created_at, updated_at)
         VALUES ('orphan', 'Orphan', 'h', 1, '', NULL, 0, ?, ?)`
      ).run(now, now);
      const list = listEnabled();
      expect(list.map((s) => s.id)).not.toContain('orphan');
    });

    it('includes protocol from joined game', () => {
      createServer({ name: 'S', host: 'h', port: 1, game_id: gameId });
      const [srv] = listEnabled();
      expect(srv.protocol).toBe('source');
    });
  });

  describe('listAll', () => {
    it('includes both visible and hidden servers', () => {
      const id1 = createServer({ name: 'Visible', host: 'a', port: 1, game_id: gameId });
      const id2 = createServer({ name: 'Hidden', host: 'b', port: 2, game_id: gameId });
      setHidden(id2, true);
      const list = listAll();
      expect(list.map((s) => s.id)).toContain(id1);
      expect(list.map((s) => s.id)).toContain(id2);
    });
  });

  describe('updateServer', () => {
    it('changes fields and bumps updated_at', async () => {
      const id = createServer({ name: 'Old Name', host: 'h', port: 1, game_id: gameId });
      const before = getById(id)!;
      await new Promise((r) => setTimeout(r, 5));
      updateServer(id, { name: 'New Name', port: 9999 });
      const after = getById(id)!;
      expect(after.name).toBe('New Name');
      expect(after.port).toBe(9999);
      expect(after.updated_at).toBeGreaterThan(before.updated_at);
    });
  });

  describe('setHidden', () => {
    it('toggles hidden flag', () => {
      const id = createServer({ name: 'S', host: 'h', port: 1, game_id: gameId });
      setHidden(id, true);
      expect(getById(id)!.hidden).toBe(1);
      setHidden(id, false);
      expect(getById(id)!.hidden).toBe(0);
    });
  });

  describe('deleteServer', () => {
    it('removes server row', () => {
      const id = createServer({ name: 'S', host: 'h', port: 1, game_id: gameId });
      deleteServer(id);
      expect(getById(id)).toBeUndefined();
    });

    it('cascades to server_status and status_history', () => {
      const id = createServer({ name: 'S', host: 'h', port: 1, game_id: gameId });
      const db = getDb();
      db.prepare('INSERT INTO server_status (id, online, updated_at) VALUES (?, 0, ?)').run(id, Date.now());
      db.prepare('INSERT INTO status_history (server_id, online, players, captured_at) VALUES (?, 0, 0, ?)').run(id, Date.now());
      deleteServer(id);
      expect(db.prepare('SELECT 1 FROM server_status WHERE id = ?').get(id)).toBeUndefined();
      expect(db.prepare('SELECT 1 FROM status_history WHERE server_id = ?').get(id)).toBeUndefined();
    });
  });
});
