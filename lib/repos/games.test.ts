import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, closeDb } from '../db';
import { listAllGames, getGameById, createGame, deleteGame, computePlanet } from './games';

describe('games repo', () => {
  beforeEach(() => { closeDb(); getDb({ dbPath: ':memory:' }); });
  afterEach(() => closeDb());

  describe('createGame', () => {
    it('persists a row and returns the generated id', () => {
      const id = createGame({ name: 'Enshrouded', protocol: 'source' });
      expect(id).toBe('enshrouded');
      const row = getGameById(id);
      expect(row).toMatchObject({ name: 'Enshrouded', protocol: 'source', orbit_index: 0 });
    });

    it('generates numeric suffix on slug collision', () => {
      const id1 = createGame({ name: 'My Game', protocol: 'source' });
      const id2 = createGame({ name: 'My Game', protocol: 'minecraft' });
      expect(id1).toBe('my-game');
      expect(id2).toBe('my-game-2');
    });

    it('assigns sequential orbit_index', () => {
      const id1 = createGame({ name: 'Alpha', protocol: 'source' });
      const id2 = createGame({ name: 'Beta', protocol: 'source' });
      const id3 = createGame({ name: 'Gamma', protocol: 'source' });
      expect(getGameById(id1)!.orbit_index).toBe(0);
      expect(getGameById(id2)!.orbit_index).toBe(1);
      expect(getGameById(id3)!.orbit_index).toBe(2);
    });
  });

  describe('deleteGame', () => {
    it('removes the game row', () => {
      const id = createGame({ name: 'Test', protocol: 'source' });
      deleteGame(id);
      expect(getGameById(id)).toBeUndefined();
    });

    it('throws if servers reference the game', () => {
      const db = getDb();
      const gameId = createGame({ name: 'Test', protocol: 'source' });
      const now = Date.now();
      db.prepare(
        `INSERT INTO servers (id, name, host, port, protocol, game_id, created_at, updated_at)
         VALUES ('srv1', 'S', 'h', 1, '', ?, ?, ?)`
      ).run(gameId, now, now);
      expect(() => deleteGame(gameId)).toThrow('has servers');
    });
  });

  describe('computePlanet', () => {
    it('returns same color for same game id', () => {
      const a = computePlanet({ id: 'enshrouded', orbit_index: 0 });
      const b = computePlanet({ id: 'enshrouded', orbit_index: 0 });
      expect(a.color).toBe(b.color);
    });

    it('returns different colors for different ids', () => {
      const a = computePlanet({ id: 'enshrouded', orbit_index: 0 });
      const b = computePlanet({ id: 'minecraft', orbit_index: 1 });
      expect(a.color).not.toBe(b.color);
    });

    it('orbit radius increases with orbit_index', () => {
      const p0 = computePlanet({ id: 'a', orbit_index: 0 });
      const p1 = computePlanet({ id: 'b', orbit_index: 1 });
      const p2 = computePlanet({ id: 'c', orbit_index: 2 });
      expect(p1.orbitRadius).toBeGreaterThan(p0.orbitRadius);
      expect(p2.orbitRadius).toBeGreaterThan(p1.orbitRadius);
    });

    it('orbit speed decreases with orbit_index (outer orbits slower)', () => {
      const p0 = computePlanet({ id: 'a', orbit_index: 0 });
      const p1 = computePlanet({ id: 'b', orbit_index: 1 });
      expect(p1.orbitSpeed).toBeLessThan(p0.orbitSpeed);
    });
  });
});
