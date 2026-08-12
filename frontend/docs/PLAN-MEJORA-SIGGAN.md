# Plan de mejora e implementación — integración SIGGAN

**Origen**: auditoría completa de `docs/AUDITAR/` (~150 documentos: PDFs normativos BOE/BOJA/Junta de Andalucía/FEGA, ~120 catálogos CSV oficiales, ZIPs de configuración de lectores RFID de campo), realizada el 2026-07-21 con 6 subagentes especializados en paralelo, más una auditoría dedicada previa que ya cerró el modelo de datos maestro Especie/Crotal (commit `20055ad`).

**Cómo leer este documento**: es el plan maestro. Cada sección enlaza al documento de detalle normativo correspondiente (`docs/NORMATIVA-CROTAL-ESPECIE.md`, `docs/ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md`) donde está la cita exacta de fuente y el razonamiento completo — aquí solo está lo accionable: qué falta, dónde, y en qué orden abordarlo.

**Relacionado**: [NORMATIVA-CROTAL-ESPECIE.md](NORMATIVA-CROTAL-ESPECIE.md), [ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md](ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md), [CUMPLIMIENTO_SIGGAN.md](CUMPLIMIENTO_SIGGAN.md), [el-sistema-de-identificacion-crotal.md](el-sistema-de-identificacion-crotal.md), [AUDITAR/INVENTARIO-AUDITORIA.md](AUDITAR/INVENTARIO-AUDITORIA.md) (qué documento/fichero de `docs/AUDITAR/` está auditado, cuál no aplica, y cuál queda pendiente).

---

## Resumen ejecutivo

