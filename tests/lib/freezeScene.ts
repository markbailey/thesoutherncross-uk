// Shared helpers to make visual snapshots deterministic:
//   - force prefers-reduced-motion
//   - seed the starfield RNG via window.__TEST_MODE__ (already honoured by
//     Starfield and JoinSection)
//   - await fonts.ready so every snapshot has the correct font metrics
//   - await the R3F Scene's `scene-ready` window event when it's present

import type { Page } from '@playwright/test';

export async function freezeScene(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    (window as typeof window & { __TEST_MODE__?: boolean }).__TEST_MODE__ = true;
  });
}

export async function waitForReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    if ('fonts' in document && document.fonts?.ready) {
      await document.fonts.ready;
    }
  });

  // The R3F Scene dispatches `scene-ready` after first useFrame when test mode
  // is on. If the page doesn't render a Scene (e.g. AboutSection-only specs),
  // the event never fires — the timeout fallback keeps those tests fast.
  await page.evaluate(async () => {
    if (document.getElementById('system') == null) return;
    await new Promise<void>((resolve) => {
      let done = false;
      const onReady = () => {
        if (done) return;
        done = true;
        window.removeEventListener('scene-ready', onReady);
        resolve();
      };
      window.addEventListener('scene-ready', onReady, { once: true });
      window.setTimeout(() => {
        if (done) return;
        done = true;
        window.removeEventListener('scene-ready', onReady);
        resolve();
      }, 1500);
    });
  });

  await page.waitForTimeout(200);
}
