import { test, expect } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({mode:'serial',retries:0,timeout:180000});
test.use({video:'off',trace:'off'});
const out=path.resolve('reports/scale-explorer-solar');
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__solarCamera=c;if(window.__solarFrames&&window.__solarFrames.length<180)window.__solarFrames.push({position:c.position.toArray(),zoom:Number(document.querySelector('[data-atlas-ready]')?.dataset.atlasZoom)});return render.apply(this,arguments);};return r;}});`});
test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
async function mount(page:any,reduced=true){
  await page.setViewportSize({width:1400,height:1100});
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
  await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
}
async function fly(page:any,id:string){
  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);
  const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-objects',id);
  await expect.poll(()=>canvas.evaluate((c:HTMLElement)=>Math.abs(Number(c.dataset.atlasExponent)-Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
}
async function sun(page:any){return page.evaluate(()=>{
  const w=window as any,T=w.THREE,record=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
  record.scene.traverse((o:any)=>{if(o.userData.itemId==='sun')root=o;});const g=root.userData.model;
  const center=g.localToWorld(new T.Vector3()),edge=g.localToWorld(new T.Vector3(.5,0,0));
  g.userData.solarPhotosphere.geometry.computeBoundingSphere();
  const surfaceDiameter=2*g.userData.solarPhotosphere.geometry.boundingSphere.radius*g.userData.solarPhotosphere.getWorldScale(new T.Vector3()).x;
  const aim=new T.Vector3().fromArray(document.querySelector('[data-atlas-ready]')!.getAttribute('data-atlas-aim')!.split(',').map(Number));
  const materials:any[]=[];g.traverse((o:any)=>{if(o.material?.uniforms?.uTime)materials.push(o.material.uniforms.uTime.value);});
  return {scale:root.scale.x,diameter:2*center.distanceTo(edge),surfaceDiameter,interior:g.userData.solarInterior.visible,open:g.userData.starMaterial.uniforms.uOpen.value,
    clocks:materials,rotation:g.rotation.y,frames:record.renders,
    aligned:w.__solarCamera.getWorldDirection(new T.Vector3()).dot(aim.sub(w.__solarCamera.position).normalize())};
});}

test('solar layers, surface features and the comparison preserve photospheric diameter',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await mount(page);await fly(page,'sun');const canvas=page.locator('[data-atlas-ready]'),before=await sun(page);
  expect(before.diameter).toBeCloseTo(3,8);expect(before.surfaceDiameter).toBeCloseTo(before.diameter,6);expect(before.interior).toBe(true);expect(before.open).toBe(1);
  expect(looksBlank(await harness.glPixels(page))).toBe(false);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'solar-cutaway.png')});
  const details=page.locator('.sx-details');await expect(details.locator('.sx-detail-choices button')).toHaveCount(6);
  for(const [id,label,open] of [['core','Fusion core',true],['radiative-zone','Radiative zone',true],['convection-zone','Convection zone',true],['photosphere','Granulated photosphere',false],['sunspots','Sunspots',false],['prominence','Prominence & corona',false]] as const){
    await details.getByRole('button',{name:label,exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-detail',id);
    const current=await sun(page);expect(current.diameter).toBeCloseTo(before.diameter,8);expect(current.interior).toBe(open);expect(current.open).toBe(open?1:0);expect(current.aligned).toBeGreaterThan(.99999);
    await expect(page.locator('.sx-marker[aria-pressed="true"]')).toBeVisible();
    await expect(page.locator('.sx-marker[aria-pressed="true"]')).toHaveAttribute('data-offset','true');
    const source=await details.getByRole('link',{name:'Read the science source',exact:true}).getAttribute('href');
    expect(new URL(source!).hostname).toMatch(/(^|\.)nasa\.gov$/);
    await page.locator('.sx-stage').screenshot({path:path.join(out,'solar-'+id+'.png')});
  }
  await page.getByRole('button',{name:'Fit object',exact:true}).click();await page.getByRole('button',{name:'Reset camera',exact:true}).click();
  await page.locator('.sx-stage').screenshot({path:path.join(out,'solar-surface.png')});
  const panel=page.locator('.sx-comparison-workbench');await panel.locator(':scope > summary').click();
  await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('sun');await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('earth');
  await panel.getByRole('button',{name:'Compare them',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-comparison','sun:earth');
  const ratio=await page.evaluate(()=>{const r=(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());const roots:any={};r.scene.traverse((o:any)=>{if(o.userData.itemId)roots[o.userData.itemId]=o;});return roots.sun.scale.x/roots.earth.scale.x;});
  expect(ratio).toBeCloseTo(1.392e9/1.2742e7,6);expect((await sun(page)).diameter).toBeCloseTo(3,8);
  await page.locator('.sx-stage').screenshot({path:path.join(out,'sun-earth-comparison.png')});expect(errors).toEqual([]);
});

test('inspection travels while ambience is paused and yields to manual orbit',async({page})=>{
  await mount(page,false);await page.getByRole('button',{name:'Pause ambience',exact:true}).click();await fly(page,'sun');
  const canvas=page.locator('[data-atlas-ready]'),clocks=(await sun(page)).clocks;
  await page.getByRole('button',{name:'Orbit right',exact:true}).click();await page.getByRole('button',{name:'Orbit right',exact:true}).click();
  await page.evaluate(()=>{(window as any).__solarFrames=[];});await page.locator('.sx-details').getByRole('button',{name:'Fusion core',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-atlas-zoom','1.80');await expect(canvas).toHaveAttribute('data-atlas-yaw','0.0000');
  const frames=await page.evaluate(()=>(window as any).__solarFrames);
  // Elapsed-time easing can finish in fewer frames on a slower renderer.
  const intermediate=frames.filter((f:any)=>f.zoom>1&&f.zoom<1.8).map((f:any)=>f.zoom);
  expect(new Set(intermediate).size).toBeGreaterThan(1);
  for(let i=1;i<intermediate.length;i++)expect(intermediate[i]).toBeGreaterThanOrEqual(intermediate[i-1]);
  await expect.poll(async()=>(await sun(page)).aligned).toBeGreaterThan(.99999);expect((await sun(page)).clocks).toEqual(clocks);
  // Once the approach finishes, a paused scene must stop scheduling frames.
  const renders=()=>page.evaluate(()=>(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()).renders);
  await expect.poll(async()=>{const n=await renders();await page.waitForTimeout(250);return await renders()===n;},{timeout:8000}).toBe(true);
  const count=await renders();await page.waitForTimeout(300);expect(await renders()).toBe(count);
  await page.locator('.sx-details').getByRole('button',{name:'Radiative zone',exact:true}).click();
  await page.getByRole('button',{name:'Orbit right',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-yaw','0.2000');
  await page.waitForTimeout(250);await expect(canvas).toHaveAttribute('data-atlas-yaw','0.2000');
  await page.getByRole('button',{name:'Resume ambience',exact:true}).click();await expect.poll(async()=>(await sun(page)).clocks[0]).toBeGreaterThan(clocks[0]+.2);
  expect((await sun(page)).rotation).toBeCloseTo(-.3,6);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByRole('button',{name:'Reduced motion',exact:true})).toBeDisabled();
  const still=(await sun(page)).clocks;await page.waitForTimeout(200);expect((await sun(page)).clocks).toEqual(still);
});

test('phone keyboard inspection, occlusion and notebook restore the solar interior',async({page})=>{
  await mount(page);await page.setViewportSize({width:320,height:780});await fly(page,'sun');
  const core=page.locator('.sx-details').getByRole('button',{name:'Fusion core',exact:true});await core.focus();await core.press('Enter');
  const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-detail','core');await expect(canvas).toBeInViewport();
  await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-solar-core.png')});
  const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox').fill('Energy starts in the core.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
  await page.locator('.sx-details').getByRole('button',{name:'Sunspots',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-detail','sunspots');expect((await sun(page)).interior).toBe(false);
  await book.locator('[data-observation="sun:core"]').getByRole('button',{name:/^Return to/}).click();
  await expect(canvas).toHaveAttribute('data-atlas-detail','core');expect((await sun(page)).interior).toBe(true);await expect(book.getByRole('textbox')).toHaveValue('Energy starts in the core.');
  // Hidden interior labels must not shine through the opaque back of the star.
  await canvas.focus();for(let i=0;i<16;i++)await canvas.press('d');
  await expect(page.locator('.sx-marker[aria-pressed="true"]')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
