# Plan de implementación — Fase A: Siembra demo CHAMORRO ampliada

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ampliar `js/seed-data.js` con los 11 bloques de datos que la demo CHAMORRO no siembra hoy (saneamientos, crotales, fitosanitarios, costes fijos, PAC, botiquín, vacunaciones, instalaciones, subexplotaciones, contrato próximo a vencer, agenda), replicando campo a campo lo que escribe cada wizard/vista real, para que ninguna vista ni informe salga vacío al cargar la demo. De paso se corrigen **dos bugs reales de app** detectados durante la verificación de campos (Tasks 1 y 2) que impiden que esos datos —sembrados o introducidos por usuarios reales— sean visibles en los informes.

**Architecture:** El grueso del trabajo ocurre dentro de la función `seedDatabase(force)` de `js/seed-data.js` (IIFE, estilo `var`, `function`, comillas simples, indentación de 2 espacios, comentarios de sección numerados `// N.`). Cada bloque nuevo se inserta inmediatamente **antes** de la marca `// Seed completado` (~línea 887) salvo instalaciones/subexplotaciones, que se persisten dentro del documento finca (mismo patrón que `zonas[]`) y se rellenan justo tras `Fincas.crearNueva(DEMO_FINCA)`. Sin cambios de esquema: todos los stores ya existen en `LivestockDB` v27 — **no se toca `DB_VERSION` ni `js/db.js`**. Las Tasks 1-2 son fixes quirúrgicos en `js/analitica.js` y `js/gastos.js`.

**Tech Stack:** JavaScript plano (ES2017 dentro de los async existentes), IndexedDB vía `window.db`, modelos `window.Saneamientos`, `window.PedidosCrotales`, `window.Vacunaciones`, `window.Gastos`, `window.Analitica`. Tests en navegador: `runInformesDataTests()` (tests/test-informes-data.js, 18 tests) y `runLacteoTests()` (tests/test-lacteo-v24.js, 87 tests). Verificación manual con `?inspect` + consola.

## Global Constraints

- **No tocar `DB_VERSION` ni `js/db.js`**: la siembra solo escribe registros en stores existentes (LivestockDB v27).
- **Todo registro sembrado lleva `demo: true`** (los modelos que construyen su propio objeto —Saneamientos, Vacunaciones— NO propagan `demo`: hay que parchear con `db.get`/`db.put` tras el `save`; ver Tasks 3 y 9).
- **Fechas relativas a "hoy"** cuando el informe filtra por ventana temporal (contratos <60 días, caducidades, agenda vencida). Patrón ya presente en el seed: `new Date(Date.now() ± N*24*60*60*1000).toISOString().split('T')[0]` para `YYYY-MM-DD`, o `.toISOString()` completo donde el modelo lo usa (`fecha_pedido`, `creadoEn`).
- **La siembra solo corre sobre BD vacía** (`seed-data.js:83-91`). Para verificar cada tarea: borrar datos (consola: `await indexedDB.deleteDatabase('LivestockDB'); localStorage.clear(); location.reload();`) y volver a cargar la demo desde el asistente ("Cargar Demo CHAMORRO"). El SW es cache-first: durante desarrollo usar **recarga dura** (Ctrl+Shift+R) tras editar JS; la versión definitiva se bumpea en la Task 14.
- **NUNCA `git add .`** — hay sesiones concurrentes de Android Studio/ProxyAI sobre el mismo repo. Stagear solo los archivos listados en cada commit.
- **Flujo git**: una rama `feat/demo-chamorro-siembra-ampliada` desde `master` → commits por tarea → **un solo PR** al final → squash merge (master protegida). Push tras cada commit. Commit + merge + push sin esperar confirmación del usuario.
- **Tests que deben seguir en verde**: `runLacteoTests()` 87/87 y `runInformesDataTests()` 18/18. Se ejecutan en consola del navegador con la app cargada (`?inspect`).
- **Idioma**: código, comentarios, commits y documentación en español.
- **Numeración de bloques del seed**: los bloques existentes van del 1 al 15 (finca, ADSG, rebaños, animales, pesajes, compradores, proveedores, transportistas, contratos, gastos, sanitarios, reproducción, prod. carne/tanda, lácteo v24, comercialización). Verificar el último número usado antes de insertar el primer bloque nuevo y continuar desde ahí (previsto: `// 16.` en adelante).
- **NO bump de SW ni build hasta la Task 14**: allí se bumpea `CACHE_NAME` en `sw.js`, los `?v=` de `index.html` y `js/asistente-configuracion.js:12` (el seed se carga bajo demanda con `?v=6.30`), y se ejecuta `npm run build:free` + `npx cap sync android`.

## Referencia de campos verificados (usada por todas las tareas)

Verificado contra el código real el 2026-08-01:

| Store / Modelo | Campos exactos (fuente) |
|---|---|
| `Saneamientos.save(data)` — js/saneamientos.js:53-76 | `{ fincaId, campana, fecha, veterinario, veterinario_colegiado, adsg_nombre, especie, num_examinados, num_positivos, calificacion, tubo, sexo, restriccion_movimientos, motivo_restriccion, proxima_actuacion, notas }`. Campañas válidas: `tuberculosis`, `brucelosis_b`, `brucelosis_om`, `leucosis`, `perineumonia`, `lengua_azul`, `otra`. Calificaciones: `indemne`, `calificada`, `en_proceso`, `positiva`, `sin_calificar`. Especie: nombre oficial (`'Bovino'`, `'Ovino'`). Validación: `campana` obligatoria, `num_positivos ≤ num_examinados`. **`demo` no se propaga: parchear con `db.get`+`db.put` tras save.** |
| `Saneamientos.restriccionActiva(fincaId)` — js/saneamientos.js:142-147 | Lee el registro **más reciente por fecha** (list ordena desc) y devuelve `{ activa: !!ultimo.restriccion_movimientos, motivo }`. ⇒ La restricción activa debe ir en la campaña de fecha más reciente. |
| `PedidosCrotales.save(pedido)` — js/pedidos-crotales.js:32-71 | `{ fincaId, especie, tipo, cantidad, adsg_nombre, adsg_codigo, adsg_veterinario, adsg_vet_colegiado, adsg_vet_nif, estado, fecha_pedido, acuse_manual }`. Especies: `Bovino`/`Ovino`/`Caprino`. Tipos: `'Bandera + Botón (EID)'`, `'Botón + Botón (EID)'`, `'Bolo Ruminal + Botón Visual'`, `'Crotal Visual Clásico'`. Estados: `pendiente`, `enviado`, `confirmado`, `entregado`. El modelo genera `numero_seguimiento` y `eventos: []`. **`...pedido` sí propaga `demo`.** |
| `Gastos.save(data)` — js/gastos.js:52-137 | El wizard construye `{ concepto, monto, categoria, fecha, fincaId, proveedorId, origen_modulo, modo_explotacion, rebanoId?, snap_zona?, control_normativo? }` (wizard-gasto.js:174-206). Categorías del wizard (todas **sin tilde**): `Alimentacion`, `Sanidad`, `Fitosanitarios`, `Electricidad`, `Personal`, `Amortizacion`. `origen_modulo` por defecto `'general'` (así lo deja FitosanitariosView al abrir el wizard, fitosanitarios-view.js:285-286). `control_normativo` (snake_case): `{ registroProducto, dosisAplicada, plazoSeguridadDias, aptoComercializacion, verificadoEn }`. Efectos: auto-vincula sanitario si categoría/concepto contiene 'sanidad'; escribe un `registro_eventos` (`motivo_tarea: 'gasto_registrado'`) por gasto. **Tras el fix de la Task 2, `snap_zona/snap_especie/snap_tipo` explícitos ya no son pisados por el snapshot.** `Gastos.delete(id)` existe pero **lanza error sobre gastos `demo` en versión Free** (gastos.js:142-144). |
| `Analitica.obtenerBreakEven` — js/analitica.js:580-624 | **Tras el fix de la Task 1**, la comparación de categorías fijas normaliza tildes con NFD (mismo idiom que comercializacion-view.js:53), así `Amortizacion`/`Gestoria` (wizard, sin tilde) casan con la lista `['electricidad','alquiler','seguros','amortizacion','impuestos','personal','gestoria']`. Devuelve `{ costesFijos, costesVariables, breakEvenKg, breakEvenLitros, ... }`. Expuesto como `window.Analitica` (:627). |
| `documentos_legales` tipo `pac` — informes-view.js:2702-2708 | `{ tipo: 'pac', anio (número), concepto, regimen, importe_solicitado, importe_cobrado, fecha_emision: 'YYYY-MM-DD', fincaId, creadoEn: ISO }`. El loader `_obtenerDatosPAC` (informes-data.js:237-258) filtra `tipo === 'pac'`. En la app real se crean desde el propio informe PAC (overlay de Informes). |
| `config_botiquin` — botiquin-view.js:365-376 | `{ fincaId, nombre, tipo, unidad, cantidadActual, cantidadMinima, lote, caducidad, notas: '', creadoEn: ISO }`. Tipos: `vacuna`, `medicamento`, `desparasitante`, `antibiotico`, `otro`. Unidad habitual: `dosis`. |
| `botiquin_lotes` — botiquin-view.js:380-386 | `{ productoId, lote, caducidad, cantidad, creadoEn: ISO }` (solo si el producto tiene lote). |
| `Vacunaciones.save(data)` — js/vacunaciones.js:75-100 | `{ fincaId, rebanoId, fecha, veterinario, veterinario_colegiado, observaciones, tipos_vacuna: [{ tipo, lote, dosis, nombre_comercial }], animales_vacunados: [{ categoria, cantidad }], animales_totales, completa, cerrada }`. `tipos_vacuna` debe tener ≥1 elemento con `tipo` no vacío (else throw). El modelo calcula `animales_vacunados_total`. No existe campo "próxima dosis" — se cubre con `observaciones` + tarea de agenda. **`demo` no se propaga: parchear tras save.** |
| `finca.instalaciones[]` — instalaciones-view.js:200-244 | `finca.instalaciones.push({ tipoId, superficie_m2, plazas_alojamiento, volumen_m3, notas, creadoEn: Date.now() })` + `Fincas.save(finca)`. `tipoId` referencia `instalaciones_tipo` (36 tipos, js/db.js:256-293). **En el seed se resuelve por nombre con `db.getAll('instalaciones_tipo')` (no hardcodear ids).** |
| `finca.subexplotaciones[]` — subexplotaciones-view.js:228-272 | `finca.subexplotaciones.push({ especieId, tipo_explotacion, sistema_explotacion, capacidad_maxima, notas: '', creadoEn: Date.now() })` + `Fincas.save(finca)`. `especieId`: 1=Vacas, 3=Ovejas (ESPECIES_SEED, js/db.js:23-29). `tipo_explotacion` ∈ TIPOS_EXPLOTACION_REGA (`'Producción y reproducción'`, `'Cebo o engorde (Cebadero)'`…), `sistema_explotacion` ∈ `['intensivo','extensivo','mixto','estante','trashumante','semiextensivo','no extensivo']`. |
| `agenda_tareas` — js/services/agenda-service.js:11-34 | El servicio `AgendaService.add` construye `{ fincaId, modulo_id, entidad_id, titulo, descripcion, fecha_planificada: 'YYYY-MM-DD', prioridad, es_alerta, estado: 'pendiente', creadoEn, actualizadoEn }` y además llama a `NotificacionesService.programarTarea` (re-lanza errores). `modulo_id` ∈ `gegan, rebanos, silos, almacen, sanidad, carnico, lacteos, contratos, general` (wizard-tarea.js:19-28). `prioridad` ∈ `baja, media, alta`. **El seed escribe con `db.add` directo replicando esa forma, para no disparar notificaciones con datos demo.** |

