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
