# Diseño: Reorganización del módulo Informes + Siembra demo CHAMORRO ampliada

**Fecha**: 2026-08-01
**Estado**: Aprobado por el usuario (2026-08-01)
**Enfoque elegido**: Enfoque 1 — "Primero datos, luego informes" (Fase A → Fase B)
**Estructura elegida**: 3 pilares + Libros + General (opción A)
**Alcance elegido**: Visión completa (opción C) — incluye documentar informes que requieren captura de datos nuevos

---

## 1. Contexto

En la barra de navegación, **GeGan / ExPro / CoMer** son los 3 módulos principales de la app
(`#/ganaderia`, `#/explotacion`, `#/comercializacion`; `index.html:162-184`). El módulo Informes
(`#/informes`) se organiza internamente en las categorías `gegan`, `expro`, `comer` y `libros`
(`js/views/informes-view.js:19-72`), pero su contenido no refleja fielmente los submódulos reales
de cada pilar. El commit #106 ya corrigió parte del problema (pestañas duplicadas de EXPRO,
`fitosanitario` y `proveedores` movidos a ExPro, 4 pestañas nuevas: Silos, Trámites, Contratos,
Transportistas).

Además, la base de datos demo **CHAMORRO** (`js/seed-data.js`) deja sin sembrar varios stores,
lo que provoca que informes y vistas reales salgan vacíos al cargar la demo.

## 2. Objetivos

1. **Fase A**: ampliar la siembra demo CHAMORRO para que la app muestre todos los datos posibles,
   replicando lo que escribe cada módulo/wizard real.
2. **Fase B**: reorganizar Informes en 5 categorías (GeGan, ExPro, CoMer, Libros, General) de modo
   que cada pilar refleje sus submódulos reales, corrigiendo inconsistencias de dominio y añadiendo
   informes nuevos sobre datos ya existentes.

## 3. Auditoría (estado actual verificado en código)

### 3.1. Estructura real de los pilares

| Pilar | Submódulos (vista) | Datos |
|---|---|---|
| **GeGan** (`js/views/ganaderia-view.js:22-33`) | Animales · Rebaños · Patrimonio (solo carne) · Zonas · Sanidad | `animales`, `rebanos`, bitácora/trazabilidad, `finca.zonas[]`, `finca.instalaciones[]`, `sanitarios_ganado`, `vacunaciones`, `config_botiquin`/`botiquin_lotes`, `saneamientos`, subexplotaciones |
| **ExPro** (`js/views/explotacion-view.js:228-235`) | EXPRO (control producción) · LÁCTEA (Dashboard/Tanques/Control/Balance/Gráficos) · SILOS · FITOSANITARIOS · FINANZAS · PROVEEDORES · TRÁMITES (Guías DIMOE/Censo/Crotales/Traslados/Infolac/Archivo) | `registro_eventos` (pesajes, ordeños, consumos silo), `tanques_leche`, `control_lechero`, `balance_lacteo`, `analiticas_leche`, `config_silos`, `gastos_ganaderia`, `proveedores`, `movimientos_ganado`, `pedidos_crotales` |
| **CoMer** (`js/views/comercializacion-view.js:124-134`) | Leche (flag) · Carne (flag) · Compradores · Contratos · Transportistas | `comercializacion_leche`, `comercializacion_carne`, `compradores`, `contratos_compra`, `transportistas` |

Mapa oficial de bundles por pilar: `js/app.js:1756-1781` (`_viewGroups` / `_routeGroups`).

### 3.2. Informes hoy (28 pestañas en 4 categorías)

- **GeGan (13)**: general, por-finca, alertas, carne, leche, reproductivo, sanidad, curva-prod,
  censo, coste-prod, eficiencia, rotacion, rent-esp
- **ExPro (5)**: cargas (Aforos), fitosanitario, silos, tramites, proveedores
- **CoMer (4)**: ventas, compradores, contratos-vencimiento, transportistas-resumen
- **Libros (6)**: pyg, flujo-caja, breakeven, subvenciones (PAC), exportar, rega