---

### Task 1: Fix — Break-Even ignora categorías sin tilde (bug real de app)

`Analitica.obtenerBreakEven` filtra costes fijos con `catsFijas` **con tilde** (`'amortización'`, `'gestoría'`) comparado contra `(g.categoria||'').toLowerCase()` (js/analitica.js:589-590). Pero el wizard de gastos escribe las categorías **sin tilde** (`Amortizacion`, wizard-gasto.js:48). Resultado: ningún usuario real —ni la demo— puede tener costes de amortización/gestoría reconocidos en el Break-Even. Fix: normalización NFD en la comparación (idiom ya usado en comercializacion-view.js:53).

**Files:**
- Modify: `js/analitica.js:588-590`

**Interfaces:**
- Consumes: registros de `gastos_ganaderia` (cualquier `categoria`, con o sin tilde).
- Produces: `obtenerBreakEven(fincaId).costesFijos` incluye gastos con categorías `Amortizacion`/`Amortización`, `Gestoria`/`Gestoría`, etc. indistintamente. Sin cambio de firma ni de objeto devuelto.

- [ ] **Step 1: Reproducir el bug (expected: FAIL)**

Con la demo actual cargada (los 2 gastos existentes `Amortizacion` suman 320,75 + 890,00 = 1.210,75 €), consola del navegador:

```javascript
(await Analitica.obtenerBreakEven(await Fincas.getActiveId())).costesFijos
```

Expected (antes del fix): `0` — los gastos `Amortizacion` no casan con `'amortización'`.

- [ ] **Step 2: Aplicar el fix**

En `js/analitica.js`, reemplazar las líneas 588-590:

```javascript
            // Separar costes fijos y variables
            const catsFijas = ['electricidad', 'alquiler', 'seguros', 'amortización', 'impuestos', 'personal', 'gestoría'];
            const costesFijos = gastos.filter(g => catsFijas.includes((g.categoria || '').toLowerCase())).reduce((s, g) => s + (g.monto || 0), 0);
```

por (la clase de caracteres del `replace` son escapes ASCII `\u0300-\u036f` — copiar el bloque literalmente):

```javascript
            // Separar costes fijos y variables (comparación sin tildes: el wizard
            // escribe 'Amortizacion'/'Gestoria' sin tilde — idiom de comercializacion-view.js:53)
            const _normCat = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const catsFijas = ['electricidad', 'alquiler', 'seguros', 'amortizacion', 'impuestos', 'personal', 'gestoria'];
            const costesFijos = gastos.filter(g => catsFijas.includes(_normCat(g.categoria))).reduce((s, g) => s + (g.monto || 0), 0);
```

- [ ] **Step 3: Verificar el fix (expected: PASS)**

Recarga dura (Ctrl+Shift+R) y repetir en consola:

```javascript
(await Analitica.obtenerBreakEven(await Fincas.getActiveId())).costesFijos
```

Expected: `1210.75`. Navegar a `#/informes` → Libros → Break-Even: la tarjeta de costes fijos deja de mostrar 0 €.

- [ ] **Step 4: Tests de regresión**

```javascript
await runInformesDataTests(); // esperado: 18/18 PASS
```

- [ ] **Step 5: Commit**

```bash
git add js/analitica.js
git commit -m "fix(analitica): Break-Even reconoce categorías sin tilde (normalización NFD)"
git push origin feat/demo-chamorro-siembra-ampliada
```

---

### Task 2: Fix — Gastos.save pisa el snap_zona del wizard (bug real de app)

`Gastos.save` construye el registro con `{ ...data, ...snapMetadata }` (js/gastos.js:57-65). `snapMetadata` viene de `SnapshotService.buildSnapMetadata(data.rebanoId)`, que **sin `rebanoId`** devuelve `{ snap_zona: "Sin zona", snap_especie: "No definida", snap_tipo: "No definido" }`. Como el spread del snapshot va **después** de `...data`, pisa el `snap_zona` que el wizard recoge explícitamente para Fitosanitarios y Electricidad (wizard-gasto.js:196: `gasto.snap_zona = data.snap_zona`). Resultado: todo tratamiento fitosanitario real queda guardado con zona "Sin zona" y el informe ExPro > Fitosanitario no puede agrupar por parcela. Fix: preservar los `snap_*` explícitos tras los spreads.

**Files:**
- Modify: `js/gastos.js:57-65`

**Interfaces:**
- Consumes: `data.snap_zona` / `data.snap_especie` / `data.snap_tipo` opcionales del wizard; `snapMetadata` del SnapshotService.
- Produces: `Gastos.save(data)` persiste `snap_zona: data.snap_zona || snapMetadata.snap_zona` (y lo mismo para especie/tipo). Sin cambio de firma. El `registro_eventos` asociado hereda el snap correcto vía `gastoData.snap_zona` (gastos.js:123-125).

- [ ] **Step 1: Reproducir el bug (expected: FAIL)**

Con la demo cargada, consola:

