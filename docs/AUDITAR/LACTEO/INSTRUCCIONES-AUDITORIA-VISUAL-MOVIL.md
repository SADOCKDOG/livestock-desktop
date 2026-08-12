# Instrucciones — Auditoría visual móvil (Android vertical) del módulo lácteo

## Objetivo

Verificar visualmente, en un terminal Android real en orientación vertical, que los cambios de los PRs #86, #88 y #90 (auditoría del módulo lácteo, cerrada 2026-07-25) se ven y funcionan correctamente. La verificación funcional (datos, cálculos, persistencia) ya se hizo con datos reales en navegador de escritorio — lo que falta es la capa que el escritorio no puede probar: **layout en pantalla estrecha, WebView real de Android (Capacitor), y edge-to-edge**.

No repitas la verificación funcional (ya hecha). Concéntrate en: ¿se ve bien?, ¿cabe todo?, ¿es usable con el pulgar?, ¿hay overflow horizontal, texto cortado, botones solapados o inaccesibles bajo la barra de navegación?

## Contexto importante antes de empezar

- La app es **mobile-first para Android en WebView** (Capacitor). El código fuente vive en la raíz del repo; `www/` es la carpeta generada (no editar directamente, se regenera con `npm run build`).
- **Cache-first Service Worker**: si pruebas contra una build ya instalada en el dispositivo/emulador y no ves los cambios, es casi seguro el SW sirviendo una versión cacheada. Antes de dar un hallazgo por "no corregido", fuerza `npx cap sync` + desinstala/reinstala la app, o borra datos de la app en Ajustes Android, o purga el Service Worker manualmente (`navigator.serviceWorker.getRegistrations()` + `caches.delete()` vía consola remota).
- **Edge-to-edge**: la app usa `viewport-fit=cover` + `setDecorFitsSystemWindows(false)` nativo. Presta atención a que ningún FAB, toast o wizard quede oculto tras la barra de gestos/navegación de Android.

## Paso 0 — OBLIGATORIO: confirmar que el terminal tiene el código correcto instalado

Antes de auditar nada, verifica que la APK instalada en el dispositivo/emulador conectado **se compiló después** de los 4 PRs de esta auditoría (`#86`, `#87`, `#88`, `#90` — HEAD actual de `master` es `aa937e1`). Sincronizar los assets web (`cap sync`) no es suficiente: si la APK no se recompiló y reinstaló después del último sync, el WebView puede seguir sirviendo código antiguo aunque los ficheros en disco ya estén al día.

Cómo confirmarlo (elige una):
1. **Más fiable**: fuerza una recompilación + reinstalación completa ahora mismo, no asumas que la build existente ya es la correcta:
   ```bash
   git log -1 --oneline          # confirma que estás sobre aa937e1 o posterior
   npm run cap:sync:free         # o cap:sync:premium según variante
   npx cap run android           # recompila e instala en el dispositivo/emulador conectado
   ```
2. **Verificación rápida sin recompilar**: abre la consola remota del WebView (vía `chrome://inspect`, ver Opción A abajo) y ejecuta:
   ```js
   window.ExplotacionLacteaView.renderControl.toString().includes('AnaliticaLecheWizard')
   ```
   Debe devolver `true`. Si devuelve `false` o lanza error, el WebView tiene código viejo — para y pide recompilar/reinstalar antes de seguir.
3. Ten en cuenta también el **Service Worker cache-first** (ver más abajo) — puede servir una versión vieja incluso con la APK recién instalada, si no se purgó la cache anterior.

