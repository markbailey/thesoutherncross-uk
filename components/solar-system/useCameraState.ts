'use client';

import { create } from 'zustand';

export type SceneView = 'system' | 'planet' | 'server';

export interface CameraState {
  view: SceneView;
  focusedGameId: string | null;
  focusedServerId: string | null;
  /** gameIds whose orbit is frozen — Set so multiple selections compose. */
  pausedOrbits: Set<string>;
  listMode: boolean;
  userZoom: number;

  selectPlanet: (gameId: string) => void;
  selectServer: (gameId: string, serverId: string) => void;
  /** Step out one level: server → planet, planet → system. */
  deselect: () => void;
  /** Jump straight to system view, drop all focus + paused orbits. */
  reset: () => void;
  toggleListMode: () => void;
  setListMode: (on: boolean) => void;
  setUserZoom: (z: number) => void;
}

export const SYSTEM_CAMERA_BASE_RADIUS = 620;
export const SYSTEM_CAMERA_RADIUS_MIN = 18;
export const SYSTEM_CAMERA_RADIUS_MAX = 1400;
export const SYSTEM_USER_ZOOM_MIN = SYSTEM_CAMERA_RADIUS_MIN / SYSTEM_CAMERA_BASE_RADIUS;
export const SYSTEM_USER_ZOOM_MAX = SYSTEM_CAMERA_RADIUS_MAX / SYSTEM_CAMERA_BASE_RADIUS;

export const useCameraState = create<CameraState>((set) => ({
  view: 'system',
  focusedGameId: null,
  focusedServerId: null,
  pausedOrbits: new Set<string>(),
  listMode: false,
  userZoom: 1,

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
      userZoom: 1,
    }),

  toggleListMode: () => set((s) => ({ listMode: !s.listMode })),
  setListMode: (on) => set({ listMode: on }),
  setUserZoom: (z) => set({ userZoom: Math.max(SYSTEM_USER_ZOOM_MIN, Math.min(SYSTEM_USER_ZOOM_MAX, z)) }),
}));
