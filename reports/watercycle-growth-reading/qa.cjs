'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const root = process.env.WC_REPO || process.cwd();
const {chromium} = createRequire(path.join(root, 'package.json'))('playwright');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const sourceFile = path.join(root, 'stem_lab/stem_tool_watercycle.js');
const mirrorFile = path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
const original = fs.readFileSync(sourceFile, 'utf8');
const expected = process.argv[2];
assert.match(expected || '', /^[a-f0-9]{64}$/, 'Pass candidate SHA256');
assert.equal(hash(original), expected, 'Source matches candidate');
assert.equal(hash(fs.readFileSync(mirrorFile)), expected, 'Mirror matches candidate');
const out = path.join(__dirname, 'pause-qa-' + expected.slice(0,12) + '-final-2');
fs.mkdirSync(out, {recursive:true});
const checks=[],details={},errors=[];
function check(label, fn) {fn();checks.push(label);console.log('PASS ' + label);}
function oneReplace(source, needle, replacement) {assert.equal(source.split(needle).length,2,'Unique observation target '+needle);return source.replace(needle,replacement);}
let source = original;
source = oneReplace(source, 'function drawCloudFormationMicrophysics(ctx2, w, h, cloudCenter, cloudY, cloudBase) {', `function drawCloudFormationMicrophysics(ctx2, w, h, cloudCenter, cloudY, cloudBase) {
window.qaFrame2d={mode:'2d',paused:!!model.config.paused,reduced:motionReduced,time:visualTime,phases:[],trace:[]}; window.qaTraceActive=true;`);
source = oneReplace(source, 'var coalescenceFrame2d = wcCoalescenceFrame(coalescenceCycle2d);', `var coalescenceFrame2d = wcCoalescenceFrame(coalescenceCycle2d);
window.qaFrame2d.phases.push({index:coalescencePairIndex2d,cycle:coalescenceCycle2d,stage:coalescenceFrame2d.stage,separation:coalescenceFrame2d.separation,fall:coalescenceFrame2d.fall});`);
source = oneReplace(source, 'var iceGrowthFrame2d = wcIceGrowthFrame(iceGrowthCycle2d);', `var iceGrowthFrame2d = wcIceGrowthFrame(iceGrowthCycle2d);
window.qaFrame2d.phases.push({index:iceGrowthIndex2d,cycle:iceGrowthCycle2d,stage:iceGrowthFrame2d.stage,radius:iceGrowthFrame2d.radius,tracerCount:iceGrowthFrame2d.tracerCount,tracerRadius:iceGrowthFrame2d.tracerRadius});`);
source = oneReplace(source, `ctx2.restore();\n              }\n\n              function drawPrecipCanvas(timestampOrForce) {`, `ctx2.restore();
window.qaTraceActive=false; window.qaRecord(window.qaFrame2d);
              }

              function drawPrecipCanvas(timestampOrForce) {`);
