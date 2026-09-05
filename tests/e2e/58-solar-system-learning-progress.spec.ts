import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({ mode: 'serial' });
const desktop = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1180, height: 900, appStyles: true });
const mobile = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 340, height: 820, appStyles: true });
function state(extra = {}) { return { solarSystem: { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.earth', viewTab: 'overview', paused: true, ...extra } }; }
test.beforeAll(async () => { await desktop.start(); await mobile.start(); });
test.afterAll(async () => { await desktop.stop(); await mobile.stop(); });
test.afterEach(async ({ page }) => { await desktop.destroy(page); });

test('keeps saved progress across model changes and distinguishes evidence from student explanations', async ({ page }) => {
  await desktop.mount(page, state());
  const hub = page.locator('[data-solarsystem-investigation-hub]');
  const summary = hub.locator('[data-learning-summary]');
  await expect(summary).toContainText('0/5 labs with linked evidence');
  const next = hub.locator('[data-investigation-next]');
  await next.click();
  await next.click();
  const compare = page.locator('[data-solarsystem-visual-comparison]');
  await expect(compare).toBeVisible();
  await compare.locator('[data-solarsystem-compare-save]').click();
  await expect(summary).toHaveText('1/5 labs with linked evidence · 0/5 with an explanation');
  await expect(hub.locator('[data-learning-lab="compare"]')).toHaveAttribute('data-learning-state', 'needs-explanation');
  await hub.locator('[data-investigation-id="seasons"]').click();
  const seasons = page.locator('[data-solarsystem-seasons-lab]');
  await seasons.getByRole('button', { name: '45° N', exact: true }).click();
  await seasons.getByRole('button', { name: /Save interpretation [+] evidence to journal/ }).click();
  await seasons.locator('#solar-season-phase').fill('75');
  await expect(hub.locator('[data-investigation-id="seasons"]')).toHaveAttribute('data-investigation-progress', 'saved');
  await expect(summary).toHaveText('2/5 labs with linked evidence · 0/5 with an explanation');
  await hub.getByRole('button', { name: 'Review explanations in journal' }).click();
  const filter = page.getByLabel('Filter journal by investigation');
  await filter.selectOption('compare');
  const entry = page.locator('[data-solar-journal-entry]');
  await expect(entry).toHaveCount(1);
  const original = await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries[0]);
  expect(original.investigation).toEqual({ id: 'compare', explanation: '' });
  await entry.getByLabel('My explanation of this evidence').fill('Jupiter is wider, but the listed gravity is only 2.53 times Earth’s. Diameter alone does not determine gravity.');
  await expect(entry).toContainText('Unsaved explanation changes');
  await expect(summary).toContainText('0/5 with an explanation');
  await entry.getByRole('button', { name: 'Save explanation', exact: true }).click();
  await expect(summary).toHaveText('2/5 labs with linked evidence · 1/5 with an explanation');
  await expect(hub.locator('[data-learning-lab="compare"]')).toHaveAttribute('data-learning-state', 'explained');
  const updated = await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries[0]);
  expect(updated.observation).toBe(original.observation);
  expect(updated.prediction).toBe(original.prediction);
  expect(updated.surprise).toBe(original.surprise);
  expect(updated.investigation.explanation).toContain('Diameter alone');
  await expect(entry.getByRole('button', { name: 'Explanation saved ✓' })).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('recovers older entries and preserves explanations when moving or removing links', async ({ page }) => {
  const old = Array.from({ length: 8 }, (_, index) => ({ planet: 'Earth', prediction: 'Original ' + index, observation: 'Older observation ' + index, surprise: 'An earlier reflection', question: 'What next?', timestamp: 1700000000000 }));
  await desktop.mount(page, state({ journalEntries: old, showJournal: true }));
  const filter = page.getByLabel('Filter journal by investigation');
  await filter.selectOption('unlinked');
  await expect(page.locator('[data-solar-journal-entry]')).toHaveCount(5);
  await page.getByRole('button', { name: 'Show more journal entries' }).click();
  await expect(page.locator('[data-solar-journal-entry]')).toHaveCount(8);
  let entry = page.locator('[data-journal-index="0"]');
  await entry.getByLabel('Link this entry to an investigation').selectOption('seasons');
  await filter.selectOption('seasons');
  await expect(page.locator('[data-solar-journal-entry]')).toHaveCount(1);
  entry = page.locator('[data-journal-index="0"]');
  await expect(entry.getByLabel('My explanation of this evidence')).toHaveValue('');
  await entry.getByLabel('My explanation of this evidence').fill('My saved explanation of the earlier observation.');
  await entry.getByRole('button', { name: 'Save explanation', exact: true }).click();
  await entry.getByLabel('Link this entry to an investigation').selectOption('');
  await expect(page.getByText('No entries match this filter yet.', { exact: true })).toBeVisible();
  await filter.selectOption('unlinked');
  await page.getByRole('button', { name: 'Show more journal entries' }).click();
  await entry.getByLabel('Link this entry to an investigation').selectOption('moon');
  await filter.selectOption('moon');
  await expect(entry.getByLabel('My explanation of this evidence')).toHaveValue('My saved explanation of the earlier observation.');
  await expect(page.locator('[data-learning-summary]')).toHaveText('1/5 labs with linked evidence · 1/5 with an explanation');
  const entries = await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries);
  expect(entries).toHaveLength(8);
  entries.forEach((value, index) => { expect(value.observation).toBe(old[index].observation); expect(value.surprise).toBe(old[index].surprise); });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('keeps learning status and journal editing readable on phones in both themes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.mount(page, state({ journalEntries: [{ planet: 'Moon', prediction: 'No eclipse', observation: 'The Moon was half illuminated with no eclipse alignment.', surprise: 'Phases depend on viewing geometry.', question: 'What changes near a node?', timestamp: 1700000000000, investigation: { id: 'moon', explanation: '' } }] }));
  const hub = page.locator('[data-solarsystem-investigation-hub]');
  for (const dark of [false, true]) {
    await page.evaluate(value => { (window as any).__ctx.isDark = value; (window as any).__rerender(); }, dark);
    await hub.getByRole('button', { name: 'Review explanations in journal' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Filter journal by investigation')).toBeFocused();
    const editor = page.locator('[data-journal-learning-editor]');
    await expect(editor.locator('label').first()).toHaveCSS('color', dark ? 'rgb(241, 245, 249)' : 'rgb(15, 23, 42)');
    await editor.getByLabel('My explanation of this evidence').fill('The geometry controls the visible illuminated fraction.');
    for (const control of await editor.locator('select, button').all()) {
      const box = await control.boundingBox();
      expect(box && box.height >= 44 && box.x >= 0 && box.x + box.width <= 341).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await editor.screenshot({ path: testInfo.outputPath(dark ? 'journal-learning-dark.png' : 'journal-learning-light.png') });
    await hub.screenshot({ path: testInfo.outputPath(dark ? 'learning-hub-dark.png' : 'learning-hub-light.png') });
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
