'use client';

import * as React from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useCameraState } from './useCameraState';

export interface MoonProps {
  gameId: string;
  serverId: string;
  /** Distance from the parent planet centre. */
  radius: number;
  /** Angular velocity (rad/s). */
  speed: number;
  /** Initial angle offset (radians). */
  phase: number;
  status: 'on' | 'warn' | 'off';
  /** Reports the moon's world-space position each frame to the parent (for camera focus). */
  onPositionChange?: (serverId: string, pos: THREE.Vector3) => void;
}

const COLORS: Record<MoonProps['status'], string> = {
  on: '#39ff88',
  warn: '#f0b429',
  off: '#b3264a',
};

const _moonWorldPos = new THREE.Vector3();

export function Moon({ gameId, serverId, radius, speed, phase, status, onPositionChange }: MoonProps) {
  const ref = React.useRef<THREE.Group>(null);
  const reducedRef = React.useRef<boolean>(false);
  const { selectServer, focusedServerId } = useCameraState((s) => ({
    selectServer: s.selectServer,
    focusedServerId: s.focusedServerId,
  }));
  const focused = focusedServerId === serverId;

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
    const g = ref.current;
    if (!g) return;
    const t = reducedRef.current ? 0 : state.clock.getElapsedTime();
    const a = phase + t * speed;
    g.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    if (onPositionChange) {
      g.getWorldPosition(_moonWorldPos);
      onPositionChange(serverId, _moonWorldPos);
    }
  });

  const color = COLORS[status];

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectServer(gameId, serverId);
  };

  return (
    <group ref={ref} onClick={onClick}>
      <mesh>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={focused ? 3.2 : 1.8}
          toneMapped={false}
        />
      </mesh>
      {focused ? (
        <mesh>
          <ringGeometry args={[0.22, 0.26, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
    </group>
  );
}

export default Moon;
