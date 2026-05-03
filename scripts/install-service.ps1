# Register the Next.js custom server as a Windows Service via nssm.
#
# Run from an admin PowerShell on the remote IIS box:
#   PowerShell -ExecutionPolicy Bypass -File .\install-service.ps1
#
# Idempotent: if the service already exists, prints a message and exits 0.
# To re-create from scratch, run `nssm remove TheSouthernCrossUK confirm`
# then re-run this script.
#
# --- Choices documented inline ----------------------------------------------
#
# Entrypoint: this script wires the service to run `node` against tsx's actual
# CLI entry file (node_modules\tsx\dist\cli.mjs) executing `server.ts`.
# Rationale: `tsx` lives in devDependencies, and the deploy runbook requires
# `npm ci --include=dev` so its package is present at runtime. We point node
# at tsx's real .mjs entry - NOT the .bin\tsx shim, which is a CMD wrapper
# (.cmd) on Windows and would fail to parse as JavaScript.
# If you flip tsx to dependencies or pre-compile server.ts to JS, update
# $appExe / $appArgs below accordingly.
#
# Env vars: this script does NOT inline any secrets. It reads `.env` at the
# site root (line-delimited KEY=VALUE) and passes the lines through to
# `nssm set ... AppEnvironmentExtra`. If `.env` is missing, the service is
# still created but will fail to start usefully - operator must populate
# `.env` and run `nssm restart TheSouthernCrossUK`. Editing later: either
# update `.env` and re-run this script, or use `nssm edit TheSouthernCrossUK`
# (interactive GUI).
# ----------------------------------------------------------------------------

$ErrorActionPreference = 'Stop'

# --- Parameters (override at top of script if your layout differs) ----------
$svc      = 'TheSouthernCrossUK'
$siteRoot = 'C:\inetpub\wwwroot'
$nssm     = 'C:\nssm\nssm.exe'
$nodeExe  = 'C:\Program Files\nodejs\node.exe'

# Entrypoint: node + tsx CLI .mjs + server.ts. See "Choices" comment above.
$tsxCli   = Join-Path $siteRoot 'node_modules\tsx\dist\cli.mjs'
$appExe   = $nodeExe
$appArgs  = "`"$tsxCli`" server.ts"

$logsDir  = Join-Path $siteRoot 'logs'
$envFile  = Join-Path $siteRoot '.env'

# --- Sanity checks ----------------------------------------------------------
if (-not (Test-Path $nssm))    { throw "nssm.exe not found at $nssm. Run install-prereqs.ps1 first." }
if (-not (Test-Path $nodeExe)) { throw "node.exe not found at $nodeExe. Run install-prereqs.ps1 first." }
if (-not (Test-Path $siteRoot)) { throw "Site root $siteRoot does not exist. Create it and extract the deploy bundle first." }

# Logs dir must exist before nssm starts writing to it.
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

# --- Idempotency: if service exists, update env from .env and exit ---------
# nssm AppEnvironmentExtra is registry-stored at install time and does NOT
# auto-reload from .env. To rotate secrets we re-set it, then restart.
$existing = Get-Service -Name $svc -ErrorAction SilentlyContinue
if ($existing) {
    "Service '$svc' already exists (status: $($existing.Status))."
    "Refreshing AppEnvironmentExtra from $envFile and restarting..."
    $refresh = @('NODE_ENV=production','PORT=3000','TRUST_PROXY_HEADERS=1')
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            $line = $_.Trim()
            if (-not $line) { return }
            if ($line.StartsWith('#')) { return }
            if ($line -match '^[A-Z_][A-Z0-9_]*=') { $refresh += $line }
        }
    } else {
        Write-Warning ".env not found at $envFile - only NODE_ENV/PORT/TRUST_PROXY_HEADERS will be set."
    }
    & $nssm set $svc AppEnvironmentExtra ($refresh -join "`n")
    & $nssm restart $svc
    "Done. To re-create from scratch: nssm stop $svc; nssm remove $svc confirm; re-run this script."
    exit 0
}

# --- Install service --------------------------------------------------------
"Installing service '$svc'..."
& $nssm install $svc $appExe $appArgs
& $nssm set    $svc AppDirectory       $siteRoot
& $nssm set    $svc DisplayName        'The Southern Cross UK (Next.js)'
& $nssm set    $svc Description        'Next.js custom server for thesoutherncross.uk; reverse-proxied by IIS on 80/443.'
& $nssm set    $svc Start              SERVICE_AUTO_START

# --- Logging: stdout + stderr -> rotating files in logs\ --------------------
& $nssm set    $svc AppStdout          (Join-Path $logsDir 'nssm.out.log')
& $nssm set    $svc AppStderr          (Join-Path $logsDir 'nssm.err.log')
& $nssm set    $svc AppRotateFiles     1
& $nssm set    $svc AppRotateOnline    1
& $nssm set    $svc AppRotateBytes     10485760   # 10 MB
& $nssm set    $svc AppStdoutCreationDisposition 4
& $nssm set    $svc AppStderrCreationDisposition 4

# --- Restart policy: always restart, 5s delay ------------------------------
& $nssm set    $svc AppExit Default    Restart
& $nssm set    $svc AppRestartDelay    5000

# --- Environment ------------------------------------------------------------
# Always-set baseline values. Secrets come from .env below.
$envLines = @(
    'NODE_ENV=production',
    'PORT=3000',
    'TRUST_PROXY_HEADERS=1'
)

if (Test-Path $envFile) {
    "Reading env from $envFile..."
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        # skip blanks and comments
        if (-not $line) { return }
        if ($line.StartsWith('#')) { return }
        # only pass lines that look like KEY=VALUE
        if ($line -match '^[A-Z_][A-Z0-9_]*=') {
            $envLines += $line
        }
    }
} else {
    Write-Warning ".env not found at $envFile. The service will start but STEAM_API_KEY/STEAM_GROUP_ID/REFRESH_SECRET will be unset."
    Write-Warning "Create $envFile with those values, then run: nssm restart $svc"
}

# nssm AppEnvironmentExtra wants a single string with entries separated by
# newlines (\n). Splatting an array passes only the first element, which
# would silently drop every secret after the first.
$envString = $envLines -join "`n"
& $nssm set $svc AppEnvironmentExtra $envString

# --- Done -------------------------------------------------------------------
''
"Service '$svc' installed."
"  Start it with:    nssm start $svc"
"  View status:      nssm status $svc"
"  Edit interactively: nssm edit $svc"
"  Tail stdout:      Get-Content -Wait '$logsDir\nssm.out.log'"
"  Tail stderr:      Get-Content -Wait '$logsDir\nssm.err.log'"
