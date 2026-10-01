# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scale-explorer-river.spec.ts >> animated travel follows the river and becomes idle with ambience paused
- Location: tests\e2e\scale-explorer-river.spec.ts:70:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('[data-atlas-ready]')
Expected: "350.00"
Received: "349.06"
Timeout:  15000ms

Call log:
  - Expect "toHaveAttribute" with timeout 15000ms
  - waiting for locator('[data-atlas-ready]')
    - locator resolved to <canvas tabindex="0" width="1048" height="671" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="8.00" data-atlas-ready="true" data-atlas-comparison="" data-atlas-yaw="-1.2831" data-atlas-cutaway="open" data-atlas-river-km="350" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-surface="procedural" aria-describedby="sx-desc-67at11" data-atlas-objects="grand-canyon" data-atlas-detai…></canvas>
    - unexpected value "201.82"
    - locator resolved to <canvas tabindex="0" width="1048" height="671" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="8.00" data-atlas-ready="true" data-atlas-comparison="" data-atlas-yaw="-1.3896" data-atlas-cutaway="open" data-atlas-river-km="350" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-surface="procedural" aria-describedby="sx-desc-67at11" data-atlas-objects="grand-canyon" data-atlas-detai…></canvas>
    - unexpected value "225.53"
    - locator resolved to <canvas tabindex="0" width="1048" height="671" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="8.00" data-atlas-ready="true" data-atlas-comparison="" data-atlas-yaw="-1.4327" data-atlas-cutaway="open" data-atlas-river-km="350" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-surface="procedural" aria-describedby="sx-desc-67at11" data-atlas-objects="grand-canyon" data-atlas-detai…></canvas>
    - unexpected value "262.18"
    - locator resolved to <canvas tabindex="0" width="1048" height="671" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="8.00" data-atlas-ready="true" data-atlas-comparison="" data-atlas-yaw="-1.3357" data-atlas-cutaway="open" data-atlas-river-km="350" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-surface="procedural" aria-describedby="sx-desc-67at11" data-atlas-objects="grand-canyon" data-atlas-detai…></canvas>
    - unexpected value "297.95"
    - locator resolved to <canvas tabindex="0" width="1048" height="671" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="8.00" data-atlas-ready="true" data-atlas-comparison="" data-atlas-yaw="-1.2817" data-atlas-cutaway="open" data-atlas-river-km="350" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-surface="procedural" aria-describedby="sx-desc-67at11" data-atlas-objects="grand-canyon" data-atlas-detai…></canvas>
    - unexpected value "306.27"
    - locator resolved to <canvas tabindex="0" width="1048" height="671" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="8.00" data-atlas-ready="true" data-atlas-comparison="" data-atlas-yaw="-1.0757" data-atlas-cutaway="open" data-atlas-river-km="350" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-surface="procedural" aria-describedby="sx-desc-67at11" data-atlas-objects="grand-canyon" data-atlas-detai…></canvas>
    - unexpected value "324.08"
    - locator resolved to <canvas tabindex="0" width="1048" height="671" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="8.00" data-atlas-ready="true" data-atlas-comparison="" data-atlas-yaw="-0.8399" data-atlas-cutaway="open" data-atlas-river-km="350" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-surface="procedural" aria-describedby="sx-desc-67at11" data-atlas-objects="grand-canyon" data-atlas-detai…></canvas>
    - unexpected value "340.90"
    - locator resolved to <canvas tabindex="0" width="1048" height="671" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="8.00" data-atlas-ready="true" data-atlas-comparison="" data-atlas-yaw="-0.7982" data-atlas-cutaway="open" data-atlas-river-km="350" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-surface="procedural" aria-describedby="sx-desc-67at11" data-atlas-objects="grand-canyon" data-atlas-detai…></canvas>
    - unexpected value "346.80"
    - locator resolved to <canvas tabindex="0" width="1048" height="671" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="8.00" data-atlas-ready="true" data-atlas-comparison="" data-atlas-yaw="-0.8129" data-atlas-cutaway="open" data-atlas-river-km="350" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-surface="procedural" aria-describedby="sx-desc-67at11" data-atlas-objects="grand-canyon" data-atlas-detai…></canvas>
    - unexpected value "349.06"

