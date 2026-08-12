# Margen Económico por Animal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calcular y mostrar, por animal, el margen económico acumulado histórico (coste de compra + sanidad prorrateada vs. ingreso de leche estimado + venta), en la ficha del animal y en un listado ordenable por rebaño/finca.

**Architecture:** Un módulo de solo cálculo (`js/margen-animal.js`) que cruza datos ya existentes de `js/animales.js`, `js/sanitarios.js`, `js/vacunaciones.js`, `js/produccion.js`, `js/compradores.js`, `js/contratos.js` y `registro_eventos`. Antes de poder calcular el coste de sanidad hace falta cerrar un gap: `Botiquin.consumir()` (`js/botiquin.js`) no registra el coste en euros del consumo, solo la cantidad física — se añade ese cálculo primero. La UI son dos piezas: una sección nueva en la ficha de animal existente, y una vista de listado nueva siguiendo el patrón ya usado por `SaneamientosView`/`SubexplotacionesView`.

**Tech Stack:** Vanilla JS, IndexedDB (vía `window.db`, wrapper en `js/idb-local.js`), sin bundler — cada módulo se carga como `<script>` en `index.html` y expone un objeto global (`window.Xxx`). No hay test runner: la verificación sigue el patrón de QA suites del proyecto (`js/qa-*.js`, funciones `async runAll()` que se pegan en la consola del navegador).

## Global Constraints

- Todo el código nuevo y los mensajes de UI van en español, siguiendo el resto del proyecto (nombres de variables/funciones en español donde el código existente ya lo hace, ej. `calcularParaFinca`, `costeSanidad`).
- No modificar el schema de IndexedDB (no bump de `DB_VERSION`) salvo el cambio mínimo necesario en el evento que ya crea `Botiquin.consumir()` (añadir un campo nuevo a un objeto que se guarda con `db.add`, IndexedDB no fuerza schema, no requiere migración).
- Reutilizar `ErrorHandler.tryAsync` para todo método async público de un módulo, igual que el resto de módulos de datos del proyecto (ver `js/vacunaciones.js`, `js/sanitarios.js`).
- Todo módulo de datos nuevo termina con `window.NombreModulo = NombreModulo;` y se registra en `index.html` con un `<script>` tag, en la sección de "Controladores Operativos Diario" (después de `js/botiquin.js`, línea ~305 de `index.html`).
- Toda vista nueva sigue el patrón lazy-load: no se añade `<script>` en `index.html`, se registra en `App._viewGroups.gegan` (`js/app.js`) junto a `botiquin-view.js`.
- Margen acumulado histórico completo — sin selector de periodo (fuera de alcance según el spec).

---

## File Structure

- **Modify:** `js/botiquin.js` — `consumir()` calcula y guarda `costeTotal` del consumo.
- **Create:** `js/margen-animal.js` — módulo de cálculo puro, sin UI.
- **Create:** `js/qa-margen-animal.js` — QA suite de verificación en consola, siguiendo el patrón de `js/qa-especie-crotal.js`.
- **Modify:** `js/views/animales-view.js` — nueva sección "MARGEN ECONÓMICO" en `renderDetalle()`.
- **Create:** `js/views/margen-animal-view.js` — listado/ranking por finca o rebaño.
- **Modify:** `js/app.js` — rutas `/margen-animal` y registro en `_viewGroups.gegan`/`_routeGroups`, entrada de menú.
- **Modify:** `index.html` — `<script>` tags para `js/margen-animal.js` y `js/qa-margen-animal.js`.

---

### Task 1: Coste del consumo de botiquín

**Files:**
- Modify: `js/botiquin.js:34-93` (método `consumir`)

**Interfaces:**
- Consumes: nada nuevo — usa `this.get(productoId)`, `this.getLotes(productoId)` ya existentes en el mismo archivo.
- Produces: el evento que `consumir()` inserta en `registro_eventos` gana un campo nuevo `costeTotal` (number, euros, redondeado a 2 decimales). Consumido por `MargenAnimal` en la Task 3.

**Contexto:** `consumir()` ya recorre los lotes en orden FEFO (`lotesFEFO`) y descuenta cantidad de cada uno en un bucle `for`. Cada lote (`botiquin_lotes`) puede tener un campo `precioUnitario` (añadido en la feature de vinculación de compras al botiquín, sesión anterior — puede ser `null` si el lote se creó sin precio). El coste del consumo es la suma, para cada lote tocado, de `cantidadDescontadaDeEseLote × (lote.precioUnitario || 0)`.

- [ ] **Step 1: Leer el código actual completo del método antes de tocarlo**

```bash
sed -n '34,93p' js/botiquin.js
```

Confirma que el bucle FEFO es:
```js
let restante = cantidadNum;
for (const lote of lotesFEFO) {
  if (restante <= 0) break;
  const aDescontar = Math.min(restante, Number(lote.cantidad));
  lote.cantidad = Number(lote.cantidad) - aDescontar;
  await window.db.put('botiquin_lotes', lote);
  restante -= aDescontar;
}
```

- [ ] **Step 2: Acumular el coste dentro del mismo bucle**

Reemplaza el bloque del bucle FEFO (justo antes de `let restante = cantidadNum;` hasta el cierre del `for`) por:

```js
      let restante = cantidadNum;
      let costeTotal = 0;
      for (const lote of lotesFEFO) {
        if (restante <= 0) break;
        const aDescontar = Math.min(restante, Number(lote.cantidad));
        costeTotal += aDescontar * Number(lote.precioUnitario || 0);
        lote.cantidad = Number(lote.cantidad) - aDescontar;
        await window.db.put('botiquin_lotes', lote);
        restante -= aDescontar;
      }
      costeTotal = Number(costeTotal.toFixed(2));
```

- [ ] **Step 3: Añadir `costeTotal` al evento de `registro_eventos`**

Localiza el bloque `await window.db.add('registro_eventos', { ... });` dentro de `consumir()` (después del bucle FEFO, contiene `motivo_tarea: 'consumo_botiquin'`). Añade la propiedad `costeTotal` justo después de `unidad: p.unidad,`:

