const fs = require('fs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function createTestCatastroPDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Texto de muestra que coincida con los patrones del parser
  const lines = [
    { text: 'CONSULTA DESCRIPTIVA Y GRÁFICA DE DATOS CATASTRALES', bold: true, size: 12, x: 50, y: 780 },
    { text: '', size: 10, x: 50, y: 760 },
    { text: 'Referencia Catastral: 12345A67890123BC', size: 10, x: 50, y: 740 },
    { text: 'Polígono 1 Parcela 2', size: 10, x: 50, y: 720 },
    { text: 'Paraje El Roble. Municipio de Cáceres (Cáceres)', size: 10, x: 50, y: 700 },
    { text: 'Localización: Paraje El Roble. Polígono 1 Parcela 2', size: 10, x: 50, y: 680 },
    { text: 'Clase Rústico', size: 10, x: 50, y: 660 },
    { text: 'Uso principal Pastos', size: 10, x: 50, y: 640 },
    { text: 'Superficie gráfica 10.000,00', size: 10, x: 50, y: 620 },
    { text: 'Superficie construida 0,00', size: 10, x: 50, y: 600 },
    { text: '', size: 10, x: 50, y: 580 },
    { text: 'CULTIVO', bold: true, size: 10, x: 50, y: 560 },
    { text: 'a Pastos 01 10.000,00', size: 10, x: 50, y: 540 },
    { text: 'b Cultivo herbáceo 02 5.000,00', size: 10, x: 50, y: 520 },
    { text: '', size: 10, x: 50, y: 500 },
    { text: 'CONSTRUCCIÓN', bold: true, size: 10, x: 50, y: 480 },
  ];

  for (const line of lines) {
    if (!line.text) continue;
    page.drawText(line.text, {
      x: line.x,
      y: line.y,
      size: line.size,
      font: line.bold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('test-catastro.pdf', pdfBytes);
  console.log('PDF creado: test-catastro.pdf');
}

createTestCatastroPDF().catch(console.error);