# Diseño: Margen económico por animal

**Fecha**: 2026-07-23
**Estado**: Aprobado, pendiente de implementación

## Contexto

Livestock Manager ya rastrea, por separado: coste de compra del animal (`precio_compra` en `js/animales.js`), consumo de botiquín vinculado opcionalmente a un tratamiento/vacunación (`js/botiquin.js`, `origen_tipo`/`origen_id` en `registro_eventos`), producción de leche por vaca (`produccion_leche`, campo `vacaId`), y venta de animales (`comercializacion_carne`, `precio_total`). Ninguno de estos flujos se cruza hoy: no existe forma de saber cuánto "rinde" económicamente un animal concreto.

El usuario quiere poder ver, por animal, el balance entre lo que le cuesta (sanidad + compra) y lo que genera (leche + venta), para identificar animales poco rentables.

## Objetivo

Calcular y mostrar un margen económico acumulado histórico (desde el alta del animal hasta hoy, o hasta su baja/venta) por animal individual, con desglose de coste e ingreso, disponible tanto en la ficha del animal como en un listado/ranking por rebaño o finca.

## Fuera de alcance (explícitamente descartado en esta iteración)

- Selector de periodo (últimos 12 meses, rango libre) — se usa siempre el acumulado histórico completo.
- Coste exacto facturado de la leche (grasa/proteína/bonificaciones del albarán real) — se usa una estimación por precio base de contrato.
- Reparto de coste masivo por peso/consumo real del animal — se prorratea a partes iguales entre los animales del rebaño en el momento del tratamiento/vacunación.
- Gastos generales de explotación (piensos, mano de obra, silos) — el margen solo cubre sanidad (tratamientos/vacunaciones/botiquín) y compra/venta del animal, más ingreso de leche.

## Diseño

### 1. Gap a cerrar primero: coste no se registra en el consumo de botiquín

`Botiquin.consumir()` (`js/botiquin.js`) hoy descuenta stock de lotes en orden FEFO pero **no guarda cuánto costó ese consumo** — el evento en `registro_eventos` solo tiene `valor_neto` (cantidad física), no euros. Como el consumo puede repartirse entre varios lotes con `precioUnitario` distintos, hay que calcular el coste en el momento del consumo, sumando `cantidad_descontada_de_cada_lote × lote.precioUnitario` (lotes sin precio cuentan como coste 0 para esa porción). Se añade `costeTotal` al evento de `registro_eventos` que ya crea `consumir()`.

Esto es un cambio pequeño y aislado en un único punto (`js/botiquin.js`), no afecta a la UI existente del botiquín.

### 2. Nuevo módulo `js/margen-animal.js`

Módulo de solo cálculo (sin UI propia), con esta interfaz:

```js
MargenAnimal.calcular(animalId) → {
  animalId,
  costeCompra,        // animal.precio_compra
  costeSanidad,        // suma de costes de tratamientos + vacunaciones de este animal
  costeTotal,           // costeCompra + costeSanidad
  litrosLeche,          // suma de cantidad_litros en produccion_leche para este vacaId
  ingresoLeche,          // litrosLeche × precio_unitario de leche del contrato activo
  ingresoVenta,           // precio_total si el animal está en comercializacion_carne
  ingresoTotal,            // ingresoLeche + ingresoVenta
  margenNeto               // ingresoTotal - costeTotal
}

MargenAnimal.calcularParaRebano(rebanoId) → [ {...margen de cada animal...} ]
MargenAnimal.calcularParaFinca(fincaId) → [ {...margen de cada animal de todos los rebaños...} ]
```

**Cálculo del coste de sanidad por animal**:
- Tratamientos con `animalId` igual al animal: se suma su `costeTotal` (del evento de consumo de botiquín vinculado, si existe; si el tratamiento no tiene producto de botiquín vinculado, coste 0 para ese tratamiento — no hay campo de precio de medicamento fuera del botiquín).
- Tratamientos/vacunaciones sin `animalId` (masivos, todo el rebaño o una categoría): se toma el `costeTotal` del consumo de botiquín vinculado y se divide entre el número de animales activos del rebaño en la fecha del tratamiento; a este animal le corresponde una parte igual.
- Mismo criterio para vacunaciones, teniendo en cuenta que cada `tipos_vacuna[]` puede tener su propio `botiquinProductoId`/consumo — se suma el coste de cada tipo vinculado a esa vacunación, prorrateado igual que los tratamientos si `animales_vacunados` no especifica `animalId` (modo categoría/agregado).

**Cálculo del ingreso de leche**: no existe un "comprador principal" fijo por finca (se elige manualmente en cada albarán), así que se toma `Compradores.list({tipo: 'leche'})` y se recorre en orden hasta encontrar el primero que tenga `Contratos.getActivo(compradorId, 'leche')` no nulo. Dentro de `contrato.precios[]` (array de `{producto, precio_unitario, unidad, desde, hasta}`), se busca la primera fila cuyo `producto` coincida con "leche" (comparación case-insensitive) y esté vigente hoy según `desde`/`hasta` (fila válida si `desde` es null o ≤ hoy, y `hasta` es null o ≥ hoy). Se usa su `precio_unitario`. Si no hay ningún comprador de leche con contrato activo, o ninguno tiene fila de precio vigente para "leche", `ingresoLeche` queda en `0` y se marca `sinPrecioLeche: true` en el resultado para que la UI pueda avisarlo.

### 3. UI: nueva sección en la ficha del animal

En `js/views/animales-view.js`, dentro de `renderDetalle()`, se añade una sección "MARGEN ECONÓMICO" (mismo patrón visual que las secciones existentes: "DATOS DE COMPRA", "LIBRO DE REGISTRO") mostrando: coste total, ingreso total, margen neto (con color verde/rojo según signo), y el desglose (coste compra, coste sanidad, litros/ingreso leche, ingreso venta). Si `sinPrecioLeche` es `true`, se muestra un aviso de que el ingreso de leche es 0 por falta de contrato/precio de leche vigente.

### 4. UI: nueva vista de ranking

Nuevo `js/views/margen-animal-view.js`, ruta `/margen-animal`, siguiendo el patrón de vistas existentes (lazy-loaded en el grupo `gegan`). Tabla con una fila por animal (filtrable por rebaño), columnas: identificación, coste total, ingreso total, margen neto — ordenable por margen neto ascendente/descendente para detectar rápido los animales menos rentables. Reutiliza `MargenAnimal.calcularParaFinca()`.

## Testing / Verificación

- Verificar en navegador: animal con tratamiento vinculado a botiquín con precio → coste de sanidad refleja ese precio.
- Animal en un tratamiento masivo de rebaño de N animales → coste de sanidad de ese animal = coste_total_tratamiento / N.
- Animal con litros en `produccion_leche` y contrato activo con precio base → ingreso de leche calculado correctamente.
- Animal vendido (presente en `comercializacion_carne`) → ingreso de venta reflejado.
- Ranking ordena correctamente por margen neto.
