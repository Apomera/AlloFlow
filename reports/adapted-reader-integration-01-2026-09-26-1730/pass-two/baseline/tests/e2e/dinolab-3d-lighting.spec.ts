import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({timeout:240_000});test.use({video:'off',trace:'off'});
const report='reports/dinolab-3d-lighting';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,
  probes:"var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__lightScene=s;window.__lightCamera=c;window.__lightRenderer=r;var result=render(s,c);if(window.__lightRequest){window.__lightRequest=false;var gl=r.getContext(),width=gl.drawingBufferWidth,height=gl.drawingBufferHeight,pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);var baseline=window.__lightBaseline,changed=0,total=0;for(var i=0;i<pixels.length;i+=4){total+=pixels[i]+pixels[i+1]+pixels[i+2];if(baseline&&Math.abs(pixels[i]-baseline[i])+Math.abs(pixels[i+1]-baseline[i+1])+Math.abs(pixels[i+2]-baseline[i+2])>12)changed++;}if(!baseline)window.__lightBaseline=pixels;window.__lightPixels={width:width,height:height,changed:changed,mean:total/(width*height*3)};}return result;};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function settle(page){await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));}
async function mount(page,species,state={}){
  await page.setViewportSize({width:1180,height:920});await page.emulateMedia({reducedMotion:'reduce'});
  await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,field3dWorkflowStarted:false,
    field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100,...state}},undefined,{expectCanvas:false});
  const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {');await page.addStyleTag({content:css.slice(start,css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start)))});
  await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
  await expect.poll(()=>page.evaluate(()=>!!(window as any).__lightScene)).toBe(true);
  await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();
  await page.locator('.dinolab-3d-controls-disclosure > summary').click();await settle(page);
}
async function measure(page){await page.evaluate(()=>{(window as any).__lightPixels=null;(window as any).__lightRequest=true;});await expect.poll(()=>page.evaluate(()=>!!(window as any).__lightPixels)).toBe(true);return page.evaluate(()=>(window as any).__lightPixels);}
async function inspect(page){return page.evaluate(()=>{
  const w=window as any,T=w.THREE,s=w.__lightScene,r=w.__lightRenderer,c=w.__lightCamera,m=s.getObjectByName('dinolab-specimen'),key=s.getObjectByName('dinolab-key-light');s.updateMatrixWorld(true);c.updateMatrixWorld(true);let outside=0,invalid=0;const materials=new Map();
  m.traverse(p=>{if(!p.isMesh)return;if(p.material)materials.set(p.material.uuid,{id:p.material.uuid,color:p.material.color?.toArray(),map:p.material.map?.uuid});
    if(!p.castShadow)return;if(!p.geometry.boundingBox)p.geometry.computeBoundingBox();const b=p.geometry.boundingBox;
    for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const v=new T.Vector3(x,y,z).applyMatrix4(p.matrixWorld).project(key.shadow.camera);if(!Number.isFinite(v.length()))invalid++;if(Math.max(Math.abs(v.x),Math.abs(v.y),Math.abs(v.z))>1.001)outside++;}
  });
  return {mode:s.userData.dinoStudioLighting,model:m.uuid,canvas:r.domElement.id,camera:c.position.toArray(),projection:c.projectionMatrix.toArray(),rotation:m.rotation.toArray(),materials:[...materials.values()],memory:{...r.info.memory},shadow:key.shadow.matrix.toArray(),shadowTarget:key.shadow.map?.texture.uuid,
    lights:['ambient','hemisphere','key','fill','rim'].map(n=>{const l=s.getObjectByName('dinolab-'+n+'-light');return {name:n,intensity:l.intensity,position:l.position.toArray()};}),outside,invalid,errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};
});}
function check(result){expect(result.errors).toEqual([]);expect(result.invalid).toBe(0);expect(result.outside).toBe(0);expect(result.lost).toBe(false);expect(result.shaderFailures).toBe(0);}
async function select(page,label){const b=page.getByRole('button',{name:label+' studio lighting',exact:true});await b.click();await settle(page);await expect(b).toHaveAttribute('aria-pressed','true');}
for(const species of ['tyrannosaurus','anchiornis','brachiosaurus'])test(species+' changes illumination without rebuilding the specimen',async({page})=>{
  await mount(page,species);if(species!=='brachiosaurus')await page.getByRole('button',{name:'Study body details',exact:true}).click();await settle(page);
  const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData)),before=await inspect(page);check(before);expect(before.shadowTarget).toEqual(expect.any(String));const baseline=await measure(page);
  await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-balanced.png'});
  const results=[];
  for(const [mode,label] of [['detail','Surface detail'],['rim','Rim light'],['balanced','Balanced']]){
    await select(page,label);const current=await inspect(page);check(current);expect(current.mode).toBe(mode);expect(current.model).toBe(before.model);expect(current.canvas).toBe(before.canvas);
    expect(current.camera).toEqual(before.camera);expect(current.projection).toEqual(before.projection);expect(current.rotation).toEqual(before.rotation);expect(current.materials).toEqual(before.materials);expect(current.memory).toEqual(before.memory);expect(current.shadowTarget).toBe(before.shadowTarget);
    const pixels=await measure(page);if(mode!=='balanced'){expect(pixels.changed).toBeGreaterThan(100);await page.locator('.dinolab-3d-canvas').screenshot({path:report+'/'+species+'-'+mode+'.png'});}else{expect(pixels.changed).toBeLessThan(baseline.width*baseline.height*.001);expect(current.lights).toEqual(before.lights);}
    results.push({mode,pixels,lights:current.lights,memory:current.memory});
  }
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData))).toBe(saved);fs.writeFileSync(report+'/'+species+'.json',JSON.stringify({baseline,results},null,2));
});

