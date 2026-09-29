import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ mode: 'serial', retries: 0, timeout: 90000 });
const out = path.resolve('reports/micro-lab-evidence-refinement-2026-09-29');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

async function mount(page: Page, seed = {}) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { microbiology: { tab: 'home', ...seed } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
}
const state = (page: Page) => page.evaluate(() => (window as any).__toolData.microbiology);
const home = (page: Page) => page.getByRole('tab', { name: 'Home', exact: true }).click();
const open = (page: Page) => page.getByRole('button', { name: 'Open Gram-stain investigation', exact: true }).click();

test('rejects malformed Gram stage progress on Home and retains an independent valid saved report', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, { gramStep: 99 });
  const card = page.locator('[data-work-card="gram"]');
  await expect(card.locator('strong')).toHaveText('0/4');
  await expect(card).toContainText('Next: choose a prediction for this investigation.');
  await expect(card.locator('.micro-workspace-status')).toHaveText('Ready to begin');

  const record = { prediction: 'both', interpretation: 'wall', explanation: 'The envelopes explain why the models differ at decolorization.' };
  await harness.unmount(page);
  await page.evaluate(data => (window as any).__mount({ microbiology: data }), {
    tab: 'home', gramStep: 99, gramInvestigation: { step: 99, maxStep: 4.5, record }
  });
  await expect(card.locator('strong')).toHaveText('0/4');
  await expect(card).toContainText('An unfinished revision is separate from your saved report.');
  await expect(card).toContainText('Next: choose a prediction for this investigation.');
  await open(page);
  const lab = page.locator('#micro-gram-lab');
  await expect(lab.locator('.micro-gram-stages button').first()).toHaveAttribute('aria-current', 'step');
  await expect(lab.locator('.micro-gram-stages button').nth(1)).toBeDisabled();
  await expect(lab.locator('.micro-gram-record blockquote')).toHaveText(record.explanation);
  await expect(lab.getByRole('button', { name: 'Save Gram-stain report', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('announces and focuses a saved report, shows its unfinished revision, and restores a new investigation without losing the report', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, { growthLab: { hypothesis: 'Keep this independent growth note.' } });
  await open(page);
  const lab = page.locator('#micro-gram-lab');
  await expect(page.locator('#micro-gram-heading')).toBeFocused();
  await lab.locator('#micro-gram-prediction-thin').check();
  const stages = lab.locator('.micro-gram-stages button');
  for (let i = 1; i <= 4; i++) await stages.nth(i).click();
  await lab.locator('input[name="micro-gram-interpretation"][value="wall"]').check();
  const explanation = 'At decolorization model A remained purple and B lost the dye. Their cell envelopes explain this difference.';
  await lab.locator('#micro-gram-explanation').fill(explanation);
  const save = lab.getByRole('button', { name: 'Save Gram-stain report', exact: true });
  await save.focus(); await page.keyboard.press('Enter');
  await expect(lab.locator('#micro-gram-record-heading')).toBeFocused();
  await expect(lab.locator('#micro-gram-save-status')).toHaveAttribute('role', 'status');
  await expect(lab.locator('#micro-gram-save-status')).toHaveAttribute('aria-live', 'polite');
  await expect(lab.locator('#micro-gram-save-status')).toContainText('Your Gram-stain report is saved.');
  await expect(lab.getByRole('button', { name: 'Report saved', exact: true })).toBeDisabled();
  const report = (await state(page)).gramInvestigation.record;
  await lab.locator('.micro-gram-record').screenshot({ path: path.join(out, 'gram-saved-report-focus.png') });

  await lab.locator('#micro-gram-explanation').fill('An unfinished alternative explanation.');
  await lab.locator('input[name="micro-gram-interpretation"][value="shape"]').check();
  await expect(lab.locator('#micro-gram-save-status')).toHaveText('');
  await home(page);
  const card = page.locator('[data-work-card="gram"]');
  await expect(card).toContainText('An unfinished revision is separate from your saved report.');
  await expect(card).toContainText('Next: choose the interpretation supported by the observations.');
  expect((await state(page)).gramInvestigation.record).toEqual(report);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await card.screenshot({ path: path.join(out, 'gram-home-revision-phone.png') });
  await open(page);
  const restart = lab.getByRole('button', { name: 'Start a new investigation', exact: true });
  await restart.focus(); await page.keyboard.press('Enter');
  await expect(lab.locator('#micro-gram-prediction-thick')).toBeFocused();
  await expect(lab.locator('#micro-gram-prediction-thick')).toBeEnabled();
  await expect(lab.locator('#micro-gram-explanation')).toHaveValue('');
  await expect(lab.locator('.micro-gram-record blockquote')).toHaveText(explanation);
  await expect(stages.nth(1)).toBeDisabled();
  await home(page);
  await expect(card).toContainText('Next: choose a prediction for this investigation.');

  const restored = JSON.parse(JSON.stringify(await state(page)));
  await harness.unmount(page);
  await page.evaluate(data => (window as any).__mount({ microbiology: data }), restored);
  await expect(card.locator('strong')).toHaveText('0/4');
  await expect(card).toContainText('An unfinished revision is separate from your saved report.');
  await expect(card).toContainText('Next: choose a prediction for this investigation.');
  await open(page);
  await expect(lab.locator('.micro-gram-record blockquote')).toHaveText(explanation);
  expect((await state(page)).gramInvestigation.record).toEqual(report);
  expect((await state(page)).growthLab.hypothesis).toBe('Keep this independent growth note.');
  expect(errors).toEqual([]);
});
