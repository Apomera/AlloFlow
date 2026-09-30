import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 90000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-evidence-exports-2026-09-29');
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
async function phone(page: Page, width = 320) {
  await page.setViewportSize({ width, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function reload(page: Page) {
  const saved = await state(page); await harness.unmount(page);
  await page.evaluate(data => (window as any).__mount({ microbiology: data }), saved); return saved;
}
async function open(page: Page, selector: string) {
  const details = page.locator(selector);
  if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) { await details.locator(':scope > summary').focus(); await page.keyboard.press('Enter'); }
  await expect(details).toHaveAttribute('open', ''); return details;
}
async function download(page: Page, selector: string, savedName: string) {
  const button = page.locator(selector); await button.focus();
  const pending = page.waitForEvent('download'); await page.keyboard.press('Enter'); const file = await pending;
  const text = readFileSync((await file.path())!, 'utf8'); await file.saveAs(path.join(out, savedName));
  await expect(button).toBeFocused(); return { text, name: file.suggestedFilename() };
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
const snapshotA = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: '=COUNT("x"), evidence\nA keeps both rounds.',
  history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 64, resistant: 8 }, { day: 2, sensitive: 60, resistant: 8 }] };
const snapshotB = { dose: 60, duration: 8, initRes: 10, prediction: 'increase', notes: 'B has fewer resistant cells with a higher share.',
  history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 2, resistant: 6 }] };
const extinct = { dose: 100, duration: 3, initRes: 0, prediction: 'extinct', explanation: 'extinction', explanationSubmitted: true, notes: 'No living cells.',
  history: [{ day: 0, sensitive: 80, resistant: 0 }, { day: 1, sensitive: 0, resistant: 0 }] };

test('downloads paired Resistance evidence with distinct shared-round and endpoint counts', async ({ page }) => {
  await mount(page, { tab: 'resistance', resistanceInvestigation: snapshotA, resistanceNotebook: {
    records: [{ id: 7, evidence: snapshotA }, { id: 4, evidence: snapshotB }, { id: 9, evidence: extinct }], selectedId: 7, nextId: 12
  }, resistanceComparison: { aId: 7, bId: 4 } });
  const before = await state(page); const comparison = await open(page, '#micro-resistance-comparison');
  const report = await download(page, '#micro-resistance-comparison-download-text', 'resistance-comparison.txt');
  expect(report.name).toContain('A7-B4-round1'); expect(report.text).toContain('Shared comparison round: 1');
  expect(report.text).toContain('Resistant cells\t8\t6\t-2'); expect(report.text).toContain('+64 percentage points');
  expect(report.text).toContain('2\t60\t8\t68\t12%'); expect(report.text).toContain(snapshotA.notes);
  const file = await download(page, '#micro-resistance-comparison-download-csv', 'resistance-comparison.csv');
  const rows = csv(file.text); expect(rows.map(row => row.row_kind)).toEqual(['snapshot_a', 'snapshot_b', 'difference_b_minus_a']);
  expect(rows[0]).toMatchObject({ evidence_id: '7', shared_round: '1', saved_end_round: '2', shared_total_alive: '72', shared_resistant_share_pct_rounded: '11', saved_end_total_alive: '68', saved_end_resistant_share_pct_rounded: '12', written_evidence: "'" + snapshotA.notes });
  expect(rows[1]).toMatchObject({ shared_resistant_cells: '6', shared_total_alive: '8' });
  expect(rows[2]).toMatchObject({ shared_resistant_cells: '-2', shared_share_difference_percentage_points: '64', evidence_id: '', saved_end_total_alive: '' });
  expect(await state(page)).toEqual(before);
  await phone(page); await comparison.screenshot({ path: path.join(out, 'resistance-comparison-export-phone.png') });
  await page.locator('#micro-resistance-compare-a').selectOption('4'); await page.locator('#micro-resistance-compare-b').selectOption('7');
  await expect(page.locator('#micro-resistance-comparison-export-status')).toHaveText('');
  const reversed = csv((await download(page, '#micro-resistance-comparison-download-csv', 'resistance-comparison-reversed.csv')).text);
  expect(reversed[2]).toMatchObject({ shared_resistant_cells: '2', shared_share_difference_percentage_points: '-64' });
  await page.locator('#micro-resistance-compare-a').selectOption('7'); await page.locator('#micro-resistance-compare-b').selectOption('9');
  const ended = csv((await download(page, '#micro-resistance-comparison-download-csv', 'resistance-comparison-extinct.csv')).text);
  expect(ended[1].shared_resistant_share_pct_rounded).toBe('Undefined'); expect(ended[2].shared_share_difference_percentage_points).toBe('Undefined');
  expect((await state(page)).resistanceInvestigation).toEqual(before.resistanceInvestigation);
});

