import * as React from 'react';
import {
  HudPanel,
  Panel,
  Scanlines,
  HudButton,
  Pill,
  Dot,
  Eyebrow,
  HudCorner,
  HairlineDivider,
} from '../../components/hud';
import { CruxMark } from '../../components/layout/CruxMark';
import { AstronautAvatar } from '../../components/members/AstronautAvatar';
import { Starfield } from '../../components/solar-system/Starfield';

export const metadata = {
  title: 'Kitchen Sink · HUD Primitives',
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 18,
  background: 'rgba(13,11,24,0.5)',
  border: '1px solid var(--ink-faint)',
  minWidth: 260,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={sectionStyle}>
      <Eyebrow tone="green">{label}</Eyebrow>
      <div style={rowStyle}>{children}</div>
    </section>
  );
}

export default function KitchenSinkPage() {
  return (
    <main className="bg-space" style={{ minHeight: '100vh', padding: 32 }}>
      <header style={{ marginBottom: 32 }}>
        <Eyebrow tone="dim">SCUK · QA</Eyebrow>
        <h1
          className="display"
          style={{ margin: '8px 0 0', fontSize: 28, color: 'var(--ink)' }}
        >
          Kitchen Sink · HUD Primitives
        </h1>
        <HairlineDivider style={{ marginTop: 16 }} />
      </header>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          alignItems: 'flex-start',
        }}
      >
        <Section label="Panel · plain">
          <HudPanel style={{ padding: 16, width: 220 }}>
            <div style={{ color: 'var(--ink)' }}>Plain hud-panel</div>
          </HudPanel>
        </Section>

        <Section label="Panel · scanlines">
          <HudPanel scanlines style={{ padding: 16, width: 220 }}>
            <div style={{ color: 'var(--ink)' }}>Panel with scanlines</div>
          </HudPanel>
        </Section>

        <Section label="Panel · raised">
          <Panel
            style={{
              padding: 16,
              width: 220,
              background: 'var(--panel-raise)',
            }}
          >
            <div style={{ color: 'var(--ink)' }}>Raised surface</div>
          </Panel>
        </Section>

        <Section label="Button · variants">
          <HudButton variant="green" size="md">
            Green · MD
          </HudButton>
          <HudButton variant="green" size="sm">
            Green · SM
          </HudButton>
          <HudButton variant="purple" size="md">
            Purple · MD
          </HudButton>
          <HudButton variant="purple" size="sm">
            Purple · SM
          </HudButton>
          <HudButton href="https://example.com" variant="green">
            External link
          </HudButton>
        </Section>

        <Section label="Pill · tones">
          <Pill tone="on">
            <Dot tone="on" /> Online
          </Pill>
          <Pill tone="warn">
            <Dot tone="warn" /> Warn
          </Pill>
          <Pill tone="off">
            <Dot tone="off" /> Offline
          </Pill>
        </Section>

        <Section label="Dot · tones">
          <Dot tone="on" />
          <Dot tone="warn" />
          <Dot tone="off" />
        </Section>

        <Section label="Eyebrow · tones">
          <Eyebrow tone="dim">Dim label</Eyebrow>
          <Eyebrow tone="green">Green label</Eyebrow>
          <Eyebrow tone="purple">Purple label</Eyebrow>
        </Section>

        <Section label="HudCorner · tl/tr/bl/br">
          <div
            style={{
              position: 'relative',
              width: 240,
              height: 160,
              background: 'var(--space-deep)',
              border: '1px solid var(--ink-faint)',
            }}
          >
            <HudCorner corner="tl" />
            <HudCorner corner="tr" />
            <HudCorner corner="bl" />
            <HudCorner corner="br" />
          </div>
        </Section>

        <Section label="HairlineDivider">
          <div style={{ width: 260 }}>
            <div style={{ color: 'var(--ink-dim)', marginBottom: 6 }}>Green (default)</div>
            <HairlineDivider />
            <div style={{ color: 'var(--ink-dim)', margin: '14px 0 6px' }}>Purple</div>
            <HairlineDivider tone="purple" />
          </div>
        </Section>

        <Section label="CruxMark · 80 / 140 / 200">
          <CruxMark size={80} />
          <CruxMark size={140} />
          <CruxMark size={200} />
        </Section>

        <Section label="AstronautAvatar · hues 15/60/140/220/300">
          {[15, 60, 140, 220, 300].map((hue) => (
            <AstronautAvatar key={hue} hue={hue} size={64} />
          ))}
        </Section>

        <Section label="Starfield · 320 × 200">
          <div style={{ position: 'relative', width: 320, height: 200 }}>
            <Starfield />
            <Scanlines opacity={0.5} />
          </div>
        </Section>
      </div>
    </main>
  );
}
