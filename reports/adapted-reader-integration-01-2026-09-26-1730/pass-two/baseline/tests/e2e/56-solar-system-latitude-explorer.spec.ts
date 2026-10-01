import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ mode: 'serial' });
const desktop = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1180, height: 900, appStyles: true });
const mobile = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 340, height: 820, appStyles: true });
const state = { solarSystem: { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.earth', viewTab: 'overview', showSeasonsLab: true, paused: true } };
test.beforeAll(async () => { await desktop.start(); await mobile.start(); });
test.afterAll(async () => { await desktop.stop(); await mobile.stop(); });
test.afterEach(async ({ page }) => { await desktop.destroy(page); });

test('compares equatorial and polar daylight and follows the shared orbital control', async ({ page }) => {
  await desktop.mount(page, state);
  const lab = page.locator('[data-solarsystem-seasons-lab]');
  const explorer = lab.locator('[data-season-latitude-explorer]');
  const north = explorer.locator('[data-latitude-reading="north"]');
  const south = explorer.locator('[data-latitude-reading="south"]');
  expect(Number(await north.getAttribute('data-daylight-hours'))).toBeCloseTo(15.43, 1);
  await explorer.getByRole('button', { name: /Equator/ }).click();
  await expect(explorer.locator('[data-latitude-range]')).toContainText('0.0 h seasonal range');
  for (const row of await explorer.locator('tbody tr').all()) {
    await expect(row.locator('td').first()).toHaveText('12.0');
    await expect(row.locator('td').last()).toHaveText('12.0');
  }
  await explorer.getByRole('button', { name: /Polar regions/ }).focus();
  await page.keyboard.press('Enter');
  await expect(north).toContainText('24.0 h');
  await expect(north).toContainText('Polar day');
  await expect(south).toContainText('0.0 h');
  await expect(south).toContainText('Polar night');
  await expect(explorer.getByRole('img')).toHaveAccessibleName(/Fixed scale: 0 to 24 hours/);
  // The main evidence-reading activity remains fixed at 45 degrees.
  await expect(lab.locator('[data-season-hemisphere="north"]')).toContainText('15.4 h');
  await lab.locator('#solar-season-phase').fill('75');
  await expect(north).toContainText('0.0 h');
  await expect(south).toContainText('24.0 h');
  await lab.locator('#solar-season-phase').fill('100');
  await expect(north).toContainText('12.0 h');
  await expect(south).toContainText('12.0 h');
  await explorer.getByRole('slider').fill('80');
  await explorer.getByRole('slider').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(explorer.getByRole('slider')).toHaveValue('79');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('preserves the explanation across worlds and saves immutable daylight evidence', async ({ page }) => {
  await desktop.mount(page, state);
  const lab = page.locator('[data-solarsystem-seasons-lab]');
  const explorer = lab.locator('[data-season-latitude-explorer]');
  await explorer.getByRole('button', { name: /Polar regions/ }).click();
  await explorer.getByLabel('Explain the pattern (optional)').fill('At 70 degrees the range is 24 hours; at the equator it is zero.');
  await explorer.getByRole('button', { name: 'Save latitude investigation to journal' }).click();
  await expect(explorer.getByRole('button', { name: 'Latitude evidence saved ✓' })).toBeDisabled();
  const entry = await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.at(-1));
  expect(entry.observation).toContain('Earth latitude investigation at ±70°');
  expect(entry.observation).toContain('June solstice: N 24.0 h, S 0.0 h');
  expect(entry.observation).toContain('December solstice: N 0.0 h, S 24.0 h');
  expect(entry.surprise).toContain('My explanation: At 70 degrees');
  await lab.getByRole('button', { name: /mars/i }).click();
  await expect(explorer).toHaveCount(0);
  await lab.getByRole('button', { name: /earth/i }).click();
  await expect(explorer.getByRole('slider')).toHaveValue('70');
  await expect(explorer.getByLabel('Explain the pattern (optional)')).toHaveValue('At 70 degrees the range is 24 hours; at the equator it is zero.');
  await lab.locator('#solar-season-phase').fill('75');
  await expect(explorer.getByRole('button', { name: 'Save latitude investigation to journal' })).toBeEnabled();
  await explorer.getByRole('button', { name: /Equator/ }).click();
  const preserved = await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.at(-1));
  expect(preserved).toEqual(entry);
});

test('keeps the chart and evidence readable on mobile in both themes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.mount(page, state);
  const explorer = page.locator('[data-season-latitude-explorer]');
  await explorer.getByRole('button', { name: /Polar regions/ }).click();
  for (const dark of [false, true]) {
    await page.evaluate(value => { (window as any).__ctx.isDark = value; (window as any).__rerender(); }, dark);
    const region = explorer.getByRole('region', { name: 'Scrollable annual daylight chart' });
    await region.focus();
    await page.keyboard.press('End');
    await region.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    expect(await region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    for (const button of await explorer.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box && box.height >= 44 && box.x >= 0 && box.x + box.width <= 341).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await region.evaluate(el => { el.scrollLeft = 0; });
    await explorer.screenshot({ path: testInfo.outputPath(dark ? 'latitude-dark.png' : 'latitude-light.png') });
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
