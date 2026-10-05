# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-descent-dust.spec.ts >> fallback ballistic surface dust >> a real burn emits world-fixed grains that coast after cutoff and settle after contact
- Location: tests\e2e\moon-mission-descent-dust.spec.ts:92:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Test source

```ts
  1   | import { test, expect, type Page, type TestInfo } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { resolve, join } from 'node:path';
  4   | import { GlHarness } from './helpers/stem_gl_harness';
  5   | 
  6   | const REPORT = resolve(process.env.MM_DESCENT_DUST_REPORT_DIR || 'reports/moon-mission-enhancement-pass23-2026-10-04/browser/dust');
  7   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100,
  8   |   height: 1000, layout: 'document', appStyles: true });
  9   | const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: { missionPhase: 5, descentStarted: true, animPaused: true,
  10  |   soundOff: true, difficulty: 'pilot', missionXP: 42, landingRewarded: true, lunarSamples: [], quizCorrect: 0,
  11  |   earnedBadges: { first_step: true, mission_complete: true }, ...extra } });
  12  | test.describe.configure({ timeout: 180000, retries: 0 });
  13  | test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
  14  | test.afterEach(async ({ page }) => harness.destroy(page));
  15  | async function mount(page: Page, data = seed(), probe = false) {
  16  |   await page.goto(harness.url + '/__harness'); await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  17  |   await page.evaluate(({ data, probe }) => {
  18  |     Math.random = () => .999; document.getElementById('wrap')!.style.width = '100%';
  19  |     if (probe) {
  20  |       const T = (window as any).THREE, Original = T.WebGLRenderer;
  21  |       const Capture = function(...args: any[]) {
  22  |         const renderer = new Original(...args), original = renderer.render;
  23  |         renderer.render = function(scene: any, camera: any) {
  24  |           const dust = scene.getObjectByName('moon-descent-dust');
  25  |           if (dust) (window as any).__dustGL = { renderer, scene, camera, dust };
  26  |           return original.apply(renderer, arguments);
  27  |         };
  28  |         return renderer;
  29  |       };
  30  |       Capture.prototype = Original.prototype; Object.setPrototypeOf(Capture, Original); T.WebGLRenderer = Capture;
  31  |     }
  32  |     (window as any).__mount(data);
  33  |   }, { data, probe });
  34  |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  35  | }
  36  | async function state(page: Page) { return page.locator('[data-descent-canvas]').evaluate((c: any) => c._descentState()); }
  37  | async function dust(page: Page) { return page.locator('[data-descent-canvas]').evaluate((c: any) => c._descentDustState()); }
  38  | async function receipts(page: Page) { return page.evaluate(() => {
  39  |   const d = (window as any).__toolData.moonMission;
  40  |   return JSON.parse(JSON.stringify({ missionXP: d.missionXP, landingResult: d.landingResult, landingAttempts: d.landingAttempts, landingRewarded: d.landingRewarded }));
  41  | }); }
  42  | async function capture(page: Page, info: TestInfo, name: string) {
  43  |   await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '.png');
  44  |   const clip = await page.locator('[data-descent-canvas]').evaluate((c: HTMLElement) => {
  45  |     const b = c.parentElement!.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height };
  46  |   });
  47  |   await page.screenshot({ path, fullPage: true, clip, animations: 'disabled' }); await info.attach(name, { path, contentType: 'image/png' });
  48  | }
  49  | async function pilotToDust(page: Page) {
  50  |   // Operate the real lever and Pause button; never replace state or flight time.
  51  |   await page.evaluate(() => {
  52  |     const cv = document.querySelector('[data-descent-canvas]') as any, lever = document.querySelector('[data-descent-throttle]') as HTMLInputElement;
  53  |     const P = (window as any).MoonMissionPure; (window as any).__dustPilot = { phase: 'coast', done: false, contact: false };
  54  |     function pilot() {
  55  |       const control = (window as any).__dustPilot, s = cv._descentState(); if (control.done) return;
  56  |       if (s.contact) { control.done = true; control.contact = true; return; }
  57  |       if (control.phase === 'coast' && s.alt < 115) control.phase = 'brake';
  58  |       if (control.phase === 'brake' && s.vVel > -7) control.phase = 'hold';
  59  |       const setting = control.phase === 'coast' ? 0 : control.phase === 'brake' ? 100 : Math.round(P.descentGuidance(s).hoverThrottle * 100);
  60  |       if (lever.value !== String(setting)) { lever.value = String(setting); lever.dispatchEvent(new Event('input', { bubbles: true })); }
  61  |       if (control.phase === 'hold') cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
  62  |       if (s.alt < 18 && cv._descentDustState().grains.length > 8) {
  63  |         (document.querySelector('[data-descent-pause]') as HTMLButtonElement).click(); control.done = true; return;
  64  |       }
  65  |       requestAnimationFrame(pilot);
  66  |     }
  67  |     requestAnimationFrame(pilot);
  68  |   });
  69  |   await page.locator('[data-descent-pause]').click();
  70  |   await expect.poll(() => page.evaluate(() => (window as any).__dustPilot.done), { timeout: 100000 }).toBe(true);
  71  |   expect(await page.evaluate(() => (window as any).__dustPilot.contact)).toBe(false);
  72  |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  73  |   await expect.poll(async () => (await dust(page)).time).toBe((await state(page)).elapsed);
  74  |   expect((await dust(page)).grains.length).toBeGreaterThan(8);
  75  | }
  76  | async function modelNotes(page: Page, name: string) {
  77  |   const note = page.locator('[data-descent-dust-note]'); await note.locator('..').locator('summary').click(); await expect(note).toBeVisible();
  78  |   await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  79  |   const violations = await note.evaluate(async n => (await (window as any).axe.run(n.parentElement,
  80  |     { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
  81  |   await mkdir(REPORT, { recursive: true }); await writeFile(join(REPORT, name + '-axe.json'), JSON.stringify({ violations }, null, 2));
  82  |   expect(violations).toEqual([]);
  83  | }
  84  | 
  85  | test.describe('fallback ballistic surface dust', () => {
  86  |   test.beforeEach(async ({ page }) => page.addInitScript(() => {
  87  |     const original = HTMLCanvasElement.prototype.getContext;
  88  |     (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
  89  |       if (/webgl/i.test(type)) return null; return (original as any).apply(this, [type, ...args]);
  90  |     };
  91  |   }));
  92  |   test('a real burn emits world-fixed grains that coast after cutoff and settle after contact', async ({ page }, info) => {
  93  |     const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await mount(page); const original = await receipts(page);
  94  |     await pilotToDust(page); const before = await dust(page), held = await state(page); expect(held.tilt).toBeGreaterThan(.2);
  95  |     await capture(page, info, 'fallback-burning-dust'); await page.locator('[data-descent-throttle]').fill('0');
  96  |     await page.waitForTimeout(300); expect(await state(page)).toEqual(held); expect(await dust(page)).toEqual(before);
  97  |     await page.locator('[data-descent-pause]').click(); await expect.poll(async () => (await state(page)).elapsed).toBeGreaterThan(held.elapsed + .45);
  98  |     await page.locator('[data-descent-pause]').click(); const cutoff = await dust(page), coast = await state(page);
> 99  |     expect(coast.thrust).toBeLessThan(.02); expect(cutoff.grains.length).toBeGreaterThan(0);
      |                                                                          ^ Error: expect(received).toBeGreaterThan(expected)
  100 |     const shared = before.grains.filter(p => cutoff.grains.some(q => q.id === p.id)); expect(shared.length).toBeGreaterThan(0);
  101 |     const trailTime = await page.evaluate(() => (window as any).MoonMissionPure.descentDust.trailTime);
  102 |     for (const p of shared) {
  103 |       const q = cutoff.grains.find(q => q.id === p.id), dt = q.age - p.age;
  104 |       expect(q.launchX).toBe(p.launchX); expect(q.launchZ).toBe(p.launchZ);
  105 |       expect(q.height).toBeCloseTo(p.height + p.verticalSpeed * dt - .5 * 1.624 * dt * dt, 9);
  106 |       expect(q.verticalSpeed).toBeCloseTo(p.verticalSpeed - 1.624 * dt, 9);
  107 |       if (p.age > trailTime) expect((q.x - p.x) / dt).toBeCloseTo((p.x - p.tailX) / trailTime, 8);
  108 |     }
  109 |     await capture(page, info, 'fallback-after-engine-cutoff'); await page.waitForTimeout(250); expect(await dust(page)).toEqual(cutoff);
  110 |     await page.locator('[data-descent-pause]').click(); await expect.poll(async () => (await state(page)).contact, { timeout: 15000 }).toBe(true);
  111 |     const impact = await state(page), landed = await receipts(page); expect(landed.landingAttempts).toHaveLength(1); expect(landed.missionXP).toBe(original.missionXP);
  112 |     await expect.poll(async () => (await dust(page)).grains.length, { timeout: 8000 }).toBe(0);
  113 |     expect(await state(page)).toEqual(impact); expect(await receipts(page)).toEqual(landed);
  114 |     await capture(page, info, 'fallback-settled-contact'); await modelNotes(page, 'desktop'); expect(errors).toEqual([]);
  115 |     await writeFile(join(REPORT, 'cutoff-evidence.json'), JSON.stringify({ held, before, coast, cutoff, impact, landed }, null, 2));
  116 |   });
  117 |   test('recorded firing and touchdown omit unrecorded dust while preserving the landing receipt', async ({ page }, info) => {
  118 |     await mount(page); const result = await page.evaluate(() => {
  119 |       const P = (window as any).MoonMissionPure, s: any = { alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0, elapsed: 0 };
  120 |       const recording = P.newDescentRecording(); P.recordDescent(recording, s, false);
  121 |       for (let i = 0; i < 3000 && !s.contact; i++) { P.descentStep(s, { throttle: s.alt < 30 ? .5 : 0 }, 1 / 60); P.recordDescent(recording, s, !!s.contact); }
  122 |       if (!s.contact) throw Error('Fixture did not reach physical contact');
  123 |       return { crashed: true, score: 0, grade: '—', vVel: Math.abs(s.vVel), hVel: Math.abs(s.hVel), fuel: Math.round(s.fuel), fuelUnit: 's', recording: P.cleanDescentRecording(recording) };
  124 |     });
  125 |     const index = result.recording.samples.findIndex(p => p.alt > 0 && p.alt < 25 && p.throttle > .1); expect(index).toBeGreaterThan(0);
  126 |     await mount(page, seed({ landingResult: result, landingAttempts: [result], landingReviewIndex: index })); const saved = await receipts(page);
  127 |     await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-dust-source', 'omitted-recording');
  128 |     expect((await dust(page)).grains).toEqual([]); await capture(page, info, 'recorded-dust-omitted');
  129 |     await page.locator('[data-landing-scrub]').fill('0'); expect((await dust(page)).grains).toEqual([]);
  130 |     await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
  131 |     await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-dust-source', 'live');
  132 |     expect((await dust(page)).grains).toEqual([]); expect(await receipts(page)).toEqual(saved);
  133 |     await mount(page, seed({ landingResult: { crashed: false, score: 84, grade: 'B', vVel: 1, hVel: 2, fuel: 70 } }));
  134 |     expect((await dust(page)).grains).toEqual([]); await capture(page, info, 'legacy-no-invented-dust');
  135 |   });
  136 |   test('320 px reduced-motion flight holds grains during pause and hidden intervals', async ({ page }, info) => {
  137 |     await page.setViewportSize({ width: 320, height: 850 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page);
  138 |     await pilotToDust(page); const held = await state(page), picture = await dust(page); expect(picture.capacity).toBe(90);
  139 |     expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  140 |     await capture(page, info, 'phone-ballistic-dust');
  141 |     await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  142 |     await page.waitForTimeout(350); expect(await state(page)).toEqual(held); expect(await dust(page)).toEqual(picture);
  143 |     await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  144 |     await page.waitForTimeout(250); expect(await state(page)).toEqual(held); expect(await dust(page)).toEqual(picture);
  145 |     await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await capture(page, info, 'phone-dust-forced-colors');
  146 |   await modelNotes(page, 'phone-forced'); expect(await state(page)).toEqual(held);
  147 |     const note = page.locator('[data-descent-dust-note]');
  148 |     const box = await note.locator('..').boundingBox();
  149 |     await page.screenshot({ path: join(REPORT, 'phone-model-notes-forced.png'), fullPage: true,
  150 |       clip: { x: box!.x, y: box!.y + await page.evaluate(() => scrollY), width: box!.width, height: box!.height } });
  151 |   });
  152 | });
  153 | 
  154 | test('real WebGL consumes the same ballistic samples, draws dust pixels and retains grains on context loss', async ({ page }, info) => {
  155 |   const errors: string[] = [], shaderErrors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  156 |   page.on('console', m => { if (m.type() === 'error' && /shader|GL_INVALID|VALIDATE_STATUS/i.test(m.text())) shaderErrors.push(m.text()); });
  157 |   await page.addInitScript(() => Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 4 }));
  158 |   await mount(page, seed(), true); await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'on');
  159 |   await pilotToDust(page); const held = await state(page), picture = await dust(page);
  160 |   const projected = await page.evaluate(() => {
  161 |     const w = (window as any).__dustGL, g = w.dust.geometry, n = g.drawRange.count;
  162 |     return { count: n, positions: Array.from(g.attributes.position.array.slice(0, n * 3)), opacity: Array.from(g.attributes.opacity.array.slice(0, n)) };
  163 |   });
  164 |   expect(projected.count).toBe(picture.grains.length * 2);
  165 |   picture.grains.forEach((p, i) => {
  166 |     const head = (i * 2 + 1) * 3, tail = i * 2 * 3;
  167 |     expect(projected.positions[head]).toBeCloseTo((p.x - held.x) * .6, 4); expect(projected.positions[head + 2]).toBeCloseTo(p.z * .6, 4);
  168 |     expect(projected.positions[tail]).toBeCloseTo((p.tailX - held.x) * .6, 4);
  169 |     expect(projected.positions[head + 1] - projected.positions[tail + 1]).toBeCloseTo((p.height - p.tailHeight) * .6, 4);
  170 |     expect(projected.opacity[i * 2]).toBeCloseTo(p.opacity, 6); expect(projected.opacity[i * 2 + 1]).toBeCloseTo(p.opacity, 6);
  171 |   });
  172 |   await capture(page, info, 'webgl-ballistic-dust');
  173 |   const pixels = await page.evaluate(() => {
  174 |     const { renderer, scene, camera, dust } = (window as any).__dustGL, gl = renderer.getContext();
  175 |     const width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
  176 |     function read() { const a = new Uint8Array(width * height * 4); renderer.render(scene, camera); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, a); return a; }
  177 |     const before = read(); dust.visible = false; const after = read(); dust.visible = true; renderer.render(scene, camera);
  178 |     let changed = 0, delta = 0; for (let i = 0; i < before.length; i += 4) {
  179 |       const d = Math.abs(before[i] - after[i]) + Math.abs(before[i + 1] - after[i + 1]) + Math.abs(before[i + 2] - after[i + 2]);
  180 |       if (d) { changed++; delta += d; }
  181 |     }
  182 |     return { width, height, changed, delta };
  183 |   });
  184 |   expect(pixels.changed).toBeGreaterThan(5); expect(pixels.delta).toBeGreaterThan(0);
  185 |   await page.locator('select[data-descent-camera]').selectOption('landing');
  186 |   await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera', 'landing');
  187 |   expect(await dust(page)).toEqual(picture); expect(await state(page)).toEqual(held); await capture(page, info, 'webgl-landing-view-dust');
  188 |   await page.evaluate(() => (window as any).__dustGL.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());
  189 |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'lost');
  190 |   await expect(page.locator('[data-descent-gl]')).toHaveCount(0); expect(await dust(page)).toEqual(picture); expect(await state(page)).toEqual(held);
  191 |   await capture(page, info, 'context-loss-keeps-ballistic-dust'); expect(shaderErrors).toEqual([]); expect(errors).toEqual([]);
  192 |   await mkdir(REPORT, { recursive: true }); await writeFile(join(REPORT, 'webgl-evidence.json'), JSON.stringify({ held, picture, projected, pixels,
  193 |     contexts: await harness.glContexts(page), shaderErrors, errors }, null, 2));
  194 | });
  195 | 
```