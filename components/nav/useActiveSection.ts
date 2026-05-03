'use client';

import * as React from 'react';
import { hashNavState } from './useHashSection';

/**
 * Tracks which section's centre is closest to the viewport centre.
 * Returns null until mounted (SSR-safe) or if no section is intersecting.
 * Syncs the URL hash via history.replaceState, debounced so it won't fight
 * a hash-triggered scroll.
 */
export function useActiveSection(sectionIds: readonly string[]): string | null {
  const [active, setActive] = React.useState<string | null>(null);
  // Ref mirror of `active` so the observer callback can read the latest value
  // without needing to re-register when it changes (re-registering every
  // scroll-triggered change thrashed the observer and could collide with the
  // hash-nav debounce).
  const activeRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.intersectionRatio);
        }
        let best: string | null = null;
        let bestRatio = 0;
        ratios.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        });
        if (!best) {
          const viewportCentre = window.innerHeight / 2;
          let closestId: string | null = null;
          let closestDist = Infinity;
          for (const id of sectionIds) {
            const el = document.getElementById(id);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            const centre = rect.top + rect.height / 2;
            const dist = Math.abs(centre - viewportCentre);
            if (dist < closestDist) {
              closestDist = dist;
              closestId = id;
            }
          }
          best = closestId;
        }
        if (best && best !== activeRef.current) {
          activeRef.current = best;
          setActive(best);
          const sinceHashNav = performance.now() - hashNavState.lastHashNavAt;
          // Don't clobber route-style hashes (`#/servers/...`, `#/members/...`)
          // owned by SystemSection / useHashSection — they encode focus state
          // the bare scroll-spy doesn't know about.
          const currentHash = window.location.hash;
          if (sinceHashNav > 500 && !currentHash.startsWith('#/')) {
            const nextHash = `#${best}`;
            if (currentHash !== nextHash) {
              window.history.replaceState(null, '', nextHash);
            }
          }
        }
      },
      {
        rootMargin: '-45% 0px -45% 0px',
        threshold: [0, 0.01, 0.1, 0.5, 1],
      },
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => {
      observer.disconnect();
    };
  }, [sectionIds]);

  return active;
}
