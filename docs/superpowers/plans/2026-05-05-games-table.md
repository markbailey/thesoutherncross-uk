# Games Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Frontend tasks:** Before writing or modifying any frontend file invoke the `frontend-design` skill.

**Goal:** Add a `games` DB table so DB-registered servers are grouped by game and appear in the planet view.

**Architecture:** `games(id, name, protocol, orbit_index)` is the source of protocol truth. `servers.game_id` FK links each server to a game. Planet visuals are computed deterministically from `orbit_index` and a hash of `game.id`. `/api/servers` always returns `{ games }` shape; demo mode unchanged. Admin gets a new GAMES section.

**Tech Stack:** better-sqlite3, Next.js App Router (server components + API routes), Vitest, Three.js (Scene moon color only)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `lib/db.ts` | Add `games` table migration + `game_id` column to `servers` |
| Create | `lib/repos/games.ts` | CRUD for games + `computePlanet` |
| Create | `lib/repos/games.test.ts` | Unit tests for games repo |
| Modify | `lib/repos/servers.ts` | JOIN games for protocol; swap `protocol` param for `game_id` |
| Modify | `lib/repos/servers.test.ts` | Update tests to create a game first |
| Modify | `app/api/servers/route.ts` | Return `{ games }` shape from DB |
| Modify | `config/demo-servers.ts` | Add `host`/`port` per server (needed by SystemSection) |
| Create | `app/api/admin/games/route.ts` | POST create game |
| Modify | `app/api/admin/servers/route.ts` | Accept `game_id` instead of `protocol` |
| Modify | `app/api/admin/servers/[id]/route.ts` | Accept `game_id` in PUT |
| Modify | `app/api/admin/servers/[id]/data/route.ts` | Return `game_id` instead of `protocol` |
| Modify | `app/admin/layout.tsx` | Add GAMES tab to sub-nav |
| Create | `app/admin/games/page.tsx` | Games list table |
| Create | `app/admin/games/new/page.tsx` | Create game form |
| Modify | `app/admin/servers/new/page.tsx` | Game dropdown replaces protocol |
| Modify | `app/admin/servers/page.tsx` | Null-safe protocol display; show game name |
| Modify | `app/admin/servers/[id]/page.tsx` | Game dropdown replaces protocol |
| Modify | `components/sections/SystemSection.tsx` | Build connect strings from API; simplify sceneGames |
| Modify | `components/solar-system/Scene.tsx` | Fixed gray moon color |

---

## Task 1: DB Migration — `games` table + `game_id` on servers

**Files:**
- Modify: `lib/db.ts`
- Test: `lib/db.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `lib/db.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDb, closeDb } from './db';

// --- existing tests stay unchanged ---

