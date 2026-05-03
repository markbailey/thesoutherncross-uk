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
        Write-Warning 'node.exe not found at C:\Program Files\nodejs after MSI — open a NEW PowerShell after this script finishes.'
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

# --- 3. nssm (service supervisor) ----------------------------------------
$nssmDir = 'C:\nssm'
$nssmExe = "$nssmDir\nssm.exe"
if (Test-Path $nssmExe) {
    'nssm already installed at ' + $nssmExe
} else {
    'Installing nssm 2.24...'
    $nssmZip = "$tmp\nssm.zip"
    Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile $nssmZip
    Expand-Archive -Path $nssmZip -DestinationPath $tmp -Force
    New-Item -ItemType Directory -Force -Path $nssmDir | Out-Null
    Copy-Item "$tmp\nssm-2.24\win64\nssm.exe" $nssmExe -Force
    # add to system PATH
    $sysPath = [System.Environment]::GetEnvironmentVariable('Path','Machine')
    if ($sysPath -notlike "*$nssmDir*") {
        [System.Environment]::SetEnvironmentVariable('Path', "$sysPath;$nssmDir", 'Machine')
        $env:Path += ";$nssmDir"
    }
    'nssm installed: ' + (& $nssmExe version 2>&1 | Select-Object -First 1)
}

# --- 4. win-acme (Let's Encrypt client) ----------------------------------
$wacsDir = 'C:\win-acme'
$wacsExe = "$wacsDir\wacs.exe"
if (Test-Path $wacsExe) {
    'win-acme already installed at ' + $wacsExe
} else {
    'Installing win-acme...'
    $wacsZip = "$tmp\wacs.zip"
    Invoke-WebRequest -Uri 'https://github.com/win-acme/win-acme/releases/download/v2.2.9.1701/win-acme.v2.2.9.1701.x64.pluggable.zip' -OutFile $wacsZip
    New-Item -ItemType Directory -Force -Path $wacsDir | Out-Null
    Expand-Archive -Path $wacsZip -DestinationPath $wacsDir -Force
    'win-acme installed at ' + $wacsExe
}

''
'=== All prerequisites installed. ==='
'Re-run check-deploy-prereqs.ps1 to confirm.'
