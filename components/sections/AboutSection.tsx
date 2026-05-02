import * as React from 'react';
import { HairlineDivider } from '../hud/HairlineDivider';
import { GUILD } from '../../config/guild';

// Ported from docs/design/user/site.html lines 8570-8758.
export function AboutSection() {
  const paragraphs = GUILD.about.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const statItems: Array<[keyof typeof GUILD.stats, string]> = [
    ['est', 'EST'],
    ['crew', 'CREW'],
    ['worlds', 'WORLDS'],
    ['region', 'REGION'],
    ['uptime', 'UPTIME'],
  ];
  const commsRows: Array<[string, string]> = [
    ['VOICE', GUILD.comms.voice.label],
    ['LFG', GUILD.comms.lfg.label],
    ['HOURS', GUILD.comms.hours],
    ['TENURE', GUILD.comms.tenure],
  ];

  return (
    <section
      id="about"
      style={{
        position: 'relative',
        padding: '96px 32px',
        borderTop: '1px solid var(--hair)',
        background: 'var(--space)',
        overflow: 'hidden',
      }}
    >
      {/* faint decorative hair grid — ported from HTML ~8598-8605 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.35,
          backgroundImage:
            'linear-gradient(var(--hair) 1px, transparent 1px), linear-gradient(90deg, var(--hair) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(ellipse 70% 80% at 50% 50%, #000 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 80% at 50% 50%, #000 40%, transparent 100%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1.35fr 1fr',
          gap: 32,
          alignItems: 'stretch',
        }}
      >
        {/* Left — Mission Brief */}
        <div className="hud-panel scanlines" style={{ position: 'relative' }}>
          <div style={{ position: 'relative', padding: 32 }}>
            <span className="eyebrow p">// MISSION BRIEF</span>
            <h2
              className="display"
              style={{
                margin: '14px 0 0',
                fontSize: 'clamp(32px, 3.6vw, 48px)',
                lineHeight: 1.05,
                letterSpacing: '0.04em',
                textShadow: '0 0 24px rgba(124,58,237,0.25)',
              }}
            >
              {GUILD.name.toUpperCase()}
            </h2>

            {paragraphs.map((p, i) => (
              <p
                key={i}
                style={{
                  marginTop: i === 0 ? 20 : 14,
                  color: i === 0 ? 'var(--ink)' : 'var(--ink-dim)',
                  fontSize: 14,
                  lineHeight: 1.75,
                  maxWidth: 620,
                  fontFamily: 'var(--mono)',
                  letterSpacing: '0.02em',
                }}
              >
                {p}
              </p>
            ))}

            <div style={{ marginTop: 28 }}>
              <div className="eyebrow g" style={{ marginBottom: 10 }}>
                HOUSE RULES
              </div>
              <ul
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  flexWrap: 'wrap',
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                }}
              >
                {GUILD.houseRules.map((rule, i) => (
                  <li
                    key={i}
                    style={{
                      border: '1px solid var(--hair)',
                      borderLeft: '2px solid var(--royal-green-neon)',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 12,
                      fontFamily: 'var(--mono)',
                      fontSize: 11,
                      letterSpacing: '0.04em',
                      lineHeight: 1.5,
                      color: 'var(--ink-dim)',
                      clipPath:
                        'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                      background: 'rgba(57,255,136,0.03)',
                    }}
                  >
                    <span
                      className="num"
                      style={{
                        color: 'var(--royal-green-neon)',
                        fontSize: 10,
                        flexShrink: 0,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ color: 'var(--ink)' }}>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right — Stats Dossier */}
        <div className="hud-panel" style={{ position: 'relative' }}>
          <div
            style={{
              position: 'relative',
              padding: 32,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span className="eyebrow g">OPERATIONAL VITALS</span>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 14,
                marginTop: 20,
              }}
            >
              {statItems.map(([key, label]) => (
                <div
                  key={key}
                  style={{
                    borderLeft: '1px solid var(--hair-p)',
                    paddingLeft: 14,
                    paddingTop: 8,
                    paddingBottom: 8,
                  }}
                >
                  <div
                    className="num display"
                    style={{
                      fontSize: 26,
                      color: 'var(--ink)',
                      letterSpacing: '0.04em',
                      lineHeight: 1,
                    }}
                  >
                    {GUILD.stats[key]}
                  </div>
                  <div
                    className="eyebrow"
                    style={{
                      fontSize: 9,
                      color: 'var(--ink-faint)',
                      marginTop: 6,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <HairlineDivider style={{ margin: '24px 0 20px' }} />

            <span className="eyebrow p" style={{ marginBottom: 12 }}>
              // COMMS PROTOCOL
            </span>
            <div
              style={{
                display: 'grid',
                gap: 10,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
                marginTop: 12,
              }}
            >
              {commsRows.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '72px 1fr',
                    gap: 10,
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    className="eyebrow g"
                    style={{ fontSize: 10 }}
                  >
                    {k}
                  </span>
                  <span style={{ color: 'var(--ink)' }}>{v}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 'auto',
                paddingTop: 20,
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--ink-faint)',
                fontSize: 9,
                letterSpacing: '0.2em',
                fontFamily: 'var(--mono)',
                textTransform: 'uppercase',
              }}
            >
              <span>CLEARANCE · OPEN</span>
              <span>DOSSIER v2.1</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          #about > div:last-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

export default AboutSection;
