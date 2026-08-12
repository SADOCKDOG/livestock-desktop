# Sync the web frontend from the master repo (LIVESTOCK-MANAGER) into frontend/.
# Only the static web app is copied; Android/Capacitor/agent artifacts are excluded.
# The master repo is treated as read-only (source of truth for the frontend).
#
# IMPORTANTE (capa ERP desktop): los archivos listados en $preservedList son
# PROPIOS de este repo (rediseño ERP, config Free/Premium generada en build).
# El sync NUNCA los borra ni los sobrescribe. Si el maestro cambia alguno de esos
# archivos (p.ej. views/animales-view.js), hay que fusionar a mano: el sync lo
# anuncia con "preservado (desktop)" para que sepas que debes revisar el diff.

$ErrorActionPreference = 'Stop'

# $PSScriptRoot = <repo>\scripts -> la raiz del repo es el padre
$repoRoot = Split-Path -Parent $PSScriptRoot
# Join-Path anidado: compatible con Windows PowerShell 5.1 y PowerShell 7+
$masterPath = Resolve-Path (Join-Path (Join-Path $repoRoot '..') 'LIVESTOCK-MANAGER') -ErrorAction SilentlyContinue

if (-not $masterPath) {
    Write-Error "No se encontro el repo maestro en ..\LIVESTOCK-MANAGER. Clona/ubica LIVESTOCK-MANAGER como hermano de este repo."
    exit 1
}

$src = $masterPath.Path
$dst = Join-Path $repoRoot 'frontend'

# --- Archivos propios del desktop (rutas relativas a frontend/) --------------
$preservedList = @(
    'index.html',                    # Sidebar ERP, links css/js ERP, chrome desktop
    'js\mode-config.js',             # Generado por build:free / build:premium
    'js\erp-data-table.js',          # Componente ErpDataTable (solo desktop)
    'js\icons-desktop.js',           # Iconos extra desktop: chevronArriba, sortNeutral
    'js\app.js',                     # Handlers sidebar ERP (_setupSidebar, etc.)
    'js\module-colors.js',           # Mapa de colores ERP (sin neon)
    'js\views\animales-view.js',     # Toggle Tarjetas/Tabla ERP
    'js\views\rebanos-view.js',      # Toggle Tarjetas/Tabla ERP
    'js\views\compradores-view.js',  # Toggle Tarjetas/Tabla ERP (módulo compradores)
    'js\views\proveedores-view.js',  # Toggle Tarjetas/Tabla ERP
    'js\views\transportistas-view.js', # Toggle Tarjetas/Tabla ERP
    'css\design-tokens.css',         # Paleta ERP profesional
    'css\erp-sidebar.css',           # Sidebar colapsable (solo desktop)
    'css\erp-data-table.css',        # Tablas densas ERP (solo desktop)
    'css\erp-overrides.css'          # Neutraliza neon legado de styles.css (solo desktop)
)
$preserved = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($p in $preservedList) { [void]$preserved.Add($p) }

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

function Copy-Tree($srcPath, $dstPath, $relBase) {
    foreach ($entry in Get-ChildItem -LiteralPath $srcPath) {
        $rel = if ($relBase) { "$relBase\$($entry.Name)" } else { $entry.Name }
        $target = Join-Path $dstPath $entry.Name
        if ($entry.PSIsContainer) {
            if (-not (Test-Path -LiteralPath $target)) { New-Item -ItemType Directory -Path $target | Out-Null }
            Copy-Tree $entry.FullName $target $rel
        } elseif ($preserved.Contains($rel)) {
            Write-Host "  preservado (desktop): $rel"
        } else {
            Copy-Item -LiteralPath $entry.FullName -Destination $target -Force
        }
    }
}

function Prune-Tree($srcPath, $dstPath, $relBase) {
    if (-not (Test-Path -LiteralPath $dstPath)) { return }
    foreach ($entry in Get-ChildItem -LiteralPath $dstPath) {
        $rel = if ($relBase) { "$relBase\$($entry.Name)" } else { $entry.Name }
        $source = Join-Path $srcPath $entry.Name
        if (-not (Test-Path -LiteralPath $source)) {
            if ($preserved.Contains($rel)) {
                Write-Host "  preservado (desktop): $rel"
            } else {
                Remove-Item -LiteralPath $entry.FullName -Recurse -Force
                Write-Host "  eliminado (ausente en maestro): $rel"
            }
        } elseif ($entry.PSIsContainer) {
            Prune-Tree $source $entry.FullName $rel
        }
    }
}

foreach ($item in $items) {
    $s = Join-Path $src $item
    $d = Join-Path $dst $item
    if (-not (Test-Path -LiteralPath $s)) {
        Write-Warning "No presente en el maestro (se omite): $item"
        continue
    }
    if ((Get-Item -LiteralPath $s).PSIsContainer) {
        if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d | Out-Null }
        Copy-Tree $s $d $item
        Prune-Tree $s $d $item
        Write-Host "Synced: $item"
    } else {
        if ($preserved.Contains($item)) {
            Write-Host "  preservado (desktop): $item"
        } else {
            Copy-Item -LiteralPath $s -Destination $d -Force
            Write-Host "Synced: $item"
        }
    }
}

Write-Host "`nSync desde LIVESTOCK-MANAGER completado -> frontend/ (capa ERP desktop preservada)"
