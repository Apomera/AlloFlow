# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-return-orbit.spec.ts >> legacy and malformed saved arrival claims stay blocked until a measured review
- Location: tests\e2e\moon-mission-return-orbit.spec.ts:98:5

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator:  locator('[data-entry-begin]')
Expected: disabled
Received: enabled
Timeout:  15000ms

Call log:
  - Expect "toBeDisabled" with timeout 15000ms
  - waiting for locator('[data-entry-begin]')
    32 × locator resolved to <button data-entry-begin="true" title="Begin atmospheric re-entry sequence at about 39,700 kilometers per hour" class="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">🌊 Begin Re-entry Sequence</button>
       - unexpected value "enabled"

```

```yaml
- button "🌊 Begin Re-entry Sequence"
```

# Test source

```ts
  5   | import { GlHarness } from './helpers/stem_gl_harness';
  6   | 
  7   | const REPORT = resolve('reports/moon-mission-enhancement-pass8-2026-09-29/return');
  8   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100, height: 1000, layout: 'document', appStyles: true });
  9   | const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: { missionPhase: 8, animPaused: true, soundOff: true,
  10  |   missionXP: 0, missionLog: [], difficulty: 'pilot', earnedBadges: { first_step: true, mission_complete: true }, lunarSamples: [], quizCorrect: 0, ...extra } });
  11  | async function mount(page: Page, data = seed()) {
  12  |   await page.goto(harness.url + '/__harness');
  13  |   await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  14  |   await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999; (window as any).__mount(value); }, data);
  15  |   await expect(page.locator('[data-teicoast-canvas]')).toBeVisible();
  16  |   await expect.poll(() => page.locator('[data-teicoast-canvas]').getAttribute('data-return-elapsed')).not.toBeNull();
  17  | }
  18  | async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
  19  | async function profile(page: Page) {
  20  |   return page.evaluate(() => { const p = (window as any).MoonMissionPure.returnProfile((window as any).__toolData.moonMission.entryAngle); return { summary: p.summary, events: p.events }; });
  21  | }
  22  | async function live(page: Page) {
  23  |   return page.locator('[data-teicoast-canvas]').evaluate((cv: HTMLCanvasElement) => ({ time: Number(cv.dataset.returnElapsed), altitude: Number(cv.dataset.returnAltitude) * 1000,
  24  |     speed: Number(cv.dataset.returnSpeed), radialSpeed: Number(cv.dataset.returnRadialSpeed), tangentialSpeed: Number(cv.dataset.returnTangentialSpeed),
  25  |     gamma: Number(cv.dataset.returnAngle), x: Number(cv.dataset.returnX), y: Number(cv.dataset.returnY), vx: Number(cv.dataset.returnVx), vy: Number(cv.dataset.returnVy),
  26  |     separated: cv.dataset.returnSeparated === 'true', complete: cv.dataset.returnComplete === 'true', plume: cv.dataset.returnPlume }));
  27  | }
  28  | async function seek(page: Page, time: number) {
  29  |   const selected = Math.round(time * 10) / 10;
  30  |   await page.locator('[data-return-seek]').evaluate((input: HTMLInputElement, value) => {
  31  |     Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(value));
  32  |     input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  33  |   }, selected);
  34  |   await expect.poll(async () => Math.abs((await live(page)).time - selected)).toBeLessThan(0.11);
  35  | }
  36  | async function capture(page: Page, info: TestInfo, name: string) {
  37  |   await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
  38  |   await page.screenshot({ path, fullPage: true }); await info.attach(name, { path, contentType: 'image/png' });
  39  | }
  40  | async function painted(page: Page) {
  41  |   await expect.poll(async () => page.locator('[data-teicoast-canvas]').evaluate((cv: HTMLCanvasElement) => {
  42  |     const pixels = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data; let opaque = 0, count = 0; const colors = new Set<string>();
  43  |     for (let y = 20; y < cv.height; y += 20) for (let x = 20; x < cv.width; x += 20) { const i = (y * cv.width + x) * 4; count++; if (pixels[i + 3] > 100) opaque++; colors.add(Array.from(pixels.slice(i, i + 3)).join(',')); }
  44  |     return opaque / count > 0.95 && colors.size > 12;
  45  |   })).toBe(true);
  46  | }
  47  | test.describe.configure({ timeout: 180000, retries: 0 });
  48  | test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.destroy(page));
  49  | 
  50  | test('both return cameras use measured positions, distinct speed components and no engine plume', async ({ page }, info) => {
  51  |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  52  |   await mount(page); await expect(page.locator('[data-entry-begin]')).toBeDisabled(); await seek(page, 24 * 3600);
  53  |   const actual = await live(page), expected = await page.evaluate(time => { const P = (window as any).MoonMissionPure; return P.returnSample(P.returnProfile(), time); }, actual.time);
  54  |   for (const key of ['x', 'y', 'vx', 'vy', 'speed', 'radialSpeed', 'tangentialSpeed', 'gamma'] as const) expect(actual[key]).toBeCloseTo(expected[key], 6);
  55  |   expect(actual.plume).toBe('off'); expect(actual.separated).toBe(false); expect(actual.complete).toBe(false);
  56  |   expect(actual.speed).toBeCloseTo(Math.hypot(actual.radialSpeed, actual.tangentialSpeed), 7);
  57  |   await expect(page.locator('[data-return-readouts]')).toContainText('Earth-relative speed');
  58  |   await expect(page.locator('[data-return-readouts]')).toContainText('Radial closing speed');
  59  |   await painted(page); await capture(page, info, 'return-whole-orbit');
  60  |   await page.locator('[data-return-view]').selectOption('approach'); await painted(page); expect(await live(page)).toEqual(actual);
  61  |   await page.locator('[data-return-milestone="final"]').click(); const p = await profile(page);
  62  |   expect((await live(page)).time).toBeCloseTo(p.summary.duration - 900, 6);
  63  |   await expect(page.locator('[data-return-rate]')).toHaveValue('60'); await capture(page, info, 'return-final-approach');
  64  |   await page.locator('[data-return-milestone="separation"]').click(); await expect(page.locator('[data-return-rate]')).toHaveValue('1');
  65  |   const separated = await live(page); expect(separated.separated).toBe(true); expect(separated.complete).toBe(false);
  66  |   expect(separated.time).toBeCloseTo(p.summary.duration - 833, 6); expect(separated.plume).toBe('off');
  67  |   await capture(page, info, 'return-sm-separation'); expect(errors).toEqual([]);
  68  | });
  69  | 
  70  | test('recorded arrival survives review and reload, then passes the same boundary state into entry', async ({ page }, info) => {
  71  |   await mount(page); await page.locator('[data-return-arrival]').click(); await expect(page.locator('[data-entry-begin]')).toBeEnabled();
  72  |   const p = await profile(page), end = await live(page), state = await saved(page);
  73  |   expect(end.altitude).toBeCloseTo(122000, 5); expect(end.speed).toBeCloseTo(11030, 6); expect(end.gamma).toBeCloseTo(-6.5, 8);
  74  |   expect(end.radialSpeed).toBeCloseTo(-1248.63144786, 6); expect(state.returnRun.recorded).toBe(true); expect(state.missionXP).toBe(0);
  75  |   expect(state.returnResult.duration).toBe(p.summary.duration); await capture(page, info, 'return-entry-interface');
  76  |   await seek(page, 1000); await expect(page.locator('[data-entry-begin]')).toBeEnabled();
  77  |   const reviewed = await saved(page); await mount(page, seed(reviewed));
  78  |   expect((await live(page)).time).toBeCloseTo(1000, 6); await expect(page.locator('[data-entry-begin]')).toBeEnabled();
  79  |   await page.locator('[data-return-arrival]').click(); expect((await saved(page)).missionXP).toBe(0);
  80  |   await page.locator('[data-entry-begin]').click(); await expect(page.locator('[data-entry-canvas]')).toBeVisible();
  81  |   const entry = await saved(page); expect(entry.entryRun.angle).toBe(-6.5); expect(entry.entryRun.recorded).toBe(false); expect(entry.missionXP).toBe(0);
  82  |   const initial = await page.evaluate(() => { const P = (window as any).MoonMissionPure; return P.entrySample(P.entryProfile(-6.5), 0); });
  83  |   expect(initial.altitude).toBeCloseTo(end.altitude, 5); expect(initial.speed).toBeCloseTo(end.speed, 6); expect(initial.gamma * 180 / Math.PI).toBeCloseTo(end.gamma, 8);
  84  | });
  85  | 
  86  | test('planner changes clear arrival and maintain the new selected angle through the handoff', async ({ page }, info) => {
  87  |   await mount(page); await page.locator('[data-return-arrival]').click();
  88  |   await page.locator('[data-entry-preset="reference"]').click(); await expect(page.locator('[data-entry-begin]')).toBeEnabled();
  89  |   await page.locator('[data-entry-preset="shallow"]').click(); await expect(page.locator('[data-entry-begin]')).toBeDisabled();
  90  |   const reset = await saved(page); expect(reset.returnResult).toBeNull(); expect(reset.returnRun).toEqual({ version: 1, angle: -5, time: 0, recorded: false });
  91  |   await expect(page.locator('[data-entry-predicted-outcome]')).toHaveAttribute('data-entry-predicted-outcome', 'skip');
  92  |   await page.locator('[data-return-arrival]').click(); expect((await live(page)).gamma).toBeCloseTo(-5, 8);
  93  |   await capture(page, info, 'return-shallow-interface');
  94  |   await page.locator('[data-entry-begin]').click(); await expect(page.locator('[data-entry-canvas]')).toBeVisible();
  95  |   expect((await saved(page)).entryRun.angle).toBe(-5); expect((await saved(page)).missionXP).toBe(0);
  96  | });
  97  | 
  98  | test('legacy and malformed saved arrival claims stay blocked until a measured review', async ({ page }) => {
  99  |   await mount(page); const p = await profile(page);
  100 |   for (const extra of [
  101 |     { reentryStatus: 4 },
  102 |     { returnRun: { version: 2, angle: -6.5, time: p.summary.duration, recorded: true }, returnResult: { version: 1, ...p.summary } },
  103 |     { returnRun: { version: 1, angle: -6.5, time: p.summary.duration, recorded: true }, returnResult: { version: 1, ...p.summary, interfaceSpeed: 99999 } },
  104 |     { entryAngle: -5, returnRun: { version: 1, angle: -6.5, time: p.summary.duration, recorded: true }, returnResult: { version: 1, ...p.summary } },
> 105 |   ]) { await mount(page, seed(extra)); await expect(page.locator('[data-entry-begin]')).toBeDisabled(); expect((await saved(page)).missionPhase).toBe(8); }
      |                                                                                         ^ Error: expect(locator).toBeDisabled() failed
  106 |   await page.locator('[data-return-arrival]').click(); await expect(page.locator('[data-entry-begin]')).toBeEnabled();
  107 | });
  108 | 
  109 | test('the clock slows automatically, freezes when hidden and resumes without wall-time catch-up', async ({ page }) => {
  110 |   await mount(page); const p = await profile(page);
  111 |   await mount(page, seed({ returnRun: { version: 1, angle: -6.5, time: p.summary.duration - 1000, recorded: false }, returnPlaybackRate: 3600 }));
  112 |   await page.locator('[data-return-play-pause]').click(); await expect(page.locator('[data-return-rate]')).toHaveValue('60');
  113 |   await expect(page.locator('[data-return-view]')).toHaveValue('approach');
  114 |   await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  115 |   const before = await live(page); await page.waitForTimeout(500); expect(await live(page)).toEqual(before);
  116 |   await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  117 |   await expect.poll(async () => (await live(page)).time).toBeGreaterThan(before.time);
  118 |   await page.locator('[data-return-play-pause]').click(); const stopped = await live(page); await page.waitForTimeout(500); expect(await live(page)).toEqual(stopped);
  119 |   expect(stopped.time - before.time).toBeLessThan(60);
  120 | });
  121 | 
  122 | test('320px keyboard, pause, resize, reload and accessibility preserve the physical coast', async ({ page }, info) => {
  123 |   await page.setViewportSize({ width: 320, height: 1000 }); await mount(page); await seek(page, 36 * 3600);
  124 |   const before = await live(page); await page.setViewportSize({ width: 390, height: 1000 }); await painted(page); expect(await live(page)).toEqual(before);
  125 |   const state = await saved(page); await page.setViewportSize({ width: 320, height: 1000 }); await mount(page, seed(state));
  126 |   expect(await live(page)).toEqual(before); await page.locator('[data-return-seek]').focus(); await page.keyboard.press('End');
  127 |   await expect(page.locator('[data-entry-begin]')).toBeEnabled(); const end = await live(page); expect(end.complete).toBe(true); expect(end.separated).toBe(true);
  128 |   expect(end.time).toBe((await profile(page)).summary.duration); await painted(page);
  129 |   const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); expect(overflow).toBe(false);
  130 |   await page.locator('[data-return-model-note] summary').click();
  131 |   const axe = resolve('node_modules/axe-core/axe.min.js'); if (existsSync(axe)) {
  132 |     await page.addScriptTag({ path: axe }); const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-return-workspace]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  133 |     await mkdir(REPORT, { recursive: true }); await writeFile(join(REPORT, 'phone-axe.json'), JSON.stringify(violations, null, 2)); expect(violations).toEqual([]);
  134 |   }
  135 |   await capture(page, info, 'return-phone-320');
  136 | });
  137 | 
```