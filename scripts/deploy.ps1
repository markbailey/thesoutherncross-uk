# Deploy thesoutherncross.uk from a deploy.zip bundle.
#
# Implements docs/deploy.md Section B (routine deploy) end-to-end:
#   1. Extracts deploy.zip to a TEMP staging dir
#   2. Stops the Windows service
#   3. Renames the current site root to wwwroot-prev-<ts> (rollback target)
#   4. Moves staging into place as the new site root
#   5. Restores .env, web.config, and data\ from snapshot; validates required env keys
#   6. Runs `npm ci --include=dev` and `npm run build`
#   7. Runs install-service.ps1 (idempotent: registers or refreshes env)
#   8. Starts the service and polls /api/health for up to 60s
#   9. Auto-rolls back on smoke-test failure (unless -SkipRollback)
#  10. Prunes wwwroot-prev-* snapshots older than -PruneOlderThanDays days
#
# This script ships INSIDE deploy.zip at scripts\deploy.ps1. It self-extracts
# the bundle to TEMP first, so it is safe to invoke the on-box copy at
# C:\inetpub\wwwroot\scripts\deploy.ps1 even though that directory will be
# renamed mid-run (PowerShell loads .ps1 files into memory before executing).
#
# Usage:
#   PowerShell -ExecutionPolicy Bypass -File .\scripts\deploy.ps1 `
#       -ZipPath C:\deploy\deploy.zip
#
# First-time bootstrap (no on-box copy yet):
#   & C:\Windows\System32\tar.exe -xf C:\deploy\deploy.zip -C C:\deploy scripts
#   PowerShell -ExecutionPolicy Bypass -File C:\deploy\scripts\deploy.ps1 `
#       -ZipPath C:\deploy\deploy.zip
#
# Smoke test target defaults to the public HTTPS endpoint. For a first-time
# deploy before TLS is set up, override with:
#   -HealthUrl http://127.0.0.1:3000/api/health

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)] [string] $ZipPath,
    [string] $SiteRoot           = 'C:\inetpub\wwwroot',
    [string] $ServiceName        = 'TheSouthernCrossUK',
    [string] $HealthUrl          = 'https://thesoutherncross.uk/api/health',
    [string] $NssmPath           = 'C:\nssm\nssm.exe',
    [string] $NodeExe            = 'C:\Program Files\nodejs\node.exe',
    [switch] $SkipRollback,
    [int]    $PruneOlderThanDays = 7
)

$ErrorActionPreference = 'Stop'

# --- helpers ----------------------------------------------------------------

function Step($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "    $m" -ForegroundColor Green }
function Note($m) { Write-Host "    $m" -ForegroundColor Yellow }
function Die($m)  { Write-Host "!!! $m" -ForegroundColor Red; throw $m }

function Test-ServiceExists([string] $name) {
    $null -ne (Get-Service -Name $name -ErrorAction SilentlyContinue)
}

function Test-Health([string] $url) {
    try {
        $r = Invoke-WebRequest $url -TimeoutSec 10
        if ($r.StatusCode -ne 200) { return $false }
        return [bool] ($r.Content | ConvertFrom-Json).ok
    } catch { return $false }
}

# --- preflight --------------------------------------------------------------

if (-not (Test-Path $ZipPath))   { Die "Zip not found: $ZipPath" }
$ZipPath = (Resolve-Path $ZipPath).Path

$tar = 'C:\Windows\System32\tar.exe'
if (-not (Test-Path $tar))       { Die "bsdtar not found at $tar (Windows 10+ ships with it)" }
if (-not (Test-Path $NssmPath))  { Die "nssm not found at $NssmPath - run install-prereqs.ps1 first" }

$ts        = Get-Date -Format 'yyyyMMdd-HHmmss'
$parent    = Split-Path -Parent $SiteRoot
$leaf      = Split-Path -Leaf   $SiteRoot
$prevLeaf  = "$leaf-prev-$ts"
$prev      = Join-Path $parent $prevLeaf
$staging   = Join-Path $env:TEMP "thesoutherncross-staging-$ts"

# Move cwd outside $SiteRoot so the rename can succeed even when invoked from
# inside wwwroot or wwwroot\scripts.
Push-Location $env:TEMP

Step "Deploy starting at $ts"
Write-Host "    Bundle:    $ZipPath"
Write-Host "    Site root: $SiteRoot"
Write-Host "    Snapshot:  $prev"
Write-Host "    Service:   $ServiceName"
Write-Host "    Health:    $HealthUrl"

# --- extract bundle to staging ---------------------------------------------

