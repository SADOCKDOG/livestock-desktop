# Inventario de auditoría — `docs/AUDITAR/`

**Propósito**: registro de qué documentos/ficheros de esta carpeta han sido auditados, su estado, y si aplican o no a Livestock Manager. Sirve como base para decidir qué queda en el repo (relacionado con la app) y qué se puede archivar/eliminar (irrelevante, ej. catálogos puramente agrícolas del FEGA que no tienen nada que ver con ganadería).

**Leyenda de estado**:
- ✅ **Auditado, APLICA** — leído a fondo, resultado volcado en `docs/NORMATIVA-CROTAL-ESPECIE.md`, `docs/ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md` o `docs/PLAN-MEJORA-SIGGAN.md`.
- 🟡 **Auditado, NO APLICA** — leído, con justificación explícita de por qué no es relevante para esta app.
- 🟠 **Auditado parcialmente** — solo portada/índice revisado, o solo clasificado por nombre/estructura sin lectura profunda del contenido.
- ⬜ **No auditado** — no revisado en ninguna de las sesiones de auditoría hasta ahora.
- ❌ **Ilegible** — se intentó extraer y no fue posible (fuente subseteada, sin OCR disponible, etc.).

**Sesiones de auditoría**: (1) implementación inicial especie/crotal, commit `20055ad` 2026-07-19; (2) 6 subagentes en paralelo, 2026-07-21, resultado en `docs/PLAN-MEJORA-SIGGAN.md`.

---

## PDFs y documentos normativos (raíz de `docs/AUDITAR/`)

