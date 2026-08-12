# Estado del Proyecto — Livestock Manager (SIGGAN)
> Fotografía técnica regenerada el **2026-06-24** · Versión de app: **v4.5.0** · Base de datos: **IndexedDB DB v10** · Service Worker: **`corcho-v6.5.63`**

> Este documento sustituye a la fotografía anterior (v3.7.1 / DB v5), que había quedado obsoleta. Reconstruido a partir del código real y del historial de commits (84 commits, 6 PRs de adaptación SIGGAN).

---

## 1. Versiones registradas

| Artefacto | Valor |
|---|---|
| `package.json` | `4.5.0` |
| `index.html` (cache-bust) | `?v=20260624031800` (JS QA) · `?v=5.2.0` (CSS) |
| `app.js` (cabecera interna) | `v4.0.0` (Application Controller) |
| `trazabilidad.js` | `v3.3.5 Premium` |
| `analitica.js` | `v3.2.1 Premium` |
| `pesajes.js` | `v4.0.0` |
| **Base de datos IndexedDB** | **DB v10** |
| **Service Worker** `CACHE_NAME` | **`corcho-v6.5.63`** |

> **Disciplina de caché:** al modificar cualquier JS/CSS/HTML hay que subir `CACHE_NAME` en `sw.js` para forzar recarga en Android/PWA.

---

## 2. Arquitectura general

