# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scale-explorer-landscape.spec.ts >> animated Earth entry and relief inspection settle while ambience is paused
- Location: tests\e2e\scale-explorer-landscape.spec.ts:75:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('[data-atlas-ready]')
Expected: "3.50"
Received: "3.49"
Timeout:  15000ms

Call log:
  - Expect "toHaveAttribute" with timeout 15000ms
  - waiting for locator('[data-atlas-ready]')
    - locator resolved to <canvas tabindex="0" width="1048" height="614" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="2.37" data-atlas-ready="true" data-atlas-yaw="0.0203" data-atlas-comparison="" data-atlas-cutaway="open" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-detail="canyon-rim" data-atlas-surface="procedural" aria-describedby="sx-desc-6ctxoe" data-atlas-objects="grand-canyon" data-atlas-p…></canvas>
    - unexpected value "2.37"
    - locator resolved to <canvas tabindex="0" width="1048" height="614" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="2.57" data-atlas-ready="true" data-atlas-yaw="0.0233" data-atlas-comparison="" data-atlas-cutaway="open" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-detail="canyon-rim" data-atlas-surface="procedural" aria-describedby="sx-desc-6ctxoe" data-atlas-objects="grand-canyon" data-atlas-p…></canvas>
    - unexpected value "2.57"
    - locator resolved to <canvas tabindex="0" width="1048" height="614" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="3.22" data-atlas-ready="true" data-atlas-yaw="0.0328" data-atlas-comparison="" data-atlas-cutaway="open" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-detail="canyon-rim" data-atlas-surface="procedural" aria-describedby="sx-desc-6ctxoe" data-atlas-objects="grand-canyon" data-atlas-p…></canvas>
    - unexpected value "3.22"
    - locator resolved to <canvas tabindex="0" width="1048" height="614" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="3.27" data-atlas-ready="true" data-atlas-yaw="0.0335" data-atlas-comparison="" data-atlas-cutaway="open" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-detail="canyon-rim" data-atlas-surface="procedural" aria-describedby="sx-desc-6ctxoe" data-atlas-objects="grand-canyon" data-atlas-p…></canvas>
    - unexpected value "3.27"
    - locator resolved to <canvas tabindex="0" width="1048" height="614" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="3.31" data-atlas-ready="true" data-atlas-yaw="0.0342" data-atlas-comparison="" data-atlas-cutaway="open" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-detail="canyon-rim" data-atlas-surface="procedural" aria-describedby="sx-desc-6ctxoe" data-atlas-objects="grand-canyon" data-atlas-p…></canvas>
    - unexpected value "3.31"
    - locator resolved to <canvas tabindex="0" width="1048" height="614" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="3.37" data-atlas-ready="true" data-atlas-yaw="0.0351" data-atlas-comparison="" data-atlas-cutaway="open" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-detail="canyon-rim" data-atlas-surface="procedural" aria-describedby="sx-desc-6ctxoe" data-atlas-objects="grand-canyon" data-atlas-p…></canvas>
    - unexpected value "3.37"
    - locator resolved to <canvas tabindex="0" width="1048" height="614" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="3.41" data-atlas-ready="true" data-atlas-yaw="0.0357" data-atlas-comparison="" data-atlas-cutaway="open" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-detail="canyon-rim" data-atlas-surface="procedural" aria-describedby="sx-desc-6ctxoe" data-atlas-objects="grand-canyon" data-atlas-p…></canvas>
    - unexpected value "3.41"
    - locator resolved to <canvas tabindex="0" width="1048" height="614" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="3.43" data-atlas-ready="true" data-atlas-yaw="0.0359" data-atlas-comparison="" data-atlas-cutaway="open" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-detail="canyon-rim" data-atlas-surface="procedural" aria-describedby="sx-desc-6ctxoe" data-atlas-objects="grand-canyon" data-atlas-p…></canvas>
    - unexpected value "3.43"
    - locator resolved to <canvas tabindex="0" width="1048" height="614" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="3.45" data-atlas-ready="true" data-atlas-yaw="0.0363" data-atlas-comparison="" data-atlas-cutaway="open" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-detail="canyon-rim" data-atlas-surface="procedural" aria-describedby="sx-desc-6ctxoe" data-atlas-objects="grand-canyon" data-atlas-p…></canvas>
    - unexpected value "3.45"
    - locator resolved to <canvas tabindex="0" width="1048" height="614" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="3.46" data-atlas-ready="true" data-atlas-yaw="0.0364" data-atlas-comparison="" data-atlas-cutaway="open" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-detail="canyon-rim" data-atlas-surface="procedural" aria-describedby="sx-desc-6ctxoe" data-atlas-objects="grand-canyon" data-atlas-p…></canvas>
    - unexpected value "3.46"
    - locator resolved to <canvas tabindex="0" width="1048" height="614" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="3.47" data-atlas-ready="true" data-atlas-yaw="0.0365" data-atlas-comparison="" data-atlas-cutaway="open" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-detail="canyon-rim" data-atlas-surface="procedural" aria-describedby="sx-desc-6ctxoe" data-atlas-objects="grand-canyon" data-atlas-p…></canvas>
    - unexpected value "3.47"
    - locator resolved to <canvas tabindex="0" width="1048" height="614" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="3.48" data-atlas-ready="true" data-atlas-yaw="0.0366" data-atlas-comparison="" data-atlas-cutaway="open" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-detail="canyon-rim" data-atlas-surface="procedural" aria-describedby="sx-desc-6ctxoe" data-atlas-objects="grand-canyon" data-atlas-p…></canvas>
    - unexpected value "3.48"
    - locator resolved to <canvas tabindex="0" width="1048" height="614" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="3.48" data-atlas-ready="true" data-atlas-yaw="0.0367" data-atlas-comparison="" data-atlas-cutaway="open" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-detail="canyon-rim" data-atlas-surface="procedural" aria-describedby="sx-desc-6ctxoe" data-atlas-objects="grand-canyon" data-atlas-p…></canvas>
    - unexpected value "3.48"
    2 × locator resolved to <canvas tabindex="0" width="1048" height="614" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="3.49" data-atlas-ready="true" data-atlas-yaw="0.0368" data-atlas-comparison="" data-atlas-cutaway="open" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-detail="canyon-rim" data-atlas-surface="procedural" aria-describedby="sx-desc-6ctxoe" data-atlas-objects="grand-canyon" data-atlas-p…></canvas>
      - unexpected value "3.49"
    - locator resolved to <canvas tabindex="0" width="1048" height="614" aria-busy="false" role="application" data-atlas-flight="" data-atlas-relief="8" data-atlas-zoom="3.49" data-atlas-ready="true" data-atlas-yaw="0.0369" data-atlas-comparison="" data-atlas-cutaway="open" data-atlas-target="5.6493" data-atlas-habitat="canyon" data-atlas-exponent="5.6493" data-atlas-flight-progress="" data-atlas-detail="canyon-rim" data-atlas-surface="procedural" aria-describedby="sx-desc-6ctxoe" data-atlas-objects="grand-canyon" data-atlas-p…></canvas>
    - unexpected value "3.49"

