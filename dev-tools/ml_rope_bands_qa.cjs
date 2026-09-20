const fs=require('fs'),path=require('path'),vm=require('vm');
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');source=source.slice(0,source.indexOf('  const manifest = [];')).replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2] || '.');").replace('deviceScaleFactor: 2','deviceScaleFactor: 1');
source=source.replace("const tool = read('stem_lab/stem_tool_machinelab.js');","const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildSimpleMachineScene','build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}');");
source=source.replace('return cfg.render(ctx);','window.__qaRenderCount=(window.__qaRenderCount||0)+1;return cfg.render(ctx);');
source+=String.raw`
const checks=[],shots=[];let overflow=false;const theme={dark:DARK||CONTRAST,contrast:CONTRAST,band:BAND};const bay=pg.locator('.ml-shop-bay'),slider=pg.locator('#ml-shop-stroke');
function check(ok,label){checks.push(label);if(!ok)errors.push(label);}
async function mount(segments,extra={}){await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:'pulley',pulleySegments:segments,shopFocusMechanism:true,shopMotionProgress:0,shopRotY:0,shopRotX:8,shopZoom:1.08,...extra}),theme]);await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(n=>window.__qaShop?.mlDemo?.pulleySegments===n,segments);}
async function pose(value){await slider.fill(String(value));await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(v=>window.__qaShop.data.static&&window.__qaShop.data.motionProgress===v/100,value);}
async function shot(name){await pg.locator('.ml-shop-world').screenshot({path:path.join(OUT,name+'.png')});shots.push(name);overflow=overflow||await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth);}
async function positions(){return pg.evaluate(()=>window.__qaShop.mlDemo.ropeBands.map(b=>b.mesh.position.toArray()));}
async function validate(label){const result=await pg.evaluate(()=>{const s=window.__qaShop,d=s.mlDemo,bands=d.ropeBands;const bounds=new THREE.Box3().setFromPoints(d.focusFitPts);s.model.updateMatrixWorld(true);return {bounded:bands.length>3&&bands.length<=32,shared:new Set(bands.map(b=>b.mesh.geometry)).size===1&&new Set(bands.map(b=>b.mesh.material)).size===1,fixedSize:bands.every(b=>b.mesh.scale.equals(new THREE.Vector3(1,1,1))),fit:bands.every(b=>bounds.containsBox(b.mesh.geometry.boundingBox.clone().applyMatrix4(b.mesh.matrixWorld))),support:d.supportCues.every((cue,i)=>cue.position.x===d.supportingRopes[i].position.x&&cue.position.y===d.supportingRopes[i].position.y)};});for(const [name,ok] of Object.entries(result))check(ok,label+': '+name);}
try{
 await pg.setViewportSize({width:1150,height:1000});
 for(const n of [1,2,3,4,5,6]){
  await mount(n);const initial=await positions();await validate(n+' strands at start');
  await pose(50);check(JSON.stringify(await positions())!==JSON.stringify(initial),n+': bands move with rope');await validate(n+' strands halfway');await shot('pulley-'+n+'-half');
  await pose(100);await validate(n+' strands full');await shot('pulley-'+n+'-full');
  await pose(0);check(JSON.stringify(await positions())===JSON.stringify(initial),n+': exact return to material start');
  const copy=await pg.locator('.ml-shop-hud').innerText();check(copy.includes('Follow a contrasting band')&&copy.includes('Equal arrows show equal tension'),n+': distinguishes rope motion and force');
 }
 for(const width of [390,320]){
  await pg.setViewportSize({width,height:1000});await mount(6);await pose(50);await pg.getByRole('button',{name:'Show a close three-quarter view',exact:true}).click();await bay.scrollIntoViewIfNeeded();const before=await positions();await validate(width+' close view');await shot('mobile-'+width);
  await slider.focus();await slider.press('ArrowRight');await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(()=>window.__qaShop.data.motionProgress===.51);check(JSON.stringify(await positions())!==JSON.stringify(before),width+': keyboard updates bands');
 }
 await mount(6,{motionPref:'off'});await pose(50);const same=await pg.evaluate(()=>{const s=window.__qaShop;const a=s.mlDemo.ropeBands.map(b=>b.mesh.position.toArray());s.tick(performance.now()+5000);return JSON.stringify(a)===JSON.stringify(s.mlDemo.ropeBands.map(b=>b.mesh.position.toArray()));});check(same,'Motion off holds selected material marks');await shot('motion-off-320');
 const guide=pg.locator('.ml-shop-discovery details');await guide.locator('summary').click();check((await guide.innerText()).includes('Follow a contrasting band'),'Accessible reveal includes the rope-band explanation');
 if(CONTRAST){await pg.emulateMedia({forcedColors:'active'});await mount(6);await pose(50);await shot('forced-colors-320');await validate('Forced colors');}
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({errors,overflow,checks,shots},null,2));if(errors.length||overflow)process.exitCode=1;
}finally{await b.close();}
})();`;vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
