/**
 * Declarative game + server manifest.
 * Phase 1 ships with an empty list; the poller and /api/servers handle the
 * empty-state naturally so the frontend's "NO SYSTEMS ONLINE" design shows
 * before any real hosts are configured.
 *
 * See Phase 1 of docs/plan — "config/servers.ts".
 */

import type { ServerConfig } from '../lib/types/servers';
export type { Protocol, ServerConfig } from '../lib/types/servers';

export type PlanetVisual = {
  color: string;
  size: number;
  orbitRadius: number;
  orbitSpeed: number;
};

export type GameConfig = {
  id: string;
  name: string;
  planet: PlanetVisual;
  servers: ServerConfig[];
};

export const GAMES: GameConfig[] = [];