describe('schema migrations', () => {
  beforeEach(() => { closeDb(); getDb({ dbPath: ':memory:' }); });
  afterEach(() => closeDb());

  it('creates games table', () => {
    const db = getDb();
    const row = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='games'`).get();
    expect(row).toBeDefined();
  });

  it('servers table has game_id column', () => {
    const db = getDb();
    const cols = db.prepare(`PRAGMA table_info(servers)`).all() as { name: string }[];
    expect(cols.some(c => c.name === 'game_id')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run lib/db.test.ts
```

Expected: FAIL — "games table" test fails (table doesn't exist yet)

- [ ] **Step 3: Update `lib/db.ts` migration**

Replace the `runMigrations` function with:

```typescript
function runMigrations(db: DbType): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id          TEXT    PRIMARY KEY,
      name        TEXT    NOT NULL,
      protocol    TEXT    NOT NULL,
      orbit_index INTEGER NOT NULL,
      created_at  INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_games_orbit_index ON games (orbit_index);

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
      protocol   TEXT NOT NULL DEFAULT '',
      game_id    TEXT REFERENCES games(id),
      hidden     INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Incremental: add game_id column to servers if migrating an existing DB
  const serverCols = db.prepare(`PRAGMA table_info(servers)`).all() as { name: string }[];
  if (!serverCols.some((c) => c.name === 'game_id')) {
    db.exec(`ALTER TABLE servers ADD COLUMN game_id TEXT REFERENCES games(id)`);
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run lib/db.test.ts
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts lib/db.test.ts
git commit -m "GH-5: add games table migration + game_id on servers"
```

---

## Task 2: `lib/repos/games.ts` — new repo

**Files:**
- Create: `lib/repos/games.ts`
- Create: `lib/repos/games.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/repos/games.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run lib/repos/games.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement `lib/repos/games.ts`**

Create `lib/repos/games.ts`:

```typescript
import { getDb } from '../db';
import type { Protocol } from '../types/servers';

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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run lib/repos/games.test.ts
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add lib/repos/games.ts lib/repos/games.test.ts
git commit -m "GH-5: add games repo with computePlanet"
```

---

## Task 3: Update `lib/repos/servers.ts` — swap `protocol` for `game_id`

**Files:**
- Modify: `lib/repos/servers.ts`
- Modify: `lib/repos/servers.test.ts`

- [ ] **Step 1: Update `ServerRow` type and repo functions**

Replace the entire content of `lib/repos/servers.ts`:

```typescript
import { getDb } from '../db';
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
  protocol: Protocol | null;  // null when game_id is NULL (LEFT JOIN in listAll)
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
  const db = getDb();
  const id = generateId(input.name);
  const now = Date.now();
  db.prepare(
    `INSERT INTO servers (id, name, host, port, protocol, game_id, hidden, created_at, updated_at)
     VALUES (?, ?, ?, ?, '', ?, 0, ?, ?)`
  ).run(id, input.name, input.host, input.port, input.game_id, now, now);
  return id;
}

export function updateServer(
  id: string,
  patch: Partial<Pick<ServerRow, 'name' | 'host' | 'port' | 'game_id'>>,
): void {
  const db = getDb();
  const fields = Object.keys(patch) as (keyof typeof patch)[];
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
```

- [ ] **Step 2: Update `lib/repos/servers.test.ts`**

Replace the entire file — all tests now create a game first:

```typescript
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
```

- [ ] **Step 3: Run all repo tests**

```bash
npx vitest run lib/repos/
```

Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add lib/repos/servers.ts lib/repos/servers.test.ts
git commit -m "GH-5: servers repo — swap protocol for game_id, JOIN games"
```

---

## Task 4: Update `GET /api/servers` — return `{ games }` shape from DB

**Files:**
- Modify: `app/api/servers/route.ts`
- Modify: `config/demo-servers.ts`

- [ ] **Step 1: Update `app/api/servers/route.ts`**

Replace the entire file:

```typescript
import { buildDemoServersResponse } from '../../../config/demo-servers';
import { getDb } from '../../../lib/db';
import { listAllGames, computePlanet } from '../../../lib/repos/games';
import { jsonNoStore } from '../../../lib/api-helpers';
import { childLogger } from '../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StatusRow = {
  id: string;
  online: number;
  players: number | null;
  max_players: number | null;
  map: string | null;
  ping: number | null;
  updated_at: number;
};

const log = childLogger({ mod: 'api/servers' });

export function GET(): Response {
  if (process.env.DEMO_SERVERS === '1') {
    return jsonNoStore(buildDemoServersResponse());
  }

  try {
    const db = getDb();
    const games = listAllGames();

    const statusRows = db
      .prepare(
        `SELECT id, online, players, max_players, map, ping, updated_at FROM server_status`,
      )
      .all() as StatusRow[];
    const byId = new Map<string, StatusRow>();
    for (const row of statusRows) byId.set(row.id, row);

    const serversByGame = db
      .prepare(
        `SELECT id, name, host, port, game_id FROM servers WHERE hidden = 0 AND game_id IS NOT NULL`,
      )
      .all() as { id: string; name: string; host: string; port: number; game_id: string }[];

    const serverMap = new Map<string, typeof serversByGame>();
    for (const srv of serversByGame) {
      const arr = serverMap.get(srv.game_id) ?? [];
      arr.push(srv);
      serverMap.set(srv.game_id, arr);
    }

    let mostRecent: number | null = null;

    const result = games.map((g) => {
      const servers = (serverMap.get(g.id) ?? []).map((s) => {
        const row = byId.get(s.id);
        if (row && (mostRecent === null || row.updated_at > mostRecent)) {
          mostRecent = row.updated_at;
        }
        return {
          id: s.id,
          name: s.name,
          host: s.host,
          port: s.port,
          online: Boolean(row?.online),
          players: row?.players ?? null,
          maxPlayers: row?.max_players ?? null,
          map: row?.map ?? null,
          ping: row?.ping ?? null,
          updatedAt: row?.updated_at ?? null,
        };
      });
      return {
        id: g.id,
        name: g.name,
        planet: computePlanet(g),
        servers,
      };
    });

    return jsonNoStore({ games: result, updatedAt: mostRecent });
  } catch (err) {
    log.error({ err }, '/api/servers failed');
    return jsonNoStore({ error: 'internal' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add `host`/`port` to `config/demo-servers.ts`**

Update `DemoServer` type and all server entries to include `host` and `port`:

```typescript
export type DemoServer = {
  id: string;
  name: string;
  host: string;      // add
  port: number;      // add
  online: boolean;
  players: number | null;
  maxPlayers: number | null;
  map: string | null;
  ping: number | null;
  updatedAt: number | null;
};
```

Update each server in `DEMO_GAMES` to include a dummy `host` and `port`:

```typescript
// minecraft servers
{ id: 'mc-vanilla', name: 'Vanilla SMP', host: 'mc.example.com', port: 25565, online: true, players: 12, maxPlayers: 24, map: 'world', ping: 32, updatedAt: null },
{ id: 'mc-modded',  name: 'ATM10',       host: 'mc.example.com', port: 25566, online: true, players: 4,  maxPlayers: 16, map: 'atm10', ping: 48, updatedAt: null },

// cs2 servers
{ id: 'cs-dust',   name: 'Dust2 24/7',  host: 'cs.example.com', port: 27015, online: true,  players: 8,    maxPlayers: 12,   map: 'de_dust2', ping: 24,   updatedAt: null },
{ id: 'cs-mirage', name: 'Mirage 24/7', host: 'cs.example.com', port: 27016, online: false, players: null, maxPlayers: null, map: null,       ping: null, updatedAt: null },

// valheim server
{ id: 'vh-main', name: 'Yggdrasil', host: 'vh.example.com', port: 2456, online: true, players: 3, maxPlayers: 10, map: null, ping: 65, updatedAt: null },

// rust servers
{ id: 'rust-main',     name: 'Vanilla Main', host: 'rust.example.com', port: 28015, online: true,  players: 47,   maxPlayers: 100,  map: 'Procedural Map', ping: 41,   updatedAt: null },
{ id: 'rust-2x',       name: '2x Weekly',    host: 'rust.example.com', port: 28016, online: true,  players: 22,   maxPlayers: 50,   map: 'Procedural Map', ping: 39,   updatedAt: null },
{ id: 'rust-creative', name: 'Creative',     host: 'rust.example.com', port: 28017, online: false, players: null, maxPlayers: null, map: null,             ping: null, updatedAt: null },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in the modified files

- [ ] **Step 4: Commit**

```bash
git add app/api/servers/route.ts config/demo-servers.ts
git commit -m "GH-5: /api/servers returns { games } shape from DB"
```

---

## Task 5: New `POST /api/admin/games` route

**Files:**
- Create: `app/api/admin/games/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/admin/games/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '../../../../lib/auth/session';
import { isAdmin } from '../../../../lib/auth/roles';
import { createGame } from '../../../../lib/repos/games';
import type { Protocol } from '../../../../lib/types/servers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin(): Promise<SessionData | null> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.steamid || !isAdmin(session.steamid)) return null;
  return session;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const { name, protocol } = body as Record<string, unknown>;

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }
  if (protocol !== 'source' && protocol !== 'minecraft') {
    return NextResponse.json({ error: 'invalid protocol' }, { status: 400 });
  }

  const id = createGame({ name: name.trim(), protocol: protocol as Protocol });
  return NextResponse.json({ id }, { status: 201 });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/games/route.ts
git commit -m "GH-5: POST /api/admin/games — create game"
```

---

## Task 6: Update `/api/admin/servers` routes — `game_id` replaces `protocol`

**Files:**
- Modify: `app/api/admin/servers/route.ts`
- Modify: `app/api/admin/servers/[id]/route.ts`
- Modify: `app/api/admin/servers/[id]/data/route.ts`

- [ ] **Step 1: Update `app/api/admin/servers/route.ts`**

Replace the `POST` body validation — swap `protocol` for `game_id`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '../../../../lib/auth/session';
import { isAdmin } from '../../../../lib/auth/roles';
import { createServer } from '../../../../lib/repos/servers';
import { getGameById } from '../../../../lib/repos/games';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin(): Promise<SessionData | null> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.steamid || !isAdmin(session.steamid)) return null;
  return session;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const { name, host, port, game_id } = body as Record<string, unknown>;

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }
  if (typeof host !== 'string' || !host.trim()) {
    return NextResponse.json({ error: 'host required' }, { status: 400 });
  }
  const portNum = Number(port);
  if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    return NextResponse.json({ error: 'invalid port' }, { status: 400 });
  }
  if (typeof game_id !== 'string' || !game_id.trim()) {
    return NextResponse.json({ error: 'game_id required' }, { status: 400 });
  }
  if (!getGameById(game_id)) {
    return NextResponse.json({ error: 'game not found' }, { status: 422 });
  }

  const id = createServer({ name: name.trim(), host: host.trim(), port: portNum, game_id });
  return NextResponse.json({ id }, { status: 201 });
}
```

- [ ] **Step 2: Update `app/api/admin/servers/[id]/route.ts`**

In the `PUT` handler replace the `protocol` validation block with `game_id`:

```typescript
// Remove these lines:
//   import type { Protocol } from '../../../../../lib/types/servers';
//   const { name, host, port, protocol } = body as Record<string, unknown>;
//   if (protocol !== undefined) { ... patch.protocol = ... }

// Replace the entire PUT function body with:
import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '../../../../../lib/auth/session';
import { isAdmin } from '../../../../../lib/auth/roles';
import { getById, updateServer, deleteServer, setHidden } from '../../../../../lib/repos/servers';
import { getGameById } from '../../../../../lib/repos/games';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin(): Promise<SessionData | null> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.steamid || !isAdmin(session.steamid)) return null;
  return session;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  const server = getById(id);
  if (!server) return NextResponse.json({ error: 'not found' }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const { name, host, port, game_id } = body as Record<string, unknown>;
  const patch: Parameters<typeof updateServer>[1] = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name must be non-empty string' }, { status: 400 });
    }
    patch.name = name.trim();
  }
  if (host !== undefined) {
    if (typeof host !== 'string' || !host.trim()) {
      return NextResponse.json({ error: 'host must be non-empty string' }, { status: 400 });
    }
    patch.host = host.trim();
  }
  if (port !== undefined) {
    const portNum = Number(port);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      return NextResponse.json({ error: 'invalid port' }, { status: 400 });
    }
    patch.port = portNum;
  }
  if (game_id !== undefined) {
    if (typeof game_id !== 'string' || !game_id.trim()) {
      return NextResponse.json({ error: 'game_id must be non-empty string' }, { status: 400 });
    }
    if (!getGameById(game_id)) {
      return NextResponse.json({ error: 'game not found' }, { status: 422 });
    }
    patch.game_id = game_id;
  }

  updateServer(id, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  if (!getById(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });

  deleteServer(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  if (!getById(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const { hidden } = body as Record<string, unknown>;
  if (typeof hidden !== 'boolean') {
    return NextResponse.json({ error: 'hidden must be boolean' }, { status: 400 });
  }

  setHidden(id, hidden);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Update `app/api/admin/servers/[id]/data/route.ts`**

Return `game_id` instead of `protocol`:

```typescript
return NextResponse.json({
  id: server.id,
  name: server.name,
  host: server.host,
  port: server.port,
  game_id: server.game_id,   // was: protocol: server.protocol
  hidden: Boolean(server.hidden),
});
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/servers/route.ts app/api/admin/servers/[id]/route.ts app/api/admin/servers/[id]/data/route.ts
git commit -m "GH-5: admin server routes — game_id replaces protocol"
```

---

## Task 7: Admin layout — add GAMES tab

**Files:**
- Modify: `app/admin/layout.tsx`

- [ ] **Step 1: Add GAMES tab**

In `app/admin/layout.tsx`, replace the `<nav>` block (the sub-nav with the single SERVERS link) with:

```tsx
<nav
  aria-label="Admin navigation"
  style={{
    borderBottom: '1px solid var(--hair)',
    background: 'rgba(7,6,12,0.6)',
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    gap: 0,
  }}
>
  <Link
    href="/admin/games"
    style={{
      fontFamily: 'var(--mono)',
      fontSize: 11,
      letterSpacing: '0.20em',
      textTransform: 'uppercase',
      color: 'var(--ink-dim)',
      textDecoration: 'none',
      padding: '12px 16px',
      borderBottom: '2px solid transparent',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      transition: 'color .12s',
    }}
  >
    <span style={{ fontSize: 9, opacity: 0.7 }}>▸</span>
    GAMES
  </Link>
  <Link
    href="/admin/servers"
    style={{
      fontFamily: 'var(--mono)',
      fontSize: 11,
      letterSpacing: '0.20em',
      textTransform: 'uppercase',
      color: 'var(--ink-dim)',
      textDecoration: 'none',
      padding: '12px 16px',
      borderBottom: '2px solid transparent',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      transition: 'color .12s',
    }}
  >
    <span style={{ fontSize: 9, opacity: 0.7 }}>▸</span>
    SERVERS
  </Link>
</nav>
```

Note: active-tab highlighting (green underline) is left for a future enhancement — both tabs use `var(--ink-dim)` with transparent bottom border for now.

- [ ] **Step 2: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "GH-5: admin layout — add GAMES tab"
```

---

## Task 8: Admin games list page

**Files:**
- Create: `app/admin/games/page.tsx`

> **Invoke `frontend-design` skill before writing this file.**

- [ ] **Step 1: Create `app/admin/games/page.tsx`**

```tsx
import Link from 'next/link';
import { listAllGames, computePlanet } from '../../../lib/repos/games';
import { getDb } from '../../../lib/db';
import DeleteGameButton from './DeleteGameButton';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function AdminGamesPage() {
  const games = listAllGames();
  const db = getDb();

  const serverCountById = new Map<string, number>();
  for (const g of games) {
    const row = db
      .prepare('SELECT COUNT(*) AS n FROM servers WHERE game_id = ?')
      .get(g.id) as { n: number };
    serverCountById.set(g.id, row.n);
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'var(--ink-faint)',
              marginBottom: 6,
            }}
          >
            GAME REGISTRY
          </div>
          <h1
            className="display"
            style={{ margin: 0, fontSize: 18, letterSpacing: '0.18em', color: 'var(--ink)' }}
          >
            GAMES
            <span
              style={{
                marginLeft: 12,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.14em',
                color: 'var(--ink-faint)',
                fontWeight: 400,
              }}
            >
              [{games.length}]
            </span>
          </h1>
        </div>
        <Link href="/admin/games/new" className="hud-btn" style={{ textDecoration: 'none' }}>
          + ADD GAME
        </Link>
      </div>

      {games.length === 0 ? (
        <div
          style={{
            padding: '48px 32px',
            textAlign: 'center',
            border: '1px solid var(--hair)',
            background: 'rgba(7,6,12,0.5)',
            fontFamily: 'var(--mono)',
            fontSize: 12,
            letterSpacing: '0.16em',
            color: 'var(--ink-faint)',
          }}
        >
          NO GAMES CONFIGURED — ADD ONE TO BEGIN
        </div>
      ) : (
        <div style={{ border: '1px solid var(--hair)', overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 80px 100px auto',
              gap: 0,
              padding: '10px 20px',
              background: 'rgba(0,168,107,0.06)',
              borderBottom: '1px solid var(--hair)',
            }}
          >
            {['NAME', 'PROTOCOL', 'ORBIT', 'SERVERS', 'ACTIONS'].map((col) => (
              <span
                key={col}
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-faint)',
                }}
              >
                {col}
              </span>
            ))}
          </div>

          {games.map((g) => {
            const planet = computePlanet(g);
            const serverCount = serverCountById.get(g.id) ?? 0;
            return (
              <div
                key={g.id}
                className="admin-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 80px 100px auto',
                  gap: 0,
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(0,168,107,0.1)',
                  alignItems: 'center',
                }}
              >
                {/* Name + color swatch */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: planet.color,
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${planet.color}`,
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 12,
                        color: 'var(--ink)',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {g.name}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 9,
                        color: 'var(--ink-faint)',
                        letterSpacing: '0.12em',
                        marginTop: 2,
                      }}
                    >
                      {g.id}
                    </div>
                  </div>
                </div>

                {/* Protocol */}
                <div>
                  <span
                    className={`pill ${g.protocol === 'source' ? 'green' : 'purple'}`}
                    style={{ fontSize: 9, letterSpacing: '0.16em' }}
                  >
                    {g.protocol.toUpperCase()}
                  </span>
                </div>

                {/* Orbit */}
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: 'var(--ink-dim)',
                    letterSpacing: '0.08em',
                  }}
                >
                  {g.orbit_index}
                </div>

                {/* Server count */}
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    color: serverCount > 0 ? 'var(--royal-green-neon)' : 'var(--ink-faint)',
                    letterSpacing: '0.08em',
                  }}
                >
                  {serverCount}
                </div>

                {/* Actions */}
                <div>
                  <DeleteGameButton id={g.id} name={g.name} hasServers={serverCount > 0} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .admin-row:last-child { border-bottom: none !important; }
        .admin-row:hover { background: rgba(57,255,136,0.03); }
      `}</style>
    </>
  );
}
```

- [ ] **Step 2: Create `app/admin/games/DeleteGameButton.tsx`**

```tsx
'use client';

export default function DeleteGameButton({
  id,
  name,
  hasServers,
}: {
  id: string;
  name: string;
  hasServers: boolean;
}) {
  async function handleDelete() {
    if (!confirm(`Delete game "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/games/${id}`, { method: 'DELETE' });
    if (res.ok) {
      window.location.href = '/admin/games';
    } else {
      const j = await res.json().catch(() => ({}));
      alert((j as { error?: string }).error ?? 'Delete failed');
    }
  }

  if (hasServers) {
    return (
      <span
        title="Reassign or delete servers first"
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.16em',
          color: 'var(--ink-faint)',
          padding: '4px 10px',
          border: '1px solid var(--hair)',
          opacity: 0.4,
          cursor: 'not-allowed',
        }}
      >
        DEL
      </span>
    );
  }

  return (
    <button
      onClick={handleDelete}
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 10,
        letterSpacing: '0.16em',
        color: '#ef4444',
        background: 'transparent',
        border: '1px solid rgba(239,68,68,0.3)',
        padding: '4px 10px',
        cursor: 'pointer',
        transition: 'color .12s, border-color .12s',
      }}
    >
      DEL
    </button>
  );
}
```

- [ ] **Step 3: Create `app/api/admin/games/[id]/route.ts`** (DELETE endpoint needed by the button)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '../../../../../lib/auth/session';
import { isAdmin } from '../../../../../lib/auth/roles';
import { deleteGame, getGameById } from '../../../../../lib/repos/games';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.steamid || !isAdmin(session.steamid)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!getGameById(id)) return NextResponse.json({ error: 'not found' }, { status: 404 });

  try {
    deleteGame(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'delete failed';
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/games/page.tsx app/admin/games/DeleteGameButton.tsx app/api/admin/games/[id]/route.ts
git commit -m "GH-5: admin games list + delete"
```

