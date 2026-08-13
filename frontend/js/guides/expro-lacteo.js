/**
 * Livestock Manager - Guía Láctea (ExPro)
 * Tour guiado para la pestaña Láctea: producción diaria, tanques, control, balance, gráficos.
 * SOLO disponible si flags.leche === true.
 */
(function () {
  'use strict';

  GuideRegistry.register({
    id: 'expro.lacteo',
    pillar: 'expro',
    route: '/explotacion',
    tab: 'lacteo',
    applies: (flags) => flags.leche === true, // SOLO si Leche=ON
    disponible: async () => {
      if (!window.db) return true;
      try {
        const fincaId = window.Fincas ? await Fincas.getActiveId() : null;
        if (!fincaId) return false;
        const ordeños = await window.db.getAllFromIndex('registro_eventos', 'fincaId', fincaId).catch(() => []);
        return ordeños.some(e => e.tipo === 'ordeño');
      } catch (e) {
        console.warn('[expro.lacteo] disponible error:', e);
        return true;
      }
    },
    steps: [
      {
        title: 'Bienvenido a Gestión Láctea',
        body: 'Esta pestaña (**Láctea**) solo aparece con **Leche=ON** en Ajustes → Explotación. Centraliza producción diaria, analíticas de laboratorio, tanques de enfriamiento y rendimiento MOFA (margen sobre coste alimentación). Color azul (--c-info) identifica láctea.',
        target: null,
        position: 'center'
      },
      {
        title: 'Resumen Lácteo (KPIs)',
        body: 'Tarjeta superior con 2 KPIs: **Litros Control** = producción en controles oficiales; **Margen MOFA** = ingresos leche - coste pienso (€). Indicadores clave de rentabilidad lechera.',
        target: '.leche-kpi-item',
        waitFor: 1000,
        position: 'below'
      },
      {
        title: 'Sub-pestañas de navegación (sidebar)',
        body: 'En el sidebar, bajo **Láctea**, el submenú **Dashboard** (visión general), **Tanques** (enfriadores, capacidades, temperaturas), **Control** (registros oficiales laboratorio), **Balance** (economía láctea: ingresos, costes, MOFA), **Gráficos** (evolución producción, componentes, comparativas). Click para cambiar sin recargar.',
        target: '.sidebar-group-toggle[data-group-toggle="expro::lacteo"]',
        waitFor: 1000,
        position: 'below'
      },
      {
        title: 'Dashboard — Visión general (sub-pestaña activa)',
        body: 'Sub-pestaña por defecto. Resumen visual: producción última semana, tanques con nivel/temperatura, próximos controles, alertas (ej. temperatura alta). Acceso rápido a registrar ordeño y ver control.',
        target: '.sidebar-link[data-route="/explotacion?tab=lacteo&sub=dashboard"]',
        waitFor: 1500,
        position: 'above'
      },
      {
        title: 'Tanques — Enfriadores (sub-pestaña Tanques)',
        body: 'Sub-pestaña **Tanques** (delega a TanquesView si existe). Cada tanque: capacidad, litros actuales, temperatura, estado (enfriando/ok/alarma). Botón «Nuevo Tanque» en el marco de registro. Click en tarjeta abre ficha con histórico temperaturas y calibración.',
        target: '.sidebar-link[data-route="/explotacion?tab=lacteo&sub=tanques"]',
        waitFor: 1500,
        position: 'below'
      },
      {
        title: 'Control — Analíticas laboratorio (sub-pestaña Control)',
        body: 'Sub-pestaña **Control**: listado de controles oficiales (fecha, litros, grasa, proteína, extracto seco, urea, recuento celular). Cada control abre ficha con componentes, comparación con anterior y tendencia. Botón para registrar nuevo control (wizard) en el marco de registro.',
        target: '.sidebar-link[data-route="/explotacion?tab=lacteo&sub=control"]',
        waitFor: 1500,
        position: 'below'
      },
      {
        title: 'Balance — Economía láctea MOFA (sub-pestaña Balance)',
        body: 'Sub-pestaña **Balance**: ingresos por leche (litros × precio), costes alimentación (pienso, forraje), **MOFA** = Ingresos - Coste Alimentación. Desglose por periodo, comparativa con campañas anteriores. KPIs: €/litro, €/vaca/día, % coste alimentación.',
        target: '.sidebar-link[data-route="/explotacion?tab=lacteo&sub=balance"]',
        waitFor: 1500,
        position: 'below'
      },
      {
        title: 'Gráficos — Evolución y componentes (sub-pestaña Gráficos)',
        body: 'Sub-pestaña **Gráficos**: series temporales de producción (L/día), grasa/proteína (%), recuento celular, urea, MOFA. Selector de rango (semana/mes/año/campaña). Exportable a imagen/PDF para informes.',
        target: '.sidebar-link[data-route="/explotacion?tab=lacteo&sub=graficos"]',
        waitFor: 1500,
        position: 'below'
      },
      {
        title: 'FAB Guía contextual',
        body: 'Cada sub-tab tiene su **FAB «Guía»** específico. En Ajustes → Guías: toggle global, guías vistas, «Reiniciar todas».',
        target: '.guide-fab',
        waitFor: 1500,
        position: 'above'
      },
      {
        title: '¡Listo!',
        body: 'Domina la láctea: registra controles oficiales, vigila tanques, analiza MOFA, usa gráficos para decisiones. La guía de cada sub-tab está en su FAB.',
        target: null,
        position: 'center'
      }
    ]
  });
})();