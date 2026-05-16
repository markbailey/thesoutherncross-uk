import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/auth/require-admin';
import { getById } from '../../../../../../lib/repos/servers';
import { jsonNoStore } from '../../../../../../lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) return jsonNoStore({ error: 'forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  const server = getById(id);
  if (!server) return jsonNoStore({ error: 'not found' }, { status: 404 });

  return jsonNoStore({
    id: server.id,
    name: server.name,
    host: server.host,
    port: server.port,
    game_id: server.game_id,
    hidden: Boolean(server.hidden),
  });
}
