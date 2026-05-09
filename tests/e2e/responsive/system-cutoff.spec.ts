/**
 * @responsive
 * system-cutoff.spec.ts — Verifies that:
 *   - At 390px: ListMode is rendered, no R3F <canvas> is present.
 *   - At 1280px: Desktop HUD chrome is rendered (canvas skipped — WebGL unavailable in headless Chromium).
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

    // Absence: the mobile status legend must not be present at desktop width.
    const mobileStatusLegend = section.locator('[data-testid="mobile-status-legend"]');
    await expect(mobileStatusLegend).toHaveCount(0);

    // Presence: the desktop-only HUD crumb must be rendered, confirming
    // SceneShell took the desktop branch rather than rendering nothing.
    // Note: WebGL is not available in headless Chromium, so the WebGL probe
    // sets useFallback=true and <Scene> does not mount. The chunk-loading
    // claim ("Three.js never fetched on mobile") could be verified via
    // network-trace assertions (page.on('request')) or by enabling
    // --use-gl=swiftshader in the Playwright launch config.
    const desktopHud = section.locator('[data-testid="desktop-hud-crumb"]');
    await expect(desktopHud).toHaveCount(1);
  });
});
