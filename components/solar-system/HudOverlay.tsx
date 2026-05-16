'use client';

import * as React from 'react';
import { HudButton, Pill } from '../hud';
import { useCameraState } from './useCameraState';

export interface OverlayServer {
  id: string;
  name: string;
  online: boolean;
  players: number | null;
  maxPlayers: number | null;
  map: string | null;
  ping: number | null;
  updatedAt: number | null;
}

export interface OverlayGame {
  id: string;
  name: string;
  servers: OverlayServer[];
  /** From config — `${host}:${port}` for each server, keyed by id. */
  connectStrings: Record<string, string>;
}

export interface HudOverlayProps {
  games: OverlayGame[];
  loading?: boolean;
  error?: boolean;
}

function statusOf(s: OverlayServer): 'on' | 'warn' | 'off' {
  if (!s.online) return 'off';
  if (s.ping != null && s.ping > 120) return 'warn';
  return 'on';
}

function shortPing(ping: number | null): string {
  if (ping == null) return '—';
  return `${ping}`;
}

/**
 * Right-side floating HUD panel. Mounted only while a planet (and optionally a
 * server) is focused — `SystemSection` gates render on `focusedGameId`.
 * Test contract preserved by the focused render path:
 *   - .crumb shows planet/server names uppercased
 *   - "ZOOM OUT" button steps focus out one level
 *   - "LIST" / "SCENE" toggle button
 *   - server buttons named after each instance of the focused game
 */
