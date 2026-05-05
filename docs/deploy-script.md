# `scripts/deploy.ps1` — automated deploy

One-shot script that runs the full `docs/deploy.md` Section B (routine deploy)
flow from a single `deploy.zip`. Snapshots, swaps, builds, smoke-tests, and
auto-rolls back on failure.

For first-time setup of a fresh box (IIS bindings, TLS, service registration),
follow `docs/deploy.md` Section A. This script handles every deploy after.

---

## Prerequisites

On the target box:

- Windows + PowerShell 5+ (or 7+)
- `C:\Windows\System32\tar.exe` (bsdtar — ships with Windows 10/11 + Server 2019+)
- `C:\nssm\nssm.exe` (override with `-NssmPath`)
- Node 20+ installed at `C:\Program Files\nodejs\` (the default Windows
  installer path — `scripts\install-service.ps1` hardcodes
  `C:\Program Files\nodejs\node.exe` for the service executable; custom
  install directories such as nvm will pass `npm ci`/`npm run build` but
  cause the service registration step to fail)
- Service `TheSouthernCrossUK` already registered (or accept that the script
  registers it on first run via `scripts\install-service.ps1`)

Confirm with `.\scripts\check-deploy-prereqs.ps1` before first use.

---

## Usage

### Routine deploy (on-box copy from previous release)

```powershell
PowerShell -ExecutionPolicy Bypass -File C:\inetpub\wwwroot\scripts\deploy.ps1 `
    -ZipPath C:\deploy\deploy.zip
```

The script lives at `C:\inetpub\wwwroot\scripts\deploy.ps1` from the previous
deploy and is safe to run while wwwroot is being renamed (PowerShell loads
`.ps1` into memory before executing).

