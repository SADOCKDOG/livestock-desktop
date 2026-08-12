# Diseño: importador de Zonas y Parcelas desde PDF del Catastro (SIGPAC)

**Fecha:** 2026-08-03
**Origen:** módulo ya funcionando en Cork Manager (`C:\Users\yo\pesadas-corcho`)
**Estado:** pendiente de implementación
**Rama:** nueva desde `master` (protegida → PR)

---

## 1. Qué se trae de Cork

Módulo pequeño y autónomo, ya probado en producción en Cork:

| Fichero origen | Líneas | Qué hace |
|---|---|---|
| `www/js/pdf-import.js` | 208 | Parser del PDF oficial del Catastro |
| `www/js/ui/zonas-ui.js` | 194 | UI de importación (solo `renderImportarPdf`, ~55 líneas útiles) |
| `MANUAL/Importación de Zonas/*.jpg` | 10 capturas | Manual paso a paso: SIGPAC → Catastro → imprimir datos → guardar PDF → importar |
| `www/manual-zonas.html` | 386 | Manual en HTML |

### 1.1 Qué extrae el parser

De un PDF de "Consulta descriptiva y gráfica de datos catastrales":

- **Referencia catastral** (rústica y urbana, dos patrones)
- **Polígono y Parcela**
- **Paraje, Municipio, Provincia**, y la localización literal
- **Clase** (Rústico/Urbano/…) y **Uso principal**
- **Superficie gráfica** y superficie construida (m²)
- **Tabla de CULTIVOS SIGPAC**: letra de subparcela, aprovechamiento, intensidad, superficie
- **Tabla de CONSTRUCCIONES**
- **Croquis**: página 1 renderizada a PNG

La técnica del parser es sólida: reconstruye líneas agrupando los items de texto por coordenada Y (`Math.round(item.transform[5]/2)*2`) y ordenando por X, y luego aplica expresiones regulares sobre el texto reconstruido. Es lo que hace que funcione con la maquetación en columnas del Catastro.

### 1.2 Por qué interesa en Livestock

No es solo comodidad de alta:

- Los **cultivos SIGPAC** (p. ej. `FE Encinar 02 55.460 m²`) alimentan directamente carga ganadera, UGM/ha y alertas de sobrepastoreo, que ya existen en la vista de Zonas.
- **Referencia catastral** y **polígono/parcela** son datos que SIGGAN pide y que hoy hay que teclear a mano.
- Evita el error de transcripción en superficies, que es el dato que más pesa en los cálculos de carga.

---

## 2. Lo que NO encaja tal cual

| Cork | Livestock | Resolución |
|---|---|---|
| `Zonas` es un store propio con `Zonas.save()` | Las zonas son un **array embebido `finca.zonas[]`** (`db.js:675`) | El importador escribe en `finca.zonas[]` y guarda con `Fincas.save()` |
| Superficies en **m²** | La vista de Zonas trabaja en **hectáreas** | Convertir a ha para `superficie`; conservar los m² literales en `superficieGrafica` |
| `croquisBlob` dentro del registro de zona | `finca.zonas[]` va íntegro en el backup JSON | **Store aparte** (decisión tomada, §3.2) |
| Campos de corcho: `alcornoquesEstimados`, `ultimoDescorche`, `proximoDescorche` | No aplican | Se descartan |
| `pdfjsLib` cargado siempre desde CDN | App offline-first | **Carga bajo demanda** (decisión tomada, §3.3) |
| ES modules (`import`/`export`) | Scripts clásicos con `window.X = X` | Adaptar a IIFE + global, como el resto de `js/` |

**A favor:** `finca.zonas[]` ya contiene `superficieGrafica` y `usoPrincipal`, así que parte del modelo ya está preparado para estos datos.

---

## 2.bis No romper lo ya validado — el importador es ADITIVO

Requisito explícito: **nada de lo que ya funciona con la Demo CHAMORRO puede verse afectado.** El diseño lo garantiza por construcción, no por cuidado al implementar:

