import * as React from 'react';

export type HairlineTone = 'green' | 'purple';

export interface HairlineDividerProps extends React.HTMLAttributes<HTMLHRElement> {
  tone?: HairlineTone;
}

export function HairlineDivider({ tone = 'green', className, ...rest }: HairlineDividerProps) {
  const base = tone === 'purple' ? 'hr-hair-p' : 'hr-hair';
  const classes = [base, className].filter(Boolean).join(' ');
  return <hr className={classes} {...rest} />;
}

export default HairlineDivider;
