'use client';

import * as React from 'react';
import useSWR from 'swr';
import { HudPanel, HudButton, HudCorner, HairlineDivider } from '../hud';
import { GUILD } from '../../config/guild';
import {
  useCameraState,
  SYSTEM_USER_ZOOM_MIN,
  SYSTEM_USER_ZOOM_MAX,
} from '../solar-system/useCameraState';
import { isWebGLAvailable } from '../solar-system/webgl';
import { type OverlayGame, type OverlayServer } from '../solar-system/HudOverlay';
import { SceneShell } from './SceneShell';
import { useMediaQuery } from '../../lib/useMediaQuery';

interface ApiServer {
  id: string;
  name: string;
  host: string;
  port: number;
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
  games?: ApiGame[];
  updatedAt: number | null;
}

const fetcher = async (url: string): Promise<ApiResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ApiResponse;
};

// Shallow structural compare for SWR. Compares every rendered field
// (game/server names, planet visuals, server status/players/map/ping) and
// ignores only `updatedAt` (top-level + per-server) since it's not rendered —
// diffing it would trigger spurious re-renders every poll without affecting UI.
function sameApiSnapshot(a: ApiResponse | undefined, b: ApiResponse | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  // Compare games list
  const ga = a.games ?? [];
  const gb = b.games ?? [];
  if (ga.length !== gb.length) return false;
  for (let i = 0; i < ga.length; i++) {
    const g1 = ga[i];
    const g2 = gb[i];
    if (!g1 || !g2) return false;
    if (
      g1.id !== g2.id ||
      g1.name !== g2.name ||
      g1.planet.color !== g2.planet.color ||
      g1.planet.size !== g2.planet.size ||
      g1.planet.orbitRadius !== g2.planet.orbitRadius ||
      g1.planet.orbitSpeed !== g2.planet.orbitSpeed
    )
      return false;
    if (g1.servers.length !== g2.servers.length) return false;
    for (let j = 0; j < g1.servers.length; j++) {
      const s1 = g1.servers[j];
      const s2 = g2.servers[j];
      if (!s1 || !s2) return false;
      if (
        s1.id !== s2.id ||
        s1.name !== s2.name ||
        s1.host !== s2.host ||
        s1.port !== s2.port ||
        s1.online !== s2.online ||
        s1.players !== s2.players ||
        s1.maxPlayers !== s2.maxPlayers ||
        s1.map !== s2.map ||
        s1.ping !== s2.ping
      )
        return false;
    }
  }
  return true;
}

