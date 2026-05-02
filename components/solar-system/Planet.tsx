'use client';

import * as React from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useCameraState } from './useCameraState';
import { useOrbitAnimation } from './useOrbitAnimation';
import { Moon } from './Moon';

export interface PlanetServer {
  id: string;
  online: boolean;
  players: number | null;
  maxPlayers: number | null;
  ping: number | null;
}

export interface PlanetProps {
  gameId: string;
  color: string;
  size: number;
  orbitRadius: number;
  orbitSpeed: number;
  /** Initial angle (radians) — gives multi-planet systems some spread. */
  phase: number;
  servers: PlanetServer[];
  /** Set by parent — exposes world-space position to CameraRig. */
  onPositionChange?: (pos: THREE.Vector3) => void;
  /** Set by parent — exposes each moon's world-space position to CameraRig. */
  onMoonPosition?: (serverId: string, pos: THREE.Vector3) => void;
}

const fresnelVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fresnelFragment = /* glsl */ `
  uniform vec3 uRim;
  uniform vec3 uCore;
  uniform float uPower;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float f = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), uPower);
    vec3 col = mix(uCore, uRim, f);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function statusOf(s: PlanetServer): 'on' | 'warn' | 'off' {
  if (!s.online) return 'off';
  if (s.ping != null && s.ping > 120) return 'warn';
  return 'on';
}

export function Planet({
  gameId,
  color,
  size,
  orbitRadius,
  orbitSpeed,
  phase,
  servers,
  onPositionChange,
  onMoonPosition,
}: PlanetProps) {
  const groupRef = React.useRef<THREE.Group>(null);
  const angleRef = useOrbitAnimation(gameId, orbitSpeed, phase);
  const { selectPlanet, focusedGameId } = useCameraState((s) => ({
    selectPlanet: s.selectPlanet,
    focusedGameId: s.focusedGameId,
  }));
  const focused = focusedGameId === gameId;

  const uniforms = React.useMemo(
    () => ({
      uRim: { value: new THREE.Color(color) },
      uCore: { value: new THREE.Color('#0a0818') },
      uPower: { value: 2.4 },
    }),
    [color],
  );

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const a = angleRef.current;
    g.position.set(Math.cos(a) * orbitRadius, 0, Math.sin(a) * orbitRadius);
    if (onPositionChange) onPositionChange(g.position);
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectPlanet(gameId);
  };

  return (
    <group ref={groupRef} onClick={onClick}>
      <mesh>
        <sphereGeometry args={[size, 32, 32]} />
        <shaderMaterial
          vertexShader={fresnelVertex}
          fragmentShader={fresnelFragment}
          uniforms={uniforms}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 1.08, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.14} depthWrite={false} />
      </mesh>
      {focused ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.4, size * 1.5, 48]} />
          <meshBasicMaterial color="#39ff88" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
      ) : null}

      {servers.map((srv, i) => {
        const moonRadius = size * 1.8 + i * 0.18;
        const moonSpeed = 0.6 + i * 0.18;
        const moonPhase = i * 0.9;
        return (
          <Moon
            key={srv.id}
            gameId={gameId}
            serverId={srv.id}
            radius={moonRadius}
            speed={moonSpeed}
            phase={moonPhase}
            status={statusOf(srv)}
            onPositionChange={onMoonPosition}
          />
        );
      })}
    </group>
  );
}

export default Planet;
