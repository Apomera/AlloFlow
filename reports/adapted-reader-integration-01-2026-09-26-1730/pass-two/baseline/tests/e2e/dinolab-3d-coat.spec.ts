import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000}); test.use({video:'off',trace:'off'});
const report='reports/dinolab-3d-coat', baseline=process.env.DINO_COAT_BASELINE==='1';
const harness=new GlHarness({toolFile:baseline?report+'/renderer-before.js':'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
  probes:"var realNow=performance.now.bind(performance);performance.now=function(){return window.__coatClock==null?realNow():window.__coatClock;};var dispose=THREE.BufferGeometry.prototype.dispose;THREE.BufferGeometry.prototype.dispose=function(){(window.__coatDisposed||(window.__coatDisposed=[])).push(this.uuid);return dispose.call(this);};var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__coatScene=s;window.__coatCamera=c;window.__coatRenderer=r;window.__coatRenderedClock=window.__coatClock;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function settle(page){await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));}
async function mount(page,species,motion=false){
 await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:motion?'no-preference':'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,field3dWorkflowStarted:false,
   field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {');await page.addStyleTag({content:css.slice(start,css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start)))});
 await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__coatScene)).toBe(true);await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await settle(page);
}
async function inspect(page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,s=w.__coatScene,r=w.__coatRenderer,c=w.__coatCamera,m=s.getObjectByName('dinolab-specimen'),key=s.getObjectByName('dinolab-key-light');s.updateMatrixWorld(true);c.updateMatrixWorld(true);
 let outside=0,invalid=0,rootGap=0,bristles=0;const coats:any[]=[],materials=new Map(),owners:any={};
 function hash(values){let h=2166136261;for(const v of values){h^=Math.round(v*1e7);h=Math.imul(h,16777619);}return h>>>0;}
 m.traverse(p=>{
  if(!p.isMesh||!p.userData.dinoAnatomy)return;
  if(p.userData.filamentStyle==='bristle')bristles++;
  if(p.userData.dinoFeature!=='filament')return;
  const pos=p.geometry.attributes.position,a=p.userData.dinoAttachment,params=p.geometry.parameters;
  if(!a||a.surface!==p.parent.userData.dinoRegion)invalid++;
  else rootGap=Math.max(rootGap,p.getWorldPosition(new T.Vector3()).distanceTo(p.parent.localToWorld(new T.Vector3().fromArray(a.point)))/params.radius);
  if(p.userData.filamentStyle==='coat'){
   owners[a.surface]=(owners[a.surface]||0)+1;
   coats.push({id:p.uuid,geometry:p.geometry.uuid,hash:hash(pos.array),strands:params.strands,triangles:p.geometry.index.count/3,local:p.position.toArray(),world:p.getWorldPosition(new T.Vector3()).toArray(),rotation:p.rotation.toArray(),scale:p.scale.toArray()});
   materials.set(p.material.uuid,{id:p.material.uuid,color:p.material.color.toArray(),vertexColors:p.material.vertexColors,map:p.material.map?.uuid||null,opacity:p.material.opacity,transparent:p.material.transparent,depthWrite:p.material.depthWrite});
  }
  for(let i=0;i<pos.count;i++){
   const v=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(p.matrixWorld).project(key.shadow.camera);
   if(!Number.isFinite(v.length()))invalid++;if(Math.max(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))>1.001)outside++;
  }
 });
 return {model:m.uuid,coats,bristles,owners,materials:[...materials.values()],rootGap,outside,invalid,camera:c.position.toArray(),memory:{...r.info.memory},render:{...r.info.render},
  errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
function check(p){expect(p.errors).toEqual([]);expect(p.invalid).toBe(0);expect(p.outside).toBe(0);expect(p.rootGap).toBeLessThan(.21);expect(p.lost).toBe(false);expect(p.shaderFailures).toBe(0);}
function compact(p){return {coats:p.coats.length,fibers:p.coats.reduce((n,c)=>n+c.strands,0),triangles:p.coats.reduce((n,c)=>n+c.triangles,0),owners:p.owners,bristles:p.bristles,rootGap:p.rootGap,materials:p.materials,memory:p.memory,render:p.render};}
for(const species of ['anchiornis','microraptor','sinosauropteryx','yutyrannus','psittacosaurus','tyrannosaurus'])test(species+' coat follows the existing surface coverage',async({page})=>{
 await mount(page,species);const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData));const initial=await inspect(page);check(initial);
 if(!baseline){
  if(['psittacosaurus','tyrannosaurus'].includes(species))expect(initial.coats).toHaveLength(0);
  else{
   expect(initial.coats.length).toBeGreaterThan(80);expect(initial.materials).toHaveLength(1);
   expect(initial.owners.torso).toBeGreaterThan(30);expect(initial.owners.neck).toBe(18);expect(initial.owners.tail).toBe(22);
   for(const tuft of initial.coats){expect(tuft.strands).toBe(7);expect(tuft.triangles).toBe(280);}
   expect(initial.materials[0]).toMatchObject({vertexColors:true,map:null,opacity:1,transparent:false,depthWrite:true});
  }
  expect(initial.bristles).toBe(species==='psittacosaurus'?12:0);
 }
 await page.getByRole('button',{name:'Study body details',exact:true}).click();await settle(page);
 await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+(baseline?'-before':'-body')+'.png'});
 if(!baseline){
  await page.locator('.dinolab-3d-controls-disclosure > summary').click();await page.getByRole('button',{name:'Surface detail studio lighting',exact:true}).click();await settle(page);check(await inspect(page));
  if(species==='anchiornis'||species==='yutyrannus')await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-detail.png'});
  await page.getByRole('button',{name:'Study tail details',exact:true}).click();await page.getByRole('button',{name:'Side camera view',exact:true}).click();await settle(page);check(await inspect(page));
  if(species==='psittacosaurus'||species==='sinosauropteryx')await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-tail.png'});
 }
 expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData))).toBe(saved);
 fs.writeFileSync(report+'/'+species+(baseline?'-before':'')+'.json',JSON.stringify(compact(initial),null,2));
});
test('coat opacity and fossil return preserve geometry intent on a phone',async({page})=>{
 await mount(page,'anchiornis');const first=await inspect(page);check(first);
 await page.getByRole('button',{name:'Study body details',exact:true}).click();await page.locator('.dinolab-3d-controls-disclosure > summary').click();
 await page.evaluate(()=>(window as any).__ctx.update('dinoLab','field3dBodyOpacity',40));await settle(page);const transparent=await inspect(page);check(transparent);
 expect(transparent.model).toBe(first.model);expect(transparent.coats.map(c=>c.geometry)).toEqual(first.coats.map(c=>c.geometry));expect(transparent.materials[0]).toMatchObject({transparent:true,depthWrite:false});expect(transparent.materials[0].opacity).toBeCloseTo(.672);
 await page.evaluate(()=>(window as any).__ctx.update('dinoLab','field3dBodyOpacity',100));await settle(page);expect((await inspect(page)).materials[0]).toMatchObject({opacity:1,transparent:false,depthWrite:true});
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();await settle(page);expect((await inspect(page)).coats).toHaveLength(0);
 const disposed=await page.evaluate(()=>(window as any).__coatDisposed);for(const tuft of first.coats)expect(disposed).toContain(tuft.geometry);
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();await settle(page);const back=await inspect(page);check(back);expect(back.coats.map(c=>c.hash)).toEqual(first.coats.map(c=>c.hash));expect(back.coats.map(c=>c.geometry)).not.toEqual(first.coats.map(c=>c.geometry));
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Study head details',exact:true}).click();await settle(page);check(await inspect(page));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.dinolab-3d-shell').screenshot({path:report+'/anchiornis-mobile.png'});
 fs.writeFileSync(report+'/lifecycle.json',JSON.stringify({first:compact(first),recreated:compact(back),disposed:true},null,2));
});
test('coat fibers follow breathing and tail motion and freeze when paused',async({page})=>{
 await mount(page,'sinosauropteryx',true);
 async function tick(amount,steps=1){for(let i=0;i<steps;i++){await page.evaluate(n=>{const w=window as any;w.__coatClock=(w.__coatClock??performance.now())+n;},amount);await expect.poll(()=>page.evaluate(()=>{const w=window as any;return w.__coatClock===w.__coatRenderedClock;})).toBe(true);}}
 await tick(0);const a=await inspect(page);await tick(60,8);const moving=await inspect(page);check(moving);
 expect(moving.coats.map(c=>c.world)).not.toEqual(a.coats.map(c=>c.world));expect(moving.coats.map(c=>c.local)).toEqual(a.coats.map(c=>c.local));expect(moving.coats.map(c=>c.rotation)).not.toEqual(a.coats.map(c=>c.rotation));
 const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData));await page.getByRole('button',{name:'Pause motion',exact:true}).click();await tick(0);const paused=await inspect(page);await tick(10000,3);const frozen=await inspect(page);check(frozen);expect(frozen.coats).toEqual(paused.coats);
 await page.getByRole('button',{name:'Study tail details',exact:true}).click();await page.locator('.dinolab-3d-controls-disclosure > summary').click();await page.getByRole('button',{name:'Rim light studio lighting',exact:true}).click();await tick(0);expect((await inspect(page)).coats).toEqual(paused.coats);
 expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData))).toBe(saved);
 fs.writeFileSync(report+'/motion.json',JSON.stringify({coats:moving.coats.length,rootGap:moving.rootGap,motionObserved:true,pausedTransformsFrozen:true},null,2));
});
