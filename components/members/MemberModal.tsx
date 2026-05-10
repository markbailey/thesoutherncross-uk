'use client';

import * as React from 'react';
import { AstronautAvatar } from './AstronautAvatar';
import { deriveHue, formatRelative, type MemberCardMember } from './MemberCard';
import type { MemberRole } from '../../lib/member-roles';
import { GUILD } from '../../config/guild';
import { lockScroll } from '../../lib/scrollLock';

const FOUNDER_ACCENT = '#f2b53b';

const ROLE_LABEL: Record<MemberRole, string> = {
  founder: 'FOUNDER',
  officer: 'ADMIN',
  moderator: 'MOD',
  member: 'CREW',
};

const ROLE_COLOR: Record<MemberRole, string> = {
  founder: FOUNDER_ACCENT,
  officer: 'var(--royal-purple-neon)',
  moderator: 'var(--royal-green-neon)',
  member: 'var(--royal-purple-neon)',
};

const ROLE_PILL_BG: Record<MemberRole, string> = {
  founder: 'rgba(242,181,59,0.12)',
  officer: 'rgba(124,58,237,0.18)',
  moderator: 'rgba(57,255,136,0.12)',
  member: 'rgba(124,58,237,0.12)',
};

export interface MemberModalProps {
  member: MemberCardMember;
  onClose: () => void;
}