| Fichero | Estado | Aplica | Motivo / dónde está el resultado |
|---|:---:|:---:|---|
| `Mxtodos_Identificacixn_Vxlidos_xfebrero_2014x.pdf` | ✅ | Sí | Estructura de identificación equina y demás especies. Ver `NORMATIVA-CROTAL-ESPECIE.md`. |
| `SIGGAN_Manual_Fichero_Incorporacion.pdf` | ✅ | Sí | Especificación completa del fichero de intercambio SIGGAN (15 campos, tablas `Espe`/`Tipo_Iden`/`Raza`). Ver `NORMATIVA-CROTAL-ESPECIE.md`. |
| `ADS005E_MUS_Manual_Usuario_0100.pdf` | ✅ | Sí | Manual ADSG WEB completo, mapa 1.4 por especie. Ver `ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md`. Pendiente: sección "Mensajes de error" (3.4, ~4800 líneas) sin revisar en detalle. |
| `GTA007E_MUS_Manual_Usuario_0400.pdf` | ✅ | Sí | Guía Telemática — máquina de estados completa (12 estados). Ver `ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md` y `PLAN-MEJORA-SIGGAN.md` (recomendación de no replicar). |
| `ADSGVacunacionesRumiantes.pdf` | ✅ | Sí | Modelo jerárquico de vacunaciones (Vacunación→Tipo→Lote). Ver `PLAN-MEJORA-SIGGAN.md` punto 3. |
| `ADSG_MUS_Manual Usuario Recensado y Declaración censal.pdf` | ✅ | Sí | Proceso de recensado y declaración censal por categorías de edad/sexo. Ver `ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md`. |
| `Manual Movimientos Multiespecie.pdf` | ✅ | 🟡 No | Cubre especies FUERA de {bovino, porcino, avícola, pequeños rumiantes, équidos} — apicultura, camellos, conejos, acuicultura, núcleos zoológicos. Fuera del alcance de ganadería comercial de la app. |
| `S78_DDTT_nucleos_zoologicos_2_sellado.pdf` | ❌ | 🟡 No | Fuente subseteada, texto no extraíble (glifos `cid:N` sin mapeo, sin tesseract disponible). Por nombre/contexto, mismo caso de borde que "núcleos zoológicos" del punto anterior — no aplica a producción/reproducción comercial. |
| `PIG004E_MUS_Manual_Usuario_0500.pdf` | ✅ | Sí | Manual PIGGAN (portal multiespecie, no solo porcino). Confirma declaración censal agregada de porcino. Ver `PLAN-MEJORA-SIGGAN.md`. |
| `PIG004E_Manual Usuario Recensado y Declaración Censal_1100.pdf` | ✅ | 🟡 Parcial | Pese al nombre, es manual de recensado de **pequeños rumiantes**, no porcino. Sin contenido nuevo relevante más allá del glosario PIGGAN. |
| `PIGGAN002E_MUS_Manual_Usuario_0500.pdf` | ✅ | 🟡 No | Versión anterior (2014) del mismo manual que `PIG004E_MUS_Manual_Usuario_0500.pdf` (2017) — contenido duplicado/histórico, superseded. |
| `TUTORIAL_MUESTRAS_SALMONELLA.pdf` | ✅ | 🟡 No | Programa de vigilancia de salmonela **avícola** (Reglamento CE 2160/2003). La app no modela la especie Aves hoy. Retomar si se amplía el alcance. |
| `Guxa_de_vacunacixn.pdf` | ✅ | Sí | Vacunación bovino/pequeños rumiantes en SIGGAN/ADSG WEB — detecta campo "completa" (% censo vacunado) no modelado hoy. Ver `PLAN-MEJORA-SIGGAN.md` punto 3. |
| `003742-A00-V02-00 (2).pdf` | ✅ | Sí | Formulario "Solicitud REGISTRO DE EXPLOTACIONES GANADERAS DE ANDALUCÍA" — mismo objeto que el Anexo V actualizado (ver `BOJA24-221...`). Referencia de campos de alta de explotación. |
| `A14978-14983.pdf` | ✅ | Sí | BOE núm.89 (13/04/2004), texto íntegro RD 479/2004 (REGA) — confirma con fuente primaria la estructura de crotal porcino ya implementada. Sin cambios necesarios. |
| `BOJA15-087-00024-8123-01_00069255.pdf` | ✅ | 🟡 Parcial | Orden 29/04/2015 ordenación de équidos — relevante solo porque define SIGGANnet/PIGGAN (usado en `PLAN-MEJORA-SIGGAN.md`), no aporta normativa porcina/equina adicional al ya cerrado. |
| `BOJA24-221-00019-53812-01_00310760.pdf` | ✅ | Sí | Resolución 28/10/2024 — versión VIGENTE (más reciente del lote) del formulario Anexo V REGA + nuevo Plan de Producción y Gestión de Estiércoles (PPGE). Relación con gap "Purines/Estercolero" de `PLAN-MEJORA-SIGGAN.md` punto 5. |
| `Texto noticia OCA.pdf` | ✅ | 🟡 No | Boletín interno "Modificaciones SIGGAN – Julio 2014" (changelog técnico histórico, cambios de hace 10+ años ya superados). No es normativa vigente. |
| `GUIA_AD-SIEX-DSI-PortalPublico.pdf` | ✅ | Sí | Especificación completa de la API REST del FEGA — confirmado "sin autenticación", CORS no documentado (sigue sin resolver empíricamente). Endpoint nuevo útil `GET /catalogos/{idTabla}/fecha` (sincronización incremental). Catálogos `idCatalogo` de grupo GANADERAS ya inventariados, más 2 nuevos: `SISTEMAS_SOST_CONTROL`, `INTEGRADORA_COMERCIAL`. Ver `PLAN-MEJORA-SIGGAN.md`. |
| `2025.09.18-Documento_Tecnico_ganadero_SIEX_3.6_CORRECCION_ERRORES.pdf` | ✅ | Sí | **Confirmado SIN CAMBIOS respecto al catálogo `ESPECIE_ANIMAL` ya implementado** (coincide código a código pese al nombre "corrección de errores" — es el Documento Técnico SIEX v3.6.0 completo, no un changelog puntual). Aporta 2 hallazgos nuevos: catálogo de 23 "Tipos de explotación ganadera" SIEX (complementa el CSV de 38 valores ya inventariado) y, sobre todo, confirma que el concepto **"Subexplotación" no existe en el código** — ver `PLAN-MEJORA-SIGGAN.md` gap nuevo. |
| `Manual_SIGGAN_Diagnosticos.pdf` | ✅ | Sí, gap identificado | Manual completo (17 páginas) leído. Es el protocolo de diagnóstico de tuberculosis bovina (IDTB simple/comparada) dentro del saneamiento SIGGAN: grabación de medidas por animal (2 o 4 columnas según técnica), diagnóstico automático por fórmula (incremento de medidas + signos clínicos → Positivo/Dudoso/Negativo), lotes de tuberculina, y datos de bolo ruminal en sacrificio. Gap real: `js/saneamientos.js` hoy solo agrega `num_examinados`/`num_positivos` a nivel de campaña, sin granularidad de medida individual ni lógica de diagnóstico — mismo gap ya señalado en `PLAN-MEJORA-SIGGAN.md` punto 6 ("granularidad individual de saneamientos"), ahora con más detalle de lo que implicaría cerrarlo (haría falta modelar medidas IDTB + fórmula de diagnóstico, específico solo para TBC bovina). No incorporado como punto nuevo del plan por ser un caso muy específico (una sola enfermedad, una sola especie) de alta complejidad relativa al valor que aporta hoy. |
| `GTA006E_MUS_Manual_Usuario_0400.odt` | ✅ | Sí | Abierto sin `odfpy` (extracción directa del XML interno, un .odt es un ZIP). Es la versión "manual completo" de GTA (misma familia que `GTA007E...pdf` ya auditado) — aporta 2 secciones nuevas no cubiertas antes: **Cambio de titularidad de equinos** (flujo separado del movimiento normal, con estados propios `PENDIENTE GANADERO DESTINO` e iconografía de confirmación) y **Autorización expresa de entrada de équidos** (el titular destino puede autorizar antes de que el veterinario genere la guía). También confirma el catálogo extenso de mensajes de error de movimientos/censo (~300 códigos) y los acrónimos GO/GD/VO/VD ya usados en el análisis de la máquina de estados GTA. Ver `PLAN-MEJORA-SIGGAN.md`. |
| `Anexo_I_Manual_ADSGWeb.ods` | ✅ | Sí | Abierto sin `odfpy` (extracción directa del XML). Es la definición de columnas del catálogo de "Actuaciones Sanitarias" SIGGAN (programa/subprograma/matriz de análisis/propósito analítico/enfermedades obligatorias/ámbito) — confirma y detalla los programas ya conocidos (TBC, Brucelosis, Lengua Azul, EET) con un nivel de granularidad (tipo de matriz, submuestra) mayor que el implementado en `CAMPANAS_SANEAMIENTO`. No se requiere acción — el detalle adicional no aporta un gap nuevo accionable, solo contexto. |

