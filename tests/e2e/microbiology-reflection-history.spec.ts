import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 90000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-reflection-history-2026-09-30');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const source = readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
const bankStart = source.indexOf('var QUIZ_QUESTIONS = [');
const bank = new Function(source.slice(bankStart, source.indexOf('// INTERACTIVE WIDGETS', bankStart)) + '\nreturn QUIZ_QUESTIONS;')() as { q: string; choices: string[]; answer: number; explain: string }[];
let errors: string[];
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
const state = (page: Page) => page.evaluate(() => (window as any).__toolData.microbiology);
async function mount(page: Page, seed: Record<string, unknown>) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { microbiology: seed }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
}
async function reload(page: Page) {
  const saved = JSON.parse(JSON.stringify(await state(page))); await harness.unmount(page);
  await page.evaluate(data => (window as any).__mount({ microbiology: data }), saved); return saved;
}
async function phone(page: Page, width = 320) {
  await page.setViewportSize({ width, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function open(details: Locator) {
  if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) { await details.locator(':scope > summary').press('Enter'); }
  await expect(details).toHaveAttribute('open', '');
}
async function download(page: Page, button: Locator, name: string) {
  await button.focus(); const pending = page.waitForEvent('download'); await page.keyboard.press('Enter');
  const file = await pending; const text = readFileSync((await file.path())!, 'utf8'); await file.saveAs(path.join(out, name));
  await expect(button).toBeFocused(); return text;
}
function csv(text: string) {
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\r' || char === '\n') && !quoted) { row.push(cell); rows.push(row); row = []; cell = ''; if (char === '\r' && text[i + 1] === '\n') i++; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift()!; return rows.map(values => Object.fromEntries(headers.map((name, i) => [name, values[i]])));
}
const evidence = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: 'My original saved counts.',
  history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] };

test('Home resumes a saved Resistance reflection and both export formats distinguish it from original evidence', async ({ page }) => {
  await mount(page, { tab: 'home', resistanceNotebook: { records: [{ id: 3, evidence, reviewNote: 'Already reflected.' }, { id: 7, evidence }], selectedId: 3, nextId: 8 },
    resistanceComparison: { aId: 3, bId: 7 }, resistanceInvestigation: { ...evidence, dose: 60, notes: 'Keep my live working notes.' } });
  const originals = await page.evaluate(() => (window as any).__MicrobiologyCore.resistance.normalizeNotebook((window as any).__toolData.microbiology.resistanceNotebook).records.map((record: any) => record.evidence));
  await phone(page); const card = page.locator('[data-work-card="resistance"]');
  await expect(card).toContainText('Saved snapshots without a later reflection: 1');
  await card.screenshot({ path: path.join(out, 'resistance-reflection-home-phone.png') });
  await page.locator('[data-work-next="resistance"]').focus(); await page.keyboard.press('Enter');
  const note = page.locator('#micro-resistance-reflection-7'); await expect(note).toBeFocused();
  const live = (await state(page)).resistanceInvestigation;
  const reflection = '=SUM(1,2)\nI compared the living count with its resistant share.';
  await note.fill(reflection); await expect(note).toBeFocused();
  expect(await page.locator('#micro-resistance-saved-counts').evaluate(table => table.scrollWidth <= table.clientWidth + 1)).toBe(true);
  await expect(page.locator('#micro-resistance-saved-counts thead th')).toHaveCount(5);
  const saved = await state(page); expect(saved.resistanceNotebook.records.map((record: any) => record.evidence)).toEqual(originals);
  expect(saved.resistanceInvestigation).toEqual(live); expect(saved.resistanceComparison).toEqual({ aId: 3, bId: 7 });
  await note.locator('..').screenshot({ path: path.join(out, 'resistance-reflection-phone.png') });
  const report = await download(page, page.getByRole('button', { name: 'Download resistance notebook', exact: true }), 'resistance-reflections.txt');
  expect(report).toContain(evidence.notes); expect(report).toContain('Later reflection: ' + reflection);
  const rows = csv(await download(page, page.getByRole('button', { name: 'Download resistance CSV', exact: true }), 'resistance-reflections.csv'));
  expect(rows.find(row => row.evidence_id === '7')?.later_reflection).toBe("'" + reflection);
  await open(page.locator('#micro-resistance-comparison'));
  const pairedText = await download(page, page.locator('#micro-resistance-comparison-download-text'), 'resistance-reflections-pair.txt');
  expect(pairedText).toContain(evidence.notes); expect(pairedText).toContain('Later reflection: ' + reflection);
  const paired = csv(await download(page, page.locator('#micro-resistance-comparison-download-csv'), 'resistance-reflections-pair.csv'));
  expect(paired[1].written_evidence).toBe(evidence.notes); expect(paired[1].later_reflection).toBe("'" + reflection); expect(paired[2].later_reflection).toBe('');
  await reload(page); await open(page.locator('.micro-resistance-saved'));
  await expect(note).toHaveValue(reflection); expect((await state(page)).resistanceInvestigation).toEqual(live);
  await page.getByRole('tab', { name: 'Home', exact: true }).click(); await expect(page.locator('[data-work-next="resistance"]')).toHaveText('Review saved evidence 7');
});

