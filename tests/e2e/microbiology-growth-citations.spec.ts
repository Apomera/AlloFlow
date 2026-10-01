import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 90000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-growth-citations-2026-10-01');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const base = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
const trialSettings = { ...base, tempC: 32 };
const otherControl = { ...base, oxygen: 20 };
const otherTrial = { ...base, oxygen: 80 };
const nextControl = { profile: 'thermus', tempC: 70, pH: 7.5, oxygen: 100 };
const originalHypothesis = 'The temperature change may delay the curve before a similar final population.';
const originalExplanation = '=SUM(1,2)\nI compared the early and final model populations, "keeping their different times clear."';
const recoveryNote = 'Recoverable evidence from trial 19 remains separate from the active notebook.';
type Evidence = { hour: number; controlPopulation: number | null; trialPopulation: number; difference: number | null };
let errors: string[];

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const citations = (page: Page) => page.locator('[data-growth-citations]');
const card = (page: Page, hour: number) => page.locator('#gl-evidence-pins [data-cited-hour="' + hour + '"]');
const remove = (page: Page, hour: number) => page.locator('#gl-evidence-pins [data-remove-cited-hour="' + hour + '"]');

function seed(hours: number[] = []): Record<string, any> {
  const first: Record<string, any> = { id: 7, control: { ...base, originalMarker: 'Keep control metadata.' },
    conditions: { ...trialSettings, settingMarker: 'Keep trial metadata.' }, prediction: 'similar', hypothesis: originalHypothesis,
    explanation: originalExplanation, trialExtra: { kept: true }, forgedPopulation: 987654321 };
  if (hours.length) first.citedHours = hours;
  return {
    tab: 'growthLab', showMicroLibrary: false, selectedBacterium: 'ecoli', selectedVirus: 'covid', selectedScope: 'lightbright',
    selectedMicrobiome: 'gut', selectedFerment: 'sourdough', selectedCase: 'snow', scopeOrganism: 'ecoli', magnification: 400,
    microscopeFocus: 10, microscopeTargetFocus: 50, gramStep: 0, quizIdx: 0, quizAnswers: [0, 1], quizSubmitted: false, quizCorrect: 0,
    growthReviewHour: 24,
    growthLab: { ...nextControl, tempC: 65, hypothesis: 'Independent legacy hypothesis.', explanation: 'Independent legacy explanation.',
      understood: true, stuckRevealed: true, log: [{ profile: 'thermus', t: 65, p: 7.5, o: 100, state: 'Earlier recorded label.' }], legacyExtra: { keep: 2 } },
    growthInvestigation: { trials: [first,
      { id: 31, control: otherControl, conditions: otherTrial, prediction: 'higher', hypothesis: 'Original oxygen reasoning.', explanation: 'Trial 31 written evidence.', trialExtra: 'Keep second trial.' },
      { id: 42, conditions: base, prediction: 'lower', hypothesis: 'No original control was saved.', explanation: 'Trial 42 written evidence.', trialExtra: 'Keep missing-control trial.' }],
      selectedId: 7, nextId: 60, control: { ...nextControl, controlExtra: 'Keep next-run control.' }, prediction: 'unsure',
      hypothesis: 'My next-run reasoning stays independent.', explanation: 'Independent notebook draft explanation.', sweepVariable: 'pH',
      sweep: { variable: 'oxygen', conditions: base }, previousSweep: { variable: 'pH', conditions: nextControl },
      removed: { trial: { id: 19, control: base, conditions: { ...base, pH: 6 }, prediction: 'lower', hypothesis: 'Recoverable trial reasoning.',
        explanation: recoveryNote, citedHours: [12], recoveryExtra: { keep: true } }, index: 1 }, notebookExtra: { keep: 'Raw notebook metadata.' } },
    externalMarker: { keep: 'Unrelated Micro Lab state.' }
  };
}

