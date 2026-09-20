import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:360_000});test.use({video:'off',trace:'off'});
const report=process.env.DINOLAB_REPORT_DIR||'reports/dinolab-3d-jaw-contours';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
 probes:"var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__coatScene=s;window.__coatCamera=c;window.__coatRenderer=r;return render(s,c);};return r;};"});
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
 const head=m.getObjectByName('continuous-cranial-surface'),jaw=m.getObjectByName('lower-jaw-surface');if(!head||!jaw)return {hasJaw:false};
 const reach=new T.Box3().setFromObject(head).getSize(new T.Vector3()).length()*2;let invalid=0,outside=0,capOutside=0,minEnclosure=Infinity,maxPlumageGap=0,creases=0;
 const capEnclosures=[];
 for(const [endpoint,ring] of [[0,0],[1,48]]){
  const center=new T.Vector3().fromArray(jaw.userData.dinoJawTerminals[endpoint]).applyMatrix4(m.matrixWorld);let min=Infinity;
  for(let i=0;i<24;i++){
   const point=new T.Vector3().fromBufferAttribute(jaw.geometry.attributes.position,ring*25+i).applyMatrix4(jaw.matrixWorld),delta=point.clone().sub(center),direction=delta.clone().normalize();
   const hit=new T.Raycaster(center.clone().addScaledVector(direction,reach),direction.clone().negate(),0,reach*2).intersectObject(head,false)[0],ratio=hit?hit.point.distanceTo(center)/delta.length():0;
   min=Math.min(min,ratio);if(ratio<1.1)capOutside++;
  }
  capEnclosures.push(min);minEnclosure=Math.min(minEnclosure,min);
 }
 for(let i=0;i<jaw.geometry.attributes.position.count;i++){
  const v=new T.Vector3().fromBufferAttribute(jaw.geometry.attributes.position,i).applyMatrix4(jaw.matrixWorld).project(c);if(!Number.isFinite(v.x+v.y+v.z))invalid++;if(Math.max(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))>1)outside++;
 }
 for(const key of ['normal','dinoSkinPosition','dinoSkinNormal'])for(const value of jaw.geometry.attributes[key].array)if(!Number.isFinite(value))invalid++;
 m.traverse(p=>{
  if(p.userData.dinoFeature==='mouth-crease')creases++;
  if(p.userData.dinoFeature==='contour-plumage'){
   const roots=p.geometry.attributes.dinoCoatRoot;for(let i=0;i<roots.count;i+=27){const v=new T.Vector3().fromBufferAttribute(roots,i);maxPlumageGap=Math.max(maxPlumageGap,p.localToWorld(v.clone()).distanceTo(p.parent.localToWorld(v.clone())));}
  }
 });
 return {hasJaw:true,capOutside,capEnclosures,minEnclosure,invalid,outside,maxPlumageGap,creases,vertices:jaw.geometry.attributes.position.count,opacity:jaw.material.opacity,transparent:jaw.material.transparent,depthWrite:jaw.material.depthWrite,skinMapped:!!jaw.geometry.attributes.dinoSkinPosition,model:m.uuid,geometries:r.info.memory.geometries,textures:r.info.memory.textures,errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
function check(r){expect(r.hasJaw).toBe(true);expect(r.capOutside).toBe(0);expect(r.invalid).toBe(0);expect(r.outside).toBe(0);expect(r.maxPlumageGap).toBeLessThan(1e-8);expect(r.creases).toBe(2);expect(r.vertices).toBe(1227);expect(r.skinMapped).toBe(true);expect(r.errors).toEqual([]);expect(r.lost).toBe(false);expect(r.shaderFailures).toBe(0);}
for(const id of ['tyrannosaurus','brachiosaurus','spinosaurus','anchiornis','microraptor','triceratops','parasaurolophus'])test(id+' has rounded enclosed jaw terminals',async({page})=>{
 await mount(page,id);await page.getByRole('button',{name:'Study head details',exact:true}).click();const before=await inspect(page);check(before);
 await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+id+'-head.png'});
 await page.locator('.dinolab-3d-controls-disclosure > summary').click();await page.getByRole('button',{name:'Side camera view',exact:true}).click();check(await inspect(page));
 if(['tyrannosaurus','brachiosaurus'].includes(id))await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+id+'-side.png'});
 await page.getByRole('button',{name:'Front camera view',exact:true}).click();check(await inspect(page));
 if(id==='brachiosaurus'){
  await page.getByRole('button',{name:'Side camera view',exact:true}).click();await page.setViewportSize({width:320,height:844});check(await inspect(page));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/brachiosaurus-phone.png'});
 }
 if(id==='anchiornis'){
  await page.getByRole('slider',{name:'Body inference opacity',exact:true}).press('Home');let faded=await inspect(page);check(faded);expect(faded.opacity).toBe(.22);expect(faded.transparent).toBe(true);expect(faded.depthWrite).toBe(false);
  await page.getByRole('slider',{name:'Body inference opacity',exact:true}).press('End');const after=await inspect(page);check(after);expect(after.opacity).toBe(1);expect(after.transparent).toBe(false);expect(after.depthWrite).toBe(true);expect(after.model).toBe(before.model);expect(after.geometries).toBe(before.geometries);expect(after.textures).toBe(before.textures);fs.writeFileSync(report+'/opacity-resources.json',JSON.stringify({before,faded,after},null,2));
 }
 if(id==='triceratops'){
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();expect((await inspect(page)).hasJaw).toBe(false);await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();check(await inspect(page));
 }
 fs.writeFileSync(report+'/'+id+'-metrics.json',JSON.stringify(before,null,2));
});
test('conservative and avian inference retain seated jaw closures',async({page})=>{
 const modes=[];for(const mode of ['conservative','avian']){
  await mount(page,'velociraptor',mode);await page.getByRole('button',{name:'Study head details',exact:true}).click();const result=await inspect(page);check(result);modes.push({mode,...result});await harness.destroy(page);
 }
 fs.writeFileSync(report+'/reconstruction-modes.json',JSON.stringify(modes,null,2));
});
