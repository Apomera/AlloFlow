import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 1100, height: 780, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'], probes: "window.__testHooks={};document.documentElement.classList.add('theme-dark');" });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
for (const view of ['parking', 'tightParallel']) test(view + ' controls reflect keyboard pause, securing and reset', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await harness.mount(page, { roadReady: { view, reducedMotion: true, badges: { park_master: true } } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
  const forward = page.getByRole('button', { name: 'Forward', exact: true });
  const secure = page.getByRole('button', { name: 'Park + parking brake', exact: true });
  await expect(forward).toBeEnabled();
  const pause = page.getByRole('button', { name: 'Pause practice', exact: true });
  await pause.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Resume practice', exact: true })).toBeFocused();
  await expect(forward).toBeDisabled(); await expect(secure).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reset practice', exact: true })).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Pause practice', exact: true })).toBeVisible();
  await expect(forward).toBeEnabled(); await expect(secure).toBeEnabled();
  // Incorrect active attempts still provide coaching rather than silently disabling Park.
  await secure.click();
  expect(await page.evaluate(() => !!(window as any).__testHooks.parking.carRef.current.parkingBrake)).toBe(false);
  await page.evaluate(view => {
    Object.assign((window as any).__testHooks.parking.carRef.current, { x: 285, y: view === 'parking' ? 167.5 : 163.5, heading: -Math.PI / 2, speed: 0, steering: 0 });
  }, view);
  await expect(page.getByRole('region', { name: 'Live parking measurements' })).toContainText('Ready to secure');
  await secure.click();
  await expect(page.getByRole('button', { name: 'Parking secured', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Practice complete', exact: true })).toBeDisabled();
  await expect(forward).toBeDisabled();
  if (view === 'parking') await page.screenshot({ path: 'reports/roadready-review/parking-controls-complete.png', fullPage: true, scale: 'css' });
  await page.getByRole('button', { name: 'Reset practice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause practice', exact: true })).toBeEnabled();
  await expect(secure).toBeEnabled(); await expect(forward).toBeEnabled();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
