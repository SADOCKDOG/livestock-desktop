# ADSG WEB (SIGGAN, Junta de Andalucía) — Flujos y estructura

**Fuente**: `docs/AUDITAR/ADS005E_MUS_Manual_Usuario_0100.pdf` — "ADSG WEB, Manual de Usuario", Consejería de Agricultura, Pesca y Desarrollo Rural, v0100, 02/03/2015, 345 páginas.
**Relacionado**: [NORMATIVA-CROTAL-ESPECIE.md](NORMATIVA-CROTAL-ESPECIE.md), [el-sistema-de-identificacion-crotal.md](el-sistema-de-identificacion-crotal.md), [CUMPLIMIENTO_SIGGAN.md](CUMPLIMIENTO_SIGGAN.md).

## Qué es

ADSG WEB es el sistema (canal web) mediante el cual las ADSG (Agrupaciones de Defensa Sanitaria Ganadera) consultan y operan sobre **SIGGAN** (Sistema Integrado de Gestión Ganadera de Andalucía) en nombre de los ganaderos: Registro de Explotaciones, Titulares y Animales, Control de Movimientos Pecuarios y Saneamiento Animal. Es la referencia más directa que tenemos del backend/modelo de datos real con el que Livestock Manager debería poder interoperar (import/export de ficheros, formatos de crotal, catálogos).

## Objetivo y alcance del documento (auditoría dedicada, 2026-07-21)

**Objeto (1.1, pág. 4)**, cita textual: *"Con el fin de facilitar y mejorar los servicios que las ADSG ofrecen a los ganaderos, se propone la realización de un Sistema de Gestión, basado en tecnología WEB, que permita al profesional de la ADSG realizar las consultas y procesos necesarios sobre el sistema SIGGAN."*

**A quién va dirigido (1.2, pág. 4)**: dos perfiles declarados — las **ADSG** (gerentes, colaboradores, técnicos) y el **Sector Ganadero** (usuario final). El cuerpo del manual revela un **tercer perfil no mencionado en el índice de alcance**: el **Veterinario**, con su propio "Menú Principal Veterinarios" separado (pág. 80/81, 259/260, ~434), que solo puede operar (crear/modificar serologías) en explotaciones donde consta como responsable sanitario (2.5.3.1.2.4, pág. 81). Es un modelo de permisos por rol + por especie que Livestock Manager no tiene (app mono-usuario, sin roles) — no se recomienda implementarlo salvo que el alcance cambie a app multiusuario.

**Qué cubre y qué NO (1.3, pág. 4-5)**: Registro de Explotaciones/Titulares/Animales, Control de Movimientos, Saneamiento — declara explícitamente *"no siendo el objetivo de esta aplicación aportar ni sustituir ninguna de las funcionalidades existentes"* de SIGGAN (1.3.1). Cubre 5 especies con sección operativa propia: Avícola, Porcino, Bovino, Pequeño Rumiante, Cunícola. **Equino NO tiene sección operativa propia** en este manual (aparece solo como rama del menú de Informes, sin desarrollo funcional) — confirma que el vacío de equino en Livestock Manager no es estar "por detrás" de SIGGAN, el propio SIGGAN de 2015 tampoco lo tenía resuelto ahí.

## Mapa completo de navegación

