/// <reference types="cypress" />

describe('Selector de columnas de gastos', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.document().then(doc => {
      doc.body.innerHTML = `
        <div id="gastos-column-selector" class="erp-column-selector mt-2 flex flex-wrap gap-2" aria-label="Selección de columnas de gastos">
          <label class="checkbox">
            <input type="checkbox" class="column-selector-checkbox" data-col="fecha" checked onchange="window.guardarSeleccionFiltros && window.guardarSeleccionFiltros(this)" aria-label="Mostrar columna de Fecha"><span aria-hidden="true">Fecha</span>
          </label>
        </div>
      `;
      doc.defaultView.guardarSeleccionFiltros = function(cb) {
        const col = cb.getAttribute('data-col');
        const prefs = JSON.parse(doc.defaultView.localStorage.getItem('gastosColumnPreferences') || '{}');
        prefs[col] = cb.checked;
        doc.defaultView.localStorage.setItem('gastosColumnPreferences', JSON.stringify(prefs));
      };
    });
  });

  it('guarda la preferencia de columna al marcar una casilla', () => {
    cy.get('input[data-col="fecha"]').uncheck({ force: true }).check({ force: true });

    cy.window().then(win => {
      const storage = win.localStorage.getItem('gastosColumnPreferences') || '';
      expect(storage).to.contain('"fecha":true');
    });
  });

  it('elimina la preferencia al desmarcar la casilla', () => {
    cy.get('input[data-col="fecha"]').uncheck({ force: true });

    cy.window().then(win => {
      const storage = win.localStorage.getItem('gastosColumnPreferences');
      expect(storage).to.contain('"fecha":false');
    });
  });
});