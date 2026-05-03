# thesoutherncross.uk - Operator Runbook

Single source of truth for deploying and operating the site on the guild's
Windows Server / IIS box.

| Setting           | Value                              |
| ----------------- | ---------------------------------- |
| Domain            | thesoutherncross.uk                |
| Site root         | `C:\inetpub\wwwroot`               |
| IIS site          | Default Web Site                   |
| Service name      | `TheSouthernCrossUK`               |
| Node bind         | `127.0.0.1:3000` (loopback only)   |
| Public ports      | 80, 443                            |
| nssm              | `C:\nssm\nssm.exe`                 |
| win-acme          | `C:\win-acme\wacs.exe`             |
| Node              | `C:\Program Files\nodejs\node.exe` |

> **Run section A from a single admin PowerShell session.** Some steps set
> variables that later steps consume; opening a fresh shell mid-flow loses
> them. Same for section B.

---

## A. First-time setup (fresh box, run once)

### 1. Verify prerequisites

From an admin PowerShell on the remote box:

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\check-deploy-prereqs.ps1
```

Expect all green: node, IIS, URL Rewrite, ARR (with proxy enabled), nssm,
win-acme. If anything is `MISSING`, run:

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\install-prereqs.ps1
```

then re-run the check.

### 2. Bind the public hostname to Default Web Site

```powershell
Import-Module WebAdministration

# Add the public hostname binding on port 80 (existing default-blank binding stays).
New-WebBinding -Name 'Default Web Site' -Protocol 'http' -Port 80 -HostHeader 'thesoutherncross.uk'

# Confirm the site is started
Start-Website -Name 'Default Web Site' -ErrorAction SilentlyContinue
Get-Website -Name 'Default Web Site' | Select-Object Name, State, @{N='Bindings';E={($_.Bindings.Collection).bindingInformation -join '; '}}

# Capture the site id for the win-acme step later in the same session.
$siteId = (Get-Website -Name 'Default Web Site').id
"Default Web Site id: $siteId"
```

`$siteId` is used in step 8.

### 3. Drop in `web.config`

Copy `web.config` from this repo into `C:\inetpub\wwwroot\`. It provides the
URL Rewrite rule that proxies to `http://127.0.0.1:3000`, the HTTP->HTTPS
redirect, security headers, and per-path cache rules.

If `wwwroot` contains the IIS placeholder files (`iisstart.htm`,
`iisstart.png`), they're harmless - the rewrite catches everything before
static-file serving sees them.

### 4. Create logs directory

```powershell
New-Item -ItemType Directory -Force -Path 'C:\inetpub\wwwroot\logs' | Out-Null
```

(Required by the service before it can start.)

### 5. Create `.env` at the site root

`C:\inetpub\wwwroot\.env` (literal values, no quotes):

```dotenv
STEAM_API_KEY=<your steam web api key>
STEAM_GROUP_ID=<group vanity name or 64-bit id>
REFRESH_SECRET=<random long string>
TRUST_PROXY_HEADERS=1
```

`PORT=3000` and `NODE_ENV=production` are set by the service script - don't
duplicate them here.

### 6. Extract the deploy bundle, install deps, build

See section B for how to produce `deploy.zip`. Extract its contents into
`C:\inetpub\wwwroot\`, then:

```powershell
cd C:\inetpub\wwwroot
npm ci --include=dev
npm run build
```

`--include=dev` is required because `tsx` is a devDependency and the service
runs `tsx server.ts` from `node_modules\tsx\dist\cli.mjs`.

### 7. Install the Windows Service

```powershell
PowerShell -ExecutionPolicy Bypass -File C:\inetpub\wwwroot\scripts\install-service.ps1
```

Reads `.env` and registers env vars on the service via
`nssm set ... AppEnvironmentExtra`. Re-running on an existing service
refreshes env from `.env` and restarts.

### 8. Start the service + tail the boot

```powershell
nssm start TheSouthernCrossUK
nssm status TheSouthernCrossUK   # expect: SERVICE_RUNNING
```

```powershell
Get-Content -Wait C:\inetpub\wwwroot\logs\nssm.out.log
```

You should see one `server listening` line then poller cycles every 60s.
Press `Ctrl+C` to stop tailing.

### 9. Issue TLS cert and bind 443

Using the `$siteId` captured in step 2:

```powershell
& C:\win-acme\wacs.exe --target iis --siteid $siteId `
                       --emailaddress mark.bailey@openasset.com `
                       --accepttos --installation iis
