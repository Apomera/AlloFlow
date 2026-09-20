'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'reports','geometry-world-grant-building-2026-09-19');
fs.mkdirSync(OUT,{recursive:true});
let html=fs.readFileSync(path.join(ROOT,'tests/e2e/18-geometry-world-gl.spec.ts'),'utf8').match(/const HARNESS = `([\s\S]*?)`;\r?\n/)[1];
html=html.replace('</head>','<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/reports/school-store-refinements-2026-09-07/tool-preview.css"></head>');
html=html.replace('var bump = null;','var bump = null; window.__ctx=null;');
html=html.replace('return cfg.render(ctx);','window.__ctx=ctx;return cfg.render(ctx);');
html=html.replace('</body>','<script>window.__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false});</script></body>');
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 const file=path.resolve(ROOT,'.'+decodeURIComponent(u.pathname));
 if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
 try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
});
const results={scope:'Local current Geometry World source rendered through the existing app harness. Fictional authored demo lesson; blocks added through actual engine APIs. Not a student record, production verification, or district approval.',errors:[],blockedRequests:[],measurements:[],images:[]};
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const context=await browser.newContext({viewport:{width:1200,height:800},deviceScaleFactor:1,reducedMotion:'reduce'});
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==origin&&!['data:','blob:','about:'].includes(u.protocol)){results.blockedRequests.push(u.origin+u.pathname);await route.abort();}else await route.continue();});
 const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>results.errors.push(e.message));
 try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('.gwe-home').waitFor({timeout:120000});
 await page.waitForFunction(()=>window.__geoWorldEngine&&window.StemLab.geometryWorldWorksheets);
 await page.evaluate(()=>__geoWorldEngine.startHomeLesson('volumeExplorer'));
 await page.waitForFunction(()=>!document.querySelector('.gwe-home'));
 await page.getByRole('button',{name:'Skip tutorial and proceed to lesson',exact:true}).click();
 await page.evaluate(()=>{
  const lesson={_id:'ai_grant_demo_equal_layers',title:'Build Volume with Equal Layers',description:'Build a rectangular prism from equal layers of unit cubes, then explain and check its volume.',spawnPoint:[9,7,10],ground:{xMin:-8,xMax:16,zMin:-8,zMax:16,y:0,type:'grass'},structures:[],npcs:[],objectives:['Build a 4 by 3 array of unit cubes.','Stack a second equal layer.','Explain why 4 x 3 x 2 gives 24 cubic units.'],activities:[{id:'equal-layers',title:'Build and explain equal layers',challenge:'Build a 4 by 3 array, add a second equal layer, and explain the volume using multiplication and repeated addition.',successCriteria:'Two equal layers of 12 unit cubes form a solid prism of 24 cubic units.',reflection:'How does your multiplication show the number of cubes in each layer and the number of layers?'}]};
  const en=__geoWorldEngine;en.loadLesson(lesson);en._entryAnim=null;en.flyMode=true;en.velocity.set(0,0,0);
  __ctx.updateMulti('geometryWorld',{activeLesson:lesson._id,lastGeneratedLesson:lesson,tutorialDismissed:true,tutorialStep:4});
  en.camera.position.set(7.8,6.8,9);en.camera.lookAt(2.5,1.15,2);en.camera.fov=58;en.camera.updateProjectionMatrix();en.euler.setFromQuaternion(en.camera.quaternion);en.camera.updateMatrixWorld(true);
  const additions=[];for(let x=1;x<=4;x++)for(let z=1;z<=3;z++)additions.push({x,y:1,z,type:'diamond',shape:'cube',rotation:0});
  const result=en.commitBuildBatch(additions,[],{label:'Build first 4 by 3 layer'});if(!result.ok)throw Error(JSON.stringify(result));
  en.refreshAllAO();
 });
 await page.waitForTimeout(500);
 results.measurements.push(await page.evaluate(()=>{const m=__geoWorldEngine.measureStructure(1,1,1);return {count:m.count,occupiedVolume:m.occupiedVolume,L:m.L,W:m.W,H:m.H};}));
 await page.screenshot({path:path.join(OUT,'01-one-layer.png'),timeout:90000});
 await page.screenshot({path:path.join(OUT,'01-one-layer-preview.jpg'),quality:65,timeout:90000});
 results.images.push({file:'01-one-layer.png',caption:'One layer: a 4 × 3 array contains 12 unit cubes.'});
 await page.evaluate(()=>{const en=__geoWorldEngine,additions=[];for(let x=1;x<=4;x++)for(let z=1;z<=3;z++)additions.push({x,y:2,z,type:'gold',shape:'cube',rotation:0});const result=en.commitBuildBatch(additions,[],{label:'Stack a second equal layer'});if(!result.ok)throw Error(JSON.stringify(result));en.refreshAllAO();});
 await page.waitForTimeout(500);
 results.measurements.push(await page.evaluate(()=>{const m=__geoWorldEngine.measureStructure(1,1,1);return {count:m.count,occupiedVolume:m.occupiedVolume,L:m.L,W:m.W,H:m.H};}));
 await page.screenshot({path:path.join(OUT,'02-two-layers.png'),timeout:90000});
 await page.screenshot({path:path.join(OUT,'02-two-layers-preview.jpg'),quality:65,timeout:90000});
 results.images.push({file:'02-two-layers.png',caption:'Stack an equal layer: 12 + 12 = 24 cubic units, or 4 × 3 × 2 = 24.'});
 await page.getByRole('button',{name:'Open game settings and tools',exact:true}).click();
 await page.getByRole('button',{name:'Concept snapshots',exact:true}).click();
 const panel=page.getByRole('dialog',{name:'Concept snapshots',exact:true});await panel.waitFor();
 await panel.getByRole('button',{name:'Capture current view',exact:true}).click();
 await panel.getByLabel('What does this moment demonstrate?',{exact:true}).fill('Two equal layers make a rectangular prism');
 await panel.getByLabel('My mathematical reasoning and calculations',{exact:true}).fill('Each layer has 4 × 3 = 12 unit cubes. Two equal layers have 12 × 2 = 24 cubic units. I checked by adding 12 + 12 = 24.');
 await page.setViewportSize({width:1200,height:1100});
 await panel.screenshot({path:path.join(OUT,'03-concept-reasoning.png'),timeout:90000});
 await panel.screenshot({path:path.join(OUT,'03-concept-reasoning-preview.jpg'),quality:70,timeout:90000});
 results.images.push({file:'03-concept-reasoning.png',caption:'Save a concept snapshot and explain the calculation; students can also print a learning record and write by hand.'});
 assert.equal(results.measurements[0].count,12);assert.equal(results.measurements[1].count,24);assert.equal(results.measurements[1].occupiedVolume,24);assert.equal(results.errors.length,0);
 results.success=true;
 }catch(e){results.failure=e.stack;results.body=await page.locator('body').innerText().catch(()=>'');await page.screenshot({path:path.join(OUT,'failure.png'),timeout:90000}).catch(()=>{});}
 finally{fs.writeFileSync(path.join(OUT,'capture-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.close(r));}
 if(!results.success)process.exitCode=1;
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
