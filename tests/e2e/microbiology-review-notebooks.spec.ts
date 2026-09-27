import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 90000 });
const out = path.resolve('reports/micro-lab-review-refinement-2026-09-27');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const src = readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
const start = src.indexOf('var QUIZ_QUESTIONS = [');
const bank = new Function(src.slice(start, src.indexOf('// INTERACTIVE WIDGETS', start)) + '\nreturn QUIZ_QUESTIONS;')();
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });
async function mount(page: any, tab: string, seed = {}) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { microbiology: { tab, ...seed } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
}
const state = (page: any) => page.evaluate(() => (window as any).__toolData.microbiology);
async function noOverflow(page: any) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); }

test('uses keyboard quiz answers and preserves the first score while practicing a missed question', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page, 'quiz');
  const quiz = page.getByRole('region', { name: 'Microbiology quiz and review', exact: true });
  await expect(quiz.getByRole('button', { name: 'Submit quiz', exact: true }).first()).toBeDisabled();
  const first = quiz.locator('input[name="micro-quiz-answer-0"]').first();
  await first.focus(); await page.keyboard.press('ArrowRight');
  await expect(quiz.locator('input[name="micro-quiz-answer-0"][value="1"]')).toBeChecked();
  const wrong = (bank[0].answer + 1) % 4;
  await quiz.locator(`input[name="micro-quiz-answer-0"][value="${wrong}"]`).check();
  await quiz.getByRole('button', { name: 'Go to next unanswered question', exact: true }).click();
  await expect(quiz.locator('#micro-quiz-question-1')).toBeFocused();
  for (let i = 1; i < bank.length; i++) await quiz.locator(`input[name="micro-quiz-answer-${i}"][value="${bank[i].answer}"]`).check();
  await quiz.getByRole('button', { name: 'Submit quiz', exact: true }).last().click();
  await expect(quiz.getByRole('heading', { name: 'Review your quiz', exact: true })).toBeFocused();
  await expect(quiz.locator('[data-quiz-original-score]')).toHaveText('Original score: 14/15');
  await expect(quiz.locator('article')).toHaveCount(1);
  const original = (await state(page)).quizAnswers;
  await quiz.getByRole('button', { name: 'Practice missed questions', exact: true }).click();
  await expect(quiz.getByRole('heading', { name: 'Practice the questions you missed', exact: true })).toBeFocused();
  await quiz.locator(`input[name="micro-quiz-practice-0"][value="${bank[0].answer}"]`).check();
  await quiz.getByRole('button', { name: 'Check practice answer', exact: true }).click();
  await expect(quiz).toContainText('Correct after checking in practice: 1/1');
  expect((await state(page)).quizAnswers).toEqual(original);
  await quiz.locator('.micro-quiz-header').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'quiz-practice-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  await page.screenshot({ path: path.join(out, 'quiz-practice-phone.png') });
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await page.getByRole('tab', { name: 'Quiz', exact: true }).click();
  await expect(quiz).toContainText('Correct after checking in practice: 1/1');
  const saved = await state(page); await harness.unmount(page);
  await page.evaluate(data => (window as any).__mount({ microbiology: data }), saved);
  await expect(quiz.locator('[data-quiz-original-score]')).toHaveText('Original score: 14/15');
  await expect(quiz).toContainText('Correct in practice');
  expect(errors).toEqual([]);
});

