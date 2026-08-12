# Sync the web frontend from the master repo (LIVESTOCK-MANAGER) into frontend/.
# Only the static web app is copied; Android/Capacitor/agent artifacts are excluded.
# The master repo is treated as read-only (source of truth for the frontend).

$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot
$masterPath = Resolve-Path (Join-Path $repoRoot '..' 'LIVESTOCK-MANAGER') -ErrorAction SilentlyContinue

if (-not $masterPath) {
    Write-Error "No se encontro el repo maestro en ..\LIVESTOCK-MANAGER. Clona/ubica LIVESTOCK-MANAGER como hermano de este repo."
    exit 1
}

$src = $masterPath.Path
$dst = Join-Path $repoRoot 'frontend'

# Frontend essentials only (mirrors what the PWA snapshot published).
$items = @(
    'index.html',
    'sw.js',
    'manifest.webmanifest',
    'privacy-policy.html',
    'css',
    'js',
    'icons',
    'manual',
    'assets'
)

if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst | Out-Null }

foreach ($item in $items) {
    $s = Join-Path $src $item
    $d = Join-Path $dst $item
    if (Test-Path $s) {
        if (Test-Path $d) { Remove-Item $d -Recurse -Force }
        Copy-Item $s $d -Recurse -Force
        Write-Host "Synced: $item"
    } else {
        Write-Warning "No presente en el maestro (se omite): $item"
    }
}

Write-Host "`nSync desde LIVESTOCK-MANAGER completado -> frontend/"
