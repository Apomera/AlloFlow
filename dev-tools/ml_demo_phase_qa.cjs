const fs=require('fs'),path=require('path'),vm=require('vm');
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');source=source.slice(0,source.indexOf('  const manifest = [];')).replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2] || '.');").replace('deviceScaleFactor: 2','deviceScaleFactor: 1');
source=source.replace("const tool = read('stem_lab/stem_tool_machinelab.js');","const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildSimpleMachineScene','build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}');");
source+=String.raw`
const checks=[],shots=[];let overflow=false;const theme={dark:DARK||CONTRAST,contrast:CONTRAST,band:BAND};
const bay=pg.locator('.ml-shop-bay'),phase=pg.locator('.ml-demo-phase'),run=pg.getByRole('button',{name:/^Run the three-dimensional/}),hold=pg.getByRole('button',{name:'Hold this pose',exact:true});
function check(ok,label){checks.push(label);if(!ok)errors.push(label);}
await pg.evaluate(()=>{window.__qaTimers=[];const original=window.setTimeout;window.setTimeout=function(fn,delay){if(delay===2300||delay===6700){window.__qaTimers.push({fn,delay});return 0;}return original.apply(this,arguments);};});
async function mount(kind,extra={}){await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,shopFocusMechanism:true,shopSlowMotion:true,...extra}),theme]);await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(kind=>window.__qaShop&&window.__qaShop.mlDemo.kind===kind,kind);}
async function setPhase(fraction){await pg.evaluate(fraction=>{const s=window.__qaShop;if(!s.__realTick)s.__realTick=s.tick;s.__phaseTime=s.mlDemoT0+s.data.demoDuration*fraction;s.tick=function(){return s.__realTick(s.__phaseTime);};s.tick();},fraction);}
async function start(){await run.click();await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(()=>window.__qaShop.data.demoId>0);await setPhase(.25);}
async function shot(name){await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,name+'.png')});shots.push(name);overflow=overflow||await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth);}
try{
 await pg.setViewportSize({width:1150,height:1000});
 for(const kind of ['lever','pulley','windlass','ramp','wedge','screw']){
  await mount(kind);check(await phase.count()===0,kind+': no idle phase');await start();
  check(await phase.getAttribute('data-ml-demo-phase')==='work',kind+': working phase');
  check(await phase.getByRole('status').innerText()==='Working stroke',kind+': working announcement');
  await setPhase(.75);check(await phase.getAttribute('data-ml-demo-phase')==='return',kind+': return phase');
  check(await phase.getByRole('status').innerText()==='Returning to start',kind+': return announcement');
  check((await phase.innerText()).includes('Arrows show the working direction.'),kind+': arrow explanation');
  check(await phase.getByRole('status').getAttribute('aria-atomic')==='true',kind+': atomic announcement');
  await pg.getByRole('button',{name:'Show the machine from the side',exact:true}).click();await bay.scrollIntoViewIfNeeded();
  check(await phase.getAttribute('data-ml-demo-phase')==='return',kind+': camera rerender preserves return');
  const stable=await pg.evaluate(()=>{const label=document.querySelector('[data-ml-demo-phase-label]'),s=window.__qaShop;let count=0;const observer=new MutationObserver(records=>count+=records.length);observer.observe(label,{childList:true,characterData:true,subtree:true});for(let i=0;i<20;i++)s.tick();const records=observer.takeRecords();observer.disconnect();return count+records.length===0;});check(stable,kind+': same phase does not repeat announcement');
  await shot('return-'+kind);
  await hold.click();check(await phase.count()===0,kind+': hold removes playback indicator');
  await start();await pg.evaluate(()=>window.__qaTimers.at(-1).fn());check(await phase.count()===0,kind+': completion removes indicator');
 }
 for(const width of [390,320]){
  await pg.setViewportSize({width,height:1000});await mount('windlass',{shopSlowMotion:false});await start();
  check(await pg.evaluate(()=>window.__qaShop.data.demoDuration===2200),width+': normal-speed duration');
  check(await phase.getAttribute('data-ml-demo-phase')==='work',width+': normal-speed working phase');await shot('working-'+width);
  await setPhase(.75);check(await phase.getAttribute('data-ml-demo-phase')==='return',width+': normal-speed return phase');await shot('return-'+width);
  await pg.locator('#ml-bench-tab-lever').click();check(await phase.count()===0,width+': station switch clears phase');
 }
 await mount('screw',{motionPref:'off'});await start();check(await phase.getAttribute('data-ml-demo-phase')==='held','Motion off: held phase');check(await phase.getByRole('status').innerText()==='Motion off: full-stroke view','Motion off: accurate announcement');check(!await phase.locator('.ml-demo-phase-stages').isVisible(),'Motion off: no active stage bar');await shot('motion-off-320');
 if(CONTRAST){await pg.emulateMedia({forcedColors:'active'});await mount('pulley');await start();await setPhase(.75);await shot('forced-colors-return-320');check(await phase.getAttribute('data-ml-demo-phase')==='return','Forced colors: return phase');}
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({errors,overflow,checks,shots},null,2));if(errors.length||overflow)process.exitCode=1;
}finally{await b.close();}
})();`;vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