```
1. Descripción del sistema
   1.4 Mapa del sistema (navegación por especie: Bovino, Porcino, Avícola, Pequeños Rumiantes, Cunícola)
       — ver árbol completo de las 6 Unidades Productivas en la sección siguiente

2. Operativa del sistema
   2.1 Anexos para Informes
   2.2 Favoritos
   2.3 Registro General (no filtra por especie)
       2.3.1 Registro: Explotaciones normales | Mataderos | Plaza de toros
       2.3.2 Consultas: Titulares y titularidad | Explotaciones nacionales (búsqueda por explotación / provincia-municipio / nombre-dirección)
       2.3.3 Informes: ADSG | Titulares | Explotaciones/UP | UP sin coordenadas | Explotaciones que no cumplen vacunación Lengua Azul
       2.3.4 Gestión ADSG: Datos de ADSG | Usuarios del perfil | Asociar/Desvincular UP | Histórico asociación-desvinculación | Traspaso de Identificaciones Ganaderas

   2.4 Avícola
       Registro: Datos generales | Estructura | Histórico | Datos Sanitarios
       Movimientos pecuarios: Gestión | Crear Salida | Crear Entrada
       Datos sanitarios: Analíticas Sanitarias
       Informes: Registro | Movimientos

   2.5 Porcino
       Registro: Datos generales | Estructura | Histórico | Saneamiento
       Datos Sanitarios: Controles Serológicos + Hoja de Remisión de Muestras | Gestión de Vacunas
       Movimientos pecuarios: Gestión | Crear guía | Notificación de Llegada
       Informes: Registro | Sanitarios | Movimientos

   2.6 Bovino
       Registro: Datos generales | Estructura | Animales | Filiaciones | Histórico
       Consultas: Relación madres-hijos (explotaciones normales) | Relación madre-hijo (explotaciones de lidia)
       Movimientos pecuarios: Gestión | Crear guía | Histórico de movimientos de un animal | Histórico fuera de Andalucía
       Datos Sanitarios: Gestión de saneamientos + Hoja de Remisión | Explotaciones que pierden calificación | Histórico calificaciones | Histórico saneamientos | Gestión de Vacunas | Consulta de Vacunas por crotal | Previsión de visitas sanitarias
       Informes: Registro | Sanitarios | Movimientos

   2.7 Pequeño rumiante (ovino/caprino)
       Registro: Explotaciones | Identificación individual (carga de ficheros, histórico, consulta de localización por crotal) | Recensado (carga de ficheros, histórico)
       Movimientos pecuarios: Gestión
       Datos sanitarios: Histórico calificaciones | Explotaciones que pierden calificación | Actas de indemnización | Gestión de Vacunas | Consulta de Vacunas por crotal | Gestión de Serologías por lotes | Previsión de visitas sanitarias
       Informes: Registro | Sanitarios | Movimientos

   2.8 Cunícola
       Registro: Datos generales | Estructura | Históricos
       Informes: Censos y capacidades máximas

3. Anexos: Ref. Proceso/Requisito | Ref. Proceso/Validación | Incidencias frecuentes | Mensajes de error (extenso, ~4800 líneas de texto extraído — pendiente de revisar en detalle si hace falta mapear códigos de error concretos) | Términos y acrónimos | FAQ | Ayudas
4. Glosario
5. Bibliografía
```

## Árbol completo del punto 1.4 "Mapa del sistema" (auditoría dedicada, 2026-07-21)

Texto introductorio del propio manual (pág. 5), cita: *"Desde este punto se podrá acceder a cada una de las especies que conforman el alcance del proyecto [...] También se accederá a un punto de carácter global, denominado Registro General, cuyas consultas no tendrá en cuenta la especie [...] Una vez localizadas las Explotaciones Ganaderas del cual se quiere actuar, se podrá acceder al grupo de pantallas que forma la estructura de las Unidades Productivas [...] según la especie que representa."* — es decir, el manual declara explícitamente que la navegación de "Unidades Productivas" está estructurada por especie, un árbol de menú distinto para cada una. Diagramas extraídos por rasterizado (no eran texto seleccionable), págs. 6-11.

### 1.4.1 Unidades Productivas — BOVINO (pág. 6)
```
BOVINO
├── Generales: Titulares | Responsables Sanitarios | Datos Geográficos | Censos "actuales" | Otros
├── Estructura: Instalaciones | Sistemas | Características | Ganadería Integrada | Controles
├── Animales: Búsqueda Animales
├── Filiaciones: Explotaciones Normales | Explotaciones de Lidia
└── Históricos: Restricciones
```

### 1.4.2 Unidades Productivas — PORCINO (pág. 7)
```
PORCINO
├── Generales: Titulares | Responsables Sanitarios | Capacidades y Censos | Datos Sanitarios | Geográficos y Otros
├── Estructura: Instalaciones | Gestión | Purines/Estercolero | Ganadería Integrada | Controles
├── Saneamiento: Hco. Vacunaciones
└── Históricos: Calificaciones | Censos | Capacidades | Restricciones
```

### 1.4.3 Unidades Productivas — AVÍCOLA (pág. 8)
```
AVÍCOLA
├── Generales: Titulares | Responsables Sanitarios | Capacidades y Censos | Geográficos/Otros
├── Estructura: Instalaciones | Ganadería Integrada | Controles
├── Históricos: Censos | Naves | Capacidades | Restricciones
└── Saneamiento: Analíticas
```

### 1.4.4 Unidades Productivas — PEQUEÑOS RUMIANTES (pág. 9)
```
PEQUEÑOS RUMIANTES
├── Generales: Titulares | Responsables Sanitarios | Datos Geográficos | Censos | Datos Sanitarios | Otros
├── Estructura: Instalaciones | Gestión | Purines/Estercoleros | Ganadería Integrada | Controles
├── Animales: Identificación | Titular | Otros
├── Históricos: Calificaciones | Censos | Restricciones
└── Saneamiento: Indemnización | Vacunaciones
```

