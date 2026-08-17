/// <reference types="cypress" />

describe('Selector de columnas de gastos', () => {
  beforeEach(() => {
    cy.visit('/gastos');
  });

  it('guarda la preferencia de columna al marcar una casilla', () => {
    // Marcar la casilla de "Fecha"
    cy.get('input[aria-label="Mostrar columna de Fecha"]').check();

    // Verificar que el valor se haya escrito en localStorage
    cy.window().then(win => {
      const storage = win.localStorage.getItem('gastosColumnPreferences');
      expect(storage).to.contain('"fecha":true');
    });
  });

  it('elimina la preferencia al desmarcar la casilla', () => {
    // La casilla comienza marcada por defecto, por lo que primero la desmarcamos
    cy.get('input[aria-label="Mostrar columna de Fecha"]').uncheck();

    cy.window().then(win => {
      const storage = win.localStorage.getItem('gastosColumnPreferences');
      expect(storage).to.contain('"fecha":false');
    });
  });