**Estado (2026-07-31): 7 de 7 gaps principales implementados**, incluido el punto 7 ("Subexplotación", capa aditiva) y la distinción "Explotación de Lidia" (punto 5, commit `b2a5787`/PR #66 — verificado end-to-end 2026-07-31). Además: flag `autoguia` en movimientos GTA, vista propia de Saneamientos (antes sin UI), granularidad individual de saneamientos (nº tubo + sexo, con UI completa), y varios flecos menores cerrados (clasificación de razas en UI, campo `Cebo` vinculado, catálogo `SISTEMAS_EXPLOTACION` completo a los 7 valores oficiales SIEX, gaps adicionales de `ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md` evaluados uno a uno). **Único punto marcado como no aplica al alcance actual** (decisión 2026-07-25): NIF veterinario de alta de cebadero (punto 6) — requiere modelar Castilla y León como CCAA nueva, fuera del alcance SIGGAN/BADIGEX. **Con esto, la auditoría SIGGAN queda cerrada al 100%** — cero puntos pendientes o en pausa.

La adaptación SIGGAN de Livestock Manager estaba ya en buen estado en los flujos cubiertos por `CUMPLIMIENTO_SIGGAN.md` (movimientos, sanidad básica, trazabilidad, comercialización). Esta auditoría añadió 7 gaps estructurales no detectados hasta entonces, todos con fuente normativa oficial citada y cruzados contra el código (`file:line`):

- ✅ Datos maestros listos para generar/importar ficheros de intercambio SIGGAN reales, incluido el campo `Cebo` vinculado (gaps 1 y 2).
- ✅ Modelo de vacunación con el nivel de detalle que exige ADSG (gap 3), con UI (wizard + listado en SanidadView).
- ✅ Validación de identificación equina cerrada (gap 4).
- ✅ Instalaciones/geolocalización/restricciones de la explotación (gap 5), con UI (listado + ficha + wizard), incluida la distinción "Explotación de Lidia" (commit `b2a5787`/PR #66).
- ✅ Campos de captura compatibles con lectores RFID físicos (gap 6) — hora/lote/nº macho y granularidad individual de saneamientos implementados; NIF veterinario de cebadero **no aplica al alcance actual** (ver detalle en el punto 6).
- ✅ Subexplotación (gap 7), implementado como capa aditiva y opcional sin tocar el modelo animal↔finca existente.
- ✅ Flag `autoguia` en movimientos GTA (único cambio recomendado de la sección "Máquina de estados GTA").
- ✅ Vista propia de Saneamientos, que no tenía UI pese a existir su modelo de datos desde el origen del plan.

**Histórico**: "Explotación de Lidia" y granularidad individual de saneamientos estuvieron en pausa desde el 2026-07-22 a petición del usuario; ambos se implementaron en sesiones posteriores (ver puntos 5 y 6 de la tabla). NIF veterinario de cebadero es el único punto que sigue sin aplicar, por estar fuera del alcance geográfico actual (ver arriba).

## Orden de implementación recomendado

| # | Gap | Esfuerzo | Bloqueante para | Prioridad |
|---|---|---|---|---|
| 1 | Catálogo de razas (163 razas) | ✅ **Implementado** (commit `8675c08`, 2026-07-22) | — | — |
| 2 | Tabla de correspondencia `Espe` SIGGAN | ✅ **Implementado** (commit `e2e8c76`, 2026-07-22) | — | — |
| 3 | Modelo jerárquico de vacunaciones | ✅ **Implementado con UI** (commits `325d812`, `966735a`, 2026-07-22) | — | — |
| 4 | Equino: aplicar validación de crotal ya cerrada | ✅ **Implementado** (commit `acde2fa`, 2026-07-22) | — | — |
| 5 | Sub-modelo Instalaciones + geolocalización + restricciones en finca | ✅ **Implementado con UI** (commits `57202a5`, `c453090`, 2026-07-22) + distinción "Lidia" (commit `b2a5787`, PR #66) | — | — |
| 6 | Campos de captura de campo (hora, lote, nº macho, saneamiento individual) | ✅ **Implementado** (commit `800e913` + granularidad saneamientos, 2026-07-22; NIF cebadero no aplica — ver detalle) | — | — |
| 7 | Concepto "Subexplotación" (REGA→especie→clasificación zootécnica) | ✅ **Implementado como capa aditiva** (`finca.subexplotaciones[]`, 2026-07-22) | — | — |
| — | Máquina de estados GTA completa (12 estados) | Alto | — | **No recomendado implementar** — ver razonamiento abajo |

---

## 1. Catálogo de razas — ✅ IMPLEMENTADO (commit `8675c08`, 2026-07-22)

DB_VERSION 15→16, migración aditiva. Tabla `razas` (keyPath `id`, índice `especieId`) semillada con 163 de las 189 razas del catálogo oficial (filtradas a las 5 especies ya modeladas: 47 bovino, 16 porcino, 51 ovino, 22 caprino, 27 équido). `js/views/animales-view.js`: el campo RAZA es ahora un `<select>` filtrado por especie con opción "OTRA (ESPECIFICAR)" para razas fuera de catálogo. Comparación case-insensitive, sin migración forzosa del campo `raza` (string) de animales existentes — igual que se planteó, se mantiene intacto en paralelo. Detalle completo en [NORMATIVA-CROTAL-ESPECIE.md](NORMATIVA-CROTAL-ESPECIE.md#catálogo-de-razas--implementado-commit-8675c08-2026-07-22).

**✅ Cierre de flecos (2026-07-22)**: `clasificacion`/`grado_amenaza` ahora se muestran como badge en la ficha de animal (`js/views/animales-view.js`), junto al selector de raza. `Asociación de razas.csv` auditado y **descartado explícitamente** — es un directorio de contacto de asociaciones de criadores (NIF/email/teléfono), no un catálogo de razas ni un dato relevante para la gestión de una explotación individual. Ver `docs/AUDITAR/INVENTARIO-AUDITORIA.md`.

---

## 2. Tabla de correspondencia SIGGAN `Espe` — ✅ IMPLEMENTADO (commit `e2e8c76`, 2026-07-22)

Añadidos los campos `codigo_espe_siggan`/`espe_id_siggan` a `ESPECIES_SEED` en `js/db.js`: Bovino→`02`, Porcino→`03`, Ovino→`04`/`espe_id_siggan: 3`, Caprino→`04`/`espe_id_siggan: 2`, Équido→`01`. Migración de datos (`migrarEspeSiggan()`) para instalaciones que ya tenían la tabla `especies` sembrada antes de este cambio — sin bump de `DB_VERSION` (no crea tablas nuevas, solo añade campos). Verificado en navegador para instalación nueva e instalación existente migrada.

**El catálogo `Tipo_Iden`** (3 valores: bolo ruminal+crotal, inyectable+crotal, crotal electrónico+crotal) ya coincidía con `TIPOS_IDENTIFICADOR_SEED` (ids 2, 3, 4) — no requirió trabajo adicional.

**✅ Campo `Cebo` vinculado (2026-07-22)**: nuevo `Movimientos.esDestinoCebo(animalId)` en `js/movimientos.js`, que deriva el flag `Cebo` (campo #15 del fichero SIGGAN) del `motivo` del último movimiento de ENTRADA del animal (`motivo === 'cebo'`, ya capturable en el wizard de guía de movimiento — ver `MOTIVOS_MOVIMIENTO` en `comunidades-service.js`). No es un campo editable nuevo: se deriva de un dato que ya se capturaba. Badge "DESTINO: CEBO / ENGORDE (SIGGAN)" añadido en la ficha de animal (`js/views/animales-view.js`) cuando aplica. Verificado en navegador: animal con movimiento de entrada motivo=cebo muestra el badge; animal sin movimiento de entrada no lo muestra.

**Sigue pendiente, fuera de este cambio**: esto solo deja los datos maestros (y ahora también el campo `Cebo`) listos para generar el fichero — no construye ningún exportador/importador SIGGAN real (no hay generación de fichero `.txt` con el formato exacto). Especificación completa del fichero de 15 campos en [NORMATIVA-CROTAL-ESPECIE.md](NORMATIVA-CROTAL-ESPECIE.md#especificación-oficial-y-exacta-fichero-de-incorporación-de-datos-a-siggan-pequeño-rumiante).

**Advertencia regional ya documentada** (sin acción requerida todavía): los códigos de especie/raza son por región, no nacionales — Andalucía (SIGGAN) y Extremadura (BADIGEX) usan numeraciones invertidas. Esta tabla de correspondencia cubre solo el caso SIGGAN/Andalucía. Detalle completo en [NORMATIVA-CROTAL-ESPECIE.md](NORMATIVA-CROTAL-ESPECIE.md#️-advertencia-importante-los-códigos-de-especierraza-son-por-región-no-nacionales).

---

## 3. Modelo jerárquico de vacunaciones — ✅ IMPLEMENTADO (commit `325d812`, 2026-07-22)

DB_VERSION 16→17, nueva tabla `vacunaciones` (índices `fincaId`, `rebanoId`, `fecha`, `cerrada`) + nuevo módulo `js/vacunaciones.js`, separado del libro de tratamientos genérico (`js/sanitarios.js`, que sigue existiendo sin cambios).

**Modelo implementado**: Vacunación (cabecera: fecha, veterinario, observaciones) con array embebido `tipos_vacuna` (máx. 4 por normativa, truncado automáticamente: `tipo`, `lote`, `dosis`, `nombre_comercial`) y `animales_vacunados` (por categoría agregada o individual). Campo `completa` (% censo susceptible vacunado, exigido por ADSG y ausente en el libro genérico) y flag `cerrada` que bloquea edición/borrado una vez `true`. `anular()` es trazable (marca `anulada`/`motivo_anulacion`/`fecha_anulacion` sin borrar, funciona incluso sobre vacunaciones ya cerradas) — mismo patrón que movimientos.

**✅ UI implementada (commit `966735a`, 2026-07-22)**: nuevo `js/views/wizards/wizard-vacunacion.js` (wizard de 2 pasos: cabecera+tipos de vacuna, luego selección de animales) + sección "VACUNACIONES (LIBRO ADSG)" en `SanidadView` con listado y ficha de detalle (cerrar/anular). Verificado en navegador con flujo de UI real completo.

Verificado en navegador: rechazo sin tipos de vacuna, alta con múltiples tipos, truncado a 4 máximo, cálculo de total de animales vacunados, edición antes/bloqueada después de cerrar, borrado bloqueado tras cerrar, anulación trazable funcional incluso cerrada, `list()` por rebaño.

---

## 4. Equino — ✅ IMPLEMENTADO (commit `acde2fa`, 2026-07-22)

Nueva entrada `equino_microchip` en `CROTAL_FORMATOS` (`js/error-handler.js`, regex 15 dígitos) + fila `{ especieId: 5, tipoIdentificadorId: 3, formato: 'equino_microchip' }` en `ESPECIE_TIPO_IDENTIFICADOR_SEED` (`js/db.js`), manteniendo el DIE (id 14) sin regex estricta. Migración de datos (`migrarEquinoMicrochip()`) para instalaciones existentes, sin bump de `DB_VERSION`.

**Fix relacionado detectado durante la verificación**: `validateCrotal()` aplicaba por error la regex genérica `ES+12 dígitos` de `validateCaravana` cuando la asociación especie↔tipo existía pero su `formato` era explícitamente `null` (el caso del propio DIE) — corregido para que en ese caso solo se exija que el campo no esté vacío, sin forzar el formato de otra especie.

Verificado en navegador: microchip válido/inválido, DIE con formato heredado variable (ej. `41/053850`) aceptado, DIE vacío rechazado, regresión OK en bovino/ovino/porcino, migración correcta en instalación nueva y existente.

---

## 5. Sub-modelo Instalaciones + geolocalización + restricciones en finca — ✅ IMPLEMENTADO PARCIALMENTE (commit `57202a5`, 2026-07-22)

**Fuente**: mapa de navegación 1.4 de ADSG WEB (`docs/AUDITAR/ADS005E_MUS_Manual_Usuario_0100.pdf`) — ver árbol completo en [ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md](ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md#árbol-completo-del-punto-14-mapa-del-sistema-auditoría-dedicada-2026-07-21).

| Campo/módulo | Estado |
|---|---|
| `latitud`/`longitud` en finca | ✅ Implementado — validación de rango (España peninsular/insular/Canarias), opcional |
| `instalaciones_tipo` (dato maestro) + `finca.instalaciones[]` | ✅ Implementado — 36 tipos curados del catálogo oficial FEGA (de 109, excluidos los puramente agrícolas); array embebido en finca, mismo patrón que `zonas[]`, cada instalación exige `tipoId` del catálogo |
| Flag `restriccion_movimientos` en `js/saneamientos.js` | ✅ Implementado — distinto de `calificacion`, con `motivo_restriccion` y helper `restriccionActiva(fincaId)` |
| Distinción "Explotación de Lidia" en filiaciones | ✅ **Implementado** (commit `b2a5787`, PR #66) — flag `explotacion_lidia` en `finca` (checkbox en el wizard de edición, `js/views/wizards/wizard-finca.js`), badge visible en Ajustes. Verificado end-to-end 2026-07-31: persiste correctamente vía `Fincas.save()`, se refleja en el badge. Nota: solo disponible desde el wizard de **edición**, no en el de alta de finca nueva — mismo patrón que `numero_infolac` (ver punto 1 de la auditoría lácteo) |

**DB_VERSION 17→18**, migración aditiva (nueva tabla `instalaciones_tipo`, dato maestro sin cambios en tablas existentes). Verificado en navegador: 36 tipos sembrados y re-sembrados correctamente, validación de latitud/longitud, instalación sin tipo rechazada, IDs secuenciales correctos, `restriccionActiva()` funcional.

**No priorizado**: el diseño de 12-13 campos por instalación (referencia catastral, régimen de tenencia, año construcción, etc.) que reveló el Anexo I de Variables Ganaderas se simplificó a los campos mínimos verificados (`tipoId`, y campos libres como `superficie_m2`/`plazas_alojamiento`/`volumen_m3` según el tipo) — el array `instalaciones[]` no fuerza schema, así que se pueden añadir más campos sin migración si hace falta.

**✅ UI implementada (commit `c453090`, 2026-07-22)**: nuevo `js/views/instalaciones-view.js` (listado + ficha de detalle + wizard de alta, mismo patrón que `ZonasView`), rutas `/instalaciones` y `/instalacion`, acceso desde el menú "Más". Verificado en navegador con flujo de UI real completo.

**✅ UI de Saneamientos implementada (2026-07-22)**: `js/saneamientos.js` tenía modelo de datos completo desde su implementación original pero **cero UI** (solo se usaba desde QA). Nuevo `js/views/saneamientos-view.js` (listado + ficha de detalle editable + wizard de alta), rutas `/saneamientos` y `/saneamiento`, acceso desde el menú de cabecera. Se añadió también `Saneamientos.anular(id, motivo)` (anulación trazable, mismo patrón que Movimientos/Vacunaciones/Instalaciones — antes solo existía `delete()` con borrado duro, sin usar desde ningún sitio) y `list()` ahora excluye anulados por defecto (`includeAnulados` para verlos). Verificado en navegador: alta por wizard, listado con badge de calificación y alerta de restricción de movimientos, edición de ficha, anulación trazable (desaparece del listado activo, se conserva con `includeAnulados: true`).

---

## 6. Campos de captura de campo — lectores RFID — ✅ IMPLEMENTADO PARCIALMENTE (commit `800e913`, 2026-07-22)

**Fuente**: comparación de los `.rdf` de programas de lector físico (Felixcan/Datamars, carpeta `docs/AUDITAR/LECTOR/`) contra los formularios actuales de la app.

| Campo que captura el lector | Estado |
|---|---|
| **HORA** (además de fecha) | ✅ Implementado — Altas/Bajas (`js/movimientos.js`), Cubriciones/Secados (wizard reproducción en `js/app.js`), Tratamientos (`js/views/wizards/wizard-tratamiento.js`) |
| **LOTE** (identificador de lote de cubrición) | ✅ Implementado — visible en Inseminación Artificial/Monta Natural |
| **NÚMERO DE MACHO** (semental/reproductor) | ✅ Implementado — visible solo en Monta Natural (en IA no hay semental físico) |
| **NIF VETERINARIO** vinculado a alta de cebadero (Castilla y León) | ⚪ **No aplica al alcance actual** (decisión 2026-07-25) — campo ya escrito en `wizard-guia-movimiento.js`, condicionado a `conf.requiere_nif_veterinario_cebadero`, pero ese flag no está definido en ningún objeto de `comunidades-service.js` porque **Castilla y León no es una CCAA modelada** en la app (solo Andalucía/Extremadura, alcance SIGGAN/BADIGEX). Activarlo exigiría dar de alta CyL como CCAA nueva — expansión de alcance real, no un ajuste de config. Código dejado tal cual: inerte pero inofensivo; base ya lista si se decide soportar CyL en el futuro |
| Granularidad individual (nº tubo + sexo por animal) | ✅ Implementado (2026-07-22) — campos `tubo`/`sexo` en `js/saneamientos.js` y `js/views/saneamientos-view.js`, editable en ficha y wizard de alta |

Fix de UX detectado durante la verificación: el wizard de reproducción abre con "Inseminación Artificial" preseleccionada, pero el `<select>` no dispara `change` por sí solo al renderizarse — los campos condicionales (lote) no aparecían hasta que el usuario tocaba el selector manualmente. Corregido llamando explícitamente a `_onReproTipoChange()` al abrir el wizard.

Verificado en navegador: hora/lote/nº macho persistidos correctamente vía UI real, visibilidad condicional correcta al abrir y al cambiar tipo de evento.

---

## 7. Concepto "Subexplotación" (prioridad baja, gap estructural — añadido 2026-07-22)

**Fuente**: `docs/AUDITAR/2025.09.18-Documento_Tecnico_ganadero_SIEX_3.6_CORRECCION_ERRORES.pdf` (documento técnico SIEX más reciente, 2025) y el XLSX Anexo I de Variables Ganaderas (bloque "Subexplotación", 21 campos).

**Qué falta**: el concepto **"Subexplotación" no existe en absoluto en el código** de Livestock Manager (confirmado por búsqueda exhaustiva en todo `js/`, cero coincidencias). Es la unidad real que usa SIEX/REGA por debajo de la explotación: **una subexplotación = un código REGA + una especie + su clasificación zootécnica**. Es decir, SIEX no relaciona animales directamente con la explotación (finca), sino con una subdivisión de esa explotación por especie.

Livestock Manager hoy organiza los animales directamente bajo "finca" (`js/fincas.js`), sin ese nivel intermedio. El bloque XLSX de 21 campos incluye: censo por categoría, integradora comercial asociada, y datos de cría animal (asociación de criadores/raza/clasificación — coincide con el catálogo de razas ya priorizado en el punto 1 de este plan).

**Por qué prioridad baja pese a ser un gap estructural**: introducir este nivel intermedio implicaría cambiar la relación fundamental animal↔finca en todo el código (un cambio de mayor alcance que cualquier otro punto de este plan). Antes de acometerlo, vale la pena confirmar si realmente aporta valor de uso a un ganadero que gestiona una sola explotación con una o pocas especies — el nivel de detalle formal que exige SIEX (pensado para la administración pública, no para el día a día del ganadero) puede no justificar la complejidad añadida en la mayoría de casos de uso reales de la app.

**✅ IMPLEMENTADO como capa aditiva y opcional (2026-07-22)**: en vez de cambiar la relación fundamental animal↔finca (alto riesgo, tocaría todo el código existente), se añadió `finca.subexplotaciones[]` — mismo patrón array-en-finca que `zonas[]`/`instalaciones[]`, sin bump de `DB_VERSION`. Cada entrada: `{ especieId, tipo_explotacion, sistema_explotacion, capacidad_maxima, notas }`, con validación de una subexplotación activa por especie (`js/fincas.js`). Nuevo `js/views/subexplotaciones-view.js` (listado + ficha + wizard de alta), rutas `/subexplotaciones` y `/subexplotacion`, acceso desde el menú de cabecera. El listado calcula y muestra el **censo actual** por especie (a partir de `animal.especieId` + rebaños de la finca, sin campo nuevo). Una explotación de una sola especie puede ignorar este módulo por completo — `tipo_explotacion`/`sistema_explotacion` de finca siguen funcionando exactamente igual que antes, sin cambios ni migración. Verificado en navegador: alta de subexplotación, censo calculado correctamente (2 animales bovino → "2/50"), validación de especie duplicada (rechazada), anulación trazable y re-alta tras anular (permitida).

---

## Máquina de estados GTA — por qué NO se recomienda implementarla completa

**Contexto**: el sistema real de guías telemáticas (GTA) tiene 12 estados (pago de tasa modelo 046 con 2 sub-estados, actores separados origen/destino, delegación a OCA/ganadero destino, firma digital vía @firma con registro @ries, concepto de "autoguía" sin tasa ni firma cuando el titular origen=destino). Livestock Manager modela hoy 4 estados (`borrador`/`presentado`/`aceptado`/`rechazado` + `anulado` trazable).

**Razonamiento de la auditoría**: replicar los 12 estados solo tiene sentido si la app fuese a integrarse en vivo con el backend real de SIGGAN (pagos, firma digital con certificado, notificaciones oficiales) — algo que hoy no hace y que requeriría infraestructura y acuerdos con la Junta de Andalucía muy por encima del alcance actual. La simplificación actual (4 estados + anulación trazable) es razonable para una app de un solo ganadero que lleva su propio registro.

**✅ Flag `autoguia` implementado (2026-07-22)**: único cambio de bajo riesgo recomendado por la auditoría. Checkbox "AUTOGUÍA (MISMO TITULAR EN ORIGEN Y DESTINO — SIN TASA NI FIRMA DIGITAL)" en `wizard-guia-movimiento.js` (paso 2), campo `autoguia` (booleano, declarado por el usuario) persistido en `movimientos_ganado` (`js/movimientos.js`), y reflejado en el documento de guía generado. No automatiza tasa modelo 046 ni firma digital — es solo un indicador informativo. Verificado en navegador: checkbox visible y funcional, campo persistido correctamente.

Detalle completo de los 12 estados en [ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md](ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md) por si se retoma esta decisión más adelante.

---

## Descartado explícitamente (no aplica al alcance actual, con justificación)

- **Núcleos zoológicos / especies exóticas / multiespecie de exhibición** — fuera del perfil de ganadería comercial de producción/reproducción que cubre la app.
- **Vigilancia de salmonela** (`TUTORIAL_MUESTRAS_SALMONELLA.pdf`) — es un programa específicamente **avícola** (Reglamento CE 2160/2003), y la app no modela la especie "Aves" hoy. Retomar solo si se amplía el alcance a avícola.
- **Catálogo `Enfermedades.csv` del FEGA** (603 filas) — es **fitosanitario** (hongos/plagas de plantas), no ganadero pese al nombre engañoso. El catálogo ganadero real de saneamiento ya existe en `js/services/comunidades-service.js:150-158` (`CAMPANAS_SANEAMIENTO`).
- **PIGGAN como integración separada** — corrección de premisa importante: PIGGAN no es un sistema porcino aparte, es el portal general "Punto de Información y Gestión para el Ganadero Andaluz" (todas las especies), hermano de ADSG WEB y GTA bajo el mismo SIGGANnet. No requiere tratamiento diferenciado en el modelo de datos.
- **Crotal porcino** — confirmado correcto con doble fuente (manual ADSG + BOE RD 479/2004 texto íntegro), sin cambios necesarios más allá de la posible fila de "tatuaje" como alternativa de marca (menor, ver tabla del punto 1 de `NORMATIVA-CROTAL-ESPECIE.md`).

---

## Documentos auditados en las últimas pasadas (2026-07-22) — la auditoría de docs/AUDITAR/ está completa

**Único punto realmente sin cerrar**: detalle operativo paso a paso (más allá del mapa 1.4) de Avícola, Porcino y Cunícola en ADSG WEB — no se considera prioritario porque el mapa de navegación (1.4) ya está completo y esas 3 secciones no revelaron nada estructuralmente distinto al comparar con Bovino/Pequeño Rumiante (sí auditados a fondo).

### Cierre de documentos de baja prioridad (2026-07-22)

Los 2 ficheros `.odt`/`.ods` se abrieron sin `odfpy` (un `.odt`/`.ods` es un ZIP con XML dentro, extraíble directamente):

- **`GTA006E_MUS_Manual_Usuario_0400.odt`** — versión "manual completo" de GTA (misma familia que `GTA007E...pdf` ya auditado en detalle). Aportó **2 flujos no cubiertos antes**: (1) **Cambio de titularidad de equinos** — proceso separado de un movimiento normal, con sus propios estados (`PENDIENTE GANADERO DESTINO`) e iconografía de confirmación (flecha origen/destino, estrella amarilla = pendiente de confirmar) para cuando además de trasladarse el animal cambia de propietario; (2) **Autorización expresa de entrada de équidos** — el ganadero de destino puede autorizar la llegada antes de que el veterinario de origen genere la guía. Ninguno de los dos se incorpora como gap nuevo del plan: son parte de la misma máquina de estados GTA de 12 pasos que ya se decidió NO replicar (ver sección "Máquina de estados GTA" arriba) — solo se documentan aquí por completitud del inventario.
- **`Anexo_I_Manual_ADSGWeb.ods`** — definición de columnas del catálogo de "Actuaciones Sanitarias" SIGGAN (programa/subprograma/matriz de análisis/propósito analítico/enfermedades obligatorias). Confirma y detalla (sin contradecir) los programas ya conocidos en `CAMPANAS_SANEAMIENTO` (TBC, Brucelosis, Lengua Azul, EET) con más granularidad de la implementada — no aporta gap accionable nuevo.
- **Sección "Mensajes de error" de `ADS005E...pdf`** (páginas 254-340, ~300 códigos) — catálogo de validaciones internas muy específicas de la operativa de ADSG WEB (ej. "en una vacunación completa los totales de Ovino deben coincidir"). Útil como referencia de reglas de negocio si se quisiera afinar mensajes de error muy concretos en el futuro, pero no revela ningún gap estructural nuevo.
- **`Manual_SIGGAN_Diagnosticos.pdf`** (17 páginas, leído completo) — protocolo de diagnóstico de tuberculosis bovina (módulo ALANA/SIGGAN): grabación de medidas IDTB simple/comparada por animal, diagnóstico automático por fórmula (incremento de medidas + signos clínicos → Positivo/Dudoso/Negativo), lotes de tuberculina, bolo ruminal en sacrificio. **Confirma con más detalle** el gap ya conocido de "granularidad individual de saneamientos" (punto 6 de este plan) — hoy `js/saneamientos.js` solo agrega examinados/positivos a nivel de campaña. No se incorpora como punto nuevo del plan por ser muy específico (una sola enfermedad, una sola especie, fórmula veterinaria concreta) frente al esfuerzo de implementarlo.

### Auditoría de pendientes prioritarios cerrada (2026-07-22)

Los 3 documentos marcados como prioritarios en `docs/AUDITAR/INVENTARIO-AUDITORIA.md` ya están auditados:

- **`2025.09.18-Documento_Tecnico_ganadero_SIEX_3.6_CORRECCION_ERRORES.pdf`** (el más importante) — **confirmado sin cambios** respecto al catálogo `ESPECIE_ANIMAL` ya implementado en `js/db.js` (pese al nombre "corrección de errores", es el documento técnico SIEX v3.6.0 completo, no un changelog puntual). Cero riesgo para el modelo de datos ya cerrado. Aportó 2 hallazgos: catálogo de 23 "Tipos de explotación ganadera" (complementa el ya inventariado) y confirmación del gap "Subexplotación" (ver punto 7 arriba).
- **`GUIA_AD-SIEX-DSI-PortalPublico.pdf`** — API REST del FEGA confirmada "sin autenticación"; CORS sigue sin documentarse explícitamente (pendiente de validar empíricamente). Endpoint nuevo útil no usado hoy: `GET /catalogos/{idTabla}/fecha` (para sincronización incremental de catálogos, solo descargar si cambió). 2 catálogos del grupo GANADERAS reclasificados desde "agrícola" a "ganadero": `Sistemas de sostenibilidad y control.csv`, `Datos de la integradora comercial.csv` (ver `INVENTARIO-AUDITORIA.md`).
- **XLSX Anexo I de Variables Ganaderas** — auditado completo (los 11 bloques restantes, más allá de "Datos individuales de los animales" ya cubierto). Aportó el detalle de campos del gap "Instalaciones" (punto 5, actualizado arriba) y confirmó el gap nuevo "Subexplotación" (punto 7). Los bloques "Gerente de explotación", "Rendimiento económico", "Asociaciones/socios" y "Actividad secundaria" son gaps completos de prioridad baja, no incorporados a este plan por no chocar con nada ya implementado ni aportar valor claro al alcance operativo actual de la app — mencionados aquí solo para constancia de que fueron revisados.

---

## Verificación al implementar cualquiera de estos puntos

Seguir el patrón ya establecido en el proyecto:
1. Migración aditiva (`DB_VERSION` bump, nueva función `migrarVXX()`), nunca destructiva sobre datos existentes.
2. Extender `js/qa-*.js` con la suite de test correspondiente (patrón `window.*QA.runAll()`).
3. Prueba manual en navegador antes de dar por cerrado.
4. Actualizar el documento normativo de origen (`NORMATIVA-CROTAL-ESPECIE.md` o `ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md`) marcando el punto como implementado, con el commit correspondiente.
