/**
 * Verificador de capa ERP por lotes (fase 3).
 *
 * Para cada ruta pasada por argumento (p.ej. "#/tanques"), navega la app
 * servida en localhost:8089 y afirma una CONDICIÓN DE CONTENIDO en el DOM
 * antes de dar por buena la vista. Si no se cumple, la ruta FALLA (sin verde
 * falso). Esto materializa la regla de validación del proyecto: "lo único que
 * sostiene una validación es afirmar qué debe contener cada captura y abortar
 * si no está".
 *
 * Uso:
 *   node scripts/verify-erp-views.cjs "#/" "#/tanques" "#/agenda"
 *   node scripts/verify-erp-views.cjs --width=411 "#/" "#/agenda"   # modo móvil
 *
 * En modo escritorio (width >= 1024) exige sidebar visible + chrome ERP
 * (erp-action-group, data-ver-mas). En modo móvil (width < 1024) exige
 * sidebar OCULTA y, para las vistas que la tienen, el fab-container móvil
 * presente (nav móvil intacta), además de que la chrome ERP no rompa nada.
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:8089';
const PORT = 9222;
const WS_LIST = 'http://127.0.0.1:' + PORT + '/json/list';
const UDDIR = path.join(require('os').tmpdir(), 'cdp-verify-' + Date.now());

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function get(url) { return new Promise((res, rej) => { http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); }).on('error', rej); }); }

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
async function evalObj(expr) {
  const s = await cdpEval(expr);
  if (s === null || s === undefined) return { ok: false, why: ['eval-null'] };
  if (typeof s === 'object') return s;
  try { return JSON.parse(s); } catch (e) { return { ok: false, why: ['parse-error:' + String(s).slice(0, 120)] }; }
}

async function disableAndDismissGuides() {
  await evalObj(`(async () => {
    try {
      const guideIds = (window.GuideRegistry ? window.GuideRegistry.getAll() : []).map(g => g.id);
      if (window.App) {
        window.App._config = window.App._config || {};
        window.App._config.guides = { enabled: false, seen: guideIds, dismissed: guideIds };
      }
      const meta = (window.db) ? (await window.db.get('meta', 'appConfig').catch(() => null)) : null;
      const merged = Object.assign({}, (meta && meta.value) ? meta.value : {}, { guides: { enabled: false, seen: guideIds, dismissed: guideIds } });
      if (window.App) window.App._config = merged;
      if (window.db) { try { await window.db.put('meta', { key: 'appConfig', value: merged }); } catch (e) {} }
      if (window.GuideManager) { try { window.GuideManager.skip(); } catch (e) {} }
      document.querySelectorAll('.guide-overlay, .guide-popover, .guide-resume-chip').forEach(n => n.remove());
      return JSON.stringify({ ok: true, guides: guideIds.length });
    } catch (e) { return JSON.stringify({ ok: false, err: String(e && e.message || e) }); }
  })()`);
}

// Esperado por ruta: features de chrome ERP que SÍ deben estar en el DOM.
// El Inicio no es una lista y no las tiene; tanques/agenda sí (fase 3 piloto).
const EXPECT = {
  '#/': [],
  '#/explotacion?tab=lacteo&sub=tanques': ['erp-action-group', 'data-ver-mas'],
  '#/agenda': ['erp-action-group', 'data-ver-mas'],
  '#/cuaderno': ['erp-action-group'],
  '#/ajustes': [],
};

function makeCheck(mobile, expected) {
  const exp = expected && expected.length ? JSON.stringify(expected) : '[]';
  // Devuelve una IIFE que evalúa la vista actual y devuelve JSON con ok/why.
  if (mobile) {
    return `(() => {
      const r = { ok: true, why: [], mode: 'mobile' };
      const welc = document.getElementById('asistente-configuracion-contenedor');
      if (welc) { r.ok = false; r.why.push('welcome-present'); }
      if (document.querySelector('.guide-popover') || document.querySelector('.guide-overlay')) { r.ok = false; r.why.push('guide-present'); }
      const sb = document.querySelector('.erp-sidebar');
      if (sb) {
        const b = sb.getBoundingClientRect();
        const cs = getComputedStyle(sb);
        const visible = (b.width > 4 && b.height > 4) && cs.display !== 'none' && cs.visibility !== 'hidden';
        if (visible) { r.ok = false; r.why.push('sidebar-visible-en-movil'); }
      }
      // Nav móvil intacta: si hay fab-container, NO debe estar oculto.
      const fab = document.querySelector('.fab-container');
      r.fab = !!fab;
      if (fab) {
        const fb = fab.getBoundingClientRect();
        const fcs = getComputedStyle(fab);
        const fvis = (fb.width > 4 && fb.height > 4) && fcs.display !== 'none' && fcs.visibility !== 'hidden';
        if (!fvis) { r.ok = false; r.why.push('fab-oculto-en-movil'); }
      }
      const ac = document.getElementById('app-content');
      r.appLen = ac ? ac.textContent.trim().length : 0;
      if (r.appLen < 40) { r.ok = false; r.why.push('app-content-vacio'); }
      r.route = location.hash;
      return JSON.stringify(r);
    })()`;
  }
  return `(() => {
    const r = { ok: true, why: [], mode: 'desktop' };
    const welc = document.getElementById('asistente-configuracion-contenedor');
    if (welc) { r.ok = false; r.why.push('welcome-present'); }
    if (document.querySelector('.guide-popover') || document.querySelector('.guide-overlay')) { r.ok = false; r.why.push('guide-present'); }
    const sb = document.querySelector('.erp-sidebar');
    if (!sb) { r.ok = false; r.why.push('no-sidebar'); }
    else {
      const b = sb.getBoundingClientRect();
      const cs = getComputedStyle(sb);
      if (b.width < 4 || b.height < 4 || cs.display === 'none' || cs.visibility === 'hidden') { r.ok = false; r.why.push('sidebar-hidden'); }
      else r.sidebarW = Math.round(b.width);
    }
    // Features de chrome ERP esperadas en ESTA ruta (fase 3).
    const exp = ${exp};
    const ac = document.getElementById('app-content');
    r.appLen = ac ? ac.textContent.trim().length : 0;
    if (r.appLen < 40) { r.ok = false; r.why.push('app-content-vacio'); }
    for (const f of exp) {
      let found = false;
      if (f === 'erp-action-group') found = !!document.querySelector('.erp-action-group');
      else if (f === 'data-ver-mas') found = !!document.querySelector('[data-ver-mas]');
      else found = !!document.querySelector(f);
      if (!found) { r.ok = false; r.why.push('falta:' + f); }
      else r['has_' + f] = true;
    }
    r.route = location.hash;
    return JSON.stringify(r);
  })()`;
}

(async () => {
  const args = process.argv.slice(2);
  let width = 1440;
  const routes = [];
  for (const a of args) {
    if (a.startsWith('--width=')) width = parseInt(a.split('=')[1], 10) || 1440;
    else routes.push(a);
  }
  if (routes.length === 0) routes.push('#/');
  const mobile = width < 1024;

  const log = [];
  const push = (s) => { log.push(s); console.log(s); };
  const results = [];

  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--hide-scrollbars',
    '--window-size=' + width + ',900', '--force-device-scale-factor=1',
    '--remote-debugging-port=' + PORT,
    '--no-first-run', `--user-data-dir=${UDDIR}`, '--disable-extensions',
    '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--run-all-compositor-stages-before-draw',
    BASE + '/'
  ], { stdio: 'ignore' });

  try {
    let target = null, lastList = '[]';
    for (let i = 0; i < 120; i++) {
      try {
        lastList = await get(WS_LIST);
        const list = JSON.parse(lastList);
        target = (list || []).find(t => t.type === 'page' && String(t.url).indexOf('localhost:8089') !== -1) || null;
        if (target) break;
      } catch (_) { /* retry */ }
      await sleep(500);
    }
    if (!target) { console.error('[CDP] list raw:', lastList.slice(0, 300)); throw new Error('Chrome no expuso target'); }

    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    await cdpSend('Page.enable');
    await cdpSend('Runtime.enable');
    await cdpSend('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: mobile });

    let ready = false;
    for (let i = 0; i < 90; i++) {
      const v = await cdpEval('(!!window.App && document.getElementById("app-content") && document.getElementById("app-content").children.length > 0)');
      if (v) { ready = true; break; }
      await sleep(500);
    }
    if (!ready) { push('[ARRANQUE] FAIL'); return writeOut(); }

    const seed = await evalObj(`(async () => {
      try {
        if (!window.AsistenteConfiguracion) return JSON.stringify({ err: 'no Asistente' });
        if (!await window.AsistenteConfiguracion._ensureSeedData()) return JSON.stringify({ err: '_ensureSeedData false' });
        if (!window.SeedData || typeof window.SeedData.run !== 'function') return JSON.stringify({ err: 'no SeedData.run' });
        await window.SeedData.run(true);
        const fincas = await (window.Fincas ? window.Fincas.list() : []);
        if (!fincas || fincas.length === 0) return JSON.stringify({ err: 'no fincas' });
        let id = await (window.Fincas ? window.Fincas.getActiveId() : null);
        if (!id) { await window.Fincas.setActiveId(fincas[0].id); id = await window.Fincas.getActiveId(); }
        const g = (window.GuideRegistry ? window.GuideRegistry.getAll() : []).map(x => x.id);
        if (window.App) window.App._config = Object.assign(window.App._config || {}, { guides: { enabled: false, seen: g, dismissed: g } });
        return JSON.stringify({ ok: true, fincaActiva: id, guias: g.length });
      } catch (e) { return JSON.stringify({ err: String(e && e.message || e) }); }
    })()`);
    push('[DEMO] ' + JSON.stringify(seed));
    if (!seed || !seed.ok) { push('[DEMO] FAIL'); return writeOut(); }

    await cdpSend('Page.navigate', { url: BASE + '/' });
    await sleep(6000);
    let ready2 = false;
    for (let i = 0; i < 90; i++) {
      const v = await cdpEval('(!!window.App && document.getElementById("app-content") && document.getElementById("app-content").children.length > 0)');
      if (v) { ready2 = true; break; }
      await sleep(500);
    }
    if (!ready2) { push('[ARRANQUE-2] FAIL'); return writeOut(); }

    // Estabilizar finca activa y re-enrutar.
    for (let i = 0; i < 50; i++) {
      const st = await evalObj(`(async () => { const id = await window.Fincas.getActiveId(); const welc = !!document.getElementById('asistente-configuracion-contenedor'); return JSON.stringify({ id, welc }); })()`);
      if (st && st.id) {
        await cdpEval(`(async () => { const w = document.getElementById('asistente-configuracion-contenedor'); if (w) w.remove(); if (window.App && typeof window.App.route === 'function') { try { await window.App.route(); } catch (e) {} } return true; })()`);
        await sleep(400);
        const chk = await evalObj(`(() => JSON.stringify({ welc: !!document.getElementById('asistente-configuracion-contenedor') }))()`);
        if (chk && !chk.welc) break;
      }
      await sleep(400);
    }
    await disableAndDismissGuides();
    await sleep(800);

    push('[MODOMODO] ' + (mobile ? 'MOVIL@' + width : 'ESCRITORIO@' + width));

    for (const route of routes) {
      const expected = EXPECT[route] || [];
      const checkExpr = makeCheck(mobile, expected);
      push('[NAV] ' + route + (expected.length ? ' (espera: ' + expected.join(',') + ')' : ''));
      await cdpEval(`(async () => { location.hash = ${JSON.stringify(route)}; return 'ok'; })()`);
      // Esperar a que app-content se repinte y la ruta se asiente.
      let res = null;
      for (let i = 0; i < 40; i++) {
        const r = await evalObj(`(async () => { return ${checkExpr}; })()`);
        if (r && r.route === route && r.appLen >= 40) { res = r; break; }
        await sleep(500);
      }
      if (!res) res = await evalObj(`(async () => { return ${checkExpr}; })()`);
      res = res || { ok: false, why: ['sin-respuesta'] };
      push('[CHECK] ' + route + ' -> ' + JSON.stringify(res));
      results.push({ route, ok: !!(res && res.ok), why: res && res.why });
    }

    const pasadas = results.filter(r => r.ok).length;
    push('[RESUMEN] vistas validas: ' + pasadas + '/' + results.length);
    results.forEach(r => push('  - ' + r.route + ': ' + (r.ok ? 'OK' : 'FALLO ' + JSON.stringify(r.why))));
    push('[RESUMEN] ' + (pasadas === results.length ? 'VERIFICACION COMPLETA' : 'VERIFICACION INCOMPLETA'));
  } catch (e) {
    push('[ERROR] ' + e.message);
  } finally {
    try { ws && ws.close(); } catch (_) {}
    try { chrome.kill(); } catch (_) {}
  }

  function writeOut() {
    const out = path.join(__dirname, '..', 'cypress', 'screenshots', 'verify-views-informe.txt');
    try { require('fs').mkdirSync(path.dirname(out), { recursive: true }); require('fs').writeFileSync(out, log.join('\n')); } catch (_) {}
  }
  writeOut();
})();
