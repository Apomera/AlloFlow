import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ mode: 'serial' });

const desktopHarness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js',
  toolId: 'solarSystem',
  width: 1180,
  height: 900,
  appStyles: true,
});
const mobileHarness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js',
  toolId: 'solarSystem',
  width: 340,
  height: 820,
  appStyles: true,
});

const comparisonState = {
  solarSystem: {
    tutorialDismissed: true,
    selectedPlanet: 'stem.solar_sys.earth',
    viewTab: 'overview',
    showVisualCompare: true,
    compare1: 'stem.solar_sys.earth',
    compare2: 'stem.solar_sys.jupiter',
    showScale: true,
    paused: true,
  },
};

test.beforeAll(async () => {
  await desktopHarness.start();
  await mobileHarness.start();
});
test.afterAll(async () => {
  await desktopHarness.stop();
  await mobileHarness.stop();
});
test.afterEach(async ({ page }) => { await desktopHarness.destroy(page); });

test('compares diameter and weight force without changing mass', async ({ page }) => {
  await desktopHarness.mount(page, comparisonState);
  const visualCompare = page.locator('[data-solarsystem-visual-comparison]');
  const comparison = page.locator('[data-solar-planet-comparison="true"]');
  await expect(comparison).toBeVisible();
  await expect(visualCompare.getByText('Step 1 · Choose two worlds', { exact: true })).toBeVisible();
  await expect(comparison.getByText('Step 2 · Compare measurements', { exact: true })).toBeVisible();
  await expect(visualCompare.locator('[data-inquiry-stage="save"]')).toContainText('Step 3 · Save comparison evidence');
  await expect(comparison.locator('.solar-compare-stage')).toHaveAttribute('aria-label', /10\.97 times wider/);

  const table = comparison.getByRole('table');
  await expect(table.getByRole('row', { name: /Surface gravity/ })).toContainText('1.00g');
  await expect(table.getByRole('row', { name: /Surface gravity/ })).toContainText('2.53g');
  const forceRow = table.getByRole('row', { name: /70 kg mass: weight force/ });
  await expect(forceRow).toContainText('686 N');
  await expect(forceRow).toContainText('1,737 N');
  await expect(forceRow).not.toContainText('kg on');

  await page.getByRole('button', { name: 'Swap visually compared worlds' }).click();
  await expect(table.locator('thead th').nth(1)).toHaveText('stem.solar_sys.jupiter');
  await expect(table.locator('thead th').nth(2)).toHaveText('stem.solar_sys.earth');
});

test('keeps visual comparison and shared-scale bars inside 340px', async ({ page }) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await mobileHarness.mount(page, comparisonState);
  const comparison = page.locator('[data-solar-planet-comparison="true"]');
  const scale = page.getByRole('region', { name: 'All worlds on one linear diameter scale' });
  await expect(comparison).toBeVisible();
  await expect(scale).toBeVisible();
  expect(await scale.getByRole('img').count()).toBe(9);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  const controlLayout = await page.locator('[data-solarsystem-canvas-controls]').evaluate((controls) => {
    const strip = controls.getBoundingClientRect();
    const play = controls.querySelector('[data-solarsystem-playback-toggle]') as HTMLElement;
    const speed = controls.querySelector('[data-solarsystem-speed-control]') as HTMLElement;
    const slider = controls.querySelector('[data-solarsystem-speed-slider]') as HTMLElement;
    const reset = [...controls.querySelectorAll('button')].find((button) => button !== play) as HTMLElement;
    const items = [play, speed, reset];
    const rects = items.map((item) => item.getBoundingClientRect());
    return {
      noInternalOverflow: controls.scrollWidth <= controls.clientWidth + 1,
      allInside: rects.every((rect) => rect.left >= strip.left - 1 && rect.right <= strip.right + 1),
      noOverlap: rects.every((rect, index) => index === 0 || rect.left >= rects[index - 1].right - 1),
      targetHeights: [play.getBoundingClientRect().height, slider.getBoundingClientRect().height, reset.getBoundingClientRect().height],
    };
  });
  expect(controlLayout.noInternalOverflow).toBe(true);
  expect(controlLayout.allInside).toBe(true);
  expect(controlLayout.noOverlap).toBe(true);
  expect(controlLayout.targetHeights.every((height) => height >= 44)).toBe(true);
});
