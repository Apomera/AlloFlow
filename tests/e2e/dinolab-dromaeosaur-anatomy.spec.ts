import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:360_000,retries:0});test.use({video:'off',trace:'off'});
const phase=process.env.DINO_DROMAEOSAUR_PHASE==='before'?'before':'after';
const report=path.resolve('reports/dinolab-dromaeosaur-anatomy');
const ids=['velociraptor','deinonychus'];
const probes='var PesRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new PesRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__pesScene=s;window.__pesCamera=c;window.__pesRenderer=r;return f(s,c)};return r};';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1280,height:960,layout:'document',appStyles:true,probes});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page,id:string){
 await page.setViewportSize({width:1280,height:960});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',selected:id,field3dSelected:id,field3dStage:'studio',field3dOrientationDismissed:true,field3dAutoRotate:false,field3dReconstructionMode:'evidence',field3dShowSkeleton:false,field3dShowBody:true,field3dBodyOpacity:100,field3dShowHuman:false,field3dShowEvidence:false,field3dLabelMode:'key'}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));
 await page.addStyleTag({content:css.slice(start,end)});await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(()=>!!(window as any).__pesScene?.getObjectByName('dinolab-specimen'))).toBe(true);
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
 const w=window as any,model=w.__pesScene.getObjectByName('dinolab-specimen');let invalid=0,triangles=0,tagged=0,fullyInFrame=0;
 model.updateMatrixWorld(true);w.__pesCamera.updateMatrixWorld(true);
 model.traverse((mesh:any)=>{if(!mesh.geometry)return;for(const a of Object.values(mesh.geometry.attributes) as any[])if(!Array.from(a.array).every(Number.isFinite))invalid++;triangles+=(mesh.geometry.index?.count||0)/3;
 if(mesh.userData.dinoDromaeosaurPedalElement&&!mesh.userData.dinoContour){tagged++;let visible=true;const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const world=new w.THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),eye=world.clone().applyMatrix4(w.__pesCamera.matrixWorldInverse),clip=world.project(w.__pesCamera);if(eye.z>=0||![clip.x,clip.y,clip.z].every(Number.isFinite)||Math.max(Math.abs(clip.x),Math.abs(clip.y),Math.abs(clip.z))>1)visible=false;}if(visible)fullyInFrame++;}});
 return{anatomy:model.userData.dinoFullBodyAnatomy,pes:model.userData.dinoDromaeosaurPes,invalid,triangles,tagged,fullyInFrame,errors:w.__events.errors,shaders:w.__pesRenderer.info.programs.filter((p:any)=>p.diagnostics?.runnable===false).length,lost:w.__glLive()?.lost};
 });}
function sound(row:any){expect(row.invalid).toBe(0);expect(row.triangles).toBeGreaterThan(1000);expect(row.errors).toEqual([]);expect(row.shaders).toBe(0);expect(row.lost).toBe(false);}
test('both dromaeosaurs render connected whole animals and inspectable paired feet',async({page})=>{
 const records:any[]=[];
 for(const id of ids){
  await mount(page,id);await view(page,'Side');await portrait(page,id+'-'+phase+'-life-body-side.png');await view(page,'Front');await portrait(page,id+'-'+phase+'-life-body-front.png');await view(page,'Overhead');await portrait(page,id+'-'+phase+'-life-body-overhead.png');
  if(!await page.locator('#dinolab-part-picker').count())await page.getByRole('button',{name:'Explore anatomy',exact:true}).click();
  await page.locator('#dinolab-part-picker').selectOption('foot');await view(page,'Side');const life=await audit(page);sound(life);await portrait(page,id+'-'+phase+'-life-foot-side.png');await view(page,'Front');await portrait(page,id+'-'+phase+'-life-foot-front.png');await view(page,'Overhead');await portrait(page,id+'-'+phase+'-life-foot-overhead.png');
  await page.locator('[data-dino-part-inspect=bone]').click();await expect.poll(()=>page.evaluate(()=>!!(window as any).__pesScene.getObjectByName('dinolab-specimen').getObjectByName('continuous-torso'))).toBe(false);
  await view(page,'Side');const bone=await audit(page);sound(bone);await portrait(page,id+'-'+phase+'-bone-foot-side.png');await view(page,'Front');await portrait(page,id+'-'+phase+'-bone-foot-front.png');await view(page,'Overhead');await portrait(page,id+'-'+phase+'-bone-foot-overhead.png');await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await view(page,'Side');await portrait(page,id+'-'+phase+'-bone-body-side.png');
  if(phase==='after'){
   expect(life.anatomy.family).toBe('theropods');expect(life.anatomy.anchors).toEqual(bone.anatomy.anchors);
   expect(life.pes.species).toBe(id);expect(life.pes).toEqual(bone.pes);
   for(const row of [life,bone]){expect(row.tagged).toBeGreaterThan(10);expect(row.fullyInFrame).toBe(row.tagged);}
  }
  records.push({species:id,life,bone});await harness.destroy(page);
 }
 fs.writeFileSync(path.join(report,'anatomy-'+phase+'-audit.json'),JSON.stringify(records,null,2));
});
