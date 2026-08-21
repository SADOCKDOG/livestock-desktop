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
    'js\guide-manager.js',           # Motor de guías: remap carrusel→sidebar (preserva targets ocultos)
    'js\module-colors.js',           # Mapa de colores ERP (sin neon)
    'js\purchase-manager.js',       # Emite 'premiumChanged' para el indicador Free/Premium del sidebar
    # 'js\views\animales-view.js',     # UNIFICADA en el maestro (fase 3 lote 9): cromo ERP neutro + erp-action-group (CTA cabecera movida) + toggle Tarjetas/Tabla + tabla ErpDataTable; nav móvil preservada (sin fab-container, usa CTA cabecera)
    # 'js\views\rebanos-view.js',     # UNIFICADA en el maestro (fase 3 lote 5): cromo ERP neutro + erp-action-group + toggle Tarjetas/Tabla + tabla ErpDataTable; nav móvil preservada
    'js\views\compradores-view.js',  # Toggle Tarjetas/Tabla ERP (módulo compradores)
    # 'js\views\proveedores-view.js',     # UNIFICADA en el maestro (fase 3 lote 8): cromo ERP neutro + erp-action-group + toggle Tarjetas/Tabla + tabla ErpDataTable + fix _setVistaModo render lista en cards; FAB móvil eliminado (CTA duplicado en erp-action-group)
    'js\views\transportistas-view.js', # Toggle Tarjetas/Tabla ERP
    'js\views\gastos-view.js',         # Toggle Tarjetas/Tabla ERP (tabs por categoría)
    'js\views\contratos-view.js',      # Toggle Tarjetas/Tabla ERP
    'js\views\documentos-view.js',     # Toggle Tarjetas/Tabla ERP (registro documental)
    'js\views\fitosanitarios-view.js', # Toggle Tarjetas/Tabla ERP
    # 'js\views\comercializacion-view.js', # UNIFICADA en el maestro (fase 3 lote 3): cromo ERP neutro + erp-action-group + erp-filtros + data-ver-mas (sin nav móvil que preservar)
    'js\views\manuales-view.js',      # Visor de manuales embebido en #app-content (no overlay full-screen)
    # --- Estandarización de botones / limpieza de FAB y sub-tabs (piel ERP) ---
    # 'js\views\agenda-view.js',         # UNIFICADA en el maestro (fase 3 piloto): CTA cabecera + erp-action-group + erp-filtros; fab-container móvil CONSERVADO
    'js\views\botiquin-view.js',         # CTA cabecera "Nuevo Producto", sin FAB
    # 'js\views\dashboard-view.js',      # UNIFICADA en el maestro (fase 3 piloto): FAB "Nueva Actividad" + renderGuideFab; nav móvil intacta
    'js\views\explotacion-view.js',      # Láctea/Trámites como subgrupos del sidebar (?sub=)
    # 'js\views\explotacion-lactea-view.js', # UNIFICADA en el maestro (fase 3 lote 3): erp-action-group + erp-filtros + data-ver-mas en analíticas/movimientos; botones editar/borrar intactos; +Ordeño/+Tanque re-añadidos
    # 'js\views\informes-view.js',         # UNIFICADA en el maestro (fase 3 lote 2): _sectionActionsHTML como fieldset erp-action-group; nav cat/tab móvil conservada (sync la trae del maestro)
    # 'js\views\instalaciones-view.js', # UNIFICADA en el maestro (fase 3 lote 7): cromo ERP neutro + erp-action-group + erp-filtros + toggle Tarjetas/Tabla + tabla ErpDataTable; FAB móvil eliminado (CTA duplicado en erp-action-group)
    'js\views\produccion-view.js',       # NO unificable: ProduccionView es huérfano (nunca se renderiza por ruta/nav; solo provee _abrirOpcionesRegistro a explotacion/gastos). Se mantiene preservado (desktop conserva su versión con FAB).
    'js\views\saneamientos-view.js',     # CTA cabecera "Nuevo Saneamiento", sin FAB
    # 'js\views\silos-view.js',         # UNIFICADA en el maestro (fase 3 lote 6): cromo ERP neutro + erp-action-group + erp-filtros + toggle Tarjetas/Tabla + tabla ErpDataTable; FAB móvil eliminado (CTA duplicado en erp-action-group)
    'js\views\subexplotaciones-view.js', # CTA cabecera "Nueva Subexplotación", sin FAB
    # 'js\views\tanques-view.js',        # UNIFICADA en el maestro (fase 3 piloto): erp-action-group + erp-filtros + data-ver-mas
    'js\views\zonas-view.js',            # CTA cabecera + acción secundaria Importar PDF
    'js\views\sanidad-view.js',          # Acciones de registro agrupadas (fieldset erp-action-group)
    # 'js\views\patrimonio-view.js',       # UNIFICADA en el maestro (fase 3 lote 4): cromo ERP neutro + erp-action-group + toggle Tarjetas/Tabla + data-ver-mas + tabla ErpDataTable; Accesos directos móviles conservados
    # 'js\views\cuaderno-view.js',       # UNIFICADA en el maestro (fase 3 lote 1): fieldset erp-action-group (exportar PDF/CSV/imprimir)
    'js\views\albaranes-ventas-view.js', # Libro de Ventas: tabla ERP
    # 'js\views\ajustes-view.js',        # UNIFICADA en el maestro (fase 3 lote 1): chips de alta + feature Zonas/Parcelas conservada
    'js\guides\inicio-dashboard.js',  # Guía del Inicio/Dashboard (propia del desktop; el maestro no la trae)
    # --- Guías re-apuntadas a la piel ERP (sidebar / erp-action-group). Sin esto, el
    #     sync desde el mástro revertiría el re-apuntado (el mástro usa targets de carrusel). ---
    'js\guides\comer-carne.js',
    'js\guides\comer-compradores.js',
    'js\guides\comer-contratos.js',
    'js\guides\comer-leche.js',
    'js\guides\comer-panoramica.js',
    'js\guides\comer-transportistas.js',
    'js\guides\expro-explotacion.js',
    'js\guides\expro-fitosanitarios.js',
    'js\guides\expro-gastos.js',
    'js\guides\expro-lacteo.js',
    'js\guides\expro-panoramica.js',
    'js\guides\expro-proveedores.js',
    'js\guides\expro-silos.js',
    'js\guides\expro-tramites.js',
    'js\guides\gegan-animales.js',
    'js\guides\gegan-panoramica.js',
    'js\guides\gegan-patrimonio.js',
    'js\guides\gegan-rebanos.js',
    'js\guides\gegan-zonas.js',
    'js\guides\onboarding-primeros-pasos.js',
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