Step "Extracting bundle to $staging"
if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
New-Item -ItemType Directory -Force -Path $staging | Out-Null
& $tar -xf $ZipPath -C $staging
if ($LASTEXITCODE -ne 0)                                { Die "tar extraction failed (exit $LASTEXITCODE)" }
if (-not (Test-Path (Join-Path $staging 'package.json'))) { Die "Bundle missing package.json - wrong zip?" }
Ok "Extracted"

# --- stop service + kill lingering node ------------------------------------

$serviceExists = Test-ServiceExists $ServiceName
if ($serviceExists) {
    Step "Stopping $ServiceName"
    & $NssmPath stop $ServiceName 2>&1 | Out-Null
    Start-Sleep -Seconds 2
} else {
    Note "$ServiceName not installed - treating as first-time deploy"
}

# Scope kill to processes whose command line or executable path references
# $SiteRoot to avoid taking down unrelated Node services on a shared host.
$lingering = Get-Process node, tsx -ErrorAction SilentlyContinue |
    Where-Object {
        $wmi = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)" -ErrorAction SilentlyContinue
        $wmi -and $wmi.ExecutablePath -and
            ($wmi.CommandLine -like "*$SiteRoot*" -or
             ($wmi.ExecutablePath -like "$SiteRoot*"))
    }
if ($lingering) {
    Note "Killing lingering node/tsx pids scoped to ${SiteRoot}: $($lingering.Id -join ', ')"
    $lingering | Stop-Process -Force
    Start-Sleep -Seconds 1
}

# --- snapshot current install ----------------------------------------------

$snapshotted = $false
if (Test-Path $SiteRoot) {
    Step "Snapshotting $SiteRoot -> $prevLeaf"
    try {
        Rename-Item -LiteralPath $SiteRoot -NewName $prevLeaf
        $snapshotted = $true
    } catch {
        if ($serviceExists) { & $NssmPath start $ServiceName 2>&1 | Out-Null }
        Die "Failed to snapshot ${SiteRoot}: $_"
    }
}

# --- rollback (closes over $prev, $SiteRoot, etc.) -------------------------

function Invoke-Rollback {
    if (-not $snapshotted) {
        Note "Rollback requested but no snapshot exists (first-time deploy)"
        return
    }
    # Wrap so a rollback failure doesn't propagate and mask the original error.
    try {
        Step "Rolling back to $prevLeaf"
        & $NssmPath stop $ServiceName 2>&1 | Out-Null
        Start-Sleep -Seconds 2
        if (Test-Path $SiteRoot) { Remove-Item -Recurse -Force $SiteRoot -ErrorAction SilentlyContinue }
        Rename-Item -LiteralPath $prev -NewName $leaf
        & $NssmPath start $ServiceName 2>&1 | Out-Null
        Note "Rolled back. Site restored to $SiteRoot. Investigate before retry (use -SkipRollback to suppress auto-rollback)."
    } catch {
        Note "Rollback failed: $_. Snapshot remains at $prev - restore manually."
    }
}

# --- swap staging -> SiteRoot (rollback on failure) ------------------------

Step "Installing new bundle to $SiteRoot"
$requiredEnvKeys = @('REFRESH_SECRET', 'STEAM_API_KEY', 'STEAM_GROUP_ID')
try {
    Move-Item -LiteralPath $staging -Destination $SiteRoot
    New-Item -ItemType Directory -Force -Path (Join-Path $SiteRoot 'logs') | Out-Null
    # Reset ACL inheritance from parent so IIS can serve the new wwwroot.
    & icacls $SiteRoot /reset /t /c /q | Out-Null
    if ($LASTEXITCODE -ne 0) { Die "icacls ACL reset failed (exit $LASTEXITCODE)" }
} catch {
    if (-not $SkipRollback) { Invoke-Rollback }
    Die "Failed to install bundle to ${SiteRoot}: $_"
}

# --- restore stateful files from snapshot (rollback on failure) ------------

