import { expect, test } from '@playwright/test';
import { mockApi } from '../lib/mockApi';
import { freezeScene, waitForReady } from '../lib/freezeScene';
import populatedServers from '../lib/fixtures/servers-populated.json' with { type: 'json' };

test.describe('hash navigation', () => {
  test.beforeEach(async ({ page }) => {
    await freezeScene(page);
    await mockApi(page);
  });

  test('nav links smooth-scroll and update the URL hash', async ({ page }) => {
    await page.goto('/');
    await waitForReady(page);

    for (const id of ['about', 'system', 'members', 'join'] as const) {
      // On mobile viewports (<768px) the inline nav is hidden behind the drawer.
      const toggle = page.locator('[aria-controls="nav-drawer"]');
      const isDrawerNav = await toggle.isVisible();
      if (isDrawerNav) {
        // Open drawer, click the link (which closes it), then check URL.
        await toggle.click();
        await page.locator(`#nav-drawer a[href="#${id}"]`).click();
      } else {
        await page.locator(`nav.site-nav__primary a[href="#${id}"]`).click();
      }
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

  test('@e2e deep-linking to #/servers/{game}/{server} restores focus + breadcrumb', async ({
    page,
  }) => {
    // Override the empty default with a populated fixture for this case only.
    await mockApi(page, { servers: populatedServers });
    await page.goto('/#/servers/minecraft/mc-vanilla');
    await waitForReady(page);

    const system = page.locator('#system');
    await expect(system).toBeVisible();
    await expect(system.locator('.crumb')).toContainText('MINECRAFT');
    await expect(system.locator('.crumb')).toContainText('VANILLA SMP');
  });

  test('scroll-spy does not clobber a route-style hash', async ({ page }) => {
    // System section's `#/servers/{game}/{server}` hash must survive the
    // IntersectionObserver-driven scroll-spy in useActiveSection.
    await mockApi(page, { servers: populatedServers });
    await page.goto('/#/servers/minecraft/mc-vanilla');
    await waitForReady(page);

    // Wait past useActiveSection's 500ms post-hashNav debounce so the spy is live.
    await page.waitForTimeout(700);
    await expect(page).toHaveURL(/#\/servers\/minecraft\/mc-vanilla$/);
  });
});
