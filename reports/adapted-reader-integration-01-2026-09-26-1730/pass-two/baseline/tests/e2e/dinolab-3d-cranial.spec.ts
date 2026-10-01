import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000});test.use({video:'off',trace:'off'});
const report='reports/dinolab-3d-cranial';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
probes:"var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__cranialScene=s;window.__cranialCamera=c;window.__cranialRenderer=r;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function mount(page,species){
 await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,field3dWorkflowStarted:false,
 field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));
 await page.addStyleTag({content:css.slice(start,end)});await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__cranialScene)).toBe(true);
 await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
 await page.getByRole('button',{name:'Study head details',exact:true}).click();
}
async function inspect(page){return page.evaluate(()=>{
 const w=window as any,T=w.THREE,s=w.__cranialScene,c=w.__cranialCamera,r=w.__cranialRenderer,m=s.getObjectByName('dinolab-specimen');
 s.updateMatrixWorld(true);c.updateMatrixWorld(true);
 const head=m.getObjectByName('continuous-cranial-surface'),g=head?.geometry,skin:any[]=[],eyes:any[]=[];let invalid=0,outside=0,seam=0;
 m.traverse(p=>{if(p.isMesh&&p.userData.dinoAnatomy&&p.material.userData.dinoSkinMapping)skin.push(p);if(p.userData.dinoFeature==='eye')eyes.push(p);});
 if(g){for(const key of ['position','normal','dinoSkinPosition','dinoSkinNormal']){const a=g.attributes[key];if(!a)invalid++;else for(const v of a.array)if(!Number.isFinite(v))invalid++;}
 for(let ring=0;ring<=72;ring++)seam=Math.max(seam,new T.Vector3().fromBufferAttribute(g.attributes.normal,ring*41).distanceTo(new T.Vector3().fromBufferAttribute(g.attributes.normal,ring*41+40)));}
 const eyeClearances=eyes.map(eye=>{
  const radius=eye.geometry.parameters.radius,out=new T.Vector3(0,0,Math.sign(eye.position.z)).transformDirection(m.matrixWorld);
  const origin=eye.getWorldPosition(new T.Vector3()).addScaledVector(out,radius*4),hit=new T.Raycaster(origin,out.clone().negate(),0,radius*8).intersectObjects(skin,false)[0];
  return hit?(hit.distance-radius*(4-eye.scale.z))/radius:null;
 });
 const b=m.userData.studyBounds.head;
 for(const x of [b.min[0],b.max[0]])for(const y of [b.min[1],b.max[1]])for(const z of [b.min[2],b.max[2]]){
  const p=new T.Vector3(x,y,z).applyMatrix4(m.matrixWorld).project(c);if(!Number.isFinite(p.length()))invalid++;if(Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z))>1)outside++;
 }
 return {profile:g?.userData.dinoCranialSurface,vertices:g?.attributes.position.count,invalid,seam,outside,eyeClearances,
  meshes:skin.length,drawCalls:r.info.render.calls,triangles:r.info.render.triangles,errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
function check(r,species){expect(r.errors).toEqual([]);expect(r.invalid).toBe(0);expect(r.outside).toBe(0);expect(r.lost).toBe(false);expect(r.shaderFailures).toBe(0);
 expect(r.vertices).toBe(2995);expect(r.seam).toBeLessThan(1e-6);if(species==='brachiosaurus')expect(r.profile.cheekRelief).toBe(0);else expect(r.profile.cheekRelief).toBeGreaterThan(0);
 expect(r.eyeClearances).toHaveLength(2);for(const clearance of r.eyeClearances){expect(clearance).not.toBeNull();expect(clearance).toBeGreaterThan(.04);}
}
for(const species of ['tyrannosaurus','triceratops','anchiornis','sinosauropteryx','microraptor','parasaurolophus','brachiosaurus'])test(species+' has a continuous face in head studies',async({page})=>{
 const shaderErrors:string[]=[];page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL|GL_INVALID/i.test(m.text()))shaderErrors.push(m.text());});
 await mount(page,species);const result=await inspect(page);check(result,species);
 await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-head.png'});
 await page.locator('.dinolab-3d-controls-disclosure > summary').click();
 await page.getByRole('button',{name:'Front camera view',exact:true}).click();check(await inspect(page),species);
 if(['tyrannosaurus','triceratops'].includes(species))await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-front.png'});
 await page.getByRole('button',{name:'Side camera view',exact:true}).click();check(await inspect(page),species);
 if(species==='tyrannosaurus'){
  await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-side.png'});
  await page.setViewportSize({width:390,height:844});check(await inspect(page),species);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.dinolab-3d-shell').screenshot({path:report+'/'+species+'-mobile.png'});
 }
 if(['anchiornis','brachiosaurus'].includes(species)){
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();
  expect(await page.evaluate(()=>!!(window as any).__cranialScene.getObjectByName('continuous-cranial-surface'))).toBe(false);
  await expect(page.getByRole('button',{name:'Study head details',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-fossil.png'});
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();check(await inspect(page),species);
 }
 expect(shaderErrors).toEqual([]);fs.writeFileSync(report+'/'+species+'-metrics.json',JSON.stringify(result,null,2));
});
