# Build deploy.zip for scripts/deploy.ps1.
#
# Usage (run from project root):
#   PowerShell -ExecutionPolicy Bypass -File .\scripts\build-zip.ps1
#   PowerShell -ExecutionPolicy Bypass -File .\scripts\build-zip.ps1 -OutPath C:\drop\deploy.zip

[CmdletBinding()]
param(
    [string] $OutPath = ''
)

$ErrorActionPreference = 'Stop'

$root    = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$tar     = 'C:\Windows\System32\tar.exe'
$OutPath = if ($OutPath) { [System.IO.Path]::GetFullPath($OutPath) } `
           else          { Join-Path $root 'deploy.zip' }

if (-not (Test-Path -LiteralPath $tar)) {
    throw "bsdtar not found at $tar (requires Windows 10+)"
}

# Source files/dirs to bundle -- excludes node_modules, .next, logs, .env,
# data/*.sqlite, test artifacts, and dev-only tooling.
$items = @(
    'app', 'components', 'config', 'lib', 'public', 'scripts', 'types',
    'data',
    'env.ts', 'middleware.ts', 'next-env.d.ts', 'server.ts',
    'next.config.ts', 'package.json', 'package-lock.json',
    'postcss.config.mjs', 'tailwind.config.ts', 'tsconfig.json',
    'vitest.config.ts', 'playwright.config.ts',
    'web.config', '.env.example', '.gitignore', '.gitattributes'
)

$present = $items | Where-Object { Test-Path -LiteralPath (Join-Path $root $_) }
$missing = $items | Where-Object { -not (Test-Path -LiteralPath (Join-Path $root $_)) }

if ($missing) {
    Write-Host "    (skipping missing: $($missing -join ', '))" -ForegroundColor Yellow
}

if (Test-Path -LiteralPath $OutPath) { Remove-Item -LiteralPath $OutPath -Force }

Write-Host "==> Building deploy.zip" -ForegroundColor Cyan
Write-Host "    Root:   $root"
Write-Host "    Output: $OutPath"

# --exclude globs applied after -C so paths are relative to $root.
$tarArgs = @(
    '-acf', $OutPath,
    '-C',   $root,
    '--exclude', '*.sqlite',
    '--exclude', '*.sqlite-*',
    '--exclude', '*.tsbuildinfo'
) + $present

& $tar @tarArgs
if ($LASTEXITCODE -ne 0) { throw "tar failed (exit $LASTEXITCODE)" }

$sizeMb = '{0:N1}' -f ((Get-Item -LiteralPath $OutPath).Length / 1MB)
Write-Host "    Done: $sizeMb MB  ->  $OutPath" -ForegroundColor Green
