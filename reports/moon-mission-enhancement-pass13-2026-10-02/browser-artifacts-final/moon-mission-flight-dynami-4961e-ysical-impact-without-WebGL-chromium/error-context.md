# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: moon-mission-flight-dynamics.spec.ts >> the fallback view flies and reports a physical impact without WebGL
- Location: tests\e2e\moon-mission-flight-dynamics.spec.ts:70:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('[data-descent-callout]')
Expected substring: "HARD LANDING"
Received string:    "200 m — down 20.1 m/s, drifting 4.0 m/s."
Timeout: 35000ms

Call log:
  - Expect "toContainText" with timeout 35000ms
  - waiting for locator('[data-descent-callout]')
    22 × locator resolved to <div role="status" aria-live="polite" data-descent-callout="true">You have control. 269 m up, 13.5 m/s vertical spe…</div>
       - unexpected value "You have control. 269 m up, 13.5 m/s vertical speed."
    6 × locator resolved to <div role="status" aria-live="polite" data-descent-callout="true">250 m — down 15.6 m/s, drifting 4.0 m/s.</div>
      - unexpected value "250 m — down 15.6 m/s, drifting 4.0 m/s."
    3 × locator resolved to <div role="status" aria-live="polite" data-descent-callout="true">200 m — down 20.1 m/s, drifting 4.0 m/s.</div>
      - unexpected value "200 m — down 20.1 m/s, drifting 4.0 m/s."

