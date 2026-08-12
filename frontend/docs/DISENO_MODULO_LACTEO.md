# Diseño Integral: Módulo de Explotación Láctea
## Livestock Manager — Solución Completa

**Fecha:** 24 de Julio de 2026
**Estado:** Borrador de diseño — pendiente de aprobación antes de implementación
**Versión BD actual:** 23 → **Versión propuesta:** 25

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Modelo de Datos](#2-modelo-de-datos)
3. [Flujos de Negocio](#3-flujos-de-negocio)
4. [Lógica de Negocio y Validaciones](#4-lógica-de-negocio-y-validaciones)
5. [Diseño UI/UX](#5-diseño-uiux)
6. [Roadmap de Implementación](#6-roadmap-de-implementación)
7. [Anexos](#7-anexos)

---

## 1. Resumen Ejecutivo

### 1.1. Problemas Críticos Identificados

| # | Problema | Impacto | Fuente |
|---|----------|---------|--------|
| P1 | **"INFOLAC" es ficticio** — el sistema oficial es **Letra Q** (MAPA) | Falsa sensación de cumplimiento normativo | Auditoría sector lácteo |
| P2 | **Sin tanque de frío como stock intermedio** | Imposible hacer balance lácteo ni validar litros vendidos vs producidos | Auditoría producción |
| P3 | **Sin Aflatoxina M1** | Obligatorio en Andalucía desde 2013 (Plan PIVCA) | Manual sector lácteo Andalucía p.57,77-81 |
| P4 | **Umbrales calidad no diferenciados por especie** | Vacuno: 100K UFC/mL vs Ovino: 1.5M UFC/mL — error de 15x | RD 1728/2007, Reg. CE 853/2004 |
| P5 | **Somáticas/gérmenes no bloquean guardado** | Infracción grave comercializar con restricciones | Ley 17/2011 art.51.2 |
| P6 | **Sin registro Letra Q del tanque** | Exigencia legal de inscripción de contenedores | Manual p.76,89 |
| P7 | **Sin control proveedores piensos (SILUM)** | Riesgo aflatoxina B1 en materia prima | Manual p.78-79 |

### 1.2. Principios de Diseño

1. **Trazabilidad real**: Reemplazar modelo "INFOLAC" por Letra Q oficial
2. **Inventario lácteo**: Producción → Tanque → Comercialización con balance en tiempo real
3. **Diferenciación por especie**: Umbrales legales específicos para vacuno, ovino y caprino
4. **Bloqueos normativos**: Impedir guardado cuando se incumplen límites legales
5. **Bienestar animal**: Registro de capacidad de instalaciones y alertas de hacinamiento
6. **Prevención PIVCA**: Control de aflatoxina M1 y proveedores SILUM

---

## 2. Modelo de Datos

### 2.1. Nuevos ObjectStores (v24)

#### `tanques_leche` — Tanques de frío en explotación

```javascript
{
  id: Number,                          // autoIncrement
  fincaId: Number,                     // FK → fincas
  codigo_letra_q: String,              // Código oficial Letra Q del contenedor
  nombre: String,                      // "Tanque Principal", "Tanque Auxiliar"
  capacidad_litros: Number,            // Capacidad máxima
  temperatura_objetivo: Number,        // °C (default: 4)
  temperatura_actual: Number,          // Última lectura °C
  tipo: String,                        // 'tanque_frio' | 'cantara' | 'cisterna'
  estado: String,                      // 'activo' | 'mantenimiento' | 'baja'
  ultima_limpieza: String,             // ISO date
  proxima_limpieza: String,            // ISO date (cada 6 meses pezoneras/filtros)
  observaciones: String,
  creadoEn: String,                    // ISO timestamp
  actualizadoEn: String
}
// Índices: fincaId, codigo_letra_q (unique)
```

#### `balance_lacteo` — Registro de movimientos de tanque

```javascript
{
  id: Number,                          // autoIncrement
  fincaId: Number,                     // FK → fincas
  tanqueId: Number,                    // FK → tanques_leche
  tipo_movimiento: String,             // 'entrada' | 'salida' | 'merma' | 'ajuste'
  fecha: String,                       // ISO datetime
  cantidad_litros: Number,             // + entrada, - salida
  referencia_tipo: String,             // 'produccion_leche' | 'comercializacion_leche' | 'manual'
  referencia_id: Number,               // FK al registro origen
  litros_acumulados: Number,           // Stock resultante en el tanque
  temperatura: Number,                 // °C en el momento del movimiento
  turno: String,                       // 'AM' | 'PM' | null (para entradas)
  observaciones: String,
  creadoEn: String
}
// Índices: fincaId, tanqueId, fecha, referencia_tipo+referencia_id
```

#### `analiticas_leche` — Historial de análisis (separado de comercialización)

```javascript
{
  id: Number,                          // autoIncrement
  fincaId: Number,                     // FK → fincas
  comercializacionId: Number,          // FK → comercializacion_leche (nullable)
  tanqueId: Number,                    // FK → tanques_leche
  fecha_muestreo: String,              // ISO date
  tipo_muestreo: String,               // 'autocontrol' | 'oficial' | 'contradictorio'
  laboratorio_nombre: String,          // 'CICAP', 'LILC', 'LILCAM', 'LILCYL'
  laboratorio_codigo: String,          // Código oficial laboratorio
  nro_boletin: String,
  
  // Parámetros físicos
  grasa: Number,                       // %
  proteina: Number,                    // %
  extracto_seco: Number,               // % (grasa + proteína)
  temperatura: Number,                 // °C
  
  // Parámetros higiénico-sanitarios
  germenes_30C: Number,                // UFC/mL
  celulas_somaticas: Number,           // cél/mL
  recuento_bacterias: Number,          // UFC/mL (alternativa)
  
  // Inhibidores/antibióticos
  inhibidores: Boolean,                // Ausencia certificada
  antibioticos_detectados: Boolean,
  
  // Aflatoxina M1 (Plan PIVCA Andalucía)
  aflatoxina_m1: Number,              // ng/kg (límite UE: 50 ng/kg)
  aflatoxina_m1_metodo: String,       // 'kit_rapido' | 'ELISA' | 'HPLC'
  aflatoxina_m1_resultado: String,    // 'negativo' | 'positivo' | 'pendiente'
  
  // Letra Q
  numero_muestra_letra_q: String,      // Código oficial de la muestra
  resultado_letra_q: String,           // 'cumple' | 'incumple' | 'pendiente'
  
  // Estado
  estado: String,                      // 'pendiente' | 'validado' | 'alerta' | 'rechazado'
  observaciones: String,
  creadoEn: String
}
// Índices: fincaId, comercializacionId, fecha_muestreo, estado
```

#### `control_lechero` — Registros de control lechero oficial (DHI)

```javascript
{
  id: Number,                          // autoIncrement
  fincaId: Number,                     // FK → fincas
  rebanoId: Number,                    // FK → rebaños
  fecha_control: String,               // ISO date
  organismo_control: String,           // 'ACRIFLOR' | 'CONAFE' | otro
  tecnico_responsable: String,
  
  // Datos por animal (array embebido)
  registros: [{
    animalId: Number,                  // FK → animales
    crotal: String,
    lactacion_numero: Number,          // 1, 2, 3...
    dias_en_leche: Number,             // DEL
    turno: String,                     // 'AM' | 'PM'
    produccion_leche: Number,          // L/día
    grasa: Number,                     // %
    proteina: Number,                  // %
    celulas_somaticas: Number,         // cél/mL
    peso_estimado: Number,             // kg (opcional)
  }],
  
  // Resumen del control
  media_rebano_litros: Number,
  media_rebano_grasa: Number,
  media_rebano_proteina: Number,
  media_rebano_somaticas: Number,
  observaciones: String,
  creadoEn: String
}
// Índices: fincaId, rebanoId, fecha_control
```

### 2.2. Modificaciones a Stores Existentes (v24-v25)

#### `fincas` — Nuevos campos

```javascript
// Campos adicionales para explotación láctea
{
  // ... campos existentes ...
  
  // Letra Q
  codigo_letra_q: String,              // Código oficial del titular en Letra Q
  clasificacion_zootecnica_leche: String, // 'produccion_leche' | 'mixta' | 'pastos_comun' | 'pastos_temporales'
  
  // Instalaciones lácteas
  plazas_vacuno_leche: Number,         // Plazas autorizadas en sala de ordeño
  superficie_descanso_m2: Number,      // m² de zona de descanso
  metros_lineales_comedero: Number,    // cm lineales de comedero
  num_cubiculos: Number,               // Número de cubículos
  
  // Medio ambiente
  capacidad_balsa_purines_m3: Number,  // Capacidad balsa
  tiene_evaluacion_ambiental: Boolean, // Requerida si >300 plazas
  
  // Tanque activo (referencia rápida)
  tanque_principal_id: Number          // FK → tanques_leche
}
```

#### `comercializacion_leche` — Campos modificados/añadidos

```javascript
{
  // ... campos existentes (fechaRecogida, cantidad, compradorId, etc.) ...
  
  // ELIMINAR (migrar a analiticas_leche):
  // - laboratorio.* (mover a analiticas_leche)
  // - estadoAnalitica (calcular desde analiticas_leche)
  
  // NUEVOS:
  tanqueId: Number,                    // FK → tanques_leche (tanque de origen)
  analiticaId: Number,                 // FK → analiticas_leche
  codigo_letra_q_tanque: String,       // Código Letra Q del tanque (snapshot)
  codigo_letra_q_cisterna: String,     // Código Letra Q de la cisterna
  
  // Especie (para umbrales diferenciados)
  especie_leche: String,               // 'vacuno' | 'ovino' | 'caprino'
  
  // Recibo Letra Q (6 campos mínimos oficiales)
  recibo_letra_q: {
    identificacion_productor: String,  // Nombre del titular
    codigo_explotacion: String,        // REGA
    fecha_hora_recogida: String,       // ISO datetime
    cantidad_litros: Number,
    operador_cisterna: String,         // Nombre operador + matrícula
    muestra_tomada: Boolean            // Si se tomó muestra oficial
  },
  
  // Estado del registro en Letra Q (informativo, no trámite)
  estado_letra_q: String,              // 'pendiente_carga' | 'cargado' | 'incidencia'
  
  // ELIMINAR campos INFOLAC:
  // - estado_tramite_infolac
  // - fecha_presentacion_infolac
  // - numero_registro_infolac
  // - acuse_infolac
  // - numero_infolac
}
```

#### `documentos_legales` — Eliminar tipo `infolac_declaracion`

```javascript
// Los documentos generados serán de tipo:
// - 'recibo_letra_q' — Recibo de entrega de leche
// - 'analitica_leche' — Boletín de análisis
// - 'dimoe' — Guía de movimiento (existente)
// - 'factura' — Factura comercial (existente)
```

#### `proveedores` — Nuevo campo SILUM

```javascript
{
  // ... campos existentes ...
  tiene_registro_silum: Boolean,       // Alta en Sistema de Información de piensos
  codigo_silum: String,                // Número de registro
  ultimo_boletin_afb1: String,         // ISO date del último boletín de Aflatoxina B1
  categoria: String                    // Añadir: 'piensos' al catálogo existente
}
```

### 2.3. Migración de Datos (v24)

```javascript
// v24: Módulo lácteo integral
if (oldVersion < 24) {
  // 1. Crear nuevos stores
  if (!db.objectStoreNames.contains('tanques_leche')) {
    const store = db.createObjectStore('tanques_leche', { keyPath: 'id', autoIncrement: true });
    store.createIndex('fincaId', 'fincaId');
    store.createIndex('codigo_letra_q', 'codigo_letra_q', { unique: true });
  }
  
  if (!db.objectStoreNames.contains('balance_lacteo')) {
    const store = db.createObjectStore('balance_lacteo', { keyPath: 'id', autoIncrement: true });
    store.createIndex('fincaId', 'fincaId');
    store.createIndex('tanqueId', 'tanqueId');
    store.createIndex('fecha', 'fecha');
  }
  
  if (!db.objectStoreNames.contains('analiticas_leche')) {
    const store = db.createObjectStore('analiticas_leche', { keyPath: 'id', autoIncrement: true });
    store.createIndex('fincaId', 'fincaId');
    store.createIndex('comercializacionId', 'comercializacionId');
    store.createIndex('fecha_muestreo', 'fecha_muestreo');
    store.createIndex('estado', 'estado');
  }
  
  if (!db.objectStoreNames.contains('control_lechero')) {
    const store = db.createObjectStore('control_lechero', { keyPath: 'id', autoIncrement: true });
    store.createIndex('fincaId', 'fincaId');
    store.createIndex('rebanoId', 'rebanoId');
    store.createIndex('fecha_control', 'fecha_control');
  }
  
  // 2. Migrar datos existentes de comercializacion_leche
  // - Extraer laboratorio.* → crear registros en analiticas_leche
  // - Asignar especie_leche por defecto según especie principal de la finca
  // - Generar recibo_letra_q desde datos existentes
  
  // 3. Deprecar documentos_legales tipo 'infolac_declaracion'
  // - Marcar con flag 'legacy_infolac': true
  // - No eliminar (conservación histórica)
}
```

### 2.4. Catálogos Actualizados

#### Umbrales por especie en `comunidades-service.js`

```javascript
const CALIDAD_LECHE_UMBRALES = Object.freeze({
  vacuno: Object.freeze({
    // RD 1728/2007 art.7.5 — Límites legales
    grasa:              { min: 3.2,  max: 5.0,  optimo: 3.8,  unidad: '%', legal: true },
    proteina:           { min: 2.9,  max: 4.0,  optimo: 3.3,  unidad: '%', legal: true },
    extracto_seco:      { min: 6.1,  max: 9.0,  optimo: 7.1,  unidad: '%' },
    germenes_30C:       { max: 100000,           optimo: '<50000',  unidad: 'UFC/mL', legal: true, bloqueante: true },
    celulas_somaticas:  { max: 400000,           optimo: '<200000', unidad: 'cel/mL', legal: true, bloqueante: true },
    temperatura:        { max: 4,                optimo: '<2',      unidad: '°C' },
    inhibidores:        { permitido: false, bloqueante: true },
    aflatoxina_m1:      { max: 50,               optimo: '<25',    unidad: 'ng/kg', legal: true },
  }),
  
  ovino: Object.freeze({
    // Reg. CE 853/2004 — Límites legales
    grasa:              { min: 6.0,  max: 8.5,  optimo: 7.2,  unidad: '%' },
    proteina:           { min: 5.0,  max: 6.5,  optimo: 5.8,  unidad: '%' },
    extracto_seco:      { min: 11.0, max: 15.0, optimo: 13.0, unidad: '%' },
    germenes_30C:       { max: 1500000,          optimo: '<500000',  unidad: 'UFC/mL', legal: true, bloqueante: true },
    celulas_somaticas:  { max: null,             optimo: '<800000', unidad: 'cel/mL', legal: false, nota: 'Sin límite legal, referencia manejo' },
    temperatura:        { max: 4,                optimo: '<2',      unidad: '°C' },
    inhibidores:        { permitido: false, bloqueante: true },
    aflatoxina_m1:      { max: 50,               optimo: '<25',    unidad: 'ng/kg' },
  }),
  
  caprino: Object.freeze({
    // Reg. CE 853/2004 — Límites legales
    grasa:              { min: 5.5,  max: 7.5,  optimo: 6.5,  unidad: '%' },
    proteina:           { min: 4.5,  max: 6.0,  optimo: 5.2,  unidad: '%' },
    extracto_seco:      { min: 10.0, max: 13.5, optimo: 11.7, unidad: '%' },
    germenes_30C:       { max: 1500000,          optimo: '<500000',  unidad: 'UFC/mL', legal: true, bloqueante: true },
    celulas_somaticas:  { max: null,             optimo: '<2000000', unidad: 'cel/mL', legal: false, nota: 'Sin límite legal, referencia manejo' },
    temperatura:        { max: 4,                optimo: '<2',      unidad: '°C' },
    inhibidores:        { permitido: false, bloqueante: true },
    aflatoxina_m1:      { max: 50,               optimo: '<25',    unidad: 'ng/kg' },
  }),
});

// Clasificación zootécnica compatible con Letra Q
const CLASIFICACION_ZOOTECNICA_LETRA_Q = Object.freeze([
  { value: 'produccion_leche', label: 'Reproducción para producción de leche', compatible_letra_q: true },
  { value: 'mixta', label: 'Reproducción mixta', compatible_letra_q: true },
  { value: 'pastos_comun', label: 'Pastos en común', compatible_letra_q: true },
  { value: 'pastos_temporales', label: 'Pastos temporales', compatible_letra_q: true },
  { value: 'carne', label: 'Producción de carne', compatible_letra_q: false },
  { value: 'otra', label: 'Otra', compatible_letra_q: false },
]);

// Laboratorios de autocontrol homologados (Andalucía)
const LABORATORIOS_LECHE_ANDALUCIA = Object.freeze([
  { codigo: 'CICAP', nombre: 'CICAP (Centro de Investigación y Calidad Agroalimentaria)', ubicacion: 'Pozoblanco, Córdoba', default: true },
  { codigo: 'LILC', nombre: 'LILC (Laboratorio Interprofesional de Cantabria)', ubicacion: 'Cantabria', default: false },
  { codigo: 'LILCAM', nombre: 'LILCAM (Castilla-La Mancha)', ubicacion: 'Castilla-La Mancha', default: false },
  { codigo: 'LILCYL', nombre: 'LILCYL (Castilla y León)', ubicacion: 'Castilla y León', default: false },
  { codigo: 'LPSA_CORDOBA', nombre: 'Lab. Producción y Sanidad Animal de Córdoba', ubicacion: 'Córdoba', oficial: true },
]);
```

---

## 3. Flujos de Negocio

### 3.1. Flujo Principal: Producción → Tanque → Comercialización

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO LÁCTEO INTEGRAL                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐   │
│  │   ORDEÑO     │    │   TANQUE     │    │     COMERCIALIZACIÓN         │   │
│  │  (Entrada)   │───▶│  (Acumula)   │───▶│      (Salida)                │   │
│  └──────────────┘    └──────────────┘    └──────────────────────────────┘   │
│         │                   │                         │                       │
│         ▼                   ▼                         ▼                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐   │
│  │produccion_   │    │ balance_     │    │ comercializacion_leche       │   │
│  │leche (encr.) │    │ lacteo       │    │ + analiticas_leche           │   │
│  │              │    │ (movimientos)│    │ + recibo_letra_q             │   │
│  └──────────────┘    └──────────────┘    └──────────────────────────────┘   │
│                                                                              │
│  Turno AM/PM       Stock en tiempo    6 campos mínimos Letra Q              │
│  Litros/vaca       Temperatura        Muestra oficial                       │
│  Calidad rápida    Alertas capacidad   Analítica completa                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2. Flujo de Ordeño (NUEVO)

```javascript
// Wizard de registro de ordeño (2 turnos/día)
async function registrarOrdeño(data) {
  // 1. Validar animales aptos para leche
  for (const animal of data.animales) {
    const check = await MotorTrazabilidad.checkSupresion(db, animal.id, data.fecha, 'leche');
    if (!check.apto) {
      throw new Error(`Animal ${animal.crotal} no apto: ${check.motivo}`);
    }
  }
  
  // 2. Calcular total litros
  const totalLitros = data.animales.reduce((sum, a) => sum + (a.litros || 0), 0);
  
  // 3. Guardar producción individual (encriptada)
  for (const animal of data.animales) {
    await Produccion.saveLeche({
      vacaId: animal.id,
      fecha: data.fecha,
      cantidad_litros: animal.litros,
      turno: data.turno, // 'AM' | 'PM'
      analisis_grasa_proteina: animal.grasa_proteina || null,
    }, data.fincaId);
  }
  
  // 4. Registrar entrada en balance_lacteo
  await BalanceLacteo.registrar({
    fincaId: data.fincaId,
    tanqueId: data.tanqueId,
    tipo_movimiento: 'entrada',
    fecha: data.fecha,
    cantidad_litros: totalLitros,
    referencia_tipo: 'produccion_leche',
    turno: data.turno,
  });
  
  // 5. Actualizar stock del tanque
  await Tanques.actualizarStock(data.tanqueId);
}
```

### 3.3. Flujo de Comercialización (MODIFICADO)

```javascript
// Wizard de albarán de leche (MODIFICADO)
async function registrarComercializacion(data) {
  // 1. VALIDACIÓN PREVIAS (bloqueantes)
  
  // 1a. Validar clasificación zootécnica compatible con Letra Q
  const finca = await Fincas.getActive();
  if (!finca.clasificacion_zootecnica_leche || 
      !CLASIFICACION_ZOOTECNICA_LETRA_Q.find(c => c.value === finca.clasificacion_zootecnica_leche)?.compatible_letra_q) {
    throw new Error('Clasificación zootécnica incompatible con Letra Q');
  }
  
  // 1b. Validar código Letra Q del tanque
  const tanque = await db.get('tanques_leche', data.tanqueId);
  if (!tanque.codigo_letra_q) {
    throw new Error('El tanque no tiene código Letra Q asignado');
  }
  
  // 1c. Validar stock suficiente en tanque
  const stockActual = await BalanceLacteo.getStockTanque(data.tanqueId);
  if (data.cantidad > stockActual) {
    throw new Error(`Litros declarados (${data.cantidad}) superan stock del tanque (${stockActual}L)`);
  }
  
  // 1d. Validar umbrales de calidad por especie (BLOQUEANTES)
  const especie = data.especie_leche || 'vacuno';
  const umbrales = CALIDAD_LECHE_UMBRALES[especie];
  
  if (data.analitica) {
    // Inhibidores: BLOQUEANTE SIEMPRE
    if (data.analitica.inhibidores === true || data.analitica.antibioticos_detectados) {
      throw new Error('PRESENCIA DE INHIBIDORES — Prohibida comercialización');
    }
    
    // Gérmenes: BLOQUEANTE si supera límite legal
    if (umbrales.germenes_30C.bloqueante && data.analitica.germenes_30C > umbrales.germenes_30C.max) {
      throw new Error(`Gérmenes (${data.analitica.germenes_30C} UFC/mL) superan límite legal (${umbrales.germenes_30C.max})`);
    }
    
    // Somáticas: BLOQUEANTE solo en vacuno si supera límite legal
    if (umbrales.celulas_somaticas.bloqueante && 
        data.analitica.celulas_somaticas > umbrales.celulas_somaticas.max) {
      throw new Error(`Células somáticas (${data.analitica.celulas_somaticas}) superan límite legal (${umbrales.celulas_somaticas.max})`);
    }
  }
  
  // 2. GUARDAR COMERCIALIZACIÓN
  const comercializacionId = await db.add('comercializacion_leche', {
    fincaId: data.fincaId,
    tanqueId: data.tanqueId,
    compradorId: data.compradorId,
    contratoId: data.contratoId,
    transportistaId: data.transportistaId,
    
    fechaRecogida: data.fecha,
    cantidad: data.cantidad,
    matriculaCisterna: data.matriculaCisterna,
    temperatura: data.temperatura,
    
    especie_leche: especie,
    codigo_letra_q_tanque: tanque.codigo_letra_q,
    codigo_letra_q_cisterna: data.codigo_letra_q_cisterna,
    
    // Recibo Letra Q (6 campos mínimos)
    recibo_letra_q: {
      identificacion_productor: finca.nombre_titular,
      codigo_explotacion: finca.rega,
      fecha_hora_recogida: `${data.fecha}T${data.hora_carga || '00:00'}`,
      cantidad_litros: data.cantidad,
      operador_cisterna: `${data.operador} - ${data.matriculaCisterna}`,
      muestra_tomada: !!data.numero_Muestra_Letra_Q,
    },
    
    numero_Muestra_Letra_Q: data.numero_Muestra_Letra_Q,
    cadena_frio_cumplida: data.cadena_frio_cumplida,
    certificadoInhibidores: data.certificadoInhibidores,
    
    // Precios
    precioBase: data.precioBase,
    precio_extracto_seco: data.precio_extracto_seco,
    primas_penalizaciones: data.primas_penalizaciones,
    
    estado_letra_q: 'pendiente_carga',
    creadoEn: new Date().toISOString(),
  });
  
  // 3. GUARDAR ANALÍTICA (si aplica)
  if (data.analitica) {
    const analiticaId = await db.add('analiticas_leche', {
      fincaId: data.fincaId,
      comercializacionId: comercializacionId,
      tanqueId: data.tanqueId,
      fecha_muestreo: data.analitica.fecha_analisis || data.fecha,
      tipo_muestreo: 'autocontrol',
      laboratorio_nombre: data.analitica.laboratorio_nombre || 'CICAP',
      ...data.analitica,
      extracto_seco: (data.analitica.grasa || 0) + (data.analitica.proteina || 0),
      estado: calcularEstadoAnalitica(data.analitica, especie),
    });
    
    await db.put('comercializacion_leche', { 
      id: comercializacionId, 
      analiticaId 
    });
  }
  
  // 4. REGISTRAR SALIDA EN BALANCE
  await BalanceLacteo.registrar({
    fincaId: data.fincaId,
    tanqueId: data.tanqueId,
    tipo_movimiento: 'salida',
    fecha: data.fecha,
    cantidad_litros: data.cantidad,
    referencia_tipo: 'comercializacion_leche',
    referencia_id: comercializacionId,
  });
  
  // 5. GENERAR RECIBO LETRA Q
  const recibo = generarReciboLetraQ(comercializacionId);
  
  return { comercializacionId, recibo };
}
```

### 3.4. Flujo de Alertas y Bloqueos

```javascript
// Motor de validación láctea
const MotorLacteo = {
  
  // Alerta de bienestar animal
  validarBienestarAnimal(finca) {
    const alertas = [];
    const vacasLeche = ContarAnimales.leche(finca.id);
    
    // Espacio de descanso: 5-6 m²/vaca
    const espacioRequerido = vacasLeche * 5;
    if (finca.superficie_descanso_m2 && finca.superficie_descanso_m2 < espacioRequerido) {
      alertas.push({
        tipo: 'BIENESTAR',
        nivel: 'WARNING',
        mensaje: `Superficie de descanso insuficiente: ${finca.superficie_descanso_m2}m² < ${espacioRequerido}m² requeridos`,
      });
    }
    
    // Comedero: 60-70 cm lineales/vaca
    const comederoRequerido = vacasLeche * 60;
    if (finca.metros_lineales_comedero && finca.metros_lineales_comedero < comederoRequerido) {
      alertas.push({
        tipo: 'BIENESTAR',
        nivel: 'DANGER',
        mensaje: `Comedero insuficiente: ${finca.metros_lineales_comedero}cm < ${comederoRequerido}cm requeridos`,
      });
    }
    
    // Cubículos
    if (finca.num_cubiculos && finca.num_cubiculos < vacasLeche) {
      alertas.push({
        tipo: 'BIENESTAR',
        nivel: 'WARNING',
        mensaje: `Cubículos insuficientes: ${finca.num_cubiculos} < ${vacasLeche} vacas`,
      });
    }
    
    return alertas;
  },
  
  // Alerta ambiental (>300 plazas)
  validarAmbiental(finca) {
    if (finca.plazas_vacuno_leche > 300 && !finca.tiene_evaluacion_ambiental) {
      return {
        tipo: 'AMBIENTAL',
        nivel: 'DANGER',
        mensaje: 'Explotación >300 plazas requiere evaluación ambiental y balsa de purines',
      };
    }
    return null;
  },
  
  // Alerta de trazabilidad Letra Q
  validarTrazabilidadLetraQ(finca, tanque) {
    const alertas = [];
    
    if (!finca.codigo_letra_q) {
      alertas.push({ nivel: 'DANGER', mensaje: 'Finca sin código Letra Q' });
    }
    
    if (!tanque?.codigo_letra_q) {
      alertas.push({ nivel: 'DANGER', mensaje: 'Tanque sin código Letra Q' });
    }
    
    const clasif = CLASIFICACION_ZOOTECNICA_LETRA_Q.find(c => c.value === finca.clasificacion_zootecnica_leche);
    if (!clasif?.compatible_letra_q) {
      alertas.push({ nivel: 'DANGER', mensaje: 'Clasificación zootécnica incompatible con Letra Q' });
    }
    
    return alertas;
  },
  
  // Balance lácteo
  validarBalance(tanqueId, litrosDeclarados) {
    const stock = BalanceLacteo.getStockTanque(tanqueId);
    if (litrosDeclarados > stock) {
      return {
        valido: false,
        mensaje: `Litros declarados (${litrosDeclarados}L) superan stock disponible (${stock}L)`,
      };
    }
    return { valido: true, stock };
  },
};
```

---

## 4. Lógica de Negocio y Validaciones

### 4.1. Reglas de Bloqueo (Hard Blocks)

| Regla | Condición | Acción |
|-------|-----------|--------|
| **Inhibidores** | `inhibidores === true` | BLOQUEAR guardado. Estado: "Rechazado" |
| **Gérmenes (vacuno)** | `germenes > 100.000 UFC/mL` | BLOQUEAR guardado |
| **Gérmenes (ovino/caprino)** | `germenes > 1.500.000 UFC/mL` | BLOQUEAR guardado |
| **Somáticas (vacuno)** | `somaticas > 400.000 cel/mL` | BLOQUEAR guardado |
| **Stock insuficiente** | `cantidad > stock_tanque` | BLOQUEAR guardado |
| **Sin Letra Q** | Falta `codigo_letra_q` en finca o tanque | BLOQUEAR guardado |
| **Clasificación incompatible** | `clasificacion_zootecnica_leche` no compatible | BLOQUEAR guardado |
| **Animal en supresión** | `MotorTrazabilidad.checkSupresion() === false` | BLOQUEAR guardado |

### 4.2. Reglas de Alerta (Soft Warnings)

| Regla | Condición | Acción |
|-------|-----------|--------|
| **Temperatura** | `temperatura > 6°C` | WARNING (no bloquea, infracción leve) |
| **Aflatoxina M1** | `aflatoxina_m1 > 25 ng/kg` | WARNING (alerta preventiva) |
| **Bienestar animal** | Espacio/comedero/cubículos insuficientes | WARNING en dashboard |
| **Ambiental** | `>300 plazas` sin evaluación | WARNING en dashboard |
| **Tanque lleno** | `stock > 90% capacidad` | WARNING |

### 4.3. Cálculos Automáticos

```javascript
// Precio final (comercial, no normativo)
function calcularPrecioLeche(data, especie) {
  const extractoSeco = (data.grasa || 0) + (data.proteina || 0);
  const precioBase = data.precioBase || PRECIO_EXTRACTO_SECO_REF.precio_base_referencia;
  const precioExtracto = data.precio_extracto_seco || PRECIO_EXTRACTO_SECO_REF.precio_por_punto_extracto;
  const primas = data.primas_penalizaciones || 0;
  const tasaINLAC = PRECIO_EXTRACTO_SECO_REF.tasa_INLAC_defecto;
  
  const precioFinal = precioBase + (extractoSeco * precioExtracto) - tasaINLAC + primas;
  const importeTotal = data.cantidad * precioFinal;
  
  return { extractoSeco, precioFinal, importeTotal };
}

// MOFA (Margin Over Feed Cost)
function calcularMOFA(fincaId, periodoInicio, periodoFin) {
  // Ingresos lácteos del periodo
  const ingresos = Comercializacion.sumImporte(fincaId, periodoInicio, periodoFin);
  
  // Costes de alimentación del periodo
  const costesAlimentacion = Gastos.sumByCategoria(fincaId, 'Alimentacion', periodoInicio, periodoFin);
  
  return {
    ingresos,
    costesAlimentacion,
    mofa: ingresos - costesAlimentacion,
    margen_pct: ingresos > 0 ? ((ingresos - costesAlimentacion) / ingresos * 100) : 0,
  };
}

// Stock de tanque en tiempo real
async function getStockTanque(tanqueId) {
  const movimientos = await db.getAllFromIndex('balance_lacteo', 'tanqueId', tanqueId);
  
  return movimientos.reduce((stock, mov) => {
    switch (mov.tipo_movimiento) {
      case 'entrada': return stock + mov.cantidad_litros;
      case 'salida': return stock - mov.cantidad_litros;
      case 'merma': return stock - mov.cantidad_litros;
      case 'ajuste': return mov.cantidad_litros; // ajuste absoluto
      default: return stock;
    }
  }, 0);
}
```

---

## 5. Diseño UI/UX

### 5.1. Dashboard de Explotación Láctea (NUEVO)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EXPLOTACIÓN LÁCTEA — DASHBOARD                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TANQUE DE FRÍO — Estado Actual                                     │   │
│  │  ┌───────────────────────────────────────────────────────────────┐ │   │
│  │  │  ████████████████████░░░░░░░░  75% lleno                      │ │   │
│  │  │  4.500 L / 6.000 L capacidad                                  │ │   │
│  │  │  Temperatura: 3.2°C ✓                                         │ │   │
│  │  │  Letra Q: T-14-00123                                          │ │   │
│  │  └───────────────────────────────────────────────────────────────┘ │   │
│  │  [Registrar Ordeño AM] [Registrar Ordeño PM] [Ver Historial]       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │  PRODUCCIÓN HOY      │  │  ÚLTIMA ANALÍTICA    │  │  ALERTAS         │  │
│  │                      │  │                      │  │                  │  │
│  │  AM: 1.200 L         │  │  Fecha: 22/07/2026   │  │  ⚠ Comedero     │  │
│  │  PM: 1.350 L         │  │  Grasa: 3.8% ✓       │  │    insuficiente  │  │
│  │  Total: 2.550 L      │  │  Prot: 3.3% ✓        │  │                  │  │
│  │                      │  │  Som: 180K ✓          │  │  ✓ Letra Q OK   │  │
│  │  Media/vaca: 28 L    │  │  Germ: 45K ✓          │  │  ✓ Inhibidores  │  │
│  └──────────────────────┘  │  ES: 7.1% ✓           │  │                  │  │
│                            │  Estado: ÓPTIMA        │  │                  │  │
│  ┌──────────────────────┐  └──────────────────────┘  └──────────────────┘  │
│  │  COMERCIALIZACIÓN    │                                                    │
│  │                      │  ┌──────────────────────┐  ┌──────────────────┐  │
│  │  Última: 20/07       │  │  MOFA PERIODO        │  │  CONTROL LECHERO │  │
│  │  4.200 L → CICAP     │  │                      │  │                  │  │
│  │  0,48 €/L            │  │  Ingresos: 2.016 €   │  │  Último: 15/07   │  │
│  │  Importe: 2.016 €    │  │  Alimentación: 890 € │  │  Media: 27,5 L   │  │
│  │                      │  │  MOFA: 1.126 €       │  │  Mejor: Eva 38L  │  │
│  │  [Nueva Comercializ.]│  │  Margen: 55,8%       │  │  Peor: Luna 12L  │  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2. Wizard de Ordeño (NUEVO)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REGISTRO DE ORDEÑO                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PASO 1: DATOS GENERALES                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Fecha: [24/07/2026]    Turno: (●) AM  ( ) PM                       │   │
│  │  Tanque: [Tanque Principal ▼]                                       │   │
│  │  Temperatura tanque: [3.2] °C                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  PASO 2: PRODUCCIÓN POR ANIMAL                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │ Crotal    │ Nombre    │ Litros  │ G/P (opcional) │ Estado   │  │   │
│  │  ├───────────┼───────────┼─────────┼────────────────┼──────────┤  │   │
│  │  │ ES0001    │ Eva       │ [18] L  │ 3.8/3.2        │ ✓ Apta   │  │   │
│  │  │ ES0002    │ Luna      │ [12] L  │                │ ✓ Apta   │  │   │
│  │  │ ES0003    │ Rosa      │ [0] L   │                │ ✗ Supr.  │  │   │
│  │  │ ...       │ ...       │ ...     │ ...            │ ...      │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  │  Total: 30 L  |  Animales aptos: 2/3                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  PASO 3: CONFIRMACIÓN                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Total litros: 30 L                                                │   │
│  │  Stock tanque actual: 4.200 L → nuevo: 4.230 L                     │   │
│  │  Capacidad tanque: 6.000 L (70,5%)                                 │   │
│  │                                                                     │   │
│  │  [Cancelar]  [Guardar Ordeño]                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3. Wizard de Comercialización (MODIFICADO)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ALBARÁN DE LECHE (LETRA Q)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PASO 1: DATOS DE RECOGIDA                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Fecha: [24/07/2026]    Hora carga: [14:30]                         │   │
│  │  Tanque origen: [Tanque Principal (T-14-00123) ▼]                   │   │
│  │  Stock disponible: 4.500 L                                          │   │
│  │  Volumen: [4.200] L                                                 │   │
│  │  Matrícula cisterna: [ABC-1234]                                     │   │
│  │  Código Letra Q cisterna: [C-14-00456]                              │   │
│  │  Temperatura: [4.2] °C  ⚠ >4°C                                      │   │
│  │  Operador: [CICAP Industria ▼]                                      │   │
│  │  Contrato: [CTR-2026-001 ▼]                                         │   │
│  │  Especie: (●) Vacuno  ( ) Ovino  ( ) Caprino                        │   │
│  │  ☑ Cadena de frío cumplida                                          │   │
│  │  ☑ Certificado ausencia inhibidores                                  │   │
│  │  Muestra Letra Q: [M-2026-07-001]                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  PASO 2: ANALÍTICA Y LIQUIDACIÓN (Opcional)                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Laboratorio: [CICAP ▼]    Fecha análisis: [22/07/2026]             │   │
│  │  Boletín: [B-2026-1234]                                             │   │
│  │                                                                     │   │
│  │  Grasa: [3.8] %    Proteína: [3.3] %    Extracto Seco: 7.1%        │   │
│  │                                                                     │   │
│  │  Gérmenes 30°C: [45.000] UFC/mL  ✓ (<100.000)                       │   │
│  │  Células somáticas: [180.000] cel/mL  ✓ (<400.000)                  │   │
│  │                                                                     │   │
│  │  ─── Aflatoxina M1 (Plan PIVCA) ───                                 │   │
│  │  Aflatoxina M1: [15] ng/kg  ✓ (<50)                                 │   │
│  │  Método: (●) Kit rápido  ( ) ELISA  ( ) HPLC                        │   │
│  │                                                                     │   │
│  │  ─── PRECIOS ───                                                     │   │
│  │  Precio base: [0,48] €/L                                            │   │
│  │  Precio extracto: [0,045] €/punto                                   │   │
│  │  Primas/penalizaciones: [0,02] €/L                                  │   │
│  │  ─────────────────────────────────────                              │   │
│  │  Precio final: 0,5890 €/L                                           │   │
│  │  Importe total: 2.473,80 €                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  PASO 3: VALIDACIONES Y RECIBO                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✓ Clasificación zootécnica compatible                              │   │
│  │  ✓ Tanque con código Letra Q                                        │   │
│  │  ✓ Stock suficiente (4.500 L >= 4.200 L)                            │   │
│  │  ✓ Umbrales calidad cumplidos                                       │   │
│  │  ✓ Sin animales en supresión                                        │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  RECIBO DE ENTREGA — LETRA Q                                │   │   │
│  │  │  Productor: Juan García López                               │   │   │
│  │  │  Explotación: ES1401230000123                               │   │   │
│  │  │  Fecha/hora: 24/07/2026 14:30                               │   │   │
│  │  │  Cantidad: 4.200 L                                          │   │   │
│  │  │  Operador/Cisterna: CICAP Industria - ABC-1234              │   │   │
│  │  │  Muestra tomada: SÍ (M-2026-07-001)                         │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                     │   │
│  │  [Cancelar]  [Imprimir Recibo]  [Guardar y Generar Letra Q]         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4. Gestión de Tanques (NUEVO)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TANQUES DE FRÍO                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TANQUE PRINCIPAL                                                   │   │
│  │  ┌───────────────────────────────────────────────────────────────┐ │   │
│  │  │  ████████████████████░░░░░░░░  75%                            │ │   │
│  │  │  4.500 L / 6.000 L                                            │ │   │
│  │  └───────────────────────────────────────────────────────────────┘ │   │
│  │  Letra Q: T-14-00123                                               │   │
│  │  Temperatura: 3.2°C ✓    Última limpieza: 15/06/2026              │   │
│  │  Próxima limpieza: 15/12/2026                                      │   │
│  │  [Editar] [Historial movimientos] [Registrar limpieza]              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TANQUE AUXILIAR                                                    │   │
│  │  ┌───────────────────────────────────────────────────────────────┐ │   │
│  │  │  ██████░░░░░░░░░░░░░░░░░░░░░░  25%                            │ │   │
│  │  │  750 L / 3.000 L                                              │ │   │
│  │  └───────────────────────────────────────────────────────────────┘ │   │
│  │  Letra Q: T-14-00124                                               │   │
│  │  Temperatura: 4.1°C ⚠    Última limpieza: 20/03/2026              │   │
│  │  Próxima limpieza: 20/09/2026                                      │   │
│  │  [Editar] [Historial movimientos] [Registrar limpieza]              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  [+ Añadir Tanque]                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.5. Control de Proveedores SILUM (NUEVO)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROVEEDORES DE PIENSOS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PIENSOS GARCÍA S.L.                                                │   │
│  │  CIF: B12345678    SILUM: ✓ Registrado (ES-01234-AN)                │   │
│  │  Último boletín AFB1: 15/06/2026 ✓                                  │   │
│  │  Categoría: Piensos compuestos                                        │   │
│  │  [Editar] [Ver facturas] [Registrar boletín]                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  NUTRICIÓN ANIMAL S.A.                                              │   │
│  │  CIF: A87654321    SILUM: ✗ No registrado                           │   │
│  │  ⚠ PROVEEDOR NO VÁLIDO PARA LECHE — Requiere registro SILUM         │   │
│  │  [Editar] [Solicitar registro SILUM]                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  [+ Añadir Proveedor]                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Roadmap de Implementación

### Fase 1: Modelo de Datos y Migración (Prioridad: CRÍTICA)

**Duración estimada:** 2-3 días

| Tarea | Archivo | Descripción |
|-------|---------|-------------|
| 1.1 | `db.js` | Crear stores: `tanques_leche`, `balance_lacteo`, `analiticas_leche`, `control_lechero` |
| 1.2 | `db.js` | Migración v24: extraer `laboratorio.*` de `comercializacion_leche` → `analiticas_leche` |
| 1.3 | `db.js` | Añadir campos a `fincas`: `codigo_letra_q`, `clasificacion_zootecnica_leche`, campos instalaciones |
| 1.4 | `db.js` | Añadir campos a `comercializacion_leche`: `tanqueId`, `especie_leche`, `recibo_letra_q` |
| 1.5 | `db.js` | Añadir campo a `proveedores`: `tiene_registro_silum`, `codigo_silum` |
| 1.6 | `comunidades-service.js` | Añadir `CALIDAD_LECHE_UMBRALES` por especie, `CLASIFICACION_ZOOTECNICA_LETRA_Q`, `LABORATORIOS_LECHE_ANDALUCIA` |

### Fase 2: Servicios de Tanque y Balance (Prioridad: CRÍTICA)

**Duración estimada:** 2 días

| Tarea | Archivo | Descripción |
|-------|---------|-------------|
| 2.1 | `tanques-leche.js` (NUEVO) | CRUD de tanques, validación Letra Q |
| 2.2 | `balance-lacteo.js` (NUEVO) | Registro de movimientos, cálculo de stock en tiempo real |
| 2.3 | `analiticas-leche.js` (NUEVO) | CRUD de analíticas, cálculo de estado según especie |
| 2.4 | `motor-lacteo.js` (NUEVO) | Validaciones de bienestar animal, ambiental, trazabilidad |

### Fase 3: Wizards Modificados (Prioridad: ALTA)

**Duración estimada:** 3-4 días

| Tarea | Archivo | Descripción |
|-------|---------|-------------|
| 3.1 | `wizard-ordeno.js` (NUEVO) | Wizard de registro de ordeño (AM/PM) con validación de animales aptos |
| 3.2 | `wizard-albaran-leche.js` | MODIFICAR: añadir selección de tanque, especie, validaciones bloqueantes, recibo Letra Q |
| 3.3 | `wizard-tanque.js` (NUEVO) | Alta/edición de tanques con código Letra Q |
| 3.4 | `wizard-proveedor-piensos.js` (NUEVO) | Alta/edición de proveedores con validación SILUM |

### Fase 4: Vistas y Dashboards (Prioridad: ALTA)

**Duración estimada:** 3-4 días

| Tarea | Archivo | Descripción |
|-------|---------|-------------|
| 4.1 | `explotacion-lactea-view.js` (NUEVO) | Dashboard principal de explotación láctea |
| 4.2 | `tanques-view.js` (NUEVO) | Vista de gestión de tanques con niveles de stock |
| 4.3 | `comercializacion-view.js` | MODIFICAR: integrar balance lácteo, especie, Letra Q |
| 4.4 | `produccion-view.js` | MODIFICAR: integrar ordeños y control lechero |
| 4.5 | `proveedores-view.js` | MODIFICAR: añadir sección de proveedores de piensos SILUM |

### Fase 5: Alertas y Notificaciones (Prioridad: MEDIA)

**Duración estimada:** 1-2 días

| Tarea | Archivo | Descripción |
|-------|---------|-------------|
| 5.1 | `alertas-service.js` | MODIFICAR: añadir alertas de bienestar animal, ambiental, Letra Q |
| 5.2 | `notificaciones-rega.js` | MODIFICAR: integrar alertas lácteas en sistema de notificaciones |

### Fase 6: Limpieza y Deprecación (Prioridad: MEDIA)

**Duración estimada:** 1 día

| Tarea | Archivo | Descripción |
|-------|---------|-------------|
| 6.1 | `wizard-albaran-leche.js` | ELIMINAR generación de documentos `infolac_declaracion` |
| 6.2 | `comunidades-service.js` | DEPRECAR `CALIDAD_LECHE_OVINO_UMBRALES` (reemplazado por `CALIDAD_LECHE_UMBRALES`) |
| 6.3 | `db.js` | Migración v25: marcar documentos `infolac_declaracion` como `legacy_infolac: true` |
| 6.4 | Documentación | Actualizar `GUIA_EXPLOTACION_LACTEA.html` con nuevos flujos |

### Fase 7: Pruebas y Validación (Prioridad: ALTA)

**Duración estimada:** 2 días

| Tarea | Descripción |
|-------|-------------|
| 7.1 | Pruebas de integración: flujo completo ordeño → tanque → comercialización |
| 7.2 | Pruebas de validación: bloqueos por umbrales, stock, Letra Q |
| 7.3 | Pruebas de migración: datos existentes → nuevo modelo |
| 7.4 | Pruebas de UI: dashboards, wizards, alertas |

---

## 7. Anexos

### 7.1. Referencias Normativas

| Documento | Relevancia |
|-----------|------------|
| RD 1728/2007 art. 7.5 | Límites calidad leche vacuno (gérmenes, somáticas) |
| Reg. CE 853/2004 | Límites calidad leche ovino/caprino |
| Ley 17/2011 art. 51 | Infracciones y sanciones sector lácteo |
| Manual Técnico Sector Lácteo Andalucía (2018) | Procedimientos de control oficial, Letra Q, PIVCA |
| MT_REGA_2023 | Requisitos de instalaciones, >300 plazas |
| Plan PIVCA Andalucía | Control de Aflatoxina M1 en leche |

### 7.2. Glosario Letra Q

| Término | Significado |
|---------|-------------|
| **Letra Q** | Base de datos oficial del MAPA para trazabilidad láctea |
| **Contenedor** | Tanque de frío, cántara o cisterna inscrita en Letra Q |
| **Agente** | Titular, explotación, operador o centro lácteo registrado |
| **Autocontrol** | Análisis realizado por laboratorio homologado (CICAP, LILC, etc.) |
| **Muestra oficial** | Toma de muestras por inspector (triplicada) |
| **Recibo de entrega** | Documento con 6 campos mínimos exigidos |

### 7.3. Laboratorios Homologados Andalucía

| Código | Nombre | Ubicación |
|--------|--------|-----------|
| CICAP | Centro de Investigación y Calidad Agroalimentaria | Pozoblanco, Córdoba |
| LILC | Laboratorio Interprofesional de Cantabria | Cantabria |
| LILCAM | Laboratorio Interprofesional de Castilla-La Mancha | Castilla-La Mancha |
| LILCYL | Laboratorio Interprofesional de Castilla y León | Castilla y León |
| LPSA Córdoba | Laboratorio de Producción y Sanidad Animal | Córdoba (oficial) |

### 7.4. Umbrales Legales por Especie

| Parámetro | Vacuno | Ovino | Caprino |
|-----------|--------|-------|---------|
| Gérmenes 30°C (UFC/mL) | ≤ 100.000 | ≤ 1.500.000 | ≤ 1.500.000 |
| Células somáticas (cel/mL) | ≤ 400.000 | Sin límite legal | Sin límite legal |
| Aflatoxina M1 (ng/kg) | ≤ 50 | ≤ 50 | ≤ 50 |
| Temperatura (°C) | ≤ 4 (infracción si >6) | ≤ 4 | ≤ 4 |
| Inhibidores | Prohibidos | Prohibidos | Prohibidos |

---

## Aprobación Requerida

Este documento de diseño requiere aprobación antes de proceder con la implementación.

**Puntos clave a decidir:**

1. ¿Se mantiene compatibilidad con datos existentes `infolac_declaracion` o se eliminan?
2. ¿Se implementa el control lechero oficial (DHI) completo o solo como registro básico?
3. ¿Se añade integración con algún laboratorio real (CICAP) para carga automática de analíticas?
4. ¿Prioridad: tanques y balance primero, o Letra Q primero?

---

**Fin del documento de diseño.**
