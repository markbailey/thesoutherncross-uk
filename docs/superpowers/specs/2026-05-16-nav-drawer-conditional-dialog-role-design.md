# NavDrawer: drop `role="dialog"` + `aria-modal` when closed

## Problem

Eight Playwright tests fail with strict-mode violations against `[role="dialog"]`:

```
strict mode violation: locator('[role="dialog"][aria-modal="true"]') resolved to 2 elements:
  1) <div inert="" role="dialog" id="nav-drawer" aria-modal="true" class="nav-drawer" aria-label="Navigation menu">…</div>
  2) <div role="dialog" aria-modal="true" class="member-modal-overlay" aria-labelledby="member-modal-name">…</div>
```

Affected (chromium-desktop + chromium-mobile):
- `tests/e2e/member-modal.spec.ts:11`
- `tests/e2e/responsive/member-modal.spec.ts:27, 37, 47`

The nav-drawer at `components/nav/NavDrawer.tsx:105-112` is always rendered with unconditional `role="dialog"` and `aria-modal="true"`, only flipping `inert` based on `open`. The failing tests use a CSS attribute selector (`[role="dialog"][aria-modal="true"]`), which matches elements regardless of `inert`, so any modal locator picks up both the drawer and the modal it actually wants.

## Goal

Stop the closed nav-drawer from advertising dialog semantics, without weakening the open behaviour (focus trap, screen-reader announcement) or touching the eight tests.

## Design

Make `role` and `aria-modal` conditional on `open`:

```diff
- role="dialog"
- aria-modal="true"
+ role={open ? 'dialog' : undefined}
+ aria-modal={open || undefined}
```

`React` omits attributes whose value is `undefined`, so when `open === false` the closed drawer has neither `role` nor `aria-modal`, while keeping its existing `inert`, `aria-label`, and CSS hooks.

### Rationale

- **Semantic correctness.** `aria-modal="true"` only makes sense on `role="dialog"` / `role="alertdialog"`. With `role` gone when closed, `aria-modal` must follow.
- **Same fix surface.** One component, one block. Eight tests need no changes.
- **Doesn't touch `inert`.** The existing focus-trap behaviour (no tabbable targets, no pointer events) is unaffected; this only changes what attribute selectors (and `getByRole`) match.
- **Open behaviour identical.** When `open === true`, the rendered markup is the same as today.

### Alternative considered

Update every modal test to use `[role="dialog"]:not([inert])` or `getByRole('dialog', { name: '…' })`. Rejected because:
- Requires edits in 3 test files (and any future modal test); easy to forget the guard.
- The actual bug is the markup — a closed dialog shouldn't claim dialog semantics — so fixing the markup is the correct level.

### Files changed

- `components/nav/NavDrawer.tsx` — 2 attribute values made conditional. Comment near the block updated to explain the rationale.

### Out of scope

- Member modal markup (`components/members/MemberModal.tsx`) — already mounted conditionally, no changes needed.
- Test refactors to prefer accessible-name locators (`getByRole('dialog', { name: ... })`). Worth doing later; not required to unblock CI.
- Other "always rendered" dialog-like components — none identified.

## Verification

1. `npx playwright test tests/e2e/member-modal.spec.ts tests/e2e/responsive/member-modal.spec.ts` — the 8 failing tests pass on both projects.
2. Manual: open the nav-drawer in the browser. Focus trap still works, ESC still closes, the drawer is still announced as a dialog by a screen reader when opened.
3. Manual: when the drawer is closed, DevTools shows `<div id="nav-drawer" inert aria-label="Navigation menu" class="nav-drawer">` (no `role`, no `aria-modal`).

## Risks

- **Screen-reader behaviour while transitioning.** Switching `role` mid-close might confuse some AT, but the drawer is `inert` during the close transition, so it's already removed from the a11y tree.
- **Animation timing.** If CSS transitions read `role` attribute selectors (`[role="dialog"]`) the closing animation could change — checked: `nav-drawer.css` does not use any role/aria attribute selectors, only class-based selectors.