const particlesEntry = source.match(/function updatePrecip3dParticles\([^)]*\) \{/);
assert(particlesEntry, 'Find 3D particle update observation point');
source = oneReplace(source,particlesEntry[0],particlesEntry[0]+`\nwindow.qaFrame3dContext={mode:'3d',paused:!!modelPrecip3d.config.paused,reduced:motionReducedPrecip3d,time:visualTimePrecip3d};`);
let html = fs.readFileSync(path.join(root,'dev-tools/watercycle_storm_immersion_qa.cjs'),'utf8').match(/const html=String.raw`([\s\S]*?)`;/)[1];
html = oneReplace(html, 'var immersivePreview=', `
window.qaFrames=[]; window.qaSeq=0;
window.qaRecord=function(frame){frame.seq=++window.qaSeq;window.qaFrames.push(JSON.parse(JSON.stringify(frame)));if(window.qaFrames.length>500)window.qaFrames.shift();};
const qaArc=CanvasRenderingContext2D.prototype.arc,qaMove=CanvasRenderingContext2D.prototype.moveTo,qaLine=CanvasRenderingContext2D.prototype.lineTo;
CanvasRenderingContext2D.prototype.arc=function(x,y,r,...rest){if(window.qaTraceActive&&this.canvas.id==='wcPrecipCanvas')window.qaFrame2d.trace.push(['arc',x,y,r,this.fillStyle,this.strokeStyle,this.globalAlpha]);return qaArc.call(this,x,y,r,...rest);};
CanvasRenderingContext2D.prototype.moveTo=function(x,y){if(window.qaTraceActive&&this.canvas.id==='wcPrecipCanvas')window.qaFrame2d.trace.push(['move',x,y,this.strokeStyle,this.lineWidth,this.globalAlpha]);return qaMove.call(this,x,y);};
CanvasRenderingContext2D.prototype.lineTo=function(x,y){if(window.qaTraceActive&&this.canvas.id==='wcPrecipCanvas')window.qaFrame2d.trace.push(['line',x,y,this.strokeStyle,this.lineWidth,this.globalAlpha]);return qaLine.call(this,x,y);};
const qaLoader=StemLab.ensureThree;
StemLab.ensureThree=function(options){return qaLoader.call(StemLab,options).then(three=>{if(!three._pauseQA){three._pauseQA=true;const Native=three.WebGLRenderer;three.WebGLRenderer=function(options){const renderer=new Native(options),render=renderer.render;renderer.render=function(scene,camera){window.qaScene={scene,camera,renderer};const volume=scene.getObjectByName('storm-cloud-volume');if(volume)volume.visible=false;const warm=scene.getObjectByName('wc-coalescence-incoming'),cold=scene.getObjectByName('wc-ice-growth-crystals');if(window.qaFrame3dContext&&(warm||cold)){const active=warm&&warm.visible&&warm.geometry.drawRange.count?warm:cold;const frames=active&&(active.userData.coalescenceFrames||active.userData.iceGrowthFrames)||[];const keys=['index','cycle','stage','separation','fall','incomingCount','mergedCount','radius','tracerCount','tracerRadius','anchor'];const phases=frames.map(f=>Object.fromEntries(keys.filter(k=>k in f).map(k=>[k,f[k]])));window.qaRecord(Object.assign({},window.qaFrame3dContext,{phases,liveWind:document.getElementById('wcPrecip3dCanvas')?.dataset.liveWind}));}return render.call(renderer,scene,camera);};return renderer;};}return three;});};
var immersivePreview=`);
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(path.resolve(root)+path.sep)){res.writeHead(403);return res.end();}
 if(file===path.resolve(sourceFile)){res.setHeader('Content-Type','text/javascript');return res.end(source);}
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(data);});
});
let browser,page;
const signature = frame => ({phases:frame.phases, ...(frame.trace?{trace:frame.trace}:{})});
async function frames(){return page.evaluate(()=>window.qaFrames);}
async function latest(){return (await frames()).at(-1);}
async function mount(mode,processName,paused=false){
 await page.evaluate(({mode,processName,paused})=>{
  window.qaFrames=[];window.qaFrame3dContext=null;window.qaTraceActive=false;
  const cold=processName==='deposition';
  const preset=cold?'mountainSnow':'gentleRain';
  const config=Object.assign({},WaterCyclePrecipitationKernel.presets[preset],{preset,viewMode:mode,cameraFocus:'cloud',paused,showStormAnatomy:false});
  if(cold)config.tempC=-12;
  else Object.assign(config,{moisture:96,tempC:5,midLevelTempC:9,lowLevelHumidity:90,surfaceTempC:18,wind:10,windDirection:'east',updraft:68,cloudDepth:8,terrain:'plains'});
  mountStorm({wcMode:'precipHunt',precipHunt:config});
 },{mode,processName,paused});
 await page.waitForSelector(mode==='3d'?'#wcPrecip3dCanvas[data-rendered="true"]':'#wcPrecipCanvas');
 await page.waitForFunction(mode=>window.qaFrames.some(f=>f.mode===mode&&f.phases.length>0),mode);
}
async function guide(mode,processName){
 const locator=page.locator('.wc-cloud-growth-reading');
 await locator.waitFor({state:'visible'});
 const data=await locator.evaluate(n=>({process:n.dataset.growthProcess,steps:[...n.querySelectorAll('ol > li')].map(li=>li.textContent.trim()),text:n.textContent.trim()}));
 check(mode+' '+processName+': three visible growth steps',()=>{assert.equal(data.process,processName);assert.equal(data.steps.length,3);assert(data.steps.every(Boolean));});
 details[mode+'-'+processName+'-guide']=data;
}
async function nativeInput(selector,value){
 await page.locator(selector).evaluate((node,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);
}
async function pauseCheck(mode,processName){
 console.log('STEP '+mode+' '+processName+' pause');
 await mount(mode,processName);
 await guide(mode,processName);
 await page.waitForFunction(mode=>window.qaFrames.filter(f=>f.mode===mode&&!f.paused&&f.time>.4).length>=3,mode);
 await page.getByRole('button',{name:'Pause precipitation animation',exact:true}).press('Space');
 await page.getByRole('button',{name:'Resume precipitation animation',exact:true}).waitFor({state:'visible'});
 await page.waitForFunction(mode=>window.qaFrames.some(f=>f.mode===mode&&f.paused),mode);
 const observed=(await frames()).filter(f=>f.mode===mode),firstPausedIndex=observed.findIndex(f=>f.paused);
 const before=observed[firstPausedIndex-1],first=observed[firstPausedIndex];
 check(mode+' '+processName+': pause retains the last playing microphysics frame',()=>{assert(before&&!before.paused);assert(first.paused);assert.equal(first.time,before.time);assert.deepEqual(signature(first),signature(before));});
 const canvas=page.locator(mode==='2d'?'#wcPrecipCanvas':'#wcPrecip3dCanvas');
 const pixelBefore=mode==='2d'?await canvas.evaluate(n=>n.toDataURL()):null;
 await page.waitForTimeout(1350);
 const held=await latest();
 check(mode+' '+processName+': growth remains held for 1.35 seconds',()=>{assert(held.paused);assert.equal(held.time,first.time);assert.deepEqual(signature(held),signature(first));});
 if(mode==='2d'){
  const pixelAfter=await canvas.evaluate(n=>n.toDataURL());
  check(mode+' '+processName+': complete paused canvas stays unchanged',()=>assert.equal(pixelBefore,pixelAfter));
 }
 const resumeBoundary=held.seq;
 await page.getByRole('button',{name:'Resume precipitation animation',exact:true}).press('Space');
 await page.waitForFunction(({mode,seq,time})=>window.qaFrames.some(f=>f.mode===mode&&!f.paused&&f.seq>seq&&f.time>time+.15),{mode,seq:resumeBoundary,time:first.time});
 const resumed=await latest();
 check(mode+' '+processName+': resume advances the retained phase',()=>{assert(resumed.time>first.time);assert.notDeepEqual(resumed.phases,first.phases);});
 details[mode+'-'+processName+'-pause']={before,first,held,resumed};
}
async function reducedCheck(mode,processName){
 console.log('STEP '+mode+' '+processName+' reduced');
 await page.emulateMedia({reducedMotion:'reduce'});
 await mount(mode,processName,false);
 const before=await latest();
 await page.waitForTimeout(350);const after=await latest();
 check(mode+' '+processName+': reduced motion holds deterministic seed stages',()=>{assert(before.reduced);assert.deepEqual(signature(after),signature(before));before.phases.forEach(f=>{const expectedSeed=mode==='2d'?(processName==='coalescence'?((f.index*31)%43)/43:((f.index*7)%11)/11):(processName==='coalescence'?((f.index*23)%41)/41:((f.index*7)%17)/17);assert(Math.abs(f.cycle-expectedSeed)<1e-12,'seed '+JSON.stringify(f));});});
 details[mode+'-'+processName+'-reduced']={before,after};
 await page.emulateMedia({reducedMotion:'no-preference'});
}
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:1100,height:900},reducedMotion:'no-preference'});page.setDefaultTimeout(60000);
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});
 console.log('STEP loading local browser fixture');
 await page.goto('http://127.0.0.1:'+server.address().port+'/', {waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>typeof window.mountStorm==='function');
 for(const mode of ['2d','3d'])for(const processName of ['coalescence','deposition']){
  await pauseCheck(mode,processName);
  await reducedCheck(mode,processName);
 }
 for(const mode of ['2d','3d']){
  await mount(mode,'coalescence',true);
  await nativeInput('#wcPrecip-tempC',-12);await guide(mode,'deposition');
  await nativeInput('#wcPrecip-tempC',0);
  await page.waitForFunction(()=>document.querySelectorAll('.wc-cloud-growth-reading').length===0);
  check(mode+': zero degrees suppresses the growth guide',()=>{});
  await nativeInput('#wcPrecip-tempC',15);await guide(mode,'coalescence');
  check(mode+': paused temperature edits update the growth guide',()=>{});
 }
 console.log('STEP 2d lifecycle pause');
 await mount('2d','coalescence');
 await page.getByRole('button',{name:'Play storm',exact:true}).press('Space');
 await page.waitForFunction(()=>Number(document.getElementById('wcPrecipStormTime').value)>52);
 await page.getByRole('button',{name:'Pause precipitation animation',exact:true}).press('Space');
 await page.getByRole('button',{name:'Resume precipitation animation',exact:true}).waitFor();
 const stormTime=await page.locator('#wcPrecipStormTime').inputValue();
 await page.waitForTimeout(650);
 check('2d: pause holds automatic storm lifecycle',()=>{});
 assert.equal(await page.locator('#wcPrecipStormTime').inputValue(),stormTime);
 await page.getByRole('button',{name:'Resume precipitation animation',exact:true}).press('Space');
 await page.waitForFunction(t=>Number(document.getElementById('wcPrecipStormTime').value)>Number(t),stormTime);
 check('2d: resume continues automatic storm lifecycle',()=>{});
 console.log('STEP 3d wind transition pause');
 await mount('3d','coalescence');
 await nativeInput('#wcPrecip-wind',36);
 await page.waitForFunction(()=>{const w=Number(document.getElementById('wcPrecip3dCanvas').dataset.liveWind);return w>10.05&&w<35.9;});
 await page.getByRole('button',{name:'Pause precipitation animation',exact:true}).press('Space');
 await page.getByRole('button',{name:'Resume precipitation animation',exact:true}).waitFor();
 const windBefore=await page.locator('#wcPrecip3dCanvas').getAttribute('data-live-wind');
 await page.waitForTimeout(650);
 const windAfter=await page.locator('#wcPrecip3dCanvas').getAttribute('data-live-wind');
 check('3d: pause freezes an active wind transition',()=>assert.equal(windAfter,windBefore));
 await nativeInput('#wcPrecip-tempC',-12);await guide('3d','deposition');
 const editedWind=await page.locator('#wcPrecip3dCanvas').getAttribute('data-live-wind');
 check('3d: paused temperature edit keeps unrelated wind held',()=>assert.equal(editedWind,windBefore));
 await page.getByRole('button',{name:'Resume precipitation animation',exact:true}).press('Space');
 await page.waitForFunction(before=>Number(document.getElementById('wcPrecip3dCanvas').dataset.liveWind)>Number(before)+.1,windBefore);
 check('3d: resume continues the wind transition',()=>{});
 details.wind={before:windBefore,after:windAfter};
 assert.deepEqual(errors,[]);assert.equal(hash(fs.readFileSync(sourceFile)),expected);assert.equal(hash(fs.readFileSync(mirrorFile)),expected);
}
(async()=>{
 let passed=false,error;
 try{await run();passed=true;}catch(e){error={message:String(e),stack:e.stack};console.error(e);process.exitCode=1;}
 finally{
  if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed,sourceSha256:expected,harnessSha256:hash(fs.readFileSync(__filename)),checks,checkCount:checks.length,errors,error,details,renderingNote:'Only storm-cloud-volume is hidden during 3D interactions to keep software WebGL responsive. Particle geometry, rendering, controls and simulation are active. 2D observations wrap actual Canvas calls; 3D observations read per-render growth metadata and exclude camera-facing orientation. Source instrumentation exists only in the scratch HTTP response.',resources:{browserClosed:true,serverClosed:true}},null,2));
  console.log((passed?'PASS ':'FAIL ')+checks.length+' checks; '+path.join(out,'result.json'));
 }
})();
