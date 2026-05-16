# CI: Install Playwright browsers in Release workflow

## Problem

The `Release` workflow fails on the E2E test step:

```
Error: browserType.launch: Executable doesn't exist at
/home/runner/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell
```

`.github/workflows/release.yml` runs `npm ci` then `npm run test:e2e`, but never installs the Playwright browser binaries. `npm ci` installs the Node package only; browser binaries are a separate download.

## Goal

Make the E2E step pass on the GitHub Actions Ubuntu runner without changing test code, the Playwright version, or local-dev workflow.

## Design

Add a single step to `.github/workflows/release.yml` between `Install dependencies` (line 33) and `Test` (line 36):

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium
```

### Rationale

- **`chromium` only.** `playwright.config.ts:23` defines a single project, `chromium-desktop`. Installing Firefox/WebKit would waste ~150 MB and runner minutes.
- **`--with-deps`.** Ensures system libraries (fonts, libnss, etc.) are present. Ubuntu-latest images include most, but the flag is the documented safe default.
- **Step placement.** After `npm ci` (the binary must match the installed `@playwright/test` version) and before `Test`. The unit test step (`npm test`, Vitest) doesn't need browsers, but installing earlier keeps setup grouped and avoids a future foot-gun if unit tests start using browsers.
- **No caching.** The workflow runs only on `push` to `main` (release flow). Cache complexity isn't justified for a once-per-merge job.
- **No version pin in the workflow.** `npx playwright install` resolves to the version of `@playwright/test` already installed by `npm ci`, which is pinned by `package-lock.json`. Adding an explicit version would duplicate the source of truth.

### Files changed

- `.github/workflows/release.yml` — one new step (3 lines).

### Out of scope

- Caching the browser binaries (deferred until release cadence increases).
- Adding Firefox/WebKit projects.
- Splitting E2E into its own job/workflow.
- Any change to test files, `playwright.config.ts`, or `package.json`.

## Verification

1. After merging, the next push to `main` triggers `Release`.
2. The new step logs `Downloading Chromium ... done` (or hits the runner cache).
3. The `E2E tests` step (`npm run test:e2e`) completes without the "Executable doesn't exist" error.
4. The `responsive/nav-drawer.spec.ts` cases (the originally failing tests) pass.

## Risks

- **`--with-deps` requires sudo.** GitHub-hosted runners have it; self-hosted runners may not. This repo currently uses `ubuntu-latest` only (`release.yml:17`), so no impact.
- **Install adds ~30–60 s to every release run.** Acceptable: releases are infrequent and already include build + zip steps.
