import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 1100, height: 780, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'], probes: "window.__testHooks = {}; document.documentElement.classList.add('theme-dark');" });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test('parking lesson opens the real trainer; phone controls and legal completion work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await harness.mount(page, { roadReady: { view: 'scenarioSelect', reducedMotion: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
  await page.getByRole('button', { name: /^Parallel Parking\./ }).click();
  await expect(page.getByRole('heading', { name: /Parking Practice/ })).toBeVisible();
  await page.getByRole('button', { name: /^Standard Parallel/ }).click();
  await expect(page.getByRole('group', { name: 'Parking controls' })).toBeVisible();
  const start = await page.evaluate(() => ({ ...(window as any).__testHooks.parking.carRef.current }));
  expect(start.speed).toBe(0);
  expect(start.x).toBeLessThan(300);
  const reverse = page.getByRole('button', { name: 'Reverse', exact: true });
  await reverse.scrollIntoViewIfNeeded();
  const button = await reverse.boundingBox();
  await page.mouse.move(button!.x + button!.width / 2, button!.y + button!.height / 2);
  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => (window as any).__testHooks.parking.carRef.current.y)).toBeGreaterThan(start.y + 2);
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => Math.abs((window as any).__testHooks.parking.carRef.current.speed))).toBe(0);
  await page.getByRole('button', { name: 'Reset practice', exact: true }).click();
  await page.keyboard.down('s'); await page.keyboard.down('d');
  await expect.poll(() => page.evaluate(() => (window as any).__testHooks.parking.carRef.current.x)).toBeGreaterThan(start.x + 1);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.keyboard.up('s'); await page.keyboard.up('d');
  await expect.poll(() => page.evaluate(() => Math.abs((window as any).__testHooks.parking.carRef.current.speed))).toBe(0);
  await page.getByRole('button', { name: 'Reset practice', exact: true }).click();
  await page.screenshot({ path: 'reports/roadready-review/parking-start-mobile.png', fullPage: true, scale: 'css' });
  await page.evaluate(() => Object.assign((window as any).__testHooks.parking.carRef.current, { x: 280, y: 167.5, speed: 0, steering: 0, heading: -Math.PI / 2 }));
  await page.getByRole('button', { name: 'Park + parking brake', exact: true }).click();
  await expect(page.getByText('Keep clear of the curb and no more than 18 inches away.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => !!(window as any).__testHooks.parking.carRef.current.parkingBrake)).toBe(false);
  await page.evaluate(() => Object.assign((window as any).__testHooks.parking.carRef.current, { x: 285, y: 167.5, speed: 0, steering: 0 }));
  await page.getByRole('button', { name: 'Park + parking brake', exact: true }).click();
  await expect(page.getByText(/✓ Parked safely/)).toBeVisible();
  expect(await page.evaluate(() => (window as any).__testHooks.parking.carRef.current.parkingBrake)).toBe(true);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: 'reports/roadready-review/parking-complete-mobile.png', fullPage: true, scale: 'css' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
for (const scenario of ['residential', 'highway']) {
  test(scenario + ' starts stationary at the authored safe approach', async ({ page }) => {
    await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
    await page.setViewportSize({ width: 1140, height: 860 });
    await harness.mount(page, { roadReady: { view: 'scenarioBriefing', pendingScenario: scenario, scenario, vehicle: 'sedan', reducedMotion: true } }, undefined, { expectCanvas: false });
    await page.getByRole('button', { name: scenario === 'highway' ? 'Start Highway Merge' : 'Start Residential Street', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Fasten seatbelt', exact: true })).toBeVisible();
    const state = await page.evaluate((id) => {
      const hook = (window as any).__testHooks.roadReady;
      const rr = (window as any).__RR_TEST_EXPORTS__.roadReady;
      return { car: hook.carRef.current, expected: rr.drivingStartPose(hook.infiniteWorldRef.current, id, 81), gear: hook.gearRef.current, crashes: hook.statsRef.current.crashes };
    }, scenario);
    expect(state.car.x).toBeCloseTo(state.expected.x, 6);
    expect(state.car.y).toBeCloseTo(state.expected.y, 6);
    expect(state.car.heading).toBeCloseTo(state.expected.heading, 6);
    expect(state.gear).toBe('P'); expect(state.car.speed).toBe(0); expect(state.crashes).toBe(0);
    if (scenario === 'highway') {
      const meshes = await page.evaluate(() => {
        const found: any[] = [];
        (window as any).__testHooks.roadReady.threeRef.current.scene.traverse((node: any) => {
          if (node.name === 'rr-highway-ramp') found.push({ kind: 'surface', colors: Array.from(node.geometry.attributes.color.array), count: node.geometry.attributes.position.count });
          if (node.name === 'rr-highway-ramp-edge') found.push({ kind: 'edge' });
        });
        return found;
      });
      expect(meshes.some(m => m.kind === 'edge')).toBe(true);
      const surfaces = meshes.filter(m => m.kind === 'surface');
      expect(surfaces.length).toBeGreaterThan(0);
      for (const surface of surfaces) {
        expect(surface.colors.length).toBe(surface.count * 3);
        expect(surface.colors.every((c: number) => c > 0 && c <= 1)).toBe(true);
      }
    }
    await page.screenshot({ path: 'reports/roadready-review/start-' + scenario + '.png', scale: 'css' });
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
}
