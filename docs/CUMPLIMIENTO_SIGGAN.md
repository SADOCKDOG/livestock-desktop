# Matriz de Cumplimiento SIGGAN — Livestock Manager
> Generada el **2026-06-24** · Actualizada el **2026-07-21** · App v4.5.0 · DB v11 · Suite QA: 18 tests
>
> Vara de medir: modelo y flujos oficiales del **SIGGAN** (Sistema de Información de Gestión Ganadera, Andalucía) y marco **BADIGEX** (Extremadura), con base normativa RD 479/2004 (REGA), RD 787/2023 (identificación/registro/movimientos) y Reg. UE 1069/2009 (SANDACH).
>
> Leyenda: ✅ Cumple · 🟡 Parcial · 🔴 No cumple · — No aplica

---

## 1. Resumen ejecutivo

La adaptación SIGGAN de los **flujos evaluados en esta matriz** (movimientos, sanidad básica, trazabilidad, comercialización) está **prácticamente completa**, con validación en capa de dominio y cobertura de QA automatizada. La deuda técnica original (KPIs de zonas, notificaciones REGA en `localStorage`, manuales sin actualizar) ha sido **resuelta**.

**Actualización 2026-07-21**: una auditoría exhaustiva de toda la documentación normativa restante en `docs/AUDITAR/` (6 subagentes, ~150 documentos) detectó **6 gaps estructurales adicionales no cubiertos por esta matriz** — catálogo de razas, tabla de correspondencia de especie SIGGAN, modelo jerárquico de vacunaciones, identificación equina (normativa cerrada, aplicación en código pendiente), sub-modelo de instalaciones/geolocalización de finca, y campos de captura de lectores RFID. Ninguno invalida el ✅ de los puntos ya evaluados abajo, pero amplían el alcance de "cumplimiento SIGGAN" más allá de lo que esta matriz medía originalmente. **Ver [PLAN-MEJORA-SIGGAN.md](PLAN-MEJORA-SIGGAN.md) para el detalle completo y priorizado** — no se han añadido filas nuevas a la matriz de abajo porque esos gaps son de **modelo de datos/dato maestro**, de naturaleza distinta a los flujos ya evaluados aquí.

Quedan además los **dos puntos abiertos que ya dependían de recursos externos**: la ejecución de la suite QA en un dispositivo Android real y la validación del formato de exportación contra el importador oficial de SIGGAN/BADIGEX (requiere credenciales o ficha técnica de la Junta).

| Bloque | Estado global |
|---|---|
| Explotación / REGA | ✅ |
| Identificación animal (crotal/DIB) | ✅ |
| Censo y libro de registro | ✅ |
| Movimientos / guías oficiales | ✅ |
| Sanidad (tratamientos / saneamientos) | ✅ |
| Comercialización (carne / leche) | ✅ |
| Maestros comerciales (operadores/transporte) | ✅ |
| Trazabilidad / auditoría | ✅ |
| Workflow administrativo (trámites) | ✅ |
| Exportación oficial | 🟡 (validación local ✅; formato real pendiente) |
| Documentación de usuario (manuales) | ✅ |

---

## 2. Matriz por flujo

