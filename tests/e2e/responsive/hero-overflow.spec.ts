/**
 * @responsive
 * hero-overflow.spec.ts — Verifies no horizontal scroll at narrow viewports.
 */
import { test, expect, type Page } from '@playwright/test';
import { mockApi } from '../../lib/mockApi';
import { freezeScene } from '../../lib/freezeScene';

async function setup(page: Page) {
  await freezeScene(page);
  await mockApi(page);
  await page.goto('/');
}

for (const width of [360, 390, 430]) {
  test.describe(`hero overflow @ ${width}px @responsive`, () => {
    test.use({ viewport: { width, height: 844 } });

    test(`no horizontal overflow at ${width}px @responsive`, async ({ page }) => {
      await setup(page);
      // Check that document body doesn't overflow horizontally
      const overflow = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        return {
          bodyScrollWidth: body.scrollWidth,
          bodyClientWidth: body.clientWidth,
          htmlScrollWidth: html.scrollWidth,
          htmlClientWidth: html.clientWidth,
        };
      });
      // There should be no horizontal overflow (scrollWidth <= clientWidth)
      expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.bodyClientWidth + 2);
      expect(overflow.htmlScrollWidth).toBeLessThanOrEqual(overflow.htmlClientWidth + 2);
    });
  });
}
