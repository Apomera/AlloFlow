import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_fisherlab.js', toolId: 'fisherLab', width: 1180, height: 980, appStyles: true, extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('topic checks give specific feedback and retain choices independently without grading or writing', async ({ page }) => {
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  const before = await page.evaluate(() => ({ voyage: localStorage.getItem('fisherLab.state.v1'), notes: localStorage.getItem('fisherLab.learningNotes.v1') }));
  for (const [topic, correct, wrongText, rightText] of [
    ['navigation',1,'restates the result','held constant'],
    ['sampling',0,'sample sizes differ','Each sampled fish'],
    ['measurement',1,'Close readings','do not by themselves identify its cause']
  ] as const) {
    await page.getByLabel('Warmup topic').selectOption(topic);
    const note = page.locator('[data-fisherlab-learning-note]');
    await note.locator('summary').click();
    const practice = note.locator('[data-fisherlab-explanation-practice]');
    await expect(practice.getByRole('button', { name: 'Try an explanation check', exact: false })).toHaveAttribute('aria-expanded','false');
    await expect(practice.locator('[data-explanation-example]')).toHaveCount(0);
    await practice.getByRole('button', { name: 'Try an explanation check', exact: false }).click();
    const choices = practice.locator('fieldset').getByRole('button');
    await choices.nth(1-correct).click();
    await expect(practice.getByRole('status')).toContainText(wrongText);
    await expect(practice.locator('[data-explanation-example] li')).toHaveCount(4);
    await choices.nth(correct).click();
    await expect(practice.getByRole('status')).toContainText(rightText);
    await expect(choices.nth(correct)).toHaveAttribute('aria-pressed','true');
    await expect(note.getByLabel('Evidence & reasoning', { exact: true })).toHaveValue('');
    await practice.getByRole('button', { name: 'Return to my evidence' }).click();
    await expect(note.getByLabel('Evidence & reasoning', { exact: true })).toBeFocused();
    await expect(practice.getByRole('button', { name: 'Try an explanation check', exact: false })).toHaveAttribute('aria-expanded','false');
  }
  await page.getByLabel('Warmup topic').selectOption('navigation');
  await page.locator('[data-fisherlab-learning-note] > summary').click();
  const practice = page.locator('[data-fisherlab-explanation-practice]');
  await practice.getByRole('button', { name: 'Try an explanation check', exact: false }).click();
  await expect(practice.locator('fieldset').getByRole('button').nth(1)).toHaveAttribute('aria-pressed','true');
  await practice.screenshot({ path: 'scratch/fisherlab-explanation-practice-desktop.png' });
  expect(await page.evaluate(() => ({ voyage: localStorage.getItem('fisherLab.state.v1'), notes: localStorage.getItem('fisherLab.learningNotes.v1') }))).toEqual(before);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('practice preserves saved and unsaved notes and keeps example writing out of downloads', async ({ page }) => {
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  const note = page.locator('[data-fisherlab-learning-note]');
  await note.locator('summary').click();
  const evidence = note.getByLabel('Evidence & reasoning', { exact: true });
  await evidence.fill('My saved observation.');
  await note.getByRole('button', { name: 'Save note', exact: true }).click();
  await evidence.fill('My latest observation.');
  const practice = note.locator('[data-fisherlab-explanation-practice]');
  await practice.getByRole('button', { name: 'Try an explanation check', exact: false }).click();
  await practice.locator('fieldset').getByRole('button').nth(1).click();
  await practice.getByRole('button', { name: 'Return to my evidence' }).click();
  await expect(evidence).toHaveValue('My latest observation.');
  await expect(note.locator('[data-learning-note-status]')).toContainText('Unsaved changes');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fisherLab.learningNotes.v1')!).navigation.evidence)).toBe('My saved observation.');
  const pending = page.waitForEvent('download');
  await note.getByRole('button', { name: 'Download note', exact: true }).click();
  const download = await pending;
  let text = '';
  for await (const chunk of (await download.createReadStream())!) text += chunk.toString();
  expect(text).toContain('My latest observation.');
  expect(text).not.toContain('6 knots gives 30 minutes');
  expect(text).not.toContain('One worked explanation');
  await note.getByRole('button', { name: 'Save note', exact: true }).click();
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await note.locator('summary').click();
  await expect(evidence).toHaveValue('My latest observation.');
  await expect(practice.getByRole('button', { name: 'Try an explanation check', exact: false })).toHaveAttribute('aria-expanded','false');
});

test('explanation practice is keyboard-accessible and readable on a phone with large text', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 850 });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '360px'; });
  await page.getByRole('button', { name: 'Large text', exact: true }).click();
  await page.getByLabel('Warmup topic').selectOption('sampling');
  const note = page.locator('[data-fisherlab-learning-note]');
  await note.locator('summary').click();
  const practice = note.locator('[data-fisherlab-explanation-practice]');
  await practice.getByRole('button', { name: 'Try an explanation check', exact: false }).focus();
  await page.keyboard.press('Enter');
  await practice.locator('fieldset').getByRole('button').nth(0).focus();
  await page.keyboard.press('Enter');
  await expect(practice.getByRole('status')).toContainText('Each sampled fish');
  const metrics = await page.locator('[data-fisherlab-explanation-practice], [data-fisherlab-learning-note], .fl-fisherlab-root').evaluateAll(els => els.map(el => ({ client: el.clientWidth, scroll: el.scrollWidth, right: el.getBoundingClientRect().right })));
  for (const m of metrics) { expect(m.scroll).toBeLessThanOrEqual(m.client+1); expect(m.right).toBeLessThanOrEqual(360); }
  const violations = await page.evaluate(async () => (await (window as any).axe.run('[data-fisherlab-explanation-practice]', { runOnly: { type: 'rule', values: ['color-contrast','button-name','label','aria-valid-attr-value','aria-allowed-attr'] } })).violations.map((v: any) => ({ id:v.id, nodes:v.nodes.map((n:any) => n.target) })));
  expect(violations).toEqual([]);
  await practice.screenshot({ path: 'scratch/fisherlab-explanation-practice-mobile.png' });
  await practice.getByRole('button', { name: 'Return to my evidence' }).focus();
  await page.keyboard.press('Enter');
  await expect(note.getByLabel('Evidence & reasoning', { exact: true })).toBeFocused();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
