# Diseño: Guías de uso interactivas (wizard flotante) para GeGan, ExPro y CoMer

**Fecha:** 2026-08-02
**Autor:** Diseño colaborativo (revisión contra código real)
**Estado:** Pendiente de revisión del usuario antes de implementar
**Alcance:** Motor de guías reutilizable + guías por submódulo de los pilares GeGan, ExPro y CoMer

---

## 1. Resumen ejecutivo

Incorporar a la app **guías de uso interactivas desactivables**, tipo wizard flotante paso a paso, que guíen al usuario por cada submódulo de los pilares GeGan, ExPro y CoMer, señalando cada acción y resaltando los datos imprescindibles. En el paso de captura, la guía **arranca el wizard de captura REAL ya existente** en la app (no duplica formularios).

Funciona como un **tour guiado + lanzador de wizards reales** (híbrido). Reutiliza `WizardManager`, `ModalManager`/`Toast`/`Confirm`, `EventBus`, el mapa de `module-colors.js` y los tokens del design system. Sin dependencias externas (sin Driver.js / Shepherd / intro.js — la app es 100% vanilla con un design system estricto).

Decisión del usuario: **una guía por sub-vista**, orden de implementación **GeGan → ExPro → CoMer**. El contenido de pasos y campos imprescindibles se infiere del modelo de datos (`js/db.js`), de las validaciones de los wizards reales existentes y de la normativa `docs/GUIA_*.html` (SIGGAN/BADIGEX).

---

## 2. Decisiones de diseño (validadas con el usuario)

| # | Decisión |
|---|---|
| D1 | **Naturaleza híbrida**: tour guiado que señala paso a paso y arranca los wizards de captura reales ya existentes (no crea wizards nuevos). |
| D2 | **Disparo**: auto-arranque al primer uso por submódulo (se recuerda cuáles vio) + botón flotante "Guía" para relanzar + interruptor global en Ajustes para desactivar TODO + "No mostrar de nuevo" por guía + "Reiniciar todas las guías" en Ajustes. |
| D3 | **Granularidad**: una guía por cada sub-vista (tab) de cada pilar. Orden GeGan → ExPro → CoMer. |
| D4 | **Contenido**: inferido de `db.js` + validators de wizards reales + `docs/GUIA_*.html` (normativa SIGGAN/BADIGEX). |

### 2.1 Correcciones verificadas en código (no suposiciones)

Estas correcciones a la arquitectura inicial provienen de lectura directa del código y están verificadas con `file:line`:

- **C-1 · 3 salidas de WizardManager, no 2**: Finalizar (`wizard-manager.js:101`), Cancelar abortable vía `Confirm.confirm` (`:109-114`), y Android-back que hace `wizard.remove()` directo (`app.js:492`) tras probar `cancelBtn.click()` (`:490`). Una salida vive fuera del módulo a parchear.
- **C-2 · Cambio de tab re-rendera el DOM sin cambiar el hash**: `cerrarYNavegar` (`app.js:663`) es el único chokepoint; `_cambiarSubModulo` → `this.render()` (`ganaderia-view.js:108`). El spotlight/popover existente se destruye en cada cambio de tab → `GuideManager` debe re-anclarse tras el render, no solo escuchar el clic.
- **C-3 · Colisión de z-index**: `#tour-flotante-overlay` z-4000 (`styles.css:2160`), `.asistente-loading-overlay` z-9999 (`:2148`). El chip "Reanudar" debe auto-ocultarse si hay tour de bienvenida o asistente activo. (`.wizard-overlay` z-7000 en `:3127` es CSS muerto: 0 usos en JS/HTML.)
- **C-4 · Submódulos condicionales**: `patrimonio` solo existe si `flags.carne` (`ganaderia-view.js:32-33`); `_cambiarSubModulo` hace early-return si el tab no está permitido (`:103-105`). El registro de guías filtra por `ModoContextoHelper.getFlags()`.
- **C-5 · `App._config` cachea en memoria**: `AjustesView._saveConfig` escribe `App._config = merged` (`ajustes-view.js:251`). `GuideManager.isEnabled()` lee la cache sin tocar IndexedDB (sólo hidrata una vez en startup si `App._config` no existe).

---

## 3. Arquitectura

### 3.1 Componentes nuevos (todos consistentes con el design system)

