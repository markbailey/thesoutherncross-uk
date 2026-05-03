'use client';

import * as React from 'react';

export type HashSection =
  | { section: 'hero' | 'about' | 'system' | 'members' | 'join'; subpath: null }
  | { section: 'servers'; subpath: { game: string; server: string | null } }
  | { section: 'members-deep'; subpath: { steamid: string } }
  | null;

/** Shared debounce flag so useActiveSection won't clobber the hash while
 * useHashSection is actively scrolling to a target. */
export const hashNavState: { lastHashNavAt: number } = { lastHashNavAt: 0 };

/**
 * Parses `location.hash` into a structured section reference and smooth-scrolls
 * the matching section into view on mount + hashchange. SSR-safe.
 */
export function useHashSection(): HashSection {
  const [parsed, setParsed] = React.useState<HashSection>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let rafId = 0;

    const run = () => {
      const raw = window.location.hash.replace(/^#/, '');
      if (!raw) {
        setParsed(null);
        return;
      }
      const parsedRef = parseHash(raw);
      setParsed(parsedRef);
      if (!parsedRef) return;

      const targetId =
        parsedRef.section === 'servers'
          ? 'system'
          : parsedRef.section === 'members-deep'
            ? 'members'
            : parsedRef.section;

      // Wait for fonts + one paint so measurements are stable.
      const scroll = () => {
        if (cancelled) return;
        const el = document.getElementById(targetId);
        if (!el) return;
        hashNavState.lastHashNavAt = performance.now();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      const readyPromise =
        document.fonts && 'ready' in document.fonts
          ? document.fonts.ready
          : Promise.resolve();

      readyPromise.then(() => {
        if (cancelled) return;
        rafId = requestAnimationFrame(scroll);
      });
    };

    run();
    window.addEventListener('hashchange', run);
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('hashchange', run);
    };
  }, []);

  return parsed;
}

function parseHash(raw: string): HashSection {
  // /servers/{game}[/{server}] — server segment is optional; SystemSection
  // writes `#/servers/{game}` when only a planet is focused.
  const serverMatch = raw.match(/^\/?servers\/([^/]+)(?:\/([^/]+))?$/);
  if (serverMatch) {
    return {
      section: 'servers',
      subpath: { game: serverMatch[1]!, server: serverMatch[2] ?? null },
    };
  }
  // /members/{steamid}
  const memberMatch = raw.match(/^\/?members\/([^/]+)$/);
  if (memberMatch) {
    return { section: 'members-deep', subpath: { steamid: memberMatch[1]! } };
  }
  // /{section}
  const bare = raw.replace(/^\/?/, '');
  if (bare === 'hero' || bare === 'about' || bare === 'system' || bare === 'members' || bare === 'join') {
    return { section: bare, subpath: null };
  }
  return null;
}
