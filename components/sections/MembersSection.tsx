'use client';

import * as React from 'react';
import useSWR from 'swr';
import { MemberCard, type MemberCardMember } from '../members/MemberCard';
import { MemberModal } from '../members/MemberModal';
import { HudPanel } from '../hud/HudPanel';
import { HudButton } from '../hud/Button';
import type { MemberRole } from '../../lib/member-roles';

type MembersResponse = {
  members: Array<{
    steamid: string;
    persona: string | null;
    avatar: string | null;
    state: number | null;
    game: { id: string | null; name: string | null } | null;
    lastLogoff: number | null;
    role?: MemberRole;
  }>;
  stale: boolean;
  updatedAt: number | null;
};

const PRESSED_GREEN: React.CSSProperties = {
  background: 'rgba(57, 255, 136, 0.18)',
  boxShadow: 'inset 0 0 12px rgba(57, 255, 136, 0.25), 0 0 14px rgba(57, 255, 136, 0.25)',
};

const PRESSED_PURPLE: React.CSSProperties = {
  background: 'rgba(124, 58, 237, 0.22)',
  boxShadow: 'inset 0 0 12px rgba(124, 58, 237, 0.3), 0 0 14px rgba(124, 58, 237, 0.3)',
};

async function fetcher(url: string): Promise<MembersResponse> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`members fetch failed: ${res.status}`);
  return res.json();
}

function adaptMember(raw: MembersResponse['members'][number]): MemberCardMember {
  return {
    steamid: raw.steamid,
    persona: raw.persona ?? 'UNKNOWN',
    avatar: raw.avatar ?? null,
    state: raw.state ?? 0,
    game: raw.game?.name ?? null,
    lastLogoff: raw.lastLogoff ?? null,
    role: raw.role ?? 'member',
  };
}

