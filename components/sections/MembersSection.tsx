'use client';

import * as React from 'react';
import useSWR from 'swr';
import { MemberCard, type MemberCardMember } from '../members/MemberCard';
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

  return (
    <section
      id="members"
      style={{
        position: 'relative',
        padding: '72px 32px 96px',
        borderTop: '1px solid var(--hair)',
        background: 'var(--space)',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 28,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="eyebrow p">// ROSTER · STEAM UPLINK</div>
            <h2
              className="display"
              style={{
                margin: '6px 0 0',
                fontSize: 'clamp(28px, 3.6vw, 44px)',
                letterSpacing: '0.06em',
                lineHeight: 1.1,
                textShadow: '0 0 18px rgba(124,58,237,0.3)',
              }}
            >
              THE CREW
            </h2>
          </div>
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
        </div>

        {isLoading ? <SkeletonGrid /> : null}
        {error ? <ErrorCard onRetry={() => void mutate()} /> : null}
        {!isLoading && !error && data && data.members.length === 0 ? <EmptyCard /> : null}
        {!isLoading && !error && data && data.members.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 14,
            }}
          >
            {data.members.map((m) => (
              <MemberCard
                key={m.steamid}
                member={adaptMember(m)}
                highlighted={m.steamid === highlightedSteamid}
              />
            ))}
          </div>
        ) : null}
      </div>

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

function SkeletonGrid() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
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
          <div className="eyebrow g">ROSTER · STANDBY</div>
          <h3
            className="display"
            style={{
              margin: '12px 0 8px',
              fontSize: 22,
              letterSpacing: '0.08em',
              color: 'var(--ink)',
            }}
          >
            NO OPERATORS ONLINE
          </h3>
          <p
            style={{
              margin: 0,
              color: 'var(--ink-dim)',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              letterSpacing: '0.04em',
              lineHeight: 1.7,
            }}
          >
            The Steam group is seeding — check back shortly.
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
          <div className="eyebrow" style={{ color: 'var(--status-warn)' }}>
            ROSTER · SIGNAL LOST
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
            UNABLE TO REACH STEAM
          </h3>
          <p
            style={{
              margin: '0 0 18px',
              color: 'var(--ink-dim)',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              letterSpacing: '0.04em',
              lineHeight: 1.7,
            }}
          >
            Retrying on the next cycle.
          </p>
          <HudButton variant="green" onClick={onRetry}>
            RETRY NOW
          </HudButton>
        </div>
      </HudPanel>
    </div>
  );
}

export default MembersSection;
