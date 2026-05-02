'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { HudPanel, HudButton, HudCorner, HairlineDivider } from '../hud';
import { GAMES } from '../../config/servers';
import { GUILD } from '../../config/guild';
import { useCameraState } from '../solar-system/useCameraState';
import { isWebGLAvailable } from '../solar-system/webgl';
import { HudOverlay, type OverlayGame, type OverlayServer } from '../solar-system/HudOverlay';
import { ListMode } from '../solar-system/ListMode';

const Scene = dynamic(() => import('../solar-system/Scene').then((m) => m.Scene), {
  ssr: false,
  loading: () => <SceneSkeleton />,
});

interface ApiServer {
  id: string;
  name: string;
  online: boolean;
  players: number | null;
  maxPlayers: number | null;
  map: string | null;
  ping: number | null;
  updatedAt: number | null;
}
interface ApiGame {
  id: string;
  name: string;
  planet: { color: string; size: number; orbitRadius: number; orbitSpeed: number };
  servers: ApiServer[];
}
interface ApiResponse {
  games: ApiGame[];
  updatedAt: number | null;
}

const fetcher = async (url: string): Promise<ApiResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ApiResponse;
};

/** Connect strings come from the static GAMES manifest (hosts are not exposed via API). */
// Server ids are globally unique across all games — see config/servers.ts. Map is flat by design.
const CONNECT_STRINGS: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const g of GAMES) {
    for (const s of g.servers) {
      out[s.id] = `${s.host}:${s.port}`;
    }
  }
  return out;
})();

export function SystemSection() {
  const { data, error, isLoading } = useSWR<ApiResponse>('/api/servers', fetcher, {
    refreshInterval: 30_000,
    keepPreviousData: true,
  });

  const games: OverlayGame[] = React.useMemo(() => {
    const apiGames = data?.games ?? [];
    return apiGames.map((g) => ({
      id: g.id,
      name: g.name,
      servers: g.servers.map<OverlayServer>((s) => ({
        id: s.id,
        name: s.name,
        online: s.online,
        players: s.players,
        maxPlayers: s.maxPlayers,
        map: s.map,
        ping: s.ping,
        updatedAt: s.updatedAt,
      })),
      connectStrings: CONNECT_STRINGS,
    }));
  }, [data]);

  const sceneGames = React.useMemo(
    () =>
      (data?.games ?? []).map((g) => ({
        id: g.id,
        planet: g.planet,
        servers: g.servers.map((s) => ({
          id: s.id,
          online: s.online,
          players: s.players,
          maxPlayers: s.maxPlayers,
          ping: s.ping,
        })),
      })),
    [data],
  );

  const [webgl, setWebgl] = React.useState<boolean>(true);
  React.useEffect(() => {
    setWebgl(isWebGLAvailable());
  }, []);

  const listMode = useCameraState((s) => s.listMode);
  const setListMode = useCameraState((s) => s.setListMode);
  const view = useCameraState((s) => s.view);
  const focusedGameId = useCameraState((s) => s.focusedGameId);
  const focusedServerId = useCameraState((s) => s.focusedServerId);
  const selectServer = useCameraState((s) => s.selectServer);
  const selectPlanet = useCameraState((s) => s.selectPlanet);
  const reset = useCameraState((s) => s.reset);
  const deselect = useCameraState((s) => s.deselect);

  const useFallback = !webgl || listMode;

  // Deep-link restore must run exactly once after `games` first populates;
  // SWR returns a fresh array on every 30s poll, so a games-dependent effect
  // would otherwise overwrite the user's navigation each tick.
  const hasRestored = React.useRef<boolean>(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasRestored.current) return;
    if (games.length === 0) return;
    const hash = window.location.hash;
    const m = /^#\/servers\/([^/]+)(?:\/([^/]+))?$/.exec(hash);
    if (!m) {
      hasRestored.current = true;
      return;
    }
    const gameId = m[1];
    const serverId = m[2];
    const game = games.find((g) => g.id === gameId);
    if (!game) {
      hasRestored.current = true;
      return;
    }
    if (serverId) {
      const srv = game.servers.find((s) => s.id === serverId);
      if (srv) {
        selectServer(game.id, srv.id);
        hasRestored.current = true;
        return;
      }
    }
    selectPlanet(game.id);
    hasRestored.current = true;
  }, [games, selectPlanet, selectServer]);

  // Hash sync — replaceState (don't pollute history) when focus changes.
  // Gated on hasRestored so we don't clear a deep-link hash before the restore
  // effect has had a chance to read it.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasRestored.current) return;
    let nextHash = '';
    if (view === 'server' && focusedGameId && focusedServerId) {
      nextHash = `#/servers/${focusedGameId}/${focusedServerId}`;
    } else if (view === 'planet' && focusedGameId) {
      nextHash = `#/servers/${focusedGameId}`;
    }
    if (nextHash) {
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, '', nextHash);
      }
    } else if (window.location.hash.startsWith('#/servers')) {
      // Returning to system view — drop any lingering #/servers/... hash so the URL
      // matches state. replaceState does not fire hashchange, so this is loop-safe.
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [view, focusedGameId, focusedServerId]);

  // Esc key steps out one level.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') deselect();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deselect]);

  // Reset store when component unmounts to avoid stale state cross-navigation.
  React.useEffect(() => {
    return () => reset();
  }, [reset]);

  const isEmpty = !isLoading && games.length === 0 && !error;

  return (
    <section
      id="system"
      style={{
        position: 'relative',
        minHeight: 'calc(100vh - 56px)',
        padding: '72px 32px 64px',
        borderTop: '1px solid var(--hair)',
        background: 'var(--space)',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 70% 60% at 30% 50%, rgba(75,0,130,0.25), transparent 60%)',
        }}
      />

      {isEmpty ? (
        <EmptyState />
      ) : (
        <PopulatedLayout
          games={games}
          sceneGames={sceneGames}
          loading={isLoading}
          error={Boolean(error)}
          useFallback={useFallback}
          onErrorBoundary={() => setListMode(true)}
          listMode={listMode}
        />
      )}
    </section>
  );
}