export function HudOverlay({ games, loading = false, error = false }: HudOverlayProps) {
  const view = useCameraState((s) => s.view);
  const focusedGameId = useCameraState((s) => s.focusedGameId);
  const focusedServerId = useCameraState((s) => s.focusedServerId);
  const selectPlanet = useCameraState((s) => s.selectPlanet);
  const selectServer = useCameraState((s) => s.selectServer);
  const deselect = useCameraState((s) => s.deselect);
  const toggleListMode = useCameraState((s) => s.toggleListMode);
  const listMode = useCameraState((s) => s.listMode);

  const focusedGame = focusedGameId ? games.find((g) => g.id === focusedGameId) ?? null : null;
  const focusedServer =
    focusedGame && focusedServerId
      ? focusedGame.servers.find((s) => s.id === focusedServerId) ?? null
      : null;

  // A unique key per (view, focused) tuple so the slide-in keyframe replays
  // when the user enters a new focus state — matches the design's animation feel.
  const animKey = `${view}:${focusedGameId ?? ''}:${focusedServerId ?? ''}`;

  return (
    <div
      key={animKey}
      style={{
        position: 'absolute',
        top: 72,
        right: 24,
        bottom: 72,
        width: 360,
        maxWidth: 'calc(100vw - 48px)',
        zIndex: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        animation: 'hudSlideIn 320ms ease-out',
        pointerEvents: 'auto',
      }}
    >
      <style>{`
        @keyframes hudSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div
        className="hud-panel scanlines"
        style={{
          position: 'relative',
          flex: '1 1 auto',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'relative',
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            height: '100%',
            minHeight: 0,
          }}
        >
          <Header
            view={view}
            gameName={focusedGame?.name}
            serverName={focusedServer?.name}
            onDeselect={deselect}
            onToggleList={toggleListMode}
            listMode={listMode}
          />
          <hr className="hr-hair" style={{ margin: 0 }} />

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {loading ? (
              <div className="eyebrow g">ESTABLISHING UPLINK…</div>
            ) : error ? (
              <div className="eyebrow" style={{ color: 'var(--status-down)' }}>
                UPLINK DEGRADED · RETRYING
              </div>
            ) : view === 'system' || !focusedGame ? (
              <SystemBody games={games} onSelect={(id) => selectPlanet(id)} />
            ) : view === 'planet' || !focusedServer ? (
              <PlanetBody
                game={focusedGame}
                onSelectServer={(sid) => selectServer(focusedGame.id, sid)}
              />
            ) : (
              <ServerBody game={focusedGame} server={focusedServer} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface HeaderProps {
  view: 'system' | 'planet' | 'server';
  gameName: string | undefined;
  serverName: string | undefined;
  onDeselect: () => void;
  onToggleList: () => void;
  listMode: boolean;
}
function Header({ view, gameName, serverName, onDeselect, onToggleList, listMode }: HeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <div className="crumb" data-testid="hud-overlay-crumb" style={{ fontSize: 10 }}>
        <span>INTEL</span>
        {gameName ? (
          <>
            <span className="sep">/</span>
            <b style={{ color: serverName ? 'var(--ink)' : 'var(--royal-green-neon)' }}>
              {gameName.toUpperCase()}
            </b>
          </>
        ) : (
          <>
            <span className="sep">/</span>
            <b>SYSTEM</b>
          </>
        )}
        {serverName ? (
          <>
            <span className="sep">/</span>
            <b style={{ color: 'var(--royal-green-neon)' }}>{serverName.toUpperCase()}</b>
          </>
        ) : null}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {view !== 'system' ? (
          <HudButton size="sm" variant="purple" onClick={onDeselect}>
            ZOOM OUT
          </HudButton>
        ) : null}
        <HudButton size="sm" variant={listMode ? 'green' : 'purple'} onClick={onToggleList}>
          {listMode ? 'SCENE' : 'LIST'}
        </HudButton>
      </div>
    </div>
  );
}

interface SystemBodyProps {
  games: OverlayGame[];
  onSelect: (gameId: string) => void;
}
function SystemBody({ games, onSelect }: SystemBodyProps) {
  const totalNodes = games.reduce((sum, g) => sum + g.servers.length, 0);
  const onlineNodes = games.reduce(
    (sum, g) => sum + g.servers.filter((s) => s.online).length,
    0,
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="eyebrow p" style={{ fontSize: 9 }}>
        // SYSTEM OVERVIEW
      </div>
      <div className="display" style={{ fontSize: 18, letterSpacing: '0.06em' }}>
        SYSTEM OVERVIEW
      </div>
      <StatGrid
        items={[
          { label: 'WORLDS', value: `${games.length}` },
          { label: 'NODES', value: `${onlineNodes}`, sub: `/ ${totalNodes}` },
          { label: 'STATUS', value: onlineNodes > 0 ? 'LIVE' : 'IDLE' },
        ]}
      />
      <div className="eyebrow g" style={{ fontSize: 9 }}>
        // WORLDS
      </div>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {games.map((g) => {
          const online = g.servers.filter((s) => s.online).length;
          return (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => onSelect(g.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'rgba(20,16,36,0.5)',
                  border: '1px solid var(--hair)',
                  color: 'var(--ink)',
                  padding: '8px 10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  clipPath:
                    'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                  transition: 'all 120ms',
                }}
              >
                <span>{g.name}</span>
                <span className="num" style={{ color: 'var(--royal-green-neon)' }}>
                  {online}/{g.servers.length}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface PlanetBodyProps {
  game: OverlayGame;
  onSelectServer: (serverId: string) => void;
}
function PlanetBody({ game, onSelectServer }: PlanetBodyProps) {
  const players = game.servers.reduce((s, n) => s + (n.players ?? 0), 0);
  const max = game.servers.reduce((s, n) => s + (n.maxPlayers ?? 0), 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="eyebrow p" style={{ fontSize: 9 }}>
        // TARGET ACQUIRED
      </div>
      <div
        className="display"
        style={{
          fontSize: 22,
          letterSpacing: '0.08em',
          color: 'var(--ink)',
          textShadow: '0 0 14px rgba(57,255,136,0.4)',
        }}
      >
        {game.name}
      </div>
      <StatGrid
        items={[
          { label: 'PLAYERS', value: `${players}`, sub: `/ ${max}` },
          { label: 'INSTANCES', value: `${game.servers.length}` },
          { label: 'REGION', value: 'EU-W' },
        ]}
      />
      <div className="eyebrow g" style={{ fontSize: 9 }}>
        // INSTANCES
      </div>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {game.servers.map((s) => {
          const tone = statusOf(s);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelectServer(s.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'rgba(20,16,36,0.5)',
                  border: '1px solid var(--hair)',
                  padding: '8px 10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--ink)',
                  clipPath:
                    'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                  transition: 'all 120ms',
                }}
              >
                <div>
                  <div style={{ letterSpacing: '0.14em' }}>{s.name}</div>
                  <div
                    style={{
                      fontSize: 9,
                      color: 'var(--ink-faint)',
                      letterSpacing: '0.16em',
                      marginTop: 2,
                    }}
                  >
                    {s.ping != null ? `${s.ping}ms` : 'OFFLINE'} ·{' '}
                    {s.players ?? 0}/{s.maxPlayers ?? 0}
                  </div>
                </div>
                <Pill tone={tone}>
                  {tone === 'on' ? 'ONLINE' : tone === 'warn' ? 'LAGGY' : 'OFFLINE'}
                </Pill>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface ServerBodyProps {
  game: OverlayGame;
  server: OverlayServer;
}
function ServerBody({ game, server }: ServerBodyProps) {
  const tone = statusOf(server);
  const rawConnect = game.connectStrings[server.id];
  const hasConnect = !!rawConnect;
  const connect = rawConnect ?? '—';
  const [copied, setCopied] = React.useState<boolean>(false);
  const onCopy = async () => {
    if (!hasConnect) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(connect);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Silent
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="eyebrow g" style={{ fontSize: 9 }}>
        // INBOUND LOCK
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="display" style={{ fontSize: 18, letterSpacing: '0.12em' }}>
          {server.name}
        </div>
        <Pill tone={tone}>
          {tone === 'on' ? 'ONLINE' : tone === 'warn' ? 'LAGGY' : 'OFFLINE'}
        </Pill>
      </div>
      <StatGrid
        items={[
          {
            label: 'CREW',
            value: `${server.players ?? 0}`,
            sub: `/ ${server.maxPlayers ?? 0}`,
          },
          { label: 'LATENCY', value: shortPing(server.ping), sub: 'ms' },
          { label: 'UPTIME', value: server.online ? 'LIVE' : 'DOWN' },
        ]}
      />
      {server.map ? (
        <div
          style={{
            color: 'var(--ink-dim)',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          MAP · <span style={{ color: 'var(--ink)' }}>{server.map}</span>
        </div>
      ) : null}
      <div>
        <div className="eyebrow g" style={{ fontSize: 9, marginBottom: 6 }}>
          // CONNECT
        </div>
        <button
          type="button"
          onClick={onCopy}
          disabled={!hasConnect}
          style={{
            width: '100%',
            background: 'rgba(7,6,12,0.7)',
            border: '1px dashed var(--hair)',
            padding: '10px 12px',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 8,
            alignItems: 'center',
            cursor: hasConnect ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--royal-green-neon)',
            textAlign: 'left',
            letterSpacing: '0.08em',
          }}
          aria-label={
            hasConnect ? `Copy connect address ${connect}` : 'No connect address available'
          }
        >
          <span className="num">{connect}</span>
          <span
            className="eyebrow g"
            style={{ color: copied ? 'var(--royal-green-neon)' : 'var(--ink-dim)' }}
          >
            {!hasConnect ? 'N/A' : copied ? 'COPIED' : 'COPY ↗'}
          </span>
        </button>
      </div>
    </div>
  );
}

interface StatGridItem {
  label: string;
  value: string;
  sub?: string;
}
function StatGrid({ items }: { items: StatGridItem[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {items.map((it) => (
        <div
          key={it.label}
          style={{
            border: '1px solid var(--hair-p)',
            borderLeft: '2px solid var(--royal-purple-neon)',
            padding: '8px 10px',
          }}
        >
          <div
            className="eyebrow"
            style={{ fontSize: 8, marginBottom: 4, color: 'var(--ink-faint)' }}
          >
            {it.label}
          </div>
          <div
            className="num display"
            style={{
              fontSize: 16,
              letterSpacing: '0.06em',
              color: 'var(--ink)',
            }}
          >
            {it.value}
            {it.sub ? (
              <span
                className="num"
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--ink-faint)',
                  marginLeft: 4,
                }}
              >
                {it.sub}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default HudOverlay;
