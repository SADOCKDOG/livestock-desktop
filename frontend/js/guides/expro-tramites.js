/**
 * Livestock Manager - Guía Trámites (ExPro)
 * Tour guiado de la pestaña Trámites: 6 sub-tabs de gestión documental SIGGAN.
 * Los botones de sub-tab no exponen data-tab ni la clase .tramites-sub-tabs; se
 * localizan por su onclick real (ExplotacionView._cambiarTramiteSubTab), verificado
 * contra el DOM del dispositivo.
 */
(function () {
  'use strict';

  GuideRegistry.register({
    id: 'expro.tramites',
    pillar: 'expro',
    route: '/explotacion',
    tab: 'tramites',
    applies: (flags) => true,
    disponible: async () => {
      if (!window.db) return true;
      try {
        const fincaId = window.Fincas ? await Fincas.getActiveId() : null;
        if (!fincaId) return false;
        // comprobar documentos_legales (guías y censos) y movimientos_ganado (traslados) de ESTA finca
        const [docs, movimientos] = await Promise.all([
          window.db.getAll('documentos_legales').catch(() => []),
          window.db.getAllFromIndex('movimientos_ganado', 'fincaId', fincaId).catch(() => [])
        ]);
        const guiasFinca = (docs || []).filter(g =>
          (g.tipo === 'guia_movimiento' || g.tipo_documento === 'guia_movimiento') &&
          (g.fincaId === undefined || Number(g.fincaId) === Number(fincaId)) && !g.anulado
        );
        const censosFinca = (docs || []).filter(d => (d.tipo === 'DECLARACION_CENSAL' || d.tipo === 'censo_anual') && !d.anulado);
        const trasladosFinca = (movimientos || []).filter(m => m.tipo === 'traslado' && !m.anulado);
        return guiasFinca.length > 0 || censosFinca.length > 0 || trasladosFinca.length > 0;
      } catch (e) {
        console.warn('[expro.tramites] disponible error:', e);
        return true;
      }
    },
    steps: [
      {
        title: 'Bienvenido a Trámites SIGGAN',
        body: 'Esta pestaña (**Trámites**) centraliza la **gestión documental oficial** (SIGGAN/REGA). 6 sub-tabs: **Guías** (DIMOE movimientos), **Censo** (declaración anual + libro registro), **Crotales** (pedido identificadores), **Traslado** (movimientos internos), **Infolac** (entregas industria láctea), **Archivo** (exportación, memoria anual). Color azul (--c-info).',
        target: null,
        position: 'center'
      },
      {
        title: 'Sub-pestañas de navegación (sidebar)',
        body: 'En el sidebar, bajo **Trámites**, el submenú **Guías DIMOE, Censo Anual, Crotales, Traslados, Infolac, Archivo**. Cada una con icono y color propio. Click para cambiar sin recargar.',
        target: '.sidebar-group-toggle[data-group-toggle="expro::tramites"]',
        waitFor: 1000,
        position: 'below'
      },
      {
        title: 'Guías — Movimientos DIMOE',
        body: 'Sub-pestaña **Guías**: botón «Emitir Nueva Guía DIMOE» (wizard WizardGuiaMovimiento) en el marco de registro. Historial guías emitidas: número, fecha, destino, estado (REGISTRADA/ENVIADA/ANULADA). Click abre detalle. Exportación XML/CSV para SIGGAN.',
        target: '.sidebar-link[data-route="/explotacion?tab=tramites&sub=guias"]',
        waitFor: 1500,
        position: 'above'
      },
      {
        title: 'Censo — Declaración Anual REGA',
        body: 'Sub-pestaña **Censo**: botón «Generar Declaración Censal» (wizard WizardCenso) en el marco de registro. Accesos directos: «Libro Registro» (cuaderno digital) e «Informe REGA» (InformesView). Historial censos: año, fecha declaración, total cabezas, badge OFICIAL.',
        target: '.sidebar-link[data-route="/explotacion?tab=tramites&sub=censo"]',
        waitFor: 1500,
        position: 'above'
      },
      {
        title: 'Crotales — Pedido Identificadores',
        body: 'Sub-pestaña **Crotales**: botón «Pedir Nuevos Crotales» (wizard WizardCrotales) en el marco de registro. Historial pedidos: ID, fecha, cantidad, estado (PENDIENTE/ENVIADO/RECIBIDO). Trazabilidad completa de identificadores recibidos y asignados.',
        target: '.sidebar-link[data-route="/explotacion?tab=tramites&sub=crotales"]',
        waitFor: 1500,
        position: 'above'
      },
      {
        title: 'Traslado — Movimientos Internos',
        body: 'Sub-pestaña **Traslado**: botón «Registrar Movimiento Interno» (wizard WizardTraslado) en el marco de registro. Historial traslados: fecha, cabezas, rebaño origen → destino, badge COMPLETADO. Registra evento en auditoría y actualiza zona/rebaño de animales.',
        target: '.sidebar-link[data-route="/explotacion?tab=tramites&sub=traslado"]',
        waitFor: 1500,
        position: 'above'
      },
      {
        title: 'Infolac — Entregas Industria Láctea',
        body: 'Sub-pestaña **Infolac** (solo si Leche=ON): botón «Ver Entregas para Infolac» (enlaza a ComercializacionView) en el marco de registro. Historial declaraciones: fecha recogida, cisterna, litros, estado tramitación. Requisito para industrias lácteas.',
        target: '.sidebar-link[data-route="/explotacion?tab=tramites&sub=infolac"]',
        waitFor: 1500,
        position: 'above'
      },
      {
        title: 'Archivo — Exportación y Memoria',
        body: 'Sub-pestaña **Archivo**: 3 tarjetas de acción: **Libro Registro** (cuaderno digital completo), **Exportación SIGGAN** (XML/CSV formatos oficiales CCAA), **Memoria Anual** (balances entrada/salida/existencias por campaña, en InformesView).',
        target: '.sidebar-link[data-route="/explotacion?tab=tramites&sub=archivo"]',
        waitFor: 1500,
        position: 'above'
      },
      {
        title: 'FAB Guía contextual por sub-tab',
        body: 'Cada sub-tab tiene su **FAB «Guía»** específico. En Ajustes → Guías: toggle global, guías vistas, «Reiniciar todas».',
        target: '.guide-fab',
        waitFor: 1500,
        position: 'above'
      },
      {
        title: '¡Listo!',
        body: 'Domina trámites: emite guías DIMOE, declara censos, pide crotales, registra traslados, tramita Infolac, exporta SIGGAN. La guía de cada sub-tab está en su FAB.',
        target: null,
        position: 'center'
      }
    ]
  });
})();
