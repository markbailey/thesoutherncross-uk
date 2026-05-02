// Shared helpers to make visual snapshots deterministic:
//   - force prefers-reduced-motion
//   - seed the starfield RNG via window.__TEST_MODE__ (already honoured by
//     Starfield and JoinSection)
//   - await fonts.ready so every snapshot has the correct font metrics

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
  await page.waitForTimeout(200);
}
