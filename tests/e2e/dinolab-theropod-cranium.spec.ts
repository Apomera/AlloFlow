import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:360_000,retries:0});test.use({video:'off',trace:'off'});
const phase=process.env.DINO_THEROPOD_CRANIUM_PHASE==='before'?'before':'after';
const report=path.resolve('reports/dinolab-theropod-cranium');
const ids=['dilophosaurus','allosaurus','coelophysis'];
const probes='var SkullRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new SkullRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__skullScene=s;window.__skullCamera=c;window.__skullRenderer=r;return f(s,c)};return r};';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1280,height:960,layout:'document',appStyles:true,probes});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page,id:string){
 await page.setViewportSize({width:1280,height:960});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',selected:id,field3dSelected:id,field3dStage:'studio',field3dOrientationDismissed:true,field3dAutoRotate:false,field3dReconstructionMode:'evidence',field3dShowSkeleton:false,field3dShowBody:true,field3dBodyOpacity:100,field3dShowHuman:false,field3dShowEvidence:false,field3dLabelMode:'key'}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));
 await page.addStyleTag({content:css.slice(start,end)});await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(()=>!!(window as any).__skullScene?.getObjectByName('dinolab-specimen'))).toBe(true);
 await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
}
async function view(page:Page,direction:'Side'|'Front'|'Overhead'){
 if(!await page.locator('.dinolab-3d-controls-disclosure').count())await page.getByRole('button',{name:'Explore anatomy',exact:true}).click();
 const controls=page.locator('.dinolab-3d-controls-disclosure');if(!await controls.evaluate((node:HTMLDetailsElement)=>node.open))await controls.locator('summary').click();
 await controls.getByRole('button',{name:direction+' camera view',exact:true}).click();await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();
}
async function portrait(page:Page,name:string){
 const clean=await page.addStyleTag({content:'.dinolab-3d-readouts,.dinolab-3d-status,.dinolab-3d-camera-readout,.dinolab-viewer-actions,[data-dino-part-label],[data-dino-part-line]{visibility:hidden!important}'});
 await page.locator('canvas.dinolab-3d-canvas').screenshot({path:path.join(report,name)});await clean.evaluate(el=>el.remove());
}
async function audit(page:Page){return page.evaluate(()=>{
 const w=window as any,model=w.__skullScene.getObjectByName('dinolab-specimen');let invalid=0,triangles=0,tagged=0,inFrame=0;
 model.updateMatrixWorld(true);w.__skullCamera.updateMatrixWorld(true);
 model.traverse((mesh:any)=>{if(!mesh.geometry)return;for(const attr of Object.values(mesh.geometry.attributes) as any[])if(!Array.from(attr.array).every(Number.isFinite))invalid++;triangles+=(mesh.geometry.index?.count||0)/3;
 if(mesh.userData.dinoTheropodCranialElement&&!mesh.userData.dinoContour){tagged++;let visible=true;const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const point=new w.THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),eye=point.clone().applyMatrix4(w.__skullCamera.matrixWorldInverse),clip=point.project(w.__skullCamera);if(eye.z>=0||![clip.x,clip.y,clip.z].every(Number.isFinite)||Math.max(Math.abs(clip.x),Math.abs(clip.y),Math.abs(clip.z))>1)visible=false;}if(visible)inFrame++;}});
 return{anatomy:model.userData.dinoFullBodyAnatomy,manus:model.userData.dinoTheropodManus,cranium:model.userData.dinoTheropodCranium,crests:model.userData.dinoTheropodCrests,invalid,triangles,tagged,inFrame,errors:w.__events.errors,shaders:w.__skullRenderer.info.programs.filter((p:any)=>p.diagnostics?.runnable===false).length,lost:w.__glLive()?.lost};
 });}
function sound(row:any){expect(row.invalid).toBe(0);expect(row.triangles).toBeGreaterThan(1000);expect(row.errors).toEqual([]);expect(row.shaders).toBe(0);expect(row.lost).toBe(false);}
test('three theropod heads render native skulls and fixed ornaments with continuous body support',async({page})=>{
 const records:any[]=[];
 for(const id of ids){
  await mount(page,id);await view(page,'Side');await portrait(page,id+'-'+phase+'-life-body.png');
  if(!await page.locator('#dinolab-part-picker').count())await page.getByRole('button',{name:'Explore anatomy',exact:true}).click();
  await page.locator('#dinolab-part-picker').selectOption('head');await view(page,'Side');const life=await audit(page);sound(life);await portrait(page,id+'-'+phase+'-life-head-side.png');
  await view(page,'Front');await portrait(page,id+'-'+phase+'-life-head-front.png');await view(page,'Overhead');await portrait(page,id+'-'+phase+'-life-head-overhead.png');
  await page.locator('[data-dino-part-inspect=bone]').click();await expect.poll(()=>page.evaluate(()=>!!(window as any).__skullScene.getObjectByName('dinolab-specimen').getObjectByName('continuous-torso'))).toBe(false);
  await view(page,'Side');const bone=await audit(page);sound(bone);await portrait(page,id+'-'+phase+'-bone-head-side.png');await view(page,'Front');await portrait(page,id+'-'+phase+'-bone-head-front.png');await view(page,'Overhead');await portrait(page,id+'-'+phase+'-bone-head-overhead.png');
  expect(bone.anatomy.anchors).toEqual(life.anatomy.anchors);expect(bone.manus).toEqual(life.manus);
  if(phase==='after'){
   const previous=JSON.parse(fs.readFileSync(path.join(report,'cranial-before-audit.json'),'utf8')).find((r:any)=>r.species===id);
   expect(life.anatomy).toEqual({...previous.life.anatomy,anchors:{...previous.life.anatomy.anchors,snout:life.cranium.snout}});expect(life.manus).toEqual(previous.life.manus);
   for(const row of [life,bone]){
    expect(row.cranium.species).toBe(id);expect(row.cranium.dimensionsAreInterpretive).toBe(true);expect(row.cranium.tissueHypothesisIndependentAnchors).toBe(true);
    expect(row.cranium.sources.every((s:any)=>s.title&&s.url.startsWith('https://'))).toBe(true);expect(row.inFrame).toBe(row.tagged);
    if(id==='coelophysis')expect(row.crests).toBeUndefined();else{expect(row.crests.entries).toHaveLength(2);expect(row.crests.fixedRoots).toBe(true);expect(row.crests.rootsFromMinimumHead).toBe(true);}
   }
   expect(bone.cranium).toEqual(life.cranium);expect(bone.crests).toEqual(life.crests);expect(bone.tagged).toBeGreaterThan(20);expect(life.tagged).toBe(id==='coelophysis'?0:2);
  }
  await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await view(page,'Side');await portrait(page,id+'-'+phase+'-bone-body.png');records.push({species:id,life,bone});await harness.destroy(page);
 }
 fs.writeFileSync(path.join(report,'cranial-'+phase+'-audit.json'),JSON.stringify(records,null,2));
});
