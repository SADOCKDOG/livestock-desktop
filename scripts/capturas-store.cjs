/**
 * capturas-store.cjs — Capturas de pantalla del escritorio con Piel ERP
 * para renovar las imágenes de la ficha de la tienda (Microsoft Store).
 *
 * Replica el contenido de las capturas originales de Play Console
 * (G:\Mi unidad\PLAYCONSOLE\Imágenes\Pantallas) pero con la piel ERP de
 * escritorio activa (>=1024 px: sidebar acordeón + tablas densas):
 *
 *   01-inicio            #/                            Registro Rápido de Actividad
 *   02-animales-censo    #/ganaderia?tab=animales      Censo de Animales
 *   03-rebanos-lotes     #/ganaderia?tab=rebanos       Lotes y Rebaños
 *   04-explotacion       #/explotacion?tab=explotacion Explotación (infraestructura/SIGGAN)
 *   05-comercial-leche   #/comercializacion?tab=leche  Contratos y Entregas Lácteas
 *   06-informes          #/informes                    Informes (PDF/Excel)
 *   07-documentos-dimoe  #/documentos                  Documentos DIMOE (modo interno SIGGAN)
 *   08-ajustes-sistema   #/ajustes                     Sistema y Seguridad
 *
 * Reglas heredadas de val-visual.cjs / verify-erp-views.cjs:
 *  - Siembra la demo CHAMORRO y garantiza finca activa antes de navegar.
 *  - Desactiva las guías interactivas (persistido en meta.appConfig).
 *  - Cada captura exige una CONDICIÓN DE CONTENIDO (ruta asentada, sidebar
 *    visible, contenido esperado en DOM). Si falla, NO hay falso verde: la
 *    captura se marca FALLIDA y se guarda como *_REVISAR.png para diagnóstico.
 *
 * Uso:
 *   npm run serve        (en otra terminal: http-server frontend -p 8089)
 *   node scripts/capturas-store.cjs
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:8089';
const OUTDIR = path.join(__dirname, '..', 'cypress', 'screenshots', 'store');
const PORT = 9223;
const WS_LIST = 'http://127.0.0.1:' + PORT + '/json/list';
const UDDIR = path.join(require('os').tmpdir(), 'cdp-store-' + Date.now());
const WIDTH = 1280; // ventana por defecto de Tauri (PLAN-DESKTOP.md): 1280x800
const HEIGHT = 800;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function get(url) {
  return new Promise((res, rej) => {
    http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); }).on('error', rej);
  });
}

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
async function waitFor(expr, tries, ms) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    last = await evalObj(expr);
    if (last && last.ok) return last;
    await sleep(ms);
  }
  return last;
}

async function disableAndDismissGuides(push) {
  const res = await evalObj(`(async () => {
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
      return JSON.stringify({ ok: true, guias: guideIds.length });
    } catch (e) { return JSON.stringify({ ok: false, err: String(e && e.message || e) }); }
  })()`);
  push('[GUIAS] desactivadas: ' + JSON.stringify(res));
}

// Condición de contenido genérica + expectativa específica por vista.
function makeCond(route, expectExpr) {
  return `(() => {
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
    const ac = document.getElementById('app-content');
    r.appLen = ac ? ac.textContent.trim().length : 0;
    if (r.appLen < 40) { r.ok = false; r.why.push('app-vacio'); }
    r.route = location.hash;
    if (${JSON.stringify(route)} !== '#/' ) {
      // Rutas con pestaña: se acepta que el hash llegue con o sin parámetros extra.
      const wantPath = ${JSON.stringify(route)}.split('?')[0];
      const curPath = (location.hash || '#/').split('?')[0];
      if (curPath !== wantPath) { r.ok = false; r.why.push('ruta:' + location.hash); }
    } else if (location.hash !== '#/' && location.hash !== '') {
      r.ok = false; r.why.push('ruta:' + location.hash);
    }
    let extra = true, extraErr = '';
    try { extra = !!(${expectExpr}); } catch (e) { extra = false; extraErr = String(e && e.message || e); }
    r.contenido = extra;
    if (!extra) { r.ok = false; r.why.push('contenido' + (extraErr ? ':' + extraErr : '')); }
    return JSON.stringify(r);
  })()`;
}

// Vistas a capturar: mismas pantallas que las capturas originales de la tienda.
const SHOTS = [
  { name: '01-inicio', route: '#/',
    expect: `document.body.textContent.includes('REGISTRO RÁPIDO DE ACTIVIDAD')` },
  { name: '02-animales-censo', route: '#/ganaderia?tab=animales',
    expect: `(document.querySelectorAll('#app-content .erp-data-table tbody tr').length + document.querySelectorAll('#app-content .card-registro').length) > 0` },
  { name: '03-rebanos-lotes', route: '#/ganaderia?tab=rebanos',
    expect: `/reba|lote/i.test(document.getElementById('app-content').textContent.slice(0, 4000))` },
  { name: '04-explotacion', route: '#/explotacion?tab=explotacion',
    expect: `/explotaci|infraestructura|sanitaria|silo/i.test(document.getElementById('app-content').textContent.slice(0, 6000))` },
  { name: '05-comercial-leche', route: '#/comercializacion?tab=leche',
    expect: `/contrato|lech|cisterna|albar/i.test(document.getElementById('app-content').textContent.slice(0, 6000))` },
  { name: '06-informes', route: '#/informes',
    expect: `/pdf|excel/i.test(document.getElementById('app-content').textContent.slice(0, 6000))` },
  { name: '07-documentos-dimoe', route: '#/documentos',
    expect: `/documento|siggan|dimoe|acuse/i.test(document.getElementById('app-content').textContent.slice(0, 6000))` },
  { name: '08-ajustes-sistema', route: '#/ajustes',
    expect: `/backup|seguridad|tema|ajuste/i.test(document.getElementById('app-content').textContent.slice(0, 6000))` },
];

(async () => {
  const informe = [];
  const push = (s) => { informe.push(s); console.log(s); };
  const resultados = [];

  fs.mkdirSync(OUTDIR, { recursive: true });

  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--hide-scrollbars',
    '--window-size=' + WIDTH + ',' + HEIGHT, '--force-device-scale-factor=1',
    '--remote-debugging-port=' + PORT,
    '--no-first-run', `--user-data-dir=${UDDIR}`, '--disable-extensions',
    '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--run-all-compositor-stages-before-draw',
    BASE + '/'
  ], { stdio: 'ignore' });

  try {
    // Esperar al endpoint de depuración de Chrome.
    let target = null, lastList = '[]';
    for (let i = 0; i < 120; i++) {
      try {
        lastList = await get(WS_LIST);
        const list = JSON.parse(lastList);
        target = (list || []).find(t => t.type === 'page' && String(t.url).indexOf('localhost:8089') !== -1) || null;
        if (target) break;
      } catch (_) { /* reintento */ }
      await sleep(500);
    }
    if (!target) throw new Error('Chrome no expuso target de la app en /json/list');

    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    await cdpSend('Page.enable');
    await cdpSend('Runtime.enable');
    await cdpSend('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });

    // ARRANQUE inicial.
    let ready = false;
    for (let i = 0; i < 90; i++) {
      const v = await cdpEval('(!!window.App && document.getElementById("app-content") && document.getElementById("app-content").children.length > 0)');
      if (v) { ready = true; break; }
      await sleep(500);
    }
    if (!ready) throw new Error('la app no pintó #app-content en 45 s');
    push('[ARRANQUE] OK');

    // SEMBRADO demo + finca activa + guías fuera.
    push('[DEMO] sembrando datos demo...');
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
        const guideIds = (window.GuideRegistry ? window.GuideRegistry.getAll() : []).map(g => g.id);
        if (window.App) {
          window.App._config = window.App._config || {};
          window.App._config.guides = { enabled: false, seen: guideIds, dismissed: guideIds };
        }
        const meta = (window.db) ? (await window.db.get('meta', 'appConfig').catch(() => null)) : null;
        const merged = Object.assign({}, (meta && meta.value) ? meta.value : {}, { guides: { enabled: false, seen: guideIds, dismissed: guideIds } });
        if (window.App) window.App._config = merged;
        if (window.db) { try { await window.db.put('meta', { key: 'appConfig', value: merged }); } catch (e) {} }
        return JSON.stringify({ ok: true, fincaActiva: id, fincas: fincas.length });
      } catch (e) { return JSON.stringify({ err: String(e && e.message || e) }); }
    })()`);
    push('[DEMO] resultado: ' + JSON.stringify(seedResult));
    if (!seedResult || !seedResult.ok) throw new Error('siembra demo falló: ' + JSON.stringify(seedResult));

    // Recarga para arrancar ya con finca activa y guías desactivadas.
    await cdpSend('Page.navigate', { url: BASE + '/' });
    await sleep(6000);
    let ready2 = false;
    for (let i = 0; i < 90; i++) {
      const v = await cdpEval('(!!window.App && document.getElementById("app-content") && document.getElementById("app-content").children.length > 0)');
      if (v) { ready2 = true; break; }
      await sleep(500);
    }
    if (!ready2) throw new Error('la app no repintó #app-content tras recargar');
    push('[ARRANQUE-2] OK');

    // Estabilización anti-carrera del asistente de bienvenida.
    for (let i = 0; i < 50; i++) {
      const st = await evalObj(`(async () => {
        const id = await window.Fincas.getActiveId();
        const welc = !!document.getElementById('asistente-configuracion-contenedor');
        return JSON.stringify({ id, welc });
      })()`);
      if (st && st.id) {
        await cdpEval(`(async () => {
          const w = document.getElementById('asistente-configuracion-contenedor');
          if (w) w.remove();
          if (window.App && typeof window.App.route === 'function') { try { await window.App.route(); } catch (e) {} }
          return true;
        })()`);
        await sleep(400);
        const chk = await evalObj(`(() => JSON.stringify({ welc: !!document.getElementById('asistente-configuracion-contenedor') }))()`);
        if (chk && !chk.welc) break;
      }
      await sleep(400);
    }
    await disableAndDismissGuides(push);
    await sleep(1200);

    // ── CAPTURAS ────────────────────────────────────────────────────────────
    for (const shot of SHOTS) {
      push('[NAV] ' + shot.name + ' -> ' + shot.route);
      const prevSig = await cdpEval(`(() => { const ac = document.getElementById('app-content'); return ac ? (ac.textContent.trim().length + '|' + (ac.innerHTML || '').slice(0, 80)) : 'NO-AC'; })()`);
      await cdpEval(`(async () => {
        location.hash = ${JSON.stringify(shot.route)};
        if (window.App && typeof window.App.route === 'function') { try { await window.App.route(); } catch (e) {} }
        return 'ok';
      })()`);
      const cond = makeCond(shot.route, shot.expect);
      let res = null;
      for (let i = 0; i < 40; i++) {
        const sig = await cdpEval(`(() => { const ac = document.getElementById('app-content'); return ac ? (ac.textContent.trim().length + '|' + (ac.innerHTML || '').slice(0, 80)) : 'NO-AC'; })()`);
        const r = await evalObj(cond);
        if (r && r.ok && sig !== prevSig) { res = r; break; }
        await sleep(500);
      }
      if (!res || !res.ok) res = await waitFor(cond, 6, 700);
      push('[CHECK] ' + shot.name + ': ' + JSON.stringify(res));

      if (res && res.ok) {
        await cdpFlush(3);
        await disableAndDismissGuides(push);
        const re = await evalObj(cond);
        if (re && re.ok) {
          const fileName = shot.name + '.png';
          const out = await cdpShot(fileName);
          push('[SHOT] ' + fileName + ' hash=' + (out.hash || '').slice(0, 12));
          resultados.push({ name: fileName, ok: true, hash: out.hash });
        } else {
          const fileName = shot.name + '_REVISAR.png';
          await cdpShot(fileName);
          push('[ABORT] ' + shot.name + ': condición cayó justo antes del disparo -> guardada como ' + fileName);
          resultados.push({ name: fileName, ok: false, why: re && re.why });
        }
      } else {
        const fileName = shot.name + '_REVISAR.png';
        await cdpShot(fileName);
        push('[FAIL] ' + shot.name + ' no cumple condición de contenido -> guardada como ' + fileName);
        resultados.push({ name: fileName, ok: false, why: res && res.why });
      }
    }

    // Resumen.
    const pasadas = resultados.filter(r => r.ok).length;
    push('[RESUMEN] capturas validas: ' + pasadas + '/' + resultados.length);
    resultados.forEach(r => push('  - ' + r.name + ': ' + (r.ok ? 'OK' : 'FALLÓ ' + JSON.stringify(r.why))));
    push('[RESUMEN] ' + (pasadas === resultados.length ? 'CAPTURAS COMPLETAS' : 'HAY CAPTURAS A REVISAR (ver *_REVISAR.png)'));
    push('[RESUMEN] carpeta: ' + OUTDIR);
  } catch (e) {
    push('[ERROR] ' + e.message);
  } finally {
    try { ws && ws.close(); } catch (_) {}
    try { chrome.kill(); } catch (_) {}
    try { fs.writeFileSync(path.join(OUTDIR, 'capturas-store-informe.txt'), informe.join('\n')); } catch (_) {}
  }
})();
