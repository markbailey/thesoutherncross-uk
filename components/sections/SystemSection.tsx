import * as React from 'react';
import { HudPanel } from '../hud/HudPanel';
import { HudButton } from '../hud/Button';
import { GAMES } from '../../config/servers';
import { GUILD } from '../../config/guild';

/**
 * Placeholder "empty" system view — rendered whenever GAMES is empty.
 * When Phase 3 lands and GAMES populates, this component will be replaced
 * by the live R3F solar-system scene.
 */
export function SystemSection() {
  // Guard: if someone wires GAMES up before the R3F swap, we still render
  // the placeholder until the live scene module is in place.
  const hasGames = GAMES.length > 0;

  return (
    <section
      id="system"
      style={{
        position: 'relative',
        minHeight: 'calc(100vh - 56px)',
        padding: '96px 32px',
        borderTop: '1px solid var(--hair)',
        background: 'var(--space)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Decorative static solar-system stand-in. */}
      <DecorativeSystem />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 720,
          width: '100%',
          margin: '0 auto',
        }}
      >
        <HudPanel scanlines>
          <div style={{ position: 'relative', padding: 40, textAlign: 'center' }}>
            <span
              className="eyebrow g"
              style={{ position: 'absolute', top: 16, left: 20 }}
            >
              SYSTEM · OPERATIONAL
            </span>
            <span
              className="eyebrow p"
              style={{ position: 'absolute', top: 16, right: 20, fontSize: 9 }}
            >
              R3F · PHASE 3
            </span>

            <h2
              className="display"
              style={{
                margin: '24px 0 16px',
                fontSize: 'clamp(22px, 3vw, 34px)',
                letterSpacing: '0.08em',
                lineHeight: 1.15,
                color: 'var(--ink)',
                textShadow: '0 0 18px rgba(124,58,237,0.3)',
              }}
            >
              {hasGames
                ? 'SYSTEM INITIALISING'
                : 'NO GAME SERVERS CURRENTLY PROVISIONED'}
            </h2>

            <p
              style={{
                margin: '0 auto',
                maxWidth: 520,
                fontFamily: 'var(--mono)',
                fontSize: 13,
                lineHeight: 1.7,
                letterSpacing: '0.04em',
                color: 'var(--ink-dim)',
              }}
            >
              The crew is between deployments — watch this space for the next orbit.
            </p>

            <div
              style={{
                marginTop: 28,
                display: 'flex',
                gap: 12,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <HudButton variant="purple" href={GUILD.join.steamGroupUrl}>
                JOIN THE STEAM GROUP
              </HudButton>
              <HudButton variant="green" href="#/members">
                SEE THE CREW
              </HudButton>
            </div>
          </div>
        </HudPanel>
      </div>
    </section>
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
        <radialGradient id="sun-grad" cx="0" cy="0" r="0.5">
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
      <circle cx="0" cy="0" r="60" fill="url(#sun-grad)" />
      <circle
        cx="0"
        cy="0"
        r="36"
        fill="#fff4c2"
        style={{ filter: 'drop-shadow(0 0 32px rgba(255,190,80,0.75))' }}
      />
      {/* reticle */}
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
