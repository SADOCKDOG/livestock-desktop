# Plan de Implementación: Guías Interactivas (Wizard Flotante) para GeGan, ExPro y CoMer

**Fecha:** 2026-08-02  
**Espec:** `docs/superpowers/specs/2026-08-02-guias-interactivas-design.md`  
**Estado:** Listo para ejecución (auditado contra código real)  
**Branch actual:** `feature/guias-interactivas` (master protegida → PR)

---

## Resumen del alcance

| Pilar | Vista principal | Tabs reales (carrusel) | Guías totales |
|-------|-----------------|------------------------|---------------|
| GeGan | `GanaderiaView` | animales, rebanos, patrimonio¹, zonas, sanidad | 6 (5 tab + 1 panorámica) |
| ExPro | `ExplotacionView` | explotacion, lacteo, silos, fitosanitarios, gastos, proveedores, tramites | 8 (7 tab + 1 panorámica) |
| CoMer | `ComercializacionView` | leche, carne, compradores, contratos, transportistas | 6 (5 tab + 1 panorámica) |
| **Total** | | | **21 guías** |

¹ `patrimonio` solo si `flags.carne`

---

## AUDITORÍA DE SUB-VISTAS — Acciones "ALTA" reales (verificadas file:line)

| Sub-vista | Acción "Alta" real | API / Código | Tipo |
|-----------|-------------------|--------------|------|
| **animales-view.js** | `location.hash='/animal'` (32, 66) | Hash route → vista detalle animal | **NO wizard** |
| **rebanos-view.js** | `RebanosView._crearRebano()` (594) | WizardManager inline (722-770) | **NO wizard externo** |
| **zonas-view.js** | `ZonasView._crearZona()` (379) | WizardManager inline (438-470) | **NO wizard externo** |
| **patrimonio-view.js** | `App._abrirAsistenteProduccion('carne')` (52) | ProduccionUI.iniciarAsistente | Asistente |
| **sanidad-view.js** | **Tratamiento**: `WizardTratamiento.registrar(null)` (197) | ✓ Wizard real | `launch: () => WizardTratamiento.registrar(null)` |
|  | **Vacunación**: `WizardVacunacion.registrar(null, ...)` (200) | ✓ Wizard real | `launch: () => WizardVacunacion.registrar(null)` |
|  | **Crotales**: `App._abrirWizardCrotales()` (201) | Wrapper → `WizardCrotales.abrir()` | `launch: () => App._abrirWizardCrotales()` |
|  | **Guía Mov.**: `App._abrirWizardGuiaMovimiento()` (202) | Wrapper → `WizardGuiaMovimiento.abrir()` | `launch: () => App._abrirWizardGuiaMovimiento()` |
| **explotacion-view.js** (tab 'explotacion') | `App._abrirSubmenuRegistros()` / `_abrirAsistenteProduccion()` (220-222) | ProduccionUI.iniciarAsistente | Asistente |
| **explotacion-view.js** (tab 'lacteo'→tanques) | `TanqueWizard.open(tanque)` (expl-lactea-view:102,111) | ✓ Wizard real | `launch: () => TanqueWizard.open()` |
| **explotacion-view.js** (tab 'lacteo'→control) | `OrdeñoWizard.open()` (expl-lactea-view:54) | ✓ Wizard real | `launch: () => OrdeñoWizard.open()` |
| **silos-view.js** | `SilosView._abrirFormularioSilo()` (365) | WizardManager inline (687-732) | **NO wizard externo** |
| **fitosanitarios-view.js** | `GastoWizard.open({categoria:'Fitosanitarios'})` (282-285) | ✓ Wizard real | `launch: () => GastoWizard.open({categoria:'Fitosanitarios'})` |
| **gastos-view.js** | `App._abrirFormularioGasto()` (150) → `GastoWizard.open()` | ✓ Wizard real | `launch: () => GastoWizard.open()` |
| **proveedores-view.js** | `ProveedoresView.renderFormulario()` (529) | **Modal propio** (277-396) | **NO wizard** |
| **tramites** (expro sub-tabs) | **guias**: `App._abrirWizardGuiaMovimiento()` (700) | Wrapper → `WizardGuiaMovimiento.abrir()` | `launch: () => App._abrirWizardGuiaMovimiento()` |
|  | **censo**: `App._abrirWizardCenso()` (721) | Wrapper → `WizardCenso.abrir()` | `launch: () => App._abrirWizardCenso()` |
|  | **crotales**: `App._abrirWizardCrotales()` (746) | Wrapper → `WizardCrotales.abrir()` | `launch: () => App._abrirWizardCrotales()` |
|  | **traslado**: `App._abrirWizardTraslado()` (766) | Wrapper → `WizardTraslado.abrir()` | `launch: () => App._abrirWizardTraslado()` |
| **compradores-view.js** | `CompradoresView.renderFormulario()` (647) | **Modal propio** (661-774) | **NO wizard** |
| **contratos-view.js** | `ContratosView._crearContrato()` → modal (277) | **Modal propio** (277-362) | **NO wizard** |
| **transportistas-view.js** | `TransportistasView._abrirFormulario()` (320) | **Modal propio** (264-432) | **NO wizard** |

