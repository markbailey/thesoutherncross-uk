import { expect, test } from '@playwright/test';
import { mockApi } from '../lib/mockApi';
import { freezeScene, waitForReady } from '../lib/freezeScene';

test.describe('@visual members', () => {
  test.beforeEach(async ({ page }) => {
    await freezeScene(page);
  });

  test('populated roster renders 8 cards', async ({ page }) => {
    await mockApi(page);
    await page.goto('/#/members');
    await waitForReady(page);
    const cards = page.locator('#members [data-steamid]');
    await expect(cards).toHaveCount(8);
  });

  test('empty roster shows standby panel', async ({ page }) => {
    await mockApi(page, { members: { members: [], stale: false, updatedAt: null } });
    await page.goto('/#/members');
    await waitForReady(page);
    await expect(page.locator('#members')).toContainText('NO MEMBERS UPLINKED');
  });

  test('error state shows uplink-lost panel with retry', async ({ page }) => {
    await mockApi(page, { membersStatus: 500 });
    await page.goto('/#/members');
    await waitForReady(page);
    await expect(page.locator('#members')).toContainText('UPLINK LOST');
    await expect(page.locator('#members').getByRole('button', { name: /RETRY UPLINK/i })).toBeVisible();
  });

  test('stale-data chip appears when stale=true', async ({ page }) => {
    await mockApi(page, {
      members: { members: [], stale: true, updatedAt: Date.now() },
    });
    await page.goto('/#/members');
    await waitForReady(page);
    await expect(page.locator('#members')).toContainText('STALE DATA');
  });

  test('members matches baseline', async ({ page }) => {
    await mockApi(page);
    await page.goto('/#/members');
    await waitForReady(page);
    await expect(page.locator('#members')).toHaveScreenshot('members.png');
  });
});
