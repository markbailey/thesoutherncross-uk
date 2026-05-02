import { expect, test } from '@playwright/test';
import { mockApi } from '../lib/mockApi';
import { freezeScene, waitForReady } from '../lib/freezeScene';

test.describe('hash navigation', () => {
  test.beforeEach(async ({ page }) => {
    await freezeScene(page);
    await mockApi(page);
  });

  test('nav links smooth-scroll and update the URL hash', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);

    for (const id of ['about', 'system', 'members', 'join'] as const) {
      await page.locator(`nav a[href="#${id}"]`).click();
      await page.waitForTimeout(450);
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      const section = page.locator(`#${id}`);
      await expect(section).toBeInViewport({ ratio: 0.1 });
    }
  });

  test('deep-linking to #/system scrolls the section into view', async ({ page }) => {
    await page.goto('/#/system');
    await waitForReady(page);
    const section = page.locator('#system');
    await expect(section).toBeInViewport({ ratio: 0.1 });
  });

  test('deep-linking to #/members/{steamid} highlights the card', async ({ page }) => {
    await page.goto('/#/members/76561197960287930');
    await waitForReady(page);
    const card = page.locator('[data-steamid="76561197960287930"]');
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('data-highlight', 'true');
  });

  test('deep-linking to #/join scrolls the join section', async ({ page }) => {
    await page.goto('/#/join');
    await waitForReady(page);
    await expect(page.locator('#join')).toBeInViewport({ ratio: 0.1 });
  });
});