async function instrumentXP(page: Page) {
  await page.evaluate(() => {
    const w = window as any; w.__citationXP = w.__citationXP || [];
    w.__ctx.awardXP = (...args: any[]) => w.__citationXP.push(args);
  });
}
async function mount(page: Page, data: Record<string, unknown> = seed()) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { unrelatedNotebook: { note: 'Preserve another tool.' }, microbiology: data }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await instrumentXP(page);
}
async function reload(page: Page) {
  const saved = clone(await state(page)); await harness.unmount(page);
  await page.evaluate(data => (window as any).__mount(data), saved); await instrumentXP(page);
  await expect(page.locator('[data-microbiology-tool]')).toBeVisible(); return saved;
}
async function noXP(page: Page) { expect(await page.evaluate(() => (window as any).__citationXP)).toEqual([]); }
async function press(button: Locator) { await button.focus(); await button.press('Enter'); }
async function open(details: Locator) {
  if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) await press(details.locator(':scope > summary'));
  await expect(details).toHaveAttribute('open', '');
}
async function hour(page: Page, value: number) {
  const before = await state(page); await page.locator('#gl-evidence-hour').selectOption(String(value));
  const expected = clone(before); expected.microbiology.growthReviewHour = value;
  expect(await state(page)).toEqual(expected); await expect(page.locator('#gl-evidence-preview')).toHaveAttribute('data-evidence-hour', String(value));
}
function withHours(before: any, id: number, hours: number[]) {
  const expected = clone(before), target = expected.microbiology.growthInvestigation.trials.find((trial: any) => trial.id === id);
  if (hours.length) target.citedHours = hours; else delete target.citedHours;
  return expected;
}
async function expectedEvidence(page: Page, control: Record<string, unknown> | null, settings: Record<string, unknown>, hours: number[]): Promise<Evidence[]> {
  // Use the established simulator, independently of the new citation helpers.
  return page.evaluate(({ control, settings, hours }) => {
    const model = (window as any).__MicrobiologyCore.growth;
    const trial = model.simulate(settings), savedControl = control ? model.simulate(control) : null;
    return hours.map(hour => {
      const trialPopulation = trial.points[hour].population, controlPopulation = savedControl ? savedControl.points[hour].population : null;
      return { hour, controlPopulation, trialPopulation, difference: controlPopulation === null ? null : trialPopulation - controlPopulation };
    });
  }, { control, settings, hours });
}
function rounded(rows: Evidence[]) {
  return rows.map(row => ({ hour: row.hour, controlPopulation: row.controlPopulation === null ? null : Number(row.controlPopulation.toFixed(3)),
    trialPopulation: Number(row.trialPopulation.toFixed(3)), difference: row.difference === null ? null : Number(row.difference.toFixed(3)) }));
}
async function values(container: Locator, row: Evidence) {
  const value = (number: number | null, signed = false) => number === null ? 'Unavailable' : (signed && number > 0 ? '+' : '') + Number(number.toFixed(3));
  await expect(container.locator('[data-evidence-value="control"]')).toHaveText(value(row.controlPopulation));
  await expect(container.locator('[data-evidence-value="trial"]')).toHaveText(value(row.trialPopulation));
  await expect(container.locator('[data-evidence-value="difference"]')).toHaveText(value(row.difference, true));
}
async function download(page: Page, button: Locator, filename: string, saveAs: string) {
  await button.focus(); const pending = page.waitForEvent('download'); await button.press('Enter');
  const file = await pending; expect(file.suggestedFilename()).toBe(filename); await file.saveAs(path.join(out, saveAs));
  await expect(button).toBeFocused(); return readFileSync((await file.path())!, 'utf8');
}
function csv(text: string): Record<string, string>[] {
  const cells = [...text.matchAll(/"((?:[^"]|"")*)"(,|\r\n|$)/g)];
  expect(cells.map(cell => cell[0]).join('')).toBe(text);
  const records: string[][] = []; let row: string[] = [];
  for (const cell of cells) { row.push(cell[1].replace(/""/g, '"')); if (cell[2] !== ',') { records.push(row); row = []; } }
  const [headings, ...data] = records; expect(headings.slice(-2)).toEqual(['cited_model_hours', 'cited_evidence_json']);
  return data.map(values => { expect(values).toHaveLength(headings.length); return Object.fromEntries(headings.map((heading, index) => [heading, values[index]])); });
}
function citedTables(text: string): Evidence[][] {
  const lines = text.split(/\r?\n/), tables: Evidence[][] = [];
  for (let index = 0; index < lines.length; index++) {
    if (lines[index] !== 'Cited model hour\tOriginal control population\tTrial population\tTrial minus control') continue;
    const table: Evidence[] = [];
    while (++index < lines.length && /^\d+\t/.test(lines[index])) {
      const cells = lines[index].split('\t'); expect(cells).toHaveLength(4);
      table.push({ hour: Number(cells[0]), controlPopulation: cells[1] === 'Unavailable' ? null : Number(cells[1]),
        trialPopulation: Number(cells[2]), difference: cells[3] === 'Unavailable' ? null : Number(cells[3]) });
    }
    tables.push(table);
  }
  return tables;
}
async function noOverflow(page: Page) {
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight,
    rootZoom: getComputedStyle(document.documentElement).zoom, bodyZoom: getComputedStyle(document.body).zoom,
    documentClientWidth: document.documentElement.clientWidth, documentScrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.documentScrollWidth <= viewport.width + 1, JSON.stringify(viewport, null, 2)).toBe(true);
  for (const selector of ['[data-microbiology-tool]', '[data-micro-growth]', '[data-growth-citations]', '#gl-evidence-pins', '.micro-growth-citation-card']) {
    for (const panel of await page.locator(selector).all()) {
      const layout = await panel.evaluate(node => {
        const bounds = node.getBoundingClientRect();
        const descendants = [...node.querySelectorAll('*')].map(child => {
          const rect = child.getBoundingClientRect(), style = getComputedStyle(child);
          return { tag: child.tagName.toLowerCase(), id: child.id, classes: child.getAttribute('class') || '',
            clientWidth: child.clientWidth, scrollWidth: child.scrollWidth, width: Number(rect.width.toFixed(2)),
            left: Number(rect.left.toFixed(2)), right: Number(rect.right.toFixed(2)), overflowX: style.overflowX,
            cssWidth: style.width, minWidth: style.minWidth, boxSizing: style.boxSizing,
            excess: Math.max(child.scrollWidth - child.clientWidth, rect.right - bounds.right, bounds.left - rect.left) };
        }).filter(child => child.width > 0 && child.excess > 1).sort((a, b) => b.excess - a.excess).slice(0, 24);
        return { tag: node.tagName.toLowerCase(), id: node.id, classes: node.getAttribute('class') || '',
          clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, width: Number(bounds.width.toFixed(2)), descendants };
      });
      expect(layout.scrollWidth <= layout.clientWidth + 1, JSON.stringify({ selector, viewport, ...layout }, null, 2)).toBe(true);
    }
  }
}
async function deferFocus(page: Page) {
  await page.evaluate(() => {
    const w = window as any; w.__citationOriginalTimeout = window.setTimeout; w.__citationPendingFocus = [];
    window.setTimeout = ((callback: (...args: any[]) => void, delay?: number, ...args: any[]) => {
      if (delay === 0) { w.__citationPendingFocus.push(() => callback(...args)); return 0; }
      return w.__citationOriginalTimeout(callback, delay, ...args);
    }) as typeof window.setTimeout;
  });
}
async function flushFocus(page: Page) {
  await page.evaluate(() => {
    const w = window as any; window.setTimeout = w.__citationOriginalTimeout;
    for (const callback of w.__citationPendingFocus) callback(); delete w.__citationPendingFocus; delete w.__citationOriginalTimeout;
  });
}