```

Confirm the `thesoutherncross.uk` hostname when prompted. win-acme installs a
daily renewal scheduled task automatically.

### 10. Firewall

`scripts\check-deploy-prereqs.ps1` reports the existing rules for ports
80/443. If `FW80` or `FW443` show 0 rules, open them:

```powershell
New-NetFirewallRule -DisplayName 'HTTP'  -Direction Inbound -Protocol TCP -LocalPort 80  -Action Allow
New-NetFirewallRule -DisplayName 'HTTPS' -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

Port 3000 stays internal because Node binds to `127.0.0.1` only.

### 11. Smoke test

```powershell
Invoke-WebRequest https://thesoutherncross.uk/api/health -UseBasicParsing | Select-Object StatusCode, Content
```

Expect `200` and a JSON body with `"ok":true`. If `dbOk` is true but `ok` is
false, the poller hasn't completed a cycle yet - wait 60s and retry.

---

## B. Routine deploy (every release)

### 1. On dev: gate the release

All three must pass:

```powershell
npm run test
npm run test:e2e
npm run build
```

### 2. Build the deploy bundle

From the repo root:

```powershell
$exclude = @('node_modules','.next','tests','data','logs','.git','playwright-report','test-results','coverage')
$staging = "$env:TEMP\thesoutherncross-deploy"
Remove-Item -Recurse -Force $staging -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $staging | Out-Null
Get-ChildItem -Force | Where-Object { $exclude -notcontains $_.Name } |
    Copy-Item -Destination $staging -Recurse -Force
Compress-Archive -Path "$staging\*" -DestinationPath ".\deploy.zip" -Force
```

`deploy.zip` contains source + `package.json` + `package-lock.json` +
`web.config` + `scripts\` but not `node_modules` or `.next` build output.
The remote box runs `npm ci` and `npm run build` itself.

### 3. Transfer to the remote box

RDP clipboard, shared folder, or any file copy tool of choice.

### 4. Deploy on the remote box

**Run all of step 4 in one PowerShell session.** `$ts` and `$prev` are set
in 4a and reused in 4c, 4d, 4f, and 4g.

#### 4a. Set rollback markers

```powershell
$ts   = Get-Date -Format 'yyyyMMdd-HHmmss'
$prev = "C:\inetpub\wwwroot-prev-$ts"
"Snapshot will be: $prev"
```

#### 4b. Stop the service

```powershell
nssm stop TheSouthernCrossUK
```

#### 4c. Snapshot current install

```powershell
Rename-Item C:\inetpub\wwwroot $prev
New-Item -ItemType Directory -Force -Path 'C:\inetpub\wwwroot\logs' | Out-Null
```

#### 4d. Extract bundle, restore stateful files

```powershell
Expand-Archive -Path .\deploy.zip -DestinationPath C:\inetpub\wwwroot -Force

# Restore .env, web.config, and the SQLite DB from the snapshot.
# (web.config is in deploy.zip but the on-box copy may have local tweaks;
# preserve those if they exist, else use the bundle's copy.)
Copy-Item "$prev\.env"        'C:\inetpub\wwwroot\.env' -Force
if (Test-Path "$prev\data") {
    Copy-Item "$prev\data" 'C:\inetpub\wwwroot\' -Recurse -Force
}
```

#### 4e. Install + build

```powershell
cd C:\inetpub\wwwroot
npm ci --include=dev
npm run build
```

#### 4f. Start the service + smoke test

```powershell
nssm start TheSouthernCrossUK
Start-Sleep -Seconds 5
Invoke-WebRequest https://thesoutherncross.uk/api/health -UseBasicParsing | Select-Object StatusCode, Content
```

Expect `200` + `"ok":true`. If false:

#### 4g. Rollback (only if 4f failed)

```powershell
nssm stop TheSouthernCrossUK
Remove-Item -Recurse -Force C:\inetpub\wwwroot
Rename-Item $prev 'C:\inetpub\wwwroot'
nssm start TheSouthernCrossUK
```

### 5. Once the new deploy is verified stable (24h+)

Prune old snapshots:

```powershell
Get-ChildItem 'C:\inetpub\wwwroot-prev-*' -Directory |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
    Remove-Item -Recurse -Force
