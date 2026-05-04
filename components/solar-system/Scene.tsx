'use client';

import * as React from 'react';
import * as THREE from 'three';
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

// ── Helpers ─────────────────────────────────────────────────────────
function hexToHue(hex: string): number {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = h * 60;
  return (h + 360) % 360;
}

function statusOf(s: SceneGameServer): 'on' | 'warn' | 'off' {
  if (!s.online) return 'off';
  if (s.ping != null && s.ping > 120) return 'warn';
  return 'on';
}

// ── Procedural textures (ported from .design-extract/solar-system-3d.jsx) ──
function makePlanetTexture(hue: number): THREE.CanvasTexture {
  const w = 512,
    h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) {
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }

  const baseL = 18;
  ctx.fillStyle = `hsl(${hue}, 55%, ${baseL}%)`;
  ctx.fillRect(0, 0, w, h);

  // Deterministic per-hue PRNG so reruns match.
  const rand = (() => {
    let seed = hue * 1000 + 7;
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  })();

  const bandCount = 9 + Math.floor(rand() * 5);
  let y = 0;
  for (let i = 0; i < bandCount; i++) {
    const bh = (h / bandCount) * (0.5 + rand() * 1.2);
    const light = 22 + Math.floor(rand() * 38);
    const sat = 40 + Math.floor(rand() * 40);
    ctx.fillStyle = `hsl(${hue + (rand() - 0.5) * 18}, ${sat}%, ${light}%)`;
    ctx.fillRect(0, y, w, bh);
    y += bh;
  }

  // Polar darkening
  const poleGrad = ctx.createLinearGradient(0, 0, 0, h);
  poleGrad.addColorStop(0.0, 'rgba(0,0,0,0.55)');
  poleGrad.addColorStop(0.5, 'rgba(0,0,0,0.0)');
  poleGrad.addColorStop(1.0, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = poleGrad;
  ctx.fillRect(0, 0, w, h);

  // Speckle
  const speckles = 1200;
  for (let i = 0; i < speckles; i++) {
    const sx = rand() * w,
      sy = rand() * h;
    const a = 0.03 + rand() * 0.12;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(sx, sy, 1 + rand() * 2, 1 + rand() * 2);
  }
  for (let i = 0; i < speckles / 2; i++) {
    const sx = rand() * w,
      sy = rand() * h;
    const a = 0.04 + rand() * 0.15;
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillRect(sx, sy, 1 + rand() * 3, 1 + rand() * 3);
  }

  // Equatorial highlight
  const eqGrad = ctx.createLinearGradient(0, h * 0.35, 0, h * 0.65);
  eqGrad.addColorStop(0, 'rgba(0,0,0,0)');
  eqGrad.addColorStop(0.5, `hsla(${hue}, 70%, 55%, 0.22)`);
  eqGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = eqGrad;
  ctx.fillRect(0, h * 0.35, w, h * 0.3);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeSunTexture(): THREE.CanvasTexture {
  const w = 512,
    h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(c);
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h / 2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.2, '#fffbe0');
  g.addColorStop(0.5, '#f5d27a');
  g.addColorStop(1, '#c06a2e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * w,
      y = Math.random() * h;
    ctx.fillStyle = `rgba(255,200,120,${Math.random() * 0.25})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeGlowTexture(rgb: string): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(c);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, rgb);
  g.addColorStop(0.25, rgb.replace(')', ', 0.6)').replace('rgb', 'rgba'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeStarSprite(): THREE.CanvasTexture {
  const s = 32;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(c);
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.12)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface StarLayerSpec {
  count: number;
  radiusMin: number;
  radiusMax: number;
  sizeMin: number;
  sizeMax: number;
  baseOpacity: number;
  milkyWay?: boolean;
}

function makeStarfield(): THREE.Group {
  const group = new THREE.Group();
  const sprite = makeStarSprite();
  const galTilt = 0.35;
  const galRot = 0.6;
  const mats: THREE.ShaderMaterial[] = [];

  function buildLayer(spec: StarLayerSpec): { points: THREE.Points; mat: THREE.ShaderMaterial } {
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(spec.count * 3);
    const col = new Float32Array(spec.count * 3);
    const siz = new Float32Array(spec.count);
    const pha = new Float32Array(spec.count);
    for (let i = 0; i < spec.count; i++) {
      let x = 0,
        y = 0,
        z = 0;
      if (spec.milkyWay) {
        const bias = Math.pow(Math.random(), 2.2);
        const u = (Math.random() * 2 - 1) * (0.35 - bias * 0.3);
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(1 - u * u);
        const R = spec.radiusMin + Math.random() * (spec.radiusMax - spec.radiusMin);
        const x0 = Math.cos(theta) * r * R;
        const y0 = u * R;
        const z0 = Math.sin(theta) * r * R;
        const cosT = Math.cos(galTilt),
          sinT = Math.sin(galTilt);
        const y1 = y0 * cosT - z0 * sinT;
        const z2 = y0 * sinT + z0 * cosT;
        const cosR = Math.cos(galRot),
          sinR = Math.sin(galRot);
        x = x0 * cosR - y1 * sinR;
        y = x0 * sinR + y1 * cosR;
        z = z2;
      } else {
        const u = Math.random() * 2 - 1;
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(1 - u * u);
        const R = spec.radiusMin + Math.random() * (spec.radiusMax - spec.radiusMin);
        x = Math.cos(theta) * r * R;
        y = u * R;
        z = Math.sin(theta) * r * R;
      }
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      const mag = Math.pow(Math.random(), 3.5);
      siz[i] = spec.sizeMin + mag * (spec.sizeMax - spec.sizeMin);
      const tint = Math.random();
      let r2: number, g2: number, b2: number;
      if (spec.milkyWay) {
        r2 = 0.55 + Math.random() * 0.25;
        g2 = 0.35 + Math.random() * 0.25;
        b2 = 0.75 + Math.random() * 0.25;
      } else if (tint < 0.04) {
        r2 = 1.0;
        g2 = 0.55;
        b2 = 0.45;
      } else if (tint < 0.08) {
        r2 = 0.55;
        g2 = 0.7;
        b2 = 1.0;
      } else if (tint < 0.11) {
        r2 = 1.0;
        g2 = 0.85;
        b2 = 0.55;
      } else if (tint < 0.13) {
        r2 = 0.6;
        g2 = 1.0;
        b2 = 0.7;
      } else {
        const w = 0.78 + Math.random() * 0.22;
        r2 = w;
        g2 = w;
        b2 = w;
      }
      col[i * 3] = r2;
      col[i * 3 + 1] = g2;
      col[i * 3 + 2] = b2;
      pha[i] = Math.random() * Math.PI * 2;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    geom.setAttribute('aPhase', new THREE.BufferAttribute(pha, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMap: { value: sprite },
        uOpacity: { value: spec.baseOpacity },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uTime;
        void main() {
          vColor = color;
          vTwinkle = 0.75 + 0.25 * sin(uTime * 1.2 + aPhase * 3.1);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * (350.0 / max(-mv.z, 1.0));
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(vColor * vTwinkle, tex.a * uOpacity * vTwinkle);
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geom, mat);
    return { points, mat };
  }

  const L1 = buildLayer({ count: 3200, radiusMin: 1100, radiusMax: 1300, sizeMin: 1.0, sizeMax: 3.2, baseOpacity: 0.75 });
  const L2 = buildLayer({ count: 2000, radiusMin: 750, radiusMax: 950, sizeMin: 1.4, sizeMax: 6.5, baseOpacity: 1.0 });
  const L3 = buildLayer({ count: 380, radiusMin: 500, radiusMax: 700, sizeMin: 3.0, sizeMax: 10.0, baseOpacity: 1.0 });
  const MW = buildLayer({ count: 2400, radiusMin: 900, radiusMax: 1100, sizeMin: 0.9, sizeMax: 4.0, baseOpacity: 0.95, milkyWay: true });

  group.add(L1.points, L2.points, L3.points, MW.points);
  mats.push(L1.mat, L2.mat, L3.mat, MW.mat);
  group.userData.tick = (t: number) => {
    for (const m of mats) m.uniforms.uTime.value = t;
  };
  // Expose the shared star-sprite texture so the Scene cleanup can dispose it
  // explicitly — material.dispose() does not free its bound textures.
  group.userData.sprite = sprite;
  return group;
}

// Tween helper
interface TweenState {
  radius: number;
  yaw: number;
  pitch: number;
  tx: number;
  ty: number;
  tz: number;
  fov: number;
}
interface Tween {
  value: TweenState;
  target: TweenState;
  rate: number;
  step(): void;
  setTarget(t: Partial<TweenState>): void;
  snap(t: Partial<TweenState>): void;
}
function makeTween(initial: TweenState, lerpRate = 0.08): Tween {
  return {
    value: { ...initial },
    target: { ...initial },
    rate: lerpRate,
    step() {
      for (const k in this.target) {
        const key = k as keyof TweenState;
        this.value[key] += (this.target[key] - this.value[key]) * this.rate;
      }
    },
    setTarget(t) {
      Object.assign(this.target, t);
    },
    snap(t) {
      Object.assign(this.value, t);
      Object.assign(this.target, t);
    },
  };
}

interface PlanetMesh {
  group: THREE.Group;
  mesh: THREE.Mesh;
  ring: THREE.Mesh;
  data: SceneGame;
  orbitR: number;
  pr: number;
  phase: number;
  moonGroup: THREE.Group;
  moons: Array<{
    mesh: THREE.Mesh;
    serverId: string;
    angle: number;
    orbitR: number;
  }>;
}

interface SimState {
  time: number;
  selectedId: string | null;
  focusedMoonId: string | null;
  hoveredId: string | null;
  cameraTween: Tween;
  userPan: { x: number; z: number };
  dragging: boolean;
  didDrag: boolean;
}

// ── Scene component ─────────────────────────────────────────────────
export function Scene({ games }: SceneProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const labelsRef = React.useRef<HTMLDivElement>(null);
  // Keep latest games in a ref so the once-only build effect can read fresh
  // server statuses when updating labels without reconstructing the scene.
  const gamesRef = React.useRef<SceneGame[]>(games);
  React.useEffect(() => {
    gamesRef.current = games;
  }, [games]);

  const visible = useSceneVisibility(wrapperRef);
  const visibleRef = React.useRef<boolean>(visible);
  React.useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  // Tracks whether the scene has been built — guarantees the build effect
  // runs exactly once across the lifetime of the component, even though it
  // re-evaluates whenever `games.length` transitions (notably empty -> N).
  const builtRef = React.useRef(false);

  // Build the scene the first time `games` becomes non-empty. SWR loads games
  // after mount, so we re-run the effect when `games.length` changes; the
  // `builtRef` gate ensures we never rebuild meshes on subsequent changes
  // (label/moon updates flow through the prop-watch effect below).
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (builtRef.current) return;
    if (gamesRef.current.length === 0) return;
    const container = wrapperRef.current;
    const canvas = canvasRef.current;
    const labelsHost = labelsRef.current;
    if (!container || !canvas) return;
    builtRef.current = true;

    const reducedMotion = Boolean(
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    );
    const testMode = Boolean(
      (window as typeof window & { __TEST_MODE__?: unknown }).__TEST_MODE__,
    );
    const freeze = reducedMotion || testMode;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      // Throws into the React error boundary in SystemSection -> ListMode
      throw new Error('WebGL context creation failed');
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const initialW = container.clientWidth || 1;
    const initialH = container.clientHeight || 1;
    renderer.setSize(initialW, initialH, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, initialW / initialH, 0.1, 3000);
    camera.position.set(0, 180, 520);
    camera.lookAt(0, 0, 0);

    // Lighting
    const sunLight = new THREE.PointLight(0xfff3d0, 4.2, 0, 0);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    const key = new THREE.DirectionalLight(0xfff3d0, 0.9);
    key.position.set(200, 280, 200);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x7c3aed, 0.55);
    fill.position.set(-220, 60, -180);
    scene.add(fill);
    const amb = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(amb);

    // Track every CanvasTexture/Texture created during build so we can
    // dispose them in cleanup. material.dispose() does NOT free its bound
    // textures, so without this, GPU memory leaks on every Scene unmount.
    const createdTextures: THREE.Texture[] = [];

    // Starfield
    const stars = makeStarfield();
    scene.add(stars);
    if (stars.userData.sprite instanceof THREE.Texture) {
      createdTextures.push(stars.userData.sprite);
    }

    // Sun
    const sunGroup = new THREE.Group();
    const sunGeom = new THREE.SphereGeometry(14, 48, 48);
    const sunTex = makeSunTexture();
    createdTextures.push(sunTex);
    const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
    const sun = new THREE.Mesh(sunGeom, sunMat);
    sunGroup.add(sun);
    const glow1Tex = makeGlowTexture('rgb(255,220,140)');
    createdTextures.push(glow1Tex);
    const glowMat1 = new THREE.SpriteMaterial({
      map: glow1Tex,
      color: 0xffd46b,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sunGlow1 = new THREE.Sprite(glowMat1);
    sunGlow1.scale.set(80, 80, 1);
    sunGroup.add(sunGlow1);
    const glow2Tex = makeGlowTexture('rgb(124,58,237)');
    createdTextures.push(glow2Tex);
    const glowMat2 = new THREE.SpriteMaterial({
      map: glow2Tex,
      color: 0x7c3aed,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sunGlow2 = new THREE.Sprite(glowMat2);
    sunGlow2.scale.set(140, 140, 1);
    sunGroup.add(sunGlow2);
    scene.add(sunGroup);

    // Planets — built once from the snapshot in gamesRef.current.
    // The brief: project size 0.8–1.0 -> design-range scale ×12 so 1.0 -> 12.
    // orbitRadius project 8–17 -> ×22 so 8 -> 176, 17 -> 374 (matches design 140–360).
    const planetMeshes: PlanetMesh[] = [];
    const initialGames = gamesRef.current;
    initialGames.forEach((g, i) => {
      const hue = hexToHue(g.planet.color);
      const pr = g.planet.size * 12;
      const orbitR = g.planet.orbitRadius * 22;

      const group = new THREE.Group();
      const pGeom = new THREE.SphereGeometry(pr, 64, 64);
      const baseTex = makePlanetTexture(hue);
      const emissiveTex = makePlanetTexture(hue);
      createdTextures.push(baseTex, emissiveTex);
      const pMat = new THREE.MeshStandardMaterial({
        map: baseTex,
        emissiveMap: emissiveTex,
        emissive: new THREE.Color(`hsl(${hue}, 60%, 45%)`),
        emissiveIntensity: 0.55,
        roughness: 0.85,
        metalness: 0.05,
      });
      const mesh = new THREE.Mesh(pGeom, pMat);
      const seed = (i + 1) * 7919;
      mesh.rotation.z = (((seed % 1000) / 1000) - 0.5) * 0.4;
      mesh.rotation.y = ((seed * 13) % 1000) / 1000 * Math.PI * 2;
      group.add(mesh);

      // Orbit ring
      const ringGeom = new THREE.RingGeometry(orbitR - 0.3, orbitR + 0.3, 128);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x7c3aed,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = -Math.PI / 2;
      scene.add(ring);

      // Moons (one per server)
      const moonGroup = new THREE.Group();
      const moons: PlanetMesh['moons'] = [];
      g.servers.forEach((srv, mi) => {
        const mGeom = new THREE.SphereGeometry(Math.max(1.8, pr * 0.18), 24, 24);
        const tone = statusOf(srv);
        const moonHue =
          tone === 'on' ? 145 : tone === 'warn' ? 40 : 0;
        const mMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(`hsl(${moonHue + (mi - 1) * 10}, 50%, 55%)`),
          emissive: new THREE.Color(`hsl(${moonHue}, 60%, 30%)`),
          emissiveIntensity: 0.6,
          roughness: 0.85,
          metalness: 0.1,
        });
        const mMesh = new THREE.Mesh(mGeom, mMat);
        const angle = (mi / Math.max(1, g.servers.length)) * Math.PI * 2;
        const mr = pr * 2.4 + mi * (pr * 0.9);
        mMesh.userData = { serverId: srv.id };
        moonGroup.add(mMesh);
        moons.push({ mesh: mMesh, serverId: srv.id, angle, orbitR: mr });
      });
      moonGroup.visible = false;
      group.add(moonGroup);

      // Determine deterministic phase: testMode or reduced-motion -> deterministic.
      const phase = freeze ? (i * Math.PI) / 4 : (i * Math.PI) / 4 + (i % 3) * 0.3;
      scene.add(group);
      planetMeshes.push({ group, mesh, ring, data: g, orbitR, pr, phase, moonGroup, moons });
    });

    // Ecliptic grid
    const grid = new THREE.GridHelper(900, 18, 0x39ff88, 0x7c3aed);
    const gridMat = grid.material as THREE.Material | THREE.Material[];
    if (Array.isArray(gridMat)) gridMat.forEach((m) => ((m.transparent = true), (m.opacity = 0.08)));
    else {
      gridMat.transparent = true;
      gridMat.opacity = 0.08;
    }
    scene.add(grid);

    // Camera tween + sim state
    const cam = makeTween(
      { radius: 620, yaw: 0, pitch: 0.45, tx: 0, ty: 0, tz: 0, fov: 48 },
      freeze ? 1 : 0.08,
    );
    const sim: SimState = {
      time: 0,
      selectedId: null,
      focusedMoonId: null,
      hoveredId: null,
      cameraTween: cam,
      userPan: { x: 0, z: 0 },
      dragging: false,
      didDrag: false,
    };
    let prevSelectedId: string | null = null;

    // Build planet labels
    interface LabelEntry {
      el: HTMLDivElement;
      planet: PlanetMesh;
    }
    const labels: LabelEntry[] = [];
    if (labelsHost) {
      labelsHost.innerHTML = '';
      planetMeshes.forEach((pm) => {
        const el = document.createElement('div');
        el.className = 's3-label';
        el.dataset.planetId = pm.data.id;
        el.style.cssText = `
          position: absolute; left: 0; top: 0;
          pointer-events: auto; cursor: pointer;
          transform: translate(-9999px, -9999px);
          will-change: transform, opacity;
          font-family: var(--mono); z-index: 2;
        `;
        el.addEventListener('pointerenter', () => {
          sim.hoveredId = pm.data.id;
          el.classList.add('is-hover');
        });
        el.addEventListener('pointerleave', () => {
          if (sim.hoveredId === pm.data.id) sim.hoveredId = null;
          el.classList.remove('is-hover');
        });
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          useCameraState.getState().selectPlanet(pm.data.id);
        });
        labelsHost.appendChild(el);
        labels.push({ el, planet: pm });
      });
    }

    // updateLabelContent re-renders innerHTML from the latest API snapshot.
    // Called on mount and on every games-prop change.
    function gameNameFor(id: string): string {
      // Walk the current snapshot for fresh names — display-side caller
      // (HudOverlay) holds the OverlayGame[] which has names; the Scene-side
      // SceneGame doesn't, so we synthesize from id (uppercase).
      return id.toUpperCase();
    }
    const updateLabelContent = () => {
      const fresh = gamesRef.current;
      // Look up by id rather than index — API may reorder, insert, or remove
      // games between SWR polls; positional indexing would drift labels onto
      // the wrong planet.
      const byId = new Map<string, SceneGame>();
      for (const g of fresh) byId.set(g.id, g);
      labels.forEach((lb) => {
        const g = byId.get(lb.planet.data.id);
        if (!g) return;
        const totalCrew = g.servers.reduce((s, m) => s + (m.players ?? 0), 0);
        const totalMax = g.servers.reduce((s, m) => s + (m.maxPlayers ?? 0), 0);
        const anyOn = g.servers.some((s) => s.online);
        const anyWarn = g.servers.some((s) => statusOf(s) === 'warn');
        const dotClass = anyOn ? (anyWarn ? 'warn' : 'on') : 'off';
        const hue = hexToHue(g.planet.color);
        const short = g.id.slice(0, 3).toUpperCase();
        const shardWord = g.servers.length === 1 ? 'SHARD' : 'SHARDS';
        lb.el.innerHTML = `
          <span class="s3-label__stem"></span>
          <span class="s3-label__box">
            <span class="s3-label__code" style="color: hsl(${hue}, 85%, 70%)">${short}</span>
            <span class="s3-label__name">${gameNameFor(g.id)}</span>
            <span class="s3-label__meta">
              <i class="status-dot ${dotClass}"></i>
              <span class="s3-label__crew">${totalCrew}/${totalMax}</span>
              <span class="s3-label__sep">·</span>
              <span class="s3-label__moons">${g.servers.length} ${shardWord}</span>
            </span>
          </span>
        `;
      });
    };
    updateLabelContent();

    // updateMoonMaterials re-reads gamesRef.current and updates each moon's
    // color/emissive based on the current per-server status. Keeps the 3D
    // moon coloring in sync with SWR-polled status/ping changes without
    // rebuilding any geometry/material.
    const updateMoonMaterials = () => {
      const fresh = gamesRef.current;
      const byId = new Map<string, SceneGame>();
      for (const g of fresh) byId.set(g.id, g);
      planetMeshes.forEach((pm) => {
        const g = byId.get(pm.data.id);
        if (!g) return;
        pm.moons.forEach((mm, mi) => {
          const srv = g.servers.find((s) => s.id === mm.serverId);
          if (!srv) return;
          const tone = statusOf(srv);
          const moonHue = tone === 'on' ? 145 : tone === 'warn' ? 40 : 0;
          const mat = mm.mesh.material as THREE.MeshStandardMaterial;
          mat.color.set(`hsl(${moonHue + (mi - 1) * 10}, 50%, 55%)`);
          mat.emissive.set(`hsl(${moonHue}, 60%, 30%)`);
        });
      });
    };

    // expose so the prop-watch effect can call them
    (
      container as HTMLDivElement & {
        __updateLabels?: () => void;
        __updateMoons?: () => void;
      }
    ).__updateLabels = updateLabelContent;
    (
      container as HTMLDivElement & {
        __updateLabels?: () => void;
        __updateMoons?: () => void;
      }
    ).__updateMoons = updateMoonMaterials;

    // Resize
    const onResize = () => {
      const w = container.clientWidth || 1,
        h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onResize);
      ro.observe(container);
    }
    window.addEventListener('resize', onResize);

    // Subscribe to Zustand state for selection.
    const applySelection = (state: ReturnType<typeof useCameraState.getState>) => {
      sim.selectedId = state.focusedGameId;
      sim.focusedMoonId = state.focusedServerId;
      // Recompute camera target.
      if (sim.focusedMoonId && sim.selectedId) {
        const pm = planetMeshes.find((p) => p.data.id === sim.selectedId);
        const mm = pm?.moons.find((m) => m.serverId === sim.focusedMoonId);
        if (pm && mm) {
          const target = new THREE.Vector3();
          mm.mesh.getWorldPosition(target);
          cam.setTarget({
            radius: 22,
            yaw: cam.target.yaw + 0.3,
            pitch: 0.25,
            tx: target.x,
            ty: target.y,
            tz: target.z,
            fov: 38,
          });
        }
      } else if (sim.selectedId) {
        const pm = planetMeshes.find((p) => p.data.id === sim.selectedId);
        if (pm) {
          const target = new THREE.Vector3();
          pm.group.getWorldPosition(target);
          cam.setTarget({
            radius: pm.pr * 7,
            yaw: Math.atan2(target.z, target.x) + 0.3,
            pitch: 0.35,
            tx: target.x,
            ty: target.y + pm.pr * 0.2,
            tz: target.z,
            fov: 40,
          });
        }
      } else {
        // Preserve yaw/pitch/pan on zoom-only changes; only reset when selection just cleared.
        if (prevSelectedId !== null) {
          cam.setTarget({
            radius: 620 * state.userZoom,
            yaw: 0,
            pitch: 0.45,
            tx: sim.userPan.x,
            ty: 0,
            tz: sim.userPan.z,
            fov: 48,
          });
        } else {
          cam.setTarget({ ...cam.target, radius: 620 * state.userZoom, fov: 48 });
        }
      }
      prevSelectedId = sim.selectedId;
      // Show/hide moon groups
      planetMeshes.forEach((pm) => {
        pm.moonGroup.visible = sim.selectedId === pm.data.id;
      });
    };
    applySelection(useCameraState.getState());
    if (freeze) cam.snap(cam.target);
    const unsubscribe = useCameraState.subscribe((state) => applySelection(state));

    // Pointer / wheel / drag handlers
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    type PickResult =
      | { type: 'planet'; pm: PlanetMesh }
      | { type: 'planet-same'; pm: PlanetMesh }
      | { type: 'moon'; pm: PlanetMesh; serverId: string }
      | { type: 'empty' };

    const pick = (ev: MouseEvent): PickResult => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      if (sim.selectedId) {
        const pm = planetMeshes.find((p) => p.data.id === sim.selectedId);
        if (pm && pm.moonGroup.visible) {
          const mhits = raycaster.intersectObjects(pm.moons.map((m) => m.mesh));
          if (mhits.length) {
            const sid = (mhits[0].object.userData as { serverId?: string }).serverId;
            if (sid) return { type: 'moon', pm, serverId: sid };
          }
          const phits = raycaster.intersectObject(pm.mesh);
          if (phits.length) return { type: 'planet-same', pm };
        }
        return { type: 'empty' };
      }
      const meshes = planetMeshes.map((p) => p.mesh);
      const phits = raycaster.intersectObjects(meshes);
      if (phits.length) {
        const pm = planetMeshes.find((p) => p.mesh === phits[0].object);
        if (pm) return { type: 'planet', pm };
      }
      return { type: 'empty' };
    };

    const onClick = (ev: MouseEvent) => {
      if (sim.didDrag) {
        sim.didDrag = false;
        return;
      }
      const hit = pick(ev);
      const store = useCameraState.getState();
      if (hit.type === 'planet') {
        store.selectPlanet(hit.pm.data.id);
      } else if (hit.type === 'moon') {
        store.selectServer(hit.pm.data.id, hit.serverId);
      } else if (hit.type === 'planet-same' || hit.type === 'empty') {
        if (sim.focusedMoonId) {
          store.deselect();
        } else if (sim.selectedId) {
          store.deselect();
        }
      }
    };

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const delta = ev.deltaY;
      const factor = Math.exp(delta * 0.001);
      const newR = Math.max(18, Math.min(1400, cam.target.radius * factor));
      cam.setTarget({ ...cam.target, radius: newR });
      if (!sim.selectedId) useCameraState.getState().setUserZoom(newR / 620);
    };

    let downX = 0,
      downY = 0,
      startYaw = 0,
      startPitch = 0,
      startPan = { x: 0, z: 0 };
    const onDown = (ev: PointerEvent) => {
      sim.dragging = true;
      sim.didDrag = false;
      downX = ev.clientX;
      downY = ev.clientY;
      startYaw = cam.target.yaw;
      startPitch = cam.target.pitch;
      startPan = { ...sim.userPan };
    };
    const onMove = (ev: PointerEvent) => {
      if (!sim.dragging) return;
      const dx = ev.clientX - downX;
      const dy = ev.clientY - downY;
      if (Math.abs(dx) + Math.abs(dy) > 3) sim.didDrag = true;
      // PointerEvent.button is only meaningful on down/up; during move it's
      // typically 0. Use the buttons bitmask (4 = middle) instead.
      if (ev.shiftKey || (ev.buttons & 4) === 4) {
        if (!sim.selectedId) {
          sim.userPan.x = startPan.x - dx * 0.8;
          sim.userPan.z = startPan.z - dy * 0.8;
          cam.setTarget({ ...cam.target, tx: sim.userPan.x, tz: sim.userPan.z });
        }
      } else {
        const newYaw = startYaw - dx * 0.005;
        const newPitch = Math.max(-0.3, Math.min(1.2, startPitch - dy * 0.004));
        cam.setTarget({ ...cam.target, yaw: newYaw, pitch: newPitch });
      }
    };
    const onUp = () => {
      sim.dragging = false;
    };

    container.addEventListener('click', onClick);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    // Animation loop
    let last = performance.now();
    let raf = 0;
    let ambientYaw = 0;
    let dispatchedReady = false;
    const tmpVec = new THREE.Vector3();
    const sunPos = new THREE.Vector3(0, 0, 0);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      // Skip rendering when offscreen / tab hidden — saves CPU.
      if (!visibleRef.current) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Freeze time at 0 in test mode for deterministic positions.
      if (!freeze) {
        if (!sim.selectedId) sim.time += dt;
      }

      const innermostR = planetMeshes[0]?.orbitR || 140;
      const baseT = 36;
      planetMeshes.forEach((pm) => {
        const period = baseT * Math.pow(pm.orbitR / innermostR, 1.5);
        const angle = (sim.time / period + pm.phase) * Math.PI * 2;
        const x = Math.cos(angle) * pm.orbitR;
        const z = Math.sin(angle) * pm.orbitR;
        pm.group.position.set(x, 0, z);
        if (!freeze) pm.mesh.rotation.y += dt * 0.12;
        pm.moons.forEach((mm, mi) => {
          if (!freeze && !sim.focusedMoonId) mm.angle += dt * 0.8 * (1 + mi * 0.12);
          const mx = Math.cos(mm.angle) * mm.orbitR;
          const mz = Math.sin(mm.angle) * mm.orbitR;
          const my = Math.sin(mm.angle * 0.6) * 2.5;
          mm.mesh.position.set(mx, my, mz);
          if (!freeze) mm.mesh.rotation.y += dt * 0.3;
        });
      });

      // Lock camera target to the focused moon's current world position so
      // any residual motion (or one-tick lag between selection and orbit pause)
      // can't drift the moon out of frame.
      if (sim.focusedMoonId && sim.selectedId) {
        const pm = planetMeshes.find((p) => p.data.id === sim.selectedId);
        const mm = pm?.moons.find((m) => m.serverId === sim.focusedMoonId);
        if (mm) {
          mm.mesh.getWorldPosition(tmpVec);
          cam.target.tx = tmpVec.x;
          cam.target.ty = tmpVec.y;
          cam.target.tz = tmpVec.z;
        }
      }

      // Sun pulse
      if (!freeze) {
        const pulse = 0.9 + Math.sin(now * 0.0012) * 0.08;
        glowMat1.opacity = 0.75 * pulse;
        glowMat2.opacity = 0.35 * pulse;
      }

      // Starfield twinkle
      const tickFn = stars.userData.tick as ((t: number) => void) | undefined;
      if (tickFn && !freeze) tickFn(now * 0.001);

      // Camera tween
      cam.step();
      if (!sim.selectedId && !sim.dragging && !freeze) {
        ambientYaw += dt * 0.015;
      }
      const yaw = cam.value.yaw + (sim.selectedId || freeze ? 0 : Math.sin(ambientYaw) * 0.06);
      const px = cam.value.tx + Math.cos(yaw) * Math.cos(cam.value.pitch) * cam.value.radius;
      const pz = cam.value.tz + Math.sin(yaw) * Math.cos(cam.value.pitch) * cam.value.radius;
      const py = cam.value.ty + Math.sin(cam.value.pitch) * cam.value.radius;
      camera.position.set(px, py, pz);
      camera.lookAt(cam.value.tx, cam.value.ty, cam.value.tz);
      if (Math.abs(camera.fov - cam.value.fov) > 0.01) {
        camera.fov += (cam.value.fov - camera.fov) * 0.12;
        camera.updateProjectionMatrix();
      }

      renderer.render(scene, camera);

      // Position labels (world -> screen)
      if (labels.length) {
        const rect = renderer.domElement.getBoundingClientRect();
        const hw = rect.width / 2;
        const hh = rect.height / 2;
        const camToSun = sunPos.clone().sub(camera.position).length();
        for (const lb of labels) {
          lb.planet.group.getWorldPosition(tmpVec);
          const dCam = tmpVec.clone().sub(camera.position).length();
          const v = tmpVec.clone().project(camera);
          const behind = v.z < -1 || v.z > 1;
          const x = v.x * hw + hw;
          const y = -v.y * hh + hh;
          const sunV = sunPos.clone().project(camera);
          const sunX = sunV.x * hw + hw;
          const sunY = -sunV.y * hh + hh;
          const dSunScreen = Math.hypot(x - sunX, y - sunY);
          const occluded = dCam > camToSun && dSunScreen < 60;
          const isSelected = sim.selectedId === lb.planet.data.id;
          const anySelected = !!sim.selectedId;
          const visibleNow = !behind && !occluded && !anySelected;
          lb.el.style.opacity = visibleNow ? '1' : '0';
          lb.el.style.pointerEvents = visibleNow ? 'auto' : 'none';
          lb.el.style.transform = `translate3d(${Math.round(x + 14)}px, ${Math.round(y - 26)}px, 0)`;
          lb.el.classList.toggle('is-selected', isSelected);
        }
      }

      if (!dispatchedReady) {
        dispatchedReady = true;
        try {
          window.dispatchEvent(new Event('scene-ready'));
        } catch {
          // noop
        }
      }
    };
    raf = requestAnimationFrame(tick);

    // Cleanup
    return () => {
      cancelAnimationFrame(raf);
      unsubscribe();
      ro?.disconnect();
      window.removeEventListener('resize', onResize);
      container.removeEventListener('click', onClick);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      // Dispose three resources
      scene.traverse((o) => {
        const obj = o as THREE.Object3D & {
          geometry?: THREE.BufferGeometry;
          material?: THREE.Material | THREE.Material[];
        };
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      // Dispose every CanvasTexture/Texture allocated during build —
      // material.dispose() does not free its bound textures.
      for (const tex of createdTextures) tex.dispose();
      renderer.dispose();
      if (labelsHost) labelsHost.innerHTML = '';
    };
    // Re-evaluates when `games.length` toggles (empty -> N) so SWR-loaded data
    // can build the scene after mount. `builtRef` guarantees we only construct
    // once. Subsequent games changes go through the prop-watch effect below —
    // never rebuild the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games.length]);

  // Prop-watch effect: whenever games change, refresh label content and moon
  // material colors. Both flow from gamesRef.current so SWR-polled status
  // changes reach the DOM and the 3D moons without rebuilding the scene.
  React.useEffect(() => {
    const container = wrapperRef.current as
      | (HTMLDivElement & {
          __updateLabels?: () => void;
          __updateMoons?: () => void;
        })
      | null;
    container?.__updateLabels?.();
    container?.__updateMoons?.();
  }, [games]);

  return (
    <div ref={wrapperRef} style={{ position: 'absolute', inset: 0 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div
        ref={labelsRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}
      />
    </div>
  );
}

export default Scene;
