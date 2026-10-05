/* Real-control produce-rinsing checks run in isolated browser contexts. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('@playwright/test');
const R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),fixture=require('./kitchen_recipe_fixture.cjs');
const out=path.resolve(process.env.KITCHEN_QA_OUT||'reports/kitchen-rinsing-2026-10-02/browser');
const url=process.env.KITCHEN_RECIPE_URL||'http://127.0.0.1:53061/stem_lab/kitchen_studio/recipe_lab.html?v=20261002-rinsing';
const tail=process.env.KITCHEN_RINSE_QA_TAIL==='1',result={scope:tail?'route-and-phone-tail':'full',checks:[],errors:[],accessibility:[]};
const grip={x:1.35,y:1.44,z:-1.10},sink={x:4.20,z:-.05},board={x:1.35,z:-1.43};
fs.mkdirSync(out,{recursive:true});
const prepared=(id='mushroom',servings=2)=>R.act(R.start(id,servings),'wash');
function recordedCook(){
 let s=R.start('mushroom',2,'demonstrate');
 for(const [action,value] of fixture().steps)s=R.act(s,action,value,action==='rinse'?'scene-rinse':undefined);
 assert.equal(s.plated,true);return R.submit({...s,answers:[0,0]});
}

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});let page,cdp;
 try{
  const check=text=>{result.checks.push(text);console.log(text);};
  const canvas=()=>page.locator('#recipeScene > canvas');
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alloflow-kitchen-recipes-v1')).current);
  const phase=name=>page.waitForFunction(name=>document.querySelector('#recipeScene > canvas').dataset.rinsePhase===name,name);
  const currentPhase=()=>canvas().getAttribute('data-rinse-phase');
  async function create(viewport,touch=false){
   if(page)await page.context().close();
   const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,reducedMotion:'reduce'});
   page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(120000);
   page.on('pageerror',e=>result.errors.push(e.message));
   await page.addInitScript(()=>{const seed=sessionStorage.getItem('rinsing-qa-seed');if(seed){localStorage.setItem('alloflow-kitchen-recipes-v1',seed);sessionStorage.removeItem('rinsing-qa-seed');}});
   await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('#produceRinsing').waitFor({state:'attached'});cdp=await context.newCDPSession(page);
  }
  async function load(s,text=false){
   await page.evaluate(data=>sessionStorage.setItem('rinsing-qa-seed',JSON.stringify(data)),{version:1,current:s,history:[],textView:text});
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('#produceRinsing').waitFor({state:'attached'});
  }
  async function open(id='produceRinsing'){
   if(!await page.locator('#'+id).evaluate(e=>e.open))await page.locator('#'+id+' > summary').click();
  }
  async function view(){
   await open();await page.locator('#rinseTry').click();await page.locator('#recipeScene').scrollIntoViewIfNeeded();
   assert.equal(await canvas().getAttribute('data-camera-view'),'rinse');
  }
  async function project(x,y,z){
   return page.evaluate(at=>{
    const el=document.querySelector('#recipeScene > canvas'),b=el.getBoundingClientRect(),c=new THREE.PerspectiveCamera(38,b.width/b.height,.1,100);
    const target=new THREE.Vector3(2.72,1.55,-.28),f=Math.max(1,1.35/c.aspect),offset=new THREE.Vector3(.25*f,4.8*f,4.4*f);
    if(offset.length()>13)offset.setLength(13);c.position.copy(target).add(offset);c.lookAt(target);c.updateMatrixWorld();
    const p=new THREE.Vector3(...at).project(c);return {x:b.x+(p.x+1)*b.width/2,y:b.y+(1-p.y)*b.height/2,unit:b.height/420};
   },[x,y,z]);
  }
  const touch=(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p.x,y:p.y,id:1}]:[]});
  async function move(p,touchMode=false,steps=8){if(touchMode)await touch('touchMove',p);else await page.mouse.move(p.x,p.y,{steps});}
  async function travel(a,b,touchMode=false,steps=12){
   if(touchMode){for(let i=1;i<=steps;i++)await touch('touchMove',{x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps});}
   else await page.mouse.move(b.x,b.y,{steps});
  }
  async function end(touchMode=false){
   if(touchMode)await touch('touchEnd').catch(e=>{if(!e.message.includes('Must send a TouchStart'))throw e;});else await page.mouse.up();
  }
  async function start(touchMode=false){
   const before=await state(),a=await project(grip.x,grip.y,grip.z),box=await canvas().boundingBox();
   if(touchMode)await touch('touchStart',a);else{await page.mouse.move(a.x,a.y);await page.mouse.down();}
   await phase('carry');return {before,a,box};
  }
  async function dock(touchMode=false){
   const d=await start(touchMode),b=await project(sink.x,2.05,sink.z);await travel(d.a,b,touchMode);await phase('lower');
   const after=await canvas().boundingBox();for(const key of ['x','y','width','height'])assert.ok(Math.abs(after[key]-d.box[key])<1,'Canvas moved during basket pickup: '+key);
   assert.deepEqual(await state(),d.before);return {...d,b};
  }
  async function lower(touchMode=false){
   const d=await dock(touchMode),lowered={x:d.b.x,y:d.b.y+34*d.b.unit};await move(lowered,touchMode);await phase('rinse');
   assert.deepEqual(await state(),d.before);return {...d,lowered};
  }
  async function circle(d,touchMode=false,direction=1,samples=64){
   let last=d.lowered;
   for(let i=0;i<=samples;i++){
    const angle=direction*2*Math.PI*i/64,p=await project(sink.x+Math.cos(angle)*.22,1.62,sink.z+Math.sin(angle)*.22);
    await move(p,touchMode,1);last=p;
    /* The plane changes after the required sectors and arc are complete. Stop at that transition. */
    if(await currentPhase()==='lift')break;
   }
   return {...d,last};
  }
  async function rinsedPreview(touchMode=false,direction=1){
   const d=await circle(await lower(touchMode),touchMode,direction);await phase('lift');
   assert.equal(await canvas().getAttribute('data-rinse-coverage'),'8');assert.deepEqual(await state(),d.before);return d;
  }
  async function complete(touchMode=false,direction=1,release=true){
   const d=await rinsedPreview(touchMode,direction),up={x:d.last.x,y:d.last.y-34*d.last.unit};
   await move(up,touchMode);await phase('return');
   const returned=await project(board.x,2.05,board.z);await travel(up,returned,touchMode);await phase('tip');
   const tipped={x:returned.x,y:returned.y+34*returned.unit};await move(tipped,touchMode);await phase('done');
   assert.deepEqual(await state(),d.before);
   if(release){await end(touchMode);await phase('idle');}
   return {...d,returned,tipped};
  }
  function assertRinse(before,after,interaction='scene-rinse'){
   assert.deepEqual(after,R.act(before,'rinse',undefined,interaction));
   assert.equal(after.log.length,before.log.length+1);assert.equal(after.log.at(-1).accepted,true);assert.equal(after.log.at(-1).interaction,interaction);
   assert.equal(after.prep.rinsed,true);assert.equal(after.time,before.time);assert.deepEqual(after.pot,before.pot);assert.deepEqual(after.pan,before.pan);
   assert.deepEqual(R.drying(after).areas,Array(8).fill(2));assert.equal(R.drying(after).remaining,16);
  }
  async function keyboardBegin(){
   await open();await page.locator('#rinseKeyboard').click();assert.equal(await page.locator('#rinseControl').evaluate(e=>e===document.activeElement),true);
  }
  async function keyboardCycle(direction='ArrowRight'){
   const before=await state();await keyboardBegin();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');
   for(let i=0;i<8;i++)await page.keyboard.press(direction);
   for(const key of ['ArrowUp','ArrowLeft','ArrowDown'])await page.keyboard.press(key);
   assert.equal(await page.locator('#rinseRelease').isDisabled(),false);assert.deepEqual(await state(),before);
   await page.keyboard.press('Enter');assertRinse(before,await state(),'keyboard-rinse');return before;
  }
  async function audit(name){
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
   const a=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}}));
   result.accessibility.push({name,violations:a.violations});assert.deepEqual(a.violations,[]);
  }

  await create({width:1440,height:1100});let before,d;
  // The tail resumes route and phone checks after the earlier seven desktop groups were verified.
  if(!tail){
  await load(R.start());await open();before=await state();
  assert.equal(await page.locator('#rinseTry').isDisabled(),true);assert.equal(await page.locator('#rinseKeyboard').isDisabled(),true);
  await page.locator('#rinseWashHands').click();
  assert.equal(await page.locator('#handwashingLesson').evaluate(e=>e.open),true);
  assert.deepEqual(await state(),before);assert.equal((await state()).prep.hands,false);
  // After proving that the prerequisite opens practice without an action, use the same canonical prepared fixture as the other rinsing cases.
  // Real mouse, touch and keyboard handwashing completion are exercised separately by kitchen_recipe_handwashing_qa.cjs.
  // A fixture reload avoids depending on the visibility of optional simplified controls in a different workspace view.
  const washed=R.act(before,'wash');await load(washed);assert.deepEqual(await state(),washed);
  assert.equal((await state()).prep.hands,true);assert.equal((await state()).log.at(-1).action,'wash');assert.equal((await state()).log.length,before.log.length+1);assert.equal((await state()).time,before.time);
  before=await state();await view();await page.locator('#recipeScene').screenshot({path:path.join(out,'desktop-produce-basket.png')});assert.deepEqual(await state(),before);
  check('The rinse prerequisite opens handwashing practice without a preparation action. A canonical washed-hands fixture prepares this rinsing regression; notebook and camera changes add no rinse or cooking time.');

  if(process.env.KITCHEN_RINSE_VISUAL_SMOKE==='1'){
   await complete();assertRinse(before,await state());
   await page.locator('[data-view="prep"]').click();await page.locator('#recipeScene').scrollIntoViewIfNeeded();
   await page.locator('#recipeScene').screenshot({path:path.join(out,'desktop-wet-produce.png')});await open();await audit('Visual smoke desktop rinsing');
   check('Visual smoke: clustered desktop produce returns wet to the board with exactly one canonical rinse and no cooking-time change.');
   await create({width:390,height:900},true);
   for(const [id,direction] of [['mushroom',1],['tomato',-1]]){
    await load(prepared(id,4));before=await state();await view();
    await page.locator('#recipeScene').screenshot({path:path.join(out,'phone-source-'+id+'.png')});
    await circle(await lower(true),true,direction,32);await phase('rinse');assert.equal(await canvas().getAttribute('data-rinse-stream'),'true');
    await page.locator('#recipeScene').screenshot({path:path.join(out,'phone-rinse-'+id+'.png')});
    await page.keyboard.press('Escape');await end(true);assert.deepEqual(await state(),before);
    assert.equal(await canvas().getAttribute('data-rinse-held'),'');assert.equal(await canvas().getAttribute('data-rinse-stream'),'false');
    await view();await complete(true,direction);assertRinse(before,await state());assert.equal(R.drying(await state()).surfaceWater,60);
    await page.locator('[data-view="prep"]').click();await page.locator('#recipeScene').scrollIntoViewIfNeeded();
    await page.locator('#recipeScene').screenshot({path:path.join(out,'phone-wet-'+id+'.png')});await open();await audit('Visual smoke phone '+id+' rinsing');
    check('Visual smoke: four-serving '+id+' source, active sensor-water ring, cancellation and full touch rinse retain exact model quantities.');
   }
   assert.equal(result.checks.length,4);assert.deepEqual(result.errors,[]);result.pass=true;return;
  }


  d=await start();await end();await phase('idle');assert.deepEqual(await state(),before);
  await view();d=await dock();await end();await phase('idle');assert.deepEqual(await state(),before);
  await view();d=await dock();await move({x:d.b.x,y:d.b.y+15*d.b.unit});await end();await phase('idle');assert.deepEqual(await state(),before);
  assert.equal(await canvas().getAttribute('data-rinse-held'),'');assert.equal(await canvas().getAttribute('data-rinse-stream'),'false');
  await page.locator('#recipeScene').screenshot({path:path.join(out,'desktop-basket-returned-after-cancel.png')});
  check('Tapping, carrying without lowering and partial lowering return the basket without marking produce rinsed.');

  await view();d=await circle(await lower(),false,1,18);await end();await phase('idle');assert.deepEqual(await state(),before);
  await view();d=await lower();const stationary=await project(sink.x+.22,1.62,sink.z);for(let i=0;i<12;i++)await move(stationary,false,1);await end();assert.deepEqual(await state(),before);
  await view();d=await lower();for(const angle of [0,Math.PI,0,Math.PI])await move(await project(sink.x+Math.cos(angle)*.22,1.62,sink.z+Math.sin(angle)*.22),false,1);await end();assert.deepEqual(await state(),before);
  await view();d=await circle(await lower(),false,1,12);for(let i=12;i>=0;i--)await move(await project(sink.x+Math.cos(2*Math.PI*i/64)*.22,1.62,sink.z+Math.sin(2*Math.PI*i/64)*.22),false,1);await end();assert.deepEqual(await state(),before);
  check('Incomplete circles, stationary contact, large jumps and reversed arcs produce no rinse evidence.');

  await view();d=await complete(false,1,false);
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:d.tipped.x+65*d.returned.unit,y:d.tipped.y,button:'left',buttons:0,clickCount:1});
  await phase('idle');await page.mouse.up();assert.deepEqual(await state(),before);
  await view();await rinsedPreview();await page.keyboard.press('Escape');await end();await phase('idle');assert.deepEqual(await state(),before);
  check('Escape and release outside the final tip path discard complete-looking previews without recording stale rinsing.');

  await view();d=await circle(await lower(),false,1,32);await phase('rinse');assert.equal(await canvas().getAttribute('data-rinse-stream'),'true');await page.locator('#recipeScene').screenshot({path:path.join(out,'desktop-rinse-circle.png')});await page.keyboard.press('Escape');await end();
  await view();await complete();assertRinse(before,await state());
  await page.locator('[data-view="prep"]').click();await page.locator('#recipeScene').scrollIntoViewIfNeeded();
  await page.locator('#recipeScene').screenshot({path:path.join(out,'desktop-wet-produce.png')});await open();await audit('Desktop rinsing');
  check('A complete clockwise carry, rinse, lift, return, tip and release logs exactly one canonical rinse and the sixteen modeled surface-water units.');

  await load(prepared('tomato'));before=await state();await view();await page.locator('#sceneKitchenTool').selectOption('cut');await complete(false,-1);
  assert.equal(await page.locator('#sceneKitchenTool').inputValue(),'rinse');assertRinse(before,await state());
  check('Counterclockwise tomato rinsing and automatic basket pickup from the cutting tool preserve camera, layout, recipe quantities and the paused clock.');

  await load(prepared());await view();await page.locator('#produceRinsing').evaluate(e=>{e.open=false;});await page.locator('#sceneKeyboardTools').click();
  assert.equal(await page.locator('#produceRinsing').evaluate(e=>e.open),true);assert.equal(await page.locator('#rinseControl').evaluate(e=>e===document.activeElement),true);before=await state();
  for(const key of ['ArrowLeft','ArrowDown','ArrowUp','Enter'])await page.keyboard.press(key);
  await page.locator('#rinseControl').dispatchEvent('keydown',{key:'ArrowRight',repeat:true});assert.deepEqual(await state(),before);
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');for(let i=0;i<7;i++)await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');assert.equal(await page.locator('#rinseRelease').isDisabled(),true);assert.deepEqual(await state(),before);
  await page.keyboard.press('ArrowRight');for(const key of ['ArrowUp','ArrowLeft','ArrowDown','Enter'])await page.keyboard.press(key);
  assertRinse(before,await state(),'keyboard-rinse');before=await state();await page.keyboard.press('Enter');assert.deepEqual(await state(),before);
  check('The closed notebook keyboard route requires all eight turns and every transfer phase; wrong phases, repeated keys and duplicate Enter add no action.');

  }
  await load(R.start());before=await state();await page.locator('[data-ingredient="produce"]').click();await page.locator('#ingredientHandle').click();
  assert.equal(await page.locator('#sceneKitchenTool').inputValue(),'wash');assert.equal(await canvas().getAttribute('data-camera-view'),'wash');assert.deepEqual(await state(),before);
  await page.locator('#handwashingLesson').evaluate(e=>{e.open=false;});await page.locator('#ingredientKeyboard').click();
  assert.equal(await page.locator('#handwashingLesson').evaluate(e=>e.open),true);assert.equal(await page.locator('#washControl').evaluate(e=>e===document.activeElement),true);assert.deepEqual(await state(),before);
  await open('skillQuests');await page.locator('[data-quest="prep"]').click();await page.locator('#questTry').click();
  assert.equal(await page.locator('#sceneKitchenTool').inputValue(),'wash');assert.equal(await canvas().getAttribute('data-camera-view'),'wash');assert.deepEqual(await state(),before);
  await page.locator('#handwashingLesson').evaluate(e=>{e.open=false;});await page.locator('#questKeyboard').click();
  assert.equal(await page.locator('#handwashingLesson').evaluate(e=>e.open),true);assert.equal(await page.locator('#washControl').evaluate(e=>e===document.activeElement),true);assert.deepEqual(await state(),before);
  await load(prepared());before=await state();await open('skillQuests');await page.locator('#questTry').click();
  assert.equal(await page.locator('#sceneKitchenTool').inputValue(),'rinse');assert.equal(await canvas().getAttribute('data-camera-view'),'rinse');assert.deepEqual(await state(),before);
  await page.locator('#produceRinsing').evaluate(e=>{e.open=false;});await page.locator('#questKeyboard').click();
  assert.equal(await page.locator('#produceRinsing').evaluate(e=>e.open),true);assert.equal(await page.locator('#rinseControl').evaluate(e=>e===document.activeElement),true);assert.deepEqual(await state(),before);
  await view();await complete();assertRinse(before,await state());
  assert.match(await page.locator('[data-quest="prep"]').textContent(),/1 \/ 3 steps/);
  assert.match(await page.locator('#questInstruction').textContent(),/ruler/);
  check('Fresh ingredient and preparation-quest routes require handwashing first. Washed hands unlock real rinsing; route opening earns nothing and completed rinsing advances only its preparation milestone.');

  const already=R.act(prepared(),'rinse'),cut=R.act(already,'cut'),cooking=R.act(R.act(cut,'oil'),'produce');
  for(const s of [already,cut,cooking,R.startRescue('dry',0,'practice')]){
   await load(s);before=await state();await open();assert.equal(await page.locator('#rinseTry').isDisabled(),true);assert.equal(await page.locator('#rinseKeyboard').isDisabled(),true);assert.deepEqual(await state(),before);
  }
  check('Already rinsed, cut, cooking and supplied rescue produce cannot be moved through a false new rinsing cycle.');

  await create({width:390,height:900},true);
  for(const [id,direction] of [['mushroom',1],['tomato',-1]]){
   await load(prepared(id,4));before=await state();await view();d=await circle(await lower(true),true,direction,32);await phase('rinse');assert.equal(await canvas().getAttribute('data-rinse-stream'),'true');
   if(id==='mushroom')await page.locator('#recipeScene').screenshot({path:path.join(out,'phone-rinsing-at-sink.png')});
   await page.keyboard.press('Escape');await end(true);assert.deepEqual(await state(),before);
   await view();await complete(true,direction);assertRinse(before,await state());assert.equal(R.drying(await state()).surfaceWater,60);
  }
  await page.locator('[data-view="prep"]').click();await page.locator('#recipeScene').scrollIntoViewIfNeeded();await page.locator('#recipeScene').screenshot({path:path.join(out,'phone-wet-tomatoes.png')});
  await open();await audit('Phone rinsing');
  check('Real phone touches rinse four-serving mushrooms and tomatoes in both directions, retaining exact portions and their recipe-scaled surface water.');

  for(const stop of ['touchCancel','blur','external','resize','secondPointer']){
   await load(prepared());before=await state();await view();d=await lower(true);
   if(stop==='touchCancel')await touch('touchCancel');if(stop==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   if(stop==='external')await page.locator('#potHeat').evaluate(e=>{e.value='1';e.dispatchEvent(new Event('change',{bubbles:true}));});
   if(stop==='resize')await page.setViewportSize({width:390,height:860});
   if(stop==='secondPointer')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:d.lowered.x,y:d.lowered.y,id:1},{x:d.lowered.x+25,y:d.lowered.y+25,id:2}]});
   await phase('idle');if(stop!=='touchCancel')await end(true);assert.deepEqual(await state(),stop==='external'?R.act(before,'potHeat',1):before);
  }
  check('Pointer cancellation, blur, external burner changes, resizing and a second touch end basket handling without stray rinse evidence.');

  await page.setViewportSize({width:320,height:860});await load(prepared('tomato',4),true);await keyboardCycle('ArrowLeft');
  await page.emulateMedia({forcedColors:'active'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('#produceRinsing').screenshot({path:path.join(out,'compact-text-keyboard-rinsing.png')});await audit('320px forced-colors text rinsing');
  check('At 320px in text view, consistent left-arrow turns complete the whole rinse sequence with no horizontal overflow or accessibility violations.');

  await page.emulateMedia({forcedColors:'none'});before=await state();await page.reload({waitUntil:'domcontentloaded'});await page.locator('#produceRinsing').waitFor({state:'attached'});assert.deepEqual(await state(),before);
  await open();assert.equal(await page.locator('#rinseKeyboard').isDisabled(),true);
  const recorded=recordedCook(),rinseIndex=recorded.log.findIndex(e=>e.action==='rinse')+1;await load(recorded);before=await state();await open();assert.equal(await page.locator('#rinseKeyboard').isDisabled(),true);
  await page.locator('#openRecipeReplay').click();await open();
  for(const index of [rinseIndex-1,rinseIndex]){
   await page.locator('#recipeReplayStep').evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));},index);
   assert.equal(await page.locator('#rinseKeyboard').isDisabled(),true);assert.equal(await page.locator('#rinseTry').isDisabled(),true);assert.deepEqual(await state(),before);
  }
  check('Reload preserves canonical rinsing; finished and historical-prefix observations lock new rinsing without altering the saved cook.');

  await load(prepared());await view();before=await state();await lower(true);
  await page.evaluate(()=>{const c=document.querySelector('#recipeScene > canvas'),gl=c.getContext('webgl2')||c.getContext('webgl');gl.getExtension('WEBGL_lose_context').loseContext();});
  await page.locator('#recipeFallback').waitFor();await end(true);assert.deepEqual(await state(),before);assert.equal(await canvas().getAttribute('data-rinse-held'),'');
  await keyboardCycle();
  check('Graphics loss returns the held basket without recording a rinse, then preserves the full keyboard equivalent through final release.');

  assert.equal(result.checks.length,tail?7:14);assert.deepEqual(result.errors,[]);result.pass=true;
 }catch(e){result.failure=e.stack;if(page)await page.screenshot({path:path.join(out,'rinsing-failure.png'),fullPage:true}).catch(()=>{});throw e;}
 finally{fs.writeFileSync(path.join(out,'rinsing-results.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