```
┌─────────────────────────────────────────────────────────────┐
│                     index.html (SPA Shell)                   │
│  Header · Nav · #app-content · Toast · ~80 <script> cargados │
├─────────────────────────────────────────────────────────────┤
│                    CAPA DE ARRANQUE                           │
│  idb-local.js (wrapper idb)  →  db.js (DB v10 + migraciones)  │
│  error-handler.js (validación NIF/CIF/REGA)  ·  crypto.js     │
├─────────────────────────────────────────────────────────────┤
│                    CAPA DE SERVICIOS                          │
│  event-bus · cache-service · alertas-service · balance-service│
│  comunidades-service (catálogos SIGGAN/BADIGEX) · pdf-service │
│  export-service                                               │
├─────────────────────────────────────────────────────────────┤
│                CAPA DE REGLAS Y MOTOR                         │
│  trazabilidad.js (MotorTrazabilidad) · analitica.js          │
├─────────────────────────────────────────────────────────────┤
│              CAPA DE MODELOS / DOMINIO                        │
│  fincas · rebanos · animales · pesajes · produccion · gastos │
│  sanitarios · saneamientos · movimientos · reproduccion      │
│  compradores · proveedores · transportistas · contratos      │
│  pedidos-crotales · notificaciones-rega                      │
├─────────────────────────────────────────────────────────────┤
│                 CAPA DE VISTAS (js/views/)                    │
│  ~22 vistas + 9 wizards (js/views/wizards/)                  │
├─────────────────────────────────────────────────────────────┤
│                  ORQUESTADOR CENTRAL                          │
│  app.js — App (router de 30 rutas, todas activas)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Base de Datos IndexedDB — DB v10

### Almacenes y versión de introducción

| Almacén | Desde | KeyPath | Índices | Cifrado |
|---|:---:|---|---|:---:|
| `fincas` | v1 | `id` | `rega` (único, v9) | No |
| `rebanos` | v1 | `id` | `fincaId` | No |
| `animales` | v1 | `id` | `rebanoId`, `caravana`(único), `dib`(único,v9), `categoria`(v9), `madre_id`(v9) | No |
| `produccion_carne` | v1 | `id` | `animalId` | No |
| `produccion_leche` | v1 | `id` | — | **Sí (AES-GCM)** |
| `ventas_ganado` | v1 | `id` | `fincaId` | **Sí (AES-GCM)** |
| `sanitarios_ganado` | v1 | `id` | `rebanoId` | No |
| `gastos_ganaderia` | v1 | `id` | `fincaId`, `proveedorId`(v8) | No |
| `config_especies` | v2 | `id` | — | No |
| `config_tipos_produccion` | v2 | `id` | — | No |
| `comercializacion_carne` | v3 | `id` | `fincaId`, `animalId`, `compradorId`(v8), `contratoId`(v8), `numero_albaran`(único,v9), `dimoe`(v9), `transportistaId`(v9), `autorizacion_veterinaria`(v9) | No |
| `comercializacion_leche` | v3 | `id` | `fincaId`, `comunidad_autonoma`(v7), `fechaRecogida`(v7), `contrato_numero`(v7), `compradorId`(v8), `contratoId`(v8) | No |
| `meta` | v4 | `key` | — | No (control de migraciones v8/v9) |
| `registro_eventos` | v5 | `id` | `fincaId`, `entidad_id`, `tipo_entidad`, `snap_zona`, `snap_tipo`, `motivo_tarea`, `fecha` | No |
| `reproduccion_eventos` | v6 | `id` | `fincaId`, `animalId`, `tipo_evento`, `fecha` | No |
| `compradores` | v8 | `id` | `nif_cif`(único), `tipo_comprador`, `activo` | No |
| `proveedores` | v8 | `id` | `nif_cif`(único), `activo` | No |
| `contratos_compra` | v8 | `id` | `compradorId`, `activo`, `tipo` | No |
| `transportistas` | v9 | `id` | `nif_cif`(único), `activo`, `matricula` | No |
| `documentos_legales` | v9 | `id` | `tipo`, `fincaId`, `animalId`, `numero`(único), `fecha_emision` | No |
| `movimientos_ganado` | **v10** | `id` | `fincaId`, `tipo`, `numero_guia`, `rega_origen`, `rega_destino`, `fecha`, `animalId`(multiEntry) | No |
| `saneamientos` | **v10** | `id` | `fincaId`, `campana`, `fecha`, `calificacion` | No |

> **Nota:** las **zonas no son un object store propio**; viven embebidas en `fincas.zonas` (array). Cualquier lectura de zonas debe hacerse desde la finca, no vía `db.getAll('zonas')`.

### Migraciones automáticas en arranque
- **`migrarV8`**: extrae compradores/proveedores únicos de ventas/gastos legados y crea entidades, enlazando `compradorId`/`proveedorId`.
- **`migrarV9`**: asigna `numero_albaran` secuencial (`AAAA-NNNN`) y genera `documentos_legales` tipo DIMOE para ventas sin documento.
- Control de idempotencia vía store `meta` (`migracion_v8`, `migracion_v9`).

### Datos semilla (`populateDefaults`)
- **config_especies**: Vacas (60 L), Ovejas (8 L), Cabras (8 L), Cerdos (12 L).
- **config_tipos_produccion**: Cárnica, Láctea, Mixto, Ibérico.

### Finca activa
`localStorage` → clave `activeFincaIdLivestock`. `Fincas.getActiveId()` valida existencia.

---

## 4. Router (app.js) — 30 rutas, todas activas

| Hash | Método | Hash | Método |
|---|---|---|---|
| `#/` | renderDashboard | `#/explotacion` | renderExplotacion |
| `#/ganaderia` | renderGanaderia | `#/gastos` / `#/gasto` | renderGastos / detalle |
| `#/rebanos` / `#/rebano` | renderRebanos / detalle | `#/comercializacion` | renderComercializacion |
| `#/carne` / `#/hibrido` | renderCarne / renderHibrido | `#/informes` | renderInformes |
| `#/zonas` / `#/zona` | renderZonas / detalle | `#/ajustes` | renderAjustes |
| `#/animales` / `#/animal` | renderAnimales / detalle | `#/compradores` / `#/comprador` | render… |
| `#/leche` / `#/albaran-leche` | renderLeche / detalle | `#/proveedores` / `#/proveedor` | render… |
| `#/venta-carne` | renderDetalleVentaCarne | `#/transportistas` | renderTransportistas |
| `#/contrato` | renderContrato | `#/trazabilidad` | renderTrazabilidad |
| `#/cuaderno` | renderCuadernoDigital | `#/documentos` | renderDocumentos |
| `#/manuales` | renderManuales | | |

