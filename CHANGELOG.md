# Changelog

All notable changes to this project will be documented in this file.

## [v4.9.0] - 2026-07-17
### Added
- **Interfaz Industrial Premium:** Rediseño completo optimizado para alta visibilidad en exteriores y pantallas OLED.
- **Rediseño de Asistentes (Wizards):** Optimización para operación en campo con una sola mano en registros de Censo, Crotales y Movimientos.
- **Tarjetas de Información Técnica:** Acceso directo a datos REGA y estados sanitarios por animal.
- **Centro de Informes Ampliado:** Nuevos tipos de informe para Compradores, Proveedores, Fitosanitarios y Alertas.

### Fixed
- **Generación de PDFs:** Solucionado el error de documentos en blanco en dispositivos de alta resolución mediante mejoras en el motor de renderizado (html2canvas + logical scaling).
- **Layout de KPIs:** Diseño responsive en vistas de Silos y Fitosanitarios para evitar desbordamiento de texto en pantallas pequeñas.
- **Compatibilidad Android 13/14:** Corrección de cierres inesperados al compartir informes y exportaciones (PDF/Excel).
- **Gestión Multi-Finca:** Mejoras de estabilidad y rendimiento en la navegación ExPro y sincronización de datos.

### Changed
- **Motor de Renderizado:** Implementación del Generador de PDF Industrial con barra de progreso animada y ajuste A4 perfecto.
- **Limpieza de Repositorio:** Modernización de la estructura de carpetas y eliminación de archivos redundantes.

## [v4.8.1] - 2026-06-29
### Fixed
- **Crash al compartir en Android 13/14:** corregido cierre inesperado de la aplicación al intentar compartir exportaciones (PDF, Excel, Informe general) en dispositivos con Android 13 (API 33) y Android 14 (API 34).
  - `SecurityException`: se especifica ahora `RECEIVER_EXPORTED` al registrar el `BroadcastReceiver` del plugin de compartir, requerido por Android 13+.
  - `IllegalArgumentException`: se usa un `Intent` explícito con `setPackage()` en el `PendingIntent` del chooser de compartir, evitando el conflicto entre `FLAG_MUTABLE` y `FLAG_IMMUTABLE` en Android 14+.

## [v4.5.3] - 2026-06-23
### Added
- **Trazabilidad individual:** la línea de tiempo del animal muestra ahora todos los datos del libro de tratamientos veterinarios (motivo, vía de administración, nº de animales tratados, lote, caducidad, veterinario prescriptor con nº colegiado y nº de receta).
- **Cuaderno Digital — listado de sanidad:** cada tratamiento muestra el motivo y la vía de administración junto al veterinario y la receta.

### Changed
- **Etiquetas legibles:** el listado, el PDF y el CSV del cuaderno y la trazabilidad muestran las etiquetas completas de motivo y vía (p. ej. «Intramuscular (IM)») en lugar de los códigos internos, mediante los nuevos helpers `getViaAdministracionLabel` y `getMotivoTratamientoLabel` de `ComunidadesService`.
- Service Worker: `corcho-v6.5.32` → `corcho-v6.5.33`.

## [v4.5.2] - 2026-06-23
### Added
- **Libro de Tratamientos Veterinarios (cumplimiento SIGGAN):** El wizard de Tratamiento Sanitario incorpora un segundo paso con los datos exigidos por el RD 1749/1998 y la tramitación SIGGAN:
  - Motivo/diagnóstico, vía de administración y nº de animales tratados.
  - Nº de lote y caducidad del medicamento.
  - Veterinario prescriptor (nombre + nº colegiado, autorrellenado desde la ADSG de la finca) y nº de receta.
  - Nuevos catálogos `VIAS_ADMINISTRACION` y `MOTIVOS_TRATAMIENTO` centralizados en `ComunidadesService`.
- **Cuaderno Digital:** la sección 4 (Sanidad) muestra y exporta a PDF los nuevos campos del libro de tratamientos.
- **Exportación CSV SIGGAN:** la sección TRATAMIENTOS incluye motivo, vía, animales tratados, lote, caducidad, veterinario, colegiado y nº de receta.

### Changed
- Service Worker: `corcho-v6.5.31` → `corcho-v6.5.32`.

## [v4.5.1] - 2026-06-17
### Added
- **Tour de inicio flotante en pantalla de bienvenida:** Wizard de 4 pasos que guía al usuario en sus primeros pasos.
  - Botón "💡 Primeros pasos" en la cabecera del asistente de configuración.
  - Paso 1: Descripción general de la aplicación.
  - Paso 2: Carga directa de la demo "Ganadería Chamorro" con feedback de progreso.
  - Paso 3: Acceso directo a los 8 manuales de usuario interactivos.
  - Paso 4: Resumen de opciones para empezar (importar, crear, demo, manuales).
  - Navegación Anterior/Siguiente/Comenzar con indicadores de paso.
  - Cierre mediante botón ✕, click en backdrop o botón final.
  - Diseño responsive oscuro con animación de entrada y blur.

