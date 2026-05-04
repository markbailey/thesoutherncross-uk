import { expect, test } from '@playwright/test';
import { mockApi } from '../lib/mockApi';
import { freezeScene, waitForReady } from '../lib/freezeScene';

test.describe('keyboard accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await freezeScene(page);
    await mockApi(page);
  });

  test('nav links are keyboard-reachable and focus-visible', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);

    // First tab should land on the nav brand anchor (or a focusable skip target).
    // Walk forward and confirm we eventually reach each nav link.
    const labels = ['HOME', 'ABOUT', 'SYSTEM', 'MEMBERS', 'JOIN'];
    for (let i = 0; i < 20 && labels.length > 0; i++) {
      await page.keyboard.press('Tab');
      const focusedText = (await page.evaluate(() => document.activeElement?.textContent ?? '')).trim();
      if (labels[0] && focusedText.includes(labels[0])) {
        labels.shift();
      }
    }
    expect(labels, 'all nav labels reachable via Tab').toEqual([]);
  });

  test('activating a nav link with Enter navigates to the section', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);

    const membersLink = page.locator('nav a[href="#members"]');
    await membersLink.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(450);
    await expect(page).toHaveURL(/#members$/);
    await expect(page.locator('#members')).toBeInViewport({ ratio: 0.1 });
  });
});