test('requires explicit selection before a repaired Resistance ID can be compared or exported', async ({ page }) => {
  const seed = { tab: 'resistance', resistanceInvestigation: snapshotA, resistanceNotebook: {
    records: [{ id: 'bad', evidence: snapshotA }, { id: 9, evidence: extinct }], selectedId: 1, nextId: 12
  }, resistanceComparison: { aId: 1, bId: 9 } };
  await mount(page, seed); const culture = (await state(page)).resistanceInvestigation; await open(page, '#micro-resistance-comparison');
  await expect(page.locator('#micro-resistance-compare-a')).toHaveValue('');
  await expect(page.locator('#micro-resistance-comparison-download-text')).toBeDisabled();
  await open(page, '.micro-resistance-saved'); await page.locator('#micro-resistance-evidence-9').click();
  await reload(page); await open(page, '#micro-resistance-comparison');
  await expect(page.locator('#micro-resistance-compare-a')).toHaveValue('');
  await expect(page.locator('#micro-resistance-comparison-download-csv')).toBeDisabled();
  await mount(page, seed); await open(page, '#micro-resistance-comparison');
  await page.locator('#micro-resistance-compare-a').selectOption('1');
  await expect(page.locator('#micro-resistance-comparison-download-text')).toBeEnabled();
  expect((await state(page)).resistanceNotebook.records.map((row: any) => row.id)).toEqual([1, 9]);
  await reload(page); await open(page, '#micro-resistance-comparison');
  await expect(page.locator('#micro-resistance-compare-a')).toHaveValue('1');
  const report = await download(page, '#micro-resistance-comparison-download-text', 'resistance-repaired-choice.txt');
  expect(report.text).toContain('Snapshot A: Evidence 1'); expect(report.text).toContain(snapshotA.notes);
  expect((await state(page)).resistanceInvestigation).toEqual(culture);
});

test('exports strict unfinished quiz choices without scores or answer explanations', async ({ page }) => {
  await mount(page, { tab: 'quiz', quizAnswers: [bank[0].answer, '1', true, bank[3].answer], quizSubmitted: true, quizCorrect: 500,
    quizPractice: { answers: bank.map(q => q.answer), checked: bank.map(() => true) } });
  const before = await state(page); const report = await download(page, '#micro-quiz-download', 'quiz-unfinished-evidence.txt');
  expect(report.name).toBe('micro-lab-quiz-evidence.txt'); expect(report.text).toContain('Unsubmitted or incomplete attempt');
  expect(report.text).toContain('Recorded answers: 2/15'); expect(report.text).toContain('Original answer: ' + bank[0].choices[bank[0].answer]);
  expect(report.text).not.toContain('Original score:'); expect(report.text).not.toContain('Correct answer:'); expect(report.text).not.toContain('Explanation:'); expect(report.text).not.toContain('Practice status:');
  expect(await state(page)).toEqual(before); await reload(page);
  expect((await download(page, '#micro-quiz-download', 'quiz-unfinished-restored.txt')).text).toBe(report.text);
});

test('exports original quiz results and separate checked and unchecked practice before restart', async ({ page }) => {
  const missed = [0, 3, 7], answers = bank.map((q, i) => missed.includes(i) ? (q.answer + 1) % q.choices.length : q.answer);
  const practiced: (number | null)[] = bank.map(() => null), checked = bank.map(() => false);
  practiced[0] = bank[0].answer; checked[0] = true; practiced[3] = (bank[3].answer + 1) % bank[3].choices.length; checked[3] = true; practiced[7] = bank[7].answer;
  await mount(page, { tab: 'quiz', quizAnswers: answers, quizSubmitted: true, quizCorrect: 500, quizBestCorrect: 15, quizMode: 'practice', quizPractice: { answers: practiced, checked } });
  const before = await state(page); const report = await download(page, '#micro-quiz-download', 'quiz-submitted-practice.txt');
  expect(report.text).toContain('Original score: 12/15'); expect(report.text).toContain('Correct after checking in practice: 1/3');
  expect(report.text).toContain('Practice status: Checked correct'); expect(report.text).toContain('Practice status: Checked incorrect'); expect(report.text).toContain('Practice status: Unchecked practice answer');
  expect(report.text).toContain('Original answer: ' + bank[0].choices[answers[0]]); expect(report.text).toContain('Practice answer: ' + bank[0].choices[practiced[0]!]);
  expect(await state(page)).toEqual(before);
  await phone(page, 390); await page.locator('#micro-quiz-heading').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'quiz-evidence-export-phone.png') });
  await reload(page); expect((await download(page, '#micro-quiz-download', 'quiz-submitted-restored.txt')).text).toBe(report.text);
  await page.getByRole('button', { name: 'Start a new quiz', exact: true }).click();
  await expect(page.locator('#micro-quiz-download')).toBeDisabled(); await expect(page.locator('#micro-quiz-download-status')).toHaveText('');
  expect((await state(page)).quizAnswers).toEqual([]);
});