```js
      await window.db.add('registro_eventos', {
        fincaId: p.fincaId,
        entidad_id: p.id,
        tipo_entidad: 'botiquin',
        tipo: 'movimiento',
        motivo_tarea: 'consumo_botiquin',
        fecha: opts.fecha || new Date().toISOString().split('T')[0],
        valor_neto: cantidadNum,
        unidad: p.unidad,
        costeTotal,
        descripcion: `Consumo de ${cantidadNum} ${p.unidad || ''} de ${p.nombre}${origenDesc ? ` (${origenDesc})` : ''}`,
        origen_tipo: opts.origenTipo || null,
        origen_id: opts.origenId != null ? Number(opts.origenId) : null,
        creadoEn: new Date().toISOString(),
      });
```

- [ ] **Step 4: Añadir `costeTotal` al valor de retorno de `consumir()`**

Localiza `return { productoId: p.id, consumido: cantidadNum, restante: p.cantidadActual };` al final del método y cámbialo por:

```js
      return { productoId: p.id, consumido: cantidadNum, restante: p.cantidadActual, costeTotal };
```

- [ ] **Step 5: Verificar sintaxis**

```bash
node --check js/botiquin.js
```

Expected: sin salida (sin errores).

- [ ] **Step 6: Verificación funcional en navegador**

Con el servidor de preview corriendo (`preview_start` con la config `static-src` de `.claude/launch.json`), en la consola del navegador:

```js
await window.dbPromise;
const finca = (await window.db.getAll('fincas'))[0];
const productoId = await window.db.add('config_botiquin', { fincaId: finca.id, nombre: 'TEST COSTE', unidad: 'ml', cantidadActual: 0, anulado: false, creadoEn: new Date().toISOString() });
await window.db.add('botiquin_lotes', { productoId, lote: 'L1', cantidad: 50, precioUnitario: 2, creadoEn: new Date().toISOString() });
await window.db.put('config_botiquin', { ...(await window.db.get('config_botiquin', productoId)), cantidadActual: 50 });
const resultado = await window.Botiquin.consumir(productoId, 10, {});
console.log(resultado);
```

Expected: `resultado.costeTotal === 20` (10 unidades × 2 €/unidad).

- [ ] **Step 7: Commit**

```bash
git add js/botiquin.js
git commit -m "feat(botiquin): registrar coste en euros de cada consumo de stock

Botiquin.consumir() descontaba stock por FEFO pero no guardaba cuánto
costó ese consumo — el evento en registro_eventos solo tenía la
cantidad física. Necesario para calcular coste de sanidad por animal
(ver docs/superpowers/specs/2026-07-23-margen-economico-animal-design.md)."
```

---

### Task 2: Módulo `MargenAnimal` — coste de sanidad

**Files:**
- Create: `js/margen-animal.js`

**Interfaces:**
- Consumes:
  - `window.Sanitarios.list(rebanoId=null, fincaId=null)` → array de tratamientos (`js/sanitarios.js:19`), cada uno con `{ id, rebanoId, animalId (puede ser undefined/null), fecha, ... }`. No tiene índice `animalId` en IndexedDB — hay que filtrar en memoria.
  - `window.Vacunaciones.list(filtros={})` → array de vacunaciones (`js/vacunaciones.js:19`), cada una con `{ id, rebanoId, fecha, animales_vacunados: [{animalId?, categoria?, cantidad}], tipos_vacuna: [{tipo, lote, dosis, nombre_comercial, botiquinProductoId, botiquinCantidad}] }`.
  - `window.db.getAllFromIndex('registro_eventos', 'tipo_entidad', 'botiquin')` → eventos de consumo de botiquín, cada uno con `{ origen_tipo: 'tratamiento'|'vacunacion'|null, origen_id: number|null, costeTotal: number }` (este campo lo añade la Task 1).
  - `window.Animales.list(rebanoId=null)` (`js/animales.js:2`) → array de animales del rebaño, cada uno con `{ id, rebanoId, ... }`.
- Produces: `window.MargenAnimal.calcularCosteSanidad(animalId)` → `Promise<number>` (euros), consumido por la Task 4.

**Contexto sobre el prorrateo:** un tratamiento/vacunación tiene coste solo si tiene un consumo de botiquín vinculado (via `origen_tipo`/`origen_id` en `registro_eventos`). Si el tratamiento/vacunación especifica `animalId` (individual), todo el coste de su(s) consumo(s) vinculado(s) es de ese animal. Si no especifica `animalId` (masivo — todo el rebaño o una categoría agregada), el coste se divide entre el número de animales del rebaño en ese momento (`Animales.list(rebanoId).length`).

Una vacunación puede tener varios `tipos_vacuna[]`, cada uno con su propio consumo de botiquín potencialmente vinculado — el `origen_id` en `registro_eventos` es el id de la vacunación (no del tipo individual), así que puede haber varios eventos de consumo con el mismo `origen_id` (uno por cada tipo de vacuna vinculado a stock). Hay que sumarlos todos.

- [ ] **Step 1: Crear el archivo con la estructura base y el índice de eventos de botiquín por origen**

```js
/**
 * MargenAnimal — Livestock Manager
 * Cálculo de coste (compra + sanidad prorrateada) vs. ingreso (leche
 * estimada + venta) por animal, acumulado histórico. Ver
 * docs/superpowers/specs/2026-07-23-margen-economico-animal-design.md.
 * Módulo de solo cálculo, sin UI propia.
 */
const MargenAnimal = {
  /**
   * Mapa origen_tipo:origen_id -> suma de costeTotal de los eventos de
   * consumo de botiquín vinculados a ese origen (un tratamiento o
   * vacunación puede tener varios eventos, ej. varios tipos de vacuna).
   */
  async _costesPorOrigen(fincaId) {
    const eventos = await window.db.getAllFromIndex('registro_eventos', 'tipo_entidad', 'botiquin').catch(() => []);
    const mapa = new Map();
    for (const e of eventos) {
      if (e.fincaId !== fincaId) continue;
      if (!e.origen_tipo || e.origen_id == null) continue;
      const clave = `${e.origen_tipo}:${e.origen_id}`;
      mapa.set(clave, (mapa.get(clave) || 0) + Number(e.costeTotal || 0));
    }
    return mapa;
  },
};

window.MargenAnimal = MargenAnimal;
```

