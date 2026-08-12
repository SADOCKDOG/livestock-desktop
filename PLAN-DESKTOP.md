# Plan Maestro — Livestock Desktop (ERP, Tauri)

> Última revisión: 2026-08-12 · Estado: Fase 2 completada, Fase 3 en curso

## 1. Qué estamos construyendo

**App de escritorio nativa para Windows** (Tauri) con **UI/UX tipo ERP** (estilo SAP Fiori / MS Dynamics: paleta corporativa, sidebar colapsable, tablas densas, sin emojis — solo SVG) que **SUSTITUYE a la PWA actual** (`livestock-pwa-msix`) en Microsoft Store.

| Repo | Rol |
|---|---|
| `C:\Users\yo\repo\LIVESTOCK-MANAGER` | **Maestro. SOLO LECTURA.** Aquí se hacen todos los cambios de frontend; se portan mediante sync. Fuente de verdad de límites Free/Premium. |
| `C:\Users\yo\repo\livestock-pwa-msix` | PWA actual en Store. **Será reemplazada** por esta app desktop. (Shippeó Premium-desbloqueado-gratis porque PWABuilder no puede usar WinRT `Windows.Services.Store` — issue #2478). |
| `C:\Users\yo\repo\livestock-desktop` | **Este repo.** Nueva app nativa que hereda el frontend del maestro + capa ERP propia. |

## 2. Stack y versiones

- **Tauri v2.11**: CLI `@tauri-apps/cli 2.11.4`, API `@tauri-apps/api 2.11.1`, crate `tauri = "2"`, `tauri-build = "2"`, rust-version 1.77.2.
- **Sin plugins Tauri todavía** (pendiente: store/WinRT, dialog, atajos globales).
- `src-tauri/tauri.conf.json`: `frontendDist: "../frontend"`, `beforeBuildCommand: "npm run sync"`, ventana 1280×800 (mín. 1100×700), identifier `com.livestockmanager.premium`.
- El frontend es 100% el del maestro (IndexedDB, sin backend) + capa ERP desktop.

## 3. Ediciones Free y Premium (heredadas del maestro)

Los límites **ya están definidos en el maestro** (`frontend/js/premium-manager.js`) y la versión Free de escritorio lleva **exactamente las mismas limitaciones**:

| Limitación Free | Valor |
|---|---|
| Máx. animales | 15 |
| Máx. gastos | 30 |
| Exportar CSV / backup | ❌ bloqueado |
| Importar backup | ❌ bloqueado |
| Datos de ejemplo (seed) | ❌ bloqueado |
| Registros demo | solo lectura (`canModify`/`canDelete` = false si `demo===true`) |

**Mecanismo de edición (build-time, igual que el maestro):**
- `npm run build:free` → copia `mode-config.free.js` (`window.FREE_MODE = true`) a `js/mode-config.js` + `tauri build`.
- `npm run build:premium` → copia `mode-config.premium.js` (`window.FREE_MODE = false`) + `tauri build`.
- `mode-config.free.js` / `mode-config.premium.js` se **sincronizan desde el maestro** (fuente de verdad).
- `js/mode-config.js` es **generado y propio del desktop** (preservado por el sync; default dev = FREE).

**Monetización desktop (Fase 3, pendiente):** `purchase-manager.js` usa Google Play Billing (inerte en desktop). Se reemplazará por un **comando Tauri → WinRT `Windows.Services.Store`** (add-on `premium_unlock`), que sí es usable en MSIX nativo — a diferencia de la PWA PWABuilder (causa del problema #2478).

## 4. Pipeline de sync (maestro → desktop)

`scripts/sync-from-master.ps1` (ejecutado en cada build vía `beforeBuildCommand`):
- Refleja desde el maestro: `index.html`, `sw.js`, `manifest.webmanifest`, `privacy-policy.html`, `css/`, `js/`, `icons/`, `manual/`, `assets/`.
- **Preserva** (nunca borra ni sobrescribe) los 15 archivos propios del desktop:
  - `index.html` (markup sidebar ERP), `js/app.js` (handlers sidebar), `js/module-colors.js`, `js/views/animales-view.js`, `js/views/rebanos-view.js`, `js/views/compradores-view.js`, `js/views/proveedores-view.js`, `js/views/transportistas-view.js`, `css/design-tokens.css` (paleta ERP), `css/erp-sidebar.css`, `css/erp-data-table.css`, `css/erp-overrides.css` (neutraliza neón legado), `js/erp-data-table.js`, `js/icons-desktop.js` (iconos extra), `js/mode-config.js`.
- Anuncia cada preservación para revisar diffs a mano cuando el maestro toque esos archivos.

> ⚠️ Deuda conocida: al preservar archivos que también existen en el maestro (app.js, 5 views, design-tokens, module-colors, index.html), los cambios upstream en ellos **no fluyen**; hay que fusionarlos manualmente cuando el sync los anuncie. Refactor futuro: mover overrides a capa overlay pura.

## 5. Capa ERP construida (Fases 1–2, hechas)

- ✅ **Paleta ERP** en `design-tokens.css`: `--brand #1F5FA8`, `--c-success #15803D`, `--c-warning #B45309`, `--c-danger #B91C1C`, `--p-gold #FFB300`, `--sidebar-bg #0F1B2D`; modo claro vía `body[data-modo="claro"]`.
- ✅ **Sidebar colapsable** (`erp-sidebar.css` + markup en `index.html` + handlers en `app.js`): 240↔72 px, 3 secciones (Gestión Ganadera / Informes y Doc / Herramientas), estado activo con indicador `--p-gold`, persistencia `localStorage`, atajo **Alt+S**, tooltips en modo colapsado, breakpoint 1024 px (debajo: bottom-nav móvil).
- ✅ **`ErpDataTable`** (`erp-data-table.js` + css): búsqueda global, ordenación, paginación (15/pág), export CSV (BOM, `;`).
- ✅ **Toggle Tarjetas/Tabla ERP** en `animales-view.js` y `rebanos-view.js` (persistido por vista; default Tabla ≥1024 px).

## 6. Auditoría UI/UX completa (2026-08-12) — hallazgos

Auditados todos los CSS, vistas, wizards, componentes transversales e iconos. Resultados clave:

- **Doble paleta compitiendo**: `styles.css` (171 KB) y `layout.css` siguen exportando clases/hardcodes neón (`#C5FA50`, `#E8555F`, `#FFFC55`, `--header-neon-color`, `.neon-orange`) sin override — conviven con los tokens ERP.
- **30+ hardcodes de color** en vistas: `fitosanitarios-view.js` (10+), `informes-view.js` (paletas chart.js), `documentos-view.js`, `dashboard-view.js`, `ajustes-view.js` (picker "Neon Lime/Red/Blue/Gold").
- **~10 emojis Unicode** residuales en wizards (`wizard-albaran-leche.js` ⚠️✅, `wizard-guia-movimiento.js` 🛡️ en PDF), vistas (dashboard 📊💰🐄🌾, fitosanitarios 🔥💧🌱, agenda 📅), `styles.css:2448` (`✓`), y `erp-data-table.js:159` (`▲▼↕`).
- **Solo 2 de ~30 vistas** migradas a ErpDataTable.
- **15 wizards**: todos usan `WizardManager` fullscreen (sano); único patrón divergente: `wizard-censo.js` (overlay blanco serif hardcode).
- **Bugs en `icons.js`**: funciones duplicadas (`calculo`, `xmark`, `fitosanitario`); falta `chevronArriba()` (lo necesita la tabla).
- **Referencias muertas**: `app.js` referencia ~15 veces `#nav-more-sheet` (elemento eliminado del HTML).
- **Sin breakpoints desktop**: ningún `@media (min-width:1024px)` ajusta densidad/columnas; botones táctiles 44–80 px desproporcionados con ratón.
- Bug menor: `--r-md` = 14 px en tokens pero fallback 12 px en `erp-data-table.css`.

## 7. Backlog priorizado

### P0 — Bloquea release ERP ✅ (completado 2026-08-12)
1. ✅ `--r-md` unificado (fallback tabla 12 → 14 px).
2. ✅ Chevrons SVG: `js/icons-desktop.js` (propio) añade `Icons.chevronArriba()` y `Icons.sortNeutral()` — `icons.js` es del maestro y no se puede tocar; sus duplicados (`calculo`/`xmark`/`fitosanitario`) son benignos en runtime y solo se limpian en el maestro.
3. ✅ `erp-data-table.js`: `▲/▼/↕` → `Icons.chevronArriba()/chevronAbajo()/sortNeutral()` + CSS de tamaño.
4. ✅ `app.js`: eliminadas las 6 refs muertas a `#nav-more-sheet` / `.more-sheet-item` / `#nav-more` + método `_toggleMenuNavegacion()` (sin llamadores).
5. ✅ Neón neutralizado vía `css/erp-overrides.css` (carga tras styles.css, que es del maestro y no se edita): `.badge-blue` → `var(--c-info)`, `.badge-solid-orange`/`.neon-orange` → `var(--c-orange)`, `.neon-accent` → `var(--c-info)`. No se renombran clases porque el JS del maestro las emite.

### P1 — Consistencia de tokens ✅ (completado 2026-08-12)
1. ✅ Glow neón del header (`#app-logo`, `#header-context`, `#nombre-finca-header`) neutralizado en `erp-overrides.css`.
2. ✅ Hardcodes de `styles.css` (`.text-blue/.text-orange`, `.border-*`, `.card-accent-*`, `.color-*`, glow de `.neon-success`) → tokens vía `erp-overrides.css`.
3. ✅ `✓` del theme-dot → SVG mask (`erp-overrides.css`).
4. ✅ Picker de retroiluminación (`ajustes-view.js`) → nombres semánticos sin "Neon" + hex alineados a tokens — **editado en el MAESTRO**.
5. ✅ `documentos-view.js`, `fitosanitarios-view.js`, `dashboard-view.js` → hardcodes → `var(--token)` — **editado en el MAESTRO** y traído por sync.
6. ✅ `informes-view.js` → 11 puntos de paletas chart.js → helper `_chartToken(token, fallback)` (canvas no acepta `var()`) — **editado en el MAESTRO** y traído por sync.
7. ✅ `module-colors.js`: fallback `#C5FA50` → `#1F5FA8` (archivo propio del desktop).

> **Decisión 2026-08-12 (David):** las limpiezas transversales que afectan a vistas
> compartidas se aplican EN EL MAESTRO (benefician a PWA/Android y evitan
> divergencia). El desktop las recibe vía sync. La regla "maestro read-only"
> aplica al *pipeline* (el sync nunca escribe en el maestro), no a las ediciones
> aprobadas. Estrategia de tokenización: hardcode → `var(--token)`; en el maestro
> el token resuelve a neón (PWA sin cambios visuales) y en desktop a corporativo.

### P2 — Migración a ErpDataTable (paridad ERP) — EN CURSO
Orden: `compradores` ✅ → `proveedores` ✅ → `transportistas` ✅ → `gastos` ✅ → `contratos` → `documentos` (albaranes) → `fitosanitarios`.

- ✅ **P2-1 (2026-08-12):** compradores (solo módulo compradores; la rama contratos de esa vista se migra con `contratos-view.js`), proveedores y transportistas tienen toggle Tarjetas/Tabla ERP + `_renderErpTable()` (badges de estado/tipo, métricas de última operación/compra, cert. bienestar coloreado) y pasan a la lista de preservados del sync. `erp-overrides.css` gana `.badge-success`/`.badge-gray` standalone (el maestro solo las define compuestas con `.status-badge` — también arregla el badge de estado de animales/rebanos/informes).
- ✅ **P2-2 (2026-08-12):** gastos (tabs por categoría; el toggle vive en la cabecera de lista de cada tab y la tabla muestra TODOS los registros paginados — las tarjetas cortan a 50).
- **Descartadas del alcance P2** (no son listas de tarjetas de primer nivel): `historial` (no existe como vista; el historial clínico es un fragmento de `sanidad-view.js` y la bitácora es drill-down por animal), `pesadas` (no existe; los pesajes viven en bitácora/trazabilidad) y `cuaderno` (es el Cuaderno Digital oficial RD 787/2023: documento agregado para PDF, ya tabulado).

### P3 — Nativo Tauri (la promesa desktop)
1. **Comando WinRT `Windows.Services.Store`** para Premium (sustituye GP Billing) — crítico para monetizar; la PWA no pudo (#2478).
2. `tauri-window-manager.js`: wizards como `WebviewWindow` nativas (piloto: `wizard-importador-rfid`; candidatos: censo, albarán-leche, contrato, gasto).
3. Atajos globales (Ctrl+N nuevo, Ctrl+S guardar, Ctrl+F buscar).
4. Diálogos nativos de archivo (`tauri-plugin-dialog`) para import/export/backup.

### P4 — UX desktop ≥1024 px
`css/desktop.css`: grid multicolumna en cards, densidad de botones, padding 32 px, tabs sin scroll, dashboard en grid 12 col.

### P5 — Empaquetado y publicación Store
1. MSIX de ambas ediciones (Free y Premium) con identidades separadas.
2. Ficha Store, precios, add-on in-app `premium_unlock` (WinRT).
3. Retirar/reemplazar listado de la PWA.
4. Barrido final de emojis: grep `[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}]` en `js/` + `index.html`.

## 8. Estado de fases

| Fase | Estado |
|---|---|
| 1. Scaffold Tauri v2.11 + sync desde maestro | ✅ (sync con preservación corregido 2026-08-12) |
| 2. Rediseño ERP (paleta, sidebar, ErpDataTable, 2 vistas) | ✅ |
| 2.5 Corrección pipeline sync + `mode-config.js` generado | ✅ |
| 3. Auditoría UI/UX completa | ✅ (ver §6) |
| 4a. Backlog P0 (limpieza crítica) | ✅ |
| 4b. Backlog P1 (tokens en vistas + overlay) | ✅ |
| 4c. Backlog P2 (10 vistas a ErpDataTable) | 🔶 en curso (3/10: compradores, proveedores, transportistas) |
| 5. WinRT Store + atajos + nativo (P3–P4) | 🔲 |
| 6. MSIX Free/Premium + publicación Store (P5) | 🔲 |
