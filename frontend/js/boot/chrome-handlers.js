// Handlers del chrome (header, nav y rescate de arranque).
//
// Antes vivian como atributos onclick="App..." / onkeydown="..." en index.html.
// Una CSP sin 'unsafe-inline' bloquea cualquier manejador en atributo, asi que
// se reescriben como delegacion en document. La delegacion conserva la
// propiedad que tenian los atributos: no necesitan que el elemento exista ni
// que App este cargado en el momento de registrarse, porque la busqueda del
// destino ocurre en el propio clic.
//
// Mientras App no existe, el clic no hace nada en vez de lanzar
// "App is not defined". El <html class="app-cargando"> que pone error-diag.js
// sigue siendo quien avisa visualmente de ese hueco.
//
// Nota: los atributos originales del logo y de la vineta de finca llamaban a
// App.route("/") y App.route("/fincas"), pero App.route() no acepta argumentos
// (lee window.location.hash), asi que nunca navegaron. Se corrige escribiendo
// el hash, que es lo que route() lee.
(function () {
  "use strict";

  function conApp(fn) {
    if (window.App) fn(window.App);
  }

  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t || typeof t.closest !== "function") return;

    // Logo del header -> inicio
    if (t.closest(".header-logo-container")) {
      location.hash = "#/";
      return;
    }

    // Campana de alertas
    if (t.closest("#header-alerts-bell")) {
      location.hash = "#/alertas";
      return;
    }

    // Vineta de finca -> listado de fincas
    if (t.closest("#finca-badge")) {
      location.hash = "#/fincas";
      return;
    }

    // Plegar/desplegar la sidebar ERP
    if (t.closest("#sidebarToggle")) {
      conApp(function (App) { App._toggleSidebar(); });
      return;
    }

    // Boton de rescate del arranque
    if (t.closest("#startup-rescue button")) {
      location.reload();
      return;
    }

    // Overlay del dropdown del header: cierra al pulsar fuera del panel.
    // Equivale al onclick="event.stopPropagation()" que llevaba el panel.
    if (t.closest("#header-dropdown-menu") && !t.closest(".header-dropdown-content")) {
      conApp(function (App) { App._toggleHeaderDropdown(); });
    }
  });

  // Buscador global: Enter lanza la busqueda
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter") return;
    var t = ev.target;
    if (!t || typeof t.closest !== "function") return;
    if (!t.closest("#header-search-input")) return;
    ev.preventDefault();
    conApp(function (App) { App._buscarGlobal(); });
  });
})();