### 3.3. Huecos de dominio detectados

1. **Lácteo vive en GeGan-Informes pero el submódulo Lácteo es de ExPro** — misma inconsistencia
   de dominio que #106 corrigió con fitosanitario/proveedores.
2. **La pestaña principal de ExPro (control de producción: pesajes/ordeños/GMD) no tiene informe
   propio**; la "Curva" de producción vive en GeGan.
3. **GeGan no tiene informe de tandas de cebo / ICA de cierre** (modelo SIGGAN núcleo del proyecto,
   datos existentes: movimiento de entrada + pesajes + consumos de silo).
4. **ExPro no tiene informe operativo de gastos** (por categoría/proveedor/mes); el PyG de Libros es
   contable, no operativo.
5. **CoMer no tiene informe de márgenes comerciales** (margen neto carne con transporte/matanza y
   MOFA leche), aunque el cálculo ya existe en `comercializacion-view.js:40-77`.
6. **Trámites solo muestra saneamientos**; no guías DIMOE emitidas ni pedidos de crotales.
7. General, Por Finca, Alertas, Eficiencia y Rent. Especie son **transversales** y hoy están
   incrustadas en GeGan.

### 3.4. Auditoría de datos faltantes en la demo CHAMORRO

Lo que `js/seed-data.js` NO siembra hoy, qué lo alimenta en la app real y qué sale vacío:

| # | Dato faltante | Se introduce desde (módulo/wizard real) | Informe/vista afectado |
|---|---|---|---|
| 1 | `saneamientos` | GeGan > Sanidad > Saneamientos (`#/saneamientos`, SaneamientosView) | ExPro > Trámites |
| 2 | `pedidos_crotales` | ExPro > Trámites > Crotales (Wizard Crotales) | Trámites > Crotales |
| 3 | Gastos categoría `Fitosanitarios` | ExPro > Fitosanitarios (FitosanitariosView escribe en `gastos_ganaderia`) | ExPro > Fitosanitario |
| 4 | Gastos de costes fijos (electricidad, personal, seguros, alquiler, gestoría) y categoría `Amortización` **con tilde** — la semilla usa `Amortizacion` y Break-Even filtra con tilde (`js/analitica.js:589`) | ExPro > Finanzas (Wizard Gasto) | Libros > Break-Even (costes fijos = 0), PyG y Flujo empobrecidos |
| 5 | `documentos_legales` tipo `pac` | Menú Más > Documentos DIMOE (DocumentosView) | Libros > PAC |
| 6 | `config_botiquin` + `botiquin_lotes` | GeGan > Sanidad > Botiquín (`#/botiquin`, BotiquinView) | Vista Botiquín (+ futura sección en informe Sanidad) |
| 7 | `vacunaciones` | GeGan > Sanidad (Wizard Vacunación) | Sanidad / calendario vacunal |
| 8 | `finca.instalaciones[]` | GeGan > Zonas > Instalaciones (`#/instalaciones`, InstalacionesView) | Vista Instalaciones |
| 9 | Subexplotaciones | `#/subexplotaciones` (SubexplotacionesView) | Vista Subexplotaciones |
| 10 | Contrato próximo a vencer (<60 días) — el contrato demo vence 2026-12-31, fuera de ventana | CoMer > Contratos (Wizard Contrato) | CoMer > Contratos |
| 11 | `agenda_tareas` | Menú Más > Agenda (AgendaView) | Vista Agenda + widgets de agenda |

Notas:
- `compras_ganado` está huérfano intencionadamente (`js/db.js:562-568`); **no se siembra**.
- Aforos SÍ tiene datos (DEMO_FINCA incluye 4 zonas con `aforoMax`, `seed-data.js:43-48`).
- La siembra solo se ejecuta sobre BD vacía (`seed-data.js:83-91`); las demos ya cargadas deben
  regenerarse (borrar datos de la app y volver a cargar la demo).