---

## Task 9: Admin games create page

**Files:**
- Create: `app/admin/games/new/page.tsx`

> **Invoke `frontend-design` skill before writing this file.**

- [ ] **Step 1: Create `app/admin/games/new/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewGamePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const body = {
      name: data.get('name') as string,
      protocol: data.get('protocol') as string,
    };

    try {
      const res = await fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error ?? 'Request failed');
        setSubmitting(false);
        return;
      }

      router.push('/admin/games');
      router.refresh();
    } catch {
      setError('Network error — check connection');
      setSubmitting(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--ink-faint)',
            marginBottom: 6,
          }}
        >
          GAME REGISTRY / NEW
        </div>
        <h1
          className="display"
          style={{ margin: 0, fontSize: 18, letterSpacing: '0.18em', color: 'var(--ink)' }}
        >
          ADD GAME
        </h1>
      </div>

      <div
        style={{
          maxWidth: 540,
          border: '1px solid var(--hair)',
          background: 'rgba(7,6,12,0.6)',
          padding: '32px',
        }}
      >
        <div
          style={{
            borderBottom: '1px solid var(--hair)',
            paddingBottom: 16,
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--royal-green-neon)',
              boxShadow: '0 0 6px var(--royal-green-neon)',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--ink-dim)',
            }}
          >
            ENTRY TERMINAL
          </span>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              color: '#ef4444',
              padding: '10px 14px',
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.05)',
              marginBottom: 24,
            }}
          >
            ERROR: {error.toUpperCase()}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* NAME */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="name"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'var(--ink-faint)',
              }}
            >
              NAME
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. Enshrouded"
              required
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                letterSpacing: '0.08em',
                color: 'var(--ink)',
                background: 'rgba(7,6,12,0.8)',
                border: '1px solid var(--hair)',
                padding: '10px 14px',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* PROTOCOL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="protocol"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'var(--ink-faint)',
              }}
            >
              PROTOCOL
            </label>
            <select
              id="protocol"
              name="protocol"
              defaultValue="source"
              required
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                letterSpacing: '0.08em',
                color: 'var(--ink)',
                background: 'rgba(7,6,12,0.8)',
                border: '1px solid var(--hair)',
                padding: '10px 14px',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            >
              <option value="source">SOURCE (Enshrouded, CS2, TF2, Valheim...)</option>
              <option value="minecraft">MINECRAFT</option>
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 8,
              paddingTop: 20,
              borderTop: '1px solid var(--hair)',
            }}
          >
            <button
              type="submit"
              disabled={submitting}
              className="hud-btn"
              style={{ opacity: submitting ? 0.5 : 1 }}
            >
              {submitting ? 'SAVING...' : '+ CREATE GAME'}
            </button>
            <a
              href="/admin/games"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ink-dim)',
                textDecoration: 'none',
                padding: '8px 14px',
                border: '1px solid transparent',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'color .12s',
              }}
            >
              CANCEL
            </a>
          </div>
        </form>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/games/new/page.tsx
git commit -m "GH-5: admin games create page"
```