> **Warning — script is one release behind:** the routine deploy executes the
> `deploy.ps1` that shipped with the *previous* release. If the release being
> deployed contains a fix to `deploy.ps1` itself, the fixed script will not
> run this time — it will only take effect on the *next* deploy. For the first
> deploy of any `deploy.ps1` fix, use the first-time bootstrap path below
> (extract `scripts\` from the new zip and invoke from `C:\deploy\scripts\`)
> so the corrected script runs immediately.

### First-time deploy (no on-box copy yet)

Extract just the `scripts\` folder from the zip, then run:

```powershell
& C:\Windows\System32\tar.exe -xf C:\deploy\deploy.zip -C C:\deploy scripts
PowerShell -ExecutionPolicy Bypass -File C:\deploy\scripts\deploy.ps1 `
    -ZipPath C:\deploy\deploy.zip `
    -HealthUrl http://127.0.0.1:3000/api/health
```

Use the loopback `HealthUrl` until TLS is in place
(`docs/deploy.md` Section A.9).

---

## Parameters

| Name                  | Default                                       | Notes |
| --------------------- | --------------------------------------------- | ----- |
| `-ZipPath`            | _required_                                    | Path to `deploy.zip`. |
| `-SiteRoot`           | `C:\inetpub\wwwroot`                          | Live install dir. |
| `-ServiceName`        | `TheSouthernCrossUK`                          | nssm-managed Windows service. |
| `-HealthUrl`          | `https://thesoutherncross.uk/api/health`      | Smoke-test target; expects 200 + `"ok":true`. |
| `-NssmPath`           | `C:\nssm\nssm.exe`                            | Override if installed elsewhere. |
| `-SkipRollback`       | _off_                                         | Leave broken install in place for forensics. |
| `-PruneOlderThanDays` | `7`                                           | Delete `wwwroot-prev-*` older than N days. `0` keeps all. |

---

## What it does

1. Validates inputs, locates `tar.exe` and `nssm.exe`.
2. Extracts `deploy.zip` to `%TEMP%\thesoutherncross-staging-<ts>\`.
3. `nssm stop TheSouthernCrossUK` (skipped if service not installed).
4. Kills any lingering `node.exe` / `tsx` (releases file locks on `.exe`s
   under `node_modules\`).
5. Renames `C:\inetpub\wwwroot` → `C:\inetpub\wwwroot-prev-<ts>` (rollback target).
6. Moves staging into place as the new `wwwroot`.
7. Restores `.env` and `data\` from the snapshot. Prints a warning if either
   is missing (first-time deploy).
8. `npm ci --include=dev` then `npm run build` inside the new `wwwroot`.
9. Runs `scripts\install-service.ps1`. Idempotent: registers the service on
   first run, refreshes `AppEnvironmentExtra` from `.env` and restarts on
   subsequent runs (so secret rotation needs no extra step).
10. `nssm start TheSouthernCrossUK`.
11. Polls `HealthUrl` every 5s for up to 60s. Pass = 200 + `"ok":true`.
12. Prunes `wwwroot-prev-*` older than `-PruneOlderThanDays`.

Each step prints a `==> ...` banner; sub-results print indented in green
(success) or yellow (informational).

---

## Auto-rollback

Any failure after the snapshot is taken (npm ci, build, install-service, smoke
test) triggers rollback unless `-SkipRollback` is passed:

1. `nssm stop TheSouthernCrossUK`
2. Delete the broken new `wwwroot`.
3. `Rename-Item wwwroot-prev-<ts> -> wwwroot` (the snapshot becomes live again).
4. `nssm start TheSouthernCrossUK`.

Total rollback time: a few seconds. The previous `node_modules` and `.next/`
are intact in the snapshot, so no re-build is required.

If rollback itself fails, the `==>` log shows where it stopped — the snapshot
is still on disk at `wwwroot-prev-<ts>` and can be restored manually.

---

## Examples

**Routine deploy, public-domain smoke test:**
```powershell
.\scripts\deploy.ps1 -ZipPath C:\deploy\deploy.zip
```

**First-time deploy, loopback smoke test:**
```powershell
.\scripts\deploy.ps1 -ZipPath C:\deploy\deploy.zip `
    -HealthUrl http://127.0.0.1:3000/api/health
```

**Investigate a smoke-test failure (no rollback):**
```powershell
.\scripts\deploy.ps1 -ZipPath C:\deploy\deploy.zip -SkipRollback
# inspect logs\nssm.err.log, logs\app.log, then either fix or:
nssm stop TheSouthernCrossUK
Remove-Item -Recurse -Force C:\inetpub\wwwroot
Rename-Item C:\inetpub\wwwroot-prev-<ts> wwwroot
nssm start TheSouthernCrossUK
```

**Keep all snapshots (e.g. on a busy week):**
```powershell
.\scripts\deploy.ps1 -ZipPath C:\deploy\deploy.zip -PruneOlderThanDays 0
```

---

## Failure modes and recovery

| Failure                                 | Script behavior                                                | Operator action |
| --------------------------------------- | -------------------------------------------------------------- | --------------- |
| Zip not found / corrupt                 | Aborts before any state change.                                | Re-transfer the bundle. |
| `tar.exe` missing                        | Aborts before any state change.                                | `tar.exe` (bsdtar) is an OS-provided prerequisite on Windows 10/11 and Server 2019+; `install-prereqs.ps1` does not install it. Upgrade the OS or obtain bsdtar separately. |
| `nssm.exe` missing                       | Aborts before any state change.                                | Run `scripts\install-prereqs.ps1`. |
| Lingering `node.exe` locking files      | Force-killed automatically.                                    | None — script handles it. |
| `Rename-Item` on `wwwroot` fails (lock) | Aborts after the service is stopped and lingering node processes are killed; the site is down. | Find the lock holder via `handle.exe`, clear it, then restart the service manually: `nssm start TheSouthernCrossUK`. Reboot if the lock cannot be cleared. |
| `npm ci` fails (EPERM / network)        | Rollback. Snapshot restored. Service running on old version.   | Investigate, re-deploy. |
| `npm run build` fails                   | Rollback. Snapshot restored.                                   | Fix in dev, re-build bundle. |
| `install-service.ps1` fails             | Rollback.                                                      | Check nssm install / `.env` parsing. |
| Smoke test fails (60s)                  | Rollback. Old service running.                                 | After automatic rollback the failed install is deleted — there is no snapshot to inspect. To preserve the broken install for forensics, re-run with `-SkipRollback`, then tail `logs\nssm.err.log` and `logs\app.log` from the live (broken) `wwwroot`. Remember to roll back manually afterwards. |

---

## Building a new bundle

Producing `deploy.zip` lives in `docs/deploy.md` Section B.2. Until that's
automated separately, run on dev:

```powershell
npm run typecheck
npm run test
npm run test:e2e
npm run build
# then the staging + zip block from deploy.md B.2
```

Transfer `deploy.zip` to the box, run this script.