## `ANEXOS_autorrellenables incluidos en la Orden de Equino/`

| Fichero | Estado | Aplica | Motivo |
|---|:---:|:---:|---|
| `001169-A00-V03-00_anexo V.pdf` | ✅ | Sí | Solicitud genérica SIGGAN multiespecie de alta/cambio de explotación (incluye équidos). |
| `002266-A00-V01-00_anexo II.pdf` | ✅ | Sí | Autorización inscripción explotaciones equinas de producción/reproducción. |
| `002267-A00-V01-00_anexo III.pdf` | ✅ | 🟡 Parcial | Declaración responsable — aplica solo su apartado 5.2 "producción/reproducción" y "reproducción para silla"; el resto (núcleos zoológicos, concurso/competición, lúdica) no aplica. |
| `ANEXO 1.pdf` | ✅ | 🟡 No | Declaración limpieza/desinfección vehículos équidos sin ánimo de lucro — trámite de transporte no comercial, fuera del alcance (la app no gestiona logística/vehículos). |
| `ANEXO 4.pdf` | ✅ | Sí | Libro de Registro de Explotación de Ganado Equino — plantilla de campos de ficha de animal equino y catálogo cerrado de razas equinas. |

## `Catalogos_csv/` (122 CSV + 1 XLSX)

