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

<!-- Resto del README -->