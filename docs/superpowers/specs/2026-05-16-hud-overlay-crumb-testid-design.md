# HUD overlay crumb: add testid + scope `.crumb` locators

## Problem

`#system` contains two `.crumb` elements rendered by different components:

- **Outer** — "OPS/SYSTEM · 3D" in the desktop chrome shell, in `components/sections/SystemSection.tsx:359`. Already carries `data-testid="desktop-hud-crumb"`.
- **Inner** — "INTEL/<game>/<server>" inside the floating HUD panel that mounts when a planet/server is focused, in `components/solar-system/HudOverlay.tsx:162`. **No testid.**

Tests written before the outer crumb existed use `system.locator('.crumb')`, which now matches both and triggers Playwright's strict-mode error:

```
strict mode violation: locator('#system').locator('.crumb') resolved to 2 elements:
  1) <div class="crumb">…</div> aka getByText('OPS/SYSTEM · 3D')
  2) <div class="crumb">…</div> aka getByText('INTEL/MINECRAFT/VANILLA SMP')
```

This affects 7 assertion sites across 3 test files; only 2 directly failed CI in the current run because the others are gated behind preconditions that fail first (scene-interaction tests need WebGL; the second server-section site is part of a chain that won't be reached until upstream fixes land).

## Goal

Disambiguate every `.crumb` locator inside `#system`. Stop the strict-mode failures and make the tests stable against future additions of new `.crumb` elements.

## Design

### Component change

Add a stable testid to the INTEL crumb only:

```diff
- <div className="crumb" style={{ fontSize: 10 }}>
+ <div className="crumb" data-testid="hud-overlay-crumb" style={{ fontSize: 10 }}>
```

(`components/solar-system/HudOverlay.tsx:162`)

The outer crumb already has `data-testid="desktop-hud-crumb"` — no change there.

### Test changes

Replace every `system.locator('.crumb')` with `system.locator('[data-testid="hud-overlay-crumb"]')`:

| File | Line | Direction |
|---|---|---|
| `tests/e2e/navigation.spec.ts` | 65, 66 | Hoist to a local `const hudCrumb` since both lines target the same element |
| `tests/visual/server-section.spec.ts` | 42 | Direct swap |
| `tests/visual/server-section.spec.ts` | 54 | Direct swap |
| `tests/e2e/scene-interaction.spec.ts` | 27 | Direct swap |
| `tests/e2e/scene-interaction.spec.ts` | 36 | Convert `.not.toContainText('MINECRAFT')` → `toHaveCount(0)` |
| `tests/e2e/scene-interaction.spec.ts` | 84 | Direct swap |

### Why convert line 36 specifically

The original `system.locator('.crumb').not.toContainText('MINECRAFT')` was asserting against whatever crumbs survived after `Escape` — fine when there were multiple crumbs (the outer always survived and didn't contain MINECRAFT). With the new locator targeting only the INTEL crumb, the HudOverlay unmounts entirely after Escape (per the comment at `scene-interaction.spec.ts:19-20`: "HudOverlay no longer renders until a planet/server is focused"), so the locator resolves to 0 elements. The clearer assertion is "the INTEL crumb is gone": `toHaveCount(0)`. This matches the test comment ("the HudOverlay … is unmounted") and avoids the ambiguity of `not.toContainText` on a 0-element locator.

### Rationale

- **testid, not class name.** `.crumb` is a styling hook. Tests should depend on stable identifiers, not visual classes. `data-testid="hud-overlay-crumb"` names the role of the element ("the INTEL crumb inside the floating HUD overlay") and survives styling refactors.
- **Single new testid.** Only the previously unnamed crumb gets a testid; the outer crumb's existing `desktop-hud-crumb` keeps the existing semantics.
- **Sweep all 7 sites in one PR.** Five of them are currently masked by upstream failures (WebGL absence, etc.). Fixing them now means upstream PRs (#3a, #3b, #4) can land without re-tripping strict mode.

### Files changed

- `components/solar-system/HudOverlay.tsx` — 1 attribute added.
- `tests/e2e/navigation.spec.ts` — 2 lines hoisted to a single locator.
- `tests/visual/server-section.spec.ts` — 2 assertion locators swapped.
- `tests/e2e/scene-interaction.spec.ts` — 3 assertion locators swapped (one converted to `toHaveCount(0)`).

### Out of scope

- Renaming the existing `desktop-hud-crumb` testid (kept for compatibility with existing tests).
- Refactoring assertions to use accessible-name patterns (`getByRole('navigation', { name: ... })`). Not appropriate for a breadcrumb element with no implicit role.
- Any change to `.crumb` styling or to the outer SystemSection crumb.
- Component or test changes that should land in PR 1 (#22) or PRs 3a/3b/4 of the CI green-up.

## Verification

1. `npx playwright test tests/e2e/navigation.spec.ts -g "deep-linking"` — passes on both projects.
2. `npx playwright test tests/visual/server-section.spec.ts -g "planet-selected|server-focused"` — passes the `.crumb` assertions (the screenshot assertion may still fail until PR 4 lands baselines; that's expected).
3. `grep -r "locator('\.crumb')" tests/` — returns nothing.
4. Manual: navigate to `/#/servers/minecraft/mc-vanilla`. DevTools shows exactly one element matching `#system [data-testid="hud-overlay-crumb"]`, and it contains "INTEL/MINECRAFT/VANILLA SMP".

## Risks

- **Tests currently failing for unrelated reasons.** Five of the seven sites are masked by Cat 3 (WebGL) and Cat 4 (snapshots). This PR doesn't unblock them on its own — they'll go green only after their respective upstream PRs land. Documented so the test plan isn't misread as "all 7 pass after this PR".
