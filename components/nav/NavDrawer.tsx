'use client';

import * as React from 'react';
import { useActiveSection } from './useActiveSection';
import { SECTION_IDS, NAV_LINKS } from './navLinks';
import { lockScroll } from '../../lib/scrollLock';

export interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Ref to the toggle button; focus is returned here when the drawer closes. */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Right-side drawer navigation for mobile (< md).
 * Handles ESC close, focus trap, body-scroll lock, and safe-area-inset padding.
 * Slide animation is skipped when prefers-reduced-motion is active.
 */
export function NavDrawer({ open, onClose, triggerRef }: NavDrawerProps) {
  const active = useActiveSection(SECTION_IDS);
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  // Focus the close button when drawer opens; return focus to trigger on true→false transition.
  // `wasOpen` ref prevents focus from being stolen on the initial mount (when `open=false`).
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    if (open) {
      wasOpen.current = true;
      // Defer so the drawer CSS transition has started before stealing focus.
      // requestAnimationFrame is used rather than setTimeout(50) for more robust
      // timing across slow devices.
      let raf2: number;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => closeRef.current?.focus());
      });
      return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef?.current?.focus();
    }
  }, [open, triggerRef]);

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
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
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
    return lockScroll();
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

      {/* Drawer panel — inert when closed removes all focus targets during/after the close transition */}
      <div
        id="nav-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!open}
        inert={!open || undefined}
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
            {NAV_LINKS.map((link) => {
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
