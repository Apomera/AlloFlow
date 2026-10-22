import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.describe.configure({timeout:360_000,retries:0});test.use({video:'off',trace:'off'});
const phase=process.env.DINO_RAPTOR_ARM_PHASE==='before'?'before':'after';
const report=path.resolve('reports/dinolab-dromaeosaur-forelimb');
const probes='var ArmRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new ArmRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__raptorArmScene=s;window.__raptorArmCamera=c;window.__raptorArmRenderer=r;return f(s,c)};return r};';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1280,height:960,layout:'document',appStyles:true,probes});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page,id:string){
 await page.setViewportSize({width:1280,height:960});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',selected:id,field3dSelected:id,field3dStage:'studio',field3dOrientationDismissed:true,field3dAutoRotate:false,field3dReconstructionMode:'evidence',field3dShowSkeleton:false,field3dShowBody:true,field3dBodyOpacity:100,field3dShowHuman:false,field3dShowEvidence:false,field3dLabelMode:'key'}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));
 await page.addStyleTag({content:css.slice(start,end)});await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(()=>!!(window as any).__raptorArmScene?.getObjectByName('dinolab-specimen'))).toBe(true);
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
 const w=window as any,m=w.__raptorArmScene.getObjectByName('dinolab-specimen'),camera=w.__raptorArmCamera;m.updateMatrixWorld(true);camera.updateMatrixWorld(true);let invalid=0,triangles=0,armVertices=0,inFrameVertices=0;const manual:any[]=[],forearmAttachments:any[]=[];
 m.traverse((mesh:any)=>{if(!mesh.geometry||mesh.userData.dinoContour)return;for(const a of Object.values(mesh.geometry.attributes) as any[])if(!Array.from(a.array).every(Number.isFinite))invalid++;triangles+=(mesh.geometry.index?.count||0)/3;
 if(mesh.userData.dinoTheropodManualElement){manual.push({...mesh.userData.dinoTheropodManualElement,vertices:mesh.geometry.attributes.position.count});const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){armVertices++;const world=new w.THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),view=world.clone().applyMatrix4(camera.matrixWorldInverse),clip=world.project(camera);if(view.z<0&&[clip.x,clip.y,clip.z].every(Number.isFinite)&&Math.max(Math.abs(clip.x),Math.abs(clip.y),Math.abs(clip.z))<=1)inFrameVertices++;}}
 if(mesh.userData.dinoFeature==='feather'&&mesh.userData.dinoDromaeosaurPlumage?.tract==='forearm'){const point=mesh.userData.dinoAttachment?.point,root=mesh.getWorldPosition(new w.THREE.Vector3()),anchor=point?mesh.parent.localToWorld(new w.THREE.Vector3().fromArray(point)):null;forearmAttachments.push({parent:mesh.parent.userData.dinoTheropodManualElement?.element,gap:anchor?root.distanceTo(anchor):null,width:mesh.userData.featherWidth});}
 });return{body:m.userData.dinoFullBodyAnatomy,pes:m.userData.dinoDromaeosaurPes,cranium:m.userData.dinoTheropodCranium,plumage:m.userData.dinoDromaeosaurPlumage,manus:m.userData.dinoTheropodManus,manual,forearmAttachments,armVertices,inFrameVertices,invalid,triangles,errors:w.__events.errors,shaders:w.__raptorArmRenderer.info.programs.filter((p:any)=>p.diagnostics?.runnable===false).length,lost:w.__glLive()?.lost};
 });}
function sound(row:any){expect(row.invalid).toBe(0);expect(row.triangles).toBeGreaterThan(1000);expect(row.errors).toEqual([]);expect(row.shaders).toBe(0);expect(row.lost).toBe(false);}
async function armFrameReady(page:Page){
 if(phase==='before')return;
 await expect.poll(async()=>{const a=await audit(page);fs.writeFileSync(path.join(report,'latest-framing-audit.json'),JSON.stringify(a,null,2));return a.armVertices>0&&a.inFrameVertices===a.armVertices;}).toBe(true);
}

test('dromaeosaur forelimbs fit the whole animal and retain coherent skeletal and life anatomy',async({page})=>{
 const records:any[]=[];
 for(const id of ['velociraptor','deinonychus']){
  await mount(page,id);await view(page,'Side');await portrait(page,id+'-'+phase+'-life-body-side.png');await view(page,'Overhead');await portrait(page,id+'-'+phase+'-life-body-overhead.png');
  if(!await page.locator('#dinolab-part-picker').count())await page.getByRole('button',{name:'Explore anatomy',exact:true}).click();
  await page.locator('#dinolab-part-picker').selectOption('forelimb');await view(page,'Side');await armFrameReady(page);const life=await audit(page);sound(life);await portrait(page,id+'-'+phase+'-life-arm-side.png');await view(page,'Front');await portrait(page,id+'-'+phase+'-life-arm-front.png');
  await page.locator('[data-dino-part-inspect=bone]').click();await expect.poll(()=>page.evaluate(()=>!!(window as any).__raptorArmScene.getObjectByName('dinolab-specimen').getObjectByName('continuous-torso'))).toBe(false);await view(page,'Side');await armFrameReady(page);const bone=await audit(page);sound(bone);await portrait(page,id+'-'+phase+'-bone-arm-side.png');await view(page,'Front');await portrait(page,id+'-'+phase+'-bone-arm-front.png');await view(page,'Overhead');await portrait(page,id+'-'+phase+'-bone-arm-overhead.png');
  expect(life.pes).toEqual(bone.pes);expect(life.cranium).toEqual(bone.cranium);
  if(phase==='after'){
   const prior=JSON.parse(fs.readFileSync(path.join(report,'native-before-audit.json'),'utf8')).find((r:any)=>r.species===id);
   expect(life.pes).toEqual(prior.life.pes);expect(life.cranium).toEqual(prior.life.cranium);expect(life.body.anchors).toEqual(prior.life.body.anchors);
   expect(life.manus.species).toBe(id);expect(life.manus.dimensionsAreInterpretive).toBe(true);expect(life.manus.tissueHypothesisIndependentAnchors).toBe(true);expect(life.manus.sources.every((s:any)=>s.title&&s.url.startsWith('https://'))).toBe(true);expect(life.manus.manualRays.map((r:any)=>r.phalanges)).toEqual([2,3,4]);
   expect(life.manus).toEqual(bone.manus);expect(bone.manual.filter((r:any)=>r.element==='radius')).toHaveLength(2);expect(bone.manual.filter((r:any)=>r.element==='ulna')).toHaveLength(2);expect(bone.manual.filter((r:any)=>r.element==='ungual')).toHaveLength(6);
   expect(life.manual.every((r:any)=>r.layer==='life')).toBe(true);expect(bone.manual.every((r:any)=>r.layer==='bone')).toBe(true);
   for(const layer of[life,bone]){expect(layer.armVertices).toBeGreaterThan(1000);expect(layer.inFrameVertices).toBe(layer.armVertices);}
   expect(life.forearmAttachments).toHaveLength(40);expect(bone.forearmAttachments).toEqual([]);for(const attachment of life.forearmAttachments){expect(attachment.parent).toBe('forearm');expect(attachment.gap).not.toBeNull();expect(attachment.gap).toBeLessThan(attachment.width*.031+1e-6);}
  }
  records.push({species:id,life,bone});await harness.destroy(page);
 }
 fs.writeFileSync(path.join(report,'native-'+phase+'-audit.json'),JSON.stringify(records,null,2));
});
