/**
 * @responsive
 * nav-drawer.spec.ts — NavDrawer open/close/focus-trap/ESC/link-click behaviours.
 *
 * Runs at 390 (mobile) and 820 (tablet) viewports where the hamburger is visible.
 */
import { test, expect, type Page } from '@playwright/test';
import { mockApi } from '../../lib/mockApi';
import { freezeScene } from '../../lib/freezeScene';

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const TABLET_VIEWPORT = { width: 820, height: 1180 };

async function setup(page: Page) {
  await freezeScene(page);
  await mockApi(page);
  await page.goto('/');
}

for (const viewport of [MOBILE_VIEWPORT, TABLET_VIEWPORT]) {
  test.describe(`NavDrawer @ ${viewport.width}px`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await setup(page);
    });

    test('hamburger toggle is visible, inline nav is hidden @responsive', async ({ page }) => {
      const toggle = page.locator('[aria-controls="nav-drawer"]');
      await expect(toggle).toBeVisible();
      const inlineNav = page.locator('.site-nav__primary');
      await expect(inlineNav).not.toBeVisible();
    });

    test('opens drawer on hamburger click @responsive', async ({ page }) => {
      await page.locator('[aria-controls="nav-drawer"]').click();
      const drawer = page.locator('#nav-drawer');
      await expect(drawer).toHaveClass(/nav-drawer--open/);
    });

    test('closes drawer with ESC key @responsive', async ({ page }) => {
      await page.locator('[aria-controls="nav-drawer"]').click();
      const drawer = page.locator('#nav-drawer');
      await expect(drawer).toHaveClass(/nav-drawer--open/);
      await page.keyboard.press('Escape');
      await expect(drawer).not.toHaveClass(/nav-drawer--open/);
    });

    test('closes drawer by clicking backdrop @responsive', async ({ page }) => {
      await page.locator('[aria-controls="nav-drawer"]').click();
      await page.locator('.nav-drawer-backdrop--open').click({ position: { x: 10, y: 200 } });
      const drawer = page.locator('#nav-drawer');
      await expect(drawer).not.toHaveClass(/nav-drawer--open/);
    });

    test('clicking a nav link closes the drawer @responsive', async ({ page }) => {
      await page.locator('[aria-controls="nav-drawer"]').click();
      const drawer = page.locator('#nav-drawer');
      await expect(drawer).toHaveClass(/nav-drawer--open/);
      await page.locator('#nav-drawer a[href="#about"]').click();
      await expect(drawer).not.toHaveClass(/nav-drawer--open/);
    });

    test('focus moves to close button when drawer opens @responsive', async ({ page }) => {
      await page.locator('[aria-controls="nav-drawer"]').click();
      // Small delay for focus transition
      await page.waitForTimeout(100);
      const closeBtn = page.locator('#nav-drawer button[aria-label="Close navigation menu"]');
      await expect(closeBtn).toBeFocused();
    });
  });
}