```javascript
const gid = await Gastos.save({ concepto: 'TEST snap zona', monto: 1, categoria: 'Fitosanitarios', fecha: new Date().toISOString().split('T')[0], fincaId: await Fincas.getActiveId(), snap_zona: 'Parcela Norte 42ha' });
(await db.get('gastos_ganaderia', gid)).snap_zona
```

Expected (antes del fix): `"Sin zona"` — el valor explícito fue pisado por el snapshot.

- [ ] **Step 2: Aplicar el fix**

En `js/gastos.js`, reemplazar las líneas 57-65:

```javascript
            const gastoData = {
                ...data,
                ...snapMetadata,
                fincaId: fincaActivaId,
                comunidad_autonoma: fincaActiva?.comunidad_autonoma || null,
                monto: Number(data.monto),
                rebanoId: data.rebanoId ? Number(data.rebanoId) : null,
                actualizadoEn: new Date().toISOString()
            };
```

por:

```javascript
            const gastoData = {
                ...data,
                ...snapMetadata,
                // El wizard fija snap_zona explícitamente para Fitosanitarios/Electricidad
                // (sin rebaño): no dejar que el snapshot lo pise con "Sin zona"
                snap_zona: data.snap_zona || snapMetadata.snap_zona,
                snap_especie: data.snap_especie || snapMetadata.snap_especie,
                snap_tipo: data.snap_tipo || snapMetadata.snap_tipo,
                fincaId: fincaActivaId,
                comunidad_autonoma: fincaActiva?.comunidad_autonoma || null,
                monto: Number(data.monto),
                rebanoId: data.rebanoId ? Number(data.rebanoId) : null,
                actualizadoEn: new Date().toISOString()
            };
```

- [ ] **Step 3: Verificar el fix (expected: PASS)**

Recarga dura y repetir el Step 1:

```javascript
(await db.get('gastos_ganaderia', gid)).snap_zona
```

Expected: `"Parcela Norte 42ha"`. Luego limpiar el registro de prueba (NO lleva `demo: true`, así que `Gastos.delete` no lanza el bloqueo de demo-Free):

```javascript
await Gastos.delete(gid);
(await db.get('gastos_ganaderia', gid)) // esperado: undefined
```

(Quedará un `registro_eventos` residual con `motivo_tarea: 'gasto_registrado'` del gasto de prueba — inofensivo: ningún loader de producción filtra por ese motivo.)

- [ ] **Step 4: Tests de regresión**

```javascript
await runInformesDataTests(); // esperado: 18/18 PASS
```

- [ ] **Step 5: Commit**

```bash
git add js/gastos.js
git commit -m "fix(gastos): preservar snap_zona/especie/tipo explícitos del wizard frente al snapshot"
git push origin feat/demo-chamorro-siembra-ampliada
```

---

### Task 3: Saneamientos (2 campañas + restricción activa)

Siembra 2 campañas: 2025 TBC bovino "indemne" (histórica) y 2026 brucelosis bovina "calificada" con `proxima_actuacion` futura y `restriccion_movimientos: true`. La restricción va en la de fecha **más reciente** porque `restriccionActiva()` solo mira la última.

**Files:**
- Modify: `js/seed-data.js` (insertar antes de `// Seed completado`, ~línea 887)

**Interfaces:**
- Consumes: `fincaId` (var local del seed), `DEMO_FINCA.adsg_*`.
- Produces: 2 registros en store `saneamientos` con `demo: true`; `Saneamientos.restriccionActiva(fincaId)` → `{ activa: true, motivo: 'Positivo en brucelosis bovina' }`.

- [ ] **Step 1: Insertar el bloque de saneamientos**

Localizar en `js/seed-data.js` el comentario `// Seed completado` (~línea 887) e insertar ANTES de él:

```javascript
      // 16. Saneamientos (GeGan > Sanidad > Saneamientos; alimenta ExPro > Trámites y banner Guía 365)
      var sanFecha2025 = '2025-11-14';
      var sanFecha2026 = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var sanProxima = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var saneamientosDefs = [
        {
          fincaId: fincaId,
          campana: 'tuberculosis',
          fecha: sanFecha2025,
          veterinario: DEMO_FINCA.adsg_veterinario,
          veterinario_colegiado: DEMO_FINCA.adsg_vet_colegiado,
          adsg_nombre: DEMO_FINCA.adsg_nombre,
          especie: 'Bovino',
          num_examinados: 6,
          num_positivos: 0,
          calificacion: 'indemne',
          tubo: '',
          sexo: '',
          restriccion_movimientos: false,
          motivo_restriccion: '',
          proxima_actuacion: '',
          notas: 'Campaña anual TBC 2025. Explotación oficialmente indemne (T3).'
        },
        {
          fincaId: fincaId,
          campana: 'brucelosis_b',
          fecha: sanFecha2026,
          veterinario: DEMO_FINCA.adsg_veterinario,
          veterinario_colegiado: DEMO_FINCA.adsg_vet_colegiado,
          adsg_nombre: DEMO_FINCA.adsg_nombre,
          especie: 'Bovino',
          num_examinados: 6,
          num_positivos: 1,
          calificacion: 'calificada',
          tubo: '',
          sexo: '',
          restriccion_movimientos: true,
          motivo_restriccion: 'Positivo en brucelosis bovina',
          proxima_actuacion: sanProxima,
          notas: '1 positivo en rasquiña — animal aislado. Reconocimiento de resaneo programado.'
        }
      ];
      for (var sn = 0; sn < saneamientosDefs.length; sn++) {
        try {
          var saneaId = await Saneamientos.save(saneamientosDefs[sn]);
          // Saneamientos.save construye su propio objeto y NO propaga `demo`: parchear
          var sanObj = await window.db.get('saneamientos', saneaId);
          if (sanObj) { sanObj.demo = true; await window.db.put('saneamientos', sanObj); }
        } catch (e) { console.log('[SEED] Error saneamiento:', e.message); }
        await sleep(80);
      }
      console.log('[SEED] Saneamientos creados: 2');
```

- [ ] **Step 2: Verificar en navegador**

Reset (`await indexedDB.deleteDatabase('LivestockDB'); localStorage.clear(); location.reload();`) + cargar demo desde el asistente. Consola:

```javascript
const sans = await db.getAll('saneamientos');
console.table(sans.map(s => ({ campana: s.campana, calif: s.calificacion, restr: s.restriccion_movimientos, demo: s.demo })));
await Saneamientos.restriccionActiva(await Fincas.getActiveId());
```

Expected: 2 filas, ambas `demo: true`; `restriccionActiva` → `{ activa: true, motivo: 'Positivo en brucelosis bovina' }`. Navegar a `#/saneamientos`: salen las 2 campañas, la 2026 con badge de calificación y restricción.

- [ ] **Step 3: Commit**

```bash
git add js/seed-data.js
git commit -m "feat(seed): saneamientos demo CHAMORRO (2 campañas + restricción activa)"
git push origin feat/demo-chamorro-siembra-ampliada
```

---

### Task 4: Pedidos de crotales (1 entregado, 1 pendiente)

**Files:**
- Modify: `js/seed-data.js` (antes de `// Seed completado`, tras el bloque de Task 3)

**Interfaces:**
- Consumes: `fincaId`, `DEMO_FINCA.adsg_*`.
- Produces: 2 registros en `pedidos_crotales` con `demo: true` (propagado por `...pedido`), estados `entregado` y `pendiente`, `numero_seguimiento` generado por el modelo.

- [ ] **Step 1: Insertar el bloque**

