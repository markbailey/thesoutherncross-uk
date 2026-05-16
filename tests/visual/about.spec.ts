import { expect, test } from '@playwright/test';
import { mockApi } from '../lib/mockApi';
import { freezeScene, waitForReady } from '../lib/freezeScene';

test.describe('@visual about', () => {
  test.beforeEach(async ({ page }) => {
    await freezeScene(page);
    await mockApi(page);
  });

  test('about section has mission brief + stats dossier', async ({ page }) => {
    await page.goto('/#/about');
    await waitForReady(page);
    const about = page.locator('#about');
    await expect(about).toContainText('MISSION BRIEF');
    await expect(about).toContainText('OPERATIONAL READOUT');
    await expect(about).toContainText('HOUSE RULES');
    await expect(about).toContainText('COMMS PROTOCOL');
  });

  test('about matches baseline', async ({ page }) => {
    await page.goto('/#/about');
    await waitForReady(page);
    await expect(page.locator('#about')).toHaveScreenshot('about.png');
  });
});
