/**
 * Playwright E2E test for ImportarZonasView
 * Tests the full flow: PDF upload → processing → review screen → save
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = 'C:/Users/yo/repo/LIVESTOCK-MANAGER';
const PORT = 8871;
const BASE_URL = `http://localhost:${PORT}`;

// Simple HTTP server
function startServer() {
  const http = require('http');
  const mime = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json',
    '.pdf': 'application/pdf',
    '.map': 'application/json',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
  };

  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const f = path.join(PROJECT_ROOT, p);
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    server.listen(PORT, () => resolve(server));
  });
}

test.describe('Importar Zonas - Parser Catastro E2E', () => {
  let server;
  let browser;
  let context;
  let page;

  test.beforeAll(async () => {
    server = await startServer();
    const { chromium } = require('playwright');
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
    page = await context.newPage();
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[CONSOLE ERROR] ${msg.text()}`);
      }
    });
    page.on('pageerror', err => {
      console.log(`[PAGE ERROR] ${err.message}`);
    });
  });

  test.afterAll(async () => {
    await browser.close();
    server.close();
  });

  test('Complete flow: PDF upload → processing → review → save', async () => {
    // 1. Navigate to app
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
    
    // 2. Wait for app to initialize
    await page.waitForFunction('!!window.App && !!window.Fincas', { timeout: 90000 });
    console.log('App initialized');
    
    // 3. Ensure seed data exists
    await page.evaluate(async () => {
      let id = await Fincas.getActiveId().catch(() => null);
      if (!id) {
        if (window.AsistenteConfiguracion?._ensureSeedData) await AsistenteConfiguracion._ensureSeedData();
        if (window.SeedData?.run) await SeedData.run(true);
      }
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction('!!window.App', { timeout: 90000 });
    await page.waitForTimeout(3000);
    console.log('App ready with data');

    // 4. Navigate to importar-zonas
    await page.evaluate(() => { location.hash = '#/importar-zonas'; });
    
    // 5. Wait for selector view
    await page.waitForSelector('#pdf-files', { timeout: 15000 });
    console.log('Selector view rendered');

    // 6. Upload PDF
    const pdfPath = path.join(PROJECT_ROOT, 'test-catastro.pdf');
    const fileInput = await page.$('#pdf-files');
    await fileInput.setInputFiles(pdfPath);
    console.log('PDF uploaded');

    // 7. Wait for continue button to enable
    await page.waitForFunction(() => {
      const btn = document.getElementById('btn-continuar');
      return btn && !btn.disabled;
    }, { timeout: 5000 });
    
    // 8. Click continue to start processing
    await page.click('#btn-continuar');
    console.log('Processing started');

    // 9. Wait for progress to show processing
    await page.waitForSelector('#progress-container:not(.hidden)', { timeout: 5000 });
    console.log('Progress shown');

    // 10. Wait for review screen (step 2)
    // The review screen appears when _renderPasoRevision is called
    await page.waitForFunction(() => {
      const main = document.getElementById('app-content');
      return main && /REVISAR PARCELAS/i.test(main.innerText);
    }, { timeout: 60000 });
    console.log('Review screen visible');

    // 11. Verify review card data
    const reviewData = await page.evaluate(() => {
      const main = document.getElementById('app-content');
      const text = main.innerText;
      
      // Check for key data in the review cards
      const hasRefCatastral = /21009A001000300000WB/i.test(text);
      const hasSuperficie = /4\.3172\s*ha|43\.?172\s*m/i.test(text);
      const hasPoligono = /Pol[íi]gono\s+1/i.test(text);
      const hasParcela = /Parcela\s+30/i.test(text);
      const hasCultivos = /Cultivos?\s*SIGPAC|3\s*cultivos?/i.test(text);
      const hasUsoPrincipal = /Agrario/i.test(text);
      
      // Get card elements
      const cards = document.querySelectorAll('.card-registro');
      
      return {
        hasRefCatastral,
        hasSuperficie,
        hasPoligono,
        hasParcela,
        hasCultivos,
        hasUsoPrincipal,
        cardCount: cards.length,
        fullText: text.slice(0, 2000)
      };
    });
    
    console.log('Review data:', JSON.stringify(reviewData, null, 2));
    
    // Assertions
    expect(reviewData.hasRefCatastral).toBeTruthy();
    expect(reviewData.hasSuperficie).toBeTruthy();
    expect(reviewData.hasPoligono).toBeTruthy();
    expect(reviewData.hasParcela).toBeTruthy();
    expect(reviewData.hasCultivos).toBeTruthy();
    expect(reviewData.hasUsoPrincipal).toBeTruthy();
    expect(reviewData.cardCount).toBeGreaterThanOrEqual(1);
    
    console.log('✅ Review screen data verified');

    // 12. Click save (guardar) - wait for navigation
        await Promise.all([
          page.waitForNavigation({ timeout: 30000, url: '**/#/ganaderia*tab=zonas*' }),
          page.click('.wizard-footer-fixed .btn-create')
        ]);
        console.log('Save clicked, navigated to /ganaderia?tab=zonas');

        // 13. Wait for /zonas view to load
        await page.waitForFunction(() => location.hash.includes('tab=zonas'), { timeout: 10000 });
        console.log('Zonas view loaded');

        // 14. Verify zone was saved
        const savedZone = await page.evaluate(async () => {
          const finca = await Fincas.getActive();
          return finca?.zonas?.find(z => z.refCatastral === '21009A001000300000WB') || null;
        });
    
        expect(savedZone).toBeTruthy();
        expect(savedZone.refCatastral).toBe('21009A001000300000WB');
        expect(savedZone.poligono).toBe(1);
        expect(savedZone.parcela).toBe(30);
        expect(savedZone.superficieGrafica).toBe(43172);
        expect(savedZone.superficie).toBeCloseTo(4.3172, 3);
        expect(savedZone.cultivos).toHaveLength(3);
    
        console.log('✅ Zone saved correctly:', savedZone);
  });

  test('Multiple PDFs with duplicate detection', async () => {
      // Navigate to importar-zonas via hash change (app already initialized)
      await page.evaluate(() => { location.hash = '#/importar-zonas'; });
      await page.waitForSelector('#pdf-files', { timeout: 15000 });
      console.log('Selector view rendered');
    
      // Upload same PDF twice
      const pdfPath = path.join(PROJECT_ROOT, 'test-catastro.pdf');
      const fileInput = await page.$('#pdf-files');
      await fileInput.setInputFiles([pdfPath, pdfPath]);
      console.log('PDFs uploaded');
    
      // Start processing
      await page.click('#btn-continuar');
      console.log('Processing started');
    
      // Wait for review screen
      await page.waitForFunction(() => {
        const main = document.getElementById('app-content');
        return main && /REVISAR PARCELAS/i.test(main.innerText);
      }, { timeout: 60000 });
      console.log('Review screen visible');
    
      // Check for duplicate warning
      const duplicateWarning = await page.evaluate(() => {
        const main = document.getElementById('app-content');
        return /duplicada/i.test(main.innerText);
      });
    
      expect(duplicateWarning).toBeTruthy();
      console.log('✅ Duplicate detection works');
    });
});