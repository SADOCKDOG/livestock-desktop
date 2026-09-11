window.isNative = !!window.Capacitor;
// DESKTOP: la app no usa Service Worker (los assets van empaquetados en el
// binario nativo). El SW heredado de la PWA (sw.js, estrategia cache-first)
// servía CSS/JS obsoleto incluso tras Ctrl+F5 en la previsualización de
// desarrollo. Si queda un SW registrado de visitas anteriores, se
// desregistra y se purgan sus cachés, recargando una vez para servir fresco.
try {
  if (navigator.serviceWorker && typeof navigator.serviceWorker.getRegistrations === 'function') {
    window.addEventListener("load", () => {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => {
          if (!regs.length) return;
          return Promise.all(regs.map((r) => r.unregister()))
            .then(() => (window.caches && caches.keys) ? caches.keys() : [])
            .then((keys) => Promise.all((keys || []).map((k) => caches.delete(k))))
            .then(() => {
              if (!sessionStorage.getItem('sw-purged')) {
                sessionStorage.setItem('sw-purged', '1');
                location.reload();
              }
            });
        })
        .catch((err) => console.warn("SW purge:", err));
    });
  }
} catch (e) {
  console.warn("Service Worker no disponible o bloqueado por el sandbox del entorno:", e.message);
}
