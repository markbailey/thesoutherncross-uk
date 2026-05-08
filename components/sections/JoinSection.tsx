'use client';

import * as React from 'react';
import { GUILD } from '../../config/guild';

// Ported from docs/design/user/site.html lines 8760-8981.
// Animated terminal boot-log + Steam/Discord CTAs inside a HUD panel.

type LineKind = 'sys' | 'ok' | 'num';
type LogLine = { t: number; kind: LineKind; text: string };

const LINES: readonly LogLine[] = [
  { t: 0, kind: 'sys', text: 'init uplink...' },
  { t: 200, kind: 'ok', text: 'handshake · ok' },
  { t: 450, kind: 'ok', text: 'roster sync · ok' },
  { t: 700, kind: 'sys', text: 'checking open slots...' },
  { t: 1050, kind: 'num', text: 'SLOTS OPEN · 13 / 60' },
  { t: 1350, kind: 'sys', text: 'doctrine: open-door · no drama' },
  { t: 1700, kind: 'ok', text: 'ready to enlist.' },
];

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function inTestMode(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as typeof window & { __TEST_MODE__?: unknown }).__TEST_MODE__);
}

export function JoinSection() {
  const [shown, setShown] = React.useState(0);
  // testMode suppresses the .cta-fade-in class so Playwright sees the CTAs
  // immediately. Reduced-motion is handled by CSS @media — no JS gate needed.
  const [testMode, setTestMode] = React.useState(false);

  React.useEffect(() => {
    const skipAnimation = prefersReducedMotion() || inTestMode();
    setTestMode(inTestMode());
    if (skipAnimation) {
      setShown(LINES.length);
      return;
    }
    const timers = LINES.map((line, i) =>
      setTimeout(() => setShown((n) => Math.max(n, i + 1)), line.t),
    );
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, []);

  const ctaFadeClass = testMode ? '' : ' cta-fade-in';

  return (
    <section
      id="join"
      style={{
        position: 'relative',
        padding: '64px 20px 80px',
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
            'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(57,255,136,0.10), transparent 65%), radial-gradient(ellipse 70% 80% at 50% 50%, rgba(75,0,130,0.22), transparent 80%)',
        }}
      />

      <div className="join-side-ticks">
        <SideTicks side="left" />
        <SideTicks side="right" />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 960,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div className="eyebrow g" style={{ marginBottom: 12 }}>
          // ENLISTMENT · STEP 01 OF 01
        </div>

        <h2
          className="display"
          style={{
            margin: 0,
            fontSize: 'clamp(44px, 6vw, 84px)',
            lineHeight: 1.02,
            letterSpacing: '0.06em',
            fontWeight: 800,
            color: 'var(--ink)',
            textShadow: '0 0 28px rgba(124,58,237,0.35), 0 0 4px rgba(57,255,136,0.3)',
          }}
        >
          JOIN THE{' '}
          <span
            style={{
              color: 'var(--royal-green-neon)',
              textShadow: '0 0 16px rgba(57,255,136,0.7)',
            }}
          >
            CROSS
          </span>
        </h2>
        <div
          style={{
            marginTop: 12,
            color: 'var(--ink-dim)',
            fontFamily: 'var(--mono)',
            fontSize: 13,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
          }}
        >
          One link. One server hop. One crew.
        </div>

        <div
          className="hud-panel scanlines"
          style={{
            marginTop: 44,
            textAlign: 'left',
            position: 'relative',
            maxWidth: 720,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <div style={{ position: 'relative', padding: '18px 22px 22px' }}>
            <TerminalChrome />

            <div
              role="log"
              aria-live="polite"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 13,
                lineHeight: 1.85,
                color: 'var(--ink-dim)',
                letterSpacing: '0.02em',
                minHeight: 180,
              }}
            >
              {LINES.slice(0, shown).map((line, i) => (
                <TerminalLine key={i} line={line} />
              ))}
              {shown >= LINES.length && <TerminalPrompt />}
            </div>

            <div
              className="join-cta-row"
              style={{
                marginTop: 22,
                gap: 12,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <a
                href={GUILD.join.steamGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`hud-btn${ctaFadeClass}`}
                style={{
                  textDecoration: 'none',
                  padding: '14px 24px',
                  fontSize: 13,
                  letterSpacing: '0.22em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  minHeight: 48,
                  justifyContent: 'center',
                }}
              >
                <SteamGlyph />
                JOIN STEAM GROUP
                <span style={{ opacity: 0.6 }}>↗</span>
              </a>
              <a
                href={GUILD.join.discordInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`hud-btn purple${ctaFadeClass}`}
                style={{
                  textDecoration: 'none',
                  padding: '14px 24px',
                  fontSize: 13,
                  letterSpacing: '0.22em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  minHeight: 48,
                  justifyContent: 'center',
                }}
              >
                <DiscordGlyph />
                JOIN DISCORD
                <span style={{ opacity: 0.6 }}>↗</span>
              </a>
            </div>

            <div
              style={{
                marginTop: 14,
                textAlign: 'center',
                color: 'var(--ink-faint)',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: '0.22em',
              }}
            >
              PUBLIC GROUP · NO APPLICATION · JUST SHOW UP
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            color: 'var(--ink-faint)',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            letterSpacing: '0.22em',
          }}
        >
          <span>RA 00 14 12 · DEC +37 12</span>
          <span>·</span>
          <span>{GUILD.name.toUpperCase()}</span>
          <span>·</span>
          <span>EST. {GUILD.established}</span>
        </div>
      </div>
    </section>
  );
}

function SideTicks({ side }: { side: 'left' | 'right' }) {
  const edge = side === 'left' ? { left: 32, borderLeft: '1px solid var(--hair)' } : { right: 32, borderRight: '1px solid var(--hair)' };
  const tickEdge = side === 'left' ? { left: -1 } : { right: -1 };
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: 64,
        bottom: 80,
        width: 12,
        pointerEvents: 'none',
        ...edge,
      }}
    >
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <div
          key={p}
          style={{
            position: 'absolute',
            top: `calc(${p * 100}% - 0.5px)`,
            width: 12,
            borderTop: '1px solid var(--hair-p)',
            ...tickEdge,
          }}
        />
      ))}
    </div>
  );
}

