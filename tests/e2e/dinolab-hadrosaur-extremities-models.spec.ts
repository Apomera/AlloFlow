import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.describe.configure({timeout:420_000,retries:0});test.use({video:'off',trace:'off'});
const phase=process.env.DINO_HADROSAUR_DISTAL_PHASE==='before'?'before':'after';
const report=path.resolve('reports/dinolab-hadrosaur-extremities');
const probes='var DistalRenderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new DistalRenderer(o),f=r.render.bind(r);r.render=function(s,c){window.__hadrosaurDistalScene=s;window.__hadrosaurDistalCamera=c;window.__hadrosaurDistalRenderer=r;return f(s,c)};return r};';
const harness=new GlHarness({toolFile:process.env.DINO_HADROSAUR_NATIVE_SOURCE||'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1280,height:960,layout:'document',appStyles:true,probes});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page:Page,id:string){
 await page.setViewportSize({width:1280,height:960});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',selected:id,field3dSelected:id,field3dStage:'studio',field3dOrientationDismissed:true,field3dAutoRotate:false,field3dReconstructionMode:'evidence',field3dShowSkeleton:false,field3dShowBody:true,field3dBodyOpacity:100,field3dShowHuman:false,field3dShowEvidence:false,field3dLabelMode:'key'}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* â”€',css.indexOf('--allo-stem-button-border:#00ff00',start));
 await page.addStyleTag({content:css.slice(start,end)});await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await page.locator('canvas.dinolab-3d-canvas').scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(()=>!!(window as any).__hadrosaurDistalScene?.getObjectByName('dinolab-specimen'))).toBe(true);
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
 const w=window as any,m=w.__hadrosaurDistalScene.getObjectByName('dinolab-specimen'),camera=w.__hadrosaurDistalCamera;m.updateMatrixWorld(true);camera.updateMatrixWorld(true);let invalid=0,triangles=0,vertices=0,inFrameVertices=0,foreignVisible=0,visibleDistal=0,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;const elements:any[]=[],longBoneAxes:any[]=[];let torsoMinY=Infinity;
 const visible=(o:any)=>{for(let a=o;a;a=a.parent){if(a.visible===false)return false;if(a===m)break;}return true;};
 m.traverse((o:any)=>{if(!(o.isMesh||o.isLine||o.isLineSegments||o.isSprite)||!visible(o))return;const tag=o.userData.dinoHadrosaurDistalElement,context=o.userData.dinoHadrosaurDistalContext;if(tag?.front===front&&tag.side===1||context?.front===front&&context.side===1&&context.lowerLegOnly===true)visibleDistal++;else foreignVisible++;});
 m.traverse((mesh:any)=>{if(!mesh.geometry||mesh.userData.dinoContour)return;for(const a of Object.values(mesh.geometry.attributes) as any[])if(!Array.from(a.array).every(Number.isFinite))invalid++;triangles+=(mesh.geometry.index?.count||0)/3;
 const tag=mesh.userData.dinoHadrosaurDistalElement,p=mesh.geometry.attributes.position;
 const long=mesh.geometry.userData.dinoLongBone;if(long&&p){const first=(long.lengthSegments+1)*long.radialSegments,start=m.worldToLocal(new w.THREE.Vector3().fromBufferAttribute(p,first).applyMatrix4(mesh.matrixWorld)),end=m.worldToLocal(new w.THREE.Vector3().fromBufferAttribute(p,first+long.radialSegments+1).applyMatrix4(mesh.matrixWorld));longBoneAxes.push({start:start.toArray(),end:end.toArray()});}
 if(mesh.name==='continuous-torso'&&p)for(let i=0;i<p.count;i++)torsoMinY=Math.min(torsoMinY,m.worldToLocal(new w.THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld)).y);
 if(!tag||tag.front!==front||!p)return;
 elements.push({...tag,vertices:p.count});if(tag.side!==1)return;for(let i=0;i<p.count;i++){vertices++;const world=new w.THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld),eye=world.clone().applyMatrix4(camera.matrixWorldInverse),clip=world.project(camera);if([clip.x,clip.y,clip.z].every(Number.isFinite)){minX=Math.min(minX,clip.x);maxX=Math.max(maxX,clip.x);minY=Math.min(minY,clip.y);maxY=Math.max(maxY,clip.y);if(eye.z<0&&Math.max(Math.abs(clip.x),Math.abs(clip.y),Math.abs(clip.z))<=1)inFrameVertices++;}}
 });return{body:m.userData.dinoFullBodyAnatomy,extremities:m.userData.dinoHadrosaurExtremities,crest:m.userData.dinoLambeosaurCrest,elements,longBoneAxes,torsoMinY:Number.isFinite(torsoMinY)?torsoMinY:null,vertices,inFrameVertices,foreignVisible,visibleDistal,isolation:m.userData.dinoHadrosaurDistalIsolation,screenSpan:Number.isFinite(minX)?Math.max(maxX-minX,maxY-minY)/2:0,invalid,triangles,errors:w.__events.errors,shaders:w.__hadrosaurDistalRenderer.info.programs.filter((p:any)=>p.diagnostics?.runnable===false).length,lost:w.__glLive()?.lost};
 },front);}
