'use client';

import * as React from 'react';
import { CruxMark } from '../layout/CruxMark';
import { GUILD } from '../../config/guild';
import { useActiveSection } from './useActiveSection';
import { useHashSection } from './useHashSection';

const SECTION_IDS = ['hero', 'about', 'system', 'members', 'join'] as const;

const LINKS: Array<{ id: (typeof SECTION_IDS)[number]; label: string }> = [
  { id: 'hero', label: 'HERO' },
  { id: 'about', label: 'ABOUT' },
  { id: 'system', label: 'SYSTEM' },
  { id: 'members', label: 'MEMBERS' },
  { id: 'join', label: 'JOIN' },
];

export function NavBar() {
  // Initialise hash-driven scroll behaviour.
  useHashSection();
  const active = useActiveSection(SECTION_IDS);

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
    <nav
      aria-label="Primary"
      className="site-nav"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
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
          gap: 10,
          color: 'var(--ink)',
          textDecoration: 'none',
          fontFamily: 'var(--mono)',
          fontSize: 12,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}
      >
        <CruxMark size={28} />
        <span>{GUILD.shortName}</span>
      </a>

      <ul
        className="site-nav__links"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          margin: 0,
          padding: 0,
          listStyle: 'none',
          flexWrap: 'wrap',
        }}
      >
        {LINKS.map((link) => {
          const isActive = active === link.id;
          return (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                onClick={(e) => handleClick(e, link.id)}
                aria-current={isActive ? 'page' : undefined}
                className={['site-nav__link', isActive ? 'nav-active' : '']
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  display: 'inline-block',
                  padding: '8px 12px',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--royal-green-neon)' : 'var(--ink-dim)',
                  textShadow: isActive ? '0 0 10px rgba(57,255,136,0.45)' : undefined,
                  textDecoration: 'none',
                  transition: 'color .12s ease',
                  borderRadius: 2,
                }}
              >
                {link.label}
              </a>
            </li>
          );
        })}
      </ul>

      <style>{`
        .site-nav__link:hover { color: var(--ink); }
        .site-nav__link.nav-active { color: var(--royal-green-neon); }
        .site-nav__link:focus-visible,
        .site-nav__brand:focus-visible {
          outline: 2px solid var(--royal-green-neon);
          outline-offset: 2px;
        }
        @media (max-width: 640px) {
          /* Shrink padding + letterspacing so the 5 nav labels still fit without
             needing a drawer. Keyboard + screen reader continue to see them. */
          .site-nav__links { gap: 2px !important; }
          .site-nav__link { padding: 6px 6px !important; letter-spacing: 0.14em !important; font-size: 10px !important; }
          .site-nav__brand span { display: none; }
        }
      `}</style>
    </nav>
  );
}

export default NavBar;
