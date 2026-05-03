import * as React from 'react';

export interface ScanlinesProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0-1, maps to CSS var --scanline-opacity (default 0.7). */
  opacity?: number;
}

/**
 * Usage: (1) place as a peer inside a relatively-positioned parent,
 *        (2) or set className="scanlines" on the parent itself and skip this component.
 */
export function Scanlines({ opacity = 0.7, className, style, ...rest }: ScanlinesProps) {
  const merged = ['scanlines', className].filter(Boolean).join(' ');
  return (
    <div
      aria-hidden
      className={merged}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        ['--scanline-opacity' as string]: opacity,
        ...style,
      }}
      {...rest}
    />
  );
}

export default Scanlines;
