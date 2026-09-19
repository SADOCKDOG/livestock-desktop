(function () {
  'use strict';

  var STORAGE_KEY = 'livestock_premium_purchased';
  var PRODUCT_ID = 'premium_unlock';
  var SUPPORT_PRODUCT_ID = 'support_unlock';
  // InAppOfferToken del complemento en Partner Center. Es independiente del id
  // de Google Play: si al crear el add-on se usa otro token, hay que cambiarlo
  // aqui, porque la Digital Goods API no permite listar los ids disponibles.
  var MS_STORE_PRODUCT_ID = 'premium_unlock';
  var MS_STORE_BILLING = 'https://store.microsoft.com/billing';

  // Transaction.products contiene objetos {id, offerId}, no ids de producto.
  function txTieneProducto(tx, productId) {
    var lista = (tx && tx.products) || [];
    for (var i = 0; i < lista.length; i++) {
      var p = lista[i];
      if (p === productId) return true;
      if (p && p.id === productId) return true;
    }
    return false;
  }

  function reciboTieneProducto(recibo, productId) {
    var txs = (recibo && recibo.transactions) || [];
    for (var t = 0; t < txs.length; t++) {
      if (txTieneProducto(txs[t], productId)) return true;
    }
    return false;
  }

  // --- Licencia de soporte ---------------------------------------------------
  // Se cobra aparte del desbloqueo Premium y se compra en la Store, no con el
  // plugin de Play: toda la mecanica vive en SoporteStore. Aqui solo se
  // traducen sus errores a algo que el usuario entienda, porque quien llama
  // (soporte-view) espera una promesa que nunca rechaza.

  function sinPuenteDeSoporte() {
    App.toastError('La compra de soporte solo está disponible en la app instalada desde la Microsoft Store.');
    return Promise.resolve(false);
  }

  function comprarSoporteEnStore() {
    if (!window.SoporteStore) return sinPuenteDeSoporte();
    return window.SoporteStore.comprar().then(function (ok) {
      if (ok) App.toast('Soporte activado. Ya puedes abrir incidencias.', 'success');
      else App.toastError('La compra no se pudo confirmar. Vuelve a intentarlo en unos minutos.');
      return ok;
    }).catch(function (e) {
      // AbortError = el usuario cerro el dialogo de pago. No es un fallo.
      if (e && e.name === 'AbortError') return false;
      console.warn('[PurchaseManager] comprarSoporte fallo:', e);
      App.toastError((e && e.message) || 'No se pudo iniciar la compra.');
      return false;
    });
  }

  function restaurarSoporteEnStore() {
    if (!window.SoporteStore) return sinPuenteDeSoporte();
    // En la Store no hay «restaurar»: se vuelve a preguntar que posee el
    // usuario, y eso es justo lo que hace revalidar().
    return window.SoporteStore.revalidar().then(function (ok) {
      if (ok) App.toast('Licencia de soporte restaurada.', 'success');
      else App.toast('No se encontró ninguna licencia de soporte en esta cuenta.', 'info');
      return ok;
    }).catch(function (e) {
      console.warn('[PurchaseManager] restaurarSoporte fallo:', e);
      App.toastError((e && e.message) || 'No se pudo restaurar la licencia.');
      return false;
    });
  }

  if (window.FREE_MODE === false) {
    window.PurchaseManager = {
      isPurchased: function () { return true; },
      isReady: function () { return true; },
      purchase: function () {},
      restorePurchases: function () {},
      // El soporte se cobra aparte del desbloqueo Premium: sigue haciendo falta
      // aunque la app este desbloqueada.
      comprarSoporte: comprarSoporteEnStore,
      restaurarSoporte: restaurarSoporteEnStore,
      revalidarSoporte: function () {
        return window.SoporteStore ? window.SoporteStore.revalidar() : Promise.resolve(false);
      },
      registrarCorreoSoporte: function (correo) {
        if (!window.SoporteStore) return Promise.reject(new Error('Soporte no disponible.'));
        return window.SoporteStore.revalidar(correo, true);
      },
    };
    return;
  }

  var PurchaseManager = {
    _initialized: false,
    // Lectura síncrona: las vistas del primer render ya conocen el estado Premium
    _purchased: (function () {
      try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch (e) { return false; }
    })(),
    _store: null,

    isPurchased: function () {
      return this._purchased;
    },

    isReady: function () {
      return this._initialized;
    },

    purchase: function () {
      var self = this;
      if (self._purchased) {
        App.toast('Ya eres Premium. Todas las funciones están desbloqueadas.', 'success');
        return;
      }
      if (self._dgs) {
        self._comprarEnMicrosoftStore();
        return;
      }
      if (!self._store) {
        App.toastError('El sistema de pago no está disponible. Inténtalo de nuevo.');
        return;
      }
      var product = self._store.get(PRODUCT_ID);
      if (!product) {
        App.toastError('Producto no disponible. Conéctate a Internet y reinicia la app.');
        return;
      }
      var offer = product.getOffer();
      if (!offer) {
        App.toastError('Oferta no disponible para este producto.');
        return;
      }
      offer.order();
    },

    // --- Licencia de soporte Android ----------------------------------------
    // En esta rama existe CdvPurchase. La rama FREE_MODE=false retorna antes y
    // conserva el flujo de Microsoft Store definido arriba.
    comprarSoporte: function () {
      var self = this;
      if (!self._store) {
        App.toastError('El sistema de pago no está disponible ahora mismo.');
        return Promise.resolve(false);
      }
      try {
        var producto = self._store.get(SUPPORT_PRODUCT_ID);
        if (!producto) {
          App.toastError('La licencia de soporte no está disponible todavía.');
          return Promise.resolve(false);
        }
        var oferta = producto.getOffer();
        if (!oferta) {
          App.toastError('El plan de soporte no está disponible todavía.');
          return Promise.resolve(false);
        }
        return self._store.order(oferta).then(function (err) {
          if (err) {
            console.warn('[PurchaseManager] order devolvio error:', err.code, err.message);
            return false;
          }
          return self._sincronizarSoporte();
        });
      } catch (e) {
        console.warn('[PurchaseManager] comprarSoporte fallo:', e);
        App.toastError('No se pudo iniciar la compra.');
        return Promise.resolve(false);
      }
    },

    restaurarSoporte: function () {
      return this._sincronizarSoporte();
    },

    revalidarSoporte: function () {
      if (!window.SupportAPI) return Promise.resolve(false);
      var token = this._tokenDeSoporte();
      if (!token) return Promise.resolve(false);
      return window.SupportAPI.iniciarSesion(token, 'android')
        .then(function () { return true; })
        .catch(function () { return false; });
    },

    registrarCorreoSoporte: function (correo) {
      if (!window.SupportAPI) return Promise.reject(new Error('Soporte no disponible.'));
      var token = this._tokenDeSoporte();
      if (!token) return Promise.reject(new Error('No hay licencia de soporte activa.'));
      return window.SupportAPI.iniciarSesion(token, 'android', correo || '', true);
    },

    _sincronizarSoporte: function () {
      var self = this;
      if (!window.SupportAPI) return Promise.resolve(false);

      var token = self._tokenDeSoporte();
      if (!token) {
        App.toast('No se encontró ninguna licencia de soporte en esta cuenta.', 'info');
        return Promise.resolve(false);
      }

      return window.SupportAPI.iniciarSesion(token, 'android')
        .then(function () {
          App.toast('Soporte activado.', 'success');
          return true;
        })
        .catch(function (e) {
          App.toastError((e && e.message) || 'No se pudo activar el soporte.');
          return false;
        });
    },

    _tokenDeSoporte: function () {
      try {
        var recibos = (this._store && this._store.localReceipts) || [];
        for (var i = 0; i < recibos.length; i++) {
          var txs = recibos[i].transactions || [];
          for (var t = 0; t < txs.length; t++) {
            var tx = txs[t];
            if (!txTieneProducto(tx, SUPPORT_PRODUCT_ID)) continue;
            var token = tx.purchaseToken ||
                        (tx.nativePurchase && tx.nativePurchase.purchaseToken) ||
                        tx.transactionId || null;
            if (token) return token;
          }
        }
        console.warn('[PurchaseManager] sin token de soporte en', recibos.length, 'recibos');
      } catch (e) {
        console.warn('[PurchaseManager] no se pudo leer el recibo de soporte:', e);
      }
      return null;
    },

    restorePurchases: function () {
      var self = this;
      if (self._dgs) {
        // En la Store no hay «restaurar» como tal: se vuelve a preguntar que
        // posee el usuario, que es lo que reconstruye el derecho.
        self._sincronizarConStore().then(function (ok) {
          if (ok) App.toast('Premium restaurado.', 'success');
          else App.toast('No se encontraron compras asociadas a esta cuenta.', 'info');
        });
        return;
      }
      if (!self._store) {
        App.toastError('El sistema de pago no está disponible.');
        return;
      }
      self._store.restorePurchases();
    },

    // ── Microsoft Store (PWA empaquetada en MSIX) ─────────────────────────
    // Este bloque es solo para la PWA empaquetada, que no tiene acceso a WinRT:
    // ahi el mecanismo es la Digital Goods API + Payment Request API, y existe
    // unicamente si la PWA se instalo DESDE la Store en Windows.
    //
    // En la app de escritorio (Tauri) la restriccion se invierte: si hay WinRT,
    // y en cambio getDigitalGoodsService rechaza con «unsupported context»
    // porque un WebView2 embebido no es una app instalada desde la Store. Ahi la
    // compra va por SoporteStore.comprar() -> comando nativo comprar_complemento.
    // Ese build sale con FREE_MODE = false, asi que este bloque ni se define: el
    // modulo retorna antes, en la rama de soporte de arriba.
    _dgs: null,

    /** ¿Estamos dentro de la PWA instalada desde Microsoft Store? */
    _tieneMicrosoftStore: function () {
      return typeof window.getDigitalGoodsService === 'function';
    },

    /** Conecta con el servicio de facturacion de la Store. */
    _initMicrosoftStore: function () {
      var self = this;
      window.getDigitalGoodsService(MS_STORE_BILLING).then(function (dgs) {
        self._dgs = dgs;
        self._initialized = true;
        console.log('[PurchaseManager] Microsoft Store Billing conectado');
        // La Store es la fuente de verdad de lo que el usuario posee; el
        // localStorage solo sirve de cache para el primer render.
        return self._sincronizarConStore();
      }).catch(function (e) {
        // Ocurre al abrir la PWA en el navegador, fuera de la Store.
        console.warn('[PurchaseManager] Microsoft Store no disponible:', e && e.message);
        self._checkLocal();
      });
    },

    /** Pregunta a la Store que posee el usuario y ajusta el estado Premium. */
    _sincronizarConStore: function () {
      var self = this;
      if (!self._dgs) return Promise.resolve(false);
      return self._dgs.listPurchases().then(function (compras) {
        var tienePremium = (compras || []).some(function (c) {
          return c.itemId === MS_STORE_PRODUCT_ID;
        });
        if (tienePremium) {
          self._markPurchased();
        } else if (self._purchased) {
          // Estaba marcado en local pero la Store dice que no: se revoca, para
          // que un localStorage manipulado no conceda Premium.
          self._purchased = false;
          try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
          console.log('[PurchaseManager] Premium revocado: la Store no lo reconoce');
        }
        return tienePremium;
      }).catch(function (e) {
        console.warn('[PurchaseManager] listPurchases fallo:', e && e.message);
        return false;
      });
    },

    /** Lanza el flujo de compra de la Store (Payment Request API). */
    _comprarEnMicrosoftStore: function () {
      var self = this;
      if (!self._dgs) {
        App.toastError('El sistema de pago no esta disponible.');
        return;
      }
      self._dgs.getDetails([MS_STORE_PRODUCT_ID]).then(function (items) {
        var item = (items || [])[0];
        if (!item) {
          App.toastError('Producto no disponible en la Store.');
          return;
        }
        var request = new PaymentRequest([{
          supportedMethods: MS_STORE_BILLING,
          data: { sku: item.itemId }
        }]);
        return request.show().then(function (respuesta) {
          // El token llega en details; se confirma contra listPurchases antes
          // de conceder nada, en vez de fiarse solo de la respuesta.
          return self._sincronizarConStore().then(function (ok) {
            if (respuesta && respuesta.complete) respuesta.complete(ok ? 'success' : 'fail');
            if (ok) App.toast('Premium activado. Gracias por tu compra.', 'success');
            else App.toastError('No se pudo confirmar la compra. Usa «Restaurar compras».');
          });
        });
      }).catch(function (e) {
        // Cancelar el dialogo tambien entra aqui: no es un error que reportar.
        var msg = (e && e.message) || '';
        if (/cancel/i.test(msg) || (e && e.name === 'AbortError')) return;
        console.warn('[PurchaseManager] compra fallida:', msg);
        App.toastError('No se pudo completar la compra.');
      });
    },

    init: function () {
      var self = this;

      // En la PWA de Microsoft Store manda la Digital Goods API; CdvPurchase
      // solo existe en el build nativo de Android.
      if (self._tieneMicrosoftStore()) {
        self._initMicrosoftStore();
        return;
      }

      if (typeof CdvPurchase === 'undefined' || !CdvPurchase.store) {
        console.warn('[PurchaseManager] CdvPurchase no disponible');
        self._checkLocal();
        return;
      }

      var store = CdvPurchase.store;
      self._store = store;
      store.verbosus = true;

      store.register([{
        id: PRODUCT_ID,
        type: CdvPurchase.ProductType.NON_CONSUMABLE,
        platform: CdvPurchase.Platform.GOOGLE_PLAY
      }, {
        // El soporte es una suscripcion independiente del desbloqueo Premium.
        id: SUPPORT_PRODUCT_ID,
        type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
        platform: CdvPurchase.Platform.GOOGLE_PLAY
      }]);

      store.when()
        .productUpdated(function (product) {
          console.log('[PurchaseManager] productUpdated:', product.id, product);
        })
        .approved(function (transaction) {
          console.log('[PurchaseManager] approved:', transaction);
          transaction.verify();
        })
        .verified(function (receipt) {
          console.log('[PurchaseManager] verified:', receipt);
          if (reciboTieneProducto(receipt, SUPPORT_PRODUCT_ID)) {
            receipt.finish();
            self._sincronizarSoporte();
            return;
          }
          if (!reciboTieneProducto(receipt, PRODUCT_ID)) {
            receipt.finish();
            return;
          }
          self._markPurchased();
          receipt.finish();
          if (window.PremiumManager && window.PremiumManager.cleanDemoData) {
            window.PremiumManager.cleanDemoData().then(function (n) {
              if (n > 0) {
                App.toast('Datos demo eliminados. Bienvenido a Premium');
                setTimeout(function () { window.location.reload(); }, 1500);
              }
            });
          }
        })
        .finished(function (transaction) {
          console.log('[PurchaseManager] finished:', transaction);
        })
        .receiptsReady(function () {
          // v13: el callback NO recibe argumentos; los recibos se leen del store
          var receipts = (self._store && self._store.localReceipts) || [];
          console.log('[PurchaseManager] receiptsReady, recibos locales:', receipts.length);
          for (var i = 0; i < receipts.length; i++) {
            if (reciboTieneProducto(receipts[i], PRODUCT_ID)) {
              self._markPurchased();
              break;
            }
          }
        });

      store.error(function (err) {
        var code = err && err.code;
        var msg = (err && err.message) || '';
        var producto = (err && err.productId) || '';
        console.error('[PurchaseManager] error:', code, producto, msg);

        if (code === CdvPurchase.ErrorCode.PAYMENT_CANCELLED) return;

        if (/already[ _]owned|ya (lo )?has comprado|ya tienes una suscripci/i.test(msg)) {
          if (producto === SUPPORT_PRODUCT_ID) {
            self._sincronizarSoporte();
          } else {
            self._markPurchased();
            App.toast('Compra Premium restaurada.', 'success');
          }
          return;
        }

        if (producto === SUPPORT_PRODUCT_ID || code === CdvPurchase.ErrorCode.PURCHASE) {
          App.toastError('No se pudo completar la compra. Intentalo de nuevo.');
        }
      });

      store.initialize([CdvPurchase.Platform.GOOGLE_PLAY])
        .then(function () {
          self._initialized = true;
          console.log('[PurchaseManager] initialized OK');
          if (!self._purchased) {
            self._checkLocal();
          }
        })
        .catch(function (err) {
          console.error('[PurchaseManager] init error:', err);
          self._checkLocal();
        });

    },

    _markPurchased: function () {
      var yaEstaba = this._purchased;
      this._purchased = true;
      this._initialized = true;
      try { localStorage.setItem(STORAGE_KEY, 'true'); } catch (e) {}
      console.log('[PurchaseManager] Premium marcado como comprado');
      // Desktop (piel ERP): refresca el indicador Free/Premium del pie del sidebar
      try { window.dispatchEvent(new CustomEvent('premiumChanged', { detail: { purchased: true } })); } catch (e) {}
      // Repintar la vista actual para que desaparezcan los banners/candados Free
      if (!yaEstaba && window.App && typeof App.route === 'function') {
        try { App.route(); } catch (e) {}
      }
    },

    _checkLocal: function () {
      try {
        this._purchased = localStorage.getItem(STORAGE_KEY) === 'true';
      } catch (e) {}
      this._initialized = true;
      console.log('[PurchaseManager] check local:', this._purchased);
    }
  };

  window.PurchaseManager = PurchaseManager;

  if (window.Capacitor && window.Capacitor.isNative) {
    document.addEventListener('deviceready', function () {
      PurchaseManager.init();
    }, false);
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        PurchaseManager.init();
      });
    } else {
      PurchaseManager.init();
    }
  }
})();