```javascript
      // 17. Pedidos de crotales (ExPro > Trámites > Crotales)
      var crotFechaEntregado = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      var crotFechaPendiente = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      var pedidosCrotalesDefs = [
        {
          demo: true,
          fincaId: fincaId,
          especie: 'Bovino',
          tipo: 'Bandera + Botón (EID)',
          cantidad: 25,
          adsg_nombre: DEMO_FINCA.adsg_nombre,
          adsg_codigo: DEMO_FINCA.adsg_codigo,
          adsg_veterinario: DEMO_FINCA.adsg_veterinario,
          adsg_vet_colegiado: DEMO_FINCA.adsg_vet_colegiado,
          adsg_vet_nif: DEMO_FINCA.adsg_vet_nif,
          estado: 'entregado',
          fecha_pedido: crotFechaEntregado,
          acuse_manual: 'ACUSE-2026-0412'
        },
        {
          demo: true,
          fincaId: fincaId,
          especie: 'Ovino',
          tipo: 'Crotal Visual Clásico',
          cantidad: 100,
          adsg_nombre: DEMO_FINCA.adsg_nombre,
          adsg_codigo: DEMO_FINCA.adsg_codigo,
          adsg_veterinario: DEMO_FINCA.adsg_veterinario,
          adsg_vet_colegiado: DEMO_FINCA.adsg_vet_colegiado,
          adsg_vet_nif: DEMO_FINCA.adsg_vet_nif,
          estado: 'pendiente',
          fecha_pedido: crotFechaPendiente,
          acuse_manual: ''
        }
      ];
      for (var crotI = 0; crotI < pedidosCrotalesDefs.length; crotI++) {
        try { await PedidosCrotales.save(pedidosCrotalesDefs[crotI]); }
        catch (e) { console.log('[SEED] Error pedido crotales:', e.message); }
        await sleep(80);
      }
      console.log('[SEED] Pedidos de crotales creados: 2');
```

- [ ] **Step 2: Verificar en navegador**

Reset + cargar demo. Consola:

```javascript
console.table((await db.getAll('pedidos_crotales')).map(p => ({ esp: p.especie, tipo: p.tipo, cant: p.cantidad, estado: p.estado, seg: p.numero_seguimiento, demo: p.demo })));
```

Expected: 2 filas (entregado + pendiente), `numero_seguimiento` con formato `YYYYMMDD-{fincaId}-XXXXXX`, `demo: true`. Navegar a `#/explotacion?tab=tramites` → sección Crotales muestra ambos pedidos con su estado.

- [ ] **Step 3: Commit**

```bash
git add js/seed-data.js
git commit -m "feat(seed): pedidos de crotales demo (entregado + pendiente)"
git push origin feat/demo-chamorro-siembra-ampliada
```

---

### Task 5: Gastos fitosanitarios (3 gastos con snap_zona y control_normativo)

**Files:**
- Modify: `js/seed-data.js` (antes de `// Seed completado`, tras Task 4)

**Interfaces:**
- Consumes: `fincaId`; nombres de zona exactos de `DEMO_FINCA.zonas[].nombre` (`'Parcela Norte 42ha'`, `'Parcela Sur 28ha'`); el fix de la Task 2 (sin él, `snap_zona` quedaría "Sin zona").
- Produces: 3 registros en `gastos_ganaderia` con `categoria: 'Fitosanitarios'`, `snap_zona` resuelto, `control_normativo` completo, `demo: true` (propagado por el spread `...data` de `Gastos.save`). El informe ExPro > Fitosanitario (`InformesView._obtenerDatosFitosanitarios`) mostrará `numRegistros: 3`, `numZonas: 2`.

Se usa `Gastos.save` (no `db.add`) porque es lo que hace el wizard real (FitosanitariosView abre `GastoWizard`, fitosanitarios-view.js:282-296) y porque el fix de la Task 2 ya preserva el `snap_zona` explícito — este bloque ejercita ese fix end-to-end. `origen_modulo: 'general'` y `modo_explotacion: null` replican los defaults del wizard (wizard-gasto.js:181-182). `snap_especie`/`snap_tipo` no se pasan: los rellena el snapshot como `'No definida'`/`'No definido'`, igual que en un alta real sin rebaño.

- [ ] **Step 1: Insertar el bloque**

```javascript
      // 18. Gastos fitosanitarios (ExPro > Fitosanitarios; informe ExPro > Fitosanitario)
      // Vía Gastos.save como el wizard real; snap_zona se preserva gracias al fix de gastos.js
      var fitoFecha1 = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var fitoFecha2 = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var fitoFecha3 = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var fitosDefs = [
        {
          demo: true,
          fincaId: fincaId,
          concepto: 'Herbicida Glifosato 36% — Parcela Norte',
          fecha: fitoFecha1,
          monto: 214.50,
          categoria: 'Fitosanitarios',
          snap_zona: 'Parcela Norte 42ha',
          origen_modulo: 'general',
          modo_explotacion: null,
          proveedorId: null,
          control_normativo: {
            registroProducto: 'ES-00124-GLF',
            dosisAplicada: '3 L/ha',
            plazoSeguridadDias: 15,
            aptoComercializacion: true,
            verificadoEn: fitoFecha1 + 'T09:00:00.000Z'
          }
        },
        {
          demo: true,
          fincaId: fincaId,
          concepto: 'Tratamiento barbecho — Parcela Sur',
          fecha: fitoFecha2,
          monto: 156.75,
          categoria: 'Fitosanitarios',
          snap_zona: 'Parcela Sur 28ha',
          origen_modulo: 'general',
          modo_explotacion: null,
          proveedorId: null,
          control_normativo: {
            registroProducto: 'ES-00331-24D',
            dosisAplicada: '2 L/ha',
            plazoSeguridadDias: 7,
            aptoComercializacion: true,
            verificadoEn: fitoFecha2 + 'T10:30:00.000Z'
          }
        },
        {
          demo: true,
          fincaId: fincaId,
          concepto: 'Fungicida preventivo — Parcela Norte',
          fecha: fitoFecha3,
          monto: 98.20,
          categoria: 'Fitosanitarios',
          snap_zona: 'Parcela Norte 42ha',
          origen_modulo: 'general',
          modo_explotacion: null,
          proveedorId: null,
          control_normativo: {
            registroProducto: 'ES-00876-AZO',
            dosisAplicada: '1,5 L/ha',
            plazoSeguridadDias: 21,
            aptoComercializacion: false,
            verificadoEn: fitoFecha3 + 'T08:15:00.000Z'
          }
        }
      ];
      for (var ft = 0; ft < fitosDefs.length; ft++) {
        try { await Gastos.save(fitosDefs[ft]); }
        catch (e) { console.log('[SEED] Error gasto fitosanitario:', e.message); }
        await sleep(80);
      }
      console.log('[SEED] Gastos fitosanitarios creados: 3');
```

- [ ] **Step 2: Verificar en navegador**

Reset + cargar demo. Consola:

```javascript
await InformesView._obtenerDatosFitosanitarios(await Fincas.getActiveId());
```

Expected: objeto con `numRegistros: 3`, `numZonas: 2`, total 469,45 € y zonas `['Parcela Norte 42ha', 'Parcela Sur 28ha']`. Comprobar además que el snap se preservó (fix Task 2 end-to-end):

```javascript
(await db.getAll('gastos_ganaderia')).filter(g => g.categoria === 'Fitosanitarios').map(g => g.snap_zona)
// esperado: ['Parcela Norte 42ha', 'Parcela Sur 28ha', 'Parcela Norte 42ha'] — NINGÚN 'Sin zona'
```

Navegar a `#/explotacion?tab=fitosanitarios`: 3 tratamientos con zona y datos RD 787/2023; `#/informes` → ExPro → Fitosanitario: tarjetas con datos.

- [ ] **Step 3: Commit**

```bash
git add js/seed-data.js
git commit -m "feat(seed): gastos fitosanitarios demo (3 registros con zona y control normativo)"
git push origin feat/demo-chamorro-siembra-ampliada
```

---

### Task 6: Costes fijos (Break-Even con datos)

Siembra 5 gastos de costes fijos. **Las categorías van SIN tilde**, como las escribe el wizard (`Electricidad`, `Personal`, `Amortizacion`), y Break-Even las reconoce gracias al fix de la Task 1. `Seguros` y `Gestoria` no existen como opción del wizard (que solo ofrece 6 categorías) pero el spec §4.4 los pide y `Gastos.save` no restringe categorías — quedan como categorías solo-demo que la normalización NFD también reconoce (`'seguros'`, `'gestoria'→'gestoría'`).

**NO tocar las defs antiguas** (`gastosDefs`, seed-data.js:282-290): sus 2 gastos `Amortizacion` (320,75 + 890,00) ya son reconocidos por Break-Even tras la Task 1. Esto es una **desviación deliberada del spec §4.4** (que pedía cambiarlas a tilde): el fix de normalización cumple el mismo objetivo y además arregla el bug para usuarios reales.

**Files:**
- Modify: `js/seed-data.js` (antes de `// Seed completado`, tras Task 5)

