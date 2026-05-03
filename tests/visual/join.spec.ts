import { expect, test } from '@playwright/test';
import { mockApi } from '../lib/mockApi';
import { freezeScene, waitForReady } from '../lib/freezeScene';

test.describe('@visual join', () => {
  test.beforeEach(async ({ page }) => {
    await freezeScene(page);
    await mockApi(page);
  });

  test('join section has terminal + CTAs', async ({ page }) => {
    await page.goto('/#/join');
    await waitForReady(page);
    const join = page.locator('#join');
    await expect(join).toContainText('JOIN THE');
    await expect(join).toContainText('CROSS');
    // Test mode short-circuits the staggered reveal so every line is visible.
    await expect(join).toContainText('SLOTS OPEN');
    await expect(join).toContainText('ENLIST? [Y/N]');
    await expect(join.getByRole('link', { name: /JOIN STEAM GROUP/i })).toBeVisible();
    await expect(join.getByRole('link', { name: /JOIN DISCORD/i })).toBeVisible();
  });

  test('join matches baseline', async ({ page }) => {
    await page.goto('/#/join');
    await waitForReady(page);
    await expect(page.locator('#join')).toHaveScreenshot('join.png');
  });
});
