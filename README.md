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

- `cypress/screenshots/val-informe.txt` – contiene el log con viewport, el resultado del sembrado, el estado del DOM de cada captura y los **SHA‑256** de cada captura (solo como referencia).

### Cómo ejecutar la validación

El script necesita que la app esté servida en `http://localhost:8089`. Para ello, en una terminal aparte:

```bash
npm run serve
```

Después, ejecuta la validación:

```bash
node scripts/val-visual.cjs
```

El script crea (o actualiza) los archivos en `cypress/screenshots/` y escribe un informe. Revisa siempre visualmente las imágenes generadas para confirmar que la **sidebar** del ERP se muestra y que la vista de Gastos contiene el listado real de registros.

### Qué garantiza la validación (y qué NO)

La validación **no** se basa en comparar hashes. Un hash distinto entre capturas **no** prueba que sean vistas distintas: en una ejecución defectuosa las tres capturas retrataron la pantalla de bienvenida con una guía encima y aun así tenían hashes distintos. Por eso el script exige, **antes de cada captura**, una **condición de contenido** del DOM:

- **Dashboard:** la sidebar del ERP es visible (ancho real por `getBoundingClientRect` + estilo calculado, no un simple `"sidebar:true"`) y la ruta activa es la de Inicio.
- **Gastos:** el contenedor `#gasto-content` no está en estado de carga y contiene filas reales (`.card-registro` o `tbody tr` de `ErpDataTable`), con la ruta `#/explotacion?tab=gastos`.
- **Dashboard (vuelta):** sidebar visible de nuevo y ruta de Inicio.

Además, tras sembrar los datos demo se **verifica la finca activa**, se **desactivan y eliminan las guías** (22 catálogos), y se ejecuta un bucle de **estabilización** que espera a `Fincas.getActiveId()` firme y rellama `App.route()` para evitar la pantalla de bienvenida por condición de carrera. El informe final reporta `capturas validas: X/3` y `VALIDACION COMPLETA` / `VALIDACION INCOMPLETA`.

> Si una captura no cumple su condición de contenido, la validación se **aborta** (no produce captura falsa verde). Los hashes SHA‑256 solo se imprimen como referencia para detectar regresiones de render, no como puerta de éxito.

### Hashes de referencia (última ejecución válida, 3/3)

| Captura | Vista | Hash SHA‑256 |
| --------- | ------- | -------------- |
| `val-dashboard.png` | Inicio | `ce2ef998a2b33aee0bbaa70aa1ec23c79c371349deab7e6737f0b8455062aac9` |
| `val-gastos.png` | ExPro · Finanzas | `5b6d270c8eb37448545301eac0a81ac808c112396fd93e6b5c4b36487f0d71ff` |
| `val-dashboard2.png` | Inicio (vuelta) | `6255f6dfa9059412513157904730eca6f775ebe870f7ed27d606af78f8389164` |

<!-- Resto del README -->