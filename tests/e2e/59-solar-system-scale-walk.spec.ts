import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({ mode: 'serial' });
const desktop = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1180, height: 900, appStyles: true });
const mobile = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 340, height: 820, appStyles: true });
const initial = { solarSystem: { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.earth', viewTab: 'overview', paused: true } };
test.beforeAll(async () => { await desktop.start(); await mobile.start(); });
test.afterAll(async () => { await desktop.stop(); await mobile.stop(); });
test.afterEach(async ({ page }) => { await desktop.destroy(page); });
async function start(page) { await page.getByRole('button', { name: 'Build a scale walk', exact: true }).click(); return page.locator('[data-solar-scale-walk]'); }

test('uses one conversion for physical sizes and distances and a linear map', async ({ page }) => {
  await desktop.mount(page, initial);
  const planner = await start(page);
  const earth = planner.locator('[data-scale-walk-world="Earth"]');
  const neptune = planner.locator('[data-scale-walk-world="Neptune"]');
  await expect(planner.locator('[data-scale-walk-world]')).toHaveCount(9);
  const meters = Number(await earth.getAttribute('data-distance-meters'));
  const mm = Number(await earth.getAttribute('data-diameter-mm'));
  expect(meters).toBeCloseTo(100 / 30.07, 8);
  expect(mm).toBeCloseTo(12742 * 100 / (30.07 * 149597870.7) * 1000, 8);
  expect(mm / 1000 / meters).toBeCloseTo(12742 / 149597870.7, 10);
  expect(Number(await neptune.getAttribute('data-distance-meters'))).toBeCloseTo(100, 8);
  const x = async (key: string) => Number(await planner.locator('[data-scale-map-marker="' + key + '"]').getAttribute('cx'));
  expect(((await x('Neptune')) - (await x('Sun'))) / ((await x('Earth')) - (await x('Sun')))).toBeCloseTo(30.07, 8);
  await expect(planner.getByRole('img')).toHaveAccessibleName(/markers are enlarged, not scaled diameters/);
  await planner.getByRole('button', { name: '1000 m', exact: true }).click();
  expect(Number(await earth.getAttribute('data-distance-meters'))).toBeCloseTo(meters * 10, 8);
  expect(Number(await earth.getAttribute('data-diameter-mm'))).toBeCloseTo(mm * 10, 8);
  await expect(planner.getByRole('button', { name: 'Try doubling this walk' })).toBeDisabled();
  for (const [value, expected] of [[-20, 10], [2000, 1000], ['invalid', 100]] as const) {
    await page.evaluate(value => { (window as any).__toolData.solarSystem.scaleWalkLength = value; (window as any).__rerender(); }, value);
    await expect(planner).toHaveAttribute('data-scale-walk-length', String(expected));
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('offers scale feedback and keeps the saved placement plan immutable', async ({ page }) => {
  await desktop.mount(page, initial);
  const planner = await start(page);
  await planner.getByRole('button', { name: 'They stay the same' }).click();
  await expect(planner.locator('[data-scale-walk-feedback]')).toContainText('mix two scales');
  await planner.getByRole('button', { name: 'They double too' }).click();
  await expect(planner.locator('[data-scale-walk-feedback]')).toContainText('ratios stay the same');
  await planner.getByRole('button', { name: 'Try doubling this walk' }).click();
  await expect(planner).toHaveAttribute('data-scale-walk-length', '200');
  await planner.getByLabel('My scale explanation (optional)').fill('Both distances and diameters double because the conversion factor is shared.');
  await planner.getByRole('button', { name: 'Save scale plan to journal' }).click();
  await expect(planner.getByRole('button', { name: 'Scale plan saved ✓' })).toBeDisabled();
  const entry = await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.at(-1));
  expect(entry.observation).toContain('Sun to Neptune = 200 m');
  expect(entry.observation).toContain('Neptune: 200.00 m');
  expect(entry.investigation).toEqual({ id: 'compare', explanation: 'Both distances and diameters double because the conversion factor is shared.' });
  await expect(page.locator('[data-learning-summary]')).toContainText('1/5 labs with linked evidence · 1/5 with an explanation');
  await planner.getByRole('button', { name: '10 m', exact: true }).click();
  await expect(planner.getByRole('button', { name: 'Save scale plan to journal' })).toBeEnabled();
  await planner.getByRole('button', { name: 'Close scale walk' }).click();
  await expect(planner).toHaveCount(0);
  await page.getByRole('button', { name: 'Build a scale walk', exact: true }).click();
  await expect(planner).toHaveAttribute('data-scale-walk-length', '10');
  await expect(planner.getByLabel('My scale explanation (optional)')).toHaveValue(entry.investigation.explanation);
  expect(await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.at(-1))).toEqual(entry);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('keeps precise numeric evidence readable on phones in both themes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.mount(page, initial);
  await page.getByRole('button', { name: 'Build a scale walk', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#solar-scale-walk-title')).toBeFocused();
  const planner = page.locator('[data-solar-scale-walk]');
  await planner.getByRole('button', { name: 'They stay the same' }).click();
  for (const dark of [false, true]) {
    await page.evaluate(value => { (window as any).__ctx.isDark = value; (window as any).__rerender(); }, dark);
    await expect(planner.locator('label').first()).toHaveCSS('color', dark ? 'rgb(241, 245, 249)' : 'rgb(15, 23, 42)');
    const map = planner.getByRole('region', { name: 'Scrollable scale walk distance map' });
    await map.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    expect(await map.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    for (const button of await planner.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box && box.height >= 44 && box.x >= 0 && box.x + box.width <= 341).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await map.evaluate(el => { el.scrollLeft = 0; });
    await planner.screenshot({ path: testInfo.outputPath(dark ? 'scale-walk-dark.png' : 'scale-walk-light.png') });
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
