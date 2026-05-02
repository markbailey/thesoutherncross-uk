// Steam Web API helpers: group member XML + batched player summaries.
// Every upstream call is wrapped with a 5s AbortSignal.timeout and surfaces
// typed SteamError on non-2xx / parse failure so callers can keep stale cache.

import { XMLParser } from 'fast-xml-parser';

export type SteamErrorCode =
  | 'network'
  | 'http'
  | 'parse'
  | 'shape';

export class SteamError extends Error {
  readonly code: SteamErrorCode;
  constructor(code: SteamErrorCode, message: string) {
    super(message);
    this.name = 'SteamError';
    this.code = code;
  }
}

export type PlayerSummary = {
  steamid: string;
  personaname: string;
  avatarfull: string;
  personastate: number;
  gameid?: string;
  gameextrainfo?: string;
  lastlogoff?: number;
};

const DEFAULT_TIMEOUT_MS = 5000;
const SUMMARIES_CHUNK = 100;

async function doFetch(url: string): Promise<Response> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new SteamError('network', `fetch failed: ${reason}`);
  }
}

export async function fetchGroupMembers(groupId: string): Promise<string[]> {
  const encoded = encodeURIComponent(groupId);
  const url = `https://steamcommunity.com/groups/${encoded}/memberslistxml?xml=1`;
  const res = await doFetch(url);
  if (!res.ok) {
    throw new SteamError('http', `steam group XML returned ${res.status}`);
  }
  const xml = await res.text();

  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false,
    trimValues: true,
  });

  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new SteamError('parse', `failed to parse group XML: ${msg}`);
  }

  const root =
    parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)['memberList']
      : undefined;
  if (!root || typeof root !== 'object') {
    throw new SteamError('shape', 'group XML missing memberList root');
  }
  const membersNode = (root as Record<string, unknown>)['members'];
  if (!membersNode || typeof membersNode !== 'object') {
    // Empty group — treat as empty list rather than error
    return [];
  }
  const steamIds = (membersNode as Record<string, unknown>)['steamID64'];
  if (steamIds == null) return [];
  if (Array.isArray(steamIds)) {
    return steamIds.map((v) => String(v));
  }
  return [String(steamIds)];
}

function chunk<T>(arr: readonly T[], size: number): T[][] {
  if (size <= 0) throw new Error('chunk size must be > 0');
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

// Avatar URLs are rendered client-side as <img src={...}>. Only accept Steam's
// known CDN origins so a corrupted upstream response (or MITM before Phase 5's
// CSP lands) can't slip an arbitrary remote URL into every page load.
const ALLOWED_AVATAR_HOSTS = /^https?:\/\/(?:[^/]*\.)?(?:akamaihd\.net|steamstatic\.com)\//i;

function safeAvatar(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  if (!ALLOWED_AVATAR_HOSTS.test(raw)) return '';
  return raw;
}

function normalizeSummary(raw: unknown): PlayerSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const steamid = r['steamid'];
  const personaname = r['personaname'];
  const personastate = r['personastate'];
  if (typeof steamid !== 'string') return null;
  const summary: PlayerSummary = {
    steamid,
    personaname: typeof personaname === 'string' ? personaname : '',
    avatarfull: safeAvatar(r['avatarfull']),
    personastate: typeof personastate === 'number' ? personastate : 0,
  };
  if (typeof r['gameid'] === 'string') summary.gameid = r['gameid'];
  if (typeof r['gameextrainfo'] === 'string') summary.gameextrainfo = r['gameextrainfo'];
  if (typeof r['lastlogoff'] === 'number') summary.lastlogoff = r['lastlogoff'];
  return summary;
}

export async function fetchPlayerSummaries(
  steamIds: string[],
  apiKey: string,
): Promise<PlayerSummary[]> {
  if (steamIds.length === 0) return [];
  if (!apiKey) {
    throw new SteamError('shape', 'fetchPlayerSummaries requires a non-empty apiKey');
  }

  const results: PlayerSummary[] = [];
  for (const batch of chunk(steamIds, SUMMARIES_CHUNK)) {
    const url = new URL(
      'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/',
    );
    url.searchParams.set('key', apiKey);
    url.searchParams.set('steamids', batch.join(','));

    const res = await doFetch(url.toString());
    if (!res.ok) {
      throw new SteamError('http', `GetPlayerSummaries returned ${res.status}`);
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new SteamError('parse', `GetPlayerSummaries JSON parse failed: ${msg}`);
    }

    const response =
      body && typeof body === 'object'
        ? (body as Record<string, unknown>)['response']
        : undefined;
    const players =
      response && typeof response === 'object'
        ? (response as Record<string, unknown>)['players']
        : undefined;
    if (!Array.isArray(players)) {
      throw new SteamError('shape', 'GetPlayerSummaries missing response.players array');
    }

    for (const p of players) {
      const summary = normalizeSummary(p);
      if (summary) results.push(summary);
    }
  }

  return results;
}
