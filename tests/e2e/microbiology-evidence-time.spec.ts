import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 90000 });
test.use({ video: 'off' });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-evidence-refinement-2026-09-29');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const layoutStyle = '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}';
const control = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
const conditions = { ...control, tempC: 35 };

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });
const state = (page: Page) => page.evaluate(() => (window as any).__toolData.microbiology);

async function mount(page: Page, tab: string, seed: Record<string, unknown>) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { microbiology: { tab, ...seed } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: layoutStyle });
}

test('inspects saved growth counts with the keyboard and preserves hour-24 prediction review after reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mount(page, 'growthLab', {
    growthLab: { ...control, oxygen: 0 },
    growthInvestigation: {
      trials: [{ id: 3, control, conditions, prediction: 'similar', hypothesis: 'They may reach similar final populations.', explanation: 'Compare early growth as well as the endpoint.' }],
      selectedId: 3, nextId: 4, control: conditions, prediction: 'lower', hypothesis: 'My next prediction draft',
    },
  });
  const review = page.locator('.micro-growth-review');
  await review.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(review).toHaveAttribute('open', '');
  const selector = review.getByLabel('Inspect model hour', { exact: true });
  const row = review.locator('[data-review-trial="3"]');
  await expect(selector).toHaveValue('24');
  await expect(row.locator('td').nth(2)).toHaveText('Similar population');
  const before = await state(page);
  const finalFeedback = await page.locator('.micro-growth-result-head').textContent();
  const finalMetrics = await page.locator('.micro-growth-metrics').textContent();
  await expect(page.locator('.micro-growth-result-head')).toContainText('Your prediction matches this run.');

  await selector.focus();
  await page.keyboard.press('Home');
  await expect(selector).toHaveValue('0');
  await expect(row.locator('td').nth(3)).toHaveText('5.0');
  await expect(row.locator('td').nth(4)).toHaveText('5.0');
  await expect(row.locator('td').nth(5)).toHaveText('0.0');
  await expect(row.locator('td').nth(2)).toHaveText('Similar population');
  for (let hour = 0; hour < 6; hour++) await page.keyboard.press('ArrowDown');
  await expect(selector).toHaveValue('6');
  await expect(selector).toBeFocused();
  const counts = await page.evaluate(({ control, conditions }) => {
    const growth = (window as any).__MicrobiologyCore.growth;
    const controlPopulation = growth.simulate(control).points[6].population;
    const trialPopulation = growth.simulate(conditions).points[6].population;
    return { control: controlPopulation, trial: trialPopulation, difference: trialPopulation - controlPopulation };
  }, { control, conditions });
  expect(Math.abs(counts.difference)).toBeGreaterThan(2);
  await expect(row.locator('td').nth(3)).toHaveText(counts.control.toFixed(1));
  await expect(row.locator('td').nth(4)).toHaveText(counts.trial.toFixed(1));
  await expect(row.locator('td').nth(5)).toHaveText(counts.difference.toFixed(1));
  await expect(review.getByRole('columnheader', { name: 'Outcome at hour 24', exact: true })).toBeVisible();
  await expect(review.getByRole('columnheader', { name: 'Control at hour 6', exact: true })).toBeVisible();
  await expect(review.getByRole('columnheader', { name: 'Trial at hour 6', exact: true })).toBeVisible();
  await expect(page.locator('#gl-review-time-status')).toContainText('Original predictions and outcome labels always refer to hour 24.');
  expect(await page.locator('.micro-growth-result-head').textContent()).toBe(finalFeedback);
  expect(await page.locator('.micro-growth-metrics').textContent()).toBe(finalMetrics);
  expect((await state(page)).growthInvestigation).toEqual(before.growthInvestigation);
  expect((await state(page)).growthLab).toEqual(before.growthLab);
  await expect(page.locator('#gl-hypothesis')).toHaveValue('My next prediction draft');
  await review.screenshot({ path: path.join(out, 'growth-hour-six-desktop.png') });

  // Reload the document and supply the saved JSON through the host's restore contract.
  const savedJSON = await page.evaluate(() => JSON.stringify((window as any).__toolData.microbiology));
  writeFileSync(path.join(out, 'growth-hour-six-state.json'), savedJSON, 'utf8');
  await page.reload();
  await page.waitForFunction(() => typeof (window as any).__mount === 'function');
  await page.evaluate(json => (window as any).__mount({ microbiology: JSON.parse(json) }), savedJSON);
  await page.addStyleTag({ content: layoutStyle });
  await review.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(selector).toHaveValue('6');
  await expect(row.locator('td').nth(2)).toHaveText('Similar population');
  await expect(row.locator('td').nth(5)).toHaveText(counts.difference.toFixed(1));
  expect((await state(page)).growthInvestigation).toEqual(before.growthInvestigation);
  await page.setViewportSize({ width: 320, height: 800 });
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await selector.focus();
  await expect(selector).toBeFocused();
  const bounds = await selector.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
  await review.screenshot({ path: path.join(out, 'growth-hour-six-phone.png') });
  expect(errors).toEqual([]);
});

test('announces the last resistance-record removal and keeps keyboard focus and the current run', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const evidence = {
    dose: 0, duration: 3, initRes: 15, prediction: 'similar', notes: 'Keep these current observations after removing the saved copy.',
    history: [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 68, resistant: 12 }],
  };
  await mount(page, 'resistance', {
    resistanceInvestigation: evidence,
    resistanceNotebook: { records: [{ id: 6, evidence }], selectedId: 6, nextId: 8 },
  });
  const notebook = page.getByRole('region', { name: 'Resistance evidence notebook', exact: true });
  const currentRun = (await state(page)).resistanceInvestigation;
  const disclosure = notebook.locator('.micro-resistance-saved');
  await disclosure.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(notebook.locator('#micro-resistance-evidence-6')).toHaveAttribute('aria-pressed', 'true');
  const remove = notebook.getByRole('button', { name: 'Remove selected evidence', exact: true });
  await remove.focus();
  await page.keyboard.press('Enter');
  await expect(notebook.getByRole('heading', { name: 'Resistance evidence notebook', exact: true })).toBeFocused();
  await expect(notebook.locator('[data-resistance-notebook-notice]')).toHaveText('Removed evidence 6. No saved snapshots remain. Your current run is unchanged.');
  await expect(notebook.locator('[data-resistance-notebook-notice]')).toHaveAttribute('role', 'status');
  await expect(notebook.locator('[data-resistance-notebook-notice]')).toHaveAttribute('aria-live', 'polite');
  await expect(disclosure).toHaveCount(0);
  expect((await state(page)).resistanceNotebook).toEqual({ records: [], selectedId: null, nextId: 8 });
  expect((await state(page)).resistanceInvestigation).toEqual(currentRun);
  await page.keyboard.press('Tab');
  await expect(notebook.getByLabel('My written evidence for the current run', { exact: true })).toBeFocused();
  await expect(notebook.getByLabel('My written evidence for the current run', { exact: true })).toHaveValue(evidence.notes);
  await notebook.screenshot({ path: path.join(out, 'resistance-removal-desktop.png') });
  await page.setViewportSize({ width: 320, height: 800 });
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await notebook.screenshot({ path: path.join(out, 'resistance-removal-phone.png') });
  await notebook.getByRole('button', { name: 'Save evidence', exact: true }).click();
  await expect.poll(async () => (await state(page)).resistanceNotebook.records.map((item: any) => item.id)).toEqual([8]);
  expect((await state(page)).resistanceInvestigation).toEqual(currentRun);
  expect(errors).toEqual([]);
});