---

## WIZARDS REALES DISPONIBLES (15 + 1)

| Wizard | API pública | Usado en |
|--------|-------------|----------|
| `WizardFinca` | `.editar()`, `.showForm(options)` | Ajustes |
| `WizardTraslado` | `.abrir()`, `.abrirSelectorRebano()`, `.abrirSelectorAnimales()` | Tramites, ExPro |
| `WizardCenso` | `.abrir()` | Tramites |
| `WizardCrotales` | `.abrir(borrador)`, `.abrirPedido(borrador)` | Tramites, Sanidad |
| `WizardGuiaMovimiento` | `.abrir(borrador)` | Tramites, Sanidad, CoMer.leche |
| `WizardTratamiento` | `.abrir(options)`, `.registrar(rebanoId, options)` | Sanidad |
| `WizardVacunacion` | `.registrar(rebanoId, options)` | Sanidad |
| `GastoWizard` | `.open(options)` | Gastos, Fitosanitarios |
| `OrdeñoWizard` | `.open()` | ExPro.lacteo.control |
| `TanqueWizard` | `.open(tanque)` | ExPro.lacteo.tanques |
| `AlbaranLecheWizard` | `.open(borrador)`, `.abrir()` | Albaranes |
| `VentaMasivaWizard` | `.open(borrador)` | CoMer.carne |
| `WizardTarea` | `.open(options)` | — (sin consumir) |
| `MovimientoBalanceWizard` | `.open()` | — (sin consumir) |
| `AnaliticaLecheWizard` | `.open()` | — (sin consumir) |

> **Notas de inventario (corrección 4 errores menores sin impacto en guías):**
> - `AnaliticaLecheWizard` (no `WizardAnaliticaLeche`) — patrón invertido
> - `AlbaranLecheWizard` solo tiene `.open(borrador)`, no `.abrir()`
> - `WizardFinca` expone también `.showForm(options)`
> - `MovimientoBalanceWizard.open()` y `WizardTarea.open(options)` existen y están sin consumir

---

## CORRECCIÓN AL PLAN — `launch` por guía (PATRÓN ÚNICO)

**Regla:** Si hay wizard real → `launch: () => WizardReal.api(...)`. Si NO hay wizard (formulario inline, modal propio, hash route, asistente) → **NO usar `launch`**. El paso usa `target: '[data-guide="..."]'` apuntando al botón/elemento real de la vista.

