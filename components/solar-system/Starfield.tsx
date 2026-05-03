'use client';

import * as React from 'react';

export interface StarfieldProps {
  /** Multiplier on the default star count (~260). Default 1.0. */
  density?: number;
  /** Vertical drift speed in px/frame at 60fps. Default 0.06. */
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface Star {
  x: number;
  y: number;
  z: number; // 0..1 — depth; affects size + brightness
  bright: boolean; // small number get soft glow
}

/** Mulberry32 — tiny, seedable PRNG for deterministic test snapshots. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

declare global {
  interface Window {
    __TEST_MODE__?: unknown;
  }
}

export function Starfield({ density = 1.0, speed = 0.06, className, style }: StarfieldProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const testMode = typeof window !== 'undefined' && Boolean(window.__TEST_MODE__);
    const rand = testMode ? mulberry32(0xc0ffee) : Math.random;

    const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let reduced = Boolean(reducedMotionQuery?.matches);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const count = Math.max(1, Math.round(260 * density));
    let stars: Star[] = [];
    let w = 0;
    let h = 0;

    const seedStars = () => {
      stars = [];
      for (let i = 0; i < count; i++) {
        const z = rand();
        stars.push({
          x: rand() * w,
          y: rand() * h,
          z,
          bright: rand() < 0.06,
        });
      }
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedStars();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // Dim points
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if (s.bright) continue;
        const size = 0.4 + s.z * 0.9;
        const alpha = 0.35 + s.z * 0.5;
        ctx.fillStyle = `rgba(231, 233, 238, ${alpha.toFixed(3)})`;
        ctx.fillRect(s.x, s.y, size, size);
      }
      // Bright stars with soft glow
      ctx.save();
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if (!s.bright) continue;
        const size = 0.9 + s.z * 1.4;
        ctx.shadowBlur = 6 + s.z * 6;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.85)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const step = () => {
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.y += speed * (0.4 + s.z);
        if (s.y > h + 1) {
          s.y = -1;
          s.x = rand() * w;
        }
      }
      draw();
    };

    let rafId = 0;
    const loop = () => {
      step();
      rafId = requestAnimationFrame(loop);
    };

    resize();
    draw();
    if (!reduced) {
      rafId = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(container);

    const onMotionChange = (ev: MediaQueryListEvent) => {
      reduced = ev.matches;
      if (reduced) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        draw();
      } else if (!rafId) {
        rafId = requestAnimationFrame(loop);
      }
    };
    reducedMotionQuery?.addEventListener?.('change', onMotionChange);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
      reducedMotionQuery?.removeEventListener?.('change', onMotionChange);
    };
  }, [density, speed]);

  const classes = ['starfield', className].filter(Boolean).join(' ');
  return (
    <div
      ref={containerRef}
      className={classes}
      style={{ position: 'absolute', inset: 0, ...style }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}

export default Starfield;
