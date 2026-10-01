# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: raptor-talons.spec.ts >> Raptor curved toes and talons >> preserves curved, mirrored feet through perching and takeoff: osprey
- Location: tests\e2e\raptor-talons.spec.ts:39:9

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { GlHarness } from './helpers/stem_gl_harness';
  3   | 
  4   | test.use({ video: 'off' });
  5   | const output = 'reports/raptor-talons-2026-09-27';
  6   | const probes = `window.AlloPostFXEnabled=false;window.talonRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);r.render=function(scene,camera){window.talonScene=scene;window.talonCamera=camera;window.talonRenderer=r;if(window.talonSkipRender)return;window.talonRenders++;return render(scene,camera);};return r;};})();`;
  7   | 
  8   | test.describe('Raptor curved toes and talons', () => {
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
  23  |       (window as any).talonStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
  24  |     });
  25  |   });
  26  |   async function snapshot(page: any) { return page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot()); }
  27  |   function frozen(a: any, b: any) {
  28  |     for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'footExtension']) expect(b[key], key).toEqual(a[key]);
  29  |   }
  30  |   async function studyFeet(page: any) {
  31  |     await page.locator('[data-raptor-study-button]').click();
  32  |     await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('feet');
  33  |   }
  34  |   for (const model of [
  35  |     { species: 'peregrine', quality: 'low', forward: 3, prompt: 'rear toe, called the hallux' },
  36  |     { species: 'osprey', quality: 'high', forward: 2, prompt: 'outer toe can reverse' },
  37  |     { species: 'greatHorned', quality: 'low', forward: 2, prompt: 'outer toe can move' }
  38  |   ]) {
  39  |     test(`preserves curved, mirrored feet through perching and takeoff: ${model.species}`, async ({ page }) => {
  40  |       const errors: string[] = [], label = model.species + '-' + model.quality;
  41  |       page.on('pageerror', error => errors.push(error.message));
  42  |       page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  43  |       await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'open', selectedSpecies: model.species,
  44  |         flightSession: { speciesId: model.species, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: model.quality
  45  |       } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  46  |       await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  47  |         c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
  48  |         for (let i = 0; i < 8; i++) (window as any).talonStep(25);
  49  |       });
  50  |       const geometry = await page.evaluate(() => {
  51  |         const w = window as any, root = w.talonScene.getObjectByName('raptor-feet');
  52  |         const left = root.getObjectByName('left-raptor-foot'), right = root.getObjectByName('right-raptor-foot');
  53  |         let mirrorError = 0, minNormal = 1;
  54  |         for (const [p, q] of [[left.geometry.attributes.position, right.geometry.attributes.position], [left.geometry.morphAttributes.position[0], right.geometry.morphAttributes.position[0]], [left.geometry.attributes.normal, right.geometry.attributes.normal], [left.geometry.morphAttributes.normal[0], right.geometry.morphAttributes.normal[0]]]) {
  55  |           for (let i = 0; i < p.count; i++) mirrorError = Math.max(mirrorError, Math.abs(p.getX(i) + q.getX(i)), Math.abs(p.getY(i) - q.getY(i)), Math.abs(p.getZ(i) - q.getZ(i)));
  56  |         }
  57  |         for (const p of [right.geometry.attributes.normal, right.geometry.morphAttributes.normal[0]]) for (let i = 0; i < p.count; i++) minNormal = Math.min(minNormal, Math.hypot(p.getX(i), p.getY(i), p.getZ(i)));
  58  |         const surface = right.geometry.attributes.rhFootSurface;
  59  |         const vertices = right.geometry.attributes.position.count, sections = vertices === 738 ? 8 : 12, rings = vertices === 738 ? 10 : 13, stride = sections * rings + 2;
  60  |         const p = right.geometry.morphAttributes.position[0], centers: any[] = [], tipEnds: any[] = [];
  61  |         for (let part = 0; part < 9; part++) {
  62  |           const path: any[] = [];
  63  |           for (let ring = 0; ring < rings; ring++) {
  64  |             const center = new w.THREE.Vector3();
  65  |             for (let j = 0; j < sections; j++) center.add(new w.THREE.Vector3().fromBufferAttribute(p, part * stride + ring * sections + j));
  66  |             center.divideScalar(sections); path.push(center);
  67  |           }
  68  |           if (part > 0 && part % 2 === 0) { centers.push(path); tipEnds.push(path[path.length - 1].toArray()); }
  69  |         }
  70  |         let maxBend = 0;
  71  |         centers.forEach(path => { for (let i = 1; i < path.length - 1; i++) maxBend = Math.max(maxBend, path[i].clone().sub(path[i - 1]).angleTo(path[i + 1].clone().sub(path[i]))); });
  72  |         return { vertices, mirrorError, minNormal, maxBend, tipEnds,
  73  |           forward: tipEnds.filter(p => p[2] > 0.12).length, rear: tipEnds.filter(p => p[2] < 0.12).length,
  74  |           finite: [left, right].every(mesh => [mesh.geometry.attributes.position, mesh.geometry.attributes.normal, mesh.geometry.attributes.rhFootSurface, mesh.geometry.morphAttributes.position[0], mesh.geometry.morphAttributes.normal[0]].every(attr => Array.from(attr.array).every(Number.isFinite))),
  75  |           meshCount: root.children.length, sharedMaterial: left.material === right.material, compiled: !!right.material.userData.footDetailCompiled,
  76  |           surfaceKinds: [...new Set(Array.from({ length: surface.count }, (_, i) => surface.getZ(i)))],
  77  |           versions: [right.geometry.attributes.position.version, right.geometry.morphAttributes.position[0].version] };
  78  |       });
  79  |       expect(geometry.vertices).toBe(model.quality === 'low' ? 738 : 1422);
  80  |       expect(geometry.finite).toBe(true); expect(geometry.minNormal).toBeGreaterThan(0.999);
  81  |       expect(geometry.mirrorError).toBeLessThan(0.000001); expect(geometry.maxBend).toBeLessThan(0.7);
  82  |       expect(geometry.forward).toBe(model.forward); expect(geometry.rear).toBe(4 - model.forward);
  83  |       expect(geometry.meshCount).toBe(2); expect(geometry.sharedMaterial).toBe(true); expect(geometry.compiled).toBe(true);
  84  |       expect(geometry.surfaceKinds.sort()).toEqual(model.species === 'greatHorned' ? [-1, 2] : [0, 1, 2]);
  85  |       const flying = await snapshot(page); expect(flying.footExtension).toBeLessThan(0.01);
  86  |       await studyFeet(page); await expect(page.locator('#rh-study-observation-copy')).toContainText(model.prompt);
  87  |       await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-tucked.png' });
  88  |       frozen(flying, await snapshot(page));
  89  |       const renders = await page.evaluate(() => (window as any).talonRenders);
  90  |       await page.evaluate(() => (window as any).talonStep(60000));
  91  |       expect(await page.evaluate(() => (window as any).talonRenders)).toBe(renders);
  92  |       await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
  93  |       await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  94  |         const w = window as any; c._rhCommand('perchPractice'); w.talonSkipRender = true;
  95  |         for (let i = 0; i < 45; i++) w.talonStep(25); w.talonSkipRender = false; w.talonStep(25);
  96  |       });
  97  |       const resting = await snapshot(page);
