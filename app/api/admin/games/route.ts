import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth/require-admin';
import { createGame, listAllGames } from '../../../../lib/repos/games';
import { jsonNoStore } from '../../../../lib/api-helpers';
import type { Protocol } from '../../../../lib/types/servers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) return jsonNoStore({ error: 'forbidden' }, { status: 403 });
  const games = listAllGames();
  return jsonNoStore({ games: games.map((g) => ({ id: g.id, name: g.name })) });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (!admin) return jsonNoStore({ error: 'forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonNoStore({ error: 'invalid json' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return jsonNoStore({ error: 'invalid body' }, { status: 400 });
  }

  const { name, protocol } = body as Record<string, unknown>;

  if (typeof name !== 'string' || !name.trim()) {
    return jsonNoStore({ error: 'name required' }, { status: 400 });
  }
  if (protocol !== 'source' && protocol !== 'minecraft') {
    return jsonNoStore({ error: 'invalid protocol' }, { status: 400 });
  }

  const trimmedName = name.trim();
  const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!slug) {
    return jsonNoStore({ error: 'name produces an empty slug — use alphanumeric characters' }, { status: 422 });
  }

  const id = createGame({ name: trimmedName, protocol: protocol as Protocol });
  return jsonNoStore({ id }, { status: 201 });
}