test('keeps sorted hours zero, six and twenty-four with exact raw-state changes and guards duplicates and capacity', async ({ page }) => {
  await mount(page); const result = await page.locator('.micro-growth-result-head').innerText();
  await expect(page.locator('.micro-growth-result-head')).toContainText('Observed result: Similar population');
  await expect(page.locator('.micro-growth-result-head')).toContainText('Original prediction: Similar population');
  await expect(page.locator('#gl-evidence-hour')).toHaveAccessibleName('Model hour to cite');
  await expect(page.locator('#gl-evidence-hour')).toHaveAttribute('aria-controls', 'gl-evidence-preview');
  await expect(page.locator('#gl-evidence-status')).toHaveAttribute('role', 'status');
  await expect(page.locator('#gl-evidence-status')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('#gl-evidence-status')).toHaveAttribute('aria-atomic', 'true');
  const expected = await expectedEvidence(page, base, trialSettings, [0, 6, 24]);
  expect(expected[0]).toEqual({ hour: 0, controlPopulation: 5, trialPopulation: 5, difference: 0 });
  expect(Number(expected[1].difference!.toFixed(3))).toBe(-8.361);
  let kept: number[] = [];
  for (const value of [24, 0, 6]) {
    await hour(page, value); await values(page.locator('#gl-evidence-preview'), expected.find(row => row.hour === value)!);
    const before = await state(page); await expect(page.locator('#gl-evidence-pin')).toHaveAttribute('aria-disabled', 'false');
    await press(page.locator('#gl-evidence-pin')); kept = [...kept, value].sort((a, b) => a - b);
    expect(await state(page)).toEqual(withHours(before, 7, kept)); await expect(page.locator('#gl-evidence-pin')).toBeFocused();
    await expect(page.locator('#gl-evidence-status')).toContainText('Kept model hour ' + value + '.');
    expect(await page.locator('#gl-evidence-pins [data-cited-hour]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-cited-hour')))).toEqual(kept.map(String));
    expect(await page.locator('.micro-growth-result-head').innerText()).toBe(result);
  }
  for (const row of expected) await values(card(page, row.hour), row);
  await expect(page.locator('#gl-evidence-limit')).toContainText('This hour is already kept');
  let before = await state(page); await press(page.locator('#gl-evidence-pin')); expect(await state(page)).toEqual(before);
  await page.locator('#gl-evidence-pin').click({ force: true }); expect(await state(page)).toEqual(before);
  await hour(page, 12); await expect(page.locator('#gl-evidence-pin')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#gl-evidence-limit')).toContainText('Three hours are kept');
  before = await state(page); await press(page.locator('#gl-evidence-pin')); expect(await state(page)).toEqual(before);
  await page.locator('#gl-evidence-pin').click({ force: true }); expect(await state(page)).toEqual(before);
  await expect(page.locator('#gl-explanation')).toHaveValue(originalExplanation); await expect(page.locator('#gl-hypothesis')).toHaveValue('My next-run reasoning stays independent.');
  expect(await page.locator('.micro-growth-result-head').innerText()).toBe(result); await noXP(page);
  await citations(page).screenshot({ path: path.join(out, 'growth-citations-desktop.png') });
});

