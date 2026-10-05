# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-descent-vectors.spec.ts >> WebGL flight vectors follow engine and attitude response while physical time stays independent
- Location: tests\e2e\moon-mission-descent-vectors.spec.ts:139:5

# Error details

```
TimeoutError: locator.screenshot: Timeout 11961.025000000023ms exceeded.
Call log:
  - taking element screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - attempting scroll into view action
    - waiting for element to be stable

```

# Test source

```ts
  1   | import { test, expect, type Page, type TestInfo } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { join, resolve } from 'node:path';
  4   | import { GlHarness } from './helpers/stem_gl_harness';
  5   | 
  6   | const REPORT = resolve(process.env.MM_DESCENT_VECTOR_REPORT_DIR || 'reports/moon-mission-enhancement-pass20-2026-10-03/browser/vectors');
  7   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100,
  8   |   height: 1000, layout: 'document', appStyles: true });
  9   | const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: { missionPhase: 5, descentStarted: true,
  10  |   descentPredictionOpen: false, animPaused: true, soundOff: true, difficulty: 'pilot', missionXP: 42,
  11  |   landingRewarded: true, lunarSamples: [], quizCorrect: 0, earnedBadges: { first_step: true, mission_complete: true }, ...extra } });
  12  | test.describe.configure({ timeout: 180000, retries: 0 });
  13  | test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
  14  | test.afterEach(async ({ page }) => harness.destroy(page));
  15  | async function mount(page: Page, data = seed()) {
  16  |   await page.goto(harness.url + '/__harness'); await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  17  |   await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__mount(value); }, data);
  18  |   await expect(page.locator('[data-descent-vectors]')).toHaveCount(1);
  19  |   await expect.poll(async () => await page.locator('[data-descent-canvas]').getAttribute('data-descent-paused')).toBe('true');
  20  | }
  21  | async function open(page: Page) {
  22  |   await page.locator('[data-descent-vectors] > summary').click();
  23  |   await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('open', '');
  24  |   await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-available', 'true');
  25  | }
  26  | async function flight(page: Page) { return page.locator('[data-descent-canvas]').evaluate((cv: any) => cv._descentState()); }
  27  | async function evidence(page: Page) { return page.evaluate(() => {
  28  |   const d = (window as any).__toolData.moonMission;
  29  |   return JSON.parse(JSON.stringify({ missionXP: d.missionXP, landingResult: d.landingResult, landingAttempts: d.landingAttempts, landingRewarded: d.landingRewarded }));
  30  | }); }
  31  | async function capture(page: Page, info: TestInfo, name: string, selector = '[data-descent-vectors]') {
  32  |   await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '.png');
> 33  |   await page.locator(selector).screenshot({ path, animations: 'disabled' }); await info.attach(name, { path, contentType: 'image/png' });
      |                                ^ TimeoutError: locator.screenshot: Timeout 11961.025000000023ms exceeded.
  34  | }
  35  | async function axe(page: Page, name: string) {
  36  |   await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  37  |   const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-descent-vectors]'),
  38  |     { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
  39  |   await mkdir(REPORT, { recursive: true }); await writeFile(join(REPORT, name + '-axe.json'), JSON.stringify({ violations }, null, 2)); expect(violations).toEqual([]);
  40  | }
  41  | async function check(page: Page) {
  42  |   const measured = await page.locator('[data-descent-vectors]').evaluate((root: HTMLDetailsElement) => {
  43  |     const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission, cv = document.querySelector('[data-descent-canvas]') as any;
  44  |     const recorded = root.dataset.descentVectorSource === 'recorded', time = Number(root.dataset.descentVectorTime);
  45  |     const row = recorded ? d.landingResult.recording.samples.find((r: any) => Math.abs(r.t - time) < 1e-6) : null;
  46  |     const s = row ? { alt: row.alt, vVel: row.v, hVel: row.h, fuel: row.fuel, thrust: row.throttle, tilt: row.tilt,
  47  |       x: row.x, elapsed: row.t, contact: row.alt <= 0 } : cv._descentState();
  48  |     const g = P.descentVectorGeometry(s), panes: any[] = [];
  49  |     for (const name of ['motion', 'forces']) {
  50  |       if (name === 'forces' && !g.forces) continue;
  51  |       const svg = root.querySelector('[data-descent-vector-diagram="' + name + '"]') as SVGSVGElement, matrix = svg.getScreenCTM()!;
  52  |       const geometry = name === 'motion' ? g.motion : g.forces;
  53  |       const ends = (name === 'motion' ? ['velocity'] : ['engine', 'gravity', 'net']).map(key => {
  54  |         const a = name === 'motion' ? g.motion.arrow : g.forces.arrows[key], n = svg.querySelector('[data-descent-vector-ring="' + key + '"]')!;
  55  |         return { key, x: Number(n.getAttribute('cx')), y: Number(n.getAttribute('cy')), expected: a,
  56  |           visible: getComputedStyle(svg.querySelector('[data-descent-vector-arrow="' + key + '"]')!).display !== 'none' };
  57  |       });
  58  |       panes.push({ name, scaleX: matrix.a, scaleY: matrix.d, range: Number(svg.dataset.vectorRange), expectedRange: geometry.range, ends });
  59  |     }
  60  |     return { state: s, geometry: g, actualThrottle: Number(root.dataset.descentVectorActualThrottle), time, panes };
  61  |   });
  62  |   expect(measured.actualThrottle).toBe(measured.geometry.sample.actualThrottle); expect(measured.time).toBeCloseTo(measured.state.elapsed, 8);
  63  |   for (const pane of measured.panes) {
  64  |     expect(pane.scaleX).toBeCloseTo(pane.scaleY, 8); expect(pane.range).toBe(pane.expectedRange);
  65  |     for (const end of pane.ends) { expect(end.x).toBeCloseTo(end.expected.x, 8); expect(end.y).toBeCloseTo(end.expected.y, 8); expect(end.visible).toBe(end.expected.visible); }
  66  |   }
  67  |   return measured;
  68  | }
  69  | 
  70  | test.describe('fallback flight vector instruments', () => {
  71  |   test.beforeEach(async ({ page }) => page.addInitScript(() => {
  72  |     const original = HTMLCanvasElement.prototype.getContext;
  73  |     (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
  74  |       if (/webgl/i.test(type)) return null; return (original as any).apply(this, [type, ...args]);
  75  |     };
  76  |   }));
  77  | 
  78  |   test('paused desktop vectors show actual measurements and do not operate the lander', async ({ page }, info) => {
  79  |     await mount(page); const root = page.locator('[data-descent-vectors]'), before = await flight(page), receipt = await evidence(page);
  80  |     await expect(root).not.toHaveAttribute('open', ''); await expect(root).not.toHaveAttribute('data-descent-vector-available', 'true');
  81  |     await open(page); const first = await check(page); expect(first.geometry.forces.range).toBe(10); expect(first.actualThrottle).toBe(0);
  82  |     await page.locator('[data-descent-throttle]').fill('65'); await expect(page.locator('[data-throttle-setting]')).toHaveText('65%');
  83  |     await check(page); await expect(page.locator('[data-descent-vector-value="thrust"]')).toHaveText('0.00 kN');
  84  |     expect(await flight(page)).toEqual(before); expect(await evidence(page)).toEqual(receipt);
  85  |     expect(await page.evaluate(() => Object.keys((window as any).__toolData.moonMission).filter(key => /vector/i.test(key)))).toEqual([]);
  86  |     await capture(page, info, 'desktop-coast'); await capture(page, info, 'coast-vector-diagrams', '[data-descent-vector-content]'); await axe(page, 'desktop');
  87  |   });
  88  | 
  89  |   test('recorded tilted burn and contact preserve receipts and omit missing legacy vectors', async ({ page }, info) => {
  90  |     await mount(page);
  91  |     const result = await page.evaluate(() => {
  92  |       const P = (window as any).MoonMissionPure, s: any = { alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0, elapsed: 0 };
  93  |       const rec = P.newDescentRecording(); P.recordDescent(rec, s, false);
  94  |       for (let i = 0; i < 3000 && !s.contact; i++) {
  95  |         P.descentStep(s, s.elapsed >= 2 && s.elapsed < 4 ? { throttle: .65, left: true } : {}, 1 / 60);
  96  |         P.recordDescent(rec, s, !!s.contact);
  97  |       }
  98  |       return { crashed: true, score: 0, grade: '—', vVel: Math.abs(s.vVel), hVel: Math.abs(s.hVel), fuel: Math.round(s.fuel), fuelUnit: 's', recording: P.cleanDescentRecording(rec) };
  99  |     });
  100 |     await mount(page, seed({ landingResult: result, landingAttempts: [result] })); const receipt = await evidence(page); await open(page);
  101 |     await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-forces-available', 'false');
  102 |     const terminal = await check(page); expect(terminal.geometry.forces).toBeNull();
  103 |     await expect(page.locator('[data-descent-vector-plot="forces"]')).toBeHidden(); await capture(page, info, 'contact-velocity');
  104 |     await page.locator('[data-landing-scrub]').fill('6');
  105 |     await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-forces-available', 'true');
  106 |     await expect.poll(async () => Number(await page.locator('[data-descent-vectors]').getAttribute('data-descent-vector-time'))).toBeCloseTo(result.recording.samples[6].t, 8);
  107 |     const burn = await check(page); expect(burn.geometry.sample.forces.engine.x).toBeLessThan(0); expect(burn.geometry.sample.velocity.x).toBeGreaterThan(0);
  108 |     await capture(page, info, 'recorded-tilted-burn'); await capture(page, info, 'tilted-vector-diagrams', '[data-descent-vector-content]');
  109 |     await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
  110 |     await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-forces-available', 'false'); await check(page);
  111 |     expect(await evidence(page)).toEqual(receipt);
  112 |     await mount(page, seed({ landingResult: { crashed: false, score: 84, grade: 'B', vVel: 1.2, hVel: 2, fuel: 70 } }));
  113 |     const legacy = await evidence(page); await page.locator('[data-descent-vectors] > summary').click();
  114 |     await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-available', 'false');
  115 |     await expect(page.locator('[data-descent-vector-content]')).toBeHidden(); await expect(page.locator('[data-descent-vector-source-label]')).toContainText('no recorded state');
  116 |     expect(await evidence(page)).toEqual(legacy); await capture(page, info, 'legacy-no-vectors');
  117 |   });
  118 | 
  119 |   test('320 px flight vectors support keyboard, reduced motion and forced colors', async ({ page }, info) => {
  120 |     await page.setViewportSize({ width: 320, height: 850 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page);
  121 |     const before = await flight(page), receipt = await evidence(page), summary = page.locator('[data-descent-vectors] > summary');
  122 |     await summary.focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-available', 'true');
  123 |     await check(page); expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  124 |     const fonts = await page.locator('[data-descent-vectors] p, [data-descent-vectors] dl, [data-descent-vectors] figcaption')
  125 |       .evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)));
  126 |     expect(Math.min(...fonts)).toBeGreaterThanOrEqual(12); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  127 |     const motion = await page.locator('[data-descent-vector-diagram="motion"]').boundingBox(), forces = await page.locator('[data-descent-vector-diagram="forces"]').boundingBox();
  128 |     expect(forces!.y).toBeGreaterThan(motion!.y + motion!.height); await capture(page, info, 'phone-320'); await axe(page, 'phone');
  129 |     await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await check(page);
  130 |     await expect(page.locator('[data-descent-vector-arrow="gravity"]')).toHaveCSS('stroke-dasharray', '5px, 4px');
  131 |     await expect(page.locator('[data-descent-vector-arrow="net"]')).toHaveCSS('stroke-dasharray', '1px, 4px');
  132 |     await expect(page.locator('[data-descent-vector-arrow="velocity"]')).toHaveCSS('stroke-dasharray', 'none');
  133 |     await capture(page, info, 'phone-forced-colors'); await axe(page, 'phone-forced');
```