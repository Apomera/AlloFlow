import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000});test.use({video:'off',trace:'off'});
const report='reports/dinolab-3d-shadows';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
probes:"var realNow=performance.now.bind(performance);performance.now=function(){return window.__shadowClock==null?realNow():window.__shadowClock;};var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){if(!r.getRenderTarget()){window.__shadowRenderedClock=window.__shadowClock;window.__shadowScene=s;window.__shadowCamera=c;window.__shadowRenderer=r;}return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
async function mount(page,species,options={},motion=false){
  await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:motion?'no-preference':'reduce'});
  await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,
    field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100,...options}},undefined,{expectCanvas:false});
  const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {'),end=css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start));
  await page.addStyleTag({content:css.slice(start,end)});
  await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
  await expect.poll(()=>page.evaluate(()=>!!(window as any).__shadowScene)).toBe(true);
  await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
}
async function inspect(page){
 return page.evaluate(()=>{
  const w=window as any,T=w.THREE,s=w.__shadowScene,r=w.__shadowRenderer,c=w.__shadowCamera,m=s.getObjectByName('dinolab-specimen'),sun=s.getObjectByName('dinolab-key-light');
  s.updateMatrixWorld(true);sun.shadow.updateMatrices(sun);c.updateMatrixWorld(true);
  const dir=sun.position.clone().sub(sun.target.position).normalize(),floor=sun.userData.dinoShadowFit.floorY,sc=sun.shadow.camera;
  let casters=0,vertices=0,shadowClipped=0,receiverClipped=0,invalid=0,frameClipped=0;
  s.traverse(p=>{
    if(!p.isMesh||!p.castShadow||!p.geometry)return;casters++;
    const pos=p.geometry.attributes.position;
    for(let i=0;i<pos.count;i+=3){
      const point=new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(p.matrixWorld);vertices++;
      const a=point.clone().project(sc),b=point.clone().addScaledVector(dir,-(point.y-floor)/dir.y).project(sc);
      if(!Number.isFinite(a.x+a.y+a.z+b.x+b.y+b.z))invalid++;
      if(Math.max(Math.abs(a.x),Math.abs(a.y),Math.abs(a.z))>1)shadowClipped++;
      if(Math.max(Math.abs(b.x),Math.abs(b.y),Math.abs(b.z))>1)receiverClipped++;
      if(p.userData.dinoAnatomy){const v=point.project(c);if(Math.max(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))>1)frameClipped++;}
    }
  });
  const contact=s.getObjectByName('dinolab-contact-shadow');
  return {casters,vertices,shadowClipped,receiverClipped,invalid,frameClipped,fit:sun.userData.dinoShadowFit,
    normalBias:sun.shadow.normalBias,bias:sun.shadow.bias,mapSize:sun.shadow.mapSize.toArray(),matrix:sun.shadow.matrix.toArray(),
    contact:contact?{size:contact.scale.toArray(),height:contact.position.y,yaw:contact.parent.rotation.y}:null,modelYaw:m.rotation.y,
    errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
 });
}
function check(result){
 expect(result.casters).toBeGreaterThan(5);expect(result.vertices).toBeGreaterThan(100);
 expect(result.invalid).toBe(0);expect(result.shadowClipped).toBe(0);expect(result.receiverClipped).toBe(0);expect(result.frameClipped).toBe(0);
 expect(result.errors).toEqual([]);expect(result.lost).toBe(false);expect(result.shaderFailures).toBe(0);
}
async function groundShadowPixels(page){
 return page.evaluate(()=>{
  const w=window as any,T=w.THREE,r=w.__shadowRenderer,s=w.__shadowScene,c=w.__shadowCamera,m=s.getObjectByName('dinolab-specimen'),contact=s.getObjectByName('dinolab-contact-shadow');
  const target=new T.WebGLRenderTarget(320,160),a=new Uint8Array(320*160*4),b=new Uint8Array(a.length);
  const auto=r.shadowMap.autoUpdate;
  r.render(s,c);r.shadowMap.autoUpdate=false;m.visible=false;if(contact)contact.visible=false;
  r.setRenderTarget(target);r.render(s,c);r.readRenderTargetPixels(target,0,0,320,160,a);
  const receivers=[];s.traverse(p=>{if(p.isMesh&&p.receiveShadow){receivers.push(p);p.receiveShadow=false;}});
  r.render(s,c);r.readRenderTargetPixels(target,0,0,320,160,b);
  receivers.forEach(p=>{p.receiveShadow=true;});
  r.shadowMap.enabled=true;r.shadowMap.autoUpdate=auto;m.visible=true;if(contact)contact.visible=true;
  r.setRenderTarget(null);target.dispose();r.render(s,c);
  let pixels=0,maxDifference=0;
  for(let i=0;i<a.length;i+=4){const difference=((b[i]-a[i])+(b[i+1]-a[i+1])+(b[i+2]-a[i+2]))/3;if(difference>5)pixels++;maxDifference=Math.max(maxDifference,difference);}
  return {pixels,maxDifference};
 });
}
for(const species of ['anchiornis','sinosauropteryx','tyrannosaurus','brachiosaurus','triceratops','argentinosaurus']){
 test(species+' keeps its shadows grounded through rotation',async({page})=>{
  await mount(page,species);const a=await inspect(page);check(a);
  expect(a.contact).not.toBeNull();expect(a.contact.height).toBeLessThan(.01);
  if(species==='anchiornis'){expect(a.fit.texelSize).toBeLessThan(.002);expect(a.normalBias).toBeLessThan(.001);expect(a.contact.size[0]).toBeLessThan(1);}
  const pixels=await groundShadowPixels(page);expect(pixels.pixels).toBeGreaterThan(10);expect(pixels.maxDifference).toBeGreaterThan(5);
  await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-life.png'});
  const canvas=page.locator('.dinolab-3d-canvas');await canvas.focus();await canvas.press('ArrowRight');await canvas.press('ArrowRight');await canvas.press('ArrowUp');
  await expect.poll(async()=>(await inspect(page)).modelYaw).not.toBe(a.modelYaw);
  const b=await inspect(page);check(b);expect(b.matrix).toEqual(a.matrix);expect(b.contact.yaw).toBe(b.modelYaw);
  fs.writeFileSync(report+'/'+species+'-metrics.json',JSON.stringify({initial:a,rotated:b,groundShadow:pixels},null,2));
  if(species==='anchiornis'){
    await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();check(await inspect(page));
    await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-mobile.png'});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();check(await inspect(page));
    await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-fossil.png'});
  }
 });
}
test('human reference and habitat casters stay in the shadow volume',async({page})=>{
 await mount(page,'anchiornis',{field3dShowHuman:true,field3dStage:'habitat',field3dShowEvidence:true});
 const a=await inspect(page);check(a);expect(a.contact).toBeNull();
 await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/anchiornis-habitat.png'});
 fs.writeFileSync(report+'/habitat-metrics.json',JSON.stringify(a,null,2));
});
test('the fitted shadow camera remains stable during live anatomy motion',async({page})=>{
 await mount(page,'sinosauropteryx',{},true);
 async function pose(time){await page.evaluate(t=>{(window as any).__shadowClock=t;},time);await expect.poll(()=>page.evaluate(()=>(window as any).__shadowRenderedClock)).toBe(time);const r=await inspect(page);check(r);const rotation=await page.evaluate(()=>{const m=(window as any).__shadowScene.getObjectByName('dinolab-specimen');return m.children.find(p=>p.userData.dinoRegion==='tail').rotation.toArray().slice(0,3);});return {...r,tailRotation:rotation};}
 const a=await pose(10000),b=await pose(12400);expect(b.tailRotation).not.toEqual(a.tailRotation);expect(b.matrix).toEqual(a.matrix);
 fs.writeFileSync(report+'/motion-metrics.json',JSON.stringify({a,b},null,2));
});
