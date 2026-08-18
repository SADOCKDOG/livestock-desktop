// Validación visual con el plugin chrome-devtools-mcp (Chrome CON ventana real).
// Flujo: arranca la app en perfil aislado -> siembra la DEMO CHAMORRO (SeedData) -> recarga ->
// la app arranca con finca activa y pinta el Dashboard real -> captura -> navega a Gastos -> captura -> vuelve.
const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const OUTDIR = path.join(__dirname, '..', 'cypress', 'screenshots');
fs.mkdirSync(OUTDIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let seq = 0;
const pending = new Map();
const server = spawn('cmd.exe', ['/c', 'npx', '--yes', 'chrome-devtools-mcp@latest', '--isolated', '--viewport', '1280x800', '--allow-unrestricted-paths', '--no-usage-statistics', '--no-performance-crux'], {
  stdio: ['pipe', 'pipe', 'inherit'],
});
const rl = readline.createInterface({ input: server.stdout });

rl.on('line', (line) => {
  try {
    const msg = JSON.parse(line);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
    }
  } catch (_) { /* ruido */ }
});

function request(method, params = {}, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); reject(new Error('timeout ' + method)); }
    }, timeoutMs);
  });
}

async function init() {
  const r = await request('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'val-visual-cli', version: '0.1.0' },
  });
  server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  return r;
}

async function call(name, args = {}, timeoutMs = 60000) {
  const r = await request('tools/call', { name, arguments: args }, timeoutMs);
  const content = (r.content || []).map((c) => c.text || '').join('\n').trim();
  return { content, isError: !!r.isError };
}

async function forceRepaint() {
  await call('evaluate_script', {
    function: `() => {
      const b = document.body;
      b.style.opacity = '0.9999';
      void b.offsetHeight;
      b.style.opacity = '';
      void b.offsetHeight;
      return 'flushed';
    }`,
  });
  try { await call('resize_page', { width: 1281, height: 801 }); await call('resize_page', { width: 1280, height: 800 }); } catch (_) {}
  await sleep(350);
}

async function domReport(label, push) {
  const r = await call('evaluate_script', {
    function: `() => JSON.stringify({
      hash: location.hash,
      loaderVisible: (() => { const l = document.querySelector('#app-content .loader'); return !!l && getComputedStyle(l).display !== 'none'; })(),
      appContentChars: document.getElementById('app-content').textContent.length,
      appContentText: document.getElementById('app-content').textContent.trim().slice(0, 120),
      erpSidebar: !!document.querySelector('.erp-sidebar'),
      sidebarActive: Array.from(document.querySelectorAll('.sidebar-link.active')).map(a => a.getAttribute('data-route')).join('|'),
      fab: !!document.querySelector('.fab-container'),
      gastosText: (document.body.textContent || '').indexOf('Gastos') !== -1,
      asistenteVisible: !!document.getElementById('asistente-configuracion-contenedor') || !!document.querySelector('.asistente-opciones'),
      guiaOverlays: document.querySelectorAll('.guide-overlay, .guide-popover, .guide-resume-chip, .tour-flotante-overlay').length
    })`,
  });
  push('[DOM] ' + label + ': ' + r.content);
}

// Desactiva las guías interactivas para que no estorben las capturas (tour/spotlight/popover/chip)
async function disableGuides(push) {
  const r = await call('evaluate_script', {
    function: `() => {
      let out = [];
      try { if (window.GuideManager && typeof window.GuideManager.stop === 'function') { window.GuideManager.stop(); out.push('stopped'); } } catch (e) {}
      const removed = document.querySelectorAll('.guide-overlay, .guide-popover, .guide-resume-chip, .tour-flotante-overlay').length;
      document.querySelectorAll('.guide-overlay, .guide-popover, .guide-resume-chip, .tour-flotante-overlay').forEach(n => n.remove());
      out.push('removed=' + removed);
      return out.join(' ');
    }`,
  });
  push('[GUIAS] desactivadas: ' + r.content);
  await sleep(200);
}

async function waitAppBooted(push) {
  for (let i = 0; i < 80; i++) {
    const ev = await call('evaluate_script', {
      function: `() => {
        if (!window.App) return 'no-app';
        const l = document.querySelector('#app-content .loader');
        const loaderHidden = !l || getComputedStyle(l).display === 'none';
        const ac = document.getElementById('app-content');
        const hasContent = ac && ac.children.length > 1;
        return (loaderHidden && hasContent) ? 'ok' : 'loading';
      }`,
    });
    const v = String(ev.content);
    if (v.indexOf('"ok"') !== -1 || v.indexOf('ok') !== -1 && v.indexOf('no-app') === -1) return true;
    await sleep(500);
  }
  return false;
}

