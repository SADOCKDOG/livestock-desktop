/**
 * Livestock Manager - Guía Explotación (ExPro)
 * Tour guiado para la pestaña Explotación: KPIs, Guía 365, alerta silos, actividad.
 * Tab por defecto en /explotacion. Siempre disponible.
 */
(function () {
  'use strict';

  GuideRegistry.register({
    id: 'expro.explotacion',
    pillar: 'expro',
    route: '/explotacion',
    tab: 'explotacion',
    applies: (flags) => true, // Siempre disponible (tab por defecto)
    disponible: async () => {
      if (!window.db) return true;
      try {
        const fincaId = window.Fincas ? await Fincas.getActiveId() : null;
        if (!fincaId) return false;
        const [ordeños, pesajes] = await Promise.all([
          window.db.getAllFromIndex('registro_eventos', 'fincaId', fincaId).catch(() => []),
          window.db.getAllFromIndex('registro_eventos', 'fincaId', fincaId).catch(() => [])
        ]);
        const tieneOrdeños = ordeños.some(e => e.tipo === 'ordeño');
        const tienePesajes = pesajes.some(e => e.tipo === 'pesaje');
        return tieneOrdeños || tienePesajes;
      } catch (e) {
        console.warn('[expro.explotacion] disponible error:', e);
        return true;
      }
    },
    steps: [
      {
        title: 'Bienvenido a Control de Producción',
        body: 'Esta pestaña (**Explotación**) es el panel central de ExPro. Muestra KPIs consolidados, banner **Guía 365** (solo Andalucía + saneamiento oficial), alerta **telemetría silos** (stock <15%), buscador de actividad y listado cronológico de ordeños/pesajes.',
        target: null,
        position: 'center'
      },
      {
        title: 'Resumen de Producción (KPIs)',
        body: 'Tarjeta superior con 2 KPIs: **Producción (L)** = total litros ordeñados; **Margen Carne** = margen económico cárnico. Color verde lima = carne, azul = leche. Se actualizan en tiempo real tras cada registro.',
        target: '.leche-kpi-item',
        waitFor: 1000,
        position: 'below'
      },
      {
        title: 'Guía Sanitaria 365 Días (Andalucía)',
        body: 'Si la finca está en Andalucía y calificada **Indemne/Calificada** (T3/M3/B4), aparece banner **Guía 365**. Verde = activa (auto-autoriza guías anuales 365 días sin confirmación previa por lote). Amarillo = inactiva (requiere saneamiento). Botón «Ajustes» abre WizardFinca.',
        target: '.card[style*="border-left: 4px solid var(--c-success)"], .card[style*="border-left: 4px solid var(--c-warning)"]',
        waitFor: 1500,
        position: 'below',
        optional: true,
        optionalReason: 'Solo aparece en Andalucía con calificación sanitaria Indemne/Calificada'
      },
      {
        title: 'Alerta Telemetría: Stock Silos <15%',
        body: 'Si algún silo tiene stock <15% de capacidad, aparece tarjeta de alerta roja listando silos críticos con kg actual/capacidad y %. Click en silo abre ficha para recargar. Requiere módulo Silos configurado.',
        target: '.card-resumen[style*="border-left: 4px solid var(--c-danger)"]',
        waitFor: 1500,
        position: 'below',
        optional: true,
        optionalReason: 'Solo aparece si hay silos con stock <15%'
      },
      {
        title: 'Buscar actividad por Crotal/Zona',
        body: 'Campo de búsqueda (`#expro-search-actividad`) filtra al instante el listado inferior por **crotal/identificación** o **zona**. Escribe y la lista se reduce a coincidencias.',
        target: '#expro-search-actividad',
        waitFor: true,
        position: 'below'
      },
      {
        title: 'Listado cronológico Ordeños/Pesajes',
        body: 'Grid con tarjetas de cada registro (ordeño si Leche, pesaje si Carne). Muestra: identificación (crotal/lote), fecha, zona, valor neto (L o kg) con badge color (azul=leche, verde=carne). Click abre opciones: editar/borrar registro.',
        target: '#expro-actividad-grid .card-registro',
        waitFor: 1500,
        position: 'above'
      },
      {
        title: 'Botón principal adaptativo',
        body: 'Botón grande en cabecera cambia según flags: **Leche+Carne** → "Registrar Producción" (submenú); **solo Carne** → "Registrar Pesaje"; **solo Leche** → "Registrar Ordeño". Abre wizard real correspondiente.',
        target: '.module-header-primary-action .btn-create',
        waitFor: true,
        position: 'below'
      },
      {
        title: 'FAB Guía',
        body: 'Botón flotante «Guía» (abajo a la derecha) relanza esta guía. En Ajustes → Guías: toggle global, vista de guías vistas, «Reiniciar todas».',
        target: '.guide-fab',
        waitFor: 1500,
        position: 'above'
      },
      {
        title: '¡Listo!',
        body: 'Controla producción: registra ordeños/pesajes, vigila stock silos, usa Guía 365 si Andalucía, filtra actividad por crotal/zona. La guía está en el FAB cuando la necesites.',
        target: null,
        position: 'center'
      }
    ]
  });
})();