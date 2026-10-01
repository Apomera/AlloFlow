# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: raptor-feather-depth.spec.ts >> Raptor layered feather depth >> renders layered wings and folds them without extra draws: peregrine
- Location: tests\e2e\raptor-feather-depth.spec.ts:46:9

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 40
Received:   0
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { GlHarness } from './helpers/stem_gl_harness';
  3   | 
  4   | test.use({ video: 'off' });
  5   | const output = 'reports/raptor-feather-depth-2026-09-27';
  6   | const probes = `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.featherRenderer=r;r.render=function(scene,camera){window.featherScene=scene;if(window.featherSkipRender)return;return render(scene,camera);};return r;};})();`;
  7   | 
  8   | test.describe('Raptor layered feather depth', () => {
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
  23  |       (window as any).featherStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
  24  |     });
  25  |   });
  26  |   async function snapshot(page: any) { return page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot()); }
  27  |   function frozen(a: any, b: any) {
  28  |     for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina']) expect(b[key], key).toEqual(a[key]);
  29  |   }
  30  |   async function comparePixels(page: any, save: boolean) {
  31  |     return page.locator('[data-raptor-canvas]').evaluate((canvas: any, save: boolean) => {
  32  |       const w = window as any, copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
  33  |       const ctx = copy.getContext('2d')!; ctx.drawImage(canvas, 0, 0);
  34  |       const pixels = ctx.getImageData(0, 0, copy.width, copy.height).data;
  35  |       if (save) { w.featherPixels = pixels; return 0; }
  36  |       let changed = 0;
  37  |       for (let i = 0; i < pixels.length; i += 4) {
  38  |         const difference = Math.abs(pixels[i] - w.featherPixels[i]) + Math.abs(pixels[i + 1] - w.featherPixels[i + 1]) + Math.abs(pixels[i + 2] - w.featherPixels[i + 2]);
  39  |         if (difference > 12) changed++;
  40  |       }
  41  |       return changed;
  42  |     }, save);
  43  |   }
  44  | 
  45  |   for (const model of [{ species: 'peregrine', quality: 'low' }, { species: 'redTail', quality: 'high' }, { species: 'greatHorned', quality: 'low' }]) {
  46  |     test(`renders layered wings and folds them without extra draws: ${model.species}`, async ({ page }) => {
  47  |       const errors: string[] = [];
  48  |       page.on('pageerror', error => errors.push(error.message));
  49  |       page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  50  |       await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'open', selectedSpecies: model.species,
  51  |         flightSession: { speciesId: model.species, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: model.quality
  52  |       } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  53  |       await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  54  |         c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
  55  |         for (let i = 0; i < 8; i++) (window as any).featherStep(25);
  56  |       });
  57  |       const structure = await page.evaluate(() => {
  58  |         const w = window as any, bird = w.featherScene.getObjectByName('raptor-head-rig').parent;
  59  |         w.featherVanes = [-1, 1].map(side => bird.getObjectByName('layered-flight-feathers-' + side));
  60  |         const material = w.featherVanes[0].material, tail = bird.getObjectByName('fan-tail-silhouette');
  61  |         const primary = bird.getObjectByName('left-primary-0');
  62  |         w.featherDisposals = new Set();
  63  |         [material.normalMap, material.roughnessMap].forEach(texture => texture.addEventListener('dispose', () => w.featherDisposals.add(texture.uuid)));
  64  |         return { meshes: w.featherVanes.map(mesh => ({ vertices: mesh.geometry.attributes.position.count, coverts: mesh.geometry.userData.covertFeatherCount,
  65  |           finite: [mesh.geometry.attributes.position, mesh.geometry.attributes.normal, mesh.geometry.attributes.uv, mesh.geometry.morphAttributes.position[0], mesh.geometry.morphAttributes.normal[0]].every(attr => Array.from(attr.array).every(Number.isFinite)),
  66  |           morphVertices: mesh.geometry.morphAttributes.position[0].count, version: mesh.geometry.attributes.position.version })),
  67  |           normalName: material.normalMap.name, roughName: material.roughnessMap.name, linear: material.normalMap.encoding === w.THREE.LinearEncoding && material.roughnessMap.encoding === w.THREE.LinearEncoding,
  68  |           shared: tail.material.normalMap === material.normalMap && tail.material.roughnessMap === material.roughnessMap && (!primary || primary.material.normalMap === material.normalMap),
  69  |           repeat: material.normalMap.repeat.toArray(), mapSize: [material.normalMap.image.width, material.normalMap.image.height],
  70  |           wingMeshes: bird.getObjectByName('raptor-left-wing').children.length + bird.getObjectByName('raptor-right-wing').children.length };
  71  |       });
  72  |       expect(structure.normalName).toBe('raptor-vane-relief'); expect(structure.roughName).toBe('raptor-vane-roughness'); expect(structure.linear).toBe(true);
  73  |       expect(structure.shared).toBe(true); expect(structure.repeat).toEqual([1, 1]); expect(structure.mapSize).toEqual([256, 512]);
  74  |       structure.meshes.forEach(mesh => { expect(mesh.finite).toBe(true); expect(mesh.coverts).toBeGreaterThanOrEqual(28); expect(mesh.vertices).toBeLessThan(1700); expect(mesh.morphVertices).toBe(mesh.vertices); });
  75  |       const flying = await snapshot(page);
  76  |       expect(structure.wingMeshes).toBe(4 + flying.leftPrimaryFeatherCount + flying.rightPrimaryFeatherCount);
  77  |       await page.locator('[data-raptor-study-button]').click();
  78  |       await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('wing');
  79  |       await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + model.species + '-wing.png' });
  80  |       const enhanced = await snapshot(page); frozen(flying, enhanced);
  81  |       await comparePixels(page, true);
  82  |       // Draw the same frozen camera with just the pre-existing long feathers.
  83  |       await page.evaluate(() => (window as any).featherVanes.forEach(mesh => mesh.geometry.setDrawRange(0, mesh.geometry.userData.flightFeatherIndexCount)));
  84  |       await page.locator('[data-study-view=above]').click();
  85  |       const plain = await snapshot(page); frozen(enhanced, plain);
  86  |       expect(plain.drawCalls).toBe(enhanced.drawCalls); expect(await comparePixels(page, false)).toBeGreaterThan(500);
  87  |       await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + model.species + '-single-layer-control.png' });
  88  |       await page.evaluate(() => (window as any).featherVanes.forEach(mesh => mesh.geometry.setDrawRange(0, Infinity)));
  89  |       await page.locator('[data-study-view=above]').click();
  90  |       if (model.species === 'peregrine') {
  91  |         await comparePixels(page, true);
  92  |         await page.evaluate(() => (window as any).featherVanes[0].material.normalScale.set(0, 0));
  93  |         await page.locator('[data-study-view=above]').click();
> 94  |         expect(await comparePixels(page, false)).toBeGreaterThan(40);
      |                                                  ^ Error: expect(received).toBeGreaterThan(expected)
  95  |         await page.evaluate(() => (window as any).featherVanes[0].material.normalScale.set(0.65, 0.65));
  96  |       }
  97  |       await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('whole');
  98  |       await page.locator('[data-study-view=above]').click();
  99  |       await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + model.species + '-flight.png' });
  100 |       await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
  101 |       const folded = await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  102 |         const w = window as any; c._rhCommand('perchPractice'); w.featherSkipRender = true;
  103 |         for (let i = 0; i < 45; i++) w.featherStep(25);
  104 |         w.featherSkipRender = false; w.featherStep(25);
  105 |         return { state: c._rhSnapshot(), meshes: w.featherVanes.map(mesh => ({ fold: mesh.morphTargetInfluences[0], version: mesh.geometry.attributes.position.version })) };
  106 |       });
  107 |       expect(folded.state.wingRestSpan).toBeLessThan(0.32); expect(folded.state.wingFold).toBeGreaterThan(0.999);
  108 |       folded.meshes.forEach((mesh, i) => { expect(mesh.fold).toBeGreaterThan(0.999); expect(mesh.version).toBe(structure.meshes[i].version); });
  109 |       await page.locator('[data-raptor-study-button]').click();
  110 |       await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('wing');
  111 |       if (model.species === 'greatHorned') {
  112 |         await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  113 |         await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
  114 |         await page.locator('[data-study-view=side]').click();
  115 |       }
  116 |       await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + model.species + '-folded.png' });
  117 |       await page.getByRole('button', { name: 'Habitat', exact: true }).click();
  118 |       await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + model.species + '-habitat.png' });
  119 |       expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  120 |       await page.getByRole('button', { name: 'Restart this flight', exact: true }).click();
  121 |       await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
  122 |       expect(await page.evaluate(() => (window as any).featherDisposals.size)).toBe(2);
  123 |       expect(errors).toEqual([]);
  124 |     });
  125 |   }
  126 | });
  127 | 
```