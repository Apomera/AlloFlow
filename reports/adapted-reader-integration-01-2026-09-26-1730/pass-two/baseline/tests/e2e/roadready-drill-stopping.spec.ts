import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 1100, height: 780, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks={};' });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

for (const view of ['threePoint', 'backingDrill']) test(view + ' brakes against acceleration and clears held keys on reset', async ({ page }) => {
  await harness.mount(page, { roadReady: { view, reducedMotion: true } }, undefined, { expectCanvas: false });
  // A rendered frame confirms the keyboard effect attached; fixed delays can race startup.
  await page.waitForFunction(() => document.querySelector<HTMLCanvasElement>('#wrap canvas')?.height === 480);
  const speed = () => page.evaluate(() => (window as any).__testHooks.maneuverDrill.carRef.current.speed);
  await page.keyboard.down('w');
  await expect.poll(speed).toBeGreaterThan(2);
  await page.keyboard.down('Space');
  await expect.poll(speed).toBe(0);
  const pose = await page.evaluate(() => { const c = (window as any).__testHooks.maneuverDrill.carRef.current; return { x: c.x, y: c.y }; });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => { const c = (window as any).__testHooks.maneuverDrill.carRef.current; return { x: c.x, y: c.y }; })).toEqual(pose);
  await page.keyboard.up('Space');
  await expect.poll(speed).toBeGreaterThan(2);
  await page.keyboard.press('r');
  await page.waitForTimeout(200);
  expect(await speed()).toBe(0);
  await page.keyboard.up('w'); await page.keyboard.down('w');
  await expect.poll(speed).toBeGreaterThan(2);
  await page.keyboard.up('w');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('backing retains cone penalties and waits for a stopped finish, then resets cleanly', async ({ page }) => {
  await harness.mount(page, { roadReady: { view: 'backingDrill', reducedMotion: true } }, undefined, { expectCanvas: false });
  const status = () => page.evaluate(() => (window as any).__testHooks.maneuverDrill.statusRef.current);
  await page.evaluate(() => Object.assign((window as any).__testHooks.maneuverDrill.carRef.current, { x: 275, y: 100, speed: 0 }));
  await expect.poll(status).toMatchObject({ score: 90, conesHit: 1, done: false });
  await page.evaluate(() => Object.assign((window as any).__testHooks.maneuverDrill.carRef.current, { x: 275, y: 136, speed: 0 }));
  await expect.poll(status).toMatchObject({ score: 80, conesHit: 2, done: false });
  await expect.poll(()=>page.evaluate(()=>!!(window as any).__testHooks.maneuverDrill.carRef.current.requireParkingNeutral)).toBe(false);
  await page.evaluate(() => Object.assign((window as any).__testHooks.maneuverDrill.carRef.current, { x: 300, y: 451, speed: 0 }));
  await expect(page.getByText('Past the target. Ease forward into the green zone, then stop.', { exact: true })).toBeVisible();
  await page.evaluate(() => Object.assign((window as any).__testHooks.maneuverDrill.carRef.current, { y: 420 }));
  await expect(page.getByText('Continue reversing toward the green target zone, then hold the brake to stop.', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const hook = (window as any).__testHooks.maneuverDrill;
    Object.assign(hook.carRef.current, { x: 300, y: 431, speed: -4, steering: 0 });
    hook.keysRef.current.s = true;
  });
  await expect(page.getByText('Target reached. Hold the brake to come to a complete stop.', { exact: true })).toBeVisible();
  expect((await status()).done).toBe(false);
  await page.keyboard.down('Space');
  await expect.poll(status).toMatchObject({ score: 80, conesHit: 2, done: true });
  await expect(page.getByText(/Backed straight! Score: 80\/100/)).toBeVisible();
  await page.keyboard.up('Space'); await page.keyboard.press('r');
  await expect.poll(status).toEqual({ score: 100, conesHit: 0, done: false });
  expect(await page.evaluate(() => (window as any).__testHooks.maneuverDrill.conesRef.current.some((cone: any) => cone.hit))).toBe(false);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
