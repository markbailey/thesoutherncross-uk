import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the openid module before importing the module under test.
const mockVerifyAssertion = vi.fn();
const MockRelyingParty = vi.fn().mockImplementation(() => ({
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
  const callbackUrl = 'https://www.thesoutherncross.uk/api/auth/steam/callback?returnTo=%2F';

  it("targets Steam's OpenID endpoint", async () => {
    const url = await buildLoginUrl(callbackUrl);
    expect(url).toMatch(/^https:\/\/steamcommunity\.com\/openid\/login\?/);
  });

  it('includes required OpenID 2.0 params', async () => {
    const url = await buildLoginUrl(callbackUrl);
    const params = new URL(url).searchParams;
    expect(params.get('openid.mode')).toBe('checkid_setup');
    expect(params.get('openid.ns')).toBe('http://specs.openid.net/auth/2.0');
    expect(params.get('openid.identity')).toBe('http://specs.openid.net/auth/2.0/identifier_select');
    expect(params.get('openid.claimed_id')).toBe('http://specs.openid.net/auth/2.0/identifier_select');
  });

  it('sets return_to to the provided callbackUrl', async () => {
    const url = await buildLoginUrl(callbackUrl);
    const params = new URL(url).searchParams;
    expect(params.get('openid.return_to')).toBe(callbackUrl);
  });

  it('sets realm from SITE_BASE_URL env var', async () => {
    process.env['SITE_BASE_URL'] = 'https://www.thesoutherncross.uk';
    const url = await buildLoginUrl(callbackUrl);
    const params = new URL(url).searchParams;
    expect(params.get('openid.realm')).toBe('https://www.thesoutherncross.uk');
    delete process.env['SITE_BASE_URL'];
  });

  it('falls back to localhost realm when SITE_BASE_URL is unset', async () => {
    delete process.env['SITE_BASE_URL'];
    const url = await buildLoginUrl(callbackUrl);
    const params = new URL(url).searchParams;
    expect(params.get('openid.realm')).toBe('http://localhost:3000');
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
