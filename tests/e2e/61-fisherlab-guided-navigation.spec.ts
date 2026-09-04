import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_fisherlab.js', toolId: 'fisherLab', width: 1180, height: 980, appStyles: true, extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
async function start(page: any) {
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.getByRole('button', { name: 'Start guided investigation', exact: true }).click();
}
async function compare(page: any) {
  const journey = page.locator('[data-fisherlab-journey]');
  await journey.getByLabel('My prediction', { exact: false }).fill('Halving speed doubles time because the route stays the same.');
  await journey.getByRole('button', { name: 'Test my prediction' }).click();
  await journey.getByRole('button', { name: 'Record trial 1', exact: true }).click();
  await expect(journey.getByRole('button', { name: 'Record trial 2', exact: true })).toBeDisabled();
  const speed = journey.getByRole('slider', { name: /Boat speed/ });
  await speed.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(speed).toHaveValue('2');
  await journey.getByRole('button', { name: 'Record trial 2', exact: true }).click();
  await expect(journey.getByRole('list', { name: 'Recorded model trials' })).toContainText('30 minutes');
  await expect(journey.getByRole('list', { name: 'Recorded model trials' })).toContainText('60 minutes');
}
test('guides prediction to controlled trials, chart evidence, saved reflection and completion', async ({ page }) => {
  await start(page);
  const journey = page.locator('[data-fisherlab-journey]');
  const before = await page.evaluate(() => localStorage.getItem('fisherLab.state.v1'));
  await expect(page.locator('#fl-journey-title')).toBeFocused();
  await expect(journey.getByRole('button', { name: 'Test my prediction' })).toBeDisabled();
  await compare(page);
  await journey.screenshot({ path: 'scratch/fisherlab-guided-comparison-desktop.png' });
  await journey.getByRole('button', { name: 'Continue to the chart' }).click();
  await expect(journey).toHaveAttribute('data-fisherlab-journey', '2');
  await expect(page.locator('#fl-journey-title')).toBeFocused();
  await journey.getByRole('link', { name: /Inspect chart below/ }).click();
  await expect(page.locator('#fl-journey-chart')).toBeFocused();
  await page.getByRole('link', { name: /Back to my chart observation/ }).click();
  await expect(page.locator('#fl-journey-observation')).toBeFocused();
  await journey.getByLabel('My chart observation', { exact: false }).fill('The channel constrains the route; check for traffic delays.');
  await journey.getByRole('button', { name: 'Continue to explanation' }).click();
  const note = journey.locator('[data-fisherlab-learning-note]');
  await expect(note.getByLabel('My claim', { exact: true })).toBeVisible();
  await note.getByLabel('Evidence & reasoning', { exact: true }).fill('My own reasoning.');
  await journey.getByRole('button', { name: 'Add investigation evidence to note' }).click();
  const evidence = await note.getByLabel('Evidence & reasoning', { exact: true }).inputValue();
  expect(evidence).toContain('My own reasoning.');
  expect(evidence).toContain('30 min');
  expect(evidence).toContain('60 min');
  expect(evidence).toContain('check for traffic delays');
  await journey.getByRole('button', { name: 'Add investigation evidence to note' }).click();
  await expect(note.getByLabel('Evidence & reasoning', { exact: true })).toHaveValue(evidence);
  await expect(journey.getByRole('button', { name: 'Finish investigation' })).toBeDisabled();
  await note.getByLabel('My claim', { exact: true }).fill('The model supports my prediction: half the speed means twice the time.');
  await note.getByLabel('What I would check next', { exact: true }).fill('Check whether currents or stops change the result.');
  await note.getByRole('button', { name: 'Save note', exact: true }).click();
  await journey.getByRole('button', { name: 'Finish investigation' }).click();
  await expect(journey).toHaveAttribute('data-fisherlab-journey', '4');
  await expect(journey).toContainText('not a grade');
  expect(await page.evaluate(() => localStorage.getItem('fisherLab.state.v1'))).toEqual(before);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fisherLab.learningNotes.v1')!));
  expect(saved.navigation.evidence).toBe(evidence);
  await journey.getByRole('button', { name: 'Start a new investigation' }).click();
  await expect(journey.getByLabel('My prediction', { exact: false })).toHaveValue('');
  await journey.getByRole('button', { name: 'Pause investigation' }).click();
  await page.locator('[data-fisherlab-learning-note] summary').click();
  await expect(page.getByLabel('My claim', { exact: true })).toHaveValue(saved.navigation.claim);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
test('pause and section detours preserve the draft and resume the correct step', async ({ page }) => {
  await start(page);
  const journey = page.locator('[data-fisherlab-journey]');
  await compare(page);
  await journey.getByRole('button', { name: 'Pause investigation' }).click();
  await expect(journey).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue investigation', exact: true }).click();
  await expect(journey).toHaveAttribute('data-fisherlab-journey', '1');
  await expect(journey.getByRole('list', { name: 'Recorded model trials' })).toContainText('60 minutes');
  await journey.getByRole('button', { name: 'Continue to the chart' }).click();
  await page.locator('#fl-section-search').fill('quiz');
  await page.getByRole('button', { name: /Quiz.*Study|Study.*Quiz/ }).last().click();
  await expect(journey).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue investigation', exact: true }).click();
  await expect(journey).toHaveAttribute('data-fisherlab-journey', '2');
  await expect(page.locator('#fl-journey-title')).toBeFocused();
});
test('guided steps support keyboard use and fit a small phone with large text', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 850 });
  await start(page);
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '360px'; });
  await page.getByRole('button', { name: 'Large text', exact: true }).click();
  await compare(page);
  const journey = page.locator('[data-fisherlab-journey]');
  for (const step of [1, 2, 3]) {
    await expect(journey).toHaveAttribute('data-fisherlab-journey', String(step));
    const metrics = await journey.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth, right: el.getBoundingClientRect().right }));
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
    expect(metrics.right).toBeLessThanOrEqual(360);
    const violations = await page.evaluate(async () => (await (window as any).axe.run('[data-fisherlab-journey]', { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'aria-allowed-attr'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
    expect(violations).toEqual([]);
    await journey.screenshot({ path: 'scratch/fisherlab-guided-step-' + step + '-mobile.png' });
    if (step === 1) await journey.getByRole('button', { name: 'Continue to the chart' }).click();
    if (step === 2) {
      await journey.getByLabel('My chart observation', { exact: false }).fill('Inspect channel traffic before choosing a travel time.');
      await journey.getByRole('button', { name: 'Continue to explanation' }).click();
    }
  }
});