function sound(row:any){expect(row.invalid).toBe(0);expect(row.triangles).toBeGreaterThan(1000);expect(row.errors).toEqual([]);expect(row.shaders).toBe(0);expect(row.lost).toBe(false);}
async function frameReady(page:Page,front:boolean){if(phase==='before')return;await expect.poll(async()=>{const a=await audit(page,front);fs.writeFileSync(path.join(report,'latest-framing-audit.json'),JSON.stringify(a,null,2));return a.vertices>0&&a.inFrameVertices===a.vertices;}).toBe(true);}

test('five hadrosaur hands and feet retain native ray frames and coherent bone and living views',async({page})=>{
 const records:any[]=[];
 for(const id of ['parasaurolophus','corythosaurus','lambeosaurus','olorotitan','edmontosaurus']){
  await mount(page,id);await view(page,'Side');await portrait(page,id+'-'+phase+'-life-body-side.png');
  if(!await page.locator('#dinolab-part-picker').count())await page.getByRole('button',{name:'Explore anatomy',exact:true}).click();
  const parts:any[]=[];
  for(const part of ['hand','foot']){
   const front=part==='hand';await page.locator('#dinolab-part-picker').selectOption(part);await page.locator('[data-dino-part-inspect=life]').click();
   await view(page,'Side');await frameReady(page,front);const life=await audit(page,front);sound(life);await portrait(page,id+'-'+phase+'-life-'+part+'-side.png');
   await view(page,'Overhead');await frameReady(page,front);const lifeOverhead=await audit(page,front);sound(lifeOverhead);await portrait(page,id+'-'+phase+'-life-'+part+'-overhead.png');
   await page.locator('[data-dino-part-inspect=bone]').click();await expect.poll(()=>page.evaluate(()=>!!(window as any).__hadrosaurDistalScene.getObjectByName('dinolab-specimen').getObjectByName('continuous-torso'))).toBe(false);
   await view(page,'Side');await frameReady(page,front);const bone=await audit(page,front);sound(bone);await portrait(page,id+'-'+phase+'-bone-'+part+'-side.png');
   await view(page,'Overhead');await frameReady(page,front);const boneOverhead=await audit(page,front);sound(boneOverhead);await portrait(page,id+'-'+phase+'-bone-'+part+'-overhead.png');
   if(phase==='after'){
    const preserved=JSON.parse(fs.readFileSync('tests/fixtures/dinolab_hadrosaur_native_body_preserved.json','utf8'));expect(preserved.sourceHash).toBe('4831937ee7c95260084fc5dac0fae6b623ee1ba83f0ab1ee56ced1d27b7abae9');const prior={life:preserved.species[id]};
    if(id!=='edmontosaurus')expect(life.body).toEqual(prior.life.body);
    else {
     const retained=(body:any)=>{const {anchors,limbs,...meta}=body;return {...meta,limbs:limbs.map((limb:any)=>({front:limb.front,side:limb.side,foot:limb.foot,contact:limb.contact}))};};
     expect(retained(life.body)).toEqual(retained(prior.life.body));
     for(const key of ['hip','shoulder','head','tail']){expect(life.body.anchors[key][0]).toBe(prior.life.body.anchors[key][0]);expect(life.body.anchors[key][2]).toBe(prior.life.body.anchors[key][2]);expect(life.body.anchors[key][1]).toBeGreaterThan(prior.life.body.anchors[key][1]);}
     expect(life.body.anchors.head[1]-prior.life.body.anchors.head[1]).toBeCloseTo(life.body.anchors.shoulder[1]-prior.life.body.anchors.shoulder[1],10);
     expect(life.body.anchors.tail[1]-prior.life.body.anchors.tail[1]).toBeCloseTo(life.body.anchors.hip[1]-prior.life.body.anchors.hip[1],10);
     expect(life.torsoMinY).toBeGreaterThan(1.20);
     for(const limb of life.body.limbs){const old=prior.life.body.limbs.find((r:any)=>r.front===limb.front&&r.side===limb.side);expect(limb.top[0]).toBe(old.top[0]);expect(limb.top[2]).toBe(old.top[2]);expect(limb.top[1]).toBeGreaterThan(old.top[1]);expect(limb.ankle).not.toEqual(old.ankle);expect(limb.knee).not.toEqual(old.knee);const distal=life.extremities.limbs.find((r:any)=>r.front===limb.front&&r.side===limb.side);expect(distal.ankle).toEqual(limb.ankle);expect(distal.root).toEqual(limb.foot);
      const close=(a:number[],b:number[])=>Math.hypot(...a.map((x,i)=>x-b[i]))<1e-5;
      for(const [start,end] of [[limb.top,limb.knee],[limb.knee,limb.ankle]]){const axis=bone.longBoneAxes.find((r:any)=>close(r.start,start)&&close(r.end,end));expect(axis,'actual native long-bone caps match the raised frame').toBeTruthy();expect((axis.start[1]-axis.end[1])/Math.hypot(...axis.start.map((x:number,i:number)=>x-axis.end[i]))).toBeGreaterThan(.60);}
     }
    }
    expect(life.crest).toEqual(prior.life.crest);expect(life.extremities).toEqual(bone.extremities);
    for(const layer of [life,lifeOverhead,bone,boneOverhead]){expect(layer.extremities.species).toBe(id);expect(layer.vertices).toBeGreaterThan(200);expect(layer.inFrameVertices).toBe(layer.vertices);expect(layer.screenSpan).toBeGreaterThan(.35);expect(layer.foreignVisible).toBe(0);expect(layer.visibleDistal).toBeGreaterThan(3);expect(layer.isolation).toMatchObject({active:true,kind:front?'manus':'pes',side:1});expect([...new Set(layer.elements.map((r:any)=>r.side))].sort()).toEqual([-1,1]);}
    expect([...new Set(bone.elements.filter((r:any)=>r.ray>0).map((r:any)=>r.ray))].sort()).toEqual(front?[2,3,4,5]:[2,3,4]);
   }
   parts.push({part,life,lifeOverhead,bone,boneOverhead});
  }
  await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await view(page,'Side');await portrait(page,id+'-'+phase+'-bone-body-side.png');
  records.push({species:id,parts});await harness.destroy(page);
 }
 fs.writeFileSync(path.join(report,'native-'+phase+'-audit.json'),JSON.stringify(records,null,2));
});
