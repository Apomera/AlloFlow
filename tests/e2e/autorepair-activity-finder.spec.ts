import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_autorepair.js', toolId: 'autoRepair', width: 1260, height: 900 });
test.describe.configure({ timeout: 120_000 });
test.beforeAll(async () => { await harness.start(); await mkdir('reports/automobile-workshop', { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test('topic finder opens matching activities, preserves search and restores category choices', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 1000 });
  await harness.mount(page, { autoRepair: { collapsedCats: { owning: true, 'fix-cat': true }, shop: { job: 'electrical', step: 2, hood: true } } }, undefined, { expectCanvas: false });
  await page.locator('[data-ar-find-activity]').click();
  const input = page.locator('#ar-activity-search'); await expect(input).toBeFocused();
  await input.pressSequentially('oil change');
  await expect(page.locator('[data-ar-module-card]')).toHaveCount(4);
  await expect(input).toBeFocused();
  await expect(page.locator('[data-ar-category-toggle="owning"]')).toHaveAttribute('aria-expanded', 'true');
  await page.locator('[data-ar-category-toggle="owning"]').click();
  await expect(page.locator('[data-ar-module-card]')).toHaveCount(1);
  await input.focus(); await input.press('Enter');
  await expect(page.locator('[data-ar-module-card="workshop"]')).toBeFocused();
  await expect(page.locator('[data-ar-module-card]')).toHaveCount(4);
  await page.locator('[data-ar-module-card="maint"]').click();
  await expect(page.locator('[data-ar-menu-dashboard]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to menu', exact: true }).click();
  await expect(input).toHaveValue('oil change');
  expect(await page.evaluate(() => (window as any).__toolData.autoRepair.shop)).toMatchObject({ job: 'electrical', step: 2, hood: true });
  await page.locator('[data-ar-search-clear]').click(); await expect(input).toBeFocused();
  await expect(page.locator('[data-ar-category-toggle="owning"]')).toHaveAttribute('aria-expanded', 'false');
  await page.locator('[data-ar-search-topic="3D"]').click();
  await expect(page.locator('[data-ar-module-card]')).toHaveCount(4);
  await page.locator('[data-ar-activity-finder]').screenshot({ path: 'reports/automobile-workshop/activity-finder-desktop.png' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
test('phone topic finder handles aliases, empty results and Escape without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await harness.mount(page, { autoRepair: {} }, undefined, { expectCanvas: false });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.maxWidth = '100%'; });
  await page.locator('[data-ar-find-activity]').click();
  const input = page.locator('#ar-activity-search');
  await input.fill('tyres'); const tyres = await page.locator('[data-ar-module-card]').evaluateAll(els => els.map(el => el.getAttribute('data-ar-module-card')));
  await input.fill('tires'); expect(await page.locator('[data-ar-module-card]').evaluateAll(els => els.map(el => el.getAttribute('data-ar-module-card')))).toEqual(tyres);
  await input.fill('zzzz-no-topic'); await expect(page.locator('[data-ar-search-empty]')).toBeVisible();
  await expect(page.locator('[data-ar-module-card]')).toHaveCount(0);
  await input.press('Enter'); await expect(input).toBeFocused();
  await input.press('Escape'); await expect(input).toHaveValue('');
  await page.locator('[data-ar-search-topic="Battery"]').click(); await expect(input).toBeFocused();
  await expect(page.locator('[data-ar-module-card="workshop"]')).toBeVisible();
  await page.locator('[data-ar-activity-finder]').screenshot({ path: 'reports/automobile-workshop/activity-finder-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('finder keeps readable controls and results in dark and high-contrast phone views', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await harness.mount(page, { autoRepair: { menuSearch: 'repair costs' } }, undefined, { expectCanvas: false });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.maxWidth = '100%'; });
  for (const contrast of [false, true]) {
    await page.evaluate(value => { const w=window as any; w.__ctx.isDark=true; w.__ctx.isContrast=value; w.__ctx.update('autoRepair', 'menuSearch', 'repair costs'); }, contrast);
    await page.locator('[data-ar-find-activity]').click();
    await expect(page.locator('#ar-activity-search')).toBeFocused();
    await expect(page.locator('[data-ar-module-card]')).toHaveCount(3);
    await expect(page.locator('[data-ar-search-topic="Repair costs"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-ar-activity-finder]').screenshot({ path: 'reports/automobile-workshop/activity-finder-' + (contrast ? 'contrast' : 'dark') + '.png' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