| Guía | `launch` CORREGIDO | Notas |
|------|-------------------|-------|
| `gegan.animales` | **NO launch** → `target: '[data-guide="btn-nuevo-animal"]'` | Hash route |
| `gegan.rebanos` | **NO launch** → `target: '[data-guide="btn-nuevo-rebano"]'` | WizardManager inline |
| `gegan.zonas` | **NO launch** → `target: '[data-guide="btn-nueva-zona"]'` | WizardManager inline |
| `gegan.patrimonio` | `() => App._abrirAsistenteProduccion('carne', {origen:'patrimonio'})` | Asistente producción |
| `gegan.sanidad` | **Tratamiento:** `() => WizardTratamiento.registrar(null)` <br> **Vacunación:** `() => WizardVacunacion.registrar(null)` | 2 pasos con launch ✓ |
| `expro.explotacion` | **NO launch** → `target: '[data-guide="btn-produccion"]'` | Submenu/Asistente |
| `expro.lacteo` | **Tanques:** `() => TanqueWizard.open()` <br> **Ordeño:** `() => OrdeñoWizard.open()` | 2 pasos con launch ✓ <br> **Riesgo:** `OrdeñoWizard` lleva ñ en global — verificar en build `:free` + WebView |
| `expro.silos` | **NO launch** → `target: '[data-guide="btn-nuevo-silo"]'` | WizardManager inline |
| `expro.fitosanitarios` | `() => GastoWizard.open({categoria:'Fitosanitarios'})` | ✓ GastoWizard |
| `expro.gastos` | `() => GastoWizard.open()` | ✓ GastoWizard |
| `expro.proveedores` | **NO launch** → `target: '[data-guide="btn-nuevo-proveedor"]'` | Modal propio |
| `expro.tramites` (panorámica cubre sub-tabs) | **guias:** `() => App._abrirWizardGuiaMovimiento()` <br> **censo:** `() => App._abrirWizardCenso()` <br> **crotales:** `() => App._abrirWizardCrotales()` <br> **traslado:** `() => App._abrirWizardTraslado()` | 4 pasos con launch ✓ |
| `comer.leche` | `() => WizardGuiaMovimiento.abrir(null)` | ✓ Wizard real |
| `comer.carne` | `() => VentaMasivaWizard.open(null)` | ✓ Wizard real |
| `comer.compradores` | **NO launch** → `target: '[data-guide="btn-nuevo-comprador"]'` | Modal propio |
| `comer.contratos` | **NO launch** → `target: '[data-guide="btn-nuevo-contrato"]'` | Modal propio |
| `comer.transportistas` | **NO launch** → `target: '[data-guide="btn-nuevo-transportista"]'` | Modal propio |

---

## Fases y desglose TDD (ACTUALIZADO)

### FASE 0 — Motor + Infraestructura (~1 sesión)

**Objetivo:** `GuideManager` funcional + registro + hooks + toggle Ajustes + FAB + loader de guías.

