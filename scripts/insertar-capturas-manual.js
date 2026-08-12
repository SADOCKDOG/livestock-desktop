#!/usr/bin/env node
/**
 * Inserta <img src="img/ARCHIVO.png" alt="descripción"> dentro de cada
 * <div class="screenshot-placeholder" data-shot="ARCHIVO"> en los 6 manuales.
 * Usa mapeo explicit data-shot -> archivo real en manual/img/.
 */

const fs = require('fs');
const path = require('path');

const MANUAL_DIR = path.join(__dirname, '..', 'manual');
const IMG_DIR = path.join(MANUAL_DIR, 'img');
const MANUALES = [
  'manual-dashboard-ganaderia.html',
  'manual-comercializacion.html',
  'manual-explotacion-produccion.html',
  'manual-sanidad-reproduccion.html',
  'manual-informes.html',
  'manual-configuracion-documentos.html'
];

// Mapeo data-shot (en HTML) -> archivo real en manual/img/
const MAP = {
  // Dashboard & Ganadería
  'dashboard-kpis': 'dashboard-kpis.png',
  'dashboard-bento': 'dashboard-bento-grid.png',
  'dashboard-alertas': 'dashboard-alertas.png',
  'ganaderia-carrusel': 'ganaderia-carrusel.png',
  'animales-lista': 'animales-lista.png',
  'animales-ficha': 'animales-ficha-wizard.png',
  'rebanos-detalle': 'rebanos-detalle.png',
  'zonas-sobrepastoreo': 'zonas-sobrepastoreo.png',
  'zonas-demo': 'zonas-demo-chamorro.png',
  'wizard-censo': 'wizard-censo-paso1.png',
  'wizard-crotales': 'wizard-crotales-paso2.png',
  'wizard-finca': 'wizard-finca-paso3.png',

  // Explotación & Producción
  'explotacion-carrusel': 'explotacion-carrusel-11tabs.png',
  'explotacion-balance': 'explotacion-balance-unificado.png',
  'lacteo-dashboard': 'lacteo-dashboard.png',
  'wizard-ordeño-paso1': 'wizard-ordeño-paso1.png',
  'wizard-ordeño-paso2': 'wizard-ordeño-paso2.png',
  'wizard-ordeño-paso3': 'wizard-ordeño-paso3.png',
  'wizard-albaran-leche-paso1': 'wizard-albaran-leche-paso1.png',
  'wizard-albaran-leche-paso2': 'wizard-albaran-leche-paso2.png',
  'tanques-lista': 'tanques-lista-gauge.png',
  'silos-gauge': 'silos-gauge-svg.png',

  // Comercialización
  'comercializacion-carrusel': 'comercializacion-carrusel.png',
  'comercializacion-carne-kpis': 'comercializacion-carne-kpis.png',
  'wizard-venta-masiva-paso1': 'wizard-venta-masiva-paso1.png',
  'wizard-venta-masiva-paso2': 'wizard-venta-masiva-paso2.png',
  'wizard-venta-masiva-paso3': 'wizard-venta-masiva-paso3.png',
  'wizard-venta-masiva-paso4': 'wizard-venta-masiva-paso4.png',
  'wizard-venta-masiva-paso5': 'wizard-venta-masiva-paso5.png',
  'comercializacion-leche-kpis': 'comercializacion-leche-kpis.png',
  'compradores-listado': 'compradores-listado.png',
  'compradores-detalle': 'compradores-detalle.png',
  'compradores-nuevo': 'compradores-nuevo.png',
  'proveedores-listado': 'proveedores-listado.png',
  'proveedores-detalle': 'proveedores-detalle.png',
  'proveedores-nuevo': 'proveedores-nuevo.png',
  'transportistas-listado': 'transportistas-listado.png',
  'transportistas-nuevo': 'transportistas-nuevo.png',
  'contratos-listado': 'contratos-listado.png',
  'contratos-detalle': 'contratos-detalle.png',
  'contratos-nuevo': 'contratos-nuevo.png',
  'albaranes-historial': 'albaranes-historial.png',
  'albaranes-detalle': 'albaranes-detalle.png',

  // Sanidad & Reproducción
  'sanidad-tabs': 'sanidad-tabs-internos.png',
  'wizard-tratamiento-paso1': 'wizard-tratamiento-paso1.png',
  'wizard-tratamiento-paso2': 'wizard-tratamiento-paso2.png',
  'wizard-vacunacion-paso1': 'wizard-vacunacion-paso1.png',
  'botiquin-lista': 'botiquin-lista-fefo.png',
  'wizard-parto-paso2': 'wizard-parto-paso2.png',

  // Informes
  'informes-sidebar': 'informes-sidebar-categoria.png',
  'informes-expro-graficos': 'informes-expro-graficos.png',
  'informes-libros-export': 'informes-libros-export-csv.png',

  // Configuración & Documentos
  'ajustes-general': 'ajustes-general.png',
};

