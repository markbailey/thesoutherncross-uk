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
import { SECTION_IDS, NAV_LINKS } from './navLinks';

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
  // Ref forwarded to NavToggle; NavDrawer restores focus here on close (WCAG 2.1 SC 2.4.3).
  const toggleRef = React.useRef<HTMLButtonElement>(null);

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
    <header className="site-nav">
      <a
        href="#hero"
        onClick={(e) => handleClick(e, 'hero')}
        className="site-nav__brand"
      >
        <span aria-hidden className="site-nav__brand-mark">
          <CruxMark size={28} />
        </span>
        <span className="display">
          {brandLead}{brandTail ? ' ' : ''}
          {brandTail ? (
            <span className="site-nav__brand-tail">·{brandTail}</span>
          ) : null}
        </span>
        <span className="eyebrow site-nav__brand-eyebrow">
          v{VERSION}
        </span>
      </a>

      <nav aria-label="Primary" className="site-nav__primary">
        <ul className="site-nav__links">
          {NAV_LINKS.map((link) => {
            const isActive = active === link.id;
            return (
              <li key={link.id} className="site-nav__item">
                <a
                  href={`#${link.id}`}
                  onClick={(e) => handleClick(e, link.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={['site-nav__link', isActive ? 'nav-active' : '']
                    .filter(Boolean)
                    .join(' ')}
                >
                  {isActive && (
                    <span aria-hidden className="site-nav__link-marker">
                      ▸
                    </span>
                  )}
                  {link.label}
                  {isActive && (
                    <span aria-hidden className="site-nav__link-underline" />
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="site-nav__rail">
        {session ? (
          /* Signed-in state */
          <div className="site-nav__signed-in">
            {session.isAdmin && (
              <a href="/admin" className="site-nav__admin-link">
                ADMIN
              </a>
            )}
            <div className="site-nav__avatar-block">
              {session.avatar && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={session.avatar}
                    alt={session.persona}
                    width={24}
                    height={24}
                    className="site-nav__avatar"
                  />
                </>
              )}
              <span className="site-nav__persona">
                {session.persona}
              </span>
            </div>
            <a href="/api/auth/steam/logout" className="site-nav__signout">
              SIGN OUT
            </a>
          </div>
        ) : (
          /* Signed-out state */
          <div className="site-nav__signed-out">
            <span className="site-nav__uplink">
              <span className="dot on" /> UPLINK
            </span>
            <a
              href={`/api/auth/steam/login?returnTo=${encodeURIComponent(returnTo)}`}
              className="site-nav__signin"
            >
              SIGN IN
            </a>
          </div>
        )}
      </div>

      {/* Login denied toast */}
      {deniedToast && (
        <div role="alert" aria-live="assertive" className="site-nav__denied-toast">
          ⚠ SIGN IN DENIED — NOT A GUILD MEMBER
        </div>
      )}

      {/* Mobile hamburger — hidden on md+ via CSS */}
      <div className="site-nav__mobile-actions">
        <NavToggle ref={toggleRef} open={drawerOpen} onToggle={() => setDrawerOpen((v) => !v)} />
      </div>
    </header>

    {/* Mobile drawer — rendered outside header to avoid stacking-context issues */}
    <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} triggerRef={toggleRef} />
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
  return <header className="site-nav site-nav--shell" />;
}

export default NavBar;
