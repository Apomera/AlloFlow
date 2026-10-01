import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:360_000});test.use({video:'off',trace:'off'});
const report=process.env.DINOLAB_REPORT_DIR||'reports/dinolab-3d-neck-junction';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
 probes:"var now=performance.now.bind(performance);window.__eyeTime=10000;performance.now=function(){return window.__eyeTime==null?now():window.__eyeTime;};var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__coatScene=s;window.__coatCamera=c;window.__coatRenderer=r;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page,species,mode='evidence'){
 await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:mode,field3dAutoRotate:false,field3dOrientationDismissed:true,field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));await page.addStyleTag({content:css.slice(start,end)});
 await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__coatScene)).toBe(true);await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
}
async function inspect(page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,s=w.__coatScene,c=w.__coatCamera,r=w.__coatRenderer,m=s.getObjectByName('dinolab-specimen');s.updateMatrixWorld(true);c.updateMatrixWorld(true);
 const head=m.getObjectByName('continuous-cranial-surface'),neck=m.children.find(p=>p.userData.dinoRegion==='neck');if(!head||!neck)return {hasJunction:false};
 const junction=head.userData.dinoNeckJunction,center=new T.Vector3().fromArray(junction.point).applyMatrix4(m.matrixWorld);let rootOutside=0,minRootEnclosure=Infinity,neckOutside=0,invalid=0,outside=0,coatGap=0,coats=0;
 for(let j=0;j<40;j++){
  const p=new T.Vector3().fromBufferAttribute(head.geometry.attributes.position,j).applyMatrix4(head.matrixWorld),delta=p.clone().sub(center),hit=new T.Raycaster(center.clone().addScaledVector(delta,8),delta.clone().normalize().negate()).intersectObject(neck,false)[0];
  const ratio=hit?hit.point.distanceTo(center)/delta.length():0;minRootEnclosure=Math.min(minRootEnclosure,ratio);if(ratio<1.08)rootOutside++;
 }
 const tip=new T.Vector3().fromArray(neck.userData.dinoNeckTip).applyMatrix4(m.matrixWorld);
 for(let j=0;j<24;j++){
  const p=new T.Vector3().fromBufferAttribute(neck.geometry.attributes.position,48*25+j).applyMatrix4(neck.matrixWorld),delta=p.clone().sub(tip),hit=new T.Raycaster(tip.clone().addScaledVector(delta,8),delta.clone().normalize().negate()).intersectObject(head,false)[0];
  if(!hit||hit.point.distanceTo(tip)<delta.length()*.97)neckOutside++;
 }
 const eyes=[];
 m.traverse(p=>{
  if(p.userData.dinoFeature==='eye'){
   const radius=p.geometry.parameters.radius,out=new T.Vector3(0,0,Math.sign(p.position.z)).transformDirection(m.matrixWorld),origin=p.getWorldPosition(new T.Vector3()).addScaledVector(out,radius*4),hit=new T.Raycaster(origin,out.clone().negate(),0,radius*8).intersectObject(head,false)[0];eyes.push(hit?(hit.distance-radius*(4-p.scale.z))/radius:null);
  }
  if(p.userData.dinoFeature==='contour-plumage'){
   coats++;const a=p.geometry.attributes.dinoCoatRoot;
   for(let i=0;i<a.count;i+=27){const v=new T.Vector3().fromBufferAttribute(a,i);coatGap=Math.max(coatGap,p.localToWorld(v.clone()).distanceTo(p.parent.localToWorld(v.clone())));}
  }
 });
 const position=head.geometry.attributes.position;for(let i=0;i<position.count;i++){const v=new T.Vector3().fromBufferAttribute(position,i).applyMatrix4(head.matrixWorld).project(c);if(!Number.isFinite(v.x+v.y+v.z))invalid++;if(Math.max(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))>1)outside++;}
 for(const key of ['normal','dinoSkinPosition','dinoSkinNormal'])for(const v of head.geometry.attributes[key].array)if(!Number.isFinite(v))invalid++;
 return {hasJunction:true,rootOutside,minRootEnclosure,neckOutside,invalid,outside,eyes,coats,coatGap,model:m.uuid,geometries:r.info.memory.geometries,textures:r.info.memory.textures,errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
function check(r){expect(r.hasJunction).toBe(true);expect(r.rootOutside).toBe(0);expect(r.neckOutside).toBe(0);expect(r.invalid).toBe(0);expect(r.outside).toBe(0);expect(r.eyes).toHaveLength(2);for(const eye of r.eyes){expect(eye).not.toBeNull();expect(eye).toBeGreaterThan(.04);}expect(r.coatGap).toBeLessThan(1e-8);expect(r.errors).toEqual([]);expect(r.lost).toBe(false);expect(r.shaderFailures).toBe(0);}
for(const id of ['tyrannosaurus','brachiosaurus','spinosaurus','anchiornis','sinosauropteryx','triceratops','parasaurolophus'])test(id+' has an enclosed rounded neck junction',async({page})=>{
 await mount(page,id);await page.getByRole('button',{name:'Study head details',exact:true}).click();const before=await inspect(page);check(before);
 await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+id+'-head.png'});
 await page.locator('.dinolab-3d-controls-disclosure > summary').click();await page.getByRole('button',{name:'Side camera view',exact:true}).click();check(await inspect(page));
 if(['tyrannosaurus','brachiosaurus'].includes(id))await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+id+'-side.png'});
 await page.getByRole('button',{name:'Front camera view',exact:true}).click();check(await inspect(page));
 if(id==='brachiosaurus'){
  await page.getByRole('button',{name:'Side camera view',exact:true}).click();await page.setViewportSize({width:320,height:844});check(await inspect(page));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/brachiosaurus-phone.png'});
 }
 if(id==='anchiornis'){
  expect(before.coats).toBe(8);await page.getByRole('slider',{name:'Body inference opacity',exact:true}).press('Home');check(await inspect(page));await page.getByRole('slider',{name:'Body inference opacity',exact:true}).press('End');const after=await inspect(page);check(after);expect(after.model).toBe(before.model);expect(after.geometries).toBe(before.geometries);expect(after.textures).toBe(before.textures);fs.writeFileSync(report+'/opacity-resources.json',JSON.stringify({before,after},null,2));
 }
 if(id==='triceratops'){
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();expect((await inspect(page)).hasJunction).toBe(false);await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();check(await inspect(page));
 }
 fs.writeFileSync(report+'/'+id+'-metrics.json',JSON.stringify(before,null,2));
});
test('junction overlap and plumage remain seated during neck breathing',async({page})=>{
 await mount(page,'anchiornis');await page.getByRole('button',{name:'Study head details',exact:true}).click();const before=await inspect(page);check(before);await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.getByRole('button',{name:'Pause motion',exact:true})).toBeEnabled();
 const samples=[];for(let i=0;i<14;i++){
  await page.evaluate(async()=>{(window as any).__eyeTime+=50;await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));});const r=await inspect(page);check(r);samples.push(r.minRootEnclosure);
 }
 const after=await inspect(page);expect(after.model).toBe(before.model);expect(after.geometries).toBe(before.geometries);expect(after.textures).toBe(before.textures);expect(Math.max(...samples)-Math.min(...samples)).toBeGreaterThan(0);
 fs.writeFileSync(report+'/breathing-resources.json',JSON.stringify({before,after,samples},null,2));
});