## 4. Diseño — FASE A: Siembra demo CHAMORRO ampliada

**Ubicación**: todo dentro de `js/seed-data.js`, siguiendo el patrón existente (definiciones +
`Model.save()` o `db.add/put`, `demo: true`, try/catch por registro, `sleep()` entre escrituras,
fechas **relativas a "hoy"** cuando el informe filtra por ventana temporal).

**Sin cambios de esquema**: todos los stores ya existen; **no se toca `DB_VERSION`**.

**Bloques a sembrar** (antes de escribir cada bloque se verificarán los campos exactos contra el
wizard/vista real que los produce):

1. **Saneamientos**: 2 campañas — 2025 "indemne" cerrada; 2026 "calificada" con próxima actuación
   futura — + 1 restricción de movimiento activa. Alimenta ExPro>Trámites y el banner Guía 365.
2. **Pedidos de crotales**: 2 pedidos (1 recibido, 1 pendiente).
3. **Gastos fitosanitarios**: 3-4 gastos categoría `Fitosanitarios` con `snap_zona` y fechas
   recientes (herbicida parcela norte, tratamiento barbecho, etc.).
4. **Costes fijos**: gastos de electricidad, personal, seguros, gestoría; y corregir en las defs
   existentes `Amortizacion` → `Amortización` (con tilde) para que Break-Even los reconozca.
5. **PAC**: 1-2 documentos `documentos_legales` tipo `pac` con `importe_solicitado`, campaña y estado.
6. **Botiquín**: 3-4 productos en `config_botiquin` (vacuna, antibiótico, desparasitante) + lotes en
   `botiquin_lotes` (1 próximo a caducar, 1 con stock bajo).
7. **Vacunaciones**: 2-3 registros de rebaño con próxima dosis programada (campos según Wizard
   Vacunación).
8. **Instalaciones**: `finca.instalaciones[]` — nave de ordeño, establo de cebo, sala de tanques
   (mismo patrón `finca.zonas[]`; se persiste con `db.put('fincas', finca)`).
9. **Subexplotaciones**: `finca.subexplotaciones[]` (mismo patrón `finca.zonas[]`, persistir con
   `db.put('fincas', finca)`) — 2 registros: "Vacuno de leche" (especieId de Vacas) y "Ovino de
   carne" (especieId de Ovejas). Campos según `subexplotaciones-view.js` (`especieId`, `anulada`, …).
10. **Contrato próximo a vencer**: CT-2026-001 con `fecha_fin` = hoy+45 días.
11. **Agenda**: 3-4 tareas en `agenda_tareas` (vacunación programada, limpieza de tanque, revisión
    PAC, 1 vencida).

**Verificación Fase A**: cargar la demo en navegador y recorrer las pestañas de Informes y las
vistas afectadas comprobando que ninguna sale vacía. Mantener `runLacteoTests()` 87/87 y
`runInformesDataTests()` 18/18.

## 5. Diseño — FASE B: Reorganización de Informes (5 categorías)

Estructura final de `_categories` en `js/views/informes-view.js`. Orden en la barra:
**General · GeGan · ExPro · CoMer · Libros** — General va primera por ser la vista de entrada
más genérica (decisión UX de la revisión del spec, 2026-08-01):

### GeGan — gestión del rebaño (6)
| Pestaña | Estado |
|---|---|
| Censo | Sin cambios |
| Rotación | Sin cambios |
| Repro | Sin cambios |
| Sanidad | Ampliada: + sección stock/caducidades de Botiquín |
| Cárnico (flag carne) | Ampliada: + bloque **ICA de tandas de cebo** (entrada SIGGAN + pesajes + consumos de silo) |
| Coste/Animal | Sin cambios |

