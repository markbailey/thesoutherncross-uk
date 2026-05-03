import * as React from 'react';

export type DotTone = 'on' | 'warn' | 'off';

export interface DotProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: DotTone;
}

export function Dot({ tone, className, ...rest }: DotProps) {
  const classes = ['dot', tone, className].filter(Boolean).join(' ');
  return <span className={classes} {...rest} />;
}

export default Dot;
