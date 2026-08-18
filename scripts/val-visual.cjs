/**
 * Validación visual del ERP de escritorio (Livestock Manager).
 *
 * Arranca Chrome headless apuntando a http://localhost:8089, siembra la demo
 * CHAMORRO, garantiza una FINCA ACTIVA, DESACTIVA las guías interactivas
 * (persistiéndolo en meta.appConfig para que no se autolancen tras navegar) y
 * captura tres vistas.
 *
 * Diferencia clave respecto a versiones previas: el éxito NO se mide por que los
 * hashes difieran (dos capturas distintas pueden ser la misma pantalla atenuada
 * por un popover de guía). El éxito se mide por una CONDICIÓN DE CONTENIDO por
 * captura, comprobada en el DOM antes de disparar: sidebar visible, ausencia de
 * asistente de bienvenida, ausencia de .guide-popover/.guide-overlay, y contenido
 * esperado (registro rápido en Inicio, filas de gastos en Gastos). Si la
 * condición no se cumple, la captura se ABORTA (sin falso verde).
 */

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
function get(url) { return new Promise((res, rej) => { http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); }).on('error', rej); }); }

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
// Evalúa una expresión que devuelve un JSON (string) y lo parsea a objeto.
async function evalObj(expr) {
  const s = await cdpEval(expr);
  if (s === null || s === undefined) return { ok: false, why: ['eval-null'] };
  if (typeof s === 'object') return s; // returnByValue ya devolvió objeto
  try { return JSON.parse(s); } catch (e) { return { ok: false, why: ['parse-error:' + String(s).slice(0, 120)] }; }
}
function cdpShot(name) {
  return cdpSend('Page.captureScreenshot', { format: 'png' }).then(r => {
    if (r && r.result && r.result.data) {
      const filePath = path.join(OUTDIR, name);
      fs.writeFileSync(filePath, Buffer.from(r.result.data, 'base64'));
      const buf = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(buf).digest('hex');
      return { filePath, hash };
    }
    return { filePath: null, hash: null };
  });
}
async function cdpFlush(frames = 3) {
  for (let i = 0; i < frames; i++) {
    await cdpEval('new Promise(r => requestAnimationFrame(() => r()))');
    await sleep(120);
  }
}

// Espera a que una condición (expr -> boolean) se cumpla, haciendo polling.
async function waitFor(expr, tries, ms, push, label) {
  for (let i = 0; i < tries; i++) {
    const v = await evalObj(expr);
    if (v && v.ok) return v;
    await sleep(ms);
  }
  const last = await evalObj(expr);
  return last;
}

// Desactiva las guías en la config persistida y retira cualquier overlay/popover
// montado. Se llama tras cada navegación para garantizar que no quede ni se
// relance el tour (GuideManager.maybeStart respeta App._config.guides.enabled y
// la lista seen/dismissed).
async function disableAndDismissGuides(push) {
  const res = await evalObj(`(async () => {
    try {
      const guideIds = (window.GuideRegistry ? window.GuideRegistry.getAll() : []).map(g => g.id);
      if (window.App) {
        window.App._config = window.App._config || {};
        window.App._config.guides = { enabled: false, seen: guideIds, dismissed: guideIds };
      }
      // Persistir para que sobreviva a la recarga / navegación.
      const meta = (window.db) ? (await window.db.get('meta', 'appConfig').catch(() => null)) : null;
      const merged = Object.assign({}, (meta && meta.value) ? meta.value : {}, { guides: { enabled: false, seen: guideIds, dismissed: guideIds } });
      if (window.App) window.App._config = merged;
      if (window.db) { try { await window.db.put('meta', { key: 'appConfig', value: merged }); } catch (e) {} }
      // Retirar cualquier guía montada en este instante.
      if (window.GuideManager) { try { window.GuideManager.skip(); } catch (e) {} }
      document.querySelectorAll('.guide-overlay, .guide-popover, .guide-resume-chip').forEach(n => n.remove());
      return JSON.stringify({ ok: true, guides: guideIds.length });
    } catch (e) { return JSON.stringify({ ok: false, err: String(e && e.message || e) }); }
  })()`);
  push('[GUIAS] desactivadas: ' + JSON.stringify(res));
  return res;
}