```
js/guide-manager.js          GuideManager (overlay z-3500; popover+spotlight+máscara SVG)
                            + MutationObserver perezoso para detectar cierre de wizard
                            + waitFor(selector) para targets lazy/modales
js/guides/*.js               contenido declarativo por (ruta, tab):
                            steps:[{ target, waitFor?, title, body, launch?: ()=>... }]
                            + auto-registro en window.GuideRegistry al cargar
js/guide-registry.js         registro + lookup by (route, tab) con filtrado por flags
hook en app.js:~1188         tras render de la vista: GuideManager.maybeStart(path, tab)
patch en app.js:663          tras _cambiarSubModulo: notificar al guide (re-anclaje)
ajustes-view.js              toggle "Guías interactivas" + botón "Reiniciar todas"
                            persistido en appConfig.guides vía _saveConfig
FAB "Guía" por subvista      relanza la guía a mano (incluso si ya vista)
importadores de guías        loader de js/guides/* bajo demanda por grupo de ruta
```

No se parchea `wizard-manager.js`. La coordinación tour↔wizard se hace por observación del DOM, no por events inyectados en el framework (ver §5).

### 3.2 Z-index saneado

(z-index verificados en `styles.css`/`modal-manager.js`)

| Elemento | z-index | Notas |
|---|---|---|
| Header fijo | 2000 | existente |
| Overlay guide | **3500** | encima del header y el DOM de la vista; debajo del wizard (4000) |
| `.wizard-full-screen` | 4000 | existente (`styles.css:667`) — el wizard tapa el tour automáticamente |
| `#tour-flotante-overlay` (bienvenida) | 4000 | existente (`styles.css:2160`) — el guide/chip se auto-oculta si está presente |
| Chip "Reanudar guía" | **4500** | entre wizard (4000) y toast (6000); evita `.btn-pesaje-close` (5001, `styles.css:3894`). Auto-oculto si `#tour-flotante-overlay` o `.asistente-loading-overlay` están en el DOM |
| `.btn-pesaje-close` | 5001 | existente — el chip (4500) queda por debajo |
| `.toast` | 6000 | existente (`styles.css:596`) — el chip (4500) queda por debajo, no lo tapa |
| Modales (ModalManager) | 10000 + 10·n | dinámico (`modal-manager.js:19`) |
| `.asistente-loading-overlay` | 9999 | existente (`styles.css:2148`) |
| `.error-overlay` | 99999 | existente (`styles.css:2227`) |
| `.pdf-loader-overlay` | 100000 | existente (`styles.css:3211`) |

### 3.3 Estado y persistencia

Persistencia en IndexedDB, clave `meta.appConfig`, sub-objeto `guides`:

```js
appConfig.guides = {
  enabled: true,                 // toggle global
  seen: ['gegan.animales', ...], // guías completadas (auto-arranque no repite)
  dismissed: ['gegan.sanidad']   // "No mostrar de nuevo" por guía (FAB aún relanza)
}
```

- Escritura: `AjustesView._saveConfig({ guides: {...} })` → actualiza `App._config` en memoria (`:251`).
- Lectura caliente: `GuideManager.isEnabled()` ≡ `App._config?.guides?.enabled ?? true`.
- Startup: si `!App._config`, `GuideManager._hydrate()` llama una vez a `AjustesView._loadConfig()` y cachea en `App._config`.
- Merge con defaults al cargar: `{ enabled:true, seen:[], dismissed:[] }` sobrevive a configs previas sin `guides` (no rompe migraciones).

---

## 4. Sección 2 — Modelo de contenido (declarativo)

Una guía = un módulo `js/guides/*.js`. Se auto-registra al cargarse:

```js
// js/guides/gegan-animales.js
(function () {
  window.GuideRegistry = window.GuideRegistry || [];
  window.GuideRegistry.push({
    id: 'gegan.animales',
    pillar: 'gegan',         // color del popover: getModuleColor('/ganaderia') = lima
    route: '/ganaderia',
    tab: 'animales',
    applies: (flags) => true,                  // siempre; patrimonio => (flags) => flags.carne
    steps: [
      {
        target: '[data-guide="btn-add-animal"]',
        waitFor: true,                          // reintenta hasta que el nodo exista (lazy/modal)
        title: 'Añadir animal',
        body: 'Toca **+** para registrar un animal nuevo. El crotal es **imprescindible** (identificación individual, SIGGAN).'
      },
      {
        target: '[data-guide="crotal-input"]',
        title: 'Crotal',
        body: '15 dígitos (ISO 11784). Sin crotal no se puede exportar ni mover el animal.'
      },
      {
        launch: () => window.WizardFinca.showForm({}),  // paso de captura REAL
        title: 'Sin finca activa',
        body: 'Si no tienes finca, créala ahora. Es requisito para registrar animales.',
        optional: true                            // si ya hay finca activa, se salta este paso
      }
    ]
  });
})();
```

