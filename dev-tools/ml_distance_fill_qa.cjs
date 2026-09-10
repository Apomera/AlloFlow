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
    await checkFills(progress);
  }
  async function checkFills(progress){
    const valid=await pg.evaluate(p=>{
      const d=window.__qaShop.mlDemo;
      return [[d.effortFill,d.effortDot,d.effortStartX],[d.loadFill,d.loadDot,d.loadStartX]].every(([f,dot,start])=>{
        const half=f.geometry.parameters.width*f.scale.x/2;
        return f.visible===(p>0) && Math.abs(f.position.x-half-start)<1e-8 && Math.abs(f.position.x+half-dot.position.x)<1e-8;
      });
    },progress);
    if(!valid)errors.push('Traveled fill differs from marker at '+progress);
  }
  async function mount(bench,extra={}){
    await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench,pulleySegments:6,...extra}),theme]);
    await bay.scrollIntoViewIfNeeded();await pg.waitForTimeout(350);
  }
  for(const bench of ['lever','pulley','windlass','ramp','wedge','screw']){
    await mount(bench,{shopFocusMechanism:true});
    for(const [name,progress] of [['Start',0],['Halfway',0.5],['Full stroke',1]]){
      await inspector.getByRole('button',{name,exact:true}).click();await checkPose(progress);
      const label=bench+'-'+Math.round(progress*100);
      await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,label+'.png')});manifest.push(label);
    }
  }
  for(const [label,extra] of [['reverse',{leverEffortArm:0.2,leverLoadArm:4}],['equal',{leverEffortArm:2,leverLoadArm:2}],['tiny-load',{leverEffortArm:4,leverLoadArm:0.2}]]){
    await mount('lever',{...extra,shopFocusMechanism:true,shopMotionProgress:0.25});await checkPose(0.25);
    await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,label+'.png')});manifest.push(label);
  }
  await mount('pulley',{pulleySegments:6,shopFocusMechanism:true,shopMotionProgress:0.5,shopRotY:196});await checkPose(0.5);
  await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,'pulley-rear.png')});manifest.push('pulley-rear');
  for(const width of [390,320])for(const bench of ['lever','pulley','windlass','ramp','wedge','screw']){
    await pg.setViewportSize({width,height:1100});await mount(bench);
    await inspector.getByRole('button',{name:'Halfway',exact:true}).click();await checkPose(0.5);
    await pg.getByRole('button',{name:'Show a close three-quarter view',exact:true}).click();await checkPose(0.5);
    const pitch=await pg.evaluate(()=>window.__qaShop.data.rotX);if(pitch!==(bench==='screw'?32:12))errors.push('Wrong Close view tilt for '+bench);
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
    checks.push('Keyboard and held camera pose: '+bench+' '+width);
  }
  await pg.emulateMedia({reducedMotion:'reduce'});await mount('pulley');
  await inspector.getByRole('button',{name:'Halfway',exact:true}).click();await checkPose(0.5);
  const before=await pg.evaluate(()=>window.__qaShop.mlDemo.motion.position.y);
  await pg.waitForTimeout(300);const after=await pg.evaluate(()=>window.__qaShop.mlDemo.motion.position.y);
  if(before!==after || Math.abs(after-(await pg.evaluate(()=>window.__qaShop.mlDemo.pulleyLift*0.5)))>1e-8)errors.push('Reduced-motion inspection drifted');
  await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,'reduced-motion-pulley.png')});
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
  checks.push('Next station starts at rest');
  fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({ready,errors,overflow,shots:manifest,checks},null,2));
  await b.close();if(errors.length||overflow)process.exitCode=1;
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
