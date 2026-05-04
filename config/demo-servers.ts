/**
 * Demo dataset for the System section. Returned by /api/servers when
 * DEMO_SERVERS=1 is set, so the solar-system visualisation can be shown
 * without a configured DB or live pollers.
 *
 * Shape mirrors the /api/servers JSON response (see app/api/servers/route.ts).
 */

export type DemoServer = {
  id: string;
  name: string;
  online: boolean;
  players: number | null;
  maxPlayers: number | null;
  map: string | null;
  ping: number | null;
  updatedAt: number | null;
};

export type DemoGame = {
  id: string;
  name: string;
  planet: { color: string; size: number; orbitRadius: number; orbitSpeed: number };
  servers: DemoServer[];
};

const DEMO_GAMES: DemoGame[] = [
  {
    id: 'minecraft',
    name: 'Minecraft',
    planet: { color: '#6ab04c', size: 1.0, orbitRadius: 8, orbitSpeed: 0.05 },
    servers: [
      { id: 'mc-vanilla', name: 'Vanilla SMP', online: true, players: 12, maxPlayers: 24, map: 'world',  ping: 32, updatedAt: null },
      { id: 'mc-modded',  name: 'ATM10',       online: true, players: 4,  maxPlayers: 16, map: 'atm10',  ping: 48, updatedAt: null },
    ],
  },
  {
    id: 'cs2',
    name: 'Counter-Strike 2',
    planet: { color: '#e58e26', size: 0.8, orbitRadius: 14, orbitSpeed: 0.03 },
    servers: [
      { id: 'cs-dust',   name: 'Dust2 24/7',  online: true,  players: 8,    maxPlayers: 12,   map: 'de_dust2', ping: 24,   updatedAt: null },
      { id: 'cs-mirage', name: 'Mirage 24/7', online: false, players: null, maxPlayers: null, map: null,       ping: null, updatedAt: null },
    ],
  },
  {
    id: 'valheim',
    name: 'Valheim',
    planet: { color: '#7c3aed', size: 0.9, orbitRadius: 11, orbitSpeed: 0.04 },
    servers: [
      { id: 'vh-main', name: 'Yggdrasil', online: true, players: 3, maxPlayers: 10, map: null, ping: 65, updatedAt: null },
    ],
  },
  {
    id: 'rust',
    name: 'Rust',
    planet: { color: '#c0392b', size: 0.85, orbitRadius: 17, orbitSpeed: 0.025 },
    servers: [
      { id: 'rust-main',  name: 'Vanilla Main', online: true,  players: 47,   maxPlayers: 100,  map: 'Procedural Map', ping: 41,   updatedAt: null },
      { id: 'rust-2x',    name: '2x Weekly',    online: true,  players: 22,   maxPlayers: 50,   map: 'Procedural Map', ping: 39,   updatedAt: null },
      { id: 'rust-creative', name: 'Creative',  online: false, players: null, maxPlayers: null, map: null,             ping: null, updatedAt: null },
    ],
  },
];

/**
 * Returns a fresh copy of the demo dataset with `updatedAt` stamped to
 * `now`, so the HUD reads as "live" instead of frozen at a fixture date.
 */
export function buildDemoServersResponse(): {
  games: DemoGame[];
  updatedAt: number;
} {
  const now = Date.now();
  const games = DEMO_GAMES.map((g) => ({
    ...g,
    servers: g.servers.map((s) => ({
      ...s,
      updatedAt: s.online ? now : null,
    })),
  }));
  return { games, updatedAt: now };
}
