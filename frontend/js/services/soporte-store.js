/**
 * soporte-store.js — compra del complemento de soporte en Microsoft Store.
 *
 * Solo escritorio. Vive aparte de purchase-manager.js porque son dos productos
 * distintos: purchase-manager vende 'premium_unlock' (desbloqueo de la app) y
 * esto vende 'support_unlock' (soporte con incidencias).
 *
 * Tres saltos para verificar:
 *   1. El Worker emite un ticket de Entra ID  (POST /auth/ms/ticket)
 *   2. Tauri lo cambia por una Store ID key   (comando obtener_store_id_key)
 *   3. El Worker canjea la clave por sesion   (POST /auth/verify-purchase)
 *
 * Ojo: el purchaseToken que devuelve la Digital Goods API es el id del
 * complemento, igual para todo el mundo. No prueba nada y no se usa como tal.
 */
(function () {
  'use strict';

  var PRODUCTO = 'support_unlock';
  var BILLING = 'https://store.microsoft.com/billing';
  // Mismo idioma que support-api.js: con `in` un SUPPORT_API_BASE vacio apunta
  // al mismo sitio en los dos ficheros, cosa que `||` no respetaria.
  var BASE = ('SUPPORT_API_BASE' in window
    ? window.SUPPORT_API_BASE
    : 'https://livestock-manager-support-api-production.livestock-desktop.workers.dev');

  var SoporteStore = {
    _dgs: null,

    /** Hay Store y hay puente nativo: solo cierto en la app instalada. */
    disponible: function () {
      return !!(window.__TAURI__ && typeof window.getDigitalGoodsService === 'function');
    },

    _servicio: function () {
      var self = this;
      if (self._dgs) return Promise.resolve(self._dgs);
      if (typeof window.getDigitalGoodsService !== 'function') {
        return Promise.reject(new Error(
          'La compra solo está disponible en la app instalada desde la Microsoft Store.'));
      }
      return window.getDigitalGoodsService(BILLING).then(function (dgs) {
        self._dgs = dgs;
        return dgs;
      });
    },

    /** Compra el complemento. Devuelve true si el servidor concedio licencia. */
    async comprar() {
      var dgs = await this._servicio();
      var detalles = await dgs.getDetails([PRODUCTO]);
      if (!detalles || !detalles.length) {
        throw new Error('El soporte no está disponible en la Store ahora mismo.');
      }
      var item = detalles[0];

      var peticion = new PaymentRequest(
        [{ supportedMethods: BILLING, data: { sku: item.itemId } }],
        {
          total: {
            label: item.title || 'Soporte técnico',
            amount: { currency: item.price.currency, value: item.price.value },
          },
        },
      );
      var respuesta = await peticion.show();
      await respuesta.complete('success');

      // El pago no basta: hasta que el servidor no lo confirme no hay licencia.
      return await this.revalidar();
    },

    /**
     * Acuna una clave nueva y la canjea por sesion. Se llama tras comprar, en
     * cada arranque y cuando support-api.js detecta la licencia caducada.
     */
    async revalidar() {
      if (!this.disponible()) return false;

      var instalacion = await window.SupportAPI._idDeInstalacion();
      if (!instalacion) {
        // Sin id de instalacion la compra sigue valiendo, pero el historial no
        // sobrevive a una recompra. Se avisa y se continua.
        console.warn('[SoporteStore] sin id de instalación: el historial no se podrá reencontrar');
      }

      var respuesta = await fetch(BASE + '/auth/ms/ticket', { method: 'POST' });
      if (!respuesta.ok) {
        if (respuesta.status === 501) {
          throw new Error('La compra en Microsoft Store todavía no está activada.');
        }
        throw new Error('No se pudo contactar con el servidor de soporte.');
      }
      var datos = await respuesta.json();

      var clave = await window.__TAURI__.core.invoke('obtener_store_id_key', {
        ticket: datos.ticket,
        publisherUserId: instalacion || '',
      });

      await window.SupportAPI.iniciarSesion(clave, 'windows');
      return window.SupportAPI.licenciaActiva();
    },
  };

  window.SoporteStore = SoporteStore;
})();