**Interfaces:**
- Consumes: `fincaId`; fixes de Tasks 1 y 2.
- Produces: 5 gastos nuevos en `gastos_ganaderia` con `demo: true`. Tras la siembra, `Analitica.obtenerBreakEven(fincaId).costesFijos` = 1.210,75 (defs antiguas) + 2.900,25 (nuevos) = **4.111,00 €**.

- [ ] **Step 1: Insertar el bloque**

```javascript
      // 19. Costes fijos (Break-Even: catsFijas de js/analitica.js — reconocidos sin tilde
      // gracias a la normalización NFD; las categorías replican las del wizard)
      var cfFecha1 = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var cfFecha2 = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var cfFecha3 = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var costesFijosDefs = [
        { demo: true, concepto: 'Factura eléctrica nave ordeño', fecha: cfFecha1, monto: 412.30, categoria: 'Electricidad', snap_zona: 'Parcela Norte 42ha', proveedorId: null },
        { demo: true, concepto: 'Factura eléctrica sala tanques', fecha: cfFecha2, monto: 287.95, categoria: 'Electricidad', snap_zona: 'Parcela Norte 42ha', proveedorId: null },
        { demo: true, concepto: 'Nómina operario ordeño (mes)', fecha: cfFecha3, monto: 1350.00, categoria: 'Personal', proveedorId: null },
        { demo: true, concepto: 'Seguro explotación anual (recibo)', fecha: cfFecha2, monto: 640.00, categoria: 'Seguros', proveedorId: null },
        { demo: true, concepto: 'Gestoría — trimestre', fecha: cfFecha1, monto: 210.00, categoria: 'Gestoria', proveedorId: null }
      ];
      for (var cf = 0; cf < costesFijosDefs.length; cf++) {
        try { await Gastos.save(costesFijosDefs[cf]); }
        catch (e) { console.log('[SEED] Error coste fijo:', e.message); }
        await sleep(80);
      }
      console.log('[SEED] Costes fijos creados: 5');
```

- [ ] **Step 2: Verificar en navegador**

Reset + cargar demo. Consola:

```javascript
const be = await Analitica.obtenerBreakEven(await Fincas.getActiveId());
console.log('costesFijos:', be.costesFijos, 'costesVariables:', be.costesVariables);
```

Expected: `costesFijos: 4111` (1.210,75 amortizaciones + 700,25 electricidad + 1.350 personal + 640 seguros + 210 gestoría). Las 2 facturas de Electricidad además conservan `snap_zona: 'Parcela Norte 42ha'` (fix Task 2):

```javascript
(await db.getAll('gastos_ganaderia')).filter(g => g.categoria === 'Electricidad').map(g => g.snap_zona)
// esperado: ['Parcela Norte 42ha', 'Parcela Norte 42ha']
```

Navegar a `#/informes` → Libros → Break-Even: tarjetas con valores > 0.

- [ ] **Step 3: Commit**

```bash
git add js/seed-data.js
git commit -m "feat(seed): costes fijos demo (electricidad, personal, seguros, gestoría)"
git push origin feat/demo-chamorro-siembra-ampliada
```

---

### Task 7: Documentos PAC (2 subvenciones)

**Files:**
- Modify: `js/seed-data.js` (antes de `// Seed completado`, tras Task 6)

**Interfaces:**
- Consumes: `fincaId`.
- Produces: 2 registros en `documentos_legales` con `tipo: 'pac'`, `demo: true`: campaña 2024 cobrada completa y campaña 2025 cobrada parcial (pendiente visible en el informe).

- [ ] **Step 1: Insertar el bloque**

```javascript
      // 20. Subvenciones PAC (Informes > Libros > PAC; en la app real se crean desde el propio informe)
      var pacDefs = [
        {
          demo: true,
          tipo: 'pac',
          anio: 2024,
          concepto: 'PAC 2024 — Ayuda básica + eco-esquemas',
          regimen: 'PAC Base',
          importe_solicitado: 18500.00,
          importe_cobrado: 18500.00,
          fecha_emision: '2024-12-16',
          fincaId: fincaId,
          creadoEn: '2024-12-16T10:00:00.000Z'
        },
        {
          demo: true,
          tipo: 'pac',
          anio: 2025,
          concepto: 'PAC 2025 — Ayuda básica + eco-esquemas',
          regimen: 'PAC Verde',
          importe_solicitado: 19200.00,
          importe_cobrado: 12480.00,
          fecha_emision: '2025-12-15',
          fincaId: fincaId,
          creadoEn: '2025-12-15T10:00:00.000Z'
        }
      ];
      for (var pd = 0; pd < pacDefs.length; pd++) {
        try { await window.db.add('documentos_legales', pacDefs[pd]); }
        catch (e) { console.log('[SEED] Error documento PAC:', e.message); }
        await sleep(60);
      }
      console.log('[SEED] Documentos PAC creados: 2');
```

- [ ] **Step 2: Verificar en navegador**

Reset + cargar demo. Consola:

```javascript
(await db.getAll('documentos_legales')).filter(d => d.tipo === 'pac')
```

Expected: 2 docs. Navegar a `#/informes` → Libros → PAC: tabla con 2024 (100% cobrado) y 2025 (65% cobrado, pendiente 6.720 €).

- [ ] **Step 3: Commit**

```bash
git add js/seed-data.js
git commit -m "feat(seed): documentos PAC demo (2024 cobrada, 2025 parcial)"
git push origin feat/demo-chamorro-siembra-ampliada
```

---

### Task 8: Botiquín (4 productos + lotes)

**Files:**
- Modify: `js/seed-data.js` (antes de `// Seed completado`, tras Task 7)

**Interfaces:**
- Consumes: `fincaId`.
- Produces: 4 registros en `config_botiquin` (uno `tipo: 'vacuna'` próximo a caducar, un `antibiotico` y un `medicamento` con stock bajo `cantidadActual < cantidadMinima`, un `desparasitante` sin lote) + 3 registros en `botiquin_lotes` (solo productos con lote), todo `demo: true`.

- [ ] **Step 1: Insertar el bloque**

```javascript
      // 21. Botiquín (GeGan > Sanidad > Botiquín) — productos + lotes
      var botCaducaPronto = new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var botCaducaLejos = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var botCaducaMedio = new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var botiquinDefs = [
        { nombre: 'Vacuna Lengua Azul BTV-4', tipo: 'vacuna', unidad: 'dosis', cantidadActual: 42, cantidadMinima: 20, lote: 'LBTV4-2026-031', caducidad: botCaducaPronto },
        { nombre: 'Oxitetraciclina 20% LA', tipo: 'antibiotico', unidad: 'ml', cantidadActual: 15, cantidadMinima: 100, lote: 'OXI-2025-118', caducidad: botCaducaMedio },
        { nombre: 'Ivermectina 1% inyectable', tipo: 'desparasitante', unidad: 'dosis', cantidadActual: 60, cantidadMinima: 30, lote: '', caducidad: null },
        { nombre: 'Meloxicam 20 mg/ml', tipo: 'medicamento', unidad: 'ml', cantidadActual: 3, cantidadMinima: 50, lote: 'MLX-2026-007', caducidad: botCaducaLejos }
      ];
      for (var bq = 0; bq < botiquinDefs.length; bq++) {
        try {
          var bqDef = botiquinDefs[bq];
          var bqId = await window.db.add('config_botiquin', {
            demo: true,
            fincaId: fincaId,
            nombre: bqDef.nombre,
            tipo: bqDef.tipo,
            unidad: bqDef.unidad,
            cantidadActual: bqDef.cantidadActual,
            cantidadMinima: bqDef.cantidadMinima,
            lote: bqDef.lote,
            caducidad: bqDef.caducidad,
            notas: '',
            creadoEn: new Date().toISOString()
          });
          if (bqDef.lote) {
            await window.db.add('botiquin_lotes', {
              demo: true,
              productoId: bqId,
              lote: bqDef.lote,
              caducidad: bqDef.caducidad,
              cantidad: bqDef.cantidadActual,
              creadoEn: new Date().toISOString()
            });
          }
        } catch (e) { console.log('[SEED] Error producto botiquín:', e.message); }
        await sleep(60);
      }
      console.log('[SEED] Botiquín creado: 4 productos, 3 lotes');
```

- [ ] **Step 2: Verificar en navegador**

Reset + cargar demo. Consola:

```javascript
console.table(await db.getAll('config_botiquin'));
console.table(await db.getAll('botiquin_lotes'));
```

