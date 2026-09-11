# Livestock Desktop

App de escritorio nativa (**Tauri v2**) para Livestock Manager, distribuida como
paquete **MSIX** en Microsoft Store. El frontend no se escribe aquí: se
sincroniza desde `LIVESTOCK-MANAGER` (solo lectura) con `npm run sync`.

- Producto en la Store: **Livestock Manager PREMIUM**
- Identificador del paquete: `SdogFarmSoftwareFactory.LIVESTOCKMANAGER`
- Versión actual: la de `src-tauri/tauri.conf.json` (fuente única; `package.json`
  no se usa para versionar el producto)

## Estructura

```
livestock-desktop/
├── frontend/                     # Copia sincronizada desde LIVESTOCK-MANAGER (NO editar a mano)
│   └── js/
│       ├── mode-config.js        # Generado por los prebuild; no tocar
│       ├── mode-config-con-pago.js  # window.FREE_MODE = true
│       ├── mode-config-sin-pago.js  # window.FREE_MODE = false
│       └── services/
│           ├── soporte-store.js  # Compra del complemento vía WinRT
│           └── support-api.js    # Cliente del Worker de soporte
├── src-tauri/
│   ├── src/main.rs               # Comandos expuestos al WebView
│   ├── src/store_winrt.rs        # Store ID key y diálogo de compra (WinRT)
│   ├── gen/windows/bundle.config.json  # Publisher y firma del MSIX
│   └── tauri.conf.json           # productName, identifier y versión
├── scripts/
│   ├── sync-from-master.ps1      # Trae el frontend del máster
│   └── firma-local.inf           # Plantilla de certificado para firmar en local
└── cypress/                      # E2E y validación visual
```

## Cómo se compra el soporte

El WebView2 de Tauri **no** es una app instalada desde la Store, así que la
Digital Goods API rechaza la compra con «unsupported context». La única vía
disponible es **WinRT**, desde el proceso nativo. `src-tauri/src/main.rs` expone
dos comandos, ambos en un hilo aparte porque las llamadas de la Store bloquean y
bloquear el hilo principal congela la ventana:

| Comando | Para qué |
|---|---|
| `obtener_store_id_key(ticket, publisher_user_id)` | Acuña la Store ID key que el backend necesita para verificar la compra |
| `comprar_complemento(store_id)` | Abre el diálogo de compra del complemento |

El ticket de Entra ID lo acuña el backend (`POST /auth/ms/ticket` en
`livestock-manager-support-api`); la Store ID key resultante viaja a
`POST /auth/verify-purchase` con `plataforma: "windows"`. La app **nunca**
decide por su cuenta si la licencia es válida.

## Compilar

```bash
npm install
npm run sync          # trae el frontend desde LIVESTOCK-MANAGER
npm run dev           # desarrollo
```

### Modos de compilación

`mode-config.js` se **genera** en cada build a partir de uno de los dos ficheros
versionados. Los nombres de los scripts son históricos y engañan, así que lo que
manda es el valor de `FREE_MODE`:

| Script | Copia | Resultado |
|---|---|---|
| `npm run build:pago` / `build:free` | `mode-config-con-pago.js` | `FREE_MODE = true` |
| `npm run build:demo` / `build:premium` | `mode-config-sin-pago.js` | `FREE_MODE = false` |

### Paquete MSIX para la Store

```bash
npm run build:msix
```

Encadena `sync` → `prebuild:premium` (`FREE_MODE = false`) → limpieza de
`src-tauri/target/msix` → `tauri-windows-bundle build`. La limpieza previa no es
opcional: sin ella el empaquetado podía terminar sin producir ningún paquete y
aun así salir con código 0. `npm run postbuild:msix` comprueba que existe un
`.msixbundle` y falla si no.

El paquete que sale de aquí es el que se sube **al vuelo** en Partner Center. Ese
canal es distinto del de producción, que todavía sirve la PWA: son dos pantallas
diferentes y no se deben confundir.

### Firmar en local para probar el MSIX

El paquete que se sube a la Store lo firma Microsoft. Para instalarlo en la
propia máquina hace falta un certificado propio cuyo `Subject` coincida
**exactamente** con el `publisher` de `bundle.config.json`
(`CN=6DF46B94-A3DE-4E7D-97CE-9E29B31B5629`).

`New-SelfSignedCertificate` no sirve: genera la clave con un proveedor que
`signtool` no acepta. Hay que usar `certreq` con la plantilla incluida:

```bash
certreq -new scripts/firma-local.inf firma-local.req
```

Y al firmar desde un shell tipo MSYS/Git Bash hay que desactivar la conversión
de rutas, o `signtool` recibe la ruta traducida y falla:

```bash
MSYS_NO_PATHCONV=1 signtool sign /fd SHA256 /sha1 <huella> paquete.msixbundle
```

`signtool.exe` y `makeappx.exe` están en el SDK de Windows, bajo
`C:\Program Files (x86)\Windows Kitsin\<version>d\`.

Los campos `signing.pfx` y `signing.pfxPassword` de `bundle.config.json` están a
`null` a propósito y deben seguir así: el fichero está versionado, y por eso
`.gitignore` bloquea `*.pfx`, `*.cer` y `*.p12`.

## Sincronizar el frontend

```bash
npm run sync
```

En `scripts/sync-from-master.ps1`, una línea **activa** significa que ese fichero
se **preserva** (no se pisa con el del máster); comentada significa que se
sincroniza. Es al revés de lo que sugiere la intuición.

## Pruebas

```bash
npm run serve        # sirve frontend/ en http://localhost:8089
npm run test:e2e     # Cypress
node scripts/val-visual.cjs   # validación visual con capturas reales
```

### Validación visual

`scripts/val-visual.cjs` arranca Chrome a 1440x900, siembra los datos demo,
recarga para que la finca quede activa y captura Dashboard → Gastos → Dashboard.

**No se valida por hash.** Un hash distinto entre capturas no prueba que sean
vistas distintas: en una ejecución defectuosa las tres retrataron la pantalla de
bienvenida con una guía encima y aun así tenían hashes distintos. El script
exige, antes de cada captura, una **condición de contenido** del DOM:

- **Dashboard**: sidebar del ERP visible (ancho real por `getBoundingClientRect`
  más estilo calculado) y ruta de Inicio.
- **Gastos**: `#gasto-content` fuera del estado de carga y con filas reales
  (`.card-registro` o `tbody tr`), ruta `#/explotacion?tab=gastos`.
- **Dashboard (vuelta)**: sidebar visible y ruta de Inicio.

Si una captura no cumple su condición, la validación **se aborta** en vez de
producir una captura falsa en verde. Los SHA-256 se imprimen solo como
referencia para detectar regresiones de render.

## Nota histórica: el bug de Cypress

Los flags `--smoke-test` y `--ping` que rompían Cypress venían de una instalación
global obsoleta. Se resolvió borrando las cachés (`%LOCALAPPDATA%/Cypress`,
`%APPDATA%/Cypress`), `node_modules` y `package-lock.json`, fijando
`cypress@13.17.0` como dependencia de desarrollo y migrando la configuración a
`defineConfig` con `supportFile: false`.
