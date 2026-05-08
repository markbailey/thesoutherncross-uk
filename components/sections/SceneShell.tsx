'use client';

/**
 * SceneShell — picks the correct viewport mode based on screen width:
 *   < lg (1024px): always renders <ListMode> (no WebGL, no R3F chunk download)
 *   ≥ lg (1024px): renders the full 3D <Scene> + <HudOverlay>
 *
 * The `dynamic()` import for Scene lives here so the heavy R3F/Three.js chunk
 * is never fetched on phones.
 */

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { ListMode } from '../solar-system/ListMode';
import type { OverlayGame } from '../solar-system/HudOverlay';

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
  loading: boolean;
  error: boolean;
  focusedGameId: string | null;
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
}: SceneShellProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Mobile (<lg): always render ListMode — no 3D, no R3F download
  if (!isDesktop) {
    return (
      <div
        style={{
          padding: '20px 20px 32px',
          minHeight: '50vh',
        }}
      >
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
      <div style={{ position: 'absolute', inset: '72px 24px 64px 24px' }}>
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
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--ink-dim)',
        fontFamily: 'var(--mono)',
        fontSize: 11,
        letterSpacing: '0.18em',
      }}
    >
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--status-warn)',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
          }}
        >
          3D UNAVAILABLE — FALLBACK ENGAGED
        </div>
      );
    }
    return this.props.children;
  }
}
