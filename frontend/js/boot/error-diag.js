// Global error diagnostic for Android
window.onerror = function(msg, url, line, col, err) {
  const diag = document.getElementById('error-diag');
  if (diag) {
    diag.style.display = 'block';
    diag.innerHTML = 'Se ha producido un error: ' + msg + '<br>en ' + url + ':' + line + ':' + col + '\n\n<small style="opacity:0.5">Detalles técnicos disponibles en consola</small>';
    diag.onclick = () => diag.style.display = 'none';
  }
  console.error('[Error]', msg, '\nArchivo:', url, '\nLínea:', line, '\nCol:', col, '\nStack:', err?.stack);
  return true;
};
window.addEventListener('unhandledrejection', function(e) {
  const diag = document.getElementById('error-diag');
  if (diag) {
    diag.style.display = 'block';
    diag.innerHTML = 'Se ha producido un error. Pulsa para continuar.\n\n<small style="opacity:0.5">Detalles técnicos disponibles en consola</small>';
    diag.onclick = () => diag.style.display = 'none';
  }
  console.error('[Promise]', e.reason?.message || e.reason, '\nStack:', e.reason?.stack);
});
// El chrome (header y nav inferior) lleva onclick="App.*" inline y es pulsable
// desde el primer pintado, pero App no existe hasta que terminan de cargar los
// ~89 scripts. Tocar cualquier control en ese hueco lanza "App is not defined",
// y el window.onerror de arriba lo presenta como un error grave.
document.documentElement.classList.add("app-cargando");
const _esperaApp = setInterval(() => {
  if (window.App) {
    document.documentElement.classList.remove("app-cargando");
    clearInterval(_esperaApp);
  }
}, 120);

// Rescue timer. Se comprueba `window.App` en vez del texto del contenedor: el
// texto solo dice que aún no se ha pintado la vista, no que el arranque haya
// fallado. Y 20s en vez de 8, que se agotaban en arranques en frío.
setTimeout(() => {
  if (!window.App) {
    document.getElementById("startup-rescue").style.display = "block";
  }
}, 20000);