test('each nonsequential trial uses its original control and missing controls remain unavailable', async ({ page }) => {
  const data = seed(); data.growthInvestigation.selectedId = 31; data.growthReviewHour = 6;
  await mount(page, data); const expected = (await expectedEvidence(page, otherControl, otherTrial, [6]))[0];
  const incorrectCurrentControl = (await expectedEvidence(page, nextControl, otherTrial, [6]))[0];
  expect(expected.controlPopulation).not.toBe(incorrectCurrentControl.controlPopulation);
  await expect(citations(page)).toHaveAttribute('data-growth-citations', '31'); await values(page.locator('#gl-evidence-preview'), expected);
  let before = await state(page); await press(page.locator('#gl-evidence-pin')); expect(await state(page)).toEqual(withHours(before, 31, [6]));
  await values(card(page, 6), expected); await page.locator('#gl-trial-42').click();
  await expect(citations(page)).toHaveAttribute('data-growth-citations', '42');
  const missing = (await expectedEvidence(page, null, base, [6]))[0]; await values(page.locator('#gl-evidence-preview'), missing);
  await expect(citations(page)).toContainText('This trial has no saved control');
  before = await state(page); await press(page.locator('#gl-evidence-pin')); expect(await state(page)).toEqual(withHours(before, 42, [6]));
  await values(card(page, 6), missing); await expect(page.locator('#gl-explanation')).toHaveValue('Trial 42 written evidence.');
  await expect(page.locator('#gl-hypothesis')).toHaveValue('My next-run reasoning stays independent.');
  await citations(page).screenshot({ path: path.join(out, 'growth-citations-missing-control.png') });
  await page.locator('#gl-trial-7').click(); await expect(page.locator('#gl-evidence-pins [data-cited-hour]')).toHaveCount(0);
  expect((await state(page)).microbiology.growthInvestigation.trials.find((trial: any) => trial.id === 31).citedHours).toEqual([6]);
  expect((await state(page)).microbiology.growthInvestigation.trials.find((trial: any) => trial.id === 42).citedHours).toEqual([6]); await noXP(page);
});

