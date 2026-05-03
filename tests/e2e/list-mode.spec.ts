import { expect, test } from '@playwright/test';
import { mockApi } from '../lib/mockApi';
import { freezeScene, waitForReady } from '../lib/freezeScene';
import populated from '../lib/fixtures/servers-populated.json' with { type: 'json' };

test.describe('@e2e list mode fallback', () => {
  test.beforeEach(async ({ page }) => {
    await freezeScene(page);
    await mockApi(page, { servers: populated });
  });

  test('WebGL disabled forces ListMode render with no canvas', async ({ page }) => {
    // Stub HTMLCanvasElement.getContext so isWebGLAvailable() returns false.
    await page.addInitScript(() => {
      const proto = HTMLCanvasElement.prototype as unknown as {
        getContext: (...args: unknown[]) => null;
      };
      proto.getContext = () => null;
    });

    await page.goto('/#/system');
    await waitForReady(page);

    const system = page.locator('#system');
    await expect(system).toBeVisible();

    // No canvas mounted under #system when fallback engages.
    await expect(system.locator('canvas')).toHaveCount(0);

    // ListMode renders a grouped-by-game table with these headers per game.
    await expect(system.getByText('NAME', { exact: true }).first()).toBeVisible();
    await expect(system.getByText('PLAYERS', { exact: true }).first()).toBeVisible();
    await expect(system.getByText('STATUS', { exact: true }).first()).toBeVisible();
  });

  test('list mode shows every game and server from the API', async ({ page }) => {
    await page.addInitScript(() => {
      const proto = HTMLCanvasElement.prototype as unknown as {
        getContext: (...args: unknown[]) => null;
      };
      proto.getContext = () => null;
    });

    await page.goto('/#/system');
    await waitForReady(page);

    const system = page.locator('#system');

    // Each game name appears as a table header. Use getByText since the game
    // name also shows in the HUD overlay's world list — we just need at least one.
    await expect(system.getByText('Minecraft', { exact: true }).first()).toBeVisible();
    await expect(system.getByText('Counter-Strike 2', { exact: true }).first()).toBeVisible();
    await expect(system.getByText('Valheim', { exact: true }).first()).toBeVisible();

    // Each server name appears in its game's table.
    await expect(system.getByText('Vanilla SMP').first()).toBeVisible();
    await expect(system.getByText('ATM10').first()).toBeVisible();
    await expect(system.getByText('Dust2 24/7').first()).toBeVisible();
    await expect(system.getByText('Mirage 24/7').first()).toBeVisible();
    await expect(system.getByText('Yggdrasil').first()).toBeVisible();

    // Status pills — Mirage is offline in the fixture, the rest online.
    await expect(system.getByText('OFFLINE').first()).toBeVisible();
    await expect(system.getByText('ONLINE').first()).toBeVisible();
  });
});