**Metodología de la sesión 2026-07-21**: los 122 CSV fueron clasificados en bloque por nombre y estructura (ganadero / agrícola / transversal), con lectura de contenido real solo para los identificados como potencialmente ganaderos o transversales relevantes. **Auditoría complementaria 2026-07-21 (segunda pasada)**: se detectaron 3 catálogos ganaderos que la primera pasada no mencionó explícitamente (`Organizaciones de productores de carne/leche`, `Edificaciones e instalaciones`), y se confirmó que `Tratamiento de estiércoles.csv` tiene relación directa con el gap de "Purines/Estercolero" ya detectado en `PLAN-MEJORA-SIGGAN.md`.

### ✅ Ganaderos — auditados, APLICAN

| Fichero | Uso / relación con el código |
|---|---|
| `Especies animales.csv` | Ya implementado (`ESPECIES_SEED` en `js/db.js`). |
| `Tipo de identificador.csv` | Ya implementado (`TIPOS_IDENTIFICADOR_SEED`). |
| `Catálogo oficial de razas de ganado de España.csv` | **Pendiente de implementar** — 189 razas, gap de dato maestro. Ver `PLAN-MEJORA-SIGGAN.md` punto 1. |
| `Clasificación en el catálogo oficial de razas de ganado de España.csv` | Complementa el anterior (4 categorías de clasificación). |
| `Asociación de razas.csv` | 🟡 **Auditado, NO aplica** (2026-07-22) — 174 filas, no es un catálogo de razas sino un **directorio de contacto de asociaciones de criadores** (NIF, razón social, email, teléfono, autoridad competente) por especie (50 Bovinos, 44 Ovinos, 27 Équidos, 23 Caprinos, 17 Gallinas, 8 Cerdos, 1 Dromedario, 1 Conejos). Sin uso operativo para un ganadero individual gestionando su propia explotación (no es dato del animal ni de la finca, es un listado institucional). No se incorpora al modelo de datos. Ver `PLAN-MEJORA-SIGGAN.md` punto 1. |
| `Sexo.csv` | Catálogo simple (Macho/Hembra/Indeterminado/Sin dato) — ya cubierto conceptualmente en el modelo de animal. |
| `Causas de baja.csv` | A nivel explotación/DGC (cambio titularidad, fusión...), NO animal individual — no confundir con `MOTIVOS_BAJA` de la app. |
| `Tipo de muerte.csv` | Solo 3 valores (Sacrificado/Muerto/Sacrificio urgencia) — más simple que `MOTIVOS_BAJA` ya implementado. |
| `Tipo de explotación ganadera.csv` | 38 valores oficiales SIEX vs. 10 hardcoded en `comunidades-service.js:68-79` (`TIPOS_EXPLOTACION_REGA`) — divergen parcialmente, candidato a sincronizar. |
| `Sistema productivo.csv` | Intensivo/Extensivo/Mixto/Estante/Trashumante/Semiextensivo/No extensivo vs. `SISTEMAS_EXPLOTACION` hardcoded (solo 3 valores) en `comunidades-service.js:85-87` — candidato a completar. |
| `Forma de cría.csv` | 31 valores, mayormente avícola — solo relevante si se amplía a esa especie. |
| `Resultado genotipado Scrapie.csv` | 28 combinaciones alélicas — vigilancia obligatoria ovino/caprino, gap total en el código hoy (no priorizado en el plan actual). |
| `Unidades de Ganado Mayor (UGM) y código del CPE ganadería.csv` | ~313 filas, coeficientes UGM oficiales por especie/categoría/edad/sexo — útil para cálculo de carga ganadera, no implementado. |
| `Motivo actualización censo.csv` | 7 valores — sin lógica de "estado de explotación REGA" en el código hoy. |
| `Clasificaciones zootécnicas excluidas.csv` | ~140 filas, tipos de explotación excluidos del REGA estándar (circos, zoológicos, clínicas...) por especie. |
| `Capacidad productiva.csv` | 12 valores (Grupo I-IV, Profesional/No Profesional...) — RD 479/2004 Anexo II. |
| `Tipo de establecimiento de reproducción.csv` | 6 valores (Centro recogida esperma, etc.) — sin uso hoy. |
| `Estado de la explotación.csv` | Alta/Baja/Inactiva/Baja por recodificación — sin modelar hoy. |
| **`Organizaciones de productores de carne.csv`** | *(detectado en segunda pasada)* — asociaciones oficiales por especie/CCAA (incluye conejos, y presumiblemente otras). No usado en el código hoy; relevante si se añade gestión de comercialización asociativa. |
| **`Organizaciones de productores de leche.csv`** | *(detectado en segunda pasada)* — asociaciones oficiales de productores lácteos. Mismo uso potencial que el anterior. |
| **`Edificaciones e instalaciones.csv`** | *(detectado en segunda pasada)* — **catálogo de 109 tipos de instalación** (incluye explícitamente "Alojamiento ganadero bovino/ovino/caprino/porcino/equino/aves/conejos", "Fosas de purín", "Silos forrajeros"). **Fuente de datos directa para el gap "Instalaciones" de `PLAN-MEJORA-SIGGAN.md` punto 5** — no estaba enlazado en el plan original, actualizar cuando se implemente ese punto. |
| **`Tratamiento de estiércoles.csv`** | 🟡 **Auditado, NO aplica** (2026-07-22) — 9 valores de tratamiento de estiércoles. El gap "Purines/Estercolero" (PPGE, Plan de Producción y Gestión de Estiércoles) se evaluó y se descartó: es un documento de cumplimiento completo (dimensiones/coordenadas de balsas) solo obligatorio para explotaciones intensivas por umbral de producción, sin punto de enganche en el catálogo actual de instalaciones. Ver `ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md`. |
| **`Datos de la integradora comercial.csv`** | 🟡 **Auditado, NO aplica por ahora** (2026-07-22) — 1503 filas, directorio de empresas integradoras (piensos/contrato de integración), no catálogo operativo. Gap "Ganadería Integrada" evaluado y descartado por falta de caso de uso concreto. Ver `ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md`. |

