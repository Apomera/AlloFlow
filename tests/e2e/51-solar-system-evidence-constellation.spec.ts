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

function baseState(extra: Record<string, unknown> = {}) {
  return {
    solarSystem: {
      tutorialDismissed: true,
      selectedPlanet: 'stem.solar_sys.earth',
      viewTab: 'overview',
      paused: true,
      orr_paused: true,
      ...extra,
    },
  };
}

test.beforeAll(async () => { await desktopHarness.start(); await mobileHarness.start(); });
test.afterAll(async () => { await desktopHarness.stop(); await mobileHarness.stop(); });
test.afterEach(async ({ page }) => { await desktopHarness.destroy(page); await mobileHarness.destroy(page); });

test('guides Visual Compare into the same evidence workflow as the other labs', async ({ page }) => {
  await desktopHarness.mount(page, baseState());

  const hub = page.locator('[data-solarsystem-investigation-hub]');
  const constellation = hub.locator('[data-solarsystem-evidence-constellation]');
  await expect(hub.locator('[data-investigation-total]')).toHaveText('0/5 complete');
  await expect(constellation.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(constellation.locator('[data-investigation-next]')).toHaveAttribute('data-investigation-next', 'compare');
  await expect(constellation.locator('[data-investigation-constellation-id="compare"]')).toHaveAttribute('data-recommended', 'true');
  await expect(hub.locator('[data-investigation-id="compare"]')).toHaveAttribute('data-investigation-recommended', 'true');
  await expect(hub.locator('[data-investigation-id="compare"]')).toHaveAccessibleName(/Recommended next/);

  await constellation.locator('[data-investigation-next]').click();
  const comparison = page.locator('[data-solarsystem-visual-comparison]');
  await expect(comparison).toBeVisible();
  await comparison.locator('[data-solarsystem-compare-save]').click();

  await expect(hub.locator('[data-investigation-total]')).toHaveText('1/5 complete');
  await expect(constellation.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await expect(constellation.locator('[data-investigation-constellation-id="compare"]')).toHaveAttribute('data-complete', 'true');
  await expect(constellation.locator('[data-investigation-next]')).toHaveAttribute('data-investigation-next', 'seasons');
  await expect(constellation.locator('[data-investigation-constellation-id="compare"] .solar-evidence-check')).toHaveText('✓');
  await expect(hub.locator('[data-investigation-id="seasons"]')).toHaveAttribute('data-investigation-recommended', 'true');
});

test('completes the five-lab constellation and hands off to the existing journal', async ({ page }) => {
  await desktopHarness.mount(page, baseState({
    compareEvidenceSavedFor: 'Earth:Jupiter',
    seasonsEvidenceSaved: true,
    signalEvidenceSaved: true,
    gravityEvidenceSavedFor: 'Mars',
  }));

  const hub = page.locator('[data-solarsystem-investigation-hub]');
  const constellation = hub.locator('[data-solarsystem-evidence-constellation]');
  await expect(hub.locator('[data-investigation-total]')).toHaveText('4/5 complete');
  await expect(constellation.locator('[data-complete="true"]')).toHaveCount(4);
  await expect(constellation.locator('[data-investigation-next]')).toHaveAttribute('data-investigation-next', 'moon');

  await constellation.locator('[data-investigation-next]').click();
  const moonLab = page.locator('[data-solarsystem-moon-lab]');
  await moonLab.locator('[data-moon-prediction="none"]').click();
  await moonLab.getByRole('button', { name: 'Save Moon evidence to journal' }).click();

  await expect(hub.locator('[data-investigation-total]')).toHaveText('5/5 complete');
  await expect(constellation.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5');
  await expect(constellation.locator('[data-investigation-next]')).toHaveAttribute('data-investigation-next', 'journal');
  await expect(constellation.locator('[data-investigation-next]')).toHaveText('Review evidence journal');
  await constellation.locator('[data-investigation-next]').click();
  await expect(page.getByRole('button', { name: 'Close Journal' })).toBeAttached();
  const journalEntry = page.locator('[data-solar-journal-entry]').first();
  await expect(journalEntry).toBeVisible();
  await expect(journalEntry.locator('[data-journal-field]')).toHaveCount(4);
  await expect(journalEntry.locator('[data-journal-field="prediction"]')).toContainText('I predicted');
  await expect(journalEntry.locator('[data-journal-field="evidence"]')).toContainText('At phase angle');
});

test('keeps all five progress points and the next action readable at 340px', async ({ page }) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await mobileHarness.mount(page, baseState({ seasonsEvidenceSaved: true, signalEvidenceSaved: true }));

  const constellation = page.locator('[data-solarsystem-evidence-constellation]');
  await expect(constellation).toBeVisible();
  await expect(constellation.locator('[data-investigation-constellation-id]')).toHaveCount(5);
  await expect(constellation.locator('[data-investigation-next]')).toBeVisible();
  const box = await constellation.boundingBox();
  expect(box && box.x >= -1 && box.x + box.width <= 341).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