interface PopulatedLayoutProps {
  games: OverlayGame[];
  sceneGames: Array<{
    id: string;
    planet: { color: string; size: number; orbitRadius: number; orbitSpeed: number };
    servers: Array<{
      id: string;
      online: boolean;
      players: number | null;
      maxPlayers: number | null;
      ping: number | null;
    }>;
  }>;
  loading: boolean;
  error: boolean;
  useFallback: boolean;
  onErrorBoundary: () => void;
  listMode: boolean;
}
function PopulatedLayout({
  games,
  sceneGames,
  loading,
  error,
  useFallback,
  onErrorBoundary,
  listMode,
}: PopulatedLayoutProps) {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 1440,
        margin: '0 auto',
        height: 'calc(100vh - 136px)',
        minHeight: 700,
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 32,
      }}
      className="system-grid"
    >
      <style>{`
        @media (min-width: 1024px) {
          .system-grid {
            grid-template-columns: minmax(0, 1.5fr) minmax(340px, 400px) !important;
          }
        }
      `}</style>
      <div style={{ position: 'relative', minHeight: 0, minWidth: 0 }}>
        <div
          className="eyebrow p"
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}
        >
          //  SYSTEM MAP · ECLIPTIC VIEW
        </div>
        <div
          className="num"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            zIndex: 2,
            fontSize: 10,
            color: 'var(--ink-faint)',
            letterSpacing: '0.14em',
          }}
        >
          RA 00 14 12 · DEC +37 12
        </div>
        <div style={{ position: 'absolute', inset: '24px 0 24px 0' }}>
          {useFallback ? (
            <ListMode games={games} />
          ) : (
            <SceneErrorBoundary onError={onErrorBoundary}>
              <Scene games={sceneGames} />
            </SceneErrorBoundary>
          )}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            display: 'flex',
            gap: 16,
            fontSize: 10,
            color: 'var(--ink-faint)',
            letterSpacing: '0.14em',
            fontFamily: 'var(--mono)',
            textTransform: 'uppercase',
          }}
        >
          <span>
            <span className="dot on" /> ONLINE
          </span>
          <span>
            <span className="dot warn" /> LAGGY
          </span>
          <span>
            <span className="dot off" /> OFFLINE
          </span>
          {!listMode ? (
            <span style={{ marginLeft: 16, color: 'var(--ink-dim)' }}>
              CLICK PLANET · SELECT &nbsp; · &nbsp; CLICK MOON · FOCUS &nbsp; · &nbsp; ESC · RELEASE
            </span>
          ) : null}
        </div>
      </div>

      <HudOverlay games={games} loading={loading} error={error} />
    </div>
  );
}

