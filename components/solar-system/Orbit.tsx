'use client';

import * as React from 'react';
import * as THREE from 'three';

export interface OrbitProps {
  radius: number;
  /** 0–1 multiplier on stroke opacity — drops while a planet is focused. */
  attenuate?: number;
}

/**
 * Thin translucent ring on the y=0 plane drawn from a tube geometry to keep
 * stroke width consistent regardless of camera distance.
 */
export function Orbit({ radius, attenuate = 1 }: OrbitProps) {
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

  return (
    <line>
      <primitive object={geom} attach="geometry" />
      <lineBasicMaterial
        color="#7c3aed"
        transparent
        opacity={0.45 * attenuate}
        depthWrite={false}
      />
    </line>
  );
}

export default Orbit;