```

```yaml
- application "Interactive scale atlas. Scroll or use arrow keys to travel through scale. Drag to orbit, or use W A S D. Pinch to inspect more closely. R resets the camera. Home returns to human scale. Space plays or pauses the journey."
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {GlHarness,looksBlank} from './helpers/stem_gl_harness';
  3  | import {mkdirSync,readFileSync} from 'node:fs';
  4  | import path from 'node:path';
  5  | test.describe.configure({mode:'serial',retries:0,timeout:180000});
  6  | test.use({video:'off',trace:'off'});
  7  | const out=path.resolve('reports/scale-explorer-river');
  8  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__riverCamera=c;if(window.__riverSamples){s.traverse(function(n){if(n.name==='canyonRouteLocator'&&n.visible&&window.__riverSamples.length<500)window.__riverSamples.push(n.position.toArray());});}return render.apply(this,arguments);};return r;}});`});
  9  | test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});
  10 | test.afterAll(async()=>{await harness.stop();});
  11 | test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
  12 | const canvas=(p:any)=>p.locator('[data-atlas-ready]');
  13 | const route=(p:any)=>p.getByRole('region',{name:'Navigate the river',exact:true});
  14 | const slider=(p:any)=>p.getByRole('slider',{name:'Position along the illustrated river',exact:true});
  15 | async function mount(page:any,phone=false){
  16 |  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize(phone?{width:320,height:780}:{width:1400,height:1100});
  17 |  await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
  18 |  await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
  19 |  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption('grand-canyon');
  20 |  await expect(canvas(page)).toHaveAttribute('data-atlas-objects','grand-canyon');
  21 |  await page.getByRole('button',{name:'Travel along the river',exact:true}).click();
  22 |  await expect(canvas(page)).toHaveAttribute('data-atlas-detail','river-journey');
  23 | }
  24 | async function position(page:any){return page.evaluate(()=>{
  25 |  const w=window as any,T=w.THREE,r=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;r.scene.traverse((n:any)=>{if(n.userData.itemId==='grand-canyon')root=n;});
  26 |  const g=root.userData.model,c=g.userData.canyon;
  27 |  return {point:c.locator.position.toArray(),aim:g.worldToLocal(new T.Vector3().fromArray(r.canvas.dataset.atlasAim.split(',').map(Number))).toArray(),scale:root.scale.x,zoom:r.canvas.dataset.atlasZoom,relief:c.land.scale.y,yaw:r.canvas.dataset.atlasYaw,visible:c.locator.visible};
  28 | });}
  29 | test('river distance guides the camera through bends without changing the measured terrain',async({page})=>{
  30 |  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);
  31 |  const first=await position(page);expect(first.point[0]).toBe(-.5);expect(first.visible).toBe(true);
  32 |  await expect(route(page).getByRole('button',{name:'Move back 25 km',exact:true})).toBeDisabled();
  33 |  for(const km of [111,223,335,446]){
  34 |    await slider(page).fill(String(km));await expect(canvas(page)).toHaveAttribute('data-atlas-river-km',String(km));
  35 |    const p=await position(page);expect(p.scale).toBe(first.scale);expect(p.zoom).toBe('8.00');
  36 |    expect(Math.hypot(p.aim[0]-p.point[0],p.aim[2]-p.point[2])).toBeLessThan(.0002);
  37 |    expect(looksBlank(await harness.glPixels(page))).toBe(false);
  38 |    if(km===223)await page.locator('.sx-stage').screenshot({path:path.join(out,'river-desktop.png')});
  39 |  }
  40 |  expect((await position(page)).point[0]).toBe(.5);
  41 |  await expect(route(page).getByRole('button',{name:'Move forward 25 km',exact:true})).toBeDisabled();
  42 |  await route(page).getByRole('button',{name:'Whole landscape',exact:true}).click();await expect(route(page)).toHaveCount(0);
  43 |  expect((await position(page)).visible).toBe(false);await expect(canvas(page)).toHaveAttribute('data-atlas-detail','canyon-overview');expect(errors).toEqual([]);
  44 | });
  45 | test('phone keyboard controls stay reachable and preserve position when leaving the journey',async({page})=>{
  46 |  await mount(page,true);await slider(page).focus();await slider(page).press('End');await expect(slider(page)).toHaveValue('446');
  47 |  await slider(page).press('ArrowLeft');await expect(canvas(page)).toHaveAttribute('data-atlas-river-km','445');
  48 |  await route(page).getByRole('button',{name:'Move back 25 km',exact:true}).click();await expect(slider(page)).toHaveValue('420');
  49 |  await slider(page).fill('223');await page.locator('.sx-stage').screenshot({path:path.join(out,'river-phone.png')});
  50 |  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  51 |  const bounds=await route(page).boundingBox();const stage=await page.locator('.sx-stage').boundingBox();
  52 |  expect(bounds!.x).toBeGreaterThanOrEqual(stage!.x);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(stage!.x+stage!.width);
  53 |  await route(page).getByRole('button',{name:'Whole landscape',exact:true}).click();
  54 |  await page.getByRole('button',{name:'Travel along the river',exact:true}).click();await expect(slider(page)).toHaveValue('223');
  55 |  await slider(page).press('Home');await expect(slider(page)).toHaveValue('0');
  56 | });
  57 | test('notebook restores river position, relief and manual camera direction and exports the route context',async({page})=>{
  58 |  await mount(page);await slider(page).fill('250');
  59 |  await page.getByRole('slider',{name:'Vertical relief',exact:true}).fill('7');
  60 |  await canvas(page).focus();await canvas(page).press('d');const saved=await position(page);
  61 |  const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox').fill('The river bends between layered walls.');
  62 |  await book.getByRole('button',{name:'Save observation',exact:true}).click();
  63 |  await slider(page).fill('20');await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption('moon');
  64 |  await book.locator('[data-observation="grand-canyon:river-journey"]').getByRole('button',{name:/^Return to/}).click();
  65 |  await expect(canvas(page)).toHaveAttribute('data-atlas-river-km','250');await expect(slider(page)).toHaveValue('250');
  66 |  await expect.poll(()=>position(page)).toEqual(saved);
  67 |  const download=page.waitForEvent('download');await book.getByRole('button',{name:'Download notes',exact:true}).click();
  68 |  const text=readFileSync((await(await download).path())!,'utf8');expect(text).toContain('River journey: 250 km');expect(text).toContain('Vertical relief: 7×');expect(text).toContain('not a geographic coordinate');
  69 | });
  70 | test('animated travel follows the river and becomes idle with ambience paused',async({page})=>{
  71 |  await mount(page);await slider(page).fill('100');await page.emulateMedia({reducedMotion:'no-preference'});
  72 |  await page.getByRole('button',{name:'Pause ambience',exact:true}).click();await page.evaluate(()=>{(window as any).__riverSamples=[];});
> 73 |  await slider(page).fill('350');await expect(canvas(page)).toHaveAttribute('data-atlas-river-travel-km','350.00',{timeout:15000});
     |                                                            ^ Error: expect(locator).toHaveAttribute(expected) failed
  74 |  const samples=await page.evaluate(()=>(window as any).__riverSamples as number[][]);expect(samples.length).toBeGreaterThan(10);
  75 |  for(let i=1;i<samples.length;i++)expect(samples[i][0]).toBeGreaterThanOrEqual(samples[i-1][0]);
  76 |  const error=await page.evaluate(()=>{
  77 |    const w=window as any,r=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let river:any;r.scene.traverse((n:any)=>{if(n.name==='canyonRiver')river=n;});
  78 |    const a=river.geometry.attributes.position;let worst=0;
  79 |    for(const p of w.__riverSamples){let best=Infinity;for(let i=0;i<a.count-2;i+=2){
  80 |      const ax=a.getX(i),az=(a.getZ(i)+a.getZ(i+1))/2,bx=a.getX(i+2),bz=(a.getZ(i+2)+a.getZ(i+3))/2;
  81 |      const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((p[0]-ax)*dx+(p[2]-az)*dz)/(dx*dx+dz*dz)));
  82 |      best=Math.min(best,Math.hypot(p[0]-ax-t*dx,p[2]-az-t*dz));
  83 |    }worst=Math.max(worst,best);}return worst;
  84 |  });expect(error).toBeLessThan(.000001);
  85 |  const renders=()=>page.evaluate(()=>(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()).renders);
  86 |  await expect.poll(async()=>{const n=await renders();await page.waitForTimeout(250);return await renders()===n;},{timeout:8000}).toBe(true);
  87 |  const n=await renders();await page.waitForTimeout(300);expect(await renders()).toBe(n);
  88 |  await slider(page).fill('20');await page.emulateMedia({reducedMotion:'reduce'});await expect(canvas(page)).toHaveAttribute('data-atlas-river-travel-km','20.00');
  89 | });
  90 | test('WebGL 1 renders the route marker and scene after a river journey',async({page})=>{
  91 |  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|THREE.WebGLProgram/.test(m.text()))errors.push(m.text());});
  92 |  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:any,...args:any[]){if(type==='webgl2')return null;return(get as any).call(this,type,...args);};});
  93 |  await mount(page);await slider(page).fill('310');expect(looksBlank(await harness.glPixels(page))).toBe(false);expect((await position(page)).visible).toBe(true);
  94 |  await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption('earth');await expect(route(page)).toHaveCount(0);
  95 |  await expect(canvas(page)).not.toHaveAttribute('data-atlas-river-km');expect(errors).toEqual([]);
  96 | });
  97 | 
```