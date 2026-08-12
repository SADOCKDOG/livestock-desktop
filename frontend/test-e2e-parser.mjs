// Test E2E script for pdf-catastro.js using pdf.js in Node.js
// Since pdf.js is loaded from CDN in browser, we'll use pdfjs-dist in Node

import fs from 'fs';
import path from 'path';

// Use pdfjs-dist for Node.js testing (ES modules) - named exports
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Set worker source - in Node we don't need a worker
GlobalWorkerOptions.workerSrc = '';

// Copy pure functions from pdf-catastro.js
function parsearSuperficie(str) {
    if (!str) return null;
    const limpio = String(str).replace(/\./g, '').replace(',', '.');
    const n = parseFloat(limpio);
    return Number.isFinite(n) ? n : null;
}

function m2AHectareas(m2) {
    if (!Number.isFinite(m2)) return null;
    return Math.round((m2 / 10000) * 10000) / 10000;
}

async function extraerLineas(pdf) {
    const lineas = [];
    for (let p = 1; p <= pdf.numPages; p++) {
        const pagina = await pdf.getPage(p);
        const contenido = await pagina.getTextContent();
        const grupos = {};
        for (const item of contenido.items) {
            if (!item.str || !item.str.trim()) continue;
            // Se redondea la Y a múltiplos de 2 para tolerar diferencias de baseline
            const y = Math.round(item.transform[5] / 2) * 2;
            const x = item.transform[4];
            (grupos[y] = grupos[y] || []).push({ x, str: item.str });
        }
        const ys = Object.keys(grupos).map(Number).sort((a, b) => b - a);
        for (const y of ys) {
            const linea = grupos[y]
                .sort((a, b) => a.x - b.x)
                .map(i => i.str)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (linea) lineas.push(linea);
        }
    }
    return lineas;
}

function parsearCatastro(lineas) {
    const d = {
        refCatastral: null,
        poligono: null, parcela: null,
        paraje: null, municipio: null, provincia: null,
        localizacion: null,
        clase: null, usoPrincipal: null,
        superficieGrafica: null, superficieConstruida: null,
        anoConstruccion: null,
        cultivos: [], construcciones: []
    };

    const texto = lineas.join('\n');

    // Referencia catastral: rústica (5 díg + letra + 12 díg + 2 letras) o urbana.
    const ref = texto.match(/[0-9]{5}[A-Z][0-9]{12}[A-Z]{2}/i) ||
                texto.match(/[0-9]{7}[A-Z]{2}[0-9]{4}[A-Z][0-9]{4}[A-Z]{2}/i);
    if (ref) d.refCatastral = ref[0].toUpperCase();

    const pol = texto.match(/Pol[íi]gono\s+(\d+)\s+Parcela\s+(\d+)/i);
    if (pol) {
        d.poligono = parseInt(pol[1], 10);
        d.parcela = parseInt(pol[2], 10);
    }

    // Localización, paraje, municipio y provincia: se buscan en las líneas
    // siguientes a la de "Polígono X Parcela Y".
    for (let i = 0; i < lineas.length; i++) {
        if (!/Pol[íi]gono\s+\d+\s+Parcela\s+\d+/i.test(lineas[i])) continue;

        d.localizacion = (i > 0 && /Localizaci[óo]n/i.test(lineas[i - 1]))
            ? lineas[i - 1].replace(/Localizaci[óo]n:?\s*/i, '').trim() + ' ' + lineas[i]
            : lineas[i];

        for (let j = i + 1; j < Math.min(i + 8, lineas.length); j++) {
            const m = lineas[j].match(
                /^([A-ZÁÉÍÓÚÑa-zñáéíóú\s\-,]+?)\.\s*([A-ZÁÉÍÓÚÑa-zñáéíóú\s\-,]+?)\s*\(([A-ZÁÉÍÓÚÑa-zñáéíóú\s]+)\)/
            );
            if (m) {
                d.paraje = m[1].trim();
                d.municipio = m[2].trim();
                d.provincia = m[3].trim();
                d.localizacion += ' ' + lineas[j];
                break;
            }
        }
        if (d.paraje) break;
    }

    const clase = texto.match(/Clase\s+(R[úu]stico|Urbano|BICE|Agrario|Industrial)/i);
    if (clase) d.clase = clase[1];

    // Espacio literal en la clase, NO \s: con \s la captura se comía el salto de
    // línea y arrastraba el encabezado siguiente ("Agrario\nPARC" en 9 de los 11
    // PDFs de prueba). Este defecto venía del parser original de Cork.
    const uso = texto.match(/Uso\s+principal\s+([A-ZÁÉÍÓÚÑa-zñáéíóú ]{3,20})/i);
    if (uso) d.usoPrincipal = uso[1].trim();

    const sup = texto.match(/Superficie\s+gr[áa]fica\s+([\d.,]+)/i);
    if (sup) d.superficieGrafica = parsearSuperficie(sup[1]);

    const supC = texto.match(/Superficie\s+construida\s+([\d.,]+)/i);
    if (supC) d.superficieConstruida = parsearSuperficie(supC[1]);

    const ano = texto.match(/A[ñn]o\s+construcci[óo]n\s+(\d{4})/i);
    if (ano) d.anoConstruccion = parseInt(ano[1], 10);

    // CULTIVOS SIGPAC: "a FE Encinar 02 55.460"
    const iCultivo = lineas.findIndex(l => /^CULTIVO/i.test(l.trim()));
    if (iCultivo >= 0) {
        for (let i = iCultivo + 1; i < lineas.length; i++) {
            const l = lineas[i].trim();
            if (/^(CONSTRUCCI|PARCELA)/i.test(l)) break;
            if (!l || /^Subparcela/i.test(l)) continue;
            const m = l.match(/^([a-z0-9])\s+(.+?)\s+(\d{2})\s+([\d.,]+)\s*$/i);
            if (m) {
                d.cultivos.push({
                    letra: m[1].toLowerCase(),
                    cultivo: m[2].trim(),
                    intensidad: m[3],
                    superficie: parsearSuperficie(m[4])
                });
            }
        }
    }

    // CONSTRUCCIONES: "USO ESCALERA PLANTA PUERTA SUPERFICIE"
    const iConst = lineas.findIndex(l => /^CONSTRUCCI[ÓO]N/i.test(l.trim()));
    if (iConst >= 0) {
        for (let i = iConst + 1; i < lineas.length; i++) {
            const l = lineas[i].trim();
            if (/^(CULTIVO|PARCELA)/i.test(l)) break;
            if (!l || /^(Subparcela|Uso)/i.test(l)) continue;
            const m = l.match(/^([A-ZÁÉÍÓÚÑ\s]+?)\s+(\d+)\s+(\w{1,3})\s+(\w{1,3})\s+([\d.,]+)\s*$/);
            if (m) {
                d.construcciones.push({
                    uso: m[1].trim(),
                    escalera: m[2],
                    planta: m[3],
                    puerta: m[4],
                    superficie: parsearSuperficie(m[5])
                });
            }
        }
    }

    return d;
}

