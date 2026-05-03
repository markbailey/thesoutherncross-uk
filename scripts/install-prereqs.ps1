# Install deployment prerequisites on the remote IIS box.
# Run from an admin PowerShell:
#   PowerShell -ExecutionPolicy Bypass -File .\install-prereqs.ps1
#
# Idempotent: re-running it skips anything already installed.
# Reboot is NOT required after any of these steps.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'  # speeds up Invoke-WebRequest hugely

$tmp = 'C:\Temp\deploy-prereqs'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

function Test-Cmd { param($name) [bool](Get-Command $name -ErrorAction SilentlyContinue) }

# Download with retry - nssm.cc in particular returns 503 frequently.
function Get-FileWithRetry {
    param([string]$Uri, [string]$OutFile, [int]$MaxAttempts = 4)
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        try {
            Invoke-WebRequest -Uri $Uri -OutFile $OutFile -UseBasicParsing
            return $true
        } catch {
            Write-Warning "  attempt ${i}/${MaxAttempts} failed for $Uri : $($_.Exception.Message)"
            if ($i -lt $MaxAttempts) { Start-Sleep -Seconds (5 * $i) }
        }
    }
    return $false
}

# --- 1. Node.js 22 LTS ----------------------------------------------------
$nodeExe = 'C:\Program Files\nodejs\node.exe'
if (Test-Path $nodeExe) {
    'node already installed: ' + (& $nodeExe --version)
    if ($env:Path -notlike '*nodejs*') { $env:Path += ';C:\Program Files\nodejs' }
} else {
    'Installing Node.js 22 LTS...'
    $nodeMsi = "$tmp\node-lts.msi"
    Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.13.1/node-v22.13.1-x64.msi' -OutFile $nodeMsi
    Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /qn /norestart" -Wait
    if (Test-Path $nodeExe) {
        $env:Path += ';C:\Program Files\nodejs'
        'node installed: ' + (& $nodeExe --version)
    } else {
        Write-Warning 'node.exe not found at C:\Program Files\nodejs after MSI - open a NEW PowerShell after this script finishes.'
    }
}

# --- 2. IIS Application Request Routing 3.0 ------------------------------
$arrInstalled = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\IIS Extensions\Application Request Routing' -ErrorAction SilentlyContinue
if ($arrInstalled) {
    'ARR already installed: ' + $arrInstalled.Version
} else {
    'Installing ARR 3.0 (and its prerequisite, External Cache)...'
    # External Cache module must be installed before ARR
    $extCacheMsi = "$tmp\webfarm.msi"
    Invoke-WebRequest -Uri 'https://download.microsoft.com/download/5/7/0/57065640-4665-4980-A2F1-4D5940B577B0/webfarm_v1.1_amd64_en_us.msi' -OutFile $extCacheMsi
    Start-Process msiexec.exe -ArgumentList "/i `"$extCacheMsi`" /qn /norestart" -Wait

    $arrMsi = "$tmp\arr.msi"
    Invoke-WebRequest -Uri 'https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi' -OutFile $arrMsi
    Start-Process msiexec.exe -ArgumentList "/i `"$arrMsi`" /qn /norestart" -Wait
    'ARR installed.'
}

# Enable the ARR proxy globally (required for reverse-proxying to localhost:3000)
Import-Module WebAdministration
$cfg = Get-WebConfiguration -Filter 'system.webServer/proxy' -PSPath 'MACHINE/WEBROOT/APPHOST'
if ($cfg.enabled -ne $true) {
    'Enabling ARR proxy...'
    Set-WebConfigurationProperty -Filter 'system.webServer/proxy' -PSPath 'MACHINE/WEBROOT/APPHOST' -Name 'enabled' -Value 'True'
    'ARR proxy enabled.'
} else {
    'ARR proxy already enabled.'
}

