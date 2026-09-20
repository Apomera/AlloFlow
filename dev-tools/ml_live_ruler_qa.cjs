const fs=require('fs'),path=require('path'),vm=require('vm');
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');source=source.slice(0,source.indexOf('  const manifest = [];')).replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2] || '.');").replace('deviceScaleFactor: 2','deviceScaleFactor: 1');
source=source.replace("const tool = read('stem_lab/stem_tool_machinelab.js');","const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildSimpleMachineScene','build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}');");
source=source.replace('return cfg.render(ctx);','window.__qaRenderCount=(window.__qaRenderCount||0)+1;return cfg.render(ctx);');
source+=String.raw`
const checks=[],shots=[];let overflow=false;const theme={dark:DARK||CONTRAST,contrast:CONTRAST,band:BAND};
const bay=pg.locator('.ml-shop-bay'),slider=pg.locator('#ml-shop-stroke'),run=pg.getByRole('button',{name:/^Run the three-dimensional/}),hold=pg.getByRole('button',{name:'Hold this pose',exact:true});
function check(ok,label){checks.push(label);if(!ok)errors.push(label);}
await pg.evaluate(()=>{window.__qaTimers=[];const original=window.setTimeout;window.setTimeout=function(fn,delay){if(delay===2300||delay===6700){window.__qaTimers.push({fn,delay});return 0;}return original.apply(this,arguments);};});
async function mount(kind,extra={}){await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,shopFocusMechanism:true,shopSlowMotion:true,...extra}),theme]);await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(kind=>window.__qaShop&&window.__qaShop.mlDemo.kind===kind,kind);}
async function setPhase(fraction){await pg.evaluate(fraction=>{const s=window.__qaShop;if(!s.__realTick)s.__realTick=s.tick;s.__phaseTime=s.mlDemoT0+s.data.demoDuration*fraction;s.tick=function(){return s.__realTick(s.__phaseTime);};s.tick();},fraction);}
async function start(){await run.click();await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(()=>window.__qaShop.data.demoId>0);await setPhase(0);}
async function read(){return slider.evaluate(el=>({value:Number(el.value),text:el.getAttribute('aria-valuetext'),fill:el.style.getPropertyValue('--ml-stroke-fill'),readout:document.querySelector('[data-ml-stroke-readout]').textContent,disabled:el.disabled,phase:document.querySelector('.ml-demo-phase')?.getAttribute('data-ml-demo-phase')}));}
async function checkPose(expected,label,running=true){const r=await read();check(r.value===expected&&r.fill===expected+'%'&&r.readout===expected+'%'&&r.text===expected+'% of the working stroke'&&r.disabled===running,label+': '+JSON.stringify(r));}
async function shot(name){await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,name+'.png')});shots.push(name);overflow=overflow||await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth);}
try{
 await pg.setViewportSize({width:1150,height:1000});
 for(const kind of ['lever','pulley','windlass','ramp','wedge','screw']){
  await mount(kind);await checkPose(0,kind+' idle',false);await start();
  for(const f of [0,.1,.25,.5,.75,.9,1]){await setPhase(f);const wave=Math.sin(f*Math.PI),expected=Math.round(wave*wave*(3-2*wave)*100);await checkPose(expected,kind+' at cycle '+f);check((await read()).phase===(f>.5?'return':'work'),kind+' phase '+f);}
  const quiet=await pg.evaluate(()=>{const s=window.__qaShop,count=window.__qaRenderCount,readout=document.querySelector('[data-ml-stroke-readout]'),observer=new MutationObserver(()=>{});observer.observe(readout,{childList:true,characterData:true,subtree:true});for(let i=0;i<20;i++)s.tick();const unchanged=!observer.takeRecords().length;observer.disconnect();return {renders:window.__qaRenderCount===count,unchanged,notLive:!readout.closest('[aria-live], [role=status], [role=alert]')};});check(quiet.renders&&quiet.unchanged&&quiet.notLive,kind+': no React render or duplicate readout writes; no numeric live region');
  await setPhase(.25);await pg.getByRole('button',{name:'Show the machine from the side',exact:true}).click();await bay.scrollIntoViewIfNeeded();await checkPose(79,kind+' camera preserves live ruler');await shot('live-'+kind);
  await hold.click();await pg.waitForFunction(()=>window.__qaShop.data.static&&document.activeElement.id==='ml-shop-stroke');await checkPose(79,kind+' exact hold',false);
  await slider.press('ArrowRight');await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(()=>window.__qaShop.data.motionProgress===.8);await checkPose(80,kind+' keyboard resumes after hold',false);
  await pg.evaluate(()=>window.__qaTimers.at(-1).fn());await checkPose(80,kind+' expired timer cannot reset held ruler',false);
  await start();await setPhase(.5);await checkPose(100,kind+' replay full stroke');await pg.evaluate(()=>window.__qaTimers.at(-1).fn());await checkPose(0,kind+' completion resets ruler',false);
 }
 for(const width of [390,320]){
  await pg.setViewportSize({width,height:1000});await mount('windlass',{shopSlowMotion:false});await start();await setPhase(.1);await checkPose(23,width+' normal speed outgoing');await shot('live-'+width);
  await setPhase(.9);await checkPose(23,width+' normal speed returning');await hold.click();await checkPose(23,width+' held',false);await shot('held-'+width);
  await start();await pg.locator('#ml-bench-tab-lever').click();await checkPose(0,width+' station change clears ruler',false);
 }
 await mount('screw',{motionPref:'off'});await start();await checkPose(100,'Motion off: full pose');await hold.click();await checkPose(100,'Motion off: hold',false);await shot('motion-off-320');
 if(CONTRAST){await pg.emulateMedia({forcedColors:'active'});await mount('pulley');await start();await setPhase(.25);await checkPose(79,'Forced colors: live pose');const colors=await slider.evaluate(el=>{const s=getComputedStyle(el);return s.getPropertyValue('--ml-stroke-ink').trim()==='Highlight'&&s.getPropertyValue('--ml-stroke-rest').trim()==='Canvas';});check(colors,'Forced colors: system ruler colors');await shot('forced-colors-live-320');}
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({errors,overflow,checks,shots},null,2));if(errors.length||overflow)process.exitCode=1;
}finally{await b.close();}
})();`;vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
