import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ mode: 'serial', retries: 0, timeout: 90000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-workspace-evidence-2026-09-28');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });
async function mount(page: any, seed = {}) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { microbiology: { tab: 'home', ...seed } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
}
const state = (page: any) => page.evaluate(() => (window as any).__toolData.microbiology);
async function noOverflow(page: any) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); }

test('resumes saved work from Home and repairs an incomplete saved quiz without inventing a score', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const result = { value: 2, unit: 'um', context: { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 } };
  const seed = {
    microscopeMeasurements: { ecoli: { result, draft: { ...result, value: '3' } } },
    growthInvestigation: { control: {}, hypothesis: 'Keep my next comparison', trials: [{ id: 7, conditions: {}, control: {}, explanation: '' }] },
    gramInvestigation: { step: 2, maxStep: 3, prediction: 'thin', explanation: 'Keep my original notes' },
    quizAnswers: [0], quizSubmitted: true
  };
  await mount(page, seed);
  await expect(page.getByRole('heading', { name: 'Continue your investigations', exact: true })).toBeVisible();
  await expect(page.locator('[data-work-card]')).toHaveCount(6);
  await expect(page.locator('[data-work-card="microscope"]')).toContainText('1/5');
  await expect(page.locator('[data-work-card="microscope"]')).toContainText('Slides with an unchecked working estimate: 1');
  await expect(page.locator('[data-work-card="growth"]')).toContainText('Saved trials without a written explanation: 1');
  await expect(page.locator('[data-work-card="quiz"]')).toContainText('1/15');
  await page.screenshot({ path: path.join(out, 'workspace-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  await page.screenshot({ path: path.join(out, 'workspace-phone.png') });
  const openGram = page.getByRole('button', { name: 'Open Gram-stain investigation', exact: true });
  await openGram.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#micro-gram-heading')).toBeFocused();
  await expect(page.locator('#micro-gram-explanation')).toHaveValue(seed.gramInvestigation.explanation);
  expect((await state(page)).microscopeMeasurements).toEqual(seed.microscopeMeasurements);
  expect((await state(page)).growthInvestigation).toEqual(seed.growthInvestigation);
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Open quiz and practice', exact: true }).click();
  const quiz = page.getByRole('region', { name: 'Microbiology quiz and review', exact: true });
  await expect(quiz).toContainText('Some saved answers are missing or invalid.');
  await expect(quiz.locator('[data-quiz-original-score]')).toHaveCount(0);
  await expect(quiz.locator('input[name="micro-quiz-answer-0"][value="0"]')).toBeChecked();
  await expect(quiz.getByRole('button', { name: 'Submit quiz', exact: true }).first()).toBeDisabled();
  await noOverflow(page);
  for (let i = 1; i < 15; i++) await quiz.locator(`input[name="micro-quiz-answer-${i}"][value="0"]`).check();
  expect((await state(page)).quizSubmitted).toBe(false);
  await expect(quiz.locator('[data-quiz-original-score]')).toHaveCount(0);
  await quiz.getByRole('button', { name: 'Submit quiz', exact: true }).first().click();
  expect((await state(page)).quizSubmitted).toBe(true);
  await expect(quiz.locator('[data-quiz-original-score]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('investigates Gram staining, corrects an interpretation, and preserves a recorded report through draft edits and restart', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page);
  await page.getByRole('button', { name: 'Open Gram-stain investigation', exact: true }).click();
  const lab = page.locator('#micro-gram-lab');
  const stages = lab.locator('.micro-gram-stages button');
  await expect(stages.nth(1)).toBeDisabled();
  await lab.locator('input[name="micro-gram-prediction"][value="thin"]').check();
  await stages.nth(1).click();
  await expect(lab.locator('input[name="micro-gram-prediction"][value="thin"]')).toBeDisabled();
  await expect(stages.nth(3)).toBeDisabled();
  await stages.nth(2).click(); await stages.nth(3).click();
  await expect(lab.locator('.micro-gram-observation')).toContainText('Model A — Purple; Model B — Colorless');
  await expect(lab).toContainText('The observation differed from your prediction.');
  for (const model of ['A', 'B']) {
    await expect(lab.locator(`[data-model="${model}"] circle`)).toHaveCount(3);
    await expect(lab.locator(`[data-model="${model}"] rect`)).toHaveCount(3);
  }
  await stages.nth(4).click();
  await expect(lab.locator('.micro-gram-observation')).toContainText('Model A — Purple; Model B — Pink');
  await lab.locator('input[name="micro-gram-interpretation"][value="shape"]').check();
  await expect(lab.locator('.micro-gram-feedback')).toContainText('Round cells and rods share the same color');
  await expect(lab.getByRole('button', { name: 'Save Gram-stain report', exact: true })).toBeDisabled();
  await lab.locator('input[name="micro-gram-interpretation"][value="wall"]').check();
  const explanation = 'Both models retained purple until decolorization, when B lost the dye. The envelope structure explains the difference.';
  await lab.locator('#micro-gram-explanation').fill(explanation);
  await lab.getByRole('button', { name: 'Save Gram-stain report', exact: true }).click();
  await expect(lab.getByRole('button', { name: 'Report saved', exact: true })).toBeDisabled();
  const record = (await state(page)).gramInvestigation.record;
  await lab.locator('#micro-gram-explanation').fill('A new draft after reviewing the observations.');
  await expect(lab.locator('.micro-gram-record blockquote')).toHaveText(explanation);
  await stages.nth(3).click();
  await lab.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'gram-investigation-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  await lab.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'gram-investigation-phone.png') });
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(page.locator('[data-work-card="gram"]')).toContainText('An unfinished revision is separate from your saved report.');
  await page.getByRole('button', { name: 'Open Gram-stain investigation', exact: true }).click();
  await expect(lab.locator('#micro-gram-explanation')).toHaveValue('A new draft after reviewing the observations.');
  const saved = await state(page); await harness.unmount(page);
  await page.evaluate(data => (window as any).__mount({ microbiology: data }), saved);
  await expect(stages.nth(3)).toHaveAttribute('aria-current', 'step');
  expect((await state(page)).gramInvestigation.record).toEqual(record);
  await lab.getByRole('button', { name: 'Start a new investigation', exact: true }).click();
  await expect(stages.nth(1)).toBeDisabled();
  await expect(lab.locator('#micro-gram-explanation')).toHaveValue('');
  await expect(lab.locator('.micro-gram-record blockquote')).toHaveText(explanation);
  await noOverflow(page);
  expect(errors).toEqual([]);
});
