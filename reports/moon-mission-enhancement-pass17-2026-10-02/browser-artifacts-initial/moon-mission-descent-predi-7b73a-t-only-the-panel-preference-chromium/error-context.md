# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-descent-predictions.spec.ts >> paused control comparisons are numerical, update immediately, and persist only the panel preference
- Location: tests\e2e\moon-mission-descent-predictions.spec.ts:81:5

# Error details

```
TimeoutError: locator.screenshot: Timeout 25431.309999999998ms exceeded.
Call log:
  - taking element screenshot
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
  6   | const REPORT = resolve(process.env.MM_DESCENT_PREDICTION_REPORT_DIR || 'reports/moon-mission-enhancement-pass17-2026-10-02/browser/predictions');
  7   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  8   |   width: 1100, height: 1000, layout: 'document', appStyles: true });
  9   | const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  10  |   missionPhase: 5, descentStarted: true, descentPredictionOpen: false, animPaused: true, soundOff: true,
  11  |   missionXP: 42, landingRewarded: true, difficulty: 'pilot', lunarSamples: [], quizCorrect: 0,
  12  |   earnedBadges: { first_step: true, mission_complete: true }, ...extra,
  13  | } });
  14  | test.describe.configure({ timeout: 180000, retries: 0 });
  15  | test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
  16  | test.afterEach(async ({ page }) => harness.destroy(page));
  17  | async function mount(page: Page, data = seed()) {
  18  |   await page.goto(harness.url + '/__harness');
  19  |   await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  20  |   await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__mount(value); }, data);
  21  |   await expect(page.locator('[data-descent-prediction-toggle]')).toBeVisible();
  22  |   await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  23  | }
  24  | async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
  25  | async function flight(page: Page) { return page.locator('[data-descent-canvas]').evaluate((cv: any) => cv._descentState()); }
  26  | async function evidence(page: Page) {
  27  |   const d = await saved(page);
  28  |   return Object.fromEntries(['missionXP', 'landingResult', 'landingAttempts', 'landingRewarded', 'descentStart', 'descentMode']
  29  |     .map(key => [key, d[key] ?? null]));
  30  | }
  31  | async function capture(page: Page, info: TestInfo, name: string) {
  32  |   await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
> 33  |   await page.locator('[data-descent-prediction]').screenshot({ path });
      |                                                   ^ TimeoutError: locator.screenshot: Timeout 25431.309999999998ms exceeded.
  34  |   await info.attach(name, { path, contentType: 'image/png' });
  35  | }
  36  | async function expected(page: Page, recordedIndex?: number) {
  37  |   return page.evaluate(index => {
  38  |     const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
  39  |     let state: any, commands: any;
  40  |     if (index !== undefined) {
  41  |       const r = d.landingResult.recording.samples[index];
  42  |       state = { alt: r.alt, vVel: r.v, hVel: r.h, fuel: r.fuel, thrust: r.throttle, tilt: r.tilt,
  43  |         x: r.x, elapsed: r.t, contact: r.alt <= 0 };
  44  |       commands = { throttle: r.throttle, left: false, right: false };
  45  |     } else {
  46  |       state = (document.querySelector('[data-descent-canvas]') as any)._descentState();
  47  |       const root = document.querySelector('[data-descent-prediction]') as HTMLElement;
  48  |       commands = { throttle: Number(root.dataset.descentPredictionThrottle),
  49  |         left: root.dataset.descentPredictionTilt === 'left', right: root.dataset.descentPredictionTilt === 'right' };
  50  |     }
  51  |     const profile = P.descentPredictionProfile(state, commands);
  52  |     return { profile, geometry: P.descentPredictionGeometry(profile) };
  53  |   }, recordedIndex);
  54  | }
  55  | async function readings(page: Page, recordedIndex?: number) {
  56  |   const { profile: p, geometry: g } = await expected(page, recordedIndex);
  57  |   const root = page.locator('[data-descent-prediction]');
  58  |   expect(Number(await root.getAttribute('data-descent-prediction-time'))).toBeCloseTo(p.initial.elapsed, 8);
  59  |   const svg = root.locator('[data-descent-prediction-diagram]');
  60  |   await expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
  61  |   const matrix = await svg.evaluate((el: SVGSVGElement) => { const m = el.getScreenCTM()!; return { a: m.a, d: m.d, b: m.b, c: m.c }; });
  62  |   expect(matrix.a).toBeCloseTo(matrix.d, 8); expect(matrix.b).toBe(0); expect(matrix.c).toBe(0);
  63  |   expect(Number(await svg.getAttribute('data-metre-scale'))).toBeCloseTo(g.scale, 9);
  64  |   for (const key of ['held', 'burn'] as const) {
  65  |     const s = p[key].summary, end = root.locator('[data-descent-prediction-end="' + key + '"]');
  66  |     await expect(root.locator('[data-descent-prediction-value="' + key + '-time"]')).toHaveText(s.time.toFixed(2) + ' s');
  67  |     await expect(root.locator('[data-descent-prediction-value="' + key + '-altitude"]')).toHaveText(s.altitude.toFixed(1) + ' m');
  68  |     await expect(root.locator('[data-descent-prediction-value="' + key + '-propellant"]')).toHaveText(s.propellantUsed.toFixed(2) + ' kg');
  69  |     await expect(root.locator('[data-descent-prediction-value="' + key + '-fuel"]')).toHaveText(s.fuelRemaining.toFixed(2) + ' hover s');
  70  |     await expect(end).toHaveAttribute('data-endpoint', s.kind);
  71  |     expect(Number(await end.getAttribute('cx'))).toBeCloseTo(g[key + 'End'].x, 8);
  72  |     expect(Number(await end.getAttribute('cy'))).toBeCloseTo(g[key + 'End'].y, 8);
  73  |     const points = (await root.locator('[data-descent-prediction-path="' + key + '"]').getAttribute('points'))!
  74  |       .split(' ').map(pair => pair.split(',').map(Number));
  75  |     expect(points).toHaveLength(p[key].samples.length);
  76  |     expect(points.every(point => point.length === 2 && point.every(Number.isFinite))).toBe(true);
  77  |   }
  78  |   return p;
  79  | }
  80  | 
  81  | test('paused control comparisons are numerical, update immediately, and persist only the panel preference', async ({ page }, info) => {
  82  |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  83  |   await mount(page); await expect(page.locator('[data-descent-prediction-panel]')).toHaveCount(0);
  84  |   const original = await flight(page), receipt = await evidence(page);
  85  |   await page.locator('[data-descent-prediction-toggle]').click();
  86  |   await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-available', 'true');
  87  |   const first = await readings(page);
  88  |   expect(first.held.summary.kind).toBe('contact'); expect(first.burn.summary.kind).toBe('arrest');
  89  |   await page.locator('[data-descent-throttle]').fill('65');
  90  |   await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-throttle', '0.65');
  91  |   const higher = await readings(page); expect(higher.held.summary.kind).toBe('arrest');
  92  |   const cv = page.locator('[data-descent-canvas]'); await cv.focus(); await page.keyboard.down('a');
  93  |   await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-tilt', 'left');
  94  |   const tilted = await readings(page); expect(tilted.held.summary.lateral).toBeLessThan(higher.held.summary.lateral);
  95  |   await page.keyboard.up('a'); await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-tilt', 'center');
  96  |   expect(await flight(page)).toEqual(original); expect(await evidence(page)).toEqual(receipt);
  97  |   await capture(page, info, 'prediction-paused-controls');
  98  |   await page.locator('[data-descent-prediction-toggle]').click();
  99  |   await expect(page.locator('[data-descent-prediction-panel]')).toHaveCount(0);
  100 |   await page.locator('[data-descent-prediction-toggle]').click(); await readings(page);
  101 |   const d = await saved(page); await mount(page, { moonMission: { ...d, animPaused: true } });
  102 |   await expect(page.locator('[data-descent-prediction-toggle]')).toHaveAttribute('aria-expanded', 'true');
  103 |   await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-available', 'true');
  104 |   expect(await evidence(page)).toEqual(receipt); expect(errors).toEqual([]);
  105 | });
  106 | 
  107 | test('active prediction clocks follow the flight and leave the original impact and once-only outcome intact', async ({ page }, info) => {
  108 |   await mount(page, seed({ descentPredictionOpen: true }));
  109 |   await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-available', 'true');
  110 |   const projection = await readings(page), before = await evidence(page);
  111 |   await page.locator('[data-descent-pause]').click();
  112 |   await expect.poll(async () => Number(await page.locator('[data-descent-prediction]').getAttribute('data-descent-prediction-time'))).toBeGreaterThan(.5);
  113 |   await expect(page.locator('[data-descent-callout]')).toContainText('HARD LANDING', { timeout: 90000 });
  114 |   const d = await saved(page), last = d.landingResult.recording.samples.at(-1);
  115 |   expect(d.landingAttempts).toHaveLength(1); expect(d.missionXP).toBe(before.missionXP);
  116 |   expect(last.t).toBeCloseTo(projection.held.summary.time, 3);
  117 |   expect(d.landingResult.vVel).toBeCloseTo(Math.abs(projection.held.summary.vertical), 5);
  118 |   await expect(page.locator('[data-descent-prediction-status]')).toContainText('At contact');
  119 |   const after = await evidence(page);
  120 |   await page.locator('[data-descent-prediction-toggle]').click(); await page.locator('[data-descent-prediction-toggle]').click();
  121 |   await expect(page.locator('[data-descent-prediction-status]')).toContainText('At contact');
  122 |   expect(await evidence(page)).toEqual(after);
  123 |   await capture(page, info, 'prediction-actual-contact');
  124 | });
  125 | 
  126 | test('recorded sample projections preserve the landing receipt and omit missing legacy measurements', async ({ page }, info) => {
  127 |   await mount(page);
  128 |   const receipt = await page.evaluate(() => {
  129 |     const P = (window as any).MoonMissionPure;
  130 |     const s = { alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0, elapsed: 0 };
  131 |     const rec = P.newDescentRecording(); P.recordDescent(rec, s, false);
  132 |     for (let i = 0; i < 3000 && !(s as any).contact; i++) { P.descentStep(s, {}, 1 / 60); P.recordDescent(rec, s, !!(s as any).contact); }
  133 |     return { crashed: true, score: 0, grade: '—', vVel: Math.abs(s.vVel), hVel: Math.abs(s.hVel), fuel: Math.round(s.fuel),
```