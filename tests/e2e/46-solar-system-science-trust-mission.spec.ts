import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ mode: 'serial' });

const harness = new GlHarness({
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

test.beforeAll(async () => { await harness.start(); await mobileHarness.start(); });
test.afterAll(async () => { await harness.stop(); await mobileHarness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('explains source confidence and switches among scientific lenses', async ({ page }) => {
  await harness.mount(page, initialState);

  const trust = page.locator('[data-solarsystem-science-trust]');
  await expect(trust).toBeVisible();
  await trust.locator('summary').click();
  await expect(trust).toContainText('Measured');
  await expect(trust).toContainText('Modeled');
  await expect(trust).toContainText('Hypothesis');
  await expect(trust.locator('a')).toHaveCount(3);

  const lenses = page.locator('[data-solarsystem-model-lenses]');
  const sizeLens = lenses.getByRole('button', { name: /Size scale/ });
  await sizeLens.click();
  await expect(sizeLens).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-solar-planet-comparison="true"]')).toBeVisible();
  await expect(trust).toContainText('Shared diameter scale');

  const orbitLens = lenses.getByRole('button', { name: /Orbit model/ });
  await orbitLens.click();
  await expect(orbitLens).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText("the clock is simulation time—not today's ephemeris", { exact: false }).first()).toBeVisible();
});

test('completes the Earth-to-Jupiter evidence trail and fits at 340px', async ({ page }) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await mobileHarness.mount(page, initialState);

  const mission = page.locator('[data-solarsystem-evidence-mission]');
  await mission.getByRole('button', { name: 'Start four-step mission' }).click();
  await mission.getByRole('button', { name: 'Open Earth evidence' }).click();
  await expect(mission).toContainText('Next: Compare with Jupiter');

  await mission.getByRole('button', { name: 'Compare Earth + Jupiter' }).click();
  await expect(page.locator('[data-solar-planet-comparison="true"]')).toBeVisible();
  await mission.getByRole('button', { name: 'Open paused Jupiter orbit' }).click();
  await expect(mission).toContainText('Next: Explain with evidence');

  await mission.getByRole('button', { name: 'Open evidence journal' }).click();
  await page.locator('#journal-observe').fill('Jupiter is about 11 times wider than Earth, yet its reference-level gravity is about 2.53 g.');
  await page.getByRole('button', { name: /Save Entry/ }).click();
  await expect(mission).toContainText('Mission complete');
  await expect(mission.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