function procesarManual(nombreArchivo) {
  const ruta = path.join(MANUAL_DIR, nombreArchivo);
  if (!fs.existsSync(ruta)) {
    console.log(`⚠  ${nombreArchivo}: NO ENCONTRADO`);
    return { archivo: nombreArchivo, insertados: 0, errores: ['no existe'] };
  }

  let html = fs.readFileSync(ruta, 'utf8');
  let insertados = 0;
  const errores = [];

  // Regex para encontrar placeholders
  const regex = /<div class="screenshot-placeholder" data-shot="([^"]+)">\s*<span class="shot-label">\[CAPTURA\] [^<]+<\/span>\s*<span class="shot-desc">([^<]+)<\/span>\s*<\/div>/g;

  html = html.replace(regex, (match, dataShot, shotDesc) => {
    const imgFile = MAP[dataShot];
    if (!imgFile) {
      errores.push(`Sin mapeo: data-shot="${dataShot}"`);
      return match;
    }

    const imgPath = path.join(IMG_DIR, imgFile);
    if (!fs.existsSync(imgPath)) {
      errores.push(`Imagen no existe: ${imgFile} (data-shot=${dataShot})`);
      return match;
    }

    const imgTag = `<img src="img/${imgFile}" alt="${shotDesc.replace(/"/g, '"')}" loading="lazy">`;
    insertados++;

    // Reconstruye el div con la imagen como primer hijo
    return `<div class="screenshot-placeholder" data-shot="${dataShot}">\n  ${imgTag}\n  <span class="shot-label">[CAPTURA] ${imgFile}</span>\n  <span class="shot-desc">${shotDesc}</span>\n</div>`;
  });

  if (insertados > 0 || errores.length > 0) {
    fs.writeFileSync(ruta, html, 'utf8');
    console.log(`✓  ${nombreArchivo}: ${insertados} imágenes insertadas${errores.length ? `, ${errores.length} errores` : ''}`);
    if (errores.length) errores.forEach(e => console.log(`     - ${e}`));
  } else {
    console.log(`-  ${nombreArchivo}: sin placeholders procesados`);
  }

  return { archivo: nombreArchivo, insertados, errores };
}

// Ejecutar
console.log('=== Insertando capturas en manuales ===\n');

let totalInsertados = 0;
let totalErrores = 0;

for (const m of MANUALES) {
  const r = procesarManual(m);
  totalInsertados += r.insertados;
  totalErrores += r.errores.length;
}

console.log(`\n=== Resumen ===`);
console.log(`Total insertados: ${totalInsertados}`);
console.log(`Total errores: ${totalErrores}`);

// Verificación final
console.log('\n=== Verificación: placeholders sin imagen ===');
for (const m of MANUALES) {
  const ruta = path.join(MANUAL_DIR, m);
  if (!fs.existsSync(ruta)) continue;
  const html = fs.readFileSync(ruta, 'utf8');
  const placeholders = [...html.matchAll(/<div class="screenshot-placeholder" data-shot="([^"]+)"[^>]*>(?!\s*<img)/g)];
  if (placeholders.length) {
    console.log(`  ${m}: ${placeholders.length} pendientes -> ${placeholders.map(p => p[1]).join(', ')}`);
  }
}