export function MembersSection() {
  const { data, error, isLoading, mutate } = useSWR<MembersResponse>('/api/members', fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  const [onlineOnly, setOnlineOnly] = React.useState(false);
  const [sortAZ, setSortAZ] = React.useState(false);
  const [openMember, setOpenMember] = React.useState<MemberCardMember | null>(null);

  // Deep-link highlight: #/members/{steamid}. The highlighted steamid is
  // tracked in React state so MemberCard renders `data-highlight` declaratively
  // and re-renders can't strand the attribute. The highlight persists until
  // the hash navigates away — the 2s pulse keyframe still runs once via CSS
  // animation, but the marker stays so users (and tests) can find the card.
  const [highlightedSteamid, setHighlightedSteamid] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncFromHash = () => {
      const m = window.location.hash.match(/^#\/?members\/([^/]+)$/);
      setHighlightedSteamid(m?.[1] ?? null);
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => {
      window.removeEventListener('hashchange', syncFromHash);
    };
  }, []);

  // Scroll the card into view once the target exists in the DOM. Separate
  // effect so it re-runs when data lands after the hash is already set.
  const scrolledFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!highlightedSteamid) {
      scrolledFor.current = null;
      return;
    }
    if (scrolledFor.current === highlightedSteamid) return;
    const card = document.querySelector<HTMLElement>(
      `[data-steamid="${CSS.escape(highlightedSteamid)}"]`,
    );
    if (!card) return;
    scrolledFor.current = highlightedSteamid;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedSteamid, data]);

  const allMembers = data?.members ?? [];
  const onlineCount = allMembers.reduce((n, m) => n + ((m.state ?? 0) > 0 ? 1 : 0), 0);
  const totalCount = allMembers.length;
  const founderCount = allMembers.reduce((n, m) => n + (m.role === 'founder' ? 1 : 0), 0);
  const adminCount = allMembers.reduce((n, m) => n + (m.role === 'officer' ? 1 : 0), 0);
  const modCount = allMembers.reduce((n, m) => n + (m.role === 'moderator' ? 1 : 0), 0);

  let displayedMembers = allMembers;
  if (onlineOnly) {
    displayedMembers = displayedMembers.filter((m) => (m.state ?? 0) > 0);
  }
  if (sortAZ) {
    displayedMembers = [...displayedMembers].sort((a, b) =>
      (a.persona ?? '').localeCompare(b.persona ?? ''),
    );
  }

  return (
    <section
      id="members"
      style={{
        position: 'relative',
        padding: '48px 20px 64px',
        borderTop: '1px solid var(--hair)',
        background: 'var(--space)',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 20,
            marginBottom: 32,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="eyebrow p">// ROSTER · STEAM GROUP UPLINK</div>
            <h2
              className="display"
              style={{
                margin: '8px 0 0',
                fontSize: 'clamp(28px, 4vw, 48px)',
                letterSpacing: '0.06em',
                color: 'var(--ink)',
                textShadow: '0 0 14px rgba(124,58,237,0.3)',
              }}
            >
              MEMBERS
            </h2>
            <div
              style={{
                marginTop: 8,
                color: 'var(--ink-dim)',
                fontFamily: 'var(--mono)',
                fontSize: 12,
                letterSpacing: '0.12em',
              }}
            >
              <span className="num" style={{ color: 'var(--ink)' }}>{onlineCount}</span> ONLINE
              <Sep />
              <span className="num" style={{ color: 'var(--ink)' }}>{totalCount}</span> TOTAL
              <Sep />
              <span className="num" style={{ color: 'var(--ink)' }}>{founderCount}</span>{' '}
              {founderCount === 1 ? 'FOUNDER' : 'FOUNDERS'}
              <Sep />
              <span className="num" style={{ color: 'var(--ink)' }}>{adminCount}</span>{' '}
              {adminCount === 1 ? 'ADMIN' : 'ADMINS'}
              <Sep />
              <span className="num" style={{ color: 'var(--ink)' }}>{modCount}</span>{' '}
              {modCount === 1 ? 'MOD' : 'MODS'}
            </div>
            <RoleLegend />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            {data?.stale ? (
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--status-warn)',
                  letterSpacing: '0.18em',
                  border: '1px solid var(--status-warn)',
                  padding: '4px 10px',
                  clipPath:
                    'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                }}
              >
                ● STALE DATA
              </span>
            ) : null}
            <HudButton
              aria-pressed={onlineOnly}
              onClick={() => setOnlineOnly((v) => !v)}
              style={onlineOnly ? PRESSED_GREEN : undefined}
            >
              FILTER · ONLINE
            </HudButton>
            <HudButton
              variant="purple"
              aria-pressed={sortAZ}
              onClick={() => setSortAZ((v) => !v)}
              style={sortAZ ? PRESSED_PURPLE : undefined}
            >
              SORT · A→Z
            </HudButton>
          </div>
        </div>

        {isLoading ? <SkeletonGrid /> : null}
        {error ? <ErrorCard onRetry={() => void mutate()} /> : null}
        {!isLoading && !error && data && totalCount === 0 ? <EmptyCard /> : null}
        {!isLoading && !error && data && totalCount > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 14,
            }}
          >
            {displayedMembers.map((m) => {
              const adapted = adaptMember(m);
              return (
                <MemberCard
                  key={m.steamid}
                  member={adapted}
                  highlighted={m.steamid === highlightedSteamid}
                  onActivate={() => setOpenMember(adapted)}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      {openMember ? (
        <MemberModal member={openMember} onClose={() => setOpenMember(null)} />
      ) : null}

      <style>{`
        [data-steamid][data-highlight="true"] {
          animation: member-pulse 2s ease-out forwards;
        }
        @keyframes member-pulse {
          0% { box-shadow: 0 0 0 0 rgba(57,255,136,0.7); }
          60% { box-shadow: 0 0 0 8px rgba(57,255,136,0); }
          100% { box-shadow: 0 0 0 0 rgba(57,255,136,0); }
        }
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }
        .member-skeleton {
          height: 92px;
          animation: skeleton-pulse 1.6s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}

function Sep() {
  return <span style={{ margin: '0 12px', color: 'var(--ink-faint)' }}>·</span>;
}

function CrownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v2H3v-2zm0-2l2-9 4 4 3-7 3 7 4-4 2 9H3z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.39 4.84L20 7.6l-4 3.9.94 5.5L12 14.77 7.06 17l.94-5.5-4-3.9 5.61-.76L12 2z" />
    </svg>
  );
}

function RoleLegend() {
  return (
    <div
      style={{
        marginTop: 14,
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        letterSpacing: '0.14em',
        color: 'var(--ink-faint)',
      }}
    >
      <LegendItem color="#f2b53b" label="FOUNDER">
        <CrownIcon />
      </LegendItem>
      <LegendItem color="var(--royal-purple-neon)" label="ADMIN">
        <StarIcon />
      </LegendItem>
      <LegendItem color="var(--royal-green-neon)" label="MOD">
        <StarIcon />
      </LegendItem>
      <span style={{ opacity: 0.5 }}>· CREW</span>
    </div>
  );
}

function LegendItem({
  color,
  label,
  children,
}: {
  color: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          filter: `drop-shadow(0 0 4px ${color})`,
        }}
      >
        {children}
      </span>
      <span style={{ color }}>{label}</span>
    </span>
  );
}

function SkeletonGrid() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 14,
      }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="hud-panel scanlines member-skeleton" />
      ))}
    </div>
  );
}

function EmptyCard() {
  return (
    <div style={{ maxWidth: 640, margin: '40px auto 0' }}>
      <HudPanel scanlines>
        <div style={{ position: 'relative', padding: 32, textAlign: 'center' }}>
          <div className="eyebrow p">// EMPTY ROSTER</div>
          <h3
            className="display"
            style={{
              margin: '12px 0 8px',
              fontSize: 22,
              letterSpacing: '0.08em',
              color: 'var(--ink)',
            }}
          >
            NO MEMBERS UPLINKED
          </h3>
          <p
            style={{
              margin: 0,
              color: 'var(--ink-dim)',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              letterSpacing: '0.1em',
              lineHeight: 1.7,
            }}
          >
            Link your Steam group to populate this roster. All uplinked members will appear here.
          </p>
        </div>
      </HudPanel>
    </div>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ maxWidth: 640, margin: '40px auto 0' }}>
      <HudPanel scanlines>
        <div style={{ position: 'relative', padding: 32, textAlign: 'center' }}>
          <div className="eyebrow" style={{ color: 'var(--status-down)' }}>
            // UPLINK LOST
          </div>
          <h3
            className="display"
            style={{
              margin: '12px 0 8px',
              fontSize: 22,
              letterSpacing: '0.08em',
              color: 'var(--ink)',
            }}
          >
            STEAM HANDSHAKE FAILED
          </h3>
          <p
            style={{
              margin: '0 0 18px',
              color: 'var(--ink-dim)',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              letterSpacing: '0.1em',
              lineHeight: 1.7,
            }}
          >
            Roster sync failed — retrying on the next cycle.
          </p>
          <HudButton variant="green" onClick={onRetry}>
            RETRY UPLINK
          </HudButton>
        </div>
      </HudPanel>
    </div>
  );
}

export default MembersSection;
