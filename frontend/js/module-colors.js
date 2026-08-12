/**
 * module-colors.js — MAPA ÚNICO de colores de módulo (estándar Cork Manager).
 * Normativa: .agent/AGENTS.md §1 · Tokens CSS equivalentes: css/design-tokens.css.
 * PROHIBIDO duplicar mapas de color en menús/vistas: consumir siempre este objeto.
 */
window.MODULE_COLORS = Object.freeze({
  // Success / Zonas / Carne / Ventas (usando verde institucional)
  '/': '#15803D',
  '/explotacion': '#15803D',
  '/zonas': '#15803D',
  '/instalaciones': '#15803D',
  '/instalacion': '#15803D',
  '/saneamientos': '#15803D',
  '/saneamiento': '#15803D',
  '/subexplotaciones': '#15803D',
  '/subexplotacion': '#15803D',
  '/botiquin': '#15803D',
  '/botiquin-producto': '#15803D',
  '/animal-bitacora': '#F97316',
  '/carne': '#15803D',
  '/comercializacion': '#1F5FA8',
  '/trazabilidad': '#1F5FA8',
  // Danger / Gastos (usando rojo serio)
  '/ganaderia': '#B91C1C',
  '/gastos': '#B91C1C',
  // Info / Leche / Listas (usando azul corporativo)
  '/leche': '#1F5FA8',
  '/rebanos': '#1F5FA8',
  '/compradores': '#1F5FA8',
  // Warning / Informes / Alertas (usando marrón atención)
  '/informes': '#B45309',
  '/alertas': '#B45309',
  // Naranja de módulo: Animales / Cuaderno (acento secundario)
  '/animales': '#F97316',
  '/cuaderno': '#F97316',
  // Violeta de módulo: Proveedores / Manuales / Documentos-Trámites (acento secundario)
  '/proveedores': '#A855F7',
  '/manuales': '#A855F7',
  '/documentos': '#A855F7',
  // Rosa de módulo: Logística (acento secundario)
  '/transportistas': '#EC4899',
  // Neutro
  '/ajustes': '#B1B1B1',
  '/importar-rfid': '#B1B1B1',
  // Alias de rutas de detalle (heredan el color de su módulo)
  '/animal': '#F97316',
  '/rebano': '#1F5FA8',
  '/zona': '#15803D',
  '/comprador': '#1F5FA8',
  '/proveedor': '#A855F7',
  '/gasto': '#B91C1C',
  '/venta-carne': '#15803D',
  '/albaran-leche': '#1F5FA8',
  '/contrato': '#1F5FA8'
});

/** Color de un módulo por ruta (fallback: lima corporativo). */
window.getModuleColor = function (path) {
  return window.MODULE_COLORS[path] || '#C5FA50';
};