test('Home explicitly selects repaired Resistance identity without attaching an old missing comparison choice', async ({ page }) => {
  await mount(page, { tab: 'home', resistanceNotebook: { records: [{ id: 'broken', evidence }, { id: 1, evidence, reviewNote: 'Already reflected.' }], selectedId: 2, nextId: 20 }, resistanceComparison: { aId: 2, bId: 1 } });
  await page.locator('[data-work-next="resistance"]').click(); const note = page.locator('#micro-resistance-reflection-2'); await expect(note).toBeFocused();
  await note.fill('This reflection belongs to the repaired first record.');
  let saved = await state(page); expect(saved.resistanceNotebook.records.map((record: any) => record.id)).toEqual([2, 1]); expect(saved.resistanceComparison).toEqual({ aId: null, bId: 1 });
  await reload(page); await open(page.locator('.micro-resistance-saved')); await expect(note).toHaveValue('This reflection belongs to the repaired first record.');
  await open(page.locator('#micro-resistance-comparison')); await expect(page.locator('#micro-resistance-compare-a')).toHaveValue('');
  await expect(page.locator('#micro-resistance-comparison-download-csv')).toBeDisabled(); saved = await state(page); expect(saved.resistanceComparison.aId).toBeNull();
});

test('quiz correction reflections remain ungraded across practice retries, results, reload, and downloads', async ({ page }) => {
  const answers = bank.map((question, index) => [0, 2].includes(index) ? (question.answer + 1) % question.choices.length : question.answer);
  await mount(page, { tab: 'quiz', quizAnswers: answers, quizSubmitted: true, quizCorrect: 13, quizBestCorrect: 13, quizMode: 'review' });
  const reflection = '<strong>My reasoning</strong>\nI now use the relevant mechanism rather than the surface clue.';
  const note = page.locator('#micro-quiz-reflection-0'); await note.fill(reflection);
  await page.getByRole('button', { name: 'Practice missed questions', exact: true }).click(); await expect(note).toHaveValue(reflection);
  await page.locator(`input[name="micro-quiz-practice-0"][value="${bank[0].answer}"]`).check();
  await page.locator('#micro-quiz-question-0').getByRole('button').click(); await expect(page.locator('[data-quiz-practice-status="0"]')).toContainText('Checked correct');
  await page.locator(`input[name="micro-quiz-practice-0"][value="${(bank[0].answer + 1) % bank[0].choices.length}"]`).check();
  await expect(page.locator('[data-quiz-practice-status="0"]')).toContainText('Unchecked practice answer'); await expect(note).toHaveValue(reflection);
  await page.getByRole('button', { name: 'Return to quiz results', exact: true }).click(); await expect(note).toHaveValue(reflection);
  await phone(page, 390); await page.locator('.micro-quiz-card').first().screenshot({ path: path.join(out, 'quiz-correction-reflection-phone.png') });
  const before = await state(page); const report = await download(page, page.locator('#micro-quiz-download'), 'quiz-correction-reflections.txt');
  expect(report).toContain('Original score: 13/15'); expect(report).toContain('Original answer: ' + bank[0].choices[answers[0]]);
  expect(report).toContain('Correction reflection (learner written, ungraded): ' + reflection); expect(report).toContain('Practice status: Unchecked practice answer');
  expect(await state(page)).toEqual(before); await reload(page); await expect(note).toHaveValue(reflection);
  const restored = await download(page, page.locator('#micro-quiz-download'), 'quiz-correction-reflections-restored.txt'); expect(restored).toBe(report);
  await page.getByRole('button', { name: 'Start a new quiz', exact: true }).click(); await expect(page.locator('#micro-quiz-download')).toBeDisabled();
  expect((await state(page)).quizPractice).toEqual({}); await expect(note).toHaveCount(0);
});

