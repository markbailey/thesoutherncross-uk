import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '../../../../../../lib/db';
import { createGame } from '../../../../../../lib/repos/games';
import { createServer } from '../../../../../../lib/repos/servers';

// --- Mock next/headers cookies() ---
const mockCookieStore = { get: vi.fn(), getAll: vi.fn(() => []) };
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

// --- Mock lib/auth/session (avoids SESSION_SECRET env-var throw at import time) ---
vi.mock('../../../../../../lib/auth/session', () => ({
  getSessionOptions: () => ({ password: 'test-secret', cookieName: 'tsx-session' }),
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
vi.mock('../../../../../../lib/auth/roles', () => ({
  isAdmin: (...args: unknown[]) => isAdminMock(args[0] as string | undefined),
}));

// Import route handler after all mocks are set up
import { GET } from './route';

const BASE_URL = 'http://localhost:3000/api/admin/servers';

function makeRequest(id: string): NextRequest {
  return new NextRequest(`${BASE_URL}/${id}/data`, { method: 'GET' });
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

describe('GET /api/admin/servers/[id]/data', () => {
  let gameId: string;
  let serverId: string;

  beforeEach(() => {
    closeDb();
    getDb({ dbPath: ':memory:' });
    gameId = createGame({ name: 'Test Game', protocol: 'source' });
    serverId = createServer({ name: 'Alpha Server', host: '1.2.3.4', port: 27015, game_id: gameId });
    isAdminMock.mockReset();
  });

  afterEach(() => {
    closeDb();
    vi.clearAllMocks();
  });

  it('returns 403 when not admin', async () => {
    asGuest();
    const res = await GET(makeRequest(serverId), makeCtx(serverId));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('forbidden');
  });

  it('returns 404 for unknown server id', async () => {
    asAdmin();
    const res = await GET(makeRequest('no-such-id'), makeCtx('no-such-id'));
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('not found');
  });

  it('returns 200 with server fields for a known server', async () => {
    asAdmin();
    const res = await GET(makeRequest(serverId), makeCtx(serverId));
    expect(res.status).toBe(200);
    const body = await res.json() as {
      id: string;
      name: string;
      host: string;
      port: number;
      game_id: string;
      hidden: boolean;
    };
    expect(body.id).toBe(serverId);
    expect(body.name).toBe('Alpha Server');
    expect(body.host).toBe('1.2.3.4');
    expect(body.port).toBe(27015);
    expect(body.game_id).toBe(gameId);
    expect(body.hidden).toBe(false);
  });
});