**Esquema de un paso:**

| Campo | Tipo | Descripción |
|---|---|---|
| `target` | string (selector) | Elemento a destacar. Si es `null`, es un paso narrativo centrado (sin spotlight). |
| `waitFor` | bool | Si `true`, reintenta `querySelector` hasta 2s (targets bajo demanda, modales). |
| `title` | string | Título corto del paso. |
| `body` | string (markdown ligero) | Explicación. `**negrita**` para resaltar datos imprescindibles. |
| `launch` | `() => void` | Opcional. Función que arranca el wizard de captura real con su API concreta. El tour pausa hasta que el wizard cierra. |
| `optional` | bool | Si `true` y la precondición no se da (ej. ya hay finca), el paso se salta. |

**Reglas de contenido:**

- **API de wizards no uniforme** (verificado): cada wizard expone su propio método — `WizardFinca.showForm(opts)`, `WizardVacunacion.registrar(rebanoId, opts)`, `WizardTraslado.abrir()`, `WizardTratamiento.abrir(opts)`, `WizardCenso.abrir()`, `WizardCrotales.abrir(borrador)`, `GastoWizard.open(opts)`, `WizardGuiaMovimiento.abrir(borrador)`, `VentaMasivaWizard.open(borrador)`. El `launch` del paso declara la llamada concreta; no existe `.showForm()` uniforme.
- **Selectores estables**: los `target` usan atributos `data-guide="..."` añadidos a las vistas (cambio mínimo, no depende de clases que cambian). Cuantos menos, mejor; el primer paso puede ser `target: null` (intro centrada).
- **Panorámicas de pilar**: una guía panorámica declara `tab: null` (frente a `tab: 'animales'` etc. en las de submódulo). El motor distingue así ambos tipos para la prioridad de auto-arranque (§6.1).
- **Datos imprescindibles**: inferidos de `db.js` (stores/índices → campos obligatorios), de `validate()` de cada wizard real, y de `docs/GUIA_*.html` (normativa SIGGAN/BADIGEX). Se marcan con `**negrita**` en `body`.
- **Sin emojis**: tipografía estricta (`.agent/AGENTS.md`, regla 2026-07-03). Negrita y `Icons.*` sólo.

**Catálogo de guías (granularidad por TAB REAL del carrusel, verificado en el `renderCarruselPestanas` de cada vista — no derivado del `redirectMap`, que está incompleto):**

| Pilar | vista | tabs reales (carrusel) | guía | condicional `applies(flags)` |
|---|---|---|---|---|
| GeGan | `GanaderiaView` (`ganaderia-view.js:22-27,51`) | animales, rebanos, patrimonio¹, zonas, sanidad | `gegan.animales`, `gegan.rebanos`, `gegan.patrimonio`, `gegan.zonas`, `gegan.sanidad` | patrimonio solo `flags.carne` (`:32-33`); resto siempre |
| GeGan | `GanaderiaView` | — (intro de pilar) | `gegan.panoramica` (`tab: null`) | siempre |
| ExPro | `ExplotacionView` (`explotacion-view.js:228-236`) | explotacion², lacteo, silos, fitosanitarios, gastos, proveedores, tramites | `expro.explotacion`, `expro.lacteo`, `expro.silos`, `expro.fitosanitarios`, `expro.gastos`, `expro.proveedores`, `expro.tramites` | todos siempre |
| ExPro | `ExplotacionView` | — (intro) | `expro.panoramica` (`tab: null`) | siempre |
| CoMer | `ComercializacionView` (`comercializacion-view.js:126-128,268-291`) | leche³, carne, compradores, contratos, transportistas | `comer.leche`, `comer.carne`, `comer.compradores`, `comer.contratos`, `comer.transportistas` | leche `flags.leche`; carne `flags.carne`; resto siempre |
| CoMer | `ComercializacionView` | — (intro) | `comer.panoramica` (`tab: null`) | siempre |

¹ `patrimonio` sólo se añade al carrusel si `flags.carne` (`ganaderia-view.js:32-33`); en fincas solo-leche el tab no existe y la guía no aplica (auto-arranque filtrado por `applies`).
² `explotacion` es el tab por defecto de ExPro (`explotacion-view.js:209`) — modo de explotación, balance leche/carne, FAB adaptativo.
³ `leche` es el tab por defecto de CoMer (`priorityOrder`, `comercializacion-view.js:132`) cuando `flags.leche`.