Sobre la base de datos demo que acabas de cargar: `DB_VERSION` está en 26 (ya incluye el módulo Letra Q de la Fase 8, PR #86) — si el import falla o faltan campos nuevos (`tipo_operador_lacteo` en compradores, `numero_infolac` en fincas), es señal de que el import se hizo con una versión de esquema desactualizada.

## Entorno de prueba — dos vías, en este orden de preferencia

### Opción A (preferida): terminal/emulador Android real vía Android Studio + Chrome remote debugging + Playwright

1. Con el dispositivo/emulador conectado en Android Studio (`adb devices` debe listarlo), instala la build actual:
   ```bash
   npm run cap:sync:free
   npx cap run android
   ```
2. En el host, abre `chrome://inspect/#devices` en Chrome — el WebView de la app debe aparecer listado como target inspeccionable (requiere que el WebView tenga `setWebContentsDebuggingEnabled(true)`, ya activo en debug builds).
3. Usa el servidor MCP de Playwright del host para **conectar sobre el DevTools Protocol** de ese WebView remoto (Playwright soporta `chromium.connectOverCDP(wsEndpoint)` apuntando al endpoint que expone `chrome://inspect`). Esto te da control real sobre el WebView de Android, no una simulación.
4. Si Playwright no consigue adjuntarse al WebView remoto (limitación conocida en algunas versiones de Capacitor/WebView), cae a la Opción B para el layout y usa Android Studio → **Layout Inspector** o captura de pantalla manual vía `adb shell screencap` para confirmar visualmente los puntos críticos.

### Opción B (fallback rápido): navegador de escritorio con viewport emulado

1. Levanta el servidor de desarrollo: `npx serve . -p 8792` (o usa `.claude/launch.json`, config `static-src`).
2. Con Playwright, fija el viewport a un tamaño real de Android vertical — no uses el ancho de escritorio por defecto:
   - `360×800` (gama baja/media, Android "genérico")
   - `412×915` (Pixel 6/7, el más representativo hoy)
   - Prueba también `768×1024` si el dispositivo del usuario es una tablet Android.
3. **Importante**: esto NO sustituye a la Opción A para validar edge-to-edge/status bar/gestos nativos — solo sirve para maquetación CSS. Indícalo explícitamente en tu informe si usaste solo esta vía.

## Alcance exacto — qué verificar, pantalla por pantalla

Para cada punto: ruta de la app, qué cambió, qué comprobar visualmente. Limpia cualquier dato de prueba que crees (usa `window.db.delete(...)` como se hizo en las sesiones previas, o revierte manualmente).

### 1. Wizard "Registrar Retirada" (Salida Láctea) — bug crítico #1 (PR #88)
**Ruta**: `Comercialización → Leche → Registrar Retirada`
**Qué cambió**: `js/views/wizards/wizard-albaran-leche.js` — se cerró un `<div class="grid">` que dejaba el campo "Número muestra Letra Q" mal anidado.
**Verificar**:
- Paso 1 del wizard: el campo "NÚMERO MUESTRA LETRA Q" debe ocupar su propia fila a ancho completo, **no** aparecer encajado/comprimido dentro de la fila Matrícula/Temperatura.
- Con teclado virtual Android abierto (foco en cualquier input numérico), confirma que el wizard sigue siendo scrolleable y ningún campo queda oculto tras el teclado.
- Prueba también el bloque "Cisterna → Cisterna" (selecciona ese tipo de movimiento) — los campos de código de cisterna origen/destino deben verse en 2 columnas legibles en 360px de ancho, sin texto cortado.

### 2. Ficha/alta de Finca — Nº INFOLAC — bug crítico #2 (PR #88)
**Ruta**: `Explotación → Ficha de finca → Editar` (o wizard de alta de finca si creas una nueva vía Premium/demo)
**Qué cambió**: `js/fincas.js` ahora persiste `numero_infolac`; el campo ya existía en `js/views/wizards/wizard-finca.js`.
**Verificar**: el campo "Nº INFOLAC (si aplica)" se ve correctamente en el paso del contrato lácteo, y tras guardar y reabrir la ficha, el valor persiste y se muestra en `Informes` y en `Cuaderno de explotación` (ambos leen `finca.numero_infolac`).

### 3. Dashboard Explotación Láctea — MOFA — bug crítico #5 (PR #88)
**Ruta**: `Explotación → Láctea` (sub-tab Dashboard, es la vista por defecto)
**Qué cambió**: `js/views/explotacion-lactea-view.js:43` — MOFA (30 días) ahora calcula bien los gastos de alimentación.
**Verificar**:
- La card "MOFA (30 DÍAS)" muestra un valor **no nulo** cuando hay gastos de alimentación en los últimos 30 días de la demo (ya se confirmó 654,57€ en escritorio — en el terminal Android debe coincidir).
- Layout: esta card comparte fila (`grid-cols-2`) con "Producción Hoy" — en 360px de ancho confirma que ambos números caben sin partirse en 3 líneas ni desbordar.
- Card "Última Analítica": 6 métricas en `grid-cols-3` — en vertical estrecho pueden apretarse mucho (2 filas de 3). Confirma que las etiquetas ("Grasa", "Gérmenes", "Somáticas"...) no se solapan con los valores.

### 4. FAB "+ Analítica" en sub-tab Control — bug crítico #6 (PR #90)
**Ruta**: `Explotación → Láctea → Control`
**Qué cambió**: nuevo botón "+ Analítica" (`explotacion-lactea-view.js`, cabecera de `renderControl()`) que abre `wizard-analitica-leche.js`.
**Verificar**:
- El botón "+ Analítica" está en la cabecera junto al título "Control Lechero" con `justify-between` — en 360px de ancho, confirma que el título largo + el botón no se solapan ni el botón queda cortado en el borde derecho de la pantalla.
- Abre el wizard: 4 filas de 2 columnas (Fecha/Especie, Tipo/Tanque, Grasa/Proteína, Gérmenes/Somáticas) + Laboratorio + checkbox Inhibidores. Confirma que ningún label se corta y los inputs numéricos son fácilmente tocables (altura mínima táctil).
- Completa el wizard con datos de prueba, confirma el toast "Analítica registrada" es visible y no queda oculto tras la barra de navegación del sistema, luego **borra el registro de prueba** (`window.db.delete('analiticas_leche', <id>)`).

### 5. FAB "+ Movimiento" en sub-tab Balance — bug crítico #6 (PR #90)
**Ruta**: `Explotación → Láctea → Balance`
**Qué cambió**: nuevo botón "+ Movimiento" que abre `wizard-movimiento-balance.js`.
**Verificar**:
- Mismo chequeo de cabecera que el punto 4 (título "Balance Lácteo" + botón).
- Abre el wizard, cambia el selector "TIPO MOVIMIENTO" a "AJUSTE (STOCK ABSOLUTO)" — el label del campo cantidad cambia dinámicamente a "NUEVO STOCK (LITROS)"; confirma que el cambio de texto no rompe el layout (ej. texto más largo desbordando el label).
- Completa con un tanque real, cantidad positiva, confirma el toast y **borra el movimiento de prueba** (`window.db.delete('balance_lacteo', <id>)`).
- Caso negativo: intenta guardar con cantidad 0 o vacía — debe bloquear con toast de error visible, sin cerrar el wizard.

### 6. Selector "Operador Lácteo (Letra Q)" en Compradores — Fase 8 (PR #86)
**Ruta**: `Comercialización → Compradores → Nuevo/Editar comprador`
**Qué cambió**: `js/views/compradores-view.js` — nuevo `<select>` `tipo_operador_lacteo` (Primer comprador / Centro operación / Centro descarga / Intermediario / Transportista).
**Verificar**: el select se ve y es usable en pantalla estrecha, sin recortarse dentro del formulario (que ya tiene bastantes campos en esta vista).

### 7. Nota sobre `produccion-view.js` (código muerto, no verificar)
Confirmado en la sesión anterior que `js/views/produccion-view.js` (`_renderLecheControl`/`_renderLecheBalance`) **no está enrutado** — es una copia sin conectar. No pierdas tiempo verificándolo; la vista real es `explotacion-lactea-view.js` (puntos 4 y 5 de arriba). Esto está documentado como hallazgo pendiente en el Issue #89 de GitHub.

## Qué NO hace falta volver a probar

- Cálculo de plazos de comunicación Letra Q (`calcularPlazoComunicacion`) — verificado exhaustivamente con datos reales en escritorio.
- Validaciones de `BalanceLacteo.registrar()` (tanque inexistente, cantidad negativa/cero) — verificadas con llamadas directas, solo hace falta confirmar que el **toast de error se ve bien** en móvil (punto 5, caso negativo).
- Bloqueo de intermediarios en el wizard de albarán — funcional, verificado en profundidad.

## Formato del informe esperado

Por cada punto de la lista (1-6): captura de pantalla + veredicto (OK / roto / mejorable) + si es "mejorable", una descripción concreta y accionable (no "se ve raro", sino "el label X se corta a partir de Y caracteres en 360px"). Indica siempre qué método usaste (Opción A o B) para cada captura, y qué modelo/resolución de dispositivo.

## Sugerencias adicionales que le puedes comunicar

1. **Prueba en modo oscuro y claro** si la app soporta ambos temas — los nuevos wizards no se probaron explícitamente en tema claro.
2. **Prueba con teclado virtual abierto** en cada wizard nuevo — es el caso donde más se rompe el layout en apps móviles reales (campos ocultos, wizard no scrollea).
3. **Comprueba el "safe area" inferior** (barra de gestos Android) en las cabeceras con botón "+" de los puntos 4 y 5 — confirma que el botón no queda parcialmente tapado en dispositivos con gestos de navegación (sin botones físicos/virtuales).
4. **Rotación**: aunque el foco es vertical, si es rápido, confirma que un giro a horizontal y vuelta a vertical mid-wizard no pierde los datos ya introducidos (no debería, pero es un fallo típico de WebView).
5. Si detecta algo roto, que **no lo arregle sin confirmar contigo primero** qué archivo tocar — dado que ya hay 3 vistas con nombres parecidos (`produccion-view.js` muerto vs `explotacion-lactea-view.js` real), es fácil editar la copia equivocada por error, como me pasó a mí en esta misma sesión.