## [v4.5.0] - 2026-06-18
### Added
- **Nuevo Generador de PDF Industrial:** Implementación de un motor de renderizado unificado para todos los documentos de la app.
  - **Barra de Progreso Animada:** Visualización del estado de generación (Recopilando, Procesando, Rasterizando).
  - **Ajuste A4 Perfecto:** Lógica de escalado a 800px para evitar cortes de texto y desbordamientos en móviles.
  - **Ubicaciones actualizadas:** Manuales, Cuaderno Digital, Albaranes, Facturas, Certificados y Pedido de Crotales.
- **Finca Demo "Chamorro" Ampliada:** Población completa de datos en los 12 módulos principales (Genealogía, DIBs, MOFA, Contabilidad).

### Changed
- Versión de app: v4.4.0 → v4.5.0
- Service Worker: corcho-v6.5.8 → corcho-v6.5.9
- README.md: Documentación exhaustiva de módulos y sección destacada de Onboarding.
- Limpieza de Directorio: Archivos innecesarios en la raíz de Android movidos a la carpeta Private/.

## [v4.4.0] - 2026-06-17
### Added
- **5 nuevos tipos de informe** en el Centro de Informes (14 tabs totales):
  - 🏢 **Compradores:** Ventas agrupadas por comprador, KPIs, top 5, PDF/Excel
  - 📦 **Proveedores:** Gastos agrupados por proveedor, doughnut de categorías, PDF/Excel
  - 🧪 **Fitosanitario:** Gastos fitosanitarios + línea temporal, tabla detallada
  - 🚨 **Alertas:** Alertas activas (sanitarias, trazabilidad, administrativas) con badges de urgencia
  - 🏠 **Por Finca:** Ficha completa de explotación + censo + resumen económico
- **3 nuevos métodos helper** en analitica.js: `obtenerResumenCompradores`, `obtenerResumenProveedores`, `obtenerGastosFitosanitarios`
- **Mejora en Informe Cárnico:** Sub-sección "Rentabilidad por rebaño" agrupando ventas por `snap_rebano`
- **Mejora en Informe Lácteo:** Sub-sección "Producción por rebaño" agrupando controles por `snap_rebano`
- **Exportación Excel:** +2 hojas (Compradores, Proveedores)
- **PDF export:** 5 nuevas secciones para los nuevos tipos de informe
- **Pantalla de Ajustes:** Logo de la app en lugar de texto, créditos del desarrollador (David Asuar Arteaga), enlace al repositorio GitHub, información de licencia

### Changed
- Versión de app: v4.3.0 → v4.4.0
- Service Worker: corcho-v6.5.7 → corcho-v6.5.8
- Manifest: v3.5.3 → v4.4.0
- package.json: v4.0.0 → v4.4.0
- README.md actualizado con nuevas funcionalidades
- Directorio raíz limpiado: archivos temporales movidos a Private/

## [v4.0.0] - 2026-06-04
### Added
- **Gestor de Pesada Industrial (v2.0):** Implementación completa de la interfaz de pesaje a pantalla completa solicitada por el usuario.
  - Indicador de peso gigante con **borde ROJO** prominente y sombra de estado.
  - Leyenda dinámica: *"Peso (KG) - ENTER para continuar"*.
  - Forzado de teclado numérico decimal (`inputmode="decimal"`).
  - Crotal del animal actual en color amarillo industrial gigante (2.8rem) en la cabecera.
- **Flujo de Pesaje por Lotes (Batch carousel):** 
  - Tabla inferior integrada con selección de compañeros del mismo rebaño y especie.
  - Lógica de carrusel: el sistema encola los animales seleccionados y avanza automáticamente al siguiente tras pulsar ENTER, limpiando la entrada de peso.
  - Modal de resumen de lote al finalizar el proceso.
- **Acceso Global de App:** Vinculación de `window.App = App` para asegurar que los controladores de eventos del DOM funcionen correctamente en entornos Android WebView.

### Changed
- El botón "⚖ REGISTRO / PESADA" de la Ficha Animal ahora lanza el nuevo Gestor Industrial en lugar del wizard de rebanos genérico.
- Incremento de `z-index` a 10000 para capas críticas de wizard para evitar solapamientos en dispositivos.

## [v3.9.0] - 2026-06-04
### Added
- **Flujo Industrial completo para módulo Animals** (`renderDetalleAnimal` como
  wizard full-screen). Campos: Crotal (input gigante + escaner), Especie, Sexo,
  Raza, Rebaño, Nacimiento, Tipo Alta, Notas, tabla de compañeros de rebaño.
- `_injectGlobalStyles()` — inyecta CSS industrial en arranque:
  `.wizard-full-screen`, `.btn-industrial`, `.badge-crotal`.
- `_validarCrotalUI()` — feedback visual: dorado si ES-prefijo, rojo si otro
  país, gris si demasiado corto.
- `_guardarAnimalDetalle()` — guarda el formulario industrial preservando el
  animal existente completo (`creadoEn`, `estado`, etc.).
