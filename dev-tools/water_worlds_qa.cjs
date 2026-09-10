'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports','water-worlds-implementation');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Water Worlds preview</title>
<link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;background:#e9f0ec;font-family:system-ui}main{max-width:1250px;margin:auto;padding:12px}</style></head><body><main id="slot"></main>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/stem_lab/stem_lab_module.js"></script><script src="/stem_lab/stem_tool_watercycle.js"></script>
<script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.mountWaterWorlds=function(seed,dark=false){function Host(){const [data,setData]=React.useState({waterCycle:seed||{wcMode:'worlds'}});window.waterWorldsData=data.waterCycle;window.waterWorldsSet=setData;const noop=()=>{};
return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:dark,isContrast:false,gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,
setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:noop,getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}
document.documentElement.classList.toggle('dark',dark);ReactDOM.unmountComponentAtNode(document.getElementById('slot'));ReactDOM.render(React.createElement(Host),document.getElementById('slot'));};mountWaterWorlds();
</script></body></html>`;
const allowed=['/stem_lab/','/desktop/web-app/node_modules/react/umd/','/desktop/web-app/node_modules/react-dom/umd/','/desktop/web-app/node_modules/axe-core/','/dev-tools/.cache/sweep-tailwind.css'];
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(u.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(html);}
 const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep)||!allowed.some(p=>u.pathname.startsWith(p))){res.writeHead(403);return res.end();}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end('Missing asset');}else{res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream'});res.end(data);}});
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(process.argv.includes('--serve')?Number(process.env.WATER_WORLDS_PORT||8768):0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';if(process.argv.includes('--serve')){console.log(url);return;}
 const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(30000);
 const check=(name)=>{checks.push(name);console.log('PASS '+name);};
 const click=async name=>{await page.getByRole('button',{name,exact:true}).click();await state();};
 const state=()=>page.evaluate(async()=>{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return JSON.parse(JSON.stringify(waterWorldsData.waterWorlds));});
 async function audit(label){const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.ww'),{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))})));fs.writeFileSync(path.join(out,'axe-'+label+'.json'),JSON.stringify(violations,null,2));assert.deepEqual(violations,[],label+' accessibility including contrast');}
 try{
  await page.goto(url);await page.waitForSelector('.ww canvas');await page.waitForFunction(()=>waterWorldsData.waterWorlds);
  await page.addScriptTag({url:url+'desktop/web-app/node_modules/axe-core/axe.min.js'});
  assert(await page.getByRole('button',{name:'Differences',exact:true}).isDisabled());
  assert.equal(await page.locator('script[src*="water_worlds_kernel.js"]').count(),1);check('Cold sibling-module loading');
  await page.screenshot({path:path.join(out,'worlds-desktop-ready.png'),fullPage:true});await audit('light');
  const beforeGrid=JSON.stringify((await state()).world),pictureBeforeGrid=await page.locator('.ww canvas').evaluate(c=>c.toDataURL());
  await page.getByRole('checkbox',{name:'Show ground-cell grid',exact:true}).check();await state();
  assert.notEqual(await page.locator('.ww canvas').evaluate(c=>c.toDataURL()),pictureBeforeGrid);
  assert.equal(JSON.stringify((await state()).world),beforeGrid);
  await page.screenshot({path:path.join(out,'worlds-ground-grid.png'),fullPage:true});
  await page.getByRole('checkbox',{name:'Show ground-cell grid',exact:true}).uncheck();await state();
  assert.equal(await page.locator('.ww canvas').evaluate(c=>c.toDataURL()),pictureBeforeGrid);
  check('Optional ground grid changes only rendering and restores the identical landscape');
  await page.getByLabel('Ground cell',{exact:true}).selectOption('45');
  const unedited=(await state()).world;await click('Patch: Paving');const initial=await state();assert(initial.world.cells.filter(c=>c.cover==='paved').length>0);
  await click('Undo land edit');assert.deepEqual((await state()).world,unedited);
  await click('Patch: Paving');check('Undo restores edited cover without changing water');
  await click('Start storm');await page.waitForFunction(()=>waterWorldsData.waterWorlds.world.minutes>=3);
  await click('Pause');const paused=(await state()).world.minutes;await page.waitForTimeout(550);assert.equal((await state()).world.minutes,paused);
  assert(await page.getByRole('button',{name:'Patch: Woodland',exact:true}).isDisabled());
  await click('Advance 15 min');assert.equal((await state()).world.minutes,paused+15);
  await click('Flow paths');assert(Number(await page.locator('.ww canvas').getAttribute('data-flow-arrows'))>0);
  await page.getByText('What happens next?',{exact:true}).click();
  assert(await page.getByText(/Surface flow from this cell:/).isVisible());
  await page.screenshot({path:path.join(out,'worlds-desktop-rain.png'),fullPage:true});
  await audit('flow');check('Model-derived flow arrows and accessible cell-transfer readings');
  await click('Finish this run');await page.waitForFunction(()=>waterWorldsData.waterWorlds.run.complete);
  await click('Pin this baseline');const baseline=JSON.stringify((await state()).baseline);check('Live storm, pause, step, conserved completion, immutable baseline');
  await click('Patch: Woodland');await click('Replay baseline weather');await click('Finish this run');
  assert(await page.locator('[data-ww-comparison]').isVisible());
  const compared=await state();assert.equal(JSON.stringify(compared.baseline),baseline);assert(compared.run.paired);
  assert.deepEqual(compared.run.start.cells.map(c=>c.soil),compared.baseline.run.start.cells.map(c=>c.soil));
  assert.deepEqual(compared.run.forcing,compared.baseline.run.forcing);
  const results=await page.evaluate(()=>({a:WaterWorldsKernel.result(waterWorldsData.waterWorlds.baseline.world,waterWorldsData.waterWorlds.baseline.run),b:WaterWorldsKernel.result(waterWorldsData.waterWorlds.world,waterWorldsData.waterWorlds.run)}));
  assert(results.b.outflowM3<results.a.outflowM3);assert(Math.abs(results.b.errorM3)<1e-7);check('Same-weather comparison changes physical runoff and preserves starting water');
  await page.getByRole('checkbox',{name:/Highlight changed land/}).check();await state();
  assert.equal(Number(await page.locator('.ww canvas').getAttribute('data-changed-cells')),9);
  const completedEvidence=await page.evaluate(()=>JSON.stringify(WaterWorldsKernel.evidence(waterWorldsData.waterWorlds)));
  const scrub=async minute=>{const slider=page.getByLabel('Inspection minute',{exact:true});await slider.focus();await slider.press('Home');for(let i=0;i<minute;i++)await slider.press('ArrowRight');await page.waitForFunction(t=>Number(document.querySelector('.ww canvas').dataset.modelTime)===t,compared.run.start.minutes+minute);};
  await scrub(20);assert(await page.getByRole('button',{name:'Patch: Woodland',exact:true}).isDisabled());
  const expectedPast=await page.evaluate(()=>WaterWorldsKernel.measure(WaterWorldsKernel.atTime(waterWorldsData.waterWorlds.run,20)).surfaceM3);
  assert(Math.abs(Number(await page.locator('.ww canvas').getAttribute('data-water-volume'))-expectedPast)<.0001);
  assert.equal(await page.evaluate(()=>JSON.stringify(WaterWorldsKernel.evidence(waterWorldsData.waterWorlds))),completedEvidence);
  await page.screenshot({path:path.join(out,'worlds-inspection.png'),fullPage:true});await audit('inspection');
  await click('Differences');assert.equal(await page.locator('.ww canvas').getAttribute('data-difference-minute'),'20');
  await page.getByLabel('Compare water store',{exact:true}).selectOption('soil');await state();
  const expectedDifference=await page.evaluate(()=>WaterWorldsKernel.spatialDifference(waterWorldsData.waterWorlds,20).cells[waterWorldsData.waterWorlds.selected].soil.differenceMm);
  assert.equal(Number(await page.locator('[data-ww-cell-difference]').getAttribute('data-ww-cell-difference')),expectedDifference);
  await page.getByText('Read cell-by-cell differences',{exact:true}).click();
  assert.equal(await page.locator('table').filter({has:page.locator('caption',{hasText:'At 20 min'})}).locator('tbody tr').count(),96);
  await audit('differences');await page.screenshot({path:path.join(out,'worlds-differences.png'),fullPage:true});
  await scrub(0);assert.equal(Number(await page.locator('[data-ww-cell-difference]').getAttribute('data-ww-cell-difference')),0);
  assert.equal(await page.evaluate(()=>JSON.stringify(WaterWorldsKernel.evidence(waterWorldsData.waterWorlds))),completedEvidence);
  check('Synchronized difference map, signed cell readings, table, and immutable export');
  await click('When rain stops');assert.equal(await page.getByLabel('Inspection minute',{exact:true}).inputValue(),'40');
  await click('Return to final state');assert(!(await page.getByRole('button',{name:'Patch: Woodland',exact:true}).isDisabled()));
  check('Recorded-time inspection and changed-cover overlays preserve completed evidence');
  const beforeGuidance=JSON.stringify((await state()).world);
  await page.getByLabel('Choose an investigation',{exact:true}).selectOption('memory');
  await page.getByLabel('Learning lens',{exact:true}).selectOption('notice');assert(await page.locator('[data-ww-guide]').getByText('What did the valley keep from the first storm?').isVisible());
  await page.getByLabel('Learning lens',{exact:true}).selectOption('model');assert(await page.locator('[data-ww-guide]').getByText(/antecedent storage/).isVisible());
  assert.equal(JSON.stringify((await state()).world),beforeGuidance);check('Learning-level investigation prompts leave the experiment unchanged');
  await page.getByLabel('My prediction',{exact:true}).fill('Woodland will store more water.');await page.getByLabel('My explanation',{exact:true}).fill('The same storm produced less outlet flow after changing the patch. These are simplified model results, not a flood forecast.');
  await page.getByLabel('Learning lens',{exact:true}).selectOption('model');
  await page.screenshot({path:path.join(out,'worlds-desktop-comparison.png'),fullPage:true});
  const download=page.waitForEvent('download');await click('Download investigation');await(await download).saveAs(path.join(out,'example-investigation.json'));
  const evidence=JSON.parse(fs.readFileSync(path.join(out,'example-investigation.json'),'utf8'));assert(evidence.explanation.includes('same storm'));assert.equal(evidence.modelVersion,1);check('Evidence export with model version, conditions, samples, and reflection');
  await scrub(0);
  const readable=page.waitForEvent('download');await click('Download readable report');await(await readable).saveAs(path.join(out,'example-investigation.txt'));
  const text=fs.readFileSync(path.join(out,'example-investigation.txt'),'utf8');assert(text.includes('Observation: 100.0 min'));assert(text.includes('The same storm'));check('Readable report exports the completed result while inspecting the past');
  const before=(await state()).world;await click('Start another storm');assert(await page.getByRole('button',{name:'Differences',exact:true}).isDisabled());await click('Pause');const second=await state();assert.deepEqual(second.run.start.cells,before.cells);await click('Finish this run');check('Second storm retains antecedent soil moisture');
  const saved=await state();await page.getByRole('button',{name:/^Explore\./}).click();await page.getByRole('button',{name:/^Water Worlds\./}).click();await page.waitForSelector('.ww');
  assert.deepEqual((await state()).world,saved.world);assert.equal((await state()).running,false);check('Mode-switch persistence and paused restore');
  await page.locator('.ww canvas').focus();const selected=(await state()).selected;await page.keyboard.press('ArrowDown');await page.waitForFunction(expected=>waterWorldsData.waterWorlds.selected===expected,selected+12);assert.equal((await state()).selected,selected+12);
  await page.getByLabel('Ground cell',{exact:true}).selectOption('12');await page.locator('.ww canvas').focus();await page.keyboard.press('ArrowLeft');assert.equal((await state()).selected,12);
  await page.getByLabel('Ground cell',{exact:true}).selectOption('23');await page.locator('.ww canvas').focus();await page.keyboard.press('ArrowRight');assert.equal((await state()).selected,23);
  await page.getByRole('button',{name:'Soil moisture',exact:true}).click();await audit('keyboard');check('Keyboard location selection and soil lens');
  for(const width of [390,320]){await page.setViewportSize({width,height:844});const nav=await page.locator('.wc-mode-tab').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height};}));assert.equal(nav.length,5);assert(nav.every(r=>r.left>=0&&r.right<=width+1&&r.height>=44),'All five modes visible at '+width);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow at '+width);await page.screenshot({path:path.join(out,'worlds-'+width+'.png'),fullPage:true});}
  await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Surface water',exact:true}).click();const imageBefore=await page.locator('.ww canvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(450);assert.equal(await page.locator('.ww canvas').evaluate(c=>c.toDataURL()),imageBefore);check('Narrow layouts and a stable paused canvas under reduced motion');
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(saved=>mountWaterWorlds({wcMode:'worlds',waterWorlds:saved},true),saved);await page.waitForSelector('.ww');await audit('dark');await page.screenshot({path:path.join(out,'worlds-dark.png'),fullPage:true});
  await page.evaluate(snapshot=>mountWaterWorlds({wcMode:'worlds',waterWorlds:{...snapshot,lens:'difference',differenceStore:'ground'}},true),compared);await page.waitForSelector('[data-ww-cell-difference]');await state();
  await audit('dark-differences');await page.setViewportSize({width:320,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(out,'worlds-differences-320.png'),fullPage:true});
  check('Difference preferences restore with dark-mode contrast and 320px layout');
  await page.setViewportSize({width:1440,height:1000});
  await page.getByLabel('Rainfall pattern',{exact:true}).selectOption('late');await state();
  const beforeTiming=await state(),timingBaseline=JSON.stringify(beforeTiming.baseline);
  await click('Test rainfall timing');await click('Pause');let timing=await state();
  assert.equal(timing.run.forcing.pattern,'late');assert.deepEqual(timing.run.start.cells,timing.baseline.run.start.cells);
  assert(await page.getByLabel('Rainfall pattern',{exact:true}).isDisabled());
  await click('Finish this run');timing=await state();assert.equal(JSON.stringify(timing.baseline),timingBaseline);
  assert.equal(timing.run.forcing.rain,timing.baseline.run.forcing.rain);assert.equal(timing.run.forcing.duration,timing.baseline.run.forcing.duration);
  assert(await page.getByRole('button',{name:'Differences',exact:true}).isDisabled());
  assert(await page.getByText('Same amount of rain. Different timing?',{exact:true}).isVisible());
  const rainResults=await page.evaluate(()=>({timing:WaterWorldsKernel.result(waterWorldsData.waterWorlds.world,waterWorldsData.waterWorlds.run),baseline:WaterWorldsKernel.result(waterWorldsData.waterWorlds.baseline.world,waterWorldsData.waterWorlds.baseline.run)}));
  assert(Math.abs(rainResults.timing.rainfallM3-rainResults.baseline.rainfallM3)<1e-7);
  const slider=page.getByLabel('Inspection minute',{exact:true});await slider.focus();await slider.press('Home');await state();
  assert(await page.getByText('Rain at this minute: 22.5 mm/h').isVisible());
  for(let i=0;i<20;i++)await slider.press('ArrowRight');await state();
  assert(await page.getByText('Rain at this minute: 67.5 mm/h').isVisible());
  await page.getByLabel('Choose an investigation',{exact:true}).selectOption('timing');await state();
  await audit('rain-pattern');await page.screenshot({path:path.join(out,'worlds-rain-timing.png'),fullPage:true});
  const timingDownload=page.waitForEvent('download');await click('Download investigation');await(await timingDownload).saveAs(path.join(out,'timing-investigation.json'));
  const timingEvidence=JSON.parse(fs.readFileSync(path.join(out,'timing-investigation.json'),'utf8'));assert.equal(timingEvidence.run.forcing.pattern,'late');assert(timingEvidence.comparison.startsWith('Timing test:'));
  await page.setViewportSize({width:320,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(out,'worlds-rain-timing-320.png'),fullPage:true});
  check('Equal-depth rainfall timing experiment, replay controls, recorded intensity, and exported provenance');
  const retina=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:2});
  retina.on('pageerror',e=>errors.push(String(e)));await retina.goto(url);await retina.waitForFunction(()=>document.querySelector('.ww canvas')?.dataset.pixelRatio==='2');
  assert.equal(await retina.locator('.ww canvas').evaluate(c=>c.width),1800);
  await retina.getByLabel('Ground cell',{exact:true}).selectOption('45');await retina.locator('.ww canvas').focus();await retina.keyboard.press('ArrowDown');
  await retina.waitForFunction(()=>waterWorldsData.waterWorlds.selected===57);
  await retina.screenshot({path:path.join(out,'worlds-retina.png'),fullPage:true});await retina.close();
  check('High-density canvas retains logical coordinates and keyboard selection');
  assert.deepEqual(errors,[]);check('Light/dark accessibility and no browser exceptions');
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({checks,errors,results},null,2));
 }catch(error){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true});throw error;}finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
