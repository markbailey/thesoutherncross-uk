# Playwright: enable software WebGL on `chromium-desktop`

## Problem

Two scene-interaction tests fail on `chromium-desktop`:

- `tests/e2e/scene-interaction.spec.ts:12` — `expect(system.locator('[data-planet-id="minecraft"]').first()).toBeVisible()` — locator never resolves.
- `tests/e2e/scene-interaction.spec.ts:70` — `system.locator('[data-planet-id="minecraft"]').first().click()` — timeout, click target never appears.

Headless Chromium ships with WebGL disabled by default. The WebGL probe at `components/solar-system/webgl.ts:1-18` returns `false`, which makes `SystemSection.tsx:161` set `useFallback = true`, which makes `SceneShell.tsx:90-96` skip mounting `<Scene>` and render `<ListMode>` instead. Planet labels carrying `data-planet-id="..."` are created inside the Scene effect (`components/solar-system/Scene.tsx:677`), so when Scene never mounts, those labels never exist — the tests can't find them.

A code comment at `tests/e2e/responsive/system-cutoff.spec.ts:74-78` calls this out and names the workaround: launch chromium with `--use-gl=swiftshader`.

## Goal

Make `<Scene>` mount in CI on the `chromium-desktop` project so the 3D-scene tests can exercise the real interaction path. Don't touch test code, component code, or the `chromium-mobile` project.

## Design

Add `launchOptions.args` to the `chromium-desktop` project block in `playwright.config.ts`:

```ts
{
  name: 'chromium-desktop',
  testMatch: ['e2e/**/*.spec.ts', 'visual/**/*.spec.ts'],
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    launchOptions: { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] },
  },
},
```

### Flag choice

- **`--use-gl=swiftshader`** — selects the SwiftShader software GL implementation. Older flag, still honoured by Playwright's bundled chromium.
- **`--enable-unsafe-swiftshader`** — required by Chromium ≥120; without it SwiftShader is gated as "unsafe fallback only" and the probe still returns `false` even with `--use-gl=swiftshader` set.

Both are included so the config works across the range of chromium versions Playwright might bundle in the foreseeable future. Neither flag has any effect outside the test browser.

### Why desktop only

- The failing tests are tagged `@desktop-only` (PR #21) and the chromium-mobile project filters them out via `grepInvert`. They'll never run on mobile.
- The mobile path in `SystemSection` returns `<ListMode>` early — `if (!isDesktop) return <ListMode />` at `SystemSection.tsx:160-...`. Scene is unreachable on mobile regardless of WebGL availability.
- Test `tests/e2e/responsive/system-cutoff.spec.ts:34` ("Three.js / R3F chunks are not fetched at mobile viewport") asserts that mobile never loads the Three.js chunks. Enabling WebGL on mobile would not change this (Scene still isn't mounted on mobile), but adding the flag to a project where it has no effect adds noise. Keep it scoped to desktop.

### Rationale vs. the alternatives

- **Rewriting tests to assert against ListMode fallback** would lose coverage of the actual scene-interaction code path the tests are named after. The bug we'd be papering over is "WebGL doesn't work in CI"; the fix should restore WebGL, not detune the tests.
- **Skipping in fallback mode** would mean CI never runs these tests. They'd silently atrophy.
- **Enabling swiftshader** preserves coverage with one config line and zero test changes.

### Files changed

- `playwright.config.ts` — `chromium-desktop` project's `use` block gains a `launchOptions.args` array.

### Out of scope

- Updating the stale comment at `tests/e2e/responsive/system-cutoff.spec.ts:74-78` ("WebGL is not available in headless Chromium…"). It's now inaccurate, but it doesn't break anything and the comment will get attention in PR 4 when that file is touched for snapshot baselines. Flagging only.
- Enabling WebGL on `chromium-mobile`. Mobile never reaches Scene; the flag would be inert noise.
- Any change to `components/solar-system/webgl.ts`, `Scene.tsx`, `SceneShell.tsx`, or `SystemSection.tsx`.
- Generating visual snapshots that now include WebGL-rendered Scene content. PR 4 will handle baseline generation against this config.

## Verification

1. `npx playwright test tests/e2e/scene-interaction.spec.ts --project=chromium-desktop` — all three tests pass:
   - `selecting a planet via HUD updates hash + breadcrumb; Esc deselects`
   - `LIST toggle round-trips between scene and list mode` (already passing — just confirm no regression)
   - `selecting a server via HUD instance list updates hash to game/server`
2. `npx playwright test tests/e2e/responsive/system-cutoff.spec.ts --project=chromium-desktop` — passes (PR 3a covers the empty-state fixture; this PR doesn't change anything in that file).
3. `npx playwright test tests/e2e/responsive/system-cutoff.spec.ts --project=chromium-mobile -g "Three.js"` — the "Three.js chunks not fetched on mobile" assertion still passes, confirming mobile-side behaviour is unchanged.
4. Visual snapshot tests in `tests/visual/server-section.spec.ts` — these need fresh baselines from PR 4 anyway, so any pre-existing PNG diffs are expected.

## Risks

- **Slower CI.** SwiftShader is software rendering; Scene initialisation and animation will run on CPU. The `freezeScene` helper already gates on a `scene-ready` event so test wall time shouldn't balloon, but expect a ~1–2 s delta per scene-related test.
- **Snapshots will differ from local GPU rendering.** Doesn't affect this PR (no snapshot assertions in scene-interaction). Matters for PR 4 — baselines must be generated under the same swiftshader config they'll be compared against.
- **Future chromium update may deprecate `--use-gl=swiftshader`.** `--enable-unsafe-swiftshader` is the modern equivalent and is included. If both flags are removed in a far-future chromium, the tests will start failing again and we'll need to revisit (likely with `--use-angle=swiftshader-webgl`).
