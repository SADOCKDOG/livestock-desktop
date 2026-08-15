# Livestock Desktop

App de escritorio nativa (Tauri v2) para Livestock Manager. El frontend se sincroniza desde LIVESTOCK-MANAGER (solo lectura) mediante subtree (bootstrap) + script de sync.

## Nueva funcionalidad

- Exportación nativa de PDF para traslados de animales, accesible mediante el wizard de traslado. Genera PDF con datos del traslado y guarda mediante diálogo nativo de Tauri (`invoke('fs::write')`). Muestra el toast **'PDF de traslado generado'** al completar.

<!-- Resto del README -->
