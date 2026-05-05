import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '../../../../../lib/auth/session';
import { isAdmin } from '../../../../../lib/auth/roles';
import { getById, updateServer, deleteServer, setHidden } from '../../../../../lib/repos/servers';
import { getGameById } from '../../../../../lib/repos/games';
import { jsonNoStore } from '../../../../../lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin(): Promise<SessionData | null> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.steamid || !isAdmin(session.steamid)) return null;
  return session;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) return jsonNoStore({ error: 'forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  const server = getById(id);
  if (!server) return jsonNoStore({ error: 'not found' }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return jsonNoStore({ error: 'invalid json' }, { status: 400 }); }

  if (typeof body !== 'object' || body === null) {
    return jsonNoStore({ error: 'invalid body' }, { status: 400 });
  }

  const { name, host, port, game_id } = body as Record<string, unknown>;
  const patch: Parameters<typeof updateServer>[1] = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return jsonNoStore({ error: 'name must be non-empty string' }, { status: 400 });
    }
    patch.name = name.trim();
  }
  if (host !== undefined) {
    if (typeof host !== 'string' || !host.trim()) {
      return jsonNoStore({ error: 'host must be non-empty string' }, { status: 400 });
    }
    patch.host = host.trim();
  }
  if (port !== undefined) {
    const portNum = Number(port);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      return jsonNoStore({ error: 'invalid port' }, { status: 400 });
    }
    patch.port = portNum;
  }
  if (game_id !== undefined) {
    if (typeof game_id !== 'string' || !game_id.trim()) {
      return jsonNoStore({ error: 'game_id must be non-empty string' }, { status: 400 });
    }
    if (!getGameById(game_id)) {
      return jsonNoStore({ error: 'game not found' }, { status: 422 });
    }
    patch.game_id = game_id;
  }

  updateServer(id, patch);
  return jsonNoStore({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) return jsonNoStore({ error: 'forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  if (!getById(id)) return jsonNoStore({ error: 'not found' }, { status: 404 });

  deleteServer(id);
  return jsonNoStore({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) return jsonNoStore({ error: 'forbidden' }, { status: 403 });

  const { id } = await ctx.params;
  if (!getById(id)) return jsonNoStore({ error: 'not found' }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return jsonNoStore({ error: 'invalid json' }, { status: 400 }); }

  if (typeof body !== 'object' || body === null) {
    return jsonNoStore({ error: 'invalid body' }, { status: 400 });
  }

  const { hidden } = body as Record<string, unknown>;
  if (typeof hidden !== 'boolean') {
    return jsonNoStore({ error: 'hidden must be boolean' }, { status: 400 });
  }

  setHidden(id, hidden);
  return jsonNoStore({ ok: true });
}
