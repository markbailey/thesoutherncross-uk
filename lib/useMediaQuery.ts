'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * SSR-safe media query hook.
 * Returns `defaultValue` on server / initial hydration; reads `matchMedia`
 * synchronously per render on the client so a `query` prop change never
 * leaves the previous query's `matches` value in state.
 *
 * @param query - CSS media query string
 * @param defaultValue - Value returned on server. Defaults to `false`. Set to
 *   `true` when the desktop layout is the appropriate default to avoid a
 *   visible CLS on first render.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', notify);
      return () => mql.removeEventListener('change', notify);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