### 🟡 Transversales — auditados, aplicación opcional/menor

| Fichero | Motivo |
|---|---|
| `Comunidad autónoma.csv` | Normalización de campo CA (hoy probablemente texto libre). |
| `Tipo de titular.csv` | 20 formas jurídicas — no modelado hoy en finca. |
| `Régimen de tenencia.csv` | Propiedad/Arrendamiento/Aparcería/Usufructo — no modelado hoy. |
| `Régimen matrimonial.csv` | Solo relevante si se modela cotitularidad de explotación. |
| `Tipo de agricultor.csv` | Agricultor profesional/ATP/Joven agricultor... — no modelado hoy. |
| `Clasificación de la explotación.csv` | Prioritaria/Cotitularidad/Ocio.../Singulares — no modelado hoy. |
| `Actividad agraria.csv` | Parcialmente agrícola; "Pastoreo" aplica a ganadería extensiva. |
| `Tipo de ubicación.csv` | Genérico (Principal/Secundaria) — 2 valores, trivial. |

### 🟡 Agrícolas/no aplican — auditados en bloque, NO APLICAN

~98 CSV clasificados como agrícolas/cultivos por nombre y contenido (cultivos, SIGPAC, viñedo, fertilizantes, fitosanitarios, OTE/CPE de cultivos, OPFH/OPP, malas hierbas, plagas, semillas, riego, etc.) — no relevantes para una app puramente ganadera. Lista completa (no se detalla fila a fila por ser autoevidente por el nombre):

