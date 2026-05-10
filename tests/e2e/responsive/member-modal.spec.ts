/**
 * @responsive
 * member-modal.spec.ts — Verifies:
 *   - At 390px: modal occupies the full viewport.
 *   - At 1280px: modal is narrower than the viewport.
 */
import { test, expect, type Page } from '@playwright/test';
import { mockApi } from '../../lib/mockApi';
import { freezeScene } from '../../lib/freezeScene';

async function openModal(page: Page) {
  await freezeScene(page);
  await mockApi(page);
  await page.goto('/');
  await page.waitForTimeout(600);
  // Scroll to members section and click first card
  await page.locator('#members').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const firstCard = page.locator('#members .hud-panel.member-card').first();
  await firstCard.click();
  await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
}

test.describe('MemberModal at mobile (390px) @responsive', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('modal is full-screen at 390px @responsive', async ({ page }) => {
    await openModal(page);
    const modal = page.locator('[role="dialog"]');
    const overlay = modal;
    const box = await overlay.boundingBox();
    expect(box).not.toBeNull();
    // Modal overlay should cover full width
    expect(box!.width).toBeGreaterThanOrEqual(388);
  });

  test('ESC closes modal on mobile @responsive', async ({ page }) => {
    await openModal(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('MemberModal at desktop (1280px) @responsive', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('modal is narrower than viewport at 1280px @responsive', async ({ page }) => {
    await openModal(page);
    const panel = page.locator('.member-modal-panel');
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    // Desktop modal maxWidth is 920px — always < 1280
    expect(box!.width).toBeLessThan(960);
  });
});
