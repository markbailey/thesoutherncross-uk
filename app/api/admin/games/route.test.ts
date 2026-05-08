import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '../../../../lib/db';

// --- Mock next/headers cookies() ---
const mockCookieStore = { get: vi.fn(), getAll: vi.fn(() => []) };
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

// --- Mock lib/auth/session (avoids SESSION_SECRET env-var throw at import time) ---
vi.mock('../../../../lib/auth/session', () => ({
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
vi.mock('../../../../lib/auth/roles', () => ({
  isAdmin: (...args: unknown[]) => isAdminMock(args[0] as string | undefined),
}));

// Import route handlers after all mocks are set up
import { GET, POST } from './route';

const BASE_URL = 'http://localhost:3000/api/admin/games';

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function asAdmin() {
  Object.assign(mockSessionData, { steamid: '76561198051971258' });
  isAdminMock.mockReturnValue(true);
}

function asGuest() {
  Object.assign(mockSessionData, { steamid: undefined });
  isAdminMock.mockReturnValue(false);
}

describe('GET /api/admin/games', () => {
  beforeEach(() => {
    closeDb();
    getDb({ dbPath: ':memory:' });
    isAdminMock.mockReset();
  });

  afterEach(() => {
    closeDb();
    vi.clearAllMocks();
  });

  it('returns 403 when not authenticated', async () => {
    asGuest();
    const res = await GET();
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('forbidden');
  });

  it('returns 200 with games list when admin', async () => {
    asAdmin();
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as { games: { id: string; name: string }[] };
    expect(Array.isArray(body.games)).toBe(true);
  });

  it('returns games seeded into the db', async () => {
    asAdmin();
    // Seed directly via SQL to avoid import-order issues with mocks
    getDb().prepare(
      `INSERT INTO games (id, name, protocol, orbit_index, created_at) VALUES (?, ?, ?, ?, ?)`,
    ).run('test-game', 'Test Game', 'source', 0, Date.now());

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as { games: { id: string; name: string }[] };
    expect(body.games).toHaveLength(1);
    expect(body.games[0]).toEqual({ id: 'test-game', name: 'Test Game' });
  });
});

describe('POST /api/admin/games', () => {
  beforeEach(() => {
    closeDb();
    getDb({ dbPath: ':memory:' });
    isAdminMock.mockReset();
  });

  afterEach(() => {
    closeDb();
    vi.clearAllMocks();
  });

  it('returns 403 when no session (no steamid)', async () => {
    Object.assign(mockSessionData, { steamid: undefined });
    isAdminMock.mockReturnValue(false);

    const res = await POST(makePostRequest({ name: 'My Game', protocol: 'source' }));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('forbidden');
  });

  it('returns 403 when session has steamid but isAdmin is false', async () => {
    Object.assign(mockSessionData, { steamid: '76561198000000999' });
    isAdminMock.mockReturnValue(false);

    const res = await POST(makePostRequest({ name: 'My Game', protocol: 'source' }));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('forbidden');
  });

  it('returns 400 for invalid JSON body', async () => {
    asAdmin();
    const req = new NextRequest(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('invalid json');
  });

  it('returns 400 for missing name', async () => {
    asAdmin();
    const res = await POST(makePostRequest({ protocol: 'source' }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/name/);
  });

  it('returns 400 for whitespace-only name', async () => {
    asAdmin();
    const res = await POST(makePostRequest({ name: '   ', protocol: 'source' }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/name/);
  });

  it('returns 400 for invalid protocol', async () => {
    asAdmin();
    const res = await POST(makePostRequest({ name: 'My Game', protocol: 'quake' }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/protocol/);
  });

  it('returns 422 when name would produce an empty slug', async () => {
    asAdmin();
    // All non-alphanumeric chars → slug becomes empty after stripping leading/trailing hyphens
    const res = await POST(makePostRequest({ name: '---', protocol: 'source' }));
    expect(res.status).toBe(422);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/slug/);
  });

  it('returns 201 and creates a game row on valid body', async () => {
    asAdmin();
    const res = await POST(makePostRequest({ name: 'Counter-Strike', protocol: 'source' }));
    expect(res.status).toBe(201);
    const body = await res.json() as { id: string };
    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThan(0);

    const row = getDb()
      .prepare('SELECT id, name, protocol FROM games WHERE id = ?')
      .get(body.id) as { id: string; name: string; protocol: string } | undefined;
    expect(row).toBeDefined();
    expect(row?.name).toBe('Counter-Strike');
    expect(row?.protocol).toBe('source');
  });

  it('returns 201 for minecraft protocol', async () => {
    asAdmin();
    const res = await POST(makePostRequest({ name: 'Vanilla MC', protocol: 'minecraft' }));
    expect(res.status).toBe(201);
    const body = await res.json() as { id: string };
    expect(typeof body.id).toBe('string');

    const row = getDb()
      .prepare('SELECT protocol FROM games WHERE id = ?')
      .get(body.id) as { protocol: string } | undefined;
    expect(row?.protocol).toBe('minecraft');
  });
});