**Total: 21 guías** (18 por tab + 3 panorámicas de pilar). Son los **tabs por defecto de ExPro (`explotacion`) y CoMer (`leche`)** los que el usuario ve primero — por eso eran bloqueante.

---

## 5. Sección 3 — Motor `GuideManager`

### 5.1 Responsabilidades

`GuideManager` (singleton, `window.GuideManager`):

1. `maybeStart(route, tab)` — evalúa si debe auto-arrancar la guía de `(route, tab)`:
   `isEnabled() && fincaActiva && !seen(id) && !dismissed(id) && applies(flags)`. Si sí, arranca.
2. `start(guideId)` — monta overlay + spotlight del primer paso, popover narrativo, dots, botones.
3. `next()` / `prev()` / `skip()` / `dismiss()` — navegación. `dismiss()` marca `dismissed[id]=true` y persiste.
4. `relaunch(guideId)` — arranca sin importar `seen`/`dismissed` (botón FAB).
5. Re-anclaje: al recibir notificación de cambio de tab, recalcula `target` del paso actual tras el render (`requestAnimationFrame` ×2).
6. Coordinación wizard↔tour: al ejecutar un paso `launch`, pausa el tour y observa el cierre del wizard (§5.2).

### 5.2 Coordinación con wizards — MutationObserver (no parches en `wizard-manager.js`)

**Problema:** un paso `launch` abre un wizard de captura real (`.wizard-full-screen`, z-4000). El tour (z-3500) queda tapado por el wizard — correcto, el usuario opera el wizard real. Al **cerrar** el wizard, el tour debe reanudar. Hay **3 formas de cerrar** un wizard (verificado, §2.1 C-1):

- Finalizar (`wizard-manager.js:101` → `overlay.remove()`)
- Cancelar confirmado (`:109-114` → `overlay.remove()` — abortable vía `Confirm.confirm`)
- Android-back directo (`app.js:492` → `wizard.remove()`, **fuera de `wizard-manager.js`**)

**Justificación del MutationObserver frente al parche en `wizard-manager.js`:**

Las 3 salidas **convergen en un único suceso observable**: el nodo `.wizard-full-screen` se elimina de `document.body`. El MutationObserver observa el resultado, no el mecanismo:

| Criterio | Parche (emit en wizard-manager) | MutationObserver |
|---|---|---|
| Cubre Finalizar | sí (emit en `:101`) | sí |
| Cubre Cancelar confirmado | sí, **si** el emit va tras `overlay.remove()` (no antes) | sí |
| Cubre Cancelar abortado (`Confirm` → `false`) | el emit antes de `remove()` anuncia un cierre falso; tras `remove()` no se ejecuta en el flujo abortado → **asimétrico** | no fire (el nodo no se elimina) → correcto por construction |
| Cubre Android-back (`app.js:492`) | **no** — `wizard.remove()` no pasa por ningún `onclick`; requeriría un 4º punto en otro archivo | sí |
| Acoplamiento | GuideManager conoce WizardManager internals | no conoce (observa `.wizard-full-screen` por clase) |
| Superficie de regresión | toca un framework usado por 15 wizards | no toca código externo |
| Atribución finalizar vs cancelar | disponible (el emit puede llevar el motivo) | no distingue (sólo "desapareció") |

El parche es **incompleto por construcción**: una salida vive fuera del módulo a parchear y otra es abortable, rompiendo la simetría de dónde poner el emit. El MutationObserver cubre las 3 salidas con 1 pieza sin tocar código externo.

**Implementación con afinados (ruido y atribución resueltos):**

