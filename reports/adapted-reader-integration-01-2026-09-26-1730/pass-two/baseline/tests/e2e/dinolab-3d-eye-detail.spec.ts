import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:360_000});test.use({video:'off',trace:'off'});
const report=process.env.DINOLAB_REPORT_DIR||'reports/dinolab-3d-eye-detail';
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
 const parts=[];let invalid=0,outside=0;
 m.traverse(p=>{
  const role=p.userData.dinoEyeRole;if(!role)return;const g=p.geometry,a=g.attributes.position,iris=g.attributes.dinoIris;
  for(let i=0;i<a.count;i++){const v=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(p.matrixWorld).project(c);if(!Number.isFinite(v.x+v.y+v.z))invalid++;if(Math.max(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))>1)outside++;}
  parts.push({role,side:p.userData.dinoEyeSide,id:p.uuid,radius:g.parameters.radius,position:p.position.toArray(),scale:p.scale.toArray(),visible:p.visible,irisVertices:iris?.count||0,key:p.material.customProgramCacheKey(),map:!!p.material.map,material:p.material.type,opacity:p.material.opacity,color:p.material.color.toArray()});
 });
 return {parts,model:m.uuid,invalid,outside,geometries:r.info.memory.geometries,textures:r.info.memory.textures,errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
function check(r){
 expect(r.invalid).toBe(0);expect(r.outside).toBe(0);expect(r.errors).toEqual([]);expect(r.lost).toBe(false);expect(r.shaderFailures).toBe(0);expect(r.parts).toHaveLength(8);
 for(const side of [-1,1]){
  const get=role=>r.parts.find(p=>p.side===side&&p.role===role),iris=get('iris'),pupil=get('pupil'),cornea=get('cornea');
  expect(iris.irisVertices).toBe(825);expect(iris.key).toBe('dinolab-iris-v1');expect(iris.map).toBe(false);expect(pupil.material).toBe('MeshBasicMaterial');
  expect(pupil.position[0]).toBe(iris.position[0]);expect(pupil.position[1]).toBe(iris.position[1]);expect(pupil.radius/iris.radius).toBeCloseTo(.54,5);
  expect(cornea.opacity).toBeLessThan(.1);expect(cornea.color).toEqual([1,1,1]);
 }
}
async function tick(page,ms){await page.evaluate(async ms=>{(window as any).__eyeTime+=ms;await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));},ms);}
for(const id of ['anchiornis','microraptor','tyrannosaurus','brachiosaurus'])test(id+' has clear layered eyes in head studies',async({page})=>{
 await mount(page,id);await page.getByRole('button',{name:'Study head details',exact:true}).click();const before=await inspect(page);check(before);
 await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+id+'-head.png'});
 await page.locator('.dinolab-3d-controls-disclosure > summary').click();await page.getByRole('button',{name:'Front camera view',exact:true}).click();check(await inspect(page));
 await page.getByRole('button',{name:'Side camera view',exact:true}).click();check(await inspect(page));
 if(id==='anchiornis'){
  const canvas=page.locator('.dinolab-3d-canvas');await canvas.focus();for(let i=0;i<4;i++)await page.keyboard.press('PageUp');check(await inspect(page));
  await canvas.screenshot({path:report+'/anchiornis-zoom.png'});
  await page.getByRole('button',{name:'Side camera view',exact:true}).click();await page.setViewportSize({width:320,height:844});check(await inspect(page));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await canvas.screenshot({path:report+'/anchiornis-phone.png'});
 }
 if(id==='microraptor'){
  const group=page.getByRole('group',{name:'Studio light angle',exact:true});await group.getByRole('button',{name:'Surface detail studio lighting',exact:true}).click();check(await inspect(page));await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/microraptor-detail-light.png'});
  await group.getByRole('button',{name:'Balanced studio lighting',exact:true}).click();const after=await inspect(page);check(after);expect(after.model).toBe(before.model);expect(after.geometries).toBe(before.geometries);expect(after.textures).toBe(before.textures);
  fs.writeFileSync(report+'/lighting-resources.json',JSON.stringify({before,after},null,2));
 }
 if(id==='tyrannosaurus'){
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();expect((await inspect(page)).parts).toHaveLength(0);
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();check(await inspect(page));
 }
 fs.writeFileSync(report+'/'+id+'-metrics.json',JSON.stringify(before,null,2));
});
test('iris detail survives a blink, reduced motion and manual pause',async({page})=>{
 await mount(page,'anchiornis');await page.getByRole('button',{name:'Study head details',exact:true}).click();const initial=await inspect(page);check(initial);await tick(page,5000);expect((await inspect(page)).parts).toEqual(initial.parts);
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.getByRole('button',{name:'Pause motion',exact:true})).toBeEnabled();await tick(page,0);
 const cycle=await page.evaluate(async()=>{
  const w=window as any,m=w.__coatScene.getObjectByName('dinolab-specimen'),eyes=[],glints=[];m.traverse(p=>{if(p.userData.dinoEyeRole==='iris')eyes.push(p);if(p.userData.dinoEyeRole==='glint')glints.push(p);});
  const attributes=eyes.map(p=>Array.from(p.geometry.attributes.dinoIris.array));let minY=1,closed=false,reopened=false,glintHidden=false,frames=0;
  for(;frames<150;frames++){
   w.__eyeTime+=50;await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));minY=Math.min(minY,eyes[0].scale.y);
   if(eyes[0].scale.y<.3){closed=true;glintHidden=glintHidden||glints.every(p=>!p.visible);}
   if(closed&&eyes[0].scale.y>.81){reopened=true;break;}
  }
  return {minY,closed,reopened,glintHidden,frames,coordinatesStable:eyes.every((p,i)=>JSON.stringify(Array.from(p.geometry.attributes.dinoIris.array))===JSON.stringify(attributes[i]))};
 });expect(cycle.closed).toBe(true);expect(cycle.reopened).toBe(true);expect(cycle.glintHidden).toBe(true);expect(cycle.coordinatesStable).toBe(true);
 await page.getByRole('button',{name:'Pause motion',exact:true}).click();await tick(page,0);const paused=await inspect(page);await tick(page,120000);const frozen=await inspect(page);check(frozen);expect(frozen.parts).toEqual(paused.parts);expect(frozen.model).toBe(initial.model);expect(frozen.geometries).toBe(initial.geometries);expect(frozen.textures).toBe(initial.textures);
 fs.writeFileSync(report+'/blink-pause.json',JSON.stringify({cycle,initial,paused,frozen},null,2));
});
