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

test.beforeAll(async () => { await desktopHarness.start(); await mobileHarness.start(); });
test.afterAll(async () => { await desktopHarness.stop(); await mobileHarness.stop(); });
test.afterEach(async ({ page }) => { await desktopHarness.destroy(page); await mobileHarness.destroy(page); });

test('models changing Earth-Mars signal time and records the evidence', async ({ page }) => {
  await desktopHarness.mount(page, initialState);

  await page.locator('[data-solarsystem-signal-toggle]').click();
  const lab = page.locator('[data-solarsystem-signal-lab]');
  await expect(lab).toBeVisible();
  await expect(lab).toHaveAttribute('data-signal-target', 'Mars');
  await expect(lab).toHaveAttribute('data-signal-angle', '0');
  await expect(lab.locator('[data-signal-one-way]')).toHaveText('4.4 min');
  await expect(lab.locator('[data-signal-round-trip]')).toHaveText('8.7 min');
  const inquiry = lab.locator('[data-inquiry-stage]');
  await expect(inquiry).toHaveAttribute('data-inquiry-stage', 'predict');
  await expect(inquiry).toContainText('Step 1 · Commit an ungraded hypothesis');

  await lab.getByRole('button', { name: 'Far alignment' }).click();
  await expect(lab).toHaveAttribute('data-signal-angle', '180');
  await expect(lab.locator('[data-signal-one-way]')).toHaveText('21.0 min');
  await expect(lab.locator('[data-signal-round-trip]')).toHaveText('42.0 min');
  await expect(lab).toContainText('Solar-conjunction caution');

  await lab.getByRole('button', { name: 'Send a light-speed ping' }).click();
  await expect(lab.getByText('Ping sent.', { exact: false })).toBeVisible();
  await lab.getByRole('button', { name: 'Increases' }).click();
  await expect(inquiry).toHaveAttribute('data-inquiry-stage', 'evidence');
  await expect(lab.getByRole('status').last()).toContainText('Step 2 · Compare');
  await expect(lab.getByRole('status').last()).toContainText('Evidence supports your hypothesis');
  await lab.getByRole('button', { name: 'Save signal evidence to journal' }).click();
  await expect(lab.getByRole('button', { name: /Signal evidence saved/ })).toBeDisabled();

  await lab.locator('[data-signal-target-option="Neptune"]').click();
  await expect(lab).toHaveAttribute('data-signal-target', 'Neptune');
  await expect(lab.locator('[data-signal-one-way]')).toHaveText('4.3 h');
});

test('keeps the signal investigation usable and exclusive at 340px', async ({ page }) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await mobileHarness.mount(page, initialState);

  await page.locator('[data-solarsystem-seasons-toggle]').click();
  await expect(page.locator('[data-solarsystem-seasons-lab]')).toBeVisible();
  await page.locator('[data-solarsystem-signal-toggle]').click();
  const lab = page.locator('[data-solarsystem-signal-lab]');
  await expect(lab).toBeVisible();
  await expect(page.locator('[data-solarsystem-seasons-lab]')).toHaveCount(0);

  await lab.locator('[data-signal-target-option="Jupiter"]').click();
  await lab.locator('#solar-signal-angle').fill('90');
  await expect(lab).toHaveAttribute('data-signal-target', 'Jupiter');
  await expect(lab).toHaveAttribute('data-signal-angle', '90');
  await expect(lab.locator('[data-signal-one-way]')).toHaveText('44.1 min');
  await expect(lab.getByRole('button', { name: 'Send a light-speed ping' })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
