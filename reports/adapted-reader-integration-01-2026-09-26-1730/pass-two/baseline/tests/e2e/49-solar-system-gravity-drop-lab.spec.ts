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

function initialState(selectedPlanet: string) {
  return {
    solarSystem: {
      tutorialDismissed: true,
      selectedPlanet,
      viewTab: 'overview',
      paused: true,
      orr_paused: true,
    },
  };
}

test.beforeAll(async () => { await desktopHarness.start(); await mobileHarness.start(); });
test.afterAll(async () => { await desktopHarness.stop(); await mobileHarness.stop(); });
test.afterEach(async ({ page }) => { await desktopHarness.destroy(page); await mobileHarness.destroy(page); });

test('compares Earth and Mars force, fall time, prediction, and journal evidence', async ({ page }) => {
  await desktopHarness.mount(page, initialState('stem.solar_sys.mars'));

  const hub = page.locator('[data-solarsystem-investigation-hub]');
  await expect(hub).toBeVisible();
  await expect(hub.locator('[data-investigation-id]')).toHaveCount(5);
  await expect(hub.locator('[data-investigation-id="gravity"]')).toHaveAttribute('data-investigation-progress', 'not-started');

  await hub.locator('[data-investigation-id="seasons"]').click();
  await expect(page.locator('[data-solarsystem-seasons-lab]')).toBeVisible();
  await hub.locator('[data-investigation-id="gravity"]').click();
  await expect(page.locator('[data-solarsystem-seasons-lab]')).toHaveCount(0);

  const lab = page.locator('[data-solarsystem-gravity-drop-lab]');
  await expect(lab).toBeVisible();
  await expect(lab).toHaveAttribute('data-gravity-target', 'Mars');
  await expect(lab).toContainText('Mass stays 70.0 kg in both places');
  await expect(lab.locator('[data-gravity-earth-force]')).toHaveText('686 N');
  await expect(lab.locator('[data-gravity-target-force]')).toHaveText('261 N');
  await expect(lab.getByRole('img', { name: /setup from 10 meters on Earth.*Result hidden/ })).toBeVisible();
  await expect(lab.getByRole('img', { name: /setup from 10 meters on stem\.solar_sys\.mars.*Result hidden/ })).toBeVisible();
  const run = lab.getByRole('button', { name: /Run synchronized vacuum drop/ });
  await expect(run).toBeDisabled();

  await lab.getByRole('button', { name: 'Earth', exact: true }).click();
  await expect(hub.locator('[data-investigation-id="gravity"]')).toHaveAttribute('data-investigation-progress', 'prediction');
  await expect(run).toBeEnabled();
  await run.click();
  await expect(lab.getByRole('img', { name: /10 meters on Earth takes 1\.43 seconds/ })).toBeVisible();
  await expect(lab.getByRole('img', { name: /10 meters on stem\.solar_sys\.mars takes 2\.32 seconds/ })).toBeVisible();
  await expect(lab.getByText('Earth reaches the ground first.', { exact: false }).first()).toBeVisible();
  await expect(lab.getByText('Evidence supports your hypothesis.', { exact: false })).toBeVisible();

  await lab.getByRole('button', { name: /Save comparison to journal/ }).click();
  await expect(lab.getByRole('button', { name: /Gravity evidence saved/ })).toBeDisabled();
  await expect(hub.locator('[data-investigation-id="gravity"]')).toHaveAttribute('data-investigation-progress', 'saved');

  await lab.getByLabel('Object mass (kg)').fill('80');
  await expect(lab.locator('[data-gravity-earth-force]')).toHaveText('785 N');
  await expect(lab.locator('[data-gravity-target-force]')).toHaveText('298 N');
  await expect(lab.getByRole('img', { name: /takes 2\.32 seconds/ })).toBeVisible();
});

test('discloses Jupiter model limits and stays usable at 340px', async ({ page }) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await mobileHarness.mount(page, initialState('stem.solar_sys.jupiter'));

  const hub = page.locator('[data-solarsystem-investigation-hub]');
  await expect(hub).toBeVisible();
  await hub.locator('[data-investigation-id="signal"]').click();
  await expect(page.locator('[data-solarsystem-signal-lab]')).toBeVisible();
  await hub.locator('[data-investigation-id="gravity"]').click();
  await expect(page.locator('[data-solarsystem-signal-lab]')).toHaveCount(0);

  const lab = page.locator('[data-solarsystem-gravity-drop-lab]');
  await expect(lab).toBeVisible();
  await expect(lab).toHaveAttribute('data-gravity-target', 'Jupiter');
  await expect(lab.locator('[data-gravity-target-force]')).toHaveText('1,737 N');
  const run = lab.getByRole('button', { name: /Run synchronized vacuum drop/ });
  await expect(run).toBeDisabled();
  await expect(lab).toContainText('has no solid surface');
  await expect(lab).toContainText('reference-level value');
  await lab.locator('[data-gravity-inquiry-step="predict"]').getByRole('button', { name: 'stem.solar_sys.jupiter', exact: true }).click();
  await run.click();
  await expect(lab.getByRole('img', { name: /10 meters on stem\.solar_sys\.jupiter takes 0\.90 seconds/ })).toBeVisible();

  const hubBox = await hub.boundingBox();
  expect(hubBox && hubBox.x >= -1 && hubBox.x + hubBox.width <= 341).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
