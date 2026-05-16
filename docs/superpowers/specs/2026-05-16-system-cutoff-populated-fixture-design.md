# system-cutoff: populate servers fixture for the desktop describe

## Problem

`tests/e2e/responsive/system-cutoff.spec.ts:62` asserts:

```ts
const desktopHud = section.locator('[data-testid="desktop-hud-crumb"]');
await expect(desktopHud).toHaveCount(1);
```

On `chromium-desktop` at the describe's 1280×800 viewport, the locator resolves to `0` for the full 5-second timeout.

`desktop-hud-crumb` lives at `components/sections/SystemSection.tsx:347` inside the desktop branch of `<FullBleedLayout>`. But `SystemSection` at line 249 gates rendering on `isEmpty`:

```tsx
{isEmpty ? <EmptyState /> : <FullBleedLayout ... />}
```

The test's `setup()` calls `mockApi(page)` with no arguments. `mockApi`'s default `servers` fixture is `tests/lib/fixtures/servers.json`, which contains `{games: []}`. With no games, `isEmpty === true` and `<EmptyState />` renders — neither the mobile header, the mobile status legend, nor the desktop HUD crumb is in the DOM.

The mobile tests in the same file accidentally pass against `EmptyState` because their assertions are absence-only (`canvas count == 0`, `Three.js chunks not requested`) — neither of which would be true on a real populated page either, so the tests aren't validating anything new.

## Goal

Make the **desktop** describe in `system-cutoff.spec.ts` exercise the populated path so its `desktop-hud-crumb` presence assertion is meaningful. Leave the mobile describe untouched (its absence-only assertions don't depend on population).

## Design

1. Import the existing populated fixture (already used by `tests/e2e/navigation.spec.ts` and `tests/e2e/scene-interaction.spec.ts`):

   ```ts
   import populated from '../../lib/fixtures/servers-populated.json' with { type: 'json' };
   ```

2. Extend the shared `setup()` helper to accept an optional `servers` override, defaulting to whatever `mockApi`'s default is (i.e. the empty fixture — unchanged behaviour for the mobile describe):

   ```ts
   async function setup(page: Page, opts: { servers?: unknown } = {}) {
     await freezeScene(page);
     await mockApi(page, { servers: opts.servers });
     ...
   }
   ```

3. Have the desktop describe's `beforeEach` pass `populated`:

   ```ts
   test.beforeEach(async ({ page }) => {
     await setup(page, { servers: populated });
   });
   ```

### Rationale

- **Root cause, not symptom.** `desktop-hud-crumb` was always intended to render in the desktop path. The bug is the test setup feeding an unrealistic empty state, not the component. Populating data exercises what the test actually claims to verify.
- **Mobile tests unchanged.** Their `setup(page)` call still passes `servers: undefined`, which `mockApi` resolves to the empty default. Same behaviour as before.
- **No component change.** `EmptyState` rendering when `games.length === 0` is intentional UX. Whether the desktop HUD chrome should also render in the empty state is a separate design call, not in scope.
- **Reuses an existing fixture.** `servers-populated.json` already serves the same purpose in two other specs; no new fixture file.

### Files changed

- `tests/e2e/responsive/system-cutoff.spec.ts` — extend `setup()` signature; import `populated`; pass it in the desktop describe's `beforeEach`.

### Out of scope

- Whether `<EmptyState />` should still surface the desktop HUD chrome. UX question.
- Whether the mobile describe's "absence" assertions are meaningful when the page is empty. They aren't, strictly, but populating data there is a separate refactor and the tests don't currently fail.
- Refactoring `mockApi` to accept fixture names rather than raw data. Future cleanup.
- Anything in `SystemSection.tsx`, `SceneShell.tsx`, or `FullBleedLayout`.

## Verification

1. `npx playwright test tests/e2e/responsive/system-cutoff.spec.ts --project=chromium-desktop` — passes; `desktop-hud-crumb` count is 1.
2. `npx playwright test tests/e2e/responsive/system-cutoff.spec.ts --project=chromium-mobile` — still passes (the desktop test is filtered by the `@desktop-only` tag added in #21; the mobile tests are unchanged).
3. Manual sanity: navigate locally to `/` at 1280px width with the populated fixture; DevTools shows `#system [data-testid="desktop-hud-crumb"]` rendering "OPS / SYSTEM · 3D".

## Risks

- **Re-use of `servers-populated.json` across specs.** If that fixture's shape changes in a way the system-cutoff test relies on, this spec will need updating with the others. No shape dependency exists today — the test only checks for the existence of `desktop-hud-crumb` and `mobile-status-legend`, not for any specific game/server contents.
