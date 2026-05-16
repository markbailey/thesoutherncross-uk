# GitHub Actions Release Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a GitHub Actions workflow that fires on every push to `main`, detects the semver bump from conventional commits, updates `package.json`, builds the project, and publishes a GitHub Release with `deploy.zip` attached.

**Architecture:** A single workflow file (`.github/workflows/release.yml`) on `ubuntu-latest`. Loop prevention is handled natively by GitHub skipping runs whose HEAD commit message contains `[skip ci]`. A cross-platform fix to `scripts/build-zip.mjs` is required before the workflow will succeed on Linux.

**Tech Stack:** GitHub Actions, Node 20, `npm version`, `gh` CLI (pre-installed on GitHub-hosted runners), bash.

---

## Files

| Action | Path |
|---|---|
| Modify | `scripts/build-zip.mjs` |
| Create | `.github/workflows/release.yml` |

---

## Task 1: Fix `scripts/build-zip.mjs` for Linux

`scripts/build-zip.mjs` hardcodes `C:\Windows\System32\tar.exe`. The GitHub Actions runner is `ubuntu-latest`; that path does not exist on Linux. Fix: detect platform at runtime.

**Files:**
- Modify: `scripts/build-zip.mjs`

- [ ] **Step 1: Open the file and locate the hardcoded tar path**

  The current line (line 7 in the file as of writing):
  ```js
  const tar = 'C:\\Windows\\System32\\tar.exe';
  ```

- [ ] **Step 2: Replace it with a platform-aware value**

  Replace that single line with:
  ```js
  const tar = process.platform === 'win32'
    ? 'C:\\Windows\\System32\\tar.exe'
    : 'tar';
  ```

  No other changes. The rest of the script passes `tar` as the executable to `execFileSync`, so this is the only change needed.

- [ ] **Step 3: Verify the script still runs locally (Windows)**

  From the repo root:
  ```
  npm run build:zip
  ```
  Expected: script completes, prints `Done: X.X MB -> ...\deploy.zip`, and `deploy.zip` exists in the repo root.

  If you only have Linux available, run:
  ```
  node scripts/build-zip.mjs /tmp/deploy-test.zip
  ```
  Expected: same success output, file created at `/tmp/deploy-test.zip`.

- [ ] **Step 4: Commit**

  ```bash
  git add scripts/build-zip.mjs
  git commit -m "fix: use system tar on linux in build-zip script"
  ```

---

## Task 2: Create `.github/workflows/release.yml`

Create the GitHub Actions workflow. There are no existing workflows in this repo — you are creating `.github/workflows/` from scratch.

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create the directory**

  ```bash
  mkdir -p .github/workflows
  ```