- [ ] **Step 2: Añadir `calcularCosteSanidad(animalId)`**

Inserta este método dentro del objeto `MargenAnimal`, después de `_costesPorOrigen`:

```js
  /**
   * Coste total de sanidad (tratamientos + vacunaciones) imputado a un
   * animal, prorrateando los eventos masivos (sin animalId) entre los
   * animales del rebaño en el momento del evento.
   */
  async calcularCosteSanidad(animalId) {
    const animal = await window.Animales.get(Number(animalId));
    if (!animal || !animal.rebanoId) return 0;

    const rebanoId = animal.rebanoId;
    const costesPorOrigen = await this._costesPorOrigen(animal.fincaId ?? (await window.db.get('rebanos', rebanoId))?.fincaId);
    const animalesDelRebano = await window.Animales.list(rebanoId);
    const totalAnimalesRebano = animalesDelRebano.length || 1;

    let coste = 0;

    // Tratamientos
    const tratamientos = await window.Sanitarios.list(rebanoId);
    for (const t of tratamientos) {
      const costeEvento = costesPorOrigen.get(`tratamiento:${t.id}`) || 0;
      if (costeEvento === 0) continue;
      if (t.animalId != null) {
        if (Number(t.animalId) === Number(animalId)) coste += costeEvento;
      } else {
        coste += costeEvento / totalAnimalesRebano;
      }
    }

    // Vacunaciones
    const vacunaciones = await window.Vacunaciones.list({ rebanoId });
    for (const v of vacunaciones) {
      const costeEvento = costesPorOrigen.get(`vacunacion:${v.id}`) || 0;
      if (costeEvento === 0) continue;
      const animalesVacunados = Array.isArray(v.animales_vacunados) ? v.animales_vacunados : [];
      const esIndividual = animalesVacunados.some((av) => av.animalId != null);
      if (esIndividual) {
        const estaEsteAnimal = animalesVacunados.some((av) => Number(av.animalId) === Number(animalId));
        if (estaEsteAnimal) {
          // Coste repartido entre los animales individuales de esta vacunación
          coste += costeEvento / animalesVacunados.length;
        }
      } else {
        // Modo categoría/agregado: prorratea entre todo el rebaño
        coste += costeEvento / totalAnimalesRebano;
      }
    }

    return Number(coste.toFixed(2));
  },
```

- [ ] **Step 3: Verificar sintaxis**

```bash
node --check js/margen-animal.js
```

Expected: sin salida.

- [ ] **Step 4: Registrar el script en `index.html`**

Localiza en `index.html` la línea:
```html
    <script src="js/botiquin.js?v=1.0"></script>
```
(está en la sección "4º Inyectar los Controladores Operativos Diario", cerca de `js/sanitarios.js`). Añade justo después:

```html
    <script src="js/margen-animal.js?v=1.0"></script>
```

- [ ] **Step 5: Verificación funcional en navegador**

Con el servidor de preview corriendo, en la consola:

```js
await window.dbPromise;
console.log(typeof window.MargenAnimal.calcularCosteSanidad); // 'function'
```

Crea un escenario mínimo (finca, rebaño, 2 animales, un tratamiento masivo con consumo de botiquín vinculado) y confirma que `calcularCosteSanidad` reparte el coste entre los 2 animales:

```js
const finca = (await window.db.getAll('fincas'))[0] || { id: await window.db.add('fincas', { nombre: 'F', creadoEn: new Date().toISOString() }) };
const rebanoId = await window.db.add('rebanos', { fincaId: finca.id, nombre: 'R-TEST', especie: 'Bovino', creadoEn: new Date().toISOString() });
const a1 = await window.Animales.save({ rebanoId, numero_identificacion: 'MARGEN-A1', tipoAlta: 'Nacimiento' });
const a2 = await window.Animales.save({ rebanoId, numero_identificacion: 'MARGEN-A2', tipoAlta: 'Nacimiento' });
const productoId = await window.db.add('config_botiquin', { fincaId: finca.id, nombre: 'DESPARASITANTE', unidad: 'ml', cantidadActual: 0, anulado: false, creadoEn: new Date().toISOString() });
await window.db.add('botiquin_lotes', { productoId, lote: 'L1', cantidad: 100, precioUnitario: 1, creadoEn: new Date().toISOString() });
await window.db.put('config_botiquin', { ...(await window.db.get('config_botiquin', productoId)), cantidadActual: 100 });
const tratamientoId = await window.Sanitarios.save({ rebanoId, tipo_tratamiento: 'Desparasitación', fecha: new Date().toISOString().split('T')[0] });
await window.Botiquin.consumir(productoId, 20, { origenTipo: 'tratamiento', origenId: tratamientoId });
const coste = await window.MargenAnimal.calcularCosteSanidad(a1);
console.log(coste); // debe ser 10 (20€ de coste / 2 animales)
```

Expected: `coste === 10`.

- [ ] **Step 6: Commit**

```bash
git add js/margen-animal.js index.html
git commit -m "feat: calcular coste de sanidad por animal con prorrateo de tratamientos masivos"
```

---

### Task 3: Módulo `MargenAnimal` — ingreso de leche

**Files:**
- Modify: `js/margen-animal.js`

**Interfaces:**
- Consumes:
  - `window.Compradores.list({tipo: 'leche'})` (`js/compradores.js:11`) → array de compradores con `{id, nombre, tipo_comprador, activo}`.
  - `window.Contratos.getActivo(compradorId, 'leche')` (`js/contratos.js:29`) → contrato activo o `null`, con `{precios: [{producto, precio_unitario, unidad, desde, hasta}]}`.
  - `window.Produccion.listLeche(fincaId)` (`js/produccion.js:108`) → array de registros de leche descifrados, cada uno con `{vacaId, cantidad_litros, fecha}`.
- Produces: `MargenAnimal.calcularIngresoLeche(animalId, fincaId)` → `Promise<{litros: number, ingreso: number, sinPrecioLeche: boolean}>`, consumido por la Task 4.

