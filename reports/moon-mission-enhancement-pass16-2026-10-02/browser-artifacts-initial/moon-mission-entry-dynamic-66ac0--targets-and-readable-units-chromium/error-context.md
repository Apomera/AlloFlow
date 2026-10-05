# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-entry-dynamics-diagnostics.spec.ts >> 320 px diagrams and keyboard view controls retain accessible targets and readable units
- Location: tests\e2e\moon-mission-entry-dynamics-diagnostics.spec.ts:200:5

# Error details

```
Error: page.screenshot: Target page, context or browser has been closed
Browser logs:

<launching> C:\Users\cabba\AppData\Local\ms-playwright\chromium_headless_shell-1223\chrome-headless-shell-win64\chrome-headless-shell.exe --disable-field-trial-config --disable-background-networking --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-back-forward-cache --disable-breakpad --disable-client-side-phishing-detection --disable-component-extensions-with-background-pages --disable-component-update --no-default-browser-check --disable-default-apps --disable-dev-shm-usage --disable-edgeupdater --disable-extensions --disable-features=AvoidUnnecessaryBeforeUnloadCheckSync,BoundaryEventDispatchTracksNodeRemoval,DestroyProfileOnBrowserClose,DialMediaRouteProvider,GlobalMediaControls,HttpsUpgrades,LensOverlay,MediaRouter,PaintHolding,ThirdPartyStoragePartitioning,Translate,AutoDeElevate,RenderDocument,OptimizationHints,msForceBrowserSignIn,msEdgeUpdateLaunchServicesPreferredVersion --enable-features=CDPScreenshotNewSurface --allow-pre-commit-input --disable-hang-monitor --disable-ipc-flooding-protection --disable-popup-blocking --disable-prompt-on-repost --disable-renderer-backgrounding --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain --no-service-autorun --export-tagged-pdf --disable-search-engine-choice-screen --unsafely-disable-devtools-self-xss-warnings --edge-skip-compat-layer-relaunch --disable-infobars --disable-search-engine-choice-screen --disable-sync --enable-unsafe-swiftshader --headless --hide-scrollbars --mute-audio --blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4 --no-sandbox --user-data-dir=C:\Users\cabba\AppData\Local\Temp\playwright_chromiumdev_profile-Gcixgu --remote-debugging-pipe --no-startup-window
<launched> pid=15100
[pid=15100][err] [1002/215427.857:ERROR:gpu\ipc\client\command_buffer_proxy_impl.cc:285] ContextResult::kTransientFailure: Failed to send GpuControl.CreateCommandBuffer.
[pid=15100][err] Received fatal exception 0xe0000008
[pid=15100][err] 	KERNELBASE!LoadLibraryExW [0x7ffae81f79e8+1ee128]
Call log:
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded

```

# Test source

