import * as React from 'react';
import { AstronautAvatar } from './AstronautAvatar';
import { GUILD } from '../../config/guild';
import type { MemberRole } from '../../lib/member-roles';

export type { MemberRole };

export interface MemberCardMember {
  steamid: string;
  persona: string;
  avatar?: string | null;
  state: number; // 0 offline, 1 online, 2 busy, 3 away, 4 snooze, 5 lfg, 6 lftrade
  game?: string | null;
  lastLogoff?: number | null;
  role?: MemberRole;
}

export interface MemberCardProps {
  member: MemberCardMember;
  highlighted?: boolean;
  /** Called on plain left-click. Modifier-clicks fall through to the Steam href. */
  onActivate?: () => void;
}

const FOUNDER_ACCENT = '#f2b53b';

type RoleIconKind = 'crown' | 'star' | null;

interface RoleVisuals {
  accent: string;
  bgGradient?: string;
  triangleSize: number;
  triangleGlow: boolean;
  showFounderBadge: boolean;
  showViewLink: boolean;
  avatarBorder: string;
  avatarShadow: string;
  eyebrowColor: string;
  eyebrowShadow?: string;
  iconKind: RoleIconKind;
  eyebrowText: (last4: string) => string;
}

const ROLE_VISUALS: Record<MemberRole, RoleVisuals> = {
  founder: {
    accent: FOUNDER_ACCENT,
    bgGradient: `linear-gradient(180deg, rgba(242,181,59,0.14), rgba(10,8,18,0) 60%), var(--panel)`,
    triangleSize: 36,
    triangleGlow: true,
    showFounderBadge: true,
    showViewLink: false,
    avatarBorder: FOUNDER_ACCENT,
    avatarShadow: `0 0 14px ${FOUNDER_ACCENT}, inset 0 0 12px rgba(0,0,0,0.6)`,
    eyebrowColor: FOUNDER_ACCENT,
    eyebrowShadow: `0 0 6px ${FOUNDER_ACCENT}`,
    iconKind: 'crown',
    eyebrowText: (last4) => `FOUNDER · ${GUILD.shortName} ${last4}`,
  },
  // Mirrors design: admins + mods both get the purple gradient; only the
  // accent (triangle, avatar ring, name icon, eyebrow) changes.
  officer: {
    accent: 'var(--royal-purple-neon)',
    bgGradient: `linear-gradient(180deg, rgba(124,58,237,0.10), rgba(10,8,18,0) 60%), var(--panel)`,
    triangleSize: 28,
    triangleGlow: false,
    showFounderBadge: false,
    showViewLink: false,
    avatarBorder: 'var(--royal-purple-neon)',
    avatarShadow: '0 0 14px var(--royal-purple-neon), inset 0 0 12px rgba(0,0,0,0.6)',
    eyebrowColor: 'var(--royal-purple-neon)',
    eyebrowShadow: '0 0 6px var(--royal-purple-neon)',
    iconKind: 'star',
    eyebrowText: (last4) => `ADMIN · ${GUILD.shortName} ${last4}`,
  },
  moderator: {
    accent: 'var(--royal-green-neon)',
    bgGradient: `linear-gradient(180deg, rgba(124,58,237,0.10), rgba(10,8,18,0) 60%), var(--panel)`,
    triangleSize: 28,
    triangleGlow: false,
    showFounderBadge: false,
    showViewLink: false,
    avatarBorder: 'var(--royal-green-neon)',
    avatarShadow: '0 0 14px var(--royal-green-neon), inset 0 0 12px rgba(0,0,0,0.6)',
    eyebrowColor: 'var(--royal-green-neon)',
    eyebrowShadow: '0 0 6px var(--royal-green-neon)',
    iconKind: 'star',
    eyebrowText: (last4) => `MOD · ${GUILD.shortName} ${last4}`,
  },
  member: {
    accent: 'var(--royal-purple-neon)',
    bgGradient: undefined,
    triangleSize: 0,
    triangleGlow: false,
    showFounderBadge: false,
    showViewLink: true,
    avatarBorder: 'var(--royal-purple-neon)',
    avatarShadow: '0 0 10px rgba(124,58,237,0.6), inset 0 0 12px rgba(0,0,0,0.6)',
    eyebrowColor: 'var(--ink-faint)',
    eyebrowShadow: undefined,
    iconKind: null,
    eyebrowText: (last4) => `${GUILD.shortName} · ${last4}`,
  },
};