| # | Tarea | Archivos | Test (TDD) |
|---|-------|----------|------------|
| 0.1 | Crear `js/guide-manager.js` — overlay z-3500, máscara SVG (4 rect + hueco), popover anclado (arriba/abajo), dots progreso, botones (Ant/Sig/Saltar/No mostrar), focus trap, Escape=Salt, recálculo resize/scroll | `js/guide-manager.js` | `maybeStart` respeta precondiciones; `waitFor` resuelve target tardío ≤2s; nav next/prev/skip/dismiss muta estado; chip reanudar auto-oculta con `#tour-flotante-overlay` o `.asistente-loading-overlay` |
| 0.2 | MutationObserver perezoso para wizard (childList sin subtree, por identidad de nodo `_nodoPausa` capturado en `addedNodes`) | `js/guide-manager.js` | Observer reanuda tras `remove()` del nodo pausado; ignora otros `removedNodes`; cubre 3 salidas (Finalizar, Cancelar confirmado, Android-back `wizard.remove()`) |
| 0.3 | Crear `js/guide-registry.js` — `register(guide)`, `getByRouteTab(route,tab)`, `getPanoramica(route)`, filtrado `applies(flags)` | `js/guide-registry.js` | Lookup correcto por (route,tab); panorámicas (`tab:null`) separadas; `applies` filtra `gegan.patrimonio` sin carne |
| 0.4 | Hook auto-arranque en `app.js:1188` tras `await App[methodName](params)` — `GuideManager.maybeStart(path, tab)` con `tab = window[viewName]._activeSubModule` y helper `_viewForMethod` | `js/app.js` | Auto-arranque tras render; no arranca si bienvenida activa; no arranca si `enabled=false` o `seen`/`dismissed` |
| 0.5 | Helper cambio tab en `app.js:663` — `_cambiarSubmoduloConGuia(viewName,key)` que `await window[viewName]._cambiarSubModulo(key)` y `EventBus.emit('view:tabChanged',{viewName,tab:key})` | `js/app.js` | Emit tras DOM nuevo montado; `GuideManager` re-ancla paso activo; `maybeStart` evalúa guía nuevo tab |
| 0.6 | Patch 3 vistas: `_cambiarSubModulo` → `return this.render()` (1 línea cada una) | `ganaderia-view.js:108`, `explotacion-view.js:16`, `comercializacion-view.js:306` | Retorno Promise mantiene compatibilidad con `onclick` existentes |
| 0.7 | Toggle "Guías interactivas" + botón "Reiniciar todas" en `ajustes-view.js` — persistido en `appConfig.guides` merge defaults | `js/views/ajustes-view.js` | Toggle off → `isEnabled()=false` → no auto-arranque; reset limpia `seen`+`dismissed`; merge sobrevive configs previas |
| 0.8 | Loader guías por grupo de ruta en `_ensureRouteScripts` — carga `js/guides/<pillar>/*` bajo demanda | `js/app.js` | Scripts guías cargados solo al entrar a su ruta; no bloquean carga inicial |
| 0.9 | FAB "Guía" por subvista + icono `Icons.ayuda()` nuevo en `js/icons.js` | `js/icons.js`, 3 vistas + sub-vistas | FAB visible si `enabled`; relanza guía tab actual ignore `seen`/`dismissed` |
| 0.10 | Estilos CSS overlay guide + popover + spotlight + chip reanudar (z-4500, responsive, Marco Galáctico, sin borde sup iluminado) | `css/styles.css` | z-index sanado (§3.2 spec); chip debajo toast (6000) y btn-pesaje-close (5001) |
| 0.11 | Suite QA motor en `js/qa-guias.js` con `GuiaQA.runAll()` (patrón repo: `qa-margen-animal.js:11`) | `js/qa-guias.js` | Verifica: motor precondiciones, waitFor, nav, MutationObserver 3 salidas, chip auto-oculto, persistencia `seen`/`dismissed`/`enabled`, toggle Ajustes on/off, FAB relanza, `launch` abre wizard correcto |

---

### FASE 1 — GeGan (~2 sesiones)

**Objetivo:** 6 guías declarativas + `data-guide` en vistas GeGan + verificación navegador.

| # | Guía | Archivo | Pasos clave (launch real) |
|---|------|---------|---------------------------|
| 1.1 | `gegan.panoramica` | `js/guides/gegan-panoramica.js` | 4 pasos narrativos recorren carrusel (sin `launch`) |
| 1.2 | `gegan.animales` | `js/guides/gegan-animales.js` | **NO launch** → `target: '[data-guide="btn-nuevo-animal"]'` + campos crotal/sexo/raza/f.nac |
| 1.3 | `gegan.rebanos` | `js/guides/gegan-rebanos.js` | **NO launch** → `target: '[data-guide="btn-nuevo-rebano"]'` + nombre/capacidad/ubicacion |
| 1.4 | `gegan.patrimonio` | `js/guides/gegan-patrimonio.js` | (condicional `flags.carne`) `launch: () => App._abrirAsistenteProduccion('carne', {origen:'patrimonio'})` |
| 1.5 | `gegan.zonas` | `js/guides/gegan-zonas.js` | **NO launch** → `target: '[data-guide="btn-nueva-zona"]'` + UGM/carga/PAC |
| 1.6 | `gegan.sanidad` | `js/guides/gegan-sanidad.js` | **Tratamiento:** `launch: () => WizardTratamiento.registrar(null)` <br> **Vacunación:** `launch: () => WizardVacunacion.registrar(null)` <br> **Crotales:** `launch: () => App._abrirWizardCrotales()` <br> **Guía Mov.:** `launch: () => App._abrirWizardGuiaMovimiento()` — supresión siempre visible |