- **Observación por identidad, no por clase.** `observe(document.body, { childList: true })` **sin `subtree`** — los toasts/modales anidados no aparecen en el lote. La app hace `document.body.appendChild` directo en muchos sitios (`app.js:1870/2061/2850`, `asistente-configuracion.js:119`, etc.), pero el callback sólo actúa si `removedNodes.includes(this._nodoPausa)` (comparación de identidad, O(1), cero falsos positivos aunque se cierre otro overlay).
- **Observer perezoso**: sólo activo mientras el guide está "pausado esperando wizard" (creado en `launch`, desconectado al reanudar). Coste fuera del paso de captura: 0.
- **Atribución (YAGNI)**: hoy no se necesita distinguir "finalizó" de "canceló" — la reanudación es la misma. Si fuera necesaria, se resolvería desde el `launch` del paso envolviendo el `onComplete`/`onCancel` que cada wizard pasa a `WizardManager.create(options)` (`wizard-manager.js:8`), sin tocar el manager.
- **Apertura, no cierre**: el guide sabe que abre un wizard porque lo abre él (`launch`). El `EventBus` no necesita un evento `wizard:opened` para el guion del tour. El observer también cubre el caso de un wizard abierto por el usuario fuera del guion (un FAB que toca durante el tour): `addedNodes` con `.wizard-full-screen` al mismo observer `childList` lo detecta con la misma pieza — el tour se pausa igual.

**Pseudocódigo (aproximado, ~40 líneas):**

> **Corrección B-1:** el nodo del wizard no existe antes de `step.launch()`, así que `_nodoPausa` se captura **desde `addedNodes`** en el callback, no con un `querySelector` previo al `launch`. Una sola rama cubre dos casos: (a) el wizard que abre el propio `launch`, y (b) un wizard abierto por el usuario fuera del guion.

```js
// Al ejecutar un paso con launch:
async _runLaunchStep(step) {
  this._nodoPausa = null; // aún no existe el wizard
  this._observer = new MutationObserver(muts => {
    for (const m of muts) {
      // Capturar el nodo del wizard cuando aparece (caso a y b):
      if (!this._nodoPausa) {
        const nuevo = [...m.addedNodes].find(n => n.classList?.contains('wizard-full-screen'));
        if (nuevo) { this._nodoPausa = nuevo; this._hidePopover(); continue; }
      }
      // Cierre (3 salidas convergen aquí):
      if (this._nodoPausa && [...m.removedNodes].includes(this._nodoPausa)) {
        this._teardownObserver();
        this._resumeAfterWizard();
        return;
      }
    }
  });
  this._observer.observe(document.body, { childList: true }); // sin subtree
  step.launch(); // abre el wizard real → entra por la rama addedNodes
}
```

### 5.3 Popover + spotlight (UI del motor)

- **Máscara SVG**: 4 rect sombreados + 1 hueco recortado sobre `target.getBoundingClientRect()`. Backdrop `rgba(0,0,0,0.82)` + blur ligero (respeta Marco Galáctico — no invada el header con glow lateral).
- **Spotlight**: anillo del neón semántico del pilar (`getModuleColor(route)`), doble glow (outer+inner), sin fill.
- **Popover anclado**: arriba del `target` si hay espacio, abajo si no. Card sin borde superior iluminado (regla estricta de cards): sólo base de fondo `var(--surface)` con radio `var(--r-xl)`.
- **Dots de progreso**: estilo `.tour-dot` del tour de bienvenida (reutiliza patrón visual).
- **Botones**: Anterior / Siguiente / Saltar / **"No mostrar de nuevo"**. Touch-min `var(--touch-min)` (50px), `:active{transform:scale(.95)}` (feedback táctil). SÓLO iconos `Icons.*` (cero emoji).
- **Recalcular posición** on `resize`/`scroll`/`orientationchange`.
- **Focus trap** accesible (Tab dentro del popover; Escape = Saltar).
- **Chip "Reanudar guía"**: `.fab` flotante z-4500, visible cuando el tour está pausado por wizard. **Auto-oculto** si `#tour-flotante-overlay` o `.asistente-loading-overlay` están en el DOM (no flota sobre la bienvenida). Debajo de toasts (6000) para no taparlos.

---

## 6. Sección 4 — UX de disparo y desactivación

### 6.1 Auto-arranque

- **Punto de inyección**: `app.js:1188`, inmediatamente tras `await App[methodName](params)` (DOM de la vista ya montado). Llama `GuideManager.maybeStart(path, tab)`.

> **Corrección B-4 — origen del `tab` (no se lee del `?tab=` del query param).** Las 3 vistas no tratan igual el parámetro: `GanaderiaView.render()` no acepta argumentos (`ganaderia-view.js:10`) e ignora `?tab=` pese a que el `redirectMap` lo genera; `ExplotacionView.render(options)` lo recibe pero no lo usa para el tab (`:199-211`); solo `ComercializacionView` lo lee (`comercializacion-view.js:131`). La **única fuente fiable** es el estado interno de la propia vista: `window[viewName]._activeSubModule`. En `app.js:1188` se conoce `methodName` y, de él, el `viewName` (p.ej. `renderGanaderia` → `GanaderiaView`), así:

