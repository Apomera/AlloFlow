import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 90000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-guided-resume-2026-09-29');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
let errors: string[];
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', e => errors.push(e.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
const source = readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
const bankStart = source.indexOf('var QUIZ_QUESTIONS = [');
const bank = new Function(source.slice(bankStart, source.indexOf('// INTERACTIVE WIDGETS', bankStart)) + '\nreturn QUIZ_QUESTIONS;')();
const state = (page: any) => page.evaluate(() => (window as any).__toolData.microbiology);
async function mount(page: any, seed = {}) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { microbiology: { tab: 'home', ...seed } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
}
async function enter(page: any, activity: string) { await page.locator(`[data-work-next="${activity}"]`).focus(); await page.keyboard.press('Enter'); }
async function phone(page: any, width = 390) {
  await page.setViewportSize({ width, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function reload(page: any) {
  const saved = await state(page); await harness.unmount(page);
  await page.evaluate(data => (window as any).__mount({ microbiology: data }), saved); return saved;
}
const claims = { pond: 'protist', budding: 'yeast', wall: 'bacterium', salt: 'archaeon', particle: 'phage', unresolved: 'unresolved' };
const report = (claim: string) => ({ claim, evidence: ['structure', 'behavior'], reasoning: 'The supplied observations support this classification; the species is unresolved.', limitation: 'bounded' });

test('Home finds Mystery revisions, opens working notes, and cycles without replacing reports', async ({ page }) => {
  const cases = Object.fromEntries(Object.entries(claims).map(([id, claim]) => {
    const saved = report(claim); return [id, { ...saved, revealed: ['context', 'structure', 'behavior'], collapsed: ['structure'], checked: false, reportView: 'recorded', record: saved,
      previousRecord: { ...saved, reasoning: 'An earlier recorded explanation.' }, reasoning: ['pond', 'budding'].includes(id) ? `Working revision for ${id}.` : saved.reasoning }];
  }));
  const seed = { mysteryLab: { active: 'unresolved', cases }, growthInvestigation: { selectedId: 2, trials: [{ id: 1, conditions: {}, control: {}, explanation: '' }, { id: 2, conditions: {}, explanation: 'Complete.' }] } };
  await mount(page, seed); await expect(page.locator('[data-work-next="mystery"]')).toContainText('Review working revision · A:');
  await page.screenshot({ path: path.join(out, 'guided-home-desktop.png') }); await phone(page, 320);
  await page.locator('[data-work-next="mystery"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'guided-home-phone.png') }); await enter(page, 'mystery');
  await expect(page.locator('#micro-mystery-report-heading')).toBeFocused();
  await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-case', 'pond');
  await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-report-view', 'working');
  await expect(page.locator('#micro-mystery-reasoning')).toHaveValue('Working revision for pond.');
  await page.locator('[data-mystery-next-revision="budding"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#micro-mystery-report-heading')).toBeFocused();
  await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-case', 'budding');
  const after = await state(page);
  for (const id of Object.keys(claims)) {
    const actual = { ...after.mysteryLab.cases[id] }, expected = { ...cases[id] }; delete actual.reportView; delete expected.reportView;
    expect(actual).toEqual(expected);
  }
  await phone(page); await page.locator('[data-mystery-next-revision="pond"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'mystery-revision-navigation-phone.png') });
  await reload(page); await expect(page.locator('#micro-mystery-report-heading')).toHaveAttribute('data-case', 'budding');
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(page.locator('[data-work-next="mystery"]')).toContainText('Review working revision · B:');
  expect(errors).toEqual([]);
});

test('Home opens an unchecked estimate in its notebook before the learner resumes the view', async ({ page }) => {
  const context = { version: 1, specimen: 'strep', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 1 };
  const seed = { scopeOrganism: 'ecoli', selectedScope: 'em', magnification: 10000, microscopeZoom: 4, microscopeFocus: 15, microscopeTargetFocus: 50,
    microscopeMeasurements: { strep: { draft: { value: '1.5', unit: 'um', context } } } };
  await mount(page, seed); await phone(page); await enter(page, 'microscope');
  const entry = page.locator('#micro-measurement-notebook-strep'); await expect(entry).toBeFocused();
  await expect(entry.locator('[data-measurement-draft="strep"]')).toBeVisible();
  for (const [key, value] of Object.entries(seed)) expect((await state(page))[key]).toEqual(value);
  await entry.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'unchecked-estimate-destination-phone.png') });
  await entry.getByRole('button', { name: 'Resume working view · Streptococcus', exact: true }).click();
  const resumed = await state(page); expect(resumed).toMatchObject({ scopeOrganism: 'strep', selectedScope: 'lightbright', magnification: 1000, microscopeZoom: 20 });
  expect(resumed.microscopeMeasurements).toEqual(seed.microscopeMeasurements);
  await reload(page); await page.getByRole('tab', { name: 'Home', exact: true }).click(); await enter(page, 'microscope'); await expect(entry).toBeFocused();
});

test('Home and the growth editor move through missing explanations while keeping the experiment', async ({ page }) => {
  const base = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 50 };
  const setup = { ...base, tempC: 18, pH: 6.5, oxygen: 25, hypothesis: 'Earlier notes', explanation: 'Keep these too', log: [] };
  const book = { selectedId: 9, nextId: 10, control: { ...base, tempC: 30 }, prediction: 'lower', hypothesis: 'My next comparison', explanation: '', sweepVariable: 'pH', sweep: null,
    trials: [{ id: 7, conditions: { ...base, pH: 5 }, control: base, prediction: 'lower', hypothesis: 'Before seven', explanation: ' ' },
      { id: 4, conditions: { ...base, tempC: 22 }, control: null, prediction: 'higher', hypothesis: 'Without a saved control', explanation: '' },
      { id: 9, conditions: base, control: base, prediction: '', hypothesis: '', explanation: 'Already explained.' }] };
  await mount(page, { growthInvestigation: book, growthReviewHour: 6, growthLab: setup }); await phone(page, 320); await enter(page, 'growth');
  await expect(page.locator('#gl-explanation')).toBeFocused(); await expect(page.locator('#gl-saved-result')).toHaveAttribute('data-micro-growth-result', '7');
  expect((await state(page)).growthInvestigation).toEqual({ ...book, selectedId: 7 }); expect((await state(page)).growthReviewHour).toBe(6);
  await page.locator('[data-next-unexplained-trial="4"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#gl-explanation')).toBeFocused(); await expect(page.locator('#gl-saved-result')).toHaveAttribute('data-micro-growth-recovered', '4');
  expect((await state(page)).growthInvestigation).toEqual({ ...book, selectedId: 4 }); expect((await state(page)).growthLab).toEqual(setup);
  await page.locator('#gl-explanation').fill('The trial lacks a saved control, so its comparison is unavailable.');
  await page.locator('[data-next-unexplained-trial="7"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'growth-explanation-navigation-phone.png') });
  await reload(page); await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(page.locator('[data-work-next="growth"]')).toHaveText('Explain saved trial 7');
  const restored = await state(page); expect(restored.growthInvestigation.control).toEqual(book.control); expect(restored.growthReviewHour).toBe(6); expect(restored.growthLab).toEqual(setup);
});

