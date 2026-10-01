import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:360_000});test.use({video:'off',trace:'off'});
const report=process.env.DINOLAB_REPORT_DIR||'reports/dinolab-3d-face-contours';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
 probes:"var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__coatScene=s;window.__coatCamera=c;window.__coatRenderer=r;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page,species,mode='evidence'){
 await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:mode,field3dAutoRotate:false,field3dOrientationDismissed:true,field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));await page.addStyleTag({content:css.slice(start,end)});
 await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__coatScene)).toBe(true);await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
}
async function inspect(page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,scene=w.__coatScene,cam=w.__coatCamera,renderer=w.__coatRenderer,m=scene.getObjectByName('dinolab-specimen');scene.updateMatrixWorld(true);cam.updateMatrixWorld(true);
 const head=m.getObjectByName('continuous-cranial-surface'),strips=[];let invalid=0,outside=0;
 m.traverse(p=>{
  if(!['mouth-crease','brow-relief'].includes(p.userData.dinoFeature))return;
  const g=p.geometry,a=g.attributes.position,roots=g.attributes.dinoFaceRoot,parameters=g.parameters;let maxHeight=0,minHeight=Infinity,rootGap=0;
  for(let i=0;i<a.count;i++){
   const world=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(p.matrixWorld),root=new T.Vector3().fromBufferAttribute(roots,i).applyMatrix4(p.matrixWorld),screen=world.clone().project(cam),height=world.distanceTo(root);
   maxHeight=Math.max(maxHeight,height);minHeight=Math.min(minHeight,height);
   rootGap=Math.max(rootGap,root.distanceTo(new T.Vector3().fromBufferAttribute(roots,i).applyMatrix4(head.matrixWorld)));
   if(!Number.isFinite(screen.x+screen.y+screen.z))invalid++;if(Math.abs(screen.x)>1||Math.abs(screen.y)>1||Math.abs(screen.z)>1)outside++;
  }
  strips.push({feature:p.userData.dinoFeature,...parameters,maxHeight,minHeight,rootGap,parent:p.parent.name,material:p.material.type,opacity:p.material.opacity,transparent:p.material.transparent,depthWrite:p.material.depthWrite,skinMapped:!!g.attributes.dinoSkinPosition});
 });
 return {strips,invalid,outside,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:renderer.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
function check(r){
 expect(r.invalid).toBe(0);expect(r.outside).toBe(0);expect(r.errors).toEqual([]);expect(r.lost).toBe(false);expect(r.shaderFailures).toBe(0);expect(r.strips).toHaveLength(4);
 for(const s of r.strips){expect(s.projected).toBe(s.samples);expect(s.parent).toBe('continuous-cranial-surface');expect(s.rootGap).toBeLessThan(1e-8);expect(s.maxHeight).toBeLessThanOrEqual((s.relief+s.offset)*1.01);expect(s.minHeight).toBeGreaterThan(s.offset*.97);if(s.feature==='mouth-crease')expect(s.material).toBe('MeshBasicMaterial');else expect(s.skinMapped).toBe(true);}
}
for(const id of ['anchiornis','microraptor','tyrannosaurus','spinosaurus','triceratops','parasaurolophus','brachiosaurus'])test(id+' has seated tapered facial contours',async({page})=>{
 await mount(page,id);await page.getByRole('button',{name:'Study head details',exact:true}).click();const before=await inspect(page);check(before);
 await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+id+'-head.png'});
 await page.locator('.dinolab-3d-controls-disclosure > summary').click();await page.getByRole('button',{name:'Front camera view',exact:true}).click();check(await inspect(page));
 await page.getByRole('button',{name:'Side camera view',exact:true}).click();check(await inspect(page));
 if(id==='anchiornis'){
  await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/anchiornis-side.png'});
  await page.setViewportSize({width:320,height:844});check(await inspect(page));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/anchiornis-phone.png'});
 }
 if(id==='microraptor'){
  const modelBefore=await page.evaluate(()=>{const w=window as any;return {model:w.__coatScene.getObjectByName('dinolab-specimen').uuid};});
  await page.getByRole('slider',{name:'Body inference opacity',exact:true}).press('Home');await expect.poll(async()=>(await inspect(page)).strips.every(s=>s.opacity===.22&&s.transparent&&!s.depthWrite)).toBe(true);
  await page.getByRole('slider',{name:'Body inference opacity',exact:true}).press('End');const after=await inspect(page);check(after);expect(after.strips.every(s=>s.opacity===1&&!s.transparent&&s.depthWrite)).toBe(true);expect(after.geometries).toBe(before.geometries);expect(after.textures).toBe(before.textures);
  expect(await page.evaluate(()=>(window as any).__coatScene.getObjectByName('dinolab-specimen').uuid)).toBe(modelBefore.model);
  fs.writeFileSync(report+'/opacity-resources.json',JSON.stringify({before,after},null,2));
 }
 if(id==='triceratops'){
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();expect((await inspect(page)).strips).toHaveLength(0);
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();check(await inspect(page));
 }
 fs.writeFileSync(report+'/'+id+'-metrics.json',JSON.stringify(before,null,2));
});
