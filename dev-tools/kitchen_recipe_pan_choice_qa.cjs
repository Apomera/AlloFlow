/* Isolated real-control pan-choice QA. Copy into repository dev-tools before running. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('@playwright/test');
const R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),P=require('../stem_lab/kitchen_studio/recipe_lab_pan_choice.js'),fixture=require('./kitchen_recipe_fixture.cjs');
const out=path.resolve(process.env.KITCHEN_QA_OUT||'reports/kitchen-pan-choice-2026-10-04/browser');
const url=process.env.KITCHEN_RECIPE_URL||'http://127.0.0.1:53061/stem_lab/kitchen_studio/recipe_lab.html?v=20261004-pan-choice';
const result={checks:[],errors:[],accessibility:[]};fs.mkdirSync(out,{recursive:true});
const resume=Number(process.env.KITCHEN_PAN_QA_RESUME||0);assert.ok(resume===0||resume===7,'Only the completed desktop checkpoint can resume');
if(resume){const prior=JSON.parse(fs.readFileSync(path.join(out,'pan-choice-initial-results.json'),'utf8'));assert.equal(prior.checks.length,resume);assert.deepEqual(prior.errors,[]);result.checks.push(...prior.checks);result.accessibility.push(...prior.accessibility);result.resumedAfter=resume;result.note='Desktop groups 1–7 were verified in the initial run. The remaining groups resume after a local-preview loading timeout; no assertions are skipped or counted twice.';}
const grips={standard:{x:.05,y:1.35,z:1.53},wide:{x:1.3,y:1.35,z:1.53}},height=1.56;
function prepared(id='mushroom',servings=2){let s=R.start(id,servings);for(const action of ['wash','rinse','cut','dry','garlicPrep'])s=R.act(s,action);return s;}
function warm(){let s=R.act(R.start(),'panHeat',2);s=R.act(s,'advance',30);s=R.act(s,'panHeat',0);assert.ok(s.pan.temp>30);return s;}
function recorded(){let s=R.start('mushroom',2,'demonstrate');s=R.act(s,'panSize','wide','scene-pan-size');s=R.act(s,'panSize','standard','keyboard-pan-size');for(const [a,v] of fixture().steps)s=R.act(s,a,v);assert.equal(s.plated,true);return R.submit({...s,answers:[0,0]});}
function placement(before,after,value,interaction='scene-pan-size'){
 assert.deepEqual(after,R.act(before,'panSize',value,interaction));assert.equal(after.log.length,before.log.length+1);
 assert.equal(after.log.at(-1).accepted,true);assert.equal(after.log.at(-1).interaction,interaction);
 assert.equal(after.time,before.time);assert.deepEqual(after.prep,before.prep);assert.deepEqual(after.pot,before.pot);
 assert.deepEqual({...after.pan,size:before.pan.size},before.pan);assert.deepEqual(Object.keys(after).sort(),Object.keys(before).sort());
}
function crossRuntimeState(actual,expected,trail='state'){
 if(typeof actual==='number'&&typeof expected==='number'){assert.ok(Object.is(actual,expected)||Number.isFinite(actual)&&Number.isFinite(expected)&&Math.abs(actual-expected)<=1e-12,trail+' differs across Node and Chromium');return;}
 if(actual&&expected&&typeof actual==='object'&&typeof expected==='object'){assert.equal(Array.isArray(actual),Array.isArray(expected),trail);assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort(),trail);for(const key of Object.keys(expected))crossRuntimeState(actual[key],expected[key],trail+'.'+key);return;}
 assert.deepEqual(actual,expected,trail);
}

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});let page,cdp;
 try{
  const check=text=>{result.checks.push(text);console.log(text);};
  const canvas=()=>page.locator('#recipeScene > canvas');
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alloflow-kitchen-recipes-v1')).current);
  const phase=name=>page.waitForFunction(name=>document.querySelector('#recipeScene > canvas').dataset.panChoicePhase===name,name);
  async function mounted(){await page.locator('#panChoiceLesson').waitFor({state:'attached',timeout:60000});}
  async function create(viewport,touch=false){
   if(page)await page.context().close();const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,reducedMotion:'reduce'});
   page=await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(60000);page.on('pageerror',e=>result.errors.push(e.message));
   await page.addInitScript(()=>{const seed=sessionStorage.getItem('pan-choice-qa-seed');if(seed){localStorage.setItem('alloflow-kitchen-recipes-v1',seed);sessionStorage.removeItem('pan-choice-qa-seed');}});
   await page.goto(url,{waitUntil:'domcontentloaded'});await mounted();cdp=await context.newCDPSession(page);
  }
  async function load(s,text=false){
   await page.evaluate(data=>sessionStorage.setItem('pan-choice-qa-seed',JSON.stringify(data)),{version:1,current:s,history:[],textView:text});
   await page.reload({waitUntil:'domcontentloaded'});await mounted();crossRuntimeState(await state(),R.restore(s));
  }
  async function open(){if(!await page.locator('#panChoiceLesson').evaluate(e=>e.open))await page.locator('#panChoiceLesson > summary').click();}
  async function view(){await open();await page.locator('#panChoiceTry').click();await page.locator('#recipeScene').scrollIntoViewIfNeeded();assert.equal(await canvas().getAttribute('data-camera-view'),'cookware');assert.equal(await page.locator('#sceneKitchenTool').inputValue(),'cookware');}
  async function project(at,viewName='cookware'){
   return page.evaluate(({at,viewName})=>{
    const el=document.querySelector('#recipeScene > canvas'),b=el.getBoundingClientRect(),c=new THREE.PerspectiveCamera(38,b.width/b.height,.1,100);
    let target,f,offset;if(viewName==='objects'){target=new THREE.Vector3(.7,1.6,-.1);f=Math.max(1,1.16/c.aspect);offset=new THREE.Vector3(.2*f,5.4*f,4.5*f);}
    else{target=new THREE.Vector3(1,1.30,.50);f=Math.max(1,1.30/c.aspect);offset=new THREE.Vector3(.05*f,2.65*f,4.2*f);}
    if(offset.length()>13)offset.setLength(13);c.position.copy(target).add(offset);c.lookAt(target);c.updateMatrixWorld();const p=new THREE.Vector3(at.x,at.y,at.z).project(c);
    return {x:b.x+(p.x+1)*b.width/2,y:b.y+(1-p.y)*b.height/2};
   },{at,viewName});
  }
  const touch=(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p.x,y:p.y,id:1}]:[]});
  async function move(p,touchMode=false,steps=12){if(touchMode)await touch('touchMove',p);else await page.mouse.move(p.x,p.y,{steps});}
  async function end(touchMode=false){if(touchMode)await touch('touchEnd').catch(e=>{if(!e.message.includes('Must send a TouchStart'))throw e;});else await page.mouse.up();}
  async function start(choice='wide',touchMode=false){
   const source=await state(),a=await project(grips[choice]),box=await canvas().boundingBox();
   if(touchMode)await touch('touchStart',a);else{await page.mouse.move(a.x,a.y);await page.mouse.down();}
   await phase('carry');assert.equal(await canvas().getAttribute('data-pan-choice-held'),'true');assert.deepEqual(await state(),source);return {a,box,source,choice};
  }
  async function dock(choice='wide',touchMode=false){
   const d=await start(choice,touchMode),at=R.panPosition(d.source),b=await project({x:at.x,y:height,z:at.z});
   if(touchMode){for(let i=1;i<=12;i++)await move({x:d.a.x+(b.x-d.a.x)*i/12,y:d.a.y+(b.y-d.a.y)*i/12},true);}else await move(b);
   const box=await canvas().boundingBox();for(const key of ['x','y','width','height'])assert.ok(Math.abs(box[key]-d.box[key])<1,'Canvas moved while carrying a pan: '+key);
   assert.deepEqual(await state(),d.source);return {...d,b};
  }
  async function carry(choice='wide',touchMode=false){const d=await dock(choice,touchMode);await end(touchMode);await phase('idle');return d;}
  async function keyboardBegin(choice='wide'){
   await open();await page.locator('#panChoiceKeyboard').click();await page.locator('#panChoiceSelect').selectOption(choice);await page.locator('#panChoiceControl').focus();
   assert.equal(await page.locator('#panChoiceControl').evaluate(e=>e===document.activeElement),true);
  }
  async function keyboardCarry(choice='wide',buttons=false){
   const before=await state();await keyboardBegin(choice);
   for(const id of ['panChoiceLift','panChoiceCarry','panChoiceLower']){if(buttons)await page.locator('#'+id).click();else await page.keyboard.press({panChoiceLift:'ArrowUp',panChoiceCarry:'ArrowRight',panChoiceLower:'ArrowDown'}[id]);assert.deepEqual(await state(),before);}
   assert.equal(await page.locator('#panChoicePlace').isDisabled(),false);if(buttons)await page.locator('#panChoicePlace').click();else await page.keyboard.press('Enter');
   placement(before,await state(),choice,'keyboard-pan-size');return before;
  }
  async function audit(name){
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const a=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}}));
   result.accessibility.push({name,violations:a.violations});assert.deepEqual(a.violations,[]);
  }
  async function locked(){await open();assert.equal(await page.locator('#panChoiceTry').isDisabled(),true);assert.equal(await page.locator('#panChoiceKeyboard').isDisabled(),true);}

  await create({width:1440,height:1100});let before,d;
  if(!resume){await load(R.start());await open();before=await state();
  assert.equal(await page.locator('#panChoiceKeyboard').isDisabled(),false);await view();assert.deepEqual(await state(),before);
  assert.match(await page.locator('#panChoiceLesson').textContent(),/standard|wide/i);await page.locator('#recipeScene').screenshot({path:path.join(out,'desktop-pan-storage.png')});
  check('The lesson and dedicated cookware camera expose both stored pans without changing preparation, cookware, time or the action log.');

  d=await start();await end();await phase('idle');assert.deepEqual(await state(),before);
  await view();d=await start();await move(d.a);await end();await phase('idle');assert.deepEqual(await state(),before);
  await view();d=await start();await move({x:d.a.x+3,y:d.a.y+2});await end();await phase('idle');assert.deepEqual(await state(),before);
  await view();const same=await project(grips.standard);await page.mouse.click(same.x,same.y);await phase('idle');assert.deepEqual(await state(),before);
  check('A tap, stationary hold, subthreshold motion and replacing the already selected size create no action.');

  await view();d=await dock();await page.locator('#recipeScene').screenshot({path:path.join(out,'desktop-pan-carry.png')});await page.keyboard.press('Escape');await end();await phase('idle');assert.deepEqual(await state(),before);
  await view();d=await dock();const away=await project({x:2.9,y:height,z:1.35});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:away.x,y:away.y,button:'left',buttons:0,clickCount:1});await phase('idle');await page.mouse.up();assert.deepEqual(await state(),before);
  check('Escape and an actual off-target release discard even a pan preview that previously reached the station.');

  await view();await carry('wide');placement(before,await state(),'wide');before=await state();await view();await carry('standard');placement(before,await state(),'standard');
  await load(R.act(R.start(),'panPlace','trivet','scene-drag'));before=await state();await view();d=await start('wide');const wrongStation=R.panPosition(before,'burner');await move(await project({x:wrongStation.x,y:height,z:wrongStation.z}));await end();await phase('idle');assert.deepEqual(await state(),before);
  await view();await carry('wide');placement(before,await state(),'wide');
  assert.equal(R.panPosition(await state()).site,'trivet');assert.equal(await canvas().getAttribute('data-pan-choice-selected'),'wide');
  check('Real mouse carries select wide and standard pans on the burner and the current trivet, recording exactly one canonical panSize action on release.');

  await load(R.start());before=await state();await page.locator('button[data-view="objects"]').click();await page.locator('#recipeScene').scrollIntoViewIfNeeded();
  const first=await project(grips.wide,'objects');await page.mouse.click(first.x,first.y);assert.equal(await canvas().getAttribute('data-camera-view'),'cookware');await phase('idle');assert.deepEqual(await state(),before);
  await page.locator('#sceneKitchenTool').selectOption('cut');assert.equal(await canvas().getAttribute('data-camera-view'),'cookware');await carry('wide');placement(before,await state(),'wide');
  check('A source tap from another camera only frames cookware; a fresh pickup automatically selects the cookware tool and commits one deliberate carry.');

  await load(R.start());before=await state();await keyboardBegin();assert.equal(await page.locator('#panChoicePlace').isDisabled(),true);
  for(const key of ['Enter','ArrowRight','ArrowDown','Enter'])await page.keyboard.press(key);assert.deepEqual(await state(),before);
  await page.locator('#panChoiceControl').dispatchEvent('keydown',{key:'ArrowUp',repeat:true});assert.equal(await page.locator('#panChoicePlace').isDisabled(),true);
  await keyboardCarry('wide');before=await state();await page.keyboard.press('Enter');assert.deepEqual(await state(),before);
  await keyboardBegin('standard');await page.locator('#panChoiceLift').click();await page.locator('#panChoiceCancel').click();assert.deepEqual(await state(),before);
  await keyboardCarry('standard',true);before=await state();await page.locator('#panChoicePlace').dispatchEvent('click');assert.deepEqual(await state(),before);
  check('Keyboard arrows and stage buttons require lift, carry, lower and place; early placement, repeated keys, cancellation and duplicate placement keep no extra evidence.');

  for(const id of ['mushroom','tomato'])for(const servings of [2,4]){
   await load(R.start(id,servings));await open();before=await state();
   const amount=R.ingredients(before).produce,hypothetical=size=>R.inspect({...before,pan:{...before.pan,size,produce:true}}).crowded;
   assert.match(await page.locator('#panChoiceBatch').textContent(),new RegExp('^'+amount+' g .* for '+servings+' people'));
   const comparison=P.comparison(before);assert.equal(comparison.grams,amount);assert.equal(comparison.servings,servings);
   for(const size of ['standard','wide']){const row=page.locator('#panChoiceComparison article[data-pan-choice="'+size+'"]'),crowded=hypothetical(size);assert.equal(await row.getAttribute('data-crowded'),String(crowded));assert.equal(await row.locator('.pan-choice-spacing').textContent(),crowded?'Crowded batch':'Room for this batch');assert.equal(comparison.choices.find(c=>c.id===size).crowded,crowded);assert.equal(await row.getAttribute('data-selected'),String(before.pan.size===size));}
   assert.match(await page.locator('#panChoiceComparison').textContent(),/room|crowd/i);assert.match(await page.locator('#panChoiceComparison').textContent(),/heat|warm/i);
   await page.locator('#panChoiceComparison button[data-pan-select="wide"]').click();assert.equal(await page.locator('#panChoiceKeyboardPanel').isVisible(),true);assert.deepEqual(await state(),before);
   await page.locator('#panChoiceLesson').screenshot({path:path.join(out,'comparison-'+id+'-'+servings+'.png')});assert.deepEqual(await state(),before);
  }
  await audit('Desktop pan-choice comparison');check('Both recipe types at two and four servings compare their actual scaled batch using inspect crowding, explain the wide-pan heating tradeoff and create no hypothetical cooking action.');
  }

  const oil=R.act(R.act(R.start(),'panSize','wide','scene-pan-size'),'oil'),produce=R.act(R.act(prepared(),'oil'),'produce'),garlic=R.act(produce,'garlic');
  const served=fixture().steps.reduce((s,[a,v])=>a==='plate'?s:R.act(s,a,v),R.start('mushroom',2,'demonstrate')),serving=R.act(served,'servePortion',0);
  for(const [name,s] of [['oil',oil],['produce',produce],['garlic',garlic],['heat',R.act(R.start(),'panHeat',1)],['stored heat',warm()],['rescue',R.startRescue('dry',0)],['serving',serving],['finished',recorded()]]){
   await load(s);before=await state();await locked();assert.equal(P.available(before,false).ready,false,name+' must lock pan choice');assert.deepEqual(await state(),before);assert.equal((await state()).pan.size,before.pan.size);
  }
  check('Oil, produce, garlic, a live burner, stored heat, rescue, serving and finished work lock pan choice while preserving the recorded size.');

  await load(R.start());await keyboardCarry('wide');before=await state();await page.reload({waitUntil:'domcontentloaded'});await mounted();assert.deepEqual(await state(),before);
  assert.equal(await canvas().getAttribute('data-pan-choice-selected'),'wide');await open();await page.locator('#expandKitchen').click();await page.locator('#panChoiceLesson').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#expandedKitchen #panChoiceLesson').count(),1);await page.keyboard.press('Escape');assert.deepEqual(await state(),before);
  assert.equal(await page.locator('#expandedKitchen').evaluate(e=>e.open),false);await page.locator('#newCook').click();assert.equal((await state()).pan.size,'standard');assert.equal((await state()).log.length,0);
  check('Reload and expanded-kitchen restoration preserve the saved size and evidence; a fresh cook resets to its canonical standard pan.');

  const history=recorded();assert.deepEqual(R.restore(history),history);await load(history);before=await state();await page.locator('#openRecipeReplay').click();
  for(const index of [0,1,2,history.log.length]){
   await page.locator('#recipeReplayStep').evaluate((e,i)=>{e.value=String(i);e.dispatchEvent(new Event('input',{bubbles:true}));},index);
   const expected=R.replay(history,index).state;assert.equal(await canvas().getAttribute('data-pan-choice-selected'),expected.pan.size);await locked();assert.equal(P.available(expected,true).ready,false);assert.deepEqual(await state(),before);
  }
  assert.equal(R.replay(history,0).state.pan.size,'standard');assert.equal(R.replay(history,1).state.pan.size,'wide');assert.equal(R.replay(history,2).state.pan.size,'standard');
  await page.reload({waitUntil:'domcontentloaded'});await mounted();assert.deepEqual(await state(),before);
  check('Restore and replay retain legacy panSize evidence, show each prefix size without borrowing future choices, and keep historical interaction locked.');

  await create({width:390,height:900},true);await load(R.start('tomato',4));before=await state();await view();d=await dock('wide',true);
  const phoneCoach=await page.locator('.kitchen-gesture-coach[data-tool="pan-choice"]').boundingBox();assert.ok(phoneCoach.y>d.b.y+30,'Phone coach obscures the pan station');assert.equal(await page.locator('#gestureDetail').isVisible(),false);
  await page.locator('#recipeScene').screenshot({path:path.join(out,'phone-pan-carry.png')});await end(true);await phase('idle');placement(before,await state(),'wide');
  await load(R.act(R.act(R.start('mushroom',4),'panSize','wide','keyboard-pan-size'),'panPlace','trivet','scene-drag'));before=await state();await view();await carry('standard',true);placement(before,await state(),'standard');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await open();await page.locator('#panChoiceLesson').screenshot({path:path.join(out,'phone-pan-choice.png')});await audit('390px real-touch pan choice');
  check('Real 390px touch carries replace the pan on either current station with stable framing, visible cookware and no page overflow.');

  for(const stop of ['touchCancel','blur','external','resize','secondPointer']){
   await page.setViewportSize({width:390,height:900});await load(R.start());before=await state();await view();d=await dock('wide',true);
   if(stop==='touchCancel')await touch('touchCancel');if(stop==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   if(stop==='external')await page.locator('#potHeat').evaluate(e=>{e.value='1';e.dispatchEvent(new Event('change',{bubbles:true}));});
   if(stop==='resize')await page.setViewportSize({width:390,height:860});
   if(stop==='secondPointer')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:d.b.x,y:d.b.y,id:1},{x:d.b.x+25,y:d.b.y+25,id:2}]});
   await phase('idle');if(stop!=='touchCancel')await end(true);assert.deepEqual(await state(),stop==='external'?R.act(before,'potHeat',1):before);
  }
  await load(R.start());before=await state();await keyboardBegin();await page.locator('#panChoiceLift').click();await page.locator('#potHeat').evaluate(e=>{e.value='1';e.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#panChoicePlace').dispatchEvent('click');assert.deepEqual(await state(),R.act(before,'potHeat',1));
  check('Touch cancellation, blur, resize, a second touch and any external state change invalidate native and keyboard drafts without stray panSize actions.');

  await page.setViewportSize({width:320,height:860});await load(R.start('tomato',4),true);await keyboardCarry('wide');await keyboardCarry('standard',true);await page.emulateMedia({forcedColors:'active'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.locator('#panChoiceLesson').screenshot({path:path.join(out,'compact-text-pan-choice.png')});await audit('320px forced-colors text pan choice');
  check('At 320px in text view the complete staged keyboard interaction fits the screen, including the comparison and forced colors.');

  await page.emulateMedia({forcedColors:'none'});await page.setViewportSize({width:390,height:900});await load(R.start());before=await state();await view();await dock('wide',true);
  await page.evaluate(()=>{const c=document.querySelector('#recipeScene > canvas'),gl=c.getContext('webgl2')||c.getContext('webgl');gl.getExtension('WEBGL_lose_context').loseContext();});
  await page.locator('#recipeFallback').waitFor({state:'visible'});await end(true);assert.deepEqual(await state(),before);assert.equal(await canvas().getAttribute('data-pan-choice-held'),'');
  await keyboardCarry('wide');assert.equal(await page.locator('#panChoiceTry').isVisible(),false);await audit('Graphics-loss keyboard pan choice');
  check('Graphics loss returns the native preview without evidence and leaves a complete equivalent keyboard pan choice available.');

  assert.equal(result.checks.length,14);assert.deepEqual(result.errors,[]);result.pass=true;
 }catch(e){result.failure=e.stack;if(page)await page.screenshot({path:path.join(out,'pan-choice-failure.png'),fullPage:true}).catch(()=>{});throw e;}
 finally{fs.writeFileSync(path.join(out,'pan-choice-results.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