(async () => {
  const informe = [];
  const push = (s) => { informe.push(s); console.log(s); };
  try {
    push('[MCP] arrancando servidor chrome-devtools-mcp (Chrome CON ventana)...');
    const srv = await init();
    push('[MCP] initialize OK: ' + (srv.serverInfo && srv.serverInfo.name) + ' v' + (srv.serverInfo && srv.serverInfo.version));

    const np = await call('new_page', { url: 'http://localhost:8089/' });
    push('[PAGE] new_page: ' + np.content.split('\n')[0]);

    // Esperar a que exista App y el asistente/demo esté listo
    let appUp = false;
    for (let i = 0; i < 60 && !appUp; i++) {
      const ev = await call('evaluate_script', {
        function: '() => !!window.App && !!document.getElementById("app-content")',
      });
      if (String(ev.content).indexOf('true') !== -1) appUp = true;
      else await sleep(500);
    }
    push('[APP] window.App presente: ' + appUp);

    // Sembrar datos demo directamente (evita el modal de confirmación del asistente)
    push('[DEMO] sembrando DEMO CHAMORRO (SeedData.run)... puede tardar');
    const seed = await call('evaluate_script', {
      function: `async () => {
        const ok = await window.AsistenteConfiguracion._ensureSeedData();
        if (!ok) return 'ERR: _ensureSeedData false';
        const start = Date.now();
        const r = await window.SeedData.run(true);
        return 'OK run() en ' + (Date.now() - start) + 'ms -> ' + (r === undefined ? 'undefined' : JSON.stringify(r));
      }`,
    }, 180000);
    push('[DEMO] ' + seed.content);

    // Recargar para que la app arranque con la finca activa
    await call('evaluate_script', { function: '() => { window.location.reload(); return true; }' });
    push('[RELOAD] recargando con datos demo...');
    await sleep(6000);

    const booted = await waitAppBooted(push);
    push('[ARRANQUE] dashboard tras demo: ' + (booted ? 'OK' : 'FAIL (loader sigue)'));

    await domReport('dashboard', push);
    await disableGuides(push);
    await forceRepaint();
    await call('take_screenshot', { format: 'png', filePath: path.join(OUTDIR, 'val-dashboard.png') });
    push('[SHOT] val-dashboard.png guardada');

    const info = await call('evaluate_script', {
      function: `() => {
        const g = window.GuideRegistry ? window.GuideRegistry.getAll().map(x => x.id).sort() : [];
        return JSON.stringify({ guias: g.length, inicioDashboard: g.includes('inicio.dashboard'), exproGastos: g.includes('expro.gastos') });
      }`,
    });
    push('[REGISTRY] ' + info.content);

    const nav = await call('evaluate_script', {
      function: `async () => {
        try { await App._ensureViewGroup('expro'); } catch (e) { window.__gd = String(e && e.message || e); }
        location.hash = '#/explotacion?tab=gastos';
        return 'navegado';
      }`,
    });
    push('[NAV] a gastos: ' + nav.content);
    await sleep(4000);
    await domReport('gastos', push);
    const gErr = await call('evaluate_script', { function: '() => window.__gd || ""' });
    push('[GASTOS] err=' + gErr.content);
    const gastosView = await call('evaluate_script', { function: '() => typeof window.GastosView' });
    push('[GASTOS] GastosView=' + gastosView.content);
    await disableGuides(push);
    await forceRepaint();
    await call('take_screenshot', { format: 'png', filePath: path.join(OUTDIR, 'val-gastos.png') });
    push('[SHOT] val-gastos.png guardada');

    await call('evaluate_script', { function: '() => { location.hash = "#/"; return true; }' });
    await sleep(3000);
    await domReport('inicio', push);
    await disableGuides(push);
    await forceRepaint();
    await call('take_screenshot', { format: 'png', filePath: path.join(OUTDIR, 'val-dashboard2.png') });
    push('[SHOT] val-dashboard2.png guardada');

    push('[FIN] done');
  } catch (e) {
    push('[ERROR] ' + e.message);
  } finally {
    fs.writeFileSync(path.join(OUTDIR, 'val-informe.txt'), informe.join('\n'));
    try { server.kill(); } catch (_) {}
    try { server.stdin.end(); } catch (_) {}
  }
})();
