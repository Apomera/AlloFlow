import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 1100, height: 780, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks={};' });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

for (const view of ['parking', 'tightParallel']) test(view + ' pauses on interruption and supports Space to resume and reset', async ({ page }) => {
  await harness.mount(page, { roadReady: { view, reducedMotion: true, badges: { park_master: true } } }, undefined, { expectCanvas: false });
  await expect.poll(() => page.evaluate(() => !!(window as any).__testHooks.parking.carRef.current.requireParkingNeutral)).toBe(false);
  await page.keyboard.down('w');
  await expect.poll(() => page.evaluate(() => (window as any).__testHooks.parking.carRef.current.speed)).toBeGreaterThan(1);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.keyboard.up('w');
  const resume = page.getByRole('button', { name: 'Resume practice', exact: true });
  await expect(resume).toBeVisible();
  const pose = await page.evaluate(() => { const c = (window as any).__testHooks.parking.carRef.current; return { x: c.x, y: c.y }; });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => { const c = (window as any).__testHooks.parking.carRef.current; return { x: c.x, y: c.y, speed: c.speed }; })).toEqual({ ...pose, speed: 0 });
  await resume.focus(); await page.keyboard.press('Space');
  const pause = page.getByRole('button', { name: 'Pause practice', exact: true });
  await expect(pause).toBeVisible();
  await pause.focus(); await page.keyboard.press('Space');
  await expect(resume).toBeVisible();
  const reset = page.getByRole('button', { name: 'Reset practice', exact: true });
  await reset.focus(); await page.keyboard.press('Space');
  await expect(pause).toBeVisible();
  await expect(page.getByLabel('Car response')).toContainText('Stopped');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
