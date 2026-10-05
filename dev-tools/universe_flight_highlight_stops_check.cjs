'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'..'),report=path.join(repo,'reports/universe-flight-2026-09-29/highlight-stops');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),read=f=>fs.readFileSync(path.join(repo,f));
const files=['stem_lab/stem_tool_universe.js','stem_lab/universe_flight_scene.js'],pins=Object.fromEntries(files.map(f=>[f,hash(read(f))]));
for(const f of files)assert.deepEqual(read(f),read('desktop/web-app/public/'+f));
const manifest=JSON.parse(read('stem_lab/assets/universe-flight/highlights/manifest.json'));
fs.mkdirSync(report,{recursive:true});
const result={completed:false,pins,harnessHash:hash(fs.readFileSync(__filename)),checks:[],stops:[],accessibility:[],captures:[],errors:[],served:[]};
const save=()=>fs.writeFileSync(path.join(report,'browser-check.json'),JSON.stringify(result,null,2)+'\n');
const check=name=>{result.checks.push(name);save();console.log('Passed '+name);};
async function main(){
 const {chromium}=require(path.join(repo,'node_modules/playwright'));
 const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:850},hasTouch:true});page.setDefaultTimeout(60000);const responses=[];
  page.on('pageerror',e=>result.errors.push(String(e)));
  page.on('response',r=>{const f=files.find(f=>new URL(r.url()).pathname==='/'+f);if(f)responses.push(r.body().then(b=>result.served.push({file:f,status:r.status(),hash:hash(b)})));});
  await page.addInitScript(()=>{window.__stopEvents=[];let api;Object.defineProperty(window,'UniverseFlight',{configurable:true,get(){return api;},set(value){const create=value.create;value.create=function(canvas,options){const scene=create.call(this,canvas,{...options,onTelemetry(info){window.__stopInfo=info;options.onTelemetry?.(info);},onStatus(status){window.__stopStatus=status;options.onStatus?.(status);},onPause(message,detail){window.__stopEvents.push(detail);options.onPause?.(message,detail);}});window.__stopScene=scene;window.__stopCanvas=canvas;return scene;};api=value;}});});
  await page.goto('http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?enhanced=43#universe-flight');await page.waitForFunction(()=>window.__stopStatus?.state==='ready');
  await page.addScriptTag({path:path.join(repo,'node_modules/axe-core/axe.min.js')});
  const stage=page.locator('.uf-stage'),panel=page.locator('#uf-inview-controls'),normal=page.locator('#uf-flyby-status');
  const next=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  async function pause(){if(await page.evaluate(()=>__stopInfo.running))await page.locator('.uf-transport').getByRole('button',{name:'Pause travel',exact:true}).click();await page.waitForFunction(()=>!__stopInfo.running);}
  async function launch(id){await page.locator('#uf-scenic-flights [data-scenic-flight="'+id+'"]').click();await page.waitForFunction(id=>__stopInfo.flyby.id===id,id);await pause();}
  async function axe(name,node){const violations=await node.evaluate(async n=>(await axe.run(n,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));result.accessibility.push({name,violations});assert.deepEqual(violations,[]);}
  async function capture(name,node){await node.screenshot({path:path.join(report,name+'.png')});result.captures.push({name,hash:hash(fs.readFileSync(path.join(report,name+'.png')))});save();}
  async function seed(view,manual=false){await page.evaluate(({seconds,manual})=>{__stopScene.seekFlyby(seconds-.08);if(manual)__stopScene.look(.65,-.08);__stopEvents=[];},{seconds:view.seconds,manual});await next();return page.evaluate(()=>__stopScene.snapshot());}
  async function stopped(view,name,before,manual=false){await page.waitForFunction(({id,time})=>!__stopInfo.running&&__stopInfo.flyby.elapsedSeconds===time&&__stopEvents.some(e=>e?.kind==='flyby-stop'&&e.highlightId===id),{id:view.highlightId,time:view.seconds});await next();const data=await page.evaluate(()=>({info:__stopInfo,snapshot:__stopScene.snapshot(),events:__stopEvents,focus:document.activeElement===__stopCanvas}));
   assert.deepEqual(data.snapshot.state.position,view.snapshot.state.position);assert.equal(data.snapshot.state.distanceLy,view.snapshot.state.distanceLy);assert.equal(data.snapshot.targetId,view.snapshot.targetId);assert.equal(data.info.flyby.pauseAtHighlights,true);assert.deepEqual(data.snapshot.settings,before.settings);assert.deepEqual([data.snapshot.state.universeYears,data.snapshot.state.travelerYears],[0,0]);assert.equal(data.focus,true);
   if(manual){assert.equal(data.snapshot.state.yaw,before.state.yaw);assert.equal(data.snapshot.state.pitch,before.state.pitch);assert.equal(data.info.flyby.autoLook,false);}else{assert.equal(data.snapshot.state.yaw,view.snapshot.state.yaw);assert.equal(data.snapshot.state.pitch,view.snapshot.state.pitch);}
   assert.equal(data.events.filter(e=>e?.kind==='flyby-stop').length,1);assert.ok((await stage.locator('#uf-journey-announcement').textContent()).includes(view.name));const first=await page.evaluate(()=>__stopScene.capture());await page.waitForTimeout(120);assert.deepEqual(await page.evaluate(()=>__stopScene.capture()),first);result.stops.push({name,route:view.routeId,highlight:view.highlightId,seconds:view.seconds,manual,pausedPixelsStable:true});save();
  }
  async function enter(){await stage.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);}
  async function exit(){if(await panel.count())await panel.getByRole('button',{name:'Close flight controls',exact:true}).click();await stage.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);}
  for(const id of['halo','nebula','group','stellar']){
   await launch(id);const toggle=normal.getByRole('checkbox',{name:'Pause at highlights',exact:true});
   if(id==='halo'){assert.equal(await toggle.isChecked(),false);await toggle.focus();await toggle.press('Space');}else assert.equal(await toggle.isChecked(),true);
   await normal.locator('#uf-flyby-rate').selectOption('2');
   for(const view of manifest.views.filter(v=>v.routeId===id)){const before=await seed(view);await normal.getByRole('button',{name:'Continue flyby',exact:true}).click();await stopped(view,id+'-'+view.highlightId,before);assert.ok((await normal.locator('.uf-flyby-stop-summary').textContent()).includes(view.name));assert.equal(await normal.locator('[data-flyby-highlight="'+view.highlightId+'"]').getAttribute('aria-current'),'true');}
   await axe(id+'-normal',normal);check(id+' stops at all three authored highlights and retains the preference');
  }
  await capture('stops-normal',normal);
  await normal.getByRole('button',{name:'Continue flyby',exact:true}).click();await page.waitForFunction(t=>__stopInfo.running&&__stopInfo.flyby.elapsedSeconds>t,manifest.views.filter(v=>v.routeId==='stellar').at(-1).seconds);await pause();assert.equal((await page.evaluate(()=>__stopEvents.filter(e=>e?.kind==='flyby-stop').length)),1);check('Continue leaves the current stop without immediately pausing again');
  await launch('nebula');const view=manifest.views.find(v=>v.file==='nebula-filaments.webp');
  await stage.getByRole('button',{name:'Narrow view',exact:true}).click();const before=await seed(view,true);
  await normal.getByRole('button',{name:'Continue flyby',exact:true}).click();await stopped(view,'free-look',before,true);check('Free look and the selected lens survive an automatic pause');
  for(const viewport of[{width:1280,height:850},{width:320,height:740},{width:568,height:320}]){
   await page.setViewportSize(viewport);await enter();await stage.locator('#uf-flight-controls-toggle').click();await panel.locator('#uf-inview-tab-explore').click();
   const toggle=panel.getByRole('checkbox',{name:'Pause at highlights',exact:true});assert.equal(await toggle.isChecked(),true);await toggle.tap();assert.equal(await page.evaluate(()=>__stopInfo.flyby.pauseAtHighlights),false);await toggle.tap();await panel.locator('#uf-inview-flyby-rate').selectOption('0.5');
   const start=await seed(view);const remaining=await panel.locator('.uf-flyby-next').textContent();assert.ok(remaining.includes(view.name)&&remaining.includes('1 s of playback'));await axe('fullscreen-controls-'+viewport.width,panel);
   await panel.getByRole('button',{name:'Continue flyby',exact:true}).click();await stopped(view,'fullscreen-'+viewport.width,start);
   const card=stage.locator('#uf-stage-journey');await card.waitFor();await axe('fullscreen-arrival-'+viewport.width,card);assert.ok((await card.textContent()).includes('Highlight 2 / 3'));
   for(const name of['Continue flyby','Save viewpoint'])assert.equal(await card.getByRole('button',{name,exact:true}).evaluate(button=>{const r=button.getBoundingClientRect();return [[r.left+3,r.top+3],[r.right-3,r.top+3],[r.left+3,r.bottom-3],[r.right-3,r.bottom-3]].every(([x,y])=>button.contains(document.elementFromPoint(x,y)));}),true,name+' must be fully visible without scrolling');
   const details=card.getByRole('region',{name:'Highlight details',exact:true});await details.focus();assert.equal(await details.evaluate(el=>document.activeElement===el),true);await capture('stops-'+viewport.width,stage);
   const resume=card.getByRole('button',{name:'Continue flyby',exact:true}),box=await resume.boundingBox();assert.ok(box.height>=44&&box.x>=0&&box.x+box.width<=viewport.width+1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await resume.tap();await page.waitForFunction(time=>__stopInfo.running&&__stopInfo.flyby.elapsedSeconds>time,view.seconds);assert.equal(await card.count(),0);await page.locator('.uf-fs-play').click();await page.waitForFunction(()=>!__stopInfo.running);await exit();
  }
  check('Fullscreen arrival cards, touch controls and focus work at desktop, phone and short landscape sizes');
  await page.setViewportSize({width:1280,height:850});await launch('halo');await normal.getByRole('checkbox',{name:'Pause at highlights',exact:true}).uncheck();const first=manifest.views.find(v=>v.file==='halo-arm.webp');await seed(first);await normal.getByRole('button',{name:'Continue flyby',exact:true}).click();await page.waitForFunction(t=>__stopInfo.flyby.elapsedSeconds>t+.1,first.seconds);assert.equal(await page.evaluate(()=>__stopEvents.filter(e=>e?.kind==='flyby-stop').length),0);await pause();check('Turning off highlight pauses restores continuous playback');
  await Promise.all(responses);for(const f of files){assert.equal(hash(read(f)),pins[f]);const served=result.served.filter(s=>s.file===f);assert.ok(served.length&&served.every(s=>s.status===200&&s.hash===pins[f]));}assert.deepEqual(result.errors,[]);result.completed=true;save();console.log(JSON.stringify({completed:true,checks:result.checks.length,stops:result.stops.length,accessibility:result.accessibility.length,captures:result.captures.length}));
 }finally{await browser.close();}
}
main().catch(e=>{result.failure=String(e);save();console.error(e);process.exitCode=1;});
