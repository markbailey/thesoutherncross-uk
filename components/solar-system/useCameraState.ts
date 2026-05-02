'use client';

import { create } from 'zustand';

export type SceneView = 'system' | 'planet' | 'server';

export interface CameraState {
  view: SceneView;
  focusedGameId: string | null;
  focusedServerId: string | null;
  /** gameIds whose orbit is frozen — Set so multiple selections compose. */
  pausedOrbits: Set<string>;
  /** Last-recorded angle (radians) per gameId; used to resume from pause. */
  pausedAngles: Record<string, number>;
  listMode: boolean;

  selectPlanet: (gameId: string) => void;
  selectServer: (gameId: string, serverId: string) => void;
  /** Step out one level: server → planet, planet → system. */
  deselect: () => void;
  /** Jump straight to system view, drop all focus + paused orbits. */
  reset: () => void;
  toggleListMode: () => void;
  setListMode: (on: boolean) => void;
  recordOrbitAngle: (gameId: string, angle: number) => void;
}

export const useCameraState = create<CameraState>((set) => ({
  view: 'system',
  focusedGameId: null,
  focusedServerId: null,
  pausedOrbits: new Set<string>(),
  pausedAngles: {},
  listMode: false,

  selectPlanet: (gameId) =>
    set((s) => {
      const next = new Set(s.pausedOrbits);
      next.add(gameId);
      return {
        view: 'planet',
        focusedGameId: gameId,
        focusedServerId: null,
        pausedOrbits: next,
      };
    }),

  selectServer: (gameId, serverId) =>
    set((s) => {
      const next = new Set(s.pausedOrbits);
      next.add(gameId);
      return {
        view: 'server',
        focusedGameId: gameId,
        focusedServerId: serverId,
        pausedOrbits: next,
      };
    }),

  deselect: () =>
    set((s) => {
      if (s.view === 'server') {
        return {
          view: 'planet',
          focusedServerId: null,
        };
      }
      if (s.view === 'planet') {
        const next = new Set(s.pausedOrbits);
        if (s.focusedGameId) next.delete(s.focusedGameId);
        return {
          view: 'system',
          focusedGameId: null,
          focusedServerId: null,
          pausedOrbits: next,
        };
      }
      return {};
    }),

  reset: () =>
    set({
      view: 'system',
      focusedGameId: null,
      focusedServerId: null,
      pausedOrbits: new Set<string>(),
    }),

  toggleListMode: () => set((s) => ({ listMode: !s.listMode })),
  setListMode: (on) => set({ listMode: on }),

  recordOrbitAngle: (gameId, angle) =>
    set((s) => ({ pausedAngles: { ...s.pausedAngles, [gameId]: angle } })),
}));