Expected: 4 productos / 3 lotes. Navegar a `#/botiquin`: aparecen los 4; la vacuna con aviso de caducidad próxima (18 días); Oxitetraciclina y Meloxicam con alerta de stock bajo.

- [ ] **Step 3: Commit**

```bash
git add js/seed-data.js
git commit -m "feat(seed): botiquín demo (4 productos + 3 lotes, caducidad y stock bajo)"
git push origin feat/demo-chamorro-siembra-ampliada
```

---

### Task 9: Vacunaciones de rebaño (2 registros, uno con recuerdo de dosis)

El modelo `Vacunaciones` no tiene campo "próxima dosis": la fecha de recuerdo va en `observaciones` y el aviso operativo se siembra como tarea de agenda (Task 12, que referencia esta campaña con la misma var `vacProxDosis` — por eso la Task 9 debe quedar ANTES que la 12 en el archivo).

**Files:**
- Modify: `js/seed-data.js` (antes de `// Seed completado`, tras Task 8)

**Interfaces:**
- Consumes: `fincaId`, `rebVacas`, `rebOvejas` (vars del seed), `DEMO_FINCA.adsg_veterinario`, `DEMO_FINCA.adsg_vet_colegiado`.
- Produces: 2 registros en `vacunaciones` con `demo: true` (parche `db.get`+`db.put` tras save): una lengua azul bovina cerrada y una clostridiosis ovina abierta con observaciones de próxima dosis. La var `vacProxDosis` queda disponible para la Task 12.

- [ ] **Step 1: Insertar el bloque**

```javascript
      // 22. Vacunaciones de rebaño (GeGan > Sanidad; modelo jerárquico ADSG)
      var vacFecha1 = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var vacFecha2 = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var vacProxDosis = new Date(Date.now() + 155 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var vacunacionesDefs = [
        {
          fincaId: fincaId,
          rebanoId: rebVacas.id,
          fecha: vacFecha1,
          veterinario: DEMO_FINCA.adsg_veterinario,
          veterinario_colegiado: DEMO_FINCA.adsg_vet_colegiado,
          observaciones: 'Campaña obligatoria lengua azul 2026 — rebaño completo.',
          tipos_vacuna: [
            { tipo: 'Lengua azul (BTV-4)', lote: 'LBTV4-2026-012', dosis: '2 ml', nombre_comercial: 'Bluevac BTV4' }
          ],
          animales_vacunados: [
            { categoria: 'Vacas adultas', cantidad: 3 }
          ],
          animales_totales: 3,
          completa: true,
          cerrada: true
        },
        {
          fincaId: fincaId,
          rebanoId: rebOvejas.id,
          fecha: vacFecha2,
          veterinario: DEMO_FINCA.adsg_veterinario,
          veterinario_colegiado: DEMO_FINCA.adsg_vet_colegiado,
          observaciones: 'Primovacunación madres. Próxima dosis recuerdo: ' + vacProxDosis + '.',
          tipos_vacuna: [
            { tipo: 'Clostridiosis (Covexin 10)', lote: 'CVX-2026-045', dosis: '2 ml', nombre_comercial: 'Covexin 10' }
          ],
          animales_vacunados: [
            { categoria: 'Ovejas adultas', cantidad: 3 },
            { categoria: 'Corderos', cantidad: 1 }
          ],
          animales_totales: 4,
          completa: false,
          cerrada: false
        }
      ];
      for (var vc = 0; vc < vacunacionesDefs.length; vc++) {
        try {
          var vacId = await Vacunaciones.save(vacunacionesDefs[vc]);
          // Vacunaciones.save construye su propio objeto y NO propaga `demo`: parchear
          var vacObj = await window.db.get('vacunaciones', vacId);
          if (vacObj) { vacObj.demo = true; await window.db.put('vacunaciones', vacObj); }
        } catch (e) { console.log('[SEED] Error vacunación:', e.message); }
        await sleep(80);
      }
      console.log('[SEED] Vacunaciones creadas: 2');
```

- [ ] **Step 2: Verificar en navegador**

Reset + cargar demo. Consola:

```javascript
console.table((await db.getAll('vacunaciones')).map(v => ({ reb: v.rebanoId, tipos: v.tipos_vacuna.length, total: v.animales_vacunados_total, cerrada: v.cerrada, demo: v.demo })));
```

Expected: 2 filas, `animales_vacunados_total` 3 y 4 (calculado por el modelo), `demo: true`. Navegar a GeGan > Sanidad: registros de vacunación visibles.

- [ ] **Step 3: Commit**

```bash
git add js/seed-data.js
git commit -m "feat(seed): vacunaciones de rebaño demo (bovino cerrada, ovino con recuerdo)"
git push origin feat/demo-chamorro-siembra-ampliada
```

---

### Task 10: Instalaciones y subexplotaciones (dentro del documento finca)

Ambas colecciones viven **dentro del documento finca** (patrón `finca.zonas[]`), así que se rellenan justo después de `Fincas.crearNueva(DEMO_FINCA)` con `db.get('fincas', fincaId)` + `Fincas.save(finca)`. Los `tipoId` se resuelven en runtime contra el catálogo `instalaciones_tipo` por nombre (no hardcodear ids: el catálogo lo siembra db.js:1104-1107 antes de que corra el seed).

**Files:**
- Modify: `js/seed-data.js` (2 puntos: inicializar arrays vacíos en el literal `DEMO_FINCA` ~línea 48, y bloque de relleno tras `// 1. Finca` / registro ADSG ~línea 112, antes de `// 2. Rebaños`)

**Interfaces:**
- Consumes: `fincaId`; catálogo `instalaciones_tipo`; especies sembradas (ids 1=Vacas, 3=Ovejas).
- Produces: `finca.instalaciones` con 3 elementos `{ tipoId, superficie_m2, plazas_alojamiento, volumen_m3, notas, creadoEn }` y `finca.subexplotaciones` con 2 elementos `{ especieId, tipo_explotacion, sistema_explotacion, capacidad_maxima, notas, creadoEn }`.

- [ ] **Step 1: Inicializar los arrays en DEMO_FINCA**

En `js/seed-data.js`, al final del literal `DEMO_FINCA` (tras el array `zonas`, ~línea 48), cambiar el cierre:

```javascript
    ]
  };
```

por:

```javascript
    ],
    instalaciones: [],
    subexplotaciones: []
  };
```

(La `]` que cierra `zonas` pasa a cerrarse con `],` y se añaden las dos propiedades antes del `};` final del objeto.)

- [ ] **Step 2: Insertar el bloque de relleno tras la creación de la finca**

Tras el bloque de registro de ADSG (~línea 112, antes de `// 2. Rebaños`), insertar:

```javascript
      // 1b. Instalaciones y subexplotaciones (viven dentro del documento finca, patrón zonas[])
      try {
        var fincaObj = await window.db.get('fincas', fincaId);
        var tiposInst = await window.db.getAll('instalaciones_tipo').catch(() => []);
        var _tipoPorNombre = function (nombre) { var t = tiposInst.find(function (x) { return x.nombre === nombre; }); return t ? t.id : (tiposInst[0] ? tiposInst[0].id : null); };
        fincaObj.instalaciones = [
          { tipoId: _tipoPorNombre('Alojamiento ganadero bovino de leche'), superficie_m2: 850, plazas_alojamiento: 50, volumen_m3: null, notas: 'Nave de ordeño 2x12 espina de pez con sala de espera', creadoEn: Date.now() },
          { tipoId: _tipoPorNombre('Alojamiento ganadero bovino de carne'), superficie_m2: 420, plazas_alojamiento: 30, volumen_m3: null, notas: 'Establo de cebo — cercado intensivo', creadoEn: Date.now() },
          { tipoId: _tipoPorNombre('Cámaras frigoríficas'), superficie_m2: 45, plazas_alojamiento: null, volumen_m3: 120, notas: 'Sala de tanques — 2 tanques refrigeración 8.000 L', creadoEn: Date.now() }
        ];
        fincaObj.subexplotaciones = [
          { especieId: 1, tipo_explotacion: 'Producción y reproducción', sistema_explotacion: 'semiextensivo', capacidad_maxima: 50, notas: 'Vacuno de leche — núcleo frisona', creadoEn: Date.now() },
          { especieId: 3, tipo_explotacion: 'Cebo o engorde (Cebadero)', sistema_explotacion: 'extensivo', capacidad_maxima: 200, notas: 'Ovino de carne — merina en pastos este', creadoEn: Date.now() }
        ];
        await Fincas.save(fincaObj);
        console.log('[SEED] Instalaciones (3) y subexplotaciones (2) añadidas a la finca');
      } catch (e) {
        console.log('[SEED] Error instalaciones/subexplotaciones:', e.message);
      }
```

