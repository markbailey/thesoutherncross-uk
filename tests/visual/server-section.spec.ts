import { expect, test } from '@playwright/test';
import { mockApi } from '../lib/mockApi';
import { freezeScene, waitForReady } from '../lib/freezeScene';
import populated from '../lib/fixtures/servers-populated.json' with { type: 'json' };

test.describe('@visual system section', () => {
  test.beforeEach(async ({ page }) => {
    await freezeScene(page);
  });

  test('system-empty: empty fixture renders SCAN COMPLETE panel', async ({ page }) => {
    await mockApi(page); // default empty fixture
    await page.goto('/#/system');
    await waitForReady(page);

    const system = page.locator('#system');
    await expect(system).toContainText('SCAN COMPLETE');
    await expect(system).toContainText('NO WORLDS DETECTED');
    await expect(system.getByRole('link', { name: /JOIN STEAM GROUP/i })).toBeVisible();
    await expect(system).toHaveScreenshot('system-empty.png');
  });

  test('system-populated: shows system overview with all worlds', async ({ page }) => {
    await mockApi(page, { servers: populated });
    await page.goto('/#/system');
    await waitForReady(page);

    const system = page.locator('#system');
    await expect(system).toContainText('ORBITAL RECON');
    await expect(system).toContainText(/CLICK A PLANET TO ZOOM IN/i);
    await expect(system).toContainText('ONLINE');
    await expect(system).toHaveScreenshot('system-populated.png');
  });

  test('system-planet-selected: deep-link to a planet zooms in', async ({ page }) => {
    await mockApi(page, { servers: populated });
    await page.goto('/#/servers/minecraft');
    await waitForReady(page);

    const system = page.locator('#system');
    // Breadcrumb shows MINECRAFT highlighted; PlanetBody renders INSTANCES.
    await expect(system.locator('[data-testid="hud-overlay-crumb"]')).toContainText('MINECRAFT');
    await expect(system).toContainText('INSTANCES');
    await expect(system).toContainText('Vanilla SMP');
    await expect(system).toHaveScreenshot('system-planet-selected.png');
  });

  test('system-server-focused: deep-link to a server expands detail', async ({ page }) => {
    await mockApi(page, { servers: populated });
    await page.goto('/#/servers/minecraft/mc-vanilla');
    await waitForReady(page);

    const system = page.locator('#system');
    await expect(system.locator('[data-testid="hud-overlay-crumb"]')).toContainText('VANILLA SMP');
    await expect(system).toContainText('LATENCY');
    await expect(system).toContainText('CONNECT');
    await expect(system).toHaveScreenshot('system-server-focused.png');
  });

  test('system-list-mode: LIST toggle renders the fallback table', async ({ page }) => {
    await mockApi(page, { servers: populated });
    await page.goto('/#/system');
    await waitForReady(page);

    const system = page.locator('#system');
    // Click the HUD's LIST toggle (initial label depends on WebGL probe — but
    // when the canvas is up the button reads "LIST"; if WebGL is unavailable the
    // page already renders ListMode and the button reads "SCENE", so clicking
    // it would go the wrong way. Force list-on by clicking only when label is LIST.)
    const toggle = system.getByRole('button', { name: /^(LIST|SCENE)$/ });
    if ((await toggle.textContent())?.trim() === 'LIST') {
      await toggle.click();
    }

    await expect(system.getByText('PLAYERS', { exact: true }).first()).toBeVisible();
    await expect(system.getByText('Vanilla SMP').first()).toBeVisible();
    await expect(system).toHaveScreenshot('system-list-mode.png');
  });
});
