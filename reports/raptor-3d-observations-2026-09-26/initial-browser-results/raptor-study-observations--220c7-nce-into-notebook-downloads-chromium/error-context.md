# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: raptor-study-observations.spec.ts >> Raptor saved 3D observations >> captures real images, compares a maneuver, and transfers immutable evidence into notebook downloads
- Location: tests\e2e\raptor-study-observations.spec.ts:46:7

# Error details

```
Error: expect(received).toBeCloseTo(expected, precision)

Expected: 35.098530000000004
Received: 35.105492672508575

Expected precision:    6
Expected difference: < 0.0000005
Received difference:   0.006962672508571188
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { readFileSync } from 'node:fs';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | 
  5   | test.use({ video: 'off' });
  6   | const output = 'reports/raptor-3d-observations-2026-09-26';
  7   | const probes = `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original(options),render=r.render.bind(r);r.render=function(scene,camera){if(window.observationSkipRender)return;return render(scene,camera);};return r;};})();`;
  8   | 
  9   | test.describe('Raptor saved 3D observations', () => {
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
  24  |       (window as any).observationStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
  25  |     });
  26  |   });
  27  |   async function mount(page: any, investigation = true) {
  28  |     await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'highStoop', selectedSpecies: 'peregrine',
  29  |       flightSession: { speciesId: 'peregrine', missionId: 'highStoop' }, huntTutorialDismissed: true, graphicsQuality: 'low',
  30  |       ...(investigation ? { activeInvestigation: 'speed', investigations: { speed: { prediction: 'A dive may reduce height and increase speed.', reviewed: true } } } : {})
  31  |     } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  32  |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  33  |       c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
  34  |       for (let i = 0; i < 8; i++) (window as any).observationStep(25);
  35  |     });
  36  |   }
  37  |   async function state(page: any) { return page.evaluate(() => (window as any).__toolData.raptorHunt); }
  38  |   async function snapshot(page: any) { return page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot()); }
  39  |   async function keep(page: any) {
  40  |     await page.locator('[data-raptor-study-button]').click();
  41  |     await page.locator('[data-study-view=above]').click();
  42  |     await page.getByRole('button', { name: 'Keep moment', exact: true }).click();
  43  |     await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled();
  44  |   }
  45  | 
  46  |   test('captures real images, compares a maneuver, and transfers immutable evidence into notebook downloads', async ({ page }) => {
  47  |     await mount(page);
  48  |     const before = await snapshot(page);
  49  |     await keep(page);
  50  |     const first = (await state(page)).flightStudyMoments[0];
> 51  |     expect(first.speedMph).toBeCloseTo(before.speedMps * 2.237, 6);
      |                            ^ Error: expect(received).toBeCloseTo(expected, precision)
  52  |     expect(first.image).toMatch(/^data:image\/jpeg;base64,/);
  53  |     expect(first.image.length).toBeLessThan(160000);
  54  |     const pixels = await page.evaluate(async image => {
  55  |       const img = new Image(); img.src = image; await img.decode();
  56  |       const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
  57  |       const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0);
  58  |       const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  59  |       const colors = new Set(); let lit = 0;
  60  |       for (let i = 0; i < rgba.length; i += 4) { if (rgba[i] + rgba[i + 1] + rgba[i + 2] > 30) lit++; colors.add((rgba[i] >> 3) + ',' + (rgba[i + 1] >> 3) + ',' + (rgba[i + 2] >> 3)); }
  61  |       return { width: img.width, height: img.height, lit, colors: colors.size };
  62  |     }, first.image);
  63  |     expect(pixels.width).toBe(480); expect(pixels.height).toBe(320); expect(pixels.lit).toBeGreaterThan(30000); expect(pixels.colors).toBeGreaterThan(80);
  64  |     expect((await snapshot(page)).motionTimeMs).toBe(before.motionTimeMs);
  65  |     await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/capture-desktop.png' });
  66  |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  67  |     await expect(page.locator('#rh-flight-moments-title')).toBeFocused();
  68  |     const a = page.locator('[data-study-moment=A]');
  69  |     await a.getByRole('textbox').fill('The spread wings and tail are visible from above before the dive.');
  70  |     await a.getByRole('button', { name: 'Add to notebook', exact: true }).click();
  71  |     const copied = (await state(page)).investigations.speed.evidence[0];
  72  |     expect(copied.reading.image).toBe(first.image); expect(copied.reading.speedMph).toBe(first.speedMph);
  73  |     expect((await state(page)).investigations.speed.reviewed).toBe(false);
  74  |     await a.getByRole('textbox').fill('This later edit must not rewrite the notebook copy.');
  75  |     expect((await state(page)).investigations.speed.evidence[0]).toEqual(copied);
  76  |     await page.locator('[data-raptor-study-button]').click();
  77  |     await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled();
  78  |     expect((await state(page)).flightStudyMoments).toHaveLength(1);
  79  |     await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
  80  |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  81  |       const w = window as any; c._rhCommand('assist'); c._rhCommand('hold', { key: 'shift', pressed: true });
  82  |       w.observationSkipRender = true; for (let i = 0; i < 60; i++) w.observationStep(50);
  83  |       w.observationSkipRender = false; w.observationStep(25);
  84  |     });
  85  |     await keep(page);
  86  |     const records = (await state(page)).flightStudyMoments;
  87  |     expect(records).toHaveLength(2); expect(records[0].image).toBe(first.image);
  88  |     expect(records[1].image).not.toBe(first.image); expect(records[1].speedMph).toBeGreaterThan(first.speedMph);
  89  |     expect(records[1].viewLabel).toBe('Above'); expect(records[1].poseLabel).toBe('Diving');
  90  |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  91  |     await page.locator('[data-study-moment=B]').getByRole('textbox').fill('During the dive the wings sweep back, speed increases, and height decreases.');
  92  |     await page.locator('[data-study-moment=B]').getByRole('button', { name: 'Add to notebook', exact: true }).click();
  93  |     await expect(page.locator('[data-study-comparison]')).toHaveAttribute('data-study-comparison', 'same-flight');
  94  |     await expect(page.locator('[data-study-comparison]')).toContainText('does not establish its cause');
  95  |     await page.locator('.rh-flight-moments').screenshot({ path: output + '/comparison-desktop.png' });
  96  |     await page.locator('.rh-flight-moments').getByRole('button', { name: 'Open notebook', exact: true }).click();
  97  |     await expect(page.locator('#rh-journal-title')).toBeFocused();
  98  |     await expect(page.locator('.rh-journal-note')).toHaveCount(2);
  99  |     await expect(page.locator('.rh-journal-note img')).toHaveCount(2);
  100 |     await expect(page.locator('[data-inquiry-comparison]')).toHaveCount(0);
  101 |     const downloadPromise = page.waitForEvent('download');
  102 |     await page.getByRole('button', { name: 'Download field notes', exact: true }).click();
  103 |     const download = await downloadPromise;
  104 |     const text = readFileSync((await download.path())!, 'utf8');
  105 |     expect(text).toContain(copied.text); expect(text).toContain('Simulation snapshot: Peregrine Falcon');
  106 |     expect(text).toContain('above ground'); expect(text).toContain('Diving'); expect(text).not.toContain('must not rewrite');
  107 |     await page.getByRole('button', { name: 'Remove moment A', exact: true }).click();
  108 |     expect((await state(page)).investigations.speed.evidence[0]).toEqual(copied);
  109 |     expect((await state(page)).flightStudyMoments).toHaveLength(1);
  110 |     await expect(page.locator('#rh-flight-moments-title')).toBeFocused();
  111 |     await page.getByRole('button', { name: 'Remove moment A', exact: true }).click();
  112 |     await expect(page.locator('.rh-flight-moments')).toHaveCount(0);
  113 |     await expect(page.locator('[data-raptor-study-button]')).toBeFocused();
  114 |     expect((await state(page)).investigations.speed.evidence).toHaveLength(2);
  115 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  116 |   });
  117 | 
  118 |   test('persists across restart and remount, handles capture failure, and fits accessible narrow panels', async ({ page }) => {
  119 |     await mount(page, false);
  120 |     await keep(page);
  121 |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  122 |     await page.locator('[data-study-moment=A]').getByRole('textbox').fill('An observation from my first flight.');
  123 |     await expect(page.getByRole('button', { name: 'Add to notebook', exact: true })).toBeDisabled();
  124 |     const first = (await state(page)).flightStudyMoments[0];
  125 |     await page.getByRole('button', { name: 'Restart this flight', exact: true }).click();
  126 |     await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
  127 |     await page.locator('[data-raptor-canvas]').evaluate(() => { for (let i = 0; i < 8; i++) (window as any).observationStep(25); });
  128 |     await page.evaluate(() => { HTMLCanvasElement.prototype.toDataURL = () => { throw new Error('Controlled image readback failure'); }; });
  129 |     await keep(page);
  130 |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  131 |     await expect(page.locator('[data-study-comparison]')).toHaveAttribute('data-study-comparison', 'different-flights');
  132 |     await expect(page.locator('[data-study-moment=B]')).toContainText('Image unavailable');
  133 |     expect((await state(page)).flightStudyMoments[0]).toEqual(first);
  134 |     expect((await state(page)).flightStudyMoments[1].image).toBeNull();
  135 |     await page.addStyleTag({ content: '#wrap{width:420px}' });
  136 |     await expect.poll(() => page.locator('.rh-moment-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
  137 |     await page.setViewportSize({ width: 420, height: 1000 });
  138 |     await page.locator('.rh-flight-moments').screenshot({ path: output + '/comparison-phone.png' });
  139 |     const overflow = await page.locator('.rh-flight-moments,.rh-moment-card').evaluateAll(elements => elements.map(el => el.scrollWidth - el.clientWidth));
  140 |     expect(Math.max(...overflow)).toBeLessThanOrEqual(1);
  141 |     await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  142 |     const violations = await page.evaluate(async () => {
  143 |       const result = await (window as any).axe.run({ include: ['.rh-flight-moments'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
  144 |       return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }));
  145 |     });
  146 |     expect(violations).toEqual([]);
  147 |     await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  148 |     const colors = await page.locator('.rh-moment-actions button').first().evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
  149 |     expect(colors[0]).not.toBe(colors[1]);
  150 |     const saved = await page.evaluate(() => (window as any).__toolData);
  151 |     await harness.destroy(page);
```