import { getDb, getMetaFlag } from '../../../lib/db';
import { jsonNoStore } from '../../../lib/api-helpers';
import { childLogger } from '../../../lib/logger';
import { GUILD } from '../../../config/guild';
import { type MemberRole, roleFor } from '../../../lib/member-roles';

export type { MemberRole };

const ROLE_ORDER: Record<MemberRole, number> = {
  founder: 0,
  officer: 1,
  moderator: 2,
  member: 3,
};

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
      // Surface the stale flag even when empty — a Steam refresh that fails
      // before any successful write leaves rows=0 + stale=true, and the UI
      // needs that signal to render the "stale data" chip rather than a clean
      // empty state.
      return jsonNoStore({ members: [], stale, updatedAt: null });
    }

    let mostRecent = 0;
    const { officers, moderators } = GUILD.roles;
    const officerIndex = new Map(officers.map((id, i) => [id, i]));
    const moderatorIndex = new Map(moderators.map((id, i) => [id, i]));

    const members = rows.map((r, dbIndex) => {
      if (r.updated_at > mostRecent) mostRecent = r.updated_at;
      const role = roleFor(r.steamid);
      // Sort key: role bucket first, then config order within officer/moderator,
      // then DB order for plain members. Founder is unique so its inner index
      // is irrelevant.
      const innerIndex =
        role === 'officer'
          ? (officerIndex.get(r.steamid) ?? 0)
          : role === 'moderator'
            ? (moderatorIndex.get(r.steamid) ?? 0)
            : dbIndex;
      return {
        member: {
          steamid: r.steamid,
          persona: r.persona,
          avatar: r.avatar,
          state: r.state,
          game:
            r.game_id || r.game_name
              ? { id: r.game_id, name: r.game_name }
              : null,
          lastLogoff: r.last_logoff,
          role,
        },
        sortKey: [ROLE_ORDER[role], innerIndex] as const,
      };
    });

    members.sort((a, b) => {
      if (a.sortKey[0] !== b.sortKey[0]) return a.sortKey[0] - b.sortKey[0];
      return a.sortKey[1] - b.sortKey[1];
    });

    return jsonNoStore({
      members: members.map((m) => m.member),
      stale,
      updatedAt: mostRecent,
    });
  } catch (err) {
    log.error({ err }, '/api/members failed');
    return jsonNoStore({ error: 'internal' }, { status: 500 });
  }
}
