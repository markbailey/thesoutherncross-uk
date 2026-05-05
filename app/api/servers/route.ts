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

    const result = games.flatMap((g) => {
      const srvRows = serverMap.get(g.id);
      if (!srvRows || srvRows.length === 0) return [];
      const servers = srvRows.map((s) => {
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
