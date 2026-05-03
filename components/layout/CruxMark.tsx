import * as React from 'react';

export interface CruxMarkProps {
  /** Rendered square size in pixels. Default 200. */
  size?: number;
  /** Prefix for gradient ids (SSR-safe). Falls back to React.useId(). */
  idPrefix?: string;
  className?: string;
}

// ── Crux Constellation Mark ──────────────────────────────────────
// Five 5-point stars at tuned Crux positions, containment hex,
// inner purple hairline, and a tiny SCUK brand stamp at hero size.
// The mark is intentionally static.

// Classic 5-point star path. `r` is outer radius; inner radius is
// 0.382 * r (golden-ratio proportion that reads as a "real" star).
// `rot` lets individual stars tilt so the logo doesn't feel mechanical.
function star5(cx: number, cy: number, r: number, rot: number = -Math.PI / 2): string {
  const inner = r * 0.382;
  let d = '';
  for (let i = 0; i < 10; i++) {
    const ang = rot + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : inner;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    d += (i === 0 ? 'M ' : 'L ') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
  }
  return d + 'Z';
}

const STARS = [
  { id: 'gacrux', x: 0, y: -22, r: 14.0 }, // top      γ
  { id: 'becrux', x: -23, y: -1, r: 14.0 }, // left     β
  { id: 'decrux', x: 18, y: -7, r: 11.0 }, // right    δ
  { id: 'acrux', x: 2, y: 24, r: 16.5 }, // bottom   α (brightest)
  { id: 'eps', x: -7, y: 8, r: 7.5 }, // small    ε
];

// Hex containment (pointy-top), inscribed in the viewBox
const HEX_R = 47;
const HEX_PTS = [0, 1, 2, 3, 4, 5]
  .map((i) => {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    return `${(Math.cos(a) * HEX_R).toFixed(2)},${(Math.sin(a) * HEX_R).toFixed(2)}`;
  })
  .join(' ');

const HEX_INNER_R = HEX_R - 4;
const HEX_INNER = [0, 1, 2, 3, 4, 5]
  .map((i) => {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    return `${(Math.cos(a) * HEX_INNER_R).toFixed(2)},${(Math.sin(a) * HEX_INNER_R).toFixed(2)}`;
  })
  .join(' ');

export function CruxMark({ size = 200, idPrefix, className }: CruxMarkProps) {
  const autoId = React.useId();
  const prefix = idPrefix ?? `crux-${autoId.replace(/:/g, '')}`;
  const fillId = `${prefix}-fill`;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        margin: '0 auto',
        lineHeight: 0,
      }}
    >
      <svg
        viewBox="-50 -50 100 100"
        width={size}
        height={size}
        style={{ display: 'block', overflow: 'visible' }}
        shapeRendering="geometricPrecision"
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="-1" x2="0" y2="1">
            <stop offset="0%" stopColor="#0e0a1c" />
            <stop offset="55%" stopColor="#140b22" />
            <stop offset="100%" stopColor="#1a0f2e" />
          </linearGradient>
        </defs>

        {/* Hex containment — solid fill with crisp green rim */}
        <polygon
          points={HEX_PTS}
          fill={`url(#${fillId})`}
          stroke="var(--royal-green-neon)"
          strokeWidth="1.6"
          strokeLinejoin="miter"
        />

        {/* Inner purple hairline — only visible at larger scales due to thinness */}
        <polygon
          points={HEX_INNER}
          fill="none"
          stroke="var(--royal-purple-neon)"
          strokeWidth="0.5"
          strokeLinejoin="miter"
          opacity="0.7"
        />

        {/* Five Crux 5-point stars — solid green, each slightly rotated so
            they don't all point the same way (which would look mechanical) */}
        <g fill="var(--royal-green-neon)">
          {STARS.map((s, i) => (
            <path key={s.id} d={star5(s.x, s.y, s.r, -Math.PI / 2 + (i * 0.18 - 0.18))} />
          ))}
        </g>

        {/* Tiny brand stamp — only readable at hero size */}
        {size >= 80 && (
          <text
            x="0"
            y="44"
            textAnchor="middle"
            fill="var(--royal-purple-neon)"
            fontFamily="ui-monospace, Menlo, monospace"
            fontSize="3.8"
            letterSpacing="0.6"
          >
            SCUK
          </text>
        )}
      </svg>
    </div>
  );
}

export default CruxMark;