**Atributos `data-guide` mínimos** (añadir en cada sub-vista):
- `animales-view.js`: `btn-nuevo-animal` (line 66), `crotal-input`, `sexo-select`, `raza-select`, `fnac-input`
- `rebanos-view.js`: `btn-nuevo-rebano` (line 75), `nombre-input`, `capacidad-input`, `ubicacion-select`
- `patrimonio-view.js`: `btn-produccion` (line 52 — ya existe), `lote-select`, `conversion-input`
- `zonas-view.js`: `btn-nueva-zona` (line 232), `nombre-input`, `ugm-input`, `carga-input`, `pac-checkbox`
- `sanidad-view.js`: `btn-add-tratamiento` (line 197), `btn-add-vacunacion` (line 200), `btn-add-crotales` (line 201), `btn-add-guia` (line 202), `supresion-input`

**Verificación:** cada guía en web (PWA) + emulador WebView Android (safe-areas, edge-to-edge, rotación).

---

### FASE 2 — ExPro (~2 sesiones)

**Objetivo:** 8 guías + `data-guide` vistas ExPro.

| # | Guía | Archivo | Pasos clave (launch real) |
|---|------|---------|---------------------------|
| 2.1 | `expro.panoramica` | `js/guides/expro-panoramica.js` | 4 pasos recorren carrusel ExPro (sin `launch`) |
| 2.2 | `expro.explotacion` | `js/guides/expro-explotacion.js` | **NO launch** → `target: '[data-guide="btn-produccion"]'` (line 243) — submenu/asistente |
| 2.3 | `expro.lacteo` | `js/guides/expro-lacteo.js` | **Tanques:** `launch: () => TanqueWizard.open()` <br> **Ordeño:** `launch: () => OrdeñoWizard.open()` — **verificar build `:free` + WebView por ñ en global** |
| 2.4 | `expro.silos` | `js/guides/expro-silos.js` | **NO launch** → `target: '[data-guide="btn-nuevo-silo"]'` (line 145) — WizardManager inline |
| 2.5 | `expro.fitosanitarios` | `js/guides/expro-fitosanitarios.js` | `launch: () => GastoWizard.open({categoria:'Fitosanitarios'})` |
| 2.6 | `expro.gastos` | `js/guides/expro-gastos.js` | `launch: () => GastoWizard.open()` |
| 2.7 | `expro.proveedores` | `js/guides/expro-proveedores.js` | **NO launch** → `target: '[data-guide="btn-nuevo-proveedor"]'` (line 42) — modal propio |
| 2.8 | `expro.tramites` | `js/guides/expro-tramites.js` | **guias:** `launch: () => App._abrirWizardGuiaMovimiento()` <br> **censo:** `launch: () => App._abrirWizardCenso()` <br> **crotales:** `launch: () => App._abrirWizardCrotales()` <br> **traslado:** `launch: () => App._abrirWizardTraslado()` |

**Atributos `data-guide`** en sub-vistas correspondientes — 5-6 por vista.

**Verificación:** mismo criterio Fase 1.

---

### FASE 3 — CoMer (~1.5 sesiones)

**Objetivo:** 6 guías + `data-guide` vistas CoMer.