---

## Task 10: Update admin server pages — game dropdown + null-safe protocol display

**Files:**
- Modify: `app/admin/servers/page.tsx`
- Modify: `app/admin/servers/new/page.tsx`
- Modify: `app/admin/servers/[id]/page.tsx`

> **Invoke `frontend-design` skill before modifying these files.**

- [ ] **Step 1: Fix `app/admin/servers/page.tsx` — null-safe protocol**

`listAll()` now does a LEFT JOIN so `srv.protocol` is `Protocol | null` for orphaned servers. In `app/admin/servers/page.tsx`, find the PROTOCOL cell:

```tsx
{/* Protocol */}
<div>
  <span
    className={`pill ${srv.protocol === 'source' ? 'green' : 'purple'}`}
    style={{ fontSize: 9, letterSpacing: '0.16em' }}
  >
    {srv.protocol.toUpperCase()}
  </span>
</div>
```

Replace with:

```tsx
{/* Protocol */}
<div>
  {srv.protocol ? (
    <span
      className={`pill ${srv.protocol === 'source' ? 'green' : 'purple'}`}
      style={{ fontSize: 9, letterSpacing: '0.16em' }}
    >
      {srv.protocol.toUpperCase()}
    </span>
  ) : (
    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)' }}>—</span>
  )}
</div>
```

