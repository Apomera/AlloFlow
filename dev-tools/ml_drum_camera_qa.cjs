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
  async function inspectDrum(progress,keyboard=false){
    const button=pg.getByRole('button',{name:'Show the drum and lifting rope',exact:true});
    await pg.evaluate(()=>{window.__qaDrumScene=window.__qaShop.model;window.__qaFocus=window.__qaShop.data.focusMechanism;});
    if(keyboard)await button.press('Enter');else await button.click();
    await checkPose(progress);
    const valid=await pg.evaluate(()=>{
      const s=window.__qaShop;
      return s.model===window.__qaDrumScene && s.data.focusMechanism===window.__qaFocus && s.data.rotY===72 && s.data.rotX===16 && s.data.zoom===1.18;
    });
    if(!valid||await button.getAttribute('aria-pressed')!=='true')errors.push('Drum preset changed the model/pose or did not select');
  }
  async function mount(bench,extra={}){
    await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench,pulleySegments:6,...extra}),theme]);
    await bay.scrollIntoViewIfNeeded();await pg.waitForTimeout(350);
  }
  for(const [handleR,drumR] of [[0.05,0.02],[0.45,0.1],[1,0.5],[0.05,0.5],[1,0.02],[0.45,0.25]]){
    await mount('windlass',{windlassHandleR:handleR,windlassDrumR:drumR,shopFocusMechanism:true,shopRotY:24});
    for(const [name,progress] of [['Halfway',0.5],['Full stroke',1]]){
      await inspector.getByRole('button',{name,exact:true}).click();await checkPose(progress);await inspectDrum(progress);
      const valid=await pg.evaluate(()=>{
        const d=window.__qaShop.mlDemo;return d.drumRotor.rotation.z===d.motion.rotation.z&&d.drumStripes.length===2;
      });if(!valid)errors.push('Rotor is not coupled');
      const label='windlass-'+handleR+'-'+drumR+'-'+Math.round(progress*100);
      await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,label+'.png')});manifest.push(label);
    }
  }
  for(const progress of [0,0.25,0.5,0.75,1]){
    await mount('windlass',{shopMotionProgress:progress,shopFocusMechanism:false,shopRotY:24});await checkPose(progress);await inspectDrum(progress,true);
    const label='windlass-side-'+Math.round(progress*100);await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,label+'.png')});manifest.push(label);
  }
  await mount('windlass',{shopFocusMechanism:true,shopMotionProgress:0.25,shopRotY:196});await checkPose(0.25);
  await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,'windlass-rear.png')});manifest.push('windlass-rear');
  for(const width of [390,320])for(const bench of ['windlass']){
    await pg.setViewportSize({width,height:1100});await mount(bench);
    await inspector.getByRole('button',{name:'Halfway',exact:true}).click();await checkPose(0.5);
    await pg.getByRole('button',{name:'Show a close three-quarter view',exact:true}).click();await checkPose(0.5);
    await inspectDrum(0.5,true);
    await pg.getByRole('button',{name:'Turn left',exact:true}).click();await checkPose(0.5);
    if(await pg.getByRole('button',{name:'Show the drum and lifting rope',exact:true}).getAttribute('aria-pressed')!=='false')errors.push('Drum selection did not clear after orbit');
    await inspectDrum(0.5);
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
  await pg.emulateMedia({reducedMotion:'reduce'});await mount('windlass');
  await inspector.getByRole('button',{name:'Halfway',exact:true}).click();await checkPose(0.5);
  await inspectDrum(0.5,true);
  const before=await pg.evaluate(()=>window.__qaShop.mlDemo.drumRotor.rotation.z);
  await pg.waitForTimeout(300);const after=await pg.evaluate(()=>window.__qaShop.mlDemo.drumRotor.rotation.z);
  if(before!==after || Math.abs(after-Math.PI)>1e-8)errors.push('Reduced-motion inspection drifted');
  await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,'reduced-motion-windlass.png')});
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
  if(await pg.getByRole('button',{name:'Show the drum and lifting rope',exact:true}).count())errors.push('Drum preset leaked to next station');
  checks.push('Next station starts at rest; drum preset is station-specific');
  fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({ready,errors,overflow,shots:manifest,checks},null,2));
  await b.close();if(errors.length||overflow)process.exitCode=1;
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
