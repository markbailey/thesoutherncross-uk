import { GAMES } from '../../../config/servers';
import { buildDemoServersResponse } from '../../../config/demo-servers';
import { getDb } from '../../../lib/db';
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
  // DEMO_SERVERS=1 short-circuits the DB read and returns a canned dataset
  // so the System section can be shown without configured hosts or pollers.
  if (process.env.DEMO_SERVERS === '1') {
    return jsonNoStore(buildDemoServersResponse());
  }

  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT id, online, players, max_players, map, ping, updated_at FROM server_status`,
      )
      .all() as StatusRow[];

    const byId = new Map<string, StatusRow>();
    for (const row of rows) byId.set(row.id, row);

    let mostRecent: number | null = null;

    const games = GAMES.map((game) => ({
      id: game.id,
      name: game.name,
      planet: game.planet,
      servers: game.servers
        .filter((s) => !s.hidden)
        .map((s) => {
          const row = byId.get(s.id);
          if (row && (mostRecent === null || row.updated_at > mostRecent)) {
            mostRecent = row.updated_at;
          }
          return {
            id: s.id,
            name: s.name,
            online: Boolean(row?.online),
            players: row?.players ?? null,
            maxPlayers: row?.max_players ?? null,
            map: row?.map ?? null,
            ping: row?.ping ?? null,
            updatedAt: row?.updated_at ?? null,
          };
        }),
    }));

    return jsonNoStore({ games, updatedAt: mostRecent });
  } catch (err) {
    log.error({ err }, '/api/servers failed');
    return jsonNoStore({ error: 'internal' }, { status: 500 });
  }
}
