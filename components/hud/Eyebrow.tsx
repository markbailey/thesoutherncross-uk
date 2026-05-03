import * as React from 'react';

export type EyebrowTone = 'dim' | 'green' | 'purple';

export interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: EyebrowTone;
}

const TONE_MOD: Record<EyebrowTone, string> = {
  dim: '',
  green: 'g',
  purple: 'p',
};

export function Eyebrow({ tone = 'dim', className, children, ...rest }: EyebrowProps) {
  const classes = ['eyebrow', TONE_MOD[tone], className].filter(Boolean).join(' ');
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}

export default Eyebrow;
