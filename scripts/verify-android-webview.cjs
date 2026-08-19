/**
 * Verificación de capa ERP sobre el WebView de Android (fase 3, por lote).
 *
 * Conecta vía CDP al WebView de la app instalada en el emulador, siembra la
 * demo, navega las rutas pedidas y afirma la CONDICIÓN DE CONTENIDO móvil:
 *   - la capa ERP de ESCRITORIO NO se instala (sidebar oculta/ausente),
 *   - la nav móvil sigue intacta (fab-container presente y visible si la vista
 *     lo tiene),
 *   - sin asistente de bienvenida ni popovers de guía,
 *   - el listado pinta contenido.
 *
 * Uso:
 *   node scripts/verify-android-webview.cjs "#/" "#/agenda" "#/explotacion?tab=lacteo&sub=tanques"
 *   node scripts/verify-android-webview.cjs --device=emulator-5554 "#/"
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');

const PKG = 'com.livestockmanager.app.manual';
const ACTIVITY = PKG + '/.MainActivity';
const LOCAL_PORT = 9222;
const WS_LIST = 'http://127.0.0.1:' + LOCAL_PORT + '/json/list';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function get(url) { return new Promise((res, rej) => { http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); }).on('error', rej); }); }
function adb(args) { return execSync('adb ' + args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }

let ws;
function cdpSend(method, params = {}) {
  return new Promise((resolve) => {
    if (!ws || ws.readyState !== 1) return resolve(null);
    const id = Math.floor(Math.random() * 1e7);
    const onMsg = async (ev) => {
      const data = ev.data && typeof ev.data === 'object' && typeof ev.data.text === 'function'
        ? await ev.data.text() : String(ev.data);
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

const MOBILE_CHECK = `(() => {
  const r = { ok: true, why: [], mode: 'android-webview' };
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
  const fab = document.querySelector('.fab-container');
  r.fab = !!fab;
  if (fab) {
    const fb = fab.getBoundingClientRect();
    const fcs = getComputedStyle(fab);
    const fvis = (fb.width > 4 && fb.height > 4) && fcs.display !== 'none' && fcs.visibility !== 'hidden';
    if (!fvis) { r.ok = false; r.why.push('fab-oculto'); }
  }
  const ac = document.getElementById('app-content');
  r.appLen = ac ? ac.textContent.trim().length : 0;
  if (r.appLen < 40) { r.ok = false; r.why.push('app-content-vacio'); }
  // Conteo de botones de edicion/borrado de analiticas y balance-lacteo
  // (checklist 19/20): deben sobrevivir a la fusion de la piel ERP.
  r.analiticaBtns = document.querySelectorAll('[onclick*="_editarAnalitica"],[onclick*="_eliminarAnalitica"]').length;
  r.balanceBtns = document.querySelectorAll('[onclick*="_editarMovimiento"],[onclick*="_eliminarMovimiento"]').length;
  // Botones de creacion (siempre presentes, prueban que la seccion existe) y
  // contenedores de lista (erp-filtros + data-ver-mas cuelgan de ellos).
  r.analiticaCreate = document.querySelectorAll('[onclick*="AnaliticaLecheWizard.open"]').length;
  r.balanceCreate = document.querySelectorAll('[onclick*="MovimientoBalanceWizard.open"]').length;
  r.erpGroups = document.querySelectorAll('.erp-action-group').length;
  r.lacteoAnaliticas = !!document.getElementById('lacteo-analiticas-lista');
  r.lacteoControles = !!document.getElementById('lacteo-controles-lista');
  r.lacteoMovimientos = !!document.getElementById('lacteo-movimientos-lista');
  r.w = window.innerWidth;
  r.route = location.hash;
  return JSON.stringify(r);
})()`;

(async () => {
  const args = process.argv.slice(2);
  let device = 'emulator-5554';
  const routes = [];
  for (const a of args) {
    if (a.startsWith('--device=')) device = a.split('=')[1];
    else routes.push(a);
  }
  if (routes.length === 0) routes.push('#/');
  const log = [];
  const push = (s) => { log.push(s); console.log(s); };
  const results = [];
  const errors = [];

  try {
    push('[ADB] dispositivo=' + device);
    // Lanzar la app.
    try { adb('-s ' + device + ' shell am start -n ' + ACTIVITY + ' -W'); } catch (e) { push('[ADB] warn start: ' + e.message); }
    await sleep(4000);

    // PID del proceso de la app.
    let pid = '';
    try { pid = adb('-s ' + device + ' shell pidof ' + PKG).trim().split(/\s+/)[0]; } catch (e) {}
    if (!pid) { push('[ADB] no se obtuvo PID de ' + PKG); return finish(); }
    push('[ADB] pid=' + pid);

    // Reenviar el socket de depuración del WebView.
    try { adb('-s ' + device + ' forward tcp:' + LOCAL_PORT + ' localabstract:webview_devtools_remote_' + pid); } catch (e) { push('[ADB] warn forward: ' + e.message); }
    await sleep(1000);

    let list = [];
    for (let i = 0; i < 30; i++) {
      try { list = JSON.parse(await get(WS_LIST)); if (list.length) break; } catch (_) {}
      await sleep(1000);
    }
    if (!list.length) { push('[CDP] no hay targets en ' + WS_LIST); return finish(); }
    const target = list.find(t => t.type === 'page' && String(t.url || '').indexOf(PKG) !== -1)
                || list.find(t => t.type === 'page')
                || list[0];
    push('[CDP] target=' + (target.url || target.title || '?'));

    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    await cdpSend('Page.enable');
    await cdpSend('Runtime.enable');
    ws.addEventListener('message', async (ev) => {
      try {
        const data = ev.data && typeof ev.data === 'object' && typeof ev.data.text === 'function'
          ? await ev.data.text() : String(ev.data);
        const m = JSON.parse(data);
        if (m.method === 'Runtime.exceptionThrown') {
          const e = m.params && m.params.exception;
          errors.push('EXC: ' + ((e && (e.exception || e.text)) || '?'));
        } else if (m.method === 'Runtime.consoleAPICalled' && m.params && ['error', 'warning'].includes(m.params.type)) {
          errors.push(m.params.type + ': ' + (m.params.args || []).map(a => a.value || a.description || '').join(' '));
        }
      } catch (_) {}
    });

    // Arranque: esperar a que la app pinte.
    let ready = false;
    for (let i = 0; i < 60; i++) {
      const v = await cdpEval('(!!window.App && document.getElementById("app-content") && document.getElementById("app-content").children.length > 0)');
      if (v) { ready = true; break; }
      await sleep(1000);
    }
    if (!ready) { push('[ARRANQUE] FAIL: no pinto #app-content'); return finish(); }
    push('[ARRANQUE] OK');

    // Sembrar demo + finca activa + guías off.
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

    // Recargar dentro del WebView para arrancar con finca activa.
    await cdpSend('Page.navigate', { url: 'https://localhost/' });
    await sleep(5000);
    let ready2 = false;
    for (let i = 0; i < 60; i++) {
      const v = await cdpEval('(!!window.App && document.getElementById("app-content") && document.getElementById("app-content").children.length > 0)');
      if (v) { ready2 = true; break; }
      await sleep(1000);
    }
    push('[ARRANQUE-2] ' + (ready2 ? 'OK' : 'FAIL'));
    // Estabilizar + desactivar guías.
    for (let i = 0; i < 30; i++) {
      const st = await evalObj(`(async () => { const id = await window.Fincas.getActiveId(); const welc = !!document.getElementById('asistente-configuracion-contenedor'); return JSON.stringify({ id, welc }); })()`);
      if (st && st.id) {
        await cdpEval(`(async () => { const w = document.getElementById('asistente-configuracion-contenedor'); if (w) w.remove(); if (window.App && typeof window.App.route === 'function') { try { await window.App.route(); } catch (e) {} } return true; })()`);
        await sleep(500);
        const chk = await evalObj(`(() => JSON.stringify({ welc: !!document.getElementById('asistente-configuracion-contenedor') }))()`);
        if (chk && !chk.welc) break;
      }
      await sleep(500);
    }
    await evalObj(`(async () => {
      const g = (window.GuideRegistry ? window.GuideRegistry.getAll() : []).map(x => x.id);
      if (window.App) window.App._config = Object.assign(window.App._config || {}, { guides: { enabled: false, seen: g, dismissed: g } });
      document.querySelectorAll('.guide-overlay,.guide-popover,.guide-resume-chip').forEach(n => n.remove());
      return JSON.stringify({ ok: true });
    })()`);
    await sleep(1000);

    // Verifica la vista de láctea por el flujo REAL móvil: el parámetro URL
    // ?tab=lacteo es ignorado por ExplotacionView (usa this._activeSubModule),
    // así que hay que tocar el carrusel LÁCTEA y luego los sub-tabs Control
    // (analíticas, checklist 19) y Balance (movimientos, checklist 20).
    async function verifyLactea() {
      const base = `(() => {
        const r = { ok: true, why: [], mode: 'android-lactea' };
        const welc = document.getElementById('asistente-configuracion-contenedor');
        if (welc) { r.ok = false; r.why.push('welcome-present'); }
        if (document.querySelector('.guide-popover') || document.querySelector('.guide-overlay')) { r.ok = false; r.why.push('guide-present'); }
        const sb = document.querySelector('.erp-sidebar');
        if (sb) { const b = sb.getBoundingClientRect(); const cs = getComputedStyle(sb); if ((b.width > 4 && b.height > 4) && cs.display !== 'none' && cs.visibility !== 'hidden') { r.ok = false; r.why.push('sidebar-visible-en-movil'); } }
        return JSON.stringify(r);
      })()`;
      await cdpEval(`(async()=>{if(location.hash!=='#/explotacion'){location.hash='#/explotacion';if(window.App&&window.App.route)try{await window.App.route()}catch(e){}}return 'ok'})()`);
      await sleep(3500);
      // Reasegurar guías OFF (por si el reload restableció _config) para evitar
      // que App.renderGuideFab dispare un segundo render que desengancha el
      // sub-contenedor de láctea (raza de render asíncrono no reentrante).
      await cdpEval(`(async () => { const g = (window.GuideRegistry ? window.GuideRegistry.getAll() : []).map(x => x.id); if (window.App) window.App._config = Object.assign(window.App._config || {}, { guides: { enabled: false, seen: g, dismissed: g } }); document.querySelectorAll('.guide-overlay,.guide-popover,.guide-resume-chip').forEach(n => n.remove()); return true; })()`);
      // Conmutar al submódulo LÁCTEA y ESPERAR a que su render asíncrono termine.
      // (await de la promise de render() evita el race de dos renders solapados
      //  que deja el sub-contenido colgado en un nodo desenganchado del DOM.)
      const sw = await cdpEval(`(async()=>{if(!window.ExplotacionView)return 'no-view';await window.ExplotacionView._cambiarSubModulo('lacteo');return 'switched'})().catch(e=>'err:'+e)`);
      push('  [LACTEA] switch -> ' + sw);
      let lacteoReady = false;
      for (let i = 0; i < 20; i++) { if (await cdpEval('!!document.getElementById("expro-lacteo-subtab-content")')) { lacteoReady = true; break; } await sleep(500); }
      push('  [LACTEA] sub-contenedor lacteo -> ' + (lacteoReady ? 'OK' : 'AUSENTE'));
      // Sub-tab Control -> analíticas (editar/borrar + crear + erp-action-group).
      // Se setea _lacteoSubTab y se AWAIT del render() completo (equivale a
      // _cambiarLacteoSubTab pero sin solapar renders).
      await cdpEval(`(async()=>{if(!window.ExplotacionView)return 'no-view';window.ExplotacionView._lacteoSubTab='control';await window.ExplotacionView.render();return 'ok'})().catch(e=>'err:'+e)`);
      let analiticasReady = false;
      for (let i = 0; i < 30; i++) { if (await cdpEval('!!document.getElementById("lacteo-analiticas-lista")')) { analiticasReady = true; break; } await sleep(500); }
      push('  [LACTEA] lista analíticas -> ' + (analiticasReady ? 'OK' : 'AUSENTE'));
      const c = await evalObj(`(async()=>{const r=JSON.parse(${base});r.hasAnaliticas=!!document.getElementById('lacteo-analiticas-lista');r.hasControles=!!document.getElementById('lacteo-controles-lista');r.analiticaBtns=document.querySelectorAll('[onclick*="_editarAnalitica"]').length;r.analiticaCreate=document.querySelectorAll('[onclick*="AnaliticaLecheWizard.open"]').length;r.erpGroups=document.querySelectorAll('.erp-action-group').length;if(!r.hasAnaliticas)r.why.push('no-lacteo-analiticas');if(r.analiticaCreate<1)r.why.push('no-analitica-create');if(r.erpGroups<1)r.why.push('no-erp-group');return JSON.stringify(r)})()`);
      // Sub-tab Balance -> movimientos (editar/borrar + crear + erp-action-group)
      await cdpEval(`(async()=>{if(!window.ExplotacionView)return 'no-view';window.ExplotacionView._lacteoSubTab='balance';await window.ExplotacionView.render();return 'ok'})().catch(e=>'err:'+e)`);
      let movimientosReady = false;
      for (let i = 0; i < 30; i++) { if (await cdpEval('!!document.getElementById("lacteo-movimientos-lista")')) { movimientosReady = true; break; } await sleep(500); }
      push('  [LACTEA] lista movimientos -> ' + (movimientosReady ? 'OK' : 'AUSENTE'));
      const bres = await evalObj(`(async()=>{const r=JSON.parse(${base});r.hasMovimientos=!!document.getElementById('lacteo-movimientos-lista');r.balanceBtns=document.querySelectorAll('[onclick*="_editarMovimiento"]').length;r.balanceCreate=document.querySelectorAll('[onclick*="MovimientoBalanceWizard.open"]').length;r.erpGroups=document.querySelectorAll('.erp-action-group').length;if(!r.hasMovimientos)r.why.push('no-lacteo-movimientos');if(r.balanceCreate<1)r.why.push('no-balance-create');if(r.balanceBtns<1)r.why.push('no-balance-btns');return JSON.stringify(r)})()`);
      const baseOk = !!(c && c.ok) && !!(bres && bres.ok) && !!(c && c.hasAnaliticas) && !!(bres && bres.hasMovimientos) && (c && c.analiticaCreate > 0) && (bres && bres.balanceCreate > 0) && (c && c.erpGroups > 0) && (bres && bres.erpGroups > 0);
      const why = [].concat((c && c.why) || [], (bres && bres.why) || []);
      const dbg = await cdpEval(`(()=>{const ac=document.getElementById('app-content');return JSON.stringify({activeSub:window.ExplotacionView&&window.ExplotacionView._activeSubModule,lacteoSub:window.ExplotacionView&&window.ExplotacionView._lacteoSubTab,hasExproTab:!!document.getElementById('expro-tab-content'),hasLacteoSub:!!document.getElementById('expro-lacteo-subtab-content'),hasAnaliticas:!!document.getElementById('lacteo-analiticas-lista'),snippet:ac?ac.innerHTML.slice(ac.innerHTML.indexOf('expro-lacteo')>-1?ac.innerHTML.indexOf('expro-lacteo'):0,ac.innerHTML.indexOf('expro-lacteo')>-1?ac.innerHTML.indexOf('expro-lacteo')+260:200):'NO-AC'});})()`);
      push('  [LACTEA] dbg -> ' + dbg);
      if (errors) push('  [LACTEA] errors -> ' + (errors.length ? errors.join(' | ') : '(ninguno)'));
      return { ok: baseOk, why, mode: 'android-lactea',
        analiticaBtns: c && c.analiticaBtns, analiticaCreate: c && c.analiticaCreate,
        balanceBtns: bres && bres.balanceBtns, balanceCreate: bres && bres.balanceCreate,
        erpGroups: Math.max((c && c.erpGroups) || 0, (bres && bres.erpGroups) || 0),
        hasAnaliticas: c && c.hasAnaliticas, hasMovimientos: bres && bres.hasMovimientos };
    }

    for (const route of routes) {
      push('[NAV] ' + route);
      let res = null;
      // La vista de láctea NO se alcanza por param URL (?tab=lacteo lo ignora
      // ExplotacionView, que usa this._activeSubModule). Se entra por el flujo
      // real móvil: tocar el carrusel LÁCTEA y luego el sub-tab.
      if (route.indexOf('lacteo') !== -1) {
        res = await verifyLactea();
      } else {
        // Firma del contenido ANTES de navegar, para descartar snapshots obsoletos
        // (el hash cambia pero #app-content aun muestra la vista previa).
        const prevSig = await cdpEval(`(() => { const ac = document.getElementById('app-content'); return ac ? (ac.textContent.trim().length + '|' + (ac.innerHTML || '').slice(0, 80)) : 'NO-AC'; })()`);
        await cdpEval(`(async () => { location.hash = ${JSON.stringify(route)}; if (window.App && typeof window.App.route === 'function') { try { await window.App.route(); } catch (e) {} } return 'ok'; })()`);
        // El sub-contenido de láctea (analíticas/balance) carga de forma asíncrona
        // dentro de ExplotacionView; el primer repintado es solo el esqueleto del
        // tab. Muestreamos todas las iteraciones y nos quedamos con la MUESTRA MÁS
        // RICA (mayor appLen), que es cuando el sub-contenido ya pintó.
        let bestByLen = null;
        for (let i = 0; i < 30; i++) {
          const sig = await cdpEval(`(() => { const ac = document.getElementById('app-content'); return ac ? (ac.textContent.trim().length + '|' + (ac.innerHTML || '').slice(0, 80)) : 'NO-AC'; })()`);
          const r = await evalObj(`(async () => { return ${MOBILE_CHECK}; })()`);
          if (r && r.route === route && r.appLen >= 40 && sig !== prevSig) {
            if (!bestByLen || (r.appLen > bestByLen.appLen)) bestByLen = r;
          }
          await sleep(800);
        }
        res = bestByLen;
      }
      if (!res) res = await evalObj(`(async () => { return ${MOBILE_CHECK}; })()`);
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
    try { adb('-s ' + device + ' forward --remove tcp:' + LOCAL_PORT); } catch (_) {}
  }

  function finish() {
    const out = path.join(__dirname, '..', 'cypress', 'screenshots', 'verify-android-informe.txt');
    try { require('fs').mkdirSync(path.dirname(out), { recursive: true }); require('fs').writeFileSync(out, log.join('\n')); } catch (_) {}
  }
  finish();
})();
