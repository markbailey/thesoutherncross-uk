import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDb, closeDb } from '../../../lib/db';
import { createGame } from '../../../lib/repos/games';
import { GET } from './route';

type ServersResponse = {
  games: {
    id: string;
    name: string;
    planet: { color: string; size: number; orbitRadius: number; orbitSpeed: number };
    servers: {
      id: string;
      name: string;
      host: string;
      port: number;
      online: boolean;
      players: number | null;
      maxPlayers: number | null;
      map: string | null;
      ping: number | null;
      updatedAt: number | null;
    }[];
  }[];
  updatedAt: number | null;
};

function insertServer(
  id: string,
  gameId: string | null,
  hidden: 0 | 1,
  overrides: Partial<{ name: string; host: string; port: number }> = {},
) {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO servers (id, name, host, port, game_id, hidden, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      overrides.name ?? 'Test Server',
      overrides.host ?? '1.2.3.4',
      overrides.port ?? 27015,
      gameId,
      hidden,
      now,
      now,
    );
}

function insertStatus(
  serverId: string,
  opts: { online?: number; players?: number; maxPlayers?: number; map?: string; ping?: number; updatedAt?: number } = {},
) {
  const now = opts.updatedAt ?? Date.now();
  getDb()
    .prepare(
      `INSERT INTO server_status (id, online, players, max_players, map, ping, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      serverId,
      opts.online ?? 1,
      opts.players ?? null,
      opts.maxPlayers ?? null,
      opts.map ?? null,
      opts.ping ?? null,
      now,
    );
}

describe('GET /api/servers', () => {
  beforeEach(() => {
    closeDb();
    getDb({ dbPath: ':memory:' });
  });

  afterEach(() => {
    closeDb();
    vi.unstubAllEnvs();
  });

  it('returns empty games array when db has no servers', async () => {
    createGame({ name: 'Counter-Strike', protocol: 'source' });

    const res = GET();
    expect(res.status).toBe(200);
    const body = await res.json() as ServersResponse;
    expect(body.games).toEqual([]);
    expect(body.updatedAt).toBeNull();
  });

  it('returns games with visible servers', async () => {
    const gameId = createGame({ name: 'Counter-Strike', protocol: 'source' });
    insertServer('srv-1', gameId, 0, { name: 'CS Server' });

    const res = GET();
    expect(res.status).toBe(200);
    const body = await res.json() as ServersResponse;
    expect(body.games).toHaveLength(1);
    expect(body.games[0].id).toBe(gameId);
    expect(body.games[0].servers).toHaveLength(1);
    expect(body.games[0].servers[0].id).toBe('srv-1');
  });

  it('excludes hidden servers', async () => {
    const gameId = createGame({ name: 'Game', protocol: 'source' });
    insertServer('hidden-srv', gameId, 1);

    const res = GET();
    const body = await res.json() as ServersResponse;
    expect(body.games).toHaveLength(0);
  });

  it('excludes servers with null game_id', async () => {
    createGame({ name: 'Game', protocol: 'source' });
    insertServer('orphan-srv', null, 0);

    const res = GET();
    const body = await res.json() as ServersResponse;
    expect(body.games).toHaveLength(0);
  });

  it('excludes games that have no visible servers', async () => {
    createGame({ name: 'Empty Game', protocol: 'source' });

    const res = GET();
    const body = await res.json() as ServersResponse;
    expect(body.games).toHaveLength(0);
  });

  it('reflects online status and stats from server_status', async () => {
    const gameId = createGame({ name: 'Game', protocol: 'source' });
    insertServer('srv-1', gameId, 0);
    const ts = Date.now();
    insertStatus('srv-1', { online: 1, players: 5, maxPlayers: 16, map: 'de_dust2', ping: 42, updatedAt: ts });

    const res = GET();
    const body = await res.json() as ServersResponse;
    const srv = body.games[0].servers[0];
    expect(srv.online).toBe(true);
    expect(srv.players).toBe(5);
    expect(srv.maxPlayers).toBe(16);
    expect(srv.map).toBe('de_dust2');
    expect(srv.ping).toBe(42);
    expect(body.updatedAt).toBe(ts);
  });

  it('returns online=false and null stats when server has no status row', async () => {
    const gameId = createGame({ name: 'Game', protocol: 'source' });
    insertServer('srv-1', gameId, 0);

    const res = GET();
    const body = await res.json() as ServersResponse;
    const srv = body.games[0].servers[0];
    expect(srv.online).toBe(false);
    expect(srv.players).toBeNull();
    expect(srv.maxPlayers).toBeNull();
    expect(srv.map).toBeNull();
    expect(srv.ping).toBeNull();
    expect(srv.updatedAt).toBeNull();
  });

  it('orders servers by id ASC within a game', async () => {
    const gameId = createGame({ name: 'Game', protocol: 'source' });
    insertServer('z-server', gameId, 0, { name: 'Z Server' });
    insertServer('a-server', gameId, 0, { name: 'A Server' });

    const res = GET();
    const body = await res.json() as ServersResponse;
    const ids = body.games[0].servers.map((s) => s.id);
    expect(ids).toEqual(['a-server', 'z-server']);
  });

  it('returns demo response when DEMO_SERVERS=1', () => {
    vi.stubEnv('DEMO_SERVERS', '1');
    const res = GET();
    expect(res.status).toBe(200);
  });
});
