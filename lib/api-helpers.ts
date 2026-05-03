// Tiny response helpers shared by /api/* routes so the Cache-Control
// policy lives in one place (see plan — Security headers: no-store on /api/*).

import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';

export function jsonNoStore<T>(data: T, init?: ResponseInit): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store, max-age=0');
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json; charset=utf-8');
  }
  return NextResponse.json(data, { ...init, headers });
}

// Forwarded-for / real-ip headers are spoofable when the app is reachable
// without a trusted reverse proxy in front of it. Only honour them when
// TRUST_PROXY_HEADERS=1 is set (Phase 5 IIS deploy sets this in nssm); off
// by default so dev / mis-deploy can't have a caller bypass the /api/refresh
// rate-limit bucket by sending a forged X-Forwarded-For.
export function clientIp(headers: Headers): string {
  if (process.env.TRUST_PROXY_HEADERS === '1') {
    const fwd = headers.get('x-forwarded-for');
    if (fwd) {
      const first = fwd.split(',')[0]?.trim();
      if (first) return first;
    }
    const real = headers.get('x-real-ip');
    if (real) return real.trim();
  }
  return 'unknown';
}

/**
 * Constant-time string equality. Hashes both sides to a fixed-length digest
 * before comparing, so we do not leak the expected secret's length by
 * returning early on mismatched inputs.
 */
export function timingSafeEquals(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aHash = createHash('sha256').update(a, 'utf8').digest();
  const bHash = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(aHash, bHash);
}
