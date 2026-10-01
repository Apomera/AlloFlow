# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scale-explorer-orbits.spec.ts >> deep approaches remain smooth with ambience paused and stop drawing when settled
- Location: tests\e2e\scale-explorer-orbits.spec.ts:88:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 68
Received: 69
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
  3   | import { mkdirSync } from 'node:fs';
  4   | import path from 'node:path';
  5   | 
  6   | test.describe.configure({mode:'serial',retries:0,timeout:180000});
  7   | test.use({video:'off',trace:'off'});
  8   | const out=path.resolve('reports/scale-explorer-orbits');
  9   | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){const f=window.__orbitFrames;if(f&&f.length<300)f.push(Number(r.domElement.dataset.atlasZoom||1));return render.apply(this,arguments);};return r;}});`});
  10  | test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
  11  | test.afterAll(async()=>{await harness.stop();});
  12  | test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
  13  | async function mount(page:any){
  14  |   await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1400,height:1100});
  15  |   await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
  16  |   await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
  17  | }
  18  | async function fly(page:any,id:string){
  19  |   await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);
  20  |   const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-objects',id);
  21  |   await expect.poll(()=>canvas.evaluate((c:HTMLElement)=>Math.abs(Number(c.dataset.atlasExponent)-Number(c.dataset.atlasTarget)))).toBeLessThan(.002);
  22  | }
  23  | async function system(page:any){return page.evaluate(()=>{
  24  |   const w=window as any,T=w.THREE,r=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;
  25  |   r.scene.traverse((o:any)=>{if(o.userData.itemId==='solar-system')root=o;});const g=root.userData.model,n=g.userData.solarSystem;
  26  |   return {span:g.localToWorld(new T.Vector3(.5,0,0)).distanceTo(g.localToWorld(new T.Vector3(-.5,0,0))),
  27  |     positions:n.bodies.map((b:any)=>({id:b.userData.planetId,p:b.position.toArray(),scale:b.scale.x})),
  28  |     paths:n.paths.map((l:any)=>({id:l.userData.planetId,au:l.userData.orbitAU,points:Array.from(l.geometry.attributes.position.array)})),
  29  |     belt:n.belt.geometry.attributes.position.count,rotation:g.rotation.toArray(),
  30  |     ray:n.measureLine.visible?Array.from(n.measureLine.geometry.attributes.position.array):null,context:r.type};
  31  | });}
  32  | async function shot(page:any,name:string){
  33  |   expect(looksBlank(await harness.glPixels(page))).toBe(false);
  34  |   await page.locator('.sx-stage').screenshot({path:path.join(out,name+'.png')});
  35  | }
  36  | test('eight orbital radii keep their measured ratios through deep inspection',async({page})=>{
  37  |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  38  |   await mount(page);await fly(page,'solar-system');const before=await system(page),canvas=page.locator('[data-atlas-ready]');
  39  |   expect(before.span).toBeCloseTo(3,8);expect(before.paths).toHaveLength(8);expect(before.belt).toBe(1600);
  40  |   const earthRadius=Math.hypot(...before.positions[2].p);
  41  |   for(let i=0;i<8;i++){const p=before.positions[i],orbit=before.paths[i];expect(Math.hypot(...p.p)/earthRadius).toBeCloseTo(orbit.au/1.00000261,8);
  42  |     expect(Math.hypot(...orbit.points.slice(0,3) as number[])).toBeCloseTo(Math.hypot(...p.p),7);}
  43  |   expect(Math.hypot(...before.positions[7].p)).toBeCloseTo(.5,8);await shot(page,'system-overview');
  44  |   const controls=page.getByRole('region',{name:'Explore the planetary system',exact:true});
  45  |   await controls.getByRole('button',{name:'Explore inner planets',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-zoom','24.00');
  46  |   const inner=await system(page);expect(inner.paths).toEqual(before.paths);expect(inner.positions.map(p=>p.p)).toEqual(before.positions.map(p=>p.p));expect(inner.span).toBe(before.span);
  47  |   await expect(page.getByRole('slider',{name:'Inspection magnification',exact:true})).toHaveAttribute('max','32');
  48  |   await shot(page,'inner-planets');
  49  |   for(const [id,label] of [['earth-orbit','Earth'],['saturn-orbit','Saturn'],['asteroid-belt','The asteroid belt']] as const){
  50  |     await page.locator('.sx-details').getByRole('button',{name:label,exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-detail',id);
  51  |     if(id==='earth-orbit'){await expect(canvas).toHaveAttribute('data-atlas-zoom','32.00');const earth=await system(page);expect(earth.ray!.slice(3)).toEqual(earth.positions[2].p.map(Math.fround));}
  52  |     await shot(page,id);
  53  |   }
  54  |   await controls.getByRole('button',{name:'Whole system',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-zoom','1.00');expect((await system(page)).paths).toEqual(before.paths);expect(errors).toEqual([]);
  55  | });
  56  | test('phone keyboard exploration restores deep observations and enters a detailed world',async({page})=>{
  57  |   await mount(page);await page.setViewportSize({width:320,height:780});await fly(page,'solar-system');const canvas=page.locator('[data-atlas-ready]');
  58  |   const earth=page.locator('.sx-details').getByRole('button',{name:'Earth',exact:true});await earth.focus();await earth.press('Enter');
  59  |   await expect(canvas).toHaveAttribute('data-atlas-zoom','32.00');await shot(page,'phone-earth-orbit');
  60  |   const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox').fill('All the rocky planets fit near the Sun.');
  61  |   await book.getByRole('button',{name:'Save observation',exact:true}).click();
  62  |   const controls=page.getByRole('region',{name:'Explore the planetary system',exact:true});
  63  |   await controls.getByRole('button',{name:'Whole system',exact:true}).click();
  64  |   await book.locator('[data-observation="solar-system:earth-orbit"]').getByRole('button',{name:/^Return to/}).click();
  65  |   await expect(canvas).toHaveAttribute('data-atlas-detail','earth-orbit');await expect(canvas).toHaveAttribute('data-atlas-zoom','32.00');
  66  |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  67  |   await controls.getByRole('button',{name:'Explore Earth at its own scale',exact:true}).click();
  68  |   await expect(canvas).toHaveAttribute('data-atlas-objects','earth');await expect(canvas).toHaveAttribute('data-atlas-zoom','1.00');
  69  |   await expect(page.getByRole('slider',{name:'Inspection magnification',exact:true})).toHaveAttribute('max','2.5');
  70  |   await fly(page,'solar-system');await controls.getByRole('button',{name:'Visit the Sun',exact:true}).click();await expect(canvas).toHaveAttribute('data-atlas-objects','sun');
  71  | });
  72  | test('orbital system comparisons preserve physical dimensions after close inspection',async({page})=>{
  73  |   await mount(page);await fly(page,'solar-system');await page.getByRole('button',{name:'Explore inner planets',exact:true}).click();
  74  |   const panel=page.locator('.sx-comparison-workbench');await panel.locator(':scope > summary').click();
  75  |   await panel.getByRole('combobox',{name:'First thing',exact:true}).selectOption('solar-system');
  76  |   await panel.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('sun');await panel.getByRole('button',{name:'Compare them',exact:true}).click();
  77  |   const canvas=page.locator('[data-atlas-ready]');await expect(canvas).toHaveAttribute('data-atlas-projection','orthographic');
  78  |   const ratio=await page.evaluate(()=>{const r=(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()),roots:any={};r.scene.traverse((o:any)=>{if(o.userData.itemId)roots[o.userData.itemId]=o;});return roots['solar-system'].scale.x/roots.sun.scale.x;});
  79  |   expect(ratio).toBeCloseTo(9e12/1.392e9,6);expect((await system(page)).ray).toBeNull();await shot(page,'system-sun-comparison');
  80  | });
  81  | test('the orbital scene works in WebGL 1 without shader errors',async({page})=>{
  82  |   await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;(HTMLCanvasElement.prototype as any).getContext=function(type:string,...args:any[]){if(type==='webgl2')return null;return original.apply(this,[type,...args] as any);};});
  83  |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  84  |   await mount(page);await fly(page,'solar-system');expect((await system(page)).context).toBe('webgl');
  85  |   await page.locator('.sx-details').getByRole('button',{name:'Saturn',exact:true}).click();await shot(page,'saturn-webgl1');expect(errors).toEqual([]);
  86  | });
  87  | 
  88  | test('deep approaches remain smooth with ambience paused and stop drawing when settled',async({page})=>{
  89  |   await mount(page);await fly(page,'solar-system');await page.emulateMedia({reducedMotion:'no-preference'});
  90  |   await page.getByRole('button',{name:'Pause ambience',exact:true}).click();const canvas=page.locator('[data-atlas-ready]');
  91  |   await page.evaluate(()=>{(window as any).__orbitFrames=[];});
  92  |   await page.getByRole('button',{name:'Explore inner planets',exact:true}).click();
  93  |   await expect(canvas).toHaveAttribute('data-atlas-zoom','24.00');
  94  |   await expect.poll(()=>page.evaluate(()=>{const f=(window as any).__orbitFrames;return f.length;})).toBeGreaterThan(10);
  95  |   await page.waitForTimeout(400);
  96  |   const frames=await page.evaluate(()=>(window as any).__orbitFrames as number[]);
  97  |   expect(frames.filter(v=>v>1&&v<23.99).length).toBeGreaterThan(8);
  98  |   for(let i=1;i<frames.length;i++)expect(frames[i]).toBeGreaterThanOrEqual(frames[i-1]);
> 99  |   const count=frames.length;await page.waitForTimeout(300);expect(await page.evaluate(()=>(window as any).__orbitFrames.length)).toBe(count);
      |                                                                                                                                  ^ Error: expect(received).toBe(expected) // Object.is equality
  100 |   await page.getByRole('region',{name:'Explore the planetary system',exact:true}).getByRole('button',{name:'Whole system',exact:true}).click();
  101 |   await expect(canvas).toHaveAttribute('data-atlas-zoom','1.00');
  102 | });
  103 | 
```