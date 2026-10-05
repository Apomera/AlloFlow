/* Isolated real-control timer QA. Copy into repository dev-tools before running. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('@playwright/test');
const R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),C=require('../stem_lab/kitchen_studio/recipe_lab_clock.js'),fixture=require('./kitchen_recipe_fixture.cjs');
const out=path.resolve(process.env.KITCHEN_QA_OUT||'reports/kitchen-timer-winding-2026-10-04/browser');
const url=process.env.KITCHEN_RECIPE_URL||'http://127.0.0.1:53061/stem_lab/kitchen_studio/recipe_lab.html?v=20261004-timers';
const result={checks:[],errors:[],accessibility:[],expectedGroups:12};
const storageKey='alloflow-kitchen-recipes-v1',seedKey='timer-winding-qa-seed',stations=['pot','pan'],intervals=[0,15,30,60,120,300];
const positions={pot:{x:-.60,y:3.53,z:-1.74},pan:{x:.60,y:3.53,z:-1.74}};
fs.mkdirSync(out,{recursive:true});

function crossRuntimeState(actual,expected,trail='state'){
 if(typeof actual==='number'&&typeof expected==='number'){
  assert.ok(Object.is(actual,expected)||Number.isFinite(actual)&&Number.isFinite(expected)&&Math.abs(actual-expected)<=1e-12,trail+' differs across Node and Chromium');return;
 }
 if(actual&&expected&&typeof actual==='object'&&typeof expected==='object'){
  assert.equal(Array.isArray(actual),Array.isArray(expected),trail);assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort(),trail);
  for(const key of Object.keys(expected))crossRuntimeState(actual[key],expected[key],trail+'.'+key);return;
 }
 assert.deepEqual(actual,expected,trail);
}
function recorded(){let s=R.start('mushroom',2,'demonstrate');for(const [a,v] of fixture().steps)s=R.act(s,a,v);assert.equal(s.plated,true);s=R.submit({...s,answers:[0,0]});assert.equal(s.submitted,true);return s;}
function serving(){let s=R.start('mushroom',2,'demonstrate');for(const [a,v] of fixture().steps){if(a==='plate')break;s=R.act(s,a,v);}s=R.act(s,'servePortion',0);assert.equal(R.serving(s).started,true);return s;}
function unchangedCook(before,after){assert.deepEqual(after.current,before.current);assert.equal(after.current.time,before.current.time);assert.deepEqual(after.current.log,before.current.log);}
function unchangedReminders(before,after){unchangedCook(before,after);assert.deepEqual(after.checkTimers,before.checkTimers);}
function setReminder(before,after,station,seconds){unchangedCook(before,after);assert.deepEqual(after.checkTimers[station],C.create(before.current.time,seconds));assert.deepEqual(after.checkTimers[station==='pot'?'pan':'pot'],before.checkTimers[station==='pot'?'pan':'pot']);}
function stableBox(before,after){assert.ok(before&&after,'Canvas bounds must exist');for(const key of ['x','y','width','height'])assert.ok(Math.abs(after[key]-before[key])<1,'Canvas moved during winding: '+key);}

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});let page,cdp;
 try{
  const canvas=()=>page.locator('#recipeScene > canvas');
  const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
  const phase=name=>page.waitForFunction(name=>document.querySelector('#recipeScene > canvas').dataset.checkTimerPhase===name,name,{timeout:20000});
  async function group(name,body){await body();result.checks.push(name);console.log(name);}
  async function mounted(){
   await page.locator('#timerWindingLesson').waitFor({state:'attached',timeout:60000});
   await page.waitForFunction(()=>window.KitchenTimerWinding&&document.querySelector('#timerWindPot')&&document.querySelector('#timerWindPan'),null,{timeout:60000});
  }
  async function create(viewport,touchMode=false){
   if(page)await page.context().close();const context=await browser.newContext({viewport,hasTouch:touchMode,isMobile:touchMode,reducedMotion:'reduce'});
   page=await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(60000);page.on('pageerror',e=>result.errors.push(e.message));
   await page.addInitScript(({storageKey,seedKey})=>{const seed=sessionStorage.getItem(seedKey);if(seed){localStorage.setItem(storageKey,seed);sessionStorage.removeItem(seedKey);}},{storageKey,seedKey});
   await page.goto(url,{waitUntil:'domcontentloaded'});await mounted();cdp=await context.newCDPSession(page);
  }
  async function load(s,options={}){
   const data={version:1,current:s,history:options.history||[],textView:!!options.text,checkTimers:options.timers||{pot:null,pan:null},timeStep:options.step||30};
   await page.evaluate(({seedKey,data})=>sessionStorage.setItem(seedKey,JSON.stringify(data)),{seedKey,data});
   await page.reload({waitUntil:'domcontentloaded'});await mounted();crossRuntimeState((await saved()).current,R.restore(s));
  }
  async function open(){if(!await page.locator('#timerWindingLesson').evaluate(e=>e.open))await page.locator('#timerWindingLesson > summary').click();}
  async function view(){
   await open();await page.locator('#timerWindTry').click();await page.locator('#recipeScene').scrollIntoViewIfNeeded();
   assert.equal(await canvas().getAttribute('data-camera-view'),'timers');assert.equal(await page.locator('#sceneKitchenTool').inputValue(),'timer');await phase('idle');
  }
  async function project(at,viewName='timers'){
   return page.evaluate(({at,viewName})=>{
    const b=document.querySelector('#recipeScene > canvas').getBoundingClientRect(),c=new THREE.PerspectiveCamera(38,b.width/b.height,.1,100);
    let target,offset;if(viewName==='bench'){target=new THREE.Vector3(0,1,0);offset=new THREE.Vector3(6,4.6,7);}
    else{target=new THREE.Vector3(0,3.30,-1.80);const f=Math.max(1,1.06/c.aspect);offset=new THREE.Vector3(.015*f,.35*f,3.70*f);}
    if(offset.length()>13)offset.setLength(13);c.position.copy(target).add(offset);c.lookAt(target);c.updateMatrixWorld();
    const p=new THREE.Vector3(at.x,at.y,at.z).project(c);return {x:b.x+(p.x+1)*b.width/2,y:b.y+(1-p.y)*b.height/2};
   },{at,viewName});
  }
  async function rim(station,angle=0,radius=.29,viewName='timers'){const at=positions[station];return project({x:at.x+Math.sin(angle)*radius,y:at.y+Math.cos(angle)*radius,z:at.z},viewName);}
  const touch=(type,point)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:point?[{x:point.x,y:point.y,id:1}]:[]});
  async function move(point,touchMode=false){if(touchMode)await touch('touchMove',point);else await page.mouse.move(point.x,point.y,{steps:2});}
  async function end(touchMode=false){if(touchMode)await touch('touchEnd').catch(e=>{if(!e.message.includes('Must send a TouchStart'))throw e;});else await page.mouse.up();}
  async function start(station='pot',touchMode=false){
   const source=await saved(),a=await rim(station),box=await canvas().boundingBox();
   if(touchMode)await touch('touchStart',a);else{await page.mouse.move(a.x,a.y);await page.mouse.down();}
   await phase('wind');assert.equal(await canvas().getAttribute('data-check-timer-held'),'true');assert.equal(await canvas().getAttribute('data-check-timer-station'),station);
   unchangedReminders(source,await saved());stableBox(box,await canvas().boundingBox());return {station,source,a,p:a,box,ticks:0};
  }
  async function arc(d,ticks,touchMode=false){
   for(let n=1;n<=ticks*6;n++){d.p=await rim(d.station,n*Math.PI/18);await move(d.p,touchMode);}
   d.ticks=ticks;await phase('release');assert.equal(await canvas().getAttribute('data-check-timer-seconds'),String(intervals[ticks]));
   unchangedReminders(d.source,await saved());stableBox(d.box,await canvas().boundingBox());return d;
  }
  async function preview(station,ticks,touchMode=false){return arc(await start(station,touchMode),ticks,touchMode);}
  async function wind(station,ticks,touchMode=false){const d=await preview(station,ticks,touchMode);await end(touchMode);await phase('idle');setReminder(d.source,await saved(),station,intervals[ticks]);return d;}
  async function legacyOpen(){if(!await page.locator('#checkTimers').evaluate(e=>e.open))await page.locator('#checkTimers > summary').click();}
  async function legacySet(station,seconds,activeDraft=false){
   const before=await saved();
   if(activeDraft){await page.locator('#'+station+'TimerDuration').evaluate((e,v)=>{e.value=String(v);},seconds);await page.locator('[data-set-timer="'+station+'"]').dispatchEvent('click');}
   else{await legacyOpen();await page.locator('#'+station+'TimerDuration').selectOption(String(seconds));await page.locator('[data-set-timer="'+station+'"]').click();}
   setReminder(before,await saved(),station,seconds);return before;
  }
  async function keyboardStart(station='pot'){
   await open();await page.locator('#timerWindKeyboard').click();await page.locator('#timerWindStation').selectOption(station);
   await page.locator('#timerWindControl').focus();assert.equal(await page.locator('#timerWindControl').evaluate(e=>e===document.activeElement),true);
  }
  async function keyboardSet(station,ticks,buttons=false){
   const before=await saved();await keyboardStart(station);await page.locator('#timerWindBegin').click();await page.locator('#timerWindControl').focus();unchangedReminders(before,await saved());
   for(let n=0;n<ticks;n++){if(buttons)await page.locator('#timerWindWind').click();else await page.keyboard.press(n%2?'ArrowUp':'ArrowRight');unchangedReminders(before,await saved());}
   assert.equal(await page.locator('#timerWindRelease').isDisabled(),false);
   if(buttons)await page.locator('#timerWindRelease').click();else await page.keyboard.press('Enter');setReminder(before,await saved(),station,intervals[ticks]);return before;
  }
  async function audit(name){
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
   const findings=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}}));
   result.accessibility.push({name,violations:findings.violations});assert.deepEqual(findings.violations,[],name);
  }
  async function disabledLesson(){
   await open();for(const id of ['timerWindTry','timerWindKeyboard'])assert.equal(await page.locator('#'+id).isDisabled(),true);
   for(const station of stations)for(const attr of ['data-timer-wind-station','data-timer-clear','data-timer-inspect'])assert.equal(await page.locator('#timerWindingLesson ['+attr+'="'+station+'"]').isDisabled(),true);
  }

  await create({width:1440,height:1100});
  await group('Mouse winding sets both vessel reminders at varied intervals; previews and release preserve the complete cook, time and action log.',async()=>{
   await load(R.start());await view();const before=await saved();unchangedReminders(before,await saved());
   let d=await preview('pot',1);await page.locator('#recipeScene').screenshot({path:path.join(out,'desktop-timer-preview.png')});await end();await phase('idle');setReminder(d.source,await saved(),'pot',15);
   await wind('pan',2);await wind('pot',3);await wind('pan',4);await wind('pot',5);
   assert.equal((await saved()).current.time,0);assert.equal((await saved()).current.log.length,0);await open();await audit('Desktop timer lesson and reminders');
   await page.locator('#timerWindingLesson').screenshot({path:path.join(out,'desktop-timer-lesson.png')});
  });

  await group('A source tap from another camera only frames timers; fresh pickup selects the timer tool, while taps, partial turns, off-rim movement and actual bad release change no reminder.',async()=>{
   await load(R.start());const before=await saved();await page.locator('button[data-view="bench"]').click();await page.locator('#recipeScene').scrollIntoViewIfNeeded();
   const first=await rim('pot',0,.29,'bench');await page.mouse.click(first.x,first.y);assert.equal(await canvas().getAttribute('data-camera-view'),'timers');await phase('idle');unchangedReminders(before,await saved());
   await page.locator('#sceneKitchenTool').selectOption('cut');assert.equal(await canvas().getAttribute('data-camera-view'),'timers');await wind('pot',1);
   await load(R.start());await view();let d=await start('pan');await end();await phase('idle');unchangedReminders(d.source,await saved());
   d=await start('pot');await move(await rim('pot',Math.PI/9));await end();await phase('idle');unchangedReminders(d.source,await saved());
   const off=await rim('pan',0,.75);const offBefore=await saved();await page.mouse.click(off.x,off.y);await phase('idle');unchangedReminders(offBefore,await saved());
   d=await preview('pot',2);await move(await rim('pot',Math.PI/2,.75));await phase('retry');await end();await phase('idle');unchangedReminders(d.source,await saved());
   d=await preview('pan',3);const away=await rim('pan',Math.PI,.75);
   await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:away.x,y:away.y,button:'left',buttons:0,clickCount:1});await phase('idle');await page.mouse.up();unchangedReminders(d.source,await saved());
   d=await preview('pot',4);await page.keyboard.press('Escape');await end();await phase('idle');unchangedReminders(d.source,await saved());
  });

  await group('Legacy timer edits at the same clock, a real Advance action, blur and resize invalidate active native winding without stray timer or recipe changes.',async()=>{
   for(const stop of ['legacy','advance','blur','resize']){
    await page.setViewportSize({width:1440,height:1100});await load(R.start());await view();const d=await preview('pot',3);
    if(stop==='legacy')await legacySet('pan',30,true);
    if(stop==='advance')await page.locator('#advance').dispatchEvent('click');
    if(stop==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    if(stop==='resize')await page.setViewportSize({width:1400,height:1050});
    await phase('idle');await end();const after=await saved();
    if(stop==='advance'){crossRuntimeState(after.current,R.act(d.source.current,'advance',30));assert.equal(after.current.log.length,d.source.current.log.length+1);assert.deepEqual(after.checkTimers,d.source.checkTimers);}
    else{unchangedCook(d.source,after);assert.deepEqual(after.checkTimers,stop==='legacy'?{pot:null,pan:C.create(d.source.current.time,30)}:d.source.checkTimers);}
   }
   await page.setViewportSize({width:1440,height:1100});
  });

  await group('Keyboard Begin, interval keys and Enter match winding buttons; no-Begin, repeated keys, cancellation, duplicate release and stale drafts create no extra reminder or evidence.',async()=>{
   await load(R.start());let before=await saved();await keyboardStart();for(const key of ['ArrowRight','ArrowUp','Enter'])await page.keyboard.press(key);unchangedReminders(before,await saved());
   await page.locator('#timerWindBegin').click();await page.locator('#timerWindControl').focus();await page.locator('#timerWindControl').dispatchEvent('keydown',{key:'ArrowRight',repeat:true});
   assert.equal(await page.locator('#timerWindPreview').textContent(),'0:00');assert.equal(await page.locator('#timerWindRelease').isDisabled(),true);await page.keyboard.press('Escape');unchangedReminders(before,await saved());
   await keyboardSet('pot',2);before=await saved();await page.keyboard.press('Enter');unchangedReminders(before,await saved());await keyboardSet('pan',4,true);
   before=await saved();await keyboardStart('pot');await page.locator('#timerWindBegin').click();await page.locator('#timerWindWind').click();await page.locator('#timerWindCancel').click();unchangedReminders(before,await saved());
   await load(R.start());await keyboardStart('pot');before=await saved();await page.locator('#timerWindBegin').click();await page.locator('#timerWindWind').click();await legacySet('pan',30,true);
   await page.locator('#timerWindControl').focus();await page.keyboard.press('Enter');unchangedCook(before,await saved());assert.deepEqual((await saved()).checkTimers,{pot:null,pan:C.create(before.current.time,30)});
   await load(R.start());await keyboardStart('pan');before=await saved();await page.locator('#timerWindBegin').click();await page.locator('#timerWindWind').click();await page.locator('#advance').dispatchEvent('click');
   await page.locator('#timerWindRelease').dispatchEvent('click');crossRuntimeState((await saved()).current,R.act(before.current,'advance',30));assert.deepEqual((await saved()).checkTimers,before.checkTimers);
  });

  await group('Legacy and winding controls read the same reminders in both directions; either clear and vessel inspection preserve cooking evidence.',async()=>{
   await load(R.start());await keyboardSet('pot',3);await legacyOpen();assert.match(await page.locator('#potTimerStatus').textContent(),/1:00 remaining/);assert.equal(await page.locator('#potTimerDuration').inputValue(),'60');
   await legacySet('pan',120);await open();assert.equal(await page.locator('#timerWindPan .timer-wind-reading').textContent(),'2:00');assert.match(await page.locator('#timerWindReceipt').textContent(),/Pan reminder set for 2:00/);
   let before=await saved();await page.locator('#timerWindingLesson [data-timer-clear="pot"]').click();unchangedCook(before,await saved());assert.equal((await saved()).checkTimers.pot,null);assert.equal(await page.locator('#potTimerStatus').textContent(),'Not set');
   before=await saved();await page.locator('[data-clear-timer="pan"]').click();unchangedCook(before,await saved());assert.deepEqual((await saved()).checkTimers,{pot:null,pan:null});assert.equal(await page.locator('#timerWindPan').getAttribute('data-phase'),'not-set');
   await keyboardSet('pot',1);before=await saved();await page.locator('#timerWindingLesson [data-timer-inspect="pot"]').click();unchangedReminders(before,await saved());assert.equal(await page.locator('[data-bench="pot"]').getAttribute('aria-pressed'),'true');
  });

  await group('Advance and Run stop at the earliest reminder; simultaneous deadlines pause both vessels, and elapsed reminders do not block later clock steps.',async()=>{
   await load(R.start());await keyboardSet('pot',1);await keyboardSet('pan',2);await page.locator('#monitorTimeStep').selectOption('60');
   assert.equal(await page.locator('#timeStep').inputValue(),'60');await page.locator('#monitorAdvance').click();let after=await saved();assert.equal(after.current.time,15);assert.equal(after.current.log.at(-1).value,15);
   assert.equal(after.checkTimers.pot.status,'elapsed');assert.equal(after.checkTimers.pan.status,'waiting');assert.match(await page.locator('#timerNotice').textContent(),/Pot check time reached/);assert.equal(await page.locator('#timerWindPot .timer-wind-reading').textContent(),'LOOK AGAIN');
   await page.locator('#advance').click();assert.equal((await saved()).current.time,30);assert.match(await page.locator('#timerNotice').textContent(),/Pan check time reached/);await page.locator('#advance').click();assert.equal((await saved()).current.time,90);
   await load(R.start());await keyboardSet('pot',1);await keyboardSet('pan',2);await page.locator('#speed').selectOption('15');await page.locator('#play').click();
   await page.waitForFunction(key=>{const d=JSON.parse(localStorage.getItem(key));return d.current.time===15&&document.querySelector('#play').textContent==='Run kitchen';},storageKey,{timeout:20000});
   assert.equal((await saved()).checkTimers.pan.status,'waiting');await page.waitForTimeout(1150);assert.equal((await saved()).current.time,15);
   await keyboardSet('pot',1);await keyboardSet('pan',1);await page.locator('#monitorPlay').click();
   await page.waitForFunction(key=>{const d=JSON.parse(localStorage.getItem(key));return d.current.time===30&&document.querySelector('#play').textContent==='Run kitchen';},storageKey,{timeout:20000});
   after=await saved();assert.equal(after.checkTimers.pot.status,'elapsed');assert.equal(after.checkTimers.pan.status,'elapsed');assert.match(await page.locator('#timerNotice').textContent(),/Pot and Pan check time reached/);
   await page.waitForTimeout(1150);assert.equal((await saved()).current.time,30);assert.equal(await page.locator('#monitorPlay').textContent(),'Run kitchen');
  });

  await group('Reload restores pending reminders and a paused simulated clock; waiting real time changes nothing, and a fresh cook clears both reminders and winding drafts.',async()=>{
   await load(R.start());await keyboardSet('pot',4);await keyboardSet('pan',5);await page.locator('#timeStep').selectOption('5');await page.locator('#advance').click();const before=await saved();
   await page.waitForTimeout(1150);unchangedReminders(before,await saved());await page.reload({waitUntil:'domcontentloaded'});await mounted();unchangedReminders(before,await saved());
   assert.equal(await page.locator('#play').textContent(),'Run kitchen');assert.equal(await page.locator('#timeStep').inputValue(),'5');await open();assert.equal(await page.locator('#timerWindPot .timer-wind-reading').textContent(),'1:55');
   await keyboardStart('pot');await page.locator('#timerWindBegin').click();await page.locator('#timerWindWind').click();await page.locator('#newCook').click();
   const fresh=await saved();assert.equal(fresh.current.time,0);assert.equal(fresh.current.log.length,0);assert.deepEqual(fresh.checkTimers,{pot:null,pan:null});
   assert.equal(await page.locator('#timerWindKeyboardPanel').isVisible(),false);assert.equal(await canvas().getAttribute('data-check-timer-phase'),'idle');assert.equal(await page.locator('#timerNotice').textContent(),'');
  });

  await group('Serving and finished kitchens lock reminder edits; every replay prefix shows neutral historical timer readings without borrowing current or future reminders.',async()=>{
   for(const s of [serving(),recorded()]){await load(s);const before=await saved();await disabledLesson();await page.locator('#timerWindRelease').dispatchEvent('click');unchangedReminders(before,await saved());}
   const history=recorded(),future={pot:C.create(history.time,120),pan:C.create(history.time,300)};assert.ok(future.pot&&future.pan);await load(history,{timers:future});const before=await saved();
   await page.locator('#openRecipeReplay').click();
   for(const index of [0,1,Math.floor(history.log.length/2),history.log.length]){
    await page.locator('#recipeReplayStep').evaluate((e,i)=>{e.value=String(i);e.dispatchEvent(new Event('input',{bubbles:true}));},index);await disabledLesson();
    for(const station of stations){assert.equal(await page.locator('#timerWind'+(station==='pot'?'Pot':'Pan')).getAttribute('data-phase'),'view-only');assert.equal(await page.locator('#timerWind'+(station==='pot'?'Pot':'Pan')+' .timer-wind-reading').textContent(),'VIEW ONLY');}
    assert.equal(await page.locator('#timerWindingSummary').textContent(),'View only');assert.match(await page.locator('#timerWindReceipt').textContent(),/Current check reminders are hidden/);
    assert.equal(await page.locator('#checkTimers').isVisible(),false);assert.equal(await page.locator('.timer-bench-summary').isVisible(),false);assert.equal(await page.locator('#timerNotice').isVisible(),false);
    assert.equal(await canvas().getAttribute('data-check-timer-phase'),'idle');assert.equal(await canvas().getAttribute('data-check-timer-seconds'),'0');assert.deepEqual(await saved(),before);
   }
   await page.locator('button[data-view="timers"]').click();await page.locator('#recipeScene').scrollIntoViewIfNeeded();await page.locator('#recipeScene').screenshot({path:path.join(out,'replay-timers-neutral.png')});assert.deepEqual(await saved(),before);
   await page.locator('#closeRecipeReplay').click();assert.deepEqual(await saved(),before);
  });

  await group('Real 390px touch winds both faces with stable canvas bounds; the active coach stays below the timer faces and the lesson fits the phone.',async()=>{
   await create({width:390,height:900},true);await load(R.start('tomato',4));await view();let d=await preview('pot',2,true);
   const coach=await page.locator('.kitchen-gesture-coach[data-tool="timer-wind"]').boundingBox();assert.ok(coach,'Active timer coach is visible');
   const lower=await Promise.all(stations.map(station=>rim(station,Math.PI,.40)));assert.ok(coach.y>Math.max(...lower.map(p=>p.y))+8,'Phone coach covers a timer face');
   assert.equal(await page.locator('#gestureDetail').isVisible(),false);stableBox(d.box,await canvas().boundingBox());await audit('390px active touch timer coach');
   await page.locator('#recipeScene').screenshot({path:path.join(out,'phone-timer-preview.png')});await end(true);await phase('idle');setReminder(d.source,await saved(),'pot',30);
   await view();d=await wind('pan',4,true);assert.equal((await saved()).current.log.length,0);assert.equal((await saved()).current.time,0);stableBox(d.box,await canvas().boundingBox());
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await open();await page.locator('#timerWindingLesson').screenshot({path:path.join(out,'phone-timer-lesson.png')});
  });

  await group('Touch cancellation and a real second pointer discard timer previews; blur, resize and same-clock legacy edits keep only their intended external change.',async()=>{
   for(const stop of ['touchCancel','secondPointer','blur','resize','legacy']){
    await page.setViewportSize({width:390,height:900});await load(R.start());await view();const d=await preview('pan',3,true);
    if(stop==='touchCancel')await touch('touchCancel');
    if(stop==='secondPointer')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:d.p.x,y:d.p.y,id:1},{x:d.p.x+20,y:d.p.y+20,id:2}]});
    if(stop==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    if(stop==='resize')await page.setViewportSize({width:390,height:860});
    if(stop==='legacy')await legacySet('pot',15,true);
    await phase('idle');if(stop!=='touchCancel')await end(true);const after=await saved();unchangedCook(d.source,after);
    assert.deepEqual(after.checkTimers,stop==='legacy'?{pot:C.create(d.source.current.time,15),pan:null}:d.source.checkTimers);
   }
  });

  await group('At 320px in text view the complete keyboard winding path fits without horizontal overflow and remains accessible in forced colors.',async()=>{
   await page.setViewportSize({width:320,height:860});await load(R.start('tomato',4),{text:true});await keyboardSet('pot',1);await keyboardSet('pan',5,true);await page.emulateMedia({forcedColors:'active'});
   assert.equal(await page.locator('#recipeFallback').isVisible(),true);assert.equal(await page.locator('#timerWindTry').isVisible(),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.locator('#timerWindingLesson').screenshot({path:path.join(out,'compact-text-timers.png')});await audit('320px forced-colors text timer winding');
  });

  await group('Graphics loss clears the native timer preview and preserves both reminders and cooking evidence; the keyboard equivalent remains usable.',async()=>{
   await page.emulateMedia({forcedColors:'none'});await page.setViewportSize({width:390,height:900});await load(R.start());await view();const d=await preview('pot',2,true);
   await page.evaluate(()=>{const c=document.querySelector('#recipeScene > canvas'),gl=c.getContext('webgl2')||c.getContext('webgl'),extension=gl&&gl.getExtension('WEBGL_lose_context');if(!extension)throw Error('WebGL context-loss extension unavailable');extension.loseContext();});
   await page.locator('#recipeFallback').waitFor({state:'visible'});await end(true);unchangedReminders(d.source,await saved());assert.equal(await canvas().getAttribute('data-check-timer-held'),'');assert.equal(await canvas().getAttribute('data-check-timer-phase'),'idle');
   await keyboardSet('pan',2);assert.equal(await page.locator('#timerWindTry').isVisible(),false);await audit('Graphics-loss timer keyboard fallback');
  });

  result.groups=result.checks.length;assert.equal(result.groups,result.expectedGroups);assert.equal(result.accessibility.length,4);assert.deepEqual(result.errors,[]);result.pass=true;
 }catch(e){result.groups=result.checks.length;result.failure=e.stack;if(page)await page.screenshot({path:path.join(out,'timer-winding-failure.png'),fullPage:true}).catch(()=>{});throw e;}
 finally{fs.writeFileSync(path.join(out,'timer-winding-results.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
