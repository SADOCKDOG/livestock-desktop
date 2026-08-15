# Livestock Desktop

App de escritorio nativa (Tauri v2) para Livestock Manager. El frontend se sincroniza desde LIVESTOCK-MANAGER (solo lectura) mediante subtree (bootstrap) + script de sync.

## Nueva funcionalidad

- Exportación de listados e informes (CSV, PDF, Excel) vía `ExportService` (`frontend/js/services/export-service.js`): descarga directa del WebView al navegador (blob), sin diálogo nativo de Tauri (no hay `tauri-plugin-dialog`/`fs` ni comandos en `main.rs`). El wizard de traslado no genera PDF.

<!-- Resto del README -->
