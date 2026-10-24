import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.describe.configure({timeout:360_000,retries:0});test.use({video:'off',trace:'off'});
const phase=process.env.DINO_SAUROPOD_SKULL_PHASE==='before'?'before':'after';
const report=path.resolve('reports/dinolab-sauropod-skulls');
const probes='var HeadRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new HeadRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__raptorScene=s;window.__raptorCamera=c;window.__raptorRenderer=r;return f(s,c)};return r};';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1280,height:960,layout:'document',appStyles:true,probes});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page,id:string){
 await page.setViewportSize({width:1280,height:960});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',selected:id,field3dSelected:id,field3dStage:'studio',field3dOrientationDismissed:true,field3dAutoRotate:false,field3dReconstructionMode:'evidence',field3dShowSkeleton:false,field3dShowBody:true,field3dBodyOpacity:100,field3dShowHuman:false,field3dShowEvidence:false,field3dLabelMode:'key'}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));
 await page.addStyleTag({content:css.slice(start,end)});await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(()=>!!(window as any).__raptorScene?.getObjectByName('dinolab-specimen'))).toBe(true);
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
async function frameReady(page:Page){if(phase==='before')return;await expect.poll(async()=>{const row=await audit(page);fs.writeFileSync(path.join(report,'latest-framing-audit.json'),JSON.stringify(row,null,2));return row.cranial>0&&row.inFrame===row.cranial;}).toBe(true);}
async function audit(page:Page){return page.evaluate(()=>{
 const w=window as any,m=w.__raptorScene.getObjectByName('dinolab-specimen');m.updateMatrixWorld(true);w.__raptorCamera.updateMatrixWorld(true);let invalid=0,triangles=0,cranial=0,inFrame=0,feathers=0;
 m.traverse((mesh:any)=>{if(!mesh.geometry)return;for(const a of Object.values(mesh.geometry.attributes) as any[])if(!Array.from(a.array).every(Number.isFinite))invalid++;triangles+=(mesh.geometry.index?.count||0)/3;
 if(mesh.userData.dinoDromaeosaurPlumage)feathers++;
 const bone=mesh.userData.dinoSauropodCranialElement,skin=mesh.userData.dinoSauropodCranium;if((!bone&&!skin)||mesh.userData.dinoContour)return;cranial++;const p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;let fits=true;for(let i=0;i<p.count;i++){if(skin?.element==='cranial-envelope'&&uv&&uv.getX(i)+1e-7<skin.cranialMinU)continue;const world=new w.THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),eye=world.clone().applyMatrix4(w.__raptorCamera.matrixWorldInverse),clip=world.project(w.__raptorCamera);if(eye.z>=0||![clip.x,clip.y,clip.z].every(Number.isFinite)||Math.max(Math.abs(clip.x),Math.abs(clip.y),Math.abs(clip.z))>1)fits=false;}if(fits)inFrame++;
 });return{body:m.userData.dinoFullBodyAnatomy,pes:m.userData.dinoDromaeosaurPes,cranium:m.userData.dinoSauropodCranium,plumage:m.userData.dinoDromaeosaurPlumage,invalid,triangles,cranial,inFrame,feathers,errors:w.__events.errors,shaders:w.__raptorRenderer.info.programs.filter((p:any)=>p.diagnostics?.runnable===false).length,lost:w.__glLive()?.lost};
 });}
function sound(row:any){expect(row.invalid).toBe(0);expect(row.triangles).toBeGreaterThan(1000);expect(row.errors).toEqual([]);expect(row.shaders).toBe(0);expect(row.lost).toBe(false);}
test('sauropod skull and tooth restorations retain whole-animal anatomy and native head framing',async({page})=>{
 const records:any[]=[];
 for(const id of ['diplodocus','camarasaurus']){
  await mount(page,id);await view(page,'Side');await portrait(page,id+'-'+phase+'-life-body-side.png');await view(page,'Overhead');await portrait(page,id+'-'+phase+'-life-body-overhead.png');
  if(!await page.locator('#dinolab-part-picker').count())await page.getByRole('button',{name:'Explore anatomy',exact:true}).click();
  await page.locator('#dinolab-part-picker').selectOption('head');await view(page,'Side');await frameReady(page);const life=await audit(page);sound(life);await portrait(page,id+'-'+phase+'-life-head-side.png');await view(page,'Front');await frameReady(page);await portrait(page,id+'-'+phase+'-life-head-front.png');await view(page,'Overhead');await frameReady(page);await portrait(page,id+'-'+phase+'-life-head-overhead.png');
  await page.locator('[data-dino-part-inspect=bone]').click();await expect.poll(()=>page.evaluate(()=>!!(window as any).__raptorScene.getObjectByName('dinolab-specimen').getObjectByName('continuous-torso'))).toBe(false);await view(page,'Side');await frameReady(page);const bone=await audit(page);sound(bone);await portrait(page,id+'-'+phase+'-bone-head-side.png');await view(page,'Front');await frameReady(page);await portrait(page,id+'-'+phase+'-bone-head-front.png');await view(page,'Overhead');await frameReady(page);await portrait(page,id+'-'+phase+'-bone-head-overhead.png');
  expect(life.pes).toEqual(bone.pes);expect(life.body.anchors).toEqual(bone.body.anchors);
  if(phase==='after'){
   const prior=JSON.parse(fs.readFileSync(path.join(report,'native-before-audit.json'),'utf8')).find((r:any)=>r.species===id);
   expect(life.pes).toEqual(prior.life.pes);expect(life.body.anchors.hip).toEqual(prior.life.body.anchors.hip);expect(life.body.anchors.shoulder).toEqual(prior.life.body.anchors.shoulder);
   expect(life.cranium.species).toBe(id);expect(life.cranium.genusInformed).toBe(true);expect(life.cranium.dimensionsAreInterpretive).toBe(true);expect(life.cranium.tissueHypothesisIndependentAnchors).toBe(true);expect(life.cranium.sources.every((s:any)=>s.title&&s.url.startsWith('https://'))).toBe(true);
   expect(life.cranium).toEqual(bone.cranium);expect(life.cranial).toBeGreaterThanOrEqual(2);expect(life.inFrame).toBe(life.cranial);expect(bone.cranial).toBeGreaterThan(12);expect(bone.inFrame).toBe(bone.cranial);

  }
  records.push({species:id,life,bone});await harness.destroy(page);
 }
 fs.writeFileSync(path.join(report,'native-'+phase+'-audit.json'),JSON.stringify(records,null,2));
});
