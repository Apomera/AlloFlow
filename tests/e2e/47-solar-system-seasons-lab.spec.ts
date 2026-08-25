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

const initialState = {
  solarSystem: {
    tutorialDismissed: true,
    selectedPlanet: 'stem.solar_sys.earth',
    viewTab: 'overview',
    paused: true,
    orr_paused: true,
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

test.afterEach(async ({ page }) => {
  await desktopHarness.destroy(page);
  await mobileHarness.destroy(page);
});

test('scrubs sunlight geometry, compares Uranus, and records evidence', async ({ page }) => {
  await desktopHarness.mount(page, initialState);

  await page.locator('[data-solarsystem-seasons-toggle]').click();
  const lab = page.locator('[data-solarsystem-seasons-lab]');
  await expect(lab).toBeVisible();
  await expect(lab).toHaveAttribute('data-season-world', 'Earth');
  await expect(lab).toHaveAttribute('data-season-phase', '25');

  const north = lab.locator('[data-season-hemisphere="north"]');
  const south = lab.locator('[data-season-hemisphere="south"]');
  await expect(north).toContainText('15.4 h');
  await expect(south).toContainText('8.6 h');
  await expect(north).toContainText('68.4°');
  const evidenceCheck = lab.locator('[data-solar-season-evidence-check]');
  await expect(evidenceCheck).toHaveAttribute('data-inquiry-stage', 'interpret');
  await expect(evidenceCheck).toContainText('Step 1 · Read the model evidence');

  await lab.getByRole('button', { name: '45° N' }).click();
  await expect(evidenceCheck).toHaveAttribute('data-inquiry-stage', 'evidence');
  await expect(lab.getByRole('status').last()).toContainText('Step 2 · Interpret');
  await expect(lab.getByRole('status').last()).toContainText('Your interpretation matches the model');
  await lab.getByRole('button', { name: 'Save interpretation + evidence to journal' }).click();
  await expect(lab.getByRole('button', { name: /Evidence saved to journal/ })).toBeDisabled();

  await lab.getByRole('button', { name: /uranus/i }).click();
  await lab.getByRole('button', { name: 'N summer' }).click();
  await expect(lab).toHaveAttribute('data-season-world', 'Uranus');
  await expect(north).toContainText('24.0 h');
  await expect(south).toContainText('0.0 h');
  await expect(lab).toContainText('97.77°');
  await expect(lab).toContainText('not a temperature or climate forecast');
});

test('keeps the seasons investigation usable without horizontal overflow at 340px', async ({ page }) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await mobileHarness.mount(page, initialState);

  await page.locator('[data-solarsystem-seasons-toggle]').click();
  const lab = page.locator('[data-solarsystem-seasons-lab]');
  await expect(lab).toBeVisible();
  await lab.getByRole('button', { name: /mars/i }).click();
  await lab.locator('#solar-season-phase').fill('75');
  await expect(lab).toHaveAttribute('data-season-world', 'Mars');
  await expect(lab).toHaveAttribute('data-season-phase', '75');
  await expect(lab.getByRole('button', { name: '45° S' })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
