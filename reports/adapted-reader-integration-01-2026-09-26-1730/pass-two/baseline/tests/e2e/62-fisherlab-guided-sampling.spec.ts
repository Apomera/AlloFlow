import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_fisherlab.js', toolId: 'fisherLab', width: 1180, height: 980, appStyles: true, extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
async function startSampling(page: any) {
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.getByLabel('Investigation topic', { exact: true }).selectOption('sampling');
  await page.getByRole('button', { name: 'Start guided investigation', exact: true }).click();
}
async function compare(page: any) {
  const j = page.locator('[data-fisherlab-journey]');
  await j.getByLabel('My prediction', { exact: false }).fill('Adding a lower-share sample lowers the combined percentage.');
  await j.getByRole('button', { name: 'Test my prediction' }).click();
  await j.getByRole('button', { name: 'Record trial 1', exact: true }).click();
  await expect(j.getByRole('button', { name: 'Record trial 2', exact: true })).toBeDisabled();
  await j.getByRole('checkbox', { name: 'Include spot B' }).check();
  await expect(j.locator('[data-investigation-result]')).toHaveText('50% of the combined sample');
  const size = j.getByRole('slider', { name: /Spot B sample size/ });
  await size.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(size).toHaveValue('20');
  await expect(j.locator('[data-investigation-result]')).toHaveText('40% of the combined sample');
  await expect(j).toContainText('pooling the counts gives 40%');
  await j.getByRole('button', { name: 'Record trial 2', exact: true }).click();
  await expect(j.getByRole('list', { name: 'Recorded model trials' })).toContainText('80%');
  await expect(j.getByRole('list', { name: 'Recorded model trials' })).toContainText('40%');
}
test('pooled model evidence leads to journal reflection and a separate saved sampling note', async ({ page }) => {
  await startSampling(page);
  const before = await page.evaluate(() => localStorage.getItem('fisherLab.state.v1'));
  const j = page.locator('[data-fisherlab-journey]');
  await expect(j).toHaveAttribute('data-fisherlab-journey-topic', 'sampling');
  await compare(page);
  await j.screenshot({ path: 'scratch/fisherlab-sampling-comparison-desktop.png' });
  await j.getByRole('button', { name: 'Continue to the journal' }).click();
  await expect(page.locator('#fl-journey-title')).toBeFocused();
  await expect(j).toContainText('If it is empty');
  await j.getByRole('link', { name: 'Inspect journal below ↓' }).click();
  await expect(page.locator('#fl-journal-title')).toBeFocused();
  await page.getByRole('link', { name: /Back to my journal reflection/ }).click();
  await expect(page.locator('#fl-journey-observation')).toBeFocused();
  await j.getByLabel('My journal reflection', { exact: false }).fill('There are no journal records yet. I would compare locations and record tackle used.');
  await j.getByRole('button', { name: 'Continue to explanation' }).click();
  await j.getByRole('button', { name: 'Add investigation evidence to note' }).click();
  const note = j.locator('[data-fisherlab-learning-note="sampling"]');
  expect(await note.getByLabel('Evidence & reasoning', { exact: true }).inputValue()).toContain('pooled = 12/30 = 40%');
  await note.getByLabel('My claim', { exact: true }).fill('The pooled sample share is lower, but does not estimate the whole region.');
  await note.getByLabel('What I would check next', { exact: true }).fill('Sample more locations using a consistent method.');
  await note.getByRole('button', { name: 'Save note', exact: true }).click();
  await j.getByRole('button', { name: 'Finish investigation' }).click();
  await expect(j).toHaveAttribute('data-fisherlab-journey', '4');
  expect(await page.evaluate(() => localStorage.getItem('fisherLab.state.v1'))).toEqual(before);
  const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('fisherLab.learningNotes.v1')!));
  expect(notes.sampling.evidence).toContain('not journal records');
  expect(notes.navigation.evidence).toBe('');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
test('topic switching preserves independent investigation drafts and correct resume destinations', async ({ page }) => {
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.getByRole('button', { name: 'Start guided investigation', exact: true }).click();
  const j = page.locator('[data-fisherlab-journey]');
  await j.getByLabel('My prediction', { exact: false }).fill('My navigation prediction.');
  await j.getByRole('button', { name: 'Pause investigation' }).click();
  await page.getByLabel('Investigation topic', { exact: true }).selectOption('sampling');
  await page.getByRole('button', { name: 'Start guided investigation', exact: true }).click();
  await compare(page);
  await j.getByRole('button', { name: 'Continue to the journal' }).click();
  await j.getByLabel('My journal reflection', { exact: false }).fill('My sampling reflection.');
  await j.getByRole('button', { name: 'Pause investigation' }).click();
  await page.getByLabel('Investigation topic', { exact: true }).selectOption('navigation');
  await page.getByRole('button', { name: 'Continue investigation', exact: true }).click();
  await expect(j.getByLabel('My prediction', { exact: false })).toHaveValue('My navigation prediction.');
  await j.getByRole('button', { name: 'Pause investigation' }).click();
  await page.getByLabel('Investigation topic', { exact: true }).selectOption('sampling');
  await page.getByRole('button', { name: 'Continue investigation', exact: true }).click();
  await expect(j).toHaveAttribute('data-fisherlab-journey', '2');
  await expect(j.getByLabel('My journal reflection', { exact: false })).toHaveValue('My sampling reflection.');
  await expect(page.locator('#fl-journal-title')).toBeVisible();
});
test('sample dots, controls and reflection fit mobile large text with keyboard and accessible labels', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 850 });
  await startSampling(page);
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '360px'; });
  await page.getByRole('button', { name: 'Large text', exact: true }).click();
  await compare(page);
  const j = page.locator('[data-fisherlab-journey]');
  for (const step of [1, 2, 3]) {
    const metric = await j.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth, right: el.getBoundingClientRect().right }));
    expect(metric.scroll).toBeLessThanOrEqual(metric.client + 1);
    expect(metric.right).toBeLessThanOrEqual(360);
    const root = await page.locator('.fl-fisherlab-root').evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
    expect(root.scroll).toBeLessThanOrEqual(root.client + 1);
    const violations = await page.evaluate(async () => (await (window as any).axe.run('[data-fisherlab-journey]', { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'aria-allowed-attr'] } })).violations.map((v: any) => v.id));
    expect(violations).toEqual([]);
    await j.screenshot({ path: 'scratch/fisherlab-sampling-step-' + step + '-mobile.png' });
    if (step === 1) await j.getByRole('button', { name: 'Continue to the journal' }).click();
    if (step === 2) {
      await j.getByLabel('My journal reflection', { exact: false }).fill('No observations yet; collect evidence from multiple sites.');
      await j.getByRole('button', { name: 'Continue to explanation' }).click();
    }
  }
});