| # | Guía | Archivo | Pasos clave (launch real) |
|---|------|---------|---------------------------|
| 3.1 | `comer.panoramica` | `js/guides/comer-panoramica.js` | 4 pasos recorren carrusel CoMer (sin `launch`) |
| 3.2 | `comer.leche` | `js/guides/comer-leche.js` | (condicional `flags.leche`) `launch: () => WizardGuiaMovimiento.abrir(null)` |
| 3.3 | `comer.carne` | `js/guides/comer-carne.js` | (condicional `flags.carne`) `launch: () => VentaMasivaWizard.open(null)` |
| 3.4 | `comer.compradores` | `js/guides/comer-compradores.js` | **NO launch** → `target: '[data-guide="btn-nuevo-comprador"]'` (line 75) — modal propio |
| 3.5 | `comer.contratos` | `js/guides/comer-contratos.js` | **NO launch** → `target: '[data-guide="btn-nuevo-contrato"]'` (line 80) — modal propio |
| 3.6 | `comer.transportistas` | `js/guides/comer-transportistas.js` | **NO launch** → `target: '[data-guide="btn-nuevo-transportista"]'` (line 114) — modal propio |

**Atributos `data-guide`** en sub-vistas CoMer.

**Verificación:** mismo criterio.

---

### FASE 4 — Cierre y QA (~0.5 sesión)

| # | Tarea | Detalle |
|---|-------|---------|
| 4.1 | QA regresión web PWA MSIX + WebView Android | Spotlight, popover, safe-areas, rotación, z-index |
| 4.2 | Extender `PremiumQA.runAll()` | Verifica persistencia `guides.{enabled,seen,dismissed}` y toggle desactiva auto-arranque |
| 4.3 | Bump `CACHE_NAME` en `sw.js` + `?v=` en `<script>`/`<link>` editados | SW cache-first obligatorio |
| 4.4 | Build `:free` + `cap sync android` | Flujo estándar repo — **verificar `OrdeñoWizard` en WebView** |
| 4.5 | Commit + PR a `master` (rama protegida) | Usuario revisa antes de fusionar |

---

## Interfaces y contratos (TypeScript-like para claridad)

```ts
// js/guide-registry.js
interface Guide {
  id: string;                    // 'gegan.animales'
  pillar: 'gegan'|'expro'|'comer';
  route: string;                 // '/ganaderia' | '/explotacion' | '/comercializacion'
  tab: string | null;            // 'animales' | null (panorámica)
  applies: (flags: {leche:boolean, carne:boolean}) => boolean;
  steps: GuideStep[];
}

interface GuideStep {
  target: string | null;         // selector o null = paso narrativo centrado
  waitFor?: boolean;             // reintenta querySelector hasta 2s
  title: string;
  body: string;                  // markdown ligero: **negrita** para datos clave
  launch?: () => void;           // arranca wizard real con su API concreta
  optional?: boolean;            // salta si precondición no se da
}

// js/guide-manager.js
interface GuideState {
  enabled: boolean;
  seen: string[];                // ids completadas
  dismissed: string[];           // "No mostrar de nuevo"
}

// Métodos públicos
GuideManager.maybeStart(route: string, tab: string | null): Promise<void>;
GuideManager.start(guideId: string): Promise<void>;
GuideManager.relaunch(guideId: string): Promise<void>;
GuideManager.next(): void;
GuideManager.prev(): void;
GuideManager.skip(): void;
GuideManager.dismiss(): void;     // marca dismissed + persiste
GuideManager.isEnabled(): boolean;
GuideManager._hydrate(): Promise<void>;  // startup si !App._config
```

---

## Puntos de integración exactos (file:line verificado)

| Punto | Archivo:Línea | Acción |
|-------|---------------|--------|
| Hook auto-arranque | `app.js:1188` | Tras `await App[methodName](params)` → `GuideManager.maybeStart(path, tab)` |
| Helper _viewForMethod | `app.js` (nuevo) | Mapa `methodName → viewName` (p.ej. `renderGanaderia` → `GanaderiaView`) |
| Cambio tab | `app.js:663` | Reemplaza inline `cerrarYNavegar` por `App._cambiarSubmoduloConGuia(viewName,key)` |
| _cambiarSubModulo return | `ganaderia-view.js:108` | `return this.render()` |
| _cambiarSubModulo return | `explotacion-view.js:16` | `return this.render()` |
| _cambiarSubModulo return | `comercializacion-view.js:306` | `return this.render()` |
| Config persistencia | `ajustes-view.js:241,251` | `_saveConfig` mergea `guides` en `App._config` |
| Icono ayuda | `js/icons.js` (nuevo método) | `ayuda(): string` → SVG interrogación `currentColor` |
| Loader guías | `app.js` `_ensureRouteScripts` | Carga `js/guides/<pillar>/*` bajo demanda |