```

---

## C. Operations

### Logs

| File                                          | What                                              | Rotation          |
| --------------------------------------------- | ------------------------------------------------- | ----------------- |
| `C:\inetpub\wwwroot\logs\nssm.out.log`        | Service stdout (boot banner, console.log)         | 10 MB (nssm)      |
| `C:\inetpub\wwwroot\logs\nssm.err.log`        | Service stderr                                    | 10 MB (nssm)      |
| `C:\inetpub\wwwroot\logs\app.log`             | Pino structured app log (poller, requests, errors)| Daily (pino-roll) |

Tail any of them with:

```powershell
Get-Content -Wait C:\inetpub\wwwroot\logs\app.log
```

### Rotate Steam API key or REFRESH_SECRET

Env values are read at module-init via `@next/env`, so a service restart is
required. The install-service script's idempotent path refreshes env from
`.env` and restarts in one go:

```powershell
notepad C:\inetpub\wwwroot\.env
# After saving:
PowerShell -ExecutionPolicy Bypass -File C:\inetpub\wwwroot\scripts\install-service.ps1
```

Or, for a one-off interactive change, use nssm's GUI editor:

```powershell
nssm edit TheSouthernCrossUK
# (Environment tab -> edit -> OK)
nssm restart TheSouthernCrossUK
```

### SQLite backup

Recommended: nightly scheduled task copying all three WAL files while the
service runs (SQLite handles concurrent reads).

```powershell
$src    = 'C:\inetpub\wwwroot\data'
$dst    = 'C:\Backups\thesoutherncross'
$stamp  = Get-Date -Format 'yyyyMMdd'
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item "$src\app.sqlite"      "$dst\app.sqlite.$stamp"      -Force
Copy-Item "$src\app.sqlite-wal"  "$dst\app.sqlite-wal.$stamp"  -Force -ErrorAction SilentlyContinue
Copy-Item "$src\app.sqlite-shm"  "$dst\app.sqlite-shm.$stamp"  -Force -ErrorAction SilentlyContinue
```

For a quiesced backup, stop the service first:
`nssm stop TheSouthernCrossUK; Copy-Item ...; nssm start TheSouthernCrossUK`.

### Cert renewal

win-acme installs a daily scheduled task. Verify:

```powershell
Get-ScheduledTask | Where-Object TaskName -like 'win-acme*'
```

Force-renew now:

```powershell
& C:\win-acme\wacs.exe --renew --force
```

### Service control

```powershell
nssm start    TheSouthernCrossUK
nssm stop     TheSouthernCrossUK
nssm restart  TheSouthernCrossUK
nssm status   TheSouthernCrossUK
nssm dump     TheSouthernCrossUK    # show full config
```

### Uptime check

Recommended: UptimeRobot HTTPS GET against
`https://thesoutherncross.uk/api/health` every 5 minutes; alert on non-200.
The endpoint returns 503 when `dbOk` is false or the poller is more than
5 minutes stale.

---

## D. Verification checklist (post-deploy smoke tests)

Run after every routine deploy. Production-relevant subset of the plan's
[Verification](../plans/thesoutherncross-uk-website-plan.md#verification)
section.

- [ ] `https://thesoutherncross.uk/api/health` returns 200 and `"ok":true`
- [ ] `http://thesoutherncross.uk/` 301-redirects to `https://thesoutherncross.uk/`
- [ ] `nssm status TheSouthernCrossUK` reports `SERVICE_RUNNING`
- [ ] `logs\app.log` shows one poller cycle every ~60s for the last 5 minutes
- [ ] Landing page renders: sun, planets, orbits, no console errors
- [ ] `/_next/static/...` responses carry `Cache-Control: public, max-age=31536000, immutable`
- [ ] `/api/...` responses carry `Cache-Control: no-store`
- [ ] Response includes security headers: `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`
- [ ] Click a planet -> camera tweens, that planet's orbit pauses, overlay fades in
- [ ] Click a moon -> server detail panel opens, click-to-copy connect works
- [ ] Members section renders avatars and personas from the real Steam group
- [ ] Direct deep-link `/#/servers/<game>/<server>` focuses the right moon
- [ ] Direct deep-link `/#/members/<steamid>` highlights the right card
- [ ] Restart the service: `nssm restart TheSouthernCrossUK` -> site recovers, members + status load from cache on first hit
- [ ] securityheaders.com scan against the domain returns grade A
- [ ] Reboot the host: site auto-starts and `/api/health` is green within 60s
