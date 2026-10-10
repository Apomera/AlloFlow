import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const report=process.env.DINO_BODY_REPORT_DIR||'reports/dinolab-3d-body-surfaces';
const sourceHash=process.env.DINO_BODY_SOURCE_HASH||null;
test.describe.configure({timeout:360_000});
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
 probes:"var now=performance.now.bind(performance);window.__bodyTime=10000;performance.now=function(){return window.__bodyTime==null?now():window.__bodyTime;};var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__bodyScene=s;window.__bodyCamera=c;window.__bodyRenderer=r;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
async function settle(page){await page.waitForFunction(()=>{const w=window as any,h=w.__glCanvas();return !!h&&!h.gl.isContextLost()&&w.__bodyRenderer?.domElement===h.el&&h.el.isConnected;});await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));}
async function mount(page,species){
 await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,field3dWorkflowStarted:false,field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));
 await page.addStyleTag({content:css.slice(start,end)});
 await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__bodyScene)).toBe(true);
 const substitutions=await page.evaluate(()=>(window as any).__harnessNotes.substitutes);
 expect(substitutions).toEqual(process.env.STEM_GL_SUBSTITUTE?['stem_lab/stem_tool_dinolab.js']:[]);
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();
 await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await settle(page);
}
async function inspect(page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,s=w.__bodyScene,c=w.__bodyCamera,r=w.__bodyRenderer,m=s.getObjectByName('dinolab-specimen');s.updateMatrixWorld(true);c.updateMatrixWorld(true);
 const meshes=[],features={},regions={};let invalid=0,outside=0,triangles=0;
 m.traverse(p=>{if(!p.isMesh||!p.userData.dinoAnatomy)return;
  if(p.userData.dinoFeature)features[p.userData.dinoFeature]=(features[p.userData.dinoFeature]||0)+1;
  if(p.userData.dinoRegion)regions[p.userData.dinoRegion]=(regions[p.userData.dinoRegion]||0)+1;
  const g=p.geometry,pos=g.attributes.position,norm=g.attributes.normal,uv=g.attributes.uv;
  for(const a of [pos,norm,uv])if(a)for(const v of a.array)if(!Number.isFinite(v))invalid++;
  if(g.index)for(const v of g.index.array)if(!Number.isInteger(v)||v<0||v>=pos.count)invalid++;
  for(let i=0;i<pos.count;i++){const v=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(p.matrixWorld).project(c);if(!Number.isFinite(v.x+v.y+v.z))invalid++;if(Math.max(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))>1.001)outside++;}
  const count=g.index?g.index.count/3:pos.count/3;triangles+=count;
  meshes.push({name:p.name,feature:p.userData.dinoFeature,region:p.userData.dinoRegion,geometry:g.uuid,vertices:pos.count,triangles:count,parent:p.parent.name,material:p.material.type,opacity:p.material.opacity,transparent:p.material.transparent,depthWrite:p.material.depthWrite,box:g.boundingBox?{min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()}:null});
 });return {features,regions,meshes,invalid,outside,triangles,camera:c.position.toArray(),model:m.uuid,memory:{...r.info.memory},render:{...r.info.render},errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
function check(p,fitted=true){expect(p.errors).toEqual([]);expect(p.invalid).toBe(0);if(fitted)expect(p.outside).toBe(0);expect(p.lost).toBe(false);expect(p.shaderFailures).toBe(0);}
async function controls(page){const details=page.locator('.dinolab-3d-controls-disclosure');if(!await details.evaluate(e=>(e as HTMLDetailsElement).open))await details.locator(':scope > summary').click();}
async function camera(page,name){await controls(page);await page.getByRole('button',{name:name+' camera view',exact:true}).click();await settle(page);}
async function capture(page,name){await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+name+'.png'});}