test('JSON reload, removal and restoration retain citations and recovery is read only in Growth and the portfolio', async ({ page }) => {
  await mount(page, seed([0, 6, 24])); const saved = await reload(page); expect(await state(page)).toEqual(saved);
  await expect(page.locator('#gl-evidence-pins [data-cited-hour]')).toHaveCount(3);
  await press(page.getByRole('button', { name: 'Remove selected trial', exact: true }));
  await expect(page.locator('#gl-restore-removed')).toBeFocused();
  const removed = (await state(page)).microbiology.growthInvestigation.removed.trial;
  expect(removed).toMatchObject({ id: 7, control: base, conditions: trialSettings, prediction: 'similar', hypothesis: originalHypothesis, explanation: originalExplanation, citedHours: [0, 6, 24] });
  expect((await state(page)).microbiology.growthInvestigation.trials.map((trial: any) => trial.id)).toEqual([31, 42]);
  await open(page.locator('#gl-removed-trial details'));
  await expect(page.locator('#gl-removed-evidence-pins [data-removed-cited-hour]')).toHaveCount(3);
  await expect(page.locator('#gl-removed-evidence-pins button')).toHaveCount(0);
  const expected = await expectedEvidence(page, base, trialSettings, [0, 6, 24]);
  for (const row of expected) await values(page.locator('#gl-removed-evidence-pins [data-removed-cited-hour="' + row.hour + '"]'), row);
  await page.locator('#micro-tab-home').click(); await open(page.locator('#micro-portfolio'));
  await page.locator('#micro-portfolio-activity').selectOption('growth');
  const preview = await page.locator('#micro-portfolio-preview').innerText();
  expect(preview).toContain('Removed evidence (available to restore; outside the active notebook) — Trial 7');
  expect(preview).toContain(originalHypothesis); expect(preview).toContain(originalExplanation); expect(citedTables(preview)).toEqual([rounded(expected)]);
  const homeSaved = await reload(page); expect(await state(page)).toEqual(homeSaved);
  await page.locator('#micro-tab-growthLab').click(); await press(page.locator('#gl-restore-removed'));
  await expect(page.locator('#gl-trial-7')).toBeFocused(); await expect(citations(page)).toHaveAttribute('data-growth-citations', '7');
  expect((await state(page)).microbiology.growthInvestigation.trials.map((trial: any) => trial.id)).toEqual([7, 31, 42]);
  expect((await state(page)).microbiology.growthInvestigation.trials[0].citedHours).toEqual([0, 6, 24]);
  await expect(page.locator('#gl-removed-trial')).toHaveCount(0); await expect(page.locator('#gl-explanation')).toHaveValue(originalExplanation); await noXP(page);
});

