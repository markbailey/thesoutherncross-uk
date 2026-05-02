import * as React from 'react';

type PanelOwnProps<E extends React.ElementType> = {
  as?: E;
  className?: string;
  children?: React.ReactNode;
};

export type PanelProps<E extends React.ElementType = 'div'> = PanelOwnProps<E> &
  Omit<React.ComponentPropsWithoutRef<E>, keyof PanelOwnProps<E>>;

/**
 * Polymorphic HUD panel — applies the .hud-panel clip-path + hairline border.
 */
function PanelInner<E extends React.ElementType = 'div'>(
  { as, className, children, ...rest }: PanelProps<E>,
  ref: React.Ref<Element>,
) {
  const Component = (as ?? 'div') as React.ElementType;
  const merged = ['hud-panel', className].filter(Boolean).join(' ');
  return React.createElement(Component, { ref, className: merged, ...rest }, children);
}

export const Panel = React.forwardRef(PanelInner) as <E extends React.ElementType = 'div'>(
  props: PanelProps<E> & { ref?: React.Ref<Element> },
) => React.ReactElement | null;

export default Panel;
