const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('@playwright/test');
const root = process.cwd(), out = __dirname;
let html = fs.readFileSync('tests/e2e/18-geometry-world-gl.spec.ts','utf8').match(/const HARNESS = `([\s\S]*?)`;\r?\n/)[1];
html = html.replace('</head>', '<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/reports/school-store-refinements-2026-09-07/tool-preview.css"><style>body{font-family:system-ui,sans-serif}#wrap:has([role=tablist]){overflow:auto;display:block}#wrap:has([role=tablist])>*{max-width:1400px;margin:auto}</style></head>');
html = html.replace('<script src="/printable_model_module.js">', '<script src="/prim3d_module.js"></script><script src="/stem_lab/stem_tool_printlab.js"></script><script src="/printable_model_module.js">');
html = html.replace('var bump = null;', "var bump = null; var currentTool = 'geometryWorld'; window.__ctx = null;");
html = html.replace('setToolData: function () {}, setStemLabTool: function () {},', "setToolData: function (value) { toolData = typeof value === 'function' ? value(toolData) : value; ctx.toolData=toolData; window.__toolData=toolData; if(bump)bump(); }, setStemLabTool: function (id) { currentTool=id; if(bump)bump(); },");
html = html.replace('return cfg.render(ctx);', "window.__ctx=ctx; return e(Tool,{key:currentTool,id:currentTool});");
html = html.replace('function Comp() {', "function Tool(props){return StemLab._registry[props.id].render(ctx);} function Comp() {");
html = html.replace('</body>', '<script>window.__mount({_introShownOnce:true});</script></body>');
const server = http.createServer((req,res)=>{
  const url = new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  const file = path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
});
const results = { scope:'Current local tools in a minimal host; no printer or deployed app connected', errors:[], checks:{} };
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.setDefaultTimeout(60000);
 page.on('pageerror',e=>results.errors.push(e.message));
 try {
  await page.goto('http://127.0.0.1:'+server.address().port, {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
  await page.screenshot({path:path.join(out,'01-entry.png')});
  await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();
  await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
  await page.waitForFunction(()=>window.__geoWorldEngine?._currentLesson?.sandbox===true);
  await page.screenshot({path:path.join(out,'02-desktop-empty.png')});
  results.checks.meshCases=await page.evaluate(()=>{
    const en=window.__geoWorldEngine, pure=StemLab.geometryWorldBuilderPure, pm=AlloModules.PrintableModel;
    const cases=[['cube',[[0,1,0,'cube']]],['cube-side-slab',[[0,1,0,'cube'],[1,1,0,'halfB']]],['cube-top-slab',[[0,1,0,'cube'],[0,2,0,'halfB']]],['slab-gap-cube',[[0,1,0,'halfB'],[0,2,0,'cube']]],['asymmetric-2x3x4',Array.from({length:24},(_,i)=>[i%2,1+Math.floor(i/6),Math.floor(i/2)%3,'cube'])]];
    return cases.map(([name,blocks])=>{
      en.loadLesson(pure.FREE_BUILD_LESSON);
      blocks.forEach(([x,y,z,s])=>en.placeBlock(x,y,z,'stone',s,0));
      const positions=blocks.map(([x,y,z])=>({x,y,z}));
      const bundle=pure.buildGeometryWorldStl(en,positions);
      const report=pm.inspectStl(new Uint8Array(bundle.buffer),5,{bedWidthMm:220,bedDepthMm:18,bedHeightMm:250});
      return {name,worldDimensions:bundle.dimensions,measured:en.measureStructure(0,1,0).count,fitAt10mm:pm.inspectStl(new Uint8Array(bundle.buffer),10,{bedWidthMm:220,bedDepthMm:35,bedHeightMm:250}),report};
    });
  });
  results.checks.keyboard=await page.evaluate(()=>{
    const en=window.__geoWorldEngine; en.loadLesson(StemLab.geometryWorldBuilderPure.FREE_BUILD_LESSON); en.placeBlock(0,1,0,'stone','cube',0);window.__aimAt(0,1,0);return Object.keys(en.blocks).length;
  });
  await page.locator('#geoworld-fs-wrap').focus();
  await page.evaluate(()=>{__geoWorldEngine.flyMode=true;__geoWorldEngine.velocity.set(0,0,0);window.__aimAt(0,1,0);__geoWorldEngine.camera.updateMatrixWorld(true);}); await page.keyboard.press('KeyB');
  results.checks.keyboard={before:results.checks.keyboard,afterBuild:await page.evaluate(()=>Object.keys(__geoWorldEngine.blocks).length)};
  await page.keyboard.press('Control+z');
  results.checks.keyboard.afterUndo=await page.evaluate(()=>Object.keys(__geoWorldEngine.blocks).length);
  await page.evaluate(()=>{const en=__geoWorldEngine;en.loadLesson(StemLab.geometryWorldBuilderPure.FREE_BUILD_LESSON);for(let x=0;x<2;x++)for(let z=0;z<3;z++)for(let y=1;y<5;y++)en.placeBlock(x,y,z,'stone','cube',0);en.placeBlock(8,1,8,'wood','quarter',1);en.camera.position.set(5,6,8);en.camera.lookAt(1,2,1);en.euler.setFromQuaternion(en.camera.quaternion);});
  await page.getByRole('button',{name:/Measure aimed build/}).click();
  results.checks.measuredText=await page.locator('.gwe-builder-dock').innerText();
  await page.screenshot({path:path.join(out,'03-desktop-measured.png')});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(out,'04-phone-measured.png')});
  results.checks.phone=await page.evaluate(()=>{const r=document.querySelector('.gwe-builder-dock').getBoundingClientRect();const s=document.querySelector('#geoworld-fs-wrap').getBoundingClientRect();const t=document.elementFromPoint(s.x+s.width/2,s.y+s.height/2);return {dock:{x:r.x,y:r.y,width:r.width,height:r.height},world:{x:s.x,y:s.y,width:s.width,height:s.height},centerElement:t?.className,centerInsideDock:!!t?.closest('.gwe-builder-dock'),overflow:document.documentElement.scrollWidth>innerWidth};});
  try { await page.getByRole('button',{name:'Collapse Free Build Studio'}).click({timeout:1500}); results.checks.phone.collapseTap=true; } catch(e) { results.checks.phone.collapseTap=false; results.checks.phone.collapseTapError=e.message; await page.getByRole('button',{name:'Collapse Free Build Studio'}).focus(); await page.keyboard.press('Enter'); }
  await page.screenshot({path:path.join(out,'05-phone-collapsed.png')});
  await page.setViewportSize({width:1440,height:900});
  await page.getByRole('button',{name:'Expand Free Build Studio'}).click();
  await page.evaluate(()=>{const en=__geoWorldEngine;en.flyMode=true;en.velocity.set(0,0,0);window.__aimAt(0,3,2);en.camera.updateMatrixWorld(true);}); await page.getByRole('button',{name:/Send selected build to Print Lab/}).click(); results.checks.handoffToasts=await page.evaluate(()=>window.__events.toasts.slice(-8));
  await page.getByRole('heading',{name:'Print Lab',exact:true}).waitFor();
  await page.screenshot({path:path.join(out,'06-print-design.png'),fullPage:true});
  results.checks.printDesign=await page.locator('body').innerText();
  await page.getByRole('tab',{name:/Preflight/}).click();
  await page.getByRole('button',{name:'Run advisory preflight',exact:true}).click();
  await page.screenshot({path:path.join(out,'07-preflight.png'),fullPage:true});
  results.checks.preflightText=await page.locator('body').innerText();
  await page.getByRole('tab',{name:/Design/}).click();
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
  console.log('BASE AUDIT COMPLETE; controls:',await page.getByRole('button').allTextContents());
  // Preserve a machine-readable inventory before the round-trip probe.
  results.checks.roundTripButtons=await page.getByRole('button').allTextContents();
  const back=page.getByRole('button',{name:/Return.*Geometry World|Edit.*Geometry World/i});
  if(await back.count()===1){
    await back.click();
    await page.waitForFunction(()=>!!window.__geoWorldEngine && !window.__alloGeometryWorldPendingBuild);
    results.checks.returned=await page.evaluate(()=>StemLab.geometryWorldBuilderPure.editableWorld(__geoWorldEngine));
    await page.screenshot({path:path.join(out,'08-returned.png')});
  }
 } catch(e) {results.failure=e.stack;console.error(e.stack);await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});}
 finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({errors:results.errors,failure:results.failure,checks:Object.keys(results.checks)},null,2));await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
