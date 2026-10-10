import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const report=process.env.DINO_MODEL_REPORT_DIR||'reports/dinolab-3d-display-shells';
test.describe.configure({timeout:360_000});test.use({video:'off',trace:'off'});
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
 probes:"var now=performance.now.bind(performance);window.__shellTime=10000;performance.now=function(){return window.__shellTime==null?now():window.__shellTime;};var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__shellScene=s;window.__shellCamera=c;window.__shellRenderer=r;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function settle(page){await page.waitForFunction(()=>{const w=window as any,h=w.__glCanvas();return !!h&&!h.gl.isContextLost()&&w.__shellRenderer?.domElement===h.el&&h.el.isConnected;});await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));}
async function mount(page,species){
 await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,field3dWorkflowStarted:false,field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));await page.addStyleTag({content:css.slice(start,end)});
 await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__shellScene)).toBe(true);
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();
 await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await settle(page);
}
async function inspect(page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,s=w.__shellScene,c=w.__shellCamera,r=w.__shellRenderer,m=s.getObjectByName('dinolab-specimen');s.updateMatrixWorld(true);c.updateMatrixWorld(true);
 const features={},shells=[];let invalid=0,outside=0;
 m.traverse(p=>{if(p.userData.dinoFeature)features[p.userData.dinoFeature]=(features[p.userData.dinoFeature]||0)+1;
  const meta=p.geometry?.userData?.dinoDisplayShell;if(!meta)return;
  const g=p.geometry,pos=g.attributes.position,norm=g.attributes.normal,uv=g.attributes.uv,mat=p.material;
  if(!norm||!uv||pos.count!==norm.count||pos.count!==uv.count||!g.index||g.index.count%3)invalid++;
  for(const a of [pos,norm,uv])if(a)for(const v of a.array)if(!Number.isFinite(v))invalid++;
  if(g.index)for(const v of g.index.array)if(!Number.isInteger(v)||v<0||v>=pos.count)invalid++;
  for(let i=0;i<pos.count;i++){const v=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(p.matrixWorld).project(c);if(!Number.isFinite(v.x+v.y+v.z))invalid++;if(Math.max(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))>1.001)outside++;}
  const rig=m.getObjectByName('dinolab-connected-cranial-motion'),head=m.getObjectByName('continuous-cranial-surface');let belongs=false;for(let parent=p.parent;parent;parent=parent.parent)if(parent===rig)belongs=true;
  const relative=head?new T.Matrix4().copy(head.matrixWorld).invert().multiply(p.matrixWorld).elements:null;
  shells.push({mesh:p.uuid,geometry:g.uuid,feature:meta.feature,metadata:{...meta},vertices:pos.count,triangles:g.index?.count/3,name:p.name,parent:p.parent.name,cranialOwner:belongs,relativeToHead:relative,
   material:{uuid:mat.uuid,type:mat.type,side:mat.side,color:mat.color?.toArray(),opacity:mat.opacity,transparent:mat.transparent,depthWrite:mat.depthWrite},box:g.boundingBox?{min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()}:null});
 });const rig=m.getObjectByName('dinolab-connected-cranial-motion');return {features,shells,invalid,outside,cranialRigMatrix:rig?rig.matrixWorld.elements.slice():null,model:m.uuid,memory:{...r.info.memory},errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
function check(p,counts={frill:0,plates:0},fitted=true){
 expect(p.errors).toEqual([]);expect(p.invalid).toBe(0);if(fitted)expect(p.outside).toBe(0);expect(p.lost).toBe(false);expect(p.shaderFailures).toBe(0);
 expect(p.features.frill||0).toBe(counts.frill);expect(p.features['dorsal-plate']||0).toBe(counts.plates);expect(p.shells.filter(s=>s.feature==='frill')).toHaveLength(counts.frill);expect(p.shells.filter(s=>s.feature==='dorsal-plate')).toHaveLength(counts.plates);
 for(const s of p.shells){expect(s.metadata).toMatchObject({closed:true,roundedRim:true,thicknessIsInterpretive:true});expect(s.metadata.thickness).toBeGreaterThan(0);expect(s.vertices).toBeGreaterThan(500);expect(s.vertices).toBeLessThanOrEqual(1200);expect(s.triangles).toBeLessThanOrEqual(2300);expect(s.box).not.toBeNull();if(s.feature==='frill'&&p.cranialRigMatrix)expect(s.cranialOwner).toBe(true);}
}
async function controls(page){const details=page.locator('.dinolab-3d-controls-disclosure');if(!await details.evaluate(e=>(e as HTMLDetailsElement).open))await details.locator(':scope > summary').click();}
async function camera(page,name){await controls(page);await page.getByRole('button',{name:name+' camera view',exact:true}).click();await settle(page);}
async function capture(page,name){await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+name+'.png'});}
async function trackNewGeometry(page){return page.evaluate(()=>{
 const w=window as any,unique=new Set();w.__shellDisposal=[];w.__shellScene.traverse(p=>{if(p.geometry?.userData?.dinoDisplayShell)unique.add(p.geometry);});
 unique.forEach((g:any)=>{const row={uuid:g.uuid,feature:g.userData.dinoDisplayShell.feature,disposed:0};w.__shellDisposal.push(row);g.addEventListener('dispose',()=>row.disposed++);});return unique.size;
});}
async function notesTeardown(page,expected){
 await page.locator('#dinotab-notes').click();await expect.poll(()=>page.evaluate(()=>(window as any).__shellDisposal.filter(r=>r.disposed===1).length)).toBe(expected);
 const disposal=await page.evaluate(()=>(window as any).__shellDisposal);expect(disposal.every(r=>r.disposed===1)).toBe(true);
 await expect.poll(async()=>(await harness.glContexts(page)).filter(r=>!r.lost).length).toBe(0);
 return {disposal,contexts:await harness.glContexts(page),nativeNotesTeardown:true,harnessDestroyNotYetCalled:true};
}
for(const species of ['triceratops','stegosaurus','protoceratops','psittacosaurus','aquilops'])test(species+' display shells preserve reconstruction gates and camera bounds',async({page})=>{
 await mount(page,species);const counts={frill:['triceratops','protoceratops','psittacosaurus'].includes(species)?1:0,plates:species==='stegosaurus'?17:0},first=await inspect(page);check(first,counts);
 if(counts.frill){expect(first.cranialRigMatrix).not.toBeNull();expect(first.shells[0].cranialOwner).toBe(true);}
 for(const s of first.shells)expect(s.material).toMatchObject({opacity:1,transparent:false,depthWrite:true});
 await capture(page,species+'-life');
 if(counts.frill){await page.getByRole('button',{name:'Study head details',exact:true}).click();await settle(page);check(await inspect(page),counts);await capture(page,species+'-head-oblique');}
 if(species==='triceratops'){
  await camera(page,'Side');check(await inspect(page),counts);await capture(page,'triceratops-head-side');await camera(page,'Front');check(await inspect(page),counts);await capture(page,'triceratops-head-front');
 }
 if(species==='stegosaurus'){
  await camera(page,'Side');check(await inspect(page),counts);await capture(page,'stegosaurus-side');await page.getByRole('button',{name:'Study body details',exact:true}).click();await settle(page);check(await inspect(page),counts,false);await capture(page,'stegosaurus-body');
 }
 if(['triceratops','stegosaurus'].includes(species)){
  await controls(page);const beforeOpacity=await inspect(page);await page.getByRole('slider',{name:'Body inference opacity',exact:true}).press('Home');await settle(page);const low=await inspect(page);check(low,counts,false);
  expect(low.model).toBe(beforeOpacity.model);expect(low.shells.map(s=>s.geometry)).toEqual(beforeOpacity.shells.map(s=>s.geometry));expect(low.shells.every(s=>s.material.opacity<1&&s.material.transparent&&!s.material.depthWrite)).toBe(true);
  await page.getByRole('slider',{name:'Body inference opacity',exact:true}).press('End');await settle(page);const opaque=await inspect(page);expect(opaque.shells.map(s=>s.geometry)).toEqual(beforeOpacity.shells.map(s=>s.geometry));expect(opaque.memory).toEqual(beforeOpacity.memory);for(const s of opaque.shells)expect(s.material).toMatchObject({opacity:1,transparent:false,depthWrite:true});
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();await settle(page);await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();const fossil=await inspect(page);check(fossil,counts);await capture(page,species+'-fossil');
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();await settle(page);await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();const restored=await inspect(page);check(restored,counts);
  for(const width of [320,390]){await page.setViewportSize({width,height:844});await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await settle(page);check(await inspect(page),counts);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await capture(page,species+'-phone-'+width);}
 }
 const unique=await trackNewGeometry(page);expect(unique).toBe(counts.frill+counts.plates);const lifecycle=await notesTeardown(page,unique);
 fs.writeFileSync(report+'/'+species+'-metrics.json',JSON.stringify({sourceHash:process.env.DINO_MODEL_SOURCE_HASH,first,lifecycle},null,2));
});