### 1.4.5 Unidades Productivas — CUNÍCOLA (pág. 10)
```
CUNÍCOLA
├── Generales: Titulares | Responsables Sanitarios | Capacidades y Censos | Geográficos/Otros
├── Estructura: Instalaciones | Gestión | Purines/Estercolero | Ganadería Integrada | Controles
└── Históricos: Censos | Capacidades
```

### 1.4.6 Informes (pág. 11)

Diagrama distinto: Menú Principal con 7 ramas de primer nivel — **Registro General, Bovino, Porcino, Avícola, Pequeño Rumiante, Equinos, Cunícola** — cada una con Registro/Sanitarios/Movimientos, alimentando informes concretos (Fichas de Titulares, Explotaciones por Localización, Histórico de Censos y Capacidades Máximas, Movimientos de Entrada/Salida, Vacunas por especie, Crotales Entregados y Asignados, Total de Animales Investigados, etc.).

**Hallazgo**: "Equinos" aparece aquí como rama de primer nivel en pie de igualdad con las demás especies, pero **no tiene ningún subpunto 1.4.x dedicado** ni sección 2.x de "Operativa" en el índice completo del manual — confirma lo anotado en la sección "Objetivo y alcance" arriba.

### Comparación de gap código-vs-1.4 (tabla resumida — detalle completo en memoria de sesión)

El patrón general: los nodos **"Generales"** y **"Animales/Identificación"** son casi idénticos entre las 5 especies y casi todos tienen equivalente razonable en Livestock Manager (Titulares → `js/fincas.js` campo `propietario`, parcial; Censos → `js/views/ganaderia-view.js`; Identificación → modelo especie/tipo-identificador ya implementado). El gap real y sistemático está en el nodo **"Estructura"**:

| Subnodo "Estructura" | Especies donde aparece | Estado en Livestock Manager |
|---|---|---|
| Instalaciones | Las 5 | **Gap total** — no existe modelo de instalaciones físicas (naves, corrales) en `js/fincas.js` |
| Purines/Estercolero | Porcino, Cunícola, Pequeños Rumiantes | **Gap total** — 0 resultados en todo el repo |
| Ganadería Integrada | Las 5 | **Gap total** — concepto de empresa integradora/ganadero integrado no existe |
| Sistemas/Características | Bovino | **Gap total** |
| Controles (visitas oficiales) | Las 5 | **Gap total**, salvo solape parcial con Sanidad |

Otros gaps puntuales fuera de "Estructura": **Datos Geográficos** (latitud/longitud, gap total en `js/fincas.js`), **Históricos → Restricciones** (Bovino/Porcino/Pequeño Rumiante — estado operativo de "explotación restringida", hoy `js/saneamientos.js` solo tiene `calificacion`, no un flag de restricción), **Saneamiento → Indemnización** (solo Pequeño Rumiante — régimen de sacrificio obligatorio indemnizado por brucelosis, gap total), **Históricos → Naves** (solo Avícola — unidad productiva relevante ahí no es el animal individual sino la nave/lote, coherente con el patrón ya conocido de "tandas de cebo"), **Filiaciones → Explotaciones de Lidia** (Bovino — Livestock Manager tiene genealogía madre-cría genérica pero sin distinguir tipo de explotación "lidia").

**Conclusión de la auditoría**: NO se justifica reestructurar Livestock Manager en módulos separados por especie (el coste de duplicar Generales/Animales, que ya son genéricos y funcionan, no compensa). Sí es accionable y de bajo riesgo: (1) sub-modelo "Instalaciones" en finca con campos condicionados por tipo de explotación, (2) campo latitud/longitud en finca, (3) flag "restricción de movimientos" en saneamientos. Si el alcance se amplía a porcino/avícola industrial, sí tendría sentido una unidad de agrupación por encima del animal individual (nave/lote) — ya anticipado por el concepto de tandas de cebo.

### Veredicto final sobre los 5 gaps restantes de la tabla "Estructura" (2026-07-22)

Los 3 puntos recomendados arriba ya están implementados (ver `PLAN-MEJORA-SIGGAN.md` punto 5). Los 5 gaps restantes de la tabla, que la auditoría original dejó sin veredicto explícito, se evaluaron uno a uno:

