# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: raptor-moment-reveal.spec.ts >> Raptor saved-image reveal >> reveals real saved flight images without modifying evidence or rerendering the simulation
- Location: tests\e2e\raptor-moment-reveal.spec.ts:47:7

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByRole('slider', { name: 'Reveal moment A', exact: true })
Expected: focused
Received: inactive
Timeout:  15000ms

Call log:
  - Expect "toBeFocused" with timeout 15000ms
  - waiting for getByRole('slider', { name: 'Reveal moment A', exact: true })
    33 × locator resolved to <input min="0" step="1" max="100" value="75" type="range" id="rh-moment-reveal-range" aria-valuetext="75% moment A · 25% moment B" aria-describedby="rh-moment-reveal-help rh-moment-reveal-context"/>
       - unexpected value "inactive"

```

```yaml
- slider "Reveal moment A": "75"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | import { readPng, Pixels } from './helpers/png_pixels';
  5   | 
  6   | test.use({ video: 'off' });
  7   | const output = 'reports/raptor-moment-reveal-2026-09-27';
  8   | const probes = `window.AlloPostFXEnabled=false;window.revealRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original(options),render=r.render.bind(r);r.render=function(scene,camera){window.revealScene=scene;if(window.revealSkipRender)return;window.revealRenders++;return render(scene,camera);};return r;};})();`;
  9   | 
  10  | test.describe('Raptor saved-image reveal', () => {
  11  |   test.describe.configure({ mode: 'serial', timeout: 240000 });
  12  |   const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 880, height: 680, appStyles: true, probes });
  13  |   test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
  14  |   test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.destroy(page));
  15  |   test.beforeEach(async ({ page }) => {
  16  |     await page.setViewportSize({ width: 960, height: 1100 });
  17  |     await page.addInitScript(() => {
  18  |       let time = 1000, id = 0, seed = 731; const frames = new Map<number, FrameRequestCallback>();
  19  |       Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; performance.now = () => time;
  20  |       window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; }; window.cancelAnimationFrame = key => frames.delete(key);
  21  |       (window as any).revealStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
  22  |     });
  23  |   });
  24  |   async function mount(page: any, records: any[] = []) {
  25  |     await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'highStoop', selectedSpecies: 'peregrine',
  26  |       flightSession: { speciesId: 'peregrine', missionId: 'highStoop' }, huntTutorialDismissed: true, graphicsQuality: 'low', flightStudyMoments: records,
  27  |       activeInvestigation: 'speed', investigations: { speed: { prediction: 'The wing outline will change during a dive.' } }
  28  |     } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  29  |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => { c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 }); for (let i = 0; i < 8; i++) (window as any).revealStep(25); });
  30  |   }
  31  |   async function snapshot(page: any) { return page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot()); }
  32  |   async function records(page: any) { return page.evaluate(() => (window as any).__toolData.raptorHunt.flightStudyMoments); }
  33  |   async function open(page: any) { await page.getByRole('button', { name: 'Compare images with a slider', exact: true }).click(); await expect(page.locator('#rh-moment-reveal-panel')).toBeVisible(); }
  34  |   async function keep(page: any) { await page.getByRole('button', { name: 'Keep moment', exact: true }).click(); await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled(); }
  35  |   function frozen(a: any, b: any) { for (const key of ['paused', 'motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'cameraPosition', 'cameraQuaternion']) expect(b[key], key).toEqual(a[key]); }
  36  |   async function fixtures(page: any) {
  37  |     const images = await page.evaluate(() => ['#9a541e', '#377a90'].map((color, i) => { const c = document.createElement('canvas'); c.width = 480; c.height = 320; const ctx = c.getContext('2d')!; ctx.fillStyle = '#102b36'; ctx.fillRect(0, 0, 480, 320); ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(240, 160, 180 - i * 40, 65 + i * 20, i * 0.2, 0, Math.PI * 2); ctx.fill(); return c.toDataURL('image/jpeg', 0.8); }));
  38  |     return images.map((image, i) => ({ kind: 'flight-study', id: 'fixture-' + i, runId: 'fixture-flight', speciesName: 'Peregrine Falcon', missionName: 'High stoop', elapsedS: i + 1, speedMph: 60 + i * 20, heightM: 600 - i * 30, poseLabel: i ? 'Diving' : 'Flying', viewLabel: 'Above', focusLabel: 'Whole bird', presentationLabel: 'Studio lighting', note: '', image,
  39  |       view: { focus: 'whole', presentation: 'studio', lighting: 'soft', preset: 'above', azimuthOffset: Math.PI, elevation: 1.24, distance: 1 } }));
  40  |   }
  41  |   function pixelDifference(a: Pixels, b: Pixels, from: number, to: number) {
  42  |     expect([a.width, a.height]).toEqual([b.width, b.height]); let different = 0, total = 0;
  43  |     for (let y = Math.floor(a.height * 0.15); y < a.height * 0.9; y += 2) for (let x = Math.floor(a.width * from); x < a.width * to; x += 2) { const p = a.at(x, y), q = b.at(x, y); if (p.reduce((sum, v, i) => sum + Math.abs(v - q[i]), 0) > 12) different++; total++; }
  44  |     return { different, total, fraction: different / total };
  45  |   }
  46  | 
  47  |   test('reveals real saved flight images without modifying evidence or rerendering the simulation', async ({ page }) => {
  48  |     const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  49  |     await mount(page); await page.locator('[data-raptor-study-button]').click(); await page.locator('[data-study-view=above]').click(); await keep(page);
  50  |     await expect(page.getByRole('button', { name: 'Compare images with a slider', exact: true })).toHaveCount(0);
  51  |     await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
  52  |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => { const w = window as any; c._rhCommand('assist'); c._rhCommand('hold', { key: 'shift', pressed: true }); w.revealSkipRender = true; for (let i = 0; i < 60; i++) w.revealStep(50); w.revealSkipRender = false; w.revealStep(25); });
  53  |     await page.locator('[data-raptor-study-button]').click(); await page.getByRole('button', { name: 'Match saved view', exact: true }).click(); await keep(page);
  54  |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  55  |     const original = await records(page), paused = await snapshot(page), renderer = await page.evaluate(() => ({ renders: (window as any).revealRenders, head: (window as any).revealScene.getObjectByName('raptor-head-rig').uuid }));
  56  |     expect(original[0].image).not.toBe(original[1].image); await open(page);
  57  |     const panel = page.locator('#rh-moment-reveal-panel'), stage = panel.locator('.rh-moment-reveal-stage'), range = page.getByRole('slider', { name: 'Reveal moment A', exact: true });
  58  |     await expect(range).toHaveValue('50'); await expect(panel.locator('[data-views-match]')).toHaveAttribute('data-views-match', 'true');
  59  |     expect(await stage.locator('img').evaluateAll(images => images.map((img: any) => img.src))).toEqual(original.map(m => m.image));
  60  |     const middle = readPng(await stage.screenshot({ path: output + '/real-split.png' }));
  61  |     await page.getByRole('button', { name: 'Show A', exact: true }).click(); await expect(range).toHaveValue('100'); const first = readPng(await stage.screenshot({ path: output + '/real-a.png' }));
  62  |     await page.getByRole('button', { name: 'Show B', exact: true }).click(); await expect(range).toHaveValue('0'); const second = readPng(await stage.screenshot({ path: output + '/real-b.png' }));
  63  |     const pixels = { endpoints: pixelDifference(first, second, 0.08, 0.92), left: pixelDifference(first, middle, 0.08, 0.4), right: pixelDifference(second, middle, 0.6, 0.92) };
  64  |     expect(pixels.endpoints.different).toBeGreaterThan(500); expect(pixels.left.fraction).toBeLessThan(0.01); expect(pixels.right.fraction).toBeLessThan(0.01);
  65  |     await stage.scrollIntoViewIfNeeded(); const bounds = (await stage.boundingBox())!;
  66  |     await page.mouse.move(bounds.x + bounds.width * 0.25, bounds.y + bounds.height * 0.5); await page.mouse.down();
> 67  |     await page.mouse.move(bounds.x + bounds.width * 0.75, bounds.y + bounds.height * 0.5, { steps: 6 }); await page.mouse.up(); await expect(range).toHaveValue('75'); await expect(range).toBeFocused();
      |                                                                                                                                                                                            ^ Error: expect(locator).toBeFocused() failed
  68  |     await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.5); await expect(range).toHaveValue('75'); // Released pointers cannot keep dragging.
  69  |     await range.focus(); await page.keyboard.press('End'); await expect(range).toHaveValue('100'); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(range).toHaveValue('1'); await expect(range).toHaveAttribute('aria-valuetext', '1% moment A · 99% moment B');
  70  |     await page.getByRole('button', { name: 'Split view', exact: true }).click(); await expect(range).toHaveValue('50'); await panel.screenshot({ path: output + '/comparison-desktop.png' });
  71  |     expect(await records(page)).toEqual(original); frozen(paused, await snapshot(page));
  72  |     expect(await page.evaluate(() => ({ renders: (window as any).revealRenders, head: (window as any).revealScene.getObjectByName('raptor-head-rig').uuid }))).toEqual(renderer);
  73  |     await page.locator('[data-study-moment=A] textarea').fill('The spread wing outline changes as the bird dives.'); await expect(range).toHaveValue('50');
  74  |     await page.locator('[data-study-moment=A]').getByRole('button', { name: 'Add to notebook', exact: true }).click();
  75  |     expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.investigations.speed.evidence[0].reading.image)).toBe(original[0].image);
  76  |     const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download visual report', exact: true }).click(); const download = await pending; await download.saveAs(output + '/flight-observations.html');
  77  |     const html = readFileSync((await download.path())!, 'utf8'); expect((html.match(/<img /g) || []).length).toBe(2); expect(html).not.toContain('rh-moment-reveal-range'); expect(html).toContain(original[0].image); expect(html).toContain(original[1].image);
  78  |     await page.getByRole('button', { name: 'Close image comparison', exact: true }).click(); await expect(panel).toBeHidden(); await expect(page.getByRole('button', { name: 'Compare images with a slider', exact: true })).toBeFocused();
  79  |     writeFileSync(output + '/real-reveal-checks.json', JSON.stringify({ pixels, noSimulationRedraws: true, unchangedOriginalImages: true, offlineReportImages: 2 }, null, 2));
  80  |     expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  81  |   });
  82  | 
  83  |   test('keeps viewing caveats visible, resets for replacement pairs, and handles missing or unreadable images', async ({ page }) => {
  84  |     const samples = await fixtures(page); await mount(page, samples); await open(page);
  85  |     const panel = page.locator('#rh-moment-reveal-panel'), context = panel.locator('#rh-moment-reveal-context');
  86  |     await expect(context).toContainText('does not guarantee identical size or alignment');
  87  |     for (const [patch, text] of [
  88  |       [{ lighting: 'rim' }, 'different studio lights'], [{ presentation: 'habitat' }, 'different lighting and backgrounds'], [{ focus: 'head' }, 'different regions'], [{ distance: 1.5 }, 'Camera settings differ'], [null, 'not recorded']
  89  |     ] as const) {
  90  |       await page.evaluate(({ view, patch }) => { const w = window as any; w.__toolData.raptorHunt.flightStudyMoments[1].view = patch ? { ...view, ...patch } : null; w.__rerender(); }, { view: samples[1].view, patch });
  91  |       await expect(context).toContainText(text); await expect(context).toHaveAttribute('data-views-match', 'false');
  92  |     }
  93  |     await page.evaluate(() => { const w = window as any; delete w.__toolData.raptorHunt.flightStudyMoments[1].runId; w.__rerender(); }); await expect(context).toContainText('Flight identity was not recorded');
  94  |     await page.evaluate(() => { const w = window as any; w.__toolData.raptorHunt.flightStudyMoments[1].runId = 'another-flight'; w.__rerender(); }); await expect(context).toContainText('different flights');
  95  |     await panel.screenshot({ path: output + '/viewing-caveats.png' });
  96  |     await page.getByRole('button', { name: 'Show B', exact: true }).click(); await page.getByRole('button', { name: 'Remove moment A', exact: true }).click(); await expect(page.locator('.rh-moment-reveal-wrap')).toHaveCount(0);
  97  |     await page.evaluate(sample => { const w = window as any; w.__toolData.raptorHunt.flightStudyMoments.push({ ...sample, id: 'replacement' }); w.__rerender(); }, samples[0]);
  98  |     await expect(page.getByRole('button', { name: 'Compare images with a slider', exact: true })).toHaveAttribute('aria-expanded', 'false'); await open(page); await expect(page.getByRole('slider', { name: 'Reveal moment A', exact: true })).toHaveValue('50');
  99  |     for (const image of [null, 'https://invalid.example/unsafe.jpg', 'data:image/svg+xml;base64,PHN2Zz4=']) {
  100 |       await page.evaluate(image => { const w = window as any; w.__toolData.raptorHunt.flightStudyMoments[1].image = image; w.__rerender(); }, image); await expect(page.locator('.rh-moment-reveal-wrap')).toHaveCount(0);
  101 |     }
  102 |     await page.evaluate(() => { const w = window as any; w.__toolData.raptorHunt.flightStudyMoments[1].id = 'broken-jpeg'; w.__toolData.raptorHunt.flightStudyMoments[1].image = 'data:image/jpeg;base64,AAAA'; w.__rerender(); });
  103 |     await open(page); await expect(panel.getByRole('status')).toContainText('could not be loaded'); await expect(panel.locator('input,img')).toHaveCount(0); await expect(context).toBeVisible();
  104 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  105 |   });
  106 | 
  107 |   test('supports phone controls, touch-sized targets, keyboard, reduced motion, and forced colors', async ({ page }) => {
  108 |     await mount(page, await fixtures(page)); await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 740 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page);
  109 |     const panel = page.locator('#rh-moment-reveal-panel'), range = panel.getByRole('slider', { name: 'Reveal moment A', exact: true }); const paused = await snapshot(page);
  110 |     await range.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await expect(range).toHaveValue('1');
  111 |     await page.getByRole('button', { name: 'Split view', exact: true }).click();
  112 |     const stage = panel.locator('.rh-moment-reveal-stage'); await stage.scrollIntoViewIfNeeded(); const bounds = (await stage.boundingBox())!, cdp = await page.context().newCDPSession(page);
  113 |     try {
  114 |       await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + bounds.width * 0.2, y: bounds.y + bounds.height * 0.5 }] });
  115 |       await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bounds.x + bounds.width * 0.8, y: bounds.y + bounds.height * 0.5 }] });
  116 |       await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  117 |       await expect(range).toHaveValue('80');
  118 |       await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + bounds.width * 0.5, y: bounds.y + bounds.height * 0.5 }] });
  119 |       await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  120 |       await expect(range).toHaveValue('50');
  121 |     } finally { await cdp.detach(); }
  122 |     expect(await stage.evaluate(el => getComputedStyle(el).touchAction)).toBe('pan-y pinch-zoom');
  123 |     expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  124 |     expect(await panel.locator('button,input').evaluateAll(els => els.every(el => el.getBoundingClientRect().height >= 44))).toBe(true);
  125 |     await panel.screenshot({ path: output + '/comparison-phone.png' });
  126 |     await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); expect(await page.evaluate(async () => (await (window as any).axe.run({ include: ['.rh-flight-moments'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => v.id))).toEqual([]);
  127 |     await page.emulateMedia({ forcedColors: 'active' }); const colors = await panel.getByRole('button', { name: 'Show A', exact: true }).evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]); expect(colors[0]).not.toBe(colors[1]);
  128 |     await panel.getByRole('button', { name: 'Show A', exact: true }).click(); await expect(range).toHaveValue('100'); await panel.screenshot({ path: output + '/comparison-forced-colors.png' });
  129 |     await page.evaluate(() => (window as any).revealStep(60000)); frozen(paused, await snapshot(page));
  130 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  131 |   });
  132 | });
  133 | 
```