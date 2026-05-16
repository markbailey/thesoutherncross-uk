# Visual spec: align `about` assertion with renamed `OPERATIONAL READOUT` label

## Problem

CI failure in `@visual about`:

```
Error: expect(locator).toContainText(expected) failed
  Locator: locator('#about')
  Expected substring: "OPERATIONAL VITALS"
  ...
  16 |     await expect(about).toContainText('OPERATIONAL VITALS');
```

Commit `6981e64` ("footer: match design.html ...", 2026-05-04) deliberately renamed the section label `OPERATIONAL VITALS` → `OPERATIONAL READOUT` in `components/sections/AboutSection.tsx:211`. The Playwright visual spec at `tests/visual/about.spec.ts:16` still asserts the old string and was missed in that change.

## Goal

Make `@visual about` pass against current copy. Do not revert the design change; do not touch unrelated specs.

## Design

One-line edit in `tests/visual/about.spec.ts:16`:

```diff
- await expect(about).toContainText('OPERATIONAL VITALS');
+ await expect(about).toContainText('OPERATIONAL READOUT');
```

### Rationale

- **Test follows component, not the other way around.** The rename was intentional and aligned to design.html. Reverting `AboutSection.tsx` would undo the design alignment that motivated `6981e64`.
- **Minimal surface.** Only the one failing assertion changes. The other three (`MISSION BRIEF`, `HOUSE RULES`, `COMMS PROTOCOL`) still match the current DOM and stay as-is.
- **Same shape of assertion.** Still a `toContainText` substring match. No locator change, no test-structure change.

### Files changed

- `tests/visual/about.spec.ts` — line 16, 1-token swap.

### Out of scope

- Other specs in `tests/visual/` (`hero`, `join`, `members`, `server-section`). Not reported as failing; don't preemptively edit.
- Refactoring copy-based assertions to use semantic locators (`getByRole`, `data-testid`) or a shared copy-constants module. Worth doing later — flagged in PR description, not implemented here.
- Any change to `AboutSection.tsx` or related styles.

## Verification

1. Locally: `npx playwright test tests/visual/about.spec.ts --project=chromium-desktop` passes.
2. Other visual specs still pass: `npx playwright test tests/visual --project=chromium-desktop`.
3. CI: next push to `main` runs `Release` → `E2E tests` step completes without this assertion failure.

## Risks

- **Future copy tweaks will re-break this and similar specs.** Not fixed here; tracked as follow-up.
