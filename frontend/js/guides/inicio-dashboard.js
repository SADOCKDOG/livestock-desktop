/**
 * Livestock Manager - Guía del Inicio / Dashboard
 * Tour de bienvenida a la pantalla principal (home). Explica el Registro Rápido,
 * los KPIs, las alertas/agenda y el acceso a la propia guía.
 *
 * NOTA (capa ERP desktop): catálogo propio del desktop (está en $preservedList de
 * scripts/sync-from-master.ps1) porque el maestro no incluye guía para el Dashboard.
 */
(function () {
  'use strict';

  GuideRegistry.register({
    id: 'inicio.dashboard',
    pillar: 'gegan', // home: usa el verde lima de GeGan como color de acento
    route: '/',
    tab: null, // panorámica del Inicio
    applies: () => true,
    disponible: async () => {
      try {
        return !!(window.Fincas && await Fincas.getActiveId());
      } catch (e) {
        return false;
      }
    },
    steps: [
      {
        title: 'Bienvenido al Inicio',
        body: 'Esta es tu **pantalla principal**. Reúne en un vistazo el **Registro Rápido** de operaciones, los **KPIs** de la finca, las **alertas** y el **calendario preventivo**. Usa «No mostrar de nuevo» si ya la conoces.',
        target: null,
        position: 'center'
      },
      {
        title: 'Registro Rápido de Actividad',
        body: 'Desde aquí lanzas en un clic las operaciones de campo más frecuentes: **Control Lechero, Pesaje, Tratamiento, Gasto, Alta de Animal, Silos, Traslados, Censo, Crotales, Guía de Movimiento** y **Albarán de Leche**. Cada tarjeta abre el asistente o wizard correspondiente.',
        target: '.card-registro-quick',
        waitFor: 1000,
        position: 'below'
      },
      {
        title: 'KPIs y estado de la finca',
        body: 'La tarjeta de **KPIs diarios** resume la producción (L/día por animal), la **eficiencia del pienso** (g/L) y el **% de bajas**. Si tienes el módulo de Leche activo, verás también los **Indicadores Lácteos** (MOFA, precio y ext. seca). Sin datos suficientes, la tarjeta te lo indica.',
        target: null,
        position: 'center'
      },
      {
        title: 'Alertas y Agenda',
        body: 'Aquí se agrupan las **alertas sanitarias** (supresión de fármacos), de **trazabilidad**, **administrativas/PAC** y las **tareas de la agenda** pendientes. Pulsa sobre una alerta o en «Ver Alertas Completas» para profundizar.',
        target: '#dash-alertas-container',
        waitFor: 1000,
        position: 'below'
      },
      {
        title: 'Nueva Actividad (FAB)',
        body: 'El botón flotante **«Nueva Actividad»** despliega el submenú de registros (igual que el Registro Rápido pero en forma de menú). Úsalo cuando quieras anyadir algo sin volver al grid superior.',
        target: '.fab-container',
        waitFor: 1000,
        position: 'above'
      },
      {
        title: 'Guía interactiva',
        body: 'En cualquier sección verás este botón **«Guía»** para relanzar el tour de esa vista. Puedes repetirlo las veces que quieras: completarlo o pulsar «Saltar» no lo bloquea.',
        target: '.guide-fab',
        waitFor: 1500,
        position: 'above'
      }
    ]
  });
})();