```

```yaml
- application "Interactive scale atlas. Scroll or use arrow keys to travel through scale. Drag to orbit, or use W A S D. Pinch to inspect more closely. R resets the camera. Home returns to human scale. Space plays or pauses the journey."
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
  3  | import { mkdirSync, readFileSync } from 'node:fs';
  4  | import path from 'node:path';
  5  | test.describe.configure({mode:'serial',retries:0,timeout:180000});
  6  | test.use({video:'off',trace:'off'});
  7  | const out=path.resolve('reports/scale-explorer-landscape');
  8  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_scaleexplorer.js',toolId:'scaleExplorer',width:1400,height:1100,layout:'document',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['vendor/three-r128/GLTFLoader.js'],probes:`const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=new Proxy(Original,{construct(target,args){const r=Reflect.construct(target,args),render=r.render;r.render=function(s,c){window.__terrainCamera=c;return render.apply(this,arguments);};return r;}});`});
  9  | test.beforeAll(async()=>{mkdirSync(out,{recursive:true});await harness.start();});test.afterAll(async()=>{await harness.stop();});
  10 | test.afterEach(async({page})=>{await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);});
  11 | const canvas=(p:any)=>p.locator('[data-atlas-ready]');
  12 | async function mount(page:any,phone=false){
  13 |   await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize(phone?{width:320,height:780}:{width:1400,height:1100});
  14 |   await harness.mount(page,{},'!!document.querySelector("[data-atlas-ready]")');
  15 |   await page.addStyleTag({content:'#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}'});
  16 | }
  17 | async function fly(page:any,id:string){await page.getByRole('combobox',{name:'Choose a destination',exact:true}).selectOption(id);await expect(canvas(page)).toHaveAttribute('data-atlas-objects',id);}
  18 | async function terrain(page:any){return page.evaluate(()=>{
  19 |   const w=window as any,T=w.THREE,r=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;r.scene.traverse((n:any)=>{if(n.userData.itemId==='grand-canyon')root=n;});
  20 |   const c=root.userData.model.userData.canyon,geo=c.terrain.geometry,p=root.userData.ruler.children[0].geometry.attributes.position;
  21 |   let length=0;for(let i=1;i<p.count;i++)length+=new T.Vector3().fromBufferAttribute(p,i).distanceTo(new T.Vector3().fromBufferAttribute(p,i-1));
  22 |   return{scale:root.scale.x,normalization:root.userData.model.scale.x,relief:c.land.scale.y,vertices:geo.attributes.position.count,rulerLength:length*root.scale.x,
  23 |     point:[geo.attributes.position.getX(100),geo.attributes.position.getY(100),geo.attributes.position.getZ(100)],riverVertices:c.river.geometry.attributes.position.count};
  24 | });}
  25 | test('layered terrain retains river length when vertical relief and the camera change',async({page})=>{
  26 |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);await fly(page,'grand-canyon');
  27 |   await expect(canvas(page)).toHaveAttribute('data-atlas-habitat','canyon');await expect(canvas(page)).toHaveAttribute('data-atlas-relief','8');
  28 |   const original=await terrain(page);expect(original.vertices).toBeGreaterThan(30000);expect(original.riverVertices).toBe(1026);expect(original.rulerLength).toBeCloseTo(3,5);
  29 |   await page.locator('.sx-stage').screenshot({path:path.join(out,'canyon-overview.png')});expect(looksBlank(await harness.glPixels(page))).toBe(false);
  30 |   await page.getByRole('button',{name:'Approach the rim',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','canyon-rim');await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','3.50');
  31 |   await page.locator('.sx-stage').screenshot({path:path.join(out,'canyon-rim.png')});
  32 |   await page.getByRole('button',{name:'Follow the river',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','river-bend');
  33 |   await page.locator('.sx-stage').screenshot({path:path.join(out,'river-corridor.png')});
  34 |   await page.getByRole('button',{name:'Actual proportions',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-relief','1');
  35 |   const actual=await terrain(page);expect(actual.relief).toBe(1);expect(actual.rulerLength).toBeCloseTo(original.rulerLength,8);expect(actual.point).toEqual(original.point);expect(actual.scale).toBe(original.scale);
  36 |   await page.getByRole('button',{name:'Look from above',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','canyon-overview');
  37 |   await page.locator('.sx-stage').screenshot({path:path.join(out,'actual-proportions.png')});expect(errors).toEqual([]);
  38 | });
  39 | test('Earth leads into the canyon and returns to the same globe viewpoint on a phone',async({page})=>{
  40 |   await mount(page,true);await fly(page,'earth');await expect(canvas(page)).toHaveAttribute('data-atlas-imagery','ready');
  41 |   await page.locator('.sx-details').getByRole('button',{name:'Grand Canyon, Arizona',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','arizona-canyon');
  42 |   await page.getByRole('button',{name:'Half light',exact:true}).click();
  43 |   const earth=await canvas(page).evaluate((c:HTMLElement)=>({detail:c.dataset.atlasDetail,yaw:c.dataset.atlasYaw,zoom:c.dataset.atlasZoom,aim:c.dataset.atlasAim}));
  44 |   await page.locator('.sx-stage').screenshot({path:path.join(out,'earth-canyon-portal.png')});
  45 |   await page.getByRole('region',{name:'Continue the journey',exact:true}).getByRole('button').click();await expect(canvas(page)).toHaveAttribute('data-atlas-objects','grand-canyon');
  46 |   await page.getByRole('button',{name:'Approach the rim',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','canyon-rim');
  47 |   await page.locator('.sx-stage').screenshot({path:path.join(out,'phone-canyon.png')});
  48 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  49 |   await page.getByRole('button',{name:'Return to The Earth',exact:true}).click();
  50 |   await expect.poll(()=>canvas(page).evaluate((c:HTMLElement)=>({detail:c.dataset.atlasDetail,yaw:c.dataset.atlasYaw,zoom:c.dataset.atlasZoom,aim:c.dataset.atlasAim}))).toEqual(earth);
  51 |   await expect(canvas(page)).toHaveAttribute('data-atlas-sun-angle','90');await expect(canvas(page)).toBeFocused();
  52 | });
  53 | test('notebook restores the relief and follows the repositioned landmark, while comparisons use actual proportions',async({page})=>{
  54 |   await mount(page);await fly(page,'grand-canyon');await page.getByRole('button',{name:'Approach the rim',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','canyon-rim');
  55 |   const relief=page.getByRole('slider',{name:'Vertical relief',exact:true});await relief.fill('7');await expect(canvas(page)).toHaveAttribute('data-atlas-relief','7');
  56 |   const saved=await canvas(page).evaluate((c:HTMLElement)=>({zoom:c.dataset.atlasZoom,aim:c.dataset.atlasAim,yaw:c.dataset.atlasYaw}));
  57 |   const book=page.getByRole('region',{name:'Field notebook',exact:true});await book.getByRole('textbox').fill('Relief changes height, not the river length.');await book.getByRole('button',{name:'Save observation',exact:true}).click();
  58 |   await relief.fill('20');await fly(page,'moon');await book.locator('[data-observation="grand-canyon:canyon-rim"]').getByRole('button',{name:/^Return to/}).click();
  59 |   await expect(canvas(page)).toHaveAttribute('data-atlas-relief','7');await expect.poll(()=>canvas(page).evaluate((c:HTMLElement)=>({zoom:c.dataset.atlasZoom,aim:c.dataset.atlasAim,yaw:c.dataset.atlasYaw}))).toEqual(saved);
  60 |   const download=page.waitForEvent('download');await book.getByRole('button',{name:'Download notes',exact:true}).click();expect(readFileSync((await(await download).path())!,'utf8')).toContain('Vertical relief: 7×');
  61 |   const compare=page.locator('.sx-comparison-workbench');await compare.locator(':scope > summary').click();await compare.getByRole('combobox',{name:'First thing',exact:true}).selectOption('grand-canyon');await compare.getByRole('combobox',{name:'Second thing',exact:true}).selectOption('earth');await compare.getByRole('button',{name:'Compare them',exact:true}).click();
  62 |   await expect(canvas(page)).toHaveAttribute('data-atlas-projection','orthographic');const state=await terrain(page);expect(state.relief).toBe(1);expect(state.scale/3).toBeCloseTo(446000/12742000,8);
  63 |   await expect(page.getByRole('region',{name:'Explore the canyon landscape',exact:true})).toHaveCount(0);
  64 | });
  65 | test('terrain remains interactive in WebGL 1 and blocked Earth imagery cannot offer geographic entry',async({page})=>{
  66 |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|THREE.WebGLProgram/.test(m.text()))errors.push(m.text());});
  67 |   await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:any,...args:any[]){if(type==='webgl2')return null;return(get as any).call(this,type,...args);};});
  68 |   await page.route('**/scale-earth-bluemarble-1k.png',route=>route.abort());await mount(page);await fly(page,'grand-canyon');
  69 |   await page.getByRole('button',{name:'Follow the river',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','river-bend');
  70 |   expect(looksBlank(await harness.glPixels(page))).toBe(false);await fly(page,'earth');await expect(canvas(page)).toHaveAttribute('data-atlas-imagery','failed');
  71 |   await expect(page.locator('.sx-details').getByRole('button',{name:'Grand Canyon, Arizona',exact:true})).toBeDisabled();await expect(page.getByRole('region',{name:'Continue the journey',exact:true})).toHaveCount(0);
  72 |   expect(errors).toEqual([]);
  73 | });
  74 | 
  75 | test('animated Earth entry and relief inspection settle while ambience is paused',async({page})=>{
  76 |   await mount(page);await fly(page,'earth');await expect(canvas(page)).toHaveAttribute('data-atlas-imagery','ready');
  77 |   await page.locator('.sx-details').getByRole('button',{name:'Grand Canyon, Arizona',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-detail','arizona-canyon');
  78 |   await page.emulateMedia({reducedMotion:'no-preference'});await page.getByRole('button',{name:'Pause ambience',exact:true}).click();
  79 |   await page.getByRole('region',{name:'Continue the journey',exact:true}).getByRole('button').click();
  80 |   await expect(canvas(page)).toHaveAttribute('aria-busy','true');await expect(canvas(page)).toHaveAttribute('aria-busy','false',{timeout:15000});
  81 |   await expect(canvas(page)).toHaveAttribute('data-atlas-objects','grand-canyon');await expect(canvas(page)).toHaveAttribute('data-atlas-relief','8');
> 82 |   await page.getByRole('button',{name:'Approach the rim',exact:true}).click();await expect(canvas(page)).toHaveAttribute('data-atlas-zoom','3.50');
     |                                                                                                          ^ Error: expect(locator).toHaveAttribute(expected) failed
  83 |   const localAim=()=>page.evaluate(()=>{
  84 |     const w=window as any,T=w.THREE,r=w.__glRecorder.records.find((r:any)=>!r.ctx.isContextLost());let root:any;r.scene.traverse((n:any)=>{if(n.userData.itemId==='grand-canyon')root=n;});
  85 |     return root.userData.model.worldToLocal(new T.Vector3().fromArray(r.canvas.dataset.atlasAim.split(',').map(Number))).toArray();
  86 |   });
  87 |   await expect.poll(async()=>Math.abs((await localAim())[0]+.06)).toBeLessThan(.0002);const before=await localAim();
  88 |   await page.getByRole('slider',{name:'Vertical relief',exact:true}).fill('4');await expect(canvas(page)).toHaveAttribute('data-atlas-relief','4');
  89 |   await expect.poll(async()=>Math.abs((await localAim())[1]-before[1]/2)).toBeLessThan(.0002);
  90 |   const counts=()=>page.evaluate(()=>(window as any).__glRecorder.records.find((r:any)=>!r.ctx.isContextLost()).renders);
  91 |   await page.waitForTimeout(700);const stopped=await counts();await page.waitForTimeout(400);expect(await counts()).toBe(stopped);
  92 | });
  93 | 
```