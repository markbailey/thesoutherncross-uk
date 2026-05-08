'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CruxMark } from '../layout/CruxMark';
import { GUILD } from '../../config/guild';
import { VERSION } from '../../config/site';
import { useActiveSection } from './useActiveSection';
import { useHashSection } from './useHashSection';
import { NavToggle } from './NavToggle';
import { NavDrawer } from './NavDrawer';

const SECTION_IDS = ['hero', 'about', 'system', 'members', 'join'] as const;

const LINKS: Array<{ id: (typeof SECTION_IDS)[number]; label: string }> = [
  { id: 'hero', label: 'HOME' },
  { id: 'about', label: 'ABOUT' },
  { id: 'system', label: 'SYSTEM' },
  { id: 'members', label: 'MEMBERS' },
  { id: 'join', label: 'JOIN' },
];

export type NavBarSession = {
  steamid: string;
  persona: string;
  avatar: string;
  isAdmin: boolean;
} | null;

type NavBarProps = {
  session?: NavBarSession;
};

/** Inner component that reads search params (must be inside Suspense). */
function NavBarInner({ session }: NavBarProps) {
  useHashSection();
  const active = useActiveSection(SECTION_IDS);
  const searchParams = useSearchParams();
  const [deniedToast, setDeniedToast] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get('login') === 'denied') {
      setDeniedToast(true);
      const t = setTimeout(() => setDeniedToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);
  // Split GUILD.shortName so the trailing token(s) get the green ·-prefixed treatment
  // from the design. e.g. "TSX UK" → "TSX" + "·UK".
  const [brandLead, ...brandRest] = GUILD.shortName.split(' ');
  const brandTail = brandRest.join(' ');

  const returnTo = typeof window !== 'undefined' ? window.location.pathname : '/';

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    const el = typeof document !== 'undefined' ? document.getElementById(id) : null;
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `#${id}`);
      }
    }
  };

  return (
    <>
    <header
      className="site-nav"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        background: 'rgba(7,6,12,0.82)',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
        borderBottom: '1px solid var(--hair)',
      }}
    >
      <a
        href="#hero"
        onClick={(e) => handleClick(e, 'hero')}
        className="site-nav__brand"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          color: 'var(--ink)',
          textDecoration: 'none',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 28,
            height: 28,
            display: 'inline-flex',
            filter: 'drop-shadow(0 0 4px rgba(57,255,136,0.5))',
          }}
        >
          <CruxMark size={28} />
        </span>
        <span
          className="display"
          style={{ fontSize: 12, letterSpacing: '0.22em' }}
        >
          {brandLead}{brandTail ? ' ' : ''}
          {brandTail ? (
            <span style={{ color: 'var(--royal-green-neon)' }}>·{brandTail}</span>
          ) : null}
        </span>
        <span
          className="eyebrow"
          style={{ color: 'var(--ink-faint)', marginLeft: 6 }}
        >
          v{VERSION}
        </span>
      </a>

      <nav
        aria-label="Primary"
        className="site-nav__primary"
        style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}
      >
        <ul
          className="site-nav__links"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            margin: 0,
            padding: 0,
            listStyle: 'none',
          }}
        >
          {LINKS.map((link) => {
            const isActive = active === link.id;
            return (
              <li key={link.id} style={{ position: 'relative' }}>
                <a
                  href={`#${link.id}`}
                  onClick={(e) => handleClick(e, link.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={['site-nav__link', isActive ? 'nav-active' : '']
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    padding: '10px 16px',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    letterSpacing: '0.20em',
                    textTransform: 'uppercase',
                    color: isActive ? 'var(--royal-green-neon)' : 'var(--ink-dim)',
                    textShadow: isActive ? '0 0 8px rgba(57,255,136,0.6)' : undefined,
                    textDecoration: 'none',
                    transition: 'color .12s ease',
                  }}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: 4,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--royal-green-neon)',
                        fontSize: 10,
                      }}
                    >
                      ▸
                    </span>
                  )}
                  {link.label}
                  {isActive && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: 16,
                        right: 16,
                        bottom: 4,
                        height: 1,
                        background: 'var(--royal-green-neon)',
                        boxShadow: '0 0 6px var(--royal-green-neon)',
                      }}
                    />
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className="site-nav__rail"
        style={{
          marginLeft: 16,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        {session ? (
          /* Signed-in state */
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {session.isAdmin && (
              <a
                href="/admin"
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  letterSpacing: '0.20em',
                  textTransform: 'uppercase',
                  color: 'var(--royal-green-neon)',
                  textDecoration: 'none',
                  padding: '4px 8px',
                  border: '1px solid rgba(57,255,136,0.3)',
                  transition: 'background .12s',
                }}
              >
                ADMIN
              </a>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {session.avatar && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={session.avatar}
                    alt={session.persona}
                    width={24}
                    height={24}
                    style={{ borderRadius: 2, border: '1px solid var(--hair)' }}
                  />
                </>
              )}
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: 'var(--ink)',
                  maxWidth: 96,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {session.persona}
              </span>
            </div>
            <a
              href="/api/auth/steam/logout"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 9,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--ink-dim)',
                textDecoration: 'none',
                padding: '4px 8px',
                border: '1px solid var(--hair)',
                transition: 'color .12s',
              }}
            >
              SIGN OUT
            </a>
          </div>
        ) : (
          /* Signed-out state */
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--ink-dim)',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
              }}
            >
              <span className="dot on" /> UPLINK
            </span>
            <a
              href={`/api/auth/steam/login?returnTo=${encodeURIComponent(returnTo)}`}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--royal-green-neon)',
                textDecoration: 'none',
                padding: '5px 12px',
                border: '1px solid rgba(57,255,136,0.4)',
                background: 'rgba(57,255,136,0.06)',
                transition: 'background .12s, box-shadow .12s',
              }}
            >
              SIGN IN
            </a>
          </div>
        )}
      </div>

      {/* Login denied toast */}
      {deniedToast && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 100,
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.14em',
            color: '#f59e0b',
            background: 'rgba(7,6,12,0.95)',
            border: '1px solid rgba(245,158,11,0.4)',
            padding: '12px 20px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}
        >
          ⚠ SIGN IN DENIED — NOT A GUILD MEMBER
        </div>
      )}

      {/* Mobile hamburger — hidden on md+ via CSS */}
      <div className="site-nav__mobile-actions">
        <NavToggle open={drawerOpen} onToggle={() => setDrawerOpen((v) => !v)} />
      </div>

      <style>{`
        .site-nav__link:hover { color: var(--ink); }
        .site-nav__link.nav-active { color: var(--royal-green-neon); }
        .site-nav__link:focus-visible,
        .site-nav__brand:focus-visible {
          outline: 2px solid var(--royal-green-neon);
          outline-offset: 2px;
        }
        /* Mobile-first: hamburger visible, inline nav + rail hidden */
        .site-nav__mobile-actions { display: flex; margin-left: auto; }
        .site-nav__primary { display: none !important; }
        .site-nav__rail { display: none !important; }
        /* md+ (768px): inline nav replaces hamburger */
        @media (min-width: 768px) {
          .site-nav__mobile-actions { display: none !important; }
          .site-nav__primary { display: flex !important; margin-left: auto; }
        }
        /* Rail visible at 880px+ */
        @media (min-width: 880px) {
          .site-nav__rail { display: flex !important; }
        }
        @media (max-width: 640px) {
          .site-nav__brand .eyebrow { display: none; }
          .site-nav__brand .display { font-size: 11px !important; letter-spacing: 0.18em !important; }
        }
      `}</style>
    </header>

    {/* Mobile drawer — rendered outside header to avoid stacking-context issues */}
    <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

/** Exported wrapper — wraps NavBarInner in Suspense so useSearchParams() works
    without causing the parent to require a Suspense boundary. */
export function NavBar(props: NavBarProps = {}) {
  return (
    <Suspense fallback={<NavBarShell />}>
      <NavBarInner {...props} />
    </Suspense>
  );
}

/** Static shell rendered during Suspense / SSR — no scroll-spy or search params. */
function NavBarShell() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 56,
        background: 'rgba(7,6,12,0.82)',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
        borderBottom: '1px solid var(--hair)',
      }}
    />
  );
}

export default NavBar;
