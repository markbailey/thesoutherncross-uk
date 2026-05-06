import type { NextRequest } from 'next/server';
import { jsonNoStore, clientIp, timingSafeEquals } from '../../../lib/api-helpers';
import { createRateLimiter } from '../../../lib/rate-limit';
import { triggerOneShot } from '../../../lib/poller';
import { childLogger } from '../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
const log = childLogger({ mod: 'api/refresh' });

function handle(req: NextRequest): Response {
  const expected = process.env['REFRESH_SECRET'];
  if (!expected) {
    log.warn('REFRESH_SECRET is not set; /api/refresh disabled');
    return jsonNoStore({ error: 'not configured' }, { status: 503 });
  }

  // Rate-limit FIRST — so attackers probing wrong secrets can't brute-force
  // without hitting the same IP bucket as legitimate callers.
  const ip = clientIp(req);
  const check = limiter.check(`refresh:${ip}`);
  if (!check.ok) {
    const retryAfter = Math.ceil(check.resetMs / 1000);
    return jsonNoStore(
      { error: 'rate limited', retryAfterSeconds: retryAfter },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      },
    );
  }

  // Secret travels in `x-refresh-secret` only — query strings leak via proxy
  // access logs, browser history, and the Referer header.
  const provided = req.headers.get('x-refresh-secret') ?? '';
  if (!timingSafeEquals(provided, expected)) {
    return jsonNoStore({ error: 'unauthorized' }, { status: 401 });
  }

  // fire-and-forget; poller has its own error handling
  void triggerOneShot().catch((err) => log.error({ err }, 'triggerOneShot failed'));

  return jsonNoStore({ ok: true, queued: true }, { status: 202 });
}

export function GET(req: NextRequest): Response {
  return handle(req);
}

export function POST(req: NextRequest): Response {
  return handle(req);
}