test('incomplete quiz exports omit injected correction reflections and solutions', async ({ page }) => {
  await mount(page, { tab: 'quiz', quizAnswers: [bank[0].answer, '1'], quizSubmitted: true, quizCorrect: 99,
    quizPractice: { answers: bank.map(question => question.answer), checked: bank.map(() => true), reflections: bank.map(() => 'Injected private correction reflection.') } });
  const before = await state(page); await expect(page.locator('[data-quiz-reflection]')).toHaveCount(0);
  const report = await download(page, page.locator('#micro-quiz-download'), 'quiz-incomplete-reflection-gate.txt');
  expect(report).toContain('Recorded answers: 1/15'); expect(report).not.toContain('Injected private');
  expect(report).not.toMatch(/Original score:|Correct answer:|Explanation:|Practice status:|Correction reflection \(/); expect(await state(page)).toEqual(before);
});

test('Gram report history replaces and swaps literal saved fields while keeping drafts, stages, and reload evidence', async ({ page }) => {
  const old = { prediction: 'thin', interpretation: 'wall', explanation: 'My first explanation with an incorrect prediction.' };
  const prior = { prediction: '', interpretation: 'wall', explanation: 'An earlier legacy report.' };
  const draft = 'I observed when A and B separated, then explained their different envelopes.';
  await mount(page, { tab: 'bacteria', gramStep: 2, gramInvestigation: { step: 2, maxStep: 4, prediction: 'thick', interpretation: 'wall', explanation: draft, record: old, previousRecord: prior }, growthLab: { hypothesis: 'Keep independent Growth work.' } });
  expect((await state(page)).gramInvestigation.previousRecord).toEqual(prior);
  const save = page.locator('#micro-gram-save'); await save.focus(); await page.keyboard.press('Enter'); await expect(page.locator('#micro-gram-record-heading')).toBeFocused();
  let saved = await state(page); const current = saved.gramInvestigation.record; expect(saved.gramInvestigation.previousRecord).toEqual(old);
  await expect(save).toBeDisabled(); await open(page.locator('#micro-gram-history'));
  await expect(page.locator('[data-gram-previous-field="explanation"]')).toContainText(old.explanation);
  await phone(page); await page.locator('#micro-gram-history').screenshot({ path: path.join(out, 'gram-report-history-phone.png') });
  const report = await download(page, page.locator('.micro-gram-export button'), 'gram-current-previous-working.txt');
  expect(report).toContain(draft); expect(report).toContain(old.explanation); expect(report).not.toContain(prior.explanation);
  expect(report).toContain('Previous saved Gram-stain report (available to restore)'); expect(report).toContain('It does not store a historical log of observed stages.');
  const restore = page.locator('#micro-gram-restore'); await restore.focus(); await page.keyboard.press('Enter'); await expect(page.locator('#micro-gram-record-heading')).toBeFocused();
  saved = await state(page); expect(saved.gramInvestigation.record).toEqual(old); expect(saved.gramInvestigation.previousRecord).toEqual(current);
  expect(saved.gramInvestigation.explanation).toBe(draft); expect(saved.gramInvestigation.step).toBe(2); expect(saved.gramInvestigation.maxStep).toBe(4);
  await expect(page.locator('#micro-gram-history-status')).toContainText('Previous Gram report restored.');
  await reload(page); await open(page.locator('#micro-gram-history')); await expect(page.locator('#micro-gram-history-status')).toHaveText('');
  await restore.click(); await expect(page.locator('#micro-gram-record-heading')).toBeFocused(); expect((await state(page)).gramInvestigation.record).toEqual(current);
  await page.getByRole('button', { name: 'Start a new investigation', exact: true }).click(); await expect(page.locator('#micro-gram-prediction-thick')).toBeFocused();
  saved = await state(page); expect(saved.gramInvestigation.record).toEqual(current); expect(saved.gramInvestigation.previousRecord).toEqual(old);
  expect(saved.gramInvestigation.explanation).toBe(''); expect(saved.gramInvestigation.maxStep).toBe(0); expect(saved.growthLab.hypothesis).toBe('Keep independent Growth work.');
  await reload(page); const restarted = await download(page, page.locator('.micro-gram-export button'), 'gram-history-after-restart.txt');
  expect(restarted).toContain(old.explanation); expect(restarted).toContain(draft); expect(restarted).toContain('0/4');
});
