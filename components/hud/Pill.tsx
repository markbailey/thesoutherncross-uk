import * as React from 'react';

export type PillTone = 'on' | 'warn' | 'off' | 'green' | 'purple' | 'purple-deep';

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: PillTone;
}

export function Pill({ tone, className, children, ...rest }: PillProps) {
  const classes = ['pill', tone, className].filter(Boolean).join(' ');
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}

export default Pill;