```js
// hook en app.js, tras await App[methodName](params):
const viewName = App._viewForMethod(methodName); // mapa metodo→vista ('renderGanaderia'→'GanaderiaView')
const tab = window[viewName]?._activeSubModule ?? null;
GuideManager.maybeStart(path, tab);
```

  (El helper `App._viewForMethod` es nuevo y trivial; se alimenta de las mismas vistas que ya carga `_viewGroups`.)
- **Precondiciones** (todas deben cumplirse): `fincaId` activa (respeta `app.js:1179`); sin `#tour-flotante-overlay` ni `.asistente-loading-overlay` en el DOM; `isEnabled()`; `!seen(id)`; `!dismissed(id)`; `applies(flags)`.
- **Prioridad de selección** (resuelve la coexistencia de guía panorámica de pilar y guía por tab, ambas con el mismo `route`):
  1. Si existe guía **panorámica** para el `route` (campo `tab: null`) y no está vista ni desactivada → arranca la panorámica, ignorando el `tab` actual. La panorámica recorre el carrusel de submódulos del pilar en ~4 pasos sin entrar en detaille por tab.
  2. Si la panorámica ya está vista (o no aplica) y existe guía **del tab** `(route, tab)` no vista/no desactivada → arranca la del tab.
  3. En caso contrario no auto-arranca (ya todo visto/desactivado).
- **Persistencia de `seen`**: al completar el último paso (no antes), `_saveConfig({ guides: { ...guides, seen: seen.concat([id]) } })`.

### 6.2 Cambio de tab (sin cambio de hash)

> **Corrección B-5 — el emit debe ir tras el render, no con el DOM viejo.** `_cambiarSubModulo` **no es async** y llama `this.render()` **sin `await`** (`ganaderia-view.js:108`, `explotacion-view.js:16`, `comercializacion-view.js:306`); además `render()` tiene `await` a IndexedDB por delante. Un `EventBus.emit` encadenado en `cerrarYNavegar` (`app.js:663`) se ejecutaría con el DOM viejo, y `requestAnimationFrame` ×2 no cubre esos awaits. **Arreglo mínimo:**
> 1. En cada vista, `_cambiarSubModulo` pasa a hacer `return this.render()` (devuelve la promesa) — **una línea por vista** (3 vistas). Es retrocompatible: los `onclick` existentes ignoran el valor de retorno.
> 2. Sustituyo el inline `cerrarYNavegar` por un helper `App._cambiarSubmoduloConGuia(viewName, key)` que **awaitea** el render antes de emitir:
>
> ```js
> // js/app.js (nuevo helper, reemplaza el inline de cerrarYNavegar en :663)
> async _cambiarSubmoduloConGuia(viewName, key) {
>   await window[viewName]._cambiarSubModulo(key); // ahora devuelve la promesa
>   EventBus.emit('view:tabChanged', { viewName, tab: key });
> }
> // app.js:663 => `App.cerrarCarruselMenu(); App._cambiarSubmoduloConGuia('${viewName}','${key}')`
> ```
>
> Esto **contradice el "no se tocan las vistas" de §11** — lo asumo explícitamente: es una palabra (`return`) por vista y es lo correcto para ordenar el ciclo de vida. §11 queda actualizado.

- `GuideManager` escucha `view:tabChanged`: si hay tour activo, **re-ancla** el paso actual (recalcula `target`) — ya con el DOM nuevo montado. Si no hay tour activo, evalúa `maybeStart(route, newTab)` para auto-arrancar la guía del nuevo tab. (Seguridad extra: `maybeStart` re-valida `fincaId` y ausencia de bienvenida antes de arrancar.)

### 6.3 Controles del usuario

- **FAB "Guía"** por subvista: relanza la guía **del tab actual** (no la panorámica) sin importar `seen`/`dismissed`. Visible si `isEnabled()`. Icono: como **`Icons.ayuda()` no existe** en `js/icons.js` (verificado — solo `info()`, `:445`), hay que **añadir un método nuevo** `ayuda()` que devuelva un SVG de interrogación/ayuda en `currentColor`. Podría reutilizarse un icono existente próximo si lo hay (a decidir en implementación), pero por ahora se asume icono nuevo. Ir a §11.
- **Toggle global** en `ajustes-view.js`: "Guías interactivas" (on/off). Persiste `appConfig.guides.enabled`.
- **Botón "Reiniciar todas las guías"** en Ajustes: limpia `seen` y `dismissed` (vuelve a auto-arrancar todo). Confirma con `Confirm.confirm`.
- **"No mostrar de nuevo"** por guía: botón en el popover. Marca `dismissed[id]=true`. El FAB aún puede relanzarla.
- **Saltar**: cierra el tour sin marcar `seen` ni `dismissed` (máxima neutralidad — la guía puede volver a auto-arrancar en la próxima visita si no se desactivó).