```ts
  1   | import { test, expect, type Page, type TestInfo } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { join, resolve } from 'node:path';
  4   | import { GlHarness } from './helpers/stem_gl_harness';
  5   | 
  6   | const REPORT = resolve(process.env.MM_ENTRY_DYNAMICS_REPORT_DIR || 'reports/moon-mission-enhancement-pass16-2026-10-02/browser/dynamics');
  7   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  8   |   width: 1100, height: 1000, layout: 'document', appStyles: true });
  9   | const GUIDED = { version: 2, mode: 'guided', bank: 0 };
  10  | const BALLISTIC = { version: 2, mode: 'ballistic', bank: 0 };
  11  | const BANK90 = { version: 2, mode: 'bank', bank: 90 };
  12  | const BANK180 = { version: 2, mode: 'bank', bank: 180 };
  13  | const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  14  |   missionPhase: 9, entryAngle: -6.5, entryPlan: GUIDED,
  15  |   entryRun: { version: 2, angle: -6.5, plan: GUIDED, time: 80, recovery: 0, recorded: false },
  16  |   entryDynamicsOpen: true, entryDynamicsView: 'forces', entryThermalOpen: false,
  17  |   animPaused: true, entryPaused: true, soundOff: true, missionXP: 0,
  18  |   entryAwardedXP: 0, entryCompletionAwarded: false,
  19  |   earnedBadges: { first_step: true, mission_complete: true }, difficulty: 'pilot',
  20  |   lunarSamples: [], quizCorrect: 0, ...extra,
  21  | } });
  22  | async function mount(page: Page, data = seed()) {
  23  |   await page.goto(harness.url + '/__harness');
  24  |   await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  25  |   await page.evaluate(value => {
  26  |     document.getElementById('wrap')!.style.width = '100%'; (window as any).__mount(value);
  27  |   }, data);
  28  |   await expect(page.locator('[data-entry-dynamics]')).toBeVisible();
  29  |   await expect.poll(async () => page.locator('[data-entry-dynamics]').getAttribute('data-entry-dynamics-time')).not.toBeNull();
  30  | }
  31  | async function saved(page: Page) {
  32  |   return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
  33  | }
  34  | async function evidence(page: Page) {
  35  |   const state = await saved(page);
  36  |   return Object.fromEntries(['entryAngle', 'entryPlan', 'entryRun', 'entryOutcome', 'entryAttempts',
  37  |     'missionXP', 'entryAwardedXP', 'entryCompletionAwarded'].map(key => [key, state[key] ?? null]));
  38  | }
  39  | async function time(page: Page) {
  40  |   return Number(await page.locator('[data-entry-dynamics]').getAttribute('data-entry-dynamics-time'));
  41  | }
  42  | async function setRange(page: Page, selector: string, value: number) {
  43  |   await page.locator(selector).evaluate((el: HTMLInputElement, next) => {
  44  |     Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(next));
  45  |     el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  46  |   }, value);
  47  | }
  48  | async function entryTime(page: Page, seconds: number) {
  49  |   const next = Math.round(seconds * 10) / 10;
  50  |   await setRange(page, '[data-entry-seek]', next);
  51  |   await expect.poll(async () => Math.abs((await time(page)) - next)).toBeLessThan(0.11);
  52  |   return time(page);
  53  | }
  54  | async function expected(page: Page, selectedTime?: number) {
  55  |   return page.evaluate(seconds => {
  56  |     const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
  57  |     const source = P.entryDynamicsSource(d), profile = P.entryDynamicsProfile(source);
  58  |     const sample = P.entryDynamicsSample(profile, seconds ?? P.cleanEntryState(d).entryRun?.time ?? 0);
  59  |     return { source: profile.source, summary: profile.summary, sample };
  60  |   }, selectedTime);
  61  | }
  62  | async function capture(page: Page, info: TestInfo, name: string) {
  63  |   await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
> 64  |   await page.screenshot({ path, fullPage: true }); await info.attach(name, { path, contentType: 'image/png' });
      |              ^ Error: page.screenshot: Target page, context or browser has been closed
  65  | }
  66  | async function forceReadings(page: Page) {
  67  |   const calculation = await expected(page, await time(page)), row = calculation.sample;
  68  |   const svg = page.locator('[data-entry-dynamics-diagram="forces"]');
  69  |   const scale = Number(await svg.getAttribute('data-acceleration-scale'));
  70  |   expect(scale).toBeGreaterThan(0); await expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
  71  |   for (const key of ['drag', 'lift', 'gravity', 'netPlane'] as const) {
  72  |     const vector = row.forces[key], glyph = svg.locator('[data-entry-dynamics-vector="' + key + '"]');
  73  |     const actual = await glyph.evaluate((el: SVGGElement) => {
  74  |       const line = el.querySelector('line')!, polygon = el.querySelector('polygon')!;
  75  |       return { x: Number(el.dataset.x), y: Number(el.dataset.y), magnitude: Number(el.dataset.magnitude),
  76  |         force: Number(el.dataset.forceMagnitude), visibility: el.getAttribute('visibility'),
  77  |         x1: Number(line.getAttribute('x1')), y1: Number(line.getAttribute('y1')),
  78  |         x2: Number(line.getAttribute('x2')), y2: Number(line.getAttribute('y2')), head: polygon.getAttribute('points') || '' };
  79  |     });
  80  |     expect(actual.x).toBeCloseTo(vector.x, 8); expect(actual.y).toBeCloseTo(vector.y, 8);
  81  |     expect(actual.magnitude).toBeCloseTo(vector.magnitude, 8); expect(actual.force).toBeCloseTo(vector.forceMagnitude, 6);
  82  |     expect(actual.x1).toBe(300); expect(actual.y1).toBe(180);
  83  |     expect(actual.x2 - actual.x1).toBeCloseTo(scale * vector.x, 8);
  84  |     expect(actual.y2 - actual.y1).toBeCloseTo(-scale * vector.y, 8);
  85  |     if (vector.magnitude > 1e-9) {
  86  |       expect(actual.visibility).toBe('visible'); const tip = actual.head.split(' ')[0].split(',').map(Number);
  87  |       expect(tip).toHaveLength(2); expect(tip[0]).toBeCloseTo(actual.x2, 8); expect(tip[1]).toBeCloseTo(actual.y2, 8);
  88  |     } else expect(actual.visibility).toBe('hidden');
  89  |     await expect(page.locator('[data-entry-dynamics-value="' + key + '"]')).toHaveText(
  90  |       vector.magnitude.toFixed(2) + ' m/s² · ' + (vector.forceMagnitude / 1000).toFixed(2) + ' kN');
  91  |   }
  92  |   const bank = page.locator('[data-entry-dynamics-diagram="bank"]'), bankScale = Number(await bank.getAttribute('data-lift-scale'));
  93  |   expect(Number(await bank.getAttribute('data-plane'))).toBeCloseTo(row.liftPlane, 8);
  94  |   expect(Number(await bank.getAttribute('data-lateral'))).toBeCloseTo(row.liftLateral, 8);
  95  |   expect(Number(await bank.getAttribute('data-full-lift'))).toBeCloseTo(row.liftMagnitude, 8);
  96  |   const full = bank.locator('[data-entry-dynamics-vector="fullLift"] line');
  97  |   expect(Number(await full.getAttribute('x2')) - 150).toBeCloseTo(bankScale * row.liftLateral, 8);
  98  |   expect(Number(await full.getAttribute('y2')) - 110).toBeCloseTo(-bankScale * row.liftPlane, 8);
  99  |   await expect(page.locator('[data-entry-dynamics-value="aeroLoadG"]')).toHaveText(row.aeroLoadG.toFixed(2) + ' g');
  100 |   await expect(page.locator('[data-entry-dynamics-value="reportedLoadG"]')).toHaveText(row.reportedLoadG.toFixed(2) + ' g');
  101 |   return calculation;
  102 | }
  103 | async function energyReadings(page: Page) {
  104 |   const calculation = await expected(page, await time(page)), row = calculation.sample, e = row.energy;
  105 |   for (const key of ['kinetic', 'potential', 'dragWork', 'initial'] as const) {
  106 |     await expect(page.locator('[data-entry-dynamics-value="' + key + '"]')).toHaveText((e[key] / 1e6).toFixed(3) + ' MJ/kg');
  107 |   }
  108 |   await expect(page.locator('[data-entry-dynamics-value="residual"]')).toHaveText((e.residual >= 0 ? '+' : '') + e.residual.toFixed(1) + ' J/kg');
  109 |   await expect(page.locator('[data-entry-dynamics-value="dragPower"]')).toHaveText(e.dragPower.toFixed(0) + ' W/kg');
  110 |   await expect(page.locator('[data-entry-dynamics-value="totalDragWork"]')).toHaveText((e.totalDragWork / 1e9).toFixed(3) + ' GJ');
  111 |   const svg = page.locator('[data-entry-dynamics-diagram="energy"]');
  112 |   const minimum = Number(await svg.getAttribute('data-energy-min')), maximum = Number(await svg.getAttribute('data-energy-max'));
  113 |   expect(maximum).toBeGreaterThan(minimum); expect(maximum).toBeGreaterThanOrEqual(e.initial);
  114 |   await expect(svg.locator('[data-entry-dynamics-trace]')).toHaveCount(3);
  115 |   const cursor = 10 + 580 * row.time / calculation.summary.duration;
  116 |   expect(Number(await svg.locator('[data-entry-dynamics-playhead]').getAttribute('x1'))).toBeCloseTo(cursor, 7);
  117 |   for (const key of ['kinetic', 'potential', 'dragWork'] as const) {
  118 |     const marker = svg.locator('[data-entry-dynamics-energy-marker="' + key + '"]');
  119 |     expect(Number(await marker.getAttribute('cx'))).toBeCloseTo(cursor, 7);
  120 |     expect(Number(await marker.getAttribute('cy'))).toBeCloseTo(170 - 160 * (e[key] - minimum) / (maximum - minimum), 7);
  121 |     const points = (await svg.locator('[data-entry-dynamics-trace="' + key + '"]').getAttribute('points'))!
  122 |       .split(' ').map(pair => pair.split(',').map(Number));
  123 |     expect(points.length).toBeGreaterThan(2); expect(points.every(p => p.length === 2 && p.every(Number.isFinite))).toBe(true);
  124 |     expect(points[0][0]).toBeCloseTo(10, 3); expect(points[points.length - 1][0]).toBeCloseTo(590, 3);
  125 |   }
  126 |   expect(Math.abs(e.initial - e.kinetic - e.potential - e.dragWork - e.residual)).toBeLessThan(1e-6);
  127 |   await expect(page.locator('[data-entry-dynamics-energy-note]')).toContainText('not the vehicle’s absorbed heat');
  128 |   return calculation;
  129 | }
  130 | 
  131 | test.describe.configure({ timeout: 180000, retries: 0 });
  132 | test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
  133 | test.afterEach(async ({ page }) => harness.destroy(page));
  134 | 
  135 | test('full lift, signed projection and physical glyph scales distinguish bank from ballistic motion', async ({ page }, info) => {
  136 |   const rows: Record<string, any> = {};
  137 |   for (const [name, plan] of [['bank90', BANK90], ['ballistic', BALLISTIC], ['bank180', BANK180]] as const) {
  138 |     await mount(page, seed({ entryPlan: GUIDED,
  139 |       entryRun: { version: 2, angle: -6.5, plan, time: 20, recovery: 0, recorded: false } }));
  140 |     const calculation = await expected(page); await entryTime(page, calculation.summary.peakDragPowerTime);
  141 |     const rendered = await forceReadings(page), row = rendered.sample; rows[name] = row;
  142 |     expect(row.forces.drag.x * row.velocity.x + row.forces.drag.y * row.velocity.y).toBeLessThan(0);
  143 |     expect(Math.abs(row.forces.lift.x * row.velocity.x + row.forces.lift.y * row.velocity.y)).toBeLessThan(1e-6);
  144 |     expect(row.forces.gravity.x).toBe(0); expect(row.forces.gravity.y).toBeLessThan(0);
  145 |     expect(row.forces.netPlane.x).toBeCloseTo(row.forces.drag.x + row.forces.lift.x, 8);
  146 |     expect(row.forces.netPlane.y).toBeCloseTo(row.forces.drag.y + row.forces.lift.y + row.forces.gravity.y, 8);
  147 |     await expect(page.locator('[data-entry-complete]')).toBeDisabled(); expect((await saved(page)).missionXP).toBe(0);
  148 |     await capture(page, info, 'dynamics-forces-' + name);
  149 |   }
  150 |   expect(rows.bank90.bank).toBe(90); expect(rows.bank90.liftLateral).toBeGreaterThan(0);
  151 |   expect(Math.abs(rows.bank90.liftPlane)).toBeLessThan(1e-8);
  152 |   expect(rows.bank90.aeroLoadG).toBeGreaterThan(rows.bank90.forces.drag.magnitude / 9.80665);
  153 |   expect(rows.ballistic.liftMagnitude).toBe(0); expect(rows.ballistic.liftLateral).toBe(0);
  154 |   expect(rows.bank180.bank).toBe(180); expect(rows.bank180.liftPlane).toBeLessThan(0);
  155 | });
  156 | 
  157 | test('force and energy views share the entry clock while thermal inspection stays independent', async ({ page }, info) => {
  158 |   await mount(page, seed({ entryPlan: BANK180, entryThermalOpen: true, entryThermalFollow: true }));
  159 |   const before = await evidence(page);
  160 |   await page.locator('[data-entry-dynamics-tab="energy"]').click();
  161 |   await energyReadings(page); expect(await evidence(page)).toEqual(before);
  162 |   await page.locator('[data-entry-dynamics-toggle]').click();
  163 |   await expect(page.locator('[data-entry-dynamics-panel]')).toHaveCount(0);
  164 |   await page.locator('[data-entry-dynamics-toggle]').click();
```