async function testWithRealPDF() {
    const pdfPath = path.join(__dirname, 'test-catastro-real.pdf');
    
    if (!fs.existsSync(pdfPath)) {
        console.error('PDF not found at:', pdfPath);
        return;
    }

    console.log('Loading PDF:', pdfPath);
    const data = fs.readFileSync(pdfPath);
    
    console.log('Loading pdf.js document...');
        const pdf = await getDocument({ data: data.buffer }).promise;
    console.log('Pages:', pdf.numPages);

    console.log('\n=== EXTRAYENDO LÍNEAS ===');
    const lineas = await extraerLineas(pdf);
    console.log(`Total líneas extraídas: ${lineas.length}`);
    console.log('\n--- Primeras 30 líneas ---');
    lineas.slice(0, 30).forEach((l, i) => console.log(`${i}: ${l}`));

    console.log('\n--- Líneas con "Polígono", "Parcela", "Referencia", "CULTIVO", "Superficie" ---');
    lineas.forEach((l, i) => {
        if (/pol[ií]gono|parcela|referencia|cultivo|superficie|clase|uso|paraje|municipio|provincia|construcci/i.test(l)) {
            console.log(`${i}: ${l}`);
        }
    });

    console.log('\n=== PARSEANDO CATASTRO ===');
    const resultado = parsearCatastro(lineas);
    console.log(JSON.stringify(resultado, null, 2));

    console.log('\n=== VERIFICACIÓN ===');
    console.log('refCatastral:', resultado.refCatastral);
    console.log('poligono:', resultado.poligono);
    console.log('parcela:', resultado.parcela);
    console.log('superficieGrafica (m2):', resultado.superficieGrafica);
    console.log('superficie (ha):', m2AHectareas(resultado.superficieGrafica));
    console.log('usoPrincipal:', resultado.usoPrincipal);
    console.log('cultivos:', resultado.cultivos.length);
    if (resultado.cultivos.length > 0) {
        console.log('  Detalle cultivos:', JSON.stringify(resultado.cultivos, null, 2));
    }
    console.log('paraje:', resultado.paraje);
    console.log('municipio:', resultado.municipio);
    console.log('provincia:', resultado.provincia);
    console.log('clase:', resultado.clase);
    
    // Check what ImportarZonasView expects
    console.log('\n=== CAMPOS QUE ESPERA IMPORTARZONASVIEW ===');
    const camposEsperados = [
        'refCatastral', 'poligono', 'parcela', 'paraje', 'municipio', 'provincia',
        'localizacion', 'clase', 'usoPrincipal', 'superficieGrafica', 
        'superficie', 'superficieConstruida', 'anoConstruccion', 'cultivos', 'construcciones'
    ];
    camposEsperados.forEach(c => {
        const valor = c === 'superficie' ? m2AHectareas(resultado.superficieGrafica) : resultado[c];
        console.log(`  ${c}: ${valor !== null && valor !== undefined ? JSON.stringify(valor) : 'null/undefined'}`);
    });
    
    // Ahora probar renderizarCroquis (simulado)
    console.log('\n=== RENDERIZANDO CROQUIS (página 1) ===');
    try {
        const pagina = await pdf.getPage(1);
        const viewport = pagina.getViewport({ scale: 1.5 });
        console.log(`Viewport: ${viewport.width}x${viewport.height}`);
        console.log('Croquis renderizado OK (en browser sería canvas.toBlob)');
    } catch (e) {
        console.error('Error renderizando croquis:', e.message);
    }
}

testWithRealPDF().catch(console.error);