test('notebook, both CSV formats and the full portfolio export accurate citations with their existing recovery scope', async ({ page }) => {
  const data = seed([0, 6, 24]); data.growthInvestigation.trials[2].citedHours = [6];
  await mount(page, data); const before = await state(page);
  const expected = rounded(await expectedEvidence(page, base, trialSettings, [0, 6, 24]));
  const missing = rounded(await expectedEvidence(page, null, base, [6]));
  const recoverable = rounded(await expectedEvidence(page, base, { ...base, pH: 6 }, [12]));
  const notebook = await download(page, page.getByRole('button', { name: 'Download notebook', exact: true }), 'micro-lab-notebook.txt', 'growth-citations-notebook.txt');
  expect(citedTables(notebook)).toEqual([expected, missing]); expect(notebook).toContain(originalExplanation); expect(notebook).not.toContain(recoveryNote);
  expect(notebook).not.toMatch(/^Trial 19$/m); expect(notebook).not.toContain('987654321'); expect(await state(page)).toEqual(before);
  const trialRows = csv(await download(page, page.getByRole('button', { name: 'Download trial CSV', exact: true }), 'micro-lab-trials.csv', 'growth-citations-trials.csv'));
  expect(trialRows.map(row => row.trial_id)).toEqual(['7', '31', '42']);
  expect(trialRows[0]).toMatchObject({ control_temperature_C: '37', trial_temperature_C: '32', prediction: 'similar', modeled_outcome: 'similar', hypothesis: originalHypothesis, explanation: "'" + originalExplanation, cited_model_hours: '0; 6; 24' });
  expect(JSON.parse(trialRows[0].cited_evidence_json)).toEqual(expected); expect(trialRows[1]).toMatchObject({ cited_model_hours: '', cited_evidence_json: '' });
  expect(trialRows[2].cited_model_hours).toBe('6'); expect(JSON.parse(trialRows[2].cited_evidence_json)).toEqual(missing); expect(await state(page)).toEqual(before);
  await open(page.locator('.micro-growth-review')); await hour(page, 12); await expect(page.locator('#gl-review-hour')).toHaveValue('12');
  const atHour = await state(page);
  const hourRows = csv(await download(page, page.locator('#gl-review-download'), 'micro-lab-comparison-hour-12.csv', 'growth-citations-hour-12.csv'));
  expect(hourRows.map(row => row.trial_id)).toEqual(['7', '31', '42']); expect(hourRows.every(row => row.inspection_hour === '12')).toBe(true);
  expect(hourRows[0]).toMatchObject({ original_prediction: 'similar', outcome_at_24h: 'similar', cited_model_hours: '0; 6; 24', explanation: "'" + originalExplanation });
  expect(JSON.parse(hourRows[0].cited_evidence_json)).toEqual(expected); expect(JSON.parse(hourRows[2].cited_evidence_json)).toEqual(missing);
  expect(hourRows[2]).toMatchObject({ control_population_at_inspection_hour: '', difference_at_inspection_hour: '', outcome_at_24h: '' }); expect(await state(page)).toEqual(atHour);
  await page.locator('#micro-tab-home').click(); await open(page.locator('#micro-portfolio')); const home = await state(page);
  const portfolio = await download(page, page.locator('#micro-portfolio-download'), 'micro-lab-portfolio.txt', 'growth-citations-portfolio.txt');
  expect(citedTables(portfolio)).toEqual([expected, missing, recoverable]); expect(portfolio).toContain(recoveryNote);
  expect(portfolio).toContain('Removed evidence (available to restore; outside the active notebook) — Trial 19');
  expect(portfolio).not.toContain('987654321'); expect(await state(page)).toEqual(home); await noXP(page);
});

test('removing a kept hour moves keyboard focus to its next neighbor, previous neighbor or the keep control', async ({ page }) => {
  const data = seed([0, 6, 24]); data.growthReviewHour = 12; await mount(page, data);
  let before = await state(page); await press(remove(page, 6)); await expect(remove(page, 24)).toBeFocused();
  expect(await state(page)).toEqual(withHours(before, 7, [0, 24])); await expect(page.locator('#gl-evidence-status')).toContainText('Removed kept hour 6.');
  before = await state(page); await press(remove(page, 24)); await expect(remove(page, 0)).toBeFocused(); expect(await state(page)).toEqual(withHours(before, 7, [0]));
  before = await state(page); await press(remove(page, 0)); await expect(page.locator('#gl-evidence-pin')).toBeFocused(); expect(await state(page)).toEqual(withHours(before, 7, []));
  await expect(page.locator('#gl-evidence-pins [data-cited-hour]')).toHaveCount(0); await expect(page.locator('#gl-evidence-pin')).toHaveAttribute('aria-disabled', 'false');
  expect(Object.hasOwn((await state(page)).microbiology.growthInvestigation.trials[0], 'citedHours')).toBe(false);
  await expect(page.locator('#gl-explanation')).toHaveValue(originalExplanation); await noXP(page);
});

