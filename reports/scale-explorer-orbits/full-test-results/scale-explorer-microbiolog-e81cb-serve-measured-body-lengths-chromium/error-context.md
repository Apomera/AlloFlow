# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scale-explorer-microbiology.spec.ts >> distinct cell anatomy, cutaways and all landmarks preserve measured body lengths
- Location: tests\e2e\scale-explorer-microbiology.spec.ts:35:5

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 2
Received:   58.5999755859375
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
  8  | const out=path.resolve('reports/scale-explorer-microbiology');
  9  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__cellCamera=c;return render.apply(this,arguments);};return r;}});`});
  10 | test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
  11 | test.afterAll(async()=>{await harness.stop();});
  12 | test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
  13 | async function mount(page:any,reduced=true){
  14 |   await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});await page.setViewportSize({width:1400,height:1100});
  15 |   await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
  16 |   await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
  17 | }
  18 | async function fly(page:any,id:string){
  19 |   await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);
  20 |   const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-objects',id);
  21 |   await expect.poll(()=>canvas.evaluate((c:HTMLElement)=>Math.abs(Number(c.dataset.atlasExponent)-Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
  22 | }
  23 | async function cell(page:any,id:string){return page.evaluate(id=>{
  24 |   const w=window as any,T=w.THREE,scene=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()).scene;let root:any;
  25 |   scene.traverse((o:any)=>{if(o.userData.itemId===id)root=o;});
  26 |   const g=root.userData.model,body=g.children[0].geometry;body.computeBoundingBox();
  27 |   const camera=w.__cellCamera,aim=new T.Vector3().fromArray(document.querySelector('[data-atlas-ready]')!.getAttribute('data-atlas-aim')!.split(',').map(Number));
  28 |   const measuredLength=g.localToWorld(new T.Vector3(.5,0,0)).distanceTo(g.localToWorld(new T.Vector3(-.5,0,0)));
  29 |   return {scale:root.scale.x,length:body.boundingBox.max.x-body.boundingBox.min.x,measuredLength,covered:g.userData.outerMembrane.visible,inside:g.userData.innerStructures.visible,
  30 |     cilia:g.userData.ciliaMaterial?.uniforms.uTime.value,coatOpen:g.userData.coatMaterial.uniforms.uOpen.value,
  31 |     vacuoles:g.userData.vacuoles?.map((v:any)=>v.scale.toArray()),flagella:g.userData.flagella?.map((f:any)=>f.rotation.x),
  32 |     aligned:camera.getWorldDirection(new T.Vector3()).dot(aim.sub(camera.position).normalize())};
  33 | },id);}
  34 | 
  35 | test('distinct cell anatomy, cutaways and all landmarks preserve measured body lengths',async({page})=>{
  36 |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  37 |   await mount(page);const canvas=page.locator('[data-atlas-ready]');
  38 |   for(const id of ['paramecium','ecoli']){
  39 |     await fly(page,id);const before=await cell(page,id);expect(before.length).toBeCloseTo(1,6);expect(before.measuredLength).toBeCloseTo(before.scale,8);
  40 |     const toggle=page.getByRole('button',{name:'Open cutaway',exact:true});
  41 |     if((await toggle.getAttribute('aria-pressed'))==='false')await toggle.click();
  42 |     await expect.poll(async()=>(await cell(page,id)).inside).toBe(true);expect((await cell(page,id)).covered).toBe(false);
  43 |     expect(looksBlank(await harness.glPixels(page))).toBe(false);
  44 |     await page.locator('.sx-stage').screenshot({path:path.join(out,id+'-cutaway.png')});
  45 |     await toggle.click();await expect.poll(async()=>(await cell(page,id)).covered).toBe(true);expect((await cell(page,id)).inside).toBe(false);
  46 |     expect((await cell(page,id)).coatOpen).toBe(0);
  47 |     await page.locator('.sx-stage').screenshot({path:path.join(out,id+'-closed.png')});
  48 |     for(const choice of await page.locator('.sx-detail-choices button').all()){
  49 |       await choice.click();await expect(canvas).not.toHaveAttribute('data-atlas-detail','');
  50 |       const current=await cell(page,id);expect(current.scale).toBe(before.scale);expect(current.length).toBe(before.length);expect(current.measuredLength).toBeCloseTo(before.measuredLength,8);expect(current.aligned).toBeGreaterThan(.99999);
  51 |       const selected=page.locator('.sx-marker[aria-pressed="true"]');await expect(selected).toHaveAttribute('data-offset','true');
  52 |       const markerBox=(await selected.boundingBox())!,canvasBox=(await canvas.boundingBox())!;
> 53 |       expect(Math.abs(markerBox.y+markerBox.height/2-(canvasBox.y+canvasBox.height/2)-44)).toBeLessThan(2);
     |                                                                                            ^ Error: expect(received).toBeLessThan(expected)
  54 |       await expect(page.locator('.sx-details').getByRole('link',{name:'Read the science source',exact:true})).toHaveAttribute('href',/^https:\/\//);
  55 |     }
  56 |     await page.locator('.sx-stage').screenshot({path:path.join(out,id+'-feature.png')});
  57 |   }
  58 |   const panel=page.locator('.sx-comparison-workbench');await panel.locator(':scope > summary').click();
  59 |   await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('paramecium');
  60 |   await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('ecoli');
  61 |   await panel.getByRole('button',{name:'Compare them',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-comparison','paramecium:ecoli');
  62 |   expect((await cell(page,'paramecium')).measuredLength/(await cell(page,'ecoli')).measuredLength).toBeCloseTo(100,8);
  63 |   await page.locator('.sx-stage').screenshot({path:path.join(out,'cells-at-shared-scale.png')});expect(errors).toEqual([]);
  64 | });
  65 | 
  66 | test('cilia, vacuoles and flagella move, pause, and honor reduced motion',async({page})=>{
  67 |   await mount(page,false);await fly(page,'paramecium');const before=await cell(page,'paramecium');
  68 |   await expect.poll(async()=>(await cell(page,'paramecium')).cilia).toBeGreaterThan(before.cilia+.3);
  69 |   expect((await cell(page,'paramecium')).vacuoles).not.toEqual(before.vacuoles);
  70 |   await page.getByRole('button',{name:'Pause ambience',exact:true}).click();const paused=await cell(page,'paramecium');
  71 |   await page.waitForTimeout(200);expect((await cell(page,'paramecium')).cilia).toBe(paused.cilia);expect((await cell(page,'paramecium')).vacuoles).toEqual(paused.vacuoles);
  72 |   await fly(page,'ecoli');const still=await cell(page,'ecoli');
  73 |   await page.getByRole('button',{name:'Resume ambience',exact:true}).click();
  74 |   await expect.poll(async()=>(await cell(page,'ecoli')).flagella[0]).toBeGreaterThan(still.flagella[0]+.2);
  75 |   expect((await cell(page,'ecoli')).scale).toBe(still.scale);
  76 |   await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByRole('button',{name:'Reduced motion',exact:true})).toBeDisabled();
  77 |   const reduced=await cell(page,'ecoli');await page.waitForTimeout(200);expect((await cell(page,'ecoli')).flagella).toEqual(reduced.flagella);
  78 | });
  79 | 
  80 | test('phone keyboard exploration and saved notes restore the correct interior',async({page})=>{
  81 |   await mount(page);await page.setViewportSize({width:320,height:780});await fly(page,'paramecium');
  82 |   const choice=page.locator('.sx-details').getByRole('button',{name:'Contractile vacuoles',exact:true});await choice.focus();await choice.press('Enter');
  83 |   const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-detail','contractile-vacuole');
  84 |   await expect(canvas).toBeInViewport();expect((await cell(page,'paramecium')).inside).toBe(true);
  85 |   await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-vacuole.png')});
  86 |   const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox').fill('The canals join a central reservoir.');
  87 |   await book.getByRole('button',{name:'Save observation',exact:true}).click();
  88 |   await fly(page,'ecoli');await page.locator('.sx-details').getByRole('button',{name:'Cell envelope & pili',exact:true}).click();
  89 |   expect((await cell(page,'ecoli')).inside).toBe(false);
  90 |   await book.locator('[data-observation="paramecium:contractile-vacuole"]').getByRole('button',{name:/^Return to/}).click();
  91 |   await expect(canvas).toHaveAttribute('data-atlas-detail','contractile-vacuole');expect((await cell(page,'paramecium')).inside).toBe(true);
  92 |   await expect(book.getByRole('textbox')).toHaveValue('The canals join a central reservoir.');
  93 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  94 | });
  95 | 
```