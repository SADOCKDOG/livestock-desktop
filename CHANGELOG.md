## [Unreleased] - 2026-08-15

### Fixed
- `export-service.js`: eliminado `import { invoke }` de `@tauri-apps/api` (SyntaxError en script clásico), restaurado el escape XML (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`) y completados los alias de especie.
- `wizard-traslado.js`: eliminada la declaración duplicada de `rebanosConAnimales` (SyntaxError) y el bloque de PDF que usaba `html2pdf` + `invoke('fs::write')`.

### Removed
- Generación de PDF en el wizard de traslado: dependía de un comando Tauri inexistente (`invoke('fs::write')`); no hay `tauri-plugin-dialog` ni `tauri-plugin-fs`, por lo que el guardado de exportaciones es descarga blob del WebView.