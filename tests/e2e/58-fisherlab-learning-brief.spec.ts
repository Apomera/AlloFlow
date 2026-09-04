import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_fisherlab.js', toolId: 'fisherLab', width: 1180, height: 980, appStyles: true, extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('warmups explain errors, retain topic choices, and lead to evidence without awarding progress', async ({ page }) => {
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  const warmup = page.locator('[data-fisherlab-warmup]');
  await expect(page.getByRole('heading', { name: 'Read the water. Make your call.' })).toBeVisible();
  await expect(warmup.getByText('Take it into the lab.', { exact: false })).toHaveCount(0);
  const before = await page.evaluate(() => localStorage.getItem('fisherLab.state.v1'));
  await warmup.getByRole('button', { name: 'It halves: 30 to 15 minutes' }).click();
  await expect(warmup.getByRole('status')).toContainText('Reconsider your claim');
  await expect(warmup.getByRole('status')).toContainText('Time = distance ÷ speed');
  await warmup.getByRole('button', { name: 'It doubles: 30 to 60 minutes' }).click();
  await expect(warmup.getByRole('status')).toContainText('Supported by the evidence');
  await warmup.getByLabel('Warmup topic').selectOption('sampling');
  await expect(warmup.getByRole('status')).toBeEmpty();
  await warmup.getByRole('button', { name: '80% of all fish in the region are this species', exact: true }).click();
  await expect(warmup.getByRole('status')).toContainText('Reconsider your claim');
  await warmup.getByRole('button', { name: '80% of this catch sample are this species', exact: true }).click();
  await expect(warmup.getByRole('status')).toContainText('Supported by the evidence');
  await warmup.getByLabel('Warmup topic').selectOption('measurement');
  await warmup.getByRole('button', { name: 'Check alignment and repeat the measurement' }).click();
  await expect(warmup.getByRole('status')).toContainText('0.4 units');
  await warmup.getByLabel('Warmup topic').selectOption('navigation');
  await expect(warmup.getByRole('button', { name: 'It doubles: 30 to 60 minutes' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('fisherLab.state.v1'))).toEqual(before);
  await warmup.getByLabel('Warmup topic').selectOption('sampling');
  await warmup.getByRole('button', { name: /Examine journal evidence/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Field Journal');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('briefing and warmup fit a phone with large text and keyboard controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '390px'; });
  await page.getByRole('button', { name: 'Large text', exact: true }).click();
  const warmup = page.locator('[data-fisherlab-warmup]');
  const answer = warmup.getByRole('button', { name: 'It doubles: 30 to 60 minutes' });
  await answer.focus();
  await page.keyboard.press('Enter');
  await expect(answer).toHaveAttribute('aria-pressed', 'true');
  await warmup.getByText('Need a discussion starter?', { exact: true }).click();
  await expect(warmup.getByText(/My claim is/)).toBeVisible();
  const metrics = await page.evaluate(() => {
    const selectors = ['[data-fisherlab-command]', '[data-fisherlab-warmup]'];
    return selectors.map(selector => { const el = document.querySelector(selector)! as HTMLElement; return { client: el.clientWidth, scroll: el.scrollWidth, right: el.getBoundingClientRect().right }; });
  });
  for (const metric of metrics) { expect(metric.scroll).toBeLessThanOrEqual(metric.client + 1); expect(metric.right).toBeLessThanOrEqual(390); }
  const violations = await page.evaluate(async () => (await (window as any).axe.run('[data-fisherlab-warmup]', { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'aria-allowed-attr'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
  expect(violations).toEqual([]);
  await page.screenshot({ path: 'scratch/fisherlab-learning-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '1180px'; });
  await page.getByRole('button', { name: 'Large text', exact: true }).click();
  await page.screenshot({ path: 'scratch/fisherlab-learning-desktop.png', fullPage: true });
});

test('mini-investigations compute changing models and keep them separate from voyage evidence', async ({ page }) => {
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  const warmup = page.locator('[data-fisherlab-warmup]');
  const before = await page.evaluate(() => localStorage.getItem('fisherLab.state.v1'));
  await expect(page.locator('[data-fisherlab-investigation]')).toHaveCount(0);
  await warmup.getByRole('button', { name: 'It doubles: 30 to 60 minutes' }).click();
  let investigation = page.locator('[data-fisherlab-investigation]');
  await expect(investigation.getByRole('slider')).toHaveCount(0);
  await investigation.getByText('Try a mini-investigation', { exact: true }).click();
  const speed = investigation.getByRole('slider', { name: /Boat speed/ });
  const distance = investigation.getByRole('slider', { name: /Route length/ });
  await expect(investigation.locator('[data-investigation-result]')).toHaveText('30 minutes');
  await speed.focus();
  await page.keyboard.press('End');
  await expect(speed).toHaveValue('8');
  await expect(investigation.locator('[data-investigation-result]')).toHaveText('15 minutes');
  await distance.focus();
  await page.keyboard.press('End');
  await expect(investigation.locator('[data-investigation-result]')).toHaveText('45 minutes');
  await speed.focus();
  await page.keyboard.press('Home');
  await expect(investigation.locator('[data-investigation-result]')).toHaveText('360 minutes');
  await distance.focus();
  await page.keyboard.press('Home');
  await expect(investigation.locator('[data-investigation-result]')).toHaveText('30 minutes');
  await speed.focus();
  await page.keyboard.press('End');
  await expect(investigation.locator('[data-investigation-result]')).toHaveText('3.8 minutes');

  await warmup.getByLabel('Warmup topic').selectOption('sampling');
  await warmup.getByRole('button', { name: '80% of this catch sample are this species', exact: true }).click();
  await expect(investigation.getByRole('checkbox')).toHaveCount(0);
  await investigation.getByText('Try a mini-investigation', { exact: true }).click();
  await expect(investigation.locator('[data-investigation-result]')).toHaveText('80% of the combined sample');
  await investigation.getByRole('checkbox', { name: 'Include spot B' }).check();
  await expect(investigation.locator('[data-investigation-result]')).toHaveText('50% of the combined sample');
  await expect(investigation).toContainText('10 target-species fish ÷ 20 sampled fish');
  await investigation.getByRole('checkbox', { name: 'Include spot B' }).uncheck();
  await expect(investigation.locator('[data-investigation-result]')).toHaveText('80% of the combined sample');

  await warmup.getByLabel('Warmup topic').selectOption('measurement');
  await warmup.getByRole('button', { name: 'Check alignment and repeat the measurement' }).click();
  await investigation.getByText('Try a mini-investigation', { exact: true }).click();
  await expect(investigation.locator('[data-investigation-result]')).toHaveText('Mean: 12.5 units');
  await expect(investigation.getByRole('list', { name: 'Repeated measurements' })).toContainText('12.4');
  await investigation.getByRole('checkbox', { name: 'Align the ruler with zero' }).check();
  await expect(investigation.locator('[data-investigation-result]')).toHaveText('Mean: 12.0 units');
  await expect(investigation.getByRole('list', { name: 'Repeated measurements' })).toContainText('11.9');
  await expect(investigation).toContainText('Mean error: +0.0 units');
  await warmup.getByLabel('Warmup topic').selectOption('navigation');
  await investigation.getByText('Try a mini-investigation', { exact: true }).click();
  await expect(investigation.getByRole('slider', { name: /Boat speed/ })).toHaveValue('8');
  await expect(investigation.getByRole('slider', { name: /Route length/ })).toHaveValue('0.5');
  expect(await page.evaluate(() => localStorage.getItem('fisherLab.state.v1'))).toEqual(before);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('expanded experiments remain readable and accessible on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 850 });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '360px'; });
  await page.getByRole('button', { name: 'Large text', exact: true }).click();
  const warmup = page.locator('[data-fisherlab-warmup]');
  for (const [topic, answer] of [
    ['navigation', 'It doubles: 30 to 60 minutes'],
    ['sampling', '80% of this catch sample are this species'],
    ['measurement', 'Check alignment and repeat the measurement']
  ]) {
    await warmup.getByLabel('Warmup topic').selectOption(topic);
    await warmup.getByRole('button', { name: answer, exact: true }).click();
    const experiment = page.locator('[data-fisherlab-investigation]');
    await experiment.getByText('Try a mini-investigation', { exact: true }).click();
    const metrics = await experiment.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth, right: el.getBoundingClientRect().right }));
    expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
    expect(metrics.right).toBeLessThanOrEqual(360);
    const violations = await page.evaluate(async () => (await (window as any).axe.run('[data-fisherlab-investigation]', { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'aria-allowed-attr'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
    expect(violations).toEqual([]);
    await experiment.screenshot({ path: 'scratch/fisherlab-investigation-' + topic + '-mobile.png' });
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '1180px'; });
  await page.getByRole('button', { name: 'Large text', exact: true }).click();
  await warmup.screenshot({ path: 'scratch/fisherlab-investigation-desktop.png' });
});

test('learning notes follow an investigation, survive reload, and export current edits', async ({ page }) => {
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  const warmup = page.locator('[data-fisherlab-warmup]');
  let note = page.locator('[data-fisherlab-learning-note]');
  await note.locator('summary').click();
  await note.getByLabel('My claim', { exact: true }).fill('A slower boat takes longer.');
  await note.getByLabel('Evidence & reasoning', { exact: true }).fill('The model gave 60 minutes at 2 knots over 2 nautical miles.');
  await note.getByLabel('What I would check next', { exact: true }).fill('Check the effect of current.');
  await expect(note.locator('[data-learning-note-status]')).toContainText('Unsaved changes');
  await note.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(note.locator('[data-learning-note-status]')).toContainText('Saved in this browser');
  await warmup.getByRole('button', { name: 'It doubles: 30 to 60 minutes' }).click();
  await warmup.getByRole('button', { name: /Explore the chart/ }).click();
  const focus = page.locator('[data-fisherlab-learning-focus]');
  await expect(focus).toBeFocused();
  await expect(focus).toContainText('one reason a real trip could take longer');
  await note.locator('summary').click();
  await expect(note.getByLabel('My claim', { exact: true })).toHaveValue('A slower boat takes longer.');
  await note.getByLabel('What I would check next', { exact: true }).fill('Compare a route with a stop.');
  await focus.screenshot({ path: 'scratch/fisherlab-notebook-desktop.png' });
  await focus.getByRole('button', { name: 'Back to warmup' }).click();
  await expect(page.locator('#fl-warmup-title')).toBeFocused();
  await note.locator('summary').click();
  await expect(note.getByLabel('What I would check next', { exact: true })).toHaveValue('Compare a route with a stop.');
  await note.getByRole('button', { name: 'Save note', exact: true }).click();
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await note.locator('summary').click();
  await expect(note.getByLabel('What I would check next', { exact: true })).toHaveValue('Compare a route with a stop.');
  await note.getByLabel('My claim', { exact: true }).fill('My latest unsaved claim.');
  const downloadEvent = page.waitForEvent('download');
  await note.getByRole('button', { name: 'Download note', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('fisher-lab-navigation-note.txt');
  const stream = await download.createReadStream();
  let contents = '';
  for await (const chunk of stream!) contents += chunk.toString();
  expect(contents).toContain('My latest unsaved claim.');
  expect(contents).toContain('not a voyage or catch record');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fisherLab.learningNotes.v1')!));
  expect(saved.navigation.claim).toBe('A slower boat takes longer.');
  await warmup.getByLabel('Warmup topic').selectOption('sampling');
  await note.locator('summary').click();
  await expect(note.getByLabel('My claim', { exact: true })).toHaveValue('');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('failed note saves retain editable drafts and remain accessible on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 850 });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '360px'; });
  await page.getByRole('button', { name: 'Large text', exact: true }).click();
  const note = page.locator('[data-fisherlab-learning-note]');
  await note.locator('summary').click();
  await note.getByLabel('My claim', { exact: true }).fill('Keep this draft even if saving fails.');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    (window as any).__restoreNoteStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function(key, value) { if (key === 'fisherLab.learningNotes.v1') throw new Error('quota'); return original.call(this, key, value); };
  });
  await note.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(note.locator('[data-learning-note-status]')).toContainText('Could not save');
  await expect(note.getByLabel('My claim', { exact: true })).toHaveValue('Keep this draft even if saving fails.');
  const violations = await page.evaluate(async () => (await (window as any).axe.run('[data-fisherlab-learning-note]', { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'aria-allowed-attr'] } })).violations.map((v: any) => v.id));
  expect(violations).toEqual([]);
  const metrics = await note.evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth, right: el.getBoundingClientRect().right }));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  expect(metrics.right).toBeLessThanOrEqual(360);
  await page.evaluate(() => (window as any).__restoreNoteStorage());
  await note.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(note.locator('[data-learning-note-status]')).toContainText('Saved in this browser');
  await note.screenshot({ path: 'scratch/fisherlab-notebook-mobile.png' });
});
