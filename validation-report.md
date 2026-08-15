# Informe de validación Tauri (versión gratuita)

## Fallos técnicos identificados
- `link.exe` no encontrado al intentar compilar con MSVC.
- Bibliotecas del Windows 10 SDK no presentes, provocando error LNK1181: "no se puede abrir el archivo de entrada 'kernel32.lib'".
- `npm run build:free` y `tauri dev` fallan durante la fase de enlace.

## Observaciones UX (versión gratuita)
- Pantalla de inicio muestra botón "VERSIÓN GRATUITA · Actualiza a Premium" correctamente posicionado.
- Los carruseles de guías se redimensionan correctamente a 1280 × 800, 1440 × 900 y 1920 × 1080.
- Los elementos de la barra lateral y los sub‑menús se renderizan sin errores visuales.
- El buscador global mantiene el foco al iniciar y permite navegación fluida.
- Todas las vistas listadas (compradores, contratos, transportistas, etc.) muestran datos completos sin truncamiento.
- Los diálogos de edición/eliminación funcionan en las fichas de analítica.
- Los archivos de captura de pantalla validan que los breakpoints se adaptan correctamente.