> 98  |       expect(resting.landed).toBe(true); expect(resting.footExtension).toBeGreaterThan(0.999);
      |                              ^ Error: expect(received).toBe(expected) // Object.is equality
  99  |       expect(resting.footSurfaceClearance).toBeGreaterThanOrEqual(0); expect(resting.footSurfaceClearance).toBeLessThan(0.012);
  100 |       await studyFeet(page); await expect(page.locator('#rh-study-observation-copy')).toContainText(model.prompt);
  101 |       await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-extended.png' });
  102 |       frozen(resting, await snapshot(page));
  103 |       // A same-camera render with the original plain foot material must visibly
  104 |       // differ from the new surface: this catches shader hooks that never render.
  105 |       const pixels = await page.evaluate(() => {
  106 |         const w = window as any, renderer = w.talonRenderer, scene = w.talonScene, camera = w.talonCamera, feet = scene.getObjectByName('raptor-feet').children;
  107 |         const root = feet[0].parent.parent, T = w.THREE, preview = new T.Scene(); preview.background = new T.Color(0x102630);
  108 |         preview.add(new T.HemisphereLight(0xdceeff, 0x4b4936, 1.1)); const key = new T.DirectionalLight(0xffe7bb, 1.6); key.position.set(1, 3, 3); preview.add(key);
  109 |         const copy = feet[1].clone(); copy.position.set(0, 0, 0); copy.scale.setScalar(1); copy.quaternion.identity(); preview.add(copy);
  110 |         const focus = new T.PerspectiveCamera(30, renderer.domElement.width / renderer.domElement.height, 0.01, 10);
  111 |         focus.position.set(0.38, 0.06, 0.60); focus.lookAt(0, -0.27, 0.15);
  112 |         const gl = renderer.getContext(), width = renderer.domElement.width, height = renderer.domElement.height;
  113 |         const a = new Uint8Array(width * height * 4), b = new Uint8Array(a.length);
  114 |         renderer.render(preview, focus); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, a);
  115 |         const original = copy.material, plain = original.clone(); plain.onBeforeCompile = () => {}; plain.customProgramCacheKey = () => 'plain-foot-comparison'; copy.material = plain;
  116 |         renderer.render(preview, focus); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, b); plain.dispose();
  117 |         let changed = 0; for (let i = 0; i < a.length; i += 4) if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 2) changed++;
  118 |         // Return to the app's paused rendering path to restore the studio exactly.
  119 |         document.querySelector('[data-study-view=above]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  120 |         return { changed, total: width * height };
  121 |       });
  122 |       expect(pixels.changed).toBeGreaterThan(pixels.total * 0.0002);
  123 |       if (model.species === 'greatHorned') {
  124 |         await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 1000 });
  125 |         await page.emulateMedia({ reducedMotion: 'reduce' });
  126 |         await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
  127 |         await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-phone.png' });
  128 |         expect(await page.locator('.rh-study-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  129 |       }
  130 |       await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
  131 |       const takeoff = await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  132 |         const w = window as any; c._rhCommand('hold', { key: ' ', pressed: true }); w.talonSkipRender = true;
  133 |         for (let i = 0; i < 35; i++) w.talonStep(25); c._rhCommand('hold', { key: ' ', pressed: false }); w.talonSkipRender = false; w.talonStep(25);
  134 |         const foot = w.talonScene.getObjectByName('right-raptor-foot');
  135 |         return { state: c._rhSnapshot(), versions: [foot.geometry.attributes.position.version, foot.geometry.morphAttributes.position[0].version], vertices: foot.geometry.attributes.position.count };
  136 |       });
  137 |       expect(takeoff.state.landed).toBe(false); expect(takeoff.state.footExtension).toBeLessThan(0.003);
  138 |       expect(takeoff.versions).toEqual(geometry.versions); expect(takeoff.vertices).toBe(geometry.vertices);
  139 |       expect(takeoff.state.drawCalls).toBeLessThan(170); expect(errors).toEqual([]);
  140 |       expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  141 |     });
  142 |   }
  143 | });
  144 | 
```