// Real-host motion-inspection review. Uses the same vendored renderer as ml_scene_shots.
const fs=require('fs'),path=require('path'),vm=require('vm');
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');
source=source.slice(0,source.indexOf('  const manifest = [];'));
source=source.replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2] || '.');");
source=source.replace('deviceScaleFactor: 2','deviceScaleFactor: 1');
source=source.replace("const tool = read('stem_lab/stem_tool_machinelab.js');","const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildSimpleMachineScene','build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}');");
source+=String.raw`
  const manifest=[],checks=[];let overflow=false;
  const theme={dark:DARK||CONTRAST,contrast:CONTRAST,band:BAND};
  const bay=pg.locator('.ml-shop-bay'),inspector=pg.locator('.ml-shop-inspector');
  async function checkPose(progress){
    await bay.scrollIntoViewIfNeeded();
    await pg.waitForFunction(p=>{
      const s=window.__qaShop,d=s&&s.mlDemo;
      return d && s.data.static && s.data.motionProgress===p && Math.abs(d.effortDot.position.x-(d.effortStartX+(d.effortEndX-d.effortStartX)*p))<1e-8;
    },progress,{timeout:15000});
  }
  async function mount(bench,extra={}){
    await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench,pulleySegments:6,...extra}),theme]);
    await bay.scrollIntoViewIfNeeded();await pg.waitForTimeout(350);
  }
  const focus=pg.getByRole('button',{name:'Focus mechanism',exact:true});
  async function setFocus(on,keyboard=false){
    const pressed=await focus.getAttribute('aria-pressed');
    if((pressed==='true')!==on){if(keyboard)await focus.press('Space');else await focus.click();}
    await bay.scrollIntoViewIfNeeded();
    await pg.waitForFunction(on=>window.__qaShop.mlDemo.room.visible===!on,on);
    await pg.waitForFunction(()=>Math.abs(window.__qaShop.mlDemo.loadDot.quaternion.dot(window.__qaShop.camera.quaternion))>0.9999);
  }
  for(const bench of ['lever','pulley','windlass','ramp','wedge','screw']){
    await mount(bench,{shopMotionProgress:0.5});await checkPose(0.5);
    await pg.evaluate(()=>{window.__focusDemo=window.__qaShop.mlDemo;window.__focusPose=window.__qaShop.mlDemo.motion.position.toArray();});
    await setFocus(true);await checkPose(0.5);
    const unchanged=await pg.evaluate(()=>window.__focusDemo===window.__qaShop.mlDemo&&JSON.stringify(window.__focusPose)===JSON.stringify(window.__qaShop.mlDemo.motion.position.toArray()));
    if(!unchanged)errors.push('Focus rebuilt or moved '+bench);
    const label=bench+'-focus';await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,label+'.png')});
    await pg.locator('canvas').first().screenshot({path:path.join(OUT,label+'-detail.png')});manifest.push(label);
    await setFocus(false);await checkPose(0.5);
    await mount(bench,{shopMotionProgress:0.5,shopFocusMechanism:true,shopRotY:196});await checkPose(0.5);
    await pg.waitForFunction(()=>!window.__qaShop.mlDemo.room.visible);
    await pg.waitForFunction(()=>Math.abs(window.__qaShop.mlDemo.loadDot.quaternion.dot(window.__qaShop.camera.quaternion))>0.9999);
    const rear=bench+'-focus-rear';await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,rear+'.png')});manifest.push(rear);
  }
  for(const width of [390,320])for(const bench of ['pulley','wedge']){
    await pg.setViewportSize({width,height:1100});await mount(bench);
    await inspector.getByRole('button',{name:'Halfway',exact:true}).click();await checkPose(0.5);
    await setFocus(true,true);await checkPose(0.5);
    await pg.getByRole('button',{name:'Show a close three-quarter view',exact:true}).click();await checkPose(0.5);
    await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,'mobile-'+bench+'-'+width+'.png')});
    overflow=overflow||await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    const clear=await pg.evaluate(()=>{
      const a=document.querySelector('.ml-shop-bay').getBoundingClientRect(),b=document.querySelector('.ml-shop-hud').getBoundingClientRect(),c=document.querySelector('.ml-shop-legend').getBoundingClientRect();
      return b.bottom<=a.top+1 && c.top>=a.bottom-1;
    });
    if(!clear)errors.push('Overlapping mobile controls at '+width+' '+bench);
    await inspector.getByRole('slider').press('End');await checkPose(1);
    await inspector.getByRole('slider').press('Home');await checkPose(0);
    await inspector.getByRole('slider').press('ArrowRight');await checkPose(0.01);
    await setFocus(false,true);await checkPose(0.01);
    checks.push('Keyboard focus toggle and held camera pose: '+bench+' '+width);
  }
    await pg.setViewportSize({width:1180,height:1500});
  await mount('lever',{shopFocusMechanism:true,shopMotionProgress:0.5,leverEffortArm:0.2,leverLoadArm:4});await checkPose(0.5);
  await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,'reverse-trade.png')});manifest.push('reverse-trade');
  await mount('pulley',{shopFocusMechanism:true,shopMotionProgress:0.5,pulleySegments:1});await checkPose(0.5);
  await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,'equal-trade.png')});manifest.push('equal-trade');
  await pg.locator('canvas').evaluate(el=>{el.style.filter='grayscale(1)';});
  await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,'equal-trade-grayscale.png')});manifest.push('equal-trade-grayscale');
  await pg.emulateMedia({reducedMotion:'reduce'});await mount('screw');await setFocus(true);
  await inspector.getByRole('button',{name:'Halfway',exact:true}).click();await checkPose(0.5);
  const before=await pg.evaluate(()=>window.__qaShop.mlDemo.pressShoe.position.y);
  await pg.waitForTimeout(300);const after=await pg.evaluate(()=>window.__qaShop.mlDemo.pressShoe.position.y);
  if(before!==after || Math.abs(after+(await pg.evaluate(()=>window.__qaShop.mlDemo.screwTravel*0.5)))>1e-8)errors.push('Reduced-motion inspection drifted');
  await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,'reduced-motion-screw.png')});
  checks.push('Reduced motion holds half stroke');
  const timerSafe=await pg.evaluate(()=>{
    const original=window.setTimeout,timers=[];
    window.setTimeout=function(fn,delay){if(delay===2300){timers.push(fn);return -1;}return original.apply(this,arguments);};
    try{
      const run=()=>document.querySelector('button[aria-label^="Run the three-dimensional"]').click();
      const half=()=>[...document.querySelectorAll('.ml-shop-inspector button')].find(b=>b.textContent==='Halfway').click();
      run();half();run();if(timers.length!==2)return false;
      timers[0]();const stillRunning=document.querySelector('#ml-shop-stroke').disabled;
      timers[1]();return stillRunning&&!document.querySelector('#ml-shop-stroke').disabled;
    }finally{window.setTimeout=original;}
  });
  if(!timerSafe)errors.push('Old demo timer interrupted newer run');
  checks.push('Old timer cannot interrupt newer run');
  await pg.getByRole('button',{name:/^Next station:/}).click();await bay.scrollIntoViewIfNeeded();
  await pg.waitForFunction(()=>window.__qaShop.data.motionProgress===null&&window.__qaShop.data.demoId===0&&window.__qaShop.mlDemo.effortDot.position.x===window.__qaShop.mlDemo.effortStartX);
  await pg.waitForFunction(()=>window.__qaShop.data.focusMechanism&&!window.__qaShop.mlDemo.room.visible);
  checks.push('Next station starts at rest and retains focus preference');
  fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({ready,errors,overflow,shots:manifest,checks},null,2));
  await b.close();if(errors.length||overflow)process.exitCode=1;
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