### ExPro — explotación y producción (9)
| Pestaña | Estado |
|---|---|
| Producción | **Nueva**: pesajes/GMD/ordeños desde `registro_eventos` |
| Lácteo (flag leche) | **Movida desde GeGan** (corrige inconsistencia de dominio) |
| Curva | **Movida desde GeGan** (es producción vs metas) |
| Silos | Sin cambios |
| Fitosanitario | Sin cambios |
| Aforos | Sin cambios |
| Trámites | Ampliada: + guías DIMOE emitidas con estado + pedidos de crotales |
| Proveedores | Sin cambios |
| Gastos | **Nueva**: gastos operativos por categoría/proveedor/mes |

### CoMer — comercialización (6)
| Pestaña | Estado |
|---|---|
| Ventas | Ampliada: + precios medios y evolución temporal |
| Márgenes | **Nueva**: margen neto carne (transporte/matanza) + MOFA leche (cálculo ya existente en `comercializacion-view.js:40-77`) |
| Compradores | Sin cambios |
| Contratos | Sin cambios (vencimientos <60 días) |
| Transportistas | Sin cambios |
| Albaranes | **Nueva** (simple): documentos de venta emitidos (leche/carne) |

### Libros — económico/oficial (6, sin cambios)
PyG · Flujo Caja · Break-Even · PAC · Exportar · REGA

### General — transversal (5, nueva categoría, **primera posición** en la barra)
General · Por Finca · Alertas · Eficiencia · Rent. Especie (todas **movidas desde GeGan**).
Al entrar a Informes, la pestaña por defecto pasa de `carne` (GeGan) a `general` (General):
vista de entrada transversal en lugar de una pestaña sujeta a flag.

### Backlog "visión C" (documentado, NO implementado en esta fase)
Requieren captura de datos nuevos en modelos:
- Cumplimiento de contratos en kg/L comprometidos vs entregados (el modelo `contratos_compra`
  no tiene cantidades comprometidas).
- Previsión de días de stock restante por silo (calculable a futuro con consumo medio).

## 6. Compatibilidad

- Los atajos del menú Más (`InformesView._cambiarTab('ventas'|'rega'|'exportar')`,
  `index.html:200-211`) siguen funcionando: `_cambiarTab` ya sincroniza la categoría activa
  automáticamente (`informes-view.js:198-212`).
- Se actualizan `_obtenerCategoriaDeTab`, `_obtenerIconoDeSubTab` y los colores de categoría
  (añadir color para `general`).
- Los valores por defecto `_currentTab`/`_currentCategory` pasan de `carne`/`gegan` a
  `general`/`general` (`informes-view.js:10-11`).
- Las pestañas con flag (`carne`, `leche`) mantienen `_esTabPermitida` (`informes-view.js:75-79`).

## 7. Manejo de errores y estados vacíos

- Loaders nuevos en `informes-data.js` con el patrón existente: `try/catch` + valores por defecto
  seguros (arrays vacíos / objetos a cero).
- Pestañas sin datos muestran empty-state orientativo indicando desde qué módulo se alimenta
  ("Registra tratamientos desde GeGan > Sanidad").

## 8. Testing y verificación

- Ampliar `runInformesDataTests()` con tests de los loaders nuevos.
- Mantener `runLacteoTests()` 87/87.
- Verificación en navegador con la demo cargada: recorrer todas las pestañas comprobando que la
  categoría activa queda sincronizada (patrón de verificación de #106).
- Tras cada fase: bump de `CACHE_NAME` en `sw.js` y de `?v=` en `index.html` (SW cache-first),
  `build:free` + `cap sync android`.
- Flujo git: una rama por fase → commit → PR → merge a master (rama protegida). No usar `git add .`
  (sesiones concurrentes con Android Studio).

## 9. Fuera de alcance

- Cambios de `DB_VERSION` / migraciones IndexedDB.
- Captura de datos nuevos en modelos (backlog visión C).
- Rediseño visual de cards o del sistema de pestañas.
- Sembrar `compras_ganado` (huérfano intencionado).