**Contexto:** ver spec, sección "Cálculo del ingreso de leche" para la lógica exacta de búsqueda de precio (primer comprador tipo 'leche' con contrato activo, primera fila de `precios[]` con `producto` case-insensitive "leche" vigente hoy).

- [ ] **Step 1: Añadir el método de resolución de precio de leche**

Inserta este método dentro de `MargenAnimal`, después de `_costesPorOrigen`:

```js
  /** Precio unitario de leche vigente hoy, o null si no hay ninguno. */
  async _precioLecheVigente() {
    if (!window.Compradores || !window.Contratos) return null;
    const compradoresLeche = await window.Compradores.list({ tipo: 'leche' }).catch(() => []);
    const hoy = new Date();
    for (const comprador of compradoresLeche) {
      const contrato = await window.Contratos.getActivo(comprador.id, 'leche');
      if (!contrato || !Array.isArray(contrato.precios)) continue;
      const filaLeche = contrato.precios.find((p) => {
        if (!(p.producto || '').toLowerCase().includes('leche')) return false;
        const desdeOk = !p.desde || new Date(p.desde) <= hoy;
        const hastaOk = !p.hasta || new Date(p.hasta) >= hoy;
        return desdeOk && hastaOk;
      });
      if (filaLeche) return Number(filaLeche.precio_unitario) || 0;
    }
    return null;
  },
```

- [ ] **Step 2: Añadir `calcularIngresoLeche(animalId, fincaId)`**

Inserta este método justo después:

```js
  /** Litros e ingreso estimado de leche de un animal, acumulado histórico. */
  async calcularIngresoLeche(animalId, fincaId) {
    if (!window.Produccion) return { litros: 0, ingreso: 0, sinPrecioLeche: true };
    const registros = await window.Produccion.listLeche(fincaId).catch(() => []);
    const litros = registros
      .filter((r) => Number(r.vacaId) === Number(animalId))
      .reduce((sum, r) => sum + (Number(r.cantidad_litros) || 0), 0);

    const precioLitro = await this._precioLecheVigente();
    if (precioLitro == null) {
      return { litros: Number(litros.toFixed(2)), ingreso: 0, sinPrecioLeche: true };
    }
    return { litros: Number(litros.toFixed(2)), ingreso: Number((litros * precioLitro).toFixed(2)), sinPrecioLeche: false };
  },
```

- [ ] **Step 3: Verificar sintaxis**

```bash
node --check js/margen-animal.js
```

Expected: sin salida.

- [ ] **Step 4: Verificación funcional en navegador**

```js
const finca = (await window.db.getAll('fincas'))[0];
const compradorId = await window.Compradores.save({ nombre: 'COMPRADOR LECHE TEST', nif_cif: 'B76540848', tipo_comprador: 'leche' });
const contratoId = await window.Contratos.save({ compradorId, numero_contrato: 'C-TEST', fecha_inicio: '2020-01-01', tipo: 'leche', activo: true });
await window.Contratos.addPrecio(contratoId, { producto: 'Leche', precio_unitario: 0.4, unidad: 'litro' });
const rebanoId = await window.db.add('rebanos', { fincaId: finca.id, nombre: 'R-LECHE', especie: 'Bovino', creadoEn: new Date().toISOString() });
const animalId = await window.Animales.save({ rebanoId, numero_identificacion: 'MARGEN-VACA1', tipoAlta: 'Nacimiento' });
await window.Produccion.saveLeche({ vacaId: animalId, fecha: new Date().toISOString().split('T')[0], cantidad_litros: 25 }, finca.id);
const resultado = await window.MargenAnimal.calcularIngresoLeche(animalId, finca.id);
console.log(resultado); // { litros: 25, ingreso: 10, sinPrecioLeche: false }
```

Expected: `resultado.ingreso === 10` (25 litros × 0.4 €/litro).

- [ ] **Step 5: Commit**

```bash
git add js/margen-animal.js
git commit -m "feat: calcular ingreso de leche estimado por animal desde el contrato activo"
```

---

### Task 4: Módulo `MargenAnimal` — cálculo completo y agregados

**Files:**
- Modify: `js/margen-animal.js`

**Interfaces:**
- Consumes: `this.calcularCosteSanidad(animalId)` (Task 2), `this.calcularIngresoLeche(animalId, fincaId)` (Task 3), `window.Animales.get(animalId)`, `window.db.getAllFromIndex('comercializacion_carne', 'animalId', animalId)`, `window.Animales.list(rebanoId)`, `window.Rebanos.list()`.
- Produces:
  - `MargenAnimal.calcular(animalId)` → `Promise<Margen>` donde `Margen = {animalId, costeCompra, costeSanidad, costeTotal, litrosLeche, ingresoLeche, sinPrecioLeche, ingresoVenta, ingresoTotal, margenNeto}`. Consumido por Task 5 y Task 6.
  - `MargenAnimal.calcularParaRebano(rebanoId)` → `Promise<Margen[]>`.
  - `MargenAnimal.calcularParaFinca(fincaId)` → `Promise<Margen[]>`.

- [ ] **Step 1: Añadir `calcular(animalId)`**

Inserta dentro de `MargenAnimal`, después de `calcularIngresoLeche`:

```js
  /** Margen económico completo de un animal, acumulado histórico. */
  async calcular(animalId) {
    const animal = await window.Animales.get(Number(animalId));
    if (!animal) throw new Error('Animal no encontrado');

    const rebano = animal.rebanoId ? await window.db.get('rebanos', Number(animal.rebanoId)) : null;
    const fincaId = rebano ? rebano.fincaId : null;

    const costeCompra = Number(animal.precio_compra || 0);
    const costeSanidad = await this.calcularCosteSanidad(animalId);
    const costeTotal = Number((costeCompra + costeSanidad).toFixed(2));

    const { litros: litrosLeche, ingreso: ingresoLeche, sinPrecioLeche } = fincaId
      ? await this.calcularIngresoLeche(animalId, fincaId)
      : { litros: 0, ingreso: 0, sinPrecioLeche: true };

    const ventas = await window.db.getAllFromIndex('comercializacion_carne', 'animalId', Number(animalId)).catch(() => []);
    const ingresoVenta = Number(ventas.reduce((sum, v) => sum + (Number(v.precio_total) || 0), 0).toFixed(2));

    const ingresoTotal = Number((ingresoLeche + ingresoVenta).toFixed(2));
    const margenNeto = Number((ingresoTotal - costeTotal).toFixed(2));

    return {
      animalId: Number(animalId),
      costeCompra, costeSanidad, costeTotal,
      litrosLeche, ingresoLeche, sinPrecioLeche,
      ingresoVenta, ingresoTotal, margenNeto,
    };
  },
```