- [ ] **Step 2: Create `.github/workflows/release.yml` with this exact content**

  ```yaml
  name: Release

  on:
    push:
      branches: [main]

  permissions:
    contents: write

  jobs:
    release:
      runs-on: ubuntu-latest

      steps:
        - name: Checkout
          uses: actions/checkout@v4
          with:
            fetch-depth: 0

        - name: Set up Node
          uses: actions/setup-node@v4
          with:
            node-version: '20'

        - name: Detect bump type
          id: bump
          run: |
            MSG=$(git log -1 --pretty=%B)
            if echo "$MSG" | grep -qE '^[a-zA-Z]+(\(.+\))?!:' || echo "$MSG" | grep -qF 'BREAKING CHANGE:'; then
              echo "type=major" >> "$GITHUB_OUTPUT"
            elif echo "$MSG" | grep -qE '^feat(\(.+\))?:'; then
              echo "type=minor" >> "$GITHUB_OUTPUT"
            else
              echo "type=patch" >> "$GITHUB_OUTPUT"
            fi

        - name: Bump version in package.json
          id: version
          run: |
            npm version ${{ steps.bump.outputs.type }} --no-git-tag-version
            echo "new=$(node -p "require('./package.json').version")" >> "$GITHUB_OUTPUT"

        - name: Install dependencies
          run: npm ci

        - name: Build
          run: npm run build

        - name: Build zip
          run: npm run build:zip

        - name: Commit, tag, and push
          run: |
            git config user.name "github-actions[bot]"
            git config user.email "github-actions[bot]@users.noreply.github.com"
            git add package.json package-lock.json
            git commit -m "chore: bump version to v${{ steps.version.outputs.new }} [skip ci]"
            git tag "v${{ steps.version.outputs.new }}"
            git push origin main --follow-tags

        - name: Create GitHub release
          env:
            GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          run: |
            gh release create "v${{ steps.version.outputs.new }}" deploy.zip \
              --title "v${{ steps.version.outputs.new }}" \
              --generate-notes
  ```

  **Key decisions explained:**
  - `fetch-depth: 0` — fetches full history so `--generate-notes` can find the previous tag and `git log` works reliably.
  - `actions/checkout@v4` with default `GITHUB_TOKEN` has write access when `permissions: contents: write` is set — no PAT needed.
  - `npm version --no-git-tag-version` updates `package.json` and `package-lock.json` but does not create a git commit or tag — we do that manually to control the `[skip ci]` suffix.
  - Both `package.json` and `package-lock.json` are staged: `npm version` updates both files, and committing only one would leave the lockfile version out of sync.
  - `git push origin main --follow-tags` pushes the bump commit and the annotated tag in one operation.
  - `GH_TOKEN` is passed as an env var named `GH_TOKEN` — that is the variable name the `gh` CLI looks for.

- [ ] **Step 3: Validate YAML syntax**

  If you have `actionlint` installed:
  ```bash
  actionlint .github/workflows/release.yml
  ```
  Expected: no errors.

  If not installed, at minimum check for correct indentation (YAML is sensitive to tabs vs spaces — all indentation must be spaces). You can paste the file into [yaml.me](https://yaml.me) or run:
  ```bash
  node -e "require('fs'); const yaml = require('js-yaml'); yaml.load(require('fs').readFileSync('.github/workflows/release.yml', 'utf8')); console.log('ok')"
  ```
  _(Requires `js-yaml` — skip if not available; the actionlint check is preferred.)_

- [ ] **Step 4: Commit**

  ```bash
  git add .github/workflows/release.yml
  git commit -m "ci: add release workflow"
  ```

---

## Task 3: End-to-end verification

After both tasks are committed and pushed to `main` (or merged via PR), verify the workflow runs correctly.

- [ ] **Step 1: Push to main and observe the Actions run**

  Navigate to `https://github.com/markbailey/thesoutherncross-uk/actions`. You should see a run named **Release** triggered by your push.

- [ ] **Step 2: Verify each job step passes**

  Expand the run and confirm:
  - **Detect bump type** — outputs `type=patch` (or `minor`/`major` depending on your commit message)
  - **Bump version in package.json** — outputs the new version (e.g. `new=1.2.1`)
  - **Build** — Next.js build completes without error
  - **Build zip** — prints `Done: X.X MB -> .../deploy.zip`
  - **Commit, tag, and push** — git push succeeds
  - **Create GitHub release** — URL to new release printed in step output

- [ ] **Step 3: Verify the release on GitHub**

  Navigate to `https://github.com/markbailey/thesoutherncross-uk/releases`. Confirm:
  - A new release named `vX.Y.Z` exists
  - `deploy.zip` is listed as an asset
  - Release notes are auto-generated (list of merged PRs/commits since last tag)

- [ ] **Step 4: Verify the bump commit did not re-trigger the workflow**

  In the Actions tab, confirm only one run was triggered. The bump commit contains `[skip ci]` so GitHub should have skipped a second run automatically.

- [ ] **Step 5: Verify `package.json` version on main**

  ```bash
  git pull origin main
  node -p "require('./package.json').version"
  ```
  Expected: the bumped version (e.g. `1.2.1`), matching the release tag.
