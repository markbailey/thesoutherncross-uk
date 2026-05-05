import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '../../../../../lib/db';
import { createGame } from '../../../../../lib/repos/games';

// --- Mock next/headers cookies() ---
const mockCookieStore = { get: vi.fn(), getAll: vi.fn(() => []) };
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

// --- Mock lib/auth/session (avoids SESSION_SECRET env-var throw at import time) ---
vi.mock('../../../../../lib/auth/session', () => ({
  sessionOptions: { password: 'test-secret', cookieName: 'tsx-session' },
}));

// --- Mock iron-session ---
type MockSession = {
  steamid?: string;
  persona?: string;
  avatar?: string;
  isAdmin?: boolean;
};

const mockSessionData: MockSession = {};
vi.mock('iron-session', () => ({
  getIronSession: vi.fn(async () => ({
    ...mockSessionData,
  })),
}));

// --- Mock lib/auth/roles.isAdmin ---
const isAdminMock = vi.fn((_steamid: string | undefined): boolean => false);
vi.mock('../../../../../lib/auth/roles', () => ({
  isAdmin: (...args: unknown[]) => isAdminMock(args[0] as string | undefined),
}));

// Import route handler after all mocks are set up
import { DELETE } from './route';

const BASE_URL = 'http://localhost:3000/api/admin/games';

function makeRequest(method: string, id: string): NextRequest {
  return new NextRequest(`${BASE_URL}/${id}`, { method });
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function asAdmin() {
  Object.assign(mockSessionData, { steamid: '76561198051971258' });
  isAdminMock.mockReturnValue(true);
}

function asGuest() {
  Object.assign(mockSessionData, { steamid: undefined });
  isAdminMock.mockReturnValue(false);
}

describe('DELETE /api/admin/games/[id]', () => {
  let gameId: string;

  beforeEach(() => {
    closeDb();
    getDb({ dbPath: ':memory:' });
    gameId = createGame({ name: 'Test Game', protocol: 'source' });
    isAdminMock.mockReset();
  });

  afterEach(() => {
    closeDb();
    vi.clearAllMocks();
  });

  it('returns 403 when not authenticated', async () => {
    asGuest();
    const res = await DELETE(makeRequest('DELETE', gameId), makeCtx(gameId));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('forbidden');
  });

  it('returns 403 when session has steamid but isAdmin is false', async () => {
    Object.assign(mockSessionData, { steamid: '76561198000000999' });
    isAdminMock.mockReturnValue(false);

    const res = await DELETE(makeRequest('DELETE', gameId), makeCtx(gameId));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('forbidden');
  });

  it('returns 404 for unknown id', async () => {
    asAdmin();
    const res = await DELETE(makeRequest('DELETE', 'no-such-game'), makeCtx('no-such-game'));
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('not found');
  });

  it('returns 200 and removes the game row', async () => {
    asAdmin();
    const res = await DELETE(makeRequest('DELETE', gameId), makeCtx(gameId));
    expect(res.status).toBe(200);
    const resBody = await res.json() as { ok: boolean };
    expect(resBody.ok).toBe(true);

    const row = getDb()
      .prepare('SELECT id FROM games WHERE id = ?')
      .get(gameId);
    expect(row).toBeUndefined();
  });

  it('returns 404 on second delete of same id', async () => {
    asAdmin();
    await DELETE(makeRequest('DELETE', gameId), makeCtx(gameId));
    const res = await DELETE(makeRequest('DELETE', gameId), makeCtx(gameId));
    expect(res.status).toBe(404);
  });

  it('returns 422 when game has servers attached', async () => {
    asAdmin();
    // Attach a server to the game so deleteGame throws
    const now = Date.now();
    getDb()
      .prepare(
        `INSERT INTO servers (id, name, host, port, game_id, hidden, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run('srv-1', 'Some Server', '1.2.3.4', 27015, gameId, 0, now, now);

    const res = await DELETE(makeRequest('DELETE', gameId), makeCtx(gameId));
    expect(res.status).toBe(422);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/server/i);
  });
});
