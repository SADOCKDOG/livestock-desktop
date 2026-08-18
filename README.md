# Livestock Desktop

App de escritorio nativa (Tauri v2) para Livestock Manager. El frontend se sincroniza desde LIVESTOCK-MANAGER (solo lectura) mediante subtree (bootstrap) + script de sync.

## Solución al bug de Cypress

Los flags `--smoke-test` y `--ping` que provocaban errores al ejecutar Cypress fueron causados por una instalación global obsoleta. La solución consistió en:

1. **Eliminar cachés y dependencias obsoletas**

   ```bash
   rm -rf "%LOCALAPPDATA%/Cypress" "%APPDATA%/Cypress" node_modules package-lock.json
   npm install cypress@13.17.0 --save-dev
   ```

2. **Configurar Cypress local en `cypress.config.js`**  
   - Se migró la configuración al nuevo formato (`defineConfig`).  
   - Se desactivó `smokeTest` y `ping` mediante `supportFile: false` y la ausencia de dichos flags en el script de npm.

3. **Ejecutar la suite E2E validada**  
   ```bash
   npm run test:e2e
   ```

   La prueba `cypress/integration/gastos-column-selector.spec.js` ahora pasa correctamente, verificando la persistencia de preferencias en `localStorage`.

Con estos pasos el proyecto queda libre de la inyección de flags globales y listo para continuar con la siguiente historia de usuario.

## Validación visual con capturas reales

En este proyecto se han añadido scripts de validación visual que capturan pantallas reales del frontend ERP usando ChromeHeadless a través del MCP. El proceso asegura que se capture la UI de escritorio (sidebar) y no el layout móvil, y genera hashes SHA‑256 para comparar regresiones.

### Scripts

- `scripts/val-visual.cjs` – arranca Chrome con `--window-size=1440,900 --force-device-scale-factor=1`, espera a que la aplicación cargue, desactiva las guías interactivas y captura tres pantallas clave:
  1. Dashboard inicial.  
  2. Vista de **Gastos** después de la navegación.  
  3. Dashboard tras volver al inicio.

- `scripts/val-informe.txt` – contiene el log con viewport, número de guías registradas, y los **SHA‑256** de cada captura.

### Cómo ejecutar la validación

```bash
node scripts/val-visual.cjs
```

El script crea (o actualiza) los archivos en `cypress/screenshots/` y escribe un informe con los hashes. Estos hashes se usan como referencia para detectar cambios visuales no deseados.

### Próximos pasos

- Revisar visualmente las imágenes generadas para confirmar que la **sidebar** del ERP se muestra correctamente.  
- Actualizar este README con el proceso completo y cualquier ajuste de configuración que se necesite.  
- Mantener los hashes bajo control en futuros commits para facilitar detección de regresiones visuales.  
- Documentar el flujo en el backlog del proyecto para incluirlo en la definición de “Definition of Done” de las historias relacionadas con la UI.

<!-- Resto del README -->