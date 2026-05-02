import { expect, test } from '@playwright/test';
import { mockApi } from '../lib/mockApi';
import { freezeScene, waitForReady } from '../lib/freezeScene';
import populated from '../lib/fixtures/servers-populated.json' with { type: 'json' };

test.describe('@e2e scene interaction', () => {
  test.beforeEach(async ({ page }) => {
    await freezeScene(page);
    await mockApi(page, { servers: populated });
  });

  test('selecting a planet via HUD updates hash + breadcrumb; Esc deselects', async ({ page }) => {
    await page.goto('/#/system');
    await waitForReady(page);

    const system = page.locator('#system');
    await expect(system).toBeVisible();

    // System body lists worlds as buttons — DOM-driven path is reliable across
    // canvas/list-mode/empty-state branches.
    const minecraftRow = system.getByRole('button', { name: /Minecraft/i }).first();
    await expect(minecraftRow).toBeVisible();
    await minecraftRow.click();

    await expect(page).toHaveURL(/#\/servers\/minecraft$/);
    // Breadcrumb shows the selected game uppercased.
    await expect(system.locator('.crumb')).toContainText('MINECRAFT');
    // While focused, ZOOM OUT button is rendered.
    await expect(system.getByRole('button', { name: 'ZOOM OUT' })).toBeVisible();

    // Esc steps back out one level — view returns to 'system' so ZOOM OUT
    // disappears and the breadcrumb's game-name segment is gone.
    // (NOTE: the hash sync effect only writes when view ≠ 'system', so the
    // URL fragment is not actively cleared on deselect — see report.)
    await page.keyboard.press('Escape');
    await expect(system.getByRole('button', { name: 'ZOOM OUT' })).toHaveCount(0);
    await expect(system.locator('.crumb')).not.toContainText('MINECRAFT');
  });

  test('LIST toggle round-trips between scene and list mode', async ({ page }) => {
    await page.goto('/#/system');
    await waitForReady(page);

    const system = page.locator('#system');
    const toggle = system.getByRole('button', { name: /^(LIST|SCENE)$/ });
    await expect(toggle).toBeVisible();

    // Initial state: WebGL probe runs client-side; canvas may or may not exist
    // depending on env. The button label tells us which mode we're in.
    const initial = (await toggle.textContent())?.trim();

    await toggle.click();
    // After toggling, the list body's table headers (PLAYERS column) should appear,
    // OR the canvas — depending on which way we toggled.
    if (initial === 'LIST') {
      // Was scene → now list. Table thead has "PLAYERS".
      await expect(system.getByText('PLAYERS', { exact: true }).first()).toBeVisible();
      await expect(system.getByRole('button', { name: 'SCENE' })).toBeVisible();
    } else {
      // Was list (e.g. WebGL unavailable in CI) → now scene OR still list if
      // useFallback held. Either way, button label flipped to LIST.
      await expect(system.getByRole('button', { name: 'LIST' })).toBeVisible();
    }

    // Toggle back — should return to original label.
    await system.getByRole('button', { name: /^(LIST|SCENE)$/ }).click();
    await expect(system.getByRole('button', { name: initial === 'LIST' ? 'LIST' : 'SCENE' })).toBeVisible();
  });

  test('selecting a server via HUD instance list updates hash to game/server', async ({ page }) => {
    await page.goto('/#/system');
    await waitForReady(page);

    const system = page.locator('#system');
    await system.getByRole('button', { name: /Minecraft/i }).first().click();
    await expect(page).toHaveURL(/#\/servers\/minecraft$/);

    // Now in PlanetBody — instance buttons named with server name + status pill.
    const vanilla = system.getByRole('button', { name: /Vanilla SMP/i }).first();
    await expect(vanilla).toBeVisible();
    await vanilla.click();

    await expect(page).toHaveURL(/#\/servers\/minecraft\/mc-vanilla$/);
    await expect(system.locator('.crumb')).toContainText('VANILLA SMP');
  });
});
