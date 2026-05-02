import * as React from 'react';

export type HudButtonVariant = 'green' | 'purple';
export type HudButtonSize = 'sm' | 'md';

interface HudButtonBaseProps {
  variant?: HudButtonVariant;
  size?: HudButtonSize;
  className?: string;
  children?: React.ReactNode;
}

export interface HudButtonAsButton
  extends HudButtonBaseProps,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof HudButtonBaseProps | 'href'> {
  href?: undefined;
}

export interface HudButtonAsAnchor
  extends HudButtonBaseProps,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof HudButtonBaseProps | 'href'> {
  href: string;
}

export type HudButtonProps = HudButtonAsButton | HudButtonAsAnchor;

const SIZE_STYLES: Record<HudButtonSize, React.CSSProperties> = {
  sm: { padding: '5px 10px', fontSize: 10 },
  md: {},
};

function isExternal(href: string) {
  return /^https?:\/\//i.test(href) || href.startsWith('//');
}

export const HudButton = React.forwardRef<HTMLElement, HudButtonProps>(function HudButton(
  props,
  ref,
) {
  const { variant = 'green', size = 'md', className, children, ...rest } = props;
  const classes = ['hud-btn', variant === 'purple' ? 'purple' : '', className]
    .filter(Boolean)
    .join(' ');
  const sizeStyle = SIZE_STYLES[size];

  if ('href' in props && typeof props.href === 'string') {
    const href = props.href;
    const { target, rel, style, ...anchorRest } =
      rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    const external = isExternal(href);
    const finalTarget = target ?? (external ? '_blank' : undefined);
    const finalRel = rel ?? (external ? 'noopener noreferrer' : undefined);
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        target={finalTarget}
        rel={finalRel}
        className={classes}
        style={{ display: 'inline-block', textDecoration: 'none', ...sizeStyle, ...style }}
        {...anchorRest}
      >
        {children}
        {external ? ' ↗' : null}
      </a>
    );
  }

  const { style, type, ...buttonRest } = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type ?? 'button'}
      className={classes}
      style={{ ...sizeStyle, ...style }}
      {...buttonRest}
    >
      {children}
    </button>
  );
});

export default HudButton;
