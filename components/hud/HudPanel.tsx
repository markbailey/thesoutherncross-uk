import * as React from 'react';
import { Panel, type PanelProps } from './Panel';
import { Scanlines } from './Scanlines';

export interface HudPanelProps extends Omit<PanelProps<'div'>, 'as'> {
  /** When true, overlays a scanlines layer inside the panel. */
  scanlines?: boolean;
  /** Opacity for the scanlines overlay (0-1, default 0.7). */
  scanlinesOpacity?: number;
}

/**
 * Convenience wrapper combining Panel + optional Scanlines overlay.
 */
export function HudPanel({
  scanlines = false,
  scanlinesOpacity,
  children,
  className,
  style,
  ...rest
}: HudPanelProps) {
  return (
    <Panel
      className={className}
      style={{ position: 'relative', ...style }}
      {...rest}
    >
      {children}
      {scanlines ? <Scanlines opacity={scanlinesOpacity} /> : null}
    </Panel>
  );
}

export default HudPanel;
