import { getDb, getMetaFlag } from '../../../lib/db';
import { jsonNoStore } from '../../../lib/api-helpers';
import { childLogger } from '../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type MemberRow = {
  steamid: string;
  persona: string | null;
  avatar: string | null;
  state: number | null;
  game_id: string | null;
  game_name: string | null;
  last_logoff: number | null;
  updated_at: number;
};

const log = childLogger({ mod: 'api/members' });

export function GET(): Response {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT steamid, persona, avatar, state, game_id, game_name, last_logoff, updated_at
         FROM members
         ORDER BY updated_at DESC`,
      )
      .all() as MemberRow[];

    const stale = getMetaFlag('members.stale');

    if (rows.length === 0) {
      return jsonNoStore({ members: [], stale: false, updatedAt: null });
    }

    let mostRecent = 0;
    const members = rows.map((r) => {
      if (r.updated_at > mostRecent) mostRecent = r.updated_at;
      return {
        steamid: r.steamid,
        persona: r.persona,
        avatar: r.avatar,
        state: r.state,
        game:
          r.game_id || r.game_name
            ? { id: r.game_id, name: r.game_name }
            : null,
        lastLogoff: r.last_logoff,
      };
    });

    return jsonNoStore({ members, stale, updatedAt: mostRecent });
  } catch (err) {
    log.error({ err }, '/api/members failed');
    return jsonNoStore({ error: 'internal' }, { status: 500 });
  }
}
