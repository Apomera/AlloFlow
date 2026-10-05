/* Real elapsed handwashing controls: no mocked clock and no direct model actions in a gesture. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('@playwright/test');
const R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),fixture=require('./kitchen_recipe_fixture.cjs');
const out=path.resolve(process.env.KITCHEN_QA_OUT||'reports/kitchen-handwashing-2026-10-02/browser');
const url=process.env.KITCHEN_RECIPE_URL||'http://127.0.0.1:53061/stem_lab/kitchen_studio/recipe_lab.html?v=20261002-handwashing';
const visualOnly=process.env.KITCHEN_WASH_VISUAL_SMOKE==='1';
const phoneOnly=process.env.KITCHEN_WASH_QA_TAIL==='1';
const result={scope:phoneOnly?'phone-tail':visualOnly?'visual-smoke':'full',checks:[],errors:[],accessibility:[],activePractice:[]};
const sites={grip:{x:4.20,y:1.47,z:.72},sink:{x:4.20,y:1.47,z:-.05},soap:{x:3.76,y:1.47,z:.62},towel:{x:4.66,y:1.47,z:.62}};
fs.mkdirSync(out,{recursive:true});
function recordedCook(method='scene-wash'){
  let s=R.start('mushroom',2,'demonstrate');
  for(const [action,value] of fixture().steps)s=R.act(s,action,value,action==='wash'?method:undefined);
  assert.equal(s.plated,true);return R.submit({...s,answers:[0,0]});
}

(async()=>{
  const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});let page,cdp;
  try{
    const check=text=>{result.checks.push(text);fs.writeFileSync(path.join(out,'handwashing-progress.json'),JSON.stringify({...result,partial:true},null,2));console.log(text);};let before,d;
    const canvas=()=>page.locator('#recipeScene > canvas');
    const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('alloflow-kitchen-recipes-v1')).current);
    const phase=()=>canvas().getAttribute('data-wash-phase');
    const seconds=async()=>Number(await canvas().getAttribute('data-wash-active-seconds'));
    async function waitPhase(value){await page.waitForFunction(value=>document.querySelector('#recipeScene > canvas').dataset.washPhase===value,value);}
    async function create(viewport,touchMode=false){
      if(page)await page.context().close();
      const context=await browser.newContext({viewport,hasTouch:touchMode,isMobile:touchMode,reducedMotion:'reduce'});
      page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(120000);
      page.on('pageerror',e=>result.errors.push(e.message));
      await page.addInitScript(()=>{const seed=sessionStorage.getItem('handwashing-qa-seed');if(seed){localStorage.setItem('alloflow-kitchen-recipes-v1',seed);sessionStorage.removeItem('handwashing-qa-seed');}});
      await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('#handwashingLesson').waitFor({state:'attached'});cdp=await context.newCDPSession(page);
    }
    async function load(s,text=false){
      await page.evaluate(data=>sessionStorage.setItem('handwashing-qa-seed',JSON.stringify(data)),{version:1,current:s,history:[],textView:text});
      await page.reload({waitUntil:'domcontentloaded'});await page.locator('#handwashingLesson').waitFor({state:'attached'});
    }
    async function open(id='handwashingLesson'){
      if(!await page.locator('#'+id).evaluate(e=>e.open))await page.locator('#'+id+' > summary').click();
    }
    async function view(){
      await open();await page.locator('#washTry').click();await page.locator('#recipeScene').scrollIntoViewIfNeeded();
      assert.equal(await canvas().getAttribute('data-camera-view'),'wash');
    }
    async function project(at){
      return page.evaluate(at=>{
        const el=document.querySelector('#recipeScene > canvas'),b=el.getBoundingClientRect(),c=new THREE.PerspectiveCamera(38,b.width/b.height,.1,100);
        const target=new THREE.Vector3(4.20,1.55,.10),factor=Math.max(1,1.16/c.aspect),offset=new THREE.Vector3(.08*factor,2.35*factor,2.3*factor);
        if(offset.length()>13)offset.setLength(13);c.position.copy(target).add(offset);c.lookAt(target);c.updateMatrixWorld();
        const p=new THREE.Vector3(at.x,at.y,at.z).project(c);return {x:b.x+(p.x+1)*b.width/2,y:b.y+(1-p.y)*b.height/2,unit:b.height/420};
      },at);
    }
    const touch=(type,p)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p.x,y:p.y,id:1}]:[]});
    async function move(p,touchMode=false,steps=1){if(touchMode)await touch('touchMove',p);else await page.mouse.move(p.x,p.y,{steps});}
    async function travel(a,b,touchMode=false,steps=12){
      if(touchMode){for(let i=1;i<=steps;i++)await move({x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps},true);}
      else await move(b,false,steps);
    }
    async function end(touchMode=false){
      if(touchMode)await touch('touchEnd').catch(e=>{if(!e.message.includes('Must send a TouchStart'))throw e;});else await page.mouse.up();
    }
    async function start(touchMode=false){
      const before=await state(),a=await project(sites.grip),box=await canvas().boundingBox();
      if(touchMode)await touch('touchStart',a);else{await page.mouse.move(a.x,a.y);await page.mouse.down();}
      await waitPhase('wet');return {before,last:a,box};
    }
    async function stage(d,target,touchMode=false){
      const p=await project(sites[target]);await travel(d.last,p,touchMode);
      const down={x:p.x,y:p.y+26};await move(down,touchMode,3);await move(p,touchMode,3);
      assert.deepEqual(await state(),d.before);return {...d,last:p};
    }
    async function soaped(touchMode=false){
      let d=await stage(await start(touchMode),'sink',touchMode);await waitPhase('soap');
      d=await stage(d,'soap',touchMode);await waitPhase('scrub');
      const p=await project(sites.sink);await travel(d.last,p,touchMode);return {...d,last:p};
    }
    async function scrub(d,touchMode=false,options={}){
      const a=await project({...sites.sink,x:sites.sink.x-.05}),b=await project({...sites.sink,x:sites.sink.x+.05}),began=Date.now();let i=0,last=d.last;
      while(await phase()==='scrub'){
        assert.ok(Date.now()-began<100000,'Active scrub did not finish within 100 seconds.');
        last=i++%2?a:b;await move(last,touchMode);await page.waitForTimeout(90);
        if(options.photo&&!options.saved&&await seconds()>=4){await page.locator('#recipeScene').screenshot({path:path.join(out,options.photo)});options.saved=true;}
      }
      await waitPhase('rinse');const active=await seconds();assert.ok(active>=20,'At least 20 active seconds are required before rinsing.');
      assert.ok(Date.now()-began>=20000,'The exercise must use real elapsed practice time.');assert.deepEqual(await state(),d.before);
      result.activePractice.push({method:touchMode?'native-touch':'native-mouse',wallSeconds:(Date.now()-began)/1000,activeSeconds:active});
      return {...d,last};
    }
    async function complete(touchMode=false,release=true,photo){
      let d=await scrub(await soaped(touchMode),touchMode,{photo});
      d=await stage(d,'sink',touchMode);await waitPhase('dry');d=await stage(d,'towel',touchMode);await waitPhase('release');
      assert.deepEqual(await state(),d.before);
      const box=await canvas().boundingBox();for(const key of ['x','y','width','height'])assert.ok(Math.abs(box[key]-d.box[key])<1,'Canvas moved while holding hands: '+key);
      if(release){await end(touchMode);await waitPhase('idle');}return d;
    }
    function assertWash(before,after,method='scene-wash'){
      assert.deepEqual(after,R.act(before,'wash',undefined,method));assert.equal(after.log.length,before.log.length+1);
      assert.equal(after.log.at(-1).accepted,true);assert.equal(after.log.at(-1).interaction,method);assert.equal(after.prep.hands,true);
      assert.equal(after.time,before.time);assert.deepEqual(after.pot,before.pot);assert.deepEqual(after.pan,before.pan);
      assert.deepEqual(R.drying(after),R.drying(before));assert.equal(after.prep.rinsed,before.prep.rinsed);
    }
    async function keyboardStart(){
      await open();await page.locator('#washKeyboard').click();assert.equal(await page.locator('#washControl').evaluate(e=>e===document.activeElement),true);
    }
    async function keyboardCycle(){
      const before=await state();await keyboardStart();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
      const began=Date.now();await page.keyboard.down('Space');
      await page.waitForFunction(()=>document.querySelector('#handwashingLesson').dataset.washPhase==='rinse',undefined,{timeout:100000});
      await page.keyboard.up('Space');assert.ok(Date.now()-began>=20000);assert.deepEqual(await state(),before);
      result.activePractice.push({method:'keyboard',wallSeconds:(Date.now()-began)/1000});
      await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');assert.deepEqual(await state(),before);
      await page.keyboard.press('Enter');assertWash(before,await state(),'keyboard-wash');return before;
    }
    async function audit(name){
      await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
      const a=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}}));
      result.accessibility.push({name,violations:a.violations});assert.deepEqual(a.violations,[]);
    }

    if(!phoneOnly){
    await create({width:1440,height:1100});await load(R.start());before=await state();
    await open('produceRinsing');assert.equal(await page.locator('#rinseTry').isDisabled(),true);await page.locator('#rinseWashHands').click();
    assert.equal(await page.locator('#handwashingLesson').evaluate(e=>e.open),true);assert.deepEqual(await state(),before);
    await view();await page.locator('#recipeScene').screenshot({path:path.join(out,'desktop-handwashing-station.png')});
    check('The rinsing prerequisite opens the real handwashing lesson; opening its notebook and sink camera earns no preparation or cooking time.');

    if(!visualOnly){
      await start();await end();await waitPhase('idle');assert.deepEqual(await state(),before);
      await view();let d=await soaped();assert.equal(await canvas().getAttribute('data-wash-stream'),'false');
      const idleSeconds=await seconds();await page.waitForTimeout(2200);assert.equal(await seconds(),idleSeconds);
      for(let i=0;i<8;i++)await move(d.last);assert.equal(await seconds(),idleSeconds);
      await end();await waitPhase('idle');assert.deepEqual(await state(),before);
      check('Tapping, stationary contact, idle waiting and release after soap never replace the twenty active seconds or record washed hands.');
    }

    await view();d=await complete(false,false,'desktop-foam-and-active-scrub.png');assert.deepEqual(await state(),before);
    await end();await waitPhase('idle');assertWash(before,await state());before=await state();
    await page.mouse.up();assert.deepEqual(await state(),before);await open();assert.equal(await page.locator('#washTry').isDisabled(),true);
    assert.equal(await page.locator('#rinseTry').isDisabled(),false);await page.locator('#washRinseNext').click();
    assert.equal(await page.locator('#produceRinsing').evaluate(e=>e.open),true);assert.deepEqual(await state(),before);
    await open();await page.locator('#handwashingLesson').screenshot({path:path.join(out,'desktop-washed-hands-receipt.png')});
    await audit('Desktop handwashing');
    check('Wetting, pumping soap, rubbing every pose for twenty real active seconds, rinsing, drying and final release record exactly one canonical wash without touching produce water or cooking physics.');

    if(!visualOnly){
      for(const stop of ['escape','blur','external','resize']){
        await load(R.start());before=await state();await view();await soaped();
        if(stop==='escape')await page.keyboard.press('Escape');if(stop==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
        if(stop==='external')await page.locator('#potHeat').evaluate(e=>{e.value='1';e.dispatchEvent(new Event('change',{bubbles:true}));});
        if(stop==='resize')await page.setViewportSize({width:1440,height:1060});
        await waitPhase('idle');await end();assert.deepEqual(await state(),stop==='external'?R.act(before,'potHeat',1):before);
      }
      check('Escape, blur, external heat changes and resizing cancel unfinished native washing without stale preparation evidence.');

      await load(R.start(),true);before=await state();await keyboardStart();
      await page.keyboard.press('Enter');await page.locator('#washControl').dispatchEvent('keydown',{key:'ArrowDown',repeat:true});assert.deepEqual(await state(),before);
      await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.down('Space');await page.waitForTimeout(1300);await page.keyboard.up('Space');
      const partial=await page.locator('#handwashingLesson').getAttribute('data-wash-active-seconds');await page.waitForTimeout(1000);
      assert.equal(await page.locator('#handwashingLesson').getAttribute('data-wash-active-seconds'),partial);await page.keyboard.press('Escape');assert.deepEqual(await state(),before);
      await keyboardCycle();before=await state();await page.keyboard.press('Enter');assert.deepEqual(await state(),before);
      check('Keyboard washing requires real held-Space practice and every wet, soap, rinse, dry and release stage; repeated keys, early Enter, idle time and duplicate finish earn nothing.');
    }

    }
    await create({width:390,height:900},true);await load(R.start('tomato',4));before=await state();await view();
    await page.locator('#recipeScene').screenshot({path:path.join(out,'phone-handwashing-station.png')});
    await complete(true,true,'phone-foam-and-active-scrub.png');assertWash(before,await state());
    await open();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await audit('390px touch handwashing');
    check('Real phone touch movement completes the same twenty-second handwashing sequence for four-serving tomatoes, with no horizontal overflow or changed recipe quantities.');

    if(!visualOnly){
      for(const stop of ['touchCancel','secondPointer']){
        await load(R.start());before=await state();await view();d=await soaped(true);
        if(stop==='touchCancel')await touch('touchCancel');
        else await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:d.last.x,y:d.last.y,id:1},{x:d.last.x+25,y:d.last.y+25,id:2}]});
        await waitPhase('idle');if(stop!=='touchCancel')await end(true);assert.deepEqual(await state(),before);
      }
      check('Cancelled touches and a second finger return the hands and water without recording a partial wash.');
    }

    await page.setViewportSize({width:320,height:860});await load(R.start(),true);before=await state();await keyboardStart();
    await page.emulateMedia({forcedColors:'active'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.locator('#handwashingLesson').screenshot({path:path.join(out,'compact-text-handwashing.png')});await audit('320px forced-colors text handwashing');
    assert.deepEqual(await state(),before);await page.keyboard.press('Escape');
    check('At 320px, forced-colors text view retains the full handwashing lesson, readable keyboard instructions and an accessible practice control.');

    if(!visualOnly){
      await page.emulateMedia({forcedColors:'none'});
      for(const [method,full] of [[undefined,false],['scene-wash',true],['keyboard-wash',true]]){
        await load(R.act(R.start(),'wash',undefined,method));before=await state();await open();
        assert.equal(await page.locator('#washKeyboard').isDisabled(),true);
        assert.match(await page.locator('#washObservation').textContent(),full?/20|twenty/i:/simplified|no.*sequence|not.*recorded/i);assert.deepEqual(await state(),before);
      }
      const recorded=recordedCook(),index=recorded.log.findIndex(e=>e.action==='wash')+1;await load(recorded);before=await state();
      await page.locator('#openRecipeReplay').click();await open();
      for(const step of [index-1,index]){
        await page.locator('#recipeReplayStep').evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));},step);
        assert.equal(await page.locator('#washKeyboard').isDisabled(),true);assert.equal(await page.locator('#washTry').isDisabled(),true);assert.deepEqual(await state(),before);
        const observation=await page.locator('#washObservation').textContent();
        if(step<index)assert.doesNotMatch(observation,/completed.*20|recorded.*20|20.*recorded/i);
        else assert.match(observation,/20|twenty/i);
      }
      await load(R.startRescue('dry',0,'practice'));before=await state();await open();assert.equal(await page.locator('#washKeyboard').isDisabled(),true);assert.deepEqual(await state(),before);
      check('Simplified washes stay distinct from a recorded full practice, historical prefixes reveal no future handwashing proof, and supplied rescue meals stay read-only.');
    }

    assert.deepEqual(result.errors,[]);result.pass=true;
  }catch(e){result.failure=e.stack;if(page)await page.screenshot({path:path.join(out,'handwashing-failure.png'),fullPage:true}).catch(()=>{});throw e;}
  finally{fs.writeFileSync(path.join(out,'handwashing-results.json'),JSON.stringify(result,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

// Phone-tail mode preserves completed desktop evidence after a preview navigation interruption.