// Condición de contenido para una captura de Inicio/Dashboard.
const PRE_DASHBOARD = `(() => {
  const r = { ok: true, why: [] };
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
  if (!document.body.textContent.includes('REGISTRO RÁPIDO DE ACTIVIDAD')) r.why.push('no-quick-register');
  if (!document.body.textContent.includes('REGISTRO RÁPIDO DE ACTIVIDAD')) { r.ok = false; }
  r.route = location.hash;
  return JSON.stringify(r);
})()`;

// Condición de contenido para una captura de Gastos (ExPro).
// El contenedor real es #gasto-content y los registros se pintan como
// .card-registro (la tabla ERP está oculta por defecto).
const PRE_GASTOS = `(() => {
  const r = { ok: true, why: [] };
  const welc = document.getElementById('asistente-configuracion-contenedor');
  if (welc) { r.ok = false; r.why.push('welcome-present'); }
  if (document.querySelector('.guide-popover') || document.querySelector('.guide-overlay')) { r.ok = false; r.why.push('guide-present'); }
  const sb = document.querySelector('.erp-sidebar');
  if (!sb) { r.ok = false; r.why.push('no-sidebar'); }
  else {
    const b = sb.getBoundingClientRect();
    const cs = getComputedStyle(sb);
    if (b.width < 4 || b.height < 4 || cs.display === 'none' || cs.visibility === 'hidden') { r.ok = false; r.why.push('sidebar-hidden'); }
  }
  const g = document.getElementById('gasto-content');
  if (!g) { r.ok = false; r.why.push('no-gasto-content'); }
  else {
    const t = (g.textContent || '');
    if (t.includes('Cargando gastos...')) { r.ok = false; r.why.push('gastos-loading'); }
    const cards = document.querySelectorAll('#gasto-content .card-registro').length;
    const rows = document.querySelectorAll('#gasto-content .erp-data-table tbody tr').length;
    r.cards = cards; r.rows = rows;
    if (cards === 0 && rows === 0) { r.ok = false; r.why.push('gastos-empty'); }
  }
  r.route = location.hash;
  r.appHead = (document.getElementById('app-content') ? document.getElementById('app-content').textContent : '').trim().slice(0, 60);
  return JSON.stringify(r);
})()`;

