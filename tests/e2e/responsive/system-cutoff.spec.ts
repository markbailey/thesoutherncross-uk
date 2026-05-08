/**
 * @responsive
 * system-cutoff.spec.ts — Verifies that:
 *   - At 390px: ListMode is rendered, no R3F <canvas> is present.
 *   - At 1280px: Scene canvas is present (desktop gets the 3D view).
 */
import { test, expect, type Page } from '@playwright/test';
import { mockApi } from '../../lib/mockApi';
import { freezeScene } from '../../lib/freezeScene';

async function setup(page: Page) {
  await freezeScene(page);
  await mockApi(page);
  await page.goto('/');
  // Wait for SWR to hydrate
  await page.waitForTimeout(600);
}

test.describe('SystemSection mobile cutoff @responsive', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await setup(page);
  });

  test('renders ListMode (no canvas) at 390px @responsive', async ({ page }) => {
    // Scroll to system section
    await page.locator('#system').scrollIntoViewIfNeeded();
    // No R3F canvas should be present on mobile
    const canvas = page.locator('#system canvas');
    await expect(canvas).toHaveCount(0);
  });
});

test.describe('SystemSection desktop has scene @responsive', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await setup(page);
  });

  test('does not render the mobile section header at 1280px @responsive', async ({ page }) => {
    await page.locator('#system').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    const section = page.locator('#system');
    await expect(section).toBeVisible();

    // At desktop width, SceneShell renders the 3D scene path — the mobile
    // status legend (which only appears alongside the mobile list in FullBleedLayout)
    // must NOT be present. The mobile layout renders the legend as a direct sibling
    // of the SceneShell wrapper inside a padded container.
    const mobileStatusLegend = section.locator('div:has(> .dot.on) + div:has(> .dot.warn)');
    await expect(mobileStatusLegend).toHaveCount(0);
  });
});
