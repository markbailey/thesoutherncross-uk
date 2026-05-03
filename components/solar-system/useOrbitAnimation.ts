'use client';

import * as React from 'react';
import { useFrame } from '@react-three/fiber';
import { useCameraState } from './useCameraState';

/**
 * Returns a ref containing the current orbit angle (radians) for `gameId`.
 * Honours pausedOrbits + prefers-reduced-motion. When unpaused, resumes from
 * the last recorded angle so a planet doesn't snap back to t=0.
 */
export function useOrbitAnimation(gameId: string, orbitSpeed: number, phase = 0): React.MutableRefObject<number> {
  const angleRef = React.useRef<number>(phase);
  const reducedRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    reducedRef.current = Boolean(mq?.matches);
    const onChange = (e: MediaQueryListEvent) => {
      reducedRef.current = e.matches;
    };
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, []);

  useFrame((_, delta) => {
    if (reducedRef.current) return;
    // angleRef is the source of truth; we just hold it stable while paused
    // so the planet resumes from where it stopped.
    if (useCameraState.getState().pausedOrbits.has(gameId)) return;
    angleRef.current += delta * orbitSpeed;
  });

  return angleRef;
}