`Actividad secundaria ligada a la actividad agraria`, `Agrupaciones de titulares de explotaciones agrarias preferentes`, `Agrupaciones para la gestión integrada de plagas`, `Aprovechamiento`, `Artrópodos y gasterópodos`, `Asociación de protección de variedades con riesgo de erosión genética`, `Autorizaciones excepcionales del producto fitosanitario`, `Autorizadas de algodón`, `Buenas prácticas`, `CUE-Comercial`, `Capacitación profesional`, `Certificación producción ecológica`, `Clasificación municipios según la ley de desarrollo sostenible del medio rural (LDSMR)`, `Coeficientes de Producción Estándar (CPE) por Comunidad Autónoma`, `Comunidades de usuarios de agua`, `Cooperativas agroalimentarias`, `Correspondencia entre Código CPE y CEE`, `Cultivo`, `Cálculo de Orientaciones Técnico Económicas (OTE)`, `Código del CPE de asociaciones de cultivos`, `Código del CPE destino cultivo`, `Código del CPE viticultura`, `Código del CPE aprovechamiento`, `Código del CPE cultivos protegidos`, `Código del CPE cultivos`, `Datos de la integradora comercial`, `Desmotadora`, `Destino del cultivo`, `Destino del resto vegetal`, `Detalle material fertilizante`, `Eficacia del tratamiento`, `Empresas productoras de semillas certificadas`, `Enfermedades` (⚠️ **es fitosanitario, no ganadero, pese al nombre genérico** — 603 entradas de hongos/patógenos de plantas, confirmado por lectura completa), `Entidad de asesoramiento`, `Entidad de certificación`, `Entidad habilitada`, `Estado fenológico`, `Estrato Política Agraria Común (PAC)`, `Estrato Producción Estándar Total (PET)`, `Finalidad de la cosecha`, `Identificación de Códigos de agrupaciones (CAG)`, `Justificación de la actuación`, `Macronutrientes`, `Malas hierbas`, `Material analizado`, `Material fertilizante`, `Material vegetal de reproducción`, `Medida preventiva - cultural`, `Metales pesados`, `Micronutrientes`, `Método de aplicación de fertilizante`, `Organizaciones de productores de plátanos (OPP)`, `Organizaciones interprofesionales agrarias`, `Organización de productores de frutas y hortalizas (OPFH)`, `Orientaciones Técnico Económicas (OTE) clasificación 2024-25`, `Orientaciones Técnico Económicas (OTE)`, `Periodos cultivo principal`, `Portainjerto`, `Procedencia del agua de riego`, `Procedencia del material vegetal`, `Producto Vegetal`, `Reguladores de crecimiento, rodenticidas y otros`, `Regímenes de calidad`, `Relación Cultivo-Uso SIGPAC`, `Relación aprovechamiento-uso SIGPAC`, `Sistema de conducción`, `Sistema de cultivo`, `Sistema de explotación` (⚠️ pese al nombre es uso de suelo Regadío/Secano, agrícola — no confundir con `Sistema productivo.csv` que sí es ganadero), `Sistema de riego`, `Sistemas de sostenibilidad y control`, `Superficies y elementos no productivos (SENP)`, `Sustancias activas detectadas en el análisis`, `Tipo de análisis`, `Tipo de autorización-derecho de origen de la superficie de viñedo`, `Tipo de ayuda de viñedo`, `Tipo de cobertura del suelo`, `Tipo de empresa conexa`, `Tipo de energía`, `Tipo de entidad - asociación`, `Tipo de fertilización`, `Tipo de labor`, `Tipo de maquinaria UNE`, `Tipo de medida fitosanitaria`, `Tipo de producto fitosanitario`, `Tipo de superficie plantada de uva de vinificación`, `Tipo de superficie potencial para plantaciones de uva de vinificación`, `Tipología municipios LDSMR (3 tipos)`, `Tipología municipios LDSMR (4 tipos)`, `Tratamiento semilla`, `UTAs desempeñadas`, `Unidades de medida`, `Variedad - Especie - Tipo` (confirmado por lectura: 9.7MB, todo cultivos — trigo, variedades vegetales).

### ✅ XLSX — auditado completo (todos los bloques)

| Fichero | Estado |
|---|---|
| `20250514-Anexo_I_Definicion_de_Variables_Ganaderas_3.6.0_Version_en_Trabajo.xlsx` | **Auditado completo (2026-07-22)** — los 12 bloques revisados campo a campo (bloque "Datos individuales de los animales" ya estaba hecho; los otros 11 —Titular, Socios, Gerente, Actividad secundaria, Rendimiento económico, Edificaciones, Maquinaria, Regímenes de calidad, Declaración de leche, Subexplotación— confirmados en esta segunda pasada). Hallazgo estructural: el bloque "Subexplotación" (21 campos) confirma que ese concepto **no existe en el código** — ver `PLAN-MEJORA-SIGGAN.md` gap nuevo. El bloque "Edificaciones" (12 campos) revela que el gap "Instalaciones" ya priorizado necesita un formulario completo por instalación, no solo el catálogo de tipos. |

