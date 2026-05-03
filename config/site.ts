/**
 * Site-level metadata used by app/layout.tsx, OG, robots, sitemap, and footer.
 * BUILD_SHA / BUILD_DATE are injected at build time via next.config.ts env.
 */

export type Site = {
  url: string;
  name: string;
  description: string;
  ogImage: string;
  twitterHandle?: string;
  themeColor: string;
};

export const SITE: Site = {
  url: 'https://thesoutherncross.uk',
  name: 'The Southern Cross UK',
  description:
    'Guild ops dashboard from orbit — live game server status and Steam roster for The Southern Cross UK, EU-West since 2015.',
  ogImage: '/opengraph-image',
  themeColor: '#07060c',
} as const;

export const BUILD_SHA: string = process.env['NEXT_PUBLIC_BUILD_SHA'] ?? 'dev';
export const BUILD_DATE: string =
  process.env['NEXT_PUBLIC_BUILD_DATE'] ?? new Date(0).toISOString();

import pkg from '../package.json' with { type: 'json' };
export const VERSION: string = pkg.version;