export function MemberModal({ member, onClose }: MemberModalProps) {
  const role: MemberRole = member.role ?? 'member';
  const roleLabel = ROLE_LABEL[role];
  const roleColor = ROLE_COLOR[role];
  const online = (member.state ?? 0) > 0;
  const profileUrl = `https://steamcommunity.com/profiles/${member.steamid}`;
  const closeBtnRef = React.useRef<HTMLButtonElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // Hold latest onClose in a ref so the mount effect stays `[]` and we don't
  // tear down the keydown listener / re-lock body scroll / re-steal focus
  // every time the parent re-renders with a new inline arrow.
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  });

  React.useEffect(() => {
    // Capture the element that had focus before mount so we can restore it on close.
    const previouslyFocused = document.activeElement;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !root.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    const unlockScroll = lockScroll();
    return () => {
      window.removeEventListener('keydown', onKey);
      unlockScroll();
      // Restore focus to whatever owned it before the modal opened.
      if (
        previouslyFocused instanceof HTMLElement &&
        document.contains(previouslyFocused)
      ) {
        previouslyFocused.focus();
      }
    };
  }, []);

  const statusText = online && member.game
    ? `In-game · ${member.game}`
    : online
      ? 'Online · Lobby'
      : `Offline · Last seen ${formatRelative(member.lastLogoff)}`;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-modal-name"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="member-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(3,2,8,0.85)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'center',
        overflowY: 'auto',
        animation: 'memberModalFade 160ms ease',
      }}
    >
      <div
        className="hud-panel scanlines member-modal-panel"
        style={{
          position: 'relative',
          width: '100%',
          background: 'var(--panel)',
          padding: 0,
          boxShadow:
            '0 0 0 1px var(--hair), 0 20px 80px rgba(0,0,0,0.7), 0 0 40px rgba(124,58,237,0.25)',
        }}
      >
        <ModalHeader
          member={member}
          role={role}
          roleLabel={roleLabel}
          roleColor={roleColor}
          rolePillBg={ROLE_PILL_BG[role]}
          online={online}
          statusText={statusText}
          onClose={onClose}
          closeBtnRef={closeBtnRef}
        />

        <div
          className="member-modal-body"
          style={{ gap: 0 }}
        >
          <div className="member-modal-detail" style={{ padding: '20px 28px' }}>
            <div className="eyebrow p" style={{ marginBottom: 8 }}>
              // BIO
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--mono)',
                fontSize: 13,
                lineHeight: 1.7,
                color: 'var(--ink-dim)',
                letterSpacing: '0.02em',
              }}
            >
              No bio on file. Open the Steam profile for the canonical view.
            </p>

            {online && member.game ? (
              <div style={{ marginTop: 24 }}>
                <div className="eyebrow g" style={{ marginBottom: 10 }}>
                  NOW PLAYING
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    border: '1px solid var(--hair)',
                    background: 'rgba(57,255,136,0.04)',
                    clipPath:
                      'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                  }}
                >
                  <span style={{ color: 'var(--royal-green-neon)' }}>▸</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)' }}>
                    {member.game}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ padding: '20px 28px' }}>
            <div className="eyebrow p" style={{ marginBottom: 10 }}>
              // UPLINK ID
            </div>

            <div className="eyebrow g" style={{ marginBottom: 10, marginTop: 6 }}>
              BADGES
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              <Badge>{roleLabel}</Badge>
              <Badge>{GUILD.shortName}</Badge>
              {online ? <Badge accent="green">ONLINE</Badge> : null}
            </div>

            <div className="eyebrow" style={{ marginBottom: 8 }}>
              STEAM ID
            </div>
            <div
              className="num"
              style={{
                fontSize: 11,
                color: 'var(--ink-dim)',
                letterSpacing: '0.1em',
                padding: '8px 10px',
                border: '1px solid var(--hair)',
                marginBottom: 18,
                fontFamily: 'var(--mono)',
                wordBreak: 'break-all',
              }}
            >
              {member.steamid}
            </div>

            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hud-btn"
              style={{
                textDecoration: 'none',
                padding: '12px 16px',
                fontSize: 11,
                letterSpacing: '0.18em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              VIEW STEAM PROFILE
              <span style={{ opacity: 0.6 }}>↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ModalHeaderProps {
  member: MemberCardMember;
  role: MemberRole;
  roleLabel: string;
  roleColor: string;
  rolePillBg: string;
  online: boolean;
  statusText: string;
  onClose: () => void;
  closeBtnRef: React.RefObject<HTMLButtonElement | null>;
}

function ModalHeader({
  member,
  role,
  roleLabel,
  roleColor,
  rolePillBg,
  online,
  statusText,
  onClose,
  closeBtnRef,
}: ModalHeaderProps) {
  const showRolePill = role !== 'member';
  return (
    <div
      style={{
        position: 'relative',
        padding: '24px 28px 20px',
        borderBottom: '1px solid var(--hair)',
        background:
          'linear-gradient(135deg, rgba(23,130,59,0.35) 0%, rgba(10,8,18,0.4) 60%, rgba(10,8,18,0.9) 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.25,
          backgroundImage:
            'linear-gradient(var(--hair) 1px, transparent 1px), linear-gradient(90deg, var(--hair) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          gap: 20,
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 96,
            height: 96,
            borderRadius: '50%',
            flexShrink: 0,
            border: `1px solid ${roleColor}`,
            boxShadow: `0 0 24px ${roleColor}, inset 0 0 16px rgba(0,0,0,0.6)`,
            overflow: 'hidden',
            background: '#07060c',
          }}
        >
          {member.avatar ? (
            <img
              src={member.avatar}
              alt=""
              width={96}
              height={96}
              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <AstronautAvatar hue={deriveHue(member.steamid)} seed={member.steamid} size={96} />
          )}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              right: 4,
              bottom: 6,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: online ? 'var(--royal-green-neon)' : '#2a2433',
              border: '2px solid var(--space)',
              boxShadow: online ? '0 0 10px var(--royal-green-neon)' : undefined,
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingRight: 80 }}>
          <div className="crumb" style={{ fontSize: 10 }}>
            <span>ROSTER</span>
            <span className="sep">/</span>
            <span>STEAM PROFILE</span>
            <span className="sep">/</span>
            <b style={{ color: 'var(--royal-green-neon)' }}>{roleLabel}</b>
          </div>
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div
              id="member-modal-name"
              className="display"
              style={{
                fontSize: 32,
                letterSpacing: '0.04em',
                lineHeight: 1.05,
                textShadow: `0 0 18px ${roleColor}`,
                wordBreak: 'break-word',
              }}
            >
              {member.persona}
            </div>
            {showRolePill ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  padding: '4px 10px',
                  color: roleColor,
                  border: `1px solid ${roleColor}`,
                  background: rolePillBg,
                  boxShadow: `0 0 10px ${roleColor}`,
                  textShadow: `0 0 6px ${roleColor}`,
                  clipPath:
                    'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                }}
              >
                {roleLabel}
              </span>
            ) : null}
          </div>
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              gap: 14,
              flexWrap: 'wrap',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-dim)',
              letterSpacing: '0.1em',
            }}
          >
            <span>{GUILD.shortName}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{GUILD.region.toUpperCase()}</span>
          </div>
          <div
            style={{
              marginTop: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: '0.12em',
              color: online ? 'var(--royal-green-neon)' : 'var(--ink-faint)',
              textTransform: 'uppercase',
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: online ? 'var(--royal-green-neon)' : '#2a2433',
                boxShadow: online ? '0 0 8px var(--royal-green-neon)' : undefined,
              }}
            />
            {statusText}
          </div>
        </div>

        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          className="hud-btn"
          aria-label="Close member profile"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            padding: '12px 14px',
            minWidth: 44,
            minHeight: 44,
            fontSize: 11,
            letterSpacing: '0.2em',
          }}
        >
          ESC ✕
        </button>
      </div>
    </div>
  );
}

function Badge({
  children,
  accent = 'purple',
}: {
  children: React.ReactNode;
  accent?: 'purple' | 'green';
}) {
  const color = accent === 'green' ? 'var(--royal-green-neon)' : 'var(--royal-purple-neon)';
  const bg = accent === 'green' ? 'rgba(57,255,136,0.10)' : 'rgba(124,58,237,0.12)';
  return (
    <span
      style={{
        fontFamily: 'var(--mono)',
        fontSize: 10,
        letterSpacing: '0.12em',
        padding: '4px 8px',
        border: `1px solid ${color}`,
        color: 'var(--ink)',
        background: bg,
        clipPath:
          'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
      }}
    >
      {children}
    </span>
  );
}

export default MemberModal;