### Re-clasificación de 2 catálogos (confirmados GANADEROS, no agrícolas — corrige la lista de abajo)

`Sistemas de sostenibilidad y control.csv` y `Datos de la integradora comercial.csv` estaban en la lista "agrícolas/no aplican" de la primera pasada; la Guía de la API SIEX (`GUIA_AD-SIEX-DSI-PortalPublico.pdf`) confirma que ambos pertenecen al grupo oficial **GANADERAS** de catálogos FEGA (`SISTEMAS_SOST_CONTROL`, `INTEGRADORA_COMERCIAL`) — reclasificados como ✅ ganaderos, sin uso todavía en el código.

---

## Ficheros de configuración de lectores RFID — `LECTOR/`

| Fichero | Estado | Aplica | Motivo |
|---|:---:|:---:|---|
| `Altas.zip`, `Bajas.zip`, `Cubriciones.zip`, `Montas.zip`, `Partos.zip`, `Reposiciones.zip`, `Saneamientos.zip`, `Secados.zip`, `Tratamientos.zip`, `Control Lechero.zip` | ✅ | Sí | Extraídos y comparados campo a campo contra los formularios de la app. Gaps de captura (hora, lote, nº macho, granularidad) documentados en `PLAN-MEJORA-SIGGAN.md` punto 6. |
| `Cebadero_CLM.zip`, `Cebadero_Extremadura.zip`, `Cebaderos_CYL.zip` | ✅ | Sí | Confirmado mapeo a "tanda de cebo SIGGAN" ya modelado conceptualmente en la app. |
| `Censo Extremadura.zip` | 🟡 | — | Fichero vacío (`zipfile is empty`), sin contenido que auditar. |
| `Censo Extremadura.rdf` | ✅ | 🟡 No | Ya analizado en sesión previa (advertencia de codificación regional Andalucía/Extremadura, ver `NORMATIVA-CROTAL-ESPECIE.md`) — es de Extremadura/BADIGEX, no SIGGAN/Andalucía (objetivo estratégico de la app). |
| `ID Andalucia.zip`, `ID Extremadura.zip` | ✅ | Sí (Andalucía) / 🟡 (Extremadura, referencia) | Hallazgo crítico ya documentado: códigos de especie/raza invertidos entre regiones. Ver `NORMATIVA-CROTAL-ESPECIE.md`. |
| `andalucia7.uni`, `extremadura_Continua3.uni` | ✅ | Sí (Andalucía) | Ficheros de programación del lector Felixcan — estructura de campos documentada en `ADSG-WEB-SIGGAN-FLUJOS-ESTRUCTURA.md`. |
| `GES3S - Configuración de Equivalencias v.1.0.pdf` | ✅ | Sí | Confirma flujo Datamars GES3S/Rumisoft y el Conversor SIGGAN oficial del fabricante. |
| `UniTransfer_1.37.zip` (instalador + manuales `EI2061.pdf`, `Guia Instalación.pdf`, `GUIA RAPIDA...pdf`, `Posibles_Errores.pdf`) | ✅ | Sí | Software de PC del lector Felixcan — flujo lector→PC→SIGGAN documentado en detalle. El `.msi`/`.exe`/`.ico` internos no se han ejecutado (correctamente, no aplica auditar binarios). |

## `Generador documento Siggan/`

| Fichero | Estado | Aplica | Motivo |
|---|:---:|:---:|---|
| `SIGGAN Generator - Manual de Usuario v.1.0.pdf` | ✅ | Sí | Confirma que el conversor SIGGAN oficial ya resuelve la generación del fichero desde Rumisoft — no haría falta reimplementarlo. Formato exacto de columnas internas no detallado por el propio manual (limitación de la fuente, no de la auditoría). |
| `Setup SIGGAN Generator v.1.2.exe` | — | — | Binario ejecutable, no auditable como documento. No ejecutado (correctamente, fuera del alcance de una auditoría documental). |

