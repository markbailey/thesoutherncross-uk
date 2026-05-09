'use client';

import * as React from 'react';
import { HudCorner } from '../hud/HudCorner';
import { GuildLogo } from '../layout/GuildLogo';
import { Starfield } from '../solar-system/Starfield';
import { GUILD } from '../../config/guild';

// Ported from docs/design/user/site.html lines 8063-8196.
export function Hero() {
  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        minHeight: 'calc(100vh - 56px)',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 20px',
      }}
    >
      <Starfield density={1} speed={0.06} />

      {/* Orbit arcs — decorative, behind content. */}
      <svg
        aria-hidden
        viewBox="-400 -400 800 800"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        className="hero-orbit-arcs"
        preserveAspectRatio="xMidYMid slice"
      >
        {[110, 180, 260, 340].map((r, i) => (
          <circle
            key={r}
            r={r}
            fill="none"
            stroke="var(--royal-purple-neon)"
            strokeWidth="0.6"
            strokeDasharray={i % 2 ? '1 4' : '3 6'}
            style={{ animation: `orbitPulse ${6 + i * 2}s ease-in-out infinite` }}
          />
        ))}
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

      {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
        <HudCorner key={c} corner={c} />
      ))}

      {/* Top status bar — placeholder flavour data per spec. */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        <div
          className="hero-status-row"
          style={{
            color: 'var(--ink-dim)',
            fontSize: 10,
            letterSpacing: '0.24em',
            fontFamily: 'var(--mono)',
            textTransform: 'uppercase',
          }}
        >
          <span>
            <span style={{ color: 'var(--royal-green-neon)' }}>●</span> UPLINK STABLE
          </span>
          <span>
            NODES{' '}
            <span className="num" style={{ color: 'var(--royal-green-neon)' }}>
              27/30
            </span>
          </span>
          <span>COMMS OPEN</span>
          <span>
            LAT{' '}
            <span className="num" style={{ color: 'var(--royal-green-neon)' }}>
              14ms
            </span>
          </span>
        </div>
      </div>

      {/* Centred crest + title */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <GuildLogo size={200} />
        <div
          className="eyebrow"
          style={{ marginTop: 20, color: 'var(--royal-purple-neon)' }}
        >
          [ EST. {GUILD.established} · {GUILD.region.toUpperCase()} · OPS DIV. 07 ]
        </div>
        <h1
          className="display"
          style={{
            margin: '14px 0 0',
            fontSize: 'clamp(40px, 6.6vw, 96px)',
            letterSpacing: '0.08em',
            color: 'var(--ink)',
            textShadow: '0 0 24px rgba(124,58,237,0.35), 0 0 4px rgba(57,255,136,0.25)',
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          THE SOUTHERN CROSS
          <span
            style={{
              display: 'block',
              fontSize: '0.42em',
              letterSpacing: '0.5em',
              marginTop: 14,
              color: 'var(--royal-green-neon)',
              textShadow: '0 0 12px rgba(57,255,136,0.55)',
              paddingLeft: '0.5em',
            }}
          >
            · UK ·
          </span>
        </h1>

        {/* Tri-coloured tagline — derived from GUILD.tagline ("Servers. Signals. Squad."). */}
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 'clamp(13px, 1.3vw, 16px)',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            marginTop: 10,
            color: 'var(--ink-dim)',
          }}
        >
          {renderTagline(GUILD.tagline)}
        </div>

        <div style={{ marginTop: 40 }}>
          <ScrollCue />
        </div>
      </div>

      {/* Bottom spec strip — placeholder coordinates per spec. */}
      <div
        className="hero-spec-strip"
        style={{
          position: 'absolute',
          bottom: 24,
          left: 20,
          right: 20,
          color: 'var(--ink-faint)',
          fontSize: 10,
          letterSpacing: '0.2em',
          fontFamily: 'var(--mono)',
          textTransform: 'uppercase',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ color: 'var(--royal-green-neon)' }}>// BROADCAST</span>
          <span>SERVERS.SIGNALS.SQUAD / SECURE CHANNEL / {GUILD.region.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'right' }}>
          <span style={{ color: 'var(--royal-purple-neon)' }}>// SIGNAL</span>
          <span className="num">52.519°N · 013.405°E · ALT 0420KM</span>
        </div>
      </div>
    </section>
  );
}

/**
 * Renders GUILD.tagline with a tri-colour treatment: first token green,
 * middle tokens dim, final token purple. Falls back gracefully for arbitrary
 * tagline shapes.
 */
function renderTagline(tagline: string): React.ReactNode {
  const tokens = tagline.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return tagline;
  if (tokens.length === 1) {
    return <span style={{ color: 'var(--royal-green-neon)' }}>{tokens[0]}</span>;
  }
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  const middle = tokens.slice(1, -1).join(' ');
  return (
    <>
      <span style={{ color: 'var(--royal-green-neon)' }}>{first}</span>
      {middle ? <>&nbsp;{middle}&nbsp;</> : ' '}
      <span style={{ color: 'var(--royal-purple-neon)' }}>{last}</span>
    </>
  );
}

function ScrollCue() {
  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (typeof document === 'undefined') return;
    const el = document.getElementById('system');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="hero-scroll-cue"
      style={{
        background: 'transparent',
        border: '1px solid var(--hair)',
        color: 'var(--royal-green-neon)',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        padding: '10px 18px',
        minHeight: 44,
        cursor: 'pointer',
        clipPath:
          'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
      }}
    >
      ENTER SYSTEM ↓
    </button>
  );
}

export default Hero;
