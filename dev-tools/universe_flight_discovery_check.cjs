'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'..'),report=process.env.UNIVERSE_DISCOVERY_REPORT||path.join(repo,'reports/universe-flight-2026-09-29/discovery');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),read=f=>fs.readFileSync(path.join(repo,f));
const pins=Object.fromEntries(['stem_lab/stem_tool_universe.js','stem_lab/universe_flight_scene.js'].map(f=>[f,hash(read(f))]));
for(const file of Object.keys(pins))assert.deepEqual(read(file),read('desktop/web-app/public/'+file));
fs.mkdirSync(report,{recursive:true});
const result={completed:false,pins,harnessHash:hash(fs.readFileSync(__filename)),checks:[],accessibility:[],captures:[],actions:[],served:[],errors:[]};
const save=()=>fs.writeFileSync(path.join(report,'browser-check.json'),JSON.stringify(result,null,2)+'\n');
const check=name=>{result.checks.push(name);save();console.log('Passed '+name);};
async function main(){
 const {chromium}=require(path.join(repo,'node_modules/playwright'));
 const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:850},hasTouch:true});page.setDefaultTimeout(60000);const pending=[];
  page.on('pageerror',e=>result.errors.push(String(e)));
  page.on('response',r=>{const pathname=new URL(r.url()).pathname;if(pins[pathname.slice(1)]&&r.status()===200)pending.push(r.body().then(b=>result.served.push({path:pathname,hash:hash(b)})));});
  await page.addInitScript(()=>{let api;Object.defineProperty(window,'UniverseFlight',{configurable:true,get(){return api;},set(value){const create=value.create;value.create=function(canvas,options){const scene=create.call(this,canvas,{...options,onTelemetry(i){window.__discoveryInfo=i;options.onTelemetry?.(i);},onStatus(s){window.__discoveryStatus=s;options.onStatus?.(s);}});window.__discoveryScene=scene;window.__discoveryCanvas=canvas;window.__discoveryActions=[];for(const name of['focusTarget','navigateTo']){const method=scene[name];scene[name]=function(...args){const before=scene.snapshot(),answer=method.apply(scene,args);window.__discoveryActions.push({name,args,before,after:scene.snapshot(),answer,info:__discoveryInfo});return answer;};}return scene;};api=value;}});});
  await page.goto('http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?enhanced=45#universe-flight');
  await page.waitForFunction(()=>window.__discoveryStatus?.state==='ready');
  await page.addScriptTag({path:path.join(repo,'node_modules/axe-core/axe.min.js')});
  const stage=page.locator('.uf-stage'),card=stage.locator('.uf-discovery'),canvas=stage.locator('canvas');
  const nextFrame=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const snapshot=()=>page.evaluate(()=>__discoveryScene.snapshot());
  async function reset(){await page.locator('.uf-transport').getByRole('button',{name:'Reset position',exact:true}).click();await page.mouse.move(0,0);await canvas.focus();await card.waitFor();}
  async function capture(name){await stage.screenshot({path:path.join(report,name+'.png')});result.captures.push({name,hash:hash(fs.readFileSync(path.join(report,name+'.png')))});save();}
  async function axe(name){const violations=await stage.evaluate(async n=>(await axe.run(n,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));result.accessibility.push({name,violations});assert.deepEqual(violations,[]);}
  async function reachable(){await stage.scrollIntoViewIfNeeded();const failures=await card.locator('button').evaluateAll(buttons=>buttons.flatMap(b=>{if(b.disabled)return[];const r=b.getBoundingClientRect();return r.height<44||r.width<44||r.left<0||r.right>innerWidth+1||r.top<0||r.bottom>innerHeight+1||[[.2,.2],[.8,.8]].some(([x,y])=>!b.contains(document.elementFromPoint(r.left+r.width*x,r.top+r.height*y)))?[{name:b.getAttribute('aria-label'),rect:r.toJSON()}]:[];}));assert.deepEqual(failures,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  async function enter(){await stage.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);}
  async function exit(){await stage.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);}
  await card.waitFor();assert.equal(await card.getAttribute('data-discovery-target'),'pale-star');await reachable();await axe('desktop');await capture('discovery-desktop');
  const original=await snapshot();await card.getByRole('button',{name:'Next visible landmark'}).click();const nextId=await card.getAttribute('data-discovery-target');assert.notEqual(nextId,'pale-star');assert.deepEqual(await snapshot(),original);
  await canvas.focus();await page.mouse.move(0,0);await page.evaluate(()=>__discoveryScene.look(.015,0));await nextFrame();assert.equal(await card.getAttribute('data-discovery-target'),nextId);
  await card.getByRole('button',{name:/^Inspect /}).focus();await page.evaluate(()=>__discoveryScene.look(Math.PI,0));await nextFrame();assert.equal(await card.getAttribute('data-discovery-target'),nextId);assert.equal(await card.locator('.uf-discovery-eyebrow').innerText(),'READY TO EXPLORE');
  await card.getByRole('button',{name:/^Inspect /}).press('Enter');await page.waitForFunction(()=>document.activeElement===__discoveryCanvas);let action=await page.evaluate(()=>__discoveryActions.at(-1));assert.equal(action.name,'focusTarget');assert.equal(action.args[0],nextId);assert.deepEqual(action.before.state.position,action.after.state.position);assert.equal(action.before.state.distanceLy,action.after.state.distanceLy);assert.deepEqual(action.before.settings,action.after.settings);assert.equal(await page.evaluate(()=>__discoveryInfo.running),false);result.actions.push(action);
  const still=await page.evaluate(()=>__discoveryScene.capture());await nextFrame();assert.deepEqual(await page.evaluate(()=>__discoveryScene.capture()),still);check('Stable suggestions, keyboard cycling and inspection preserve position, counters and paused pixels');
  await reset();await page.evaluate(()=>__discoveryScene.look(Math.PI,0));await card.waitFor({state:'detached'});await reset();
  await page.locator('.uf-transport').getByRole('button',{name:'Start travel',exact:true}).click();await page.waitForFunction(()=>__discoveryInfo.distanceLy>0);await card.getByRole('button',{name:/^Inspect /}).click();await page.waitForFunction(()=>!__discoveryInfo.running);const inspected=await snapshot();assert.ok(inspected.state.distanceLy>0);await nextFrame();assert.deepEqual((await snapshot()).state,inspected.state);
  await page.getByRole('button',{name:'Orbit destination',exact:true}).click();await page.waitForFunction(()=>__discoveryInfo.orbit?.active);assert.equal(await card.count(),0);await reset();
  await stage.getByRole('button',{name:'Hide overlay',exact:true}).click();assert.equal(await card.count(),0);await stage.getByRole('button',{name:'Show overlay',exact:true}).click();await card.waitFor();
  await page.locator('.uf-modes').getByRole('button',{name:'Einstein’s light chase',exact:true}).click();assert.equal(await card.count(),0);await page.locator('.uf-modes').getByRole('button',{name:'Free exploration',exact:true}).click();await reset();
  await page.getByRole('button',{name:'Start landmark tour',exact:true}).click();assert.equal(await card.count(),0);await reset();
  await page.locator('#uf-scenic-flights [data-scenic-flight="nebula"]').click();await page.waitForFunction(()=>__discoveryInfo.flyby?.active);assert.equal(await card.count(),0);await reset();check('No suggestions behind the camera, with hidden overlays, in relativity, tours or flybys');
  for(const region of['neighborhood','galaxy','cosmic']){
   await page.locator('#uf-region').selectOption(region);await reset();await card.waitFor();const id=await card.getAttribute('data-discovery-target');await card.getByRole('button',{name:/^Fly here: /}).click();await page.waitForFunction(()=>__discoveryInfo.navigation.active);action=await page.evaluate(()=>__discoveryActions.at(-1));assert.equal(action.name,'navigateTo');assert.equal(action.args[0],id);assert.deepEqual(action.after.state, {...action.before.state,yaw:action.after.state.yaw,pitch:action.after.state.pitch});assert.deepEqual(action.before.settings,action.after.settings);assert.equal(action.after.settings.region,region);assert.equal(await card.count(),0);assert.ok(await page.evaluate(()=>document.activeElement===__discoveryCanvas));result.actions.push(action);
   await page.locator('.uf-transport').getByRole('button',{name:'Pause travel',exact:true}).click();assert.equal(await card.count(),0);await page.getByRole('button',{name:'End guided approach',exact:true}).click();await reset();
  }
  check('Guided discovery approaches start at the current camera position in all three model scales');
  await page.locator('#uf-region').selectOption('neighborhood');await reset();
  await page.evaluate(()=>{const saved=__discoveryScene.snapshot();saved.state.position=[.65,2.4,23.8];saved.state.yaw=0;saved.state.pitch=0;saved.state.distanceLy=17;saved.targetId='';__discoveryScene.restore(saved);});await nextFrame();await card.waitFor();assert.equal(await card.getAttribute('data-discovery-target'),'pale-star');const close=await snapshot();await card.getByRole('button',{name:/^Fly here: /}).click();await page.waitForFunction(()=>__discoveryInfo.navigation?.alreadyWithin);assert.equal(await page.evaluate(()=>__discoveryInfo.running),false);assert.deepEqual((await snapshot()).state,close.state);check('Inspection stops moving travel and already-nearby suggestions stay stationary');
  await page.locator('#uf-region').selectOption('neighborhood');await reset();await card.getByRole('button',{name:/^Fly here: /}).click();await page.waitForFunction(()=>__discoveryInfo.navigation?.completed,{},{timeout:120000});assert.equal(await page.evaluate(()=>__discoveryInfo.running),false);assert.equal(await card.count(),0);check('Discovery approach automatically pauses at its viewing distance');
  await reset();await enter();await card.waitFor();await reachable();await axe('desktop-fullscreen');await capture('discovery-fullscreen');await stage.locator('#uf-flight-controls-toggle').click();assert.equal(await card.count(),0);await page.getByRole('button',{name:'Close flight controls',exact:true}).click();await card.waitFor();await exit();
  for(const viewport of[{width:320,height:740},{width:568,height:320}]){
   await page.setViewportSize(viewport);await reset();await reachable();await axe('normal-'+viewport.width);await enter();await card.waitFor();await reachable();await axe('fullscreen-'+viewport.width);await capture('discovery-'+viewport.width);
   const id=await card.getAttribute('data-discovery-target');await card.getByRole('button',{name:/^Inspect /}).tap();await page.waitForFunction(()=>document.activeElement===__discoveryCanvas);assert.equal((await snapshot()).targetId,id);await exit();
  }
  check('Fullscreen controls, phone and short landscape support reachable touch actions without overflow');
  await page.setViewportSize({width:1280,height:850});await reset();await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await axe('forced-colors');await capture('discovery-forced-colors');
  await page.addStyleTag({content:'.uf-discovery *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important;}'});await reachable();await axe('text-spacing');
  await Promise.all(pending);for(const[file,pin]of Object.entries(pins)){assert.equal(hash(read(file)),pin);const records=result.served.filter(r=>r.path==='/'+file);assert.ok(records.length&&records.every(r=>r.hash===pin));}
  assert.deepEqual(result.errors,[]);check('Text spacing and system colors retain actions; served modules match verified files');result.completed=true;save();console.log(JSON.stringify({completed:true,checks:result.checks.length,accessibility:result.accessibility.length,captures:result.captures.length}));
 }finally{await browser.close();}
}
main().catch(error=>{result.failure=String(error);save();console.error(error);process.exitCode=1;});