| Gap | Veredicto | Motivo |
|---|---|---|
| **Sistemas/Características** (Bovino) | ✅ **Implementado** (2026-07-22) | No era un gap nuevo — el campo `sistema_explotacion` de finca ya existía y se usa en `wizard-finca.js`/informes/cuaderno, pero `SISTEMAS_EXPLOTACION` (`comunidades-service.js`) solo tenía 3 de los 7 valores oficiales del catálogo SIEX `Sistema productivo.csv`. Se completó a los 7 valores (Intensivo/Extensivo/Mixto/Estante/Trashumante/Semiextensivo/No extensivo), sin migración de datos (mismos valores en minúscula, compatible con lo ya guardado). |
| **Purines/Estercolero** (Porcino/Cunícola/Pequeño Rumiante) | ❌ **Descartado** | Es el Plan de Producción y Gestión de Estiércoles (PPGE), un documento de cumplimiento completo (dimensiones/coordenadas de balsas y estercoleros) solo obligatorio para explotaciones intensivas por encima de umbrales de producción. No existe ni un tipo "Estercolero" en el catálogo curado de `instalaciones_tipo` (36 tipos) — sin punto de enganche natural. Mismo razonamiento que el gap "Subexplotación": complejidad de administración pública sin valor claro para el día a día de una explotación no intensiva. El catálogo `Tratamiento de estiércoles.csv` (9 valores) queda auditado y sin incorporar. |
| **Ganadería Integrada** (las 5 especies) | ❌ **Descartado por ahora** | Es una relación contractual (empresa integradora que aporta pienso/animales al ganadero bajo contrato). El catálogo `Datos de la integradora comercial.csv` (1503 filas) es un directorio de empresas, no un catálogo operativo — mismo tratamiento que `Asociación de razas.csv`. Sin caso de uso concreto identificado. Revisable si aparece un caso de uso real. |
| **Controles** (visitas oficiales, las 5 especies) | ❌ **Descartado** | En el manual solo aparece como etiqueta de menú (nodo de nivel 1.4), sin operativa desarrollada ni en las secciones auditadas a fondo (Bovino, Pequeño Rumiante). Sin especificación suficiente de qué campos captura (¿fecha? ¿inspector? ¿tipo de control? ¿resultado?) para poder modelarlo con criterio. |
| **Saneamiento → Indemnización** (Pequeño Rumiante) | ❌ **Descartado por ahora** | Depende directamente de la granularidad individual de saneamientos (nº tubo + resultado por animal, ver `PLAN-MEJORA-SIGGAN.md` punto 6) — sin esa base no se puede saber qué animal concreto indemnizar. Diferido junto con ese punto. |

## Flujos detallados (leídos a fondo — los más relevantes para Livestock Manager)

### Registro General (2.3)

Tres tipos de explotación consultables: **normales**, **mataderos**, **plaza de toros** — filtrables por explotación/provincia/comarca/municipio, con búsqueda por prefijo de código. Las consultas de "Explotaciones nacionales" (bovino) tienen tres modos: por código nacional directo, por provincia/municipio, o por nombre/dirección (esta última solo para explotaciones de Andalucía). Para explotaciones fuera de Andalucía, SIGGAN no dispone de dirección/nombre/clasificación zootécnica.

### Identificación individual — Pequeño Rumiante (2.7.2.2)

**Esta es la pieza más directamente aplicable al trabajo de crotal.**

- **Carga de ficheros**: registra en SIGGAN animales identificados individualmente mediante un fichero de texto plano, un animal por línea, campos separados por `;`, **sin espacios ni retornos de carro tras el último `;`**. Nombre final en servidor: `WEB_ADSG_USR_{CODADSG}_{AAAAMMDDHHmm}.TXT`.