function TerminalChrome() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '1px solid var(--hair)',
        paddingBottom: 12,
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', gap: 4 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 6,
            background: 'var(--royal-green-neon)',
            boxShadow: '0 0 4px var(--royal-green-neon)',
          }}
        />
        <span style={{ width: 6, height: 6, borderRadius: 6, background: 'var(--royal-purple-neon)' }} />
        <span style={{ width: 6, height: 6, borderRadius: 6, background: '#2a2338' }} />
      </div>
      <div
        className="num"
        style={{ color: 'var(--ink-faint)', fontSize: 10, letterSpacing: '0.2em' }}
      >
        TTY · /dev/uplink · enlist@southerncross
      </div>
      <div
        className="num"
        style={{
          marginLeft: 'auto',
          color: 'var(--royal-green-neon)',
          fontSize: 10,
          letterSpacing: '0.2em',
        }}
      >
        ● LIVE
      </div>
    </div>
  );
}

function TerminalLine({ line }: { line: LogLine }) {
  const color =
    line.kind === 'ok'
      ? 'var(--royal-green-neon)'
      : line.kind === 'num'
        ? 'var(--ink)'
        : 'var(--ink-dim)';
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'baseline',
        animation: 'termLine .25s ease-out',
      }}
    >
      <span style={{ color: 'var(--royal-purple-neon)', flexShrink: 0 }}>
        {line.kind === 'num' ? '$' : '›'}
      </span>
      <span style={{ color, flex: 1 }}>{line.text}</span>
      {line.kind === 'ok' && (
        <span style={{ color: 'var(--royal-green-neon)', fontSize: 11 }}>✓</span>
      )}
    </div>
  );
}

function TerminalPrompt() {
  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 10,
        borderTop: '1px dashed var(--hair)',
        display: 'flex',
        gap: 10,
        alignItems: 'baseline',
        color: 'var(--ink)',
      }}
    >
      <span style={{ color: 'var(--royal-green-neon)' }}>›</span>
      <span>ENLIST? [Y/N]</span>
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 8,
          height: 14,
          background: 'var(--royal-green-neon)',
          animation: 'blink 1s steps(1) infinite',
          boxShadow: '0 0 6px var(--royal-green-neon)',
          marginLeft: 4,
        }}
      />
    </div>
  );
}

function SteamGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="15" r="2" />
      <line x1="12" y1="11" x2="15" y2="14" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function DiscordGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.369A19.79 19.79 0 0016.558 3a14.2 14.2 0 00-.65 1.336 18.27 18.27 0 00-5.487 0A12.59 12.59 0 009.77 3a19.9 19.9 0 00-3.76 1.37C2.68 9.306 1.79 14.11 2.23 18.847a19.9 19.9 0 006.073 3.07c.492-.67.93-1.384 1.307-2.133a12.87 12.87 0 01-2.056-.99c.172-.126.34-.257.504-.39a14.25 14.25 0 0012.137 0c.164.134.332.265.504.39a12.87 12.87 0 01-2.06.99c.378.75.816 1.463 1.307 2.133a19.9 19.9 0 006.074-3.07c.506-5.46-.84-10.223-3.704-14.478zM9.355 15.95c-1.183 0-2.157-1.085-2.157-2.42 0-1.335.95-2.42 2.157-2.42s2.18 1.085 2.157 2.42c0 1.335-.95 2.42-2.157 2.42zm5.29 0c-1.183 0-2.156-1.085-2.156-2.42 0-1.335.95-2.42 2.157-2.42 1.207 0 2.18 1.085 2.156 2.42 0 1.335-.95 2.42-2.156 2.42z" />
    </svg>
  );
}

export default JoinSection;