| # | Flujo / Campo normativo | Estado | Evidencia en código | Observación / gap |
|---|---|:---:|---|---|
| 1 | **Formato REGA** (RD 479/2004) validado por CCAA | ✅ | `error-handler.validateREGA`, `ComunidadesService.validarFormatoREGA`, `Fincas.save` | TEST 1. Puede tensionar REGA legados mal formados. |
| 2 | **Catálogos normativos cerrados** (tipoAlta, categoría, especie) | ✅ | `comunidades-service.js` (`TIPOS_ALTA`, `CATEGORIAS_ANIMAL`, `getGrupoEspecie`) | TEST 2. |
| 3 | **Crotal normativo** (ES + 12 díg. / país + díg.) único | ✅ | índice único `caravana`, `validateCaravana` | TEST 9. |
| 4 | **DIB** (Documento Identificación Bovina) | ✅ | índice único `animales.dib` (v9) | Soportado a nivel de dato. |
| 5 | **Genealogía** (madre_id) y parto → alta de cría | ✅ | `animales.madre_id`, `reproduccion.js` `_registrarCriasParto` | TEST 11. |
| 6 | **Censo / altas-bajas** en libro de registro | ✅ | `Animales.save` → `registro_eventos`; wizard-censo con trámite | TEST 12. |
| 7 | **Movimientos oficiales** (guía origen y sanidad) | ✅ | `movimientos_ganado` (v10), `Movimientos.save`, `wizard-guia-movimiento` | TEST 3. |
| 8 | **Traslado interno** + aforo de zona | ✅ | `wizard-traslado` → evento `traslado_interno`, `validarAforoZona` | TEST 10. |
| 9 | **Saneamientos** (campañas ADSG/TBC/brucelosis) | ✅ | `saneamientos` (v10), calificación sanitaria | TEST 4. |
| 10 | **Libro de tratamientos** + tiempos de espera | ✅ | `sanitarios_ganado`, `prohibidoLeche`, `tiempo_espera_*` | TEST 5. |
| 11 | **Bloqueo venta de leche** en periodo de espera | ✅ | validación en wizard-albaran-leche / comercialización | TEST 15. |
| 12 | **Clasificación SANDACH** por motivo de baja | ✅ | infra SANDACH + UI animal (Reg. UE 1069/2009) | TEST 16. |
| 13 | **Tipo de explotación REGA** en rebaños | ✅ | `rebanos.tipo_explotacion_rega` | TEST 14. |
| 14 | **Zonas**: UGM, carga ganadera, distancias, PAC | ✅ | campos en `fincas.zonas`, migración de relleno; `GanaderiaView` lee de `finca.zonas` | TEST 13. Gap de KPIs **resuelto**. |
| 15 | **Venta → movimiento oficial** enlazado | ✅ | `wizard-venta-masiva` → `Movimientos.save('salida')` + `movimientoId` | Con rollback si falla el movimiento. |
| 16 | **Operadores comerciales** (comprador/proveedor) con REGA + NIF/CIF + tipo operador | ✅ | `compradores.js`, `proveedores.js`, `validateNifCif` | — |
| 17 | **Transportista**: ATG + desinsectación (fechas/vigencia) | ✅ | `transportistas.js` (`autorizacion_transporte_ganado`, `desinsectacion_*`) | — |
| 18 | **Liquidación** con IVA / retención (REAGP) | ✅ | `Liquidacion.calcular`, re-derivado desde contrato activo | — |
| 19 | **Trazabilidad económica** (gasto → registro_eventos) | ✅ | `gastos.js` → `registro_eventos`, enlace sanitario | — |
| 20 | **Auditoría legal inmutable** (anulación, no borrado) | ✅ | `Animales/Rebanos.delete`, anulación de zonas + evento auditoría | — |
| 21 | **Workflow administrativo** (borrador→presentado→aceptado/rechazado + acuse) | ✅ | guías, INFOLAC, censo, traslado → `documentos_legales` | — |
| 22 | **Pedidos de crotales** persistidos | ✅ | `pedidos-crotales.js` (BD, no solo PDF) | — |
| 23 | **Notificaciones REGA** al alta | ✅ | `notificaciones-rega.js` → store versionado `notificaciones_rega` (DB v11), con auto-migración de `localStorage` | TEST 17. Gap **resuelto**: persistencia auditable en IndexedDB. |
| 24 | **Exportación oficial** CSV/XML (REGA, SIA) + cierre mensual | 🟡 | `export-service` v1.2.0 (validación semántica + modal pre-vuelo), `AjustesView._exportarCierreMensual`, `pedidos-crotales` export | TEST 6. Validación local **completa** (regex REGA, fechas, códigos M/H, escape CSV). Falta validar el formato exacto contra el importador real de SIGGAN/BADIGEX (requiere credenciales/XSD oficial). |
| 25 | **Cobertura de datos demo** (validación integral) | ✅ | TEST 18 `testCoberturaDemo` | 13/13 módulos. |
| 26 | **Manuales de usuario** alineados a SIGGAN | ✅ | `docs/GUIA_*.html` (4 guías: administración oficial, comercialización, comercial/socios, explotación láctea) | Cuaderno Digital, REGA, notificaciones, plazos legales, tipos de operador y períodos de supresión documentados. |
| 27 | **Validación en dispositivo Android** | 🟡 | — | Código listo y sincronizado (`cap:sync`); `SigganQA.runAll()` en dispositivo pendiente de ejecución manual. |

