'use client';

import * as React from 'react';

/**
 * Watches a target element for viewport visibility AND document.visibilityState.
 * Returns true only when both are favourable — meaning the scene is genuinely
 * visible to the user and the render loop should run.
 */
export function useSceneVisibility(
  ref: React.RefObject<HTMLElement | null>,
): boolean {
  // Start hidden — the IO callback fires on next microtask and corrects to true
  // if the section is actually in the viewport. Defaulting to true means the
  // render loop runs (and burns CPU) even when the section is offscreen on load.
  const [visible, setVisible] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = ref.current;
    if (!el) return;

    let inViewport = true;
    let docVisible = document.visibilityState !== 'hidden';

    const update = () => setVisible(inViewport && docVisible);

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        inViewport = entry.isIntersecting;
        update();
      },
      { threshold: 0.05 },
    );
    io.observe(el);

    const onVis = () => {
      docVisible = document.visibilityState !== 'hidden';
      update();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ref]);

  return visible;
}
