# Verify deployment prerequisites on the remote IIS box.
# Run from an admin PowerShell:
#   PowerShell -ExecutionPolicy Bypass -File .\check-deploy-prereqs.ps1
$ErrorActionPreference = 'SilentlyContinue'

$node = (& node --version) 2>$null
"node:     " + $(if ($node) { $node } else { 'MISSING' })

"PS:       " + $PSVersionTable.PSVersion.ToString()

$iis = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\InetStp'
"IIS:      " + $(if ($iis) { "$($iis.MajorVersion).$($iis.MinorVersion)" } else { 'MISSING' })

$urlrw = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\IIS Extensions\URL Rewrite'
"URLRW:    " + $(if ($urlrw) { $urlrw.Version } else { 'MISSING' })

$arr = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\IIS Extensions\Application Request Routing'
"ARR:      " + $(if ($arr) { $arr.Version } else { 'MISSING' })

$arrProxy = 'unknown'
try {
    Import-Module WebAdministration -ErrorAction Stop
    $cfg = Get-WebConfiguration -Filter 'system.webServer/proxy' -PSPath 'MACHINE/WEBROOT/APPHOST'
    if ($cfg) { $arrProxy = $cfg.enabled }
} catch {
    $arrProxy = 'cannot read (run as admin?)'
}
"ARRproxy: $arrProxy"

$nssmOut = (& nssm version 2>&1)
$nssm = ($nssmOut | Select-Object -First 1)
"nssm:     " + $(if ($nssm -and $nssm -notmatch 'not recognized|CommandNotFoundException') { $nssm } else { 'MISSING' })

$paths = @('C:\win-acme\wacs.exe','C:\Program Files\win-acme\wacs.exe','C:\tools\win-acme\wacs.exe')
$wacs = $paths | Where-Object { Test-Path $_ } | Select-Object -First 1
"wacs:     " + $(if ($wacs) { $wacs } else { 'MISSING' })

$dnsResult = 'lookup failed'
try {
    $rec = Resolve-DnsName thesoutherncross.uk -Type A -ErrorAction Stop | Select-Object -First 1
    if ($rec) { $dnsResult = $rec.IPAddress }
} catch { }
"DNS:      $dnsResult"

$pubIp = 'fetch failed'
try {
    $pubIp = Invoke-RestMethod -Uri 'https://api.ipify.org' -TimeoutSec 5
} catch { }
"PubIP:    $pubIp"

$rules = Get-NetFirewallRule -Direction Inbound -Enabled True -ErrorAction SilentlyContinue
$portFilters = $rules | Get-NetFirewallPortFilter -ErrorAction SilentlyContinue
$fw80 = ($portFilters | Where-Object { $_.LocalPort -eq 80 -and $_.Protocol -eq 'TCP' } | Measure-Object).Count
$fw443 = ($portFilters | Where-Object { $_.LocalPort -eq 443 -and $_.Protocol -eq 'TCP' } | Measure-Object).Count
"FW80:     $fw80 rule(s)"
"FW443:    $fw443 rule(s)"
