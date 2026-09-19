import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000}); test.use({video:'off',trace:'off'});
const report='reports/dinolab-3d-keratin',baseline=!!process.env.DINO_KERATIN_SOURCE;
const harness=new GlHarness({toolFile:process.env.DINO_KERATIN_SOURCE||'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
 probes:"var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__keratinScene=s;window.__keratinCamera=c;window.__keratinRenderer=r;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function settle(page){await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));}
async function mount(page,species){
 await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,field3dWorkflowStarted:false,
 field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {');await page.addStyleTag({content:css.slice(start,css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start)))});
 await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__keratinScene)).toBe(true);await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await settle(page);
}
async function inspect(page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,s=w.__keratinScene,c=w.__keratinCamera,r=w.__keratinRenderer,m=s.getObjectByName('dinolab-specimen'),key=s.getObjectByName('dinolab-key-light');
 s.updateMatrixWorld(true); c.updateMatrixWorld(true); const sheaths:any[]=[];let outside=0,shadowOutside=0,invalid=0,hornOutside=0;
 m.traverse(p=>{
  if(!p.isMesh||!p.userData.dinoAnatomy)return;
  const g=p.geometry,attr=g.attributes.position,feature=p.userData.dinoFeature;
  for(let i=0;i<attr.count;i++){
   const v=new T.Vector3().fromBufferAttribute(attr,i).applyMatrix4(p.matrixWorld),clip=v.clone().project(c);
   if(!Number.isFinite(v.length()))invalid++;
   if(Math.max(Math.abs(clip.x),Math.abs(clip.y),Math.abs(clip.z))>1.001){outside++;if(feature==='keratin-horn')hornOutside++;}
   if(p.castShadow){v.project(key.shadow.camera);if(Math.max(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))>1.001)shadowOutside++;}
  }
  if(/^keratin-(horn|claw)$/.test(feature)||g.type==='ConeGeometry'&&p.material.color?.getHex()===0x4b3525){
   const curved=feature==='keratin-horn'||feature==='keratin-claw';
   const root=curved?new T.Vector3().fromBufferAttribute(attr,attr.count-1):new T.Vector3(0,-g.parameters.height/2,0);
   const tip=curved?new T.Vector3().fromBufferAttribute(attr,attr.count-2):new T.Vector3(0,g.parameters.height/2,0);
   root.applyMatrix4(p.matrix);tip.applyMatrix4(p.matrix);
   sheaths.push({root:root.toArray(),tip:tip.toArray(),kind:curved?g.parameters.kind:'cone',radius:curved?g.parameters.radius:g.parameters.radius,
    triangles:g.index.count/3,meshId:p.uuid,geometryId:g.uuid,materialId:p.material.uuid,opacity:p.material.opacity,transparent:p.material.transparent,depthWrite:p.material.depthWrite,castShadow:p.castShadow});
  }
 });
 return {sheaths,outside,hornOutside,shadowOutside,invalid,memory:{...r.info.memory},render:{...r.info.render},errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
async function fossilFingerprint(page){return page.evaluate(async()=>{
 const w=window as any,m=w.__keratinScene.getObjectByName('dinolab-specimen'),meshes:any[]=[];m.updateMatrixWorld(true);
 m.traverse(p=>{if(p.isMesh&&p.userData.dinoAnatomy){const g=p.geometry;meshes.push({position:Array.from(g.attributes.position.array),index:g.index?Array.from(g.index.array):null,matrix:p.matrix.elements});}});
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(meshes)));
 return {meshes:meshes.length,sha256:Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('')};
});}
function check(p,whole=false){expect(p.invalid).toBe(0);expect(p.shadowOutside).toBe(0);expect(p.errors).toEqual([]);expect(p.lost).toBe(false);expect(p.shaderFailures).toBe(0);if(whole)expect(p.outside).toBe(0);}
function landmarks(p){return p.sheaths.map(s=>({root:s.root.map(n=>+n.toFixed(5)),tip:s.tip.map(n=>+n.toFixed(5)),radius:+s.radius.toFixed(5)}));}
function compact(p){return {sheaths:p.sheaths.map(({meshId,geometryId,materialId,...rest})=>rest),memory:p.memory,render:p.render};}
for(const species of ['triceratops','styracosaurus','therizinosaurus','velociraptor','microraptor','brachiosaurus'])test(species+' curved keratin and study framing',async({page})=>{
 await mount(page,species);const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData)),first=await inspect(page);check(first,true);expect(first.sheaths.length).toBeGreaterThan(0);
 if(!baseline){expect(first.sheaths.every(s=>s.kind==='horn'||s.kind==='claw')).toBe(true);expect(new Set(first.sheaths.map(s=>s.materialId)).size).toBe(1);expect(first.sheaths.every(s=>s.castShadow&&s.triangles===288)).toBe(true);}
 await page.locator('.dinolab-3d-controls-disclosure > summary').click();
 const horned=['triceratops','styracosaurus'].includes(species);
 if(horned)await page.getByRole('button',{name:'Study head details',exact:true}).click();
 await page.getByRole('button',{name:'Side camera view',exact:true}).click();await settle(page);const side=await inspect(page);check(side,!horned);if(!baseline&&horned){expect(side.hornOutside).toBe(0);expect(side.sheaths.filter(s=>s.kind==='horn').length).toBeGreaterThan(0);}
 await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+(baseline?'-before':'-after')+'.png'});
 if(!baseline&&horned){await page.getByRole('button',{name:'Front camera view',exact:true}).click();await settle(page);const front=await inspect(page);check(front);expect(front.hornOutside).toBe(0);await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-front.png'});}
 expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData))).toBe(saved);
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();await settle(page);const fossil=await fossilFingerprint(page);expect((await inspect(page)).sheaths.length).toBe(0);
 const beforePath=report+'/'+species+'-before.json';
 if(!baseline&&fs.existsSync(beforePath)){const before=JSON.parse(fs.readFileSync(beforePath,'utf8'));expect(landmarks(first)).toEqual(landmarks(before));expect(fossil).toEqual(before.fossil);expect(first.memory.textures).toBe(before.memory.textures);expect(first.render.calls).toBe(before.render.calls);}
 fs.writeFileSync(report+'/'+species+(baseline?'-before':'')+'.json',JSON.stringify({...compact(first),fossil},null,2));
});
test('phone studies retain horns through opacity, fossil and life changes',async({page})=>{
 test.skip(baseline,'New surface lifecycle validation');await mount(page,'triceratops');const first=await inspect(page);check(first,true);
 await page.getByRole('button',{name:'Study head details',exact:true}).click();await page.setViewportSize({width:390,height:844});await settle(page);
 let phone=await inspect(page);check(phone);expect(phone.hornOutside).toBe(0);
 await page.evaluate(()=>{const w=window as any;w.__ctx.update('dinoLab','field3dBodyOpacity',40);});await settle(page);const translucent=await inspect(page);check(translucent);
 expect(translucent.sheaths.map(s=>s.geometryId)).toEqual(first.sheaths.map(s=>s.geometryId));expect(translucent.sheaths.every(s=>s.opacity<1&&s.transparent&&!s.depthWrite)).toBe(true);
 await page.evaluate(()=>{const w=window as any;w.__keratinDisposed=0;w.__keratinScene.getObjectByName('dinolab-specimen').traverse(p=>{if(/^keratin-(horn|claw)$/.test(p.userData.dinoFeature))p.geometry.addEventListener('dispose',()=>w.__keratinDisposed++);});});
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();await settle(page);expect((await inspect(page)).sheaths.length).toBe(0);expect(await page.evaluate(()=>(window as any).__keratinDisposed)).toBe(first.sheaths.length);
 await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();await settle(page);const back=await inspect(page);check(back);expect(back.hornOutside).toBe(0);expect(landmarks(back)).toEqual(landmarks(first));
 expect(back.sheaths.every(s=>s.opacity===1&&!s.transparent&&s.depthWrite)).toBe(true);expect(back.memory).toEqual(first.memory);
 await expect(page.getByRole('button',{name:'Study head details',exact:true})).toHaveAttribute('aria-pressed','true');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.dinolab-3d-shell').screenshot({path:report+'/triceratops-phone.png'});
 fs.writeFileSync(report+'/phone-layers.json',JSON.stringify({first:compact(first),translucent:compact(translucent),back:compact(back),disposalCount:first.sheaths.length,geometryReusedForOpacity:true},null,2));
});
