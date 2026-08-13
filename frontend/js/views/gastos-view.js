/**
 * Livestock Manager - GastosView v2.0.0
 * Vista de Gastos con tabs por Categoría Contable.
 * Sigue el mismo patrón que ProduccionView: tabs, KPIs, botón registrar, listado.
 * Copia espejo de js/views/gastos-view.js
 */

const GastosView = {
  _currentTab: 'todos',
  _cachedData: null,

  // Definición de categorías contables con iconos SVG y colores
  _CATEGORIAS: [
    { key: 'todos',        icon: Icons.documento(), label: 'Todos',          color: 'var(--c-purple)', colorDark: '#6d28d9' },
    { key: 'Alimentacion', icon: Icons.paquete(),   label: 'Alimentación',   color: 'var(--c-warning)', colorDark: 'var(--c-warning)' },
    { key: 'Sanidad',      icon: Icons.sanidad(),   label: 'Sanidad',        color: 'var(--c-danger)', colorDark: '#b91c1c' },
    { key: 'Fitosanitarios', icon: Icons.sanidad(), label: 'Fitosanitarios', color: 'var(--c-success)', colorDark: '#047857' },
    { key: 'Electricidad', icon: Icons.info(),      label: 'Electricidad',   color: 'var(--c-info)', colorDark: '#1d4ed8' },
    { key: 'Personal',     icon: Icons.compradores(), label: 'Personal',      color: 'var(--c-orange)', colorDark: '#c2410c' },
    { key: 'Amortizacion', icon: Icons.transportistas(), label: 'Amortización', color: 'var(--c-purple)', colorDark: '#7e22ce' },
  ],

  async render(params) {
    // Categoría seleccionada vía submenú del sidebar (?tab=gastos&cat=KEY).
    // Sin cat (p.ej. ruta legacy) se muestra el resumen global ("todos").
    this._currentTab = (params && typeof params.get === 'function' && params.get('cat')) || 'todos';
    const main = document.getElementById('expro-tab-content') || document.getElementById('app-content');
    // Cargar datos primero
    const gastosRecords = await Gastos.list(await Fincas.getActiveId());

    // Resumen mensual (últimos 6 meses)
    const hoy = new Date();
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const porMes = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
      porMes[key] = { label: meses[d.getMonth()] + ' ' + d.getFullYear(), total: 0 };
    }
    gastosRecords.forEach(g => {
      if (!g.fecha) return;
      const key = g.fecha.substring(0, 7);
      if (porMes[key]) porMes[key].total += g.monto || 0;
    });
    const totalGeneral = gastosRecords.reduce((s, g) => s + (g.monto || 0), 0);
    const mesesHtml = Object.values(porMes).reverse().map(m => {
      const pct = Math.min(100, m.total / (Math.max(1, Object.values(porMes).reduce((s,x) => Math.max(s, x.total), 0)) / 100));
      const color = pct > 70 ? 'var(--c-danger)' : pct > 40 ? 'var(--c-warning)' : 'var(--c-success)';
      return `<div class="flex-1 text-center min-w-0">
        <div class="text-xs text-gray mb-2" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.label}</div>
        <div class="gasto-bar-wrap">
          <div style="position:absolute;bottom:0;width:100%;height:${pct}%;background:${color};border-radius:6px;opacity:0.8;transition:height 0.3s;"></div>
        </div>
        <div class="text-xs font-bold mt-2" style="color:${color};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${(m.total/1000).toFixed(1)}k€</div>
      </div>`;
    }).join('');


    // Calcular KPIs por categoría
    const kpis = {};
    this._CATEGORIAS.forEach(c => {
      const filtered = c.key === 'todos' ? gastosRecords : gastosRecords.filter(g => g.categoria === c.key);
      kpis[c.key] = {
        records: filtered.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)),
        total: filtered.reduce((s, g) => s + (g.monto || 0), 0),
        count: filtered.length
      };
    });

    main.innerHTML = `
      <div class="card mb-14 p-12 card-resumen" data-guide="grafico-evolucion" style="background:rgba(168,85,247,0.015); width:100%;">
        <div class="flex justify-between items-center mb-6">
          <span class="text-xs text-gray font-bold uppercase"><span style="color: var(--c-purple); margin-right:4px;">|</span> EVOLUCIÓN MENSUAL (ÚLTIMOS 6 MESES)</span>
          <span class="text-xs text-gray">${UI.formatCurrency(totalGeneral)} total</span>
        </div>
        <div class="flex gap-6">${mesesHtml}</div>
      </div>

      <!-- Balance Consolidado de Gastos por Categoría -->
      <div class="card p-12 mb-14 border-222 card-total-3d card-resumen" style="background: rgba(168,85,247,0.015); width:100%;">
        <div class="text-xs text-white font-black uppercase tracking-wider mb-6 flex items-center gap-6">
          <span style="color: var(--c-purple); margin-right:4px;">|</span> ${Icons.dinero()} BALANCE GLOBAL DE GASTOS
        </div>
        <div class="flex flex-col">
          ${this._CATEGORIAS.filter(c => c.key !== 'todos').map(c => {
            const catGasto = kpis[c.key]?.total || 0;
            return `
              <div class="py-10 flex justify-between items-center border-bottom-222">
                <span class="text-xs text-gray uppercase font-800 flex items-center gap-6">${c.icon} ${c.label}</span>
                <strong class="text-base font-900" style="color:${c.color};">${UI.formatCurrency(catGasto)}</strong>
              </div>
            `;
          }).join('')}
          <div class="py-12 mt-4 flex justify-between items-center text-white">
            <span class="text-xs uppercase font-950 tracking-wider">TOTAL GENERAL GASTOS</span>
            <strong class="text-2xl text-red font-950">${UI.formatCurrency(totalGeneral)}</strong>
          </div>
        </div>
      </div>

      <div id="gasto-content"><div class="loader">Cargando gastos...</div></div>`;

    this._cachedData = { gastosRecords, kpis };

    this._renderTabActual();
  },

  _cambiarTab(tab) {
    this._currentTab = tab;
    document.querySelectorAll('.gasto-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    this._renderTabActual();
    window.scrollTo(0, 0);
  },

  _renderTabActual() {
    const d = this._cachedData;
    if (!d) return;
    const content = document.getElementById('gasto-content');
    if (!content) return;

    const catInfo = this._CATEGORIAS.find(c => c.key === this._currentTab) || this._CATEGORIAS[0];
    const data = d.kpis[this._currentTab];
    if (!data) { content.innerHTML = '<div class="loader">Sin datos</div>'; return; }

    this._renderSeccion(content, {
      icon: catInfo.icon,
      title: `Gastos — ${catInfo.label}`,
      subtitle: data.count > 0 ? `${data.count} ${data.count === 1 ? "registro" : "registros"} · ${UI.formatCurrency(data.total)} total` : 'Sin registros en esta categoría',
      color: catInfo.color,
      colorDark: catInfo.colorDark,
      kpis: [
        { label: 'Total (€)', value: UI.formatCurrency(data.total) },
        { label: 'Registros', value: data.count }
      ],
      registrarLabel: 'Gasto',
      listName: 'Lista de Gastos',
      registrarHandler: "App._abrirFormularioGasto()",
      records: data.records.slice(0, 50).map(g => ({
        title: (g.concepto || g.categoria || 'Gasto'),
        date: g.fecha ? UI.formatDate(g.fecha) : '-',
        zone: g.snap_zona || '',
        categoria: g.categoria || '',
        value: UI.formatCurrency(g.monto || 0),
        onclick: "ProduccionView._abrirOpcionesGasto(" + g.id + ")"
      })),
      emptyMsg: `Sin gastos de ${catInfo.label.toLowerCase()}. Usa "Registrar Gasto" para añadir.`
    });

    // Restaurar modo de vista tras pintar la sección (por defecto "tabla" en escritorio ≥ 1024px)
    const modo = this._vistaModo || localStorage.getItem('gastos_view_mode') || (window.innerWidth >= 1024 ? 'tabla' : 'cards');
    this._setVistaModo(modo, false);
  },

  _renderSeccion(content, opts) {
    const { icon, title, subtitle, color, colorDark, kpis, registrarLabel, listName, records, emptyMsg, registrarHandler } = opts;

    const recordsHtml = records.length > 0
      ? records.map(r => App._cardRegistro({
          title: r.title,
          subtitle: `<span class="flex items-center gap-4">${Icons.calendar()} ${r.date} ${r.zone ? ' | ' + Icons.zonas() + ' ' + r.zone : ''} ${r.categoria ? ' | ' + Icons.paquete() + ' ' + r.categoria.toUpperCase() : ''}</span>`,
          rightSide: `<div class="font-950" style="font-size:1.1rem; color:${color};">${r.value}</div>`,
          footerRight: `<span style="display: inline-block; font-size: 0.75rem; font-weight: 600; border: 1px solid var(--c-warning); color: var(--c-warning); background: rgba(255, 215, 0, 0.1); padding: 2px 6px; border-radius: 4px; margin-top: 4px;">Ficha -></span>`,
          color: color,
          onClick: r.onclick
        })).join('')
      : `<div class="p-14 text-center bg-dark rounded-sm border border-222"><span class="text-555 text-xs uppercase font-900 tracking-widest">${Icons.buscar()} ${emptyMsg}</span></div>`;

    content.innerHTML = `
      <div class="module-header-primary-action">
        <button class="btn btn-create btn-lg w-full" onclick="${registrarHandler}">${Icons.agregar()} Registrar ${registrarLabel}</button>
      </div>
      <div class="card">
        <div class="flex items-center gap-12 mb-12">
          <div class="text-white font-900 uppercase text-lg tracking-wider">
            <span style="color: ${color}; margin-right: 6px;">|</span> ${title.toUpperCase()}
          </div>
        </div>
        ${subtitle ? `<div class="text-gray mb-12" style="font-size:0.68rem; margin-top: -6px; padding-left: 14px;">${subtitle}</div>` : ''}
        ${kpis ? `
        <!-- KPIs Gastos Unificados en Filas -->
        <div class="card p-12 mb-14 border-222 card-total-3d" style=" background: rgba(255, 255, 255, 0.02);">
          <div class="text-xs text-white font-black uppercase tracking-wider mb-6 flex items-center gap-6">
            <span style="color: ${color}; margin-right:4px;">|</span> ${Icons.dinero()} BALANCE DE GASTOS
          </div>
          <div class="flex flex-col">
            ${kpis.map((k, index) => `
              <div class="py-12 flex justify-between items-center ${index < kpis.length - 1 ? 'border-bottom-222' : ''}">
                <span class="text-xs text-gray uppercase font-900">${k.label}</span>
                <strong class="text-xl font-950" style="color: ${k.label.includes('Total') ? 'var(--c-danger)' : 'var(--c-info)'};">${k.value}</strong>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
        <div class="text-xs text-gray uppercase font-extrabold tracking-wider border-bottom-222 mb-12 pb-5" style="padding-left: 14px; display:flex; align-items:center; justify-content:space-between; gap:4px;">
          <span style="display:flex; align-items:center; gap:4px;">${Icons.documento()} ${listName}</span>
          <div class="flex gap-4">
            <button class="btn-erp-secondary btn-sm" id="btn-gastos-vista-cards" onclick="GastosView._setVistaModo('cards')">Tarjetas</button>
            <button class="btn-erp-secondary btn-sm" id="btn-gastos-vista-tabla" onclick="GastosView._setVistaModo('tabla')">Tabla ERP</button>
          </div>
        </div>
        <div id="gastos-cards-container">${recordsHtml}</div>
        <div id="gastos-erp-table-container" class="mt-12" style="display:none;"></div>
      </div>
`;
  },

  // ============================================
  // VISTA TABLA ERP (desktop)
  // ============================================

  _setVistaModo(modo, guardar = true) {
    this._vistaModo = modo;
    if (guardar) {
      try { localStorage.setItem('gastos_view_mode', modo); } catch (_) {}
    }

    const btnCards = document.getElementById('btn-gastos-vista-cards');
    const btnTabla = document.getElementById('btn-gastos-vista-tabla');
    const contenedorCards = document.getElementById('gastos-cards-container');
    const contenedorTabla = document.getElementById('gastos-erp-table-container');

    if (btnCards && btnTabla) {
      btnCards.style.background = modo === 'cards' ? 'var(--brand, #1F5FA8)' : 'transparent';
      btnTabla.style.background = modo === 'tabla' ? 'var(--brand, #1F5FA8)' : 'transparent';
    }

    if (modo === 'tabla') {
      if (contenedorCards) contenedorCards.style.display = 'none';
      if (contenedorTabla) {
        contenedorTabla.style.display = 'block';
        this._renderErpTable();
      }
    } else {
      if (contenedorTabla) contenedorTabla.style.display = 'none';
      if (contenedorCards) contenedorCards.style.display = 'block';
    }
  },

  _renderErpTable() {
    if (!window.ErpDataTable || !this._cachedData) return;
    const data = this._cachedData.kpis[this._currentTab];
    if (!data) return;

    const catInfo = this._CATEGORIAS.find(c => c.key === this._currentTab) || this._CATEGORIAS[0];

    // records ya viene ordenado por fecha descendente; la tabla muestra TODOS
    // los registros del tab con paginación (las tarjetas cortan a 50).
    const tableData = data.records.map(g => ({
      id: g.id,
      fecha: g.fecha || '—',
      concepto: g.concepto || g.categoria || 'Gasto',
      categoria: g.categoria || '—',
      zona: g.snap_zona || '—',
      monto: g.monto || 0
    }));

    new window.ErpDataTable({
      containerId: 'gastos-erp-table-container',
      title: `Gastos ${this._currentTab === 'todos' ? '' : '— ' + catInfo.label}`,
      pageSize: 15,
      columns: [
        {
          key: 'fecha',
          label: 'Fecha',
          sortable: true,
          render: (val) => val !== '—' ? UI.formatDate(val) : '—'
        },
        { key: 'concepto', label: 'Concepto', sortable: true },
        { key: 'categoria', label: 'Categoría', sortable: true },
        { key: 'zona', label: 'Zona', sortable: true },
        {
          key: 'monto',
          label: 'Importe',
          sortable: true,
          align: 'right',
          render: (val) => `<span style="font-weight:700; color:var(--c-danger);">${UI.formatCurrency(val)}</span>`
        },
        {
          key: 'id',
          label: 'Ficha',
          sortable: false,
          align: 'center',
          render: (id) => `<button class="btn-erp-secondary btn-sm" onclick="ProduccionView._abrirOpcionesGasto(${id})">Ver</button>`
        }
      ],
      data: tableData
    }).render();
  },

  _fmt(n) {
    return UI.formatNumber(n);
  }
};

window.GastosView = GastosView;


