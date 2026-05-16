import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth/require-admin';
import { deleteGame, getGameById } from '../../../../../lib/repos/games';
import { jsonNoStore } from '../../../../../lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) return jsonNoStore({ error: 'forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  if (!getGameById(id)) return jsonNoStore({ error: 'not found' }, { status: 404 });

  try {
    deleteGame(id);
    return jsonNoStore({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes('has servers'))
      return jsonNoStore({ error: 'Cannot delete game: it still has servers assigned' }, { status: 422 });
    throw e;
  }
}
