# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: raptor-face-marks.spec.ts >> Raptor facial field marks >> renders attached field marks at multiple angles: osprey low
- Location: tests\e2e\raptor-face-marks.spec.ts:43:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 4
+ Received  + 4

  Array [
-   -0.002704048655846882,
-   0.9878977694637656,
-   0.15411108388891248,
-   0.017333754122177168,
+   -0.00270404865584684,
+   0.9878977694637658,
+   0.1541110838889107,
+   0.0173337541221771,
  ]
```

# Test source

```ts
  6   | const probes = `window.AlloPostFXEnabled=false;window.faceRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);r.render=function(scene,camera){window.faceScene=scene;window.faceCamera=camera;if(window.faceSkipRender)return;window.faceRenders++;return render(scene,camera);};return r;};})();`;
  7   | 
  8   | test.describe('Raptor facial field marks', () => {
  9   |   test.describe.configure({ mode: 'serial', timeout: 240000 });
  10  |   const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 880, height: 680, appStyles: true, probes });
  11  |   test.beforeAll(async () => harness.start());
  12  |   test.afterAll(async () => harness.stop());
  13  |   test.afterEach(async ({ page }) => harness.destroy(page));
  14  |   test.beforeEach(async ({ page }) => {
  15  |     await page.setViewportSize({ width: 960, height: 1100 });
  16  |     await page.addInitScript(() => {
  17  |       let time = 1000, id = 0, seed = 731;
  18  |       const frames = new Map<number, FrameRequestCallback>();
  19  |       Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  20  |       performance.now = () => time;
  21  |       window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
  22  |       window.cancelAnimationFrame = key => frames.delete(key);
  23  |       (window as any).faceStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
  24  |     });
  25  |   });
  26  |   async function snapshot(page: any) { return page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot()); }
  27  |   function frozen(a: any, b: any) {
  28  |     for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'gazeYaw', 'gazePitch']) expect(b[key], key).toEqual(a[key]);
  29  |   }
  30  |   async function imagePixels(page: any, save: boolean) {
  31  |     return page.locator('[data-raptor-canvas]').evaluate((canvas: any, save: boolean) => {
  32  |       const w = window as any, copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
  33  |       const ctx = copy.getContext('2d')!; ctx.drawImage(canvas, 0, 0); const pixels = ctx.getImageData(0, 0, copy.width, copy.height).data;
  34  |       if (save) { w.facePixels = pixels; return 0; }
  35  |       let changed = 0; for (let i = 0; i < pixels.length; i += 4) if (Math.abs(pixels[i] - w.facePixels[i]) + Math.abs(pixels[i + 1] - w.facePixels[i + 1]) + Math.abs(pixels[i + 2] - w.facePixels[i + 2]) > 15) changed++;
  36  |       return changed;
  37  |     }, save);
  38  |   }
  39  |   for (const model of [
  40  |     { species: 'peregrine', quality: 'low' }, { species: 'peregrine', quality: 'high' },
  41  |     { species: 'osprey', quality: 'low' }, { species: 'osprey', quality: 'high' }
  42  |   ]) {
  43  |     test(`renders attached field marks at multiple angles: ${model.species} ${model.quality}`, async ({ page }) => {
  44  |       const errors: string[] = [], label = model.species + '-' + model.quality;
  45  |       page.on('pageerror', error => errors.push(error.message));
  46  |       page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  47  |       await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'open', selectedSpecies: model.species,
  48  |         flightSession: { speciesId: model.species, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: model.quality
  49  |       } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  50  |       await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  51  |         c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
  52  |         for (let i = 0; i < 8; i++) (window as any).faceStep(25);
  53  |       });
  54  |       const structure = await page.evaluate(() => {
  55  |         const w = window as any, rig = w.faceScene.getObjectByName('raptor-head-rig'), head = rig.getObjectByName('raptor-head'), eye = rig.getObjectByName('left-eye');
  56  |         w.faceHead = head; w.faceMaterial = head.material;
  57  |         return { vertices: head.geometry.attributes.position.count, finite: [head.geometry.attributes.position, head.geometry.attributes.normal, head.geometry.attributes.uv].every(attr => Array.from(attr.array).every(Number.isFinite)),
  58  |           kind: head.material.userData.faceMarkingKind, compiled: !!head.material.userData.faceMarkingsCompiled,
  59  |           eye: eye.material.color.clone().convertLinearToSRGB().getHex(), eyeVertices: eye.geometry.attributes.position.count,
  60  |           surroundVertices: rig.getObjectByName('raptor-eye-surrounds').geometry.attributes.position.count,
  61  |           meshCount: rig.children.filter(part => part.isMesh).length, boxes: rig.children.filter(part => part.geometry?.type === 'BoxGeometry').length,
  62  |           positionVersion: head.geometry.attributes.position.version, texture: head.material.map.uuid };
  63  |       });
  64  |       expect(structure.finite).toBe(true); expect(structure.compiled).toBe(true);
  65  |       expect(structure.vertices).toBe(model.quality === 'low' ? 165 : 425);
  66  |       expect(structure.eyeVertices).toBe(193); expect(structure.surroundVertices).toBe(198);
  67  |       expect(structure.kind).toBe(model.species === 'peregrine' ? 'malar-stripe' : 'eye-stripe');
  68  |       expect(structure.meshCount).toBe(model.species === 'peregrine' ? 9 : 8); expect(structure.boxes).toBe(0);
  69  |       expect(structure.eye).toBe(model.species === 'peregrine' ? 0x38291f : 0xcb9229);
  70  |       const flying = await snapshot(page);
  71  |       await page.locator('[data-raptor-study-button]').click();
  72  |       await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
  73  |       await expect(page.locator('.rh-study-panel h4')).toHaveText('Which markings help identify this bird?');
  74  |       await expect(page.locator('#rh-study-observation-copy')).toContainText(model.species === 'peregrine' ? 'moustache' : 'white head');
  75  |       await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-portrait.png' });
  76  |       frozen(flying, await snapshot(page));
  77  |       for (const view of ['front', 'side']) {
  78  |         await page.locator('[data-study-view=' + view + ']').click();
  79  |         await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-' + view + '.png' });
  80  |         await imagePixels(page, true);
  81  |         await page.evaluate(() => {
  82  |           const w = window as any, plain = w.faceMaterial.clone(); plain.onBeforeCompile = () => {}; plain.customProgramCacheKey = () => 'plain-face-control'; w.facePlain = plain; w.faceHead.material = plain;
  83  |         });
  84  |         await page.locator('[data-study-view=' + view + ']').click();
  85  |         expect(await imagePixels(page, false)).toBeGreaterThan(300);
  86  |         await page.evaluate(() => { const w = window as any; w.faceHead.material = w.faceMaterial; w.facePlain.dispose(); });
  87  |         await page.locator('[data-study-view=' + view + ']').click();
  88  |       }
  89  |       const renders = await page.evaluate(() => (window as any).faceRenders);
  90  |       await page.evaluate(() => (window as any).faceStep(60000));
  91  |       expect(await page.evaluate(() => (window as any).faceRenders)).toBe(renders); frozen(flying, await snapshot(page));
  92  |       await page.getByRole('button', { name: 'Keep moment', exact: true }).click();
  93  |       await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled();
  94  |       const saved = await page.evaluate(() => (window as any).__toolData.raptorHunt.flightStudyMoments[0]);
  95  |       expect(saved.view.focus).toBe('head'); expect(saved.view.preset).toBe('side'); expect(saved.image).toMatch(/^data:image\/jpeg;base64,/);
  96  |       if (model.species === 'osprey' && model.quality === 'low') {
  97  |         await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 1000 });
  98  |         await page.emulateMedia({ reducedMotion: 'reduce' });
  99  |         await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
  100 |         await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
  101 |         await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-phone.png' });
  102 |         expect(await page.locator('.rh-study-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  103 |       }
  104 |       await page.getByRole('button', { name: 'Close study', exact: true }).click();
  105 |       const restored = await snapshot(page); expect(restored.cameraPosition).toEqual(flying.cameraPosition);
> 106 |       expect(restored.cameraQuaternion).toEqual(flying.cameraQuaternion);
      |                                         ^ Error: expect(received).toEqual(expected) // deep equality
  107 |       const current = await page.evaluate(() => { const w = window as any; return { version: w.faceHead.geometry.attributes.position.version, texture: w.faceHead.material.map.uuid, material: w.faceHead.material === w.faceMaterial }; });
  108 |       expect(current).toEqual({ version: structure.positionVersion, texture: structure.texture, material: true });
  109 |       expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  110 |     });
  111 |   }
  112 | });
  113 | 
```