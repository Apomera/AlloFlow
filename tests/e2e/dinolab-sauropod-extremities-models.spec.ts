import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.describe.configure({timeout:420_000,retries:0});test.use({video:'off',trace:'off'});
const phase=process.env.DINO_SAUROPOD_DISTAL_PHASE==='before'?'before':'after';
const report=path.resolve('reports/dinolab-sauropod-extremities');
const probes='var DistalRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new DistalRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__sauropodDistalScene=s;window.__sauropodDistalCamera=c;window.__sauropodDistalRenderer=r;return f(s,c)};return r};';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1280,height:960,layout:'document',appStyles:true,probes});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page,id:string){
 await page.setViewportSize({width:1280,height:960});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',selected:id,field3dSelected:id,field3dStage:'studio',field3dOrientationDismissed:true,field3dAutoRotate:false,field3dReconstructionMode:'evidence',field3dShowSkeleton:false,field3dShowBody:true,field3dBodyOpacity:100,field3dShowHuman:false,field3dShowEvidence:false,field3dLabelMode:'key'}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));
 await page.addStyleTag({content:css.slice(start,end)});await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(()=>!!(window as any).__sauropodDistalScene?.getObjectByName('dinolab-specimen'))).toBe(true);
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
async function audit(page:Page,front:boolean){return page.evaluate(front=>{
 const w=window as any,m=w.__sauropodDistalScene.getObjectByName('dinolab-specimen'),camera=w.__sauropodDistalCamera;m.updateMatrixWorld(true);camera.updateMatrixWorld(true);let invalid=0,triangles=0,vertices=0,inFrameVertices=0,foreignVisible=0,visibleDistal=0,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;const elements:any[]=[];
 const visible=(o:any)=>{for(let a=o;a;a=a.parent){if(a.visible===false)return false;if(a===m)break;}return true;};
 m.traverse((o:any)=>{if(!(o.isMesh||o.isLine||o.isLineSegments||o.isSprite)||!visible(o))return;const tag=o.userData.dinoSauropodDistalElement,context=o.userData.dinoSauropodDistalContext;if(tag?.front===front&&tag.side===1||context?.front===front&&context.side===1&&context.lowerLegOnly===true)visibleDistal++;else foreignVisible++;});
 m.traverse((mesh:any)=>{if(!mesh.geometry||mesh.userData.dinoContour)return;for(const a of Object.values(mesh.geometry.attributes) as any[])if(!Array.from(a.array).every(Number.isFinite))invalid++;triangles+=(mesh.geometry.index?.count||0)/3;
 const tag=mesh.userData.dinoSauropodDistalElement,p=mesh.geometry.attributes.position;if(!tag||tag.front!==front||!p)return;
 elements.push({...tag,vertices:p.count});if(tag.side!==1)return;for(let i=0;i<p.count;i++){vertices++;const world=new w.THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),eye=world.clone().applyMatrix4(camera.matrixWorldInverse),clip=world.project(camera);if([clip.x,clip.y,clip.z].every(Number.isFinite)){minX=Math.min(minX,clip.x);maxX=Math.max(maxX,clip.x);minY=Math.min(minY,clip.y);maxY=Math.max(maxY,clip.y);if(eye.z<0&&Math.max(Math.abs(clip.x),Math.abs(clip.y),Math.abs(clip.z))<=1)inFrameVertices++;}}
 });return{body:m.userData.dinoFullBodyAnatomy,extremities:m.userData.dinoSauropodExtremities,cranium:m.userData.dinoSauropodCranium,elements,vertices,inFrameVertices,foreignVisible,visibleDistal,isolation:m.userData.dinoSauropodDistalIsolation,screenSpan:Number.isFinite(minX)?Math.max(maxX-minX,maxY-minY)/2:0,invalid,triangles,errors:w.__events.errors,shaders:w.__sauropodDistalRenderer.info.programs.filter((p:any)=>p.diagnostics?.runnable===false).length,lost:w.__glLive()?.lost};
 },front);}
function sound(row:any){expect(row.invalid).toBe(0);expect(row.triangles).toBeGreaterThan(1000);expect(row.errors).toEqual([]);expect(row.shaders).toBe(0);expect(row.lost).toBe(false);}
async function frameReady(page:Page,front:boolean){if(phase==='before')return;await expect.poll(async()=>{const a=await audit(page,front);fs.writeFileSync(path.join(report,'latest-framing-audit.json'),JSON.stringify(a,null,2));return a.vertices>0&&a.inFrameVertices===a.vertices;}).toBe(true);}

test('reviewed sauropod forefeet and hind feet retain coherent native bone and life views',async({page})=>{
 const records:any[]=[];
 for(const id of ['brachiosaurus','diplodocus','apatosaurus','camarasaurus']){
  await mount(page,id);await view(page,'Side');await portrait(page,id+'-'+phase+'-life-body-side.png');
  if(!await page.locator('#dinolab-part-picker').count())await page.getByRole('button',{name:'Explore anatomy',exact:true}).click();
  const parts:any[]=[];
  for(const part of ['hand','foot']){
   const front=part==='hand';await page.locator('#dinolab-part-picker').selectOption(part);await page.locator('[data-dino-part-inspect=life]').click();
   await view(page,'Side');await frameReady(page,front);const life=await audit(page,front);sound(life);await portrait(page,id+'-'+phase+'-life-'+part+'-side.png');
   await view(page,'Overhead');await frameReady(page,front);await portrait(page,id+'-'+phase+'-life-'+part+'-overhead.png');
   await page.locator('[data-dino-part-inspect=bone]').click();await expect.poll(()=>page.evaluate(()=>!!(window as any).__sauropodDistalScene.getObjectByName('dinolab-specimen').getObjectByName('continuous-torso'))).toBe(false);
   await view(page,'Side');await frameReady(page,front);const bone=await audit(page,front);sound(bone);await portrait(page,id+'-'+phase+'-bone-'+part+'-side.png');
   await view(page,'Overhead');await frameReady(page,front);await portrait(page,id+'-'+phase+'-bone-'+part+'-overhead.png');
   if(phase==='after'){
    const prior=JSON.parse(fs.readFileSync(path.join(report,'native-before-audit.json'),'utf8')).find((r:any)=>r.species===id).parts.find((r:any)=>r.part===part);
    expect(life.body.anchors).toEqual(prior.life.body.anchors);expect(life.cranium).toEqual(prior.life.cranium);expect(life.extremities).toEqual(bone.extremities);
    for(const layer of [life,bone]){expect(layer.extremities.species).toBe(id);expect(layer.vertices).toBeGreaterThan(200);expect(layer.inFrameVertices).toBe(layer.vertices);expect(layer.screenSpan).toBeGreaterThan(.35);expect(layer.foreignVisible).toBe(0);expect(layer.visibleDistal).toBeGreaterThan(10);expect(layer.isolation).toMatchObject({active:true,kind:front?'manus':'pes',side:1});expect([...new Set(layer.elements.map((r:any)=>r.side))].sort()).toEqual([-1,1]);}
    expect([...new Set(bone.elements.filter((r:any)=>r.ray>0).map((r:any)=>r.ray))].sort()).toEqual([1,2,3,4,5]);
   }
   parts.push({part,life,bone});
  }
  records.push({species:id,parts});await harness.destroy(page);
 }
 fs.writeFileSync(path.join(report,'native-'+phase+'-audit.json'),JSON.stringify(records,null,2));
});
