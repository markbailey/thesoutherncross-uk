'use client';

import * as React from 'react';
import { useActiveSection } from './useActiveSection';

const SECTION_IDS = ['hero', 'about', 'system', 'members', 'join'] as const;

const LINKS: Array<{ id: (typeof SECTION_IDS)[number]; label: string }> = [
  { id: 'hero', label: 'HOME' },
  { id: 'about', label: 'ABOUT' },
  { id: 'system', label: 'SYSTEM' },
  { id: 'members', label: 'MEMBERS' },
  { id: 'join', label: 'JOIN' },
];

export interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Right-side drawer navigation for mobile (< md).
 * Handles ESC close, focus trap, body-scroll lock, and safe-area-inset padding.
 * Slide animation is skipped when prefers-reduced-motion is active.
 */
export function NavDrawer({ open, onClose }: NavDrawerProps) {
  const active = useActiveSection(SECTION_IDS);
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  // Focus the close button when drawer opens
  React.useEffect(() => {
    if (open) {
      // Defer slightly so the drawer CSS transition has started
      const t = setTimeout(() => closeRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Focus trap + ESC key handler
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = drawerRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (activeEl === first || !root.contains(activeEl)) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (activeEl === last || !root.contains(activeEl)) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Body scroll lock when drawer is open
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleLinkClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${id}`);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop — click outside to close */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`nav-drawer-backdrop${open ? ' nav-drawer-backdrop--open' : ''}`}
      />

      {/* Drawer panel */}
      <div
        id="nav-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!open}
        className={`nav-drawer${open ? ' nav-drawer--open' : ''}`}
      >
        {/* Close button row */}
        <div className="nav-drawer__close-row">
          <button
            ref={closeRef}
            type="button"
            aria-label="Close navigation menu"
            onClick={onClose}
            className="nav-drawer__close-btn"
          >
            ESC ✕
          </button>
        </div>

        {/* Nav links */}
        <nav aria-label="Mobile navigation">
          <ul className="nav-drawer__list">
            {LINKS.map((link) => {
              const isActive = active === link.id;
              return (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleLinkClick(link.id);
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`nav-drawer__link${isActive ? ' nav-active' : ''}`}
                  >
                    {isActive && (
                      <span aria-hidden className="nav-drawer__indicator">
                        ▸
                      </span>
                    )}
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
