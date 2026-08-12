const fs=require('fs'),path=require('path'),http=require('http');
const puppeteer=require('puppeteer');
const RAIZ='C:/Users/yo/repo/LIVESTOCK-MANAGER', PUERTO=8871;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.pdf':'application/pdf'};
const servir=()=>new Promise(res=>{const s=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(RAIZ,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});s.listen(PUERTO,()=>res(s));});
const T0=Date.now(); const ts=()=>String(Date.now()-T0).padStart(6)+'ms ';
(async()=>{
  const srv=await servir();
  const b=await puppeteer.launch({headless:true,args:['--no-sandbox']});
  const page=await b.newPage();
  await page.setViewport({width:390,height:844,isMobile:true});
  page.on('pageerror',e=>console.log(ts()+'!! EXCEPCION: '+(e.message||e).toString().slice(0,200)));
  page.on('console',m=>{if(m.type()==='error')console.log(ts()+'!! CONSOLA: '+m.text().slice(0,200));});
  await page.evaluateOnNewDocument(()=>{setInterval(()=>{if(window.App){App._config=App._config||{};App._config.guides={...(App._config.guides||{}),enabled:false};}document.querySelectorAll('.guide-overlay,.guide-popover').forEach(n=>n.remove());},300);});
  await page.goto(`http://localhost:${PUERTO}/index.html`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction('!!window.App && !!window.Fincas',{timeout:90000});
  const semb=await page.evaluate(async()=>{let id=await Fincas.getActiveId().catch(()=>null);if(!id){if(window.AsistenteConfiguracion?._ensureSeedData)await AsistenteConfiguracion._ensureSeedData();if(window.SeedData?.run){await SeedData.run(true);return true;}}return false;});
  if(semb){await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction('!!window.App',{timeout:90000});await new Promise(r=>setTimeout(r,4000));}
  console.log(ts()+'app lista y con datos demo');

  await page.evaluate(()=>{location.hash='#/importar-zonas';});
  await page.waitForSelector('#pdf-files',{timeout:15000});
  console.log(ts()+'paso selector renderizado');

  const input = await page.$('#pdf-files');
  await input.uploadFile(path.join(RAIZ,'test-catastro.pdf'));
  console.log(ts()+'PDF subido al input');
  await new Promise(r=>setTimeout(r,800));

  const estadoBtn = await page.evaluate(()=>{const b=document.getElementById('btn-continuar');return {existe:!!b, disabled:b?b.disabled:null, preview:(document.getElementById('files-preview')?.innerText||'').slice(0,60)};});
  console.log(ts()+'boton continuar: '+JSON.stringify(estadoBtn));

  await page.evaluate(()=>{ImportarZonasView._procesarPDFs();});
  console.log(ts()+'_procesarPDFs() lanzado');

  // Sondear hasta que aparezca la pantalla de revision (o 60s)
  let visto=null;
  for(let i=0;i<60;i++){
    await new Promise(r=>setTimeout(r,1000));
    const st = await page.evaluate(()=>{
      const main=document.getElementById('app-content');
      const txt=(main?.innerText||'');
      return {
        progreso: document.getElementById('progress-text')?.textContent || null,
        hayRevision: /Revisa|Parcelas detectadas|Guardar/i.test(txt),
        resultados: window.ImportarZonasView?._resultadosParseo?.length ?? null,
        chars: txt.trim().length
      };
    });
    if(st.progreso!==visto){ console.log(ts()+'progreso: '+JSON.stringify(st)); visto=st.progreso; }
    if(st.hayRevision){ console.log(ts()+'>>> PANTALLA DE REVISION VISIBLE'); break; }
  }

  const final = await page.evaluate(()=>{
    const main=document.getElementById('app-content');
    const txt=(main?.innerText||'').replace(/\s+/g,' ');
    const r0 = window.ImportarZonasView?._resultadosParseo?.[0];
    return {
      textoPantalla: txt.slice(0,600),
      datosEnMemoria: r0 ? {archivo:r0.archivo, error:r0.error, incluir:r0.incluir,
        refCatastral:r0.datos?.refCatastral, superficie:r0.datos?.superficie,
        superficieGrafica:r0.datos?.superficieGrafica, poligono:r0.datos?.poligono,
        parcela:r0.datos?.parcela, usoPrincipal:r0.datos?.usoPrincipal,
        cultivos:r0.datos?.cultivos?.length} : null,
      refVisibleEnPantalla: /12345A678901234567BC/.test(txt),
      supVisibleEnPantalla: /10\.000|10000|1 ha|1,0000/.test(txt)
    };
  });
  console.log('\n=== ESTADO FINAL ===');
  console.log('datos en memoria:', JSON.stringify(final.datosEnMemoria,null,1));
  console.log('refCatastral visible en pantalla:', final.refVisibleEnPantalla);
  console.log('superficie visible en pantalla:', final.supVisibleEnPantalla);
  console.log('\ntexto pantalla:', final.textoPantalla);
  await b.close(); srv.close();
})().catch(e=>{console.error('ERROR:',e.message);process.exit(1);});
