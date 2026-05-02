import * as React from 'react';

export type HudCornerPosition = 'tl' | 'tr' | 'bl' | 'br';

export interface HudCornerProps {
  corner: HudCornerPosition;
  className?: string;
}

interface CornerPos {
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
  rotate: number;
}

const POS: Record<HudCornerPosition, CornerPos> = {
  tl: { top: 18, left: 18, rotate: 0 },
  tr: { top: 18, right: 18, rotate: 90 },
  bl: { bottom: 18, left: 18, rotate: 270 },
  br: { bottom: 18, right: 18, rotate: 180 },
};

/**
 * Decorative L-shape corner marker with a dot, drop-shadow-glowed in
 * royal-green-neon. Absolutely positioned relative to its container.
 */
export function HudCorner({ corner, className }: HudCornerProps) {
  const pos = POS[corner];
  const { rotate, ...offsets } = pos;
  return (
    <svg
      aria-hidden
      className={className}
      width="36"
      height="36"
      viewBox="0 0 36 36"
      style={{
        position: 'absolute',
        ...offsets,
        transform: `rotate(${rotate}deg)`,
        color: 'var(--royal-green-neon)',
        filter: 'drop-shadow(0 0 4px currentColor)',
      }}
    >
      <path d="M0,14 L0,0 L14,0" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="0" cy="0" r="2" fill="currentColor" />
    </svg>
  );
}

export default HudCorner;
