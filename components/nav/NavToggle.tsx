'use client';

import * as React from 'react';
import styles from './NavToggle.module.css';

interface NavToggleProps {
  open: boolean;
  onToggle: () => void;
}

/**
 * Hamburger / X toggle button shown on mobile (< md).
 * Animates three lines into an × when open.
 * Supports ref forwarding so NavBar can return focus here when the drawer closes.
 */
export const NavToggle = React.forwardRef<HTMLButtonElement, NavToggleProps>(
  function NavToggle({ open, onToggle }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        aria-controls="nav-drawer"
        onClick={onToggle}
        className={styles.toggle}
      >
        <span
          aria-hidden
          className={[styles.bar, styles.barTop, open ? styles.open : ''].filter(Boolean).join(' ')}
        />
        <span
          aria-hidden
          className={[styles.bar, styles.barMid, open ? styles.open : ''].filter(Boolean).join(' ')}
        />
        <span
          aria-hidden
          className={[styles.bar, styles.barBot, open ? styles.open : ''].filter(Boolean).join(' ')}
        />
      </button>
    );
  },
);
