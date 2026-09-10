import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 1100, height: 780, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'], probes: "window.__testHooks={};document.documentElement.classList.add('theme-dark');" });
test.beforeAll(async () => { await harness.start(); }); test.afterAll(async () => { await harness.stop(); }); test.afterEach(async ({ page }) => { await harness.destroy(page); });
for (const view of ['parking', 'tightParallel']) test(view + ' shows real clearance lines that can be hidden without changing the car', async ({ page }) => {
  await page.setViewportSize({ width: 1140, height: 950 });
  await harness.mount(page, { roadReady: { view, reducedMotion: true, badges: { park_master: true } } }, undefined, { expectCanvas: false });
  const y = view === 'parking' ? 167.5 : 163.5, sampleY = view === 'parking' ? 130 : 135;
  const pixel = () => page.evaluate(y => Array.from(document.querySelector('canvas')!.getContext('2d')!.getImageData(250, y, 1, 1).data).slice(0, 3), sampleY);
  await page.evaluate(y => Object.assign((window as any).__testHooks.parking.carRef.current, { x: 285, y, heading: -Math.PI / 2, speed: 0, steering: 0 }), y);
  const toggle = page.getByRole('checkbox', { name: 'Show clearance guides', exact: true });
  await expect(toggle).toBeChecked();
  await expect.poll(pixel).toEqual([34, 211, 238]);
  await toggle.uncheck();
  await expect.poll(pixel).toEqual([51, 65, 85]);
  expect(await page.evaluate(() => (window as any).__testHooks.parking.carRef.current.y)).toBe(y);
  await toggle.check();
  await expect.poll(pixel).toEqual([34, 211, 238]);
  await page.evaluate(y => Object.assign((window as any).__testHooks.parking.carRef.current, { y, speed: 0 }), view === 'parking' ? 151 : 160.5);
  await expect.poll(() => page.evaluate(y => Array.from(document.querySelector('canvas')!.getContext('2d')!.getImageData(250, y, 1, 1).data).slice(0, 3), view === 'parking' ? 123 : 133)).toEqual([251, 191, 36]);
  await page.evaluate(y => Object.assign((window as any).__testHooks.parking.carRef.current, { y, speed: 0 }), y);
  await expect.poll(pixel).toEqual([34, 211, 238]);
  if (view === 'parking') {
    await page.screenshot({ path: 'reports/roadready-review/parking-clearance-guides-desktop.png', fullPage: true, scale: 'css' });
    await page.setViewportSize({ width: 320, height: 844 });
    await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await page.screenshot({ path: 'reports/roadready-review/parking-clearance-guides-320.png', fullPage: true, scale: 'css' });
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