- [ ] **Step 2: Añadir `calcularParaRebano` y `calcularParaFinca`**

Inserta justo después:

```js
  /** Margen de todos los animales de un rebaño. */
  async calcularParaRebano(rebanoId) {
    const animales = await window.Animales.list(Number(rebanoId));
    const resultados = [];
    for (const a of animales) {
      resultados.push(await this.calcular(a.id));
    }
    return resultados;
  },

  /** Margen de todos los animales de todos los rebaños de una finca. */
  async calcularParaFinca(fincaId) {
    const rebanos = await window.db.getAllFromIndex('rebanos', 'fincaId', Number(fincaId)).catch(() => []);
    let resultados = [];
    for (const r of rebanos) {
      resultados = resultados.concat(await this.calcularParaRebano(r.id));
    }
    return resultados;
  },
```

- [ ] **Step 3: Verificar sintaxis**

```bash
node --check js/margen-animal.js
```

Expected: sin salida.

- [ ] **Step 4: Verificación funcional en navegador (reusa el animal creado en Task 3, Step 4)**

```js
const margen = await window.MargenAnimal.calcular(animalId); // animalId de Task 3
console.log(margen);
// costeCompra: 0, costeSanidad: 0, costeTotal: 0,
// litrosLeche: 25, ingresoLeche: 10, sinPrecioLeche: false,
// ingresoVenta: 0, ingresoTotal: 10, margenNeto: 10
```

Expected: `margen.margenNeto === 10`.

- [ ] **Step 5: Commit**

```bash
git add js/margen-animal.js
git commit -m "feat: agregar cálculo de margen económico completo por animal, rebaño y finca"
```

---

### Task 5: QA suite de verificación

**Files:**
- Create: `js/qa-margen-animal.js`
- Modify: `index.html` (script tag, sección de QA suites bajo demanda)

**Interfaces:**
- Consumes: `window.MargenAnimal.calcular`, `window.MargenAnimal.calcularCosteSanidad`, `window.MargenAnimal.calcularIngresoLeche`, `window.Botiquin.consumir` (todos de Tasks 1-4), más helpers de datos: `window.db.add`, `window.Animales.save`, `window.Sanitarios.save`, `window.Vacunaciones.save`, `window.Compradores.save`, `window.Contratos.save/addPrecio`, `window.Produccion.saveLeche`.
- Produces: `window.MargenAnimalQA.runAll()` — no consumido por otro código, es la suite de verificación manual del usuario/agente.

Sigue el patrón exacto de `js/qa-especie-crotal.js` (helpers `_log`, `_assert`, método `runAll` que llama a cada test y resume PASS/FAIL). Cada test crea sus propios datos aislados (finca/rebaño/animal de test) para no depender de datos preexistentes en la BD del usuario.

- [ ] **Step 1: Crear el archivo con la estructura base (helpers + esqueleto de runAll)**

```js
/**
 * Livestock Manager - MargenAnimal QA Test Suite v1.0.0
 *
 * Pruebas del cálculo de margen económico por animal (coste de sanidad
 * prorrateado, ingreso de leche estimado, margen neto). Ver
 * docs/superpowers/specs/2026-07-23-margen-economico-animal-design.md.
 *
 * EJECUCIÓN: Pegar en la consola del navegador (DevTools) con la app abierta.
 * Uso: await MargenAnimalQA.runAll();
 */
const MargenAnimalQA = {
  _results: [],

  _ts: () => new Date().toISOString().split('T')[1].split('.')[0],

  _log(status, module, detail) {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
    console.log(`[${this._ts()}] ${icon} [${module}] ${detail}`);
    this._results.push({ status, module, detail });
  },

  _assert(cond, module, detail) {
    this._log(cond ? 'PASS' : 'FAIL', module, detail);
    return !!cond;
  },

  async _crearFincaRebano() {
    const fincaId = await window.db.add('fincas', { nombre: 'QA-MARGEN-FINCA', creadoEn: new Date().toISOString() });
    const rebanoId = await window.db.add('rebanos', { fincaId, nombre: 'QA-MARGEN-REBANO', especie: 'Bovino', creadoEn: new Date().toISOString() });
    return { fincaId, rebanoId };
  },

  async runAll() {
    this._results = [];
    console.log('=== MargenAnimal QA Suite ===');
    await this.testCosteSanidadIndividual();
    await this.testCosteSanidadMasivoProrrateado();
    await this.testIngresoLeche();
    await this.testMargenCompleto();
    const fails = this._results.filter((r) => r.status === 'FAIL').length;
    console.log(`=== ${this._results.length - fails}/${this._results.length} PASS ===`);
    return this._results;
  },
};

window.MargenAnimalQA = MargenAnimalQA;
```

- [ ] **Step 2: Añadir `testCosteSanidadIndividual`**

