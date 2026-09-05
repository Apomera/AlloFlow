import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({ mode: 'serial' });
const desktop = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1180, height: 900, appStyles: true });
const mobile = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 340, height: 820, appStyles: true });
const initial = { solarSystem: { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.earth', viewTab: 'overview', paused: true } };
test.beforeAll(async () => { await desktop.start(); await mobile.start(); });
test.afterAll(async () => { await desktop.stop(); await mobile.stop(); });
test.afterEach(async ({ page }) => { await desktop.destroy(page); });
async function start(page) {
  await page.getByRole('button', { name: 'Start guided seasons investigation' }).click();
  return page.locator('[data-season-guide]');
}
async function collectBoth(guide) {
  await guide.getByRole('button', { name: 'Capture current Earth observation' }).click();
  await guide.getByRole('button', { name: 'Inspect December position' }).click();
  await guide.getByRole('button', { name: 'Capture current Earth observation' }).click();
  await guide.getByRole('button', { name: 'Compare my evidence' }).click();
}

test('requires captured evidence, gives specific claim feedback, and saves a revised explanation', async ({ page }) => {
  await desktop.mount(page, initial);
  const guide = await start(page);
  const lab = page.locator('[data-solarsystem-seasons-lab]');
  await expect(guide).toHaveAttribute('data-guide-step', '0');
  await expect(lab.locator('.solar-seasons-stage')).toHaveCount(0);
  await guide.locator('[data-guide-prediction="together"]').click();
  await expect(lab.locator('.solar-seasons-stage')).toBeVisible();
  await expect(guide.getByRole('button', { name: 'Compare my evidence' })).toBeDisabled();
  await guide.getByRole('button', { name: 'Inspect December position' }).click();
  await expect(guide.locator('[data-guide-observation]')).toHaveCount(0);
  await guide.getByRole('button', { name: 'Inspect June position' }).click();
  await guide.getByRole('button', { name: 'Capture current Earth observation' }).click();
  await expect(guide.getByRole('button', { name: 'Capture current Earth observation' })).toBeDisabled();
  await expect(guide.locator('[data-guide-observation="25"]')).toContainText('45° N daylight 15.4 h');
  await guide.getByRole('button', { name: 'Inspect December position' }).click();
  await guide.getByRole('button', { name: 'Capture current Earth observation' }).click();
  await expect(guide).toHaveAttribute('data-guide-step', '1');
  await guide.getByRole('button', { name: 'Compare my evidence' }).click();
  await expect(guide).toContainText('Use them to revise your starting idea');
  await guide.locator('[data-guide-claim="distance"]').click();
  await expect(guide.locator('[data-guide-feedback]')).toContainText('same Earth–Sun distance');
  await expect(guide.getByRole('button', { name: 'Build my explanation' })).toBeDisabled();
  await guide.locator('[data-guide-claim="weather"]').click();
  await expect(guide.locator('[data-guide-feedback]')).toContainText('geometry model with no weather');
  await guide.locator('[data-guide-claim="tilt"]').click();
  await guide.getByRole('button', { name: 'Build my explanation' }).click();
  await expect(guide.getByRole('button', { name: 'Save guided explanation to journal' })).toBeDisabled();
  await guide.getByLabel('My evidence-based explanation').fill('North has 15.4 hours in June and 8.6 in December. Tilt reverses the advantage. I revised my prediction.');
  await guide.getByRole('button', { name: 'Save guided explanation to journal' }).click();
  await expect(guide).toHaveAttribute('data-guide-step', '4');
  await expect(guide.getByRole('button', { name: 'Guided explanation saved ✓' })).toBeDisabled();
  const entry = await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.at(-1));
  expect(entry.prediction).toContain('Daylight grows and shrinks together');
  expect(entry.observation).toContain('June solstice: 45° N daylight 15.4 h');
  expect(entry.observation).toContain('December solstice: 45° N daylight 8.6 h');
  expect(entry.surprise).toContain('I revised my prediction.');
  await guide.getByLabel('My evidence-based explanation').fill('Revised explanation: the higher noon Sun and longer daylight switch hemispheres because of tilt.');
  await expect(guide).toHaveAttribute('data-guide-step', '3');
  await expect(guide.getByRole('button', { name: 'Save guided explanation to journal' })).toBeEnabled();
  expect(await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.at(-1))).toEqual(entry);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('retains captured observations and drafts when paused and rejects other model settings', async ({ page }) => {
  await desktop.mount(page, initial);
  const guide = await start(page);
  const lab = page.locator('[data-solarsystem-seasons-lab]');
  await guide.locator('[data-guide-prediction="opposite"]').click();
  await lab.getByRole('button', { name: /uranus/i }).click();
  await expect(guide.getByRole('button', { name: 'Capture current Earth observation' })).toBeDisabled();
  await guide.getByRole('button', { name: 'Inspect June position' }).click();
  await lab.locator('#solar-season-phase').fill('50');
  await expect(guide.getByRole('button', { name: 'Capture current Earth observation' })).toBeDisabled();
  await guide.getByRole('button', { name: 'Inspect June position' }).click();
  await collectBoth(guide);
  await expect(guide).toContainText('Your prediction matches');
  await guide.locator('[data-guide-claim="tilt"]').click();
  await guide.getByRole('button', { name: 'Build my explanation' }).click();
  await guide.getByLabel('My evidence-based explanation').fill('A draft I want to keep.');
  const observations = await guide.locator('[data-guide-observation]').allTextContents();
  await guide.getByRole('button', { name: 'Pause guidance' }).click();
  await expect(guide).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume guided seasons investigation' }).click();
  await expect(guide).toHaveAttribute('data-guide-step', '3');
  await expect(guide.getByLabel('My evidence-based explanation')).toHaveValue('A draft I want to keep.');
  expect(await guide.locator('[data-guide-observation]').allTextContents()).toEqual(observations);
});

test('supports keyboard entry and readable phone layouts in both themes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.mount(page, initial);
  const launch = page.getByRole('button', { name: 'Start guided seasons investigation' });
  await launch.focus();
  await page.keyboard.press('Enter');
  const guide = page.locator('[data-season-guide]');
  await expect(page.locator('#solar-season-guide-title')).toBeFocused();
  await guide.locator('[data-guide-prediction="unchanged"]').focus();
  await page.keyboard.press('Enter');
  await collectBoth(guide);
  await guide.locator('[data-guide-claim="distance"]').click();
  for (const dark of [false, true]) {
    await page.evaluate(value => { (window as any).__ctx.isDark = value; (window as any).__rerender(); }, dark);
    for (const button of await guide.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box && box.height >= 44 && box.x >= 0 && box.x + box.width <= 341).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await guide.screenshot({ path: testInfo.outputPath(dark ? 'guided-seasons-dark.png' : 'guided-seasons-light.png') });
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});


test('reviews completed steps without losing work and appends evidence safely', async ({ page }) => {
  await desktop.mount(page, initial);
  const guide = await start(page);
  await expect(guide.getByRole('button', { name: /Review step 2/ })).toBeDisabled();
  await expect(guide.getByRole('button', { name: /Review step 4/ })).toBeDisabled();
  await guide.locator('[data-guide-prediction="together"]').click();
  await expect(guide.getByRole('button', { name: /Review step 2/ })).toBeEnabled();
  await expect(guide.getByRole('button', { name: /Review step 3/ })).toBeDisabled();
  await collectBoth(guide);
  await guide.locator('[data-guide-claim="tilt"]').click();
  await guide.getByRole('button', { name: 'Build my explanation' }).click();
  const writing = guide.getByLabel('My evidence-based explanation');
  await writing.fill('My own reasoning stays here.');
  await guide.locator('[data-guide-insert-evidence="25"]').click();
  await expect(writing).toBeFocused();
  const withJune = await writing.inputValue();
  expect(withJune).toContain('My own reasoning stays here.');
  expect(withJune).toContain('In June, 45° N had 15.4 h of daylight');
  await expect(guide.locator('[data-guide-insert-evidence="25"]')).toBeDisabled();
  await guide.locator('[data-guide-insert-evidence="75"]').click();
  const both = await writing.inputValue();
  expect(both).toContain('In December, 45° N had 8.6 h of daylight');
  expect(await writing.evaluate(el => (el as HTMLTextAreaElement).selectionStart)).toBe(both.length);
  await guide.getByRole('button', { name: /Review step 2/ }).focus();
  await page.keyboard.press('Enter');
  await expect(guide).toHaveAttribute('data-guide-step', '1');
  await expect(guide.locator('[data-guide-roadmap-step="2"]')).toHaveAttribute('data-complete', 'true');
  await expect(guide.locator('[data-guide-observation]')).toHaveCount(2);
  const meters = guide.getByRole('meter');
  await expect(meters).toHaveCount(4);
  for (const meter of await meters.all()) {
    await expect(meter).toHaveAttribute('aria-valuemax', '24');
    const value = Number(await meter.getAttribute('aria-valuenow'));
    const proportion = await meter.evaluate(el => el.firstElementChild!.getBoundingClientRect().width / el.getBoundingClientRect().width);
    expect(proportion).toBeCloseTo(value / 24, 2);
  }
  await guide.getByRole('button', { name: /Review step 3/ }).click();
  await guide.locator('[data-guide-claim="distance"]').click();
  await expect(guide.getByRole('button', { name: /Review step 4/ })).toBeDisabled();
  await guide.locator('[data-guide-claim="tilt"]').click();
  await guide.getByRole('button', { name: /Review step 4/ }).click();
  await expect(writing).toHaveValue(both);
  await writing.fill('x'.repeat(2000));
  await expect(guide.locator('[data-guide-insert-evidence="25"]')).toBeDisabled();
  await expect(guide.locator('[data-guide-insert-evidence="75"]')).toBeDisabled();
  await expect(writing).toHaveValue('x'.repeat(2000));
  await expect(guide.locator('[data-guide-character-count]')).toHaveText('2000/2000 characters');
  await writing.fill(both);
  await guide.getByRole('button', { name: 'Save guided explanation to journal' }).click();
  const entry = await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.at(-1));
  expect(entry.surprise).toContain(both);
  await guide.getByRole('button', { name: /Review step 2/ }).click();
  await expect(guide.locator('[data-guide-roadmap-step="3"]')).toHaveAttribute('data-complete', 'true');
  await guide.getByRole('button', { name: /Review step 4/ }).click();
  await expect(guide.getByRole('button', { name: 'Guided explanation saved ✓' })).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.at(-1))).toEqual(entry);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('presents visual evidence and writing supports clearly on a narrow screen', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.mount(page, initial);
  const guide = await start(page);
  await guide.locator('[data-guide-prediction="opposite"]').click();
  await collectBoth(guide);
  await guide.locator('[data-guide-claim="tilt"]').click();
  await guide.getByRole('button', { name: 'Build my explanation' }).click();
  await guide.getByLabel('My evidence-based explanation').fill('The daylight advantage switches hemispheres.');
  await guide.locator('[data-guide-insert-evidence="25"]').click();
  for (const dark of [false, true]) {
    await page.evaluate(value => { (window as any).__ctx.isDark = value; (window as any).__rerender(); }, dark);
    await expect(guide.getByRole('meter', { name: 'June daylight at 45° N' })).toBeVisible();
    for (const button of await guide.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box && box.height >= 44 && box.x >= 0 && box.x + box.width <= 341).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await guide.screenshot({ path: testInfo.outputPath(dark ? 'guide-review-dark.png' : 'guide-review-light.png') });
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
