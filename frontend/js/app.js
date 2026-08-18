/**
 * Livestock Manager - Application Controller v4.8.8
 * UI validada v4.8.8 + flujo Industrial Animals v4.8.8 integrado correctamente
 * Fix: rebanoId preservado en _guardarAnimalDetalle (bug invisible en lista)
 */

const App = {
  _animalGuardado: false,
  _pesadaBatch: null,
  _config: null,
  /** Guarda de salida de la vista activa: función async () => boolean (true = permite salir). Ver setExitGuard/_confirmLeave. */
  _exitGuard: null,

  /** Registra la guarda de salida de la vista actualmente renderizada. */
  setExitGuard(fn) {
    this._exitGuard = fn;
  },

  /** Limpia la guarda de salida (llamar tras guardar o al confirmar la salida). */
  clearExitGuard() {
    this._exitGuard = null;
  },

  /** Comprueba la guarda de salida antes de navegar. Devuelve true si se puede continuar. */
  async _confirmLeave() {
    if (!this._exitGuard) return true;
    const guard = this._exitGuard;
    const ok = await guard();
    if (ok) this._exitGuard = null;
    return ok;
  },

  _getColorClass(color) {
    if (!color) return 'text-gray';
    const map = {
      '#C5FA50': 'text-green',
      '#E8555F': 'text-red',
      '#4FADF5': 'text-blue',
      '#FFFC55': 'text-yellow',
      '#E8555F': 'text-orange',
      '#4FADF5': 'text-purple',
      '#4FADF5': 'text-pink',
      '#B1B1B1': 'text-gray',
      '#6b7280': 'text-gray',
      '#888': 'text-gray',
      'var(--c-danger)': 'text-red',
      'var(--c-info)': 'text-blue',
      'var(--c-success)': 'text-green',
      'var(--c-orange)': 'text-orange',
      'var(--c-warning)': 'text-yellow',
      'var(--p-gold)': 'text-gold'
    };
    return map[color] || 'text-gray';
  },



  routes: {
    "/": "renderDashboard",
    "/ganaderia": "renderGanaderia",
    "/rebanos": "renderRebanos",
    "/rebano": "renderDetalleRebano",
    "/zonas": "renderZonas",
    "/zona": "renderDetalleZona",
    "/instalaciones": "renderInstalaciones",
    "/instalacion": "renderDetalleInstalacion",
    "/saneamientos": "renderSaneamientos",
    "/saneamiento": "renderDetalleSaneamiento",
    "/subexplotaciones": "renderSubexplotaciones",
    "/subexplotacion": "renderDetalleSubexplotacion",
    "/botiquin": "renderBotiquin",
    "/botiquin-producto": "renderDetalleBotiquin",
    "/animal-bitacora": "renderBitacoraAnimal",
    "/animales": "renderAnimales",
    "/animal": "renderDetalleAnimal",
    "/explotacion": "renderExplotacion",
    "/gastos": "renderGastos",
    "/comercializacion": "renderComercializacion",
    "/albaran-leche": "renderDetalleLeche",
    "/venta-carne": "renderDetalleVentaCarne",
    "/gasto": "renderDetalleGasto",
    "/informes": "renderInformes",
    "/alertas": "renderAlertas",
    "/ajustes": "renderAjustes",
    "/sistema": "renderConfigSistema",
    "/compradores": "renderCompradores",
    "/comprador": "renderComprador",
    "/proveedores": "renderProveedores",
    "/proveedor": "renderProveedor",
    "/contrato": "renderContrato",
    "/transportistas": "renderTransportistas",
    "/trazabilidad": "renderTrazabilidad",
    "/cuaderno": "renderCuadernoDigital",
    "/documentos": "renderDocumentos",
    "/manuales": "renderManuales",
    "/albaranes-ventas": "renderAlbaranesVentas",
    "/silos": "renderSilos",
    "/fitosanitario": "renderFitosanitarios",
    "/margen-animal": "renderMargenAnimal",
    "/importar-rfid": "renderImportadorRFID",
    "/importar-zonas": "renderImportarZonas",
    "/agenda": "renderAgenda",
  },

  async init() {
    try {
      console.log("App Livestock: Iniciando v" + window.APP_INFO.version + "...");
      this._injectGlobalStyles();
      window.addEventListener("hashchange", () => App.route());
      await window.dbPromise;

      // Inicializar servicios del sistema
      if (window.CacheService) window.CacheService.init();
      if (window.NotificacionesService) {
        window.NotificacionesService.init().catch(e => console.warn('[App] Error init notificaciones:', e));
      }

      this._setupOfflineIndicator();

      if (window.EventBus) {
        const eventosRefresh = [
          'tratamiento:added', 'tratamiento:deleted',
          'animal:created', 'animal:updated', 'animal:deleted', 'animal:moved', 'animales:changed',
          'venta:created', 'venta:deleted',
          'gasto:created', 'gasto:deleted',
          'leche:entrega',
          'pesaje:registrado',
          'reproduccion:evento',
          'comprador:created', 'comprador:deleted',
          'proveedor:created', 'proveedor:deleted',
          'contrato:created', 'contrato:deleted',
          'movimiento:saved', 'movimiento:deleted',
          'saneamiento:saved', 'saneamiento:deleted',
          'transportista:created', 'transportista:deleted',
          'alertas:updated',
          'dashboard:refresh',
        ];
        eventosRefresh.forEach(event => {
          window.EventBus.on(event, () => {
            if (window._pesajesWizardActivo && event === 'pesaje:registrado') return;

            if (window.DashboardView) window.DashboardView._needsRefresh = true;
            if (window.ExplotacionView) { window.ExplotacionView._cachedData = null; window.ExplotacionView._needsDataRefresh = true; }
            if (window.ComercializacionView) { window.ComercializacionView._cachedData = null; window.ComercializacionView._needsDataRefresh = true; }
            if (window.AnimalesView) window.AnimalesView._cache = null;
            if (window.GanaderiaView) { window.GanaderiaView._cachedData = null; window.GanaderiaView._needsDataRefresh = true; }

            const hash = window.location.hash || '#/';
            const esFormulario = hash.includes('id=') || hash.includes('/animal') || hash.includes('/gasto') || hash.includes('/sanitario');

            if (!esFormulario) this.route();
          });
        });
      }

      const fincas = await Fincas.list();
      if (fincas.length === 0 || !(await Fincas.getActiveId())) {
        await AsistenteConfiguracion.mostrarAsistente();
        return;
      }

      await App.updateHeader();
      App._inyectarIconosEstaticos();
      App._setupHeaderBackButton();
      App._setupHeaderContextClick();
      App._setupHeaderExtras();
      App._setupHardwareBackButton();
      App._setupSidebar();
      App._observarVerMas();
      App._recordarFoco();
      await App._ejecutarMigracionesFondo();
      App._initScrollShadows();
      // Cargar preferencias visuales
      try {
        const storedCfg = await window.db.get('meta', 'appConfig');
        this._config = storedCfg?.value || {};
        const cfg = storedCfg;
        const mostrar = cfg?.value?.mostrarContextos;
        if (mostrar === false) {
          document.body.classList.add('hide-context');
          document.querySelectorAll('.card-dark-gradient, .card-total-3d').forEach(c => c.classList.add('compact'));
        }
        if (cfg?.value?.colorTema && cfg.value.colorTema !== 'gold') {
          document.body.setAttribute('data-tema', cfg.value.colorTema);
        }
        if (cfg?.value?.temaOscuro === false) {
          document.body.setAttribute('data-modo', 'claro');
          document.documentElement.style.colorScheme = 'light';
          if (cfg?.value?.temaClaroColor && cfg.value.temaClaroColor !== 'arena') {
            document.body.setAttribute('data-tema-claro', cfg.value.temaClaroColor);
          }
        }
        if (cfg?.value?.glowMarco === false) document.body.classList.add('glow-marco-off');
        if (cfg?.value?.glowLaterales !== true) document.body.classList.add('glow-laterales-off');
        if (cfg?.value?.glowBotones === false) document.body.classList.add('glow-botones-off');
        if (cfg?.value?.glowTarjetas === false) document.body.classList.add('glow-tarjetas-off');

        // Cargar intensidad y color de haz
        const hazInt = cfg?.value?.hazLuzIntensidad ?? 50;
        document.documentElement.style.setProperty('--haz-intensity', hazInt + '%');
        document.documentElement.style.setProperty('--haz-intensity-num', hazInt);

        const hazColor = cfg?.value?.hazLuzColor || '';
        if (hazColor) {
          document.documentElement.style.setProperty('--haz-luz-color', hazColor);
        } else {
          document.documentElement.style.removeProperty('--haz-luz-color');
        }

        const fColor = cfg?.value?.fabColor || '#FFFFFF';
        if (fColor) {
          document.documentElement.style.setProperty('--fab-user-color', fColor);
          document.documentElement.style.setProperty('--fab-neon-color', fColor);
        } else {
          document.documentElement.style.removeProperty('--fab-user-color');
          document.documentElement.style.removeProperty('--fab-neon-color');
        }

        const fInt = cfg?.value?.fabIntensidad ?? 40;
        document.documentElement.style.setProperty('--fab-intensity', fInt + '%');
        document.documentElement.style.setProperty('--fab-intensity-num', fInt);

        const bOpacity = cfg?.value?.bannerOpacity ?? 0.77;
        document.documentElement.style.setProperty('--banner-opacity', bOpacity);

      } catch (_) {}

      // Delegado global de interacción táctil con los pickers de fecha
      document.body.addEventListener('click', (e) => {
        if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'date') {
          if (typeof e.target.showPicker === 'function') {
            try {
              e.target.showPicker();
            } catch (_) {}
          }
        }
      });

      await App.route();
    } catch (error) {
      console.error(error);
      document.getElementById(
        "app-content"
      ).innerHTML = `<div class="card error-card"><h2>Error</h2><p>${error.message}</p></div>`;
    }
  },


  _setupOfflineIndicator() {
    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.textContent = 'Sin conexión';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:var(--c-danger);color:#fff;text-align:center;padding:6px 12px;font-size:0.75rem;font-weight:800;z-index:99999;transform:translateY(-100%);transition:transform 0.3s ease;text-transform:uppercase;letter-spacing:0.05em;';
    document.body.prepend(banner);
    const update = () => {
      banner.style.transform = navigator.onLine ? 'translateY(-100%)' : 'translateY(0)';
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  },

  _injectGlobalStyles() {
    const pStyles = document.createElement("style");
    pStyles.id = "app-production-styles";
    pStyles.textContent = "#produccion-content .report-section{max-width:100%;overflow:hidden;}";
    document.head.appendChild(pStyles);
  },

  /** Inyecta de forma masiva los iconos SVGs de la librería en elementos estáticos HTML con el atributo data-icon */
  _inyectarIconosEstaticos() {
    if (typeof Icons === 'undefined') return;
    document.querySelectorAll('[data-icon]').forEach(el => {
      if (el.querySelector('svg')) return; // Evitar duplicar
      const name = el.getAttribute('data-icon');
      if (typeof Icons[name] === 'function') {
        el.insertAdjacentHTML('afterbegin', Icons[name]());
      }
    });
  },

  /** Inicializa sombras de scroll automáticas en contenedores .scroll-shadow-container */
  _initScrollShadows() {
    if (typeof window.enableScrollShadows !== 'function') return;
    const initEl = (el) => {
      if (el.hasAttribute('data-ss-init')) return;
      window.enableScrollShadows(el);
      el.setAttribute('data-ss-init', '');
    };
    // Inicializar los existentes
    document.querySelectorAll('.scroll-shadow-container').forEach(initEl);
    // Observar nuevos elementos que se añadan al DOM dinámicamente
    const obs = new MutationObserver(() => {
      document.querySelectorAll('.scroll-shadow-container:not([data-ss-init])').forEach(initEl);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  },

  async updateHeader() {
    const finca = await Fincas.getActive();
    const headerEl = document.getElementById("nombre-finca-header");
    const modeEl = document.getElementById("finca-mode-chip-header");

    if (finca) {
      if (headerEl) {
        headerEl.innerHTML = finca.rega || finca.codigo_REGA || 'SIN REGA';
        headerEl.onclick = () => (location.hash = "/ajustes");
        headerEl.style.cursor = "pointer";
      }

      const modeContainer = document.getElementById("finca-mode-container");
      if (modeEl && modeContainer && window.ModoContextoHelper) {
        const flags = await window.ModoContextoHelper.getEffectiveFlags(finca.id);
        const meta = window.ModoContextoHelper.getModeMetaEffective(flags);
        modeEl.innerHTML = meta.label;
        modeEl.style.color = meta.color;
        modeContainer.style.display = 'flex';
      }
    } else if (headerEl) {
      headerEl.innerHTML = 'SIN FINCA';
      const modeContainer = document.getElementById("finca-mode-container");
      if (modeContainer) modeContainer.style.display = 'none';
    }
  },

  /**
   * Header contextual: título de vista + botón de volver según la ruta actual.
   */
  _headerTitles: {
    '/': 'Inicio',
    '/ganaderia': 'Ganadería',
    '/rebanos': 'Rebaños',
    '/rebano': 'Ficha Rebaño',
    '/explotacion': 'ExPro',
    '/zonas': 'Zonas',
    '/instalaciones': 'Instalaciones',
    '/instalacion': 'Ficha Instalación',
    '/saneamientos': 'Saneamientos',
    '/saneamiento': 'Detalle Saneamiento',
    '/subexplotaciones': 'Subexplotaciones',
    '/botiquin': 'Botiquín',
    '/botiquin-producto': 'Detalle Producto',
    '/animal-bitacora': 'Bitácora Animal',
    '/subexplotacion': 'Detalle Subexplotación',
    '/zona': 'Ficha Zona',
    '/animales': 'Animales',
    '/animal': 'Ficha Animal',
    '/gastos': 'Gastos',
    '/comercializacion': 'Comercialización',
    '/albaran-leche': 'Albarán Lácteo',
    '/gasto': 'Detalle Gasto',
    '/informes': 'Informes',
    '/alertas': 'Alertas',
    '/ajustes': 'Ajustes',
    '/compradores': 'Compradores',
    '/comprador': 'Ficha Comprador',
    '/proveedores': 'Proveedores',
    '/proveedor': 'Ficha Proveedor',
    '/contrato': 'Contrato',
    '/transportistas': 'Transportistas',
    '/trazabilidad': 'Trazabilidad 360°',
    '/cuaderno': 'Cuaderno Digital',
    '/documentos': 'Documentos DIMOE',
    '/manuales': 'Manuales',
  },

  /** Rutas que muestran botón de volver (detalles, fichas) */
  _routesConVolver: new Set([
    '/rebano', '/zona', '/animal', '/animales',
    '/albaran-leche', '/gasto', '/comprador',
    '/proveedor', '/contrato', '/trazabilidad',
    '/venta-carne',
  ]),

  _setupHeaderBackButton() {
    const backBtn = document.getElementById('header-back-btn');
    if (!backBtn || backBtn._wired) return;
    backBtn._wired = true;
    backBtn.addEventListener('click', async (e) => {
      e.stopPropagation(); // Evitar que el clic en volver abra el dropdown
      if (!(await App._confirmLeave())) return;
      // Si hay historial de navegación en la app, volver; si no, ir al dashboard
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.hash = '#/';
      }
    });
  },

  _setupHeaderContextClick() {
    const context = document.getElementById('header-context');
    if (!context || context._wired) return;
    context._wired = true;
    context.addEventListener('click', () => {
      this._toggleHeaderDropdown();
    });
  },

  _toggleHeaderDropdown() {
    const dropdown = document.getElementById('header-dropdown-menu');
    if (!dropdown) return;
    const isOpen = dropdown.classList.toggle('open');
    if (isOpen) {
      this._populateHeaderDropdown();
    }
  },

  _populateHeaderDropdown() {
    const grid = document.getElementById('header-dropdown-grid');
    if (!grid) return;

    const items = [
      { path: '/', label: 'Inicio', icon: Icons.home() },
      { path: '/animales', label: 'Animales', icon: Icons.animales() },
      { path: '/rebanos', label: 'Rebaños', icon: Icons.rebanos() },
      { path: '/ganaderia', label: 'Ganadería', icon: Icons.rebanos() },
      { path: '/explotacion', label: 'ExPro', icon: Icons.dashboard() },
      { path: '/comercializacion', label: 'CoMer', icon: Icons.carne() },
      { path: '/zonas', label: 'Zonas', icon: Icons.zonas() },
      { path: '/instalaciones', label: 'Instalaciones', icon: Icons.edificio() },
      { path: '/saneamientos', label: 'Saneamientos', icon: Icons.sanidad() },
      { path: '/subexplotaciones', label: 'Subexplotaciones', icon: Icons.rebanos() },
      { path: '/botiquin', label: 'Botiquín', icon: Icons.sanidad() },
      { path: '/compradores', label: 'Compradores', icon: Icons.documento() },
      { path: '/proveedores', label: 'Proveedores', icon: Icons.documento() },
      { path: '/transportistas', label: 'Logística', icon: Icons.transportistas() },
      { path: '/gastos', label: 'Gastos', icon: Icons.dinero() },
      { path: '/informes', label: 'Informes', icon: Icons.libroVentas() },
      { path: '/alertas', label: 'Alertas', icon: Icons.campana() },
      { path: '/cuaderno', label: 'Cuaderno', icon: Icons.libro() },
      { path: '/manuales', label: 'Manuales', icon: Icons.libro() },
      { path: '/importar-rfid', label: 'Importar RFID', icon: Icons.importar() },
      { path: '/ajustes', label: 'Ajustes', icon: Icons.ajustes() },
    ];

    grid.innerHTML = items.map(item => `
      <a href="#${item.path}" class="header-dropdown-item" onclick="App._toggleHeaderDropdown()">
        <div class="icon" style="color: ${window.getModuleColor(item.path)}">${item.icon}</div>
        <span>${item.label}${item.path === '/alertas' ? ' <span id="dropdown-alertas-count" style="display:none; background:var(--c-danger); color:#fff; border-radius:10px; padding:0 6px; font-size:0.65rem; font-weight:900; margin-left:4px; vertical-align:middle;"></span>' : ''}</span>
      </a>
    `).join('');

    // Contador de alertas activas (asíncrono, no bloquea la apertura del menú)
    if (window.AlertasService) {
      AlertasService.getActiveCount().then(n => {
        const badge = document.getElementById('dropdown-alertas-count');
        if (badge && n > 0) {
          badge.textContent = n > 99 ? '99+' : n;
          badge.style.display = 'inline-block';
        }
      }).catch(() => {});
    }
  },

  /**
   * Maneja el botón de retroceso hardware de Android (Capacitor).
   * - Si hay un wizard/overlay abierto → lo cierra.
   * - Si es una ficha/detalle → navega atrás (history.back).
   * - Si es el Dashboard principal → pregunta si desea salir.
   * - Cualquier otra ruta → vuelve al Dashboard.
   */
  _setupHardwareBackButton() {
    if (!window.Capacitor || !window.Capacitor.isNativePlatform()) return;
    const AppPlugin = window.Capacitor.Plugins?.App;
    if (!AppPlugin) return;

    AppPlugin.addListener('backButton', () => {
      // 0. Modal/Confirm superior abierto → equivale a pulsar Cancelar
      if (window.ModalManager && ModalManager._activeModals.length > 0) {
        const top = ModalManager._activeModals[ModalManager._activeModals.length - 1];
        const cancel = top.element && top.element.querySelector('#' + top.id + '-cancel');
        if (cancel) { cancel.click(); } else { ModalManager.close(top.id); }
        return;
      }

      // 1. Cerrar dropdown del header si está abierto
      const dropdown = document.getElementById('header-dropdown-menu');
      if (dropdown && dropdown.classList.contains('open')) {
        dropdown.classList.remove('open');
        return;
      }

      // 2. Wizard/overlay abierto → pasar por Cancelar (confirmación de descarte + onCancel)
      const wizard = document.querySelector('.wizard-full-screen');
      if (wizard) {
        const cancelBtn = wizard.querySelector('#wizard-btn-cancel');
        if (cancelBtn) { cancelBtn.click(); return; }
        // Sin botón de cancelar propio (p.ej. ficha de animal): respetar la guarda de salida de la vista
        App._confirmLeave().then(ok => { if (ok) wizard.remove(); });
        return;
      }

      // 3. Obtener ruta actual del hash
      const hash = window.location.hash.slice(1) || '/';

      // 4. Si es el Dashboard principal → preguntar si desea salir
      if (hash === '/') {
        const doExit = () => { if (AppPlugin.exitApp) AppPlugin.exitApp(); };
        Confirm.confirm('Salir', '¿Deseas salir de la aplicación?', false)
          .then(ok => { if (ok) doExit(); });
        return;
      }

      // 5. Cualquier otra ruta → retroceder en el historial (respetando la guarda de salida)
      //    Si no hay historial, volver al Dashboard
      App._confirmLeave().then(ok => {
        if (!ok) return;
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.hash = '#/';
        }
      });
    });
  },

  _updateHeaderContext(path) {
    const titleEl = document.getElementById('header-view-title');
    const backBtn = document.getElementById('header-back-btn');

    // Mapeo de rutas a iconos SVG (Normalización Visual)
    const headerIcons = {
      '/': Icons.home(),
      '/ganaderia': Icons.rebanos(),
      '/rebanos': Icons.rebanos(),
      '/rebano': Icons.rebanos(),
      '/explotacion': Icons.dashboard(),
      '/zonas': Icons.zonas(),
      '/zona': Icons.zonas(),
      '/instalaciones': Icons.edificio(),
      '/instalacion': Icons.edificio(),
      '/saneamientos': Icons.sanidad(),
      '/saneamiento': Icons.sanidad(),
      '/subexplotaciones': Icons.rebanos(),
      '/subexplotacion': Icons.rebanos(),
      '/botiquin': Icons.sanidad(),
      '/botiquin-producto': Icons.sanidad(),
      '/animal-bitacora': Icons.documento(),
      '/animales': Icons.animales(),
      '/animal': Icons.animales(),
      '/gastos': Icons.gastos(),
      '/comercializacion': Icons.comercial(),
      '/albaran-leche': Icons.leche(),
      '/gasto': Icons.gastos(),
      '/informes': Icons.informes(),
      '/alertas': Icons.campana(),
      '/ajustes': Icons.ajustes(),
      '/compradores': Icons.compradores(),
      '/comprador': Icons.compradores(),
      '/proveedores': Icons.proveedores(),
      '/proveedor': Icons.proveedores(),
      '/contrato': Icons.contratos(),
      '/transportistas': Icons.transportistas(),
      '/trazabilidad': Icons.trazabilidad(),
      '/cuaderno': Icons.cuaderno(),
      '/documentos': Icons.documento(),
      '/manuales': Icons.libro(),
      '/albaranes-ventas': Icons.comercial(),
    };

    if (titleEl) {
      // Normalizamos: se muestra el icono SVG y el nombre exacto contenido en un marco
      const icon = headerIcons[path] || Icons.home();
      const titleText = this._headerTitles[path] || 'Livestock';

      titleEl.innerHTML = `
        <div class="header-banner-frame">
          <div class="header-banner-icon">${icon}</div>
          <div class="header-banner-text">${titleText}</div>
        </div>
      `;
    }

    if (backBtn) {
      if (this._routesConVolver.has(path)) {
        backBtn.classList.add('visible');
      } else {
        backBtn.classList.remove('visible');
      }
    }

    // Resetear color de cabecera al navegar (por defecto oro)
    this.updateHeaderColor(null);
  },

  /* ── Huecos de la barra superior (piel ERP escritorio) ────────────────── */

  // Puebla iconos de los controles nuevos y dispara el primer conteo de alertas.
  _setupHeaderExtras() {
    try {
      const si = document.getElementById('header-search-icon');
      if (si && window.Icons && typeof Icons.buscar === 'function') si.innerHTML = Icons.buscar();
      const bi = document.getElementById('header-alerts-icon');
      if (bi && window.Icons && typeof Icons.campana === 'function') bi.innerHTML = Icons.campana();
    } catch (e) { /* iconos opcionales */ }
    this._renderAlertasBell();
  },

  // Migas de pan derivadas de la ruta actual (hub › tab › sub/cat).
  _renderBreadcrumbs(path, params) {
    const el = document.getElementById('header-breadcrumbs');
    if (!el) return;
    const hub = (path || '/').split('?')[0];
    const hubLabel = this._headerTitles[hub] || 'Livestock';
    const crumbs = [{ label: hubLabel, route: hub }];
    if (params && typeof params.get === 'function') {
      const tab = params.get('tab');
      if (tab) {
        const tl = this._crumbTabLabel(hub, tab);
        if (tl) crumbs.push({ label: tl });
        const sub = params.get('sub') || params.get('cat');
        if (sub) {
          const sl = this._crumbSubLabel(hub, tab, sub);
          if (sl) crumbs.push({ label: sl });
        }
      }
    }
    el.innerHTML = crumbs.map((c, i) => {
      const sep = i > 0 ? '<span class="bc-sep">›</span>' : '';
      const isActive = i === 0 && c.route === (path || '/').split('?')[0];
      if (c.route && i === 0) {
        const isActive = i === 0 && c.route === (path || '/').split('?')[0];
        return sep + `<a class="bc-crumb bc-link${isActive ? ' bc-active' : ''}" href="javascript:void(0)" onclick="location.hash='${c.route}'${isActive ? ' aria-current="page"' : ''}">${c.label}</a>`;
      }
      return sep + `<span class="bc-crumb${isActive ? ' bc-active' : ''}">${c.label}</span>`;
    }).join('');
  },

  _crumbTabLabel(hub, tab) {
    const M = {
      '/explotacion': { explotacion: 'Explotación', lacteo: 'Láctea', silos: 'Silos', fitosanitarios: 'Fitosanitarios', gastos: 'Gastos', proveedores: 'Proveedores', tramites: 'Trámites' },
      '/ganaderia': { animales: 'Animales', rebanos: 'Rebaños', patrimonio: 'Patrimonio', zonas: 'Zonas', sanidad: 'Sanidad' },
      '/comercializacion': { leche: 'Leche', carne: 'Carne', compradores: 'Compradores', contratos: 'Contratos', transportistas: 'Transportistas' }
    };
    return (M[hub] && M[hub][tab]) || null;
  },

  _crumbSubLabel(hub, tab, sub) {
    const M = {
      lacteo: { dashboard: 'Dashboard', tanques: 'Tanques', control: 'Control', balance: 'Balance', graficos: 'Gráficos' },
      tramites: { guias: 'Guías', censo: 'Censo', crotales: 'Crotales', traslado: 'Traslado', infolac: 'Infolac', archivo: 'Archivo' },
      gastos: { todos: 'Todos', Alimentacion: 'Alimentación', Sanidad: 'Sanidad', Fitosanitarios: 'Fitosanitarios', Electricidad: 'Electricidad', Personal: 'Personal', Amortizacion: 'Amortización' }
    };
    return (M[tab] && M[tab][sub]) || null;
  },

  // Buscador global: localiza un animal por crotal / CNI / nombre y abre su ficha.
  async _buscarGlobal() {
    const input = document.getElementById('header-search-input');
    if (!input) return;
    const term = (input.value || '').trim();
    if (!term) return;
    input.blur();
    try {
      if (!window.db) return;
      const animales = await window.db.getAll('animales').catch(() => []);
      const t = term.toLowerCase();
      const matches = (animales || []).filter(a =>
        (a.numero_identificacion && String(a.numero_identificacion).toLowerCase().includes(t)) ||
        (a.crotal && String(a.crotal).toLowerCase().includes(t)) ||
        (a.cni && String(a.cni).toLowerCase().includes(t)) ||
        (a.nombre && String(a.nombre).toLowerCase().includes(t))
      );
      if (matches.length === 1) {
        window.location.hash = '#/animal?id=' + matches[0].id;
        input.value = '';
      } else if (matches.length > 1) {
        App.toast('Varios animales coinciden con «' + term + '». Afina el crotal.');
        window.location.hash = '#/ganaderia?tab=animales';
      } else {
        App.toast('Sin coincidencias para «' + term + '».');
      }
    } catch (e) {
      console.warn('[buscarGlobal]', e);
    }
  },

  // Conteo ligero de alertas para la campana (contratos por vencer + silos bajos).
  async _contarAlertas() {
    let n = 0;
    try {
      if (window.db) {
        const [contratos, silos] = await Promise.all([
          window.db.getAll('contratos_compra').catch(() => []),
          window.db.getAll('config_silos').catch(() => [])
        ]);
        const now = Date.now();
        const lim = now + 30 * 24 * 3600 * 1000;
        (contratos || []).forEach(c => {
          const v = c.vigenciaHasta || c.fechaFin || c.vigencia;
          if (!v) return;
          const t = new Date(v).getTime();
          if (!isNaN(t) && t >= now && t <= lim) n++;
        });
        (silos || []).forEach(s => {
          const cap = Number(s.capacidad) || 0;
          const niv = Number(s.nivel) || Number(s.stock) || 0;
          if (cap > 0 && (niv / cap) * 100 < 15) n++;
        });
      }
    } catch (e) { console.warn('[contarAlertas]', e); }
    return n;
  },

  async _renderAlertasBell() {
    if (this._alertasBellRunning) return;
    this._alertasBellRunning = true;
    try {
      const badge = document.getElementById('header-alerts-count');
      if (!badge) return;
      const n = await this._contarAlertas();
      if (n > 0) {
        badge.style.display = '';
        badge.textContent = n > 99 ? '99+' : String(n);
      } else {
        badge.style.display = 'none';
      }
    } finally {
      this._alertasBellRunning = false;
    }
  },

  /** Actualiza el color neon de la cabecera según el mapa único MODULE_COLORS.
   *  Con mode explícito (carne/leche/...) usa ese módulo; sin mode, el color de la ruta actual.
   *  Si mode ya es un color literal (empieza por '#' o 'var(') se usa tal cual, sin pasar por
   *  MODULE_COLORS — así los hubs GeGan/ExPro/CoMer pueden fijar su color de pantalla único por
   *  módulo principal (ver App.CARRUSEL_COLOR_MODULO) sin duplicar/alterar el mapa compartido. */
  updateHeaderColor(mode) {
    const cfg = this._config;
    let color;
    const isFixed = cfg?.glowMarcoFijo ?? false;
    const fixedColor = cfg?.glowMarcoFijoColor ?? '#FFFFFF';

    if (isFixed) {
      color = fixedColor;
    } else if (mode && (mode.startsWith('#') || mode.startsWith('var('))) {
      color = mode;
    } else {
      const path = mode ? '/' + mode : (window.location.hash.slice(1).split('?')[0] || '/');
      color = window.getModuleColor(path);
    }
    document.documentElement.style.setProperty('--header-neon-color', color);
  },

  /**
   * Configura el sidebar ERP y recupera su estado persistido.
   * No altera la navegación móvil: el CSS muestra bottom-nav bajo 1024px.
   */
  _setupSidebar() {
    const sidebar = document.getElementById('erpSidebar');
    const toggle = document.getElementById('sidebarToggle');
    if (!sidebar || !toggle) return;

    // Construir el acordeón de navegación antes de aplicar el estado colapsado
    this._renderSidebarNav();
    // Pie de estado (versión, plan, fecha, finca activa) y refresco al cambiar de finca
    this._renderSidebarStatus();
    if (!this._statusBound) {
      window.addEventListener('fincaChanged', () => this._renderSidebarStatus());
      window.addEventListener('premiumChanged', () => this._renderSidebarStatus());
      this._statusBound = true;
    }

    let collapsed = false;
    try {
      collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    } catch (_) {}
    this._setSidebarCollapsed(collapsed, false);
    this._adaptSidebarToBreakpoint(); // Ajustar visibilidad según breakpoint

    // Escuchar cambios de tamaño de pantalla para actualizar el bottom‑nav
    if (!this._breakpointListenerAttached) {
      window.addEventListener('resize', () => this._adaptSidebarToBreakpoint());
      this._breakpointListenerAttached = true;
    }

    // Atajos de teclado de escritorio sin interferir con campos editables.
    document.addEventListener('keydown', (event) => {
      const tag = event.target?.tagName;
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable;
      if (event.altKey && event.key.toLowerCase() === 's' && !isEditing) {
        event.preventDefault();
        this._toggleSidebar();
      }
    });
  },

  /** Alterna entre el sidebar ERP expandido y el compacto. */
  _toggleSidebar() {
    const sidebar = document.getElementById('erpSidebar');
    if (!sidebar) return;
    this._setSidebarCollapsed(sidebar.dataset.collapsed !== 'true');
  },

  /** Aplica visualmente el estado del sidebar y opcionalmente lo persiste. */
  _setSidebarCollapsed(collapsed, persist = true) {
    const sidebar = document.getElementById('erpSidebar');
    const toggle = document.getElementById('sidebarToggle');
    if (!sidebar || !toggle) return;

    const value = String(Boolean(collapsed));
    sidebar.dataset.collapsed = value;
    document.body.dataset.sidebarCollapsed = value;
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Desplegar menú' : 'Plegar menú');
    toggle.title = collapsed ? 'Desplegar menú (Alt+S)' : 'Plegar menú (Alt+S)';

    sidebar.querySelectorAll('.sidebar-link').forEach((link) => {
      const label = link.querySelector('.sidebar-link-label')?.textContent?.trim() || 'Abrir módulo';
      link.title = label;
    });

    if (persist) {
      try {
        localStorage.setItem('sidebar-collapsed', value);
      } catch (_) {}
    }
  },

  /** Construye el acordeón del sidebar a partir de App.NAV_GROUPS.
   *  Soporta subgrupos anidados: un item con `items` se renderiza como un
   *  subgrupo plegable (p.ej. los filtros de Agenda cuelgan bajo "Agenda").
   *  Sus hijos siempre son enlaces hoja con `route`. */
  _renderSidebarNav() {
    const nav = document.getElementById('erpSidebarNav');
    if (!nav) return;
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // Renderiza un item: hoja (enlace) o subgrupo plegable (item con `items`).
    const renderItem = (item, groupKey) => {
      if (item.items && item.items.length) {
        const subKey = groupKey + '::' + item.key;
        let children = '';
        item.items.forEach((child) => { children += renderItem(child, subKey); });
        return '<div class="sidebar-group sidebar-subgroup" data-group="' + subKey + '">' +
          '<button type="button" class="sidebar-group-toggle" data-group-toggle="' + subKey + '" aria-expanded="true" title="' + esc(item.label) + '">' +
            '<span class="sidebar-group-icon" style="color:' + item.color + ';">' + item.icon() + '</span>' +
            '<span class="sidebar-group-label">' + esc(item.label) + '</span>' +
            '<span class="sidebar-group-chevron">' + Icons.chevronAbajo() + '</span>' +
          '</button>' +
          '<div class="sidebar-group-items" data-group-items="' + subKey + '">' + children + '</div>' +
        '</div>';
      }
      return '<a class="sidebar-link" href="#' + item.route + '" data-route="' + item.route + '" title="' + esc(item.label) + '">' +
        '<span class="sidebar-link-icon" style="color:' + item.color + ';">' + item.icon() + '</span>' +
        '<span class="sidebar-link-label">' + esc(item.label) + '</span>' +
      '</a>';
    };

    // Enlace fijo "Inicio" (Dashboard) en la parte superior del menú lateral. En
    // escritorio el bottom-nav está oculto, así que sin esto el Inicio solo sería
    // alcanzable vía el logo del header. Reutiliza .sidebar-link y su lógica de
    // estado activo (_updateSidebarNavigation marca data-route="/" cuando path='/').
    const homeLink = '<a class="sidebar-link" href="#/" data-route="/" title="Inicio" ' +
      'style="margin-bottom:8px; border-bottom:1px solid color-mix(in srgb, var(--sidebar-text) 10%, transparent); padding-bottom:8px;">' +
        '<span class="sidebar-link-icon" style="color:var(--header-neon-color, var(--c-success));">' + Icons.home() + '</span>' +
        '<span class="sidebar-link-label">Inicio</span>' +
      '</a>';

    let html = homeLink;
    this.NAV_GROUPS.forEach((group) => {
      let itemsHtml = '';
      group.items.forEach((item) => { itemsHtml += renderItem(item, group.key); });
      html +=
        '<div class="sidebar-group" data-group="' + group.key + '">' +
          '<button type="button" class="sidebar-group-toggle" data-group-toggle="' + group.key + '" aria-expanded="true" title="' + esc(group.label) + '">' +
            '<span class="sidebar-group-icon" style="color:' + (group.color || '') + ';">' + group.icon() + '</span>' +
            '<span class="sidebar-group-label">' + esc(group.label) + '</span>' +
            '<span class="sidebar-group-chevron">' + Icons.chevronAbajo() + '</span>' +
          '</button>' +
          '<div class="sidebar-group-items" data-group-items="' + group.key + '">' + itemsHtml + '</div>' +
        '</div>';
    });
    nav.innerHTML = html;

    // Restaurar estado de grupos/subgrupos colapsados (persistido en localStorage).
    // Por defecto colapsado en primera carga; se corrige también aria-expanded.
    nav.querySelectorAll('.sidebar-group[data-group]').forEach((wrap) => {
      const collapsed = this._getGroupCollapsed(wrap.dataset.group);
      wrap.classList.toggle('collapsed', collapsed);
      const btn = wrap.querySelector('[data-group-toggle]');
      if (btn) btn.setAttribute('aria-expanded', String(!collapsed));
    });

    // Delegación de clic en los toggles de grupo/subgrupo (evita listeners duplicados)
    if (!nav.dataset.bound) {
      nav.addEventListener('click', (e) => {
        const sidebar = document.getElementById('erpSidebar');
        const collapsedSidebar = sidebar && sidebar.dataset.collapsed === 'true';
        const btn = e.target.closest('[data-group-toggle]');
        if (collapsedSidebar) {
          // En modo compacto los submenús están ocultos (CSS display:none). Al
          // pulsar cualquier entrada desplegamos la barra completa para poder
          // usar el menú.
          this._setSidebarCollapsed(false);
          if (btn && nav.contains(btn)) {
            // Y abrimos el grupo concreto que se ha pinchado (con sus ancestros
            // en caso de subgrupos anidados).
            let g = btn.closest('.sidebar-group');
            while (g) { this._expandSidebarGroup(g); g = g.parentElement ? g.parentElement.closest('.sidebar-group') : null; }
            return;
          }
          // Si fue un enlace hoja (href), la navegación ocurre y la barra queda
          // desplegada; nada más que hacer aquí.
          return;
        }
        if (btn && nav.contains(btn)) this._toggleSidebarGroup(btn);
      });
      nav.dataset.bound = '1';
    }

    // Marcar ruta activa inicial
    const hash = (window.location.hash || '').slice(1) || '/';
    const [p, q] = hash.split('?');
    this._updateSidebarNavigation(p, q);
  },

  _getGroupCollapsed(key) {
    // Por defecto COLAPSADO (true) en la primera carga (sin estado persistido en
    // localStorage): el usuario despliega los grupos de módulos de forma explícita.
    // Al volver a Inicio el acordeón se contrae por completo (ver _updateSidebarNavigation).
    try { return localStorage.getItem('sidebar-group-' + key) !== '0'; } catch (_) { return true; }
  },
  _setGroupCollapsed(key, collapsed) {
    try { localStorage.setItem('sidebar-group-' + key, collapsed ? '1' : '0'); } catch (_) {}
  },
  _toggleSidebarGroup(btn) {
    const group = btn.closest('.sidebar-group');
    if (!group) return;
    const collapsed = !group.classList.contains('collapsed');
    group.classList.toggle('collapsed', collapsed);
    this._setGroupCollapsed(group.dataset.group, collapsed);
    btn.setAttribute('aria-expanded', String(!collapsed));
  },
  /** Pinta el pie de estado del sidebar: versión de la app, plan Free/Premium,
   *  fecha actual y nombre de la finca activa. Se refresca al cambiar de finca
   *  (evento 'fincaChanged') y al iniciar. */
  async _renderSidebarStatus() {
    const el = document.getElementById('sidebarStatus');
    if (!el) return;
    const version = (window.APP_INFO && window.APP_INFO.version) || '';
    const isFree = !window.PremiumManager || typeof window.PremiumManager.isFree !== 'function'
      ? true
      : window.PremiumManager.isFree();
    const plan = isFree ? 'Free' : 'Premium';
    const planClass = isFree ? 'ss-plan-free' : 'ss-plan-premium';
    let fincaNombre = 'Sin finca';
    try {
      const finca = (window.Fincas && typeof Fincas.getActive === 'function')
        ? await Fincas.getActive().catch(() => null) : null;
      if (finca && finca.nombre) fincaNombre = finca.nombre;
    } catch (_) { /* sin finca activa */ }
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    el.innerHTML = `
      <div class="ss-row"><span class="ss-label">Versión</span><span class="ss-value">${version}</span></div>
      <div class="ss-row"><span class="ss-label">Plan</span><span class="ss-value ${planClass}">${plan}</span></div>
      <div class="ss-row"><span class="ss-label">Fecha</span><span class="ss-value">${fecha}</span></div>
      <div class="ss-row"><span class="ss-label">Finca</span><span class="ss-value">${fincaNombre}</span></div>`;
  },

  _expandSidebarGroup(group) {
    if (!group.classList.contains('collapsed')) return;
    group.classList.remove('collapsed');
    this._setGroupCollapsed(group.dataset.group, false);
    const btn = group.querySelector('[data-group-toggle]');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  },
  /** Contrae todos los grupos/subgrupos del sidebar (sin persistir). Usado al entrar
   *  en Inicio, donde ningún módulo está activo y no hay grupo que desplegar. */
  _collapseAllSidebarGroups() {
    const nav = document.getElementById('erpSidebarNav');
    if (!nav) return;
    nav.querySelectorAll('.sidebar-group[data-group]').forEach((g) => {
      g.classList.add('collapsed');
      const btn = g.querySelector('[data-group-toggle]');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  },

  /** Sincroniza el enlace activo del sidebar con la ruta actual y despliega
   *  automáticamente el grupo padre del submódulo activo. */
  _updateSidebarNavigation(path, query) {
    const full = query ? path + '?' + query : path;
    // Al entrar en Inicio (Dashboard) el acordeón se contrae por completo: ningún
    // módulo está activo, así que no hay grupo que dejar desplegado.
    if (!path || path === '/') {
      this._collapseAllSidebarGroups();
    }
    document.querySelectorAll('#erpSidebarNav .sidebar-link[data-route]').forEach((link) => {
      const route = link.dataset.route;
      const active = route === full || route === path;
      link.classList.toggle('active', active);
      if (active) {
        link.setAttribute('aria-current', 'page');
        // Desplegar el grupo y todos sus ancestros (subgrupos anidados)
        let g = link.closest('.sidebar-group');
        while (g) { this._expandSidebarGroup(g); g = g.parentElement ? g.parentElement.closest('.sidebar-group') : null; }
      } else {
        link.removeAttribute('aria-current');
      }
    });
  },

  /** Colapsa/expande la card de resumen (chevron esquina superior derecha). Reutilizable en todas las vistas. */
  toggleResumen(btn) {
    const card = btn && btn.closest('.card-resumen');
    if (card) card.classList.toggle('collapsed');
  },

  /** Color de pantalla fijo por módulo principal (verde lima GeGan / azul ExPro / amarillo CoMer,
   *  ver .agent/AGENTS.md §1). Unifica la cromática del carrusel y del marco de cabecera para que
   *  no varíe entre submódulos; los iconos SVG y las tarjetas de registro conservan su color propio. */
  // Cromo de carrusel unificado en gris acero ERP: un solo estilo para todos
  // los módulos (antes verde/azul/amarillo por módulo). El color queda reservado
  // para estados semánticos (éxito/peligro/premio) en los datos, no en el cromo.
  CARRUSEL_COLOR_MODULO: {
    GanaderiaView: 'var(--text-s)',
    ExplotacionView: 'var(--text-s)',
    ComercializacionView: 'var(--text-s)',
  },

  /**
   * Estructura del acordeón del sidebar (escritorio ≥1024px). Cada grupo es un
   * módulo superior (GeGan, ExPro, CoMer, Informes, Herramientas) que se
   * despliega para mostrar sus submódulos. Cada submódulo conserva su color y
   * SVG propios ("Respetamos los colores y SVG de cada uno de ellos"), salvo
   * el ítem activo que lleva el acento azul institucional del sidebar.
   * Las rutas usan el formato `?tab=` que el router normaliza a hub interno.
   */
  NAV_GROUPS: [
    {
      // Colores originales del PWA (maestro module-colors.js), restaurados en los
      // iconos del menú de módulos. El acento de la entrada activa sigue siendo
      // --p-gold (fijo); solo se colorea el SVG del icono vía currentColor.
      key: 'gegan', label: 'GeGan', icon: () => Icons.rebanos(), color: '#FF4444',
      items: [
        { key: 'animales', label: 'Animales', icon: () => Icons.animales(), color: '#F97316', route: '/ganaderia?tab=animales' },
        { key: 'rebanos', label: 'Rebaños', icon: () => Icons.rebanos(), color: '#3B82F6', route: '/ganaderia?tab=rebanos' },
        { key: 'patrimonio', label: 'Patrimonio', icon: () => Icons.edificio(), color: '#FF4444', route: '/ganaderia?tab=patrimonio' },
        { key: 'zonas', label: 'Zonas', icon: () => Icons.zonas(), color: '#CCFF00', route: '/ganaderia?tab=zonas' },
        { key: 'sanidad', label: 'Sanidad', icon: () => Icons.sanidad(), color: '#FF4444', route: '/ganaderia?tab=sanidad' },
      ],
    },
    {
      key: 'expro', label: 'ExPro', icon: () => Icons.finca(), color: '#CCFF00',
      items: [
        { key: 'explotacion', label: 'Explotación', icon: () => Icons.finca(), color: '#CCFF00', route: '/explotacion?tab=explotacion' },
        { key: 'lacteo', label: 'Láctea', icon: () => Icons.leche(), color: '#3B82F6', items: [
          { key: 'dashboard', label: 'Dashboard', icon: () => Icons.dashboard(), color: '#3B82F6', route: '/explotacion?tab=lacteo&sub=dashboard' },
          { key: 'tanques', label: 'Tanques', icon: () => Icons.silos(), color: '#3B82F6', route: '/explotacion?tab=lacteo&sub=tanques' },
          { key: 'control', label: 'Control', icon: () => Icons.analitica(), color: '#3B82F6', route: '/explotacion?tab=lacteo&sub=control' },
          { key: 'balance', label: 'Balance', icon: () => Icons.documento(), color: '#3B82F6', route: '/explotacion?tab=lacteo&sub=balance' },
          { key: 'graficos', label: 'Gráficos', icon: () => Icons.grafico(), color: '#3B82F6', route: '/explotacion?tab=lacteo&sub=graficos' },
        ] },
        { key: 'silos', label: 'Silos', icon: () => Icons.silos(), color: '#CCFF00', route: '/explotacion?tab=silos' },
        { key: 'fitosanitarios', label: 'Fitosanitarios', icon: () => Icons.sanidad(), color: '#FF4444', route: '/explotacion?tab=fitosanitarios' },
        { key: 'gastos', label: 'Finanzas', icon: () => Icons.dinero(), color: '#FF4444', items: [
          { key: 'todos', label: 'Resumen', icon: () => Icons.documento(), color: '#FF4444', route: '/explotacion?tab=gastos&cat=todos' },
          { key: 'Alimentacion', label: 'Alimentación', icon: () => Icons.paquete(), color: '#F97316', route: '/explotacion?tab=gastos&cat=Alimentacion' },
          { key: 'Sanidad', label: 'Sanidad', icon: () => Icons.sanidad(), color: '#FF4444', route: '/explotacion?tab=gastos&cat=Sanidad' },
          { key: 'Fitosanitarios', label: 'Fitosanitarios', icon: () => Icons.sanidad(), color: '#22C55E', route: '/explotacion?tab=gastos&cat=Fitosanitarios' },
          { key: 'Electricidad', label: 'Electricidad', icon: () => Icons.info(), color: '#3B82F6', route: '/explotacion?tab=gastos&cat=Electricidad' },
          { key: 'Personal', label: 'Personal', icon: () => Icons.compradores(), color: '#FB923C', route: '/explotacion?tab=gastos&cat=Personal' },
          { key: 'Amortizacion', label: 'Amortización', icon: () => Icons.transportistas(), color: '#A855F7', route: '/explotacion?tab=gastos&cat=Amortizacion' },
        ] },
        { key: 'proveedores', label: 'Proveedores', icon: () => Icons.proveedores(), color: '#A855F7', route: '/explotacion?tab=proveedores' },
        { key: 'tramites', label: 'Trámites', icon: () => Icons.documento(), color: '#CCFF00', items: [
          { key: 'tram-guias', label: 'Guías DIMOE', icon: () => Icons.documento(), color: '#3B82F6', route: '/explotacion?tab=tramites&sub=guias' },
          { key: 'tram-censo', label: 'Censo Anual', icon: () => Icons.animales(), color: '#F59E0B', route: '/explotacion?tab=tramites&sub=censo' },
          { key: 'tram-crotales', label: 'Crotales', icon: () => Icons.paquete(), color: '#3FB950', route: '/explotacion?tab=tramites&sub=crotales' },
          { key: 'tram-traslado', label: 'Traslados', icon: () => Icons.trazabilidad(), color: '#A855F7', route: '/explotacion?tab=tramites&sub=traslado' },
          { key: 'tram-infolac', label: 'Infolac', icon: () => Icons.leche(), color: '#3B82F6', route: '/explotacion?tab=tramites&sub=infolac' },
          { key: 'tram-archivo', label: 'Archivo', icon: () => Icons.cuaderno(), color: '#FB923C', route: '/explotacion?tab=tramites&sub=archivo' },
        ] },
      ],
    },
    {
      key: 'comer', label: 'CoMer', icon: () => Icons.comercial(), color: '#3B82F6',
      items: [
        { key: 'leche', label: 'Leche', icon: () => Icons.leche(), color: '#3B82F6', route: '/comercializacion?tab=leche' },
        { key: 'carne', label: 'Carne', icon: () => Icons.carne(), color: '#CCFF00', route: '/comercializacion?tab=carne' },
        { key: 'compradores', label: 'Compradores', icon: () => Icons.compradores(), color: '#3B82F6', route: '/comercializacion?tab=compradores' },
        { key: 'contratos', label: 'Contratos', icon: () => Icons.documento(), color: '#3B82F6', route: '/comercializacion?tab=contratos' },
        { key: 'transportistas', label: 'Transportistas', icon: () => Icons.transportistas(), color: '#EC4899', route: '/comercializacion?tab=transportistas' },
        { key: 'libro-ventas', label: 'Libro de Ventas', icon: () => Icons.libroVentas(), color: '#3B82F6', route: '/albaranes-ventas' },
      ],
    },
    {
      key: 'informes', label: 'Informes y Doc', icon: () => Icons.informes(), color: '#FFD600',
      items: [
        { key: 'informes', label: 'Informes', icon: () => Icons.informes(), color: '#FFD600', items: [
          { key: 'inf-general', label: 'General', icon: () => Icons.grafico(), color: '#FFD600', items: [
            { key: 'inf-general-general', label: 'General', icon: () => Icons.grafico(), color: '#FFD600', route: '/informes?cat=general&tab=general' },
            { key: 'inf-por-finca', label: 'Por Finca', icon: () => Icons.finca(), color: '#FFD600', route: '/informes?cat=general&tab=por-finca' },
            { key: 'inf-eficiencia', label: 'Eficiencia', icon: () => Icons.tendencia(), color: '#FFD600', route: '/informes?cat=general&tab=eficiencia' },
            { key: 'inf-rent-esp', label: 'Rent. Especie', icon: () => Icons.reproduccion(), color: '#FFD600', route: '/informes?cat=general&tab=rent-esp' },
          ] },
          { key: 'inf-gegan', label: 'GeGan', icon: () => Icons.animales(), color: '#3FB950', items: [
            { key: 'inf-censo', label: 'Censo', icon: () => Icons.rebanos(), color: '#3FB950', route: '/informes?cat=gegan&tab=censo' },
            { key: 'inf-rotacion', label: 'Rotación', icon: () => Icons.tendencia(), color: '#3FB950', route: '/informes?cat=gegan&tab=rotacion' },
            { key: 'inf-reproductivo', label: 'Repro', icon: () => Icons.reproduccion(), color: '#3FB950', route: '/informes?cat=gegan&tab=reproductivo' },
            { key: 'inf-sanidad', label: 'Sanidad', icon: () => Icons.sanidad(), color: '#3FB950', route: '/informes?cat=gegan&tab=sanidad' },
            { key: 'inf-carne', label: 'Cárnico', icon: () => Icons.carne(), color: '#3FB950', route: '/informes?cat=gegan&tab=carne' },
            { key: 'inf-coste-prod', label: 'Coste/Animal', icon: () => Icons.balanza(), color: '#3FB950', route: '/informes?cat=gegan&tab=coste-prod' },
          ] },
          { key: 'inf-expro', label: 'ExPro', icon: () => Icons.finca(), color: '#3B82F6', items: [
            { key: 'inf-produccion', label: 'Producción', icon: () => Icons.grafico(), color: '#3B82F6', route: '/informes?cat=expro&tab=produccion' },
            { key: 'inf-leche', label: 'Lácteo', icon: () => Icons.leche(), color: '#3B82F6', route: '/informes?cat=expro&tab=leche' },
            { key: 'inf-curva-prod', label: 'Curva', icon: () => Icons.tendencia(), color: '#3B82F6', route: '/informes?cat=expro&tab=curva-prod' },
            { key: 'inf-cargas', label: 'Aforos', icon: () => Icons.balanza(), color: '#3B82F6', route: '/informes?cat=expro&tab=cargas' },
            { key: 'inf-fitosanitario', label: 'Fitosanitario', icon: () => Icons.sanidad(), color: '#3B82F6', route: '/informes?cat=expro&tab=fitosanitario' },
            { key: 'inf-silos', label: 'Silos', icon: () => Icons.silos(), color: '#3B82F6', route: '/informes?cat=expro&tab=silos' },
            { key: 'inf-tramites', label: 'Trámites', icon: () => Icons.documento(), color: '#3B82F6', route: '/informes?cat=expro&tab=tramites' },
            { key: 'inf-proveedores', label: 'Proveedores', icon: () => Icons.proveedores(), color: '#3B82F6', route: '/informes?cat=expro&tab=proveedores' },
            { key: 'inf-gastos', label: 'Gastos', icon: () => Icons.dinero(), color: '#3B82F6', route: '/informes?cat=expro&tab=gastos' },
          ] },
          { key: 'inf-comer', label: 'CoMer', icon: () => Icons.compradores(), color: '#F59E0B', items: [
            { key: 'inf-ventas', label: 'Ventas', icon: () => Icons.libroVentas(), color: '#F59E0B', route: '/informes?cat=comer&tab=ventas' },
            { key: 'inf-margenes', label: 'Márgenes', icon: () => Icons.dinero(), color: '#F59E0B', route: '/informes?cat=comer&tab=margenes' },
            { key: 'inf-compradores', label: 'Compradores', icon: () => Icons.compradores(), color: '#F59E0B', route: '/informes?cat=comer&tab=compradores' },
            { key: 'inf-contratos', label: 'Contratos', icon: () => Icons.contratos(), color: '#F59E0B', route: '/informes?cat=comer&tab=contratos-vencimiento' },
            { key: 'inf-transportistas', label: 'Transportistas', icon: () => Icons.transportistas(), color: '#F59E0B', route: '/informes?cat=comer&tab=transportistas-resumen' },
            { key: 'inf-albaranes', label: 'Albaranes', icon: () => Icons.libroVentas(), color: '#F59E0B', route: '/informes?cat=comer&tab=albaranes' },
          ] },
          { key: 'inf-libros', label: 'Libros', icon: () => Icons.documento(), color: '#A855F7', items: [
            { key: 'inf-pyg', label: 'P y G', icon: () => Icons.dinero(), color: '#A855F7', route: '/informes?cat=libros&tab=pyg' },
            { key: 'inf-flujo-caja', label: 'Flujo Caja', icon: () => Icons.tendencia(), color: '#A855F7', route: '/informes?cat=libros&tab=flujo-caja' },
            { key: 'inf-breakeven', label: 'Break-Even', icon: () => Icons.balanza(), color: '#A855F7', route: '/informes?cat=libros&tab=breakeven' },
            { key: 'inf-subvenciones', label: 'PAC', icon: () => Icons.pac(), color: '#A855F7', route: '/informes?cat=libros&tab=subvenciones' },
          ] },
        ] },
        { key: 'cuaderno', label: 'Cuaderno Digital', icon: () => Icons.cuaderno(), color: '#F97316', route: '/cuaderno' },
        { key: 'alertas', label: 'Alertas', icon: () => Icons.campana(), color: '#FFD600', route: '/alertas' },
        { key: 'informe-rega', label: 'Informe REga', icon: () => Icons.informeRega(), color: '#A855F7', route: '/informes?cat=libros&tab=rega' },
        { key: 'exportacion-oficial', label: 'Exportación Oficial', icon: () => Icons.exportar(), color: '#A855F7', route: '/informes?cat=libros&tab=exportar' },
        { key: 'documentos', label: 'Documentos DIMOE', icon: () => Icons.documento(), color: '#A855F7', route: '/documentos' },
        { key: 'manuales', label: 'Manuales', icon: () => Icons.libro(), color: '#A855F7', route: '/manuales' },
      ],
    },
    {
      key: 'herramientas', label: 'Herramientas', icon: () => Icons.ajustes(), color: '#B1B1B1',
      items: [
        { key: 'ajustes', label: 'Ajustes', icon: () => Icons.ajustes(), color: '#B1B1B1', route: '/ajustes' },
        { key: 'importar-rfid', label: 'Importar RFID', icon: () => Icons.importar(), color: '#B1B1B1', route: '/importar-rfid' },
        {
          key: 'agenda', label: 'Agenda', icon: () => Icons.calendar(), color: '#F97316',
          items: [
            { key: 'agenda-todos', label: 'Todos', icon: () => Icons.buscar(), color: '#F97316', route: '/agenda?filtro=todos' },
            { key: 'agenda-gegan', label: 'Animales', icon: () => Icons.animales(), color: '#F97316', route: '/agenda?filtro=gegan' },
            { key: 'agenda-rebanos', label: 'Rebaños', icon: () => Icons.rebanos(), color: '#3B82F6', route: '/agenda?filtro=rebanos' },
            { key: 'agenda-sanidad', label: 'Sanidad', icon: () => Icons.sanidad(), color: '#FF4444', route: '/agenda?filtro=sanidad' },
            { key: 'agenda-carnico', label: 'Carne', icon: () => Icons.carne(), color: '#CCFF00', route: '/agenda?filtro=carnico' },
            { key: 'agenda-lacteos', label: 'Leche', icon: () => Icons.leche(), color: '#3B82F6', route: '/agenda?filtro=lacteos' },
          ]
        },
      ],
    },
  ],

  /**
   * Genera el HTML del carrusel circular de pestañas de submódulo: un marco
   * centrado muestra solo la sección activa (ampliada, con desvanecimiento
   * de entrada); las flechas laterales navegan a la sección anterior/
   * siguiente (circular: de la última se vuelve a la primera) y llevan junto
   * al icono de flecha una vista previa en miniatura —con su propio color de
   * módulo— de a qué sección llevan. Como el carrusel no es deslizable, tocar
   * el marco activo despliega un menú con todos los submódulos disponibles
   * del módulo principal. Los puntos de abajo dan acceso directo a cualquier
   * sección y sirven de indicador de "hay N secciones en total". El cromo
   * (bordes, resplandores, puntos) usa el color fijo del módulo principal
   * (CARRUSEL_COLOR_MODULO); los iconos SVG conservan su color individual
   * de submódulo.
   * @param {Array<{key:string, icon:string, label:string, color:string}>} tabs
   * @param {string} activeKey
   * @param {string} viewName - nombre global de la vista (p.ej. 'GanaderiaView') para el onclick.
   */
  renderCarruselPestanas(tabs, activeKey, viewName) {
    if (!tabs || tabs.length === 0) return '';
    const n = tabs.length;
    const idx = Math.max(0, tabs.findIndex(t => t.key === activeKey));
    const active = tabs[idx];
    const single = n <= 1;
    const prev = tabs[(idx - 1 + n) % n];
    const next = tabs[(idx + 1) % n];
    const menuId = `carrusel-menu-${viewName}`;
    const colorModulo = App.CARRUSEL_COLOR_MODULO[viewName] || active.color;
    // Desktop: si las opciones del carrusel ya viven en el acordeón del sidebar
    // (GeGan/ExPro/CoMer como navegación; Agenda como filtros TODOS/ANIMALES/…),
    // se marca --sidebar para ocultarlo en escritorio (erp-overrides.css). Cualquier
    // otro uso del carrusel (no representado en el menú) se deja visible.
    const ocultarCarruselEscritorio = ['GanaderiaView', 'ExplotacionView', 'ComercializacionView', 'AgendaView'].includes(viewName);
    // Llamada al helper que await render() + emite view:tabChanged para re-anclar guía
    const navegarConGuia = (key) => `App._cambiarSubmoduloConGuia('${viewName}', '${key}')`;

    const flechaIzq = single ? '' : `
        <button type="button" class="carrusel-flecha carrusel-flecha-izq pestana-flecha-activa" onclick="${navegarConGuia(prev.key)}" aria-label="Anterior: ${prev.label}" title="${prev.label}">
          <span class="carrusel-flecha-preview" style="color:${prev.color};">${prev.icon}</span>
          <span class="carrusel-flecha-arrow">${Icons.atras()}</span>
        </button>`;
    const flechaDer = single ? '' : `
        <button type="button" class="carrusel-flecha carrusel-flecha-der pestana-flecha-activa" onclick="${navegarConGuia(next.key)}" aria-label="Siguiente: ${next.label}" title="${next.label}">
          <span class="carrusel-flecha-arrow">${Icons.siguiente()}</span>
          <span class="carrusel-flecha-preview" style="color:${next.color};">${next.icon}</span>
        </button>`;
    const dots = single ? '' : `
      <div class="carrusel-dots" role="tablist" aria-label="Todas las secciones">
        ${tabs.map(t => `<span class="carrusel-dot ${t.key === activeKey ? 'active' : ''}" data-tab="${t.key}" onclick="${navegarConGuia(t.key)}" title="${t.label}"></span>`).join('')}
      </div>`;
    const menu = single ? '' : `
      <div class="carrusel-menu" id="${menuId}" role="listbox" aria-label="Todos los submódulos">
        ${tabs.map(t => `<button type="button" class="carrusel-menu-item ${t.key === activeKey ? 'active' : ''}" data-tab="${t.key}" role="option" aria-selected="${t.key === activeKey}" onclick="${navegarConGuia(t.key)}"><span class="carrusel-menu-item-icon" style="color:${t.color};">${t.icon}</span><span>${t.label}</span></button>`).join('')}
      </div>`;

    return `
      <div class="carrusel-modulo${ocultarCarruselEscritorio ? ' carrusel-modulo--sidebar' : ''}" style="--mode-color: ${colorModulo};">
        ${dots}
        <div class="carrusel-pestanas-wrapper">
          <div class="carrusel-pestanas">
            ${flechaIzq}
            <button type="button" class="carrusel-marco" id="${menuId}-trigger" data-tab="${activeKey}" onclick="App.toggleCarruselMenu('${menuId}')" aria-haspopup="listbox" aria-expanded="false" ${single ? 'disabled' : ''}>
              <span class="carrusel-marco-icon" style="color:${active.color};">${active.icon}</span>
              <span class="carrusel-marco-label">${active.label}</span>
              ${single ? '' : `<span class="carrusel-marco-chevron">${Icons.chevronAbajo()}</span>`}
            </button>
            ${flechaDer}
          </div>
          ${menu}
        </div>
      </div>`;
  },

  /** Abre/cierra el menú desplegable de submódulos del carrusel (id de .renderCarruselPestanas). */
  toggleCarruselMenu(menuId) {
    const menu = document.getElementById(menuId);
    if (!menu) return;
    const yaAbierto = menu.classList.contains('open');
    App.cerrarCarruselMenu();
    if (yaAbierto) return;
    menu.classList.add('open');
    const trigger = document.getElementById(menuId + '-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    setTimeout(() => document.addEventListener('click', App._cerrarCarruselMenuFuera, true), 0);
  },

  /** Cierra cualquier menú de carrusel abierto (llamado antes de navegar y desde el clic exterior). */
  cerrarCarruselMenu() {
    document.querySelectorAll('.carrusel-menu.open').forEach(m => {
      m.classList.remove('open');
      const trigger = document.getElementById(m.id + '-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
    document.removeEventListener('click', App._cerrarCarruselMenuFuera, true);
  },

  _cerrarCarruselMenuFuera(e) {
    const menu = document.querySelector('.carrusel-menu.open');
    if (!menu) return;
    if (menu.contains(e.target) || e.target.closest(`#${menu.id}-trigger`)) return;
    App.cerrarCarruselMenu();
  },

  /**
   * Genera el HTML de una tarjeta de registro estandarizada.
   * @param {Object} opts - Opciones de la tarjeta.
   */
  /**
   * Genera el HTML de una tarjeta de registro estandarizada según PLANTILLA-CARD-REGISTRO.md.
   * Soporta de manera fluida y flexible las llamadas de todas las vistas del sistema.
   * @param {Object} opts - Opciones de la tarjeta.
   */
  _cardRegistro(opts) {
    const color = opts.color || 'var(--c-primary)';
    const onClick = opts.onClick ? `onclick="${opts.onClick}"` : '';
    const href = opts.href ? `href="${opts.href}"` : '';
    const tag = opts.href ? 'a' : 'div';
    const className = `card-registro ${opts.className || opts.colorClass || ''}`;
    const customStyle = opts.style || '';

    // BLOQUE IZQUIERDO: Identificación y Datos
    let leftColumnContent = '';

    // Encabezado (Icono + Título)
    let headerContent = '';
    if (opts.icon) {
      headerContent += `<span class="text-xl" style="color:${color}; display:inline-flex; align-items:center;">${opts.icon}</span>`;
    }
    
    let titleHtml = opts.title || '';
    if (opts.titleClass && !titleHtml.includes('<span') && !titleHtml.includes('<div')) {
      titleHtml = `<div class="${opts.titleClass}" style="font-weight: 950; text-transform: uppercase; font-size: 0.9rem; letter-spacing: -0.02em;">${titleHtml}</div>`;
    } else if (!titleHtml.includes('<span') && !titleHtml.includes('<div')) {
      titleHtml = `<div class="registro-titulo" style="color:var(--p-gold); font-weight: 950; text-transform: uppercase; font-size: 0.9rem; tracking-tight: -0.02em;">${titleHtml}</div>`;
    }

    headerContent += titleHtml;

    leftColumnContent += `
      <div class="flex items-center gap-10 min-w-0">
        ${headerContent}
      </div>
    `;

    // Subtitle / Metadata / Content (debajo del encabezado)
    if (opts.subtitle) {
      leftColumnContent += `<div class="registro-sub mt-2">${opts.subtitle}</div>`;
    }

    if (opts.metadata) {
      leftColumnContent += `
        <div class="flex flex-wrap gap-x-12 gap-y-2 text-[0.62rem] text-gray font-800 uppercase mt-4">
          ${opts.metadata}
        </div>
      `;
    }

    if (opts.content) {
      leftColumnContent += opts.content;
    }

    if (opts.footerLeft) {
      leftColumnContent += `<div class="mt-4 flex-1 min-w-0">${opts.footerLeft}</div>`;
    }

    // BLOQUE DERECHO: Estado y Acción
    let topPartContent = '';
    if (opts.rightSide) {
      topPartContent = opts.rightSide;
    } else if (opts.badge) {
      topPartContent = `
        <div style="background:${color}15; color:${color}; border:1px solid ${color}40; filter: drop-shadow(0 0 4px ${color}); padding: 2px 8px; border-radius: 6px; font-size: 0.6rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">
          ${opts.badge}
        </div>
      `;
    }

    let bottomPartContent = '';
    if (opts.footerRight) {
      bottomPartContent = opts.footerRight;
    } else {
      bottomPartContent = `
        <span style="color:var(--c-warning); font-weight:800; font-size:0.7rem; text-transform:uppercase; white-space:nowrap;">
          FICHA ${Icons.flechaDerecha()}
        </span>
      `;
    }

    return `
      <${tag} ${href} ${onClick} class="${className}"${opts.tipo ? ` data-tipo="${opts.tipo}"` : ''} style="display:flex; gap:10px; align-items:stretch; cursor:pointer; --registro-color: ${color}; border-top:0; border-right:0; border-bottom:0; ${customStyle}">
        <!-- BLOQUE IZQUIERDO -->
        <div class="flex-1 min-w-0 flex flex-col justify-center">
          ${leftColumnContent}
        </div>
        <!-- BLOQUE DERECHO -->
        <div class="flex flex-col items-end justify-between flex-shrink-0">
          <div class="top-part">
            ${topPartContent}
          </div>
          <div class="bottom-part" style="margin-top:auto;">
            ${bottomPartContent}
          </div>
        </div>
      </${tag}>
    `;
  },

  /**
   * Mapea un animal y su rebaño a propiedades de card-registro.
   * El color del borde izquierdo corresponde al color de la especie.
   * El badge superior derecho muestra el estado con su color semántico y brillo neón canónico.
   */
  _getAnimalCardProps(a, rebano, supresionInfo) {
    const estado = a.estado || 'activo';
    // Color del badge según estado (éxito, warning, danger, info, etc.)
    const estadoColor = estado === 'activo' ? 'var(--c-success)' : 
                        (estado === 'vendido' ? 'var(--c-info)' : 
                        (estado === 'en tratamiento' || estado === 'pendiente' ? 'var(--c-warning)' : 
                        (estado === 'crítico' || estado === 'retirada' ? 'var(--c-danger)' : 'var(--c-accent)')));
    
    // Color del borde izquierdo según especie
    const colorEspecie = window.ModoContextoHelper ? window.ModoContextoHelper.getEspecieColor(a.especie) : 'var(--c-info)';
    const sexoIcon = a.sexo === 'H' ? Icons.hembra() : (a.sexo === 'M' ? Icons.macho() : '');
    const edad = a.fecha_nacimiento ? Math.floor((new Date() - new Date(a.fecha_nacimiento)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    return {
      title: `<span class="text-lg font-black text-gold uppercase tracking-tight">${a.numero_identificacion || a.nombre || `#${a.id}`}</span>`,
      subtitle: `<div class="flex items-center gap-6 mt-2">${sexoIcon} <span class="text-gray-400" style="font-size:0.7rem;">${(a.especie || 'N/D')} · ${(a.raza || 'N/D')}</span></div>`,
      content: `
        <div class="flex flex-wrap gap-x-12 gap-y-3 text-[0.65rem] text-gray font-800 uppercase mt-4">
          <div class="flex items-center gap-4">${Icons.rebanos()} ${rebano ? rebano.nombre : 'Sin asignar'}</div>
          ${a.alerta ? `<div class="flex items-center gap-4">${Icons.alerta()} <span style="color:var(--c-warning);">${a.alerta}</span></div>` : ''}
          ${supresionInfo && supresionInfo.activo ? `<div class="flex items-center gap-4">${Icons.alerta()} <span style="color:var(--c-danger); font-weight:900;">SUPRESIÓN ${supresionInfo.permanente ? 'PERMANENTE' : supresionInfo.diasRestantes + 'D'} (${supresionInfo.tipo === 'leche' ? 'LECHE' : supresionInfo.tipo === 'carne' ? 'CARNE' : 'CARNE/LECHE'})</span></div>` : ''}
          ${edad !== null ? `<div class="flex items-center gap-4">${Icons.calendar()} <span style="color:var(--c-info); font-weight:900;">${edad}</span> ${edad === 1 ? 'AÑO' : 'AÑOS'}</div>` : ''}
          <div class="flex items-center gap-4">${Icons.peso()} ${a.peso_actual || a.peso_inicial || a.peso_nacimiento || '-'} kg</div>
          ${a.notificado_rega ? `<div class="flex items-center gap-4">${Icons.check()} <span style="color:var(--c-success);">Alta comunicada</span></div>` : ''}
          ${a.categoria ? `<div class="flex items-center gap-4 text-aaa">${Icons.documento()} ${a.categoria}</div>` : ''}
        </div>
      `,
      rightSide: `<span class="badge" style="
          background:${estadoColor}15;
          color:${estadoColor};
          border:1px solid ${estadoColor}40;
          filter: drop-shadow(0 0 4px ${estadoColor});
          box-shadow: 0 0 6px color-mix(in srgb, ${estadoColor} 50%, transparent);
          font-size:0.6rem;
          padding:2px 8px;
          border-radius:6px;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:0.5px;
          white-space:nowrap;">
          ${estado.toUpperCase()}
        </span>`,
      footerRight: `<span class="btn-ficha-mini" style="
          color:var(--c-warning);
          font-size:0.7rem;
          font-weight:800;
          text-transform:uppercase;">
          Ficha ${Icons.flechaDerecha()}
        </span>`,
      color: colorEspecie,
      href: `#/animal?id=${a.id}`
    };
  },

  async _onCompradorChangeWizard(selectEl) {
    const val = parseInt(selectEl.value);
    if (!val) {
      const infoEl = document.getElementById('w-v-comprador-info');
      if (infoEl) infoEl.style.display = 'none';
      return;
    }
    try {
      const c = await Compradores.get(val);
      if (!c) return;
      const infoEl = document.getElementById('w-v-comprador-info');
      if (infoEl) infoEl.style.display = 'block';
      const nombreEl = document.getElementById('w-v-comprador-nombre');
      if (nombreEl) nombreEl.innerHTML = '<strong>' + c.nombre + '</strong>';
      const nifEl = document.getElementById('w-v-comprador-nif');
      if (nifEl) nifEl.textContent = 'NIF: ' + (c.nif_cif || '');
      const nifInput = document.getElementById('w-v-nif');
      if (nifInput) nifInput.value = c.nif_cif || '';
      const rsInput = document.getElementById('w-v-rs');
      if (rsInput) rsInput.value = c.nombre || '';
      const contrato = await Contratos.getActivo(val, 'carne');
      const contratoEl = document.getElementById('w-v-comprador-contrato');
      const ivaInput = document.getElementById('w-v-iva');
      const retInput = document.getElementById('w-v-ret');
      if (contrato) {
        if (contratoEl) contratoEl.innerHTML = `<span>${Icons.documento()}</span> Contrato: ${contrato.numero_contrato} (IVA: ${contrato.iva_pct}%, Ret.: ${contrato.retencion_pct}%)`;
        if (ivaInput) ivaInput.value = contrato.iva_pct;
        if (retInput) retInput.value = contrato.retencion_pct;
      } else {
        if (contratoEl) contratoEl.innerHTML = `<span>${Icons.alerta()}</span> Sin contrato activo`;
      }
    } catch(e) {
      console.warn(e);
    }
  },

  async _abrirAltaCompradorRapida() {
    await App._ensureViewGroup('comer');
    if (!window.CompradoresView || typeof CompradoresView.renderFormulario !== 'function') {
      App.toastError('Módulo de compradores no disponible');
      return;
    }
    // Ocultar overlay del wizard para que se vea el formulario de comprador
    const overlay = document.getElementById('wizard-venta-masiva');
    if (overlay) {
      overlay.style.display = 'none';
    }
    window._volverAWizardVenta = true;
    await CompradoresView.renderFormulario();
  },

  async _onTransportistaChangeWizard(selectEl) {
    const val = parseInt(selectEl.value);
    if (!val) {
      const infoEl = document.getElementById('w-v-transportista-info');
      if (infoEl) infoEl.style.display = 'none';
      return;
    }
    try {
      const t = await Transportistas.get(val);
      if (!t) return;
      App._showTransportistaInfo({
        transportistaId: val,
        nombreTransportista: t.nombre,
        nifTransportista: t.nif_cif,
        matriculaTransportista: t.matricula,
        atgTransportista: t.autorizacion_transporte_ganado,
        desinsectacionVencimiento: t.desinsectacion_vencimiento,
      });
    } catch(e) {
      console.warn(e);
    }
  },

  _showTransportistaInfo(data) {
    const infoEl = document.getElementById('w-v-transportista-info');
    if (!infoEl) return;
    if (!data.transportistaId) {
      infoEl.style.display = 'none';
      return;
    }
    infoEl.style.display = 'block';
    const nombreEl = document.getElementById('w-v-transportista-nombre');
    if (nombreEl) nombreEl.innerHTML = '<strong>' + (data.nombreTransportista || '') + '</strong>';
    const nifEl = document.getElementById('w-v-transportista-nif');
    if (nifEl) nifEl.textContent = 'NIF: ' + (data.nifTransportista || '');
    const matEl = document.getElementById('w-v-transportista-matricula');
    if (matEl) matEl.innerHTML = `<span class="flex items-center gap-4">${Icons.transportistas()} ${data.matriculaTransportista || ''}</span>`;
    const atgEl = document.getElementById('w-v-transportista-atg');
    if (atgEl) atgEl.textContent = 'ATG: ' + (data.atgTransportista || 'pendiente');
    const desEl = document.getElementById('w-v-transportista-desinsectacion');
    if (desEl) {
      const v = data.desinsectacionVencimiento || '';
      desEl.textContent = 'Desinsectación: ' + (v ? ('vigente hasta ' + v) : 'sin vencimiento informado');
    }
  },

  async updateNavigationMenu() {
    try {
      const fincaId = await Fincas.getActiveId();
      if (!fincaId) return;

      const rebanos = await window.db.getAllFromIndex('rebanos', 'fincaId', fincaId).catch(() => []);

      // Obtener los flags efectivos: prioridad a preferencia global del usuario, luego detección automática
      const flags = await ModoContextoHelper.getEffectiveFlags(fincaId);

      // Limpiar Barra Inferior: Ocultar Animales y Rebaños para simplificar la interfaz a 3 botones principales
      const navAnimales = document.getElementById('nav-animales');
      if (navAnimales) navAnimales.style.display = 'none';
      const navRebanos = document.getElementById('nav-rebanos');
      if (navRebanos) navRebanos.style.display = 'none';

      const navComer = document.getElementById('nav-comercializacion');
      if (navComer) {
        navComer.style.display = 'flex';
        const tab = flags.leche ? 'leche' : 'carne';
        navComer.setAttribute('href', `#/comercializacion?tab=${tab}`);
      }

      // Establecer el modo de explotación en el dataset del body para que las vistas puedan acceder a él
      document.body.dataset.modoExplotacion = [flags.leche ? 'leche' : '', flags.carne ? 'carne' : ''].filter(Boolean).join(',');

      const navProduccion = document.getElementById('nav-produccion');
      if (navProduccion) {
        const labelEl = navProduccion.querySelector('.label');
        const svgEl = navProduccion.querySelector('svg');
        if (labelEl) labelEl.textContent = 'GeGan';
        navProduccion.setAttribute('href', '#/ganaderia');
        if (false) {
          svgEl.innerHTML = `
            <path d="M4 20h16"></path>
            <path d="M6 20V8l6-4 6 4v12"></path>
            <path d="M9 12h6"></path>
          `;
        }
      }

    } catch (e) {
      console.warn('[Navigation] Error en updateNavigationMenu:', e);
    }
  },

  _navigateBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.hash = '#/';
    }
  },

  async route() {
    const hash = window.location.hash.slice(1) || "/";
    const [path, query] = hash.split("?");
    // Salir del visor de manuales si se navega a otra vista
    document.getElementById('app-content')?.classList.remove('manual-open');
    const params = new URLSearchParams(query);

    // URL redirections for consolidated architecture v5.0
    const redirectMap = {
      '/zonas': '/ganaderia?tab=zonas',
      '/silos': '/explotacion?tab=silos',
      '/fitosanitario': '/explotacion?tab=fitosanitarios',
      '/gastos': '/explotacion?tab=gastos',
      '/proveedores': '/explotacion?tab=proveedores',
      '/leche': '/explotacion',
      '/carne': '/explotacion',
      '/hibrido': '/explotacion',
      '/rebanos': '/ganaderia?tab=rebanos',
      '/animales': '/ganaderia?tab=animales',
      '/patrimonio': '/ganaderia?tab=patrimonio',
      '/sanidad': '/ganaderia?tab=sanidad',
      '/compradores': '/comercializacion?tab=compradores',
      '/contratos': '/comercializacion?tab=contratos',
      '/transportistas': '/comercializacion?tab=transportistas'
    };

    // Check if we need to redirect (unless suppressing for wizards or wizard call in progress)
    const redirectTarget = redirectMap[path];
    let shouldRedirect = true;
    // Apply existing suppression based on _redirectSuppression and specific paths
    if (window._redirectSuppression) {
        if (['/rebanos','/zonas','/animales','/animal'].includes(path)) {
            shouldRedirect = false;
        }
    }
    // Additional suppression: if we are in a wizard and the redirect target leads to a ganadero view, suppress redirect
    if (shouldRedirect && redirectTarget) {
        const targetPath = redirectTarget.split('?')[0];
        const ganaderoPaths = new Set(['/ganaderia','/rebanos','/rebano','/animales','/animal']);
        if (window._wizardCallInProgress && ganaderoPaths.has(targetPath)) {
            shouldRedirect = false;
        }
    }
    if (shouldRedirect && redirectTarget) {
        // Not suppressing, or path not in suppression list: proceed with normal redirect check
        window.location.hash = '#' + redirectTarget;
        return;
    } else {
        // Suppressed for this path or wizard in progress: clear redirect suppression flag if set
        if (window._redirectSuppression) {
            window._redirectSuppression = false;
        }
        // wizard flag will be cleared by the caller that set it
    }

    await this.updateNavigationMenu();
    this._updateSidebarNavigation(path, query);

    let activeSvg = null;
    
    // 1. Check main nav items
    document.querySelectorAll(".nav-item").forEach((el) => {
      const href = el.getAttribute("href");
      if (!href) return;
      const isActive = path === '/' ? href === '#/' : href.startsWith(`#${path}`);
      el.classList.toggle("active", isActive);
      if (isActive) {
        const svg = el.querySelector('svg');
        if (svg) activeSvg = svg;
      }
    });

    // 2. Update Header Icon
    if (activeSvg) {
      const headerRouteIcon = document.getElementById('header-route-icon');
      if (headerRouteIcon) {
        headerRouteIcon.innerHTML = '';
        const clonedSvg = activeSvg.cloneNode(true);
        clonedSvg.style.display = 'block';
        clonedSvg.setAttribute('width', '20');
        clonedSvg.setAttribute('height', '20');
        headerRouteIcon.appendChild(clonedSvg);
      }
    }

    // Actualizar header contextual (título de vista + botón volver)
    this._updateHeaderContext(path);

    // Huecos de la barra superior (migas de pan + campana de alertas)
    this._renderBreadcrumbs(path, params);
    this._renderAlertasBell();

    // Si venimos de crear un comprador rápido para el wizard de venta, volver al wizard
    if (window._volverAWizardVenta && path === '/comprador' && params?.get?.('id')) {
      window._volverAWizardVenta = false;
      App.toast('Comprador creado. Ahora selecciónalo en el wizard.');
      window.location.hash = '#/animales';
      setTimeout(() => App._abrirWizardVentaMasiva(), 300);
      return;
    }

    const main = document.getElementById("app-content");
    if (main) {
      main.removeAttribute("style");
    }
    const fincaId = await Fincas.getActiveId();
    if (!fincaId && path !== "/ajustes")
      return await AsistenteConfiguracion.mostrarAsistente();

    main.innerHTML = '<div class="loader">Cargando...</div>';
    App.clearExitGuard(); // La vista que se va a renderizar registrará su propia guarda si la necesita

    // El FAB "Guía" y el tour cuelgan de <body>, no de #app-content, así que no se
    // limpian solos al cambiar de vista: en rutas sin guía (Ajustes, Informes…) el FAB
    // de la vista anterior seguía flotando. Cada vista con guía vuelve a pintarlo.
    document.getElementById('guide-fab')?.remove();
    // Cerrar el tour SOLO si no hay uno en curso. Las guías panorámicas navegan entre
    // submódulos por diseño para enseñar cada paso, y esa navegación vuelve a pasar por
    // aquí: al llamar a skip() incondicionalmente se mataba el tour vivo (cleanup deja
    // currentGuide a null) y, doce líneas más abajo, maybeStart() ya no veía tour activo
    // y relanzaba la panorámica desde el paso 0 — el usuario pulsaba Siguiente y volvía
    // al principio una y otra vez. El tour se cierra desde sus propios controles:
    // Saltar, No mostrar de nuevo, o al completar el último paso.
    const tourEnCurso = !!(window.GuideManager && typeof GuideManager.isRunning === 'function' && GuideManager.isRunning());
    if (!tourEnCurso && window.GuideManager && typeof GuideManager.skip === 'function') GuideManager.skip();
    try {
      // Si el grupo de scripts de la vista no carga, hay que DECIRLO. Antes se ignoraba
      // el resultado y se caia al `else` de mas abajo sin tocar el contenedor, dejando
      // el "Cargando..." en pantalla de forma indefinida: sin error, sin banner y sin
      // forma de que el usuario supiera que algo habia fallado ni de reintentarlo.
      const gruposOk = await App._ensureRouteScripts(path);
      if (!gruposOk) {
        main.innerHTML = `
          <div class="card error-card">
            <h2>No se pudo cargar esta sección</h2>
            <p>Fallo al descargar los componentes de la vista. Comprueba la conexión y vuelve a intentarlo.</p>
            <button class="btn btn--inline btn-primary" onclick="App.route('${path}')">Reintentar</button>
          </div>`;
        return;
      }
      const methodName = App.routes[path];
      if (methodName && typeof App[methodName] === "function") {
        await App[methodName](params);

        // Auto-start guide for this view/tab (if enabled and first visit)
        try {
          const viewName = App._viewForMethod(methodName);
          const viewInstance = viewName ? window[viewName] : null;
          const tab = viewInstance?._activeSubModule || params.get('tab') || null;
          if (window.GuideManager && typeof GuideManager.maybeStart === 'function') {
            GuideManager.maybeStart(path, tab);
          }
        } catch (e) {
          console.warn('[GuideManager] Error en auto-start:', e);
        }

        // Restablecer el scroll al inicio de la página en cada navegación, salvo con un
        // tour en curso: la guía ya ha desplazado la vista hasta el elemento del paso
        // (_ensureVisible) y devolverla arriba deja el spotlight descolocado.
        if (!tourEnCurso) {
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          if (main) main.scrollTop = 0;
        }

        // Listados largos: filtros de búsqueda/tipo y recorte a los N primeros
        try { this._recolocarMarcoRegistro(main); } catch (e) { console.warn('[Marco]', e); }
        try { this._recolocarToggleVista(main); } catch (e) { console.warn('[Toggle]', e); }
        try { this.aplicarFiltrosListadoAuto(main); } catch (e) { console.warn('[Filtros]', e); }
        try { this.aplicarVerMasAuto(main); } catch (e) { console.warn('[VerMas]', e); }

        // Animación de entrada entre rutas
        main.classList.add('route-enter');
        main.addEventListener('animationend', () => main.classList.remove('route-enter'), { once: true });
      } else {
        main.innerHTML = "<h2>404</h2><p>Página no encontrada.</p>";
        main.classList.add('route-enter');
        main.addEventListener('animationend', () => main.classList.remove('route-enter'), { once: true });
      }
    } catch (error) {
      console.error(error);
      main.innerHTML = `<div class="card error-card"><h2>Error</h2><p>${error.message}</p></div>`;
      main.classList.add('route-enter');
      main.addEventListener('animationend', () => main.classList.remove('route-enter'), { once: true });
    }
  },

  /**
   * Mapea nombres de método de ruta a nombres globales de vista.
   * Usado por GuideManager.maybeStart para obtener la vista activa y su _activeSubModule.
   * @param {string} methodName - Ej: 'renderGanaderia', 'renderExplotacion', 'renderComercializacion'
   * @returns {string|null} Nombre global de la vista (Ej: 'GanaderiaView', 'ExplotacionView')
   */
  _viewForMethod(methodName) {
    const map = {
      renderGanaderia: 'GanaderiaView',
      renderRebanos: 'GanaderiaView',
      renderDetalleRebano: 'GanaderiaView',
      renderZonas: 'GanaderiaView',
      renderDetalleZona: 'GanaderiaView',
      renderInstalaciones: 'GanaderiaView',
      renderDetalleInstalacion: 'GanaderiaView',
      renderSaneamientos: 'GanaderiaView',
      renderDetalleSaneamiento: 'GanaderiaView',
      renderSubexplotaciones: 'GanaderiaView',
      renderDetalleSubexplotacion: 'GanaderiaView',
      renderBotiquin: 'GanaderiaView',
      renderDetalleBotiquin: 'GanaderiaView',
      renderBitacoraAnimal: 'GanaderiaView',
      renderAnimales: 'GanaderiaView',
      renderDetalleAnimal: 'GanaderiaView',
      renderExplotacion: 'ExplotacionView',
      renderGastos: 'ExplotacionView',
      renderSilos: 'ExplotacionView',
      renderFitosanitarios: 'ExplotacionView',
      renderProveedores: 'ExplotacionView',
      renderComercializacion: 'ComercializacionView',
      renderDetalleLeche: 'ComercializacionView',
      renderDetalleVentaCarne: 'ComercializacionView',
      renderCompradores: 'ComercializacionView',
      renderComprador: 'ComercializacionView',
      renderContrato: 'ComercializacionView',
      renderProveedores: 'ComercializacionView',
      renderProveedor: 'ComercializacionView',
      renderTransportistas: 'ComercializacionView',
    };
    return map[methodName] || null;
  },

  /**
   * Cambia de sub-módulo y dispara guía si corresponde.
   * Usado desde el carrusel de pestañas para reemplazar `cerrarYNavegar`.
   * @param {string} viewName - Nombre global de la vista (ej. 'GanaderiaView')
   * @param {string} tabKey - Clave del sub-módulo (ej. 'animales', 'rebanos')
   */
  async _cambiarSubmoduloConGuia(viewName, tabKey) {
    const viewInstance = window[viewName];
    if (!viewInstance || typeof viewInstance._cambiarSubModulo !== 'function') {
      console.warn('[App._cambiarSubmoduloConGuia] Vista o método no encontrado:', viewName);
      return;
    }
    // Cerrar menú del carrusel si está abierto
    App.cerrarCarruselMenu && App.cerrarCarruselMenu();
    // Ejecutar cambio de sub-módulo (devuelve Promise si render es async)
    const renderPromise = viewInstance._cambiarSubModulo(tabKey);
    if (renderPromise && typeof renderPromise.then === 'function') {
      await renderPromise;
    }
    // Disparar evento para que GuideManager re-ancle la guía
    if (window.EventBus) {
      EventBus.emit('view:tabChanged', { viewName, tabKey });
    }
  },

  /**
   * Renderiza el FAB "Guía" flotante para la ruta/tab actual.
   * Debe llamarse después de renderizar el contenido de la sub-vista.
   * @param {string} route - Ruta hash normalizada (ej: '/ganaderia', '/explotacion', '/comercializacion')
   * @param {string|null} tab - Clave del sub-módulo (ej: 'animales', 'silos') o null para panorámica
   * @param {HTMLElement} [container=document.body] - Contenedor donde insertar el FAB
   */
  /** Baja el marco de acciones de registro desde la cabecera del módulo hasta
   *  justo encima del listado al que pertenece (fila de filtros, listado o
   *  tabla, lo que aparezca primero). Así el botón de alta queda pegado a los
   *  registros que crea, en vez de flotando junto a la tarjeta de cabecera.
   *  Se excluyen los marcos de acciones generales del módulo, que no cuelgan de
   *  ningún listado concreto y se marcan con `.erp-action-group--modulo`. */
  _recolocarMarcoRegistro(raiz = document) {
    raiz.querySelectorAll('.erp-action-group:not(.erp-action-group--modulo)').forEach((marco) => {
      // Primer destino que aparezca DESPUÉS del marco: buscador del listado,
      // listado recortable o tabla ERP. Buscar solo hacia delante evita que en
      // vistas con varios listados (Sanidad) el marco suba al listado equivocado.
      const destino = Array.from(
        raiz.querySelectorAll('.erp-filtros, [data-ver-mas], [id$="-lista"], [id$="-erp-table-container"]')
      ).find((el) => marco.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
        && !marco.contains(el));
      if (!destino) return;                          // marco sin listado propio: se queda
      if (destino.previousElementSibling === marco) return;  // ya está en su sitio
      destino.parentElement.insertBefore(marco, destino);
    });
  },

  /** Recoloca el conmutador Tarjetas / Tabla ERP en su sitio canónico: justo
   *  encima del marco de acciones de registro (y por tanto debajo de la tarjeta
   *  de cabecera y de las alertas). Son controles de VISTA, no de registro, así
   *  que no deben mezclarse con los botones de alta ni quedar sueltos junto al
   *  título del listado, que es donde cada vista los colocaba por su cuenta. */
  _recolocarToggleVista(raiz = document) {
    const btn = raiz.querySelector('[id$="-vista-cards"]');
    if (!btn) return;
    const contenedor = btn.parentElement;
    const marco = raiz.querySelector('.erp-action-group');
    if (!contenedor || !marco || contenedor.contains(marco)) return;
    contenedor.classList.add('erp-vista-toggle');
    if (marco.previousElementSibling === contenedor) return;
    marco.parentElement.insertBefore(contenedor, marco);
  },

  /** Algunas vistas envuelven los registros en un contenedor intermedio
   *  (`#docs-lista > div.grid > .card-registro`). Si no se desciende, el filtro
   *  y el recorte actuarian sobre ese unico envoltorio en vez de sobre las
   *  fichas. Se baja un nivel solo cuando hay un unico hijo que agrupa a varios,
   *  para no confundirlo con un listado que de verdad tiene un solo registro. */
  _contenedorReal(cont) {
    if (!cont) return cont;
    const hijos = Array.from(cont.children).filter((e) => !e.classList.contains('erp-ver-mas'));
    if (hijos.length === 1 && hijos[0].children.length > 1) return hijos[0];
    return cont;
  },

  /** Engancha una fila de filtros `.erp-filtros[data-filtros-para="idListado"]`
   *  al listado indicado: el buscador oculta las tarjetas cuyo texto no coincide
   *  y el desplegable filtra por su atributo `data-tipo`. El desplegable se
   *  puebla solo con los tipos presentes; si ninguna tarjeta declara `data-tipo`,
   *  se oculta. Filtra en el DOM, así que no hace falta re-renderizar la vista. */
  aplicarFiltrosListado(fila) {
    if (!fila || fila.dataset.filtrosAplicados === '1') return;
    const listaMarcada = document.getElementById(fila.dataset.filtrosPara);
    if (!listaMarcada) return;
    const lista = this._contenedorReal(listaMarcada);
    fila.dataset.filtrosAplicados = '1';

    const input = fila.querySelector('input');
    const select = fila.querySelector('select');
    const items = () => Array.from(lista.children).filter((el) => !el.classList.contains('erp-ver-mas'));

    // Poblar el desplegable con los tipos que realmente hay en los datos
    if (select) {
      const tipos = [...new Set(items().map((el) => el.dataset.tipo).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'es'));
      if (!tipos.length) {
        select.style.display = 'none';
      } else {
        select.innerHTML = '<option value="">' + (select.dataset.etiquetaTodos || 'Todos los tipos') + '</option>'
          + tipos.map((t) => '<option value="' + t + '">' + t.toUpperCase() + '</option>').join('');
      }
    }

    const filtrar = () => {
      const texto = (input && input.value || '').trim().toLowerCase();
      const tipo = (select && select.value) || '';
      let visibles = 0;
      items().forEach((el) => {
        const coincideTexto = !texto || (el.textContent || '').toLowerCase().includes(texto);
        const coincideTipo = !tipo || el.dataset.tipo === tipo;
        const ok = coincideTexto && coincideTipo;
        el.dataset.filtrado = ok ? '' : '1';
        if (ok) visibles++;
      });
      // Al filtrar se muestran todas las coincidencias: el recorte de 10 se
      // recalcula sobre el subconjunto resultante.
      listaMarcada.dataset.verMasAplicado = '';
      this.aplicarVerMas(listaMarcada);
      // ...y las descartadas por el filtro se ocultan pase lo que pase
      items().forEach((el) => { if (el.dataset.filtrado === '1') el.style.display = 'none'; });

      const vacio = fila.parentElement && fila.parentElement.querySelector('[data-filtros-vacio]');
      if (vacio) vacio.style.display = visibles === 0 ? '' : 'none';
    };

    if (input) input.addEventListener('input', filtrar);
    if (select) select.addEventListener('change', filtrar);
  },

  /** Engancha todas las filas de filtros de la vista recién pintada. */
  aplicarFiltrosListadoAuto(raiz = document) {
    raiz.querySelectorAll('.erp-filtros[data-filtros-para]').forEach((f) => {
      this.aplicarFiltrosListado(f);
      this._sincronizarVisibilidadFiltros(f, f.dataset.filtrosPara);
    });
    // Filas de filtros que la propia vista ya gestiona (tienen su handler): no
    // se les engancha nada, solo se ocultan cuando manda la tabla ERP.
    raiz.querySelectorAll('.erp-filtros[data-filtros-de]').forEach((f) => {
      this._sincronizarVisibilidadFiltros(f, f.dataset.filtrosDe);
    });
  },

  /** La tabla ERP trae su propio buscador: si el listado de tarjetas está
   *  oculto (toggle Tarjetas/Tabla), la fila de filtros sobra y se esconde. */
  _sincronizarVisibilidadFiltros(fila, idLista) {
    const lista = document.getElementById(idLista);
    fila.style.display = (lista && lista.style.display === 'none') ? 'none' : '';
  },

  /** Limita visualmente un listado a los `limite` primeros registros (los más
   *  recientes, porque los listados llegan ordenados de nuevo a antiguo) y
   *  añade debajo un botón «Ver más» que revela el resto.
   *  Se aplica solo a contenedores marcados con data-ver-mas="N". */
  aplicarVerMas(contenedor, limite) {
    let cont = typeof contenedor === 'string' ? document.getElementById(contenedor) : contenedor;
    if (!cont) return;
    const marcado = cont;
    cont = this._contenedorReal(cont);
    const n = Number(limite || cont.dataset.verMas || 10);
    const previo = cont.nextElementSibling;
    if (previo && previo.classList && previo.classList.contains('erp-ver-mas')) previo.remove();

    const items = Array.from(cont.children);
    items.forEach((el, i) => { el.style.display = i < n ? '' : 'none'; });
    if (items.length <= n) return;

    const pie = document.createElement('div');
    pie.className = 'erp-ver-mas';
    const restantes = items.length - n;
    pie.innerHTML = '<button type="button" class="btn-erp-secondary btn-sm">'
      + 'Ver más <span class="erp-ver-mas-count">(' + restantes + ' ' + (restantes === 1 ? 'registro' : 'registros') + ' más)</span>'
      + '</button>';
    pie.querySelector('button').addEventListener('click', () => {
      items.forEach((el) => { el.style.display = ''; });
      pie.remove();
    });
    marcado.insertAdjacentElement('afterend', pie);
  },

  /** Aplica «Ver más» a todos los listados marcados de la vista recién pintada. */
  aplicarVerMasAuto(raiz = document) {
    raiz.querySelectorAll('[data-ver-mas]').forEach((cont) => {
      if (cont.dataset.verMasAplicado === '1') return;
      cont.dataset.verMasAplicado = '1';
      this.aplicarVerMas(cont);
    });
  },

  /** Varias vistas repintan su contenido entero en cada pulsacion del buscador
   *  (oninput -> render()). Eso destruye el <input>, el foco cae al body y hay
   *  que volver a hacer clic para escribir la siguiente letra. Aqui se recuerda
   *  cual era el campo activo y se le devuelve el foco y la posicion del cursor
   *  cuando reaparece, para no tener que reescribir cada vista. */
  _recordarFoco() {
    if (this._focoBound) return;
    // Se escucha en document y no en #app-content: ese contenedor se reemplaza
    // en algunos flujos, y con el se perderia el listener.
    // Se registra en 'input' ademas de 'focusin' porque el caso a cubrir es
    // justo escribir en el buscador, y asi no depende de eventos de foco.
    const anotar = (e) => {
      const el = e.target;
      if (!el || !el.id || !/^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
      this._focoUltimo = { id: el.id, pos: el.selectionStart, cuando: Date.now() };
    };
    document.addEventListener('focusin', anotar);
    document.addEventListener('input', anotar);
    this._focoBound = true;
  },

  /** Devuelve el foco al campo que lo tenia antes del repintado. */
  _restaurarFoco() {
    const f = this._focoUltimo;
    if (!f) return;
    // Solo dentro de la ventana en que un repintado puede haberlo robado: pasado
    // ese margen se asume que el usuario movio el foco a proposito.
    if (Date.now() - f.cuando > 3000) return;
    const activo = document.activeElement;
    if (activo && activo !== document.body && activo.id !== f.id) return;

    const el = document.getElementById(f.id);
    if (!el || el === activo) return;
    el.focus();
    try {
      const pos = f.pos != null ? f.pos : (el.value || '').length;
      el.setSelectionRange(pos, pos);
    } catch (e) {
      // input type=number o date no admiten setSelectionRange
    }
    f.cuando = Date.now();
  },

  /** Observa #app-content para recortar también los listados que repintan las
   *  propias vistas (buscadores, cambios de pestaña, toggle Tarjetas/Tabla),
   *  que no pasan por route(). Cada contenedor se procesa una sola vez. */
  _observarVerMas() {
    if (this._verMasObserver) return;
    const main = document.getElementById('app-content');
    if (!main || typeof MutationObserver === 'undefined') return;
    this._verMasObserver = new MutationObserver(() => {
      if (this._verMasPendiente) return;
      this._verMasPendiente = true;
      // setTimeout y no requestAnimationFrame: rAF no corre con la ventana
      // oculta o minimizada, y entonces el flag se quedaba en true para
      // siempre, dejando el observador muerto (sin filtros, sin «Ver mas» y
      // sin restaurar el foco) hasta recargar.
      setTimeout(() => {
          this._verMasPendiente = false;
        try { this._restaurarFoco(); } catch (e) {}
        try { this._recolocarMarcoRegistro(main); } catch (e) { console.warn('[Marco]', e); }
        try { this._recolocarToggleVista(main); } catch (e) { console.warn('[Toggle]', e); }
        try { this.aplicarFiltrosListadoAuto(main); } catch (e) { console.warn('[Filtros]', e); }
        try { this.aplicarVerMasAuto(main); } catch (e) { console.warn('[VerMas]', e); }
      });
    });
    this._verMasObserver.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
  },

  renderGuideFab(route, tab, container = document.body) {
    // Se retira siempre primero: al cambiar de tab el FAB anterior apuntaría a la guía
    // del tab que se acaba de abandonar, y si el nuevo tab no tiene guía debe desaparecer.
    container.querySelector('#guide-fab')?.remove();

    if (!window.GuideManager || !GuideManager.isEnabled || !GuideManager.isEnabled()) return;
    if (!window.GuideRegistry) return;

    // Guarda: sin finca activa no hay guías disponibles
    const activeFincaId = localStorage.getItem('activeFincaIdLivestock');
    if (!activeFincaId) return;

    const flags = window.ModoContextoHelper ? ModoContextoHelper.getFlags() : { leche: true, carne: false };
    // Buscar guía para este tab; si no hay, buscar panorámica
    const guide = GuideRegistry.getByRouteTab(route, tab, flags) || GuideRegistry.getPanoramica(route, flags);
    if (!guide) return; // No hay guía para esta vista

    const fab = document.createElement('button');
    fab.id = 'guide-fab';
    fab.type = 'button';
    fab.className = 'guide-fab';
    fab.setAttribute('aria-label', 'Abrir guía interactiva');
    fab.innerHTML = `${Icons.ayuda() || Icons.info()} <span>Guía</span>`;
    fab.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: calc(150px + var(--safe-bottom));
      z-index: 3000;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: 30px;
      color: var(--text-p);
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
      animation: guide-fab-pulse 2s ease-in-out infinite;
      cursor: pointer;
    `;

    // Estilos animación (inyectar una vez)
    if (!document.getElementById('guide-fab-style')) {
      const style = document.createElement('style');
      style.id = 'guide-fab-style';
      style.textContent = `
        @keyframes guide-fab-pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05); }
          50% { box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 0 2px var(--c-info, #00d4ff); }
        }
        .guide-fab:hover { transform: scale(1.05); }
        .guide-fab:active { transform: scale(0.98); }
      `;
      document.head.appendChild(style);
    }

    fab.addEventListener('click', () => {
      if (window.GuideManager && typeof GuideManager.start === 'function') {
        GuideManager.start(guide.id);
      }
    });

    container.appendChild(fab);
  },

  _hexToRgba(hex, alpha) {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0,2), 16);
    const g = parseInt(c.substring(2,4), 16);
    const b = parseInt(c.substring(4,6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  },

  /**
   * Toast semántico (G9). Uso preferente: tipo EXPLÍCITO como 2º argumento:
   *   App.toast('Guardado', 'success') · tipos: success · error · warning · info · '' (neutro dorado).
   * Compatibilidad: si el 2º argumento es un número se trata como duración (API legacy)
   * y para strings dinámicos sin tipo se mantiene la inferencia por marcador
   * (check/cruz/aviso/info en cualquier posición). Los emojis se retiran del texto:
   * el icono lo aporta Toast como SVG semántico (Icons.check/alerta/cerrar/info).
   */
  toast(msg, type, duracionMs) {
    if (typeof msg !== 'string') return;
    if (typeof type === 'number') { duracionMs = type; type = ''; }
    if (!type) {
      if (msg.includes('✅')) type = 'success';
      else if (msg.includes('❌')) type = 'error';
      else if (msg.includes('⚠')) type = 'warning';
      else if (msg.includes('ℹ') || /^info\b/i.test(msg)) type = 'info';
    }
    const text = msg
      .replace(/^info\b\s*/i, '')
      .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{20E3}]/gu, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    window.Toast.show(text || msg, type, duracionMs);
  },

  toastError(msg) {
    if (typeof msg !== 'string') return;
    const text = msg.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{20E3}]/gu, '').replace(/\s{2,}/g, ' ').trim();
    // Un ⚠️ enviado por toastError es un aviso, no un error (G9)
    if (msg.includes('⚠')) {
      window.Toast.warning(text || msg);
      return;
    }
    window.Toast.error(text || msg);
  },

  // ==========================================
  // WIZARDS COMERCIALES MASIVOS
  // ==========================================
  async _abrirWizardVentaMasiva() {
    window._wizardCallInProgress = true;
    try {
      if (window.VentaMasivaWizard) {
        await window.VentaMasivaWizard.open();
      } else {
        this.toastError("Error: VentaMasivaWizard no disponible");
      }
    } finally {
      setTimeout(() => {
        window._wizardCallInProgress = false;
      }, 0);
    }
  },

  async imprimirAlbaran(albaran, tipo) {
    const html = `
                <div style="display:flex; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:10px;">
                    <img src="icons/Logo aplicación.png" style="height:50px; filter:grayscale(1);">
                    <div style="text-align:right;">
                        <h1 style="margin:0; font-size:1.5rem;">ALBARÁN DE EXPEDICIÓN</h1>
                        <p class="m-0">Nº: ${albaran.cabecera.numero_albaran
      }</p>
                        <p class="m-0">Fecha: ${albaran.cabecera.fecha_emision
      }</p>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:40px; margin-top:30px;">
                    <div>
                        <h4 style="border-bottom:1px solid #ddd;">VENDEDOR (REGA)</h4>
                        <p><strong>${albaran.cabecera.vendedor.nombre
      }</strong><br>REGA: ${albaran.cabecera.vendedor.rega
      }<br>${albaran.cabecera.vendedor.direccion}</p>
                    </div>
                    <div>
                        <h4 style="border-bottom:1px solid #ddd;">COMPRADOR</h4>
                        <p><strong>${albaran.cabecera.comprador.nombre
      }</strong><br>NIF: ${albaran.cabecera.comprador.nif
      }<br>${albaran.cabecera.comprador.direccion}</p>
                    </div>
                </div>
                <div style="margin-top:40px;">
                    <h3 style="background:#eee; padding:5px; font-size: 1rem;">DETALLES DE TRAZABILIDAD (${albaran.trazabilidad.tipo
      })</h3>
                    <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size: 0.9rem;">
                        ${tipo === "carne"
        ? `
                            <tr><td class="td-lbl">Documento ICA</td><td class="td-val">${albaran.trazabilidad.codigo_ica}</td></tr>
                            <tr><td class="td-lbl">Guía Sanitaria</td><td class="td-val">${albaran.trazabilidad.numero_guia}</td></tr>
                            <tr><td class="td-lbl">Establecimiento Destino</td><td class="td-val">${albaran.trazabilidad.matadero}</td></tr>
                            <tr><td class="td-lbl">Nº Albarán</td><td class="td-val">${albaran.trazabilidad.numero_albaran || 'N/A'}</td></tr>
                            <tr><td class="td-lbl">DIMOE</td><td class="td-val">${albaran.trazabilidad.dimoe || 'N/A'}</td></tr>
                            <tr style="background:#f9f9f9;"><td colspan="2" class="td-lbl">TRANSPORTE</td></tr>
                            <tr><td class="td-lbl">Transportista</td><td class="td-val">${albaran.trazabilidad.transportista?.nombre || 'N/D'}</td></tr>
                            <tr><td class="td-lbl">NIF Transportista</td><td class="td-val">${albaran.trazabilidad.transportista?.nif || 'N/D'}</td></tr>
                            <tr><td class="td-lbl">Matrícula</td><td class="td-val">${albaran.trazabilidad.transportista?.matricula || 'N/D'}</td></tr>
                        `
        : `
                            <tr><td class="td-lbl">Matrícula Cisterna</td><td class="td-val">${albaran.trazabilidad.matricula}</td></tr>
                            <tr><td class="td-lbl">Muestra Letra Q</td><td class="td-val">${albaran.trazabilidad.muestra_letra_q}</td></tr>
                            <tr><td class="td-lbl">Temp. Carga</td><td class="td-val">${albaran.trazabilidad.temp_carga} °C</td></tr>
                        `
      }
                    </table>
                </div>
                <div style="margin-top:40px; text-align:center; font-size:0.8rem; border-top:1px solid #eee; padding-top:20px;">
                    <p>Documento generado electrónicamente por Livestock Manager Premium v${window.APP_INFO.version}</p>
                </div>`;

    DocumentViewer.show({
      id: 'doc-viewer-albaran',
      title: 'Albarán de Expedición',
      html: `<div style="padding:30px; box-sizing:border-box; font-family:serif; color:black;">${html}</div>`,
      filename: `albaran_${albaran.cabecera.numero_albaran}`,
      shareTitle: 'Albarán de Expedición',
      shareText: `Albarán nº ${albaran.cabecera.numero_albaran}`
    });
  },

  async imprimirFactura(albaran, liquidacion, numeroFactura) {
    const finca = await Fincas.getActive().catch(() => null);
    const contentHtml = window.PdfService
      ? window.PdfService.generarFactura({
          albaran,
          liquidacion,
          numeroFactura,
          finca
        })
      : '<p>Error: PdfService no disponible</p>';

    window.PdfService?.mostrarPDF({
      title: 'FACTURA',
      filename: `factura_${numeroFactura || albaran.cabecera.numero_albaran}.pdf`,
      contentHtml
    });
  },

  async _abrirWizardAlbaranLeche() {
    window._wizardCallInProgress = true;
    try {
      if (window.AlbaranLecheWizard) { return window.AlbaranLecheWizard.open(); }
      App.toastError("Error: AlbaranLecheWizard no disponible");
    } finally {
      setTimeout(() => {
        window._wizardCallInProgress = false;
      }, 0);
    }
  },
  async _abrirWizardTraslado() {
    window._wizardCallInProgress = true;
    try {
      if (window.WizardTraslado) { return window.WizardTraslado.abrir(); }
      App.toastError("Error: WizardTraslado no disponible");
    } finally {
      setTimeout(() => {
        window._wizardCallInProgress = false;
      }, 0);
    }
  },
  async _abrirWizardCenso() {
    window._wizardCallInProgress = true;
    try {
      if (window.WizardCenso) { return window.WizardCenso.abrir(); }
      App.toastError("Error: WizardCenso no disponible");
    } finally {
      setTimeout(() => {
        window._wizardCallInProgress = false;
      }, 0);
    }
  },
  async _abrirWizardCrotales() {
    window._wizardCallInProgress = true;
    try {
      if (window.WizardCrotales) { return window.WizardCrotales.abrir(); }
      App.toastError("Error: WizardCrotales no disponible");
    } finally {
      setTimeout(() => {
        window._wizardCallInProgress = false;
      }, 0);
    }
  },
  async _abrirWizardGuiaMovimiento() {
    window._wizardCallInProgress = true;
    try {
      if (window.WizardGuiaMovimiento) { return window.WizardGuiaMovimiento.abrir(); }
      App.toastError("Error: WizardGuiaMovimiento no disponible");
    } finally {
      setTimeout(() => {
        window._wizardCallInProgress = false;
      }, 0);
    }
  },
  async _abrirFormularioGasto(options = {}) {
    if (window.GastoWizard) { return window.GastoWizard.open(options); }
    App.toastError("Error: GastoWizard no disponible");
  },
  async _abrirAsistenteProduccion(tipo, options = {}) {
    if (window.ProduccionUI && typeof ProduccionUI.iniciarAsistente === 'function') {
      await ProduccionUI.iniciarAsistente(tipo, options);
    } else {
      this.toastError("Error: Módulo de producción no disponible");
    }
  },

  async _abrirSubmenuRegistros(options = {}) {
    const html = `
    <div class="bottom-sheet-overlay animate-fade-in" id="submenu-registros-overlay" onclick="App._cerrarSubmenuRegistros()" style="position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:11000; display:flex; align-items:flex-end; justify-content:center;">
      <div class="bottom-sheet-content animate-slide-up" onclick="event.stopPropagation()" style="background:#0C0C0C; border-top:2px solid var(--c-success); border-top-left-radius:24px; border-top-right-radius:24px; width:100%; max-width:500px; padding:24px; box-shadow: 0 -10px 40px rgba(204,255,0,0.15); max-height:85vh; overflow-y:auto; box-sizing:border-box;">
        
        <!-- Header -->
        <div class="flex justify-between items-center mb-20 pb-10" style="border-bottom:1px solid #222;">
          <div>
            <h3 class="text-sm font-black uppercase tracking-wider text-white m-0" style="font-family:'Archivo Expanded', sans-serif; display:flex; align-items:center; gap:8px;">
              ${Icons.rotacion()} REGISTRO RÁPIDO
            </h3>
            <p class="text-[0.6rem] font-bold text-gray uppercase mt-2 mb-0">Seleccione la operación que desea registrar</p>
          </div>
          <button onclick="App._cerrarSubmenuRegistros()" class="widget-link-btn widget-link-btn--neon neon-danger p-6 min-h-0 h-auto" style="border:none; background:transparent;">
            ${Icons.cerrar()}
          </button>
        </div>

        <!-- Grid de Accesos Directos -->
        <div class="grid grid-cols-2 gap-12 mb-20">
          
          <!-- Ordeño / Leche -->
          <div class="card p-12 hover:border-gray transition-all" style="background:#141414; border:1px solid #222; cursor:pointer;" onclick="App._cerrarSubmenuRegistros(); App._abrirAsistenteProduccion('leche', { origen_modulo: 'submenu' });">
            <div class="flex items-center justify-center rounded-sm mb-10" style="width:36px; height:36px; background:#0C0C0C; color:var(--c-info); border:1px solid #222;">
              ${Icons.leche()}
            </div>
            <h4 class="text-xs font-black text-white uppercase tracking-wider mb-2">CONTROL LECHERO</h4>
            <p class="text-[0.55rem] text-gray uppercase tracking-tight m-0">Ordeños y pesas lactación</p>
          </div>

          <!-- Pesaje / Peso -->
          <div class="card p-12 hover:border-gray transition-all" style="background:#141414; border:1px solid #222; cursor:pointer;" onclick="App._cerrarSubmenuRegistros(); App._abrirAsistenteProduccion('carne', { origen_modulo: 'submenu' });">
            <div class="flex items-center justify-center rounded-sm mb-10" style="width:36px; height:36px; background:#0C0C0C; color:var(--c-danger); border:1px solid #222;">
              ${Icons.carne()}
            </div>
            <h4 class="text-xs font-black text-white uppercase tracking-wider mb-2">PESAJE GANADO</h4>
            <p class="text-[0.55rem] text-gray uppercase tracking-tight m-0">Registrar peso individual o lote</p>
          </div>

          <!-- Sanidad / Tratamiento -->
          <div class="card p-12 hover:border-gray transition-all" style="background:#141414; border:1px solid #222; cursor:pointer;" onclick="App._cerrarSubmenuRegistros(); App._abrirTratamientoSanitarioDirecto();">
            <div class="flex items-center justify-center rounded-sm mb-10" style="width:36px; height:36px; background:#0C0C0C; color:var(--p-gold); border:1px solid #222;">
              ${Icons.sanidad()}
            </div>
            <h4 class="text-xs font-black text-white uppercase tracking-wider mb-2">TRATAMIENTO</h4>
            <p class="text-[0.55rem] text-gray uppercase tracking-tight m-0">Veterinario y supresión</p>
          </div>

          <!-- Gasto Analítico -->
          <div class="card p-12 hover:border-gray transition-all" style="background:#141414; border:1px solid #222; cursor:pointer;" onclick="App._cerrarSubmenuRegistros(); App._abrirFormularioGasto({ origenModulo: 'submenu' });">
            <div class="flex items-center justify-center rounded-sm mb-10" style="width:36px; height:36px; background:#0C0C0C; color:var(--c-success); border:1px solid #222;">
              ${Icons.dinero()}
            </div>
            <h4 class="text-xs font-black text-white uppercase tracking-wider mb-2">GASTO ANALÍTICO</h4>
            <p class="text-[0.55rem] text-gray uppercase tracking-tight m-0">Imputar coste o factura</p>
          </div>

          <!-- Alta de Animal -->
          <div class="card p-12 hover:border-gray transition-all" style="background:#141414; border:1px solid #222; cursor:pointer;" onclick="App._cerrarSubmenuRegistros(); App._abrirAltaAnimalDirecto();">
            <div class="flex items-center justify-center rounded-sm mb-10" style="width:36px; height:36px; background:#0C0C0C; color:var(--c-purple); border:1px solid #222;">
              ${Icons.animales()}
            </div>
            <h4 class="text-xs font-black text-white uppercase tracking-wider mb-2">ALTA ANIMAL</h4>
            <p class="text-[0.55rem] text-gray uppercase tracking-tight m-0">Dar de alta crotal / chip</p>
          </div>

          <!-- Silo / Entrada Alimento -->
          <div class="card p-12 hover:border-gray transition-all" style="background:#141414; border:1px solid #222; cursor:pointer;" onclick="App._cerrarSubmenuRegistros(); App._abrirEntradaAlimentoSiloDirecto();">
            <div class="flex items-center justify-center rounded-sm mb-10" style="width:36px; height:36px; background:#0C0C0C; color:#4FADF5; border:1px solid #222;">
              ${Icons.fitosanitario()}
            </div>
            <h4 class="text-xs font-black text-white uppercase tracking-wider mb-2">SILOS & ALIMENTO</h4>
            <p class="text-[0.55rem] text-gray uppercase tracking-tight m-0">Carga o consumo de pienso</p>
          </div>

          <!-- Venta Masiva / Matadero -->
          <div class="card p-12 hover:border-gray transition-all" style="background:#141414; border:1px solid #222; cursor:pointer; grid-column: span 2;" onclick="App._cerrarSubmenuRegistros(); App._abrirWizardVentaMasiva();">
            <div class="flex items-center gap-10">
              <div class="flex items-center justify-center rounded-sm" style="width:36px; height:36px; background:#0C0C0C; color:var(--c-warning); border:1px solid #222; flex-shrink:0;">
                ${Icons.libroVentas()}
              </div>
              <div>
                <h4 class="text-xs font-black text-white uppercase tracking-wider mb-2">VENTA MASIVA / MATADERO</h4>
                <p class="text-[0.55rem] text-gray uppercase tracking-tight m-0">Salida comercial o carga para matadero</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
    `;

    App._cerrarSubmenuRegistros();

    const overlayEl = document.createElement('div');
    overlayEl.innerHTML = html;
    document.body.appendChild(overlayEl.firstElementChild);
  },

  _cerrarSubmenuRegistros() {
    const el = document.getElementById('submenu-registros-overlay');
    if (el) el.remove();
  },

  async _abrirTratamientoSanitarioDirecto() {
    if (window.WizardTratamiento && typeof window.WizardTratamiento.abrir === 'function') {
      await window.WizardTratamiento.abrir();
    } else {
      App.toastError("Wizard de Tratamiento no disponible");
    }
  },

  async _abrirAltaAnimalDirecto() {
    location.hash = '#/animal';
  },

  async _abrirEntradaAlimentoSiloDirecto() {
    // Get list of silos for active farm
    await App._ensureViewGroup('expro');
    const silos = await SilosView._getSilos?.() || [];
    if (silos.length === 0) {
        location.hash = '#/silos'; // No silos → go to list to create one
    } else if (silos.length === 1) {
        // Direct form for the only silo
        location.hash = '#/silos';
        setTimeout(() => SilosView._abrirFormularioSilo?.(silos[0].id), 200);
    } else {
        // Multiple silos → show selector ( fall back to silos list for now )
        location.hash = '#/silos';
    }
  },

  // ==========================================
  // HISTORIAL REPRODUCTIVO Y REFERENCIA
  // ==========================================
  async _cargarHistorialReproduccion(animalId) {
    const container = document.getElementById('tabla-reproduccion');
    if (!container) return;
    try {
      const eventos = window.Reproduccion
        ? await Reproduccion.listEventos(Number(animalId))
        : await window.db.getAll('reproduccion_eventos').then(r => r.filter(e => Number(e.animalId) === Number(animalId))).catch(() => []);
      if (!eventos || eventos.length === 0) {
        container.innerHTML = '<em class="text-333">Sin eventos reproductivos</em>';
        return;
      }
      container.innerHTML = eventos.slice(0, 10).map(e => {
        const isPos = (e.resultado || '').toLowerCase() === 'positivo';
        const isNeg = (e.resultado || '').toLowerCase() === 'negativo';
        const colorRes = isPos ? 'text-green' : (isNeg ? 'text-red' : 'text-gray-500');
        return `<div class="flex justify-between items-center text-xs py-4 row-border-dark">
          <span class="text-gold flex items-center gap-4">${Icons.calendar()} ${e.fecha || '—'}</span>
          <span class="text-ccc font-900 uppercase">${e.tipo_evento || e.tipo || 'Evento'}</span>
          <span class="${colorRes} font-bold uppercase">${e.resultado || e.notas || ''}</span>
        </div>`;
      }).join('');
    } catch (e) {
      console.warn('[App] Error cargando historial reproductivo:', e);
      container.innerHTML = '<em class="text-red">Error al cargar historial</em>';
    }
  },

  async _cargarReferenciaRebano(rebanoId, excludeAnimalId) {
    const container = document.getElementById('tabla-referencia');
    if (!container) return;
    try {
      const animales = await window.db.getAll('animales').catch(() => []);
      const companeros = animales.filter(a =>
        Number(a.rebanoId) === Number(rebanoId) &&
        Number(a.id) !== Number(excludeAnimalId) &&
        (a.estado === 'activo' || a.estado === 'Activo')
      ).slice(0, 8);
      if (companeros.length === 0) {
        container.innerHTML = '<em class="text-333">Sin compañeros de rebaño</em>';
        return;
      }
      container.innerHTML = companeros.map(a => {
        const colorEsp = window.ModoContextoHelper ? window.ModoContextoHelper.getEspecieColor(a.especie) : '#888';
        return `<div class="flex justify-between items-center text-xs py-4 row-border-dark">
          <span class="text-ccc flex items-center gap-6"><span style="color:${colorEsp}">${Icons.animales()}</span> ${a.numero_identificacion || '#'.concat(a.id)}</span>
          <span class="text-gray-600 font-900 uppercase text-[0.6rem] tracking-tighter">${a.especie || ''} · <strong class="text-white">${a.peso_actual || '—'} kg</strong></span>
        </div>`;
      }).join('');
    } catch (e) {
      console.warn('[App] Error cargando referencia rebaño:', e);
      container.innerHTML = '<em class="text-red">Error al cargar compañeros</em>';
    }
  },

  async _leerChipNFC(rfidId, crotalId) {
    // Nota técnica: Los crotales electrónicos ganaderos españoles usan RFID LF a 134.2 kHz
    // (ISO 11784/11785), incompatible con NFC de smartphone (13.56 MHz, ISO 14443/15693).
    // Este método intenta leer tags NFC estándar por si el usuario tiene tags complementarios,
    // pero NO puede leer los transpondedores electrónicos de los crotales oficiales.
    try {
      // 1️⃣ Intentar Web NFC API (NDEFReader) — solo tags NFC 13.56 MHz
      if ('NDEFReader' in window && window.isSecureContext) {
        try {
          const reader = new NDEFReader();
          await reader.scan();
          App.toast('Acerca un tag NFC al dispositivo...');

          const timeout = setTimeout(() => {
            reader.abort?.();
            App.toast('Tiempo agotado. Recuerda: los crotales ganaderos NO usan NFC (13.56 MHz) ' +
              'sino RFID LF (134.2 kHz). Usa un lector Bluetooth externo.',
              5000
            );
          }, 20000);

          return new Promise((resolve) => {
            reader.addEventListener('reading', (event) => {
              clearTimeout(timeout);
              let nfcData = '';
              try {
                for (const record of event.message.records) {
                  const decoder = new TextDecoder(record.encoding || 'utf-8');
                  nfcData += decoder.decode(record.data) || '';
                }
              } catch (_) {
                // Si falla la decodificación, usar el primer byte como hex
                const arr = new Uint8Array(event.message.records[0]?.data);
                nfcData = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
              }

              if (nfcData) {
                const rfidEl = document.getElementById(rfidId);
                const crotalEl = document.getElementById(crotalId);
                if (rfidEl) rfidEl.value = nfcData.trim();
                // Si el dato parece un código ISO 11784/11785 (numérico), formatearlo
                if (crotalEl && !crotalEl.value) {
                  crotalEl.value = nfcData.trim();
                  if (window.AnimalesView?._validarCrotalUI) {
                    window.AnimalesView._validarCrotalUI(crotalEl);
                  }
                }
                App.toast(`Tag NFC leído: ${nfcData}`, 4000);
              }
              reader.abort?.();
              resolve();
            });
          });
        } catch (webNfcErr) {
          console.warn('[NFC] Web NFC falló:', webNfcErr);
        }
      }

      // 2️⃣ Mensaje informativo si no hay Web NFC o falló
      if (!('NDEFReader' in window)) {
        App.toast('NFC en móvil NO lee crotales LF (134.2 kHz). ' +
          'Usa el botón SCAN para leer el código visual con la cámara. ' +
          'Para lectura electrónica, conecta un lector RFID Bluetooth externo (Allflex, Datamars).',
          6000
        );
      }
    } catch (err) {
      console.warn('[NFC] Error general:', err);
      App.toastError('Error al leer NFC: ' + (err.message || err));
    }
  },

  async _ensureHtml5Qrcode() {
    if (typeof Html5Qrcode !== 'undefined') return true;
    if (!App._html5QrcodeLoadPromise) {
      App._html5QrcodeLoadPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'js/html5-qrcode.min.js?v=6.28';
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
    }
    await App._html5QrcodeLoadPromise;
    return typeof Html5Qrcode !== 'undefined';
  },

  /** Carga xlsx.js bajo demanda (~700KB vía CDN) solo cuando se exporta a Excel. */
  async _ensureXLSX() {
    if (typeof XLSX !== 'undefined') return true;
    if (!App._xlsxLoadPromise) {
      App._xlsxLoadPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'js/vendor/xlsx.full.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
    }
    try { await App._xlsxLoadPromise; } catch (_) {}
    return typeof XLSX !== 'undefined';
  },

  /** Carga html2pdf.js bajo demanda (~400KB vía CDN) solo cuando se exporta a PDF. */
  async _ensureHtml2Pdf() {
    if (typeof html2pdf !== 'undefined') return true;
    if (!App._html2pdfLoadPromise) {
      App._html2pdfLoadPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'js/vendor/html2pdf.bundle.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
    }
    try { await App._html2pdfLoadPromise; } catch (_) {}
    return typeof html2pdf !== 'undefined';
  },

  /** Carga chart.js bajo demanda (~200KB vía CDN) solo cuando se renderiza un gráfico (Informes, Export). */
  async _ensureChartJs() {
    if (typeof Chart !== 'undefined') return true;
    if (!App._chartJsLoadPromise) {
      App._chartJsLoadPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'js/vendor/chart.umd.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
    }
    try { await App._chartJsLoadPromise; } catch (_) {}
    return typeof Chart !== 'undefined';
  },

  /** Carga pdf.js bajo demanda (~2MB vía CDN) solo cuando se importa PDF del Catastro (SIGPAC). */
  async _ensurePdfJs() {
    if (typeof pdfjsLib !== 'undefined') return true;
    if (!App._pdfJsLoadPromise) {
      // pdf.js 4.x se distribuye solo como modulo ES: no define window.pdfjsLib
      // por si mismo, hay que importarlo y publicarlo. Ruta absoluta porque en
      // un script clasico import() resuelve contra la URL del script, no del
      // documento. Servido en local: la app es offline-first y la 3.11.174 del
      // CDN arrastra GHSA-wgrm-67xf-hhpq.
      App._pdfJsLoadPromise = import('/js/vendor/pdf.min.mjs')
        .then((mod) => { window.pdfjsLib = mod; return mod; });
    }
    try { await App._pdfJsLoadPromise; } catch (e) {
      // Sin resetear, una promesa rechazada deja pdf.js inservible hasta recargar.
      App._pdfJsLoadPromise = null;
      console.warn('[PDF] no se pudo cargar pdf.js:', e && e.message);
    }
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/vendor/pdf.worker.min.mjs';
      return true;
    }
    return false;
  },

  // ==========================================
  // LAZY LOADING DE VISTAS POR GRUPO (P0-4)
  // ==========================================
  // Las vistas de cada pilar (y sus pestañas internas) se cargan juntas la
  // primera vez que se visita una ruta de ese grupo, en vez de siempre al
  // arrancar. Los ficheros "core" (dashboard, ajustes, wizards, modelos,
  // servicios) siguen cargando siempre, porque el Dashboard los usa todos
  // desde sus accesos directos.
  _viewGroups: {
    gegan: ['js/views/sanidad-view.js', 'js/views/patrimonio-view.js', 'js/views/ganaderia-view.js', 'js/views/animales-view.js', 'js/views/rebanos-view.js', 'js/views/zonas-view.js', 'js/views/importar-zonas-view.js', 'js/views/instalaciones-view.js', 'js/views/saneamientos-view.js', 'js/views/subexplotaciones-view.js', 'js/views/botiquin-view.js', 'js/views/bitacora-animal-view.js', 'js/views/margen-animal-view.js', 'js/guides/gegan-sanidad.js', 'js/guides/gegan-panoramica.js', 'js/guides/gegan-animales.js', 'js/guides/gegan-rebanos.js', 'js/guides/gegan-patrimonio.js', 'js/guides/gegan-zonas.js'],
    expro: ['js/views/explotacion-view.js', 'js/views/silos-view.js', 'js/views/fitosanitarios-view.js', 'js/views/gastos-view.js', 'js/views/proveedores-view.js', 'js/views/wizards/wizard-traslado.js', 'js/views/wizards/wizard-censo.js', 'js/views/wizards/wizard-crotales.js', 'js/views/wizards/wizard-guia-movimiento.js', 'js/guides/expro-panoramica.js', 'js/guides/expro-explotacion.js', 'js/guides/expro-lacteo.js', 'js/guides/expro-silos.js', 'js/guides/expro-fitosanitarios.js', 'js/guides/expro-gastos.js', 'js/guides/expro-proveedores.js', 'js/guides/expro-tramites.js'],
    comer: ['js/views/comercializacion-view.js', 'js/views/compradores-view.js', 'js/views/contratos-view.js', 'js/views/transportistas-view.js', 'js/guides/comer-panoramica.js', 'js/guides/comer-leche.js', 'js/guides/comer-carne.js', 'js/guides/comer-compradores.js', 'js/guides/comer-contratos.js', 'js/guides/comer-transportistas.js'],
    informes: ['js/views/informes-analytics.js', 'js/views/informes-view.js', 'js/views/informes-data.js', 'js/views/informes-export.js'],
    cuaderno: ['js/views/cuaderno-view.js'],
    documentos: ['js/views/documentos-view.js'],
    manuales: ['js/views/manuales-view.js'],
    trazabilidad: ['js/views/trazabilidad-view.js'],
    'albaranes-ventas': ['js/views/albaranes-ventas-view.js'],
    sistema: ['js/views/config-sistema-view.js'],
  },

  // Ruta (ya normalizada por redirectMap) -> grupo que debe estar cargado antes de despachar.
  _routeGroups: {
    '/ganaderia': 'gegan', '/rebanos': 'gegan', '/animales': 'gegan', '/rebano': 'gegan', '/animal': 'gegan', '/zonas': 'gegan', '/zona': 'gegan', '/importar-zonas': 'gegan', '/instalaciones': 'gegan', '/instalacion': 'gegan', '/saneamientos': 'gegan', '/saneamiento': 'gegan', '/subexplotaciones': 'gegan', '/subexplotacion': 'gegan', '/botiquin': 'gegan', '/botiquin-producto': 'gegan', '/animal-bitacora': 'gegan', '/margen-animal': 'gegan',
    '/explotacion': 'expro', '/silos': 'expro', '/fitosanitario': 'expro', '/gastos': 'expro', '/proveedores': 'expro', '/proveedor': 'expro',
    '/comercializacion': 'comer', '/compradores': 'comer', '/contratos': 'comer', '/transportistas': 'comer', '/comprador': 'comer', '/contrato': 'comer',
    '/informes': 'informes', '/alertas': 'informes',
    '/cuaderno': 'cuaderno',
    '/documentos': 'documentos',
    '/manuales': 'manuales',
    '/trazabilidad': 'trazabilidad',
    '/albaranes-ventas': 'albaranes-ventas',
    '/sistema': 'sistema',
  },

  _viewGroupLoadPromises: {},

  /** Carga (una sola vez) todos los archivos de un grupo de vistas. Descargan en paralelo, pero
   *  se ejecutan en el orden del array (s.async = false) porque algunos ficheros del mismo grupo
   *  (p.ej. informes-data.js/informes-export.js) extienden con Object.assign la vista definida
   *  por el primer fichero, y necesitan que esta ya exista en window al ejecutarse. */
  async _ensureViewGroup(groupName) {
    const files = App._viewGroups[groupName];
    if (!files) return true;
    if (!App._viewGroupLoadPromises[groupName]) {
      App._viewGroupLoadPromises[groupName] = Promise.all(files.map(src => new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src + '?v=6.74.0';
        s.async = false;
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      })));
    }
    try { await App._viewGroupLoadPromises[groupName]; return true; } catch (e) {
      console.error('[LazyView] Error cargando grupo ' + groupName, e);
      // La promesa fallida NO se queda en cache: si se conserva, el grupo queda
      // envenenado para el resto de la sesion y la vista no vuelve a intentarse
      // nunca, por mucho que el usuario navegue a ella.
      delete App._viewGroupLoadPromises[groupName];
      return false;
    }
  },

  /** Punto único de entrada desde route(): asegura el grupo de la ruta actual antes de despachar. */
  async _ensureRouteScripts(path) {
    const group = App._routeGroups[path];
    if (!group) return true;
    // Se DEVUELVE el resultado: antes se ignoraba, route() seguia como si el grupo
    // hubiera cargado, el metodo de la vista no existia y el loader "Cargando..."
    // se quedaba en pantalla para siempre, sin error ni aviso.
    return await App._ensureViewGroup(group);
  },

  async _escanearCrotal(inputId) {
    const isCapacitor = window.Capacitor?.isNativePlatform?.() || window.hasOwnProperty('Capacitor');
    const BarcodeScanner = window.Capacitor?.Plugins?.BarcodeScanner;

    // 1️⃣ Intentar con Capacitor nativo (Android) — plugin @capacitor-mlkit/barcode-scanning.
    // scan() abre la UI del Google Code Scanner (fullscreen, con cancelar propio): sin
    // manipular visibilidad del WebView ni botones flotantes como con el plugin antiguo.
    if (BarcodeScanner && isCapacitor) {
      try {
        console.log('[SCAN] Intentando escáner nativo MLKit...');
        const perm = await BarcodeScanner.requestPermissions();
        console.log('[SCAN] Permiso:', JSON.stringify(perm));
        if (perm.camera !== 'granted' && perm.camera !== 'limited') {
          App.toastError(perm.camera === 'denied'
            ? 'Permiso denegado permanentemente. Actívalo en Ajustes > Apps > Permisos.'
            : 'Permiso de cámara no concedido');
          return;
        }

        const { barcodes } = await BarcodeScanner.scan();
        const content = barcodes?.[0]?.rawValue;
        if (content) {
          return this._procesarCrotalEscaneado(inputId, content.trim());
        }
        return; // usuario canceló desde la UI nativa
      } catch (err) {
        // 'canceled' llega como excepción en algunas versiones: no es un error real
        if (String(err?.message || err).toLowerCase().includes('cancel')) {
          App.toast('Escaneo cancelado');
          return;
        }
        console.error('[SCAN] Error nativo:', err);
        App.toast('Escáner nativo falló, usando cámara web...', 2000);
      }
    }

    // 2️⃣ Fallback Web con html5-qrcode (carga diferida: ~366KB que la mayoría de sesiones no usan)
    if (typeof Html5Qrcode === 'undefined') {
      try {
        await App._ensureHtml5Qrcode();
      } catch (_) {
        App.toastError('Librería de escaneo no disponible. Introduce el crotal manualmente.');
        return;
      }
    }

    // Crear overlay con cámara en vivo
    const overlay = document.createElement('div');
    overlay.id = 'scanner-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#000;display:flex;flex-direction:column;';
    overlay.innerHTML = `
      <div id="scanner-container" class="flex-1 w-full overflow-hidden"></div>
      <div class="p-14 text-center bg-dark">
        <div class="text-white text-sm mb-8">Enfoca el código de barras o QR del crotal</div>
        <button class="btn btn-primary btn-sm btn--red" onclick="App._cancelarScanWeb()">✕ Cancelar</button>
      </div>`;
    document.body.appendChild(overlay);
    window._scanOverlay = overlay;

    // Wait for DOM to be ready
    await new Promise(r => setTimeout(r, 500));

    const container = document.getElementById('scanner-container');
    const html5QrCode = new Html5Qrcode('scanner-container');
    window._html5QrCode = html5QrCode;

    try {
      console.log('[SCAN] Iniciando cámara web...');

      // For Capacitor WebView, request camera directly with getUserMedia
      if (isCapacitor && navigator.mediaDevices?.getUserMedia) {
        try {
          console.log('[SCAN] Solicitando acceso a cámara...');
          // Use ideal instead of exact to avoid strict constraint failures
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
          });
          console.log('[SCAN] Cámara obtenida correctamente');

          // Create video element and attach stream directly
          const video = document.createElement('video');
          video.style.cssText = 'width:100%;height:100%;object-fit:cover;';
          video.setAttribute('playsinline', 'true');
          video.setAttribute('autoplay', 'true');
          video.muted = true;
          video.srcObject = stream;
          container.innerHTML = '';
          container.appendChild(video);

          await video.play();
          console.log('[SCAN] Video reproduciéndose');

          // Use html5-qrcode scanFile with the video element
          await html5QrCode.scanFile(video, true);
          
          // Set up continuous scanning using the stream
          const scanInterval = setInterval(async () => {
            try {
              const decodedText = await html5QrCode.scanFile(video, true);
              if (decodedText) {
                clearInterval(scanInterval);
                stream.getTracks().forEach(track => track.stop());
                this._cancelarScanWeb();
                this._procesarCrotalEscaneado(inputId, decodedText.trim());
              }
            } catch (e) {
              // No barcode detected yet, continue scanning
            }
          }, 200);

          // Store interval for cleanup
          window._scanInterval = scanInterval;
          console.log('[SCAN] Escáner iniciado correctamente');
        } catch (permErr) {
          console.error('[SCAN] Error accediendo a cámara:', permErr);
          App.toastError('No se pudo acceder a la cámara. Introduce el crotal manualmente.');
          this._cancelarScanWeb();
        }
      } else {
        // Non-Capacitor: use default html5-qrcode behavior
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 }, formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39, Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.DATA_MATRIX, Html5QrcodeSupportedFormats.ITF, Html5QrcodeSupportedFormats.AZTEC] },
          (decodedText) => {
            this._cancelarScanWeb();
            this._procesarCrotalEscaneado(inputId, decodedText.trim());
          },
          () => {}
        );
        console.log('[SCAN] Cámara iniciada correctamente');
      }
    } catch (err) {
      console.error('[SCAN] Error html5-qrcode:', err);
      App.toastError('No se pudo iniciar la cámara. Introduce el crotal manualmente.');
      this._cancelarScanWeb();
    }
  },

  /** Procesa el código escaneado y lo asigna al input */
  _procesarCrotalEscaneado(inputId, codigo) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.value = codigo.toUpperCase();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    if (window.AnimalesView?._validarCrotalUI) {
      window.AnimalesView._validarCrotalUI(input);
    }
    App.toast(`Crotal leído: ${codigo.toUpperCase()}`, 'success', 4000);
  },

  /** Cancela el escaneo web y libera recursos */
  _cancelarScanWeb() {
    if (window._scanInterval) {
      clearInterval(window._scanInterval);
      window._scanInterval = null;
    }
    if (window._html5QrCode) {
      try { window._html5QrCode.stop(); } catch (_) {}
      window._html5QrCode = null;
    }
    const ov = document.getElementById('scanner-overlay');
    if (ov) ov.remove();
  },
  async _abrirWizardReproduccion(animalId) {
    if (!window.Reproduccion) { this.toastError('Módulo de reproducción no disponible'); return; }
    try {
      const animal = await window.db.get('animales', Number(animalId)).catch(() => null);
      if (!animal) { this.toastError('Animal no encontrado'); return; }

      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:20px;';
      overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
      overlay.innerHTML = `
        <div class="card w-full max-w-450 border-top-4-violet p-24 modal-scroll">
          <div class="flex justify-between items-center mb-16">
            <div class="font-950 text-white text-lg uppercase tracking-widest flex items-center gap-10">
                <span class="text-violet">${Icons.reproduccion()}</span> GESTIÓN REPRO
            </div>
            <button onclick="this.closest('.card').parentElement.remove()" class="btn-overlay-close text-gray">✕</button>
          </div>
          <div class="mb-16 text-ccc text-xs uppercase font-800 tracking-wider bg-black p-10 rounded-sm border border-222">
            Animal: <strong class="text-white ml-4">${animal.numero_identificacion || '#'.concat(animal.id)}</strong>
          </div>
          <div class="wizard-input-group">
            <label class="wizard-label">TIPO DE EVENTO</label>
            <select id="wiz-repro-tipo" class="wizard-input wizard-select font-900" onchange="App._onReproTipoChange(this.value)">
              <option value="Celo">Celo</option>
              <option value="Inseminación Artificial" selected>Inseminación Artificial</option>
              <option value="Monta Natural">Monta Natural</option>
              <option value="Diagnóstico Gestación">Diagnóstico Gestación</option>
              <option value="Parto">Parto</option>
              <option value="Aborto">Aborto</option>
              <option value="Destete">Destete</option>
              <option value="Secado">Secado</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-10">
            <div class="wizard-input-group">
              <label class="wizard-label">FECHA</label>
              <input type="date" id="wiz-repro-fecha" class="wizard-input font-800" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="wizard-input-group">
              <label class="wizard-label">HORA (OPC.)</label>
              <input type="time" id="wiz-repro-hora" class="wizard-input font-800">
            </div>
          </div>
          <div id="wiz-repro-cubricion" class="d-none animate-in">
            <div class="wizard-input-group">
              <label class="wizard-label">Nº LOTE (OPC.)</label>
              <input type="text" id="wiz-repro-lote" class="wizard-input uppercase font-800" placeholder="L-00A">
            </div>
            <div id="wiz-repro-macho-wrap" class="d-none wizard-input-group">
              <label class="wizard-label">Nº MACHO / SEMENTAL (OPC.)</label>
              <input type="text" id="wiz-repro-macho" class="wizard-input uppercase font-800" placeholder="Nº IDENTIFICACIÓN DEL SEMENTAL">
            </div>
          </div>
          <div id="wiz-repro-parto" class="d-none animate-in">
            <div class="grid grid-cols-2 gap-10">
              <div class="wizard-input-group">
                <label class="wizard-label">CRÍAS VIVAS</label>
                <input type="number" id="wiz-repro-crias-vivas" class="wizard-input font-900 text-lg text-green" min="0" max="10" value="1" oninput="App._renderCriasParto()">
              </div>
              <div class="wizard-input-group">
                <label class="wizard-label">CRÍAS MUERTAS</label>
                <input type="number" id="wiz-repro-crias-muertas" class="wizard-input font-900 text-lg text-red" min="0" max="10" value="0">
              </div>
            </div>
            <div class="text-[0.6rem] text-aaa uppercase font-700 mb-10 leading-relaxed">Cada cría viva se dará de alta en el censo con su crotal y vínculo a la madre.</div>
            <div id="wiz-repro-crias-list"></div>
          </div>
          <div class="wizard-input-group">
            <label class="wizard-label">RESULTADO / NOTAS</label>
            <input type="text" id="wiz-repro-notas" class="wizard-input uppercase font-700" placeholder="EJ: POSITIVO, NEGATIVO...">
          </div>
          <div id="wiz-repro-msg" class="d-none msg-feedback"></div>
          <div class="mt-20 flex gap-10">
            <button id="wiz-repro-guardar" class="widget-link-btn widget-link-btn--neon neon-success flex-1" onclick="App._guardarEventoReproduccion('${animalId}')">
                ${Icons.guardar()}
                <span class="widget-link-label">GUARDAR</span>
            </button>
            <button class="widget-link-btn widget-link-btn--neon neon-danger flex-1" onclick="this.closest('[style]').remove()">
                ${Icons.cerrar()}
                <span class="widget-link-label">CANCELAR</span>
            </button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      // Sincronizar visibilidad de campos condicionales (lote/nº macho) con el
      // tipo de evento preseleccionado — el <select> no dispara 'change' solo.
      this._onReproTipoChange(document.getElementById('wiz-repro-tipo')?.value);
    } catch (e) {
      console.error('[App] Error abriendo wizard reproducción:', e);
      this.toastError('Error al abrir wizard');
    }
  },

  _onReproTipoChange(tipo) {
    const sec = document.getElementById('wiz-repro-parto');
    if (sec) {
      if (tipo === 'Parto') {
        sec.style.display = 'block';
        this._renderCriasParto();
      } else {
        sec.style.display = 'none';
      }
    }
    // Lote/nº macho: campos que capturan los lectores RFID de campo en
    // Cubriciones/Montas (ver docs/PLAN-MEJORA-SIGGAN.md punto 6). El nº de
    // macho solo aplica a monta natural (en IA no hay semental físico).
    const esCubricion = tipo === 'Inseminación Artificial' || tipo === 'Monta Natural';
    const cubricionWrap = document.getElementById('wiz-repro-cubricion');
    if (cubricionWrap) cubricionWrap.style.display = esCubricion ? 'block' : 'none';
    const machoWrap = document.getElementById('wiz-repro-macho-wrap');
    if (machoWrap) machoWrap.style.display = tipo === 'Monta Natural' ? 'block' : 'none';
  },

  _renderCriasParto() {
    const cont = document.getElementById('wiz-repro-crias-list');
    if (!cont) return;
    const n = Math.max(0, Math.min(10, parseInt(document.getElementById('wiz-repro-crias-vivas')?.value || '0', 10) || 0));
    // Preservar lo que el usuario ya hubiera escrito
    const prev = [];
    cont.querySelectorAll('[data-cria-row]').forEach(row => {
      prev.push({
        crotal: row.querySelector('.cria-crotal')?.value || '',
        sexo: row.querySelector('.cria-sexo')?.value || 'H'
      });
    });
    let html = '';
    for (let i = 0; i < n; i++) {
      const p = prev[i] || { crotal: '', sexo: 'H' };
      html += `<div data-cria-row class="grid grid-cols-2 gap-10 mb-8 row-sep-222">
          <div class="wizard-input-group m-0">
            <label class="wizard-label">CROTAL CRÍA ${i + 1}</label>
            <input type="text" class="wizard-input cria-crotal input-crotal-std" maxlength="14" placeholder="ES + 12 dígitos" value="${p.crotal}">
          </div>
          <div class="wizard-input-group m-0">
            <label class="wizard-label">SEXO</label>
            <select class="wizard-input wizard-select cria-sexo">
              <option value="H" ${p.sexo === 'H' ? 'selected' : ''}>Hembra</option>
              <option value="M" ${p.sexo === 'M' ? 'selected' : ''}>Macho</option>
            </select>
          </div>
        </div>`;
    }
    cont.innerHTML = html;
  },

  _reproMsg(msg, tipo) {
    const el = document.getElementById('wiz-repro-msg');
    if (!el) return;
    if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
    const ok = tipo === 'ok';
    el.style.background = ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
    el.style.color = ok ? '#C5FA50' : '#E8555F';
    el.style.border = `1px solid ${ok ? '#C5FA50' : '#E8555F'}`;
    el.innerHTML = `<div class="flex items-center gap-8 font-900 uppercase text-[0.65rem] tracking-wider">${ok ? Icons.check() : Icons.alerta()} ${msg}</div>`;
    el.style.display = 'block';
  },

  async _guardarEventoReproduccion(animalId) {
    if (this._guardandoRepro) return;
    const overlay = document.querySelector('[style*="z-index:9999"]');
    const btn = document.getElementById('wiz-repro-guardar');
    const tipo = document.getElementById('wiz-repro-tipo')?.value;
    const fecha = document.getElementById('wiz-repro-fecha')?.value;
    const hora = document.getElementById('wiz-repro-hora')?.value || '';
    const lote = document.getElementById('wiz-repro-lote')?.value?.trim().toUpperCase() || '';
    const numeroMacho = document.getElementById('wiz-repro-macho')?.value?.trim().toUpperCase() || '';
    const notas = document.getElementById('wiz-repro-notas')?.value?.trim() || '';
    if (!tipo || !fecha) { this._reproMsg('Completa el tipo de evento y la fecha', 'error'); return; }
    this._reproMsg('');
    this._guardandoRepro = true;
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; btn.style.opacity = '0.6'; }
    try {
      const fincaId = await Fincas.getActiveId();
      const payload = {
        animalId: Number(animalId),
        tipo_evento: tipo,
        fecha,
        hora,
        notas,
        resultado: notas,
        fincaId
      };
      if (tipo === 'Inseminación Artificial' || tipo === 'Monta Natural') {
        payload.lote = lote;
      }
      if (tipo === 'Monta Natural') {
        payload.numero_macho = numeroMacho;
      }

      if (tipo === 'Parto') {
        const muertas = parseInt(document.getElementById('wiz-repro-crias-muertas')?.value || '0', 10) || 0;
        const filas = Array.from(document.querySelectorAll('#wiz-repro-crias-list [data-cria-row]'));
        const crias = [];
        for (const row of filas) {
          const input = row.querySelector('.cria-crotal');
          const crotal = (input?.value || '').trim().toUpperCase();
          const sexo = row.querySelector('.cria-sexo')?.value || 'H';
          if (input) input.style.border = '';
          if (!crotal) {
            if (input) { input.style.border = '2px solid #E8555F'; input.focus(); }
            this._reproMsg('Indica el crotal de todas las crías vivas', 'error');
            return;
          }
          if (window.ErrorHandler && !window.ErrorHandler.isCrotalValido(crotal)) {
            if (input) { input.style.border = '2px solid #E8555F'; input.focus(); }
            this._reproMsg(`Crotal inválido: ${crotal}. Formato: ES + 12 dígitos (ej: ES123456789012)`, 'error');
            return;
          }
          crias.push({ crotal, sexo });
        }
        payload.crias = crias;
        payload.crias_vivas = crias.length;
        payload.crias_muertas = muertas;
      }

      await Reproduccion.saveEvento(payload);
      if (overlay) overlay.remove();
      const nCrias = (payload.crias || []).length;
      this.toast(tipo === 'Parto' && nCrias
        ? `Parto guardado · ${nCrias} cría(s) dada(s) de alta`
        : 'Evento reproductivo guardado', 'success');
      // Recargar historial
      this._cargarHistorialReproduccion(animalId);
    } catch (e) {
      console.error('[App] Error guardando evento:', e);
      this._reproMsg('Error al guardar: ' + (e?.message || e), 'error');
    } finally {
      this._guardandoRepro = false;
      const b = document.getElementById('wiz-repro-guardar');
      if (b) { b.disabled = false; b.textContent = 'Guardar'; b.style.opacity = '1'; }
    }
  },

  // ==========================================
  // DETALLES INDIVIDUALES
  // ==========================================
  _abrirDetalleVentaCarne(id) {
    location.hash = `/venta-carne?id=${id}`;
  },

  async renderDetalleVentaCarne(params) {
    const id = params.get("id");
    if (!id) return;
    try {
      const v = await window.db.get("comercializacion_carne", parseInt(id));
      if (!v) throw new Error("Registro de venta no encontrado");

      const animal = await window.db.get("animales", v.animalId);

      document.getElementById("app-content").innerHTML = `
        <div class="mb-20">
          <a href="#/comercializacion?tab=carne" class="text-gold no-underline">← Volver</a>
          <h2 class="text-white mt-10">Detalle de Venta</h2>
        </div>

        <div class="card mb-20 border-top-5-danger">
          <div class="flex justify-between items-center border-bottom-222 pb-10 mb-15">
            <div>
              <div class="text-gray text-tiny uppercase font-bold">Albarán Nº</div>
              <div class="text-white font-black text-lg">${v.numero_albaran || 'S/N'}</div>
            </div>
            <div class="text-right">
              <div class="text-gray text-tiny uppercase font-bold">Fecha</div>
              <div class="text-white font-bold">${new Date(v.fechaSacrificio).toLocaleDateString()}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-15 mb-20">
            <div class="bg-dark p-10 rounded">
              <small class="text-gray uppercase font-bold text-tiny">Animal</small>
              <div class="text-gold font-black">${animal?.numero_identificacion || 'Desconocido'}</div>
              <div class="text-gray text-xs">${v.snap_especie || ''} - ${v.snap_tipo || ''}</div>
            </div>
            <div class="bg-dark p-10 rounded text-right">
              <small class="text-gray uppercase font-bold text-tiny">Rendimiento</small>
              <div class="text-green font-black text-lg">${v.rendimientoCanal || 0}%</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-15 mb-20">
            <div>
              <label class="text-gray text-tiny uppercase font-bold">Peso Vivo</label>
              <div class="text-white font-bold">${v.pesoVivo || 0} kg</div>
            </div>
            <div class="text-right">
              <label class="text-gray text-tiny uppercase font-bold">Peso Canal</label>
              <div class="text-white font-black text-lg">${v.pesoCanal || 0} kg</div>
            </div>
          </div>

          <div class="border-top-222 pt-15 mt-15">
            <div class="text-gray text-tiny uppercase font-bold mb-4">Comprador / Destino</div>
            <div class="text-white font-bold">${v.razonSocial || 'N/D'}</div>
            <div class="text-gray text-xs">NIF: ${v.nifComprador || 'N/D'}</div>
            <div class="text-gray text-xs mt-4">${v.codigoMatadero || ''}</div>
          </div>

          <div class="flex gap-10 mt-30">
            <button class="btn btn-primary flex-1 btn--red" onclick="App._reimprimirAlbaranCarne(${v.id})">
              ${Icons.documento()} REIMPRIMIR ALBARÁN
            </button>
            <button class="btn btn-secondary btn--dark-red" onclick="App._eliminarVentaCarneDetalle(${v.id})">
              ${Icons.eliminar()}
            </button>
          </div>
        </div>

        <div class="card bg-darker border-left-333">
          <h4 class="text-gray text-xs uppercase font-bold mb-8">Información de Trazabilidad</h4>
          <div class="grid grid-cols-2 gap-8 text-xs text-aaa">
            <div>Guía Sanitaria:</div><div class="text-white text-right">${v.numero_Guia_Sanitaria || '-'}</div>
            <div>Documento ICA:</div><div class="text-white text-right">${v.codigoDocumento_ICA || '-'}</div>
            <div>Transportista:</div><div class="text-white text-right">${v.nombreTransportista || '-'}</div>
            <div>Matrícula:</div><div class="text-white text-right">${v.matriculaTransportista || '-'}</div>
          </div>
        </div>
      `;
    } catch (e) {
      this.toastError(e.message);
      location.hash = "/comercializacion?tab=carne";
    }
  },

  async _reimprimirAlbaranCarne(id) {
    try {
      const v = await window.db.get("comercializacion_carne", id);
      const est = await window.Trazabilidad.generarEstructuraAlbaran(window.db, v, "carne");
      await this.imprimirAlbaran(est, "carne");
    } catch (e) {
      this.toastError("Error al generar albarán: " + e.message);
    }
  },

  async _eliminarVentaCarneDetalle(id) {
    if (!await Confirm.confirm("Eliminar Registro de Venta", "¿Eliminar este registro de venta? El animal volverá a estar ACTIVO en el censo.", true)) return;
    try {
      const v = await window.db.get("comercializacion_carne", id);
      if (v.animalId) {
        const a = await window.db.get("animales", v.animalId);
        if (a) {
          a.estado = "activo";
          await Animales.save(a);
        }
      }
      if (v?.movimientoId && window.Movimientos?.delete) {
        await window.Movimientos.delete(v.movimientoId).catch(() => {});
      }
      await window.db.delete("comercializacion_carne", id);
      this.toast("Registro de venta eliminado correctamente");
      location.hash = "/comercializacion?tab=carne";
    } catch (e) {
      this.toastError(e.message);
    }
  },

  async renderDetalleLeche(params) {
    const id = params.get("id");
    const e = await window.db.get("comercializacion_leche", parseInt(id));
    document.getElementById("app-content").innerHTML = `
            <div class="mb-20"><a href="#/comercializacion?tab=leche" class="text-gold" class="no-underline">← Volver</a><h2>${Icons.leche()} Analítica de Tanque</h2></div>
            <div class="card border-top-5-gold">
                <div class="grid grid-cols-2 gap-12">
                    <div><label>Volumen (L)</label><input type="number" id="le-cant" value="${e.cantidad
      }" class="premium-input"></div>
                    <div><label>Precio (€/L)</label><input type="number" id="le-pb" value="${e.precioBase
      }" class="premium-input"></div>
                </div>
                <div class="grid grid-cols-2 gap-12 mt-20">
                    <div><label>Materia Grasa (%)</label><input type="number" id="le-grasa" value="${e.laboratorio?.grasa || 0
      }" step="0.01" class="premium-input"></div>
                    <div><label>Proteína (%)</label><input type="number" id="le-prot" value="${e.laboratorio?.proteina || 0
      }" step="0.01" class="premium-input"></div>
                </div>
                <div class="grid grid-cols-2 gap-12 mt-12">
                    <div><label>Somáticas (cel/mL)</label><input type="number" id="le-som" value="${e.laboratorio?.somaticas || 0
      }" class="premium-input"></div>
                    <div><label>Gérmenes (UFC/mL)</label><input type="number" id="le-ger" value="${e.laboratorio?.germenes || 0
      }" class="premium-input"></div>
                </div>
                <div class="mt-20"><label>Control de Antibióticos</label><select id="le-ant" class="premium-input"><option value="false" ${!e.antibioticos ? "selected" : ""
      }>NEGATIVO (Apto)</option><option value="true" ${e.antibioticos ? "selected" : ""
      }>POSITIVO (Alerta Crítica)</option></select></div>
                <button class="btn btn-primary mt-25 btn--gold" onclick="App._guardarEdicionLeche(${id})">ACTUALIZAR RESULTADOS</button>
            </div>`;
  },

  async _guardarEdicionLeche(id) {
    try {
      const e = await window.db.get("comercializacion_leche", id);
      const anterior = {
        cantidad: e.cantidad,
        precioBase: e.precioBase,
        laboratorio: { ...(e.laboratorio || {}) },
        antibioticos: e.antibioticos,
        estadoAnalitica: e.estadoAnalitica,
      };
      e.cantidad = parseFloat(document.getElementById("le-cant").value);
      e.precioBase = parseFloat(document.getElementById("le-pb").value);
      e.laboratorio = {
        grasa: parseFloat(document.getElementById("le-grasa").value),
        proteina: parseFloat(document.getElementById("le-prot").value),
        somaticas: parseInt(document.getElementById("le-som").value),
        germenes: parseInt(document.getElementById("le-ger").value),
        antibioticos: document.getElementById("le-ant").value === "true",
      };
      e.antibioticos = e.laboratorio.antibioticos;
      e.estadoAnalitica = e.antibioticos ? "Alerta Crítica" : "Validado";
      const cambios = {};
      if (anterior.cantidad !== e.cantidad) cambios.cantidad = { antes: anterior.cantidad, despues: e.cantidad };
      if (anterior.precioBase !== e.precioBase) cambios.precioBase = { antes: anterior.precioBase, despues: e.precioBase };
      ["grasa", "proteina", "somaticas", "germenes", "antibioticos"].forEach((k) => {
        const a = anterior.laboratorio?.[k];
        const d = e.laboratorio?.[k];
        if (a !== d) cambios[`laboratorio.${k}`] = { antes: a, despues: d };
      });
      if (Object.keys(cambios).length > 0) {
        e.auditoria_analitica = Array.isArray(e.auditoria_analitica) ? e.auditoria_analitica : [];
        e.auditoria_analitica.push({
          fecha: new Date().toISOString(),
          cambios,
        });
      }
      await window.db.put("comercializacion_leche", e);
      this.toast("Registro lácteo actualizado.");
      location.hash = "#/comercializacion?tab=leche";
    } catch (e) {
      this.toastError(e.message);
    }
  },

  async renderDetalleGasto(params) {
    const id = params.get("id");
    const g = await window.db.get("gastos_ganaderia", parseInt(id));
    document.getElementById("app-content").innerHTML = `
            <div class="mb-20"><a href="#/comercializacion?tab=gastos" class="text-gold" class="no-underline">← Volver</a><h2>Ficha de Gasto</h2></div>
            <div class="card border-top-4-blue">
                <label>Concepto</label><input type="text" id="ge-con" value="${g.concepto}" class="premium-input mb-10">
                <label>Monto (€)</label><input type="number" id="ge-mon" value="${g.monto}" class="premium-input">
                <div class="flex gap-10 mt-25">
                    <button class="btn btn-primary flex-2 btn--blue" onclick="App._guardarEdicionGasto(${id})">${Icons.guardar()} GUARDAR</button>
                    <button class="btn btn-secondary flex-1 btn--dark-red" onclick="App._eliminarGasto(${id})">${Icons.eliminar()} BORRAR</button>
                </div>
            </div>`;
  },

  async _guardarEdicionGasto(id) {
    const g = await window.db.get("gastos_ganaderia", id);
    g.concepto = document.getElementById("ge-con").value;
    g.monto = parseFloat(document.getElementById("ge-mon").value);
    await window.db.put("gastos_ganaderia", g);
    this.toast("Gasto actualizado.");
    location.hash = "#/comercializacion?tab=gastos";
  },

  async _eliminarVentaCarne(id) {
    if (!await Confirm.confirm("Eliminar Venta", "¿Eliminar registro de venta? El animal volverá a estar ACTIVO.", true)) return;
    try {
      const v = await window.db.get("comercializacion_carne", id);
      const a = await window.db.get("animales", v.animalId);
      if (a) {
        a.estado = "activo";
        await Animales.save(a);
      }
      if (v?.movimientoId && window.Movimientos?.delete) {
        await window.Movimientos.delete(v.movimientoId).catch(() => {});
      }
      await window.db.delete("comercializacion_carne", id);
      this.toast("Venta eliminada.");
      if (window.ComercializacionView) window.ComercializacionView.render(new Map([["tab", "carne"]]));
    } catch (e) {
      this.toastError(e.message);
    }
  },

  async _eliminarGasto(id) {
    if (!await Confirm.confirm("Eliminar Gasto", "¿Eliminar este registro de gasto?", true)) return;
    try {
      await Gastos.delete(id);
      this.toast("Gasto eliminado.");
      location.hash = "#/comercializacion?tab=gastos";
    } catch (e) {
      this.toastError(e.message);
    }
  },

  // [Eliminado] renderDocumentosLegales + renderCuadernoDigital — secciones obsoletas

  // ==========================================
  // VISTAS PRINCIPALES (delegadas a views/)
  // ==========================================

  async renderDashboard() {
    if (window.DashboardView) { await DashboardView.render(); }
  },

  async renderGanaderia(params) {
    if (window.GanaderiaView) {
      const tab = params?.get ? params.get('tab') : null;
      if (tab) {
        GanaderiaView._activeSubModule = tab;
      }
      await GanaderiaView.render();
    }
  },

  async renderRebanos() {
    if (window.GanaderiaView) {
      GanaderiaView._activeSubModule = 'rebanos';
      await this.renderGanaderia();
    }
  },

  async renderDetalleRebano(params) {
    if (window.RebanosView) { await RebanosView.renderDetalle(params); }
  },

  async renderZonas() {
    if (window.ExplotacionView) {
      ExplotacionView._activeSubModule = 'zonas';
      await this.renderExplotacion();
    }
  },

  async renderDetalleZona(params) {
    if (window.ZonasView) { await ZonasView.renderDetalle(params); }
  },

  async renderInstalaciones() {
    if (window.InstalacionesView) { await InstalacionesView.render(); }
  },

  async renderDetalleInstalacion(params) {
    if (window.InstalacionesView) { await InstalacionesView.renderDetalle(params); }
  },

  async renderSaneamientos() {
    if (window.SaneamientosView) { await SaneamientosView.render(); }
  },

  async renderDetalleSaneamiento(params) {
    if (window.SaneamientosView) { await SaneamientosView.renderDetalle(params); }
  },

  async renderSubexplotaciones() {
    if (window.SubexplotacionesView) { await SubexplotacionesView.render(); }
  },

  async renderDetalleSubexplotacion(params) {
    if (window.SubexplotacionesView) { await SubexplotacionesView.renderDetalle(params); }
  },

  async renderBotiquin() {
    if (window.BotiquinView) { await BotiquinView.render(); }
  },

  async renderDetalleBotiquin(params) {
    if (window.BotiquinView) { await BotiquinView.renderDetalle(params); }
  },

  async renderBitacoraAnimal(params) {
    if (window.BitacoraAnimalView) { await BitacoraAnimalView.render(params); }
  },

  async renderAnimales() {
    if (window.GanaderiaView) {
      GanaderiaView._activeSubModule = 'animales';
      await this.renderGanaderia();
    }
  },

  async renderDetalleAnimal(params) {
    if (window.AnimalesView) { await AnimalesView.renderDetalle(params); }
  },

  async renderExplotacion(params) {
    if (window.ExplotacionView) {
      const tab = params?.get ? params.get('tab') : null;
      if (tab) {
        ExplotacionView._activeSubModule = tab;
      }
      await ExplotacionView.render(params);
    }
  },

  async renderGastos(params) {
    if (window.ExplotacionView) {
      ExplotacionView._activeSubModule = 'gastos';
      await this.renderExplotacion(params);
    }
  },

  async renderComercializacion(params) {
    if (window.ComercializacionView) { await ComercializacionView.render(params); }
  },

  async renderTrazabilidad(params) {
    if (window.TrazabilidadView) {
      const id = params?.get ? params.get('id') : null;
      if (id) {
        await TrazabilidadView.render(parseInt(id));
        return;
      }
    }
    // Sin animal seleccionado (o vista no disponible): estado vacío en lugar de dejar el loader
    document.getElementById("app-content").innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${Icons.trazabilidad()}</div>
        <p class="empty-state-text">Selecciona un animal para consultar su trazabilidad 360°.</p>
        <button class="btn btn-primary mt-15" onclick="App.route('/animales')">${Icons.animales()} Ir a Animales</button>
      </div>`;
  },

  async renderCuadernoDigital() {
    if (window.CuadernoDigitalView) {
      await CuadernoDigitalView.render();
    } else {
      document.getElementById("app-content").innerHTML = '<div class="loader">Error: CuadernoDigitalView no disponible</div>';
    }
  },

  async renderDocumentos() {
    if (window.DocumentosView) {
      await DocumentosView.render();
    } else {
      document.getElementById("app-content").innerHTML = '<div class="loader">Cargando módulo de documentos...</div>';
    }
  },

  async renderMargenAnimal(params) {
    if (window.MargenAnimalView) {
      await MargenAnimalView.render();
    } else {
      document.getElementById("app-content").innerHTML = '<div class="loader">Cargando margen por animal...</div>';
    }
  },

  async renderImportadorRFID(params) {
    if (window.ImportadorRFIDView) { await ImportadorRFIDView.render(); }
  },

  async renderImportarZonas(params) {
    if (window.ImportarZonasView) {
      await ImportarZonasView.render();
    } else {
      document.getElementById("app-content").innerHTML = '<div class="loader">Cargando importador de zonas...</div>';
    }
  },

  async renderAlbaranesVentas(params) {
    if (window.AlbaranesVentasView) {
      await AlbaranesVentasView.render(params);
    } else {
      document.getElementById("app-content").innerHTML = '<div class="loader">Cargando historial de ventas...</div>';
    }
  },

  async renderManuales() {
    if (window.ManualesView) {
      await ManualesView.render();
    } else {
      document.getElementById("app-content").innerHTML = '<div class="loader">Cargando manuales...</div>';
    }
  },
  async renderAgenda(params) {
    if (window.AgendaView) {
      // El filtro de la Agenda (TODOS/ANIMALES/…) vive ahora como subgrupo en el
      // sidebar (rutas /agenda?filtro=X). Lo aplicamos vía la propiedad pública
      // _filtroModulo antes de renderizar; no se toca AgendaView (maestro).
      const filtro = params && params.get ? params.get('filtro') : null;
      if (filtro) AgendaView._filtroModulo = filtro;
      await AgendaView.render(params);
    }
  },

  async renderSilos() {
    if (window.ExplotacionView) {
      ExplotacionView._activeSubModule = 'silos';
      await this.renderExplotacion();
    }
  },

  async renderFitosanitarios() {
    if (window.ExplotacionView) {
      ExplotacionView._activeSubModule = 'fitosanitarios';
      await this.renderExplotacion();
    }
  },

  // ==========================================
  //  // 9. INFORMES PREMIUM (v4.1.0)
  // ==========================================
  async renderInformes(params) {
    try {
      // Deep-link: #/informes?cat=general&tab=alertas (cualquier categoría/sub-tab válido).
      // La navegación de Informes se hace desde el submenú del sidebar; aquí solo
      // sincronizamos el estado de la vista con los parámetros de la ruta.
      if (params?.get && window.InformesView) {
        const cats = InformesView._categories || {};
        const cat = params.get('cat');
        const tab = params.get('tab');
        if (cat && Object.prototype.hasOwnProperty.call(cats, cat)) {
          InformesView._currentCategory = cat;
        }
        const catActual = InformesView._currentCategory;
        const tabsCat = (cats[catActual] || {}).tabs || {};
        const tabValido = (t) => Object.prototype.hasOwnProperty.call(tabsCat, t);
        if (tab && tabValido(tab)) {
          InformesView._currentTab = tab;
        } else if (!tabValido(InformesView._currentTab)) {
          // El tab activo no pertenece a la categoría (p.ej. cambio de cat sin tab):
          // caer al primer sub-tab válido de la categoría actual.
          const primero = Object.keys(tabsCat).find(t => InformesView._esTabPermitida(t));
          if (primero) InformesView._currentTab = primero;
        }
      }
      await InformesView.render();
    } catch (e) {
      console.error("[App] Error delegando a InformesView:", e);
      App.toastError("Error al cargar informes");
    }
  },

  /** Ruta directa a las alertas (dropdown del header, dashboard). */
  async renderAlertas() {
    if (window.InformesView) InformesView._currentTab = 'alertas';
    await App.renderInformes();
  },

  // [Eliminado] _renderizarGraficosInformes — los gráficos los gestiona InformesView

  async exportToPDF() {
    this.toast("Generando PDF...");
    const element = document.getElementById("app-content");
    const opt = {
      margin: 0.5,
      filename: `informe_premium_v3.3.9.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: "#000000" },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      pagebreak: { mode: ['css', 'legacy'] },
    };
    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => this.toast("Reporte descargado."));
  },

  // ==========================================
  // COMPRADORES (delegado)
  // ==========================================
  async renderCompradores() {
    if (window.ComercializacionView) {
      ComercializacionView._activeSubModule = 'compradores';
      await this.renderComercializacion();
    }
  },

  async renderComprador(params) {
    const id = params?.get ? params.get('id') : null;
    if (id) {
      if (window.CompradoresView && typeof CompradoresView.renderDetalle === 'function') {
        await CompradoresView.renderDetalle(parseInt(id));
      }
    } else if (window.CompradoresView && typeof CompradoresView.renderFormulario === 'function') {
      await CompradoresView.renderFormulario();
    }
  },

  async renderProveedores() {
    if (window.ExplotacionView) {
      ExplotacionView._activeSubModule = 'proveedores';
      await this.renderExplotacion();
    }
  },

  async renderProveedor(params) {
    const id = params?.get ? params.get('id') : null;
    if (id) {
      if (window.ProveedoresView && typeof ProveedoresView.renderDetalle === 'function') {
        await ProveedoresView.renderDetalle(parseInt(id));
      }
    } else if (window.ProveedoresView && typeof ProveedoresView.renderFormulario === 'function') {
      await ProveedoresView.renderFormulario();
    }
  },

  async renderContrato(params) {
    if (window.ContratosView && typeof ContratosView.renderFormulario === 'function') {
      await ContratosView.renderFormulario(params);
    }
  },

  async renderTransportistas() {
    if (window.ComercializacionView) {
      ComercializacionView._activeSubModule = 'transportistas';
      await this.renderComercializacion();
    }
  },

  // ==========================================
  // 9. AJUSTES
  // ==========================================
  async renderAjustes() {
    if (window.AjustesView) {
      await AjustesView.render();
    } else {
      document.getElementById("app-content").innerHTML = '<div class="loader">Error: Vista Ajustes no disponible</div>';
    }
  },

  async renderConfigSistema(params) {
    if (window.ConfigSistemaView) {
      await ConfigSistemaView.render(params);
    }
  },

  async _cambiarFincaActiva(id) {
    await Fincas.setActiveId(id);
    this.toast("Finca activa cambiada");
    if (typeof this.updateNavigationMenu === 'function') await this.updateNavigationMenu();
    this.renderAjustes();
  },

  async exportBackup() {
    if (window.PremiumManager && window.PremiumManager.isFree()) {
      App.toastError("La exportación de copias de seguridad solo está disponible en la versión Premium");
      return;
    }
    try {
      App.toast("Generando copia de seguridad...");
      // Todos los almacenes de la base, no una lista fija. La lista anterior se
      // quedo congelada en 20 y dejaba fuera 18 almacenes con datos del ganadero
      // (analiticas de leche, balance lacteo, tanques, guias de movimiento,
      // saneamientos, vacunaciones, agenda, crotales, botiquin, silos, ADSG...).
      // El backup se generaba sin error y sin avisar de lo que faltaba.
      // Se ordenan los conocidos primero para no alterar el formato del fichero.
      const ORDEN_PREFERENTE = [
        "fincas",
        "rebanos",
        "animales",
        "produccion_carne",
        "produccion_leche",
        "ventas_ganado",
        "sanitarios_ganado",
        "gastos_ganaderia",
        "config_especies",
        "config_tipos_produccion",
        "comercializacion_carne",
        "comercializacion_leche",
        "registro_eventos",
        "reproduccion_eventos",
        "compradores",
        "proveedores",
        "contratos_compra",
        "transportistas",
        "documentos_legales",
        "meta",
      ];
      const todosLosStores = Array.from(window.db.objectStoreNames);
      const stores = [
        ...ORDEN_PREFERENTE.filter((s) => todosLosStores.includes(s)),
        ...todosLosStores.filter((s) => !ORDEN_PREFERENTE.includes(s)),
      ];
      const backupData = {};
      let totalRegistros = 0;
      for (let store of stores) {
        if (window.db.objectStoreNames.contains(store)) {
          backupData[store] = await window.db.getAll(store);
          totalRegistros += backupData[store].length;
        }
      }
      backupData._meta = {
        version: window.APP_INFO.version,
        db_version: DB_VERSION,
        exportadoEn: new Date().toISOString(),
        totalRegistros,
      };
      const dataStr = JSON.stringify(backupData, null, 2);

      // 1️⃣ Capacitor Filesystem + Share (Android nativo)
      try {
        const cap = window.Capacitor;
        const fsPlugin = cap?.Plugins?.Filesystem;
        const sharePlugin = cap?.Plugins?.Share;
        if (fsPlugin && sharePlugin) {
          const fileName = `backup_livestock_${new Date().toISOString().split("T")[0]}.json`;

          // Guardamos en CACHE para asegurar que el sistema de Android pueda compartirlo fácilmente
          const result = await fsPlugin.writeFile({
            path: fileName,
            data: dataStr,
            directory: "CACHE",
            encoding: "utf8",
          });

          await sharePlugin.share({
            title: "Backup Livestock Manager",
            text: `Copia de seguridad v${window.APP_INFO.version} — ${totalRegistros} registros`,
            url: result.uri,
            files: [result.uri],
            dialogTitle: "Compartir copia de seguridad con…",
          });

          App.toast(`Backup compartido (${totalRegistros} registros)`, 'success');
          return;
        }
      } catch (capErr) {
        console.warn("[Backup] Capacitor falló:", capErr?.message || capErr);
      }

      // 2️⃣ Fallback: descarga directa (navegador Web)
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `livestock_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      App.toast(`Backup descargado (${totalRegistros} registros)`, 'success');
    } catch (error) {
      App.toastError("Error al exportar: " + error.message);
    }
  },

  async importBackup(event) {
    if (window.PremiumManager && window.PremiumManager.isFree()) {
      App.toastError("La importación de copias de seguridad solo está disponible en la versión Premium");
      return;
    }
    const file = event.target.files[0];
    if (!file) return;
    App.toast(`Restaurando backup: ${file.name}...`);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const res = await window.Trazabilidad.importarBackupData(
          window.db,
          e.target.result
        );
        App.toast(`Backup restaurado (${res.fincas.length} finca${res.fincas.length > 1 ? 's' : ''})`, 'success');
        if (res.multiplesFincas) {
          await Confirm.alert("Restauración Completada", "Base de datos restaurada. Detectadas múltiples fincas.");
        } else {
          await window.Fincas.setActiveId(res.fincas[0].id);
        }
        window.location.reload();
      } catch (error) {
        App.toastError(error.message);
      }
    };
    reader.readAsText(file);
  },

  async _registrarTratamiento(rebanoId) {
    if (window.WizardTratamiento) {
      await window.WizardTratamiento.registrar(rebanoId);
    }
  },

  async _abrirSelectorAnimales(rebanoId) {
    if (window.WizardTraslado) {
      await window.WizardTraslado.abrirSelectorAnimales(rebanoId);
    }
  },

  async _showFincaForm() {
    if (window.PremiumManager && window.PremiumManager.isFree()) {
      App.toastError('La creación de múltiples fincas solo está disponible en Premium');
      return;
    }
    if (window.WizardFinca) {
      window.WizardFinca.showForm();
    }
  },
  async _editarFincaActiva() {
    if (window.WizardFinca) { return window.WizardFinca.editar(); }
    const finca = await Fincas.getActive();
    if (!finca) return;
    App.toastError("Error: WizardFinca no disponible");
  },

  alternarSeleccionTodoElLote(masterCheckbox) {
    const checkboxes = document.querySelectorAll('input[name="animal-select"]');
    checkboxes.forEach((cb) => {
      if (!cb.disabled) cb.checked = masterCheckbox.checked;
    });
  },

  async _ejecutarMigracionesFondo() {
    try {
      await Pesajes.ejecutarMigracion();

      // v7: Migración de registros lácteos — añadir defaults a campos nuevos
      try {
        const registros = await window.db.getAll('comercializacion_leche');
        let migrados = 0;
        for (const r of registros) {
          let cambio = false;

          // Asegurar sub-objeto laboratorio
          if (!r.laboratorio) { r.laboratorio = {}; cambio = true; }

          // extracto_seco calculado
          if (r.laboratorio.grasa != null && r.laboratorio.proteina != null && r.laboratorio.extracto_seco == null) {
            r.laboratorio.extracto_seco = parseFloat((r.laboratorio.grasa + r.laboratorio.proteina).toFixed(2));
            cambio = true;
          }

          // fecha_analisis default
          if (!r.laboratorio.fecha_analisis) {
            r.laboratorio.fecha_analisis = r.fechaRecogida || '';
            cambio = true;
          }

          // importe_total calculado retroactivamente
          if (r.importe_total == null && r.cantidad && r.precioBase) {
            r.importe_total = parseFloat((r.cantidad * r.precioBase).toFixed(2));
            cambio = true;
          }

          // Cadena de frío — inferir de temperatura existente
          if (r.cadena_frio_cumplida == null) {
            r.cadena_frio_cumplida = (r.temperatura || 99) <= 4;
            cambio = true;
          }

          // Defaults seguros para nuevos campos
          if (r.comunidad_autonoma == null) { r.comunidad_autonoma = null; cambio = true; }
          if (!r.contrato_numero) { r.contrato_numero = ''; cambio = true; }
          if (!r.numero_infolac) { r.numero_infolac = ''; cambio = true; }
          if (!r.adsg_codigo) { r.adsg_codigo = ''; cambio = true; }
          if (!r.rega_origen) { r.rega_origen = ''; cambio = true; }
          if (r.precio_final_unitario == null && r.precioBase) {
            r.precio_final_unitario = r.precioBase;
            cambio = true;
          }
          if (r.primas_penalizaciones == null) { r.primas_penalizaciones = 0; cambio = true; }
          if (r.coste_alimentacion_periodo == null) { r.coste_alimentacion_periodo = 0; cambio = true; }
          if (r.mofa == null) { r.mofa = 0; cambio = true; }

          if (cambio) {
            await window.db.put('comercializacion_leche', r);
            migrados++;
          }
        }
        if (migrados > 0) console.log(`[Migración] ${migrados} registros lácteos migrados a v7`);
      } catch (e) {
        console.warn("[Migración leche] Error:", e);
      }

      // Migración de fincas — nuevos campos
      try {
        const fincas = await Fincas.list();
        let migrFincas = 0;
        for (const f of fincas) {
          let cambio = false;
          if (!f.comunidad_autonoma) { f.comunidad_autonoma = null; cambio = true; }
          if (!f.tipo_explotacion) { f.tipo_explotacion = 'mixto'; cambio = true; }
          if (!f.sistema_explotacion) { f.sistema_explotacion = 'extensivo'; cambio = true; }
          if (!f.adsg_codigo) { f.adsg_codigo = ''; cambio = true; }
          if (!f.adsg_veterinario) { f.adsg_veterinario = ''; cambio = true; }
          if (!f.adsg_vet_colegiado) { f.adsg_vet_colegiado = ''; cambio = true; }
          if (!f.adsg_vet_nif) { f.adsg_vet_nif = ''; cambio = true; }
          if (!f.contrato_lacteo_numero) { f.contrato_lacteo_numero = ''; cambio = true; }
          if (!f.contrato_lacteo_fecha_fin) { f.contrato_lacteo_fecha_fin = ''; cambio = true; }
          if (!f.contrato_lacteo_comprador) { f.contrato_lacteo_comprador = ''; cambio = true; }
          if (cambio) { await Fincas.save(f); migrFincas++; }
        }
        if (migrFincas > 0) console.log(`[Migración] ${migrFincas} fincas migradas a v7`);
      } catch (e) {
        console.warn("[Migración fincas] Error:", e);
      }
    } catch (e) {
      console.error("[App] Error en migraciones de fondo:", e);
    }
  },

  async _abrirWizardPedidoCrotales() {
    window._wizardCallInProgress = true;
    try {
      if (window.WizardCrotales) {
        await window.WizardCrotales.abrirPedido();
      }
    } finally {
      setTimeout(() => {
        window._wizardCallInProgress = false;
      }, 0);
    }
  },

  async _generarPDFPedidoCrotales(finca, data) {
    if (window.WizardCrotales) {
      await window.WizardCrotales.generarPDF(finca, data);
    }
  },

  _fallbackPDF(element, filename) {
    if (window.WizardCrotales) {
      window.WizardCrotales._fallbackPDF(element, filename);
    }
  },
  _mostrarAyudaMedicamentos() {
    if (window.Ayuda) { window.Ayuda.mostrarMedicamentos(); }
  },

  _mostrarAyudaCrotales() {
    if (window.Ayuda) { window.Ayuda.mostrarCrotales(); }
  },

  _mostrarGuiaNormativas() {
    if (window.Ayuda) { window.Ayuda.mostrarGuiaNormativas(); }
  }

};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.App = App;
    App.init();
  });
} else {
  window.App = App;
  App.init();
}
