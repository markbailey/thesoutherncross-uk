// Side-effect import: loads .env / .env.local / .env.development / .env.production
// into process.env BEFORE any module that reads env at init time (e.g. lib/poller's
// defaultPoller). Custom Next.js servers don't auto-load env files; @next/env is
// the official way to do it. server.ts imports this first.
// @next/env is CJS — use default import + destructure for ESM/CJS interop.
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