export function SystemSection() {
  const { data, error, isLoading } = useSWR<ApiResponse>('/api/servers', fetcher, {
    refreshInterval: 30_000,
    keepPreviousData: true,
    // Shallow compare ignoring updatedAt (unrendered) — avoids JSON.stringify alloc
    // and the 30s "planet snap" caused by spurious re-renders on identical polls.
    compare: sameApiSnapshot,
  });

  const games: OverlayGame[] = React.useMemo(() => {
    if (!data?.games) return [];
    return data.games.map((g) => ({
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
      connectStrings: Object.fromEntries(
        g.servers.map((s) => [s.id, `${s.host}:${s.port}`])
      ),
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

  // null = WebGL probe not yet run (SSR + initial paint). Render neither
  // <Scene/> nor <ListMode/> until non-null so devices without WebGL never
  // see a Scene flash before falling back.
  const [webgl, setWebgl] = React.useState<boolean | null>(null);
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

  // Mobile (<lg): always render ListMode; desktop: respect webgl / listMode flags
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const useFallback = webgl === false || listMode;

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

  const isEmpty = !isLoading && (!data?.games || data.games.length === 0) && !error;

  return (
    <section
      id="system"
      style={{
        position: 'relative',
        minHeight: isDesktop ? 'calc(100vh - 56px)' : undefined,
        padding: 0,
        borderTop: '1px solid var(--hair)',
        background:
          'radial-gradient(ellipse at center, #050414 0%, #020106 70%), var(--space)',
        overflow: isDesktop ? 'hidden' : undefined,
      }}
    >
      {isEmpty ? (
        <EmptyState />
      ) : (
        <FullBleedLayout
          games={games}
          sceneGames={sceneGames}
          loading={isLoading}
          error={Boolean(error)}
          useFallback={useFallback}
          onErrorBoundary={() => setListMode(true)}
          listMode={listMode}
          webgl={webgl}
          isDesktop={isDesktop}
        />
      )}
    </section>
  );
}

interface FullBleedLayoutProps {
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
  webgl: boolean | null;
  isDesktop: boolean;
}
function FullBleedLayout({
  games,
  sceneGames,
  loading,
  error,
  useFallback,
  onErrorBoundary,
  listMode,
  webgl,
  isDesktop,
}: FullBleedLayoutProps) {
  const focusedGameId = useCameraState((s) => s.focusedGameId);
  const userZoom = useCameraState((s) => s.userZoom);
  const setUserZoom = useCameraState((s) => s.setUserZoom);
  const toggleListMode = useCameraState((s) => s.toggleListMode);

  // Mobile layout: section header + ListMode in normal flow
  if (!isDesktop) {
    return (
      <div style={{ padding: '24px 20px 40px' }}>
        {/* Mobile section header */}
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow p" style={{ marginBottom: 6 }}>
            // SERVER HUB
          </div>
          <div className="display" style={{ fontSize: 22, letterSpacing: '0.18em', color: 'var(--ink)', marginBottom: 4 }}>
            ORBITAL RECON
          </div>
          <div className="crumb" style={{ fontSize: 10 }}>
            <span>OPS</span>
            <span className="sep">/</span>
            <b>SYSTEM</b>
            <span className="sep">·</span>
            <span className="eyebrow g" style={{ fontSize: 9, letterSpacing: '0.24em' }}>
              {games.length ? `${games.length} WORLDS · LIVE` : 'NO WORLDS'}
            </span>
          </div>
        </div>
        <SceneShell
          games={games}
          sceneGames={sceneGames}
          webgl={webgl}
          useFallback={useFallback}
          onErrorBoundary={onErrorBoundary}
          loading={loading}
          error={error}
          focusedGameId={focusedGameId}
        />
        {/* Mobile status legend */}
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            gap: 16,
            fontSize: 10,
            color: 'var(--ink-faint)',
            letterSpacing: '0.14em',
            fontFamily: 'var(--mono)',
            textTransform: 'uppercase',
          }}
        >
          <span><span className="dot on" /> ONLINE</span>
          <span><span className="dot warn" /> LAGGY</span>
          <span><span className="dot off" /> OFFLINE</span>
        </div>
      </div>
    );
  }

  // Desktop layout: full-bleed absolute-positioned with HUD chrome
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 56px)',
        minHeight: 700,
        overflow: 'hidden',
      }}
    >
      {/* Top-left section crumb */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 32,
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          pointerEvents: 'none',
        }}
      >
        <div className="crumb" style={{ fontSize: 10 }}>
          <span>OPS</span>
          <span className="sep">/</span>
          <b>SYSTEM · 3D</b>
        </div>
        <span className="eyebrow g" style={{ fontSize: 9, letterSpacing: '0.24em' }}>
          {games.length ? `${games.length} WORLDS · LIVE` : 'NO WORLDS'}
        </span>
      </div>

      {/* Top-right corner title */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 32,
          zIndex: 3,
          textAlign: 'right',
          pointerEvents: 'none',
        }}
      >
        <div className="eyebrow p" style={{ fontSize: 9 }}>
          // SERVER HUB
        </div>
        <div
          className="display"
          style={{
            fontSize: 18,
            letterSpacing: '0.18em',
            color: 'var(--ink)',
            marginTop: 2,
          }}
        >
          ORBITAL RECON
        </div>
        {!focusedGameId ? (
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              justifyContent: 'flex-end',
              pointerEvents: 'auto',
            }}
          >
            <HudButton size="sm" variant={listMode ? 'green' : 'purple'} onClick={toggleListMode}>
              {listMode ? 'SCENE' : 'LIST'}
            </HudButton>
          </div>
        ) : null}
      </div>

      {/* Corner reticle markers */}
      <HudCorner corner="tl" />
      <HudCorner corner="tr" />
      <HudCorner corner="bl" />
      <HudCorner corner="br" />

      {/* Scene / ListMode — delegated to SceneShell */}
      <SceneShell
        games={games}
        sceneGames={sceneGames}
        webgl={webgl}
        useFallback={useFallback}
        onErrorBoundary={onErrorBoundary}
        loading={loading}
        error={error}
        focusedGameId={focusedGameId}
      />

      {/* Hint band — shown in all scene states; only hidden in list-mode/fallback. */}
      {!useFallback ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 88,
            transform: 'translateX(-50%)',
            zIndex: 3,
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.24em',
            color: 'var(--ink-faint)',
            textTransform: 'uppercase',
            padding: '6px 14px',
            border: '1px solid var(--hair)',
            background: 'rgba(7,6,12,0.6)',
            backdropFilter: 'blur(6px)',
            pointerEvents: 'none',
          }}
        >
          Click a planet to zoom in · drag to orbit · scroll to zoom · shift-drag to pan
        </div>
      ) : null}

      {/* Status legend bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 32,
          zIndex: 3,
          display: 'flex',
          gap: 16,
          fontSize: 10,
          color: 'var(--ink-faint)',
          letterSpacing: '0.14em',
          fontFamily: 'var(--mono)',
          textTransform: 'uppercase',
          pointerEvents: 'none',
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
      </div>

      {/* Bottom-right ZOOM slider — system view only (planet/server views are camera-driven). */}
      {!useFallback && !focusedGameId ? (
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            right: 32,
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            pointerEvents: 'auto',
          }}
        >
          <style>{`
            input.s3-zoom {
              -webkit-appearance: none;
              appearance: none;
              width: 120px;
              height: 14px;
              background: transparent;
              cursor: pointer;
            }
            input.s3-zoom::-webkit-slider-runnable-track {
              height: 1px;
              background: var(--hair);
            }
            input.s3-zoom::-moz-range-track {
              height: 1px;
              background: var(--hair);
            }
            input.s3-zoom::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: var(--royal-green-neon);
              border: none;
              margin-top: -3.5px;
            }
            input.s3-zoom::-moz-range-thumb {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: var(--royal-green-neon);
              border: none;
            }
          `}</style>
          <span
            style={{
              fontSize: 9,
              color: 'var(--ink-faint)',
              letterSpacing: '0.18em',
              fontFamily: 'var(--mono)',
            }}
          >
            ZOOM
          </span>
          <input
            className="s3-zoom"
            type="range"
            min={SYSTEM_USER_ZOOM_MIN}
            max={SYSTEM_USER_ZOOM_MAX}
            step="0.01"
            value={userZoom}
            onChange={(e) => setUserZoom(parseFloat(e.target.value))}
            aria-label="Zoom"
          />
        </div>
      ) : null}

      {/* Bottom-right RA/DEC stamp */}
      <div
        className="num"
        style={{
          position: 'absolute',
          bottom: 24,
          right: 32,
          zIndex: 3,
          fontSize: 9,
          color: 'var(--ink-faint)',
          letterSpacing: '0.16em',
          fontFamily: 'var(--mono)',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        RA 00 14 12 · DEC +37 12
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 1440,
        margin: '0 auto',
        height: 'calc(100vh - 56px)',
        minHeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
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
