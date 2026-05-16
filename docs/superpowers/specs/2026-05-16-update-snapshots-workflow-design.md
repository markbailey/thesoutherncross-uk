# Update Playwright Snapshots: bootstrap workflow

## Problem

Nine `toHaveScreenshot` tests across `tests/visual/` fail in CI because no baseline PNGs are committed to the repo. Each test fails twice (once per project — `chromium-desktop` + `chromium-mobile`), for 18 total failures.

`git ls-files "tests/**/*.png"` returns nothing. The visual specs were added before the responsive rebuild but baselines were never generated against the Linux CI rendering environment.

Generating baselines locally on a developer's Windows or macOS machine wouldn't match what the Linux runner produces (font rendering, sub-pixel positioning, swiftshader rasterisation), so the baselines must be generated **on the same kind of runner** that will later compare against them.

## Goal

Provide a one-shot mechanism to:
1. Run Playwright with `--update-snapshots` on an Ubuntu runner with the same configuration `release.yml` uses (swiftshader-enabled chromium, populated fixtures, `freezeScene`).
2. Open a pull request containing the resulting PNGs for human review before they land on `main`.
3. Be reusable for future re-baselines after intentional layout changes.

Out of scope: an automated "regenerate snapshots on every CI failure" loop. That tempts the team to rubber-stamp visual drift; this workflow is deliberately manual.

## Design

New workflow at `.github/workflows/update-snapshots.yml`:

- **Trigger:** `workflow_dispatch` (manual only). Optional `ref` input defaults to `main`.
- **Permissions:** `contents: write` + `pull-requests: write` — needed to push the branch and `gh pr create`.
- **Concurrency:** group `update-snapshots`, `cancel-in-progress: false` — back-to-back manual runs serialise, never collide on the same branch.

Steps:

| # | Step | Notes |
|---|---|---|
| 1 | `actions/checkout@v4` | Honours `inputs.ref`; `fetch-depth: 0` so `git status`/`git add` work cleanly. |
| 2 | `actions/setup-node@v4` | Node 20, `cache: 'npm'` (matches `release.yml`). |
| 3 | `npm ci` | Lockfile-respecting install. |
| 4 | `npx playwright install --with-deps chromium` | Same chromium PR #18 already taught CI to install. |
| 5 | `npx playwright test --update-snapshots` | Writes baselines for missing PNGs; updates existing ones if they drifted. Non-snapshot failures still abort. |
| 6 | Detect snapshot changes | `git status --porcelain tests/visual/` (recursive) parsed for `.png` lines; outputs `changed=true/false` and a list of files. |
| 7 | Conditional: commit + push + PR | Only runs when changes exist. New branch `snapshots/update-${{ github.run_id }}` (unique per run). `gh pr create` opens a PR back to `inputs.ref`. |

Staging discipline: `git add tests/visual/` — recursive add scoped to the snapshot directory. Playwright's default snapshot path template is `{testFileDir}/{testFileName}-snapshots/{arg}{ext}`, so baselines land in per-spec subdirectories under `tests/visual/` rather than flat — a non-recursive glob like `tests/visual/*.png` would miss them entirely (and fail outright when no top-level PNGs exist). Never `git add .` or `-A`.

### Why a separate workflow rather than extending `release.yml`

- Different trigger (`workflow_dispatch` vs `push`).
- Different permission scope (`pull-requests: write` not needed for releases).
- Mixing the two would either run snapshot regen on every merge to main (wasteful, churns PNGs) or hide a manual lever inside a release file (hard to discover).

### Why open a PR rather than committing straight to `main`

Snapshots are visual contracts. A drift between "what we want" and "what the page actually renders" should be eyeballed in the PR's image-diff viewer, not auto-merged. The release workflow auto-commits a version bump because that's a deterministic mechanical change; snapshot changes aren't.

### Why `[skip ci]` on the commit message

Defensive: the snapshot regeneration commit itself shouldn't trigger any future CI loop. The merge commit (when the PR lands) will run `release.yml` normally and that's the actual integration test that the new baselines work.

### Files added

- `.github/workflows/update-snapshots.yml` — single new file.

### Files unchanged

- `playwright.config.ts` — already configured for swiftshader (#25), `webServer.env.SESSION_SECRET` (#19), and `chromium-desktop` + `chromium-mobile` projects.
- All `tests/visual/*.spec.ts` — assertions stay as written.
- No other workflows.

### Out of scope

- The actual PNG files. They'll appear in the bot's PR after this workflow lands and gets dispatched once.
- Tagging visual specs `@desktop-only` to skip the mobile-side baselines. Deferred — initial assessment is that mobile baselines provide responsive regression coverage, even when the test name is scene-centric. Trim later if proven noisy.
- Updating the stale comment at `tests/e2e/responsive/system-cutoff.spec.ts:74-78` ("WebGL is not available in headless Chromium…"). Now inaccurate after #25 — separate follow-up.
- Git LFS for the PNGs. Visual baselines for this site are likely <50 KB each; the 18-file payload is small. Reconsider if/when baselines balloon.
- A pre-merge "compare snapshots" workflow that runs on PR opens. Useful but a separate piece of infrastructure.

## Verification

After this PR merges:

1. **Dispatch the workflow** from the GitHub Actions UI against `main` (default).
2. Workflow run completes, opens a new PR titled `chore: update playwright snapshots` with ~18 added PNGs under `tests/visual/`.
3. Review each PNG in the **Files changed** tab. Each `*-chromium-desktop.png` should show the desktop rendering of the section at 1440×900; each `*-chromium-mobile.png` should show it at 390×844.
4. Merge the bot's PR.
5. Next push to `main` runs `release.yml`. The `E2E tests` step now compares against the committed baselines and passes (or — if anything was genuinely wrong with the snapshots — fails with a pixel diff that's caught here rather than masked).

## Risks

- **Workflow_dispatch permissions.** `gh pr create` requires `pull-requests: write` on the workflow's `GITHUB_TOKEN`. This is set explicitly in the workflow's `permissions:` block. If the repo's "Workflow permissions" setting in Actions configuration is set to "Read repository contents permission only", the token won't get the requested scope and the `gh pr create` step will fail. If that bites, switch the repo setting to "Read and write permissions" or run the workflow under a PAT.
- **Non-snapshot regressions surface as workflow failures.** Intended: if something other than snapshot drift is broken, the regen aborts before committing wrong baselines. Workflow logs will show the failing test.
- **Snapshots drift after Playwright/chromium version bumps.** Standard Playwright issue — when `@playwright/test` is upgraded, baselines may need re-regenerating. This workflow exists precisely for that.
