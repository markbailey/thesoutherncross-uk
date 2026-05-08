'use client';

import { useState, useEffect } from 'react';

/**
 * SSR-safe media query hook.
 * Returns false on server / initial hydration; updates to the real match
 * after mount. This ensures desktop and mobile clients always SSR the same
 * content, with JS enhancing post-mount.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