test('lighting survives layer changes and returns after the Habitat scene',async({page})=>{
  await mount(page,'tyrannosaurus');await page.getByRole('button',{name:'Study head details',exact:true}).click();await select(page,'Surface detail');
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Fossil anchors/}).click();await settle(page);check(await inspect(page));expect((await inspect(page)).mode).toBe('detail');
  await expect(page.getByRole('button',{name:'Study head details',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.locator('.dinolab-surface-presets').getByRole('button',{name:/Life view/}).click();await settle(page);expect((await inspect(page)).mode).toBe('detail');
  const lighting=page.getByRole('group',{name:'Scene lighting',exact:true});await lighting.getByRole('button',{name:'Habitat',exact:true}).click();await settle(page);expect((await inspect(page)).mode).toBe('habitat');await expect(page.getByRole('group',{name:'Studio light angle',exact:true})).toHaveCount(0);
  await lighting.getByRole('button',{name:'Studio',exact:true}).click();await settle(page);expect((await inspect(page)).mode).toBe('detail');
  await page.getByRole('combobox',{name:/species|dinosaur/i}).first().selectOption('microraptor');await settle(page);const small=await inspect(page);check(small);expect(small.mode).toBe('detail');
  fs.writeFileSync(report+'/persistence.json',JSON.stringify({mode:small.mode,memory:small.memory,shadowOutside:small.outside},null,2));
});

test('phone keyboard lighting keeps paused motion and camera study intact',async({page})=>{
  await mount(page,'triceratops');await page.emulateMedia({reducedMotion:'no-preference'});await expect(page.getByRole('button',{name:'Pause motion',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Pause motion',exact:true}).click();
  await page.getByRole('button',{name:'Study head details',exact:true}).click();await page.setViewportSize({width:390,height:844});await settle(page);
  const before=await inspect(page),saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData));
  const light=page.getByRole('button',{name:'Rim light studio lighting',exact:true});await light.focus();await page.keyboard.press('Space');await settle(page);
  const after=await inspect(page);check(after);expect(after.mode).toBe('rim');expect(after.model).toBe(before.model);expect(after.camera).toEqual(before.camera);expect(after.rotation).toEqual(before.rotation);
  await expect(light).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Resume motion',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button',{name:'Study head details',exact:true})).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData))).toBe(saved);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const bounds=await light.boundingBox();expect(bounds!.height).toBeGreaterThanOrEqual(44);
  await page.locator('.dinolab-3d-shell').screenshot({path:report+'/triceratops-rim-mobile.png'});
});