```js
  async testCosteSanidadIndividual() {
    const M = 'COSTE SANIDAD INDIVIDUAL';
    const { fincaId, rebanoId } = await this._crearFincaRebano();
    const animalId = await window.Animales.save({ rebanoId, numero_identificacion: 'QA-IND-' + Date.now(), tipoAlta: 'Nacimiento' });
    const productoId = await window.db.add('config_botiquin', { fincaId, nombre: 'QA-PRODUCTO', unidad: 'ml', cantidadActual: 0, anulado: false, creadoEn: new Date().toISOString() });
    await window.db.add('botiquin_lotes', { productoId, lote: 'QA-L1', cantidad: 100, precioUnitario: 3, creadoEn: new Date().toISOString() });
    await window.db.put('config_botiquin', { ...(await window.db.get('config_botiquin', productoId)), cantidadActual: 100 });
    const tratamientoId = await window.Sanitarios.save({ rebanoId, animalId, tipo_tratamiento: 'Antibiótico', fecha: new Date().toISOString().split('T')[0] });
    await window.Botiquin.consumir(productoId, 10, { origenTipo: 'tratamiento', origenId: tratamientoId });

    const coste = await window.MargenAnimal.calcularCosteSanidad(animalId);
    this._assert(coste === 30, M, `coste individual = 30€ (10 unidades × 3€) — obtenido: ${coste}`);
  },
```

- [ ] **Step 3: Añadir `testCosteSanidadMasivoProrrateado`**

```js
  async testCosteSanidadMasivoProrrateado() {
    const M = 'COSTE SANIDAD MASIVO PRORRATEADO';
    const { fincaId, rebanoId } = await this._crearFincaRebano();
    const a1 = await window.Animales.save({ rebanoId, numero_identificacion: 'QA-MAS1-' + Date.now(), tipoAlta: 'Nacimiento' });
    const a2 = await window.Animales.save({ rebanoId, numero_identificacion: 'QA-MAS2-' + Date.now(), tipoAlta: 'Nacimiento' });
    const productoId = await window.db.add('config_botiquin', { fincaId, nombre: 'QA-PRODUCTO-MASIVO', unidad: 'ml', cantidadActual: 0, anulado: false, creadoEn: new Date().toISOString() });
    await window.db.add('botiquin_lotes', { productoId, lote: 'QA-L2', cantidad: 100, precioUnitario: 2, creadoEn: new Date().toISOString() });
    await window.db.put('config_botiquin', { ...(await window.db.get('config_botiquin', productoId)), cantidadActual: 100 });
    const tratamientoId = await window.Sanitarios.save({ rebanoId, tipo_tratamiento: 'Desparasitación', fecha: new Date().toISOString().split('T')[0] });
    await window.Botiquin.consumir(productoId, 20, { origenTipo: 'tratamiento', origenId: tratamientoId });

    const coste1 = await window.MargenAnimal.calcularCosteSanidad(a1);
    const coste2 = await window.MargenAnimal.calcularCosteSanidad(a2);
    this._assert(coste1 === 20, M, `coste prorrateado animal 1 = 20€ (40€/2 animales) — obtenido: ${coste1}`);
    this._assert(coste2 === 20, M, `coste prorrateado animal 2 = 20€ (40€/2 animales) — obtenido: ${coste2}`);
  },
```

- [ ] **Step 4: Añadir `testIngresoLeche`**

```js
  async testIngresoLeche() {
    const M = 'INGRESO LECHE';
    const { fincaId, rebanoId } = await this._crearFincaRebano();
    const animalId = await window.Animales.save({ rebanoId, numero_identificacion: 'QA-LECHE-' + Date.now(), tipoAlta: 'Nacimiento' });
    const compradorId = await window.Compradores.save({ nombre: 'QA-COMPRADOR-LECHE', nif_cif: 'B76540848', tipo_comprador: 'leche' });
    const contratoId = await window.Contratos.save({ compradorId, numero_contrato: 'QA-C-' + Date.now(), fecha_inicio: '2020-01-01', tipo: 'leche', activo: true });
    await window.Contratos.addPrecio(contratoId, { producto: 'Leche', precio_unitario: 0.5, unidad: 'litro' });
    await window.Produccion.saveLeche({ vacaId: animalId, fecha: new Date().toISOString().split('T')[0], cantidad_litros: 40 }, fincaId);

    const { litros, ingreso, sinPrecioLeche } = await window.MargenAnimal.calcularIngresoLeche(animalId, fincaId);
    this._assert(litros === 40, M, `litros = 40 — obtenido: ${litros}`);
    this._assert(ingreso === 20, M, `ingreso = 20€ (40L × 0.5€/L) — obtenido: ${ingreso}`);
    this._assert(sinPrecioLeche === false, M, `sinPrecioLeche = false — obtenido: ${sinPrecioLeche}`);
  },
```

- [ ] **Step 5: Añadir `testMargenCompleto`**

```js
  async testMargenCompleto() {
    const M = 'MARGEN COMPLETO';
    const { fincaId, rebanoId } = await this._crearFincaRebano();
    const animalId = await window.Animales.save({ rebanoId, numero_identificacion: 'QA-COMPLETO-' + Date.now(), tipoAlta: 'Compra', precio_compra: 200, proveedor_id: null, factura_compra: 'QA-FAC' });
    const compradorId = await window.Compradores.save({ nombre: 'QA-COMPRADOR-COMPLETO', nif_cif: 'A58818501', tipo_comprador: 'leche' });
    const contratoId = await window.Contratos.save({ compradorId, numero_contrato: 'QA-C2-' + Date.now(), fecha_inicio: '2020-01-01', tipo: 'leche', activo: true });
    await window.Contratos.addPrecio(contratoId, { producto: 'Leche', precio_unitario: 0.3, unidad: 'litro' });
    await window.Produccion.saveLeche({ vacaId: animalId, fecha: new Date().toISOString().split('T')[0], cantidad_litros: 100 }, fincaId);

    const margen = await window.MargenAnimal.calcular(animalId);
    this._assert(margen.costeCompra === 200, M, `costeCompra = 200 — obtenido: ${margen.costeCompra}`);
    this._assert(margen.ingresoLeche === 30, M, `ingresoLeche = 30 (100L × 0.3€) — obtenido: ${margen.ingresoLeche}`);
    this._assert(margen.margenNeto === -170, M, `margenNeto = -170 (30 ingreso - 200 coste) — obtenido: ${margen.margenNeto}`);
  },
```

- [ ] **Step 6: Verificar sintaxis**

```bash
node --check js/qa-margen-animal.js
```

Expected: sin salida.

- [ ] **Step 7: Registrar el script en `index.html`**

