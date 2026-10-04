'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const repo=path.resolve(__dirname,'..'),report=path.join(repo,'reports/universe-flight-2026-09-29/timeline');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=['stem_lab/universe_flight_scene.js','stem_lab/stem_tool_universe.js'];
const pins=Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(path.join(repo,f)))]));
for(const file of files)assert.equal(hash(fs.readFileSync(path.join(repo,'desktop/web-app/public',file))),pins[file]);
// Independent accepted route definitions: the timeline must not alter the path.
const baseline=execFileSync('git',['show','747d4f86b73c28d446de59ba6b6d52ab5900fe8b:stem_lab/universe_flight_scene.js'],{cwd:repo,encoding:'utf8'});
assert.equal(hash(baseline),'c5d971c4becd5c265a4cc03be2792d8f3077d2ff8340ddb111ee85f227e37042');
const sandbox={window:{}};vm.runInNewContext(baseline.replace('  global.UniverseFlight =','  global.__routes=FLYBY_ROUTES;\n  global.UniverseFlight ='),sandbox);const routes=sandbox.window.__routes;
fs.mkdirSync(report,{recursive:true});
const result={completed:false,pins,harnessHash:hash(fs.readFileSync(__filename)),checks:[],seeks:[],accessibility:[],captures:[],errors:[],served:[]};
const save=()=>fs.writeFileSync(path.join(report,'browser-check.json'),JSON.stringify(result,null,2)+'\n');
const check=name=>{result.checks.push(name);save();console.log('Passed '+name);};
async function main(){
 const {chromium}=require(path.join(repo,'node_modules/playwright'));
 const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:850},hasTouch:true});page.setDefaultTimeout(60000);
  page.on('pageerror',error=>result.errors.push(String(error)));
  page.on('response',async response=>{const file=files.find(f=>new URL(response.url()).pathname==='/'+f);if(file)result.served.push({file,status:response.status(),hash:hash(await response.body())});});
  await page.addInitScript(()=>{
   window.__timelineGL=[];const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){const gl=original.call(this,type,...args);if(type!=='webgl'||!gl||gl.__timelineProbe)return gl;gl.__timelineProbe=true;
    const rec={gl,created:{},deleted:{},uploads:0};window.__timelineGL.push(rec);
    for(const kind of['Buffer','Texture','Program','Shader'])for(const action of['create','delete']){const name=action+kind,method=gl[name].bind(gl),counts=rec[action==='create'?'created':'deleted'];gl[name]=function(...args){if(action==='create'||args[0])counts[kind]=(counts[kind]||0)+1;return method(...args);};}
    const upload=gl.texImage2D.bind(gl);gl.texImage2D=function(...args){rec.uploads++;return upload(...args);};return gl;};
   let api;Object.defineProperty(window,'UniverseFlight',{configurable:true,get(){return api;},set(value){const create=value.create;value.create=function(canvas,options){const scene=create.call(this,canvas,{...options,onTelemetry(info){window.__timelineInfo=info;options.onTelemetry?.(info);},onStatus(status){window.__timelineStatus=status;options.onStatus?.(status);}});window.__timelineScene=scene;window.__timelineCanvas=canvas;return scene;};api=value;}});
  });
  await page.goto('http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?enhanced=41#universe-flight');
  // The local preview opens the flight panel when its fixture mounts.
  await page.waitForFunction(()=>window.__timelineStatus?.state==='ready');
  await page.addScriptTag({path:path.join(repo,'node_modules/axe-core/axe.min.js')});
  const stage=page.locator('.uf-stage'),canvas=stage.locator('canvas'),panel=page.locator('#uf-inview-controls');
  const next=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const state=()=>page.evaluate(()=>({snapshot:__timelineScene.snapshot(),info:__timelineInfo,resources:__timelineGL.map(r=>({created:r.created,uploads:r.uploads,error:r.gl.getError()}))}));
  async function axe(name,node){const violations=await node.evaluate(async n=>(await axe.run(n,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));result.accessibility.push({name,violations});assert.deepEqual(violations,[]);}
  async function capture(name,node){await node.screenshot({path:path.join(report,name+'.png')});result.captures.push(name);save();}
  async function verifySeek(id,name,before){await next();const current=await state(),s=current.snapshot,t=current.info.flyby.elapsedSeconds,expected=routes[id].atTime(t);
   assert.equal(current.info.running,false);assert.equal(current.info.flyby.id,id);assert.equal(current.info.flyby.autoLook,true);assert.equal(current.info.flyby.completed,t===routes[id].durationSeconds);assert.equal(current.info.flyby.active,t<routes[id].durationSeconds);
   assert.deepEqual(s.state.position,Array.from(expected.position));assert.equal(s.state.distanceLy,expected.distance);assert.equal(s.state.pitch,expected.pitch);assert.ok(Math.abs(Math.sin(s.state.yaw)-Math.sin(expected.yaw))<1e-12);assert.ok(Math.abs(Math.cos(s.state.yaw)-Math.cos(expected.yaw))<1e-12);assert.deepEqual([s.state.universeYears,s.state.travelerYears],[0,0]);
   if(before){assert.deepEqual(s.settings,before.snapshot.settings);assert.deepEqual(current.resources,before.resources);assert.equal(current.info.flyby.rate,before.info.flyby.rate);}
   const first=await page.evaluate(()=>__timelineScene.capture());await page.waitForTimeout(100);const second=await page.evaluate(()=>__timelineScene.capture());assert.deepEqual(first,second,'paused pixels and snapshot stay exact');
   result.seeks.push({name,id,seconds:t,position:s.state.position,phase:current.info.flyby.phase,targetId:s.targetId,pausedPixelsStable:true});save();return current;
  }
  async function launch(id){await page.locator('#uf-scenic-flights').locator('[data-scenic-flight="'+id+'"]').click();await page.waitForFunction(id=>__timelineInfo.flyby.id===id,id);}
  async function enter(){await stage.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);}
  async function open(){await stage.locator('#uf-flight-controls-toggle').click();await panel.locator('#uf-inview-tab-explore').click();}
  async function exit(){await panel.getByRole('button',{name:'Close flight controls',exact:true}).click();await stage.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);}
  for(const id of Object.keys(routes)){
   await launch(id);const slider=page.locator('#uf-flyby-position');await slider.focus();await slider.press('Home');let current=await verifySeek(id,id+'-start');assert.equal(current.info.flyby.elapsedSeconds,0);
   await page.locator('#uf-flyby-rate').selectOption('2');await stage.getByRole('button',{name:'Narrow view',exact:true}).click();await slider.focus();current=await state();
   await slider.press('ArrowRight');const first=await verifySeek(id,id+'-keyboard',current);assert.equal(first.info.flyby.elapsedSeconds,.1);assert.ok(await slider.evaluate(n=>n===document.activeElement));
   await slider.scrollIntoViewIfNeeded();const box=await slider.boundingBox();await page.mouse.click(box.x+box.width*.57,box.y+box.height/2);const middle=await verifySeek(id,id+'-pointer',current);assert.ok(middle.info.flyby.elapsedSeconds>1&&middle.info.flyby.elapsedSeconds<routes[id].durationSeconds-1);
   const moment=middle.info.flyby.elapsedSeconds;await page.locator('#uf-flyby-status').getByRole('button',{name:'Continue flyby',exact:true}).click();await page.waitForFunction(t=>__timelineInfo.running&&__timelineInfo.flyby.elapsedSeconds>t+.1,moment);assert.ok(await canvas.evaluate(n=>n===document.activeElement));
   await slider.focus();await slider.press('End');const end=await verifySeek(id,id+'-end',current);assert.equal(end.info.flyby.elapsedSeconds,routes[id].durationSeconds);assert.equal(end.snapshot.targetId,routes[id].completionTargetId);
   await slider.press('Home');await slider.press('ArrowRight');await verifySeek(id,id+'-revisit',current);await axe(id+'-normal',page.locator('#uf-flyby-status'));
   if(id==='nebula')await capture('timeline-normal',page.locator('#uf-flyby-status'));
   check(id+' timeline seeks, pauses, resumes, completes and revisits the accepted route');
  }
  await enter();await open();let slider=panel.locator('#uf-inview-flyby-position');await slider.focus();await slider.press('End');await slider.press('ArrowLeft');await verifySeek('stellar','fullscreen-keyboard');assert.ok(await slider.evaluate(n=>n===document.activeElement));assert.equal(await panel.count(),1);await axe('desktop-fullscreen',panel);await capture('timeline-fullscreen',stage);
  await panel.getByRole('button',{name:'Continue flyby',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#uf-inview-controls'));assert.ok(await canvas.evaluate(n=>n===document.activeElement));await page.waitForFunction(()=>__timelineInfo.flyby.completed);await open();await slider.focus();await slider.press('Home');await verifySeek('stellar','fullscreen-completed-revisit');await exit();
  check('Fullscreen seeking retains controls and focus; Continue returns to the scene');
  for(const viewport of[{width:320,height:740},{width:568,height:320}]){
   await page.setViewportSize(viewport);await launch('nebula');slider=page.locator('#uf-flyby-position');await slider.scrollIntoViewIfNeeded();let box=await slider.boundingBox();assert.ok(box.height>=44&&box.x>=0&&box.x+box.width<=viewport.width+1);await page.touchscreen.tap(box.x+box.width*.45,box.y+box.height/2);await verifySeek('nebula','touch-'+viewport.width);await axe('normal-'+viewport.width,page.locator('#uf-flyby-status'));
   await enter();await open();slider=panel.locator('#uf-inview-flyby-position');await slider.scrollIntoViewIfNeeded();box=await slider.boundingBox();assert.ok(box.height>=44&&box.x>=0&&box.x+box.width<=viewport.width+1);await page.touchscreen.tap(box.x+box.width*.7,box.y+box.height/2);await verifySeek('nebula','fullscreen-touch-'+viewport.width);assert.equal(await panel.count(),1);await axe('fullscreen-'+viewport.width,panel);await capture('timeline-'+viewport.width,stage);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await exit();
  }
  check('Phone and short landscape timelines remain touch sized and accessible');
  await page.getByRole('button',{name:'Close flight explorer',exact:true}).click();const resources=await page.evaluate(()=>__timelineGL.map(r=>({created:r.created,deleted:r.deleted,error:r.gl.getError()})));for(const rec of resources){assert.deepEqual(rec.created,rec.deleted);assert.equal(rec.error,0);}result.resources=resources;
  check('Closing releases every created graphics object');
  for(const file of files){assert.equal(hash(fs.readFileSync(path.join(repo,file))),pins[file]);assert.equal(hash(fs.readFileSync(path.join(repo,'desktop/web-app/public',file))),pins[file]);const responses=result.served.filter(r=>r.file===file);assert.ok(responses.length>0&&responses.every(r=>r.status===200&&r.hash===pins[file]));}
  assert.deepEqual(result.errors,[]);result.completed=true;save();console.log(JSON.stringify({completed:true,checks:result.checks.length,seeks:result.seeks.length,accessibility:result.accessibility.length,captures:result.captures.length}));
 }finally{await browser.close();}
}
main().catch(error=>{result.failure=String(error);save();console.error(error);process.exitCode=1;});
