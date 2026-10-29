import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Render the current checkout with its compiled styles, never the deployed CDN.
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_nutritionlab.js', toolId: 'nutritionLab',
  width: 1200, height: 900, layout: 'document', appStyles: true,
  probes: `document.getElementById('wrap').style.width = '100%';`,
});

test.describe.configure({ timeout: 90000, retries: 0, mode: 'default' });
test.use({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce', video: 'off' });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(harness.url).origin
    ? route.continue() : route.abort('blockedbyclient'));
});
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, saved: Record<string, unknown> = {}) {
  await harness.mount(page, { nutritionLab: { view: 'labelReader', ...saved } }, undefined, { expectCanvas: false });
  await expect(page.getByRole('region', { name: 'Serving-size explorer' })).toBeVisible();
}
async function noPageOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
}

test('desktop exploration calculates fractions, equal portions and missing values with working keyboard answers', async ({ page }) => {
  await mount(page, { lr_idx: 1 });
  const explorer = page.getByRole('region', { name: 'Serving-size explorer' });
  await page.getByRole('combobox', { name: 'Amount to explore' }).selectOption('container');
  await expect(explorer.getByRole('row', { name: /Sodium/ })).toContainText('340 mg');
  await page.getByRole('button', { name: /^Challenge 3:/ }).click();
  await page.getByRole('combobox', { name: 'Amount to explore' }).selectOption('half');
  await expect(explorer.getByRole('row', { name: /Sodium/ })).toContainText(/1,?080 mg/);

  await page.getByRole('button', { name: /^Challenge 2:/ }).click();
  await page.getByRole('combobox', { name: 'Amount to explore' }).selectOption('equal');
  await page.getByRole('combobox', { name: 'Compare with' }).selectOption('yogurt');
  await expect(explorer.getByRole('row', { name: /Sodium/ })).toContainText('607.1 mg');
  await expect(explorer.getByRole('row', { name: /Sodium/ })).toContainText('Not listed');
  await page.evaluate(() => (window as any).__ctx.update('nutritionLab', 'unrelatedNote', 'preserve explorer'));
  await expect(page.getByRole('combobox', { name: 'Amount to explore' })).toHaveValue('equal');
  await expect(page.getByRole('combobox', { name: 'Compare with' })).toHaveValue('yogurt');

  const radios = page.getByRole('radiogroup').first().getByRole('radio');
  await radios.first().focus();
  await page.keyboard.press('ArrowLeft');
  await expect(radios.last()).toBeFocused();
  await expect(radios.last()).toBeChecked();
  await page.keyboard.press('Home');
  await expect(radios.first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(radios.last()).toBeFocused();
  await expect(page.getByRole('radiogroup').first().locator('[tabindex="0"]')).toHaveCount(1);
  await noPageOverflow(page);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await explorer.screenshot({ path: 'tmp/nutrition-label-desktop.png' });
  await test.info().attach('desktop-explorer', { path: 'tmp/nutrition-label-desktop.png', contentType: 'image/png' });
});

test('phone layout keeps serving controls and comparison readable without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mount(page, { lr_idx: 2 });
  const explorer = page.getByRole('region', { name: 'Serving-size explorer' });
  await page.getByRole('combobox', { name: 'Amount to explore' }).selectOption('half');
  await page.getByRole('combobox', { name: 'Compare with' }).selectOption('granola');
  await expect(explorer.getByRole('row', { name: /Sodium/ })).toContainText(/1,?080 mg/);
  await noPageOverflow(page);
  await explorer.screenshot({ path: 'tmp/nutrition-label-phone.png' });
  await test.info().attach('phone-explorer', { path: 'tmp/nutrition-label-phone.png', contentType: 'image/png' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