const base = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
const removed = { id: 7, control: base, conditions: { ...base, tempC: 18 }, prediction: 'lower', hypothesis: 'Original trial reasoning.', explanation: 'Original saved explanation.' };
test('Home discovers removed-only Growth work and opens recovery without changing the experiment', async ({ page }) => {
  await mount(page, { tab: 'home', growthInvestigation: { trials: [], selectedId: null, nextId: 20, control: base, prediction: 'higher', hypothesis: 'Next run draft', explanation: '', sweepVariable: 'pH', sweep: null, removed: { trial: removed, index: 0 } }, growthLab: { ...base, tempC: 25 }, growthReviewHour: 6 });
  const before = await state(page), card = page.locator('[data-work-card="growth"]');
  await expect(card.locator('.micro-workspace-metric strong')).toHaveText('0');
  await expect(page.locator('[data-work-recovery="growth"]')).toContainText('7');
  await expect(page.locator('#micro-workspace-title')).not.toHaveText('Choose your first investigation');
  await phone(page); await card.screenshot({ path: path.join(out, 'growth-recovery-home-phone.png') });
  await page.locator('[data-work-next="growth"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#gl-restore-removed')).toBeFocused();
  const opened = await state(page); expect(opened.growthInvestigation).toEqual(before.growthInvestigation); expect(opened.growthLab).toEqual(before.growthLab); expect(opened.growthReviewHour).toBe(6);
  await reload(page); await page.locator('#gl-restore-removed').click();
  await expect(page.locator('#gl-trial-7')).toBeFocused(); expect((await state(page)).growthInvestigation.trials).toEqual([removed]);
});

test('Growth editing and removal keep a valid restored ID attached to its original trial', async ({ page }) => {
  const damaged = { ...removed, id: 'bad', hypothesis: 'Damaged ID notes.', explanation: 'Keep the repaired trial.', conditions: { ...base, tempC: 18 } };
  const original = { ...removed, id: 1, conditions: base, explanation: 'Original trial one.' };
  await mount(page, { tab: 'growthLab', growthInvestigation: { trials: [damaged, original], selectedId: 1, nextId: 20, control: base, prediction: 'higher', hypothesis: 'Next-run notes', explanation: '', sweepVariable: 'pH', sweep: null } });
  await expect(page.locator('#gl-explanation')).toHaveValue(original.explanation);
  await page.locator('#gl-explanation').fill('Edited original trial one.');
  expect((await state(page)).growthInvestigation.trials.map((row: any) => [row.id, row.explanation])).toEqual([[2, damaged.explanation], [1, 'Edited original trial one.']]);
  await page.getByRole('button', { name: 'Remove selected trial', exact: true }).click();
  expect((await state(page)).growthInvestigation.removed.trial).toEqual({ ...original, explanation: 'Edited original trial one.' });
  await reload(page); await page.locator('#gl-restore-removed').click();
  const after = await state(page); expect(after.growthInvestigation.trials.map((row: any) => row.id)).toEqual([2, 1]);
  expect(after.growthInvestigation.trials[1].conditions).toEqual(base); await expect(page.locator('#gl-trial-1')).toBeFocused();
});

test('rejects a nanometer estimate that converts to zero and preserves history through correction', async ({ page }) => {
  const context = { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 };
  const result = { value: 2, unit: 'um', context }, previousResult = { value: 4, unit: 'um', context };
  const entry = { draft: { value: '5e-324', unit: 'nm', context }, result, previousResult };
  await mount(page, { tab: 'microscope', selectedScope: 'lightbright', scopeOrganism: 'ecoli', magnification: 1000, microscopeZoom: 20, microscopeFocus: 50, microscopeTargetFocus: 50, microscopeSeenSlides: ['ecoli'], microscopeMeasurements: { ecoli: entry } });
  const scope = page.getByRole('region', { name: 'Virtual microscope investigation', exact: true });
  await expect(scope.getByRole('button', { name: 'Check and save estimate', exact: true })).toBeDisabled();
  await expect(scope.getByLabel('Your size estimate', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(scope).toContainText('too small to remain above zero in micrometers');
  await phone(page, 390); await scope.getByLabel('Your size estimate', { exact: true }).scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'microscope-decimal-validation-phone.png') });
  await reload(page); expect((await state(page)).microscopeMeasurements.ecoli).toEqual(entry);
  await scope.getByLabel('Your size estimate', { exact: true }).fill('2e3'); await scope.getByRole('button', { name: 'Check and save estimate', exact: true }).click();
  expect((await state(page)).microscopeMeasurements.ecoli).toEqual({ draft: { value: '2e3', unit: 'nm', context }, result: { value: 2000, unit: 'nm', context }, previousResult: result });
});