(async () => {
  const informe = [];
  const push = (s) => { informe.push(s); console.log(s); };
  const resultados = []; // {name, ok, why}

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

    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });

    await cdpSend('Page.enable');
    await cdpSend('Runtime.enable');

    // ARRANQUE inicial (la app muestra el asistente de bienvenida si no hay finca)
    let ready = false;
    for (let i = 0; i < 90; i++) {
      const v = await cdpEval('(!!window.App && document.getElementById("app-content") && document.getElementById("app-content").children.length > 0)');
      if (v) { ready = true; break; }
      await sleep(500);
    }
    if (!ready) {
      push('[ARRANQUE] FAIL: la app no pinto #app-content en 45s');
      informe.push('[FIN] done');
      fs.writeFileSync(path.join(OUTDIR, 'val-informe.txt'), informe.join('\n'));
      return;
    }
    push('[ARRANQUE] OK: app pinto contenido en app-content');

    // ── SEMBRADO + GARANTÍA DE FINCA ACTIVA ──────────────────────────────────
    push('[DEMO] sembrando datos demo y garantizando finca activa...');
    const seedResult = await evalObj(`(async () => {
      try {
        if (!window.AsistenteConfiguracion) return JSON.stringify({ err: 'no AsistenteConfiguracion' });
        if (!await window.AsistenteConfiguracion._ensureSeedData()) return JSON.stringify({ err: '_ensureSeedData false' });
        if (!window.SeedData || typeof window.SeedData.run !== 'function') return JSON.stringify({ err: 'no SeedData.run' });
        await window.SeedData.run(true);
        const fincas = await (window.Fincas ? window.Fincas.list() : []);
        if (!fincas || fincas.length === 0) return JSON.stringify({ err: 'no fincas tras seed' });
        let id = await (window.Fincas ? window.Fincas.getActiveId() : null);
        if (!id) { await window.Fincas.setActiveId(fincas[0].id); id = await window.Fincas.getActiveId(); }
        // Marcar todas las guías como vistas/descartadas para que no autolancen.
        const guideIds = (window.GuideRegistry ? window.GuideRegistry.getAll() : []).map(g => g.id);
        if (window.App) {
          window.App._config = window.App._config || {};
          window.App._config.guides = { enabled: false, seen: guideIds, dismissed: guideIds };
        }
        const meta = (window.db) ? (await window.db.get('meta', 'appConfig').catch(() => null)) : null;
        const merged = Object.assign({}, (meta && meta.value) ? meta.value : {}, { guides: { enabled: false, seen: guideIds, dismissed: guideIds } });
        if (window.App) window.App._config = merged;
        if (window.db) { try { await window.db.put('meta', { key: 'appConfig', value: merged }); } catch (e) {} }
        return JSON.stringify({ ok: true, fincaActiva: id, fincas: fincas.length, guias: guideIds.length });
      } catch (e) { return JSON.stringify({ err: String(e && e.message || e) }); }
    })()`);
    push('[DEMO] resultado: ' + JSON.stringify(seedResult));
    if (!seedResult || !seedResult.ok) {
      push('[DEMO] FAIL: no se pudo sembrar / activar finca: ' + JSON.stringify(seedResult));
      informe.push('[FIN] done');
      fs.writeFileSync(path.join(OUTDIR, 'val-informe.txt'), informe.join('\n'));
      return;
    }

    // Recargar (vía CDP Page.navigate) para que la app arranque YA con la finca
    // activa y las guías desactivadas.
    push('[RELOAD] recargando con finca activa y guias desactivadas...');
    await cdpSend('Page.navigate', { url: BASE + '/' });
    await sleep(6000);

    let ready2 = false;
    for (let i = 0; i < 90; i++) {
      const v = await cdpEval('(!!window.App && document.getElementById("app-content") && document.getElementById("app-content").children.length > 0)');
      if (v) { ready2 = true; break; }
      await sleep(500);
    }
    if (!ready2) {
      push('[ARRANQUE-2] FAIL: la app no pinto #app-content tras la recarga');
      informe.push('[FIN] done');
      fs.writeFileSync(path.join(OUTDIR, 'val-informe.txt'), informe.join('\n'));
      return;
    }
    push('[ARRANQUE-2] OK: app arrancada tras recarga');

    // ESTABILIZACIÓN: en el arranque de la recarga hay una carrera en la que
    // route() puede relanzar el asistente de bienvenida en un instante en que
    // getActiveId() devuelve null transitoriamente. Esperamos a que la finca
    // activa sea estable y, entonces, retiramos el contenedor de bienvenida y
    // RE-ENROUTAMOS: ya con getActiveId() firme, route() NO lo vuelve a mostrar.
    let estabilizado = false;
    for (let i = 0; i < 50; i++) {
      const st = await evalObj(`(async () => {
        const id = await window.Fincas.getActiveId();
        const welc = !!document.getElementById('asistente-configuracion-contenedor');
        return JSON.stringify({ id: id, welc: welc });
      })()`);
      if (st && st.id) {
        // Finca activa presente: retirar bienvenida y re-enrutar para pintar el dashboard real.
        await cdpEval(`(async () => {
          const w = document.getElementById('asistente-configuracion-contenedor');
          if (w) w.remove();
          if (window.App && typeof window.App.route === 'function') { try { await window.App.route(); } catch (e) {} }
          return true;
        })()`);
        await sleep(400);
        const check = await evalObj(`(() => {
          return JSON.stringify({
            welc: !!document.getElementById('asistente-configuracion-contenedor'),
            id: (window.Fincas ? null : null)
          });
        })()`);
        if (check && !check.welc) { estabilizado = true; break; }
      }
      await sleep(400);
    }
    push('[STABILIZE] estabilizado=' + estabilizado);

    // VERIFICACIÓN CRÍTICA: debe haber finca activa y NO asistente de bienvenida.
    const postReload = await evalObj(`(async () => {
      const r = { ok: true, why: [] };
      const welc = document.getElementById('asistente-configuracion-contenedor');
      if (welc) { r.ok = false; r.why.push('welcome-present-tras-reload'); r.welcText = (welc.textContent || '').trim().slice(0, 80); }
      let id = null;
      try { id = await window.Fincas.getActiveId(); } catch (e) { r.why.push('getActiveId-err:' + e.message); }
      r.fincaActiva = id;
      if (!id) { r.ok = false; r.why.push('sin-finca-activa'); }
      r.appContentHead = (document.getElementById('app-content') ? document.getElementById('app-content').textContent : '').trim().slice(0, 60);
      return JSON.stringify(r);
    })()`);
    push('[VERIFY] post-reload: ' + JSON.stringify(postReload));
    if (!postReload || !postReload.ok) {
      push('[VERIFY] FAIL: sigue el asistente o no hay finca activa: ' + JSON.stringify(postReload));
      informe.push('[FIN] done');
      fs.writeFileSync(path.join(OUTDIR, 'val-informe.txt'), informe.join('\n'));
      return;
    }

    // Desactivar guías en la sesión recargada (por si acaso) y retirar overlays.
    await disableAndDismissGuides(push);

    // Viewport desktop
    const width = await cdpEval('window.innerWidth');
    push('[VIEWPORT] width=' + width);

    await sleep(1500);
    await cdpFlush(4);

    // ── CAPTURA 1: DASHBOARD / INICIO ───────────────────────────────────────
    push('[CHECK] dashboard: esperando condicion de contenido...');
    const d1 = await waitFor(PRE_DASHBOARD, 30, 500, push, 'dashboard');
    push('[CHECK] dashboard: ' + JSON.stringify(d1));
    if (!d1 || !d1.ok) {
      push('[ABORT] dashboard: no cumple condicion de contenido -> ' + JSON.stringify(d1));
      resultados.push({ name: 'val-dashboard.png', ok: false, why: d1 && d1.why });
    } else {
      await cdpFlush(3);
      await disableAndDismissGuides(push);
      const d1b = await evalObj(PRE_DASHBOARD);
      if (!d1b || !d1b.ok) {
        push('[ABORT] dashboard: guia/asistente reaparecio justo antes de capturar -> ' + JSON.stringify(d1b));
        resultados.push({ name: 'val-dashboard.png', ok: false, why: d1b && d1b.why });
      } else {
        const shot = await cdpShot('val-dashboard.png');
        push('[SHOT] val-dashboard.png hash=' + shot.hash);
        resultados.push({ name: 'val-dashboard.png', ok: true, hash: shot.hash, meta: d1b });
      }
    }

    // Registro de guías (información)
    const g = await cdpEval('window.GuideRegistry ? window.GuideRegistry.getAll().map(x => x.id).sort() : []');
    const ids = Array.isArray(g) ? g : [];
    push('[REGISTRY] guias=' + ids.length + (ids.length === 22 ? ' OK' : ' (esperado 22)'));

    // ── CAPTURA 2: GASTOS (ExPro) ───────────────────────────────────────────
    push('[NAV] navegando a Gastos (ExPro)...');
    await cdpEval(`(async () => {
      try { if (window.App && window.App._ensureViewGroup) await window.App._ensureViewGroup('expro'); } catch (e) {}
      location.hash = '#/explotacion?tab=gastos';
      return 'navegado';
    })()`);
    await sleep(2500);
    // Esperar a que Gastos pinte filas (puede tardar en cargar del IndexedDB).
    const gWait = await waitFor(PRE_GASTOS, 40, 500, push, 'gastos');
    push('[CHECK] gastos: ' + JSON.stringify(gWait));
    if (!gWait || !gWait.ok) {
      push('[ABORT] gastos: no cumple condicion de contenido -> ' + JSON.stringify(gWait));
      resultados.push({ name: 'val-gastos.png', ok: false, why: gWait && gWait.why });
    } else {
      await cdpFlush(3);
      await disableAndDismissGuides(push);
      const gWait2 = await evalObj(PRE_GASTOS);
      if (!gWait2 || !gWait2.ok) {
        push('[ABORT] gastos: guia/asistente reaparecio antes de capturar -> ' + JSON.stringify(gWait2));
        resultados.push({ name: 'val-gastos.png', ok: false, why: gWait2 && gWait2.why });
      } else {
        const shot = await cdpShot('val-gastos.png');
        push('[SHOT] val-gastos.png hash=' + shot.hash);
        resultados.push({ name: 'val-gastos.png', ok: true, hash: shot.hash, meta: gWait2 });
      }
    }

    // ── CAPTURA 3: DASHBOARD de vuelta ──────────────────────────────────────
    push('[NAV] volviendo a Inicio...');
    await cdpEval('location.hash = "#/"');
    await sleep(2000);
    await cdpFlush(4);
    const d2 = await waitFor(PRE_DASHBOARD, 30, 500, push, 'dashboard2');
    push('[CHECK] dashboard2: ' + JSON.stringify(d2));
    if (!d2 || !d2.ok) {
      push('[ABORT] dashboard2: no cumple condicion de contenido -> ' + JSON.stringify(d2));
      resultados.push({ name: 'val-dashboard2.png', ok: false, why: d2 && d2.why });
    } else {
      await cdpFlush(3);
      await disableAndDismissGuides(push);
      const d2b = await evalObj(PRE_DASHBOARD);
      if (!d2b || !d2b.ok) {
        push('[ABORT] dashboard2: guia/asistente reaparecio antes de capturar -> ' + JSON.stringify(d2b));
        resultados.push({ name: 'val-dashboard2.png', ok: false, why: d2b && d2b.why });
      } else {
        const shot = await cdpShot('val-dashboard2.png');
        push('[SHOT] val-dashboard2.png hash=' + shot.hash);
        resultados.push({ name: 'val-dashboard2.png', ok: true, hash: shot.hash, meta: d2b });
      }
    }

    // Resumen
    const pasadas = resultados.filter(r => r.ok).length;
    const totales = resultados.length;
    push('[RESUMEN] capturas validas: ' + pasadas + '/' + totales);
    resultados.forEach(r => {
      push('  - ' + r.name + ': ' + (r.ok ? 'OK' : 'FALLÓ ' + JSON.stringify(r.why)) + (r.hash ? ' hash=' + r.hash.slice(0, 12) : ''));
    });
    push('[RESUMEN] ' + (pasadas === totales ? 'VALIDACION COMPLETA' : 'VALIDACION INCOMPLETA (ver arriba)'));

    push('[FIN] done');
    fs.writeFileSync(path.join(OUTDIR, 'val-informe.txt'), informe.join('\n'));
  } catch (e) {
    push('[ERROR] ' + e.message);
    try { fs.writeFileSync(path.join(OUTDIR, 'val-informe.txt'), informe.join('\n')); } catch (_) {}
  } finally {
    try { ws && ws.close(); } catch (_) {}
    try { chrome.kill(); } catch (_) {}
  }
})();
