'use client';

import * as React from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Sun } from './Sun';
import { Orbit } from './Orbit';
import { Planet } from './Planet';
import { CameraRig } from './CameraRig';
import { useCameraState } from './useCameraState';
import { useSceneVisibility } from './useSceneVisibility';

export interface SceneGameServer {
  id: string;
  online: boolean;
  players: number | null;
  maxPlayers: number | null;
  ping: number | null;
}

export interface SceneGame {
  id: string;
  planet: { color: string; size: number; orbitRadius: number; orbitSpeed: number };
  servers: SceneGameServer[];
}

export interface SceneProps {
  games: SceneGame[];
}

function ReadyDispatcher() {
  const dispatched = React.useRef<boolean>(false);
  useFrame(() => {
    if (dispatched.current) return;
    dispatched.current = true;
    if (typeof window === 'undefined') return;
    const testMode = Boolean(window.__TEST_MODE__) ||
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TEST_MODE === '1');
    if (testMode) {
      window.dispatchEvent(new Event('scene-ready'));
    }
  });
  return null;
}

function BackgroundCatcher() {
  const reset = useCameraState((s) => s.reset);
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.intersections.length === 0) {
      reset();
    }
  };
  return (
    <mesh onClick={onClick} position={[0, 0, -50]}>
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export function Scene({ games }: SceneProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const visible = useSceneVisibility(wrapperRef);

  const planetPositions = React.useRef<Map<string, THREE.Vector3>>(new Map());
  const moonPositions = React.useRef<Map<string, THREE.Vector3>>(new Map());

  const view = useCameraState((s) => s.view);
  const reducedMotion =
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const testMode =
    typeof window !== 'undefined' &&
    (Boolean(window.__TEST_MODE__) ||
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TEST_MODE === '1'));
  const snap = reducedMotion || testMode;

  // Tier orbits at concentric radii when more than 8 games — keeps the system readable.
  const planets = React.useMemo(() => {
    return games.map((g, i) => {
      const layer = Math.floor(i / 8);
      const radius = g.planet.orbitRadius + layer * 2.5;
      const phase = testMode ? (i * Math.PI) / 4 : (i * Math.PI) / 4 + (i % 3) * 0.3;
      return { ...g, _radius: radius, _phase: phase };
    });
  }, [games, testMode]);

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 8, 22], fov: 45, near: 0.1, far: 200 }}
        frameloop={visible ? 'always' : 'demand'}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#04030a']} />
        <ambientLight intensity={0.18} />
        <Stars radius={80} depth={40} count={1500} factor={4} fade speed={snap ? 0 : 1} />

        <BackgroundCatcher />
        <Sun />

        {planets.map((g) => {
          const planetRadius = g._radius;
          return (
            <group key={g.id}>
              <Orbit radius={planetRadius} attenuate={view === 'system' ? 1 : 0.3} />
              <PlanetWithTracker
                gameId={g.id}
                color={g.planet.color}
                size={g.planet.size}
                orbitRadius={planetRadius}
                orbitSpeed={g.planet.orbitSpeed}
                phase={g._phase}
                servers={g.servers}
                planetPositions={planetPositions}
                moonPositions={moonPositions}
              />
            </group>
          );
        })}

        <CameraRig
          planetPositions={planetPositions}
          moonPositions={moonPositions}
          snap={snap}
        />

        <ReadyDispatcher />

        <EffectComposer>
          <Bloom intensity={0.85} luminanceThreshold={0.2} luminanceSmoothing={0.6} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

interface PlanetWithTrackerProps {
  gameId: string;
  color: string;
  size: number;
  orbitRadius: number;
  orbitSpeed: number;
  phase: number;
  servers: SceneGameServer[];
  planetPositions: React.MutableRefObject<Map<string, THREE.Vector3>>;
  moonPositions: React.MutableRefObject<Map<string, THREE.Vector3>>;
}
function PlanetWithTracker({
  gameId,
  color,
  size,
  orbitRadius,
  orbitSpeed,
  phase,
  servers,
  planetPositions,
  moonPositions,
}: PlanetWithTrackerProps) {
  // Reuse a stable Vector3 per id; mutate in place each frame so we don't
  // allocate ~24 vectors/frame at 60fps with a populated system.
  const onPositionChange = React.useCallback(
    (pos: THREE.Vector3) => {
      const existing = planetPositions.current.get(gameId);
      if (existing) existing.copy(pos);
      else planetPositions.current.set(gameId, pos.clone());
    },
    [gameId, planetPositions],
  );
  const onMoonPosition = React.useCallback(
    (serverId: string, pos: THREE.Vector3) => {
      const existing = moonPositions.current.get(serverId);
      if (existing) existing.copy(pos);
      else moonPositions.current.set(serverId, pos.clone());
    },
    [moonPositions],
  );
  return (
    <Planet
      gameId={gameId}
      color={color}
      size={size}
      orbitRadius={orbitRadius}
      orbitSpeed={orbitSpeed}
      phase={phase}
      servers={servers.map((s) => ({
        id: s.id,
        online: s.online,
        players: s.players,
        maxPlayers: s.maxPlayers,
        ping: s.ping,
      }))}
      onPositionChange={onPositionChange}
      onMoonPosition={onMoonPosition}
    />
  );
}

export default Scene;
