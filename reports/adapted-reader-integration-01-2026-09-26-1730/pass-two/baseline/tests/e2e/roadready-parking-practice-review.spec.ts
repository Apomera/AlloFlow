import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 1100, height: 780, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'], probes: "window.__testHooks={};document.documentElement.classList.add('theme-dark');" });
test.beforeAll(async () => { await harness.start(); }); test.afterAll(async () => { await harness.stop(); }); test.afterEach(async ({ page }) => { await harness.destroy(page); });
async function finish(page: any) {
  await page.evaluate(() => Object.assign((window as any).__testHooks.parking.carRef.current, { x: 285, y: 167.5, heading: -Math.PI / 2, speed: 0, steering: 0 }));
  await expect(page.getByRole('region', { name: 'Live parking measurements' })).toContainText('Ready to secure');
  await page.getByRole('button', { name: 'Park + parking brake', exact: true }).click();
}
test('completion offers guided retries, preserves the best score, and opens the next drill', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await harness.mount(page, { roadReady: { view: 'parking', reducedMotion: true, badges: { park_master: true } } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
  await finish(page);
  const review = page.getByRole('region', { name: 'Parking practice review' });
  await expect(review).toBeFocused();
  await expect(review).toContainText('You parked without contact');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: 'reports/roadready-review/parking-practice-review-320.png', fullPage: true, scale: 'css' });
  await review.getByRole('button', { name: 'Retry without guides', exact: true }).click();
  await expect(review).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Parallel parking', exact: true })).toBeFocused();
  await expect(page.getByRole('checkbox', { name: 'Show clearance guides' })).not.toBeChecked();
  await expect(page.getByLabel('Current parking step')).toContainText('Step 1 of 5');
  await finish(page);
  await review.getByRole('button', { name: 'Retry with guides', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Show clearance guides' })).toBeChecked();
  await finish(page);
  await review.getByRole('button', { name: 'Try Tight Parallel', exact: true }).click();
  await expect(page.getByText('🅿️ Tight Parallel · hard', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '← Menu', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Standard Parallel/ })).toContainText('Personal best: 100/100');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
test('review acknowledges contact and recommends a guided retry', async ({ page }) => {
  await harness.mount(page, { roadReady: { view: 'parking', reducedMotion: true, badges: { park_master: true } } }, undefined, { expectCanvas: false });
  await page.evaluate(() => Object.assign((window as any).__testHooks.parking.carRef.current, { x: 285, y: 150, heading: -Math.PI / 2, speed: 0, steering: 0 }));
  await page.keyboard.down('w');
  await expect(page.locator('.rr-parking-scene-heading')).toContainText('Score 75/100 · Contacts 1');
  await page.keyboard.up('w');
  await finish(page);
  const review = page.getByRole('region', { name: 'Parking practice review' });
  await expect(review).toContainText('after 1 contact. Try again with guides');
  await expect(review).not.toContainText('without contact');
  await review.getByRole('button', { name: 'Retry with guides', exact: true }).click();
  await expect(page.locator('.rr-parking-scene-heading')).toContainText('Score 100/100 · Contacts 0');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
