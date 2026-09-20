const fs=require('fs'),path=require('path'),vm=require('vm');
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');source=source.slice(0,source.indexOf('  const manifest = [];')).replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2] || '.');").replace('deviceScaleFactor: 2','deviceScaleFactor: 1');
source=source.replace("const tool = read('stem_lab/stem_tool_machinelab.js');","const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildSimpleMachineScene','build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}');");
source=source.replace('return cfg.render(ctx);','window.__qaRenderCount=(window.__qaRenderCount||0)+1;return cfg.render(ctx);');
source+=String.raw`
const checks=[],shots=[];let overflow=false;const theme={dark:DARK||CONTRAST,contrast:CONTRAST,band:BAND},bay=pg.locator('.ml-shop-bay'),slider=pg.locator('#ml-shop-stroke');
function check(ok,label){checks.push(label);if(!ok)errors.push(label);}
async function mount(kind,extra={}){await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,shopFocusMechanism:true,shopMotionProgress:0,shopRotY:24,shopRotX:kind==='screw'?32:12,shopZoom:1.08,...extra}),theme]);await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(kind=>window.__qaShop?.mlDemo?.kind===kind,kind);}
async function pose(value){await slider.fill(String(value));await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(v=>window.__qaShop.data.static&&window.__qaShop.data.motionProgress===v/100,value);}
async function shot(name){await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,name+'.png')});shots.push(name);overflow=overflow||await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth);}
async function validate(label){const result=await pg.evaluate(()=>{const s=window.__qaShop,d=s.mlDemo,g=d.turnGuide,u=g.userData;s.model.updateMatrixWorld(true);const cursor=u.mlCursor.getWorldPosition(new THREE.Vector3()),grip=(d.kind==='screw'?d.screwGrip:d.wheelGrip).getWorldPosition(new THREE.Vector3());const a=d.kind==='screw'?new THREE.Vector3(cursor.x,0,cursor.z):new THREE.Vector3(cursor.x,cursor.y-d.axleY,0),b=d.kind==='screw'?new THREE.Vector3(grip.x,0,grip.z):new THREE.Vector3(grip.x,grip.y-d.axleY,0),bounds=new THREE.Box3().setFromPoints(d.focusFitPts);return {aligned:Math.abs(a.normalize().dot(b.normalize())-1)<1e-8,quarters:u.mlQuarterMarks.length===4,framed:bounds.containsBox(new THREE.Box3().setFromObject(u.mlCursor)),reference:u.mlOrigin.position.distanceTo(u.mlQuarterMarks[0].position)<1e-8};});for(const [name,ok] of Object.entries(result))check(ok,label+': '+name);}
try{
 await pg.setViewportSize({width:1150,height:1000});
 for(const kind of ['windlass','screw']){
  await mount(kind);for(const p of [0,25,50,75,100]){await pose(p);await validate(kind+' '+p+'%');if([0,25,75].includes(p))await shot(kind+'-'+p);}
  const help=await pg.locator('.ml-shop-hud').innerText();check(help.includes('Four marks divide one turn into quarters'),kind+': observation guidance');
  const detail=pg.locator('.ml-shop-discovery details');await detail.locator('summary').click();check((await detail.innerText()).includes('the open ring marks the start'),kind+': accessible explanation');
  for(const r of [.05,1]){await mount(kind,{windlassHandleR:r,screwHandleR:r,screwPitch:.01});await pose(75);await validate(kind+' radius '+r);await shot(kind+'-radius-'+r);}
 }
 for(const width of [390,320])for(const kind of ['windlass','screw']){
  await pg.setViewportSize({width,height:1000});await mount(kind);await pose(25);await validate(kind+' '+width);await shot(kind+'-mobile-'+width);
  await slider.focus();await slider.press('ArrowRight');await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(()=>window.__qaShop.data.motionProgress===.26);await validate(kind+' keyboard '+width);
 }
 for(const kind of ['windlass','screw']){await mount(kind,{motionPref:'off'});await pose(50);const stable=await pg.evaluate(()=>{const s=window.__qaShop,u=s.mlDemo.turnGuide.userData,a=u.mlCursor.position.clone();s.tick(performance.now()+5000);return u.mlCursor.position.equals(a);});check(stable,kind+': motion-off held angle');}
 if(CONTRAST){await pg.emulateMedia({forcedColors:'active'});await mount('screw');await pose(25);await validate('Forced colors');await shot('forced-colors-screw-320');}
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({errors,overflow,checks,shots},null,2));if(errors.length||overflow)process.exitCode=1;
}finally{await b.close();}
})();`;vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
