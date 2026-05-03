# Re-issues the Let's Encrypt cert covering both apex and www.
# Use this whenever the SAN list changes (e.g. adding a new subdomain).
# Routine renewal is automatic via the win-acme scheduled task and does NOT
# need this script.
#
# Run from admin PowerShell:
#   PowerShell -ExecutionPolicy Bypass -File C:\Temp\reissue-cert.ps1
#
# Override the email at the top if your account uses a different one.

$email = 'thesoutherncross.uk@gmail.com'
$hosts = 'thesoutherncross.uk,www.thesoutherncross.uk'
$siteId = 1

& 'C:\win-acme\wacs.exe' `
    --target iis `
    --host $hosts `
    --siteid $siteId `
    --installation iis `
    --emailaddress $email `
    --accepttos