---

## 7. Sección 5 — Fases de implementación

### Fase 0 — Motor + infraestructura (~1 sesión)
- `js/guide-manager.js` (overlay, máscara SVG, popover, dots, navegación, MutationObserver perezoso, `waitFor`, re-anclaje, focus trap, chip reanudar con auto-oculto).
- `js/guide-registry.js` (registro + lookup por `(route, tab)` + filtrado por `applies(flags)`).
- Hooks: `app.js:1188` (`maybeStart` tras render) y `app.js:663` (`emit view:tabChanged`).
- Ajustes: toggle "Guías interactivas" + botón "Reiniciar todas las guías" en `ajustes-view.js`.
- Loader de guías por grupo de ruta (carga `js/guides/*` bajo demanda, igual que `_ensureRouteScripts`).
- FAB "Guía" por subvista.
- Tests unitarios del motor (mock DOM / jsdom o equivalente ligero del proyecto).

### Fase 1 — GeGan (~2 sesiones)
- Guías (6): `animales`, `rebanos`, `patrimonio` (condicional a carne), `zonas`, `sanidad`, `panoramica`.
- Atributos `data-guide` mínimos en las vistas GeGan.
- Verificación en navegador (web + emulador WebView) por guía.

### Fase 2 — ExPro (~2 sesiones)
- Guías (8): `explotacion` (tab por defecto — primero que ve el usuario), `lacteo`, `silos`, `fitosanitarios`, `gastos`, `proveedores`, `tramites`, `panoramica`.
- Atributos `data-guide` en vistas ExPro. Verificación.

### Fase 3 — CoMer (~1.5 sesiones)
- Guías (6): `leche` (tab por defecto — `flags.leche`), `carne` (`flags.carne`), `compradores`, `contratos`, `transportistas`, `panoramica`.
- Atributos `data-guide` en vistas CoMer. Verificación.

### Fase 4 — Cierre (~0.5 sesión)
- QA en web (PWA MSIX) y WebView Android (safe-areas, edge-to-edge, rotación).
- `PremiumQA.runAll()` extensible: verifica que `seen`/`dismissed`/`enabled` persisten y que el toggle desactiva el auto-arranque.
- Bump `CACHE_NAME` en `sw.js` + `?v=` en los `<script>`/`<link>` editados (SW cache-first — obligatorio tras tocar CSS/JS).
- Build `:free` + `cap sync android` (flujo estándar del repo).

**Entrega incremental**: tras cada fase, commit + PR a `master` (rama protegida desde 2026-07-25). El usuario revisa antes de fusionar.

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Targets DOM ausentes al render (lazy load, modales) | `waitFor: true` reintenta `querySelector` hasta 2s antes de mostrar el paso. Pasos puramente narrativos usan `target: null`. |
| Sub-pestañas re-renderan el DOM en cada cambio | Re-anclaje en `requestAnimationFrame` ×2 tras `view:tabChanged`. El observer no depende del DOM vivo del target. |
| Wizard full-screen tapa el spotlight | Por diseño: overlay guide z-3500 < wizard z-4000. El tour se pausa; chip "Reanudar" z-4500 queda visible (auto-oculto si bienvenida activa; debajo de toasts z-6000 y `.btn-pesaje-close` z-5001). |
| Overrides de config al actualizar la app | Merge con defaults al cargar (`{ enabled:true, seen:[], dismissed:[] }`). `_loadConfig` ya mergea defaults (defaults arrancan en `ajustes-view.js:229`, merge en `:242`). |
| Falsos positivos del MutationObserver | Observación por identidad de nodo (no por clase), `childList` sin `subtree`, observer perezoso. Ver §5.2. |
| Accesibilidad / focus | Focus trap en el popover; Escape = Saltar; `aria-modal` y `role="dialog"` en el overlay. |
| Rendimiento en WebView Android | Overlay ligero (un `<svg>` + un `<div>` popover); observer sólo activo durante paso de captura; recálculo de posición throttle on resize/scroll. |
| CSS / design system | Popover sin borde superior iluminado, neón semántico del pilar, cero emoji, touch-min 50px, safe-areas respetadas. |
| Cache del Service Worker | Bump `CACHE_NAME` + `?v=` tras editar CSS/JS (memoria `deploy-cache-build`). |

