# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: raptor-study-anatomy.spec.ts >> Raptor anatomy close-ups >> frames real anatomy without changing the pose or materials and restores flight exactly
- Location: tests\e2e\raptor-study-anatomy.spec.ts:87:7

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 545
Received:   552.2838209961131
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { readFileSync } from 'node:fs';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | 
  5   | test.use({ video: 'off' });
  6   | const output = 'reports/raptor-3d-anatomy-2026-09-27';
  7   | const probes = `window.AlloPostFXEnabled=false;window.anatomyRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original(options),render=r.render.bind(r);r.render=function(scene,camera){window.anatomyScene=scene;window.anatomyCamera=camera;if(window.anatomySkipRender)return;window.anatomyRenders++;return render(scene,camera);};return r;};})();`;
  8   | const objects = { wing: 'raptor-left-wing', tail: 'fan-tail-silhouette', head: 'raptor-head-rig', feet: 'raptor-feet' };
  9   | 
  10  | test.describe('Raptor anatomy close-ups', () => {
  11  |   test.describe.configure({ mode: 'serial', timeout: 180000 });
  12  |   const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 880, height: 680, appStyles: true, probes });
  13  |   test.beforeAll(async () => harness.start());
  14  |   test.afterAll(async () => harness.stop());
  15  |   test.afterEach(async ({ page }) => harness.destroy(page));
  16  |   test.beforeEach(async ({ page }) => {
  17  |     await page.setViewportSize({ width: 960, height: 1100 });
  18  |     await page.addInitScript(() => {
  19  |       let time = 1000, id = 0, seed = 731;
  20  |       const frames = new Map<number, FrameRequestCallback>();
  21  |       Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  22  |       performance.now = () => time;
  23  |       window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
  24  |       window.cancelAnimationFrame = key => frames.delete(key);
  25  |       (window as any).anatomyStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
  26  |     });
  27  |   });
  28  |   async function mount(page: any, species = 'peregrine', mission = 'highStoop') {
  29  |     await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: mission, selectedSpecies: species,
  30  |       flightSession: { speciesId: species, missionId: mission }, huntTutorialDismissed: true, graphicsQuality: 'low',
  31  |       activeInvestigation: 'speed', investigations: { speed: { prediction: 'The wing and tail shapes may change during a dive.' } }
  32  |     } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  33  |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  34  |       c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
  35  |       for (let i = 0; i < 8; i++) (window as any).anatomyStep(25);
  36  |     });
  37  |   }
  38  |   async function snapshot(page: any) {
  39  |     return page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  40  |       const w = window as any, parts: any[] = [];
  41  |       w.anatomyScene.getObjectByName('raptor-head-rig').parent.traverse((part: any) => {
  42  |         if (part.isMesh) parts.push({ name: part.name, position: part.position.toArray(), rotation: part.rotation.toArray(), scale: part.scale.toArray(),
  43  |           morphs: part.morphTargetInfluences, color: part.material.color?.getHex(), version: part.geometry.attributes.position.version });
  44  |       });
  45  |       return { ...c._rhSnapshot(), parts };
  46  |     });
  47  |   }
  48  |   async function state(page: any) { return page.evaluate(() => (window as any).__toolData.raptorHunt); }
  49  |   function frozen(before: any, after: any) {
  50  |     for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'parts']) expect(after[key], key).toEqual(before[key]);
  51  |   }
  52  |   async function bounds(page: any, object: string) {
  53  |     return page.evaluate(name => {
  54  |       const w = window as any, T = w.THREE, camera = w.anatomyCamera, points: any[] = [];
  55  |       const root = w.anatomyScene.getObjectByName(name); root.updateWorldMatrix(true, true);
  56  |       root.traverseVisible((mesh: any) => {
  57  |         if (!mesh.isMesh) return;
  58  |         const p = mesh.geometry.attributes.position, targets = mesh.geometry.morphAttributes.position || [];
  59  |         for (let i = 0; i < p.count; i++) {
  60  |           const base = new T.Vector3().fromBufferAttribute(p, i), vertex = base.clone();
  61  |           targets.forEach((target: any, j: number) => {
  62  |             const delta = new T.Vector3().fromBufferAttribute(target, i);
  63  |             if (!mesh.geometry.morphTargetsRelative) delta.sub(base);
  64  |             vertex.addScaledVector(delta, mesh.morphTargetInfluences[j]);
  65  |           });
  66  |           points.push(vertex.applyMatrix4(mesh.matrixWorld).project(camera));
  67  |         }
  68  |       });
  69  |       const stage = document.querySelector('[data-raptor-flight-stage]')!.getBoundingClientRect();
  70  |       const panel = document.querySelector('.rh-study-panel')!.getBoundingClientRect();
  71  |       const header = document.querySelector('.rh-study-header')!.getBoundingClientRect();
  72  |       const left = (Math.min(...points.map(p => p.x)) + 1) * stage.width / 2, right = (Math.max(...points.map(p => p.x)) + 1) * stage.width / 2;
  73  |       return { left, right, width: right - left, stageWidth: stage.width, top: (1 - Math.max(...points.map(p => p.y))) * stage.height / 2,
  74  |         bottom: (1 - Math.min(...points.map(p => p.y))) * stage.height / 2, panelTop: panel.top - stage.top, headerBottom: header.bottom - stage.top };
  75  |     }, object);
  76  |   }
  77  |   async function keep(page: any) { await page.getByRole('button', { name: 'Keep moment', exact: true }).click(); await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled(); }
  78  |   async function advance(page: any) {
  79  |     await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
  80  |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  81  |       const w = window as any; c._rhCommand('assist'); c._rhCommand('hold', { key: 'shift', pressed: true });
  82  |       w.anatomySkipRender = true; for (let i = 0; i < 60; i++) w.anatomyStep(50);
  83  |       w.anatomySkipRender = false; w.anatomyStep(25);
  84  |     });
  85  |   }
  86  | 
  87  |   test('frames real anatomy without changing the pose or materials and restores flight exactly', async ({ page }) => {
  88  |     await mount(page);
  89  |     const flying = await snapshot(page);
  90  |     await page.locator('[data-raptor-study-button]').click();
  91  |     await expect(page.locator('.rh-study-region')).toBeHidden();
  92  |     const wholeHead = await bounds(page, objects.head);
  93  |     for (const [region, object] of Object.entries(objects)) {
  94  |       await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption(region);
  95  |       await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/peregrine-' + region + '.png' });
  96  |       const fit = await bounds(page, object);
  97  |       expect(fit.left).toBeGreaterThan(8); expect(fit.right).toBeLessThan(fit.stageWidth - 8);
> 98  |       expect(fit.top).toBeGreaterThan(fit.headerBottom); expect(fit.bottom).toBeLessThan(fit.panelTop - 8);
      |                                                                             ^ Error: expect(received).toBeLessThan(expected)
  99  |       expect(fit.width).toBeGreaterThan(90);
  100 |       if (region === 'head') expect(fit.width).toBeGreaterThan(wholeHead.width * 2);
  101 |       await expect(page.locator('.rh-study-focus-frame')).toBeVisible();
  102 |       await expect(page.locator('.rh-study-region')).toBeVisible();
  103 |       frozen(flying, await snapshot(page));
  104 |     }
  105 |     await keep(page);
  106 |     const feetView = (await state(page)).flightStudyMoments[0].view;
  107 |     expect(feetView.focus).toBe('feet'); expect(feetView.elevation).toBeLessThan(0);
  108 |     const feetCamera = (await snapshot(page)).cameraPosition;
  109 |     await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
  110 |     await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
  111 |     await expect(page.getByRole('combobox', { name: 'Inspect', exact: true })).toHaveValue('feet');
  112 |     expect((await snapshot(page)).cameraPosition).toEqual(feetCamera);
  113 |     await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
  114 |     const frame = await page.locator('.rh-study-focus-frame path').last().getAttribute('d');
  115 |     await page.locator('[data-raptor-canvas]').focus(); await page.keyboard.press('ArrowLeft');
  116 |     expect(await page.locator('.rh-study-focus-frame path').last().getAttribute('d')).not.toBe(frame);
  117 |     const renders = await page.evaluate(() => (window as any).anatomyRenders);
  118 |     await page.evaluate(() => (window as any).anatomyStep(60000));
  119 |     expect(await page.evaluate(() => (window as any).anatomyRenders)).toBe(renders);
  120 |     await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('whole');
  121 |     await expect(page.locator('.rh-study-focus-frame')).toBeHidden(); await expect(page.locator('.rh-study-region')).toBeHidden();
  122 |     await page.getByRole('button', { name: 'Close study', exact: true }).click();
  123 |     const restored = await snapshot(page); frozen(flying, restored);
  124 |     expect(restored.cameraPosition).toEqual(flying.cameraPosition); expect(restored.cameraQuaternion).toEqual(flying.cameraQuaternion);
  125 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  126 |   });
  127 | 
  128 |   test('inspects folded owl anatomy, fits phones and short fullscreen, and cleans up on restart', async ({ page }) => {
  129 |     // Several real-WebGL captures, axe, fullscreen changes, and a second scene can
  130 |     // exceed three minutes on a busy SwiftShader host; action/assertion limits stay bounded.
  131 |     test.setTimeout(300000);
  132 |     await mount(page, 'greatHorned', 'open');
  133 |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => { c._rhCommand('perchPractice'); for (let i = 0; i < 40; i++) (window as any).anatomyStep(25); });
  134 |     await page.locator('[data-raptor-study-button]').click();
  135 |     const perched = await snapshot(page); expect(perched.footExtension).toBeGreaterThan(0.95);
  136 |     for (const region of ['wing', 'feet', 'head'] as const) {
  137 |       await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption(region);
  138 |       await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-' + region + '.png' });
  139 |       const fit = await bounds(page, objects[region]);
  140 |       expect(fit.width).toBeGreaterThan(120); expect(fit.top).toBeGreaterThan(fit.headerBottom); expect(fit.bottom).toBeLessThan(fit.panelTop - 8);
  141 |       frozen(perched, await snapshot(page));
  142 |     }
  143 |     await expect(page.locator('#rh-study-observation-copy')).toContainText('not ears');
  144 |     await page.addStyleTag({ content: '#wrap{width:420px}' }); await page.setViewportSize({ width: 420, height: 1000 });
  145 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  146 |     await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
  147 |     await page.locator('[data-study-view=front]').click();
  148 |     await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-head-phone.png' });
  149 |     const phone = await bounds(page, objects.head);
  150 |     expect(phone.left).toBeGreaterThan(8); expect(phone.right).toBeLessThan(phone.stageWidth - 8); expect(phone.width).toBeGreaterThan(110);
  151 |     expect(phone.top).toBeGreaterThan(phone.headerBottom); expect(phone.bottom).toBeLessThan(phone.panelTop - 8);
  152 |     const select = page.getByRole('combobox', { name: 'Inspect', exact: true });
  153 |     expect(await select.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  154 |     await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  155 |     expect(await page.evaluate(async () => (await (window as any).axe.run({ include: ['.rh-study-header', '.rh-study-panel'] }, {
  156 |       runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
  157 |     })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })))).toEqual([]);
  158 |     await page.emulateMedia({ forcedColors: 'active' });
  159 |     const colors = await select.evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]); expect(colors[0]).not.toBe(colors[1]);
  160 |     await page.emulateMedia({ forcedColors: 'none' });
  161 |     await page.setViewportSize({ width: 960, height: 560 });
  162 |     await page.getByRole('button', { name: 'Toggle fullscreen flight view', exact: true }).click();
  163 |     await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  164 |     await select.selectOption('feet');
  165 |     await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-feet-fullscreen.png' });
  166 |     const fullscreen = await bounds(page, objects.feet);
  167 |     expect(fullscreen.top).toBeGreaterThan(fullscreen.headerBottom); expect(fullscreen.bottom).toBeLessThan(fullscreen.panelTop - 8);
  168 |     await page.evaluate(() => document.exitFullscreen());
  169 |     await page.getByRole('button', { name: 'Restart this flight', exact: true }).click();
  170 |     await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
  171 |     await expect(page.locator('.rh-study-focus-frame')).toHaveCount(1); await expect(page.locator('.rh-study-focus-frame')).toBeHidden();
  172 |     await page.locator('[data-raptor-study-button]').click(); await expect(select).toHaveValue('whole');
  173 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  174 |   });
  175 | 
  176 |   test('keeps inspection context through comparison, matching, notebook transfer, export, and restoration', async ({ page }) => {
  177 |     await mount(page);
  178 |     await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('tail'); await keep(page);
  179 |     const first = (await state(page)).flightStudyMoments[0];
  180 |     expect(first.view.focus).toBe('tail'); expect(first.focusLabel).toBe('Tail feathers'); expect(first.image).toMatch(/^data:image\/jpeg;base64,/);
  181 |     await advance(page);
  182 |     await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('wing'); await keep(page);
  183 |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  184 |     await expect(page.locator('[data-study-camera-comparison]')).toContainText('different regions');
  185 |     await expect(page.locator('[data-study-moment=A] img')).toHaveAttribute('alt', /Tail feathers/);
  186 |     await page.locator('[data-study-moment=A] textarea').fill('The tail feathers overlap. I will compare their spread after a dive.');
  187 |     await page.locator('[data-study-moment=A]').getByRole('button', { name: 'Add to notebook', exact: true }).click();
  188 |     expect((await state(page)).investigations.speed.evidence[0].reading.view.focus).toBe('tail');
  189 |     await page.getByRole('button', { name: 'Remove moment B', exact: true }).click();
  190 |     await page.locator('[data-raptor-study-button]').click();
  191 |     const before = await snapshot(page);
  192 |     await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
  193 |     frozen(before, await snapshot(page)); await expect(page.getByRole('combobox', { name: 'Inspect', exact: true })).toHaveValue('tail');
  194 |     await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'true'); await keep(page);
  195 |     const second = (await state(page)).flightStudyMoments[1]; expect(second.view).toEqual(first.view); expect(second.image).not.toBe(first.image);
  196 |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  197 |     await expect(page.locator('[data-study-camera-comparison]')).toContainText('inspected region match');
  198 |     await page.locator('[data-study-moment=B] textarea').fill('The tail is narrower during this dive. A matched view helps me compare its outline.');
```