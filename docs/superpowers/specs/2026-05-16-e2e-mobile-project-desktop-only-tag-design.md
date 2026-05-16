# E2E: Stop the `chromium-mobile` project running desktop-only tests

## Problem

Four tests fail on the `chromium-mobile` Playwright project:

- `tests/e2e/scene-interaction.spec.ts:12` — locator `#system [data-planet-id="minecraft"]` never resolves.
- `tests/e2e/scene-interaction.spec.ts:40` — `#system` LIST/SCENE toggle button never visible.
- `tests/e2e/scene-interaction.spec.ts:70` — same `[data-planet-id="minecraft"]` click, timeout.
- `tests/e2e/responsive/system-cutoff.spec.ts:80` — `[data-testid="desktop-hud-crumb"]` count assertion fails.

The component layer is doing the right thing. `components/sections/SystemSection.tsx:160` reads `useMediaQuery('(min-width: 1024px)', true)`; below that breakpoint, `SceneShell` short-circuits to `<ListMode>` (`components/sections/SceneShell.tsx:68-76`), so the 3D scene, planet labels, LIST/SCENE toggle, and desktop HUD chrome simply do not render. The mobile project's viewport (Pixel 7, 390×844) sits well below 1024px, so the elements these tests look for are intentionally absent.

The Playwright config (`playwright.config.ts:21-31`) compounds the issue by giving both projects an identical `testMatch` glob (`e2e/**/*.spec.ts`, `visual/**/*.spec.ts`). Every test runs on both projects regardless of whether it makes sense at a mobile viewport.

## Goal

Stop the `chromium-mobile` project from running desktop-only tests. Don't change component behaviour, don't move files, don't audit unrelated specs preemptively.

## Design

Adopt a tag-based skip following the existing `@e2e` / `@visual` / `@responsive` naming convention.

### Test-side changes

**`tests/e2e/scene-interaction.spec.ts`**

All three tests in this file require the 3D scene (planet labels + LIST/SCENE toggle), which never renders on mobile. Tag the whole describe block:

```diff
- test.describe('@e2e scene interaction', () => {
+ test.describe('@e2e scene interaction @desktop-only', () => {
```

**`tests/e2e/responsive/system-cutoff.spec.ts`**

The file already splits behaviour into two describe blocks: `'SystemSection mobile cutoff @responsive'` (line 19, viewport 390×844) and `'SystemSection desktop has scene @responsive'` (line 55, viewport 1280×800). Only the desktop one needs the tag; the mobile sibling continues to run on `chromium-mobile`.

```diff
- test.describe('SystemSection desktop has scene @responsive', () => {
+ test.describe('SystemSection desktop has scene @responsive @desktop-only', () => {
```

Tagging at the describe layer (rather than the single test inside it) means future tests added to that block inherit the skip automatically.

### Config-side change

**`playwright.config.ts` — `chromium-mobile` project**

```diff
  {
    name: 'chromium-mobile',
    testMatch: ['e2e/**/*.spec.ts', 'visual/**/*.spec.ts'],
+   grepInvert: /@desktop-only/,
    use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
  },
```

`grepInvert` is Playwright's documented filter for "skip tests matching this title pattern". The pattern matches the tag substring anywhere in the resolved test title (which Playwright builds from describe + test name).

### Rationale

- **Tag-based, not folder-based.** Existing conventions (`@e2e`, `@visual`, `@responsive`) live in describe/test names. A new `@desktop-only` tag fits the same vocabulary and avoids file moves, snapshot path changes, or splitting `testMatch` arrays.
- **Project-level `grepInvert`, not per-test `skip`.** Centralises the "mobile project doesn't run desktop-only tests" rule in one place. Authors don't need to remember a per-test guard; they just tag.
- **`chromium-desktop` untouched.** Desktop project still runs everything including tagged tests.
- **Surgical.** Only the 4 failing tests get tagged. No proactive sweep of other specs — if more surface, tag them then.

### Files changed

- `tests/e2e/scene-interaction.spec.ts` — 1 line (describe title).
- `tests/e2e/responsive/system-cutoff.spec.ts` — 1 line (one test title at line 80).
- `playwright.config.ts` — 1 line (new `grepInvert` on `chromium-mobile`).

### Out of scope

- Auditing every other `tests/e2e/**/*.spec.ts` for hidden desktop dependencies. Reactive.
- Device-emulation side-effects after `setViewportSize()` (touch / hover / pointer media features). Not the root cause for these four; not blocking CI.
- Renaming snapshot directories or moving spec files.
- Component-level refactors of `SystemSection` / `SceneShell` mobile fallback.

## Verification

1. `npx playwright test tests/e2e/scene-interaction.spec.ts --project=chromium-desktop` — still runs all 3 tests, all pass.
2. `npx playwright test tests/e2e/scene-interaction.spec.ts --project=chromium-mobile` — Playwright reports the tests as filtered out (0 ran, not 3 failed).
3. `npx playwright test tests/e2e/responsive/system-cutoff.spec.ts --project=chromium-desktop` — both branches (mobile-shape and desktop-shape) run; both pass.
4. `npx playwright test tests/e2e/responsive/system-cutoff.spec.ts --project=chromium-mobile` — only the mobile-branch test (lines 26-52) runs; passes. Line 80 test is filtered.
5. CI: next push to `main` runs `Release` → `E2E tests` step passes the previously failing 4 tests.

## Risks

- **`grepInvert` matches the full resolved test title.** If a future test happens to include the literal string `@desktop-only` in its name without meaning to skip on mobile, it would silently get filtered. Mitigated by the tag's specificity (unlikely to collide).
- **Adding the tag mid-describe vs. mid-test changes the test ID/snapshot path.** Verified: `scene-interaction.spec.ts` has no `toHaveScreenshot` calls; `system-cutoff.spec.ts:80` should be checked for any. If it uses screenshots, the snapshot filename will change with the renamed test title and the snapshot needs renaming too. Will confirm during implementation; if it's just `toBeVisible`/`toHaveCount`, no snapshot impact.