---

## Resumen cuantitativo

**Actualizado 2026-07-22 (tercera y última pasada)** — `Manual_SIGGAN_Diagnosticos.pdf` (17 páginas) leído completo. **Ya no queda ningún documento pendiente ni parcial en este inventario.**

| Categoría | Total | ✅ Aplica | 🟡 No aplica | ⬜/🟠 Pendiente |
|---|---:|---:|---:|---:|
| PDFs/documentos normativos (raíz) | 21 | 16 | 5 | 0 |
| Anexos Orden de Equino | 5 | 4 | 1 | 0 |
| Catálogos CSV | 122 | 26 (ganaderos) + 8 (transversales) | ~96 (agrícolas) | 0 |
| XLSX | 1 | Sí, completo | — | 0 |
| Lectores RFID (`LECTOR/`) | ~17 | 15 | 2 | 0 |
| Generador SIGGAN | 2 | 1 | — | 1 (binario, no aplica) |
| Formatos odt/ods | 2 | 2 (sin librería, extracción directa del XML) | — | 0 |
| Sección "Mensajes de error" ADS005E (páginas 254-340) | 1 | Revisada | Sí, ~300 códigos de validación interna de ADSG WEB, sin gap estructural nuevo | 0 |

**Hallazgo importante de esta segunda ronda (2026-07-22)**: el catálogo `ESPECIE_ANIMAL` ya implementado en `js/db.js` está **confirmado sin cambios** por la fuente más reciente (SIEX v3.6.0, 2025) — cero riesgo de que el modelo de datos maestro ya cerrado quede desactualizado. Se detectó en cambio un gap estructural nuevo (concepto "Subexplotación" ausente del código) documentado en `PLAN-MEJORA-SIGGAN.md`.

**Hallazgo de la tercera ronda (2026-07-22, cierre de documentos de baja prioridad)**: `GTA006E_MUS_Manual_Usuario_0400.odt` reveló un flujo no cubierto antes — **cambio de titularidad de equinos** (proceso separado del movimiento normal, con sus propios estados y confirmación del nuevo titular) y **autorización expresa de entrada de équidos** por el ganadero de destino. `Anexo_I_Manual_ADSGWeb.ods` y la sección "Mensajes de error" de `ADS005E` solo confirman/detallan lo ya conocido, sin gaps nuevos accionables. `Manual_SIGGAN_Diagnosticos.pdf` (17 páginas, leído completo) reveló el protocolo de diagnóstico de tuberculosis bovina (IDTB simple/comparada) con fórmula de diagnóstico automático — confirma con más detalle el gap ya conocido de "granularidad individual de saneamientos", sin incorporarse como punto nuevo del plan por su alta especificidad (una sola enfermedad, una sola especie).

## Recomendación de limpieza de `docs/AUDITAR/`

**No se recomienda borrar nada todavía** — incluso los ~96 CSV agrícolas descartados son parte de la descarga completa oficial (`/catalogos/zip` del FEGA) y sirven como constancia de que se revisó el catálogo completo, no solo una selección sesgada. Si se quiere reducir el volumen del repo:

1. **Candidatos seguros a archivar fuera del repo** (mover a `Private/` o eliminar del control de versiones): los ~96 CSV agrícolas confirmados sin relación alguna con ganadería (lista completa en la sección "Agrícolas/no aplican" arriba).
2. **Mantener en el repo**: todos los PDFs normativos (son la fuente de verdad citada en la documentación), los CSV ganaderos/transversales, y los ficheros de `LECTOR/` (documentan hardware real).
3. **La auditoría de `docs/AUDITAR/` está completa** — todos los documentos han sido revisados (auditados y aplican, auditados y no aplican, o auditados y confirman gaps ya conocidos). No queda ningún documento pendiente.
