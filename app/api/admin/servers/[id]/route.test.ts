import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getDb, closeDb } from '../../../../../lib/db';
import { createGame } from '../../../../../lib/repos/games';
import { createServer } from '../../../../../lib/repos/servers';

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

// Import route handlers after all mocks are set up
import { PUT, PATCH, DELETE } from './route';

const BASE_URL = 'http://localhost:3000/api/admin/servers';

function makeRequest(method: string, id: string, body?: unknown): NextRequest {
  return new NextRequest(`${BASE_URL}/${id}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
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

describe('PUT /api/admin/servers/[id]', () => {
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

  it('returns 403 when not authenticated', async () => {
    asGuest();
    const res = await PUT(makeRequest('PUT', serverId, { name: 'New Name' }), makeCtx(serverId));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('forbidden');
  });

  it('returns 404 for unknown id', async () => {
    asAdmin();
    const res = await PUT(makeRequest('PUT', 'no-such-id', { name: 'New Name' }), makeCtx('no-such-id'));
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('not found');
  });

  it('returns 400 for invalid JSON body', async () => {
    asAdmin();
    const req = new NextRequest(`${BASE_URL}/${serverId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });
    const res = await PUT(req, makeCtx(serverId));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('invalid json');
  });

  it('returns 400 for empty-string name', async () => {
    asAdmin();
    const res = await PUT(makeRequest('PUT', serverId, { name: '   ' }), makeCtx(serverId));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/name/);
  });

  it('returns 400 for invalid port', async () => {
    asAdmin();
    const res = await PUT(makeRequest('PUT', serverId, { port: 99999 }), makeCtx(serverId));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/port/);
  });

  it('returns 422 for unknown game_id', async () => {
    asAdmin();
    const res = await PUT(makeRequest('PUT', serverId, { game_id: 'no-such-game' }), makeCtx(serverId));
    expect(res.status).toBe(422);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/game/);
  });

  it('returns 200 and updates fields on valid body', async () => {
    asAdmin();
    const game2 = createGame({ name: 'Other Game', protocol: 'source' });
    const res = await PUT(
      makeRequest('PUT', serverId, { name: 'Beta Server', host: '5.6.7.8', port: 27016, game_id: game2 }),
      makeCtx(serverId),
    );
    expect(res.status).toBe(200);
    const resBody = await res.json() as { ok: boolean };
    expect(resBody.ok).toBe(true);

    const row = getDb()
      .prepare('SELECT name, host, port, game_id FROM servers WHERE id = ?')
      .get(serverId) as { name: string; host: string; port: number; game_id: string } | undefined;
    expect(row?.name).toBe('Beta Server');
    expect(row?.host).toBe('5.6.7.8');
    expect(row?.port).toBe(27016);
    expect(row?.game_id).toBe(game2);
  });

  it('returns 200 and updates only provided fields', async () => {
    asAdmin();
    const res = await PUT(makeRequest('PUT', serverId, { name: 'Renamed' }), makeCtx(serverId));
    expect(res.status).toBe(200);

    const row = getDb()
      .prepare('SELECT name, host, port FROM servers WHERE id = ?')
      .get(serverId) as { name: string; host: string; port: number } | undefined;
    expect(row?.name).toBe('Renamed');
    expect(row?.host).toBe('1.2.3.4'); // unchanged
    expect(row?.port).toBe(27015);    // unchanged
  });
});

describe('PATCH /api/admin/servers/[id]', () => {
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

  it('returns 403 when not authenticated', async () => {
    asGuest();
    const res = await PATCH(makeRequest('PATCH', serverId, { hidden: true }), makeCtx(serverId));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('forbidden');
  });

  it('returns 404 for unknown id', async () => {
    asAdmin();
    const res = await PATCH(makeRequest('PATCH', 'no-such-id', { hidden: true }), makeCtx('no-such-id'));
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('not found');
  });

  it('returns 400 for invalid JSON body', async () => {
    asAdmin();
    const req = new NextRequest(`${BASE_URL}/${serverId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '<<<bad>>>',
    });
    const res = await PATCH(req, makeCtx(serverId));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('invalid json');
  });

  it('returns 400 when hidden is not a boolean', async () => {
    asAdmin();
    const res = await PATCH(makeRequest('PATCH', serverId, { hidden: 'yes' }), makeCtx(serverId));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/hidden/);
  });

  it('returns 400 when hidden is missing from body', async () => {
    asAdmin();
    const res = await PATCH(makeRequest('PATCH', serverId, {}), makeCtx(serverId));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/hidden/);
  });

  it('returns 200 and sets hidden = true', async () => {
    asAdmin();
    const res = await PATCH(makeRequest('PATCH', serverId, { hidden: true }), makeCtx(serverId));
    expect(res.status).toBe(200);
    const resBody = await res.json() as { ok: boolean };
    expect(resBody.ok).toBe(true);

    const row = getDb()
      .prepare('SELECT hidden FROM servers WHERE id = ?')
      .get(serverId) as { hidden: number } | undefined;
    expect(row?.hidden).toBe(1);
  });

  it('returns 200 and sets hidden = false', async () => {
    asAdmin();
    // First hide it
    await PATCH(makeRequest('PATCH', serverId, { hidden: true }), makeCtx(serverId));
    // Then un-hide it
    const res = await PATCH(makeRequest('PATCH', serverId, { hidden: false }), makeCtx(serverId));
    expect(res.status).toBe(200);

    const row = getDb()
      .prepare('SELECT hidden FROM servers WHERE id = ?')
      .get(serverId) as { hidden: number } | undefined;
    expect(row?.hidden).toBe(0);
  });
});

describe('DELETE /api/admin/servers/[id]', () => {
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

  it('returns 403 when not authenticated', async () => {
    asGuest();
    const res = await DELETE(makeRequest('DELETE', serverId), makeCtx(serverId));
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('forbidden');
  });

  it('returns 404 for unknown id', async () => {
    asAdmin();
    const res = await DELETE(makeRequest('DELETE', 'no-such-id'), makeCtx('no-such-id'));
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('not found');
  });

  it('returns 200 and removes the server row', async () => {
    asAdmin();
    const res = await DELETE(makeRequest('DELETE', serverId), makeCtx(serverId));
    expect(res.status).toBe(200);
    const resBody = await res.json() as { ok: boolean };
    expect(resBody.ok).toBe(true);

    const row = getDb()
      .prepare('SELECT id FROM servers WHERE id = ?')
      .get(serverId);
    expect(row).toBeUndefined();
  });

  it('returns 404 on second delete of same id', async () => {
    asAdmin();
    await DELETE(makeRequest('DELETE', serverId), makeCtx(serverId));
    const res = await DELETE(makeRequest('DELETE', serverId), makeCtx(serverId));
    expect(res.status).toBe(404);
  });
});