try {
    if ($snapshotted) {
        $envSrc = Join-Path $prev '.env'
        if (Test-Path $envSrc) {
            Copy-Item $envSrc (Join-Path $SiteRoot '.env') -Force
            Ok ".env restored from snapshot"
        } else {
            Note "No .env in snapshot - $SiteRoot\.env must hold prod values before service start"
        }

        # Preserve on-box web.config — it may contain local IIS/TLS tweaks that
        # the bundle copy must not overwrite.
        $webConfigSrc = Join-Path $prev 'web.config'
        if (Test-Path $webConfigSrc) {
            Copy-Item $webConfigSrc (Join-Path $SiteRoot 'web.config') -Force
            Ok "web.config preserved from snapshot"
        }

        $dataSrc = Join-Path $prev 'data'
        if (Test-Path $dataSrc) {
            Copy-Item $dataSrc $SiteRoot -Recurse -Force
            Ok "data\ restored from snapshot"
        }
    }

    # Validate required env keys on every deploy so missing credentials are
    # caught before the build — /api/health does not check Steam/refresh keys.
    $envFile = Join-Path $SiteRoot '.env'
    $missingKeys = @()
    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile -Raw
        foreach ($key in $requiredEnvKeys) {
            if ($envContent -notmatch "(?m)^$key=.+") { $missingKeys += $key }
        }
    } else {
        $missingKeys = $requiredEnvKeys
    }
    if ($missingKeys.Count -gt 0) {
        Note "Missing required env keys: $($missingKeys -join ', ')"
        Note "Edit $envFile and set these values, then press Enter to continue (or Ctrl+C to abort)."
        Read-Host "Press Enter once .env is ready"
        $envContent = if (Test-Path $envFile) { Get-Content $envFile -Raw } else { '' }
        $stillMissing = $missingKeys | Where-Object { $envContent -notmatch "(?m)^$_=.+" }
        if ($stillMissing.Count -gt 0) {
            if (-not $SkipRollback) { Invoke-Rollback }
            Die "Required env keys still missing after edit: $($stillMissing -join ', ')"
        }
    }
} catch {
    if (-not $SkipRollback) { Invoke-Rollback }
    Die "Failed to restore stateful files: $_"
}

# --- npm ci + build (rollback on failure) ----------------------------------

Push-Location $SiteRoot
$buildOk = $false
try {
    Step "npm ci --include=dev"
    & npm ci --include=dev
    if ($LASTEXITCODE -ne 0) { Die "npm ci failed (exit $LASTEXITCODE)" }

    Step "npm run build"
    & npm run build
    if ($LASTEXITCODE -ne 0) { Die "npm run build failed (exit $LASTEXITCODE)" }
    $buildOk = $true
} finally {
    Pop-Location
    if (-not $buildOk -and -not $SkipRollback) { Invoke-Rollback }
}

# --- register / refresh service env from .env ------------------------------

$installScript = Join-Path $SiteRoot 'scripts\install-service.ps1'
if (-not (Test-Path $installScript)) {
    if (-not $SkipRollback) { Invoke-Rollback }
    Die "scripts\install-service.ps1 missing in bundle"
}

Step "install-service.ps1 (registers service or refreshes env from .env)"
& PowerShell -ExecutionPolicy Bypass -File $installScript `
    -ServiceName $ServiceName `
    -SiteRoot    $SiteRoot `
    -NssmPath    $NssmPath `
    -NodeExe     $NodeExe
if ($LASTEXITCODE -ne 0) {
    if (-not $SkipRollback) { Invoke-Rollback }
    Die "install-service.ps1 failed (exit $LASTEXITCODE)"
}

# install-service.ps1 restarts the service when re-run on an existing install,
# but leaves it stopped on first install. Start it unconditionally.
Step "Starting $ServiceName"
& $NssmPath start $ServiceName 2>&1 | Out-Null

# --- smoke test (poll up to 60s) -------------------------------------------

Step "Smoke test: $HealthUrl"
$ok = $false
for ($i = 0; $i -lt 12 -and -not $ok; $i++) {
    Start-Sleep -Seconds 5
    $ok = Test-Health $HealthUrl
    if (-not $ok) { Note "  attempt $($i + 1)/12 - not healthy yet" }
}
if (-not $ok) {
    Note "Smoke test failed after 60s"
    if (-not $SkipRollback) { Invoke-Rollback }
    Die "Deploy failed smoke test."
}
Ok "Smoke test passed"

# --- prune old snapshots ---------------------------------------------------

if ($PruneOlderThanDays -gt 0) {
    $cutoff = (Get-Date).AddDays(-$PruneOlderThanDays)
    $old = Get-ChildItem -Path $parent -Directory -Filter "$leaf-prev-*" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoff -and $_.FullName -ne $prev }
    if ($old) {
        Step "Pruning $($old.Count) snapshot(s) older than $PruneOlderThanDays day(s)"
        foreach ($s in $old) {
            Remove-Item $s.FullName -Recurse -Force
            Ok "removed $($s.Name)"
        }
    }
}

Pop-Location

Write-Host ''
Write-Host "Deploy complete." -ForegroundColor Green
if ($snapshotted) {
    $retention = if ($PruneOlderThanDays -eq 0) { 'indefinitely (auto-prune disabled)' } else { "for $PruneOlderThanDays day(s)" }
    Write-Host "  Snapshot:  $prev" -ForegroundColor Green
    Write-Host "  (kept $retention; delete sooner once verified stable)" -ForegroundColor Green
} else {
    Write-Host "  Snapshot:  (none - first-time deploy)" -ForegroundColor Green
}
