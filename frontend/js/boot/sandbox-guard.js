// Sandbox Guard Ultra-Robustecido para entornos iframe restringidos (Open Design Desktop)
// Evita de forma síncrona caídas críticas al consultar serviceWorker e indexedDB
try {
  var _testSW = navigator.serviceWorker;
} catch (e) {
  console.warn("[Sandbox Guard] navigator.serviceWorker bloqueado en sandbox. Redefiniendo de forma segura...");
  try {
    Object.defineProperty(navigator, 'serviceWorker', {
      get: function() { return undefined; },
      configurable: true
    });
  } catch (err) {
    try {
      Object.defineProperty(Navigator.prototype, 'serviceWorker', {
        get: function() { return undefined; },
        configurable: true,
        enumerable: true
      });
    } catch (err2) {
      console.error("[Sandbox Guard] No se pudo redefinir serviceWorker en el prototipo:", err2);
    }
  }
}

try {
  var _testIDB = window.indexedDB;
} catch (e) {
  console.warn("[Sandbox Guard] window.indexedDB bloqueado en sandbox. Redefiniendo para evitar caídas síncronas...");
  try {
    Object.defineProperty(window, 'indexedDB', {
      get: function() { return undefined; },
      configurable: true
    });
  } catch (err) {
    console.error("[Sandbox Guard] No se pudo redefinir indexedDB de forma segura:", err);
  }
}
