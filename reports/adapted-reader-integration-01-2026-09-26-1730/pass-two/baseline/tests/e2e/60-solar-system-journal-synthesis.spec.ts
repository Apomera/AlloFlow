import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
test.describe.configure({ mode: 'serial' });
const desktop = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1180, height: 900, appStyles: true });
const mobile = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 340, height: 820, appStyles: true });
const observations = [
  { planet: 'Earth + Jupiter', observation: 'Jupiter has a larger diameter; its listed gravity is 2.53 g.', investigation: { id: 'compare', explanation: 'Size and gravity are different quantities.' } },
  { planet: 'Mars + Mercury', observation: 'The two worlds have different diameters but the same rounded 0.38 g.', investigation: { id: 'compare', explanation: '' } },
  { planet: 'Mars', observation: 'At the same height, the drop takes longer on Mars than on Earth.', investigation: { id: 'gravity', explanation: '' } },
  { planet: 'Earth', observation: 'At 45 degrees north the modeled June daylight is 15.4 hours.', investigation: { id: 'seasons', explanation: '' } }
].map((entry, index) => ({ ...entry, prediction: 'My initial idea', surprise: 'A model observation', question: 'What should I compare next?', timestamp: 1700000000000 + index }));
function state(entries = observations) { return { solarSystem: { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.earth', viewTab: 'overview', paused: true, journalEntries: entries } }; }
test.beforeAll(async () => { await desktop.start(); await mobile.start(); });
test.afterAll(async () => { await desktop.stop(); await mobile.stop(); });
test.afterEach(async ({ page }) => { await desktop.destroy(page); });
async function start(page) { await page.getByRole('button', { name: 'Connect evidence across labs' }).click(); return page.locator('[data-journal-synthesis]'); }
async function choose(workspace, a = '0', b = '2') {
  await workspace.getByLabel('Evidence A', { exact: true }).selectOption(a);
  await workspace.getByLabel('Evidence B', { exact: true }).selectOption(b);
}
async function write(workspace) {
  await workspace.getByLabel('My connecting claim').fill('Diameter and gravitational acceleration describe different properties.');
  await workspace.getByLabel('How evidence A and B support my claim').fill('A compares diameter with listed gravity; B compares fall time while height is held fixed. They measure different effects.');
  await workspace.getByLabel('Where this comparison stops').fill('The drop is a vacuum model; the comparison does not model atmosphere or drag.');
}

test('requires different labs and preserves source snapshots and saved versions', async ({ page }) => {
  await desktop.mount(page, state());
  const workspace = await start(page);
  const summaryBefore = await page.locator('[data-learning-summary]').textContent();
  await choose(workspace, '0', '1');
  await expect(workspace.getByRole('button', { name: 'Capture selected evidence' })).toBeDisabled();
  await expect(workspace.locator('[data-synthesis-selection-status]')).toContainText('two different investigations');
  await choose(workspace);
  await workspace.getByRole('button', { name: 'Capture selected evidence' }).click();
  await expect(workspace.locator('[data-synthesis-prompt]')).toContainText('different quantities');
  await workspace.getByLabel('My connecting claim').fill('A draft claim');
  await expect(workspace.getByRole('button', { name: 'Save cross-lab explanation' })).toBeDisabled();
  await write(workspace);
  await page.evaluate(() => { (window as any).__toolData.solarSystem.journalEntries[0].observation = 'An edited source observation'; (window as any).__rerender(); });
  await expect(workspace.locator('[data-synthesis-source="A"]')).toContainText('listed gravity is 2.53 g');
  await workspace.getByRole('button', { name: 'Save cross-lab explanation' }).click();
  await expect(workspace.getByRole('button', { name: 'Cross-lab explanation saved ✓' })).toBeDisabled();
  await expect(page.getByLabel('Filter journal by investigation')).toHaveValue('synthesis');
  const first = await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.at(-1));
  expect(first.synthesis.sources[0].observation).toBe(observations[0].observation);
  expect(first.synthesis.sources[1].labId).toBe('gravity');
  expect(first.investigation).toBeUndefined();
  await expect(page.locator('[data-learning-summary]')).toHaveText(summaryBefore!);
  const saved = page.locator('[data-solar-journal-entry]');
  await expect(saved).toHaveCount(1);
  await expect(saved.locator('dt')).toHaveText(['Claim', 'Evidence A + B', 'Reasoning', 'Model boundary']);
  await expect(saved.locator('[data-journal-learning-editor]')).toHaveCount(0);
  await workspace.getByLabel('My connecting claim').fill('A revised claim connecting the two models.');
  await workspace.getByRole('button', { name: 'Save cross-lab explanation' }).click();
  const entries = await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries);
  expect(entries).toHaveLength(6);
  expect(entries[4]).toEqual(first);
  expect(entries[5].synthesis.claim).toContain('A revised claim');
  await expect(workspace.getByLabel('Evidence A', { exact: true }).locator('option')).toHaveCount(5);
  await expect(page.locator('[data-learning-summary]')).toHaveText(summaryBefore!);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('retains drafts across closing and changing pairs without saving stale evidence', async ({ page }) => {
  await desktop.mount(page, state());
  const workspace = await start(page);
  await choose(workspace);
  await workspace.getByRole('button', { name: 'Capture selected evidence' }).click();
  await write(workspace);
  await workspace.getByRole('button', { name: 'Close evidence synthesis' }).click();
  await expect(workspace.getByLabel('My connecting claim')).toHaveCount(0);
  await workspace.getByRole('button', { name: 'Open evidence synthesis' }).click();
  await expect(workspace.getByLabel('My connecting claim')).toHaveValue('Diameter and gravitational acceleration describe different properties.');
  await workspace.getByLabel('Evidence B', { exact: true }).selectOption('3');
  await expect(workspace.getByRole('button', { name: 'Save cross-lab explanation' })).toBeDisabled();
  await expect(workspace.locator('[data-synthesis-selection-status]')).toContainText('Selection changed');
  await workspace.getByRole('button', { name: 'Capture selected evidence' }).click();
  await expect(workspace.locator('[data-synthesis-source="B"]')).toContainText('15.4 hours');
  await expect(workspace.getByLabel('My connecting claim')).toHaveValue('Diameter and gravitational acceleration describe different properties.');
  await page.evaluate(() => { (window as any).__toolData.solarSystem.journalEntries[0].investigation.id = ''; (window as any).__rerender(); });
  await expect(workspace.getByLabel('Evidence A', { exact: true })).toHaveValue('0');
  await expect(workspace.getByLabel('Evidence A', { exact: true }).locator('option:checked')).toContainText('Captured:');
  await workspace.getByRole('button', { name: 'Save cross-lab explanation' }).click();
  await page.getByLabel('Filter journal by investigation').selectOption('unlinked');
  await expect(page.locator('[data-solar-journal-entry]')).toHaveCount(1);
  await expect(page.locator('[data-journal-synthesis-note]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.at(-1).synthesis.sources[0].labId)).toBe('compare');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('handles empty journals and stays readable on mobile in both themes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.mount(page, state([]));
  await page.getByRole('button', { name: 'Connect evidence across labs' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#solar-synthesis-title')).toBeFocused();
  const workspace = page.locator('[data-journal-synthesis]');
  await expect(workspace).toContainText('0 individual observations available');
  await expect(workspace.getByRole('button', { name: 'Capture selected evidence' })).toBeDisabled();
  await page.evaluate(entries => { (window as any).__toolData.solarSystem.journalEntries = entries; (window as any).__rerender(); }, observations);
  await choose(workspace);
  await workspace.getByRole('button', { name: 'Capture selected evidence' }).click();
  await write(workspace);
  for (const dark of [false, true]) {
    await page.evaluate(value => { (window as any).__ctx.isDark = value; (window as any).__rerender(); }, dark);
    await expect(workspace.locator('label').first()).toHaveCSS('color', dark ? 'rgb(241, 245, 249)' : 'rgb(15, 23, 42)');
    for (const control of await workspace.locator('button, select').all()) {
      const box = await control.boundingBox();
      expect(box && box.height >= 44 && box.x >= 0 && box.x + box.width <= 341).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await workspace.screenshot({ path: testInfo.outputPath(dark ? 'synthesis-dark.png' : 'synthesis-light.png') });
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
