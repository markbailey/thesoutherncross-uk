import { ImageResponse } from 'next/og';
import { SITE } from '../config/site';
import { GUILD } from '../config/guild';

export const runtime = 'nodejs';
export const alt = SITE.name;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(75,0,130,0.45), transparent 70%), radial-gradient(ellipse 80% 60% at 20% 80%, rgba(0,168,107,0.12), transparent 70%), #07060c',
          color: '#e7e9ee',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          padding: 72,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 18,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: '#7c3aed',
            marginBottom: 20,
          }}
        >
          [ EST. {GUILD.established} · {GUILD.region.toUpperCase()} · OPS DIV. 07 ]
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 110,
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: '0.06em',
            textAlign: 'center',
          }}
        >
          THE SOUTHERN CROSS
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 44,
            letterSpacing: '0.5em',
            color: '#39ff88',
            marginTop: 20,
          }}
        >
          · UK ·
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 36,
            fontSize: 22,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: '#8a8ea3',
            gap: 12,
          }}
        >
          <span style={{ color: '#39ff88' }}>Servers.</span>
          <span>Signals.</span>
          <span style={{ color: '#7c3aed' }}>Squad.</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
