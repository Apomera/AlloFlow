const fs=require('fs'),path=require('path'),vm=require('vm');
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');source=source.slice(0,source.indexOf('  const manifest = [];')).replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2] || '.');").replace('deviceScaleFactor: 2','deviceScaleFactor: 1');
source=source.replace("const tool = read('stem_lab/stem_tool_machinelab.js');","const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildSimpleMachineScene','build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}');");
source+=String.raw`
const checks=[],shots=[];let overflow=false;const theme={dark:DARK||CONTRAST,contrast:CONTRAST,band:BAND};
const bay=pg.locator('.ml-shop-bay'),hold=pg.getByRole('button',{name:'Hold this pose',exact:true}),run=pg.getByRole('button',{name:/^Run the three-dimensional/});
await pg.evaluate(()=>{window.__qaTimers=[];const original=window.setTimeout;window.setTimeout=function(fn,delay){const id=original.apply(this,arguments);if(delay===2300||delay===6700)window.__qaTimers.push({fn,delay,id});return id;};});
async function mount(kind,extra={}){await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,shopStartOutline:true,shopFocusMechanism:true,shopSlowMotion:true,...extra}),theme]);await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(()=>!!window.__qaShop.mlDemo.startLinks);await checkHeader(kind);}
async function checkHeader(kind){
 const state=await pg.evaluate(()=>{const h=document.querySelector('.ml-shop-hud'),b=document.querySelector('.ml-shop-bay'),r=h.getBoundingClientRect();return {clear:r.bottom+4<=b.getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth,clipped:Array.from(h.querySelectorAll('div')).some(n=>n.scrollWidth>n.clientWidth+1),size:parseFloat(getComputedStyle(h.children[1]).fontSize),icon:h.querySelector('[data-ml-bench-preview]').getAttribute('data-ml-bench-preview')};});
 if(!state.clear||state.overflow||state.clipped||state.size<12||state.icon!==kind)errors.push('Header layout '+kind+': '+JSON.stringify(state));checks.push('Header clear of model, readable, unclipped and matching '+kind+' at '+pg.viewportSize().width);
}
try{
 await pg.setViewportSize({width:1150,height:1000});
 for(const kind of ['lever','pulley','windlass','ramp','wedge','screw']){
  await mount(kind);if(!await hold.isDisabled())errors.push(kind+': idle hold enabled');await run.click();
  await pg.waitForFunction(()=>{const s=window.__qaShop;return s.data.demoId>0&&performance.now()-s.mlDemoT0>850;});
  // Dispatch synchronously between animation frames to compare the exact visible pose.
  const before=await pg.evaluate(()=>{const s=window.__qaShop;s.model.updateMatrixWorld(true);window.__qaModel=s.model;const pose=[s.mlDemo.motion,...s.mlDemo.startLinks.map(r=>r.load),s.mlDemo.effortDot,s.mlDemo.loadDot].map(o=>o.matrixWorld.toArray());Array.from(document.querySelectorAll('.ml-shop-inspector button')).find(b=>b.textContent==='Hold this pose').click();return pose;});
  await pg.waitForFunction(()=>window.__qaShop.data.static&&document.activeElement.id==='ml-shop-stroke');
  await bay.scrollIntoViewIfNeeded();
  const stable=await pg.evaluate(before=>{const s=window.__qaShop;s.tick(performance.now()+9000);s.model.updateMatrixWorld(true);const pose=[s.mlDemo.motion,...s.mlDemo.startLinks.map(r=>r.load),s.mlDemo.effortDot,s.mlDemo.loadDot].map(o=>o.matrixWorld.toArray());return s.model===window.__qaModel&&JSON.stringify(pose)===JSON.stringify(before)&&s.data.motionProgress>0&&s.data.motionProgress<1;},before);
  if(!stable)errors.push(kind+': hold jumped or rebuilt the model');
  if(!await hold.isDisabled())errors.push(kind+': hold enabled after stop');
  await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,'held-'+kind+'.png')});shots.push('held-'+kind);
  await run.click();await pg.waitForFunction(()=>window.__qaShop.data.demoId>0);
  const safe=await pg.evaluate(()=>{const pair=window.__qaTimers.slice(-2);clearTimeout(pair[0].id);pair[0].fn();const running=document.querySelector('#ml-shop-stroke').disabled;clearTimeout(pair[1].id);pair[1].fn();return running&&!document.querySelector('#ml-shop-stroke').disabled;});if(!safe)errors.push(kind+': stale cleanup stopped restarted demo');
  checks.push(kind+': exact pose, persistent hold, focus handoff, model identity and restart timer isolation');
 }
 for(const width of [390,320]){
  await pg.setViewportSize({width,height:1000});await mount('windlass');await run.click();await hold.focus();await hold.press('Space');
  await pg.waitForFunction(()=>window.__qaShop.data.static&&document.activeElement.id==='ml-shop-stroke');await bay.scrollIntoViewIfNeeded();
  await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,'held-'+width+'.png')});shots.push('held-'+width);
  overflow=overflow||await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth);checks.push('Keyboard hold and slider focus at '+width);
 }
 for(const width of [720,600]){await pg.setViewportSize({width,height:1000});for(const kind of ['lever','pulley','windlass','ramp','wedge','screw']){await mount(kind);if(kind==='windlass'){await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,'header-'+width+'.png')});shots.push('header-'+width);}}}
 await mount('screw',{motionPref:'off'});await run.click();await pg.waitForFunction(()=>window.__qaShop.mlDemo.motion.rotation.y!==0);await hold.click();await pg.waitForFunction(()=>window.__qaShop.data.static&&window.__qaShop.data.motionProgress===1);checks.push('Motion-off full pose can be held');
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({errors,overflow,shots,checks},null,2));if(errors.length||overflow)process.exitCode=1;
}catch(error){const diagnostic=await pg.evaluate(()=>({active:document.activeElement?.outerHTML,bay:document.querySelector('.ml-shop-bay')?.getBoundingClientRect().toJSON(),viewport:innerHeight,visible:window.__qaShop?.visible,data:window.__qaShop?.data?{demoId:window.__qaShop.data.demoId,static:window.__qaShop.data.static,motionProgress:window.__qaShop.data.motionProgress,kind:window.__qaShop.data.kind}:null,buttons:Array.from(document.querySelectorAll('.ml-shop-world button')).map(b=>({text:b.textContent,disabled:b.disabled})),timers:window.__qaTimers.map(t=>({delay:t.delay,id:t.id}))}));fs.writeFileSync(path.join(OUT,'diagnostic.json'),JSON.stringify(diagnostic,null,2));await pg.screenshot({path:path.join(OUT,'timeout.png')});throw error;}finally{await b.close();}
})();`;vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
