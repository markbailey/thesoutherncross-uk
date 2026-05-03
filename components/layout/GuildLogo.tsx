import * as React from 'react';
import { CruxMark, type CruxMarkProps } from './CruxMark';

export interface GuildLogoProps extends Omit<CruxMarkProps, 'size'> {
  size?: number;
}

/**
 * Guild logo — currently a thin wrapper around CruxMark. Kept separate so
 * a text-only logo variant can be introduced later without touching callers.
 */
export function GuildLogo({ size = 200, ...rest }: GuildLogoProps) {
  return <CruxMark size={size} {...rest} />;
}

export default GuildLogo;