test('curved frill stays owned by the skull during cranial motion',async({page})=>{
 await mount(page,'triceratops');const first=await inspect(page);check(first,{frill:1,plates:0});expect(first.cranialRigMatrix).not.toBeNull();
 await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.getByRole('button',{name:'Pause motion',exact:true})).toBeEnabled();await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
 const samples=[],rigSamples=[];for(let i=0;i<12;i++){await page.evaluate(async()=>{(window as any).__shellTime+=50;await new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r())));});const p=await inspect(page);check(p,{frill:1,plates:0});expect(p.model).toBe(first.model);expect(p.shells[0].geometry).toBe(first.shells[0].geometry);const relative=p.shells[0].relativeToHead;for(let k=0;k<relative.length;k++)expect(Math.abs(relative[k]-first.shells[0].relativeToHead[k])).toBeLessThan(1e-7);samples.push(relative);rigSamples.push(p.cranialRigMatrix);}
 expect(rigSamples.some(matrix=>matrix.some((value,k)=>Math.abs(value-rigSamples[0][k])>1e-8))).toBe(true);
 const unique=await trackNewGeometry(page),lifecycle=await notesTeardown(page,unique);fs.writeFileSync(report+'/triceratops-motion-lifecycle.json',JSON.stringify({samples,rigSamples,actualCranialMotion:true,geometryPreserved:true,relativeSkullTransformPreserved:true,lifecycle},null,2));
});