- [ ] **Step 3: Verificar en navegador**

Reset + cargar demo. Consola:

```javascript
const f = await Fincas.getActive();
console.table(f.instalaciones);
console.table(f.subexplotaciones);
```

Expected: 3 instalaciones con `tipoId` numérico, 2 subexplotaciones (Vacas leche / Ovejas carne). Navegar a `#/instalaciones` y `#/subexplotaciones`: las cards aparecen con tipo resuelto desde el catálogo (p.ej. "Alojamiento ganadero bovino de leche").

- [ ] **Step 4: Commit**

```bash
git add js/seed-data.js
git commit -m "feat(seed): instalaciones y subexplotaciones en finca demo"
git push origin feat/demo-chamorro-siembra-ampliada
```

---

### Task 11: Contrato próximo a vencer (CT-2026-001 → hoy+45 días)

El informe CoMer > Contratos muestra vencimientos <60 días (informes-data.js:436-455). El contrato demo de carne tiene `fecha_fin: '2026-12-31'` fija — fuera de ventana y además caduca como dato demo con el tiempo. Se cambia a **hoy + 45 días** calculado en runtime, y `fecha_inicio` a hoy −200 días para que esté siempre vigente.

**Files:**
- Modify: `js/seed-data.js` (def del contrato carne ~línea 238-244)

**Interfaces:**
- Consumes: nada nuevo.
- Produces: contrato `CT-2026-001` con `fecha_fin` dinámica a +45 días ⇒ aparece como "próximo a vencer" en el informe siempre, sin importar cuándo se cargue la demo.

- [ ] **Step 1: Editar la def del contrato carne**

En `js/seed-data.js` (~línea 238-244), cambiar:

```javascript
            numero_contrato: 'CT-2026-001',
            tipo: 'carne',
            fecha_inicio: '2026-01-01',
            fecha_fin: '2026-12-31',
```

por:

```javascript
            numero_contrato: 'CT-2026-001',
            tipo: 'carne',
            fecha_inicio: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            fecha_fin: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
```

- [ ] **Step 2: Verificar en navegador**

Reset + cargar demo. Consola:

```javascript
await InformesView._obtenerContratosVencimiento(await Fincas.getActiveId());
```

Expected: el resultado incluye `CT-2026-001` con `diasRestantes` ≈ 45. Navegar a `#/informes` → CoMer → Contratos: tarjeta de vencimiento visible.

- [ ] **Step 3: Commit**

```bash
git add js/seed-data.js
git commit -m "feat(seed): contrato carne demo con vencimiento dinámico (hoy+45d)"
git push origin feat/demo-chamorro-siembra-ampliada
```

---

### Task 12: Agenda (4 tareas: programadas + 1 vencida)

**Files:**
- Modify: `js/seed-data.js` (antes de `// Seed completado`, tras Task 9)

**Interfaces:**
- Consumes: `fincaId`, `rebVacas` (para `entidad_id` de la tarea de vacunación), `vacProxDosis` (var definida en la Task 9 — la tarea de recuerdo usa la misma fecha; por eso la Task 9 debe quedar antes en el archivo).
- Produces: 4 registros en `agenda_tareas` con `demo: true`, `estado: 'pendiente'`, una vencida (fecha pasada), una `es_alerta: true`.

Se escribe con `window.db.add` directo replicando el objeto que construye `AgendaService.add` (agenda-service.js:11-34) porque el servicio además llama a `NotificacionesService.programarTarea` — no queremos disparar notificaciones reales al cargar una demo.

- [ ] **Step 1: Insertar el bloque**

```javascript
      // 23. Agenda (Menú Más > Agenda + widgets) — db.add directo para no disparar
      // NotificacionesService con datos demo (AgendaService.add las programaría)
      var agVencida = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var agManana = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var agMes = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      var agendaDefs = [
        { modulo_id: 'sanidad', entidad_id: rebVacas.id, titulo: 'Recuerdo vacuna lengua azul', descripcion: 'Segunda dosis rebaño vacas frisonas — campaña obligatoria', fecha_planificada: vacProxDosis, prioridad: 'alta', es_alerta: true },
        { modulo_id: 'lacteos', entidad_id: null, titulo: 'Limpieza circuito tanque 1', descripcion: 'Limpieza alcalina + ácida del circuito de ordeño', fecha_planificada: agManana, prioridad: 'media', es_alerta: false },
        { modulo_id: 'general', entidad_id: null, titulo: 'Revisión documentación PAC 2026', descripcion: 'Preparar justificantes eco-esquemas para la solicitud', fecha_planificada: agMes, prioridad: 'baja', es_alerta: false },
        { modulo_id: 'silos', entidad_id: null, titulo: 'Pedido pienso concentrado', descripcion: 'Silo 1 por debajo del 25% — llamar a Piensos El Trébol', fecha_planificada: agVencida, prioridad: 'alta', es_alerta: false }
      ];
      for (var ag = 0; ag < agendaDefs.length; ag++) {
        try {
          await window.db.add('agenda_tareas', {
            demo: true,
            fincaId: fincaId,
            modulo_id: agendaDefs[ag].modulo_id,
            entidad_id: agendaDefs[ag].entidad_id,
            titulo: agendaDefs[ag].titulo,
            descripcion: agendaDefs[ag].descripcion,
            fecha_planificada: agendaDefs[ag].fecha_planificada,
            prioridad: agendaDefs[ag].prioridad,
            es_alerta: agendaDefs[ag].es_alerta,
            estado: 'pendiente',
            creadoEn: new Date().toISOString(),
            actualizadoEn: new Date().toISOString()
          });
        } catch (e) { console.log('[SEED] Error tarea agenda:', e.message); }
        await sleep(60);
      }
      console.log('[SEED] Tareas de agenda creadas: 4');
```

- [ ] **Step 2: Verificar en navegador**

Reset + cargar demo. Consola:

```javascript
await AgendaService.list(await Fincas.getActiveId(), {});
```

Expected: 4 tareas ordenadas por fecha (la vencida primero). Navegar a Menú Más → Agenda: cards por módulo, la vencida marcada, la de vacuna con indicador de alerta crítica.

- [ ] **Step 3: Commit**

```bash
git add js/seed-data.js
git commit -m "feat(seed): tareas de agenda demo (vacuna, tanque, PAC, 1 vencida)"
git push origin feat/demo-chamorro-siembra-ampliada
```

---

### Task 13: Verificación integral de la siembra

Recorrido completo por las vistas/informes que antes salían vacíos + tests de regresión. Sin código nuevo (si algo falla, se corrige en la tarea correspondiente y se repite).

**Files:**
- Ninguno (solo verificación).

- [ ] **Step 1: Reset + carga de demo limpia**

Consola del navegador con la app abierta:

```javascript
await indexedDB.deleteDatabase('LivestockDB');
localStorage.clear();
location.reload();
```

Tras recargar, asistente → "Cargar Demo CHAMORRO". Esperar al toast de confirmación de carga.

- [ ] **Step 2: Verificación de consola (todo en uno)**

```javascript
const fId = await Fincas.getActiveId();
const checks = {
  saneamientos: (await db.getAll('saneamientos')).length,
  restriccion: (await Saneamientos.restriccionActiva(fId)).activa,
  pedidosCrotales: (await db.getAll('pedidos_crotales')).length,
  fitosanitarios: (await InformesView._obtenerDatosFitosanitarios(fId)).numRegistros,
  costesFijosBE: (await Analitica.obtenerBreakEven(fId)).costesFijos,
  docsPAC: (await db.getAll('documentos_legales')).filter(d => d.tipo === 'pac').length,
  botiquin: (await db.getAll('config_botiquin')).length,
  lotesBotiquin: (await db.getAll('botiquin_lotes')).length,
  vacunaciones: (await db.getAll('vacunaciones')).length,
  instalaciones: (await Fincas.getActive()).instalaciones.length,
  subexplotaciones: (await Fincas.getActive()).subexplotaciones.length,
  tareasAgenda: (await db.getAll('agenda_tareas')).length
};
console.table(checks);
// Esperado: saneamientos 2, restriccion true, pedidosCrotales 2, fitosanitarios 3,
// costesFijosBE 4111, docsPAC 2, botiquin 4, lotesBotiquin 3, vacunaciones 2,
// instalaciones 3, subexplotaciones 2, tareasAgenda 4
const demoCheck = {
  saneamientos: (await db.getAll('saneamientos')).every(s => s.demo === true),
  crotales: (await db.getAll('pedidos_crotales')).every(p => p.demo === true),
  botiquin: (await db.getAll('config_botiquin')).every(b => b.demo === true),
  vacunaciones: (await db.getAll('vacunaciones')).every(v => v.demo === true),
  agenda: (await db.getAll('agenda_tareas')).every(t => t.demo === true),
  pac: (await db.getAll('documentos_legales')).filter(d => d.tipo === 'pac').every(d => d.demo === true)
};
console.table(demoCheck); // todo true
```

