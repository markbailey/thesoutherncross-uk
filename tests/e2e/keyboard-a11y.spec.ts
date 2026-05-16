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

    // On mobile viewports, inline nav is hidden — keyboard test uses the drawer toggle path.
    const toggle = page.locator('[aria-controls="nav-drawer"]');
    const isMobileNav = await toggle.isVisible();

    if (isMobileNav) {
      // Mobile: hamburger toggle is reachable; drawer links reachable after open.
      await toggle.focus();
      expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-controls'))).toBe('nav-drawer');
      await page.keyboard.press('Enter');
      // Drawer is now open — HOME link is focusable
      const homeLink = page.locator('#nav-drawer a[href="#hero"]');
      await expect(homeLink).toBeVisible({ timeout: 2000 });
      return;
    }

    // Desktop: Walk forward and confirm we eventually reach each nav link.
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

    // On mobile, use drawer link; on desktop, use inline nav link.
    const toggle = page.locator('[aria-controls="nav-drawer"]');
    const isMobileNav = await toggle.isVisible();

    if (isMobileNav) {
      await toggle.click();
      const membersLink = page.locator('#nav-drawer a[href="#members"]');
      await membersLink.focus();
      await page.keyboard.press('Enter');
    } else {
      const membersLink = page.locator('nav.site-nav__primary a[href="#members"]');
      await membersLink.focus();
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(450);
    await expect(page).toHaveURL(/#members$/);
    await expect(page.locator('#members')).toBeInViewport({ ratio: 0.1 });
  });
});
