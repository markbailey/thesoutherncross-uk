// Token-bucket-ish fixed-window rate limiter keyed by an arbitrary string.
// Backed by lru-cache so keys expire naturally; used by /api/refresh to throttle per IP.

import { LRUCache } from 'lru-cache';

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetMs: number;
};

export type RateLimitOptions = {
  max: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export function createRateLimiter(options: RateLimitOptions): {
  check: (key: string) => RateLimitResult;
} {
  const { max, windowMs } = options;
  if (max <= 0) throw new Error('rate-limit: max must be > 0');
  if (windowMs <= 0) throw new Error('rate-limit: windowMs must be > 0');

  const cache = new LRUCache<string, Bucket>({
    max: 10_000,
    ttl: windowMs,
  });

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const existing = cache.get(key);
      if (!existing || existing.resetAt <= now) {
        const bucket: Bucket = { count: 1, resetAt: now + windowMs };
        cache.set(key, bucket);
        return { ok: true, remaining: Math.max(0, max - 1), resetMs: windowMs };
      }

      if (existing.count >= max) {
        return {
          ok: false,
          remaining: 0,
          resetMs: Math.max(0, existing.resetAt - now),
        };
      }

      existing.count += 1;
      cache.set(key, existing);
      return {
        ok: true,
        remaining: Math.max(0, max - existing.count),
        resetMs: Math.max(0, existing.resetAt - now),
      };
    },
  };
}
