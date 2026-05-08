'use client';

import { useState, useEffect } from 'react';

/**
 * SSR-safe media query hook.
 * Returns `defaultValue` on server / initial hydration to avoid hydration
 * mismatches; updates to the real match after mount.
 *
 * @param query - CSS media query string
 * @param defaultValue - Value returned on server and before mount. Defaults to
 *   `false`. Set to `true` when the desktop layout is the appropriate default
 *   to avoid a visible CLS on first render (e.g. for sections that were
 *   desktop-only before the responsive rebuild).
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(defaultValue);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
