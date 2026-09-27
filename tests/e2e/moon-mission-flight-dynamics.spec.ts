import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100, height: 1000, layout: 'document', appStyles: true });
const state = { moonMission: { missionPhase: 5, descentStarted: true, soundOff: true } };
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test.describe.configure({ timeout: 150000, retries: 0 });

async function readFlight(page: any) {
  return page.locator('[data-descent-canvas]').evaluate((cv: HTMLCanvasElement) => ({
    time: Number(cv.dataset.descentElapsed), alt: Number(cv.dataset.descentAlt),
    mass: Number(cv.dataset.descentMass), fuel: Number(cv.dataset.descentFuel),
    speed: Number(cv.dataset.descentVspeed), thrust: Number(cv.dataset.descentThrust),
    x: Number(cv.dataset.descentX), paused: cv.dataset.descentPaused,
  }));
}

test('throttle drives the live mass model, pause freezes the entire flight, and instruments remain readable', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 1100 });
  await harness.mount(page, state, undefined, { expectCanvas: false });
  await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'on');
  const before = await readFlight(page);
  await page.locator('[data-descent-throttle]').fill('65');
  await expect.poll(async () => (await readFlight(page)).thrust).toBeGreaterThan(0.6);
  await expect.poll(async () => (await readFlight(page)).mass).toBeLessThan(before.mass - 1);
  const burning = await readFlight(page);
  expect(burning.speed).toBeGreaterThan(before.speed);
  await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  const paused = await readFlight(page);
  await page.waitForTimeout(600);
  expect(await readFlight(page)).toEqual(paused);
  await expect(page.locator('[data-descent-guidance]')).toContainText('Paused');
  await page.locator('[data-descent-throttle]').fill('0');
  await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  await expect.poll(async () => (await readFlight(page)).time).toBeGreaterThan(paused.time + 0.5);
  await expect(page.locator('[data-descent-canvas]')).toBeFocused();
  await expect.poll(async () => (await readFlight(page)).thrust).toBeLessThan(0.02);
  await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  await page.locator('[data-descent-canvas]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('descent-desktop.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('phone instruments and controls fit the viewport and preserve keyboard operation', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__mount({ moonMission: { missionPhase: 5, descentStarted: true, soundOff: true } }); });
  await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  const lever = page.getByRole('slider', { name: 'Engine throttle', exact: true });
  await lever.focus();
  await page.keyboard.press('ArrowRight');
  await expect(lever).toHaveValue('1');
  const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.width + 1);
  for (const selector of ['[data-descent-pause]', '[data-descent-throttle]', '[data-descent-pad] button']) {
    const boxes = await page.locator(selector).evaluateAll(nodes => nodes.map(n => { const b = n.getBoundingClientRect(); return { x: b.x, right: b.right, height: b.height }; }));
    for (const b of boxes) { expect(b.x).toBeGreaterThanOrEqual(0); expect(b.right).toBeLessThanOrEqual(390); expect(b.height).toBeGreaterThanOrEqual(44); }
  }
  await page.screenshot({ path: testInfo.outputPath('descent-phone.png'), fullPage: true });
});

test('the fallback view flies and reports a physical impact without WebGL', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
      if (/webgl/i.test(type)) return null;
      return (original as any).apply(this, [type, ...args]);
    };
  });
  await harness.mount(page, state, undefined, { expectCanvas: false });
  await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  await page.locator('[data-descent-canvas]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('descent-fallback.png'), fullPage: true });
  await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  await expect(page.locator('[data-descent-callout]')).toContainText('HARD LANDING', { timeout: 35000 });
  await expect(page.locator('[data-flight-value="altitude"]')).toHaveText('0.0 m');
  await expect(page.locator('[data-flight-value="throttle"]')).toHaveText('0%');
  await expect(page.getByRole('button', { name: 'Pause flight', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Retry the powered descent from the start' }).click();
  await expect(page.locator('[data-descent-instruments]')).toHaveCount(0);
  await page.getByRole('button', { name: /Begin Descent/ }).click();
  await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  await expect(page.locator('[data-descent-throttle]')).toHaveValue('0');
});

test('a controlled approach reaches the dust layer and lands with fuel remaining', async ({ page }, testInfo) => {
  test.setTimeout(210000);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await harness.mount(page, state, undefined, { expectCanvas: false });
  await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  // Fly through the actual keyboard/throttle controls using the displayed flight
  // measurements. This exercises the whole approach without injecting sim state.
  await page.evaluate(() => {
    const cv = document.querySelector('[data-descent-canvas]') as HTMLCanvasElement;
    const lever = document.querySelector('[data-descent-throttle]') as HTMLInputElement;
    (window as any).__approachPilot = setInterval(() => {
      if (!cv.isConnected || lever.disabled) { clearInterval((window as any).__approachPilot); return; }
      if (cv.dataset.descentPaused === 'true') return;
      const alt = Number(cv.dataset.descentAlt), v = Number(cv.dataset.descentVspeed);
      const lateral = Number(cv.dataset.descentHspeed), mass = Number(cv.dataset.descentMass);
      const target = -Math.max(0.9, Math.min(7, alt / 12));
      const tilted = Math.abs(lateral) > 0.3;
      const acceleration = 1.624 + 0.8 * (target - v);
      lever.value = String(Math.round(Math.max(0, Math.min(1, acceleration * mass / (46700 * (tilted ? Math.cos(0.35) : 1)))) * 100));
      lever.dispatchEvent(new Event('input', { bubbles: true }));
      cv.dispatchEvent(new KeyboardEvent(lateral > 0.3 ? 'keydown' : 'keyup', { key: 'a', bubbles: true }));
      cv.dispatchEvent(new KeyboardEvent(lateral < -0.3 ? 'keydown' : 'keyup', { key: 'd', bubbles: true }));
    }, 100);
  });
  await expect.poll(async () => (await readFlight(page)).alt, { timeout: 140000, intervals: [500] }).toBeLessThan(22);
  await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  const nearGround = await readFlight(page);
  expect(nearGround.alt).toBeGreaterThan(0);
  expect(nearGround.thrust).toBeGreaterThan(0.1);
  await page.locator('[data-descent-canvas]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('descent-final-approach.png'), fullPage: true });
  await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  await expect(page.locator('[data-descent-callout]')).toContainText('CONTACT LIGHT', { timeout: 60000 });
  expect((await readFlight(page)).fuel).toBeGreaterThan(0);
  await expect(page.locator('[data-flight-value="altitude"]')).toHaveText('0.0 m');
  await expect(page.getByRole('button', { name: /Begin EVA/ })).toBeEnabled();
  await expect(page.locator('[data-landing-recorder]')).toBeVisible();
  const recorded = await page.evaluate(() => {
    const mission = (window as any).__toolData.moonMission;
    return { result: mission.landingResult, attempts: mission.landingAttempts };
  });
  expect(recorded.attempts).toHaveLength(1);
  const samples = recorded.result.recording.samples;
  expect(samples.length).toBeGreaterThan(20);
  expect(samples[0]).toMatchObject({ t: 0, alt: 300, v: -9, h: 4 });
  expect(samples.at(-1).alt).toBe(0);
  expect(Math.abs(samples.at(-1).v)).toBeCloseTo(recorded.result.vVel, 8);
  expect(samples.at(-1).t).toBeCloseTo((await readFlight(page)).time, 2);
  await page.waitForTimeout(3200); // allow airborne ejecta to settle after cutoff
  await page.locator('[data-descent-canvas]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('descent-touchdown.png'), fullPage: true });
});