> Las rutas `comercializacion`, `informes`, `ajustes` y `zonas` —que en v3.7.1 eran stubs— están **implementadas**.

---

## 5. Adaptación SIGGAN — Gaps cerrados

| Gap | Contenido | Norma | Commit |
|---|---|---|---|
| 1 | Genealogía (`madre_id` en formulario y modelo) | RD 787/2023 | `f9acea6` |
| 2 | Parto → alta automática de cría (evento `alta_nacimiento`) | RD 787/2023 | `f9acea6` |
| 3 | Eventos alta/baja en `registro_eventos` (`Animales.save`) | RD 787/2023 | `f9acea6` |
| 4 | Traslado interno → evento `traslado_interno` | RD 787/2023 | `f9acea6` |
| 5 | Bloqueo de venta de leche con `prohibidoLeche` | RD 787/2023 | `47ea1e3` |
| 6 | Catálogos cerrados (`tipoAlta`, categoría animal) | — | `f9acea6` |
| 7 | Clasificación **SANDACH** por motivo de baja | Reg. UE 1069/2009 | `f087996`, `bf3c591` |
| 8 | Rebaños con `tipo_explotacion_rega` del catálogo REGA | — | `bb77d13` |
| 9 | Zonas con UGM, carga ganadera, distancias y PAC | — | `3d91022` |
| 10 | Persistencia de pedidos de crotales en BD | — | `859156a` |
| 11 | Notificaciones a REGA al dar de alta animal | — | `6d85c5b` |

### Bloques transversales (ExPro + Ganadería)
- **Auditoría legal inmutable:** `Animales.delete`, `Rebanos.delete` y anulación de zonas hacen **anulación trazable** (`anulado:true` + asiento en `registro_eventos`); las `list()` excluyen anulados. Sin borrado físico en entidades críticas.
- **Workflow administrativo:** estados de trámite `borrador → presentado → aceptado → rechazado` + fecha de presentación + nº de registro oficial + acuse de recibo, persistidos en `documentos_legales`. Implementado en guías de movimiento, albarán de leche (INFOLAC), censo y traslado.
- **Validaciones cruzadas:** coherencia `num_animales`↔`crotales`, crotal normativo (ES + 12 dígitos / país + dígitos), operador y REGA destino válidos en salidas.
- **Cableado comercial → oficial:** la venta masiva genera `Movimientos.save('salida')` por animal (con rollback) y persiste `movimientoId` en `comercializacion_carne`.
- **Maestros comerciales SIGGAN:** comprador/proveedor con `nif_cif` validado + `tipo_operador` + `rega` + `comunidad_autonoma`; transportista con ATG obligatorio + control de desinsectación (fechas/vigencia).
- **Trazabilidad económica:** los gastos escriben en `registro_eventos` (aparecen en el cuaderno) y los gastos de sanidad intentan enlazarse con `sanitarios_ganado`.
- **Validación REGA por CCAA** en `Fincas.save` vía `ComunidadesService.validarFormatoREGA`.
- **Cierre mensual** exportable a SIGGAN/BADIGEX (`AjustesView._exportarCierreMensual`).

---

## 6. Libros y documentos oficiales (Cuaderno Digital)
- Libro de Registro de Explotación (altas/bajas/genealogía/movimientos).
- Libro de Movimientos (guía de origen y sanidad).
- Libro de Saneamientos (campañas ADSG: TBC, brucelosis…).
- Libro de Tratamientos Veterinarios (con tiempos de espera y etiquetado legible).
- Documentos legales: DIMOE, albaranes, INFOLAC, certificados.
- Exportación CSV/XML oficial (REGA, SIA).

---

## 7. QA / Testing

- **Suite SIGGAN** (`window.SigganQA`, `js/qa-siggan.js`): **18 tests** automatizados.
  - TEST 1 REGA · 2 Catálogos · 3 Movimientos · 4 Saneamientos · 5 Tratamientos · 6 Export CSV/XML · 7 Cuaderno · 8 Rendimiento DB v10 · 9 Crotal normativo · 10 Traslado/aforo · 11 Parto/genealogía · 12 Censo alta/baja · 13 Zonas UGM/PAC · 14 Tipo explotación REGA · 15 prohibidoLeche · 16 SANDACH · 17 Notificaciones REGA · 18 Cobertura demo CHAMORRO.
  - Ejecución: `await SigganQA.runAll()` · `SigganQA.run("coverage")` · `SigganQA.cleanup()`.