Localiza la línea de carga de QA suites bajo demanda (busca `qa-especie-crotal.js` — está en un array cargado dinámicamente cerca del final de `index.html`, no en la carga inicial). Añade `'js/qa-margen-animal.js?v=1.0'` a ese mismo array, junto a los demás `qa-*.js`.

- [ ] **Step 8: Ejecutar la suite completa en el navegador**

Con el servidor de preview corriendo y la app cargada:

```js
await window.MargenAnimalQA.runAll();
```

Expected: todos los tests reportan `✅ PASS`, resumen final `4/4 PASS` (o el número total de aserciones, revisa el conteo exacto en consola).

- [ ] **Step 9: Commit**

```bash
git add js/qa-margen-animal.js index.html
git commit -m "test: añadir QA suite de margen económico por animal"
```

---

### Task 6: Sección "MARGEN ECONÓMICO" en la ficha del animal

**Files:**
- Modify: `js/views/animales-view.js` (dentro de `renderDetalle()`)

**Interfaces:**
- Consumes: `window.MargenAnimal.calcular(animalId)` (Task 4) → `{costeCompra, costeSanidad, costeTotal, litrosLeche, ingresoLeche, sinPrecioLeche, ingresoVenta, ingresoTotal, margenNeto}`.
- Produces: HTML renderizado, no expone función nueva a otros módulos.

**Contexto:** sigue el patrón visual exacto de la sección "DATOS DE COMPRA" ya existente en `renderDetalle()` (`js/views/animales-view.js:407-429`, card con `section-header-theme`, grid de 2 columnas). A diferencia de esa sección, esta se muestra siempre (no solo si `tipoAlta === "Compra"`), porque cualquier animal puede tener coste de sanidad o producción de leche.

- [ ] **Step 1: Localizar el punto de inserción**

```bash
grep -n "IDENTIFICACIÓN TÉCNICA" js/views/animales-view.js
```

La nueva sección se inserta justo antes de esa línea (después del cierre del bloque condicional `${a.tipoAlta === "Compra" ? ... : ''}` de "DATOS DE COMPRA").

- [ ] **Step 2: Calcular el margen antes del `document.getElementById("app-content").innerHTML = ...`**

Busca en `renderDetalle()` dónde se obtienen los datos del animal (`const a = await window.Animales.get(...)` o similar, antes del template string principal). Justo después de esa línea, añade:

```js
    const margen = window.MargenAnimal ? await window.MargenAnimal.calcular(a.id).catch(() => null) : null;
```

- [ ] **Step 3: Insertar el bloque HTML de la nueva sección**

Justo antes de la línea con `IDENTIFICACIÓN TÉCNICA`, añade:

```js
          ${margen ? `
          <div class="card p-16 mb-20" style="border: 1px solid ${margen.margenNeto >= 0 ? 'var(--c-success)' : 'var(--c-danger)'}; background: rgba(255,255,255,0.02);">
            <div class="section-header-theme mb-12" style="--theme-color: ${margen.margenNeto >= 0 ? 'var(--c-success)' : 'var(--c-danger)'}; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;"><span style="color: ${margen.margenNeto >= 0 ? 'var(--c-success)' : 'var(--c-danger)'}; margin-right: 4px;">|</span> ${Icons.dinero ? Icons.dinero() : Icons.documento()} MARGEN ECONÓMICO</div>
            <div class="grid grid-cols-2 gap-12 mb-12">
              <div><span class="text-xs text-gray uppercase font-extrabold tracking-wider">COSTE TOTAL</span><br><span class="text-white font-950 text-lg">${margen.costeTotal.toFixed(2)} €</span></div>
              <div><span class="text-xs text-gray uppercase font-extrabold tracking-wider">INGRESO TOTAL</span><br><span class="text-white font-950 text-lg">${margen.ingresoTotal.toFixed(2)} €</span></div>
            </div>
            <div class="mb-12"><span class="text-xs text-gray uppercase font-extrabold tracking-wider">MARGEN NETO</span><br><span class="font-950 text-xl" style="color: ${margen.margenNeto >= 0 ? 'var(--c-success)' : 'var(--c-danger)'};">${margen.margenNeto.toFixed(2)} €</span></div>
            <div class="grid grid-cols-2 gap-8 text-xs">
              <div>Compra: ${margen.costeCompra.toFixed(2)} €</div>
              <div>Sanidad: ${margen.costeSanidad.toFixed(2)} €</div>
              <div>Leche: ${margen.litrosLeche.toFixed(1)} L · ${margen.ingresoLeche.toFixed(2)} €</div>
              <div>Venta: ${margen.ingresoVenta.toFixed(2)} €</div>
            </div>
            ${margen.sinPrecioLeche ? `<div class="text-xs mt-8" style="color: var(--c-warning);">${Icons.alerta ? Icons.alerta() : ''} Sin contrato de leche activo con precio vigente — ingreso de leche estimado en 0 €.</div>` : ''}
          </div>
          ` : ''}

          <div class="card p-16 mb-20" style="border: 1px solid #4FADF5; background: rgba(255,255,255,0.02);">
            <div class="section-header-theme mb-12" style="--theme-color: var(--c-info); font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;"><span style="color: #4FADF5; margin-right: 4px;">|</span> ${Icons.documento()} IDENTIFICACIÓN TÉCNICA</div>
```

(La última línea del bloque de arriba, `<div class="card p-16 mb-20" ...IDENTIFICACIÓN TÉCNICA...`, ya existe en el archivo — no la dupliques, solo inserta todo lo anterior justo antes de ella.)

- [ ] **Step 4: Verificar sintaxis**

```bash
node --check js/views/animales-view.js
```

Expected: sin salida.

- [ ] **Step 5: Verificación visual en navegador**

Navega a la ficha de un animal con margen calculable (usa el `animalId` creado en la verificación de Task 4, o el generado por la QA suite). Confirma con `get_page_text` o `read_page` que aparece la sección "MARGEN ECONÓMICO" con los valores esperados, y que el color del borde/texto es verde si `margenNeto >= 0`, rojo si es negativo.

- [ ] **Step 6: Commit**

```bash
git add js/views/animales-view.js
git commit -m "feat(animales): mostrar margen económico en la ficha de detalle del animal"
```

