'use client';

import * as React from 'react';

interface NavToggleProps {
  open: boolean;
  onToggle: () => void;
}

/**
 * Hamburger / X toggle button shown on mobile (< md).
 * Animates three lines into an × when open.
 */
export function NavToggle({ open, onToggle }: NavToggleProps) {
  return (
    <button
      type="button"
      aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
      aria-expanded={open}
      aria-controls="nav-drawer"
      onClick={onToggle}
      className="site-nav__toggle"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
        width: 44,
        height: 44,
        background: 'transparent',
        border: '1px solid var(--hair)',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'block',
          width: 18,
          height: 1,
          background: 'var(--royal-green-neon)',
          transition: 'transform 0.2s ease, opacity 0.2s ease',
          ...(open ? { transform: 'translateY(6px) rotate(45deg)' } : {}),
        }}
      />
      <span
        aria-hidden
        style={{
          display: 'block',
          width: 18,
          height: 1,
          background: 'var(--royal-green-neon)',
          transition: 'opacity 0.2s ease',
          ...(open ? { opacity: 0 } : {}),
        }}
      />
      <span
        aria-hidden
        style={{
          display: 'block',
          width: 18,
          height: 1,
          background: 'var(--royal-green-neon)',
          transition: 'transform 0.2s ease, opacity 0.2s ease',
          ...(open ? { transform: 'translateY(-6px) rotate(-45deg)' } : {}),
        }}
      />
    </button>
  );
}