- [ ] **Step 3: Recorrido visual**

| Ruta | Qué debe verse |
|---|---|
| `#/saneamientos` | 2 campañas; 2026 con restricción activa y próxima actuación |
| `#/explotacion?tab=tramites` | Saneamientos + 2 pedidos crotales (entregado/pendiente) |
| `#/explotacion?tab=fitosanitarios` | 3 tratamientos con zona y control normativo RD 787/2023 |
| `#/informes` → ExPro → Fitosanitario | 3 registros, 2 zonas, total 469,45 € |
| `#/informes` → Libros → Break-Even | Costes fijos 4.111 €, gráfico con datos |
| `#/informes` → Libros → PAC | 2024 completa, 2025 parcial (65%) |
| `#/botiquin` | 4 productos; avisos caducidad (BTV-4) y stock bajo (OXI, MLX) |
| GeGan > Sanidad | 2 vacunaciones de rebaño |
| `#/instalaciones` | Nave ordeño, establo cebo, sala tanques |
| `#/subexplotaciones` | Vacuno leche semiextensivo / Ovino carne extensivo |
| `#/informes` → CoMer → Contratos | CT-2026-001 "vence en 45 días" |
| Menú Más → Agenda | 4 tareas; 1 vencida; 1 alerta crítica |

- [ ] **Step 4: Tests de regresión**

Consola del navegador:

```javascript
await runInformesDataTests(); // esperado: 18/18 PASS
await runLacteoTests();       // esperado: 87/87 PASS
```

Si alguno falla: no continuar — corregir la siembra (el fallo más probable es un campo con tipo incorrecto en un bloque nuevo) y repetir desde Step 1.

- [ ] **Step 5: Commit (solo si hubo correcciones)**

```bash
git add js/seed-data.js
git commit -m "fix(seed): correcciones de verificación integral"
git push origin feat/demo-chamorro-siembra-ampliada
```

---

### Task 14: Bump de caché, build y PR

**Files:**
- Modify: `sw.js:1` (`CACHE_NAME`)
- Modify: `index.html` (todos los `?v=6.43` → `?v=6.44`)
- Modify: `js/asistente-configuracion.js:12` (`js/seed-data.js?v=6.30` → `?v=6.44`)

**Interfaces:**
- Consumes: todo lo anterior commiteado en la rama.
- Produces: rama lista para PR; `www/` regenerado (gitignored); `android/app/src/main/assets/public` sincronizado (gitignored vía android/.gitignore).

- [ ] **Step 1: Bump CACHE_NAME**

En `sw.js:1`:

```javascript
const CACHE_NAME = 'corcho-v6.44.0';
```

- [ ] **Step 2: Bump ?v= en index.html y asistente**

En `index.html`, reemplazar TODAS las ocurrencias de `?v=6.43` por `?v=6.44` (son los tags `<script src="js/...">`; comprobar con búsqueda global que no queda ningún `6.43`). En `js/asistente-configuracion.js:12`:

```javascript
s.src = 'js/seed-data.js?v=6.44';
```

- [ ] **Step 3: Build + sync**

```bash
npm run build:free
npx cap sync android
```

Expected: build copia a `www/` sin errores; cap sync copia a `android/app/src/main/assets/public` (ambos gitignored — no deben aparecer en `git status`).

- [ ] **Step 4: Commit + PR + merge**

```bash
git add sw.js index.html js/asistente-configuracion.js
git commit -m "chore: bump cache v6.44.0 (siembra demo CHAMORRO ampliada)"
git push origin feat/demo-chamorro-siembra-ampliada
gh pr create --base master --title "feat: siembra demo CHAMORRO ampliada (11 bloques) + 2 fixes de informes" --body "Fase A del spec docs/superpowers/specs/2026-08-01-informes-categorias-demo-chamorro-design.md.

Siembra: saneamientos (2 campañas + restricción activa), pedidos de crotales, gastos fitosanitarios con zona y control normativo, costes fijos, documentos PAC, botiquín con lotes, vacunaciones de rebaño, instalaciones y subexplotaciones en finca, contrato con vencimiento dinámico (hoy+45d) y agenda.

Fixes de app detectados en la verificación de campos:
- analitica.js: Break-Even ignoraba categorías sin tilde ('Amortizacion' del wizard) — normalización NFD.
- gastos.js: Gastos.save pisaba el snap_zona explícito del wizard con el snapshot ('Sin zona').

Verificado: runInformesDataTests 18/18, runLacteoTests 87/87."
gh pr merge --squash --delete-branch
```

---

## Cobertura del spec (auto-revisión)

| Bloque del spec §4 | Tarea |
|---|---|
| 1. Saneamientos (2 campañas + restricción) | Task 3 |
| 2. Pedidos crotales (recibido + pendiente) | Task 4 |
| 3. Gastos fitosanitarios (3-4, snap_zona, fechas recientes) | Task 5 |
| 4. Costes fijos + reconocimiento en Break-Even | Tasks 1 + 6 |
| 5. PAC (1-2 docs, importe_solicitado, campaña, estado) | Task 7 |
| 6. Botiquín (3-4 productos + lotes, 1 próximo a caducar, 1 stock bajo) | Task 8 |
| 7. Vacunaciones (2-3 registros con próxima dosis) | Tasks 9 + 12 (recuerdo como tarea de agenda) |
| 8. Instalaciones (nave ordeño, establo cebo, sala tanques) | Task 10 |
| 9. Subexplotaciones (Vacas leche, Ovejas carne) | Task 10 |
| 10. Contrato hoy+45d | Task 11 |
| 11. Agenda (vacunación, limpieza tanque, revisión PAC, 1 vencida) | Task 12 |
| Verificación Fase A + tests 87/87 y 18/18 | Task 13 |
| Bump SW + build:free + cap sync + PR (spec §8) | Task 14 |

**Desviaciones documentadas del spec (con rationale):**
1. **Spec §4.4 pedía sembrar `Amortización` con tilde y corregir las defs antiguas.** En su lugar se corrige el bug raíz en `analitica.js` (normalización NFD, Task 1) y la siembra mantiene las categorías **sin tilde**, fieles a lo que escribe el wizard real. Cumple el objetivo del spec (Break-Even reconoce los costes fijos) y además arregla el informe para usuarios reales.
2. **`Gastos.save` pisaba `snap_zona`** (bug real, gastos.js:57-59): corregido en la Task 2 en lugar de esquivarlo con `db.add` en la siembra — los bloques de fitosanitarios/electricidad usan `Gastos.save` como el wizard real.
3. **"Próxima dosis" de vacunaciones** (spec §4.7): el modelo no tiene ese campo; se cubre con `observaciones` + tarea de agenda con la misma fecha (`vacProxDosis`).
4. **`demo: true` requiere parche `db.get`+`db.put`** tras `Saneamientos.save` y `Vacunaciones.save` (esos modelos construyen su propio objeto y no propagan campos extra).
5. **Instalaciones/subexplotaciones** se rellenan tras `Fincas.crearNueva` (no en el literal `DEMO_FINCA`) porque los `tipoId` se resuelven contra el catálogo en runtime.
6. **Agenda se siembra con `db.add` directo** (no `AgendaService.add`) para no disparar `NotificacionesService.programarTarea` con datos demo.
7. **`Seguros`/`Gestoria`** no son opciones del wizard de gastos (que solo ofrece 6 categorías); se siembran como categorías solo-demo pedidas por el spec §4.4 — la normalización NFD las reconoce en Break-Even.
