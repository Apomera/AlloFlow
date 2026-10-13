/* Trusted input evidence for measuring, levelling and carrying recipe oil. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo=path.resolve(process.env.KITCHEN_REPO||path.join(__dirname,'..'));
const {chromium}=require(path.join(repo,'node_modules/@playwright/test'));
const R=require(path.join(repo,'stem_lab/kitchen_studio/recipe_lab_engine.js'));
const cook=require(path.join(repo,'dev-tools/kitchen_recipe_fixture.cjs'));
const out=path.resolve(process.env.KITCHEN_QA_OUT||'reports/kitchen-oil-studio-2026-10-10/browser');
const url=process.env.KITCHEN_RECIPE_URL||'http://127.0.0.1:53061/stem_lab/kitchen_studio/recipe_lab.html?v=20261010-oil-studio';
const storageKey='alloflow-kitchen-recipes-v1',seedKey='oil-studio-qa-seed',groups=['desktop','mobile','lifecycle'];
const selected=(process.env.KITCHEN_QA_ONLY||'').trim()?process.env.KITCHEN_QA_ONLY.split(','):groups;
for(const id of selected)assert.ok(groups.includes(id),'Unknown group '+id);
const result={selectedGroups:selected,checks:[],accessibility:[],screenshots:[],errors:[],consoleErrors:[]};
fs.mkdirSync(out,{recursive:true});
function checkpoint(){fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(result,null,2));}
function initial(servings=2){return R.start('mushroom',servings,'demonstrate');}
function finished(){return R.submit({...cook().state,answers:[0,0]});}
function data(s,textView=false){return{version:1,current:s,history:[],textView,checkTimers:{pot:null,pan:null},timeStep:30};}
async function binding(){
 const src=path.join(repo,'stem_lab/kitchen_studio'),mirror=path.join(repo,'desktop/web-app/public/stem_lab/kitchen_studio'),base=new URL('.',url);
 return Promise.all(fs.readdirSync(src).filter(n=>/\.(?:html|css|js)$/.test(n)).sort().map(async name=>{
  const source=fs.readFileSync(path.join(src,name)),sha256=crypto.createHash('sha256').update(source).digest('hex');
  const mirrorSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(mirror,name))).digest('hex');
  assert.equal(sha256,mirrorSha256,name+' mirror');const response=await fetch(new URL(name,base));assert.ok(response.ok,name+' served');
  const servedSha256=crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
  assert.equal(servedSha256,sha256,name+' served bytes');assert.match(response.headers.get('cache-control')||'',/no-store/,name+' preview freshness');
  return{name,sha256,mirrorSha256,servedSha256};
 }));
}
const observeCamera=';(function(){if(!window.THREE)return;var Original=THREE.WebGLRenderer;function Observed(options){var r=new Original(options),render=r.render;r.render=function(scene,camera){window.__oilQACamera=camera;return render.apply(r,arguments);};return r;}Observed.prototype=Original.prototype;Object.setPrototypeOf(Observed,Original);THREE.WebGLRenderer=Observed;})();\n';
(async()=>{
 result.runtimeBefore=await binding();
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
 let page,cdp,contextKey,lastTouch,activeGroup;const jobs=[];
 try{
  const svg=()=>page.locator('#oilMeasureSvg'),studio=()=>page.locator('#oilMeasurePanel'),canvas=()=>page.locator('#recipeScene > canvas');
  const saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),storageKey);
  const amount=async()=>Number(await page.locator('#oilMeasureAmount').inputValue());
  const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  async function mounted(){await svg().waitFor({state:'attached',timeout:60000});await page.waitForFunction(()=>window.KitchenOilStudio&&document.querySelector('#sceneKitchenTool'),null,{timeout:60000});await frames();}
  async function create(width=1440,height=1100,touchMode=false){
   if(cdp){await cdp.detach().catch(()=>{});cdp=null;}if(page)await page.context().close();
   const context=await browser.newContext({viewport:{width,height},hasTouch:touchMode,isMobile:touchMode,reducedMotion:'reduce'});
   page=await context.newPage();contextKey=[width,height,touchMode].join();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(60000);
   page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text());});
   await page.route('**/recipe_lab.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:observeCamera+await response.text()});});
   await page.addInitScript(({storageKey,seedKey,first})=>{const queued=sessionStorage.getItem(seedKey);if(queued){localStorage.setItem(storageKey,queued);sessionStorage.removeItem(seedKey);}else if(!localStorage.getItem(storageKey))localStorage.setItem(storageKey,JSON.stringify(first));},{storageKey,seedKey,first:data(initial())});
   await page.goto(url,{waitUntil:'domcontentloaded'});await mounted();if(touchMode)cdp=await context.newCDPSession(page);
  }
  async function desktop(){if(contextKey!=='1440,1100,false')await create();}
  async function load(s=initial(),textView=false){await page.evaluate(({seedKey,next})=>sessionStorage.setItem(seedKey,JSON.stringify(next)),{seedKey,next:data(s,textView)});await page.reload({waitUntil:'domcontentloaded'});lastTouch=null;await mounted();}
  async function open(){if(await page.locator('#expandedKitchen').evaluate(e=>e.open))await page.locator('#expandKitchen').click();await page.locator('[data-bench="pan"]').click();await page.locator('#showMeasureOil').click();await svg().scrollIntoViewIfNeeded();await frames();}
  async function details(id){const el=page.locator('#'+id);if(!await el.evaluate(e=>e.open))await el.locator(':scope > summary').click();}
  async function nativeView(){if(!await page.locator('#expandedKitchen').evaluate(e=>e.open))await page.locator('#expandKitchen').click();await details('sceneToolDrawer');await page.locator('#sceneKitchenTool').selectOption('oil');await page.locator('#sceneReturnToKitchen').click();await canvas().scrollIntoViewIfNeeded();await frames();}
  async function phase(value){await page.waitForFunction(value=>document.querySelector('#oilMeasurePanel').dataset.oilPhase===value,value);}
  async function unchanged(before){await frames();assert.deepEqual(await saved(),before);}
  async function stableDraft(n,before){await page.waitForTimeout(350);assert.equal(await amount(),n,'Level or canceled bottle stops filling');await unchanged(before);}
  async function point(x,y){return svg().evaluate((s,p)=>{const q=new DOMPoint(p.x,p.y).matrixTransform(s.getScreenCTM());return{x:q.x,y:q.y};},{x,y});}
  async function nativePoint(x,y,z){return page.evaluate(({x,y,z})=>{const b=document.querySelector('#recipeScene > canvas').getBoundingClientRect(),camera=window.__oilQACamera;if(!camera)throw Error('Camera missing');camera.updateMatrixWorld();const q=new THREE.Vector3(x,y,z).project(camera);return{x:b.x+(q.x+1)*b.width/2,y:b.y+(1-q.y)*b.height/2,unit:b.height/420};},{x,y,z});}
  const touch=(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p.x,y:p.y,id:1}]:[]});
  async function down(p,t=false){if(t){lastTouch=p;await touch('touchStart',p);}else{await page.mouse.move(p.x,p.y);await page.mouse.down();}}
  async function move(p,t=false,steps=8){if(t){const a=lastTouch||p;for(let i=1;i<=steps;i++)await touch('touchMove',{x:a.x+(p.x-a.x)*i/steps,y:a.y+(p.y-a.y)*i/steps});lastTouch=p;}else await page.mouse.move(p.x,p.y,{steps});}
  async function up(t=false,cancel=false){if(t){await touch(cancel?'touchCancel':'touchEnd');lastTouch=null;}else{if(cancel)await page.keyboard.press('Escape');await page.mouse.up();}}
  async function setAmount(n){const slider=page.locator('#oilMeasureAmount'),details=slider.locator('xpath=ancestor::details');for(let i=0;i<await details.count();i++){const d=details.nth(i);if(!await d.evaluate(e=>e.open))await d.locator(':scope > summary').click();}await slider.focus();await page.keyboard.press('Home');for(let i=0;i<n;i++)await page.keyboard.press('ArrowRight');assert.equal(await amount(),n);}
  async function canonicalOil(before,method){const after=await saved(),entries=after.current.log.slice(before.current.log.length);assert.equal(entries.length,1,'Exactly one oil action on deliberate transfer');assert.equal(entries[0].action,'oil');assert.equal(entries[0].accepted,true);assert.ok(method,'Expected interaction provenance is required');assert.equal(entries[0].interaction,method);const expected=await page.evaluate(({state,method})=>KitchenRecipes.act(state,'oil',undefined,method),{state:before.current,method:entries[0].interaction});assert.deepEqual(after.current,expected);for(const key of ['history','checkTimers','timeStep','textView'])assert.deepEqual(after[key],before[key]);assert.equal(after.current.time,before.current.time);assert.deepEqual(await page.evaluate(s=>KitchenRecipes.restore(s),after.current),after.current);assert.equal(await amount(),0);return{servings:after.current.servings,milliliters:R.ingredients(after.current).oil,interaction:entries[0].interaction,entries:1,time:after.current.time};}
  async function shot(name,selector,held=false){const file=path.join(out,name);if(held){await frames();const b=await page.locator(selector).boundingBox(),v=page.viewportSize();assert.ok(b&&b.x>=0&&b.y>=0&&b.x+b.width<=v.width&&b.y+b.height<=v.height,'Held screenshot cannot scroll the gesture');await page.screenshot({path:file,clip:b});}else await page.locator(selector).screenshot({path:file});result.screenshots.push({group:activeGroup,file});checkpoint();}
  async function audit(label){await page.addScriptTag({path:require.resolve('axe-core/axe.min.js',{paths:[repo]})});const violations=await page.evaluate(async()=>(await axe.run(document.querySelector('#oilMeasurePanel'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})).violations);result.accessibility.push({group:activeGroup,label,violations});checkpoint();assert.deepEqual(violations,[],label);}
  async function fit(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page overflow');assert.ok(await studio().evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Oil studio overflow');}
  function group(id,name,body){if(selected.includes(id))jobs.push({id,name,body});}
  async function beginBottle(t=false){await svg().scrollIntoViewIfNeeded();await frames();const source=await point(75,112),target=await point(213,132),tilted=await point(213,202);await down(source,t);await phase('carry');return{source,target,tilted};}
  async function dock(g,t=false){await move(g.target,t,16);await phase('level');}
  async function flow(g,t=false){await move(g.tilted,t);await phase('pour');}
  async function level(g,t=false){await move(g.target,t);await phase('level');}
  async function untilAmount(n){await page.waitForFunction(n=>Number(document.querySelector('#oilMeasureAmount').value)>=n,n);}
  async function cupTo(destination,t=false,exact=false){await svg().scrollIntoViewIfNeeded();await frames();await down(await point(213,132),t);await phase('cup-carry');await move(await point(destination==='pan'?348:75,destination==='pan'?145:112),t,18);if(exact)await phase('cup-pan');if(destination==='bottle')await phase('cup-return');}
  async function keysBottle(){await svg().focus();await page.keyboard.press('Enter');await phase('carry');await page.keyboard.press('ArrowRight');await phase('level');}
  async function holdKey(){await page.keyboard.down('ArrowDown');await phase('pour');}
  async function releaseKey(){await page.keyboard.up('ArrowDown');await phase('level');}
  group('desktop','Real bottle carries and held tilts measure temporary oil; cup releases add only the exact recipe amount, and keyboard carries scale from 15 to 30 mL.',async()=>{
   await desktop();await open();const evidence=[];let before=await saved(),g=await beginBottle();await stableDraft(0,before);await dock(g);await stableDraft(0,before);await up();await phase('idle');await unchanged(before);
   g=await beginBottle();await dock(g);await flow(g);await untilAmount(2);await shot('desktop-oil-flow.png','#oilMeasureSvg',true);await level(g);let measured=await amount();assert.ok(measured>0&&measured<=60);await stableDraft(measured,before);await up();await phase('idle');await stableDraft(measured,before);evidence.push({mouseMeasurement:measured,panUnchanged:true});
   // Keyboard holds exercise the same flow; stopping a key preserves only whole milliliters.
   await setAmount(3);await keysBottle();await holdKey();await untilAmount(5);await releaseKey();measured=await amount();await stableDraft(measured,before);await page.keyboard.press('Enter');await phase('idle');evidence.push({keyboardMeasurement:measured,releaseStops:true});
   await page.locator('#oilStudioPickBottle').click();await page.locator('#oilStudioCarryBottle').click();await phase('level');const tilt=await page.locator('#oilStudioTilt').boundingBox();await down({x:tilt.x+tilt.width/2,y:tilt.y+tilt.height/2});await phase('pour');await untilAmount(measured+1);await up();await phase('level');measured=await amount();await stableDraft(measured,before);await page.locator('#oilStudioPutDown').click();await phase('idle');evidence.push({stagedHoldMeasurement:measured});
   await setAmount(15);await fit();await audit('Desktop oil measuring studio');await shot('desktop-oil-studio.png','#oilMeasurePanel');await cupTo('pan',false,true);await unchanged(before);await up();await phase('idle');evidence.push(await canonicalOil(before,'drag'));
   before=await saved();await page.reload({waitUntil:'domcontentloaded'});await mounted();await unchanged(before);assert.equal(await amount(),0);await open();assert.equal(await svg().getAttribute('aria-disabled'),'true');evidence.push({reload:'Accepted oil restored; cup stays empty and tools are locked'});
   await load(initial(4));await open();before=await saved();await setAmount(30);await svg().focus();await page.keyboard.press('Enter');await phase('cup-carry');await page.keyboard.press('ArrowRight');await phase('cup-pan');await unchanged(before);await page.keyboard.press('Enter');await phase('idle');evidence.push(await canonicalOil(before,'keyboard'));
   await load();await open();before=await saved();for(const n of [14,16]){await setAmount(n);await cupTo('pan');await unchanged(before);await up();await phase('idle');await stableDraft(n,before);evidence.push({refusedMeasure:n});}await cupTo('bottle');await unchanged(before);await up();await phase('idle');await stableDraft(0,before);evidence.push({returnToBottle:'Overfilled practice measure returned with no oil action'});return evidence;
  });
  group('mobile','Trusted touch carries, measures, levels and transfers oil at 390 and 320 pixels; cancellation and forced colors preserve access.',async()=>{
   const evidence=[];for(const width of [390,320]){
    await create(width,width===390?900:860,true);if(width===320)await load(initial(4),true);await open();const before=await saved();let g=await beginBottle(true);await dock(g,true);await stableDraft(0,before);await flow(g,true);await untilAmount(2);await level(g,true);let measured=await amount();await stableDraft(measured,before);await up(true);await phase('idle');await stableDraft(measured,before);
    g=await beginBottle(true);await dock(g,true);await flow(g,true);await untilAmount(measured+1);await up(true,true);await phase('idle');measured=await amount();await stableDraft(measured,before);evidence.push({width,measured,cancelledDraftKept:true});
    if(width===390){g=await beginBottle(true);await dock(g,true);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:g.target.x,y:g.target.y,id:1},{x:g.target.x+24,y:g.target.y+20,id:2}]});await phase('idle');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});lastTouch=null;await stableDraft(measured,before);evidence.push({width,secondPointer:'Cancels without a transfer'});}
    const target=R.ingredients(before.current).oil;await setAmount(target);await fit();if(width===320)await page.emulateMedia({forcedColors:'active'});await audit(width+' px '+(width===320?'forced colors ':'')+'oil studio');await shot(width+'px-oil-studio.png','#oilMeasurePanel');if(width===320)await page.emulateMedia({forcedColors:'none'});
    await cupTo('pan',true,true);await unchanged(before);await up(true);await phase('idle');evidence.push({width,...await canonicalOil(before,'drag')});
   }return evidence;
  });
  group('lifecycle','Interrupted bottle and cup handling never commit oil; drafts are temporary, native handoffs are exclusive, and recorded or serving kitchens are read-only.',async()=>{
   await desktop();await open();const evidence=[];let before=await saved();console.log('Lifecycle: interruption checks');await setAmount(7);await keysBottle();await holdKey();await untilAmount(8);await page.keyboard.press('Escape');await page.keyboard.up('ArrowDown');await phase('idle');let measured=await amount();await stableDraft(measured,before);evidence.push({escapeKeepsDraft:measured});
   let g=await beginBottle();await dock(g);await flow(g);await untilAmount(measured+1);await page.setViewportSize({width:1400,height:1050});await phase('idle');await up();measured=await amount();await stableDraft(measured,before);await page.setViewportSize({width:1440,height:1100});evidence.push({resizeKeepsDraft:measured});
   await keysBottle();await page.locator('#showMixPan').focus();await page.keyboard.press('Enter');await phase('idle');await unchanged(before);await open();assert.equal(await amount(),measured);evidence.push({toolSwitch:'Cancels the carried bottle and keeps its temporary measure'});
   g=await beginBottle();await dock(g);await flow(g);await untilAmount(measured+1);await page.locator('#advance').focus();await page.keyboard.press('Enter');await phase('idle');await up();const advanced=await saved();assert.deepEqual(advanced.current,await page.evaluate(s=>KitchenRecipes.act(s,'advance',30),before.current));measured=await amount();await stableDraft(measured,advanced);evidence.push({externalAction:'Only the canonical clock advance was recorded; filling stopped'});before=advanced;
   await setAmount(7);await page.reload({waitUntil:'domcontentloaded'});await mounted();await unchanged(before);await open();assert.equal(await amount(),0);await phase('idle');evidence.push({reload:'Untransferred draft discarded; the cook is unchanged'});
   console.log('Lifecycle: native handoffs');await setAmount(7);await nativeView();await phase('idle');await page.locator('#sceneOilKeyboard').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#expandedKitchen').evaluate(e=>e.open),false);assert.equal(await svg().evaluate(e=>e===document.activeElement),true);await unchanged(before);
   await keysBottle();await canvas().scrollIntoViewIfNeeded();await frames();const source=await nativePoint(-2.35,1.39,-1.35);await down(source);await phase('idle');await page.waitForFunction(()=>document.querySelector('#recipeScene > canvas').dataset.gesturePhase==='carry');await unchanged(before);await page.locator('#sceneOilKeyboard').focus();await page.keyboard.press('Enter');await up();await phase('idle');assert.equal(await svg().evaluate(e=>e===document.activeElement),true);await stableDraft(7,before);evidence.push({nativeHandoff:'Native bottle pickup cancels the studio carry; keyboard handoff cancels native handling and focuses the studio'});
   await setAmount(15);await cupTo('pan',false,true);await page.keyboard.press('Escape');await up();await phase('idle');await stableDraft(15,before);evidence.push({cancelledCup:'Exact measure returned to bench with no action'});
   console.log('Lifecycle: recorded and serving locks');const serving=R.act(R.act(R.startRescue('dry',0,'demonstrate'),'taste'),'servePortion',0);assert.ok(R.serving(serving).started);await load(serving,true);await open();before=await saved();assert.equal(await page.locator('#oilStudioPickBottle').isDisabled(),true);assert.equal(await page.locator('#oilMeasureAdd').isDisabled(),true);await svg().focus();await page.keyboard.press('Enter');await unchanged(before);evidence.push({serving:'Measuring and transferring disabled'});
   const final=finished();assert.ok(final.submitted&&final.plated);await load(final,true);await open();before=await saved();assert.equal(await svg().getAttribute('aria-disabled'),'true');await page.locator('#openRecipeReplay').click();const oilIndex=final.log.findIndex(e=>e.action==='oil');assert.ok(oilIndex>=0);await page.locator('#recipeReplayStep').focus();await page.keyboard.press('Home');for(let i=0;i<oilIndex;i++)await page.keyboard.press('ArrowRight');await open();assert.equal(await svg().getAttribute('aria-disabled'),'true');for(const id of ['oilStudioPickBottle','oilStudioCarryBottle','oilStudioTilt','oilStudioLevel','oilStudioPutDown','oilStudioPickCup','oilStudioCarryCup','oilStudioReturnCup','oilMeasureAmount','oilMeasureAdd','oilMeasureEmpty'])assert.equal(await page.locator('#'+id).isDisabled(),true,id);await svg().focus();for(const key of ['Enter','ArrowRight','ArrowDown','ArrowUp','Escape'])await page.keyboard.press(key);await unchanged(before);assert.equal(await amount(),0);await shot('desktop-replay-oil.png','#oilMeasurePanel');await page.locator('#closeRecipeReplay').click();await page.reload({waitUntil:'domcontentloaded'});await mounted();await unchanged(before);evidence.push({replay:'Recorded pre-oil kitchen visible with all actions locked; submitted cook survives reload'});return evidence;
  });
  for(const job of jobs){activeGroup=job.id;result.activeGroup=job.id;checkpoint();console.log('Starting '+job.id);const start=Date.now(),evidence=await job.body();result.checks.push({id:job.id,name:job.name,elapsedMs:Date.now()-start,evidence});checkpoint();console.log('Passed '+job.id);}
  assert.equal(result.checks.length,selected.length);assert.deepEqual(result.errors,[]);assert.deepEqual(result.consoleErrors,[]);result.runtimeAfter=await binding();assert.deepEqual(result.runtimeAfter,result.runtimeBefore);result.pass=true;
 }catch(e){result.failedGroup=activeGroup;result.failure=e.stack;if(page){result.diagnostics=await page.evaluate(()=>({panel:document.querySelector('#oilMeasurePanel')?.outerHTML,canvas:document.querySelector('#recipeScene > canvas')?.dataset,focus:document.activeElement?.id,status:document.querySelector('#sceneActionStatus')?.textContent})).catch(()=>null);await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}throw e;
 }finally{checkpoint();if(cdp)await cdp.detach().catch(()=>{});await browser.close();}
 console.log(JSON.stringify({pass:result.pass,checks:result.checks,accessibilityScans:result.accessibility.length,errors:result.errors,consoleErrors:result.consoleErrors,report:path.join(out,'browser-results.json')},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
