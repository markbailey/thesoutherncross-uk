'use client';

import * as React from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useSpring } from '@react-spring/three';
import { useCameraState } from './useCameraState';

export interface CameraRigProps {
  /** Map of gameId → live world position from each Planet. */
  planetPositions: React.MutableRefObject<Map<string, THREE.Vector3>>;
  /** Map of gameId → array of last-known moon world positions (per server id). */
  moonPositions: React.MutableRefObject<Map<string, THREE.Vector3>>;
  /** Skip tweens (test mode + reduced motion). */
  snap?: boolean;
}

const SYSTEM_POS: [number, number, number] = [0, 8, 22];
const SYSTEM_TARGET: [number, number, number] = [0, 0, 0];

const tmpVec = new THREE.Vector3();

export function CameraRig({ planetPositions, moonPositions, snap = false }: CameraRigProps) {
  const camera = useThree((s) => s.camera);
  const view = useCameraState((s) => s.view);
  const focusedGameId = useCameraState((s) => s.focusedGameId);
  const focusedServerId = useCameraState((s) => s.focusedServerId);

  const targetRef = React.useRef(new THREE.Vector3(0, 0, 0));
  const lookAtRef = React.useRef(new THREE.Vector3(0, 0, 0));

  const computeTarget = React.useCallback((): {
    pos: [number, number, number];
    look: [number, number, number];
  } => {
    if (view === 'system' || !focusedGameId) {
      return { pos: SYSTEM_POS, look: SYSTEM_TARGET };
    }
    const planetPos = planetPositions.current.get(focusedGameId);
    if (!planetPos) return { pos: SYSTEM_POS, look: SYSTEM_TARGET };

    if (view === 'server' && focusedServerId) {
      const moonPos = moonPositions.current.get(focusedServerId) ?? planetPos;
      return {
        pos: [moonPos.x + 1.2, moonPos.y + 1.0, moonPos.z + 1.6],
        look: [moonPos.x, moonPos.y, moonPos.z],
      };
    }
    return {
      pos: [planetPos.x * 0.6 + 4, planetPos.y + 4, planetPos.z * 0.6 + 6],
      look: [planetPos.x, planetPos.y, planetPos.z],
    };
  }, [view, focusedGameId, focusedServerId, planetPositions, moonPositions]);

  const [, api] = useSpring(() => ({
    px: SYSTEM_POS[0],
    py: SYSTEM_POS[1],
    pz: SYSTEM_POS[2],
    lx: SYSTEM_TARGET[0],
    ly: SYSTEM_TARGET[1],
    lz: SYSTEM_TARGET[2],
    config: { mass: 1, tension: 110, friction: 26 },
    onChange: (result) => {
      const v = result.value as { px: number; py: number; pz: number; lx: number; ly: number; lz: number };
      targetRef.current.set(v.px, v.py, v.pz);
      lookAtRef.current.set(v.lx, v.ly, v.lz);
    },
  }));

  // Retarget + apply inside useFrame so we naturally inherit the canvas's
  // frameloop gating: when `useSceneVisibility` flips frameloop to 'demand'
  // (off-screen / tab hidden), this stops firing — no setInterval drift, no
  // CPU burn, no spring physics drifting silently behind a hidden canvas.
  useFrame(() => {
    const { pos, look } = computeTarget();
    if (snap) {
      // Drain any in-flight spring so the snap is a clean jump.
      api.stop();
      targetRef.current.set(pos[0], pos[1], pos[2]);
      lookAtRef.current.set(look[0], look[1], look[2]);
      api.set({ px: pos[0], py: pos[1], pz: pos[2], lx: look[0], ly: look[1], lz: look[2] });
    } else {
      api.start({ px: pos[0], py: pos[1], pz: pos[2], lx: look[0], ly: look[1], lz: look[2] });
    }
    camera.position.copy(targetRef.current);
    tmpVec.copy(lookAtRef.current);
    camera.lookAt(tmpVec);
  });

  return null;
}

export default CameraRig;