function SceneSkeleton() {
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

function EmptyState() {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 1440,
        margin: '0 auto',
        height: 'calc(100vh - 136px)',
        minHeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <DecorativeSystem />

      <div style={{ position: 'relative', width: 420, maxWidth: '100%' }}>
        <HudPanel scanlines>
          <div style={{ position: 'relative', padding: 22 }}>
            {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
              <HudCorner key={c} corner={c} />
            ))}
            <div className="crumb" style={{ fontSize: 10 }}>
              <span>SYSTEM</span>
              <span className="sep">/</span>
              <b style={{ color: 'var(--status-warn)' }}>NO WORLDS DETECTED</b>
            </div>
            <HairlineDivider style={{ margin: '12px 0' }} />
            <div
              className="display"
              style={{ fontSize: 22, letterSpacing: '0.06em', lineHeight: 1.1 }}
            >
              SCAN COMPLETE
            </div>
            <div
              style={{
                marginTop: 8,
                color: 'var(--ink-dim)',
                fontSize: 12,
                lineHeight: 1.5,
                letterSpacing: '0.04em',
              }}
            >
              No game servers currently provisioned. The crew is between deployments — watch this
              space for the next orbit.
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginTop: 16,
              }}
            >
              <EmptyStat label="WORLDS" value="0" sub="/ 0" />
              <EmptyStat label="NODES" value="0" />
              <EmptyStat label="STATUS" value="IDLE" />
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <HudButton
                href={GUILD.join.steamGroupUrl}
                style={{ flex: 1, textAlign: 'center' }}
              >
                JOIN STEAM GROUP
              </HudButton>
              <HudButton
                variant="purple"
                href={GUILD.join.discordInviteUrl}
                style={{ flex: 1, textAlign: 'center' }}
              >
                JOIN DISCORD
              </HudButton>
            </div>

            <div
              style={{
                marginTop: 12,
                color: 'var(--ink-faint)',
                fontSize: 9,
                letterSpacing: '0.18em',
                textAlign: 'center',
                fontFamily: 'var(--mono)',
              }}
            >
              LAST SCAN · CYCLING · STANDING BY
            </div>
          </div>
        </HudPanel>
      </div>
    </div>
  );
}

function EmptyStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ border: '1px solid var(--hair-p)', padding: '8px 10px' }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div
        className="num"
        style={{
          fontFamily: 'var(--display)',
          fontSize: 18,
          letterSpacing: '0.04em',
          color: 'var(--ink)',
        }}
      >
        {value}
        {sub ? (
          <span
            className="num"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-faint)',
              marginLeft: 4,
            }}
          >
            {sub}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function DecorativeSystem() {
  return (
    <svg
      aria-hidden
      viewBox="-400 -400 800 800"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: 0.5,
        pointerEvents: 'none',
      }}
    >
      <defs>
        <radialGradient id="sun-grad-empty" cx="0" cy="0" r="0.5">
          <stop offset="0%" stopColor="#fff9c4" stopOpacity="1" />
          <stop offset="30%" stopColor="#ffc97a" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#ff6a3d" stopOpacity="0.55" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      {[140, 240, 340].map((r, i) => (
        <circle
          key={r}
          r={r}
          fill="none"
          stroke="var(--royal-purple-neon)"
          strokeOpacity={0.5}
          strokeWidth="0.6"
          strokeDasharray={i % 2 ? '1 4' : '3 6'}
          style={{ animation: `orbitPulse ${8 + i * 2}s ease-in-out infinite` }}
        />
      ))}
      <circle cx="0" cy="0" r="60" fill="url(#sun-grad-empty)" />
      <circle
        cx="0"
        cy="0"
        r="36"
        fill="#fff4c2"
        style={{ filter: 'drop-shadow(0 0 32px rgba(255,190,80,0.75))' }}
      />
      <line
        x1="-400"
        x2="400"
        y1="0"
        y2="0"
        stroke="rgba(124,58,237,0.1)"
        strokeWidth="0.4"
        strokeDasharray="1 6"
      />
      <line
        y1="-400"
        y2="400"
        x1="0"
        x2="0"
        stroke="rgba(124,58,237,0.1)"
        strokeWidth="0.4"
        strokeDasharray="1 6"
      />
    </svg>
  );
}

export default SystemSection;
