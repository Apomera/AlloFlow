import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ mode: 'serial' });
const desktop = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1180, height: 900, appStyles: true });
const mobile = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 340, height: 820, appStyles: true });
const state = { solarSystem: { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.earth', viewTab: 'overview', showMoonLab: true, moonPhaseAngle: 0, moonNodeOffset: 0, paused: true } };
test.beforeAll(async () => { await desktop.start(); await mobile.start(); });
test.afterAll(async () => { await desktop.stop(); await mobile.stop(); });
test.afterEach(async ({ page }) => { await desktop.destroy(page); });

test('navigates all eight phases and wraps the cycle using keyboard controls', async ({ page }) => {
  await desktop.mount(page, state);
  const lab = page.locator('[data-solarsystem-moon-lab]');
  const phases = lab.locator('[data-moon-phase-preset]');
  await expect(phases).toHaveCount(8);
  const readings = [0, 15, 50, 85, 100, 85, 50, 15];
  for (let index = 0; index < 8; index++) {
    await phases.nth(index).click();
    await expect(lab.locator('[data-moon-illuminated-value]')).toHaveText(readings[index] + '%');
    await expect(phases.nth(index)).toHaveAttribute('aria-pressed', 'true');
    await expect(lab.locator('[data-moon-phase-cycle] [aria-pressed="true"]')).toHaveCount(1);
  }
  await lab.getByRole('button', { name: 'Next phase', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(lab).toHaveAttribute('data-moon-phase-angle', '0');
  await lab.getByRole('button', { name: 'Previous phase', exact: true }).click();
  await expect(lab).toHaveAttribute('data-moon-phase-angle', '315');
  const slider = lab.getByLabel('Moon phase angle', { exact: true });
  await slider.focus();
  await page.keyboard.press('Home');
  for (let index = 0; index < 20; index++) await page.keyboard.press('ArrowRight');
  await expect(lab.locator('[data-moon-cycle-reading]')).toContainText('Waxing crescent');
  await expect(lab.locator('[data-moon-cycle-reading]')).not.toContainText('New Moon');
});

test('withholds the diagram answer until prediction and preserves evidence when changing view', async ({ page }) => {
  await desktop.mount(page, state);
  const lab = page.locator('[data-solarsystem-moon-lab]');
  const diagram = lab.locator('.solar-moon-stage svg');
  await expect(diagram).not.toHaveAttribute('aria-label', /Solar-eclipse alignment/);
  await expect(diagram).not.toContainText('Solar-eclipse alignment');
  await expect(diagram).toContainText('Predict an alignment');
  await lab.locator('[data-moon-prediction="solar"]').click();
  await expect(diagram).toHaveAttribute('aria-label', /Solar-eclipse alignment/);
  await expect(diagram).toContainText('Solar-eclipse alignment');
  await lab.getByRole('button', { name: /Save Moon evidence to journal/ }).click();
  await lab.getByRole('button', { name: 'Southern view', exact: true }).click();
  await expect(lab.locator('[data-moon-disk-orientation]')).toHaveAttribute('transform', 'rotate(180 607 164)');
  await expect(lab).toHaveAttribute('data-moon-illuminated', '0');
  await expect(lab.locator('[data-moon-alignment-result]')).toHaveAttribute('data-moon-alignment-result', 'solar');
  await expect(lab.getByRole('button', { name: /Moon evidence saved/ })).toBeDisabled();
  await lab.getByRole('button', { name: 'Next phase', exact: true }).click();
  await expect(lab.locator('[data-moon-alignment-result]')).toHaveAttribute('data-moon-alignment-result', 'hidden');
  await expect(diagram).toContainText('Predict an alignment');
  await expect(diagram).not.toContainText('No eclipse alignment');
  expect(await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.length)).toBe(1);
});

test('keeps the eight-phase navigator legible at 340px in both themes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.mount(page, state);
  const cycle = page.locator('[data-moon-phase-cycle]');
  for (const dark of [false, true]) {
    await page.evaluate(value => { (window as any).__ctx.isDark = value; (window as any).__rerender(); }, dark);
    const buttons = cycle.getByRole('button');
    await expect(buttons).toHaveCount(8);
    for (const button of await buttons.all()) {
      const box = await button.boundingBox();
      expect(box && box.width >= 44 && box.height >= 44 && box.x >= 0 && box.x + box.width <= 341).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await cycle.locator('..').screenshot({ path: testInfo.outputPath(dark ? 'moon-cycle-dark.png' : 'moon-cycle-light.png') });
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