export function MemberCard({ member, highlighted, onActivate }: MemberCardProps) {
  const online = (member.state ?? 0) > 0;
  const hue = deriveHue(member.steamid);
  const last4 = member.steamid.slice(-4);
  const role = member.role ?? 'member';
  const v = ROLE_VISUALS[role];

  const roleClass =
    role === 'founder'
      ? ' member-card-founder'
      : role === 'officer' || role === 'moderator'
        ? ' member-card-admin'
        : '';

  const namePadRight = v.showFounderBadge ? 64 : v.showViewLink ? 56 : 0;
  const profileUrl = `https://steamcommunity.com/profiles/${member.steamid}`;

  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (!onActivate) return;
        // Let modifier-clicks / middle-clicks open the Steam profile in a new tab.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
        e.preventDefault();
        onActivate();
      }}
      aria-haspopup={onActivate ? 'dialog' : undefined}
      className={`hud-panel scanlines member-card${roleClass}`}
      data-steamid={member.steamid}
      data-highlight={highlighted ? 'true' : undefined}
      style={{
        position: 'relative',
        padding: 0,
        background: v.bgGradient ?? 'var(--panel)',
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
      }}
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
        {v.triangleSize > 0 ? (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 0,
              height: 0,
              borderTop: `${v.triangleSize}px solid ${v.accent}`,
              borderRight: `${v.triangleSize}px solid transparent`,
              opacity: v.triangleGlow ? 1 : 0.9,
              filter: v.triangleGlow ? `drop-shadow(0 0 6px ${v.accent})` : undefined,
            }}
          />
        ) : null}

        {v.showFounderBadge ? (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 8,
              right: 10,
              fontFamily: 'var(--mono)',
              fontSize: 8.5,
              letterSpacing: '0.2em',
              color: FOUNDER_ACCENT,
              textShadow: `0 0 6px ${FOUNDER_ACCENT}`,
              padding: '2px 6px',
              border: `1px solid ${FOUNDER_ACCENT}`,
              background: 'rgba(242,181,59,0.08)',
              clipPath:
                'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
            }}
          >
            FOUNDER
          </span>
        ) : null}

        {v.showViewLink ? (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: '0.18em',
              color: 'var(--ink-faint)',
              pointerEvents: 'none',
            }}
          >
            VIEW ↗
          </span>
        ) : null}

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              border: `1px solid ${v.avatarBorder}`,
              boxShadow: v.avatarShadow,
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
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
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
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              paddingRight: namePadRight,
            }}
          >
            {v.iconKind ? (
              <span
                aria-hidden
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 14,
                  height: 14,
                  flexShrink: 0,
                  color: v.accent,
                  filter: `drop-shadow(0 0 4px ${v.accent})`,
                }}
              >
                <RoleIcon kind={v.iconKind} />
              </span>
            ) : null}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.persona}</span>
          </div>
          <div
            className="eyebrow p"
            style={{
              fontSize: 9,
              marginTop: 2,
              color: v.eyebrowColor,
              textShadow: v.eyebrowShadow,
            }}
          >
            {v.eyebrowText(last4)}
          </div>
          <div style={{ marginTop: 8 }}>
            {online && member.game ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  color: 'var(--royal-green-neon)',
                  border: '1px solid var(--hair)',
                  padding: '3px 8px',
                  clipPath:
                    'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                  textTransform: 'uppercase',
                }}
              >
                <span>▸</span> {member.game}
              </span>
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
    </a>
  );
}

function RoleIcon({ kind }: { kind: Exclude<RoleIconKind, null> }) {
  if (kind === 'crown') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 18h18v2H3v-2zm0-2l2-9 4 4 3-7 3 7 4-4 2 9H3z" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.39 4.84L20 7.6l-4 3.9.94 5.5L12 14.77 7.06 17l.94-5.5-4-3.9 5.61-.76L12 2z" />
    </svg>
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

export function formatRelative(unixSeconds: number | null | undefined): string {
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
