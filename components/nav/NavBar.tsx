'use client';

import * as React from 'react';
import { CruxMark } from '../layout/CruxMark';
import { GUILD } from '../../config/guild';
import { VERSION } from '../../config/site';
import { useActiveSection } from './useActiveSection';
import { useHashSection } from './useHashSection';

const SECTION_IDS = ['hero', 'about', 'system', 'members', 'join'] as const;

const LINKS: Array<{ id: (typeof SECTION_IDS)[number]; label: string }> = [
  { id: 'hero', label: 'HOME' },
  { id: 'about', label: 'ABOUT' },
  { id: 'system', label: 'SYSTEM' },
  { id: 'members', label: 'MEMBERS' },
  { id: 'join', label: 'JOIN' },
];

export function NavBar() {
  useHashSection();
  const active = useActiveSection(SECTION_IDS);
  // Split GUILD.shortName so the trailing token(s) get the green ·-prefixed treatment
  // from the design. e.g. "TSX UK" → "TSX" + "·UK".
  const [brandLead, ...brandRest] = GUILD.shortName.split(' ');
  const brandTail = brandRest.join(' ');

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
    <header
      className="site-nav"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
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
      </div>

      <style>{`
        .site-nav__link:hover { color: var(--ink); }
        .site-nav__link.nav-active { color: var(--royal-green-neon); }
        .site-nav__link:focus-visible,
        .site-nav__brand:focus-visible {
          outline: 2px solid var(--royal-green-neon);
          outline-offset: 2px;
        }
        @media (max-width: 880px) {
          .site-nav__rail { display: none !important; }
        }
        @media (max-width: 640px) {
          .site-nav__brand .eyebrow { display: none; }
          .site-nav__brand .display { font-size: 11px !important; letter-spacing: 0.18em !important; }
          .site-nav__links { gap: 0 !important; }
          .site-nav__link { padding: 6px 8px !important; letter-spacing: 0.14em !important; font-size: 10px !important; }
        }
      `}</style>
    </header>
  );
}

export default NavBar;
