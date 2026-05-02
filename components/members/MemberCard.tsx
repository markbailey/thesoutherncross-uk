import * as React from 'react';
import { AstronautAvatar } from './AstronautAvatar';
import { Pill } from '../hud/Pill';

export interface MemberCardMember {
  steamid: string;
  persona: string;
  avatar?: string | null;
  state: number; // 0 offline, 1 online, 2 busy, 3 away, 4 snooze, 5 lfg, 6 lftrade
  game?: string | null;
  lastLogoff?: number | null; // unix seconds
}

export interface MemberCardProps {
  member: MemberCardMember;
}

/**
 * Ported from docs/design/user/site.html lines 8415-8491.
 */
export function MemberCard({ member }: MemberCardProps) {
  const online = (member.state ?? 0) > 0;
  const hue = deriveHue(member.steamid);
  const last4 = member.steamid.slice(-4);

  return (
    <div
      className="hud-panel scanlines member-card"
      data-steamid={member.steamid}
      style={{ position: 'relative', padding: 0, background: 'var(--panel)' }}
    >
      <div
        style={{
          position: 'relative',
          padding: 16,
          display: 'flex',
          gap: 14,
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              border: '1px solid var(--royal-purple-neon)',
              boxShadow:
                '0 0 10px rgba(124,58,237,0.6), inset 0 0 12px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              background: '#07060c',
            }}
          >
            {member.avatar ? (
              <img
                src={member.avatar}
                alt=""
                width={54}
                height={54}
                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
              />
            ) : (
              <AstronautAvatar hue={hue} seed={member.steamid} size={54} />
            )}
          </div>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              right: -2,
              bottom: 2,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: online ? 'var(--royal-green-neon)' : '#2a2433',
              border: '2px solid var(--space)',
              boxShadow: online ? '0 0 8px var(--royal-green-neon)' : undefined,
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 6,
            }}
          >
            <div
              title={member.persona}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--ink)',
                letterSpacing: '0.04em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {member.persona}
            </div>
          </div>
          <div className="eyebrow p" style={{ fontSize: 9, marginTop: 2 }}>
            SCUK · {last4}
          </div>
          <div style={{ marginTop: 8 }}>
            {online && member.game ? (
              <Pill tone="on">▸ {member.game}</Pill>
            ) : online ? (
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--ink-dim)',
                  letterSpacing: '0.14em',
                }}
              >
                IDLE · LOBBY
              </span>
            ) : (
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--ink-faint)',
                  letterSpacing: '0.14em',
                }}
              >
                LAST SEEN · {formatRelative(member.lastLogoff)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Stable 0-359 hue derived from a steamid via FNV-1a. */
export function deriveHue(steamid: string): number {
  let h = 2166136261;
  for (let i = 0; i < steamid.length; i++) {
    h ^= steamid.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

function formatRelative(unixSeconds: number | null | undefined): string {
  if (!unixSeconds) return 'UNKNOWN';
  const diffMs = Date.now() - unixSeconds * 1000;
  if (diffMs < 0) return 'JUST NOW';
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return `${mins}M AGO`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}D AGO`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}MO AGO`;
  const years = Math.round(months / 12);
  return `${years}Y AGO`;
}

export default MemberCard;