1. **Campos nuevos, opcionales.** `refCatastral`, `poligono`, `parcela`, `paraje`, `municipio`, `provincia`, `clase`, `cultivos[]` y `croquisId` se **añaden** a `finca.zonas[]`. Las zonas creadas a mano (las de la demo) no los tienen y siguen funcionando igual: la vista de Zonas ya pinta con `||` los campos ausentes.
2. **Nada se reescribe.** El importador solo **crea** zonas nuevas. La única vía por la que tocaría una existente es el aviso de duplicado por referencia catastral, y ahí actualizar es una acción **explícita del usuario**, nunca automática.
3. **Migración v27 → v28 aditiva.** Solo se crea el store `croquis_parcelas`. No se toca ningún store existente ni se migran datos. Una base v27 con la demo cargada abre en v28 sin cambio alguno.
4. **`superficie` (ha) no se pisa.** Si una zona ya tiene superficie introducida a mano, el importador no la sobrescribe: solo la rellena cuando está vacía.
5. **Sin ficheros compartidos en Fase 1.** El parser vive en `js/services/pdf-catastro.js`, fichero nuevo, y se autocarga pdf.js sin tocar `app.js`. Cero riesgo de conflicto con el trabajo en curso de las guías.

**Criterio de no regresión**, a comprobar en dispositivo antes del PR: cargar la Demo CHAMORRO en una base migrada a v28 y verificar que la vista de Zonas, la carga ganadera (UGM/ha) y las alertas de sobrepastoreo dan **exactamente** los mismos valores que antes.

## 2.ter Punto de entrada: el flujo de Finca Nueva

El importador no es una utilidad escondida en un menú: es **el segundo paso natural** después de crear la finca. El orden lógico de puesta en marcha es finca → **zonas y parcelas** → rebaños → animales, y precisamente crear las zonas a mano, una a una, con sus referencias catastrales y superficies, es el trabajo más ingrato del arranque.

Por eso:

- La entrada principal va en el **empty-state de Zonas**, que es lo que ve un usuario con finca recién creada: junto a "Crear primera zona", un **"Importar desde PDF del Catastro"** con el mismo peso visual.
- Encaja con la guía `onboarding.primeros-pasos` que se está desarrollando en paralelo: su paso 1 es Zonas, y debería ofrecer las dos vías.

> **Coordinación:** el trabajo de guías también toca el empty-state de `zonas-view.js` (para añadir `btn-vacio-zonas`). Conviene que el importador entre **después** de que ese cambio esté fusionado, o resolver el conflicto en el PR. Es el único punto de solape entre ambos trabajos.

---

## 3. Diseño

### 3.1 Ficheros

```
js/services/pdf-catastro.js    NUEVO — parser adaptado (IIFE, window.PdfCatastro)
js/views/importar-zonas-view.js NUEVO — vista de importación
js/app.js                       + _ensurePdfJs() + ruta /importar-zonas + grupo en _viewGroups
js/views/zonas-view.js          + botón "Importar desde PDF" (lista y empty-state)
js/db.js                        + store `croquis_parcelas` (DB v28)
manual/                         + capturas y manual de importación
```

### 3.2 Croquis en store aparte

Nuevo store `croquis_parcelas` en **DB v28** (actual: 27):

```js
{ id: <uuid>, fincaId, zonaId, blob: <Blob PNG>, creadoEn }
```

La zona solo guarda `croquisId`. Ventajas: `finca.zonas[]` y el backup JSON quedan ligeros, y el croquis se muestra con `DocumentViewer` (`js/services/document-viewer.js:14`), que es el patrón obligatorio del repo para visualizar documentos — nunca `window.open()`.

**Pendiente de decidir al implementar:** si el export/import de backup debe incluir los croquis. Recomendación: no por defecto, con casilla opcional, porque son los objetos más pesados de la base.

### 3.3 pdf.js bajo demanda

Replicar exactamente el patrón de `App._ensureHtml2Pdf()` (`app.js:1875`):

```js
async _ensurePdfJs() {
  if (typeof pdfjsLib !== 'undefined') return true;
  if (!App._pdfJsLoadPromise) {
    App._pdfJsLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js';
      s.onload = resolve; s.onerror = reject;
      document.body.appendChild(s);
    });
  }
  try { await App._pdfJsLoadPromise; } catch (_) {}
  return typeof pdfjsLib !== 'undefined';
}
```

La CSP ya permite `cdn.jsdelivr.net` (`index.html:48`). El `workerSrc` apunta al mismo CDN.

**Sin red**: mostrar mensaje claro ("necesitas conexión la primera vez que importas") en vez de fallar en silencio. El resto de la app sigue funcionando offline.

### 3.4 Mapeo de campos

