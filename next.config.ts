import type { NextConfig } from 'next';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const pkg = createRequire(import.meta.url)('./package.json') as { version: string };

function shortSha(): string {
  if (process.env.NEXT_PUBLIC_BUILD_SHA) return process.env.NEXT_PUBLIC_BUILD_SHA;
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['better-sqlite3', 'gamedig', 'pino', 'pino-roll'],
  env: {
    NEXT_PUBLIC_BUILD_SHA: shortSha(),
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
    NEXT_PUBLIC_VERSION: pkg.version,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.akamaihd.net' },
      { protocol: 'https', hostname: '*.steamstatic.com' },
      { protocol: 'https', hostname: 'avatars.steamstatic.com' },
    ],
  },
};

export default config;
