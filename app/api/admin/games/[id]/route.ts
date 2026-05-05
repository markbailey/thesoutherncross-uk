import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '../../../../../lib/auth/session';
import { isAdmin } from '../../../../../lib/auth/roles';
import { deleteGame, getGameById } from '../../../../../lib/repos/games';
import { jsonNoStore } from '../../../../../lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.steamid || !isAdmin(session.steamid)) {
    return jsonNoStore({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!getGameById(id)) return jsonNoStore({ error: 'not found' }, { status: 404 });

  try {
    deleteGame(id);
    return jsonNoStore({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'delete failed';
    return jsonNoStore({ error: msg }, { status: 422 });
  }
}
