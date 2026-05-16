# GitHub Actions Release Workflow — Design Spec

**Date:** 2026-05-08
**Status:** Approved

## Overview

A single GitHub Actions workflow that fires on every push to `main`, detects the appropriate semver bump from the commit message (conventional commits), updates `package.json`, runs a full build, and publishes a GitHub Release with `deploy.zip` attached.

---

## Trigger & Guard

- **Event:** `push` to `main`
- **Loop prevention:** GitHub natively skips workflow runs whose HEAD commit message contains `[skip ci]`. The bump commit uses this suffix, so the workflow never re-triggers itself.
- **Permissions:** `contents: write` — required to push the bump commit and create the release.

---

## Conventional Commit Parsing

Reads the most recent commit message via `git log -1 --pretty=%B` and applies these rules in order:

| Condition | Bump |
|---|---|
| Body/footer contains `BREAKING CHANGE:` OR subject ends with `!` | `major` |
| Subject matches `feat:` or `feat(...):` | `minor` |
| Anything else | `patch` |

Version is bumped with:
```
npm version <patch|minor|major> --no-git-tag-version
```
The `--no-git-tag-version` flag modifies `package.json` only; the commit and tag are created manually to control the commit message.

---

## Runner

`ubuntu-latest` (GitHub-hosted, default free tier).

---

## Build Steps

Run in sequence after the version bump:

1. `npm ci` — reproducible install from lockfile
2. `npm run build` — Next.js production build
3. `npm run build:zip` — produces `deploy.zip` in the repo root

### Known issue: `build:zip` tar path

`scripts/build-zip.mjs` currently hardcodes `C:\Windows\System32\tar.exe`. On `ubuntu-latest` this path does not exist; the script must be fixed to fall back to the system `tar` on Linux. This is a required change as part of implementation.

Fix: detect platform and use the appropriate tar binary:
```js
const tar = process.platform === 'win32'
  ? 'C:\\Windows\\System32\\tar.exe'
  : 'tar';
```

---

## Commit, Tag & Release

After a successful build:

1. **Commit** `package.json` with identity `github-actions[bot]` and message:
   `chore: bump version to vX.Y.Z [skip ci]`
2. **Tag** the commit: `git tag vX.Y.Z`
3. **Push** commit and tag: `git push origin main --follow-tags`
4. **Create release:**
   ```
   gh release create vX.Y.Z deploy.zip \
     --title "vX.Y.Z" \
     --generate-notes
   ```
   `--generate-notes` uses GitHub's built-in release notes generator (groups PRs and commits since last tag). `deploy.zip` is attached as the downloadable asset.

---

## Full Job Flow

```
push to main
  └─ [skip ci] in commit? → GitHub skips run automatically
  └─ detect bump type (major / minor / patch)
  └─ npm version <bump> --no-git-tag-version
  └─ npm ci
  └─ npm run build
  └─ npm run build:zip
  └─ git commit package.json + tag + push
  └─ gh release create vX.Y.Z deploy.zip --generate-notes
```

---

## File to Create

`.github/workflows/release.yml`

---

## Out of Scope

- Changelog file generation (covered by `--generate-notes`)
- Separate release branches
- Notifications / Slack integration
- Deployment after release
