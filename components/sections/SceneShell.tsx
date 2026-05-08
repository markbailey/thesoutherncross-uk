'use client';

/**
 * SceneShell — picks the correct viewport mode based on screen width:
 *   < lg (1024px): always renders <ListMode> (no WebGL, no R3F chunk download)
 *   ≥ lg (1024px): renders the full 3D <Scene> + <HudOverlay>
 *
 * The `dynamic()` import for Scene lives here so the heavy R3F/Three.js chunk
 * is never fetched on phones.
 *
 * `isDesktop` is passed as a prop from SystemSection — SceneShell does NOT call
 * useMediaQuery itself, keeping the hook call single-sourced.
 */

import * as React from 'react';
import dynamic from 'next/dynamic';
import { ListMode } from '../solar-system/ListMode';
import type { OverlayGame } from '../solar-system/HudOverlay';
import styles from './SceneShell.module.css';

// Desktop-only — not included in the mobile bundle path
const Scene = dynamic(() => import('../solar-system/Scene').then((m) => m.Scene), {
  ssr: false,
  loading: () => <SceneShellSkeleton />,
});

const HudOverlay = dynamic(
  () => import('../solar-system/HudOverlay').then((m) => m.HudOverlay),
  { ssr: false },
);

type SceneGame = {
  id: string;
  planet: { color: string; size: number; orbitRadius: number; orbitSpeed: number };
  servers: Array<{
    id: string;
    online: boolean;
    players: number | null;
    maxPlayers: number | null;
    ping: number | null;
  }>;
};

export interface SceneShellProps {
  games: OverlayGame[];
  sceneGames: SceneGame[];
  webgl: boolean | null;
  useFallback: boolean;
  onErrorBoundary: () => void;
  /**
   * Only used in the desktop (isDesktop=true) render path. Required by the
   * interface so callers are consistent; the mobile branch passes them through
   * to the prop bag but does not consume them.
   */
  loading: boolean;
  /** @see loading */
  error: boolean;
  focusedGameId: string | null;
  /** Passed from SystemSection; drives the mobile/desktop branch. */
  isDesktop: boolean;
}

/**
 * Chooses between the mobile list layout (<lg) and the full 3D scene (lg+).
 */
export function SceneShell({
  games,
  sceneGames,
  webgl,
  useFallback,
  onErrorBoundary,
  loading,
  error,
  focusedGameId,
  isDesktop,
}: SceneShellProps) {
  // Mobile (<lg): always render ListMode — no 3D, no R3F download
  if (!isDesktop) {
    return (
      <div className={styles.mobileList}>
        <ListMode games={games} />
      </div>
    );
  }

  // Desktop (lg+): existing WebGL-gated scene logic
  if (webgl === null) {
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <SceneShellSkeleton />
      </div>
    );
  }

  if (useFallback) {
    return (
      <div className={styles.fallbackList}>
        <ListMode games={games} />
      </div>
    );
  }

  return (
    <>
      <SceneErrorBoundary onError={onErrorBoundary}>
        <Scene games={sceneGames} onWebGLFailure={onErrorBoundary} />
      </SceneErrorBoundary>
      {focusedGameId ? (
        <HudOverlay games={games} loading={loading} error={error} />
      ) : null}
    </>
  );
}

function SceneShellSkeleton() {
  return (
    <div className={styles.skeleton}>
      ESTABLISHING UPLINK…
    </div>
  );
}

interface SceneErrorBoundaryProps {
  onError: () => void;
  children: React.ReactNode;
}
interface SceneErrorBoundaryState {
  failed: boolean;
}
class SceneErrorBoundary extends React.Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  constructor(props: SceneErrorBoundaryProps) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.failed) {
      return (
        <div className={styles.errorBoundaryMsg}>
          3D UNAVAILABLE — FALLBACK ENGAGED
        </div>
      );
    }
    return this.props.children;
  }
}
