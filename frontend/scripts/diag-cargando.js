/**
 * Diagnóstico dirigido de las vistas que se quedan en "Cargando" en navegador.
 * Comprueba primero QUÉ se está sirviendo (para descartar que apunte a la PWA
 * publicada) y luego captura la causa real: errores, peticiones fallidas y estado
 * interno de la vista.
 */
const fs = require('fs'), path = require('path'), http = require('http');
const puppeteer = require('puppeteer');
const RAIZ = path.join(__dirname, '..');
const PUERTO = 8796;
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
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  let errs = [], fallidas = [], externas = [];
  page.on('pageerror', e => errs.push('EXCEPCION: ' + (e.message || e).toString().slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLA: ' + m.text().slice(0, 200)); });
  page.on('requestfailed', r => fallidas.push(r.url().slice(0, 120) + ' :: ' + (r.failure()?.errorText || '')));
  page.on('request', r => { const u = r.url(); if (!u.startsWith(`http://localhost:${PUERTO}`) && !u.startsWith('data:')) externas.push(u.slice(0, 110)); });

  await page.evaluateOnNewDocument(() => {
    setInterval(() => {
      if (window.App) { App._config = App._config || {}; App._config.guides = { ...(App._config.guides||{}), enabled: false }; }
      document.querySelectorAll('.guide-overlay, .guide-popover').forEach(n => n.remove());
    }, 300);
  });

  await page.goto(`http://localhost:${PUERTO}/index.html`, { waitUntil: 'domcontentloaded' });

  // ¿QUE estamos sirviendo? Android tiene capacitor.js; la PWA no.
  const identidad = await page.evaluate(() => ({
    url: location.href,
    origen: location.origin,
    capacitorJs: !!document.querySelector('script[src*="capacitor.js"]'),
    desktopCss: !!document.querySelector('link[href*="desktop.css"]'),
    version: document.querySelector('link[href*="styles.css"]')?.href.match(/v=([\d.]+)/)?.[1]
  }));
  console.log('=== IDENTIDAD DE LO SERVIDO ===');
  console.log('  url:', identidad.url);
  console.log('  capacitor.js (solo Android):', identidad.capacitorJs);
  console.log('  desktop.css  (solo PWA):    ', identidad.desktopCss);
  console.log('  version css:', identidad.version);
  console.log('  => es', identidad.capacitorJs && !identidad.desktopCss ? 'ANDROID' : (identidad.desktopCss ? 'PWA' : 'INDETERMINADO'));

  await page.waitForFunction('!!window.App && !!window.Fincas', { timeout: 90000 });
  const sembrado = await page.evaluate(async () => {
    let id = await Fincas.getActiveId().catch(() => null);
    if (!id) { if (window.AsistenteConfiguracion?._ensureSeedData) await AsistenteConfiguracion._ensureSeedData();
               if (window.SeedData?.run) { await SeedData.run(true); return true; } }
    return false;
  });
  if (sembrado) { await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction('!!window.App', { timeout: 90000 }); await new Promise(r => setTimeout(r, 3000)); }

  // Esperar a que el arranque termine de pintar antes de navegar: si no, la
  // primera navegación colisiona con el render inicial y deja el loader.
  const esperarPintado = async (ms = 15000) => {
    try {
      await page.waitForFunction(() => {
        const t = (document.querySelector('main#app-content')?.innerText || '').trim();
        return t.length > 0 && !/^Cargando/.test(t);
      }, { timeout: ms, polling: 200 });
      return true;
    } catch { return false; }
  };
  await esperarPintado();
  // Asentar el hash antes de la primera navegación: al arrancar está vacío y la
  // primera navegación compite con la secuencia de arranque (falso "Cargando").
  await page.evaluate(() => { location.hash = '#/'; });
  await esperarPintado();
  await new Promise(r => setTimeout(r, 800));

  for (const ruta of ['#/comercializacion', '#/margen-animal']) {
    errs = []; fallidas = []; externas = [];
    console.log(`\n=== ${ruta} ===`);
    await page.evaluate(async nav => {
      // Solo hash: ver la nota en scripts/verificar-vistas.js.
      if (location.hash === nav) { location.hash = '#/'; await new Promise(r => setTimeout(r, 400)); }
      location.hash = nav;
    }, ruta);
    const pinto = await esperarPintado(10000);
    if (!pinto) console.log('  (agotada la espera de pintado)');
    await new Promise(r => setTimeout(r, 800));

    const d = await page.evaluate(() => {
      const main = document.querySelector('main#app-content');
      return {
        texto: (main?.innerText || '').replace(/\s+/g, ' ').slice(0, 100),
        chars: (main?.innerText || '').trim().length,
        html: (main?.innerHTML || '').slice(0, 160),
        vistaGlobal: typeof ComercializacionView !== 'undefined' ? 'ComercializacionView OK' : (typeof MargenAnimalView !== 'undefined' ? 'MargenAnimalView OK' : 'vista NO cargada')
      };
    });
    console.log('  contenido :', d.chars, 'car. ->', d.texto || '(vacio)');
    console.log('  html      :', d.html.replace(/\s+/g, ' '));
    console.log('  vista JS  :', d.vistaGlobal);
    if (errs.length)     { console.log('  ERRORES:'); errs.slice(0,4).forEach(e => console.log('    ' + e)); }
    if (fallidas.length) { console.log('  PETICIONES FALLIDAS:'); fallidas.slice(0,5).forEach(f => console.log('    ' + f)); }
    if (externas.length) { console.log('  PETICIONES EXTERNAS:'); [...new Set(externas)].slice(0,5).forEach(u => console.log('    ' + u)); }
    if (!errs.length && !fallidas.length) console.log('  (sin errores ni peticiones fallidas)');
  }

  await browser.close(); srv.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
