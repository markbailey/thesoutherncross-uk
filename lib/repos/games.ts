import { getDb } from '../db';
import type { Protocol } from '../types/servers.js';

export type GameRow = {
  id: string;
  name: string;
  protocol: Protocol;
  orbit_index: number;
  created_at: number;
};

export type PlanetVisual = {
  color: string;
  size: number;
  orbitRadius: number;
  orbitSpeed: number;
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
    .prepare(`SELECT id FROM games WHERE id = ? OR id LIKE ?`)
    .all(base, `${base}-%`) as { id: string }[];

  if (existing.length === 0) return base;
  const ids = new Set(existing.map((r) => r.id));
  if (!ids.has(base)) return base;
  let n = 2;
  while (ids.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function nextOrbitIndex(): number {
  const db = getDb();
  const row = db.prepare(`SELECT MAX(orbit_index) AS m FROM games`).get() as { m: number | null };
  return row.m === null ? 0 : row.m + 1;
}

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function computePlanet(game: { id: string; orbit_index: number }): PlanetVisual {
  const hue = hashStr(game.id) % 360;
  return {
    color: `hsl(${hue}, 70%, 60%)`,
    size: 0.85 + (game.orbit_index % 4) * 0.05,
    orbitRadius: 8 + game.orbit_index * 3,
    orbitSpeed: Number((0.05 * Math.pow(0.8, game.orbit_index)).toFixed(4)),
  };
}

export function listAllGames(): GameRow[] {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM games ORDER BY orbit_index ASC`)
    .all() as GameRow[];
}

export function getGameById(id: string): GameRow | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM games WHERE id = ?`).get(id) as GameRow | undefined;
}

export function createGame(input: { name: string; protocol: Protocol }): string {
  const db = getDb();
  const id = generateId(input.name);
  const orbitIndex = nextOrbitIndex();
  const now = Date.now();
  db.prepare(
    `INSERT INTO games (id, name, protocol, orbit_index, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(id, input.name, input.protocol, orbitIndex, now);
  return id;
}

export function deleteGame(id: string): void {
  const db = getDb();
  const refs = db
    .prepare(`SELECT COUNT(*) AS n FROM servers WHERE game_id = ?`)
    .get(id) as { n: number };
  if (refs.n > 0) throw new Error(`Game "${id}" has servers — reassign or delete them first`);
  db.prepare(`DELETE FROM games WHERE id = ?`).run(id);
}
