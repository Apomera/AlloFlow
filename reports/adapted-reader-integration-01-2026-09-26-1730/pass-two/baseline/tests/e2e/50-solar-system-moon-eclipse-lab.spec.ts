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

test('connects phase, node geometry, eclipse alignment, prediction, and evidence', async ({ page }) => {
  await desktopHarness.mount(page, initialState);

  const hub = page.locator('[data-solarsystem-investigation-hub]');
  await expect(hub.locator('[data-investigation-id]')).toHaveCount(5);
  await hub.locator('[data-investigation-id="seasons"]').click();
  await expect(page.locator('[data-solarsystem-seasons-lab]')).toBeVisible();
  await hub.locator('[data-investigation-id="moon"]').click();
  await expect(page.locator('[data-solarsystem-seasons-lab]')).toHaveCount(0);

  const lab = page.locator('[data-solarsystem-moon-lab]');
  await expect(lab).toBeVisible();
  await expect(lab).toHaveAttribute('data-moon-eclipse-alignment', 'none');
  const inquiry = lab.locator('[data-inquiry-stage]');
  await expect(inquiry).toHaveAttribute('data-inquiry-stage', 'predict');
  await expect(inquiry).toContainText('Step 1 · Commit an ungraded eclipse hypothesis');

  await lab.locator('[data-moon-phase-preset="0"]').click();
  await expect(lab.locator('[data-moon-illuminated-value]')).toHaveText('0%');
  await expect(lab).toHaveAttribute('data-moon-eclipse-alignment', 'none');
  await lab.locator('[data-moon-node-preset="aligned"]').click();
  await expect(lab).toHaveAttribute('data-moon-eclipse-alignment', 'solar');
  await expect(lab.locator('[data-moon-alignment-result]')).toHaveAttribute('data-moon-alignment-result', 'hidden');
  await expect(lab.locator('[data-moon-alignment-result]')).toContainText('Outcome hidden until you commit');

  await lab.locator('[data-moon-prediction="solar"]').click();
  await expect(lab.locator('[data-moon-alignment-result]')).toHaveAttribute('data-moon-alignment-result', 'solar');
  await expect(lab.locator('[data-moon-alignment-result]')).toContainText('Solar-eclipse alignment');
  await expect(lab.locator('[data-moon-prediction="solar"]')).toBeDisabled();
  await expect(inquiry).toHaveAttribute('data-inquiry-stage', 'evidence');
  await expect(inquiry.getByRole('status')).toContainText('Step 2 · Compare');
  await expect(lab.getByText('Evidence supports your hypothesis.', { exact: false })).toBeVisible();
  await expect(hub.locator('[data-investigation-id="moon"]')).toHaveAttribute('data-investigation-progress', 'prediction');
  await lab.getByRole('button', { name: 'Save Moon evidence to journal' }).click();
  await expect(hub.locator('[data-investigation-id="moon"]')).toHaveAttribute('data-investigation-progress', 'saved');

  await lab.locator('[data-moon-phase-preset="180"]').click();
  await expect(lab.locator('[data-moon-illuminated-value]')).toHaveText('100%');
  await expect(lab).toHaveAttribute('data-moon-eclipse-alignment', 'lunar');
  await expect(lab.locator('[data-moon-alignment-result]')).toHaveAttribute('data-moon-alignment-result', 'hidden');
  await lab.locator('[data-moon-phase-preset="0"]').click();
  await lab.locator('[data-moon-node-preset="far"]').click();
  await expect(lab).toHaveAttribute('data-moon-eclipse-alignment', 'none');
  await expect(lab.locator('[data-moon-latitude-value]')).toHaveText('-5.14°');
});

test('keeps the featured Moon investigation clear and usable at 340px', async ({ page }) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await mobileHarness.mount(page, initialState);

  const hub = page.locator('[data-solarsystem-investigation-hub]');
  const moonCard = hub.locator('[data-investigation-id="moon"]');
  await expect(moonCard).toHaveClass(/col-span-2/);
  await moonCard.click();

  const lab = page.locator('[data-solarsystem-moon-lab]');
  await expect(lab).toBeVisible();
  await expect(lab.getByLabel('Moon phase angle')).toBeVisible();
  await expect(lab.getByLabel('Node offset from new-Moon direction')).toBeVisible();
  await expect(lab.locator('svg[role="img"]')).toBeVisible();
  const stage = lab.getByRole('region', { name: /Scrollable Moon geometry diagram/ });
  await stage.focus();
  await expect(stage).toBeFocused();
  const diagram = await stage.evaluate((el) => {
    const svg = el.querySelector('svg');
    const label = [...el.querySelectorAll('text')].find((node) => node.textContent?.includes('TOP-DOWN GEOMETRY'));
    if (!svg || !label) throw new Error('Moon geometry diagram did not render');
    const svgRect = svg.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    el.scrollLeft = 120;
    return { clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, scrollLeft: el.scrollLeft, svgWidth: svgRect.width, labelHeight: labelRect.height };
  });
  expect(diagram.scrollWidth).toBeGreaterThan(diagram.clientWidth);
  expect(diagram.svgWidth).toBeGreaterThanOrEqual(719);
  expect(diagram.labelHeight).toBeGreaterThanOrEqual(9);
  expect(diagram.scrollLeft).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test('completes the ungraded planet claim cycle through explanation-based revision', async ({ page }) => {
  await desktopHarness.mount(page, {
    solarSystem: { ...initialState.solarSystem, viewTab: 'drone' },
  });

  const inquiry = page.locator('[data-solar-poe-inquiry]');
  await expect(inquiry).toBeVisible();
  await inquiry.locator('textarea').fill('Earth should keep moving because its sideways motion continues while gravity bends the path.');
  await inquiry.getByRole('button', { name: /Lock claim/ }).click();

  await expect(page.locator('[data-solar-locked-prediction]')).toContainText('Earth should keep moving');
  await page.getByRole('button', { name: /Reveal model explanation/ }).click();

  const revision = page.locator('[data-solar-poe-revision]');
  await expect(revision).toHaveAttribute('data-solar-poe-inquiry-complete', 'false');
  const save = revision.getByRole('button', { name: 'Save inquiry cycle' });
  await expect(save).toBeDisabled();
  await revision.getByRole('radio', { name: /Supported/ }).check();
  await revision.locator('textarea').fill('The model evidence shows gravity continually bends the moving planet into an orbit.');
  await expect(save).toBeEnabled();
  await save.click();

  await expect(revision).toHaveAttribute('data-solar-poe-inquiry-complete', 'true');
  await expect(revision).toContainText('original claim and revision are both preserved');
});