# URL Rewrite locks down which HTTP_* server variables a rule can set; the
# proxy rule in web.config sets X-Forwarded-* + X-Real-IP so node sees the
# real client. Each variable must be on the allowed list at apphost level.
'Allowlisting forwarded-header server variables for URL Rewrite...'
$appcmd = "$env:windir\system32\inetsrv\appcmd.exe"
foreach ($var in @('HTTP_X_FORWARDED_HOST','HTTP_X_FORWARDED_PROTO','HTTP_X_FORWARDED_FOR','HTTP_X_REAL_IP')) {
    # appcmd is idempotent if you guard against duplicates; check first.
    $existing = & $appcmd list config /section:system.webServer/rewrite/allowedServerVariables 2>&1 | Select-String -Pattern "name=`"$var`""
    if ($existing) {
        "  $var already allowed"
    } else {
        & $appcmd set config -section:system.webServer/rewrite/allowedServerVariables "/+[name='$var']" /commit:apphost | Out-Null
        "  $var allowed"
    }
}

# Harden Schannel: disable TLS 1.0/1.1 + SSL 2/3, enforce TLS 1.2.
# Modern browsers flag sites accepting TLS <=1.1 as "not secure" even if the
# actual handshake uses 1.2. Server 2019 Schannel does NOT support TLS 1.3
# (added in Server 2022), so 1.2-only is the best we can do.
# Reboot required for Schannel to re-read these registry values.
'Hardening Schannel: disabling TLS 1.0/1.1 + SSL 2/3, enabling TLS 1.2...'
$schannel = 'HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols'
$rebootRequired = $false
foreach ($proto in 'TLS 1.0','TLS 1.1','SSL 2.0','SSL 3.0') {
    foreach ($side in 'Server','Client') {
        $path = "$schannel\$proto\$side"
        $existing = Get-ItemProperty -Path $path -Name Enabled -ErrorAction SilentlyContinue
        if (-not $existing -or $existing.Enabled -ne 0) {
            New-Item -Path $path -Force | Out-Null
            New-ItemProperty -Path $path -Name Enabled -Value 0 -PropertyType DWord -Force | Out-Null
            New-ItemProperty -Path $path -Name DisabledByDefault -Value 1 -PropertyType DWord -Force | Out-Null
            "  $proto $side disabled"
            $rebootRequired = $true
        }
    }
}
foreach ($side in 'Server','Client') {
    $path = "$schannel\TLS 1.2\$side"
    $existing = Get-ItemProperty -Path $path -Name Enabled -ErrorAction SilentlyContinue
    if (-not $existing -or $existing.Enabled -ne 1) {
        New-Item -Path $path -Force | Out-Null
        New-ItemProperty -Path $path -Name Enabled -Value 1 -PropertyType DWord -Force | Out-Null
        New-ItemProperty -Path $path -Name DisabledByDefault -Value 0 -PropertyType DWord -Force | Out-Null
        "  TLS 1.2 $side enabled"
        $rebootRequired = $true
    }
}
if ($rebootRequired) {
    Write-Warning 'Schannel registry was modified. REBOOT REQUIRED for changes to take effect: Restart-Computer -Force'
} else {
    '  Schannel already hardened'
}

# --- 3. nssm (service supervisor) ----------------------------------------
$nssmDir = 'C:\nssm'
$nssmExe = "$nssmDir\nssm.exe"
if (Test-Path $nssmExe) {
    'nssm already installed at ' + $nssmExe
} else {
    'Installing nssm 2.24...'
    $nssmZip = "$tmp\nssm.zip"
    # Manual fallback: if a pre-downloaded nssm-2.24.zip is in C:\Temp, use it.
    $manual = 'C:\Temp\nssm-2.24.zip'
    if (Test-Path $manual) {
        Copy-Item $manual $nssmZip -Force
        'using pre-downloaded nssm-2.24.zip from C:\Temp'
    } else {
        $ok = Get-FileWithRetry -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile $nssmZip
        if (-not $ok) {
            Write-Warning 'nssm.cc unreachable. Manually download https://nssm.cc/release/nssm-2.24.zip in a browser, save it as C:\Temp\nssm-2.24.zip, and re-run this script.'
            return
        }
    }
    Expand-Archive -Path $nssmZip -DestinationPath $tmp -Force
    New-Item -ItemType Directory -Force -Path $nssmDir | Out-Null
    Copy-Item "$tmp\nssm-2.24\win64\nssm.exe" $nssmExe -Force
    # add to system PATH
    $sysPath = [System.Environment]::GetEnvironmentVariable('Path','Machine')
    if ($sysPath -notlike "*$nssmDir*") {
        [System.Environment]::SetEnvironmentVariable('Path', "$sysPath;$nssmDir", 'Machine')
        $env:Path += ";$nssmDir"
    }
    # Don't call & $nssmExe version - nssm prints its banner to stderr in UTF-16
    # and PowerShell's strict error mode treats that as a failure even on success.
    'nssm installed at ' + $nssmExe
}

# --- 4. win-acme (Let's Encrypt client) ----------------------------------
$wacsDir = 'C:\win-acme'
$wacsExe = "$wacsDir\wacs.exe"
if (Test-Path $wacsExe) {
    'win-acme already installed at ' + $wacsExe
} else {
    'Installing win-acme...'
    $wacsZip = "$tmp\wacs.zip"
    $ok = Get-FileWithRetry -Uri 'https://github.com/win-acme/win-acme/releases/download/v2.2.9.1701/win-acme.v2.2.9.1701.x64.pluggable.zip' -OutFile $wacsZip
    if (-not $ok) {
        Write-Warning 'win-acme download failed. Manually grab the .x64.pluggable.zip from the win-acme releases page and place it at C:\Temp\wacs.zip, then re-run.'
        return
    }
    New-Item -ItemType Directory -Force -Path $wacsDir | Out-Null
    Expand-Archive -Path $wacsZip -DestinationPath $wacsDir -Force
    'win-acme installed at ' + $wacsExe
}

''
'=== All prerequisites installed. ==='
'Re-run check-deploy-prereqs.ps1 to confirm.'
