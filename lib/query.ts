// Thin wrapper around gamedig with timeout + retry and a stable return shape.
// Never throws; callers get a discriminated-union QueryResult.

import { GameDig } from 'gamedig';
import type { Protocol, ServerConfig } from '../config/servers';

export type QueryResult =
  | { online: true; players: number; maxPlayers: number; map?: string; ping?: number; raw: unknown }
  | { online: false; reason: string };

export type QueryOptions = {
  timeoutMs?: number;
  retries?: number;
};

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_RETRIES = 1;
const RETRY_BACKOFF_MS = 250;

function gamedigType(protocol: Protocol): string {
  switch (protocol) {
    case 'source':
      return 'protocol-valve';
    case 'minecraft':
      return 'minecraft';
  }
}

function extractPlayerCount(players: unknown): number {
  if (Array.isArray(players)) return players.length;
  if (typeof players === 'number' && Number.isFinite(players)) return players;
  if (players && typeof players === 'object' && 'length' in (players as Record<string, unknown>)) {
    const n = (players as { length: unknown }).length;
    if (typeof n === 'number' && Number.isFinite(n)) return n;
  }
  return 0;
}

function extractMaxPlayers(raw: unknown): number {
  if (!raw || typeof raw !== 'object') return 0;
  const obj = raw as Record<string, unknown>;
  const m = obj['maxplayers'] ?? obj['maxPlayers'];
  if (typeof m === 'number' && Number.isFinite(m)) return m;
  return 0;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`query timeout after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function queryServer(
  server: ServerConfig,
  opts: QueryOptions = {},
): Promise<QueryResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = opts.retries ?? DEFAULT_RETRIES;

  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const raw = await withTimeout(
        GameDig.query({
          type: gamedigType(server.protocol),
          host: server.host,
          port: server.port,
        }),
        timeoutMs,
      );

      const rawObj = raw as Record<string, unknown>;
      const result: QueryResult = {
        online: true,
        players: extractPlayerCount(rawObj['players']),
        maxPlayers: extractMaxPlayers(rawObj),
        raw,
      };
      const map = rawObj['map'];
      if (typeof map === 'string') result.map = map;
      const ping = rawObj['ping'];
      if (typeof ping === 'number') result.ping = ping;
      return result;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await sleep(RETRY_BACKOFF_MS);
      }
    }
  }

  const reason = lastErr instanceof Error ? lastErr.message : String(lastErr ?? 'unknown error');
  return { online: false, reason };
}
