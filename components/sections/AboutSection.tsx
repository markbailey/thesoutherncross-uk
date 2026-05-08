import * as React from 'react';
import { GUILD } from '../../config/guild';

const principles: ReadonlyArray<{ k: string; v: string }> = [
  { k: '01', v: 'NO GRIEFING' },
  { k: '02', v: 'NO STEALING' },
  { k: '03', v: 'PLAY FRIENDLY' },
  { k: '04', v: 'LISTEN TO ADMINS' },
];

export function AboutSection() {
  // Calendar-year approximation — founding month/day unknown, so this can be off
  // by up to one year. The "over N years" copy absorbs that imprecision.
  const yearsSince = Math.max(0, new Date().getFullYear() - GUILD.established);
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
        padding: '64px 20px',
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
          gridTemplateColumns: '1fr',
          gap: 32,
          alignItems: 'stretch',
        }}
        className="about-grid"
      >
        {/* Left — Mission Brief */}
        <div className="hud-panel scanlines" style={{ position: 'relative' }}>
          <div style={{ position: 'relative', padding: 32 }}>
            <div className="crumb" style={{ fontSize: 10 }}>
              <span>INTEL</span>
              <span className="sep">/</span>
              <b>MISSION BRIEF</b>
            </div>
            <hr className="hr-hair" style={{ margin: '16px 0' }} />

            <div className="eyebrow p" style={{ marginBottom: 10 }}>
              // WHO WE ARE
            </div>
            {/* Hero copy mirrors docs/design.html — kept inline because the
                "like-minded" highlight is structural, not a plain string. */}
            <h2
              className="display"
              style={{
                margin: 0,
                fontSize: 'clamp(32px, 3.6vw, 44px)',
                lineHeight: 1.05,
                letterSpacing: '0.04em',
                textShadow: '0 0 24px rgba(124,58,237,0.25)',
              }}
            >
              A friendly group of
              <br />
              <span
                style={{
                  color: 'var(--royal-green-neon)',
                  textShadow: '0 0 12px rgba(57,255,136,0.5)',
                }}
              >
                like-minded
              </span>{' '}
              gamers
              <br />
              running the servers
              <br />
              we want to play on.
            </h2>

            <p
              style={{
                marginTop: 20,
                color: 'var(--ink)',
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 560,
                fontFamily: 'var(--mono)',
                letterSpacing: '0.02em',
              }}
            >
              We are a friendly group of like-minded gamers. We play many
              multiplayer, as well as a bunch of single player games, while we
              chat to each other. Our group has been around for over {yearsSince} years.
            </p>
            <p
              style={{
                marginTop: 14,
                color: 'var(--ink-dim)',
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 560,
                fontFamily: 'var(--mono)',
                letterSpacing: '0.02em',
              }}
            >
              We host a variety of games on our server, all we ask is you follow
              our rules (no griefing, no stealing, play friendly, and listen to
              the admins).
            </p>
            <p
              style={{
                marginTop: 14,
                color: 'var(--royal-green-neon)',
                fontSize: 14,
                lineHeight: 1.75,
                fontFamily: 'var(--mono)',
                letterSpacing: '0.08em',
                fontStyle: 'italic',
                textShadow: '0 0 8px rgba(57,255,136,0.35)',
              }}
            >
              — Hope to see you in our games. —
            </p>

            <div style={{ marginTop: 28 }}>
              <div className="eyebrow g" style={{ marginBottom: 10 }}>
                HOUSE RULES
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {principles.map((p) => (
                  <div
                    key={p.k}
                    style={{
                      border: '1px solid var(--hair)',
                      borderLeft: '2px solid var(--royal-green-neon)',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontFamily: 'var(--mono)',
                      fontSize: 11,
                      letterSpacing: '0.14em',
                      clipPath:
                        'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                      background: 'rgba(57,255,136,0.04)',
                    }}
                  >
                    <span
                      className="num"
                      style={{
                        color: 'var(--royal-green-neon)',
                        fontSize: 10,
                      }}
                    >
                      {p.k}
                    </span>
                    <span style={{ color: 'var(--ink)' }}>{p.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right — Vitals (no scanlines per design — only Mission Brief panel has them) */}
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
            <div className="crumb" style={{ fontSize: 10 }}>
              <span>INTEL</span>
              <span className="sep">/</span>
              <b>VITALS</b>
            </div>
            <hr className="hr-hair" style={{ margin: '16px 0' }} />

            <div className="eyebrow g" style={{ marginBottom: 16 }}>
              OPERATIONAL READOUT
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 14,
              }}
              className="vitals-grid"
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
                    className="eyebrow"
                    style={{
                      fontSize: 9,
                      color: 'var(--ink-faint)',
                    }}
                  >
                    {label}
                  </div>
                  <div
                    className="num display"
                    style={{
                      marginTop: 4,
                      fontSize: 30,
                      color: 'var(--ink)',
                      letterSpacing: '0.04em',
                      lineHeight: 1,
                    }}
                  >
                    {GUILD.stats[key]}
                  </div>
                </div>
              ))}
            </div>

            <hr className="hr-hair" style={{ margin: '24px 0 20px' }} />

            <div className="eyebrow p" style={{ marginBottom: 12 }}>
              // COMMS PROTOCOL
            </div>
            <div
              style={{
                display: 'grid',
                gap: 10,
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
              }}
            >
              {commsRows.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '62px 1fr',
                    gap: 10,
                    alignItems: 'baseline',
                    color: 'var(--ink-dim)',
                  }}
                >
                  <span style={{ color: 'var(--royal-green-neon)' }}>{k}</span>
                  <span style={{ color: 'var(--ink)' }} className="comms-value">{v}</span>
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
              }}
            >
              <span>CLEARANCE · OPEN</span>
              <span>DOSSIER v2.1</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .about-grid { grid-template-columns: 1.35fr 1fr !important; }
        }
        @media (min-width: 480px) {
          .vitals-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (min-width: 1024px) {
          .vitals-grid { grid-template-columns: repeat(5, 1fr) !important; }
        }
        .comms-value {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </section>
  );
}

export default AboutSection;
