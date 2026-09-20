'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('C:/Users/cabba/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'reports','geometry-world-worksheet-parity-2026-09-19');
fs.mkdirSync(OUT,{recursive:true});
let html=fs.readFileSync(path.join(ROOT,'tests/e2e/18-geometry-world-gl.spec.ts'),'utf8').match(/const HARNESS = `([\s\S]*?)`;\r?\n/)[1];
html=html.replace('</head>','<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/reports/school-store-refinements-2026-09-07/tool-preview.css"></head>');
html=html.replace('var bump = null;','var bump = null; window.__ctx=null;');
html=html.replace('return cfg.render(ctx);','window.__ctx=ctx;return cfg.render(ctx);');
html=html.replace('</body>','<script>window.__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false});</script></body>');
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');if(u.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 const qa=u.pathname.startsWith('/__qa__/'),base=qa?OUT:ROOT,rel=qa?u.pathname.slice(8):'.'+decodeURIComponent(u.pathname),file=path.resolve(base,rel);
 if(!file.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}
 try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.pdf':'application/pdf'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
});
const results={scope:'Local current source with real WebGL and fictional lesson evidence. No production services or physical printing.',errors:[],blockedRequests:[],checks:[]};
function check(name,value){assert.ok(value,name);results.checks.push(name);}
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const launch={headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']};
 if(process.env.CHROME_EXECUTABLE)launch.executablePath=process.env.CHROME_EXECUTABLE;
 else if(process.platform==='win32')launch.executablePath='C:/Program Files/Google/Chrome/Application/chrome.exe';
 const browser=await chromium.launch(launch),context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
 await context.addInitScript(()=>{window.print=()=>{window.__printCalls=(window.__printCalls||0)+1;};});
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==origin&&!['data:','blob:','about:'].includes(u.protocol)){results.blockedRequests.push(u.origin+u.pathname);await route.abort();}else await route.continue();});
 const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>results.errors.push(e.message));
 try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('.gwe-home').waitFor({timeout:120000});
 await page.waitForFunction(()=>window.__geoWorldEngine&&window.StemLab.geometryWorldWorksheets);
 console.log('Geometry worksheet API ready');
 
 
 if(process.argv.includes('--menu-only')){
  check('Actual lesson started',await page.evaluate(()=>__geoWorldEngine.startHomeLesson('volumeExplorer')));
  await page.waitForFunction(()=>!document.querySelector('.gwe-home'));
  await page.getByRole('button',{name:'Open game settings and tools',exact:true}).click();
  await page.getByRole('button',{name:'Concept snapshots',exact:true}).click();
  const panel=page.getByRole('dialog',{name:'Concept snapshots',exact:true});
  await panel.waitFor();
  check('Opening concept snapshots closes the competing settings dialog',await page.locator('.gw-settings-backdrop').count()===0);
  check('Snapshot dialog receives keyboard focus',await panel.evaluate(el=>el.contains(document.activeElement)));
  await panel.getByRole('button',{name:'Capture current view',exact:true}).click();
  await panel.getByLabel('What does this moment demonstrate?',{exact:true}).waitFor();
  check('Capture button can be clicked from actual Menu entry',await page.locator('.gwe-concept-card').count()===1);
  await panel.getByRole('button',{name:'Close concept snapshots',exact:true}).click();
  await page.getByRole('button',{name:'Open game settings and tools',exact:true}).click();
  const [sheet]=await Promise.all([
   page.waitForEvent('popup'),
   page.getByRole('button',{name:'Open printable student worksheet',exact:true}).click()
  ]);
  await sheet.waitForLoadState('domcontentloaded');
  check('Actual Menu Worksheet opens correct lesson preview',(await sheet.locator('body').innerText()).includes('Volume Explorer'));
  await sheet.close();
  await page.getByRole('button',{name:'Close game settings and tools',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Open game settings and tools',exact:true}).click();
  await page.getByRole('button',{name:'Concept snapshots',exact:true}).click();
  await panel.waitFor();
  check('Mobile menu also opens unobstructed concept snapshot dialog',await page.locator('.gw-settings-backdrop').count()===0);
  await panel.getByLabel('What does this moment demonstrate?',{exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(OUT,'concept-snapshot-menu-mobile.png'),timeout:90000});
 } else {
 const exports=await page.evaluate(()=>{
  const api=StemLab.geometryWorldWorksheets,presets=api.presets();
  return Object.entries(presets).map(([id,lesson])=>({id,title:lesson.title,model:api.model(lesson),questionTexts:(lesson.npcs||[]).flatMap(n=>api.questions(n.question).map(q=>q.text)),student:api.html(lesson,{mode:'student'}),teacher:api.html(lesson,{mode:'teacher'})}));
 });
 results.presetCoverage=[];
 const preview=await context.newPage();
 for(const doc of exports){
  fs.writeFileSync(path.join(OUT,doc.id+'-student.html'),doc.student);
  fs.writeFileSync(path.join(OUT,doc.id+'-teacher.html'),doc.teacher);
  await preview.goto(origin+'/__qa__/'+doc.id+'-student.html');
  const body=await preview.locator('body').innerText();
  const missed=doc.questionTexts.filter(text=>!body.replace(/\s+/g,' ').includes(String(text).replace(/\s+/g,' ')));
  check(doc.id+': every lesson question appears in student worksheet',missed.length===0);
  const info=await preview.evaluate(()=>({pages:document.querySelectorAll('.sheet-page').length,questions:document.querySelectorAll('[data-question-number]').length,overflow:document.documentElement.scrollWidth>innerWidth+1}));
  results.presetCoverage.push({id:doc.id,title:doc.title,questionCount:doc.questionTexts.length,...info});
  if(['volumeExplorer','geometryGarden','fractionVolume'].includes(doc.id)){
   await preview.pdf({path:path.join(OUT,doc.id+'-student.pdf'),format:'Letter',printBackground:true,preferCSSPageSize:true});
   const sections=preview.locator('.sheet-page');
   await sections.nth(Math.min(1,await sections.count()-1)).screenshot({path:path.join(OUT,doc.id+'-worksheet.png')});
  }
 }
 check('All 12 premade lessons receive worksheets',exports.length===12);
 const generated={
  _id:'ai_qa_volume_garden',title:'Generated Volume Garden Workshop',description:'Compare the packing designs at two stations.',
  objectives:['Explain volume using equal layers.','Use multiplication and addition to verify a design.'],
  ground:{xMin:-10,xMax:20,zMin:-10,zMax:12,y:0,type:'grass'},spawnPoint:[-3,3,-3],
  structures:[{id:'packing-model',type:'fill',x1:1,x2:3,y1:1,y2:2,z1:4,z2:5,block:'wood'}],
  activities:[{id:'packing',title:'Packing model',challenge:'Use the model to compare two layers with a one-layer arrangement.',successCriteria:'Use cubic units and justify an equal-volume arrangement.',reflection:'How does your multiplication represent the layers?',npcName:'Packing mentor',structureIds:['packing-model'],position:[0,3,2]}],
  npcs:[{name:'Packing mentor',position:[0,1,1],dialogue:'PRIVATE TEACHER SOLUTION: two layers of six make twelve.',question:{text:'How many unit cubes fill the packing model?',choices:['12','6','10'],correct:0,followUp:[{text:'How many cubes are in each layer?',choices:['3','6','12'],correct:1},{text:'Explain a different arrangement with the same volume.',choices:['2 by 2 by 3','2 by 2 by 2','3 by 3 by 3'],correct:0}]}}]
 };
 const generatedHtml=await page.evaluate(lesson=>StemLab.geometryWorldWorksheets.html(lesson,{mode:'student'}),generated);
 fs.writeFileSync(path.join(OUT,'generated-student.html'),generatedHtml);
 await preview.goto(origin+'/__qa__/generated-student.html');
 const generatedText=await preview.locator('body').innerText();
 check('Generated lesson retains actual title and reflection',generatedText.includes(generated.title)&&generatedText.includes(generated.activities[0].reflection));
 check('Generated Garden title does not introduce unrelated hardcoded garden stations',!generatedText.includes('The Hidden Garden'));
 check('Student sheet does not reveal mentor worked solution',!generatedText.includes('PRIVATE TEACHER SOLUTION'));
 await preview.pdf({path:path.join(OUT,'generated-student.pdf'),format:'Letter',printBackground:true,preferCSSPageSize:true});
 await preview.locator('.sheet-page').nth(1).screenshot({path:path.join(OUT,'generated-worksheet.png')});
 await preview.close();
 check('Can start actual premade Volume Explorer',await page.evaluate(()=>__geoWorldEngine.startHomeLesson('volumeExplorer')));
 await page.waitForFunction(()=>!document.querySelector('.gwe-home'));
 await page.evaluate(()=>{const en=__geoWorldEngine;en._entryAnim=null;en.flyMode=true;en.velocity.set(0,0,0);en.camera.position.set(19,10,13);en.camera.lookAt(12.5,2.5,3.5);en.euler.setFromQuaternion(en.camera.quaternion);en.camera.updateMatrixWorld(true);});
 const originalWorld=await page.evaluate(()=>Object.keys(__geoWorldEngine.blocks).sort().join('|'));
 await page.evaluate(()=>__geoWorldEngine.openConceptSnapshots());
 const dialog=page.getByRole('dialog',{name:'Concept snapshots',exact:true});
 await dialog.waitFor();
 await dialog.getByRole('button',{name:'Capture current view',exact:true}).click();
 await dialog.getByLabel('What does this moment demonstrate?',{exact:true}).fill('Equal layers form a rectangular prism');
 await dialog.getByLabel('My mathematical reasoning and calculations',{exact:true}).fill('The blue prism has 5 x 3 = 15 cubes in each layer. Four layers give 15 x 4 = 60 cubic units. I can check with 15 + 15 + 15 + 15.');
 await page.screenshot({path:path.join(OUT,'concept-snapshot-desktop.png'),timeout:90000});
 check('Snapshot capture does not mutate world blocks',originalWorld===await page.evaluate(()=>Object.keys(__geoWorldEngine.blocks).sort().join('|')));
 results.snapshotState=await page.evaluate(()=>{
  const en=__geoWorldEngine,helper=StemLab.geometryWorldBuilderPure;
  const snapshots=helper.lessonConceptSnapshots(en._currentLesson,__toolData.geometryWorld.lessonConceptSnapshots || __toolData.geometryWorld.conceptSnapshots || __toolData.geometryWorld.lessonActivityProgress);
  return {dataKeys:Object.keys(__toolData.geometryWorld),snapshotCount:snapshots?.length};
 });
 
 check('Exactly one snapshot is stored for this lesson',results.snapshotState.snapshotCount===1);
 const recordPromise=page.waitForEvent('popup');
 await dialog.getByRole('button',{name:'Open learning record',exact:true}).click();
 const record=await recordPromise;await record.waitForLoadState('domcontentloaded');
 const recordText=await record.locator('body').innerText();
 check('Actual learning-record popup uses current lesson and saved calculation',recordText.includes('Volume Explorer')&&recordText.includes('15 x 4 = 60 cubic units'));
 check('Record snapshot image is embedded and loaded',await record.locator('img.moment').evaluateAll(images=>images.length===1&&images.every(img=>img.complete&&img.naturalWidth>0)));
 check('Opening worksheet preview does not start printing',await record.evaluate(()=>!window.__printCalls));
 await record.getByRole('button',{name:'Print / save PDF',exact:true}).click();
 check('Printing is an explicit learner action',await record.evaluate(()=>window.__printCalls===1));
 fs.writeFileSync(path.join(OUT,'learning-record.html'),await record.content());
 await record.pdf({path:path.join(OUT,'learning-record.pdf'),format:'Letter',printBackground:true,preferCSSPageSize:true});
 await record.close();
 const blankPromise=page.waitForEvent('popup');
 await dialog.getByRole('button',{name:'Worksheet',exact:true}).click();
 const blank=await blankPromise;await blank.waitForLoadState('domcontentloaded');
 check('Blank worksheet does not contain learner snapshot reasoning',(await blank.locator('img.moment').count())===0&&!(await blank.locator('body').innerText()).includes('15 x 4 = 60 cubic units'));
 await blank.close();
 const downloadPromise=page.waitForEvent('download');
 await dialog.getByRole('button',{name:'Download printable snapshots',exact:true}).click();
 const download=await downloadPromise;await download.saveAs(path.join(OUT,'printable-snapshots.html'));
 check('Printable snapshot export downloads successfully',await download.failure()===null);
 const imagePromise=page.waitForEvent('download');
 await dialog.getByRole('button',{name:'Download image',exact:true}).click();
 const downloadedImage=await imagePromise;await downloadedImage.saveAs(path.join(OUT,'saved-concept-image.jpg'));
 check('Actual captured image downloads successfully',await downloadedImage.failure()===null);
 await page.setViewportSize({width:390,height:844});
 await dialog.getByLabel('What does this moment demonstrate?',{exact:true}).scrollIntoViewIfNeeded();
 results.mobile=await dialog.evaluate(el=>({width:el.getBoundingClientRect().width,viewport:innerWidth,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
 check('Snapshot dialog fits mobile without horizontal overflow',results.mobile.width<=390&&results.mobile.scrollWidth<=results.mobile.clientWidth+1);
 await page.screenshot({path:path.join(OUT,'concept-snapshot-mobile.png'),timeout:90000});
 await dialog.getByRole('button',{name:'Close concept snapshots',exact:true}).click();
 await page.setViewportSize({width:1440,height:1000});
 check('Can switch to a different lesson',await page.evaluate(()=>__geoWorldEngine.startHomeLesson('areaSurface')));
 await page.evaluate(()=>__geoWorldEngine.openConceptSnapshots());
 await page.getByRole('dialog',{name:'Concept snapshots',exact:true}).waitFor();
 check('Other lesson does not display previous lesson snapshots',await page.locator('.gwe-concept-card').count()===0);
 await page.getByRole('button',{name:'Close concept snapshots',exact:true}).click();
 await page.evaluate(()=>__geoWorldEngine.startHomeLesson('volumeExplorer'));
 await page.evaluate(()=>__geoWorldEngine.openConceptSnapshots());
 await page.getByLabel('What does this moment demonstrate?',{exact:true}).waitFor();
 check('Returning to lesson restores saved caption',await page.getByLabel('What does this moment demonstrate?',{exact:true}).inputValue()==='Equal layers form a rectangular prism');
 await page.getByRole('button',{name:'Remove moment 1',exact:true}).click();
 check('Removing snapshot leaves no stale image card',await page.locator('.gwe-concept-card').count()===0);
 await page.getByRole('button',{name:'Close concept snapshots',exact:true}).click();
 const keyPromise=page.waitForEvent('popup');
 await page.evaluate(()=>__geoWorldEngine.openGeometryWorksheet('teacher'));
 const key=await keyPromise;await key.waitForLoadState('domcontentloaded');
 check('Teacher key includes authored answers',await key.locator('.answer').count()>0);
 await key.close();


 }
 results.finalButtons=await page.getByRole('button').allTextContents();
 results.api=await page.evaluate(()=>({worksheets:Object.keys(StemLab.geometryWorldWorksheets),snapshots:Object.keys(StemLab.geometryWorldBuilderPure).filter(k=>/snapshot|moment/i.test(k))}));
 check('No browser page errors',results.errors.length===0);
 }catch(e){results.failure=e.stack;await page.screenshot({path:path.join(OUT,'failure.png'),timeout:90000}).catch(()=>{});results.failureText=await page.locator('body').innerText().catch(()=>'');}
 finally{fs.writeFileSync(path.join(OUT,process.argv.includes('--menu-only')?'menu-browser-results.json':'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.close(r));}
 if(results.failure)process.exitCode=1;
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});

