import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady',
  width: 1100, height: 780, appStyles: true,
  preScripts: ['stem_lab/stem_lab_module.js'],
  probes: `window.__testHooks = {}; window.__clusterText = {};
    const originalText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, ...rest) {
      if (this.canvas.width >= 300 && this.canvas.height >= 600 && y >= this.canvas.height - 96) {
        const measured = this.measureText(String(text)).width;
        const left = this.textAlign === 'center' ? x - measured / 2 : this.textAlign === 'right' ? x - measured : x;
        window.__clusterText[String(text)] = { left, right: left + measured, y, width: this.canvas.width };
      }
      return originalText.call(this, text, x, y, ...rest);
    };`,
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('focused instruments fit phones, retain detailed HUD mode, and preserve the low-fuel alert', async ({ page }) => {
  await page.setViewportSize({ width: 1140, height: 860 });
  await harness.mount(page, { roadReady: {
    view: 'scenarioBriefing', pendingScenario: 'residential', scenario: 'residential',
    vehicle: 'sedan', reducedMotion: true, calmDrive: true,
  } }, undefined, { expectCanvas: false });
  await page.getByRole('button', { name: 'Start Residential Street', exact: true }).click();
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2, null, { timeout: 90000 }).catch(async error => {
    console.log('Startup state:', await page.evaluate(() => ({
      time: (window as any).__testHooks.roadReady.timeRef.current,
      errors: (window as any).__events.errors,
      toasts: (window as any).__events.toasts,
    })));
    throw error;
  });
  await page.keyboard.press('p');
  await page.keyboard.press('e');
  await expect.poll(() => page.evaluate(() => Object.keys((window as any).__clusterText))).toContain('Park');
  await page.screenshot({ path: 'reports/roadready-review/cluster-desktop.png', scale: 'css' });

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => {
      document.getElementById('wrap')!.style.width = '100%';
      (window as any).__clusterText = {};
    });
    await expect.poll(() => page.evaluate(() => (window as any).__clusterText.Park?.width)).toBe(width);
    const labels = await page.evaluate(() => (window as any).__clusterText);
    for (const label of ['MPH', 'LIMIT', 'GEAR', 'Park', 'FUEL', 'SAFETY', '100%']) {
      expect(labels[label], label).toBeTruthy();
      expect(labels[label].left, label).toBeGreaterThanOrEqual(0);
      expect(labels[label].right, label).toBeLessThanOrEqual(width);
    }
    expect(labels.ECO).toBeUndefined();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: 'reports/roadready-review/cluster-mobile-' + width + '.png', scale: 'css' });
  }
  await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    let lowFuelFlag = !!hook.statsRef.current._lowFuelAlerted;
    (window as any).__lowFuelTriggers = 0;
    Object.defineProperty(hook.statsRef.current, '_lowFuelAlerted', {
      configurable: true, get: () => lowFuelFlag,
      set: value => { if (value && !lowFuelFlag) (window as any).__lowFuelTriggers++; lowFuelFlag = value; },
    });
    hook.eventToastRef.current = null;
    hook.statsRef.current.fuelUsed = (48 / 3.78541) * 0.95;
    (window as any).__clusterText = {};
  });
  await expect.poll(() => page.evaluate(() => Object.keys((window as any).__clusterText))).toContain('LOW FUEL');
  await expect.poll(() => page.evaluate(() => (window as any).__lowFuelTriggers)).toBe(1);
  expect(await page.evaluate(() => (window as any).__testHooks.roadReady.eventToastRef.current?.msg)).toContain('Low fuel');
  await page.screenshot({ path: 'reports/roadready-review/cluster-low-fuel.png', scale: 'css' });

  await page.setViewportSize({ width: 1140, height: 860 });
  await page.getByRole('button', { name: /^Cycle driving HUD preset/ }).click();
  await page.getByRole('button', { name: /^Cycle driving HUD preset/ }).click();
  await page.evaluate(() => { (window as any).__clusterText = {}; });
  await expect.poll(() => page.evaluate(() => Object.keys((window as any).__clusterText))).toContain('x1000 RPM');
  expect(await page.evaluate(() => (window as any).__lowFuelTriggers)).toBe(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
