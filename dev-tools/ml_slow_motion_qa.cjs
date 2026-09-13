const fs=require('fs'),path=require('path'),vm=require('vm');
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');source=source.slice(0,source.indexOf('  const manifest = [];')).replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2] || '.');").replace('deviceScaleFactor: 2','deviceScaleFactor: 1');
source=source.replace("const tool = read('stem_lab/stem_tool_machinelab.js');","const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildSimpleMachineScene','build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}');");
source+=String.raw`
const checks=[],shots=[];let overflow=false;const theme={dark:DARK||CONTRAST,contrast:CONTRAST,band:BAND};
const bay=pg.locator('.ml-shop-bay'),slow=pg.getByRole('checkbox',{name:'Slow motion',exact:true}),run=pg.getByRole('button',{name:/^Run the three-dimensional/});
await pg.evaluate(()=>{window.__qaTimers=[];const original=window.setTimeout;window.setTimeout=function(fn,delay){const id=original.apply(this,arguments);if(delay===2300||delay===6700)window.__qaTimers.push({fn,delay,id});return id;};});
async function mount(extra={}){await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:'windlass',shopStartOutline:true,shopFocusMechanism:true,...extra}),theme]);await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(()=>!!window.__qaShop.mlDemo.startLinks);}
try{
for(const width of [1150,390,320]){
 await pg.setViewportSize({width,height:1000});await mount();
 await slow.press('Space');await run.click();await pg.waitForFunction(()=>window.__qaShop.data.demoDuration===6600&&window.__qaShop.data.demoId>0);
 if(!await slow.isDisabled())errors.push('Speed changed during a run');
 if(!await pg.locator('.ml-shop-hud').textContent().then(t=>t.includes('Watch in slow motion')))errors.push('Missing slow playback cue');
 if(width===1150){await pg.waitForFunction(()=>performance.now()-window.__qaShop.mlDemoT0>2500&&window.__qaShop.data.demoId>0);await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,'slow-running.png')});shots.push('slow-running');checks.push('Slow playback continues beyond normal duration');}
 await pg.getByRole('button',{name:'Halfway',exact:true}).click();await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(()=>window.__qaShop.data.static&&window.__qaShop.data.motionProgress===0.5&&Math.abs(window.__qaShop.mlDemo.motion.rotation.z-Math.PI)<1e-8);
 if(await slow.isDisabled())errors.push('Speed remains disabled after inspection');
 await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,'slow-inspect-'+width+'.png')});shots.push('slow-inspect-'+width);
 overflow=overflow||await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 await slow.press('Space');await run.click();await pg.waitForFunction(()=>window.__qaShop.data.demoDuration===2200&&window.__qaShop.data.demoId>0);
 const safe=await pg.evaluate(()=>{const pair=window.__qaTimers.slice(-2);if(pair.length!==2||pair[0].delay!==6700||pair[1].delay!==2300)return false;clearTimeout(pair[0].id);pair[0].fn();const stillRunning=document.querySelector('#ml-shop-stroke').disabled;clearTimeout(pair[1].id);pair[1].fn();return stillRunning&&!document.querySelector('#ml-shop-stroke').disabled;});
 if(!safe)errors.push('Slow timer interrupted a normal run or cleanup used wrong duration');
 checks.push('Keyboard slow selection, inspection takeover, normal restart and timer isolation at '+width);
}
for(const pref of ['off','on']){
 await pg.emulateMedia({reducedMotion:pref==='on'?'reduce':'no-preference'});await mount({motionPref:pref,shopSlowMotion:true});await run.click();
 await pg.waitForFunction(pref=>window.__qaShop.data.reduced===(pref==='off')&&window.__qaShop.data.demoDuration===(pref==='off'?2200:6600),pref);
 if(pref==='off'){if(!(await pg.locator('.ml-shop-hud').textContent()).includes('Still demonstration'))errors.push('Motion-off demonstration has a moving label');await pg.waitForFunction(()=>Math.abs(window.__qaShop.mlDemo.motion.rotation.z-2*Math.PI)<1e-8);const a=await pg.evaluate(()=>window.__qaShop.mlDemo.motion.rotation.z);await pg.waitForTimeout(200);if(await pg.evaluate(()=>window.__qaShop.mlDemo.motion.rotation.z)!==a)errors.push('Motion-off preference drifted');}
 else{await pg.waitForFunction(()=>{const a=window.__qaShop.mlDemo.motion.rotation.z;return a>0&&a<Math.PI;});}
 await pg.evaluate(()=>{const t=window.__qaTimers.at(-1);clearTimeout(t.id);t.fn();});checks.push('Explicit motion '+pref+' overrides opposite OS preference');
}
fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({errors,overflow,shots,checks},null,2));if(errors.length||overflow)process.exitCode=1;
}finally{await b.close();}
})();`;vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