async function surfaces(page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,m=w.__bodyScene.getObjectByName('dinolab-specimen');m.updateMatrixWorld(true);const rows=[];
 m.traverse(p=>{if(!p.isMesh||p.userData.dinoContour||!p.geometry?.userData?.dinoTransportedFrame)return;let cranialOwner=false;for(let q=p.parent;q;q=q.parent)if(q.name==='dinolab-connected-cranial-motion')cranialOwner=true;
 const g=p.geometry,mat=p.material;rows.push({mesh:p.uuid,geometry:g.uuid,name:p.name,region:p.userData.dinoRegion,parent:p.parent.uuid,parentName:p.parent.name,position:p.position.toArray(),quaternion:p.quaternion.toArray(),scale:p.scale.toArray(),world:p.matrixWorld.elements.slice(),transported:g.userData.dinoTransportedFrame,smooth:g.userData.dinoSmoothProfile,roundedCaps:g.userData.dinoRoundedCaps||null,vertices:g.attributes.position.count,triangles:g.index.count/3,cranialOwner,material:{uuid:mat.uuid,opacity:mat.opacity,transparent:mat.transparent,depthWrite:mat.depthWrite}});});
 const rig=m.getObjectByName('dinolab-connected-cranial-motion');return {model:m.uuid,rows,cranialPivot:rig?.userData.pivot?.slice(),rig:rig?.matrixWorld.elements.slice()};
});}
async function trackSurfaces(page){return page.evaluate(()=>{const w=window as any,unique=new Set();w.__bodyDisposal=[];w.__bodyScene.traverse(p=>{if(p.geometry?.userData?.dinoTransportedFrame)unique.add(p.geometry);});unique.forEach((g:any)=>{const row={uuid:g.uuid,disposed:0};w.__bodyDisposal.push(row);g.addEventListener('dispose',()=>row.disposed++);});return unique.size;});}
for(const species of ['tyrannosaurus','brachiosaurus','microraptor'])test(species+' transported surfaces retain controls and motion',async({page})=>{
 await mount(page,species);check(await inspect(page));const first=await surfaces(page);expect(first.rows.length).toBeGreaterThan(3);expect(first.rows.every(r=>r.transported&&r.smooth)).toBe(true);expect(first.cranialPivot).toHaveLength(3);expect(first.rig).toHaveLength(16);
 const torso=first.rows.find(r=>r.name==='continuous-torso');expect(torso).toBeTruthy();
 expect(first.rows.filter(r=>!!r.roundedCaps)).toHaveLength(0);expect(torso.vertices).toBe(1227);expect(torso.triangles).toBe(2352);
 const identities=first.rows.map(r=>[r.mesh,r.geometry,r.parent,r.position]);await controls(page);await page.getByRole('slider',{name:'Body inference opacity',exact:true}).press('Home');await settle(page);
 const low=await surfaces(page);check(await inspect(page));expect(low.model).toBe(first.model);expect(low.rows.map(r=>[r.mesh,r.geometry,r.parent,r.position])).toEqual(identities);expect(low.rows.every(r=>r.material.opacity<1&&r.material.transparent&&!r.material.depthWrite)).toBe(true);
 await page.getByRole('slider',{name:'Body inference opacity',exact:true}).press('End');await settle(page);const opaque=await surfaces(page);expect(opaque.rows.map(r=>[r.mesh,r.geometry,r.parent,r.position])).toEqual(identities);expect(opaque.rows.every(r=>r.material.opacity===1&&!r.material.transparent&&r.material.depthWrite)).toBe(true);
 const phone=[];for(const width of [320,390]){await page.setViewportSize({width,height:844});await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await settle(page);const p=await inspect(page);check(p);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await capture(page,species+'-phone-'+width);phone.push({width,invalid:p.invalid,outside:p.outside});}
 await page.setViewportSize({width:1180,height:920});await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await settle(page);await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.getByRole('button',{name:'Pause motion',exact:true})).toBeEnabled();const samples=[];
 for(let i=0;i<12;i++){await page.evaluate(async()=>{(window as any).__bodyTime+=50;await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));});const sample=await surfaces(page);expect(sample.model).toBe(first.model);expect(sample.rows.map(r=>[r.mesh,r.geometry,r.parent])).toEqual(first.rows.map(r=>[r.mesh,r.geometry,r.parent]));expect(sample.cranialPivot).toEqual(first.cranialPivot);for(const r of sample.rows)expect(r.world.every(Number.isFinite)).toBe(true);samples.push(sample);}
 expect(samples.some(p=>p.rows.some((r,j)=>r.world.some((v,k)=>Math.abs(v-samples[0].rows[j].world[k])>1e-8)))).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await settle(page);check(await inspect(page));const unique=await trackSurfaces(page);expect(unique).toBe(first.rows.length);
 await page.locator('#dinotab-notes').click();await expect.poll(async()=>(await harness.glContexts(page)).filter(r=>!r.lost).length).toBe(0);const disposal=await page.evaluate(()=>(window as any).__bodyDisposal);expect(disposal.every(r=>r.disposed>=1)).toBe(true);
 fs.writeFileSync(report+'/'+species+'-runtime-metrics.json',JSON.stringify({sourceHash,first,low,opaque,phone,samples,actualMotion:true,modelAndGeometryPreserved:true,cranialPivotPreserved:true,nativeNotesContextRelease:true,disposal},null,2));
});
