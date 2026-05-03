/**
 * Source of truth for all guild copy rendered on the site.
 * Every user-facing string on the site should resolve to a field in `GUILD`.
 * See Phase 1 of docs/plan — "config/guild.ts".
 */

export type GuildComms = {
  voice: { label: string; href: string };
  lfg: { label: string; href: string };
  hours: string;
  tenure: string;
};

export type GuildStats = {
  est: string;
  crew: string;
  worlds: string;
  region: string;
  uptime: string;
};

export type GuildJoin = {
  headline: string;
  blurb: string;
  requirements: readonly string[];
  steamGroupUrl: string;
  discordInviteUrl: string;
};

export type GuildFooter = {
  coords: string;
  rightsLine: string;
};

export type GuildRoles = {
  founder: string;
  officers: readonly string[];
  moderators: readonly string[];
};

export type Guild = {
  name: string;
  shortName: string;
  tagline: string;
  subheading: string;
  established: number;
  region: string;
  ops: string;
  about: string;
  houseRules: readonly string[];
  comms: GuildComms;
  stats: GuildStats;
  join: GuildJoin;
  footer: GuildFooter;
  roles: GuildRoles;
};

export const GUILD: Guild = {
  name: 'The Southern Cross UK',
  shortName: 'TSC UK',
  tagline: 'Servers. Signals. Squad.',
  subheading: 'Guild ops from orbit — EU-West since 2015.',
  established: 2015,
  region: 'EU-West',
  ops: 'Self-hosted game servers, Steam group roster, Discord comms.',
  about:
    'The Southern Cross UK is a long-running EU-West gaming guild established in 2015. ' +
    'We run our own game servers — Source-engine titles and Minecraft today, more as the crew picks up new worlds — ' +
    'backed by a Steam group for the roster and Discord for live comms. The vibe is grown-up, low-drama, and consistent: ' +
    'show up when you can, treat people decently, and pitch in with the admin work when it needs doing. No rank grind, ' +
    'no mandatory attendance — just a steady signal and a place to land when you log on.',
  houseRules: [
    'Be decent to the crew and to strangers. No slurs, no bullying, no griefing.',
    'Voice chat is encouraged but never required. Lurkers welcome.',
    'Cheats, exploits, and alt-farming on guild servers get you removed. No second chances.',
    'Keep politics and drama out of the common channels — take it to DMs or drop it.',
    'If a server is down or a member needs help, flag it in Discord — ops will triage.',
    'Admin calls on bans and server rules are final. Appeal once in DMs if you disagree.',
  ],
  comms: {
    voice: { label: 'Discord', href: 'https://discord.gg/Kjp728qq' },
    lfg: { label: 'Steam Group', href: 'https://steamcommunity.com/groups/TheSouthernCrossUK' },
    hours: 'Peak hours 19:00–23:00 UK, most nights.',
    tenure: 'Core crew together since 2015.',
  },
  stats: {
    est: '2015',
    crew: 'Open roster',
    worlds: 'Multi-game',
    region: 'EU-West',
    uptime: '24/7 ops',
  },
  join: {
    headline: 'JOIN THE CROSS',
    blurb:
      'We are not a massive clan and we are not trying to be. If you want a steady EU-West crew that actually runs ' +
      'its own servers, turns up, and does not bring drama — you fit. Join the Steam group, drop into Discord, ' +
      'and you are in.',
    requirements: [
      '18+ preferred, mature attitude required regardless of age.',
      'Working mic is welcome but optional. Comms literacy matters more than hardware.',
      'Play something we host, at least occasionally. No activity quota.',
    ],
    steamGroupUrl: 'https://steamcommunity.com/groups/TheSouthernCrossUK',
    discordInviteUrl: 'https://discord.gg/Kjp728qq',
  },
  footer: {
    coords: 'EU-WEST · 51.5N 0.1W',
    rightsLine: 'THE SOUTHERN CROSS UK — EST. 2015. All guild marks are the property of their crew.',
  },
  // Why: hardcoded rather than scraped on each poll — leadership rarely changes; edit here when it does.
  roles: {
    founder: '76561198051971258',
    officers: ['76561198084744484', '76561198010234134', '76561198077248762'],
    moderators: [],
  },
} as const;
