import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ mode: 'serial' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1180, height: 900, appStyles: true });
const mobile = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 340, height: 820, appStyles: true });
const state = { solarSystem: { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.earth', viewTab: 'overview', showVisualCompare: true, compare1: 'stem.solar_sys.earth', compare2: 'stem.solar_sys.jupiter', paused: true } };
test.beforeAll(async () => { await harness.start(); await mobile.start(); });
test.afterAll(async () => { await harness.stop(); await mobile.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('shows proportional measurements and a smaller-world counterexample', async ({ page }) => {
  await harness.mount(page, state);
  const panel = page.locator('[data-solarsystem-visual-comparison]');
  const diameter = panel.locator('[data-compare-bars="diameter"]');
  const gravity = panel.locator('[data-compare-bars="gravity"]');
  await expect(diameter.getByRole('meter').first()).toHaveAttribute('aria-valuenow', '12742');
  await expect(diameter.getByRole('meter').last()).toHaveAttribute('aria-valuenow', '139822');
  await expect(gravity.getByRole('meter').first()).toHaveAttribute('aria-valuetext', '1.00 g');
  await expect(gravity.getByRole('meter').last()).toHaveAttribute('aria-valuetext', '2.53 g');
  const widthRatio = await diameter.getByRole('meter').first().evaluate(el => {
    return (el.firstElementChild as HTMLElement).getBoundingClientRect().width / el.getBoundingClientRect().width;
  });
  expect(widthRatio).toBeCloseTo(12742 / 139822, 2);
  const challenge = panel.locator('[data-compare-challenge="Uranus-Neptune"]');
  await challenge.focus();
  await page.keyboard.press('Enter');
  await expect(challenge).toHaveAttribute('aria-pressed', 'true');
  const radii = await diameter.getByRole('meter').evaluateAll(els => els.map(el => Number(el.getAttribute('aria-valuenow'))));
  const gravities = await gravity.getByRole('meter').evaluateAll(els => els.map(el => Number(el.getAttribute('aria-valuenow'))));
  expect(radii[0]).toBeGreaterThan(radii[1]);
  expect(gravities[0]).toBeLessThan(gravities[1]);
  await panel.locator('[data-compare-challenge="Mercury-Mars"]').click();
  await expect(panel.getByText('Both worlds have the same listed gravity at the displayed precision.', { exact: false })).toBeVisible();
  await panel.locator('[data-solarsystem-compare-save]').click();
  const observation = await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.at(-1).observation);
  expect(observation).toContain('same listed gravity');
  expect(observation).not.toContain('stronger');
});

test('preserves pair-specific explanations through swapping, switching, and journal saves', async ({ page }) => {
  await harness.mount(page, state);
  const panel = page.locator('[data-solarsystem-visual-comparison]');
  const input = panel.getByRole('textbox', { name: 'My explanation (optional)' });
  const explanation = 'Jupiter is about 11 times wider but has only 2.53 times the gravity. Size alone does not explain gravity.';
  await input.fill(explanation);
  await panel.getByRole('button', { name: 'Swap visually compared worlds' }).click();
  await expect(input).toHaveValue(explanation);
  await panel.locator('[data-compare-challenge="Uranus-Neptune"]').click();
  await expect(input).toHaveValue('');
  await input.fill('Neptune is smaller but its listed gravity is stronger.');
  await panel.locator('[data-compare-challenge="Earth-Jupiter"]').click();
  await expect(input).toHaveValue(explanation);
  const save = panel.locator('[data-solarsystem-compare-save]');
  await save.click();
  await expect(save).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.at(-1).surprise)).toBe(explanation);
  await input.fill(explanation + ' I would compare mass next.');
  await expect(save).toBeEnabled();
  await save.click();
  expect(await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.at(-1).surprise)).toContain('I would compare mass next.');
  await page.evaluate(() => { (window as any).__toolData.solarSystem.showJournal = true; (window as any).__rerender(); });
  await expect(page.locator('[data-solar-journal-entry]').first().locator('[data-journal-field="reflection"]')).toContainText('I would compare mass next.');
});

test('keeps charts, prompts, and focus usable at 340px in both themes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.mount(page, state);
  const panel = page.locator('[data-solarsystem-visual-comparison]');
  for (const dark of [false, true]) {
    await page.evaluate(value => { (window as any).__ctx.isDark = value; (window as any).__rerender(); }, dark);
    await expect(panel.getByRole('textbox', { name: 'My explanation (optional)' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    const controls = await panel.locator('[data-compare-challenge]').evaluateAll(els => els.map(el => ({ height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width })));
    expect(controls.every(c => c.height >= 44 && c.width > 0)).toBe(true);
    await panel.screenshot({ path: testInfo.outputPath(dark ? 'comparison-dark-mobile.png' : 'comparison-light-mobile.png') });
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
