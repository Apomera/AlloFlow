'use strict';
// Run with node dev-tools/watercycle_storm_experiment_qa.cjs; --serve opens a review preview.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'scratch','storm-experiment-review');
const html=String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Storm Lab comparison preview</title>
<link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css">
<style>body{margin:0;background:#e8eef1;font-family:system-ui}main{padding:16px;max-width:1500px;margin:auto}@media(max-width:500px){main{padding:8px}}</style></head><body><main id="slot"></main>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/stem_lab/stem_lab_module.js"></script><script src="/stem_lab/stem_tool_watercycle.js"></script>
<script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.mountStorm=function(seed,theme='light'){
 function Host(){
  const [data,setData]=React.useState({waterCycle:seed});window.stormData=data.waterCycle;window.stormSet=setData;
  const noop=()=>{};
  return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,
   setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:message=>{window.stormAnnouncement=message;},awardXP:noop,getXP:()=>0,
   beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});
 }
 document.documentElement.classList.toggle('dark',theme==='dark');document.body.style.background=theme==='dark'?'#0b1722':theme==='contrast'?'#fff':'#e8eef1';
 ReactDOM.unmountComponentAtNode(document.getElementById('slot'));ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
};
var params=new URLSearchParams(location.search),immersive=params.get('immersive')==='1';
mountStorm({wcMode:'precipHunt',precipHunt:{viewMode:immersive?'3d':'2d',cameraFocus:immersive?'immersive':'storm',showStormAnatomy:false}},params.get('theme')||'light');
</script></body></html>`;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(html);}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end('Not found');}else{res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream'});res.end(data);}});
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(resolve=>server.listen(process.argv.includes('--serve')?Number(process.env.STORM_EXPERIMENT_PORT||8769):0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';
 if(process.argv.includes('--serve')){console.log('Storm comparison preview: '+url);return;}
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});
 const errors=[],checks=[],audits=[];page.on('pageerror',error=>errors.push(String(error)));page.setDefaultTimeout(30000);
 const checkpoint=name=>{checks.push(name);console.log('PASS '+name);};
 const state=()=>page.evaluate(()=>JSON.parse(JSON.stringify(stormData)));
 const experiment=async()=>((await state()).precipHunt||{}).experiment;
 const click=name=>page.getByRole('button',{name,exact:true}).click();
 const workspace=()=>page.locator('.wc-storm-experiment');
 const kind=async expected=>assert.equal(await workspace().getAttribute('data-comparison-kind'),expected);
 const config=setup=>setup.config||setup;
 try{
  await page.goto(url);await page.waitForSelector('.wc-storm-experiment');
  await click('Compare two setups');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'wcStormExperimentTitle');
  assert(await page.getByRole('heading',{name:'One change, two storms',exact:true}).isVisible());
  checkpoint('comparison entry scrolls to and focuses its heading');

  const prediction='Moister air below the cloud will let more precipitation reach the ground.';
  const explanation='With the other inputs held at A, moister air increased the intensity index. This model is illustrative; its index is not a measured rainfall rate.';
  await page.getByLabel('My storm prediction',{exact:true}).fill(prediction);
  await click('Test dry air');await kind('identical');
  let e=await experiment();
  assert.equal(e.variable,'lowLevelHumidity');assert.equal(e.prediction,prediction);
  const frozenA=JSON.stringify(e.a);
  await page.getByLabel('Test value for B',{exact:true}).fill('85');await kind('single');
  assert.equal(JSON.stringify((await experiment()).a),frozenA,'changing live B must not mutate A');
  assert.equal((await state()).precipHunt.lowLevelHumidity,85);
  assert.equal(await page.locator('.wc-storm-setup[data-setup="A"]').count(),1);
  assert.equal(await page.locator('.wc-storm-setup[data-setup="B"]').count(),1);
  checkpoint('dry-air guide preserves prediction and live B leaves pinned A unchanged');

  await page.locator('#wcPrecip-moisture').fill('43');await kind('multiple');
  await click('Hold other inputs at A');await kind('single');
  e=await experiment();
  assert.equal((await state()).precipHunt.moisture,config(e.a).moisture);
  assert.equal((await state()).precipHunt.lowLevelHumidity,85,'fair restoration retains the chosen B variable');
  assert.equal(JSON.stringify(e.a),frozenA);
  checkpoint('multiple changed inputs are detected and fair restoration retains only the chosen change');

  await page.getByLabel('My storm explanation',{exact:true}).fill(explanation);
  await click('Save this comparison');
  e=await experiment();assert.equal(e.saved.length,1);assert.equal(e.saved[0].prediction,prediction);assert.equal(e.saved[0].explanation,explanation);
  assert.equal(config(e.saved[0].b).lowLevelHumidity,85);
  const firstPair=JSON.stringify(e.saved[0]);
  await page.locator('#wcPrecip-moisture').fill('58');
  await page.getByLabel('My storm explanation',{exact:true}).fill('A new draft must not alter the saved explanation.');
  assert.equal(JSON.stringify((await experiment()).saved[0]),firstPair);
  checkpoint('saved pairs contain both configurations and immutable learner evidence');

  const savedCard=page.locator('.wc-storm-saved').first();
  const savedDetails=savedCard.locator('xpath=ancestor::details[1]');
  if(await savedDetails.count()&&!await savedDetails.evaluate(el=>el.open))await savedDetails.locator('summary').click();
  await savedCard.getByRole('button',{name:'View saved A in chamber',exact:true}).click();
  assert.equal((await state()).precipHunt.lowLevelHumidity,config(JSON.parse(firstPair).a).lowLevelHumidity);
  await savedCard.getByRole('button',{name:'View saved B in chamber',exact:true}).click();
  assert.equal((await state()).precipHunt.lowLevelHumidity,85);
  assert.equal(JSON.stringify((await experiment()).saved[0]),firstPair);
  checkpoint('saved A and B can be viewed in the chamber without rewriting evidence');

  const downloadPromise=page.waitForEvent('download');
  await savedCard.getByRole('button',{name:'Download comparison 1',exact:true}).click();
  const download=await downloadPromise,downloadPath=path.join(out,'comparison-1.txt');await download.saveAs(downloadPath);
  const exported=fs.readFileSync(downloadPath,'utf8');
  assert(exported.includes(prediction)&&exported.includes(explanation),'download contains original learner evidence');
  assert(/85/.test(exported),'download contains B humidity');
  assert(exported.includes(String(config(JSON.parse(firstPair).a).lowLevelHumidity)),'download contains A humidity');
  assert(/index/i.test(exported),'download preserves the model-scale limit');
  checkpoint('download contains original A/B values, prediction, explanation and model limits');

  await page.getByRole('button',{name:/^Explore\./}).click();await page.waitForSelector('#wcCanvas');
  await page.getByRole('button',{name:/^Storm Lab\./}).click();await page.waitForSelector('.wc-storm-experiment');
  assert.equal(JSON.stringify((await experiment()).saved[0]),firstPair);
  await page.getByRole('button',{name:/Reset lab/}).click();
  assert.equal(JSON.stringify((await experiment()).saved[0]),firstPair);
  checkpoint('saved comparisons survive mode changes and resetting the live chamber');

  for(const [label,variable,testValue]of [['Test a warm layer','midLevelTempC','7'],['Test rising air','updraft','83']]){
   const previousExplanation=(await experiment()).explanation;
   await click(label);await kind('identical');assert.equal((await experiment()).variable,variable);
   assert.equal((await experiment()).prediction,prediction);assert.equal((await experiment()).explanation,previousExplanation);
   await page.getByLabel('Test value for B',{exact:true}).fill(testValue);await kind('single');
   assert.equal((await state()).precipHunt[variable],Number(testValue));
   await page.getByLabel('My storm explanation',{exact:true}).fill('Only '+variable+' was changed; compare the model response.');
   await click('Save this comparison');
  }
  assert.equal((await experiment()).saved.length,3);
  checkpoint('warm-layer and rising-air guides isolate their intended inputs');

  await page.locator('#wcPrecipPreset').selectOption('summerStorm');
  await page.getByLabel('Variable to investigate',{exact:true}).selectOption('stormDistanceKm');
  await click('Pin current setup as A');await kind('identical');
  const slider=page.getByLabel('Test value for B',{exact:true});
  await slider.fill('9');
  await slider.focus();const sliderBefore=Number(await slider.inputValue());
  await page.keyboard.press(sliderBefore>=99?'ArrowLeft':'ArrowRight');
  assert.notEqual(Number(await slider.inputValue()),sliderBefore,'B slider supports arrow keys');
  assert(await slider.evaluate(el=>document.activeElement===el),'focus remains on the live B slider');
  await kind('single');
  const thunderModels=await page.evaluate(()=>({a:WaterCyclePrecipitationKernel.compute(stormData.precipHunt.experiment.a),b:WaterCyclePrecipitationKernel.compute(stormData.precipHunt)}));
  assert(thunderModels.a.lightningEligible&&thunderModels.b.lightningEligible,'distance comparison uses an electrically active storm');
  assert(thunderModels.b.thunder.delaySeconds>thunderModels.a.thunder.delaySeconds);
  for(const [letter,model]of [['A',thunderModels.a],['B',thunderModels.b]]){
   assert((await page.locator('.wc-storm-setup[data-setup="'+letter+'"]').innerText()).includes(model.thunder.delaySeconds.toFixed(1)),'setup '+letter+' shows its modeled thunder delay');
  }
  await click('Save this comparison');assert.equal((await experiment()).saved.length,4);
  const thunderDownloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download comparison 4',exact:true}).click();
  const thunderDownload=await thunderDownloadPromise,thunderDownloadPath=path.join(out,'comparison-thunder.txt');await thunderDownload.saveAs(thunderDownloadPath);
  const thunderText=fs.readFileSync(thunderDownloadPath,'utf8');
  assert(thunderText.includes(thunderModels.a.thunder.delaySeconds.toFixed(1))&&thunderText.includes(thunderModels.b.thunder.delaySeconds.toFixed(1)),'distance evidence exports both modeled thunder delays');
  checkpoint('distance alone changes the displayed and exported thunder delay');
  assert(await page.getByRole('button',{name:'Save this comparison',exact:true}).isDisabled());
  assert.equal(JSON.stringify((await experiment()).saved[0]),firstPair,'reaching the cap must not evict earlier evidence');
  await page.getByRole('button',{name:'Remove comparison 4',exact:true}).click();
  assert.equal((await experiment()).saved.length,3);
  assert(!await page.getByRole('button',{name:'Save this comparison',exact:true}).isDisabled());
  checkpoint('keyboard editing, explicit four-pair capacity, and intentional removal');

  await page.emulateMedia({reducedMotion:'reduce'});
  await click('Test dry air');await page.getByLabel('Test value for B',{exact:true}).fill('85');await kind('single');
  assert.equal((await state()).precipHunt.lowLevelHumidity,85);
  assert(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches));
  checkpoint('reduced motion retains the complete comparison workflow');

  const visualSeed=await state();
  await page.addScriptTag({path:path.join(root,'desktop/web-app/node_modules/axe-core/axe.min.js')});
  for(const theme of ['light','dark','contrast'])for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:width===1440?1100:940});
   await page.evaluate(({seed,theme})=>mountStorm(seed,theme),{seed:visualSeed,theme});
   await page.waitForSelector('.wc-storm-experiment');await click('Compare two setups');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow at '+theme+' '+width);
   const violations=await page.evaluate(async()=>{
    const result=await axe.run('.wc-storm-experiment',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
    return result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
   });
   audits.push({theme,width,violations});
   fs.writeFileSync(path.join(out,'accessibility.json'),JSON.stringify(audits,null,2));
   await workspace().screenshot({path:path.join(out,'comparison-'+theme+'-'+width+'.png')});
   assert.deepEqual(violations,[],'comparison accessibility at '+theme+' '+width);
  }
  checkpoint('nine responsive light/dark/high-contrast captures and accessibility audits');
  assert.deepEqual(errors,[],'no browser errors');
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,checks,audits,errors},null,2));
 }catch(error){
  console.error(error);await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:false,error:String(error),checks,audits,errors},null,2));process.exitCode=1;
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
