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

- `scripts/val-visual.cjs` – arranca Chrome con `--window-size=1440,900 --force-device-scale-factor=1`, espera a que la aplicación cargue, **siembra los datos demo** (`AsistenteConfiguracion._ensureSeedData()` + `SeedData.run(true)`), recarga la página para que la finca quede activa, y captura tres pantallas clave:
  1. Dashboard inicial (tras el sembrado).  
  2. Vista de **Gastos** después de la navegación.  
  3. Dashboard tras volver al inicio.

- `cypress/screenshots/val-informe.txt` – contiene el log con viewport, el resultado del sembrado, el estado del DOM de cada captura (sidebar presente, pestaña activa, FAB), y los **SHA‑256** de cada captura.

### Cómo ejecutar la validación

El script necesita que la app esté servida en `http://localhost:8089`. Para ello, en una terminal aparte:

```bash
npm run serve
```

Después, ejecuta la validación:

```bash
node scripts/val-visual.cjs
```

El script crea (o actualiza) los archivos en `cypress/screenshots/` y escribe un informe con los hashes. Estos hashes se usan como referencia para detectar cambios visuales no deseados: **si dos capturas comparten hash, la validación lo señala** y detiene la ejecución.

### Hashes de referencia (última ejecución válida)

| Captura | Vista | Hash SHA‑256 |
| --------- | ------- | -------------- |
| `val-dashboard.png` | Inicio | `c77ed6892c14f82f5a0f091027269b1c996d4c6da666c8b5637facc81148c0d9` |
| `val-gastos.png` | ExPro · Finanzas | `352268cee800ed423cadd9d9032c84cec3ef2d65f9b91aacbed22ac4caa3e423` |
| `val-dashboard2.png` | Inicio (vuelta) | `2a8186b1e5a303ebc46cc41aced6e662565131e6416bce0d8c8dc5f8c2a4d91f` |

> Los hashes cambian en cada ejecución si hay cualquier variación de render; lo importante es que las **tres capturas tengan hashes distintos** (tres vistas diferentes) y que el informe muestre `erpSidebar:true` en cada una.

### Próximos pasos

- Revisar visualmente las imágenes generadas para confirmar que la **sidebar** del ERP se muestra correctamente.  
- Mantener los hashes bajo control en futuros commits para facilitar detección de regresiones visuales.  
- Documentar el flujo en el backlog del proyecto para incluirlo en la definición de “Definition of Done” de las historias relacionadas con la UI.

<!-- Resto del README -->