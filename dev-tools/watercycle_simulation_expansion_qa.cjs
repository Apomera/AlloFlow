'use strict';
// Focused UI/model evidence checks for dry-weather intervals and Storm Lab ranges.
// Run: node dev-tools/watercycle_simulation_expansion_qa.cjs
// Review: node dev-tools/watercycle_simulation_expansion_qa.cjs --serve
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports','watercycle-simulation-expansion');
const html=String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Water cycle simulation expansion</title>
<link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;background:#e8eef1;font-family:system-ui}main{max-width:1500px;margin:auto;padding:16px}@media(max-width:500px){main{padding:8px}}</style></head><body><main id="slot"></main>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/stem_lab/stem_lab_module.js"></script><script src="/stem_lab/stem_tool_watercycle.js"></script><script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.mountSimulation=function(seed,theme='light'){
 function Host(){const [data,setData]=React.useState({waterCycle:seed});window.simulationData=data.waterCycle;window.stormData=data.waterCycle;window.waterWorldsData=data.waterCycle;window.simulationSet=setData;const noop=()=>{};
  return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:message=>{window.simulationAnnouncement=message;},awardXP:noop,getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});}
 document.documentElement.classList.toggle('dark',theme==='dark');document.body.style.background=theme==='dark'?'#0b1722':theme==='contrast'?'#fff':'#e8eef1';ReactDOM.unmountComponentAtNode(document.getElementById('slot'));ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
};
const params=new URLSearchParams(location.search);mountSimulation(params.get('mode')==='storm'?{wcMode:'precipHunt',precipHunt:{viewMode:'2d',cameraFocus:'storm',showStormAnatomy:false}}:{wcMode:'worlds'},params.get('theme')||'light');
</script></body></html>`;
const allowed=['/stem_lab/','/desktop/web-app/node_modules/react/umd/','/desktop/web-app/node_modules/react-dom/umd/','/desktop/web-app/node_modules/axe-core/','/dev-tools/.cache/sweep-tailwind.css'];
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(html);}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)||!allowed.some(prefix=>url.pathname.startsWith(prefix))){res.writeHead(403);return res.end();}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end('Missing asset');}else{res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream'});res.end(data);}});
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(process.argv.includes('--serve')?Number(process.env.WATER_CYCLE_EXPANSION_PORT||8770):0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';if(process.argv.includes('--serve')){console.log('Water cycle expansion preview: '+url);return;}
 const browser=await chromium.launch({headless:true,downloadsPath:path.join(out,'downloads'),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});
 const checks=[],audits=[],errors=[];page.on('pageerror',error=>errors.push(String(error)));page.setDefaultTimeout(30000);
 const checkpoint=name=>{checks.push(name);console.log('PASS '+name);};
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const state=async()=>{await settle();return page.evaluate(()=>JSON.parse(JSON.stringify(simulationData)));};
 const worlds=async()=>(await state()).waterWorlds;
 const experiment=async()=>((await state()).precipHunt||{}).experiment||{};
 const click=async name=>{await page.getByRole('button',{name,exact:true}).click();await settle();};
 const expand=async text=>{const summary=page.locator('summary').filter({hasText:text}).first();assert(await summary.count(),'details summary exists: '+text);const details=summary.locator('xpath=..');if(!await details.evaluate(el=>el.open))await summary.click();return details;};
 // Capture the browser's real download Blob before navigation. Chromium downloads
 // are canceled in the managed Windows sandbox, even with a writable download
 // directory; preserving the generated filename and exact Blob text still checks
 // the actual UI export handler and leaves its result available for review.
 const download=async(name,file)=>{const sequence=await page.evaluate(()=>simulationExportSequence||0);await click(name);await page.waitForFunction(previous=>simulationExportSequence>previous,sequence);const exported=await page.evaluate(()=>simulationLastExport);assert(exported.filename,'Export suggests a filename');fs.writeFileSync(path.join(out,file),exported.text);return exported.text;};
 async function audit(selector,label){const violations=await page.evaluate(async selector=>(await axe.run(selector,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),selector);audits.push({label,violations});fs.writeFileSync(path.join(out,'accessibility.json'),JSON.stringify(audits,null,2));assert.deepEqual(violations,[],label+' accessibility');}
 async function noOverflow(label){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No document overflow: '+label);}
 try{
  await page.goto(url);await page.waitForSelector('.ww canvas');await page.waitForFunction(()=>simulationData.waterWorlds);
  await page.evaluate(()=>{const create=URL.createObjectURL.bind(URL),blobs=new Map();window.simulationExportSequence=0;URL.createObjectURL=blob=>{const url=create(blob);blobs.set(url,blob);return url;};document.addEventListener('click',event=>{const anchor=event.target.closest&&event.target.closest('a[download]');if(!anchor||!blobs.has(anchor.href))return;event.preventDefault();const filename=anchor.download;blobs.get(anchor.href).text().then(text=>{window.simulationLastExport={filename,text};window.simulationExportSequence++;});},true);});
  await page.addScriptTag({url:url+'desktop/web-app/node_modules/axe-core/axe.min.js'});
  const recoveryDetails=await expand('Between storms');
  const interval=page.getByLabel('Dry-weather interval',{exact:true}),advance=page.getByRole('button',{name:'Advance dry weather',exact:true});
  assert.deepEqual(await interval.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value)),['6','24','72']);
  await interval.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await settle();assert(await interval.evaluate(el=>el===document.activeElement),'Keyboard choice retains focus');
  await interval.selectOption('24');await click('Start storm');await page.waitForFunction(()=>simulationData.waterWorlds.running===true);
  assert(await advance.isDisabled(),'Dry-weather step disabled during an active storm');assert(await interval.isDisabled(),'Dry-weather interval disabled during an active storm');
  await click('Pause');assert(await advance.isDisabled(),'A paused unfinished storm must not be replaced by dry weather');
  await click('Finish this run');await page.waitForFunction(()=>simulationData.waterWorlds.run.complete);
  await click('Pin this baseline');const beforeRecovery=await worlds(),baseline=JSON.stringify(beforeRecovery.baseline);
  const expectedRecovery=await page.evaluate(()=>JSON.parse(JSON.stringify(WaterWorldsKernel.recover(simulationData.waterWorlds,24))));
  assert(!await advance.isDisabled());await advance.focus();await page.keyboard.press('Enter');await page.waitForSelector('[data-ww-recovery="true"]');
  const recovered=await worlds(),receipt=recovered.recovery;
  assert.equal(receipt.durationHours,24);assert.equal(receipt.durationMinutes,1440);assert.equal(recovered.world.minutes,beforeRecovery.world.minutes+1440);
  assert.deepEqual(recovered.world,expectedRecovery.world,'UI dry interval uses the conservative solver');assert.deepEqual(receipt,expectedRecovery.recovery,'Receipt is the solver result');
  assert.equal(JSON.stringify(recovered.baseline),baseline,'Dry weather preserves the pinned baseline');assert(Math.abs(receipt.errorM3)<1e-7);
  assert(receipt.after.storedM3<receipt.before.storedM3,'Dry interval releases or evaporates retained water');
  const recoveryRegion=page.locator('[data-ww-recovery="true"]');assert((await recoveryRegion.innerText()).includes('24'));
  assert(await recoveryRegion.locator('table').count(),'Recovery provides a before/after table');assert(await recoveryRegion.locator('tbody tr').count()>=3);
  await audit('[data-ww-recovery="true"]','recovery-light');await recoveryDetails.screenshot({path:path.join(out,'between-storms-light-1440.png')});
  checkpoint('Dry interval is keyboard accessible, blocks unfinished storms, conserves water, and preserves the baseline');

  const recoveredCells=JSON.stringify(recovered.world.cells);await click('Start another storm');await click('Pause');let second=await worlds();
  assert.equal(JSON.stringify(second.run.start.cells),recoveredCells,'Next storm carries the recovered water stores');assert.deepEqual(second.run.recovery,receipt,'Next storm retains its dry-weather provenance');
  await click('Finish this run');const completed=await worlds();assert.equal(JSON.stringify(completed.baseline),baseline);
  const evidence=JSON.parse(await download('Download investigation','between-storms-investigation.json'));
  assert.deepEqual(evidence.run.recovery,receipt,'JSON export records the interval that set the next starting conditions');
  const report=await download('Download readable report','between-storms-report.txt');assert(/24\s*(hour|h)/i.test(report),'Readable report contains the dry interval duration');
  assert(/dry|between storms/i.test(report));
  await page.getByRole('button',{name:/^Explore\./}).click();await page.getByRole('button',{name:/^Water Worlds\./}).click();await page.waitForSelector('.ww');
  assert.deepEqual((await worlds()).run.recovery,receipt);assert.equal(JSON.stringify((await worlds()).baseline),baseline);
  checkpoint('A second storm and exported evidence retain the dry-weather receipt across mode changes');

  const worldsSeed=await state();
  for(const theme of ['light','dark','contrast'])for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:width===1440?1100:940});await page.evaluate(({seed,theme})=>mountSimulation(seed,theme),{seed:worldsSeed,theme});await page.waitForSelector('.ww');await expand('Between storms');await noOverflow('Water Worlds '+theme+' '+width);
   await audit('[data-ww-recovery="true"]','recovery-'+theme+'-'+width);await page.locator('[data-ww-recovery="true"]').screenshot({path:path.join(out,'recovery-'+theme+'-'+width+'.png')});
  }
  checkpoint('Recovery receipts pass scoped accessibility audits in three themes at 1440, 390, and 320 pixels');

  await page.setViewportSize({width:1440,height:1100});await page.evaluate(()=>mountSimulation({wcMode:'precipHunt',precipHunt:{viewMode:'2d',cameraFocus:'storm',showStormAnatomy:false}}));await page.waitForSelector('.wc-storm-experiment');await click('Compare two setups');
  const rangeDetails=await expand('Test a range of conditions'),rangeVariable=page.getByLabel('Range variable',{exact:true});
  await rangeVariable.selectOption('midLevelTempC');await rangeVariable.focus();await page.keyboard.press('ArrowDown');await settle();assert(await rangeVariable.evaluate(el=>el===document.activeElement));await rangeVariable.selectOption('midLevelTempC');
  const prediction='A warmer middle-air layer will change which frozen particles survive to the ground.';
  const explanation='The sampled configurations held the other inputs fixed. Adjacent samples bracket a model transition; they do not locate a real weather threshold.';
  await page.getByLabel('Range prediction',{exact:true}).fill(prediction);await page.getByRole('button',{name:'Run range experiment',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForSelector('[data-storm-sweep="true"]');
  let savedRange=(await experiment()).range;assert(savedRange,'Range setup is saved with the experiment');assert.equal(savedRange.variable,'midLevelTempC');assert.equal(savedRange.count,11);assert.equal(savedRange.prediction,prediction);
  const rangeModel=await page.evaluate(()=>{const r=simulationData.precipHunt.experiment.range;return JSON.parse(JSON.stringify(WaterCyclePrecipitationKernel.sweep(r.setup,r.variable,{start:r.start,end:r.end,count:r.count})));});
  const rows=page.locator('[data-storm-sweep="true"] table tbody tr');assert.equal(await rows.count(),11);
  for(let index=0;index<11;index++){
   const sample=rangeModel.samples[index],row=await rows.nth(index).innerText();assert(row.includes(sample.displayLabel),'Row '+index+' names its recomputed outcome');assert.equal(Number(await rows.nth(index).getAttribute('data-sample-index')),index);assert.equal(Number(await rows.nth(index).getAttribute('data-sample-intensity')),sample.intensity,'Row '+index+' contains its recomputed intensity');
   const recomputed=await page.evaluate(config=>WaterCyclePrecipitationKernel.compute(config),sample.config);assert.equal(sample.intensity,recomputed.relativeIntensity);assert.equal(sample.visualType,recomputed.visualType);
   assert(await rows.nth(index).getByRole('button',{name:'View sample '+(index+1)+' in chamber',exact:true}).count());
  }
  await page.getByLabel('Range explanation',{exact:true}).fill(explanation);savedRange=(await experiment()).range;assert.equal(savedRange.explanation,explanation);
  checkpoint('Eleven range samples display outcomes and intensities recomputed from the same frozen model setup');

  const savedRangeJSON=JSON.stringify(savedRange),savedSetupJSON=JSON.stringify(savedRange.setup);
  await rangeVariable.selectOption('moisture');assert.equal(JSON.stringify((await experiment()).range),savedRangeJSON,'Choosing the next variable cannot relabel previous evidence');
  await rows.nth(8).getByRole('button',{name:'View sample 9 in chamber',exact:true}).focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.activeElement.id==='wcPrecipLabTitle');
  let chamber=(await state()).precipHunt;for(const key of Object.keys(rangeModel.samples[8].config))assert.equal(chamber[key],rangeModel.samples[8].config[key],'Sample chamber config: '+key);
  assert.equal(JSON.stringify((await experiment()).range),savedRangeJSON,'Viewing a sample preserves all saved evidence');
  assert.equal(chamber.stormAutoPlay,false,'A sample is viewed with storm time paused');
  await page.locator('#wcPrecip-moisture').fill('43');assert.equal(JSON.stringify((await experiment()).range.setup),savedSetupJSON,'Changing chamber inputs leaves the recorded range detached');
  await click('Compare two setups');await expand('Test a range of conditions');assert.equal(await rows.count(),11);
  assert.equal(await page.getByLabel('Range prediction',{exact:true}).inputValue(),prediction);assert.equal(await page.getByLabel('Range explanation',{exact:true}).inputValue(),explanation);
  const exported=await download('Download range experiment','storm-range-experiment.txt');assert(exported.includes(prediction)&&exported.includes(explanation));assert(/intensity|index/i.test(exported));assert(/threshold|simplified|teaching/i.test(exported));
  for(const sample of rangeModel.samples)assert(exported.includes(sample.displayLabel),'Download includes each sampled outcome');
  await page.getByRole('button',{name:/^Explore\./}).click();await page.getByRole('button',{name:/^Storm Lab\./}).click();await page.waitForSelector('.wc-storm-experiment');await click('Compare two setups');await expand('Test a range of conditions');assert.equal(JSON.stringify((await experiment()).range),savedRangeJSON);
  checkpoint('Keyboard sample viewing, later chamber changes, new draft variables, download, and mode switches preserve recorded range evidence');

  await page.emulateMedia({reducedMotion:'reduce'});assert(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches));
  const stormSeed=await state();
  for(const theme of ['light','dark','contrast'])for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:width===1440?1100:940});await page.evaluate(({seed,theme})=>mountSimulation(seed,theme),{seed:stormSeed,theme});await page.waitForSelector('.wc-storm-experiment');await click('Compare two setups');await expand('Test a range of conditions');await noOverflow('Storm range '+theme+' '+width);
   const tableLayout=await page.locator('.wc-range-table').evaluate(el=>({headerHeight:el.querySelector('thead').getBoundingClientRect().height,firstRowTop:el.querySelector('tbody tr').getBoundingClientRect().top,viewportBottom:el.getBoundingClientRect().bottom}));assert(tableLayout.headerHeight<160,'Table headers remain readable at '+width);assert(tableLayout.firstRowTop<tableLayout.viewportBottom,'At least one sampled result is visible before scrolling at '+width);
   await audit('#wcStormSweep','range-'+theme+'-'+width);await page.locator('#wcStormSweep').screenshot({path:path.join(out,'storm-range-'+theme+'-'+width+'.png')});assert.equal(JSON.stringify((await experiment()).range),savedRangeJSON);
  }
  checkpoint('Range evidence passes scoped accessibility audits in three themes at 1440, 390, and 320 pixels under reduced motion');
  await page.setViewportSize({width:1440,height:1100});await page.evaluate(()=>mountSimulation({wcMode:'precipHunt',precipHunt:{viewMode:'2d',cameraFocus:'storm',showStormAnatomy:false}}));await page.waitForSelector('#wcPrecipPreset');await page.locator('#wcPrecipPreset').selectOption('mountainSnow');await click('Compare two setups');await expand('Test a range of conditions');
  await page.getByLabel('Range variable',{exact:true}).selectOption('surfaceTempC');await page.locator('#wcStormRangeStart').fill('0.4999');await page.locator('#wcStormRangeEnd').fill('0.5001');await page.locator('#wcStormRangeCount').selectOption('5');await click('Run range experiment');await page.waitForSelector('[data-storm-sweep="true"]');
  const preciseValues=await page.locator('[data-storm-sweep="true"] tbody tr th[scope="row"]').allTextContents();assert.deepEqual(preciseValues,['0.4999','0.49995','0.5','0.50005','0.5001'],'Closely spaced samples retain distinct displayed inputs');
  const preciseModel=await page.evaluate(()=>{const r=simulationData.precipHunt.experiment.range;return JSON.parse(JSON.stringify(WaterCyclePrecipitationKernel.sweep(r.setup,r.variable,{start:r.start,end:r.end,count:r.count})));});
  const preciseExport=JSON.parse(await download('Download range experiment','storm-range-precision.json'));assert.deepEqual(preciseExport.samples.map(sample=>sample.value),preciseModel.samples.map(sample=>sample.value));for(let index=0;index<5;index++)assert.equal(preciseExport.samples[index].setup.surfaceTempC,preciseModel.samples[index].config.surfaceTempC);
  await page.locator('#wcStormSweep').screenshot({path:path.join(out,'storm-range-precision-1440.png')});checkpoint('Five narrowly spaced surface-temperature samples display and export all six decimal places without conflating inputs');
  assert.deepEqual(errors,[],'No browser exceptions');checkpoint('No browser exceptions');
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,checks,audits,errors,rangeSummary:rangeModel.summary,recovery:receipt},null,2));
 }catch(error){console.error(error);await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:false,error:String(error),checks,audits,errors},null,2));process.exitCode=1;}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
