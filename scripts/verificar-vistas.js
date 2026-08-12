/**
 * Verificador de vistas — LIVESTOCK MANAGER
 *
 * Recorre todos los módulos y submódulos con los datos demo cargados y las guías
 * desactivadas, y comprueba en cada pantalla:
 *
 *   - errores de consola y excepciones no capturadas
 *   - banner de error (#error-diag) visible
 *   - vista vacía o atascada en "Cargando"
 *   - elementos rotos: imágenes que no cargan, botones sin texto ni aria-label,
 *     texto recortado por overflow, solapes en el nav inferior
 *   - datos presentes (para distinguir "vista vacía" de "vista sin datos demo")
 *
 * Alternativa determinista a lanzar un subagente por módulo: no depende de que
 * ninguno sobreviva y siempre mide lo mismo.
 *
 * Uso:
 *   node scripts/verificar-vistas.js               # todas
 *   node scripts/verificar-vistas.js --filtro info # solo rutas que casen
 *   node scripts/verificar-vistas.js --ver         # con ventana visible
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');

const RAIZ = path.join(__dirname, '..');
const PUERTO = 8797;
const VISIBLE = process.argv.includes('--ver');
const FILTRO = (() => { const i = process.argv.indexOf('--filtro'); return i > -1 ? process.argv[i + 1] : null; })();
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const ESPERA = 3500;

// Todos los módulos y submódulos. `tab` recorre las pestañas internas del pilar.
const VISTAS = [
  { ruta: '#/',                 nombre: 'Dashboard' },
  { ruta: '#/ganaderia',        nombre: 'GeGan · carrusel' },
  { ruta: '#/ganaderia?tab=animales',   nombre: 'GeGan · Animales' },
  { ruta: '#/ganaderia?tab=rebanos',    nombre: 'GeGan · Rebaños' },
  { ruta: '#/ganaderia?tab=patrimonio', nombre: 'GeGan · Patrimonio' },
  { ruta: '#/ganaderia?tab=zonas',      nombre: 'GeGan · Zonas' },
  { ruta: '#/ganaderia?tab=sanidad',    nombre: 'GeGan · Sanidad' },
  { ruta: '#/animales',         nombre: 'Animales (lista)' },
  { ruta: '#/rebanos',          nombre: 'Rebaños' },
  { ruta: '#/zonas',            nombre: 'Zonas' },
  { ruta: '#/explotacion',              nombre: 'ExPro · carrusel' },
  { ruta: '#/explotacion?tab=lacteo',   nombre: 'ExPro · Láctea' },
  { ruta: '#/explotacion?tab=silos',    nombre: 'ExPro · Silos' },
  { ruta: '#/explotacion?tab=tanques',  nombre: 'ExPro · Tanques' },
  { ruta: '#/explotacion?tab=fitosanitarios', nombre: 'ExPro · Fitosanitarios' },
  { ruta: '#/explotacion?tab=finanzas', nombre: 'ExPro · Finanzas' },
  { ruta: '#/explotacion?tab=proveedores', nombre: 'ExPro · Proveedores' },
  { ruta: '#/explotacion?tab=tramites', nombre: 'ExPro · Trámites' },
  { ruta: '#/comercializacion',                  nombre: 'CoMer · carrusel' },
  { ruta: '#/comercializacion?tab=leche',        nombre: 'CoMer · Leche' },
  { ruta: '#/comercializacion?tab=carne',        nombre: 'CoMer · Carne' },
  { ruta: '#/comercializacion?tab=compradores',  nombre: 'CoMer · Compradores' },
  { ruta: '#/comercializacion?tab=contratos',    nombre: 'CoMer · Contratos' },
  { ruta: '#/comercializacion?tab=transportistas', nombre: 'CoMer · Transportistas' },
  { ruta: '#/informes',         nombre: 'Informes' },
  { ruta: '#/cuaderno',         nombre: 'Cuaderno digital (libros)' },
  { ruta: '#/documentos',       nombre: 'Documentos' },
  { ruta: '#/trazabilidad',     nombre: 'Trazabilidad' },
  { ruta: '#/botiquin',         nombre: 'Botiquín' },
  { ruta: '#/saneamientos',     nombre: 'Saneamientos' },
  { ruta: '#/instalaciones',    nombre: 'Instalaciones' },
  { ruta: '#/subexplotaciones', nombre: 'Subexplotaciones' },
  { ruta: '#/gastos',           nombre: 'Gastos' },
  { ruta: '#/compradores',      nombre: 'Compradores' },
  { ruta: '#/proveedores',      nombre: 'Proveedores' },
  { ruta: '#/transportistas',   nombre: 'Transportistas' },
  { ruta: '#/agenda',           nombre: 'Agenda' },
  { ruta: '#/albaranes-ventas', nombre: 'Albaranes de venta' },
  { ruta: '#/margen-animal',    nombre: 'Margen por animal' },
  { ruta: '#/silos',            nombre: 'Silos' },
  { ruta: '#/manuales',         nombre: 'Manuales' },
  { ruta: '#/ajustes',          nombre: 'Ajustes' },
  { ruta: '#/sistema',          nombre: 'Sistema' },
  { ruta: '#/alertas',          nombre: 'Alertas' }
];

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

(async () => {
  const srv = await servir();
  const browser = await puppeteer.launch({ headless: !VISIBLE, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  let erroresVista = [];
  page.on('pageerror', e => erroresVista.push('EXCEPCION: ' + (e.message || e).toString().slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') erroresVista.push('CONSOLA: ' + m.text().slice(0, 160)); });

  // Guías desactivadas antes de que la app arranque
  await page.evaluateOnNewDocument(() => {
    setInterval(() => {
      if (window.App) { App._config = App._config || {}; App._config.guides = { ...(App._config.guides || {}), enabled: false }; }
      document.querySelectorAll('.guide-overlay, .guide-popover, .guide-resume-chip, #guide-fab').forEach(n => n.remove());
    }, 300);
  });

  await page.goto(`http://localhost:${PUERTO}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('!!window.App && !!window.Fincas', { timeout: 90000 });

  const sembrado = await page.evaluate(async () => {
    let id = await Fincas.getActiveId().catch(() => null);
    if (!id) {
      if (window.AsistenteConfiguracion?._ensureSeedData) await AsistenteConfiguracion._ensureSeedData();
      if (window.SeedData?.run) { await SeedData.run(true); return true; }
    }
    return false;
  });
  if (sembrado) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction('!!window.App', { timeout: 90000 });
    await new Promise(r => setTimeout(r, 3000));
  }

  // Espera activa a que la vista pinte algo distinto del loader. Sustituye a las
  // esperas fijas: una vista lenta ya no se marca como "Cargando" por poco margen.
  const esperarPintado = async (ms = 12000) => {
    try {
      await page.waitForFunction(() => {
        const t = (document.querySelector('main#app-content')?.innerText || '').trim();
        return t.length > 0 && !/^Cargando/.test(t);
      }, { timeout: ms, polling: 200 });
      return true;
    } catch { return false; }
  };

  // Asentar el hash antes de la primera navegación: al arrancar está vacío y la
  // primera navegación compite con la secuencia de arranque (falso "Cargando").
  await esperarPintado();
  await page.evaluate(() => { location.hash = '#/'; });
  await esperarPintado();
  await new Promise(r => setTimeout(r, 800));

  const lista = FILTRO ? VISTAS.filter(v => (v.ruta + v.nombre).toLowerCase().includes(FILTRO.toLowerCase())) : VISTAS;
  const informe = [];

  for (const v of lista) {
    erroresVista = [];
    try {
      await page.evaluate(async nav => {
        document.querySelectorAll('.wizard-full-screen').forEach(n => n.remove());
        const d = document.getElementById('error-diag'); if (d) { d.style.display = 'none'; d.innerHTML = ''; }
        // Navegar SOLO por el hash, igual que hace el usuario al pulsar el nav.
        // Llamar además a App.route() a mano lanza una segunda navegación en
        // paralelo que repinta el loader sobre la vista ya renderizada y da
        // falsos "Cargando...". Si el hash ya coincide no hay hashchange, así
        // que se pasa por el dashboard para forzar el cambio.
        if (location.hash === nav) {
          location.hash = '#/';
          await new Promise(r => setTimeout(r, 400));
        }
        location.hash = nav;
      }, v.ruta);
      await esperarPintado();
      await new Promise(r => setTimeout(r, ESPERA));

      const d = await page.evaluate(() => {
        const main = document.querySelector('main#app-content');
        const texto = (main?.innerText || '').trim();
        const diag = document.getElementById('error-diag');
        const imgsRotas = Array.from(document.querySelectorAll('img'))
          .filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')).slice(0, 3);
        const botonesSinNombre = Array.from(main?.querySelectorAll('button') || [])
          .filter(b => !(b.textContent || '').trim() && !b.getAttribute('aria-label') && !b.querySelector('svg')).length;
        // Texto cortado SIN indicacion visual. `truncate` (text-overflow:
        // ellipsis) recorta a proposito y muestra los puntos suspensivos, asi
        // que no es un fallo: marcarlo solo generaba ruido.
        const desbordan = Array.from(main?.querySelectorAll('*') || [])
          .filter(e => {
            const cs = getComputedStyle(e);
            return e.scrollWidth > e.clientWidth + 4
              && cs.overflowX === 'hidden'
              && cs.textOverflow !== 'ellipsis';
          }).length;
        // Elemento con contenido real pero ancho 0: no se ve nada en pantalla.
        // Es lo que le pasaba al titulo de las tarjetas de Fitosanitarios, y el
        // detector de arriba no lo distinguia de un recorte intencionado.
        const invisibles = Array.from(main?.querySelectorAll('*') || [])
          .filter(e => e.scrollWidth > 20
            && e.getBoundingClientRect().width < 1
            && (e.textContent || '').trim().length > 3)
          .map(e => (e.className || e.tagName).toString().slice(0, 40)).slice(0, 3);
        return {
          vacia: texto.length < 25,
          cargando: /Cargando|Iniciando/i.test(texto.slice(0, 60)),
          banner: !!(diag && getComputedStyle(diag).display !== 'none' && (diag.innerText || '').trim()),
          bannerTexto: (diag?.innerText || '').slice(0, 90),
          chars: texto.length,
          imgsRotas, botonesSinNombre, desbordan, invisibles,
          muestra: texto.replace(/\s+/g, ' ').slice(0, 70)
        };
      });

      const problemas = [];
      if (d.banner)   problemas.push('BANNER: ' + d.bannerTexto.replace(/\n/g, ' '));
      if (d.vacia)    problemas.push('VISTA VACIA');
      if (d.cargando) problemas.push('ATASCADA EN CARGANDO');
      if (d.imgsRotas.length) problemas.push('IMG ROTA: ' + d.imgsRotas.join(', '));
      if (d.botonesSinNombre) problemas.push(`${d.botonesSinNombre} boton(es) sin nombre accesible`);
      if (d.desbordan > 2) problemas.push(`${d.desbordan} elementos con texto cortado sin indicacion`);
      if (d.invisibles?.length) problemas.push(`TEXTO INVISIBLE (ancho 0): ${d.invisibles.join(', ')}`);
      erroresVista.slice(0, 2).forEach(e => problemas.push(e));

      informe.push({ ...v, chars: d.chars, muestra: d.muestra, problemas });
      const marca = problemas.length ? 'X' : 'OK';
      console.log(`  ${marca.padEnd(3)} ${v.nombre.padEnd(32)} ${String(d.chars).padStart(6)} car.${problemas.length ? '  ' + problemas[0].slice(0, 60) : ''}`);
      if (problemas.length > 1) problemas.slice(1).forEach(p => console.log(`        ${p.slice(0, 90)}`));

      if (d.banner) { await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction('!!window.App', { timeout: 60000 }); await new Promise(r => setTimeout(r, 2500)); }
    } catch (e) {
      informe.push({ ...v, problemas: ['FALLO: ' + e.message.slice(0, 80)] });
      console.log(`  X   ${v.nombre.padEnd(32)} -> ${e.message.slice(0, 60)}`);
    }
  }

  await browser.close();
  srv.close();

  const conFallo = informe.filter(i => i.problemas.length);
  console.log(`\n===== RESUMEN =====`);
  console.log(`  vistas revisadas: ${informe.length}`);
  console.log(`  sin problemas:    ${informe.length - conFallo.length}`);
  console.log(`  con problemas:    ${conFallo.length}`);
  if (conFallo.length) {
    console.log('\n  DETALLE:');
    conFallo.forEach(i => { console.log(`   - ${i.nombre} (${i.ruta})`); i.problemas.forEach(p => console.log(`       ${p.slice(0, 110)}`)); });
  }
  fs.writeFileSync(path.join(RAIZ, 'docs/auditorias/verificacion-vistas.json'), JSON.stringify(informe, null, 2));
  console.log('\n  informe: docs/auditorias/verificacion-vistas.json');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