---

### Task 7: Vista de ranking `/margen-animal`

**Files:**
- Create: `js/views/margen-animal-view.js`
- Modify: `js/app.js` (rutas, `_viewGroups.gegan`, `_routeGroups`, menú)

**Interfaces:**
- Consumes: `window.MargenAnimal.calcularParaFinca(fincaId)` (Task 4), `window.Fincas.getActive()`, `window.Rebanos.list()`, `window.Animales.get(id)` (para mostrar `numero_identificacion` de cada fila).
- Produces: ruta `/margen-animal`, sin interfaz consumida por otros módulos.

- [ ] **Step 1: Crear `js/views/margen-animal-view.js`**

```js
/**
 * Livestock Manager - MargenAnimalView v1.0.0
 * Listado/ranking de margen económico por animal (js/margen-animal.js),
 * ordenable por margen neto para detectar animales poco rentables.
 */
const MargenAnimalView = {
  _cache: [],
  _orden: 'asc',

  async render() {
    if (window.App) App.updateHeaderColor('margen-animal');
    const main = document.getElementById("app-content");
    const finca = await Fincas.getActive();
    if (!finca) {
      main.innerHTML = `<div class="empty-state"><p class="empty-state-text">Selecciona una finca activa primero.</p></div>`;
      return;
    }

    const margenes = await window.MargenAnimal.calcularParaFinca(finca.id);
    const animales = await Promise.all(margenes.map((m) => window.Animales.get(m.animalId)));
    this._cache = margenes.map((m, i) => ({ ...m, animal: animales[i] })).filter((r) => r.animal);

    this._render();
  },

  _render() {
    const main = document.getElementById("app-content");
    const filas = [...this._cache].sort((a, b) =>
      this._orden === 'asc' ? a.margenNeto - b.margenNeto : b.margenNeto - a.margenNeto
    );

    let html = `<div class="mb-20"><h2 class="mt-10 font-900 uppercase tracking-wider"><span style="color: var(--neon);">|</span> ${Icons.documento()} MARGEN ECONÓMICO POR ANIMAL</h2></div>`;

    if (filas.length === 0) {
      html += `<div class="empty-state"><p class="empty-state-text">Sin animales con datos suficientes para calcular margen.</p></div>`;
    } else {
      html += `<div class="mb-15"><button class="btn btn-secondary" onclick="MargenAnimalView._toggleOrden()">Ordenar: ${this._orden === 'asc' ? 'Peor primero' : 'Mejor primero'}</button></div>`;
      html += `<div class="flex flex-col gap-8">`;
      filas.forEach((f) => {
        const color = f.margenNeto >= 0 ? 'var(--c-success)' : 'var(--c-danger)';
        html += `
          <div class="card-registro" style="--registro-color: ${color};" onclick="location.hash='/animal?id=${f.animalId}'">
            <div class="flex justify-between items-center">
              <div>
                <div class="font-900 uppercase">${(f.animal.numero_identificacion || ('#' + f.animalId))}</div>
                <div class="text-xs text-gray">Coste: ${f.costeTotal.toFixed(2)} € · Ingreso: ${f.ingresoTotal.toFixed(2)} €</div>
              </div>
              <div class="font-950 text-lg" style="color: ${color};">${f.margenNeto.toFixed(2)} €</div>
            </div>
          </div>`;
      });
      html += `</div>`;
    }

    main.innerHTML = html;
  },

  _toggleOrden() {
    this._orden = this._orden === 'asc' ? 'desc' : 'asc';
    this._render();
  },
};

window.MargenAnimalView = MargenAnimalView;
```

- [ ] **Step 2: Verificar sintaxis**

```bash
node --check js/views/margen-animal-view.js
```

Expected: sin salida.

- [ ] **Step 3: Registrar la ruta en `js/app.js`**

Busca en `js/app.js` el bloque de rutas de `_viewGroups.gegan` (contiene `'js/views/botiquin-view.js'`). Añade `'js/views/margen-animal-view.js'` a ese mismo array.

Busca el objeto de rutas principal (contiene `'/botiquin': 'renderBotiquin'` o similar patrón `ruta: 'nombreMetodo'`). Añade:
```js
'/margen-animal': 'renderMargenAnimal',
```

Busca el método correspondiente a otras vistas simples (patrón `async renderBotiquin() { ... MargenAnimalView... }` — revisa cómo `renderBotiquin` delega a `BotiquinView.render()`) y añade un método análogo:
```js
async renderMargenAnimal() {
  if (window.MargenAnimalView) await MargenAnimalView.render();
},
```

Busca `_routeGroups` (mapea ruta → grupo lazy) y añade:
```js
'/margen-animal': 'gegan',
```

- [ ] **Step 4: Añadir entrada de menú**

Busca en `js/app.js` dónde se define el menú "Más" (contiene entradas como `{ path: '/botiquin', label: 'Botiquín', icon: ... }`). Añade una entrada análoga:
```js
{ path: '/margen-animal', label: 'Margen Animal', icon: Icons.documento() },
```

- [ ] **Step 5: Verificar sintaxis**

```bash
node --check js/app.js
```

Expected: sin salida.

- [ ] **Step 6: Verificación funcional en navegador**

Navega a `#/margen-animal` con al menos un animal con margen calculado (reusa datos de verificaciones anteriores). Confirma que la tabla/lista aparece ordenada correctamente y que el botón de ordenar invierte el orden al hacer clic.

- [ ] **Step 7: Commit**

```bash
git add js/views/margen-animal-view.js js/app.js
git commit -m "feat: añadir vista de ranking de margen económico por animal (/margen-animal)"
```

---

## Post-implementación

- [ ] Revisar que `js/qa-margen-animal.js` se pueda ejecutar limpio dos veces seguidas sin fallos por datos duplicados (usa `Date.now()` en identificadores de test para evitar colisiones — ya incorporado en el plan).
- [ ] Actualizar `docs/AUDITAR/AUDITORIA-BASEDEDATOS-LEGACY.md` o memoria del proyecto si aplica, indicando que "productividad por animal" quedó cerrada.
