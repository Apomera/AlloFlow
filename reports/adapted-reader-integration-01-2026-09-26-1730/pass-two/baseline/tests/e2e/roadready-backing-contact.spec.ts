import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 1100, height: 780, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'], probes: "window.__testHooks={};document.documentElement.classList.add('theme-dark');" });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('backing corner contact stops held input, allows deliberate recovery, and resets', async ({ page }) => {
  await harness.mount(page, { roadReady: { view: 'backingDrill', reducedMotion: true } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => document.querySelector<HTMLCanvasElement>('#wrap canvas')?.height === 480 && !(window as any).__testHooks.maneuverDrill.carRef.current.requireParkingNeutral);
  const status = () => page.evaluate(() => (window as any).__testHooks.maneuverDrill.statusRef.current);
  const pose = () => page.evaluate(() => { const c = (window as any).__testHooks.maneuverDrill.carRef.current; return { x: c.x, y: c.y, speed: c.speed }; });
  await page.evaluate(() => Object.assign((window as any).__testHooks.maneuverDrill.carRef.current, { x: 288, y: 71, speed: 0, steering: 0 }));
  await page.keyboard.down('s');
  await expect.poll(status).toMatchObject({ score: 90, conesHit: 1, done: false });
  const stopped = await pose();
  expect(stopped.speed).toBe(0);
  expect(Math.hypot(stopped.x - 275, stopped.y - 100)).toBeGreaterThan(16);
  await expect.poll(() => page.evaluate(() => (window as any).__testHooks.maneuverDrill.carRef.current.requireParkingNeutral)).toBe(true);
  await page.waitForTimeout(300);
  expect(await pose()).toEqual(stopped);
  expect(await status()).toMatchObject({ score: 90, conesHit: 1 });
  await page.keyboard.up('s');
  await expect.poll(() => page.evaluate(() => !!(window as any).__testHooks.maneuverDrill.carRef.current.requireParkingNeutral)).toBe(false);
  await page.keyboard.down('w');
  await expect.poll(async () => (await pose()).y).toBeLessThan(stopped.y - 1);
  await page.keyboard.up('w');
  expect(await status()).toMatchObject({ score: 90, conesHit: 1 });
  await page.keyboard.press('r');
  await expect.poll(status).toEqual({ score: 100, conesHit: 0, done: false });
  expect(await pose()).toEqual({ x: 300, y: 80, speed: 0 });
  expect(await page.evaluate(() => (window as any).__testHooks.maneuverDrill.conesRef.current.some((cone: any) => cone.hit))).toBe(false);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('backing guidance and distance progress remain clear at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 950 });
  await harness.mount(page, { roadReady: { view: 'backingDrill', reducedMotion: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
  await page.waitForFunction(() => !(window as any).__testHooks.maneuverDrill.carRef.current.requireParkingNeutral);
  const guidance = page.getByRole('status', { name: 'Backing guidance' });
  await expect(guidance).toContainText('Reverse slowly. Keep the car centered between the cones.');
  await expect(page.getByRole('progressbar', { name: 'Distance to backing target' })).toHaveAttribute('value', '0');
  await page.evaluate(() => Object.assign((window as any).__testHooks.maneuverDrill.carRef.current, { y: 415 }));
  await expect(guidance).toContainText('Target approaching');
  await expect(page.getByRole('progressbar', { name: 'Distance to backing target' })).toHaveAttribute('value', '96');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'reports/roadready-review/backing-live-guidance-320.png', fullPage: true, animations: 'disabled' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