test('deferred removal focus respects a later focus-only move to Quiz and a selected-trial change', async ({ page }) => {
  const data = seed([0, 6]); data.growthReviewHour = 12; await mount(page, data);
  await deferFocus(page); const original = await state(page); await press(remove(page, 0));
  expect(await state(page)).toEqual(withHours(original, 7, [6]));
  const quiz = page.locator('#micro-tab-quiz'); await quiz.focus(); const afterFocus = await state(page); await flushFocus(page);
  await expect(quiz).toBeFocused(); await expect(page.locator('#micro-tab-growthLab')).toHaveAttribute('aria-selected', 'true'); expect(await state(page)).toEqual(afterFocus);
  await deferFocus(page); await press(remove(page, 6)); await page.locator('#gl-trial-31').click();
  const afterSelection = await state(page); await flushFocus(page); await expect(page.locator('#gl-trial-31')).toBeFocused();
  await expect(citations(page)).toHaveAttribute('data-growth-citations', '31'); await expect(page.locator('#gl-evidence-status')).toBeEmpty();
  expect(await state(page)).toEqual(afterSelection); expect(afterSelection.microbiology.growthInvestigation.selectedId).toBe(31);
  expect(Object.hasOwn(afterSelection.microbiology.growthInvestigation.trials.find((trial: any) => trial.id === 7), 'citedHours')).toBe(false);
  await expect(page.locator('#gl-explanation')).toHaveValue('Trial 31 written evidence.'); await noXP(page);
});

test('citation controls reflow on phones and enlarged layouts, keep literal learner text and require a saved trial', async ({ page }) => {
  const data = seed([0, 6, 24]), literal = '<img src=x onerror="window.citationInjected=true">' + 'longnote'.repeat(140);
  data.growthInvestigation.trials[0].explanation = literal; data.growthInvestigation.removed.trial.explanation = literal;
  await mount(page, data); const before = await state(page); await open(page.locator('#gl-removed-trial details'));
  await expect(page.locator('#gl-explanation')).toHaveValue(literal); await expect(page.locator('#gl-removed-trial blockquote').last()).toHaveText(literal);
  await expect(page.locator('#gl-removed-trial img')).toHaveCount(0); expect(await page.evaluate(() => (window as any).citationInjected)).toBeUndefined();
  await page.setViewportSize({ width: 320, height: 844 }); await noOverflow(page);
  for (const target of [page.locator('#gl-evidence-hour'), page.locator('#gl-evidence-pin'), remove(page, 0), remove(page, 6), remove(page, 24)])
    expect(await target.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await citations(page).screenshot({ path: path.join(out, 'growth-citations-phone.png') });
  await page.setViewportSize({ width: 1280, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const zoom of [2, 4]) { await page.evaluate(value => { document.body.style.zoom = String(value); }, zoom); await noOverflow(page); }
  await citations(page).screenshot({ path: path.join(out, 'growth-citations-zoom.png') }); expect(await state(page)).toEqual(before); await noXP(page);
  await reload(page); await expect(page.locator('#gl-explanation')).toHaveValue(literal);
  const empty = seed(); empty.growthInvestigation = { control: base, prediction: 'higher', hypothesis: 'Draft-only reasoning.', citedHours: [6] } as any;
  await mount(page, empty); const draft = await state(page);
  await expect(citations(page)).toHaveCount(0); await expect(page.locator('#gl-evidence-hour')).toHaveCount(0); await expect(page.locator('#gl-evidence-pin')).toHaveCount(0);
  await expect(page.locator('#gl-saved-result')).toHaveCount(0); expect(await state(page)).toEqual(draft); await noXP(page);
});
