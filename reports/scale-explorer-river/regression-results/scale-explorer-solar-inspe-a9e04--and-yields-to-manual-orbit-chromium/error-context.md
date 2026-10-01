# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scale-explorer-solar.spec.ts >> inspection travels while ambience is paused and yields to manual orbit
- Location: tests\e2e\scale-explorer-solar.spec.ts:63:5

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 4
Received:   3
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
  3  | import { mkdirSync } from 'node:fs';
  4  | import path from 'node:path';
  5  | 
  6  | test.describe.configure({mode:'serial',retries:0,timeout:180000});
  7  | test.use({video:'off',trace:'off'});
  8  | const out=path.resolve('reports/scale-explorer-solar');
  9  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__solarCamera=c;if(window.__solarFrames&&window.__solarFrames.length<180)window.__solarFrames.push({position:c.position.toArray(),zoom:Number(document.querySelector('[data-atlas-ready]')?.dataset.atlasZoom)});return render.apply(this,arguments);};return r;}});`});
  10 | test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
  11 | test.afterAll(async()=>{await harness.stop();});
  12 | test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
  13 | async function mount(page:any,reduced=true){
  14 |   await page.setViewportSize({width:1400,height:1100});
  15 |   await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  16 |   await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
  17 |   await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
  18 | }
  19 | async function fly(page:any,id:string){
  20 |   await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);
  21 |   const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-objects',id);
  22 |   await expect.poll(()=>canvas.evaluate((c:HTMLElement)=>Math.abs(Number(c.dataset.atlasExponent)-Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
  23 | }
  24 | async function sun(page:any){return page.evaluate(()=>{
  25 |   const w=window as any,T=w.THREE,record=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
  26 |   record.scene.traverse((o:any)=>{if(o.userData.itemId==='sun')root=o;});const g=root.userData.model;
  27 |   const center=g.localToWorld(new T.Vector3()),edge=g.localToWorld(new T.Vector3(.5,0,0));
  28 |   g.userData.solarPhotosphere.geometry.computeBoundingSphere();
  29 |   const surfaceDiameter=2*g.userData.solarPhotosphere.geometry.boundingSphere.radius*g.userData.solarPhotosphere.getWorldScale(new T.Vector3()).x;
  30 |   const aim=new T.Vector3().fromArray(document.querySelector('[data-atlas-ready]')!.getAttribute('data-atlas-aim')!.split(',').map(Number));
  31 |   const materials:any[]=[];g.traverse((o:any)=>{if(o.material?.uniforms?.uTime)materials.push(o.material.uniforms.uTime.value);});
  32 |   return {scale:root.scale.x,diameter:2*center.distanceTo(edge),surfaceDiameter,interior:g.userData.solarInterior.visible,open:g.userData.starMaterial.uniforms.uOpen.value,
  33 |     clocks:materials,rotation:g.rotation.y,frames:record.renders,
  34 |     aligned:w.__solarCamera.getWorldDirection(new T.Vector3()).dot(aim.sub(w.__solarCamera.position).normalize())};
  35 | });}
  36 | 
  37 | test('solar layers, surface features and the comparison preserve photospheric diameter',async({page})=>{
  38 |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  39 |   await mount(page);await fly(page,'sun');const canvas=page.locator('[data-atlas-ready]'),before=await sun(page);
  40 |   expect(before.diameter).toBeCloseTo(3,8);expect(before.surfaceDiameter).toBeCloseTo(before.diameter,6);expect(before.interior).toBe(true);expect(before.open).toBe(1);
  41 |   expect(looksBlank(await harness.glPixels(page))).toBe(false);
  42 |   await page.locator('.sx-stage').screenshot({path:path.join(out,'solar-cutaway.png')});
  43 |   const details=page.locator('.sx-details');await expect(details.locator('.sx-detail-choices button')).toHaveCount(6);
  44 |   for(const [id,label,open] of [['core','Fusion core',true],['radiative-zone','Radiative zone',true],['convection-zone','Convection zone',true],['photosphere','Granulated photosphere',false],['sunspots','Sunspots',false],['prominence','Prominence & corona',false]] as const){
  45 |     await details.getByRole('button',{name:label,exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-detail',id);
  46 |     const current=await sun(page);expect(current.diameter).toBeCloseTo(before.diameter,8);expect(current.interior).toBe(open);expect(current.open).toBe(open?1:0);expect(current.aligned).toBeGreaterThan(.99999);
  47 |     await expect(page.locator('.sx-marker[aria-pressed="true"]')).toBeVisible();
  48 |     await expect(page.locator('.sx-marker[aria-pressed="true"]')).toHaveAttribute('data-offset','true');
  49 |     const source=await details.getByRole('link',{name:'Read the science source',exact:true}).getAttribute('href');
  50 |     expect(new URL(source!).hostname).toMatch(/(^|\.)nasa\.gov$/);
  51 |     await page.locator('.sx-stage').screenshot({path:path.join(out,'solar-'+id+'.png')});
  52 |   }
  53 |   await page.getByRole('button',{name:'Fit object',exact:true}).click();await page.getByRole('button',{name:'Reset camera',exact:true}).click();
  54 |   await page.locator('.sx-stage').screenshot({path:path.join(out,'solar-surface.png')});
  55 |   const panel=page.locator('.sx-comparison-workbench');await panel.locator(':scope > summary').click();
  56 |   await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('sun');await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('earth');
  57 |   await panel.getByRole('button',{name:'Compare them',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-comparison','sun:earth');
  58 |   const ratio=await page.evaluate(()=>{const r=(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());const roots:any={};r.scene.traverse((o:any)=>{if(o.userData.itemId)roots[o.userData.itemId]=o;});return roots.sun.scale.x/roots.earth.scale.x;});
  59 |   expect(ratio).toBeCloseTo(1.392e9/1.2742e7,6);expect((await sun(page)).diameter).toBeCloseTo(3,8);
  60 |   await page.locator('.sx-stage').screenshot({path:path.join(out,'sun-earth-comparison.png')});expect(errors).toEqual([]);
  61 | });
  62 | 
  63 | test('inspection travels while ambience is paused and yields to manual orbit',async({page})=>{
  64 |   await mount(page,false);await page.getByRole('button',{name:'Pause ambience',exact:true}).click();await fly(page,'sun');
  65 |   const canvas=page.locator('[data-atlas-ready]'),clocks=(await sun(page)).clocks;
  66 |   await page.getByRole('button',{name:'Orbit right',exact:true}).click();await page.getByRole('button',{name:'Orbit right',exact:true}).click();
  67 |   await page.evaluate(()=>{(window as any).__solarFrames=[];});await page.locator('.sx-details').getByRole('button',{name:'Fusion core',exact:true}).click();
  68 |   await expect(canvas).toHaveAttribute('data-atlas-zoom','1.80');await expect(canvas).toHaveAttribute('data-atlas-yaw','0.0000');
> 69 |   const frames=await page.evaluate(()=>(window as any).__solarFrames);expect(frames.filter((f:any)=>f.zoom>1&&f.zoom<1.8).length).toBeGreaterThan(4);
     |                                                                                                                                   ^ Error: expect(received).toBeGreaterThan(expected)
  70 |   await expect.poll(async()=>(await sun(page)).aligned).toBeGreaterThan(.99999);expect((await sun(page)).clocks).toEqual(clocks);
  71 |   // Once the approach finishes, a paused scene must stop scheduling frames.
  72 |   await page.waitForTimeout(350);const count=await page.evaluate(()=>(window as any).__solarFrames.length);expect(count).toBeLessThan(180);await page.waitForTimeout(200);expect(await page.evaluate(()=>(window as any).__solarFrames.length)).toBe(count);
  73 |   await page.locator('.sx-details').getByRole('button',{name:'Radiative zone',exact:true}).click();
  74 |   await page.getByRole('button',{name:'Orbit right',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-yaw','0.2000');
  75 |   await page.waitForTimeout(250);await expect(canvas).toHaveAttribute('data-atlas-yaw','0.2000');
  76 |   await page.getByRole('button',{name:'Resume ambience',exact:true}).click();await expect.poll(async()=>(await sun(page)).clocks[0]).toBeGreaterThan(clocks[0]+.2);
  77 |   expect((await sun(page)).rotation).toBeCloseTo(-.3,6);
  78 |   await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByRole('button',{name:'Reduced motion',exact:true})).toBeDisabled();
  79 |   const still=(await sun(page)).clocks;await page.waitForTimeout(200);expect((await sun(page)).clocks).toEqual(still);
  80 | });
  81 | 
  82 | test('phone keyboard inspection, occlusion and notebook restore the solar interior',async({page})=>{
  83 |   await mount(page);await page.setViewportSize({width:320,height:780});await fly(page,'sun');
  84 |   const core=page.locator('.sx-details').getByRole('button',{name:'Fusion core',exact:true});await core.focus();await core.press('Enter');
  85 |   const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-detail','core');await expect(canvas).toBeInViewport();
  86 |   await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-solar-core.png')});
  87 |   const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox').fill('Energy starts in the core.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
  88 |   await page.locator('.sx-details').getByRole('button',{name:'Sunspots',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-detail','sunspots');expect((await sun(page)).interior).toBe(false);
  89 |   await book.locator('[data-observation="sun:core"]').getByRole('button',{name:/^Return to/}).click();
  90 |   await expect(canvas).toHaveAttribute('data-atlas-detail','core');expect((await sun(page)).interior).toBe(true);await expect(book.getByRole('textbox')).toHaveValue('Energy starts in the core.');
  91 |   // Hidden interior labels must not shine through the opaque back of the star.
  92 |   await canvas.focus();for(let i=0;i<16;i++)await canvas.press('d');
  93 |   await expect(page.locator('.sx-marker[aria-pressed="true"]')).toBeHidden();
  94 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  95 | });
  96 | 
```