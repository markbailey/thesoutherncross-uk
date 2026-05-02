import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './config/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'royal-purple': '#4b0082',
        'royal-purple-neon': '#7c3aed',
        'royal-green': '#00a86b',
        'royal-green-neon': '#39ff88',
        space: {
          DEFAULT: '#07060c',
          deep: '#04030a',
          soft: '#0d0b18',
        },
        status: {
          online: '#39ff88',
          warn: '#f0b429',
          down: '#b3264a',
        },
        ink: {
          DEFAULT: '#e7e9ee',
          dim: '#8a8ea3',
          faint: '#4a4e62',
        },
      },
      fontFamily: {
        mono: [
          'JetBrains Mono',
          'IBM Plex Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
        display: ['Orbitron', 'Rajdhani', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        hud: '0.14em',
        eyebrow: '0.18em',
        display: '0.08em',
        wide: '0.4em',
      },
      boxShadow: {
        bloom: '0 0 12px rgba(57, 255, 136, 0.6), 0 0 28px rgba(57, 255, 136, 0.25)',
        'bloom-purple': '0 0 12px rgba(124, 58, 237, 0.7), 0 0 28px rgba(124, 58, 237, 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