- **Estructura exacta del fichero** (idéntica para identificación individual y recensado):
  ```
  ID;Iden_elec;Pais;NumExplo;FNaci;FId;Espe;Espe_ID;Dupli;Raza;Tipo_Iden;Tec;Cr;Sexo;Cebo
  ```
  Ejemplo real del manual:
  ```
  010001453377;8200B50254221141;0724;ES230020000723;06-01-01;08-07-30;04;2;0;9;02;75553636Q;;2;0
  ```
  Interpretación de campos (deducida del ejemplo y el contexto):
  | Campo | Ejemplo | Significado |
  |---|---|---|
  | `ID` | `010001453377` | Código de crotal (12 dígitos) |
  | `Iden_elec` | `8200B50254221141` | Identificación electrónica, **16 caracteres hexadecimales** |
  | `Pais` | `0724` | Código de país **numérico ISO 3166-1** (724 = España), no "ES" |
  | `NumExplo` | `ES230020000723` | Código REGA de la explotación |
  | `FNaci` | `06-01-01` | Fecha de nacimiento (AA-MM-DD) |
  | `FId` | `08-07-30` | Fecha de identificación (AA-MM-DD) |
  | `Espe` | `04` | Código de especie — coincide con el catálogo oficial `ESPECIE_ANIMAL` del FEGA (ver [NORMATIVA-CROTAL-ESPECIE.md](NORMATIVA-CROTAL-ESPECIE.md); 04 = Caprino) |
  | `Espe_ID` | `2` | Subtipo/variedad de especie |
  | `Dupli` | `0` | Indicador de duplicado |
  | `Raza` | `9` | Código de raza |
  | `Tipo_Iden` | `02` | Código de tipo de identificador — coincide con el catálogo oficial `RIIA_TIPO_IDENTIFICADOR` (02 = Bolo ruminal) |
  | `Tec` | `75553636Q` | NIF del técnico/veterinario responsable |
  | `Cr` | (vacío en el ejemplo) | Campo adicional sin confirmar |
  | `Sexo` | `2` | Código de sexo — catálogo `RIIA_SEXO` |
  | `Cebo` | `0` | Indicador de animal de cebo |

  **Esto confirma y cierra el modelo especie→tipo de identificador→código** descrito en NORMATIVA-CROTAL-ESPECIE.md: el propio fichero de intercambio de SIGGAN lleva el código de especie y el código de tipo de identificador como campos explícitos, exactamente el diseño que se propuso allí.

- **Consulta de Localización de Animal por crotal**: el sistema acepta el identificador en **tres formatos**, confirmando (y ampliando) los formatos de crotal ya documentados:
  1. **Formato normal, 14 caracteres** — coincide exactamente con `ES` + 2 dígitos CC.AA. + 10 dígitos individuales = 14 caracteres, ya documentado en NORMATIVA-CROTAL-ESPECIE.md.
  2. **Identificación electrónica agrupada, 20 caracteres** (formato con separadores, estándar ISO 11784/11785 "legible").
  3. **Formato hexadecimal, 16 caracteres** — coincide con el campo `Iden_elec` del fichero de arriba.

### Recensado — Pequeño Rumiante (2.7.2.3)

Mismo formato de fichero que identificación individual. Parámetros de carga: fecha de lectura, explotación destino, **porcentaje** de animales leídos (100% o parcial), especies a considerar.

Lógica de negocio del procesamiento (importante si se quiere generar/consumir ficheros compatibles):
- Si se declara **100%** de la explotación: los animales que SIGGAN tiene localizados ahí y **no** aparecen en el fichero pasan a estado **DESAPARECIDO**.
- Animal **muerto**: no se modifica (revivir requiere trámite en la OCA).
- Animal **desaparecido** que aparece en el fichero: reaparece automáticamente en la explotación indicada.
- Animal localizado en **otra explotación** que aparece en este fichero: desaparece de la de origen y reaparece en la nueva (movimiento implícito).
- Si el animal no existe aún en SIGGAN, se da de alta con los datos del fichero (fecha nacimiento, sexo, especie, raza); si ya existe, **no se modifican sus datos**, solo su localización/estado.

### Animales y Filiaciones — Bovino (2.6.2.3, 2.6.2.4)

- Estados de animal observados: **Localizados, Desaparecidos, Devueltos, Muertos en explotación** (filtros de pestaña sobre el listado de animales de una Unidad Productiva).
- Búsqueda de crotal por prefijo (autocompletado).
- **Filiaciones**: relación madre-hijo navegable por crotal, con distinción entre explotaciones normales y explotaciones de lidia. Si se busca la madre de un animal no registrado en SIGGAN, se muestra un aviso (no es un error duro).

## Pendiente de revisar

- Sección completa de "Mensajes de error" (3.4) — muy extensa (~4800 líneas de texto extraído), no revisada en detalle; podría aportar validaciones de negocio adicionales si se necesita en el futuro.
- Detalle operativo (2.x, más allá del mapa 1.4) de Avícola, Porcino y Cunícola — el árbol de navegación (1.4) ya está completo (ver sección dedicada arriba), pero los flujos paso a paso de esas 3 secciones no se han leído a fondo como sí se hizo con Bovino/Pequeño Rumiante. Retomar si el alcance de la app se amplía a esas especies.
- Formato exacto de fichero de "Carga de ficheros" para Bovino (si existe una sección equivalente) y para Movimientos/Guías — no localizado aún en esta pasada.
- Plan de implementación completo y priorizado de todos los gaps de este documento (y de los otros 5 auditados en la misma sesión) en [PLAN-MEJORA-SIGGAN.md](PLAN-MEJORA-SIGGAN.md).
