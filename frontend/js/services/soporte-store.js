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
 * NUEVO: Paso 0.5 - Registrar instalación con el Worker para habilitar validación
 *
 * La compra la abre WinRT (comando comprar_complemento). La Digital Goods API
 * no sirve aqui: solo funciona en apps instaladas desde la Store, y el WebView2
 * de Tauri no lo es — rechaza con «unsupported context».
 */
(function () {
  'use strict';

  // Store ID del complemento en Partner Center. RequestPurchaseAsync solo
  // entiende este identificador; el Product ID ('support_unlock') es el que
  // devuelve la API de colecciones en inAppOfferToken, y lo usa el Worker.
  var STORE_ID = '9P104KJR294Z';
  // Mismo idioma que support-api.js: con `in` un SUPPORT_API_BASE vacio apunta
  // al mismo sitio en los dos ficheros, cosa que `||` no respetaria.
  var BASE = ('SUPPORT_API_BASE' in window
    ? window.SUPPORT_API_BASE
    : 'https://livestock-manager-support-api-production.livestock-desktop.workers.dev');

  var SoporteStore = {

    /** Hay puente nativo: solo cierto en la app de escritorio instalada. */
    disponible: function () {
      return !!(window.__TAURI__ && window.__TAURI__.core);
    },

    /** Compra el complemento. Devuelve true si el servidor concedio licencia. */
    async comprar() {
      if (!this.disponible()) {
        throw new Error(
          'La compra solo está disponible en la app instalada desde la Microsoft Store.');
      }

      // La compra la hace WinRT, no la Digital Goods API: el WebView2 de Tauri
      // no es una app instalada desde la Store y esa API rechaza ahi con
      // «unsupported context». RequestPurchaseAsync quiere el Store ID del
      // complemento, no su Product ID.
      var estado = await window.__TAURI__.core.invoke('comprar_complemento', {
        storeId: STORE_ID,
      });

      // El pago no basta: hasta que el servidor no lo confirme no hay licencia.
      // «ya_comprado» tambien pasa por aqui: el derecho existe aunque no se
      // acabe de pagar, y quien lo acredita es el servidor.
      if (estado === 'cancelado') {
        // Mismo contrato que la Payment Request API, que es lo que espera
        // purchase-manager: cerrar el dialogo no es un fallo que anunciar.
        var abortado = new Error('Compra cancelada.');
        abortado.name = 'AbortError';
        throw abortado;
      }
      if (estado !== 'comprado' && estado !== 'ya_comprado') return false;
      return await this.revalidar();
    },

    /**
     * Registra el ID de instalación con el Worker de Cloudflare para habilitar
     * la validación posterior de licencias. Este paso es necesario porque el
     * Worker rechaza por seguridad cualquier intento de validación desde IDs
     * de instalación no previamente registrados.
     */
    async _registrarInstalacion(instalacion) {
      if (!instalacion) {
        return;
      }

      try {
        var respuesta = await fetch(BASE + '/auth/register-installation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instalacion })
        });

        if (!respuesta.ok) {
          console.warn('[SoporteStore] No se pudo registrar instalación:', respuesta.status, await respuesta.text());
          // No lanzamos error porque quizás ya esté registrado o sea un problema temporal
          // La validación podría seguir funcionando si el ID ya estaba registrado
        } else {
          console.debug('[SoporteStore] Instalación registrada correctamente:', instalacion);
        }
      } catch (error) {
        console.error('[SoporteStore] Error registrando instalación:', error);
        // Similarmente, no lanzamos error para permitir que continúe el flujo
      }
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

      // NUEVO: Registrar instalación con el Worker antes de validar licencia
      await this._registrarInstalacion(instalacion);

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

      // Store last attempt for debugging
      this._lastClave = clave;
      this._lastInstalacion = instalacion;

      // Debug logging
      console.debug('[SoporteStore] revalidar: clave=', clave, 'instalacion=', instalacion);

      try {
        await window.SupportAPI.iniciarSesion(clave, 'windows');
      } catch (e) {
        console.error('[SoporteStore] iniciarSesion falló:', e);
        // Also log the clave and instalacion for debugging (but be careful not to leak sensitive info)
        console.error('[SoporteStore] clave (first 10 chars):', clave ? clave.substring(0, 10) : null);
        console.error('[SoporteStore] instalacion:', instalacion);
        throw e;
      }
      return window.SupportAPI.licenciaActiva();
    },

    /**
     * Devuelve información del último intento de validación para depuración.
     * @returns {Object} Objeto con clave (primeros 10 caracteres) e instalacion.
     */
    getLastAttempt: function () {
      return {
        clave: this._lastClave ? this._lastClave.substring(0, 10) : null,
        instalacion: this._lastInstalacion
      };
    }
  };

  // Initialize last attempt properties
  SoporteStore._lastClave = null;
  SoporteStore._lastInstalacion = null;

  window.SoporteStore = SoporteStore;
})();