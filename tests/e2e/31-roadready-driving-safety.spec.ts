import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000 });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js',
  toolId: 'roadReady',
  width: 390,
  height: 720,
  preScripts: ['stem_lab/stem_lab_module.js'],
  probes: 'window.__testHooks = {};',
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function startDrive(page: any, state: Record<string, unknown>) {
  await page.setViewportSize({ width: 390, height: 720 });
  await harness.mount(page, { roadReady: state }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('residential', 'sedan'));
}

test('road-test status remains clear of mirrors and controls on a phone viewport', async ({ page }) => {
  await startDrive(page, {
    view: 'driving', scenario: 'residential', vehicle: 'sedan',
    roadTestStage: 'drive', calmDrive: true, reducedMotion: true,
  });

  const meter = page.locator('.rr-road-test-meter');
  const dock = page.locator('.rr-drive-dock');
  await expect(meter).toBeHidden();
  await expect(page.getByText('Fasten Your Seatbelt')).toBeVisible();
  await page.keyboard.press('b');
  await expect(page.getByText('Check Your Mirrors')).toBeVisible();
  await expect(meter).toBeHidden();
  await page.waitForTimeout(4400);
  await expect(meter).toBeVisible();
  await expect(meter).toHaveAttribute('role', 'timer');
  await expect(meter).toHaveAttribute('aria-live', 'off');
  expect(await page.evaluate(() => (window as any).__testHooks.roadReady.statsRef.current.crashes)).toBe(0);

  const layout = await page.evaluate(() => {
    const shell = document.querySelector('.rr-drive-shell')!.getBoundingClientRect();
    const meterRect = document.querySelector('.rr-road-test-meter')!.getBoundingClientRect();
    const dockRect = document.querySelector('.rr-drive-dock')!.getBoundingClientRect();
    return {
      meterTop: meterRect.top - shell.top,
      meterBottom: meterRect.bottom - shell.top,
      dockTop: dockRect.top - shell.top,
      meterLeft: meterRect.left - shell.left,
      meterRight: meterRect.right - shell.left,
      shellWidth: shell.width,
    };
  });
  expect(layout.meterTop).toBeGreaterThanOrEqual(76);
  expect(layout.meterBottom).toBeLessThan(layout.dockTop);
  expect(layout.meterLeft).toBeGreaterThanOrEqual(0);
  expect(layout.meterRight).toBeLessThanOrEqual(layout.shellWidth);
  await page.screenshot({ path: 'tests/e2e/artifacts/roadready-road-test-mobile.png' });
});

test('formal drives suspend a persisted Ride-Along preference', async ({ page }) => {
  await startDrive(page, {
    view: 'driving', scenario: 'residential', vehicle: 'sedan',
    roadTestStage: 'drive', rideAlong: true, calmDrive: true, reducedMotion: true,
  });

  await expect(page.locator('.rr-ridealong-state')).toHaveCount(0);
  await expect(page.getByText('Ride-Along is paused for evaluated drives. You are in control.')).toBeVisible();
  await expect(page.locator('canvas[role="application"]')).not.toHaveAttribute('aria-label', /automatically steers/);
  const state = await page.evaluate(() => ({
    rideAlongActive: (window as any).__testHooks.roadReady.rideAlongRef.current,
    belted: (window as any).__testHooks.roadReady.seatbeltRef.current.fastened,
    gear: (window as any).__testHooks.roadReady.gearRef.current,
  }));
  expect(state).toEqual({ rideAlongActive: false, belted: false, gear: 'P' });
});

test('Ride-Along rejects a real manual reverse shortcut', async ({ page }) => {
  await startDrive(page, {
    view: 'driving', scenario: 'residential', vehicle: 'sedan',
    rideAlong: true, calmDrive: true, reducedMotion: true,
  });
  await expect(page.locator('.rr-ridealong-state')).toContainText('Scan');
  await page.keyboard.press('g');
  const gear = await page.evaluate(() => (window as any).__testHooks.roadReady.gearRef.current);
  expect(gear).toBe('P');
  await expect(page.locator('canvas[role="application"]')).toHaveAttribute('aria-label', /automatically steers/);
});

test('a delayed Three.js load cannot restart a disposed drive', async ({ page }) => {
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.roadReady);
  await page.evaluate(() => {
    const w = window as any;
    w.__savedThree = w.THREE;
    w.THREE = null;
    w.StemLab.ensureThree = () => new Promise((resolve) => { w.__resolveThree = resolve; });
    w.__mount({ roadReady: {
      view: 'driving', scenario: 'residential', vehicle: 'sedan',
      calmDrive: true, reducedMotion: true,
    } });
  });
  await page.waitForFunction(() => typeof (window as any).__resolveThree === 'function');
  await page.evaluate(() => (window as any).__ctx.update('roadReady', 'view', 'menu'));
  await expect(page.locator('.rr-drive-shell')).toHaveCount(0);
  await page.evaluate(() => {
    const w = window as any;
    w.THREE = w.__savedThree;
    w.__resolveThree(w.THREE);
  });
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => ({
    scene: (window as any).__testHooks?.roadReady?.threeRef?.current || null,
    errors: (window as any).__events.errors.slice(),
    drivingShells: document.querySelectorAll('.rr-drive-shell').length,
  }));
  expect(state.scene).toBeNull();
  expect(state.drivingShells).toBe(0);
  expect(state.errors).toEqual([]);
});