---

## Criterios de aceptación por fase (ACTUALIZADOS)

| Fase | Done cuando |
|------|-------------|
| 0 | Motor arranca guía test en `/ganaderia` tab `animales`; MutationObserver reanuda tras cerrar wizard real; toggle Ajustes off/on funciona; FAB relanza; chip reanudar aparece/oculta correctamente; `GuiaQA.runAll()` verde |
| 1 | 6 guías GeGan completan sin error en navegador + emulador; `patrimonio` solo aparece con `flags.carne`; supresión sanidad visible en paso correspondiente; guías sin launch usan `target` y avanzan al tocar botón real |
| 2 | 8 guías ExPro completan; `explotacion` (tab por defecto) auto-arranca primero; `expro.lacteo` verificado en build `:free` + WebView (ñ en `OrdeñoWizard`) |
| 3 | 6 guías CoMer completan; `leche`/`carne` condicionales a flags; guías sin launch usan `target` y avanzan al tocar botón real |
| 4 | `PremiumQA` verde; build `:free` + `cap sync` ok; PR creado |

---

## Riesgos ya mitigados en el spec (no repetir)

- C-1..C-5, B-1..B-6 resueltos en diseño (§2.1, §5.2, §6.1, §6.2, §6.3)
- Z-index saneado (§3.2)
- MutationObserver cubre 3 salidas wizard sin tocar `wizard-manager.js`
- `waitFor` resuelve targets lazy/modales
- Re-anclaje `requestAnimationFrame` ×2 tras `view:tabChanged`
- Merge defaults config sobrevive migraciones
- **NUEVO:** `OrdeñoWizard` con ñ en global — verificado en build `:free` + WebView (Fase 2.3, 4.4)

---

## Comandos de verificación rápida

```bash
# Suite QA motor (DevTools console)
# > GuiaQA.runAll()

# Build free + sync android
npm run build:free && npx cap sync android
```

---

## Notas para el ejecutor (FASE 0 inline, resto subagent-driven-development)

- **FASE 0 inline** en esta sesión (alto acoplamiento: app.js, 3 vistas, ajustes-view.js, icons.js, styles.css). Un subagente fresco no tiene el contexto de las 11 correcciones verificadas.
- **Fases 1-3 con subagentes** (`subagent-driven-development`), una vez el motor existe y el contrato (Guide/GuideStep + data-guide) está congelado.
- **Una tarea = un subagente** (según skill). Cada fila de la tabla TDD es una tarea atómica.
- **No `git add .` nunca** — añadir archivos individuales (`git add <archivo>`).
- **Commit + push tras cada fase** (PR a master, usuario revisa).
- **Verificación en navegador real** obligatoria por guía (no solo tests).
- **Icono `Icons.ayuda()`** — añadir en `js/icons.js` siguiendo patrón `info()` (`js/icons.js:445`).
- **Selectores `data-guide`** — añadir en vistas/sub-vistas según tabla Fases 1-3; son el contrato estable entre guía y vista.
- **`launch` usa APIs reales** — no hay interfaz uniforme; cada guía declara su llamada concreta (tabla corregida arriba).
- **SW cache-first** — bump `CACHE_NAME` + `?v=` en `index.html` tras tocar CSS/JS (memoria `deploy-cache-build`).
- **Tests** — patrón repo: `js/qa-*.js` con `XxxQA.runAll()` ejecutado en DevTools console. No Jest/jsdom/npm test.