test('restores a microscope measurement view and downloads original evidence while keeping a draft', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page, 'microscope');
  const scope = page.getByRole('region', { name: 'Virtual microscope investigation', exact: true });
  await scope.getByRole('button', { name: 'Open measurement notebook · 0/5', exact: true }).click();
  await expect(scope.getByRole('button', { name: 'Download measurement notebook', exact: true })).toBeDisabled();
  await scope.getByRole('button', { name: 'Prepare slide · E. coli', exact: true }).click();
  await scope.getByRole('button', { name: 'Focus assist', exact: true }).click();
  await scope.getByRole('button', { name: 'Go to size estimate', exact: true }).click();
  await expect(scope.getByLabel('Your size estimate', { exact: true })).toBeFocused();
  await scope.getByLabel('Your size estimate', { exact: true }).fill('2000');
  await scope.getByRole('button', { name: 'Check and save estimate', exact: true }).click();
  await expect(scope).toContainText('A unit mix-up may explain this difference');
  await scope.getByLabel('Estimate units', { exact: true }).selectOption('nm');
  await scope.getByRole('button', { name: 'Check and save estimate', exact: true }).click();
  const result = (await state(page)).microscopeMeasurements.ecoli.result;
  await scope.getByLabel('Your size estimate', { exact: true }).fill('3');
  await scope.getByRole('button', { name: 'Open measurement notebook · 1/5', exact: true }).click();
  await scope.getByRole('button', { name: 'Prepare slide · T4 bacteriophage', exact: true }).click();
  await scope.getByRole('button', { name: 'Review saved view · E. coli', exact: true }).click();
  await expect(scope.getByLabel('Your size estimate', { exact: true })).toHaveValue('3');
  await expect(scope.getByLabel('Your size estimate', { exact: true })).toBeFocused();
  expect((await state(page)).microscopeMeasurements.ecoli.result).toEqual(result);
  expect((await state(page)).magnification).toBe(result.context.mag);
  expect((await state(page)).microscopeZoom).toBe(result.context.zoom);
  await scope.getByRole('button', { name: 'Open measurement notebook · 1/5', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await scope.getByRole('button', { name: 'Download measurement notebook', exact: true }).click();
  const download = await downloadPromise; await download.saveAs(path.join(out, 'measurement-notebook.txt'));
  const text = readFileSync(path.join(out, 'measurement-notebook.txt'), 'utf8');
  expect(text).toContain('2000 nm'); expect(text).toContain('1/5'); expect(text).toContain('T4 bacteriophage');
  expect(text).not.toContain('Your estimate: 3 nm');
  await page.screenshot({ path: path.join(out, 'measurement-notebook-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  await page.screenshot({ path: path.join(out, 'measurement-notebook-phone.png') });
  expect(errors).toEqual([]);
});

test('compares each saved growth run with its own control and keeps stable IDs when removing a run', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const base = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
  const current = { profile: 'thermus', tempC: 70, pH: 7.5, oxygen: 100 };
  const trials = [
    { id: 3, control: base, conditions: { ...base, oxygen: 0 }, prediction: 'higher', hypothesis: 'Original prediction', explanation: 'Evidence for trial three' },
    { id: 9, control: { ...base, oxygen: 0 }, conditions: base, prediction: 'higher', explanation: 'Evidence for trial nine' }
  ];
  await mount(page, 'growthLab', { growthLab: current, growthInvestigation: { trials, selectedId: 9, nextId: 10, control: current, hypothesis: 'Next run draft', prediction: 'similar' } });
  await page.getByText('Compare saved runs', { exact: true }).click();
  const review = page.locator('.micro-growth-review');
  await expect(review).toContainText('different saved controls');
  await expect(review.locator('tbody th')).toHaveText(['Trial 3', 'Trial 9']);
  await review.getByRole('button', { name: 'Trial 3', exact: true }).click();
  await expect(page.locator('#gl-explanation')).toHaveValue('Evidence for trial three');
  await expect(page.locator('#gl-hypothesis')).toHaveValue('Next run draft');
  const book = (await state(page)).growthInvestigation;
  await page.getByRole('button', { name: 'Use saved trial settings', exact: true }).click();
  expect((await state(page)).growthInvestigation).toEqual(book);
  expect((await state(page)).growthLab).toMatchObject(trials[0].conditions);
  await review.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'growth-review-desktop.png') });
  await page.setViewportSize({ width: 320, height: 800 }); await noOverflow(page);
  await review.scrollIntoViewIfNeeded();
  await review.locator('.micro-growth-table-wrap').focus();
  await page.keyboard.press('ArrowRight');
  await page.screenshot({ path: path.join(out, 'growth-review-phone.png') });
  await page.getByRole('button', { name: 'Remove selected trial', exact: true }).click();
  await expect(review.locator('tbody th')).toHaveText(['Trial 9']);
  await expect(page.locator('.micro-growth-trials strong')).toHaveText(['Trial 9']);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notebook', exact: true }).click();
  const download = await downloadPromise; await download.saveAs(path.join(out, 'growth-notebook.txt'));
  const text = readFileSync(path.join(out, 'growth-notebook.txt'), 'utf8');
  expect(text).toContain('\nTrial 9\n'); expect(text).not.toContain('\nTrial 1\n');
  expect(errors).toEqual([]);
});

test('reads the corrected print reference on a phone and in print media', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page, 'print');
  const reference = page.locator('#micro-print-region');
  await expect(reference.locator('caption')).toBeVisible();
  await expect(reference.locator('tbody th[scope="row"]')).not.toHaveCount(0);
  await expect(reference).toContainText(/risk.assessment framework/);
  await expect(reference).not.toContainText('Lethal, no vaccine');
  const phage = reference.getByRole('row').filter({ hasText: 'T4' });
  await expect(phage).toContainText('bacteria');
  await expect(phage).not.toContainText('pathogen');
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  await reference.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'reference-phone.png') });
  await page.setViewportSize({ width: 1000, height: 1000 }); await page.emulateMedia({ media: 'print' });
  await reference.screenshot({ path: path.join(out, 'reference-print.png') });
  expect(errors).toEqual([]);
});
