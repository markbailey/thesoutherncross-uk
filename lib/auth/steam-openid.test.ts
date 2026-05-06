import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the openid module before importing the module under test.
const mockAuthenticate = vi.fn();
const mockVerifyAssertion = vi.fn();
const MockRelyingParty = vi.fn().mockImplementation(() => ({
  authenticate: mockAuthenticate,
  verifyAssertion: mockVerifyAssertion,
}));

vi.mock('openid', () => ({
  default: {
    RelyingParty: MockRelyingParty,
  },
}));

// Dynamic import after mock is registered so the mock is in place.
const { buildLoginUrl, verifyAssertion } = await import('./steam-openid');

describe('buildLoginUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a URL containing steamcommunity.com/openid', async () => {
    const fakeUrl = 'https://steamcommunity.com/openid/login?openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.mode=checkid_setup';
    mockAuthenticate.mockImplementation(
      (_identifier: string, _immediate: boolean, cb: (err: null, url: string) => void) => {
        cb(null, fakeUrl);
      },
    );

    const result = await buildLoginUrl('http://localhost:3000/api/auth/steam/callback');
    expect(result).toContain('steamcommunity.com/openid');
  });

  it('rejects when authenticate returns an error', async () => {
    mockAuthenticate.mockImplementation(
      (_identifier: string, _immediate: boolean, cb: (err: Error, url: null) => void) => {
        cb(new Error('Discovery failed'), null);
      },
    );

    await expect(buildLoginUrl('http://localhost:3000/api/auth/steam/callback')).rejects.toThrow(
      'Discovery failed',
    );
  });

  it('rejects when authenticate returns no URL', async () => {
    mockAuthenticate.mockImplementation(
      (_identifier: string, _immediate: boolean, cb: (err: null, url: null) => void) => {
        cb(null, null);
      },
    );

    await expect(buildLoginUrl('http://localhost:3000/api/auth/steam/callback')).rejects.toThrow(
      'No URL returned',
    );
  });
});

describe('verifyAssertion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts SteamID64 correctly from a claimed identifier', async () => {
    mockVerifyAssertion.mockImplementation(
      (_url: string, cb: (err: null, result: { authenticated: boolean; claimedIdentifier: string }) => void) => {
        cb(null, {
          authenticated: true,
          claimedIdentifier: 'https://steamcommunity.com/openid/id/76561198051971258',
        });
      },
    );

    const steamid = await verifyAssertion(
      'http://localhost:3000/api/auth/steam/callback?openid.mode=id_res',
      'http://localhost:3000/api/auth/steam/callback',
    );
    expect(steamid).toBe('76561198051971258');
  });

  it('rejects when result is not authenticated', async () => {
    mockVerifyAssertion.mockImplementation(
      (_url: string, cb: (err: null, result: { authenticated: boolean }) => void) => {
        cb(null, { authenticated: false });
      },
    );

    await expect(
      verifyAssertion(
        'http://localhost:3000/api/auth/steam/callback?openid.mode=cancel',
        'http://localhost:3000/api/auth/steam/callback',
      ),
    ).rejects.toThrow('Not authenticated');
  });

  it('rejects when verifyAssertion returns an error', async () => {
    mockVerifyAssertion.mockImplementation(
      (_url: string, cb: (err: Error, result: null) => void) => {
        cb(new Error('Verification failed'), null);
      },
    );

    await expect(
      verifyAssertion(
        'http://localhost:3000/api/auth/steam/callback?openid.mode=id_res',
        'http://localhost:3000/api/auth/steam/callback',
      ),
    ).rejects.toThrow('Verification failed');
  });

  it('rejects when claimedIdentifier does not contain a valid SteamID', async () => {
    mockVerifyAssertion.mockImplementation(
      (_url: string, cb: (err: null, result: { authenticated: boolean; claimedIdentifier: string }) => void) => {
        cb(null, {
          authenticated: true,
          claimedIdentifier: 'https://example.com/not-a-steam-id',
        });
      },
    );

    await expect(
      verifyAssertion(
        'http://localhost:3000/api/auth/steam/callback?openid.mode=id_res',
        'http://localhost:3000/api/auth/steam/callback',
      ),
    ).rejects.toThrow('Could not extract SteamID');
  });
});
