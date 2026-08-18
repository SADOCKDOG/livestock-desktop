const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:8089';
const OUTDIR = path.join(__dirname, '..', 'cypress', 'screenshots');
const PORT = 9222;
const WS_LIST = 'http://127.0.0.1:' + PORT + '/json/list';
const UDDIR = path.join(require('os').tmpdir(), 'cdp-val-' + Date.now());

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function get(url) { return new Promise((res, rej) => { http.get(url, r => { let d=''; r.on('data', c => d+=c); r.on('end', () => res(d)); }).on('error', rej); }); }

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--hide-scrollbars',
  '--window-size=1440,900', '--force-device-scale-factor=1',
  '--remote-debugging-port=' + PORT,
  '--no-first-run', `--user-data-dir=${UDDIR}`, '--disable-extensions',
  '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--run-all-compositor-stages-before-draw',
  BASE + '/'
], { stdio: 'ignore' });

let ws;
function cdpSend(method, params = {}) {
  return new Promise((resolve) => {
    if (!ws || ws.readyState !== 1) return resolve(null);
    const id = Math.floor(Math.random() * 1e7);
    const onMsg = async (ev) => {
      const data = ev.data && typeof ev.data === 'object' && typeof ev.data.text === 'function'
        ? await ev.data.text()
        : String(ev.data);
      const m = JSON.parse(data);
      if (m.id === id) { ws.removeEventListener('message', onMsg); resolve(m); }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
function cdpEval(expr) {
  return cdpSend('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    .then(r => r && r.result ? r.result.result.value : null);
}
function cdpShot(name) {
  return cdpSend('Page.captureScreenshot', { format: 'png' }).then(r => {
    if (r && r.result && r.result.data) {
      const filePath = path.join(OUTDIR, name);
      fs.writeFileSync(filePath, Buffer.from(r.result.data, 'base64'));
      // ---- NEW: store hash of the just‑saved screenshot ----
      const buf = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      return { filePath, hash };
    }
    return { filePath: null, hash: null };
  });
}
async function cdpFlush(frames = 3) {
  for (let i = 0; i < frames; i++) {
    await cdpEval(`new Promise(r => requestAnimationFrame(() => r()))`);
    await sleep(120);
  }
}

async function waitSuitableViewport(push) {
  const MAX_TRIES = 30;
  for (let i = 0; i < MAX_TRIES; i++) {
    const width = await cdpEval('window.innerWidth');
    push(`[VIEWPORT] width=${width}`);
    if (width >= 1024) return true;
    await sleep(500);
  }
  push('[VIEWPORT] ERROR: width stayed < 1024 after ${MAX_TRIES} tries');
  return false;
}

async function waitGastosLoaded(push) {
  const MAX_TRIES = 30;
  for (let i = 0; i < MAX_TRIES; i++) {
    const raw = await cdpEval('(document.querySelector("#gastos-content") || {}).textContent || ""');
    const txt = typeof raw === 'string' ? raw : String(raw);
    push(`[GASTOS-LOAD] text="${txt.substring(0, 30)}"`);
    if (!txt.includes('Cargando gastos...')) return true;
    await sleep(500);
  }
  push('[GASTOS-LOAD] ERROR: still shows "Cargando gastos..." after ${MAX_TRIES} tries');
  return false;
}

// Informe del estado del DOM: presencia de sidebar, pestaña activa, FAB y texto visible
async function domReport(label, push) {
  const r = await cdpEval(`(() => JSON.stringify({
    hash: location.hash,
    appContentChars: (document.getElementById('app-content') || {}).textContent.length,
    appContentText: ((document.getElementById('app-content') || {}).textContent || '').trim().slice(0, 120),
    erpSidebar: !!document.querySelector('.erp-sidebar'),
    sidebarActive: Array.from(document.querySelectorAll('.sidebar-link.active')).map(a => a.getAttribute('data-route')).join('|'),
    fab: !!document.querySelector('.fab-container'),
    gastosText: (document.body.textContent || '').indexOf('Gastos') !== -1
  }))()`);
  push('[DOM] ' + label + ': ' + r);
}

(async () => {
  const informe = [];
  const push = (s) => { informe.push(s); console.log(s); };
  let previousHash = null;

  try {
    fs.mkdirSync(OUTDIR, { recursive: true });

    // Esperar a que Chrome exponga el endpoint debugging
    let target = null;
    let lastList = '[]';
    for (let i = 0; i < 120; i++) {
      try {
        lastList = await get(WS_LIST);
        const list = JSON.parse(lastList);
        target = (list || []).find(t => t.type === 'page' && String(t.url).indexOf('localhost:8089') !== -1) || null;
        if (target) break;
      } catch (_) { /* retry */ }
      await sleep(500);
    }
    if (!target) {
      console.error('[CDP] list raw:', lastList.slice(0, 300));
      throw new Error('Chrome no expuso target de la app en /json/list');
    }

    // Conectar por WebSocket (nativo de Node)
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });

    await cdpSend('Page.enable');
    await cdpSend('Runtime.enable');

    // Esperar ARRANQUE REAL de la app
    let ready = false;
    for (let i = 0; i < 90; i++) {
      const v = await cdpEval('(!!window.App && document.getElementById("app-content") && document.getElementById("app-content").children.length > 0)');
      if (v) { ready = true; break; }
      await sleep(500);
    }
    if (!ready) {
      const html = await cdpEval('document.body.innerHTML.slice(0,200)');
      push('[ARRANQUE] FAIL: la app no pinto #app-content en 45s');
      push('[ARRANQUE] body head: ' + String(html).slice(0,150));
      await cdpShot('val-arranque-FAIL.png');
      informe.push('[FIN] done');
      fs.writeFileSync(path.join(OUTDIR, 'val-informe.txt'), informe.join('\n'));
      try { server.kill(); } catch (_) {}
      try { server.stdin.end(); } catch (_) {}
      return;
    }
    push('[ARRANQUE] OK: app pinto contenido en app-content');

    // Sembrar datos demo para que la app muestre contenido real
    push('[DEMO] sembrando datos demo antes de capturar');
    try {
      const seedResult = await cdpEval(`(async () => {
        if (!window.AsistenteConfiguracion) return 'ERR: no AsistenteConfiguracion';
        const ok = await window.AsistenteConfiguracion._ensureSeedData();
        if (!ok) return 'ERR: _ensureSeedData false';
        const start = Date.now();
        await window.SeedData.run(true);
        return 'OK en ' + (Date.now() - start) + 'ms';
      })()`);
      push('[DEMO] resultado: ' + seedResult);
    } catch (e) {
      push('[DEMO] error sembrando: ' + e);
    }

    // Recargar para que la app arranque con la finca activa
    push('[RELOAD] recargando con datos demo...');
    await cdpEval('() => { window.location.reload(); return true; }');
    await sleep(6000);

    // Esperar a que la app vuelva a arrancar tras la recarga
    let ready2 = false;
    for (let i = 0; i < 90; i++) {
      const v = await cdpEval('(!!window.App && document.getElementById("app-content") && document.getElementById("app-content").children.length > 0)');
      if (v) { ready2 = true; break; }
      await sleep(500);
    }
    if (!ready2) {
      push('[ARRANQUE-2] FAIL: la app no pinto #app-content tras la recarga');
    } else {
      push('[ARRANQUE-2] OK: app arrancada con datos demo');
    }

    // Aseguramos viewport >= 1024 CSS px
    const viewportOk = await waitSuitableViewport(push);
    if (!viewportOk) throw new Error('Viewport never reached >=1024 CSS px');

    // Esperar a que la app haya cargado el contenido inicial
    await sleep(1500);
    await cdpFlush(4);
    const dash1 = await cdpShot('val-dashboard.png');   // captura 1: Dashboard/Inicio
    push('[SHOT] val-dashboard.png guardada, hash=' + dash1.hash);
    previousHash = dash1.hash;
    await domReport('dashboard', push);

    // ---- GUÍAS REGISTRADAS ----
    const g = await cdpEval('window.GuideRegistry ? window.GuideRegistry.getAll().map(x=>x.id).sort() : []');
    const ids = Array.isArray(g) ? g.slice().sort() : [];
    push('[REGISTRY] guias=' + ids.length + (ids.length === 22 ? ' OK' : ' (esperado 22)'));
    push('[REGISTRY] ids: ' + ids.join(', '));
    push('[REGISTRY] inicio.dashboard presente: ' + ids.includes('inicio.dashboard'));
    push('[REGISTRY] expro.gastos presente: ' + ids.includes('expro.gastos'));

    // Navegar a Gastos (ExPro), FORZANDO la carga del grupo expro y esperando redraw
    await cdpEval(`(async () => {
      try { await App._ensureViewGroup('expro'); } catch (e) { window.__gd = String(e && e.message || e); }
      location.hash = '#/explotacion?tab=gastos';
      return 'navegado';
    })()`);
    await sleep(2500);
    const gastosReady = await cdpEval('!!window.GastosView && document.getElementById("app-content") && (document.getElementById("app-content").textContent.length > 50)');
    push('[GASTOS] renderizado tras hash (grupo cargado): ' + gastosReady + ' | err=' + await cdpEval('window.__gd'));
    await cdpFlush(4);
    await domReport('gastos', push);
    const gastoss = await cdpShot('val-gastos.png');   // captura 2: Gastos
    push('[SHOT] val-gastos.png guardada, hash=' + gastoss.hash);
    if (previousHash && previousHash === gastoss.hash) {
      push('[ABORT] Duplicate hash detected – aborting further captures');
      // End this run – no new visual info will be generated.
    }
    previousHash = gastoss.hash;

    // DIAGNÓSTICO: forzar la carga del grupo 'expro' y ver si GastosView queda
    const diag = await cdpEval(`(async () => {
      const before = typeof window.GastosView;
      let forced = 'not-run';
      let loadErr = null;
      try { forced = await App._ensureViewGroup('expro'); } catch (e) { loadErr = String(e && e.message || e); }
      const after = typeof window.GastosView;
      const scripts = Array.from(document.querySelectorAll('script[src*="gastos-view"]')).map(s => s.src);
      return JSON.stringify({ before, forced, loadErr, after, scripts });
    })()`);
    push('[DIAG] ' + diag);

    // Reintento captura dashboard tras navegar atrás (para ver el FAB guía)
    await cdpEval('location.hash = "#/"');
    await sleep(2000);
    await cdpFlush(4);
    await domReport('inicio', push);
    const dash2 = await cdpShot('val-dashboard2.png');
    push('[SHOT] val-dashboard2.png guardada, hash=' + dash2.hash);
    if (previousHash && previousHash === dash2.hash) {
      push('[ABORT] Duplicate hash detected – aborting further captures');
      // End this run – no new visual info will be generated.
    }
    previousHash = dash2.hash;

    // Esperar a que la carga de gastos finalice antes de cerrar
    const cargado = await waitGastosLoaded(push);
    if (!cargado) throw new Error('Los gastos no terminaron de cargar');

    push('[FIN] done');
    fs.writeFileSync(path.join(OUTDIR, 'val-informe.txt'), informe.join('\n'));
  } catch (e) {
    push('[ERROR] ' + e.message);
  } finally {
    try { ws && ws.close(); } catch (_) {}
    try { chrome.kill(); } catch (_) {}
    try { server?.kill(); } catch (_) {}
    try { server?.stdin.end(); } catch (_) {}
  }
})();