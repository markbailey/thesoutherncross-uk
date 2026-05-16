# system-cutoff: replace stale WebGL note

## Problem

The desktop describe block in `tests/e2e/responsive/system-cutoff.spec.ts` carried a 5-line note explaining that WebGL is unavailable in headless Chromium and that the test therefore can't assert canvas presence:

```
// Note: WebGL is not available in headless Chromium, so the WebGL probe
// sets useFallback=true and <Scene> does not mount. The chunk-loading
// claim ("Three.js never fetched on mobile") could be verified via
// network-trace assertions (page.on('request')) or by enabling
// --use-gl=swiftshader in the Playwright launch config.
```

PR #25 enabled `--use-gl=swiftshader` and `--enable-unsafe-swiftshader` on the `chromium-desktop` project. The note is now factually wrong on every point that mattered:

- WebGL **is** available (via SwiftShader).
- The probe **does not** force `useFallback=true` on desktop anymore.
- `<Scene>` **does** mount.
- The "could be verified by enabling swiftshader" suggestion is moot — already done.

## Goal

Replace the stale note with one that accurately explains why the test checks `desktop-hud-crumb` presence but not canvas presence.

## Design

Drop the obsolete WebGL paragraph and replace with a one-line scope marker pointing readers to the spec that does cover Scene/canvas:

```diff
   // Presence: the desktop-only HUD crumb must be rendered, confirming
-  // SceneShell took the desktop branch rather than rendering nothing.
-  // Note: WebGL is not available in headless Chromium, so the WebGL probe
-  // sets useFallback=true and <Scene> does not mount. The chunk-loading
-  // claim ("Three.js never fetched on mobile") could be verified via
-  // network-trace assertions (page.on('request')) or by enabling
-  // --use-gl=swiftshader in the Playwright launch config.
+  // FullBleedLayout took the desktop branch rather than EmptyState or
+  // the mobile path. Canvas/Scene assertions live in scene-interaction.spec.ts.
   const desktopHud = section.locator('[data-testid="desktop-hud-crumb"]');
```

Also corrects "SceneShell took the desktop branch" → "FullBleedLayout took the desktop branch" — the desktop-vs-mobile branching is in `FullBleedLayout`. `SceneShell` makes a different choice (skeleton / `<ListMode>` / `<Scene>` based on `webgl` and `useFallback`), but the mobile-vs-desktop split itself happens upstream in `FullBleedLayout`.

### Files changed

- `tests/e2e/responsive/system-cutoff.spec.ts` — one comment block.

### Out of scope

- Adding a canvas presence assertion to this test. Possible now that WebGL is enabled, but the test's purpose is responsive chrome cutoff, not scene rendering. `scene-interaction.spec.ts` covers that.
- The mobile describe's comments — already accurate.
- Anything in `playwright.config.ts` or the components.

## Verification

1. `npx playwright test tests/e2e/responsive/system-cutoff.spec.ts --project=chromium-desktop` — same assertions as before, comment is documentation-only.
2. Reading the new comment cold conveys why no canvas check and where to find scene tests.

## Risks

None — comment-only change.
