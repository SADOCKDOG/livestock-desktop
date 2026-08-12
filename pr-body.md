## Resumen

Implementa guías interactivas para finca vacía (spec 2026-08-03-guias-finca-vacia.md):

### Cambios principales

1. **Onboarding transversal** (`js/guides/onboarding-primeros-pasos.js`): 7 pasos cubriendo Zonas → Rebaños → Animales → Producción → Comercialización. Carga eager en `index.html` (línea 379) antes de `guide-manager.js`.

2. **GuideManager.maybeStart()** (líneas 694-703): Prioridad al onboarding en finca vacía desde **cualquier punto de entrada** (quitada comprobación de route/tab que limitaba a Ganadería).

3. **20 guías actualizadas** con `disponible()` predicates correctos por finca:
   - GeGan: animales, panoramica, patrimonio, rebanos, sanidad
   - ExPro: explotacion, lacteo, panoramica, proveedores, silos, tramites, gastos, fitosanitarios
   - CoMer: carne, leche, panoramica, compradores, contratos, transportistas

4. **9 botones empty-state** con `data-guide` attributes verificados en vistas correspondientes.

5. **Cache bump**: `CACHE_NAME = 'corcho-v6.61.0'` en `sw.js` + `?v=6.61` en todos los scripts en `index.html`.

### Validación en dispositivo real (Xiaomi 22111317G vía ADB+CDP)

- ✅ Eager-load: `GuideRegistry.getAll()` contiene onboarding tras arranque en Inicio
- ✅ Entrada directa ExPro (`#/explotacion`): finca vacía → arranca "Bienvenido a tu Finca"
- ✅ Entrada directa CoMer: ídem, guía sobre pestaña Comercialización con bottom-nav activo
- ✅ 0 selectores inválidos en finca vacía y datos demo (`GuiaQA.validarTargets`)
- ✅ `PremiumQA.runAll()` 2 suites, 0 fallos

### Notas

- Bug previo: onboarding colgaba del grupo lazy `gegan` → solo existía entrando por Ganadería. Fix: carga eager + `maybeStart` sin filtro de route.
- Finca de prueba "QA ONBOARDING EXPRO" (vacía) creada en el móvil para validación.
- Archivos temporales CDP en `android/` se limpiarán en commit separado si procede.