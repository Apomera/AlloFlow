import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 1100, height: 780, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'], probes: "window.__testHooks={};document.documentElement.classList.add('theme-dark');" });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test('bumper feedback identifies each end and a lower repeat score preserves the personal best', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await harness.mount(page, { roadReady: { view: 'parking', reducedMotion: true, badges: { park_master: true }, parkingBest: { tightParallel: 80 } } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
  const metrics = page.getByRole('region', { name: 'Live parking measurements' });
  const pose = async (y: number) => page.evaluate(y => Object.assign((window as any).__testHooks.parking.carRef.current, { x: 285, y, heading: -Math.PI / 2, steering: 0, speed: 0 }), y);
  await pose(151);
  await expect(metrics).toContainText('Too close to the car ahead');
  await expect(metrics).not.toContainText('Too close to the car behind');
  await pose(174);
  await expect(metrics).toContainText('Too close to the car behind');
  await expect(metrics).not.toContainText('Too close to the car ahead');
  await pose(167.5);
  await expect(metrics).toContainText('Ready to secure');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: 'reports/roadready-review/parking-bumper-feedback-320.png', fullPage: true, scale: 'css' });
  await page.getByRole('button', { name: 'Park + parking brake', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Parking instructor' })).toContainText('100/100 (0 hits)');
  await page.getByRole('button', { name: 'Reset practice', exact: true }).click();
  await pose(150);
  await page.keyboard.down('w');
  await expect(page.locator('.rr-parking-scene-heading')).toContainText('Score 75/100 · Contacts 1');
  await page.keyboard.up('w');
  await pose(167.5);
  await expect(metrics).toContainText('Ready to secure');
  await page.getByRole('button', { name: 'Park + parking brake', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Parking instructor' })).toContainText('75/100 (1 hits)');
  await page.getByRole('button', { name: '← Parking practice', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Standard Parallel/ })).toContainText('Personal best: 100/100');
  await expect(page.getByRole('button', { name: /^Tight Parallel/ })).toContainText('Personal best: 80/100');
  const saved = await page.evaluate(() => Object.keys(localStorage).map(key => localStorage.getItem(key)).filter(Boolean).some(value => {
    try { const d = JSON.parse(value!); return d.standardParallel === 100 && d.tightParallel === 80; } catch { return false; }
  }));
  expect(saved).toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
test('a completed zero-score attempt remains visible in the parking menu', async ({ page }) => {
  await harness.mount(page, { roadReady: { view: 'parkingMenu', reducedMotion: true, parkingBest: { standardParallel: 0 } } }, undefined, { expectCanvas: false });
  await expect(page.getByRole('button', { name: 'Standard Parallel (medium), best score 0', exact: true })).toContainText('Personal best: 0/100');
});
