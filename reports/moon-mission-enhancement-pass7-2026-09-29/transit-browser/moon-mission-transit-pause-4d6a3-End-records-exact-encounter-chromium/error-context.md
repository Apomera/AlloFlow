# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-transit.spec.ts >> paused transit stays readable at 320px and keyboard End records exact encounter
- Location: tests\e2e\moon-mission-transit.spec.ts:129:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 10

- Array []
+ Array [
+   Object {
+     "description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds",
+     "id": "color-contrast",
+     "impact": "serious",
+     "targets": Array [
+       ".text-slate-600",
+     ],
+   },
+ ]
```

# Test source

```ts
  1   | import { test, expect, type Page, type TestInfo } from '@playwright/test';
  2   | import { existsSync } from 'node:fs';
  3   | import { mkdir } from 'node:fs/promises';
  4   | import { join, resolve } from 'node:path';
  5   | import { GlHarness } from './helpers/stem_gl_harness';
  6   | 
  7   | const REPORT = resolve('reports/moon-mission-enhancement-pass7-2026-09-29/transit');
  8   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100, height: 1000, layout: 'document', appStyles: true });
  9   | const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: { missionPhase: 3, animPaused: true, soundOff: true, missionXP: 0, missionLog: [],
  10  |   earnedBadges: { first_step: true, mission_complete: true }, difficulty: 'pilot', lunarSamples: [], quizCorrect: 0, ...extra } });
  11  | async function mount(page: Page, data = seed()) {
  12  |   await page.goto(harness.url + '/__harness');
  13  |   await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  14  |   await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999; (window as any).__mount(value); }, data);
  15  |   await expect(page.locator('[data-transit-canvas]')).toBeVisible();
  16  |   await expect.poll(async () => page.locator('[data-transit-canvas]').getAttribute('data-transit-time')).not.toBeNull();
  17  | }
  18  | async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
  19  | async function transit(page: Page) {
  20  |   return page.locator('[data-transit-canvas]').evaluate((cv: HTMLCanvasElement) => ({ time: Number(cv.dataset.transitTime),
  21  |     earthDistance: Number(cv.dataset.transitEarthDistance), moonDistance: Number(cv.dataset.transitMoonDistance),
  22  |     earthSpeed: Number(cv.dataset.transitEarthSpeed), moonSpeed: Number(cv.dataset.transitMoonSpeed), mass: Number(cv.dataset.transitMass),
  23  |     propellant: Number(cv.dataset.transitPropellant), thrust: Number(cv.dataset.transitThrust), engine: cv.dataset.transitEngine, plume: cv.dataset.transitPlume }));
  24  | }
  25  | async function profile(page: Page) {
  26  |   return page.evaluate(() => { const P = (window as any).MoonMissionPure, plan = P.cleanTransitPlayback((window as any).__toolData.moonMission).transitPlan;
  27  |     const p = P.transitProfile(plan); return { plan, summary: p.summary, events: p.events, first: p.samples[0] }; });
  28  | }
  29  | async function sample(page: Page, time: number) {
  30  |   return page.evaluate(seconds => { const P = (window as any).MoonMissionPure;
  31  |     return P.transitSample(P.transitProfile(P.cleanTransitPlayback((window as any).__toolData.moonMission).transitPlan), seconds); }, time);
  32  | }
  33  | async function seek(page: Page, seconds: number) {
  34  |   const time = Math.round(seconds * 10) / 10;
  35  |   await page.locator('[data-transit-seek]').evaluate((el: HTMLInputElement, value) => {
  36  |     Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(value));
  37  |     el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  38  |   }, time);
  39  |   await expect.poll(async () => Math.abs((await transit(page)).time - time)).toBeLessThan(0.11); return time;
  40  | }
  41  | async function capture(page: Page, info: TestInfo, name: string) {
  42  |   await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
  43  |   await page.screenshot({ path, fullPage: true }); await info.attach(name, { path, contentType: 'image/png' });
  44  | }
  45  | async function painted(page: Page) {
  46  |   await expect.poll(async () => page.locator('[data-transit-canvas]').evaluate((cv: HTMLCanvasElement) => {
  47  |     const data = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data; let opaque = 0, total = 0; const colors = new Set<string>();
  48  |     for (let y = 10; y < cv.height; y += 20) for (let x = 10; x < cv.width; x += 20) { const i = (y * cv.width + x) * 4; total++;
  49  |       if (data[i + 3] > 100) opaque++; colors.add(Array.from(data.slice(i, i + 3)).join(',')); }
  50  |     return opaque / total > 0.9 && colors.size > 12;
  51  |   }), { message: 'transit must remain painted when paused or resized' }).toBe(true);
  52  | }
  53  | async function accessible(page: Page, info: TestInfo) {
  54  |   const axePath = resolve('node_modules/axe-core/axe.min.js'); if (!existsSync(axePath)) return;
  55  |   await page.addScriptTag({ path: axePath });
  56  |   const violations = await page.evaluate(async () => { const result = await (window as any).axe.run({ include: [['[data-transit-workspace]']] }, {
  57  |     runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
  58  |     return result.violations.map((item: any) => ({ id: item.id, impact: item.impact, description: item.description, targets: item.nodes.flatMap((node: any) => node.target) })); });
> 59  |   await info.attach('transit-accessibility', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' }); expect(violations).toEqual([]);
      |                                                                                                                                                  ^ Error: expect(received).toEqual(expected) // deep equality
  60  | }
  61  | test.describe.configure({ timeout: 180000, retries: 0 });
  62  | test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.destroy(page));
  63  | 
  64  | test('moving-Moon coast readouts follow position and separately named speed frames', async ({ page }, info) => {
  65  |   await mount(page); await expect(page.locator('[data-transit-proceed]')).toBeDisabled();
  66  |   await capture(page, info, 'transit-departure');
  67  |   const p = await profile(page), time = await seek(page, 36 * 3600), live = await transit(page), expected = await sample(page, time);
  68  |   for (const field of ['earthDistance', 'moonDistance', 'earthSpeed', 'moonSpeed', 'mass', 'propellant', 'thrust'] as const) expect(live[field]).toBeCloseTo(expected[field], 6);
  69  |   expect(live.earthDistance).toBeCloseTo(Math.hypot(expected.x, expected.y), 6);
  70  |   expect(live.moonDistance).toBeCloseTo(Math.hypot(expected.x - expected.moonX, expected.y - expected.moonY), 6);
  71  |   expect(live.moonSpeed).toBeCloseTo(Math.hypot(expected.vx - expected.moonVx, expected.vy - expected.moonVy), 6);
  72  |   expect(Math.hypot(expected.moonX - p.first.moonX, expected.moonY - p.first.moonY)).toBeGreaterThan(1e7);
  73  |   expect(Math.abs(live.earthSpeed - live.moonSpeed)).toBeGreaterThan(10);
  74  |   expect(live.engine).toBe('off'); expect(live.plume).toBe('off'); expect(live.thrust).toBe(0); expect(live.propellant).toBe(p.first.propellant);
  75  |   await expect(page.locator('[data-transit-readouts]')).toContainText('Earth-relative speed');
  76  |   await expect(page.locator('[data-transit-readouts]')).toContainText('Moon-relative speed');
  77  |   await expect(page.locator('[data-transit-plan-note]')).toContainText('separate arrival and mass preset');
  78  |   await painted(page); await capture(page, info, 'transit-system-coast');
  79  |   await page.locator('[data-transit-result]').click(); await expect(page.locator('[data-transit-proceed]')).toBeEnabled();
  80  |   const end = await saved(page); expect(end.transitRun.recorded).toBe(true); expect(end.transitResult.outcome).toBe('encounter'); expect(end.missionXP).toBe(0);
  81  |   expect((await transit(page)).time).toBeCloseTo(p.summary.duration, 6);
  82  |   await page.locator('[data-transit-view]').selectOption('moon'); await painted(page); await capture(page, info, 'transit-nominal-encounter');
  83  | });
  84  | 
  85  | test('a speed error misses the corridor and a finite correction spends SPS fuel to restore encounter', async ({ page }, info) => {
  86  |   await mount(page); await page.locator('[data-transit-preset="error"]').click(); await page.locator('[data-transit-result]').click();
  87  |   await expect(page.locator('[data-transit-proceed]')).toBeDisabled(); const missed = await saved(page);
  88  |   expect(missed.transitResult.outcome).not.toBe('encounter'); expect(missed.transitResult.propellantUsed).toBe(0);
  89  |   await page.locator('[data-transit-view]').selectOption('moon'); await capture(page, info, 'transit-speed-error');
  90  |   await page.locator('[data-transit-preset="corrected"]').click();
  91  |   const reset = await saved(page); expect(reset.transitResult).toBeNull(); expect(reset.transitRun).toEqual({ version: 1, time: 0, recorded: false }); expect(reset.transitPaused).toBe(true);
  92  |   await page.locator('[data-transit-milestone="burn"]').click(); await expect(page.locator('[data-transit-rate]')).toHaveValue('1');
  93  |   const burn = await transit(page), expected = await sample(page, burn.time), p = await profile(page);
  94  |   expect(burn.time).toBeGreaterThan(p.events.ignition.time); expect(burn.time).toBeLessThan(p.events.cutoff.time);
  95  |   expect(burn.engine).toBe('on'); expect(burn.plume).toBe('on'); expect(burn.thrust).toBeGreaterThan(90000);
  96  |   expect(burn.mass).toBeCloseTo(expected.mass, 6); expect(burn.propellant).toBeCloseTo(expected.propellant, 6);
  97  |   expect(burn.mass).toBeLessThan(p.first.mass); expect(burn.propellant).toBeLessThan(p.first.propellant);
  98  |   await page.locator('[data-transit-view]').selectOption('system'); await capture(page, info, 'transit-correction-burn');
  99  |   await page.locator('[data-transit-milestone="cutoff"]').click();
  100 |   const cutoff = await transit(page); expect(cutoff.engine).toBe('off'); expect(cutoff.plume).toBe('off'); expect(cutoff.thrust).toBe(0); expect(cutoff.mass).toBeLessThan(burn.mass);
  101 |   await page.locator('[data-transit-result]').click(); await expect(page.locator('[data-transit-proceed]')).toBeEnabled();
  102 |   const corrected = await saved(page); expect(corrected.transitResult.outcome).toBe('encounter'); expect(corrected.transitResult.propellantUsed).toBeGreaterThan(0);
  103 |   expect(corrected.transitResult.actualBurn).toBeGreaterThan(0); expect(corrected.missionXP).toBe(0);
  104 |   await page.locator('[data-transit-view]').selectOption('moon'); await capture(page, info, 'transit-corrected-encounter');
  105 | });
  106 | 
  107 | test('review and reload retain arrival, then advancing rewards the mission only once', async ({ page }) => {
  108 |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  109 |   await mount(page); await page.locator('[data-transit-result]').click(); const arrived = await saved(page);
  110 |   await seek(page, 3600); const reviewing = await saved(page), readings = await transit(page);
  111 |   expect(reviewing.transitResult).toEqual(arrived.transitResult); expect(reviewing.transitRun.recorded).toBe(true);
  112 |   await mount(page, { moonMission: reviewing }); expect(await transit(page)).toEqual(readings); await expect(page.locator('[data-transit-proceed]')).toBeEnabled();
  113 |   await page.locator('[data-transit-proceed]').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  114 |   await expect.poll(async () => (await saved(page)).missionPhase).toBe(4); const advanced = await saved(page);
  115 |   expect(advanced.missionXP).toBe(15); expect(advanced.transitAwarded).toBe(true); await expect(page.locator('[data-loi-canvas]')).toBeVisible();
  116 |   await mount(page, { moonMission: { ...advanced, missionPhase: 3 } }); await page.locator('[data-transit-proceed]').click();
  117 |   await expect.poll(async () => (await saved(page)).missionPhase).toBe(4); expect((await saved(page)).missionXP).toBe(15); expect(errors).toEqual([]);
  118 | });
  119 | 
  120 | test('legacy choices and malformed saved results cannot bypass measured arrival', async ({ page }) => {
  121 |   await mount(page, seed({ mccChoice: 'corrected', coastSlowest: { v: 1, toMoonKm: 38000 },
  122 |     transitRun: { version: 99, time: 'corrupt', recorded: true }, transitResult: { version: 1, outcome: 'encounter' } }));
  123 |   await expect(page.locator('[data-transit-proceed]')).toBeDisabled(); expect((await transit(page)).time).toBe(0);
  124 |   expect((await saved(page)).transitResult).toBeNull(); expect((await saved(page)).missionXP).toBe(0);
  125 |   await expect(page.locator('[data-transit-workspace]')).toContainText('earlier correction decision');
  126 |   await page.locator('[data-transit-result]').click(); await expect(page.locator('[data-transit-proceed]')).toBeEnabled(); expect((await saved(page)).missionXP).toBe(0);
  127 | });
  128 | 
  129 | test('paused transit stays readable at 320px and keyboard End records exact encounter', async ({ page }, info) => {
  130 |   await page.setViewportSize({ width: 1280, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page);
  131 |   await seek(page, 36 * 3600); const fixed = await transit(page), pixels = await page.locator('[data-transit-canvas]').evaluate((cv: HTMLCanvasElement) => cv.toDataURL());
  132 |   await page.waitForTimeout(250); expect(await transit(page)).toEqual(fixed);
  133 |   expect(await page.locator('[data-transit-canvas]').evaluate((cv: HTMLCanvasElement) => cv.toDataURL())).toBe(pixels);
  134 |   await page.setViewportSize({ width: 320, height: 844 });
  135 |   await expect.poll(async () => page.locator('[data-transit-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(320);
  136 |   await painted(page); expect(await transit(page)).toEqual(fixed); await mount(page, { moonMission: await saved(page) }); expect(await transit(page)).toEqual(fixed);
  137 |   await page.getByText('Tune the departure and correction', { exact: true }).click();
  138 |   const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth })); expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
  139 |   const bounds = await page.locator('[data-transit-workspace] button, [data-transit-workspace] select, [data-transit-workspace] input').evaluateAll(nodes => nodes.map(node => {
  140 |     const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, height: box.height }; }));
  141 |   for (const box of bounds) { expect(box.left).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(320); expect(box.height).toBeGreaterThanOrEqual(32); }
  142 |   await accessible(page, info); await capture(page, info, 'transit-paused-320');
  143 |   const p = await profile(page), slider = page.locator('[data-transit-seek]'); await slider.focus(); await page.keyboard.press('End');
  144 |   await expect.poll(async () => (await transit(page)).time).toBeCloseTo(p.summary.duration, 6);
  145 |   await expect(page.locator('[data-transit-proceed]')).toBeEnabled(); expect((await saved(page)).transitRun.recorded).toBe(true);
  146 |   await page.getByRole('slider', { name: 'Departure speed error', exact: true }).focus(); await page.keyboard.press('ArrowRight');
  147 |   const changed = await saved(page); expect(changed.transitPlan.speedError).toBeGreaterThan(0); expect(changed.transitRun.time).toBe(0);
  148 |   expect(changed.transitRun.recorded).toBe(false); expect(changed.transitResult).toBeNull(); expect(changed.transitPaused).toBe(true);
  149 |   await expect(page.locator('[data-transit-proceed]')).toBeDisabled(); expect(changed.missionXP).toBe(0);
  150 | });
  151 | 
  152 | test('transit clock stops while hidden and resumes without catch-up', async ({ page }) => {
  153 |   await mount(page, seed({ animPaused: false, transitPlaybackRate: 1, transitRun: { version: 1, time: 20, recorded: false } }));
  154 |   const start = (await transit(page)).time; await expect.poll(async () => (await transit(page)).time).toBeGreaterThan(start + 0.2);
  155 |   await page.evaluate(async () => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange'));
  156 |     await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); });
  157 |   const hidden = await transit(page); await page.waitForTimeout(350); expect(await transit(page)).toEqual(hidden);
  158 |   const visible = await page.evaluate(async () => { delete (document as any).hidden; document.dispatchEvent(new Event('visibilitychange'));
  159 |     const cv = document.querySelector('[data-transit-canvas]') as HTMLCanvasElement, before = Number(cv.dataset.transitTime);
```