/**
 * Capturas para el Manual de Usuario — LIVESTOCK MANAGER
 *
 * Genera EXACTAMENTE las capturas que los manuales declaran en sus placeholders
 * (`<div class="screenshot-placeholder" data-shot="...">`), con el nombre de fichero
 * que cada uno especifica, en formato móvil vertical (390x844).
 *
 * Sustituye a los 15 scripts `capture-*.js` anteriores, que tenían tres defectos que
 * hacían que ninguna captura sirviera:
 *
 *   1. Escribían en `www/manual/img`, que es carpeta GENERADA y está en .gitignore.
 *      `npm run build` copia `manual/` -> `www/`, así que cada tanda se perdía al
 *      siguiente build. Aquí se escribe en `manual/img`, el origen versionado.
 *   2. Navegaban a rutas con prefijo `#/www/...` (p.ej. `#/www/ganaderia`), que NO
 *      existe en App.routes. La app no navegaba y las 148 capturas salían idénticas,
 *      todas de la pantalla de Bienvenida.
 *   3. Usaban una nomenclatura propia (`anim/anim-01.png`) que ningún manual referencia.
 *
 * Uso:
 *   node scripts/capturas-manual.js            # headless
 *   node scripts/capturas-manual.js --ver      # con ventana visible, para depurar
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const puppeteer = require('puppeteer');

const RAIZ = path.join(__dirname, '..');
const SALIDA = path.join(RAIZ, 'manual/img');   // ORIGEN versionado, no www/
const PUERTO = 8799;
const VISIBLE = process.argv.includes('--ver');
// --limite N: captura solo las N primeras. Para comprobar que salen bien ANTES de
// lanzar la tanda completa; la primera pasada produjo 22 capturas idénticas.
const LIMITE = (() => { const i = process.argv.indexOf('--limite'); return i > -1 ? parseInt(process.argv[i+1], 10) : 0; })();
// --filtro <regex>: captura solo las que matchean el nombre de fichero. Permite el
// pre-flight "2 de cada módulo" sin re-rodar las ya verificadas.
const FILTRO = (() => { const i = process.argv.indexOf('--filtro'); return i > -1 ? process.argv[i+1] : ''; })();
const DUMP_TEXTO = process.argv.includes('--dump-texto');   // vuelca el innerText de cada captura a manual/img/_texto.json

// Móvil vertical. 390x844 = iPhone 12/13/14, tamaño de referencia del diseño.
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const ESPERA_VISTA = 3500;   // la app monta ~89 scripts en serie
const ESPERA_WIZARD = 2500;

// Abre el Wizard Venta Masiva con un borrador pre-rellenado, igual que
// App._abrirWizardVentaMasiva() pero pasando datos para que los 5 pasos salgan
// con contenido: animales aptos seleccionados, trazabilidad, economía, comprador
// matadero y transportista ATG. Necesita flags carne activos y la pestaña carne.
const VENTA_MASIVA_ABRIR = `(async () => {
  try {
    if (window.ModoContextoHelper && ModoContextoHelper.setFlags) ModoContextoHelper.setFlags({ leche: true, carne: true });
    if (window.ComercializacionView && ComercializacionView._cambiarSubModulo) ComercializacionView._cambiarSubModulo('carne');
    const hoy = new Date();
    const animales = await window.Animales.list().catch(() => []);
    const aptos = (animales || []).filter(a => {
      if (!a || !a.estado || !/activo/i.test(String(a.estado))) return false;
      if (a.fecha_nacimiento) {
        const meses = (hoy - new Date(a.fecha_nacimiento)) / (1000 * 60 * 60 * 24 * 30.44);
        if (meses < 12) return false;
      }
      if (/vaca|bovino/i.test(String(a.especie || '')) && (!a.dib || String(a.dib).trim() === '')) return false;
      return true;
    });
    const ids = aptos.slice(0, 3).map(a => a.id);
    const comps = await window.Compradores.list().catch(() => []);
    const comp = (comps || []).find(c => /matadero|carnic/i.test(String(c.tipo_operador || c.tipo || ''))) || (comps || [])[0];
    const transps = await window.Transportistas.list().catch(() => []);
    const trans = (transps || []).find(t => /ATG/i.test(JSON.stringify(t))) || (transps || [])[0];
    window._wizardCallInProgress = true;
    if (window.VentaMasivaWizard && VentaMasivaWizard.open) {
      await VentaMasivaWizard.open({
        animalId: ids,
        codigoICA: 'ES061234000456',
        numeroGuia: 'GUA-2026-0001',
        confirmacionFitosanitarios: true,
        pVivo: 40, pCanal: 20, gTrans: 2, gMata: 3, precioUnitario: 3.20,
        compradorId: comp ? comp.id : null,
        transportistaId: trans ? trans.id : null,
        autorizacion_veterinaria: { vet_nombre: 'DRA. ANA MORENO', vet_colegiado: 'COV-1001', fecha_autorizacion: '2026-08-01' }
      });
    }
  } catch (e) { console.error('VENTA_MASIVA_ABRIR:', e); }
})()`;

// ---------------------------------------------------------------------------
// Las 53 capturas declaradas por los manuales. `nav` usa rutas REALES de App.routes.
// ---------------------------------------------------------------------------
const CAPTURAS = [
  { file: 'dashboard-kpis.png',        nav: '#/',          desc: 'KPIs lácteos con progress bars semáforo', scroll: 2551 },
  { file: 'dashboard-bento-grid.png',  nav: '#/',          desc: 'Bento Grid 12 tarjetas', scroll: 238 },
  { file: 'dashboard-alertas.png',     nav: '#/',          desc: 'Alertas con badges y contadores', scroll: 1598 },
  { file: 'ganaderia-carrusel.png',    nav: '#/ganaderia', desc: 'Carrusel sticky 5 submódulos' },
  { file: 'animales-lista.png',        nav: '#/animales',  desc: 'Listado con búsqueda y badges' },
  { file: 'rebanos-detalle.png',       nav: '#/rebanos',   desc: 'Detalle con KPIs e historial' },
  { file: 'zonas-sobrepastoreo.png',   nav: '#/zonas',     desc: 'Alerta Bento sobrepastoreo', scroll: 175 },
  { file: 'zonas-demo-chamorro.png',   nav: '#/zonas',     desc: 'Zona demo 2.0 UGM/ha', scroll: 1076 },

  { file: 'explotacion-carrusel-11tabs.png',   nav: '#/explotacion',             desc: 'Carrusel 11 tabs' },
  { file: 'explotacion-balance-unificado.png', nav: '#/explotacion',             desc: 'KPIs litros + MOFA + margen', scroll: 500 },
  { file: 'lacteo-dashboard.png',              nav: '#/explotacion?tab=lacteo',  desc: 'Dashboard lácteo' },
  { file: 'tanques-lista-gauge.png',           nav: '#/explotacion?tab=tanques', desc: 'Tanques con gauge circular' },
  { file: 'silos-gauge-svg.png',               nav: '#/explotacion?tab=silos',   desc: 'Silos con gauge SVG' },

  { file: 'informes-sidebar-categoria.png', nav: '#/informes', desc: 'Sidebar categorías + sub-tabs' },
  { file: 'informes-expro-graficos.png',    nav: '#/informes', desc: 'Gráficas ExPro',  accion: "window.InformesView && InformesView.renderCategoria && InformesView.renderCategoria('expro')" },
  { file: 'informes-libros-export-csv.png', nav: '#/informes', desc: 'Exportar cuaderno', accion: "window.InformesView && InformesView.renderCategoria && InformesView.renderCategoria('libros')" },

  { file: 'sanidad-tabs-internos.png', nav: '#/ganaderia?tab=sanidad', desc: 'Tabs internos de Sanidad' },
  { file: 'botiquin-lista-fefo.png',   nav: '#/botiquin',              desc: 'Lista botiquín FEFO' },
  { file: 'ajustes-general.png',       nav: '#/ajustes',               desc: 'Ajustes con banner FREE' },

  // Wizards: abrir el asistente y, en varios casos, avanzar de paso.
  { file: 'animales-ficha-wizard.png',      nav: '#/animales',  desc: 'Wizard ficha animal', accion: 'window.App && App._abrirAltaAnimalDirecto && App._abrirAltaAnimalDirecto()' },
  { file: 'wizard-censo-paso1.png',         nav: '#/ganaderia', desc: 'Censo paso 1',        accion: 'window.App && App._abrirWizardCenso && App._abrirWizardCenso()' },
  { file: 'wizard-crotales-paso2.png',      nav: '#/ganaderia', desc: 'Crotales paso 2',     accion: 'window.App && App._abrirWizardCrotales && App._abrirWizardCrotales()', paso: 2 },
  { file: 'wizard-finca-paso3.png',         nav: '#/ajustes',   desc: 'Finca paso 3',        accion: 'window.WizardFinca && WizardFinca.abrir && WizardFinca.abrir()', paso: 3 },
  { file: 'wizard-ordeño-paso1.png',        nav: '#/explotacion?tab=lacteo', desc: 'Ordeño paso 1', accion: 'window.App && App._abrirAsistenteProduccion && App._abrirAsistenteProduccion()' },
  { file: 'wizard-ordeño-paso2.png',        nav: '#/explotacion?tab=lacteo', desc: 'Ordeño paso 2', accion: 'window.App && App._abrirAsistenteProduccion && App._abrirAsistenteProduccion()', paso: 2 },
  { file: 'wizard-ordeño-paso3.png',        nav: '#/explotacion?tab=lacteo', desc: 'Ordeño paso 3', accion: 'window.App && App._abrirAsistenteProduccion && App._abrirAsistenteProduccion()', paso: 3 },
  { file: 'wizard-albaran-leche-paso1.png', nav: '#/comercializacion?tab=leche', desc: 'Albarán paso 1', accion: 'window.App && App._abrirWizardAlbaranLeche && App._abrirWizardAlbaranLeche()' },
  { file: 'wizard-albaran-leche-paso2.png', nav: '#/comercializacion?tab=leche', desc: 'Albarán paso 2', accion: 'window.App && App._abrirWizardAlbaranLeche && App._abrirWizardAlbaranLeche()', paso: 2 },
  { file: 'wizard-tratamiento-paso1.png',   nav: '#/ganaderia?tab=sanidad', desc: 'Tratamiento paso 1', accion: 'window.WizardTratamiento && WizardTratamiento.abrir && WizardTratamiento.abrir()' },
  { file: 'wizard-tratamiento-paso2.png',   nav: '#/ganaderia?tab=sanidad', desc: 'Tratamiento paso 2', accion: 'window.WizardTratamiento && WizardTratamiento.abrir && WizardTratamiento.abrir()', paso: 2 },
  { file: 'wizard-vacunacion-paso1.png',    nav: '#/ganaderia?tab=sanidad', desc: 'Vacunación paso 1',  accion: 'window.WizardVacunacion && WizardVacunacion.abrir && WizardVacunacion.abrir()' },
  { file: 'wizard-parto-paso2.png',         nav: '#/ganaderia',            desc: 'Parto paso 2',       accion: 'window.App && App._abrirAsistenteReproduccion && App._abrirAsistenteReproduccion()', paso: 2 },

  // --- Comercialización (submódulos leche/carne, compradores, proveedores,
  //     transportistas, contratos y albaranes de venta) ---
  { file: 'comercializacion-carrusel.png',    nav: '#/comercializacion?tab=leche',     desc: 'Carrusel sticky submódulos', accion: 'window.ModoContextoHelper && ModoContextoHelper.setFlags && ModoContextoHelper.setFlags({leche:true,carne:true}); window.ComercializacionView && ComercializacionView._cambiarSubModulo && ComercializacionView._cambiarSubModulo("leche")' },
  { file: 'comercializacion-carne-kpis.png',  nav: '#/comercializacion',               desc: 'KPIs carne',                accion: 'window.ModoContextoHelper && ModoContextoHelper.setFlags && ModoContextoHelper.setFlags({leche:true,carne:true}); window.ComercializacionView && ComercializacionView._cambiarSubModulo && ComercializacionView._cambiarSubModulo("carne")' },
  { file: 'wizard-venta-masiva-paso1.png',    nav: '#/comercializacion',               desc: 'Venta masiva paso 1',       accion: VENTA_MASIVA_ABRIR },
  { file: 'wizard-venta-masiva-paso2.png',    nav: '#/comercializacion',               desc: 'Venta masiva paso 2',       accion: VENTA_MASIVA_ABRIR, paso: 2 },
  { file: 'wizard-venta-masiva-paso3.png',    nav: '#/comercializacion',               desc: 'Venta masiva paso 3',       accion: VENTA_MASIVA_ABRIR, paso: 3 },
  { file: 'wizard-venta-masiva-paso4.png',    nav: '#/comercializacion',               desc: 'Venta masiva paso 4',       accion: VENTA_MASIVA_ABRIR, paso: 4 },
  { file: 'wizard-venta-masiva-paso5.png',    nav: '#/comercializacion',               desc: 'Venta masiva paso 5',       accion: VENTA_MASIVA_ABRIR, paso: 5 },
  { file: 'comercializacion-leche-kpis.png',  nav: '#/comercializacion?tab=leche',     desc: 'KPIs leche' },
  { file: 'compradores-listado.png',          nav: '#/comercializacion?tab=compradores', desc: 'Listado compradores' },
  { file: 'compradores-detalle.png',          nav: '#/comercializacion?tab=compradores', desc: 'Detalle comprador',       accion: "document.querySelector('[onclick*=\"#/comprador?id=\"]').click()" },
  { file: 'compradores-nuevo.png',            nav: '#/comercializacion?tab=compradores', desc: 'Nuevo comprador',         accion: 'window.CompradoresView && CompradoresView.renderFormulario && CompradoresView.renderFormulario()' },
  { file: 'proveedores-listado.png',          nav: '#/explotacion?tab=proveedores',     desc: 'Listado proveedores' },
  { file: 'proveedores-detalle.png',          nav: '#/explotacion?tab=proveedores',     desc: 'Detalle proveedor',        accion: "document.querySelector('[onclick*=\"#/proveedor?id=\"]').click()" },
  { file: 'proveedores-nuevo.png',            nav: '#/explotacion?tab=proveedores',     desc: 'Nuevo proveedor',          accion: 'window.ProveedoresView && ProveedoresView.renderFormulario && ProveedoresView.renderFormulario()' },
  { file: 'transportistas-listado.png',       nav: '#/comercializacion?tab=transportistas', desc: 'Listado transportistas' },
  { file: 'transportistas-nuevo.png',         nav: '#/comercializacion?tab=transportistas', desc: 'Nuevo transportista',    accion: 'window.TransportistasView && TransportistasView._abrirFormulario && TransportistasView._abrirFormulario()' },
  { file: 'contratos-listado.png',            nav: '#/comercializacion?tab=contratos',  desc: 'Listado contratos' },
  { file: 'contratos-detalle.png',            nav: '#/comercializacion?tab=contratos',  desc: 'Detalle contrato',         accion: "document.querySelector('[onclick*=\"#/contrato?id=\"]').click()" },
  { file: 'contratos-nuevo.png',              nav: '#/comercializacion?tab=contratos',  desc: 'Nuevo contrato',           accion: 'window.ContratosView && ContratosView.renderFormulario && ContratosView.renderFormulario()' },
  // albaranes: _renderLista() no se llama desde render() -> la lista queda en "Cargando..."
  // hasta tocar una pestaña. La accion espera a _cachedDataRaw y aplica filtros para poblarla.
  { file: 'albaranes-historial.png',          nav: '#/albaranes-ventas',                desc: 'Historial albaranes',      accion: '(async()=>{for(let i=0;i<30&&!window.AlbaranesVentasView._cachedDataRaw;i++){await new Promise(r=>setTimeout(r,100));}if(window.AlbaranesVentasView._cachedDataRaw){window.AlbaranesVentasView._aplicarFiltros();}})()' },
  { file: 'albaranes-detalle.png',            nav: '#/albaranes-ventas',                desc: 'Detalle albarán',          accion: '(async()=>{for(let i=0;i<30&&!window.AlbaranesVentasView._cachedDataRaw;i++){await new Promise(r=>setTimeout(r,100));}if(window.AlbaranesVentasView._cachedDataRaw){window.AlbaranesVentasView._aplicarFiltros();const b=document.querySelector(\'[onclick*="_verDetalle"]\');if(b)b.click();}})()' }
];

// --- Servidor estático mínimo para servir el repo -------------------------
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
               '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };

function servir() {
  return new Promise(res => {
    const srv = http.createServer((req, r) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const f = path.join(RAIZ, p);
      if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(r);
    });
    srv.listen(PUERTO, () => res(srv));
  });
}

async function main() {
  if (!fs.existsSync(SALIDA)) fs.mkdirSync(SALIDA, { recursive: true });
  const srv = await servir();
  console.log(`Sirviendo el repo en http://localhost:${PUERTO}`);

  const browser = await puppeteer.launch({ headless: !VISIBLE, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  // Diagnóstico: el banner "Script error." de index.html no dice de dónde viene.
  // Aquí se registra el error real, con su stack, para no tener que suponerlo.
  const errores = [];
  page.on('pageerror', e => errores.push('PAGEERROR: ' + (e && e.message ? e.message : e)));
  page.on('console', m => { if (m.type() === 'error') errores.push('CONSOLE: ' + m.text().slice(0, 200)); });
  page.on('requestfailed', r => errores.push('REQ FALLIDA: ' + r.url().slice(0, 110)));

  // Las guías se desactivan ANTES de que la app arranque: si se hace después, el tour
  // ya ha podido lanzarse y su overlay oscurece la captura.
  await page.evaluateOnNewDocument(() => {
    window.__guiasOff = true;
    const apagar = () => {
      if (window.App) {
        App._config = App._config || {};
        App._config.guides = { ...(App._config.guides || {}), enabled: false };
      }
      document.querySelectorAll('.guide-overlay, .guide-popover, .guide-resume-chip, #guide-fab')
        .forEach(n => n.remove());
    };
    setInterval(apagar, 300);
    document.addEventListener('DOMContentLoaded', apagar);
  });

  await page.goto(`http://localhost:${PUERTO}/index.html`, { waitUntil: 'domcontentloaded' });
  console.log('Esperando a que monte la app...');
  await page.waitForFunction('!!window.App && !!window.Fincas', { timeout: 90000 });

  // Datos demo + guías desactivadas (su overlay oscurecería todas las capturas).
  const preparado = await page.evaluate(async () => {
    App._config = App._config || {};
    App._config.guides = { ...(App._config.guides || {}), enabled: false };
    let id = await Fincas.getActiveId().catch(() => null);
    let sembre = false;
    if (!id) {
      sembre = true;
      // Mismo camino que el botón "Cargar Demo" del asistente, saltando la confirmación
      // de UI: _ensureSeedData carga el script de semilla y SeedData.run(true) siembra
      // la explotación DEMO CHAMORRO en todos los módulos.
      if (window.AsistenteConfiguracion && AsistenteConfiguracion._ensureSeedData) {
        await AsistenteConfiguracion._ensureSeedData();
      }
      if (window.SeedData && SeedData.run) {
        await SeedData.run(true);
        id = await Fincas.getActiveId().catch(() => null);
      }
    }
    return { fincaActiva: id, sembrado: !!sembre, seedDisponible: !!(window.SeedData && window.SeedData.run) };
  });
  console.log('Estado:', JSON.stringify(preparado));
  if (!preparado.fincaActiva) console.log('  AVISO: sin finca activa, las vistas saldrán vacías');

  // Tras sembrar hay que RECARGAR: el flujo original del asistente hace un reload
  // después de SeedData.run porque la app no repinta sola con los datos nuevos. Sin
  // esto, el router se quedaba en la pantalla inicial y todas las vistas salían iguales.
  if (preparado.sembrado) {
    console.log('Datos sembrados: recargando para que la app los tome...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction('!!window.App && !!window.Fincas', { timeout: 90000 });
    await page.evaluate(() => {
      App._config = App._config || {};
      App._config.guides = { ...(App._config.guides || {}), enabled: false };
    });
    await new Promise(r => setTimeout(r, 3000));
  }

  let ok = 0; const fallos = []; const dumpTexto = {};
  const lista = FILTRO
    ? CAPTURAS.filter(c => new RegExp(FILTRO).test(c.file.replace(/\.png$/, '')))
    : LIMITE > 0 ? CAPTURAS.slice(0, LIMITE) : CAPTURAS;
  console.log(`Tanda: ${lista.length} capturas${FILTRO ? ' (filtro ' + FILTRO + ')' : ''}`);
  for (const c of lista) {
    try {
      // Navegar y ESPERAR A QUE LA VISTA CAMBIE de verdad. Con `location.hash` a secas
      // y una espera fija, si el router no repinta se captura la pantalla anterior: así
      // salieron 22 capturas idénticas en la primera pasada. Se compara el contenido
      // antes/después y se usa App.route(), que es el punto de entrada real del router.
      const antes = await page.evaluate(() =>
        (document.querySelector('main#app-content')?.innerText || '').slice(0, 120));

      await page.evaluate(nav => {
        document.querySelectorAll('.wizard-full-screen, .guide-overlay, .guide-popover').forEach(n => n.remove());
        location.hash = nav;
        const [ruta, query] = nav.replace(/^#/, '').split('?');
        if (window.App && App.route) App.route(ruta, new URLSearchParams(query || ''));
      }, c.nav);

      try {
        await page.waitForFunction(
          prev => {
            const t = (document.querySelector('main#app-content')?.innerText || '').slice(0, 120);
            return t !== prev && t.trim().length > 0 && !t.includes('Cargando');
          },
          { timeout: ESPERA_VISTA * 2 }, antes);
      } catch (e) {
        console.log(`         (aviso: la vista no cambió al navegar a ${c.nav})`);
      }
      await new Promise(r => setTimeout(r, 1200));  // asentar render y animaciones

      if (c.accion) {
        await page.evaluate(a => { try { eval(a); } catch (e) {} }, c.accion);
        await new Promise(r => setTimeout(r, ESPERA_WIZARD));
      }
      for (let p = 1; p < (c.paso || 1); p++) {
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('button'))
            .find(x => /SIGUIENTE|CONTINUAR/i.test((x.textContent || '').trim()));
          if (b) b.click();
        });
        await new Promise(r => setTimeout(r, 1200));
      }
      if (c.scroll) {
        await page.evaluate(y => window.scrollTo(0, y), c.scroll);
        await new Promise(r => setTimeout(r, 600));
      }

      // Última limpieza JUSTO antes de disparar. No basta con desactivar las guías al
      // arrancar: tras el reload la app recarga su config desde IndexedDB y las vuelve
      // a habilitar, y el tour arranca DESPUÉS de navegar (hook de App.route). Si no se
      // limpia aquí, el overlay oscurece la captura y el popover tapa media pantalla.
      await page.evaluate(() => {
        if (window.App) {
          App._config = App._config || {};
          App._config.guides = { ...(App._config.guides || {}), enabled: false };
        }
        if (window.GuideManager && GuideManager.skip) { try { GuideManager.skip(); } catch (e) {} }
        document.querySelectorAll('.guide-overlay, .guide-popover, .guide-resume-chip, #guide-fab')
          .forEach(n => n.remove());
      });
      await new Promise(r => setTimeout(r, 400));

      const roto = await page.evaluate(() => {
        const d = document.getElementById('error-diag');
        return !!(d && getComputedStyle(d).display !== 'none' && d.innerText.trim());
      });
      if (roto) {
        const txt = await page.evaluate(() => document.getElementById('error-diag').innerText.slice(0, 120));
        console.log(`  ROTA  ${c.file} -> ${txt.split(String.fromCharCode(10)).join(' ')}`);
        if (errores.length) console.log('        causa real:', errores[errores.length - 1].slice(0, 150));
        // Recargar: sin esto el banner persiste y TODAS las capturas siguientes salen
        // con la pantalla de error (pasó con 18 de 32 en la tanda anterior).
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction('!!window.App', { timeout: 60000 });
        await new Promise(r => setTimeout(r, 2500));
        fallos.push(c.file);
        continue;
      }

      await page.screenshot({ path: path.join(SALIDA, c.file) });
      if (DUMP_TEXTO) {
        dumpTexto[c.file] = (await page.evaluate(() => {
          const h = location.hash;
          const vista = document.querySelector('main#app-content');
          const t = vista ? vista.innerText.replace(/\s+/g, ' ').trim() : '(sin main#app-content)';
          // El wizard/overlay se monta FUERA de main#app-content; si está visible, su
          // contenido es lo que se fotografía de verdad.
          const wiz = document.querySelector('.wizard-full-screen, .modal, [id^="wizard-"], .bottom-sheet-overlay');
          let w = '';
          // position:fixed -> offsetParent es null, no usar esa comprobación.
          if (wiz && getComputedStyle(wiz).display !== 'none' && getComputedStyle(wiz).visibility !== 'hidden') {
            w = ' [WIZ] ' + wiz.innerText.replace(/\s+/g, ' ').trim().slice(0, 600);
          }
          return h + ' || ' + t.slice(0, 450) + w;
        }));
      }
      console.log(`  OK    ${c.file}`);
      ok++;
    } catch (e) {
      console.log(`  FALLO ${c.file}: ${e.message.slice(0, 70)}`);
      fallos.push(c.file);
    }
  }

  await browser.close();
  srv.close();

  // Capturas idénticas = la navegación no funcionó. Es el fallo que nadie detectó
  // en las 148 anteriores, así que se comprueba explícitamente.
  const hashes = new Set();
  for (const c of lista) {
    const f = path.join(SALIDA, c.file);
    if (fs.existsSync(f)) hashes.add(crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex'));
  }
  console.log(`\n${ok}/${CAPTURAS.length} capturas en manual/img`);
  console.log(`Imágenes distintas: ${hashes.size}${hashes.size <= 1 ? '  <-- LA NAVEGACIÓN NO FUNCIONA' : ''}`);
  if (DUMP_TEXTO) {
    const fTexto = path.join(SALIDA, '_texto.json');
    fs.writeFileSync(fTexto, JSON.stringify(dumpTexto, null, 1), 'utf8');
    console.log(`Volcado de texto en ${fTexto} (${Object.keys(dumpTexto).length} capturas)`);
  }
  if (fallos.length) console.log('Fallaron:', fallos.join(', '));
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
