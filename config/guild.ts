/**
 * Source of truth for guild identity, comms, stats, join CTA, and roles.
 * Most user-facing strings resolve to `GUILD`; structural section copy
 * (AboutSection mission brief / house rules, Footer text) is intentionally
 * inlined in components where it carries layout structure.
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

export type GuildRoles = {
  founders: readonly string[];
  officers: readonly string[];
  moderators: readonly string[];
};

export type Guild = {
  name: string;
  shortName: string;
  tagline: string;
  established: number;
  region: string;
  comms: GuildComms;
  stats: GuildStats;
  join: GuildJoin;
  roles: GuildRoles;
};

const ESTABLISHED_YEAR = 2006;
const STEAM_GROUP_URL = 'https://steamcommunity.com/groups/TheSouthernCrossUK';
const DISCORD_INVITE_URL = 'https://discord.gg/gBmECbGW4Z';

export const GUILD: Guild = {
  name: 'The Southern Cross UK',
  shortName: 'TSX UK',
  tagline: 'Servers. Signals. Squad.',
  established: ESTABLISHED_YEAR,
  region: 'EU-West',
  comms: {
    voice: { label: 'Discord', href: DISCORD_INVITE_URL },
    lfg: { label: 'Steam Group', href: STEAM_GROUP_URL },
    hours: 'Peak hours 19:00–23:00 UK, most nights.',
    tenure: `Core crew together since ${ESTABLISHED_YEAR}.`,
  },
  stats: {
    est: `${ESTABLISHED_YEAR}`,
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
    steamGroupUrl: STEAM_GROUP_URL,
    discordInviteUrl: DISCORD_INVITE_URL,
  },
  // Why: hardcoded rather than scraped on each poll — leadership rarely changes; edit here when it does.
  roles: {
    // solusmoth, Fish
    founders: ['76561198051971258', '76561198010234134'],
    // Stompie, InsanityXL, Eagle
    officers: ['76561198077248762', '76561197985898467', '76561198001701877'],
    moderators: [],
  },
} as const;
