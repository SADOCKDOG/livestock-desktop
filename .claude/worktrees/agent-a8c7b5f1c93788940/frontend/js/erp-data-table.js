/**
 * erp-data-table.js — Componente de Tabla Densa ERP (SAP Fiori / MS Dynamics)
 * Proporciona:
 *  - Cabecera con ordenación dinámicamente resaltada
 *  - Paginación "Mostrando X–Y de N"
 *  - Exportación rápida a CSV y XLSX (vía App.exportCSV / XLSX)
 *  - Filtro integrado con contador de registros activos
 */

class ErpDataTable {
  /**
   * @param {Object} config
   * @param {string} config.containerId Id del elemento donde renderizar
   * @param {Array<Object>} config.columns Configuración de columnas
   *  [{ key: 'crotal', label: 'Crotal / ID', sortable: true, align: 'left', render: fn }, ...]
   * @param {Array<Object>} config.data Filas de datos
   * @param {number} [config.pageSize=15] Tamaño de página por defecto
   * @param {string} [config.title="Listado"] Título o etiqueta del dataset
   * @param {boolean} [config.exportable=true] Habilitar botón exportar CSV/XLSX
   */
  constructor(config) {
    this.containerId = config.containerId;
    this.columns = config.columns || [];
    this.rawData = config.data || [];
    this.pageSize = config.pageSize || 15;
    this.title = config.title || 'Listado';
    this.exportable = config.exportable !== false;

    this.currentPage = 1;
    this.sortKey = null;
    this.sortAsc = true;
    this.searchTerm = '';

    this.filteredData = [...this.rawData];
  }

  updateData(newData) {
    this.rawData = newData || [];
    this.applyFiltersAndSort();
  }

  setSearchTerm(term) {
    this.searchTerm = (term || '').toLowerCase().trim();
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  setSort(key) {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = key;
      this.sortAsc = true;
    }
    this.applyFiltersAndSort();
  }

  applyFiltersAndSort() {
    let result = [...this.rawData];

    // Búsqueda global
    if (this.searchTerm) {
      result = result.filter(item => {
        return this.columns.some(col => {
          const val = item[col.key];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(this.searchTerm);
        });
      });
    }

    // Ordenación
    if (this.sortKey) {
      result.sort((a, b) => {
        let valA = a[this.sortKey];
        let valB = b[this.sortKey];

        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return this.sortAsc ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return this.sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    this.filteredData = result;
    this.render();
  }

  exportCSV() {
    if (!this.filteredData.length) return;
    const headers = this.columns.map(c => c.label).join(';');
    const rows = this.filteredData.map(row => {
      return this.columns.map(col => {
        let val = row[col.key];
        if (val === null || val === undefined) val = '';
        // Escapar comillas dobles y punto y coma
        const clean = String(val).replace(/"/g, '""');
        return `"${clean}"`;
      }).join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${this.title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const total = this.filteredData.length;
    const totalPages = Math.ceil(total / this.pageSize) || 1;
    this.currentPage = Math.min(this.currentPage, totalPages);

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const endIdx = Math.min(startIdx + this.pageSize, total);
    const pageItems = this.filteredData.slice(startIdx, endIdx);

    let html = `
      <div class="erp-table-wrapper">
        <!-- Toolbar Superior: Búsqueda, Contador y Exportar -->
        <div class="erp-table-toolbar">
          <div class="erp-table-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="erp-search-input" placeholder="Buscar en ${this.title.toLowerCase()}..." value="${this.searchTerm}" oninput="window['dt_${this.containerId}'].setSearchTerm(this.value)">
          </div>

          <div class="erp-toolbar-right">
            <span class="erp-counter-badge">
              Mostrando <strong>${total ? startIdx + 1 : 0}–${endIdx}</strong> de <strong>${total}</strong>
            </span>
            ${this.exportable ? `
              <button class="btn-erp-secondary btn-sm" onclick="window['dt_${this.containerId}'].exportCSV()" title="Exportar vista a CSV">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                CSV
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Tabla Densa -->
        <div class="erp-table-responsive">
          <table class="erp-data-table">
            <thead>
              <tr>
                ${this.columns.map(col => {
                  const isSorted = this.sortKey === col.key;
                  const sortIcon = isSorted
                    ? (this.sortAsc ? Icons.chevronArriba() : Icons.chevronAbajo())
                    : (Icons.sortNeutral ? Icons.sortNeutral() : '');
                  const alignClass = col.align ? `text-${col.align}` : 'text-left';
                  return `
                    <th class="${alignClass} ${col.sortable !== false ? 'sortable' : ''}"
                        ${col.sortable !== false ? `onclick="window['dt_${this.containerId}'].setSort('${col.key}')"` : ''}>
                      <div class="th-content">
                        <span>${col.label}</span>
                        ${col.sortable !== false ? `<span class="sort-indicator ${isSorted ? 'active' : ''}">${sortIcon}</span>` : ''}
                      </div>
                    </th>
                  `;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${pageItems.length ? pageItems.map(row => `
                <tr>
                  ${this.columns.map(col => {
                    const alignClass = col.align ? `text-${col.align}` : 'text-left';
                    // col.cellClass permite conservar en la tabla el color que el
                    // campo tenía en la tarjeta (identificador en dorado, importes
                    // en verde, alertas en rojo…). Admite función (val, row).
                    const extraClass = typeof col.cellClass === 'function'
                      ? (col.cellClass(row[col.key], row) || '')
                      : (col.cellClass || '');
                    const rawVal = row[col.key];
                    const renderedVal = col.render ? col.render(rawVal, row) : (rawVal !== null && rawVal !== undefined ? rawVal : '—');
                    return `<td class="${(alignClass + ' ' + extraClass).trim()}">${renderedVal}</td>`;
                  }).join('')}
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="${this.columns.length}" class="text-center erp-empty-td">
                    No se encontraron registros
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <!-- Paginación Inferior -->
        ${totalPages > 1 ? `
          <div class="erp-table-pagination">
            <button class="btn-erp-pagi" ${this.currentPage === 1 ? 'disabled' : ''} onclick="window['dt_${this.containerId}'].goToPage(${this.currentPage - 1})">
              ‹ Anterior
            </button>
            <span class="pagi-info">Página ${this.currentPage} de ${totalPages}</span>
            <button class="btn-erp-pagi" ${this.currentPage === totalPages ? 'disabled' : ''} onclick="window['dt_${this.containerId}'].goToPage(${this.currentPage + 1})">
              Siguiente ›
            </button>
          </div>
        ` : ''}
      </div>
    `;

    container.innerHTML = html;
    window[`dt_${this.containerId}`] = this;
  }

  goToPage(page) {
    this.currentPage = page;
    this.render();
  }
}

window.ErpDataTable = ErpDataTable;