- [ ] **Step 3: Update `app/admin/servers/new/page.tsx`**

Change from a `'use client'` form that fetches games at runtime to a **server component** that renders the form with games pre-loaded. Replace the entire file:

```tsx
import NewServerForm from './NewServerForm';
import { listAllGames } from '../../../../lib/repos/games';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function NewServerPage() {
  const games = listAllGames();
  return <NewServerForm games={games.map((g) => ({ id: g.id, name: g.name }))} />;
}
```

- [ ] **Step 4: Create `app/admin/servers/new/NewServerForm.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type GameOption = { id: string; name: string };

export default function NewServerForm({ games }: { games: GameOption[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const body = {
      name: data.get('name') as string,
      host: data.get('host') as string,
      port: Number(data.get('port')),
      game_id: data.get('game_id') as string,
    };

    try {
      const res = await fetch('/api/admin/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error ?? 'Request failed');
        setSubmitting(false);
        return;
      }

      router.push('/admin/servers');
      router.refresh();
    } catch {
      setError('Network error — check connection');
      setSubmitting(false);
    }
  }

  const fieldStyle = {
    fontFamily: 'var(--mono)',
    fontSize: 12,
    letterSpacing: '0.08em',
    color: 'var(--ink)',
    background: 'rgba(7,6,12,0.8)',
    border: '1px solid var(--hair)',
    padding: '10px 14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    fontFamily: 'var(--mono)',
    fontSize: 9,
    letterSpacing: '0.24em',
    textTransform: 'uppercase' as const,
    color: 'var(--ink-faint)',
  };

  return (
    <>
      <div style={{ marginBottom: 32 }}>
        <div style={{ ...labelStyle, marginBottom: 6 }}>SERVER REGISTRY / NEW</div>
        <h1 className="display" style={{ margin: 0, fontSize: 18, letterSpacing: '0.18em', color: 'var(--ink)' }}>
          ADD SERVER
        </h1>
      </div>

      <div style={{ maxWidth: 540, border: '1px solid var(--hair)', background: 'rgba(7,6,12,0.6)', padding: '32px' }}>
        <div style={{ borderBottom: '1px solid var(--hair)', paddingBottom: 16, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--royal-green-neon)', boxShadow: '0 0 6px var(--royal-green-neon)', display: 'inline-block' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>ENTRY TERMINAL</span>
        </div>

        {error && (
          <div role="alert" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', color: '#ef4444', padding: '10px 14px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', marginBottom: 24 }}>
            ERROR: {error.toUpperCase()}
          </div>
        )}

        {games.length === 0 && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#f59e0b', letterSpacing: '0.12em', padding: '10px 14px', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)', marginBottom: 24 }}>
            NO GAMES CONFIGURED —{' '}
            <a href="/admin/games/new" style={{ color: 'var(--royal-green-neon)', textDecoration: 'none' }}>
              ADD A GAME FIRST
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="name" style={labelStyle}>NAME</label>
            <input id="name" name="name" type="text" placeholder="e.g. Tactical Server 01" required style={fieldStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="host" style={labelStyle}>HOST</label>
            <input id="host" name="host" type="text" placeholder="e.g. 192.168.1.100" required style={fieldStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="port" style={labelStyle}>PORT</label>
            <input id="port" name="port" type="number" defaultValue="27015" min={1} max={65535} required style={fieldStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="game_id" style={labelStyle}>GAME</label>
            <select
              id="game_id"
              name="game_id"
              required
              disabled={games.length === 0}
              style={{ ...fieldStyle, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
            >
              {games.length === 0
                ? <option value="">— no games —</option>
                : games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)
              }
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8, paddingTop: 20, borderTop: '1px solid var(--hair)' }}>
            <button type="submit" disabled={submitting || games.length === 0} className="hud-btn" style={{ opacity: submitting || games.length === 0 ? 0.5 : 1 }}>
              {submitting ? 'SAVING...' : '+ CREATE SERVER'}
            </button>
            <a href="/admin/servers" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', textDecoration: 'none', padding: '8px 14px', border: '1px solid transparent', display: 'inline-flex', alignItems: 'center' }}>
              CANCEL
            </a>
          </div>
        </form>
      </div>
    </>
  );
}
```

