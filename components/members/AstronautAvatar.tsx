import * as React from 'react';

export interface AstronautAvatarProps {
  /** Member hue (0-360). Drives suit + accent colours. */
  hue: number;
  /** Rendered size in pixels (square). Default 54. */
  size?: number;
  /** Stable seed for gradient ids (avoids SVG defs collisions). */
  seed?: string;
  className?: string;
}

/**
 * Procedural astronaut helmet avatar — suit colours keyed off hue so
 * every roster entry reads as visually distinct without real photos.
 */
export function AstronautAvatar({ hue, size = 54, seed, className }: AstronautAvatarProps) {
  const autoId = React.useId();
  const vid = seed ?? `av${hue}-${autoId.replace(/:/g, '')}`;

  // Suit palette driven by hue. Values specified by the design brief.
  const suit = `hsl(${hue} 70% 55%)`;
  const suitDark = `hsl(${hue} 60% 28%)`;
  const suitLight = `hsl(${hue} 60% 62%)`;
  const chestStripe = `hsl(${hue} 90% 70%)`;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id={`${vid}-bg`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#1a1430" />
          <stop offset="70%" stopColor="#0a0816" />
          <stop offset="100%" stopColor="#07060c" />
        </radialGradient>
        <linearGradient id={`${vid}-visor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d1b2a" />
          <stop offset="45%" stopColor="#1a3a4f" />
          <stop offset="100%" stopColor="#050810" />
        </linearGradient>
        <radialGradient id={`${vid}-visor-glow`} cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.6" />
          <stop offset="55%" stopColor="#39ff88" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#39ff88" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${vid}-suit`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={suitLight} />
          <stop offset="60%" stopColor={suit} />
          <stop offset="100%" stopColor={suitDark} />
        </linearGradient>
      </defs>

      {/* circular HUD bg */}
      <circle cx="32" cy="32" r="31" fill={`url(#${vid}-bg)`} />

      {/* Suit shoulders */}
      <path
        d="M8,62 C 10,48 22,44 32,44 C 42,44 54,48 56,62 Z"
        fill={`url(#${vid}-suit)`}
      />
      {/* Chest stripe */}
      <rect x="30" y="46" width="4" height="16" fill={chestStripe} opacity="0.7" />
      {/* Shoulder patch — tiny guild hex */}
      <g transform="translate(16,52)">
        <polygon
          points="0,-3 2.6,-1.5 2.6,1.5 0,3 -2.6,1.5 -2.6,-1.5"
          fill="none"
          stroke="#39ff88"
          strokeWidth="0.5"
          opacity="0.9"
        />
      </g>

      {/* Neck ring */}
      <rect
        x="24"
        y="40"
        width="16"
        height="5"
        rx="1.2"
        fill="#1a1725"
        stroke="rgba(124,58,237,0.6)"
        strokeWidth="0.5"
      />
      <line x1="26" y1="42.5" x2="38" y2="42.5" stroke="#39ff88" strokeWidth="0.4" opacity="0.8" />

      {/* Helmet shell */}
      <circle cx="32" cy="26" r="17" fill="#d9dce3" />
      <circle
        cx="32"
        cy="26"
        r="17"
        fill="none"
        stroke="rgba(124,58,237,0.55)"
        strokeWidth="0.7"
      />
      <circle
        cx="32"
        cy="26"
        r="15.5"
        fill="none"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.4"
      />

      {/* Visor — rounded-rect with reflection */}
      <path
        d="M 20,22 Q 20,16 26,15 L 38,15 Q 44,16 44,22 L 44,30 Q 44,34 40,34 L 24,34 Q 20,34 20,30 Z"
        fill={`url(#${vid}-visor)`}
      />
      <path
        d="M 20,22 Q 20,16 26,15 L 38,15 Q 44,16 44,22 L 44,30 Q 44,34 40,34 L 24,34 Q 20,34 20,30 Z"
        fill={`url(#${vid}-visor-glow)`}
      />
      {/* Visor frame */}
      <path
        d="M 20,22 Q 20,16 26,15 L 38,15 Q 44,16 44,22 L 44,30 Q 44,34 40,34 L 24,34 Q 20,34 20,30 Z"
        fill="none"
        stroke="#2a2438"
        strokeWidth="0.8"
      />
      {/* Reflection streak */}
      <path d="M 24,18 L 28,17 L 25,25 L 22,26 Z" fill="rgba(255,255,255,0.32)" />
      <path d="M 30,17 L 31,16.5 L 28,24 L 27,25 Z" fill="rgba(255,255,255,0.18)" />

      {/* Antenna with blinking tip. CSS animation (not SMIL) so the global
          prefers-reduced-motion override in globals.css suppresses it. */}
      <line x1="44" y1="14" x2="48" y2="8" stroke="#d9dce3" strokeWidth="1" />
      <circle
        cx="48"
        cy="8"
        r="1.4"
        fill="#39ff88"
        className="astronaut-antenna"
        style={{ filter: 'drop-shadow(0 0 3px #39ff88)' }}
      />

      {/* Helmet side vents */}
      <rect x="16.5" y="24" width="2.5" height="5" rx="0.8" fill="#8a8fa3" />
      <rect x="45" y="24" width="2.5" height="5" rx="0.8" fill="#8a8fa3" />
    </svg>
  );
}

export default AstronautAvatar;
