import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js',
  toolId: 'beehive',
  width: 1280,
  height: 940,
  probes: 'window.__testHooks = {};',
});

test.describe.configure({ timeout: 180_000 });

test.describe('Beehive Drone Flight real WebGL acceptance', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('renders varied pixels, verifies the frame, and moves under flight controls', async ({ page }, testInfo) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await harness.mount(page, {
      beehive: { viewMode: 'drone', drone: { active: false, difficulty: 'easy' } },
    }, undefined, { expectCanvas: false });

    await page.locator('[data-mobile-rail="drone-difficulty"] button').first().click();
    const world = page.locator('[data-beehive-drone-webgl="true"]');
    const hud = page.locator('[data-beehive-drone-canvas="true"]');
    await world.waitFor({ state: 'visible', timeout: 30_000 });
    await expect(hud).toHaveAttribute('data-flight-renderer', 'three-webgl', { timeout: 30_000 });
    await expect(hud).toHaveAttribute('data-flight-frame-health', 'verified', { timeout: 60_000 });
    await expect(page.locator('[data-flight-renderer-badge="true"]')).toHaveText('3D scene verified');

    const beforePixels = await world.screenshot({ timeout: 60_000 });
    expect(beforePixels.length, 'Drone world should contain varied rendered pixels').toBeGreaterThan(8_000);
    await page.locator('#beehive-drone-playfield').screenshot({ path: testInfo.outputPath('beehive-drone-webgl-verified.png'), timeout: 60_000 });

    const before = await page.evaluate(() => {
      const state = (window as any).__testHooks.beehive.droneStateRef.current;
      return { x: state.x, z: state.z, speed: state.speed };
    });
    await hud.focus();
    await page.keyboard.down('ArrowUp');
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(650);
    await page.keyboard.up('ArrowLeft');
    await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(450);

    const after = await page.evaluate(() => {
      const state = (window as any).__testHooks.beehive.droneStateRef.current;
      return { x: state.x, z: state.z, speed: state.speed, yaw: state.yaw };
    });
    const afterPixels = await world.screenshot({ timeout: 60_000 });
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(1);
    expect(after.speed).toBeGreaterThan(before.speed);
    expect(after.yaw).toBeLessThan(0);
    expect(Buffer.compare(beforePixels, afterPixels), 'Camera motion should change the rendered world').not.toBe(0);
    expect(pageErrors).toEqual([]);
  });
});
