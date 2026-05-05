import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '../../../../lib/db';
import { createGame } from '../../../../lib/repos/games';

// --- Mock next/headers cookies() ---
const mockCookieStore = { get: vi.fn(), getAll: vi.fn(() => []) };
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

// --- Mock lib/auth/session (avoids SESSION_SECRET env-var throw at import time) ---
vi.mock('../../../../lib/auth/session', () => ({
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
vi.mock('../../../../lib/auth/roles', () => ({
  isAdmin: (...args: unknown[]) => isAdminMock(args[0] as string | undefined),
}));

// Import route after all mocks are set up
import { POST } from './route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/servers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/servers', () => {
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

  it('returns 403 when no session (no steamid)', async () => {
    Object.assign(mockSessionData, { steamid: undefined });
    isAdminMock.mockReturnValue(false);

    const res = await POST(makeRequest({ name: 'Test', host: '1.2.3.4', port: 27015, game_id: gameId }));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('forbidden');
  });

  it('returns 403 when session has steamid but isAdmin is false', async () => {
    Object.assign(mockSessionData, { steamid: '76561198000000999' });
    isAdminMock.mockReturnValue(false);

    const res = await POST(makeRequest({ name: 'Test', host: '1.2.3.4', port: 27015, game_id: gameId }));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('forbidden');
  });

  it('returns 201 and creates server row when admin posts valid body', async () => {
    Object.assign(mockSessionData, { steamid: '76561198051971258' });
    isAdminMock.mockReturnValue(true);

    const res = await POST(
      makeRequest({ name: 'Alpha Server', host: 'game.example.com', port: 27015, game_id: gameId }),
    );
    expect(res.status).toBe(201);
    const body = await res.json() as { id: string };
    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThan(0);

    const db = getDb();
    const row = db.prepare('SELECT id, name, host, port, game_id FROM servers WHERE id = ?').get(body.id) as
      | { id: string; name: string; host: string; port: number; game_id: string }
      | undefined;
    expect(row).toBeDefined();
    expect(row?.name).toBe('Alpha Server');
    expect(row?.host).toBe('game.example.com');
    expect(row?.port).toBe(27015);
    expect(row?.game_id).toBe(gameId);
  });

  it('returns 400 for missing name', async () => {
    Object.assign(mockSessionData, { steamid: '76561198051971258' });
    isAdminMock.mockReturnValue(true);

    const res = await POST(makeRequest({ host: '1.2.3.4', port: 27015, game_id: gameId }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid port', async () => {
    Object.assign(mockSessionData, { steamid: '76561198051971258' });
    isAdminMock.mockReturnValue(true);

    const res = await POST(makeRequest({ name: 'Test', host: '1.2.3.4', port: 99999, game_id: gameId }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing game_id', async () => {
    Object.assign(mockSessionData, { steamid: '76561198051971258' });
    isAdminMock.mockReturnValue(true);

    const res = await POST(makeRequest({ name: 'Test', host: '1.2.3.4', port: 27015 }));
    expect(res.status).toBe(400);
  });

  it('returns 422 for unknown game_id', async () => {
    Object.assign(mockSessionData, { steamid: '76561198051971258' });
    isAdminMock.mockReturnValue(true);

    const res = await POST(makeRequest({ name: 'Test', host: '1.2.3.4', port: 27015, game_id: 'no-such-game' }));
    expect(res.status).toBe(422);
  });
});
