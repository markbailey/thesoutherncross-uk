import { expect, test } from '@playwright/test';
import { mockApi } from '../lib/mockApi';
import { freezeScene, waitForReady } from '../lib/freezeScene';

test.describe('@visual hero', () => {
  test.beforeEach(async ({ page }) => {
    await freezeScene(page);
    await mockApi(page);
  });

  test('hero renders crest + tagline + status bar', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);

    const hero = page.locator('#hero');
    await expect(hero).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('THE SOUTHERN CROSS');
    await expect(page.locator('#hero')).toContainText('UPLINK STABLE');
    await expect(page.locator('#hero')).toContainText('ENTER SYSTEM');
  });

  test('hero matches baseline', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);
    await expect(page.locator('#hero')).toHaveScreenshot('hero.png');
  });
});