- [ ] **Step 5: Update `app/admin/servers/[id]/page.tsx`**

In the `ServerData` type, replace `protocol: string` with `game_id: string | null`. In `handleSubmit`, replace `protocol: data.get('protocol')` with `game_id: data.get('game_id')`. Replace the PROTOCOL select with a GAME select that fetches the game list on mount via a `/api/admin/games` endpoint (or pass games via a server component wrapper).

The simplest approach: the edit page is already a client component that fetches data via `useEffect`. Fetch games separately:

In the `useEffect` block, add a parallel fetch for the games list. Add state:
```typescript
const [games, setGames] = useState<{ id: string; name: string }[]>([]);
```

In `useEffect`, after loading server data, also load games:
```typescript
fetch('/api/admin/games')
  .then((r) => r.json())
  .then((d) => setGames((d as { games: { id: string; name: string }[] }).games ?? []));
```

Add `GET /api/admin/games` route to serve the games list:

Create `app/api/admin/games/route.ts` — add a `GET` handler to the existing `POST` file:

```typescript
export async function GET(): Promise<NextResponse> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.steamid || !isAdmin(session.steamid)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const games = listAllGames();
  return NextResponse.json({ games: games.map((g) => ({ id: g.id, name: g.name })) });
}
```

In the edit form, replace the PROTOCOL `<select>` with a GAME `<select>`:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
  <label htmlFor="game_id" style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
    GAME
  </label>
  <select
    id="game_id"
    name="game_id"
    defaultValue={server.game_id ?? ''}
    required
    style={{
      fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.08em',
      color: 'var(--ink)', background: 'rgba(7,6,12,0.8)',
      border: '1px solid var(--hair)', padding: '10px 14px',
      outline: 'none', cursor: 'pointer',
      appearance: 'none', WebkitAppearance: 'none',
    }}
  >
    {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
  </select>
</div>
```

Also update `handleSubmit` in the edit page to send `game_id` instead of `protocol`:
```typescript
const body = {
  name: data.get('name') as string,
  host: data.get('host') as string,
  port: Number(data.get('port')),
  game_id: data.get('game_id') as string,
};
```

Update `ServerData` type:
```typescript
type ServerData = {
  id: string;
  name: string;
  host: string;
  port: number;
  game_id: string | null;
  hidden: boolean;
};
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/servers/page.tsx app/admin/servers/new/page.tsx app/admin/servers/new/NewServerForm.tsx app/admin/servers/[id]/page.tsx app/api/admin/games/route.ts
git commit -m "GH-5: server pages — game dropdown replaces protocol, null-safe display"
```

---

## Task 11: Fix `SystemSection` — connect strings + sceneGames

**Files:**
- Modify: `components/sections/SystemSection.tsx`

> **Invoke `frontend-design` skill before modifying this file.**

- [ ] **Step 1: Remove static `CONNECT_STRINGS`, build from API response**

In `SystemSection.tsx`:

1. Delete the `CONNECT_STRINGS` constant entirely (lines 54-62 — the IIFE that builds from static `GAMES`).

2. Update `ApiServer` to include `host` and `port`:

```typescript
interface ApiServer {
  id: string;
  name: string;
  host: string;    // add
  port: number;    // add
  online: boolean;
  players: number | null;
  maxPlayers: number | null;
  map: string | null;
  ping: number | null;
  updatedAt: number | null;
}
```

3. Update `ApiResponse` — remove `servers?: ApiServer[]` (DB mode now always returns `games`):

```typescript
interface ApiResponse {
  games?: ApiGame[];
  updatedAt: number | null;
}
```

4. Remove the `sameApiSnapshot` function's `servers` branch (lines 74-93) since DB mode no longer returns a flat `servers` list.

5. Update the `games` memo — remove the `data.servers` branch, build `connectStrings` from the API data:

```typescript
const games: OverlayGame[] = React.useMemo(() => {
  if (!data?.games) return [];
  return data.games.map((g) => ({
    id: g.id,
    name: g.name,
    servers: g.servers.map<OverlayServer>((s) => ({
      id: s.id,
      name: s.name,
      online: s.online,
      players: s.players,
      maxPlayers: s.maxPlayers,
      map: s.map,
      ping: s.ping,
      updatedAt: s.updatedAt,
    })),
    connectStrings: Object.fromEntries(
      g.servers.map((s) => [s.id, `${s.host}:${s.port}`])
    ),
  }));
}, [data]);
```

6. Simplify `sceneGames` memo — `data.games` is now the only shape:

```typescript
const sceneGames = React.useMemo(
  () =>
    (data?.games ?? []).map((g) => ({
      id: g.id,
      planet: g.planet,
      servers: g.servers.map((s) => ({
        id: s.id,
        online: s.online,
        players: s.players,
        maxPlayers: s.maxPlayers,
        ping: s.ping,
      })),
    })),
  [data],
);
```

7. Update `isEmpty` — remove the `games.length === 0` guard that was special-casing the flat servers mode; it now reads simply:

```typescript
const isEmpty = !isLoading && (!data?.games || data.games.length === 0) && !error;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/sections/SystemSection.tsx
git commit -m "GH-5: SystemSection — connect strings from API, unified games shape"
```

---

## Task 12: Scene — fixed gray moon color

**Files:**
- Modify: `components/solar-system/Scene.tsx`

> **Invoke `frontend-design` skill before modifying this file.**

- [ ] **Step 1: Replace status-based moon hue with fixed gray**

In `Scene.tsx`, find the moon material block (around line 611-619):

```typescript
const tone = statusOf(srv);
const moonHue =
  tone === 'on' ? 145 : tone === 'warn' ? 40 : 0;
const mMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color(`hsl(${moonHue + (mi - 1) * 10}, 50%, 55%)`),
  emissive: new THREE.Color(`hsl(${moonHue}, 60%, 30%)`),
  emissiveIntensity: 0.6,
  roughness: 0.85,
  metalness: 0.1,
});
```

Replace with:

```typescript
const mMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#8a8fa8'),
  emissive: new THREE.Color('#3a3d4a'),
  emissiveIntensity: 0.4,
  roughness: 0.9,
  metalness: 0.05,
});
```

Note: status is still conveyed via the HUD overlay dot indicators — the moon's gray color is its resting state; online/offline is a HUD concern, not a geometry color.

- [ ] **Step 2: Commit**

```bash
git add components/solar-system/Scene.tsx
git commit -m "GH-5: Scene — fixed gray moon color"
```

---

## Task 13: Run all tests + smoke check

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass

- [ ] **Step 2: Start dev server and smoke check**

```bash
npm run dev
```

Verify:
1. Navigate to `/admin/games` — shows "NO GAMES CONFIGURED"
2. Add a game (e.g. Enshrouded, SOURCE) — redirects back to list, planet color swatch visible
3. Navigate to `/admin/servers/new` — GAME dropdown shows Enshrouded
4. Add a server with the IP/port from earlier testing
5. Navigate to `/` — planet view shows the game with its server as a moon
6. Moon is gray; planet is the deterministic color

- [ ] **Step 3: Commit any fixups, then done**

```bash
git add -p   # stage only intentional changes
git commit -m "GH-5: fixups from smoke check"
```