---

## 3. Deuda técnica que afecta a cumplimiento

### Resuelta en esta iteración (2026-06-24)

| Severidad | Descripción | Resolución |
|:---:|---|---|
| ✅ (era 🔴) | `GanaderiaView` leía zonas de un object store inexistente (`db.getAllFromIndex('zonas',…)`); fallaba en silencio. | Ahora lee de `finca.zonas` vía `Fincas.getActive()`. KPIs de carga ganadera se muestran. |
| ✅ (era 🟡) | `notificaciones-rega.js` en `localStorage` (no auditable). | Migrado a store versionado `notificaciones_rega` (DB v11) con auto-migración de datos previos. |
| ✅ (era 🔴) | Manuales `docs/GUIA_*.html` sin alinear a SIGGAN. | 4 guías reescritas/ampliadas al Cuaderno Digital SIGGAN. |

### Abierta

| Severidad | Descripción | Impacto normativo | Acción |
|:---:|---|---|---|
| 🟡 | Formato de exportación oficial no validado contra el sistema real. La validación local (regex REGA `^ES\d{12}$`, coherencia de fechas, códigos M/H, escape CSV) ya está implementada en `export-service` v1.2.0. | Riesgo residual de rechazo en carga telemática si el esquema oficial difiere. | Validar contra plantilla/XSD oficial (requiere credenciales o ficha técnica de la Junta). |

---

## 4. Backlog priorizado (lo que queda)

### De esta matriz (dependen de recursos externos)

1. 🟡 **Validación end-to-end en Android** — `cap:sync` ya ejecutado; falta lanzar `SigganQA.runAll()` en un dispositivo real (acción manual del usuario).
2. 🟡 **Validar export oficial** CSV/XML contra el formato de carga SIGGAN/BADIGEX real (requiere acceso al importador o ficha técnica oficial).

### De la auditoría 2026-07-21 (no dependen de recursos externos, ver [PLAN-MEJORA-SIGGAN.md](PLAN-MEJORA-SIGGAN.md) para el detalle)

3. **Catálogo de razas** (189 razas oficiales) — prioridad alta, mismo patrón ya probado con especie/crotal.
4. **Tabla de correspondencia de especie SIGGAN** (`Espe`/`Espe_ID`) — prioridad alta, requisito bloqueante para cualquier exportador SIGGAN real.
5. **Modelo jerárquico de vacunaciones** — prioridad media, gap sanitario más grande detectado.
6. **Aplicar validación de crotal equino** ya cerrada normativamente — prioridad media, esfuerzo bajo (solo falta aplicar el cambio en código).
7. **Sub-modelo Instalaciones + geolocalización + restricciones** en finca — prioridad baja-media.
8. **Campos de captura de lectores RFID** (hora, lote, nº macho, saneamiento individual) — prioridad baja, condicional a uso real de lectores físicos.

---

## 5. Cómo reproducir la validación

```js
// Consola del navegador (Chrome DevTools)
await SeedData.run(true);        // Cargar Demo CHAMORRO
await SigganQA.runAll();         // 18 tests SIGGAN
await SigganQA.run("coverage");  // Cobertura de módulos (13/13)
await SigganQA.cleanup();        // Limpieza de datos de test
```