---

## 9. Testing

- **Unitarios del motor** (Fase 0): `maybeStart` respeta cada precondición; `waitFor` resuelve con target tardío; navegación `next/prev/skip/dismiss` muta estado correcto; MutationObserver reanuda tras `remove()` del nodo pausado e ignora otros `removedNodes`; chip se auto-oculta con bienvenida activa.
- **Integración**: auto-arranque tras `render`; re-anclaje tras `view:tabChanged`; `launch` abre wizard real y reanuda al cerrar (3 salidas: Finalizar, Cancelar confirmado, Android-back `remove()`).
- **Persistencia**: `seen` escrito al finalizar; `dismissed` respeta "No mostrar"; toggle apaga auto-arranque; reset limpia todo.
- **Guías condicionales**: `gegan.patrimonio` aparece sólo con `flags.carne`.
- **QA regression**: `PremiumQA` extendido para cubrir el sub-objeto `guides`.
- **Manual**: revisión visual en navegador web y emulador Android (spotlight, popover, safe-areas, rotación).

---

## 10. Fuera de alcance (YAGNI)

- **Guías para módulos fuera de GeGan/ExPro/CoMer** (Informes, Cuaderno, Agenda, Ajustes): no en este esfuerzo. El motor lo permite añadir después, reutilizable.
- **Guías por perfil del usuario** (principiante vs avanzado): no. Una sola profundidad por submódulo.
- **Atribución finalizar vs cancelar en el wizard**: hoy no se distingue. Resuelto desde `launch` si fuera necesario.
- **Analytics de uso de guías** (cuántos completan cada paso): no en v1.
- **Traducción/i18n de guías**: la app es monolengua español; las guías también.
- **Audio/voz en las guías**: no.
- **Tour de bienvenida nuevo**: el existente (`asistente-configuracion.js`) se respeta; el guide se auto-oculta en su presencia.

---

## 11. Archivos afectados (resumen)

| Archivo | Cambio |
|---|---|
| `js/guide-manager.js` | **NUEVO** — motor (overlay, máscara, popover, observer, waitFor, re-anclaje, chip) |
| `js/guide-registry.js` | **NUEVO** — registro + lookup por `(route, tab)` + filtrado por `applies(flags)` |
| `js/guides/*.js` | **NUEVOS** — **21 guías** declarativas (18 por tab + 3 panorámicas) + loaders por grupo de ruta |
| `js/app.js` | Helper `_cambiarSubmoduloConGuia(viewName,key)` (awaitea render + `emit view:tabChanged`), helper `_viewForMethod(method)` (mapa método→vista), patch `:663` (usa el helper en vez del inline), hook `:1188` (`maybeStart` con `tab` desde `window[viewName]._activeSubModule`), loader de guías en `_ensureRouteScripts` |
| `js/icons.js` | **NUEVO método** `ayuda()` (SVG interrogación/ayuda, `currentColor`) — no existe hoy (B-6) |
| `js/views/ajustes-view.js` | Toggle "Guías interactivas" + botón "Reiniciar todas" (persistido en `appConfig.guides`) |
| `js/views/ganaderia-view.js`, `explotacion-view.js`, `comercializacion-view.js` | `_cambiarSubModulo` → `return this.render()` (**una línea por vista**, B-5) + atributos `data-guide` mínimos + FAB "Guía" |
| Sub-vistas (`animales-view.js`, `rebanos-view.js`, `silos-view.js`, `gastos-view.js`, `compradores-view.js`, etc.) | Atributos `data-guide` en elementos clave según cada guía |
| `css/styles.css` | Estilos del overlay guide + popover + spotlight + chip reanudar (bloque nuevo) |
| `sw.js` | Bump `CACHE_NAME` |
| `index.html` | `?v=` en scripts cargados |

**No se tocan**: `wizard-manager.js` (coordinación por observer, no por events inyectados), `modal-manager.js`, `event-bus.js` (consumido via `emit/on`), `module-colors.js` (consumido via `getModuleColor`), `db.js` (consumido via stores). Las 3 vistas principales sí se tocan — mínimamente (`return this.render()` + `data-guide` + FAB), ver §6.2.
