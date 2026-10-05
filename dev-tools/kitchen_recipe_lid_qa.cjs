/* Isolated real-control QA for the modeled pot lid; no user browser storage is used. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('@playwright/test');
const R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),L=require('../stem_lab/kitchen_studio/recipe_lab_lid.js'),P=require('../stem_lab/kitchen_studio/recipe_lab_thermometer.js'),fixture=require('./kitchen_recipe_fixture.cjs');
const out=path.resolve(process.env.KITCHEN_QA_OUT||'reports/kitchen-lid-2026-10-02/browser');
const url=process.env.KITCHEN_RECIPE_URL||'http://127.0.0.1:53061/stem_lab/kitchen_studio/recipe_lab.html?v=20261002-lid';
const result={checks:[],errors:[],accessibility:[]};
fs.mkdirSync(out,{recursive:true});

function water(servings=2,hot=false){
 let s=R.act(R.start('mushroom',servings),'fill');
 if(hot){s=R.act(s,'potHeat',3);while(s.pot.temp<96)s=R.act(s,'advance',60);}
 return s;
}
function recordedCook(){
 let s=R.start('mushroom',2,'demonstrate');
 for(const [a,v] of fixture().steps){
  s=R.act(s,a,v);
  if(a==='fill'){s=R.act(s,'lidPlace','covered','keyboard-lid');s=R.act(s,'lidPlace','rest','keyboard-lid');}
 }
 assert.equal(s.plated,true);
 return R.submit({...s,answers:[0,0]});
}

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
 let page,cdp;
 try{
  const check=text=>{result.checks.push(text);console.log(text);};
  const canvas=()=>page.locator('#recipeScene > canvas');
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alloflow-kitchen-recipes-v1')).current);
  const phase=name=>page.waitForFunction(name=>document.querySelector('#recipeScene > canvas').dataset.lidPhase===name,name);
  const countChecks=()=>page.locator('#thermometerReadings > div').count();
  async function create(viewport,touch=false){
   if(page)await page.context().close();
   const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,reducedMotion:'reduce'});
   page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(120000);
   page.on('pageerror',e=>result.errors.push(e.message));
   await page.addInitScript(()=>{
    const seed=sessionStorage.getItem('lid-qa-seed');
    if(seed){localStorage.setItem('alloflow-kitchen-recipes-v1',seed);sessionStorage.removeItem('lid-qa-seed');}
   });
   await page.goto(url);await page.locator('#potLidTools').waitFor({state:'attached'});
   cdp=await context.newCDPSession(page);
  }
  async function load(s,text=false){
   await page.evaluate(data=>sessionStorage.setItem('lid-qa-seed',JSON.stringify(data)),{version:1,current:s,history:[],textView:text});
   await page.reload();await page.locator('#potLidTools').waitFor({state:'attached'});
  }
  async function open(id='potLidTools'){
   const panel=page.locator('#'+id);
   if(!await panel.evaluate(e=>e.open))await page.locator('#'+id+' > summary').click();
  }
  async function view(){
   await open();await page.locator('#lidTry').click();await page.locator('#recipeScene').scrollIntoViewIfNeeded();
   assert.equal(await canvas().getAttribute('data-camera-view'),'lid');
  }
  async function project(x,y,z){
   return page.evaluate(at=>{
    const el=document.querySelector('#recipeScene > canvas'),b=el.getBoundingClientRect();
    const c=new THREE.PerspectiveCamera(38,b.width/b.height,.1,100),f=Math.max(1,1.2/c.aspect);
    c.position.set(-2.05+.12*f,1.68+5*f,-.34+3.9*f);c.lookAt(-2.05,1.68,-.34);c.updateMatrixWorld();
    const p=new THREE.Vector3(...at).project(c);
    return {x:b.x+(p.x+1)*b.width/2,y:b.y+(1-p.y)*b.height/2,unit:b.height/420};
   },[x,y,z]);
  }
  const touch=(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p.x,y:p.y,id:1}]:[]});
  async function move(p,touchMode=false,steps=8){
   if(touchMode)await touch('touchMove',p);else await page.mouse.move(p.x,p.y,{steps});
  }
  async function end(touchMode=false){
   if(touchMode)await touch('touchEnd').catch(e=>{if(!e.message.includes('Must send a TouchStart'))throw e;});
   else await page.mouse.up();
  }
  async function start(touchMode=false){
   const s=await state(),grip=L.grip(s),a=await project(grip.x,grip.y,grip.z),box=await canvas().boundingBox();
   if(touchMode)await touch('touchStart',a);else{await page.mouse.move(a.x,a.y);await page.mouse.down();}
   await phase('lift');return {a,box,source:s};
  }
  async function dock(touchMode=false){
   const d=await start(touchMode),up={x:d.a.x,y:d.a.y-34*d.a.unit};
   await move(up,touchMode);await phase('carry');
   const target=d.source.pot.lid==='covered'?L.rest:L.pot,b=await project(target.x,L.height,target.z);
   if(touchMode){for(let i=1;i<=12;i++)await touch('touchMove',{x:up.x+(b.x-up.x)*i/12,y:up.y+(b.y-up.y)*i/12});}
   else await page.mouse.move(b.x,b.y,{steps:12});
   await phase('lower');
   const box=await canvas().boundingBox();
   for(const key of ['x','y','width','height'])assert.ok(Math.abs(box[key]-d.box[key])<1,'Canvas moved during lid handling: '+key);
   assert.deepEqual(await state(),d.source);
   return {...d,b,target};
  }
  async function cycle(touchMode=false,release=true){
   const d=await dock(touchMode),lower={x:d.b.x,y:d.b.y+40*d.b.unit};
   await move(lower,touchMode);await phase('done');assert.deepEqual(await state(),d.source);
   if(release){await end(touchMode);await phase('idle');}
   return {...d,lower};
  }
  function assertPlacement(before,after,value,interaction='scene-lid'){
   const expected=R.act(before,'lidPlace',value,interaction);
   assert.deepEqual(after,expected);
   assert.equal(after.log.length,before.log.length+1);
   assert.equal(after.log.at(-1).accepted,true);
   assert.equal(after.log.at(-1).interaction,interaction);
   assert.equal(after.time,before.time);assert.equal(after.pot.temp,before.pot.temp);assert.equal(after.pot.water,before.pot.water);
  }
  async function keyboardBegin(){
   await open();await page.locator('#lidKeyboard').click();
   assert.equal(await page.locator('#lidControl').evaluate(e=>e===document.activeElement),true);
  }
  async function keyboardCycle(value){
   const before=await state();await keyboardBegin();
   for(const key of ['ArrowUp',value==='covered'?'ArrowRight':'ArrowLeft','ArrowDown'])await page.keyboard.press(key);
   assert.equal(await page.locator('#lidPlace').isDisabled(),false);
   assert.deepEqual(await state(),before);
   await page.keyboard.press('Enter');assertPlacement(before,await state(),value,'keyboard-lid');
   return before;
  }
  async function audit(name){
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
   const a=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}}));
   result.accessibility.push({name,violations:a.violations});assert.deepEqual(a.violations,[]);
  }

  await create({width:1440,height:1100});await load(R.start());await open();let before=await state();
  assert.equal(await page.locator('#lidTry').isDisabled(),true);assert.equal(await page.locator('#lidKeyboard').isDisabled(),true);
  assert.deepEqual(await state(),before);
  await load(water());await view();before=await state();
  await page.locator('#recipeScene').screenshot({path:path.join(out,'desktop-lid-rest.png')});assert.deepEqual(await state(),before);
  check('A filled pot is required; opening the lid notebook and camera view creates no cooking evidence.');

  let d=await start();await end();await phase('idle');assert.deepEqual(await state(),before);
  await view();d=await start();await move({x:d.a.x,y:d.a.y-17*d.a.unit});await end();await phase('idle');assert.deepEqual(await state(),before);
  await view();d=await dock();await move({x:d.b.x,y:d.b.y+19*d.b.unit});await end();await phase('idle');assert.deepEqual(await state(),before);
  await view();d=await start();await move({x:d.a.x+45*d.a.unit,y:d.a.y-34*d.a.unit});await end();await phase('idle');assert.deepEqual(await state(),before);
  check('Taps, partial lifting, partial lowering and sideways lifting return the lid without changing placement, water, heat or time.');

  await view();d=await cycle(false,false);
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:d.lower.x+65*d.b.unit,y:d.lower.y,button:'left',buttons:0,clickCount:1});
  await phase('idle');await page.mouse.up();assert.deepEqual(await state(),before);
  await view();d=await dock();await page.locator('#recipeScene').screenshot({path:path.join(out,'desktop-lid-held.png')});
  await page.keyboard.press('Escape');await end();await phase('idle');assert.deepEqual(await state(),before);
  check('Actual release coordinates and Escape invalidate a held or previously completed preview without logging a placement.');

  await view();await page.locator('#sceneKitchenTool').selectOption('cut');
  d=await cycle();assert.equal(await page.locator('#sceneKitchenTool').inputValue(),'lid');
  assertPlacement(before,await state(),'covered');before=await state();
  assert.equal(await canvas().getAttribute('data-lid-placement'),'covered');
  await view();await cycle();assertPlacement(before,await state(),'rest');
  check('Desktop cover and uncover each record exactly one canonical lid action on release; automatic handle pickup preserves camera and layout.');

  await load(water(2,true));await view();before=await state();await cycle();assertPlacement(before,await state(),'covered');
  assert.equal(await canvas().getAttribute('data-lid-condensation'),'7');
  await page.locator('#recipeScene').screenshot({path:path.join(out,'desktop-covered-condensation.png')});
  await open();await audit('Desktop lid');
  check('A hot two-serving pot shows condensation while placement preserves its exact temperature, water volume and shared-clock time.');

  before=await state();await open('waterThermometer');
  assert.equal(await page.locator('#thermometerKeyboard').isDisabled(),true);assert.equal(await page.locator('#thermometerTry').isDisabled(),true);
  await view();await page.locator('#sceneKitchenTool').selectOption('cut');await page.locator('#recipeScene').scrollIntoViewIfNeeded();
  const probe=await project(P.site.x,P.site.y,P.site.z);await page.mouse.click(probe.x,probe.y);
  assert.match(await page.locator('#sceneActionStatus').textContent(),/lid.*rest/i);assert.equal(await countChecks(),0);assert.deepEqual(await state(),before);
  for(const tool of ['probe','sample','pot-stir','ladle','drain']){
   await page.locator('#sceneKitchenTool').selectOption(tool);
   assert.match(await page.locator('#workspaceToolInstruction').textContent(),/lid.*rest/i);
  }
  await view();await page.locator('#sceneKitchenTool').selectOption('pot-stir');await page.locator('#recipeScene').scrollIntoViewIfNeeded();
  const potFront=await project(-1.1,1.70,.12);await page.mouse.click(potFront.x,potFront.y);
  assert.match(await page.locator('#sceneActionStatus').textContent(),/lid.*rest/i);assert.deepEqual(await state(),before);
  check('Covered-pot tools explain lifting the lid first; direct probe and pot-spoon attempts create no preview work, temperature check or cooking action.');

  await load(water());await view();await page.locator('#potLidTools').evaluate(e=>{e.open=false;});
  await page.locator('#sceneKeyboardTools').click();
  assert.equal(await page.locator('#potLidTools').evaluate(e=>e.open),true);
  assert.equal(await page.locator('#lidControl').evaluate(e=>e===document.activeElement),true);before=await state();
  for(const key of ['ArrowRight','ArrowDown','Enter'])await page.keyboard.press(key);
  await page.locator('#lidControl').dispatchEvent('keydown',{key:'ArrowUp',repeat:true});
  assert.equal(await page.locator('#lidPlace').isDisabled(),true);assert.deepEqual(await state(),before);
  await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  assert.deepEqual(await state(),before);
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  assertPlacement(before,await state(),'covered','keyboard-lid');before=await state();await page.keyboard.press('Enter');assert.deepEqual(await state(),before);
  await keyboardCycle('rest');
  check('The closed notebook keyboard route requires lift, correct destination, lower and Enter; wrong phases, repeated keys and duplicate placement do nothing.');

  await load(water());await open('potLab');await page.locator('[data-pot-study="lid"]').click();before=await state();
  await page.locator('#potLabChoices input[value="0"]').check();assert.deepEqual(await state(),before);
  await page.locator('#potLabTry').click();assert.equal(await canvas().getAttribute('data-camera-view'),'lid');
  await page.locator('#recipeScene').scrollIntoViewIfNeeded();await cycle();assertPlacement(before,await state(),'covered');
  assert.match(await page.locator('#potLabOutcome').textContent(),/prediction matches/i);
  assert.match(await page.locator('#potLabObservation').textContent(),/no clock time passed/i);
  await page.locator('#scenepotHeat').selectOption('3');before=await state();await page.locator('#advance').click();
  assert.deepEqual(await state(),R.act(before,'advance',30));assert.equal((await state()).time,before.time+30);
  assert.ok((await state()).pot.temp>before.pot.temp);
  assert.match(await page.locator('#potLabObservation').textContent(),/30 seconds passed for both vessels/);
  check('A lid prediction matches the actual placement at unchanged temperature; a real thirty-second shared-clock step then changes the recorded water reading.');

  before=await state();await page.reload();await page.locator('#potLidTools').waitFor({state:'attached'});assert.deepEqual(await state(),before);
  assert.equal(await canvas().getAttribute('data-lid-placement'),'covered');assert.equal(await page.locator('#lidSummary').textContent(),'On the pot');
  const recorded=recordedCook(),coveredIndex=recorded.log.findIndex(e=>e.action==='lidPlace'&&e.value==='covered')+1,restIndex=coveredIndex+1;
  await load(recorded);before=await state();await open();assert.equal(await page.locator('#lidKeyboard').isDisabled(),true);assert.equal(await page.locator('#lidTry').isDisabled(),true);
  await page.locator('#openRecipeReplay').click();await open();
  for(const [index,placement] of [[coveredIndex,'covered'],[restIndex,'rest']]){
   await page.locator('#recipeReplayStep').evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));},index);
   assert.equal(await canvas().getAttribute('data-lid-placement'),placement);
   assert.equal(await page.locator('#lidKeyboard').isDisabled(),true);assert.deepEqual(await state(),before);
  }
  check('Reload preserves canonical lid placement; finished and replay cooks show their historical lid positions while all new placements remain locked.');

  await create({width:390,height:900},true);await load(water(4,true));before=await state();await view();d=await dock(true);
  await page.locator('#recipeScene').screenshot({path:path.join(out,'phone-lid-held.png')});
  await move({x:d.b.x,y:d.b.y+40*d.b.unit},true);await phase('done');assert.deepEqual(await state(),before);
  await end(true);await phase('idle');assertPlacement(before,await state(),'covered');assert.equal(await canvas().getAttribute('data-lid-condensation'),'7');
  await page.locator('#recipeScene').screenshot({path:path.join(out,'phone-covered-condensation.png')});
  await open();await audit('Phone lid');before=await state();await view();await cycle(true);assertPlacement(before,await state(),'rest');
  check('Real phone touch gestures cover and uncover the hot four-serving pot with steady framing, visible held objects and condensation.');

  await load(water(4,false));before=await state();await view();await cycle(true);assertPlacement(before,await state(),'covered');
  assert.equal(await canvas().getAttribute('data-lid-condensation'),'0');before=await state();await view();await cycle(true);assertPlacement(before,await state(),'rest');
  check('The cold four-serving touch path keeps the same placement rules and exact quantities without displaying hot-water condensation.');

  for(const stop of ['touchCancel','blur','external','resize','secondPointer']){
   await load(water());before=await state();await view();d=await dock(true);
   if(stop==='touchCancel')await touch('touchCancel');
   if(stop==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   if(stop==='external')await page.locator('#potHeat').evaluate(e=>{e.value='1';e.dispatchEvent(new Event('change',{bubbles:true}));});
   if(stop==='resize')await page.setViewportSize({width:390,height:860});
   if(stop==='secondPointer')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:d.b.x,y:d.b.y,id:1},{x:d.b.x+25,y:d.b.y+25,id:2}]});
   await phase('idle');if(stop!=='touchCancel')await end(true);
   assert.deepEqual(await state(),stop==='external'?R.act(before,'potHeat',1):before);
  }
  check('Touch cancellation, blur, external burner changes, resize and a second pointer return a held lid without recording stray placement actions.');

  await page.setViewportSize({width:320,height:860});await load(water(4),true);await keyboardCycle('covered');await keyboardCycle('rest');
  await page.emulateMedia({forcedColors:'active'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#potLidTools').screenshot({path:path.join(out,'compact-text-keyboard-lid.png')});await audit('320px forced-colors text lid');
  check('At 320px in text view, the complete arrow-key lid interaction fits the screen and remains usable with forced colors.');

  await page.emulateMedia({forcedColors:'none'});await load(water());await view();before=await state();await dock(true);
  await page.evaluate(()=>{const c=document.querySelector('#recipeScene > canvas'),gl=c.getContext('webgl2')||c.getContext('webgl');gl.getExtension('WEBGL_lose_context').loseContext();});
  await page.locator('#recipeFallback').waitFor();await end(true);assert.deepEqual(await state(),before);
  assert.equal(await canvas().getAttribute('data-lid-held'),'');await keyboardCycle('covered');
  check('Graphics loss cancels the physical lid preview and leaves the equivalent keyboard placement fully available.');

  assert.equal(result.checks.length,14);assert.deepEqual(result.errors,[]);result.pass=true;
 }catch(e){
  result.failure=e.stack;if(page)await page.screenshot({path:path.join(out,'lid-failure.png'),fullPage:true}).catch(()=>{});throw e;
 }finally{
  fs.writeFileSync(path.join(out,'lid-results.json'),JSON.stringify(result,null,2));await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