```

```yaml
- status: 200 m — down 20.1 m/s, drifting 4.0 m/s.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { GlHarness } from './helpers/stem_gl_harness';
  3   | 
  4   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100, height: 1000, layout: 'document', appStyles: true });
  5   | const state = { moonMission: { missionPhase: 5, descentStarted: true, soundOff: true } };
  6   | test.beforeAll(async () => { await harness.start(); });
  7   | test.afterAll(async () => { await harness.stop(); });
  8   | test.afterEach(async ({ page }) => { await harness.destroy(page); });
  9   | test.describe.configure({ timeout: 150000, retries: 0 });
  10  | 
  11  | async function readFlight(page: any) {
  12  |   return page.locator('[data-descent-canvas]').evaluate((cv: HTMLCanvasElement) => ({
  13  |     time: Number(cv.dataset.descentElapsed), alt: Number(cv.dataset.descentAlt),
  14  |     mass: Number(cv.dataset.descentMass), fuel: Number(cv.dataset.descentFuel),
  15  |     speed: Number(cv.dataset.descentVspeed), thrust: Number(cv.dataset.descentThrust),
  16  |     x: Number(cv.dataset.descentX), paused: cv.dataset.descentPaused,
  17  |   }));
  18  | }
  19  | 
  20  | test('throttle drives the live mass model, pause freezes the entire flight, and instruments remain readable', async ({ page }, testInfo) => {
  21  |   const errors: string[] = [];
  22  |   page.on('pageerror', e => errors.push(e.message));
  23  |   await page.setViewportSize({ width: 1280, height: 1100 });
  24  |   await harness.mount(page, state, undefined, { expectCanvas: false });
  25  |   await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  26  |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'on');
  27  |   const before = await readFlight(page);
  28  |   await page.locator('[data-descent-throttle]').fill('65');
  29  |   await expect.poll(async () => (await readFlight(page)).thrust).toBeGreaterThan(0.6);
  30  |   await expect.poll(async () => (await readFlight(page)).mass).toBeLessThan(before.mass - 1);
  31  |   const burning = await readFlight(page);
  32  |   expect(burning.speed).toBeGreaterThan(before.speed);
  33  |   await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  34  |   await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  35  |   const paused = await readFlight(page);
  36  |   await page.waitForTimeout(600);
  37  |   expect(await readFlight(page)).toEqual(paused);
  38  |   await expect(page.locator('[data-descent-guidance]')).toContainText('Paused');
  39  |   await page.locator('[data-descent-throttle]').fill('0');
  40  |   await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  41  |   await expect.poll(async () => (await readFlight(page)).time).toBeGreaterThan(paused.time + 0.5);
  42  |   await expect(page.locator('[data-descent-canvas]')).toBeFocused();
  43  |   await expect.poll(async () => (await readFlight(page)).thrust).toBeLessThan(0.02);
  44  |   await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  45  |   await page.locator('[data-descent-canvas]').scrollIntoViewIfNeeded();
  46  |   await page.screenshot({ path: testInfo.outputPath('descent-desktop.png'), fullPage: true });
  47  |   expect(errors).toEqual([]);
  48  | });
  49  | 
  50  | test('phone instruments and controls fit the viewport and preserve keyboard operation', async ({ page }, testInfo) => {
  51  |   await page.setViewportSize({ width: 390, height: 844 });
  52  |   await page.goto(`${harness.url}/__harness`);
  53  |   await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  54  |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__mount({ moonMission: { missionPhase: 5, descentStarted: true, soundOff: true } }); });
  55  |   await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  56  |   await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  57  |   const lever = page.getByRole('slider', { name: 'Engine throttle', exact: true });
  58  |   await lever.focus();
  59  |   await page.keyboard.press('ArrowRight');
  60  |   await expect(lever).toHaveValue('1');
  61  |   const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  62  |   expect(overflow.scroll).toBeLessThanOrEqual(overflow.width + 1);
  63  |   for (const selector of ['[data-descent-pause]', '[data-descent-throttle]', '[data-descent-pad] button']) {
  64  |     const boxes = await page.locator(selector).evaluateAll(nodes => nodes.map(n => { const b = n.getBoundingClientRect(); return { x: b.x, right: b.right, height: b.height }; }));
  65  |     for (const b of boxes) { expect(b.x).toBeGreaterThanOrEqual(0); expect(b.right).toBeLessThanOrEqual(390); expect(b.height).toBeGreaterThanOrEqual(44); }
  66  |   }
  67  |   await page.screenshot({ path: testInfo.outputPath('descent-phone.png'), fullPage: true });
  68  | });
  69  | 
  70  | test('the fallback view flies and reports a physical impact without WebGL', async ({ page }, testInfo) => {
  71  |   await page.addInitScript(() => {
  72  |     const original = HTMLCanvasElement.prototype.getContext;
  73  |     (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
  74  |       if (/webgl/i.test(type)) return null;
  75  |       return (original as any).apply(this, [type, ...args]);
  76  |     };
  77  |   });
  78  |   await harness.mount(page, state, undefined, { expectCanvas: false });
  79  |   await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  80  |   await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  81  |   await page.locator('[data-descent-canvas]').scrollIntoViewIfNeeded();
  82  |   await page.screenshot({ path: testInfo.outputPath('descent-fallback.png'), fullPage: true });
  83  |   await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
> 84  |   await expect(page.locator('[data-descent-callout]')).toContainText('HARD LANDING', { timeout: 35000 });
      |                                                        ^ Error: expect(locator).toContainText(expected) failed
  85  |   await expect(page.locator('[data-flight-value="altitude"]')).toHaveText('0.0 m');
  86  |   await expect(page.locator('[data-flight-value="throttle"]')).toHaveText('0%');
  87  |   await expect(page.getByRole('button', { name: 'Pause flight', exact: true })).toBeDisabled();
  88  |   await page.getByRole('button', { name: 'Retry the powered descent from the start' }).click();
  89  |   await expect(page.locator('[data-descent-instruments]')).toHaveCount(0);
  90  |   await page.getByRole('button', { name: /Begin Descent/ }).click();
  91  |   await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  92  |   await expect(page.locator('[data-descent-throttle]')).toHaveValue('0');
  93  | });
  94  | 
  95  | test('a controlled approach reaches the dust layer and lands with fuel remaining', async ({ page }, testInfo) => {
  96  |   test.setTimeout(210000);
  97  |   await page.setViewportSize({ width: 1280, height: 1000 });
  98  |   await harness.mount(page, state, undefined, { expectCanvas: false });
  99  |   await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  100 |   // Fly through the actual keyboard/throttle controls using the displayed flight
  101 |   // measurements. This exercises the whole approach without injecting sim state.
  102 |   await page.evaluate(() => {
  103 |     const cv = document.querySelector('[data-descent-canvas]') as HTMLCanvasElement;
  104 |     const lever = document.querySelector('[data-descent-throttle]') as HTMLInputElement;
  105 |     (window as any).__approachPilot = setInterval(() => {
  106 |       if (!cv.isConnected || lever.disabled) { clearInterval((window as any).__approachPilot); return; }
  107 |       if (cv.dataset.descentPaused === 'true') return;
  108 |       const alt = Number(cv.dataset.descentAlt), v = Number(cv.dataset.descentVspeed);
  109 |       const lateral = Number(cv.dataset.descentHspeed), mass = Number(cv.dataset.descentMass);
  110 |       const target = -Math.max(0.9, Math.min(7, alt / 12));
  111 |       const tilted = Math.abs(lateral) > 0.3;
  112 |       const acceleration = 1.624 + 0.8 * (target - v);
  113 |       lever.value = String(Math.round(Math.max(0, Math.min(1, acceleration * mass / (46700 * (tilted ? Math.cos(0.35) : 1)))) * 100));
  114 |       lever.dispatchEvent(new Event('input', { bubbles: true }));
  115 |       cv.dispatchEvent(new KeyboardEvent(lateral > 0.3 ? 'keydown' : 'keyup', { key: 'a', bubbles: true }));
  116 |       cv.dispatchEvent(new KeyboardEvent(lateral < -0.3 ? 'keydown' : 'keyup', { key: 'd', bubbles: true }));
  117 |     }, 100);
  118 |   });
  119 |   await expect.poll(async () => (await readFlight(page)).alt, { timeout: 140000, intervals: [500] }).toBeLessThan(22);
  120 |   await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  121 |   const nearGround = await readFlight(page);
  122 |   expect(nearGround.alt).toBeGreaterThan(0);
  123 |   expect(nearGround.thrust).toBeGreaterThan(0.1);
  124 |   await page.locator('[data-descent-canvas]').scrollIntoViewIfNeeded();
  125 |   await page.screenshot({ path: testInfo.outputPath('descent-final-approach.png'), fullPage: true });
  126 |   await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  127 |   await expect(page.locator('[data-descent-callout]')).toContainText('CONTACT LIGHT', { timeout: 60000 });
  128 |   expect((await readFlight(page)).fuel).toBeGreaterThan(0);
  129 |   await expect(page.locator('[data-flight-value="altitude"]')).toHaveText('0.0 m');
  130 |   await expect(page.getByRole('button', { name: /Begin EVA/ })).toBeEnabled();
  131 |   await expect(page.locator('[data-landing-recorder]')).toBeVisible();
  132 |   const recorded = await page.evaluate(() => {
  133 |     const mission = (window as any).__toolData.moonMission;
  134 |     return { result: mission.landingResult, attempts: mission.landingAttempts };
  135 |   });
  136 |   expect(recorded.attempts).toHaveLength(1);
  137 |   const samples = recorded.result.recording.samples;
  138 |   expect(samples.length).toBeGreaterThan(20);
  139 |   expect(samples[0]).toMatchObject({ t: 0, alt: 300, v: -9, h: 4 });
  140 |   expect(samples.at(-1).alt).toBe(0);
  141 |   expect(Math.abs(samples.at(-1).v)).toBeCloseTo(recorded.result.vVel, 8);
  142 |   expect(samples.at(-1).t).toBeCloseTo((await readFlight(page)).time, 2);
  143 |   await page.waitForTimeout(3200); // allow airborne ejecta to settle after cutoff
  144 |   await page.locator('[data-descent-canvas]').scrollIntoViewIfNeeded();
  145 |   await page.screenshot({ path: testInfo.outputPath('descent-touchdown.png'), fullPage: true });
  146 | });
  147 | 
```