- `_salirRegistro()` — sale con confirmación si hay cambios sin guardar.
- `renderGestorPesada()` — abre `PesajesUI.abrirWizard` desde la ficha.
- `_cargarReferenciaRebano()` — tabla de compañeros con su último peso.
- `_registrarPesadaIndividual()` — registro rápido de pesada via `Pesajes.registrar`.
- `_modalFinalIndividual()` — modal de confirmación con opción PDF.
- Estado `_animalGuardado` en el objeto `App`.

### Fixed
- **BUG CRITICO del flujo Industrial original:** `_guardarAnimalDetalle()` no
  guardaba `rebanoId`. Los animales creados tenían `rebanoId: null` y eran
  invisibles en `Animales.list()` (que sólo busca por rebanoId de cada rebaño).
  Solución: la función parte del objeto existente (preserva todos los campos) y
  lee `rebanoId` del selector añadido al formulario industrial.
- Botón ⚖ REGISTRO/PESADA correctamente deshabilitado para animales nuevos
  (gris, `pointer-events:none`) y activado tras guardar (rojo).

## [v3.8.0] - 2026-06-04
### Changed
- Integración completa UI/UX validada v3.3.9 con módulo Animals v3.5.3 y motor
  de pesajes v3.7.1 en un único controlador coherente.
- `renderDetalleAnimal` restaurado al layout de cards (header+nav visibles) con:
  escáner de crotales, campo Especie, botón pesaje vía `PesajesUI.abrirWizard`.
- `_crearAnimal` restaurado al wizard modal 2 pasos con escáner y filtrado de
  rebaños por especie.
- `renderAnimales` restaurado al diseño validado: `ID: {crotal}`, `📦 rebano |
  🧬 raza`, badge de estado.
- `renderDashboard` restaurado: Resumen Ganadero (ZONAS/REBAÑOS/ANIMALES) +
  Balance Económico Est.
- Nuevas rutas standalone `/leche` (`renderLeche`) y `/gastos` (`renderGastos`)
  extraídas del módulo unificado de Comercialización.
- Nav carousel ampliado a 9 ítems: Inicio · Rebaños · Zonas · Animales · Leche ·
  Ventas Carne · Gastos · Informes · Ajustes.
- `exportBackup` incluye ahora los 13 almacenes completos + metadatos `_meta`.
- Migración en segundo plano (`_ejecutarMigracionesFondo`) integrada en arranque.

### Fixed
- Typo en `_guardarAnimal`: `a-edit-rega` corregido a `a-edit-orig`.
- `rebanoId` ahora es nullable al guardar animal (no todos los animales tienen
  rebaño asignado en el momento del alta).

### Notes
- La UI validada (capturas v3.3.9, 2026-06-02) queda íntegramente restaurada.
- El módulo de pesajes (`pesajes.js` v4.0.0 / `pesajes-ui.js`) opera como overlay
  modal sobre el layout validado, sin romper la navegación.
- Pendiente de validación integral en dispositivo Android antes de tagging.

## [v3.7.1] - 2026-06-03
### Fixed
- **BUG CRÍTICO — Backup de restauración roto en modo sobrescritura:** La función
  `importarBackupData` en `trazabilidad.js` mezclaba el wrapper `idb` (que
  convierte `IDBRequest` en Promises) con la API nativa de callbacks
  (`.onsuccess`). Al llamar a `objectStore.clear()` sobre un store
  idb-envuelto, el retorno era una Promise; asignar `.onsuccess` a una Promise
  es un no-op, por lo que los datos se borraban pero nunca se repoblaban.
  Corregido desenvuelto del store con `window.idb.unwrap()` antes de ejecutar
  operaciones de callback nativo.
- **Exportación de módulo duplicada en `trazabilidad.js`:** Se eliminaba
  la asignación redundante `window.Trazabilidad = MotorTrazabilidad` que se
  había añadido por error; se mantiene la única exportación con comentario
  de compatibilidad.

### Notes
- El backup en modo "mezcla" (sin sobrescribir) ya funcionaba correctamente
  porque `objectStore.put()` idb-envuelto sigue generando IDBRequests nativos
  que la transacción rastrea internamente.
- Tras actualizar, realizar una prueba completa del ciclo exportar → importar
  con la opción "Sobrescribir" activa para verificar la corrección.

## [v3.3.9] - 2026-06-02
### Changed
- Normalize database field names for commercial records (carne/leche) to canonical camelCase keys.
  - carne: codigoICA, numeroGuia, codigoMatadero, pesoVivo, pesoCanal, rendimientoCanal, ivaPct, retencionPct, razonSocial, nifComprador.
  - leche: matriculaCisterna, numeroMuestraLetraQ, temperatura, certificadoInhibidores, precioBase.
- Runtime DB migration added (v4) to migrate existing records automatically on next app start.
- README and package.json updated to v3.3.9.

### Fixed
- Include built www/ assets in repository for immediate deployment.
- Improved albarán printing (A4) and added editable detalle modal for carne sales.
- Prevent wizard hang by parallelizing sanitary checks with per-check timeout.

### Notes
- The migration runs during IndexedDB open (DB version bumped to 4). It attempts to preserve original properties while adding canonical keys. No data is deleted.
- After updating, test typical flows: ventas masivas, abrir/editar albaranes, descargar PDF, and verify stored records show canonical fields.

