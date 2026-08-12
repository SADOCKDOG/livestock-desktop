# Librería de Componentes - Livestock Manager (Standard v4.8)

Este documento detalla el sistema de diseño unificado bajo el patrón **Aglutinadora** y el **Neon Branding**.

## Design Tokens (`css/styles.css`)

### Colores (Semántica OLED)
- **Oro Maestro:** `--p-gold` (#fbbf24) - Usado para identificadores primarios y títulos.
- **Éxito (Neon):** `--c-success` (#10b981) - Modo Híbrido, estados activos.
- **Peligro (Neon):** `--c-danger` (#ef4444) - Modo Carne, alertas, supresión.
- **Info (Neon):** `--c-info` (#3b82f6) - Modo Leche, censos, información técnica.
- **Aviso:** `--c-warning` (#f59e0b) - Enlaces de acción (Ficha ➔), estados pendientes.
- **Acento:** `--c-purple` / `--c-accent` (#8b5cf6) - Sanidad, genética.

### Tipografía (Escala Semántica)
- **Display:** `1.6rem` (KPIs masivos).
- **H1:** `1.25rem` (Cabeceras de módulo).
- **H2:** `1.05rem` (Títulos de tarjetas).
- **Label:** `0.75rem` (Uppercase, 900 weight).
- **Tiny:** `0.62rem` (Metadatos de registro).

## Componentes Estándar

### 1. Card de Resumen (`.card-resumen`)
Contenedor de KPIs superior en cada módulo.
- **Clase:** `card p-12 mb-14 border-222 card-total-3d card-resumen`.
- **Funcionalidad:** Incluye un botón `.resumen-toggle` para colapsar/expandir el cuerpo.

### 2. Card de Registro (`.card-registro`)
Tarjeta base para todos los listados de datos.
- **Estructura:** Flexbox con alineación `stretch`.
- **Contenido:** Icono SVG + Título Gold + Metadatos a la izquierda; Viñeta Iluminada + Acción "Ficha ➔" a la derecha.
- **Referencia:** Ver [PLANTILLA-CARD-REGISTRO.md](PLANTILLA-CARD-REGISTRO.md).

### 3. Filtros Integrados
Fila de controles situada entre el resumen y el listado.
- **Búsqueda:** `.search-input` (input de tipo search con icono lupa).
- **Selectores:** `.form-select-gold` (selectores temáticos con borde ámbar).

### 4. Botones de Acción Hub (`.widget-link-btn--neon`)
Botones de gran formato para navegación rápida o creación de registros.
- **Layout:** Icono SVG sobre etiqueta de texto en columna.
- **Variantes:** `.neon-danger`, `.neon-info`, `.neon-success`, `.neon-warning`, `.neon-accent`.

## Patrones de Interacción
- **Filtrado en Tiempo Real:** El `oninput` de los buscadores debe disparar funciones `_filtrar(texto)` que actualicen el DOM sin recarga completa.
- **Navegación de Ficha:** Todas las tarjetas de datos deben ser clicables hacia su vista de detalle (`#/animal`, `#/rebano`, `#/proveedor`, etc.).
- **Feedback:** Uso obligatorio de `Toast` (no-bloqueante) y `Confirm` (modales de sistema) sobre `alert/confirm` nativos.
