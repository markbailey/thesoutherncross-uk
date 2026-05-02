import { getDb, lastPollAt } from '../../../lib/db';
import { jsonNoStore } from '../../../lib/api-helpers';
import { childLogger } from '../../../lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STALE_POLL_MS = 5 * 60 * 1000;
const startedAt = Date.now();
const log = childLogger({ mod: 'api/health' });

function checkDb(): boolean {
  try {
    const db = getDb();
    const row = db.prepare('SELECT 1 AS one').get() as { one: number } | undefined;
    return row?.one === 1;
  } catch (err) {
    log.error({ err }, 'health db check failed');
    return false;
  }
}

export function GET(): Response {
  const dbOk = checkDb();
  let last: number | null = null;
  try {
    last = lastPollAt();
  } catch (err) {
    log.error({ err }, 'health lastPollAt read failed');
  }

  const now = Date.now();
  const pollStale = last !== null && now - last > STALE_POLL_MS;
  const ok = dbOk && !pollStale;

  const payload = {
    ok,
    uptimeMs: now - startedAt,
    lastPollAt: last,
    dbOk,
  };

  return jsonNoStore(payload, { status: ok ? 200 : 503 });
}
