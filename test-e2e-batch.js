// Test E2E batch - procesa los 11 PDFs SIGPAC disponibles
// Uso: node test-e2e-batch.mjs

import fs from 'fs';
import path from 'path';
// Use CommonJS require for legacy build
const { getDocument, GlobalWorkerOptions } = require('pdfjs-dist/legacy/build/pdf.js');

GlobalWorkerOptions.workerSrc = '';

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

    const ref = texto.match(/[0-9]{5}[A-Z][0-9]{12}[A-Z]{2}/i) ||
                texto.match(/[0-9]{7}[A-Z]{2}[0-9]{4}[A-Z][0-9]{4}[A-Z]{2}/i);
    if (ref) d.refCatastral = ref[0].toUpperCase();

    const pol = texto.match(/Pol[íi]gono\s+(\d+)\s+Parcela\s+(\d+)/i);
    if (pol) {
        d.poligono = parseInt(pol[1], 10);
        d.parcela = parseInt(pol[2], 10);
    }

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

    const uso = texto.match(/Uso\s+principal\s+([A-ZÁÉÍÓÚÑa-zñáéíóú ]{3,20})/i);
    if (uso) d.usoPrincipal = uso[1].trim();

    const sup = texto.match(/Superficie\s+gr[áa]fica\s+([\d.,]+)/i);
    if (sup) d.superficieGrafica = parsearSuperficie(sup[1]);

    const supC = texto.match(/Superficie\s+construida\s+([\d.,]+)/i);
    if (supC) d.superficieConstruida = parsearSuperficie(supC[1]);

    const ano = texto.match(/A[ñn]o\s+construcci[óo]n\s+(\d{4})/i);
    if (ano) d.anoConstruccion = parseInt(ano[1], 10);

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

const carpetaOrigen = "C:\\Users\\yo\\repo\\pesadas-corcho\\_PRIVATE_\\ZONAS";

async function procesarPDF(archivo) {
    const pdfPath = path.join(carpetaOrigen, archivo);
    const nombreBase = path.basename(archivo, '.pdf');
    
    try {
        const data = fs.readFileSync(pdfPath);
        const pdf = await getDocument({ data: data.buffer }).promise;
        const lineas = await extraerLineas(pdf);
        const resultado = parsearCatastro(lineas);
        
        // Verificar croquis
        let croquisOK = false;
        try {
            const pagina = await pdf.getPage(1);
            const viewport = pagina.getViewport({ scale: 1.5 });
            croquisOK = viewport.width > 0 && viewport.height > 0;
        } catch {}
        
        return {
            archivo,
            nombreBase,
            ok: true,
            refCatastral: resultado.refCatastral,
            poligono: resultado.poligono,
            parcela: resultado.parcela,
            superficieM2: resultado.superficieGrafica,
            superficieHa: m2AHectareas(resultado.superficieGrafica),
            usoPrincipal: resultado.usoPrincipal,
            clase: resultado.clase,
            paraje: resultado.paraje,
            municipio: resultado.municipio,
            provincia: resultado.provincia,
            numCultivos: resultado.cultivos.length,
            numConstrucciones: resultado.construcciones.length,
            cultivos: resultado.cultivos,
            construcciones: resultado.construcciones,
            croquisOK
        };
    } catch (e) {
        return { archivo, nombreBase, ok: false, error: e.message };
    }
}

async function main() {
    console.log('🚀 Iniciando test batch de 11 PDFs SIGPAC...\n');
    
    const archivos = fs.readdirSync(carpetaOrigen)
        .filter(f => f.toLowerCase().endsWith('.pdf'))
        .sort();
    
    console.log(`Encontrados ${archivos.length} PDFs:\n`);
    
    const resultados = [];
    for (const archivo of archivos) {
        console.log(`📄 Procesando: ${archivo}...`);
        const r = await procesarPDF(archivo);
        resultados.push(r);
        
        if (r.ok) {
            console.log(`   ✅ Ref: ${r.refCatastral} | Pol: ${r.poligono} Par: ${r.parcela} | ${r.superficieHa} ha | ${r.usoPrincipal} | ${r.numCultivos} cultivos | ${r.numConstrucciones} constr. | Croquis: ${r.croquisOK ? 'OK' : 'Failed'}`);
        } else {
            console.log(`   ❌ Error: ${r.error}`);
        }
        console.log('');
    }
    
    // Resumen
    const ok = resultados.filter(r => r.ok).length;
    const fail = resultados.filter(r => !r.ok).length;
    const totalCultivos = resultados.reduce((s, r) => s + (r.numCultivos || 0), 0);
    const totalConstrucciones = resultados.reduce((s, r) => s + (r.numConstrucciones || 0), 0);
    
    console.log('═'.repeat(80));
    console.log(`📊 RESUMEN FINAL: ${ok}/${resultados.length} OK, ${fail} fallos`);
    console.log(`   Total cultivos detectados: ${totalCultivos}`);
    console.log(`   Total construcciones detectadas: ${totalConstrucciones}`);
    console.log(`   Croquis renderizados OK: ${resultados.filter(r => r.croquisOK).length}/${resultados.length}`);
    console.log('═'.repeat(80));
    
    // Mostrar detalles por PDF
    console.log('\n📋 DETALLE POR PDF:');
    for (const r of resultados) {
        if (!r.ok) continue;
        console.log(`\n${r.archivo}:`);
        console.log(`  Ref. Catastral: ${r.refCatastral}`);
        console.log(`  Polígono/Parcela: ${r.poligono}/${r.parcela}`);
        console.log(`  Superficie: ${r.superficieM2} m² (${r.superficieHa} ha)`);
        console.log(`  Clase: ${r.clase} | Uso: ${r.usoPrincipal}`);
        console.log(`  Paraje: ${r.paraje} | ${r.municipio} (${r.provincia})`);
        if (r.numCultivos > 0) {
            console.log(`  Cultivos (${r.numCultivos}):`);
            r.cultivos.forEach(c => console.log(`    ${c.letra}: ${c.cultivo} (Int: ${c.intensidad}, ${c.superficie} m²)`));
        }
        if (r.numConstrucciones > 0) {
            console.log(`  Construcciones (${r.numConstrucciones}):`);
            r.construcciones.forEach(c => console.log(`    ${c.uso} - Esc${c.escalera} Pl${c.planta} Pt${c.puerta} ${c.superficie} m²`));
        }
    }
    
    // Guardar resultados en JSON para análisis posterior
    const resultadosJSON = resultados.map(r => {
        const { cultivos, construcciones, ...resto } = r;
        return resto;
    });
    fs.writeFileSync('test-batch-resultados.json', JSON.stringify(resultadosJSON, null, 2));
    console.log('\n💾 Resultados guardados en test-batch-resultados.json');
}

main().catch(console.error);