| Campo del PDF | Campo en `finca.zonas[]` | Nota |
|---|---|---|
| `refCatastral` | `refCatastral` | nuevo |
| `poligono` / `parcela` | `poligono` / `parcela` | nuevos |
| `municipio`, `paraje`, `provincia` | `municipio`, `paraje`, `provincia` | nuevos |
| `superficieGrafica` (m²) | `superficieGrafica` (m²) **y** `superficie` (ha) | ya existe `superficieGrafica`; `superficie` = m²/10000 redondeado a 4 decimales |
| `usoPrincipal` | `usoPrincipal` | ya existe |
| `clase` | `clase` | nuevo |
| `cultivos[]` | `cultivos[]` | array de subparcelas SIGPAC |
| `croquisBlob` | `croquisId` → store `croquis_parcelas` | §3.2 |
| — | `codigo_pac`, `aforoMax`, `distancia_agua_m` | los rellena el usuario después; el importador no los toca |

`nombre` lo pone el usuario en la pantalla de revisión; por defecto `Polígono X Parcela Y`.

### 3.5 Flujo de usuario

1. Zonas → botón **"Importar desde PDF"** (visible también en el empty-state, que es donde más falta hace).
2. Selector de archivos, **múltiple** (el caso real son 5-15 parcelas de una vez).
3. Barra de progreso por fichero; un PDF ilegible no aborta el lote (Cork ya lo hace así).
4. **Pantalla de revisión**: una tarjeta por parcela con ref. catastral, polígono/parcela, superficie y campo de nombre editable. Poder descartar parcelas antes de guardar.
5. Guardar → `finca.zonas[]` + croquis, y volver a Zonas.

**Duplicados**: si ya existe una zona con la misma `refCatastral`, avisar y ofrecer actualizar en vez de duplicar. Cork no lo contempla; en Livestock importa porque las zonas condicionan la carga ganadera.

---

## 4. Fases

| Fase | Contenido | Verificación |
|---|---|---|
| 1 | `pdf-catastro.js` adaptado + `_ensurePdfJs()` | Parsear los 9 PDFs reales de `pesadas-corcho/www/ZONAS/` y comprobar campos contra el PDF |
| 2 | Store `croquis_parcelas` (DB v28) + migración | Abrir app con base v27 existente y comprobar que migra sin pérdida |
| 3 | Vista de importación + revisión + guardado | Importar los 9 PDFs en finca real; comprobar `finca.zonas[]` y croquis en DocumentViewer |
| 4 | Botones en Zonas + manual + capturas | Recorrido en dispositivo |
| 5 | QA (`js/qa-importador-zonas.js`) + bump caché + PR | `runAll()` sin fallos |

Los **9 PDFs de ejemplo** en `pesadas-corcho/www/ZONAS/` (Polígono 809 Parcelas 275/276/581-584/595/606, Polígono 1 Parcela 30, Polígono 10 Parcela 257, Polígono 19 Parcela 136) son el banco de pruebas: cubren rústica con cultivos y varias maquetaciones.

---

## 5. Manual: qué mover al repo

De `pesadas-corcho`:

- `MANUAL/Importación de Zonas/*.jpg` → `manual/img/` (10 capturas, renombrar sin espacios ni comas: los nombres actuales tienen erratas y caracteres que complican rutas)
- `www/manual-zonas.html` → adaptar como manual del módulo en Livestock

El manual explica el flujo completo desde SIGPAC: seleccionar catastro, clic en parcela, "Imprimir Datos", copiar el nombre de polígono/parcela, guardar el PDF con ese nombre, y luego importarlo. Es la parte que el usuario no adivina solo, así que conviene enlazarlo desde la propia pantalla de importación.

---

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| El Catastro cambia la maquetación del PDF | El parser es tolerante (regex sobre texto reconstruido), pero conviene registrar en consola las líneas cuando no encuentra nada, para diagnosticar rápido |
| PDF escaneado (imagen, sin capa de texto) | Detectar 0 líneas extraídas y avisar: "este PDF no contiene texto, descárgalo de nuevo desde el Catastro" |
| Fincas con muchas parcelas | El croquis en store aparte ya lo cubre; validar con las 9 de ejemplo y medir el tamaño de la base |
| Sin red al importar | Mensaje explícito (§3.3) |
| Backup con croquis | Decidir en implementación si se incluyen (§3.2) |

---

## 7. Lo que NO entra

- Descarga automática desde el visor SIGPAC (requiere red y scraping; el flujo manual del manual es fiable y ya está documentado).
- Geometría vectorial de la parcela (el PDF no la trae en forma explotable; solo el croquis como imagen).
- Cálculo automático de UGM a partir de los cultivos: primero importar el dato, y decidir después si se usa para proponer aforo.
