'use client';

import * as React from 'react';
import { Pill, Eyebrow, HairlineDivider } from '../hud';
import type { OverlayGame, OverlayServer } from './HudOverlay';

export interface ListModeProps {
  games: OverlayGame[];
}

function statusOf(s: OverlayServer): 'on' | 'warn' | 'off' {
  if (!s.online) return 'off';
  if (s.ping != null && s.ping > 120) return 'warn';
  return 'on';
}

export function ListMode({ games }: ListModeProps) {
  if (games.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          color: 'var(--ink-dim)',
          fontFamily: 'var(--mono)',
          fontSize: 12,
          letterSpacing: '0.1em',
          textAlign: 'center',
        }}
      >
        NO GAME SERVERS CURRENTLY PROVISIONED.
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
        gap: 20,
        padding: 16,
        overflow: 'auto',
        height: '100%',
      }}
    >
      {games.map((g) => (
        <GameTable key={g.id} game={g} />
      ))}
    </div>
  );
}

function GameTable({ game }: { game: OverlayGame }) {
  return (
    <div style={{ border: '1px solid var(--hair-p)', minWidth: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '10px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          minWidth: 0,
        }}
      >
        <span
          className="display"
          style={{
            fontSize: 14,
            letterSpacing: '0.08em',
            color: 'var(--ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {game.name}
        </span>
        <Eyebrow tone="green">{game.servers.length} INSTANCE{game.servers.length === 1 ? '' : 'S'}</Eyebrow>
      </div>
      <HairlineDivider tone="purple" />
      <table
        style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          fontFamily: 'var(--mono)',
          fontSize: 11,
        }}
      >
        <colgroup>
          <col style={{ width: '34%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '10%' }} />
        </colgroup>
        <thead>
          <tr style={{ color: 'var(--ink-faint)', textAlign: 'left' }}>
            <th style={{ padding: '8px 10px', fontWeight: 400 }}>NAME</th>
            <th style={{ padding: '8px 10px', fontWeight: 400 }}>STATUS</th>
            <th style={{ padding: '8px 10px', fontWeight: 400 }}>PLAYERS</th>
            <th style={{ padding: '8px 10px', fontWeight: 400 }}>MAP</th>
            <th style={{ padding: '8px 10px', fontWeight: 400 }} />
          </tr>
        </thead>
        <tbody>
          {game.servers.map((s) => (
            <ServerRow key={s.id} server={s} connect={game.connectStrings[s.id] ?? ''} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ServerRow({ server, connect }: { server: OverlayServer; connect: string }) {
  const tone = statusOf(server);
  const [copied, setCopied] = React.useState<boolean>(false);
  const onCopy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard || !connect) return;
    try {
      await navigator.clipboard.writeText(connect);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Silent — see HudOverlay
    }
  };
  return (
    <tr style={{ borderTop: '1px solid var(--hair)' }}>
      <td style={{ padding: '8px 10px', color: 'var(--ink)', letterSpacing: '0.08em' }}>
        {server.name}
      </td>
      <td style={{ padding: '8px 10px' }}>
        <Pill tone={tone}>
          {tone === 'on' ? 'ONLINE' : tone === 'warn' ? 'LAGGY' : 'OFFLINE'}
        </Pill>
      </td>
      <td className="num" style={{ padding: '8px 10px', color: 'var(--ink-dim)' }}>
        {server.players ?? 0}/{server.maxPlayers ?? 0}
      </td>
      <td style={{ padding: '8px 10px', color: 'var(--ink-dim)' }}>{server.map ?? '—'}</td>
      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
        <button
          type="button"
          onClick={onCopy}
          disabled={!connect}
          className="eyebrow g"
          style={{
            background: 'transparent',
            border: '1px solid var(--hair)',
            padding: '4px 8px',
            cursor: connect ? 'pointer' : 'not-allowed',
            color: copied ? 'var(--royal-green-neon)' : 'var(--ink-dim)',
            fontFamily: 'var(--mono)',
          }}
        >
          {copied ? 'COPIED' : 'COPY'}
        </button>
      </td>
    </tr>
  );
}

export default ListMode;
