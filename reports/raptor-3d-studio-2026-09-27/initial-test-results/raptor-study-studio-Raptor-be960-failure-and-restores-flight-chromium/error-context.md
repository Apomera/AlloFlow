# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: raptor-study-studio.spec.ts >> Raptor studio presentation >> isolates the actual bird, preserves the habitat even on render failure, and restores flight
- Location: tests\e2e\raptor-study-studio.spec.ts:56:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "Controlled renderer failure"
Received: "Cannot read properties of undefined (reading 'watched')"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { readFileSync } from 'node:fs';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | 
  5   | test.use({ video: 'off' });
  6   | const output = 'reports/raptor-3d-studio-2026-09-27';
  7   | const probes = `window.AlloPostFXEnabled=false;window.studioRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original(options),render=r.render.bind(r);window.studioRenderer=r;r.render=function(scene,camera){window.studioScene=scene;window.studioCamera=camera;if(window.studioSkipRender)return;window.studioRenders++;window.lastStudioDraw={background:scene.background?.name,fog:!!scene.fog,exposure:r.toneMappingExposure,roots:scene.children.filter(c=>c.visible).map(c=>({id:c.id,name:c.name}))};if(scene.background?.name==='raptor-studio-backdrop'&&!scene.background.userData.watched){scene.background.userData.watched=true;scene.background.addEventListener('dispose',()=>window.studioDisposed=(window.studioDisposed||0)+1);}if(window.studioThrow){window.studioThrow=false;throw new Error('Controlled renderer failure');}return render(scene,camera);};return r;};})();`;
  8   | 
  9   | test.describe('Raptor studio presentation', () => {
  10  |   test.describe.configure({ mode: 'serial', timeout: 180000 });
  11  |   const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 880, height: 680, appStyles: true, probes });
  12  |   test.beforeAll(async () => harness.start());
  13  |   test.afterAll(async () => harness.stop());
  14  |   test.afterEach(async ({ page }) => harness.destroy(page));
  15  |   test.beforeEach(async ({ page }) => {
  16  |     await page.setViewportSize({ width: 960, height: 1100 });
  17  |     await page.addInitScript(() => {
  18  |       let time = 1000, id = 0, seed = 731;
  19  |       const frames = new Map<number, FrameRequestCallback>();
  20  |       Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  21  |       performance.now = () => time;
  22  |       window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
  23  |       window.cancelAnimationFrame = key => frames.delete(key);
  24  |       (window as any).studioStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
  25  |     });
  26  |   });
  27  |   async function mount(page: any, species = 'peregrine', mission = 'highStoop') {
  28  |     await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: mission, selectedSpecies: species,
  29  |       flightSession: { speciesId: species, missionId: mission }, huntTutorialDismissed: true, graphicsQuality: 'low'
  30  |     } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  31  |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  32  |       c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
  33  |       for (let i = 0; i < 8; i++) (window as any).studioStep(25);
  34  |     });
  35  |   }
  36  |   async function state(page: any) { return page.evaluate(() => (window as any).__toolData.raptorHunt); }
  37  |   async function snapshot(page: any) {
  38  |     return page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  39  |       const w = window as any, parts: any[] = [], scene = w.studioScene;
  40  |       const bird = scene.getObjectByName('raptor-head-rig').parent;
  41  |       bird.traverse((part: any) => {
  42  |         if (part.isMesh) parts.push({ name: part.name, position: part.position.toArray(), rotation: part.rotation.toArray(), scale: part.scale.toArray(),
  43  |           morphs: part.morphTargetInfluences, color: part.material.color?.getHex(), version: part.geometry.attributes.position.version });
  44  |       });
  45  |       return { ...c._rhSnapshot(), parts, birdId: bird.id, environment: {
  46  |         roots: scene.children.map((o: any) => [o.id, o.visible]), background: scene.background.uuid || scene.background.getHex(),
  47  |         fog: [scene.fog.color.getHex(), scene.fog.near, scene.fog.far], exposure: w.studioRenderer.toneMappingExposure
  48  |       }, draw: w.lastStudioDraw };
  49  |     });
  50  |   }
  51  |   function frozen(before: any, after: any) {
  52  |     for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'parts']) expect(after[key], key).toEqual(before[key]);
  53  |   }
  54  |   async function keep(page: any) { await page.getByRole('button', { name: 'Keep moment', exact: true }).click(); await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled(); }
  55  | 
  56  |   test('isolates the actual bird, preserves the habitat even on render failure, and restores flight', async ({ page }) => {
  57  |     await mount(page);
  58  |     const flying = await snapshot(page);
  59  |     await page.locator('[data-raptor-study-button]').click();
  60  |     await expect(page.getByRole('button', { name: 'Studio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  61  |     await page.locator('[data-study-view=above]').click();
  62  |     const studio = await snapshot(page); frozen(flying, studio);
  63  |     expect(studio.draw.background).toBe('raptor-studio-backdrop'); expect(studio.draw.fog).toBe(false); expect(studio.draw.exposure).toBe(1);
  64  |     expect(studio.draw.roots).toHaveLength(4); expect(studio.draw.roots.some((root: any) => root.id === studio.birdId)).toBe(true);
  65  |     expect(studio.environment.fog).toEqual(flying.environment.fog); expect(studio.environment.background).toBe(flying.environment.background);
  66  |     expect(studio.environment.exposure).toBe(flying.environment.exposure);
  67  |     await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/peregrine-studio.png' });
  68  |     await page.getByRole('button', { name: 'Habitat', exact: true }).click();
  69  |     const habitat = await snapshot(page); frozen(studio, habitat); expect(habitat.environment).toEqual(studio.environment);
  70  |     expect(habitat.cameraPosition).toEqual(studio.cameraPosition); expect(habitat.draw.fog).toBe(true); expect(habitat.draw.roots.length).toBeGreaterThan(4);
  71  |     await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/peregrine-habitat.png' });
  72  |     const failure = await page.getByRole('button', { name: 'Studio', exact: true }).evaluate((button: any) => {
  73  |       (window as any).studioThrow = true;
  74  |       try { button.onclick(); } catch (error: any) { return error.message; }
  75  |     });
> 76  |     expect(failure).toBe('Controlled renderer failure'); expect((await snapshot(page)).environment).toEqual(habitat.environment);
      |                     ^ Error: expect(received).toBe(expected) // Object.is equality
  77  |     await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
  78  |     await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/peregrine-head-studio.png' });
  79  |     const renders = await page.evaluate(() => (window as any).studioRenders);
  80  |     await page.evaluate(() => (window as any).studioStep(60000));
  81  |     expect(await page.evaluate(() => (window as any).studioRenders)).toBe(renders);
  82  |     await page.getByRole('button', { name: 'Close study', exact: true }).click();
  83  |     const returned = await snapshot(page); frozen(flying, returned);
  84  |     expect(returned.environment).toEqual(flying.environment); expect(returned.cameraPosition).toEqual(flying.cameraPosition); expect(returned.cameraQuaternion).toEqual(flying.cameraQuaternion);
  85  |     expect(returned.draw.fog).toBe(true); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  86  |   });
  87  | 
  88  |   test('records presentation, matches it, and handles legacy or invalid settings without false matches', async ({ page }) => {
  89  |     await mount(page); await page.locator('[data-raptor-study-button]').click(); await keep(page);
  90  |     const first = (await state(page)).flightStudyMoments[0];
  91  |     expect(first.view.presentation).toBe('studio'); expect(first.presentationLabel).toBe('Studio lighting'); expect(first.image).toMatch(/^data:image\/jpeg;base64,/);
  92  |     await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
  93  |     await page.evaluate(() => (window as any).studioStep(100));
  94  |     await page.locator('[data-raptor-study-button]').click();
  95  |     await page.getByRole('button', { name: 'Habitat', exact: true }).click();
  96  |     await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'false'); await keep(page);
  97  |     expect((await state(page)).flightStudyMoments[1].view.presentation).toBe('habitat');
  98  |     await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
  99  |     await expect(page.getByRole('button', { name: 'Studio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  100 |     await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'true');
  101 |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  102 |     await expect(page.locator('[data-study-camera-comparison]')).toContainText('different lighting and backgrounds');
  103 |     await expect(page.locator('[data-study-moment=A] img')).toHaveAttribute('alt', /Studio lighting/);
  104 |     await expect(page.locator('[data-study-moment=B] img')).toHaveAttribute('alt', /Habitat \+ study lighting/);
  105 |     const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download visual report', exact: true }).click();
  106 |     const download = await pending; await download.saveAs(output + '/studio-observations.html');
  107 |     const html = readFileSync((await download.path())!, 'utf8');
  108 |     expect(html).toContain(first.image); expect(html).toContain('Studio lighting'); expect(html).toContain('Habitat + study lighting'); expect(html).toContain('different lighting and backgrounds');
  109 |     await page.evaluate(() => {
  110 |       const w = window as any, moment = w.__toolData.raptorHunt.flightStudyMoments[0];
  111 |       delete moment.view.presentation; delete moment.presentationLabel;
  112 |       w.__toolData.raptorHunt.flightStudyMoments = [moment]; w.__rerender();
  113 |     });
  114 |     await page.locator('[data-raptor-study-button]').click();
  115 |     await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
  116 |     await expect(page.getByRole('button', { name: 'Habitat', exact: true })).toHaveAttribute('aria-pressed', 'true');
  117 |     await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'true');
  118 |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  119 |     await page.evaluate(() => {
  120 |       const w = window as any; w.__toolData.raptorHunt.flightStudyMoments[0].view.presentation = 'invalid'; w.__rerender();
  121 |     });
  122 |     await page.locator('[data-raptor-study-button]').click(); await expect(page.locator('.rh-study-match')).toBeHidden();
  123 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  124 |   });
  125 | 
  126 |   test('shows nocturnal owl detail on phones with accessible controls and disposes the studio on restart', async ({ page }) => {
  127 |     test.setTimeout(240000);
  128 |     await mount(page, 'greatHorned', 'open');
  129 |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  130 |       c._rhCommand('environment', { dayPhase: 0.92 }); c._rhCommand('perchPractice');
  131 |       for (let i = 0; i < 40; i++) (window as any).studioStep(25);
  132 |     });
  133 |     await page.locator('[data-raptor-study-button]').click();
  134 |     await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
  135 |     await page.locator('[data-study-view=front]').click();
  136 |     await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-studio.png' });
  137 |     await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 1000 });
  138 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  139 |     await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
  140 |     await page.locator('[data-study-view=front]').click();
  141 |     await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-studio-phone.png' });
  142 |     const controls = await page.locator('.rh-study-presentation button').evaluateAll(buttons => buttons.map(button => {
  143 |       const r = button.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height };
  144 |     }));
  145 |     controls.forEach(control => { expect(control.height).toBeGreaterThanOrEqual(44); expect(control.left).toBeGreaterThanOrEqual(0); expect(control.right).toBeLessThanOrEqual(390); });
  146 |     await page.getByRole('button', { name: 'Habitat', exact: true }).focus(); await page.keyboard.press('Enter');
  147 |     await expect(page.getByRole('button', { name: 'Habitat', exact: true })).toHaveAttribute('aria-pressed', 'true');
  148 |     await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-habitat-phone.png' });
  149 |     await page.getByRole('button', { name: 'Studio', exact: true }).click();
  150 |     await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  151 |     expect(await page.evaluate(async () => (await (window as any).axe.run({ include: ['.rh-study-header', '.rh-study-panel'] }, {
  152 |       runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
  153 |     })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })))).toEqual([]);
  154 |     await page.emulateMedia({ forcedColors: 'active' });
  155 |     const colors = await page.getByRole('button', { name: 'Studio', exact: true }).evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
  156 |     expect(colors[0]).not.toBe(colors[1]); await page.emulateMedia({ forcedColors: 'none' });
  157 |     await page.getByRole('button', { name: 'Restart this flight', exact: true }).click();
  158 |     await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
  159 |     expect(await page.evaluate(() => (window as any).studioDisposed)).toBe(1);
  160 |     await expect(page.locator('.rh-study-presentation')).toHaveCount(1);
  161 |     await page.locator('[data-raptor-study-button]').click();
  162 |     await expect(page.getByRole('button', { name: 'Studio', exact: true })).toHaveAttribute('aria-pressed', 'true');
  163 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  164 |   });
  165 | });
  166 | 
```