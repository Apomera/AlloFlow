# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-launch-orbit.spec.ts >> launch instruments distinguish Earth rotation, air speed and the true pressure peak
- Location: tests\e2e\moon-mission-launch-orbit.spec.ts:97:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 5.684341886080802e-14
```

# Test source

```ts
  3   | import { join, resolve } from 'node:path';
  4   | import { GlHarness } from './helpers/stem_gl_harness';
  5   | 
  6   | const REPORT = resolve('reports/moon-mission-enhancement-pass4-2026-09-28/launch-orbit');
  7   | const harness = new GlHarness({
  8   |   toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  9   |   width: 1100, height: 1000, layout: 'document', appStyles: true,
  10  | });
  11  | const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  12  |   missionPhase: 1, animPaused: true, soundOff: true, missionXP: 0, missionLog: [],
  13  |   earnedBadges: { first_step: true, mission_complete: true },
  14  |   difficulty: 'pilot', lunarSamples: [], quizCorrect: 0, ...extra,
  15  | } });
  16  | 
  17  | async function mount(page: Page, data = seed()) {
  18  |   await page.goto(harness.url + '/__harness');
  19  |   await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  20  |   await page.evaluate(value => {
  21  |     document.getElementById('wrap')!.style.width = '100%';
  22  |     Math.random = () => 0.999; // Isolate the phase action from random mission events.
  23  |     (window as any).__mount(value);
  24  |   }, data);
  25  |   await expect(page.locator('[data-launch-canvas], [data-orbit-canvas]').first()).toBeVisible();
  26  | }
  27  | async function saved(page: Page) {
  28  |   return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
  29  | }
  30  | async function launch(page: Page) {
  31  |   return page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => ({
  32  |     time: Number(cv.dataset.launchTime), altitude: Number(cv.dataset.launchAltitude),
  33  |     speed: Number(cv.dataset.launchSpeed), airSpeed: Number(cv.dataset.launchAirSpeed),
  34  |     mass: Number(cv.dataset.launchMass), thrust: Number(cv.dataset.launchThrust),
  35  |     pressure: Number(cv.dataset.launchPressure), stage: Number(cv.dataset.launchStage),
  36  |     pitch: Number(cv.dataset.launchPitch), engine: cv.dataset.launchEngine,
  37  |   }));
  38  | }
  39  | async function orbit(page: Page) {
  40  |   return page.locator('[data-orbit-canvas]').evaluate((cv: HTMLCanvasElement) => ({
  41  |     time: Number(cv.dataset.orbitTime), window: cv.dataset.orbitWindow,
  42  |     altitude: Number(cv.dataset.orbitAltitude), speed: Number(cv.dataset.orbitSpeed),
  43  |     period: Number(cv.dataset.orbitPeriod), sunrises: Number(cv.dataset.orbitSunrises),
  44  |     shadow: cv.dataset.orbitShadow, engine: cv.dataset.orbitEngine,
  45  |   }));
  46  | }
  47  | async function profile(page: Page) {
  48  |   return page.evaluate(() => {
  49  |     const p = (window as any).MoonMissionPure.launchProfile();
  50  |     return { events: p.events, summary: p.summary };
  51  |   });
  52  | }
  53  | async function launchSample(page: Page, seconds: number) {
  54  |   return page.evaluate(time => {
  55  |     const P = (window as any).MoonMissionPure;
  56  |     return P.launchSample(P.launchProfile(), time);
  57  |   }, seconds);
  58  | }
  59  | async function seek(page: Page, seconds: number) {
  60  |   const time = Math.round(seconds * 10) / 10;
  61  |   await page.locator('[data-launch-seek]').evaluate((el: HTMLInputElement, value) => {
  62  |     Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(value));
  63  |     el.dispatchEvent(new Event('input', { bubbles: true }));
  64  |     el.dispatchEvent(new Event('change', { bubbles: true }));
  65  |   }, time);
  66  |   await expect.poll(async () => Math.abs((await launch(page)).time - time)).toBeLessThan(0.11);
  67  |   return time;
  68  | }
  69  | async function milestone(page: Page, name: string, time: number) {
  70  |   await page.locator('[data-launch-milestone="' + name + '"]').click();
  71  |   await expect.poll(async () => Math.abs((await launch(page)).time - time)).toBeLessThan(1e-6);
  72  | }
  73  | async function painted(page: Page, selector: string) {
  74  |   await expect.poll(async () => page.locator(selector).evaluate((cv: HTMLCanvasElement) => {
  75  |     const data = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
  76  |     let opaque = 0, total = 0; const colors = new Set<string>();
  77  |     for (let y = 10; y < cv.height; y += 20) for (let x = 10; x < cv.width; x += 20) {
  78  |       const i = (y * cv.width + x) * 4; total++;
  79  |       if (data[i + 3] > 100) opaque++;
  80  |       colors.add(Array.from(data.slice(i, i + 3)).join(','));
  81  |     }
  82  |     return opaque / total > 0.9 && colors.size > 12;
  83  |   }), { message: 'The resized, paused canvas should remain painted and varied' }).toBe(true);
  84  | }
  85  | async function capture(page: Page, info: TestInfo, name: string) {
  86  |   await mkdir(REPORT, { recursive: true });
  87  |   const path = join(REPORT, name + '-' + info.project.name + '.png');
  88  |   await page.screenshot({ path, fullPage: true });
  89  |   await info.attach(name, { path, contentType: 'image/png' });
  90  | }
  91  | 
  92  | test.describe.configure({ timeout: 180000, retries: 0 });
  93  | test.beforeAll(async () => harness.start());
  94  | test.afterAll(async () => harness.stop());
  95  | test.afterEach(async ({ page }) => harness.destroy(page));
  96  | 
  97  | test('launch instruments distinguish Earth rotation, air speed and the true pressure peak', async ({ page }, info) => {
  98  |   await mount(page);
  99  |   await expect(page.locator('[data-launch-value="time"]')).toHaveText('T−5.0 s');
  100 |   const pad = await launch(page);
  101 |   expect(pad.speed, 'Earth rotation is already part of inertial speed').toBeGreaterThan(390);
  102 |   expect(pad.speed).toBeLessThan(430);
> 103 |   expect(pad.airSpeed).toBe(0);
      |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  104 |   expect(pad.pressure).toBe(0);
  105 |   expect(pad.engine).toBe('off');
  106 |   expect(pad.thrust).toBe(0);
  107 |   await expect(page.locator('[data-launch-value="load"]')).toHaveText('1.00 g');
  108 |   await expect(page.locator('[data-launch-proceed]')).toBeDisabled();
  109 | 
  110 |   const p = await profile(page);
  111 |   await milestone(page, 'maxQ', p.events.maxQ.time);
  112 |   const reading = await launch(page), sample = await launchSample(page, p.events.maxQ.time);
  113 |   expect(reading.altitude).toBeCloseTo(sample.altitude, 6);
  114 |   expect(reading.mass).toBeCloseTo(sample.mass, 5);
  115 |   expect(reading.pressure).toBeCloseTo(0.5 * sample.density * reading.airSpeed ** 2, 5);
  116 |   expect(reading.pressure).toBeCloseTo(p.summary.peakQ, 5);
  117 |   expect(reading.pressure).toBeGreaterThan(20000);
  118 |   expect(reading.pressure).toBeLessThan(50000);
  119 |   expect(reading.altitude).toBeGreaterThan(8000);
  120 |   expect(reading.altitude).toBeLessThan(16000);
  121 |   await expect(page.locator('[data-launch-value="pressure"]')).toHaveText((sample.dynamicPressure / 1000).toFixed(2) + ' kPa');
  122 |   await expect(page.locator('[data-launch-value="speed"]')).toHaveText((sample.speed / 1000).toFixed(3) + ' km/s');
  123 |   await expect(page.locator('[data-launch-value="airSpeed"]')).toHaveText((sample.airSpeed / 1000).toFixed(3) + ' km/s');
  124 |   await expect(page.locator('[data-launch-value="mass"]')).toHaveText((sample.mass / 1000).toFixed(1) + ' t');
  125 |   expect((await saved(page)).missionXP).toBe(0);
  126 |   await painted(page, '[data-launch-canvas]');
  127 |   await capture(page, info, 'launch-maxq');
  128 | });
  129 | 
  130 | test('stage events shed mass, coast between engines and restart the next stage', async ({ page }, info) => {
  131 |   await mount(page);
  132 |   const p = await profile(page);
  133 |   for (const [name, expectedStage, minimumDrop, ignitionDelay] of [
  134 |     ['stage1', 2, 100000, 2.1], ['stage2', 3, 20000, 2.6],
  135 |   ] as const) {
  136 |     const event = p.events[name];
  137 |     await seek(page, event.time - 0.2);
  138 |     const before = await launch(page);
  139 |     await milestone(page, name, event.time);
  140 |     const separated = await launch(page);
  141 |     expect(separated.stage).toBe(expectedStage);
  142 |     expect(before.mass - separated.mass).toBeGreaterThan(minimumDrop);
  143 |     expect(separated.engine).toBe('off');
  144 |     expect(separated.thrust).toBe(0);
  145 |     await expect(page.locator('[data-launch-value="thrust"]')).toHaveText('0.00 MN');
  146 |     await seek(page, event.time + ignitionDelay);
  147 |     const burning = await launch(page);
  148 |     expect(burning.engine).toBe('on');
  149 |     expect(burning.thrust).toBeGreaterThan(500000);
  150 |     expect(burning.mass).toBeLessThan(separated.mass);
  151 |     expect(burning.pitch).toBeCloseTo((await launchSample(page, burning.time)).pitch, 6);
  152 |     if (expectedStage === 2) await capture(page, info, 'launch-stage2');
  153 |   }
  154 |   await capture(page, info, 'launch-stage2-separation');
  155 | });
  156 | 
  157 | test('a recorded insertion survives review and reload, then pays the launch reward once', async ({ page }, info) => {
  158 |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  159 |   await mount(page);
  160 |   const p = await profile(page);
  161 |   await page.locator('[data-launch-result]').click();
  162 |   await expect(page.locator('[data-launch-outcome="orbit"]')).toBeVisible();
  163 |   await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  164 |   const inserted = await launch(page), done = await saved(page);
  165 |   expect(inserted.time).toBeCloseTo(p.summary.duration, 6);
  166 |   expect(inserted.engine).toBe('off');
  167 |   expect(inserted.thrust).toBe(0);
  168 |   expect(done.launchRun.recorded).toBe(true);
  169 |   expect(done.launchResult.perigee).toBeGreaterThan(100000);
  170 |   expect(done.launchResult.apogee).toBeGreaterThanOrEqual(done.launchResult.perigee);
  171 |   expect(done.launchResult.eccentricity).toBeLessThan(0.1);
  172 |   expect(done.launchResult.propellantRemaining).toBeGreaterThan(0);
  173 |   expect(done.missionXP).toBe(0);
  174 |   await expect(page.locator('[data-launch-value="load"]')).toHaveText('0.00 g');
  175 |   await capture(page, info, 'launch-cutoff-orbit');
  176 |   await page.locator('[data-launch-result]').click();
  177 |   const reviewedTime = await seek(page, p.events.maxQ.time);
  178 |   const reviewed = await saved(page);
  179 |   expect(reviewed.launchResult).toEqual(done.launchResult);
  180 |   expect(reviewed.missionXP).toBe(0);
  181 |   await mount(page, { moonMission: reviewed });
  182 |   expect((await launch(page)).time).toBeCloseTo(reviewedTime, 1);
  183 |   await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  184 |   await page.locator('[data-launch-proceed]').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  185 |   await expect(page.locator('[data-orbit-canvas]')).toBeVisible();
  186 |   const orbitSave = await saved(page);
  187 |   expect(orbitSave.missionPhase).toBe(2);
  188 |   expect(orbitSave.missionXP).toBe(20);
  189 |   expect(orbitSave.launchAwarded).toBe(true);
  190 |   // Returning to the completed launch cannot farm its reward after the phase lock expires.
  191 |   await mount(page, { moonMission: { ...orbitSave, missionPhase: 1 } });
  192 |   await page.locator('[data-launch-proceed]').click();
  193 |   await expect(page.locator('[data-orbit-canvas]')).toBeVisible();
  194 |   expect((await saved(page)).missionXP).toBe(20);
  195 |   expect(errors).toEqual([]);
  196 | });
  197 | 
  198 | test('an old orbit flag with malformed playback cannot bypass the new insertion result', async ({ page }) => {
  199 |   await mount(page, seed({ launchStatus: 'orbit', launchRun: { version: 1, time: 'corrupt', recorded: true }, launchResult: {} }));
  200 |   await expect(page.locator('[data-launch-instruments]')).toContainText('earlier animation');
  201 |   await expect(page.locator('[data-launch-proceed]')).toBeDisabled();
  202 |   expect((await launch(page)).time).toBe(-5);
  203 |   expect((await saved(page)).launchResult).toBeNull();
```