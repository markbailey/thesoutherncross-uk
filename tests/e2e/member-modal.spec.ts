import { expect, test } from '@playwright/test';
import { mockApi } from '../lib/mockApi';
import { freezeScene, waitForReady } from '../lib/freezeScene';

test.describe('@e2e member modal', () => {
  test.beforeEach(async ({ page }) => {
    await freezeScene(page);
    await mockApi(page);
  });

  test('opens dialog on card click and closes on Escape', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);

    const firstCard = page.locator('#members [data-steamid]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});
