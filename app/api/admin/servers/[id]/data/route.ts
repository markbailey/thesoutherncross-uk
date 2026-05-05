import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '../../../../../../lib/auth/session';
import { isAdmin } from '../../../../../../lib/auth/roles';
import { getById } from '../../../../../../lib/repos/servers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.steamid || !isAdmin(session.steamid)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await ctx.params;
  const server = getById(id);
  if (!server) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({
    id: server.id,
    name: server.name,
    host: server.host,
    port: server.port,
    protocol: server.protocol,
    hidden: Boolean(server.hidden),
  });
}
