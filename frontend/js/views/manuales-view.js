/**
 * Livestock Manager - ManualesView v1.2.0 (desktop)
 *
 * Manuales embebido: al entrar en la sección se abre directamente el
 * "Manual de Usuario General" (manual/index.html), que ya contiene el
 * índice y todos los manuales integrados. No se muestra la rejilla de
 * tarjetas: la vista queda limpia y el propio manual gestiona la
 * navegación entre apartados desde dentro del iframe.
 */
const ManualesView = {
  async render() {
    // Abrir directamente el Manual General (incluye índice y el resto de
    // manuales). Se prescinde de la lista de tarjetas por diseño desktop.
    await this._abrirManual('manual/index.html', 'Manual de Usuario General');
  },

  async _abrirManual(archivo, titulo) {
    // Renderizar el manual DENTRO del marco de contenido de las vistas de
    // módulo (#app-content), conservando la cabecera y el sidebar visibles
    // (en vez de un overlay full-screen que los cubría).
    const main = document.getElementById('app-content');
    if (!main) return;
    main.classList.add('manual-open');

    main.innerHTML = `
      <div class="manual-viewer">
        <div class="manual-viewer-bar">
          <h2 class="page-title manual-viewer-title">
            <span style="color:var(--c-purple); margin-right:6px; display:inline-flex; vertical-align:middle;">${Icons.libro()}</span>
            ${titulo || 'Manual'}
          </h2>
        </div>
        <iframe id="manual-frame" class="manual-frame" src="${archivo}"
                onerror="this.parentElement.innerHTML='<div class=\\'manual-frame-error\\'>Error al cargar el manual.</div>'"></iframe>
      </div>`;
  },
};

window.ManualesView = ManualesView;
