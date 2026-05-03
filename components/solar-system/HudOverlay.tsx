'use client';

import * as React from 'react';
import { HudPanel, HudButton, Pill, Eyebrow, HairlineDivider } from '../hud';
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

  return (
    <HudPanel scanlines style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        style={{
          position: 'relative',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minHeight: 0,
          flex: 1,
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
        <HairlineDivider />

        {loading ? (
          <div className="eyebrow" style={{ color: 'var(--royal-green-neon)' }}>
            ESTABLISHING UPLINK…
          </div>
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
    </HudPanel>
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
      <div className="crumb" style={{ fontSize: 10 }}>
        <span>SYSTEM</span>
        {gameName ? (
          <>
            <span className="sep">/</span>
            <b style={{ color: serverName ? 'var(--ink)' : 'var(--royal-green-neon)' }}>
              {gameName.toUpperCase()}
            </b>
          </>
        ) : null}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
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
      <Eyebrow tone="green">// WORLDS</Eyebrow>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          overflow: 'auto',
          minHeight: 0,
        }}
      >
        {games.map((g) => {
          const online = g.servers.filter((s) => s.online).length;
          return (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => onSelect(g.id)}
                className="row"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid var(--hair-p)',
                  color: 'var(--ink)',
                  padding: '8px 10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
      <div className="display" style={{ fontSize: 20, letterSpacing: '0.05em' }}>
        {game.name}
      </div>
      <StatGrid
        items={[
          { label: 'PLAYERS', value: `${players}`, sub: `/ ${max}` },
          { label: 'INSTANCES', value: `${game.servers.length}` },
          { label: 'REGION', value: 'EU-W' },
        ]}
      />
      <Eyebrow tone="green">// INSTANCES</Eyebrow>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          overflow: 'auto',
          minHeight: 0,
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
                  background: 'transparent',
                  border: '1px solid var(--hair)',
                  padding: '8px 10px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 8,
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--ink)',
                  textAlign: 'left',
                }}
              >
                <span style={{ letterSpacing: '0.08em' }}>{s.name}</span>
                <span
                  className="num"
                  style={{ color: 'var(--ink-dim)', fontSize: 10 }}
                >
                  {s.players ?? 0}/{s.maxPlayers ?? 0}
                </span>
                <Pill tone={tone}>{tone === 'on' ? 'ONLINE' : tone === 'warn' ? 'LAGGY' : 'OFFLINE'}</Pill>
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
  const connect = game.connectStrings[server.id] ?? '—';
  const [copied, setCopied] = React.useState<boolean>(false);
  const onCopy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(connect);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Silent — clipboard refused, user copies by hand.
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="display" style={{ fontSize: 18, letterSpacing: '0.06em' }}>
          {server.name}
        </div>
        <Pill tone={tone}>{tone === 'on' ? 'ONLINE' : tone === 'warn' ? 'LAGGY' : 'OFFLINE'}</Pill>
      </div>
      <StatGrid
        items={[
          {
            label: 'PLAYERS',
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
        <Eyebrow tone="green" style={{ marginBottom: 6, display: 'block' }}>
          // CONNECT
        </Eyebrow>
        <button
          type="button"
          onClick={onCopy}
          style={{
            width: '100%',
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid var(--hair-p)',
            padding: '10px 12px',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 8,
            alignItems: 'center',
            cursor: 'pointer',
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--ink)',
            textAlign: 'left',
          }}
          aria-label={`Copy connect address ${connect}`}
        >
          <span className="num" style={{ letterSpacing: '0.08em' }}>{connect}</span>
          <span
            className="eyebrow g"
            style={{ color: copied ? 'var(--royal-green-neon)' : 'var(--ink-dim)' }}
          >
            {copied ? 'COPIED' : 'COPY ↗'}
          </span>
        </button>
      </div>
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 4,
          }}
        >
          <Eyebrow tone="green">// 24H</Eyebrow>
          <span
            className="num"
            style={{ color: 'var(--ink-faint)', fontSize: 9, letterSpacing: '0.18em' }}
          >
            DATA ROLLING
          </span>
        </div>
        <SparklinePlaceholder />
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
            padding: '8px 10px',
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 4 }}>{it.label}</div>
          <div
            className="num"
            style={{
              fontFamily: 'var(--display)',
              fontSize: 18,
              letterSpacing: '0.04em',
              color: 'var(--ink)',
            }}
          >
            {it.value}
            {it.sub ? (
              <span
                className="num"
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
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

function SparklinePlaceholder() {
  // Static decorative curve until v2 wires real history. Faint to read as a
  // placeholder, not a chart you should trust.
  const reactId = React.useId();
  const gradientId = `spark-fill-${reactId.replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 300 54" width="100%" height="54" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#39ff88" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#39ff88" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,40 C30,38 50,28 70,30 C95,32 110,18 140,22 C175,26 195,14 220,16 C250,18 270,26 300,20 L300,54 L0,54 Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M0,40 C30,38 50,28 70,30 C95,32 110,18 140,22 C175,26 195,14 220,16 C250,18 270,26 300,20"
        fill="none"
        stroke="#39ff88"
        strokeOpacity="0.7"
        strokeWidth="1"
      />
    </svg>
  );
}

export default HudOverlay;