test('each Gram shortcut focuses the next action without advancing observations or replacing a report', async ({ page }) => {
  const record = { prediction: 'both', interpretation: 'wall', explanation: 'The models separate at decolorization.' };
  const states = [
    [{}, 'micro-gram-prediction-thick'],
    [{ prediction: 'thin', step: 1, maxStep: 2 }, 'micro-gram-stage-3'],
    [{ prediction: 'thick', step: 4, maxStep: 4, interpretation: 'shape' }, 'micro-gram-interpretation-heading'],
    [{ prediction: 'thick', step: 4, maxStep: 4, interpretation: 'wall', explanation: ' ' }, 'micro-gram-explanation'],
    [{ ...record, step: 3, maxStep: 4 }, 'micro-gram-save'],
    [{ ...record, step: 2, maxStep: 4, record }, 'micro-gram-record-heading']
  ] as const;
  for (const [gram, target] of states) {
    await mount(page, { gramInvestigation: gram, gramStep: 'step' in gram ? gram.step : 0 }); await phone(page); await enter(page, 'gram');
    await expect(page.locator(`#${target}`)).toBeFocused(); expect((await state(page)).gramInvestigation).toEqual(gram);
    if (target === 'micro-gram-stage-3') await expect(page.locator('#micro-gram-stage-1')).toHaveAttribute('aria-current', 'step');
    if (target === 'micro-gram-interpretation-heading') {
      await page.locator('#micro-gram-interpretation-heading').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'gram-next-step-phone.png') });
    }
    await harness.unmount(page);
  }
});

test('quiz shortcuts resume unanswered work, submission, and unchecked practice without changing the score', async ({ page }) => {
  await mount(page, { quizAnswers: [0, 'bad', 1], quizSubmitted: true, quizCorrect: 500 }); await phone(page, 320); await enter(page, 'quiz');
  await expect(page.locator('#micro-quiz-question-1')).toBeFocused(); expect((await state(page)).quizAnswers).toEqual([0, 'bad', 1]);
  await expect(page.locator('[data-quiz-original-score]')).toHaveCount(0); await harness.unmount(page);
  const correct = bank.map(q => q.answer); await mount(page, { quizAnswers: correct, quizSubmitted: false }); await enter(page, 'quiz');
  await expect(page.locator('#micro-quiz-submit')).toBeFocused(); expect((await state(page)).quizSubmitted).toBe(false); await harness.unmount(page);
  const original = bank.map((q, i) => [0, 7].includes(i) ? (q.answer + 1) % 4 : q.answer);
  const practice = { answers: correct, checked: bank.map((_, i) => i === 0) };
  await mount(page, { quizAnswers: original, quizSubmitted: true, quizCorrect: 13, quizPractice: practice, quizMode: 'review' }); await phone(page); await enter(page, 'quiz');
  await expect(page.locator('#micro-quiz-question-7')).toBeFocused(); await expect(page.locator('[data-quiz-original-score]')).toContainText('13/15');
  expect((await state(page)).quizAnswers).toEqual(original); expect((await state(page)).quizPractice).toEqual(practice);
  await page.locator('#micro-quiz-question-7').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'quiz-practice-destination-phone.png') });
  await reload(page); await expect(page.locator('#micro-quiz-heading')).toHaveAttribute('data-phase', 'practice');
});