- **E2E Test Suite** (`js/e2e-test-suite.js`): 13 tests de flujo.
- **QA Test Runner** (`window.QATestRunner.runLevel(1-7)`) y **QA Diagnóstico** (`window.QADiagnostico.run()`).
- **Cobertura demo CHAMORRO: 17/17 módulos (100%)** — ver `files/demo-coverage-checklist` / TEST 18.

---

## 8. Infraestructura Android

| Fichero | Configuración |
|---|---|
| `capacitor.config.ts` | `appId: com.livestockmanager.app`, `androidScheme: https` |
| `package.json` scripts | `build` (copia a `www/`), `cap:sync`, `cap:open` |
| `sync-mirrors.ps1` | Sincroniza raíz ↔ `www/` ↔ Android src ↔ Android build |

**Flujo de trabajo (norma):** todo cambio que se pase a Android **debe quedar commiteado en GitHub** (`origin/master` es la fuente de verdad). Tras editar JS/CSS/HTML: subir `CACHE_NAME`, `npm run build`, `sync-mirrors.ps1`, commit + push.

---

## 9. Deuda técnica / pendientes

| # | Severidad | Descripción | Estado |
|---|:---:|---|---|
| 1 | 🔴 | `GanaderiaView` (≈línea 27) lee `db.getAllFromIndex('zonas', …)` pero **no existe el store `zonas`** (viven en `fincas.zonas`). Envuelto en `.catch(()=>[])` → los KPIs de zonas del hub salen siempre vacíos. | Abierto |
| 2 | 🟡 | `notificaciones-rega.js` persiste en `localStorage`, no en store versionado / `documentos_legales`. | Abierto |
| 3 | 🟢 | `js/qa-siggan-test17.js` era un duplicado huérfano (no referenciado) de la suite QA → **eliminado** en esta limpieza. | Resuelto |
| 4 | 🟡 | **Manuales** (`docs/GUIA_*.html`) no actualizados a SIGGAN (sin Cuaderno Digital ni libros de registro). | Abierto |
| 5 | 🟡 | **Validación end-to-end en Android** (`cap:sync` + `SigganQA.runAll()` en dispositivo) repetidamente diferida. | Abierto |
| 6 | 🟢 | Divergencia histórica `notes`/`notas` en rebaños (rebanos-view usa `notas` de forma consistente). | A vigilar |

---

## 10. Reglas de negocio implementadas

| Regla | Módulo | Descripción |
|---|---|---|
| Supresión farmacológica | `trazabilidad.js` | Bloquea comercialización dentro del periodo de espera |
| Aforo de zona | `trazabilidad.js` | Impide traslados que superen `aforoMax` |
| Merma canal | `trazabilidad.js` | Valida `pesoCanal < pesoVivo` en expediciones |
| Clasificación SEUROP | `trazabilidad.js` | Clasificación de canal por % de magro |
| Laboratorio lácteo | `trazabilidad.js` | Evalúa inhibidores/antibióticos |
| Crotal único | `animales.js` | Índice único `caravana` + validación formato (ES+12) |
| Anulación trazable | `animales.js`, `rebanos.js`, zonas | Sin borrado físico; histórico conservado |
| Integridad referencial | `animales/rebanos/fincas` | Bloquea anulación con dependientes activos |
| Snapshot de contexto | `pesajes/produccion/gastos` | Captura zona/tipo/especie inalterable |
| Seguridad de datos | `crypto.js` | Ventas y producción láctea cifradas (AES-GCM) |
| Validación NIF/CIF/REGA | `error-handler.js` | DNI/NIE/CIF con dígito de control + REGA por CCAA |
| Venta ↔ movimiento oficial | `wizard-venta-masiva.js` | Genera y enlaza movimiento SIGGAN, con rollback |
