'use client';

import * as React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export interface OrbitProps {
  radius: number;
  /** 0–1 multiplier on stroke opacity — drops while a planet is focused. */
  attenuate?: number;
  /** Pulse period in seconds. Stagger different rings (8, 10, 12) for subtle parallax. */
  period?: number;
}

/**
 * Thin translucent ring on the y=0 plane drawn from a tube geometry to keep
 * stroke width consistent regardless of camera distance.
 *
 * Stroke opacity pulses on a sine wave (0.18 → 0.50) and is multiplied by the
 * focus `attenuate` so dimming-while-focused still composes correctly.
 */
export function Orbit({ radius, attenuate = 1, period = 10 }: OrbitProps) {
  const matRef = React.useRef<THREE.LineBasicMaterial>(null);
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

  const points = React.useMemo(() => {
    const segments = 96;
    const arr: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      arr.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return arr;
  }, [radius]);

  const geom = React.useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  useFrame((state) => {
    const m = matRef.current;
    if (!m) return;
    if (reducedRef.current) {
      m.opacity = 0.45 * attenuate;
      return;
    }
    const t = state.clock.getElapsedTime();
    const pulse = 0.34 + Math.sin(t * ((2 * Math.PI) / period)) * 0.16;
    m.opacity = pulse * attenuate;
  });

  return (
    <line>
      <primitive object={geom} attach="geometry" />
      <lineBasicMaterial
        ref={matRef}
        color="#7c3aed"
        transparent
        opacity={0.45 * attenuate}
        depthWrite={false}
      />
    </line>
  );
}

export default Orbit;
