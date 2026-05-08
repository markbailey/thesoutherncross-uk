/**
 * @responsive
 * nav-drawer.spec.ts — NavDrawer open/close/focus-trap/ESC/link-click behaviours.
 *
 * Runs at 390 (mobile) and 767 (last pixel before hamburger hides) viewports.
 * Also includes a 820px describe block asserting the *opposite* — that at a
 * tablet-ish width above the md breakpoint the inline nav is shown and the
 * hamburger is hidden.
 */
import { test, expect, type Page } from '@playwright/test';
import { mockApi } from '../../lib/mockApi';
import { freezeScene } from '../../lib/freezeScene';

/** Last pixel where hamburger is still visible (hamburger hides at min-width: 768px) */
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const NARROW_TABLET_VIEWPORT = { width: 767, height: 1024 };

async function setup(page: Page) {
  await freezeScene(page);
  await mockApi(page);
  await page.goto('/');
}

for (const viewport of [MOBILE_VIEWPORT, NARROW_TABLET_VIEWPORT]) {
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

    test('focus returns to hamburger toggle when drawer closes via ESC @responsive', async ({ page }) => {
      // WCAG 2.1 SC 2.4.3: focus must return to the trigger element on close.
      const toggle = page.locator('[aria-controls="nav-drawer"]');
      await toggle.click();
      await page.waitForTimeout(100);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      await expect(toggle).toBeFocused();
    });

    test('focus is trapped inside open drawer (Tab wrap) @responsive', async ({ page }) => {
      // WCAG 2.1 SC 2.1.2: keyboard focus must not leave the dialog.
      await page.locator('[aria-controls="nav-drawer"]').click();
      await page.waitForTimeout(100);

      // Collect all focusable elements inside the open drawer.
      const focusable = page.locator(
        '#nav-drawer button:visible, #nav-drawer a:visible, #nav-drawer [tabindex="0"]:visible',
      );
      const count = await focusable.count();
      expect(count).toBeGreaterThan(0);

      // Tab forward through all items; focus should wrap back to the first.
      for (let i = 0; i < count; i++) {
        await page.keyboard.press('Tab');
      }
      // After tabbing through every focusable element, focus wraps to element 0.
      await expect(focusable.first()).toBeFocused();
    });
  });
}

test.describe('inline nav active above md breakpoint @ 820px @responsive', () => {
  test.use({ viewport: { width: 820, height: 1180 } });

  test.beforeEach(async ({ page }) => {
    await setup(page);
  });

  test('hamburger is hidden and inline nav is shown at 820px @responsive', async ({ page }) => {
    // At 820px (above the md 768px breakpoint) the inline nav replaces the hamburger
    const toggle = page.locator('[aria-controls="nav-drawer"]');
    await expect(toggle).not.toBeVisible();
    const inlineNav = page.locator('.site-nav__primary');
    await expect(inlineNav).toBeVisible();
  });
});
