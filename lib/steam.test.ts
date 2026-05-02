import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchGroupMembers, fetchPlayerSummaries, SteamError } from './steam';

const originalFetch = globalThis.fetch;

function mockOk(body: string | object): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => text,
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
  } as unknown as Response;
}

function mockErr(status: number): Response {
  return {
    ok: false,
    status,
    statusText: 'ERR',
    text: async () => 'boom',
    json: async () => ({}),
  } as unknown as Response;
}

describe('fetchGroupMembers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('parses a valid memberslistxml into a steamID64 array', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <memberList>
        <groupID64>103582791429521412</groupID64>
        <members>
          <steamID64>76561198000000001</steamID64>
          <steamID64>76561198000000002</steamID64>
          <steamID64>76561198000000003</steamID64>
        </members>
      </memberList>`;
    globalThis.fetch = vi.fn().mockResolvedValue(mockOk(xml));
    const ids = await fetchGroupMembers('southerncrossuk');
    expect(ids).toEqual([
      '76561198000000001',
      '76561198000000002',
      '76561198000000003',
    ]);
  });

  it('handles a single-member group (XML parser returns string, not array)', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <memberList>
        <groupID64>103582791429521412</groupID64>
        <members>
          <steamID64>76561198000000001</steamID64>
        </members>
      </memberList>`;
    globalThis.fetch = vi.fn().mockResolvedValue(mockOk(xml));
    const ids = await fetchGroupMembers('g');
    expect(ids).toEqual(['76561198000000001']);
  });

  it('throws SteamError on non-2xx', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockErr(503));
    await expect(fetchGroupMembers('x')).rejects.toBeInstanceOf(SteamError);
  });

  it('throws SteamError on unparseable XML', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockOk('<<not xml>>'));
    await expect(fetchGroupMembers('x')).rejects.toBeInstanceOf(SteamError);
  });
});

describe('fetchPlayerSummaries', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns an empty array for no ids without calling fetch', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    const result = await fetchPlayerSummaries([], 'KEY');
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('chunks >100 ids into multiple calls', async () => {
    const ids = Array.from({ length: 240 }, (_, i) => String(7656119800_0000000n + BigInt(i)));
    const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
      const u = new URL(url);
      const csv = u.searchParams.get('steamids') ?? '';
      const count = csv.split(',').length;
      const players = Array.from({ length: count }, (_, i) => ({
        steamid: `id-${i}`,
        personaname: `p${i}`,
        avatarfull: 'http://a',
        personastate: 0,
      }));
      return mockOk({ response: { players } });
    });
    globalThis.fetch = fetchSpy;

    const out = await fetchPlayerSummaries(ids, 'KEY');
    expect(fetchSpy).toHaveBeenCalledTimes(3); // 100 + 100 + 40
    expect(out.length).toBe(240);

    const firstUrl = fetchSpy.mock.calls[0]?.[0] as string;
    const firstCsv = new URL(firstUrl).searchParams.get('steamids') ?? '';
    expect(firstCsv.split(',').length).toBe(100);
    const lastUrl = fetchSpy.mock.calls[2]?.[0] as string;
    const lastCsv = new URL(lastUrl).searchParams.get('steamids') ?? '';
    expect(lastCsv.split(',').length).toBe(40);
  });

  it('passes the api key in the query string', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(mockOk({ response: { players: [] } }));
    globalThis.fetch = fetchSpy;
    await fetchPlayerSummaries(['76561198000000001'], 'SECRET-KEY');
    const url = fetchSpy.mock.calls[0]?.[0] as string;
    expect(new URL(url).searchParams.get('key')).toBe('SECRET-KEY');
  });

  it('throws SteamError on non-2xx', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(mockErr(500));
    await expect(fetchPlayerSummaries(['76561198000000001'], 'KEY')).rejects.toBeInstanceOf(
      SteamError,
    );
  });
});
