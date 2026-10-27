/**
 * Livestock Manager - ConfigSistemaView v1.0.0
 * Módulo integral de Configuración del Sistema, Seguridad y Auditoría.
 * Integra Interfaz, Backups, Información Técnica y Registros de Actividad.
 */

const ConfigSistemaView = {
  _currentTab: 'interfaz', // 'interfaz', 'seguridad', 'auditoria'

  async render(params) {
    if (window.App) App.updateHeaderColor('ajustes');
    const main = document.getElementById("app-content");
    const config = await AjustesView._loadConfig();
    const tab = params?.get?.('tab') || this._currentTab;
    this._currentTab = tab;

    main.innerHTML = `
      <div class="p-16">
        <div class="mb-20">
          <a href="#/ajustes" class="link-back">← Volver a Ajustes</a>
          <h2 class="mt-10 flex items-center gap-10 text-white font-900 uppercase">
            <span style="color: var(--p-gold); margin-right: 4px;">|</span> ${Icons.ajustes()} Sistema y Seguridad
          </h2>
          <p class="text-gray text-sm leading-relaxed">Gestión integral de la plataforma: apariencia, integridad de datos y registros de auditoría.</p>
        </div>
 
        <!-- TABS DE NAVEGACIÓN INTERNA -->
        <div class="mb-14">
          <div class="tabs-scroll prod-tabs scroll-shadow-container">
            <button class="prod-tab ${tab === 'interfaz' ? 'active' : ''}" onclick="ConfigSistemaView._cambiarTab('interfaz')">${Icons.foto()} INTERFAZ</button>
            <button class="prod-tab ${tab === 'seguridad' ? 'active' : ''}" onclick="ConfigSistemaView._cambiarTab('seguridad')">${Icons.premium()} SEGURIDAD</button>
            <button class="prod-tab ${tab === 'auditoria' ? 'active' : ''}" onclick="ConfigSistemaView._cambiarTab('auditoria')">${Icons.documento()} AUDITORÍA</button>
          </div>
        </div>

        <div id="sistema-content"></div>
      </div>
    `;

    const container = document.getElementById('sistema-content');
    switch (tab) {
      case 'interfaz': await this._renderInterfaz(container, config); break;
      case 'seguridad': await this._renderSeguridad(container, config); break;
      case 'auditoria': await this._renderAuditoria(container); break;
    }

    if (window.enableScrollShadows) {
      document.querySelectorAll('.scroll-shadow-container').forEach(el => window.enableScrollShadows(el));
    }
  },

  _cambiarTab(tab) {
    this._currentTab = tab;
    const url = new URL(window.location.href);
    url.hash = `#/sistema?tab=${tab}`;
    window.location.hash = `#/sistema?tab=${tab}`;
  },

  // ===================== SECCIÓN 1: INTERFAZ =====================

  async _renderInterfaz(container, config) {
    const palette = this._getStandardPalette();
    const vistaRegistros = window.VistaRegistros ? VistaRegistros.get() : 'cards';
    container.innerHTML = `
      <div class="card p-14 mb-16" style="background: rgba(255,255,255,0.02); border: 1px solid #27272a;">
        <div class="section-header-theme mb-15 font-900 uppercase tracking-wider text-[0.7rem] text-gray"><span style="color: var(--c-purple); margin-right: 4px;">|</span> ${Icons.foto()} APARIENCIA BASE</div>
        <div class="grid gap-12">
          <label class="wizard-check-label">
            <input type="checkbox" ${config.temaOscuro !== false ? 'checked' : ''} onchange="ConfigSistemaView._action('toggleTema', this.checked)">
            <div class="flex flex-col">
              <span class="font-bold">MODO OSCURO (OLED)</span>
              <span class="text-[0.65rem] text-aaa">Optimizado para pantallas AMOLED.</span>
            </div>
          </label>
          ${config.temaOscuro === false ? `
          <div class="wizard-input-group">
            <label class="wizard-label">PALETA DE MODO CLARO</label>
            <select class="wizard-input font-800 text-xs" onchange="ConfigSistemaView._action('cambiarTemaClaroColor', this.value)">
              <option value="arena" ${(!config.temaClaroColor || config.temaClaroColor === 'arena') ? 'selected' : ''}>ARENA (POR DEFECTO)</option>
              <option value="gris" ${config.temaClaroColor === 'gris' ? 'selected' : ''}>GRIS</option>
              <option value="oliva" ${config.temaClaroColor === 'oliva' ? 'selected' : ''}>OLIVA</option>
              <option value="beige" ${config.temaClaroColor === 'beige' ? 'selected' : ''}>BEIGE</option>
            </select>
          </div>
          ` : ''}
          <label class="wizard-check-label">
            <input type="checkbox" ${config.mostrarContextos !== false ? 'checked' : ''} onchange="ConfigSistemaView._action('toggleContextos', this.checked)">
            <div class="flex flex-col">
              <span class="font-bold">TEXTOS DE CONTEXTO</span>
              <span class="text-[0.65rem] text-aaa">Ayudas visuales en cabeceras.</span>
            </div>
          </label>
        </div>
      </div>

      <div class="card p-14 mb-16" style="background: rgba(255,255,255,0.02); border: 1px solid #27272a;">
        <div class="section-header-theme mb-15 font-900 uppercase tracking-wider text-[0.7rem] text-gray"><span style="color: var(--c-success); margin-right: 4px;">|</span> ${Icons.documento()} VISTA DE REGISTROS</div>
        <p class="text-[0.65rem] text-aaa mb-12 leading-relaxed">
          Cómo se presentan los listados de todos los módulos.
        </p>
        <div class="wizard-input-group">
          <label class="wizard-label" for="sys-vista-registros">PRESENTACIÓN DE LOS LISTADOS</label>
          <select id="sys-vista-registros" class="wizard-input font-800 text-xs" onchange="ConfigSistemaView._cambiarVistaRegistros(this.value)">
            <option value="cards" ${vistaRegistros === 'cards' ? 'selected' : ''}>VISTA TARJETA</option>
            <option value="tabla" ${vistaRegistros === 'tabla' ? 'selected' : ''}>VISTA TIPO TABLA (ERP)</option>
          </select>
        </div>
        <p class="text-[0.6rem] text-gray mt-8">
          Se guarda solo para ${VistaRegistros.esEscritorio() ? 'ESCRITORIO' : 'MÓVIL'}; el otro formato conserva el suyo.
        </p>
      </div>

      <div class="card p-14 mb-16" style="background: rgba(255,255,255,0.02); border: 1px solid #27272a;">
        <div class="section-header-theme mb-15 font-900 uppercase tracking-wider text-[0.7rem] text-gray"><span style="color: var(--p-cork); margin-right: 4px;">|</span> ${Icons.ajustes()} RETROILUMINACIÓN</div>
        <div class="grid gap-10">
          <label class="wizard-check-label">
            <input type="checkbox" ${config.glowMarco !== false ? 'checked' : ''} onchange="ConfigSistemaView._action('toggleGlowMarco', this.checked)">
            <span>Marco Principal</span>
          </label>
          <label class="wizard-check-label">
            <input type="checkbox" ${config.glowLaterales !== false ? 'checked' : ''} onchange="ConfigSistemaView._action('toggleGlowLaterales', this.checked)">
            <span>Haces Laterales</span>
          </label>
          <label class="wizard-check-label">
            <input type="checkbox" ${config.glowBotones !== false ? 'checked' : ''} onchange="ConfigSistemaView._action('toggleGlowBotones', this.checked)">
            <span>Resplandor en Botones</span>
          </label>
          <label class="wizard-check-label">
            <input type="checkbox" ${config.glowTarjetas !== false ? 'checked' : ''} onchange="ConfigSistemaView._action('toggleGlowTarjetas', this.checked)">
            <span>Haces de Luz de todas las tarjetas</span>
          </label>
          <button class="widget-link-btn widget-link-btn--neon neon-success w-full mt-10" onclick="AjustesView._abrirWizardRetroiluminacion()">
            ${Icons.ajustes()} Wizard de Iluminación Avanzado
          </button>
        </div>
      </div>

      <div class="card p-14 mb-16" style="background: rgba(255,255,255,0.02); border: 1px solid #27272a;">
        <div class="section-header-theme mb-15 font-900 uppercase tracking-wider text-[0.7rem] text-gray"><span style="color: var(--c-info); margin-right: 4px;">|</span> ${Icons.calendar()} FORMATOS DE SISTEMA</div>
        <div class="grid grid-cols-1 gap-15">
          <div class="wizard-input-group">
            <label class="wizard-label" for="sys-formato-fecha">FORMATO DE FECHA</label>
            <select id="sys-formato-fecha" class="wizard-input" onchange="ConfigSistemaView._action('guardarPreferencia', 'formatoFecha', this.value)">
              <option value="es-ES" ${config.formatoFecha !== 'en-US' ? 'selected' : ''}>DD/MM/AAAA (Europa)</option>
              <option value="en-US" ${config.formatoFecha === 'en-US' ? 'selected' : ''}>MM/DD/AAAA (Internacional)</option>
            </select>
          </div>
          <div class="wizard-input-group">
            <label class="wizard-label" for="sys-moneda">MONEDA PRINCIPAL</label>
            <select id="sys-moneda" class="wizard-input" onchange="ConfigSistemaView._action('guardarPreferencia', 'moneda', this.value)">
              <option value="€" ${config.moneda !== '$' ? 'selected' : ''}>Euro (€)</option>
              <option value="$" ${config.moneda === '$' ? 'selected' : ''}>Dólar ($)</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card p-14" style="background: rgba(255,255,255,0.02); border: 1px solid #27272a;">
        <div class="section-header-theme mb-15 font-900 uppercase tracking-wider text-[0.7rem] text-gray"><span style="color: var(--p-gold); margin-right: 4px;">|</span> ${Icons.estrella()} COLOR DE ACENTO GLOBAL</div>
        <div class="flex flex-wrap gap-8 justify-center theme-dots-container">
          ${palette.map(c => `
            <button class="theme-dot ${config.colorTema === c.id ? 'active' : ''}"
              type="button"
              aria-label="Color de acento ${c.nombre}"
              aria-pressed="${config.colorTema === c.id}"
              title="${c.nombre}"
              style="background:${c.hex};" onclick="ConfigSistemaView._action('cambiarColor', '${c.id}')">
              ${config.colorTema === c.id ? '✓' : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  },

  // ===================== SECCIÓN 2: SEGURIDAD Y DATOS =====================

  async _renderSeguridad(container, config) {
    const fincas = await Fincas.list();
    const animales = await Animales.list().catch(() => []);

    container.innerHTML = `
      <div class="card p-14 mb-16" style="background: rgba(255,255,255,0.02); border: 1px solid #27272a;">
        <div class="section-header-theme mb-15 font-900 uppercase tracking-wider text-[0.7rem] text-gray"><span style="color: var(--c-info); margin-right: 4px;">|</span> ${Icons.info()} INFORMACIÓN DEL SISTEMA</div>
        <div class="info-box bg-black p-15">
          <div class="grid grid-cols-2 gap-y-10 text-[0.7rem] uppercase font-800">
            <div class="text-gray">Versión App:</div><div class="text-white text-right">v${window.APP_INFO.version}</div>
            <div class="text-gray">Motor DB:</div><div class="text-white text-right">IndexedDB v${typeof DB_VERSION !== 'undefined' ? DB_VERSION : '—'}</div>
            <div class="text-gray">Fincas:</div><div class="text-white text-right">${fincas.length}</div>
            <div class="text-gray">Animales:</div><div class="text-white text-right">${animales.length}</div>
          </div>
        </div>
      </div>

      <div class="card p-14 mb-16" style="background: rgba(255,255,255,0.02); border: 1px solid #27272a;">
        <div class="section-header-theme mb-15 font-900 uppercase tracking-wider text-[0.7rem] text-gray"><span style="color: var(--c-warning); margin-right: 4px;">|</span> ${Icons.guardar()} COPIAS DE SEGURIDAD</div>
        <p class="text-[0.65rem] text-aaa mb-15 uppercase font-800">Protege tu información exportando un archivo JSON de seguridad.</p>
        <div class="grid grid-cols-2 gap-10">
          <button class="widget-link-btn widget-link-btn--neon neon-success" onclick="App.exportBackup()">
            ${Icons.exportar()} <span class="widget-link-label">Exportar</span>
          </button>
          <button class="widget-link-btn widget-link-btn--neon neon-info" onclick="document.getElementById('sys-import').click()">
            ${Icons.importar()} <span class="widget-link-label">Importar</span>
          </button>
        </div>
        <input type="file" id="sys-import" class="d-none" onchange="App.importBackup(event)">

        <label class="wizard-check-label mt-15">
          <input type="checkbox" ${config.autoBackup ? 'checked' : ''} onchange="ConfigSistemaView._action('toggleAutoBackup', this.checked)">
          <span>Backup automático al cerrar sesión</span>
        </label>
      </div>

      <div class="card p-14" style="background: rgba(255,255,255,0.02); border: 1px solid #27272a;">
        <div class="section-header-theme mb-15 font-900 uppercase tracking-wider text-[0.7rem] text-gray"><span style="color: var(--c-danger); margin-right: 4px;">|</span> ${Icons.eliminar()} MANTENIMIENTO</div>
        <button class="widget-link-btn widget-link-btn--neon neon-danger w-full mb-10" onclick="AjustesView._limpiarCache()">
          ${Icons.eliminar()} Limpiar Caché del Sistema
        </button>
        <p class="text-[0.6rem] text-center text-gray-600 uppercase font-900">Esta acción recargará los datos desde la base de datos física.</p>
      </div>
    `;
  },

  // ===================== SECCIÓN 3: AUDITORÍA =====================

  async _renderAuditoria(container) {
    if (!container) return;

    // Mostrar estado de carga inicial
    container.innerHTML = `
      <div class="card p-14 text-center" style="background: rgba(255,255,255,0.02); border: 1px solid #27272a;">
        <div class="text-xs text-gray uppercase font-800 py-20">Cargando registros de auditoría...</div>
      </div>
    `;

    try {
      // Asegurar disponibilidad del servicio de auditoría
      if (!window.AuditService && window.App && typeof App._loadScript === 'function') {
        await App._loadScript('js/services/audit-service.js').catch(() => {});
      }

      const fincaId = window.Fincas && typeof Fincas.getActiveId === 'function'
        ? await Fincas.getActiveId().catch(() => null)
        : null;

      let logs = [];
      let health = { isHealthy: true, failureCount: 0 };

      if (window.AuditService && typeof AuditService.list === 'function') {
        logs = await AuditService.list({ fincaId, limit: 50 });
        health = typeof AuditService.getHealth === 'function' ? AuditService.getHealth() : health;
      } else if (window.db && typeof window.db.getAllFromIndex === 'function') {
        const eventos = await window.db.getAllFromIndex('registro_eventos', 'fincaId', fincaId).catch(() => []);
        logs = eventos.filter(e =>
          e.tipo === 'auditoria' || e.rectificado || e.anulado || e.motivo_tarea?.includes('anulacion')
        ).sort((a, b) => new Date(b.creadoEn || b.fecha) - new Date(a.creadoEn || a.fecha)).slice(0, 50);
      }

      const healthBanner = !health.isHealthy ? `
        <div class="p-8 mb-12 rounded bg-red-950/40 border border-red-500/40 text-[0.65rem] text-red-200">
          Aviso de integridad: Se detectaron ${health.failureCount} fallos al persistir auditorías en esta sesión local.
        </div>
      ` : '';

      const _esc = (typeof AuditService !== 'undefined' && typeof AuditService.escapeHtml === 'function')
        ? (s) => AuditService.escapeHtml(s)
        : (s) => {
            if (s == null) return '';
            return String(s)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
          };

      let logsHtml = logs.length > 0 ? logs.map(l => {
        const isAnulado = l.anulado || l.motivo_tarea?.includes('anulacion') || l.motivo_tarea?.includes('baja') || l.action === 'DELETE_LOGICAL';
        const isRectificado = l.rectificado || l.resultado === 'WARNING' || l.motivo_tarea?.includes('rectificacion');
        const isAlta = l.tipo === 'alta' || l.motivo_tarea?.includes('alta') || l.action === 'CREATE';
        const isMovimiento = l.tipo === 'movimiento' || l.motivo_tarea === 'entrada' || l.motivo_tarea === 'salida' || l.motivo_tarea === 'cambio_rebano';
        const color = isAnulado
          ? 'var(--c-danger)'
          : (isRectificado
            ? 'var(--c-warning)'
            : (isAlta ? 'var(--c-success)' : (isMovimiento ? 'var(--c-purple)' : 'var(--c-info)')));

        const actorTag = l.actor_id ? `<span class="text-[0.55rem] text-gray-500 font-bold ml-6">| Actor: ${_esc(l.actor_id)}</span>` : '';
        const fieldsTag = Array.isArray(l.fields_modified) && l.fields_modified.length > 0
          ? `<div class="text-[0.6rem] text-gray-400 mt-2">Campos alterados: ${_esc(l.fields_modified.join(', '))}</div>`
          : '';

        const motivoRaw = (l.motivo_tarea === 'control' && l.valor_neto != null)
          ? 'pesaje control'
          : (l.motivo_tarea || 'Evento de Sistema');
        const motivo = _esc(motivoRaw.replace(/_/g, ' '));
        const fechaStr = _esc(new Date(l.creadoEn || l.fecha).toLocaleString());

        let descRaw = l.descripcion;
        if (!descRaw && l.valor_neto != null) {
          descRaw = `Pesaje registrado: ${l.valor_neto} ${l.unidad || 'kg'} (animal #${l.entidad_id})`;
        }
        if (!descRaw) {
          descRaw = l.observaciones || l.notas || 'Registro modificado';
        }
        const desc = _esc(descRaw);

        const detalleMotivo = (l.rectificadoMotivo || l.anuladoMotivo)
          ? `<div class="text-[0.6rem] text-aaa italic mt-2">Motivo: ${_esc(l.rectificadoMotivo || l.anuladoMotivo)}</div>`
          : '';

        return `
          <div class="p-10 mb-8 rounded bg-black border border-222 border-left-3px" style="border-left-color:${color};">
            <div class="flex justify-between items-start">
              <span class="text-[0.65rem] font-950 uppercase" style="color:${color};">
                ${motivo} ${actorTag}
              </span>
              <span class="text-[0.55rem] text-gray-600 font-900">${fechaStr}</span>
            </div>
            <div class="text-white text-xs mt-4 font-700">${desc}</div>
            ${fieldsTag}
            ${detalleMotivo}
          </div>
        `;
      }).join('') : '<div class="text-center p-20 text-gray-600 font-900 text-xs uppercase">Sin registros de auditoría recientes</div>';

      container.innerHTML = `
        <div class="card p-14" style="background: rgba(255,255,255,0.02); border: 1px solid #27272a;">
          <div class="section-header-theme mb-15 font-900 uppercase tracking-wider text-[0.7rem] text-gray"><span style="color: var(--c-info); margin-right: 4px;">|</span> ${Icons.documento()} REGISTRO DE ACTIVIDAD</div>
          <p class="text-xs text-gray mb-15 leading-relaxed">Historial de cambios críticos, eliminaciones y rectificaciones realizadas en la explotación actual (mostrando los últimos 50 eventos registrados).</p>
          ${healthBanner}
          <div class="mh-400 overflow-y-auto pr-4">
            ${logsHtml}
          </div>
        </div>
      `;
    } catch (err) {
      // Estado de error diferenciado y recuperable
      container.innerHTML = `
        <div class="card p-20 text-center" style="background: rgba(255,255,255,0.02); border: 1px solid #ef4444;">
          <div class="text-xs text-red-400 font-bold mb-10">No se pudieron recuperar los registros de auditoría local.</div>
          <button class="widget-link-btn widget-link-btn--neon neon-info mx-auto" onclick="ConfigSistemaView._renderAuditoria(document.getElementById('sistema-content'))">
            Reintentar lectura
          </button>
        </div>
      `;
    }
  },

  // ===================== UTILIDADES =====================

  _getStandardPalette() {
    return [
      // `nombre` es la etiqueta accesible del selector: son botones de color
      // puro, sin texto ni icono, así que sin él un lector de pantalla solo
      // anuncia "botón".
      { id: 'gold',   hex: '#FFFC55', nombre: 'Dorado'  },
      { id: 'blue',   hex: '#4FADF5', nombre: 'Azul'    },
      { id: 'green',  hex: '#10b981', nombre: 'Verde'   },
      { id: 'red',    hex: '#ef4444', nombre: 'Rojo'    },
      { id: 'indigo', hex: '#8b5cf6', nombre: 'Violeta' },
      { id: 'lime',   hex: '#C5FA50', nombre: 'Lima'    },
      { id: 'steel',  hex: '#B1B1B1', nombre: 'Acero'   }
    ];
  },

  /**
   * La preferencia de vista no vive en la config de la finca sino en
   * localStorage por dispositivo, asi que no pasa por AjustesView._action.
   */
  _cambiarVistaRegistros(modo) {
    if (!window.VistaRegistros) return;
    VistaRegistros.set(modo);
    if (window.AuditService && typeof AuditService.record === 'function') {
      AuditService.record({
        fincaId: 'global',
        actor_type: 'user',
        action: 'CONFIG_CHANGE',
        tipo_entidad: 'config',
        entidad_id: 'vistaRegistros',
        motivo_tarea: 'cambio_preferencias',
        descripcion: `Presentación de listados cambiada a ${modo}`,
        fields_modified: ['vistaRegistros']
      }).catch(() => {});
    }
    if (window.App && typeof App.toast === 'function') {
      App.toast(modo === 'tabla' ? 'Listados en vista de tabla' : 'Listados en vista de tarjetas', 'success');
    }
  },

  async _action(fn, ...args) {
    if (typeof AjustesView['_' + fn] === 'function') {
      await AjustesView['_' + fn](...args);
      if (window.AuditService && typeof AuditService.record === 'function') {
        const fincaId = window.Fincas && typeof Fincas.getActiveId === 'function'
          ? await Fincas.getActiveId().catch(() => null)
          : null;
        AuditService.record({
          fincaId: fincaId || 'global',
          actor_type: 'user',
          action: 'CONFIG_CHANGE',
          tipo_entidad: 'config',
          entidad_id: fn,
          motivo_tarea: 'cambio_configuracion',
          descripcion: `Preferencia de sistema modificada: ${fn}`,
          fields_modified: [fn]
        }).catch(() => {});
      }
      this.render();
    }
  }
};

window.ConfigSistemaView = ConfigSistemaView;
