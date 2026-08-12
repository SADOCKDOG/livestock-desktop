# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\playwright-test.spec.js >> Importar Zonas - Parser Catastro E2E >> Complete flow: PDF upload → processing → review → save
- Location: tests\playwright-test.spec.js:79:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForNavigation: Target page, context or browser has been closed
=========================== logs ===========================
waiting for navigation to "**/#/zonas*" until "load"
  navigated to "http://localhost:8871/index.html#/zonas"
  navigated to "http://localhost:8871/index.html#/ganaderia?tab=zonas"
============================================================
```

# Test source

```ts
  78  | 
  79  |   test('Complete flow: PDF upload → processing → review → save', async () => {
  80  |     // 1. Navigate to app
  81  |     await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
  82  |     
  83  |     // 2. Wait for app to initialize
  84  |     await page.waitForFunction('!!window.App && !!window.Fincas', { timeout: 90000 });
  85  |     console.log('App initialized');
  86  |     
  87  |     // 3. Ensure seed data exists
  88  |     await page.evaluate(async () => {
  89  |       let id = await Fincas.getActiveId().catch(() => null);
  90  |       if (!id) {
  91  |         if (window.AsistenteConfiguracion?._ensureSeedData) await AsistenteConfiguracion._ensureSeedData();
  92  |         if (window.SeedData?.run) await SeedData.run(true);
  93  |       }
  94  |     });
  95  |     await page.reload({ waitUntil: 'domcontentloaded' });
  96  |     await page.waitForFunction('!!window.App', { timeout: 90000 });
  97  |     await page.waitForTimeout(3000);
  98  |     console.log('App ready with data');
  99  | 
  100 |     // 4. Navigate to importar-zonas
  101 |     await page.evaluate(() => { location.hash = '#/importar-zonas'; });
  102 |     
  103 |     // 5. Wait for selector view
  104 |     await page.waitForSelector('#pdf-files', { timeout: 15000 });
  105 |     console.log('Selector view rendered');
  106 | 
  107 |     // 6. Upload PDF
  108 |     const pdfPath = path.join(PROJECT_ROOT, 'test-catastro.pdf');
  109 |     const fileInput = await page.$('#pdf-files');
  110 |     await fileInput.setInputFiles(pdfPath);
  111 |     console.log('PDF uploaded');
  112 | 
  113 |     // 7. Wait for continue button to enable
  114 |     await page.waitForFunction(() => {
  115 |       const btn = document.getElementById('btn-continuar');
  116 |       return btn && !btn.disabled;
  117 |     }, { timeout: 5000 });
  118 |     
  119 |     // 8. Click continue to start processing
  120 |     await page.click('#btn-continuar');
  121 |     console.log('Processing started');
  122 | 
  123 |     // 9. Wait for progress to show processing
  124 |     await page.waitForSelector('#progress-container:not(.hidden)', { timeout: 5000 });
  125 |     console.log('Progress shown');
  126 | 
  127 |     // 10. Wait for review screen (step 2)
  128 |     // The review screen appears when _renderPasoRevision is called
  129 |     await page.waitForFunction(() => {
  130 |       const main = document.getElementById('app-content');
  131 |       return main && /REVISAR PARCELAS/i.test(main.innerText);
  132 |     }, { timeout: 60000 });
  133 |     console.log('Review screen visible');
  134 | 
  135 |     // 11. Verify review card data
  136 |     const reviewData = await page.evaluate(() => {
  137 |       const main = document.getElementById('app-content');
  138 |       const text = main.innerText;
  139 |       
  140 |       // Check for key data in the review cards
  141 |       const hasRefCatastral = /21009A001000300000WB/i.test(text);
  142 |       const hasSuperficie = /4\.3172\s*ha|43\.?172\s*m/i.test(text);
  143 |       const hasPoligono = /Pol[íi]gono\s+1/i.test(text);
  144 |       const hasParcela = /Parcela\s+30/i.test(text);
  145 |       const hasCultivos = /Cultivos?\s*SIGPAC|3\s*cultivos?/i.test(text);
  146 |       const hasUsoPrincipal = /Agrario/i.test(text);
  147 |       
  148 |       // Get card elements
  149 |       const cards = document.querySelectorAll('.card-registro');
  150 |       
  151 |       return {
  152 |         hasRefCatastral,
  153 |         hasSuperficie,
  154 |         hasPoligono,
  155 |         hasParcela,
  156 |         hasCultivos,
  157 |         hasUsoPrincipal,
  158 |         cardCount: cards.length,
  159 |         fullText: text.slice(0, 2000)
  160 |       };
  161 |     });
  162 |     
  163 |     console.log('Review data:', JSON.stringify(reviewData, null, 2));
  164 |     
  165 |     // Assertions
  166 |     expect(reviewData.hasRefCatastral).toBeTruthy();
  167 |     expect(reviewData.hasSuperficie).toBeTruthy();
  168 |     expect(reviewData.hasPoligono).toBeTruthy();
  169 |     expect(reviewData.hasParcela).toBeTruthy();
  170 |     expect(reviewData.hasCultivos).toBeTruthy();
  171 |     expect(reviewData.hasUsoPrincipal).toBeTruthy();
  172 |     expect(reviewData.cardCount).toBeGreaterThanOrEqual(1);
  173 |     
  174 |     console.log('✅ Review screen data verified');
  175 | 
  176 |     // 12. Click save (guardar) - wait for navigation
  177 |         const [response] = await Promise.all([
> 178 |           page.waitForNavigation({ timeout: 30000, url: '**/#/zonas*' }),
      |                ^ Error: page.waitForNavigation: Target page, context or browser has been closed
  179 |           page.click('.wizard-footer-fixed .btn-create')
  180 |         ]);
  181 |         console.log('Save clicked, navigated to /zonas');
  182 | 
  183 |         // 13. Wait for /zonas view to load
  184 |         await page.waitForFunction(() => location.hash.includes('/zonas'), { timeout: 10000 });
  185 |         console.log('Zonas view loaded');
  186 | 
  187 |         // 14. Verify zone was saved
  188 |         const savedZone = await page.evaluate(async () => {
  189 |           const finca = await Fincas.getActive();
  190 |           return finca?.zonas?.find(z => z.refCatastral === '21009A001000300000WB') || null;
  191 |         });
  192 |     
  193 |         expect(savedZone).toBeTruthy();
  194 |         expect(savedZone.refCatastral).toBe('21009A001000300000WB');
  195 |         expect(savedZone.poligono).toBe(1);
  196 |         expect(savedZone.parcela).toBe(30);
  197 |         expect(savedZone.superficieGrafica).toBe(43172);
  198 |         expect(savedZone.superficie).toBeCloseTo(4.3172, 3);
  199 |         expect(savedZone.cultivos).toHaveLength(3);
  200 |     
  201 |         console.log('✅ Zone saved correctly:', savedZone);
  202 |   });
  203 | 
  204 |   test('Multiple PDFs with duplicate detection', async () => {
  205 |       // Navigate to importar-zonas
  206 |       await page.goto(`${BASE_URL}/index.html#/importar-zonas`, { waitUntil: 'domcontentloaded' });
  207 |       await page.waitForFunction('!!window.App', { timeout: 30000 });
  208 |       await page.waitForSelector('#pdf-files', { timeout: 15000 });
  209 |       console.log('Selector view rendered');
  210 |     
  211 |       // Upload same PDF twice
  212 |       const pdfPath = path.join(PROJECT_ROOT, 'test-catastro.pdf');
  213 |       const fileInput = await page.$('#pdf-files');
  214 |       await fileInput.setInputFiles([pdfPath, pdfPath]);
  215 |       console.log('PDFs uploaded');
  216 |     
  217 |       // Start processing
  218 |       await page.click('#btn-continuar');
  219 |       console.log('Processing started');
  220 |     
  221 |       // Wait for review screen
  222 |       await page.waitForFunction(() => {
  223 |         const main = document.getElementById('app-content');
  224 |         return main && /REVISAR PARCELAS/i.test(main.innerText);
  225 |       }, { timeout: 60000 });
  226 |       console.log('Review screen visible');
  227 |     
  228 |       // Check for duplicate warning
  229 |       const duplicateWarning = await page.evaluate(() => {
  230 |         const main = document.getElementById('app-content');
  231 |         return /duplicada/i.test(main.innerText);
  232 |       });
  233 |     
  234 |       expect(duplicateWarning).toBeTruthy();
  235 |       console.log('✅ Duplicate detection works');
  236 |     });
  237 | });
```