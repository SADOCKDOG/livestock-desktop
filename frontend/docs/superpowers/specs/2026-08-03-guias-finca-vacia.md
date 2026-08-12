# Encargo: guías para finca nueva (sin datos)

**Fecha:** 2026-08-03
**Contexto:** Fase 3 cerrada (PR #115 fusionado). Las 20 guías están validadas **con la Demo CHAMORRO cargada**. Esta es la brecha detectada al probar con una finca recién creada y vacía.
**Rama:** nueva desde `master` (protegida → PR).

---

## 1. El problema, medido en dispositivo

Xiaomi 22111317G / Android 14, finca nueva sin datos (`FINCA PRUEBA GUIAS`, ES210050009999, flags leche+carne), APK de `master`:

| Pilar | Con Demo | Finca vacía |
|---|---|---|
| GeGan | 36/38 | **21/38** |
| ExPro | 53/55 | 48/55 |
| CoMer | 40/42 | **22/42** |

Desglose de los casos peores:

```
gegan.animales        6/6 → 0/6    ningún target existe
gegan.zonas           6/7 → 1/7
gegan.patrimonio      6/6 → 3/6
comer.compradores     6/7 → 4/7
comer.contratos       6/7 → 4/7
comer.transportistas  7/7 → 4/7
```

**No se rompe nada**: el motor degrada los pasos sin target a narrativo centrado (`_esResaltable()`), y los 8 pasos de `gegan.animales` se recorren completos. El problema es de contenido: la guía **describe elementos que no están en pantalla**. Ejemplo literal del paso 2 de `gegan.animales` sobre una pantalla vacía:

> "El panel superior resume **totales por especie** (Vacas, Ovejas, Cabras, Cerdos), **activos** y **vendidos**. Click en el chevron para ocultar/mostrar."

No hay panel, ni chevron, ni especies. Y esto le ocurre justamente al usuario que más necesita la guía: **las guías se auto-arrancan la primera vez**, así que la instalación desde cero es su escenario principal.

---

## 2. Decisión de diseño

Las guías de finca vacía **no son las mismas recortadas**. El contenido útil es distinto por naturaleza:

- **Con datos** → tour de interfaz: "esto es una tarjeta de animal, esto un badge de supresión, aquí filtras".
- **Sin datos** → puesta en marcha: "para empezar, crea tus zonas; luego agrupa el ganado en rebaños; después da de alta los animales".

Un tour de interfaz sobre una pantalla vacía no enseña nada. Una secuencia de arranque sí.

**Ojo, no confundir con lo que ya existe:** `AsistenteConfiguracion._mostrarTourInicio()` (`asistente-configuracion.js:386`) es un tour **de producto** de 4 pasos —presenta la app, ofrece cargar la demo y abrir los manuales— y se muestra **antes** de tener finca. No cubre esto.

---

## 3. Alcance propuesto (NO duplicar las 20 guías)

### 3.1 Una sola guía de primeros pasos, transversal

El arranque de una explotación es **una secuencia**, no tres tours independientes. Se propone **una guía nueva**, `onboarding.primeros-pasos`, que recorra el orden real de puesta en marcha:

1. **Zonas** (GeGan → Zonas): dar de alta las parcelas, con su superficie y código PAC.
2. **Rebaños** (GeGan → Rebaños): agrupar el ganado en lotes; hace falta antes de los animales.
3. **Animales** (GeGan → Animales): alta individual con crotal.
4. **Producción** (ExPro): según flags — ordeño si leche, pesajes si carne.
5. **Comercialización** (CoMer): compradores y primera venta o entrega.

Cada paso ancla en el botón del **empty-state** de esa vista (ver §3.3) y usa `launch` donde haya wizard real.

Alternativa descartada: duplicar las 20 guías en versión "vacía". Multiplica el mantenimiento por dos y la mayoría de pasos no tendrían equivalente útil.

### 3.2 Las 20 guías actuales solo con datos

Que no se auto-arranquen sobre una vista vacía. Dos vías posibles, a elegir por quien implemente:

- **(a) Campo declarativo** `requiereDatos: true` en la guía, y que `GuideManager.maybeStart` lo evalúe contando registros de la vista.
- **(b) Predicado por guía**, p. ej. `disponible: async () => (await db.getAll('animales')).length > 0`.

La opción (b) es más flexible y no obliga al motor a saber qué store mira cada guía. En ambos casos el FAB "Guía" debe seguir permitiendo lanzarlas a mano.

**Importante:** no vale con marcar los pasos como `optional`. Ya se probó mentalmente y deja la guía en bienvenida + botón + cierre, que no enseña el flujo.

### 3.3 `data-guide` que faltan en los empty-states

Los empty-states **sí tienen botón**, pero casi ninguno tiene `data-guide`, y ese es el ancla que necesita la guía de primeros pasos. Inventario actual:

| Vista | Botón del empty-state | `data-guide` |
|---|---|---|
| `animales-view.js:32` | "Registrar primer animal" | **falta** |
| `rebanos-view.js` | "Nuevo Rebaño" | ya tiene `btn-nuevo-rebano` |
| `zonas-view.js` | "Crear primera zona" | **falta** |
| `silos-view.js` | "Registrar primer silo" | **falta** |
| `proveedores-view.js` | "Nuevo Proveedor" | **falta** |
| `compradores-view.js` | "Registrar primer comprador" | **falta** |
| `contratos-view.js` | "Nuevo contrato" | **falta** |
| `transportistas-view.js` | "Nuevo Transportista" | **falta** |
| `fitosanitarios-view.js` | "Nuevo Registro" | **falta** |

Añadir `data-guide="btn-vacio-<modulo>"` a cada uno. Es el patrón que ya demostró ser el único estable (`gegan.animales` era 6/6 con datos precisamente por usarlo).

---

## 4. Reglas que ya han costado caras — no repetirlas

1. **Nada de `:has-text()` ni `:has()`**: es sintaxis de Playwright, no CSS. Ya se coló dos veces (9 selectores en GeGan, 12 en ExPro).
2. **Los sub-tabs no tienen `data-tab`**: se localizan por su `onclick` real — `_cambiarLacteoSubTab('<key>')`, `_cambiarTramiteSubTab('<key>')`. La clase `.tramites-sub-tabs` no existe.
3. **El carrusel**: los elementos con `data-tab` son `span.carrusel-dot`, no `button`.
4. **Los FAB no son homogéneos**: en Gastos/Proveedores el `onclick` es atributo HTML (`[onclick*="…"]` funciona); en CoMer se asigna por propiedad JS (`fabContainer.onclick = …`), así que hay que usar `.fab-container` a secas. En Leche/Carne no hay FAB: el alta es `.module-header-primary-action button[onclick*="…"]`.
5. **Verificar cada target en el navegador antes de darlo por bueno.** Un selector puede ser CSS válido y no encontrar nada; y puede encontrar *algo* que no es lo que describe el texto (pasó con `.gasto-bar-wrap`, que resaltaba una barra suelta en vez del gráfico).

---

## 5. Criterio de entrega

Con **finca nueva y vacía**, y con la Demo CHAMORRO cargada, en dispositivo real:

```js
await GuiaQA.validarTargets('GanaderiaView')
await GuiaQA.validarTargets('ExplotacionView')
await GuiaQA.validarTargets('ComercializacionView')
```

- **0 inválidos** en ambos escenarios.
- **0 sin coincidencia**, salvo pasos `optional` con `optionalReason` escrito en el código.
- La guía de primeros pasos se auto-arranca en finca vacía y **no** aparece con datos.
- Las 20 guías actuales **no** se auto-arrancan en finca vacía, pero siguen lanzables desde el FAB.
- `PremiumQA.runAll()` sin fallos.

**Pegar la salida del validador en el reporte**, no afirmar que se ha ejecutado. Medir una ruta cada vez: encadenar las tres da falsos negativos en las guías panorámicas.

---

## 6. Cómo validar sin reinstalar

Con el móvil por USB, el ciclo es de minutos y no hace falta rebuild:

```bash
adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>
```

El `<pid>` sale de `adb shell cat /proc/net/unix | grep webview_devtools_remote`. Después, CDP con `Runtime.evaluate` y `allowUnsafeEvalBlockedByCSP: true` (la app tiene CSP `script-src 'self'`) permite inyectar los ficheros de guías en caliente y medir. `adb exec-out screencap -p` da la captura real.
