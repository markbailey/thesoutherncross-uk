'use client';

import * as React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Central royal-purple/green sun — emissive core with a pulsing corona shell.
 * Pulse halts under prefers-reduced-motion (we just stop driving the scale).
 */
export function Sun() {
  const coronaRef = React.useRef<THREE.Mesh>(null);
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

  useFrame((state) => {
    const m = coronaRef.current;
    if (!m) return;
    if (reducedRef.current) {
      m.scale.setScalar(1);
      return;
    }
    const t = state.clock.getElapsedTime();
    const s = 1 + Math.sin(t * 1.6) * 0.06;
    m.scale.setScalar(s);
  });

  return (
    <group>
      <mesh ref={coronaRef}>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshBasicMaterial color="#4b0082" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.0, 32, 32]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#7c3aed"
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshStandardMaterial
          color="#39ff88"
          emissive="#39ff88"
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>
      <pointLight color="#7c3aed" intensity={2.4} distance={40} decay={1.6} />
    </group>
  );
}

export default Sun;
