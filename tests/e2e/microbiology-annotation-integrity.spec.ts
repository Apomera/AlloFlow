import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 90000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-annotation-integrity-2026-10-01');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
type Lab = 'growth' | 'resistance';
const settings = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
const selected = { growth: 142, resistance: 230 };
const tab = { growth: 'growthLab', resistance: 'resistance' };
const field = { growth: 'growthInvestigation', resistance: 'resistanceNotebook' };
const rows = { growth: 'trials', resistance: 'records' };
const annotation = { growth: 'explanation', resistance: 'reviewNote' };
let errors: string[];

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
const editor = (page: Page, lab: Lab) => page.locator(lab === 'growth' ? '#gl-explanation' : '#micro-resistance-reflection-' + selected.resistance);
const workspace = (page: Page, lab: Lab) => page.locator(lab === 'growth' ? '[data-micro-growth]' : '[data-micro-resistance-workspace]');
const counters = (page: Page) => page.evaluate(() => ({ xp: (window as any).__annotationXP, random: (window as any).__annotationRandomCalls }));

function trial(id: any, index: number): Record<string, any> {
  return { id, control: { ...settings, controlMarker: { index } }, conditions: { ...settings, tempC: 30 + index % 8, rawSetting: 'Preserve this.' },
    prediction: 'similar', hypothesis: 'Original reasoning ' + index, explanation: id === selected.growth ? 'Growth annotation original.' : 'Earlier explanation ' + index,
    citedHours: [0, 6, 24], history: [{ imported: true, index }], trialMetadata: { index, nested: ['Original metadata.'] } };
}
function observed(history: any[] = [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }]): Record<string, any> {
  return { dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: 'Original snapshot notes; do not replace with a later reflection.', history,
    originalMetadata: { keep: 'Unnormalized snapshot metadata.' } };
}
function record(id: any, index: number): Record<string, any> {
  return { id, evidence: observed([{ day: 0, sensitive: 72, resistant: 8, source: index }, { day: 1, sensitive: 60, resistant: 8, source: index }]),
    reviewNote: id === selected.resistance ? 'Resistance annotation original.' : 'Earlier reflection ' + index,
    recordMetadata: { index, keep: ['Imported provenance.'] } };
}
function fullRun(history = [0, 1, 2, 3].map(day => ({ day, sensitive: 72, resistant: 8 }))) {
  return { dose: 0, duration: 3, initRes: 10, prediction: null, explanation: null, explanationSubmitted: false,
    notes: 'Current live notes stay separate from saved reflections.', history, runAwarded: true, explanationAwarded: false };
}
function seed(lab: Lab): Record<string, any> {
  const trials: any[] = Array.from({ length: 15 }, (_, index) => trial(100 + index * 3, index));
  trials.splice(3, 0, null, { id: 9999, conditions: 'Malformed row must remain raw.' }, trial('broken-growth-id', 40));
  const records: any[] = Array.from({ length: 11 }, (_, index) => record(200 + index * 3, index));
  records.splice(2, 0, null, { id: 8888, evidence: 'Malformed snapshot must remain raw.' },
    { id: 8889, evidence: observed([{ day: 0, sensitive: 72, resistant: 8 }]), readyMetadata: true }, record('broken-resistance-id', 40));
  return {
    tab: tab[lab], showMicroLibrary: false, selectedBacterium: 'ecoli', selectedVirus: 'covid', selectedScope: 'lightbright',
    selectedMicrobiome: 'gut', selectedFerment: 'sourdough', selectedCase: 'snow', scopeOrganism: 'ecoli', magnification: 400,
    microscopeFocus: 10, microscopeTargetFocus: 50, gramStep: 0, quizIdx: 0, quizAnswers: [0, 1], quizSubmitted: false, quizCorrect: 0,
    growthReviewHour: 6, growthLab: { ...settings, tempC: 32, hypothesis: 'Independent next-run hypothesis.', explanation: 'Independent legacy draft.',
      understood: true, stuckRevealed: true, log: [{ t: 32, p: 7, o: 100, rawLog: { keep: true } }], legacyMetadata: { keep: true } },
    growthInvestigation: { trials, selectedId: selected.growth, nextId: 1200, control: { ...settings, oxygen: 20, workingMetadata: true },
      prediction: 'unsure', hypothesis: 'Next-run reasoning remains independent.', explanation: 'Next-run working explanation.', sweepVariable: 'pH',
      sweep: { variable: 'oxygen', conditions: { ...settings }, sweepMetadata: ['Keep sweep.'] },
      previousSweep: { variable: 'pH', conditions: { ...settings, pH: 6 }, previousMetadata: { keep: true } },
      removed: { trial: trial(900, 90), index: 5, rawRemovalMetadata: 'Keep removed notes and citations.' }, notebookMetadata: { imported: 'Growth raw book.' } },
    resistanceNotebook: { records, selectedId: selected.resistance, nextId: 1200,
      removed: { record: record(999, 90), index: 3, rawRemovalMetadata: 'Keep recoverable snapshot.' }, notebookMetadata: { imported: 'Resistance raw book.' } },
    resistanceComparison: { aId: 221, bId: selected.resistance, rawPreference: { keep: true } }, resistanceInvestigation: fullRun(),
    externalMarker: { keep: 'Other Micro Lab work.' }, gramInvestigation: { step: 2, maxStep: 4, explanation: 'Independent Gram draft.' }
  };
}
async function instrument(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__annotationXP = []; w.__annotationRandomCalls = 0;
    w.__ctx.awardXP = (...args: any[]) => w.__annotationXP.push(args);
    if (!w.__annotationOriginalRandom) {
      w.__annotationOriginalRandom = Math.random;
      Math.random = () => { w.__annotationRandomCalls++; return w.__annotationOriginalRandom(); };
    }
    w.__rerender();
  });
}
async function open(details: Locator) {
  if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) {
    await details.locator(':scope > summary').focus(); await details.locator(':scope > summary').press('Enter');
  }
  await expect(details).toHaveAttribute('open', '');
}
async function ready(page: Page, lab: Lab) {
  if (lab === 'resistance') {
    await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBeGreaterThan(0);
    await open(page.locator('.micro-resistance-saved'));
  }
  await expect(editor(page, lab)).toBeVisible();
}
async function mount(page: Page, lab: Lab, data: Record<string, any> = seed(lab), requireEditor = true) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { unrelatedNotebook: { note: 'Keep another tool.', metadata: { untouched: true } }, microbiology: data }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  if (requireEditor) await ready(page, lab);
  else if (lab === 'resistance') await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBeGreaterThan(0);
  await instrument(page);
}
function noteChanged(before: any, lab: Lab, text: string, id = selected[lab]) {
  const expected = clone(before);
  expected.microbiology[field[lab]][rows[lab]].find((row: any) => row && row.id === id)[annotation[lab]] = text;
  return expected;
}
async function selectSaved(page: Page, lab: Lab, id: number) {
  const before = await state(page), button = page.locator(lab === 'growth' ? '#gl-trial-' + id : '#micro-resistance-evidence-' + id);
  await button.focus(); await button.press('Enter'); await expect(button).toHaveAttribute('aria-pressed', 'true');
  const expected = clone(before); expected.microbiology[field[lab]].selectedId = id;
  expect(await state(page)).toEqual(expected);
}
async function roundTrip(page: Page, lab: Lab) {
  const saved = clone(await state(page)); await harness.unmount(page);
  await page.evaluate(data => (window as any).__mount(data), saved); await ready(page, lab); await instrument(page);
  expect(await state(page)).toEqual(saved); return saved;
}
async function caretInsert(page: Page, lab: Lab, offset: number, insertion: string) {
  const note = editor(page, lab); await note.focus();
  await note.evaluate((node, position) => { (window as any).__annotationNode = node; (node as HTMLTextAreaElement).setSelectionRange(position, position); }, offset);
  await note.pressSequentially(insertion);
  await expect(note).toBeFocused();
  expect(await note.evaluate(node => ({ same: (window as any).__annotationNode === node, start: (node as HTMLTextAreaElement).selectionStart, end: (node as HTMLTextAreaElement).selectionEnd })))
    .toEqual({ same: true, start: offset + insertion.length, end: offset + insertion.length });
}
async function race(page: Page, lab: Lab, mode: 'unrelated' | 'replace' | 'selection' | 'tab', text: string) {
  const note = editor(page, lab); await note.focus();
  await page.evaluate(({ lab, bookField, rowField, noteField, targetId, mode, text }) => {
    const w = window as any, ctx = w.__ctx, original = ctx.setToolData;
    w.__annotationBaseSetter = original; w.__annotationRaceConsumed = false;
    const intercept = (update: any) => {
      if (typeof update === 'function' && !w.__annotationRaceConsumed) {
        w.__annotationRaceConsumed = true;
        original((previous: any) => {
          const current = previous.microbiology, book = current[bookField];
          const rawRows = book[rowField].map((row: any) => {
            if (!row || typeof row !== 'object') return row;
            if (row.id === targetId) return mode === 'replace' ? { ...row, [noteField]: 'A newer replacement owner.', replacementMetadata: true } : row;
            return { ...row, concurrentMetadata: 'A newer unrelated row edit.' };
          });
          const newerBook = { ...book, [rowField]: rawRows, concurrentDraft: 'A newer working draft.' };
          if (mode === 'selection') newerBook.selectedId = targetId - 3;
          const next = { ...previous, unrelatedNotebook: { ...previous.unrelatedNotebook, concurrent: true },
            microbiology: { ...current, [bookField]: newerBook, externalMarker: { ...current.externalMarker, concurrent: true },
              ...(mode === 'tab' ? { tab: 'quiz' } : {}),
              ...(lab === 'resistance' ? { resistanceComparison: { ...current.resistanceComparison, concurrentPreference: true } } : {}) } };
          w.__annotationRaceExpected = JSON.parse(JSON.stringify(next));
          if (mode === 'unrelated') w.__annotationRaceExpected.microbiology[bookField][rowField].find((row: any) => row && row.id === targetId)[noteField] = text;
          return next;
        });
      }
      original(update);
    };
    ctx.setToolData = intercept; ctx.setLabToolData = intercept; w.__rerender();
  }, { lab, bookField: field[lab], rowField: rows[lab], noteField: annotation[lab], targetId: selected[lab], mode, text });
  await note.fill(text);
  expect(await page.evaluate(() => (window as any).__annotationRaceConsumed)).toBe(true);
  expect(await state(page)).toEqual(await page.evaluate(() => (window as any).__annotationRaceExpected));
  expect(await counters(page)).toEqual({ xp: [], random: 0 });
  await page.evaluate(() => { const w = window as any; w.__ctx.setToolData = w.__annotationBaseSetter; w.__ctx.setLabToolData = w.__annotationBaseSetter; w.__rerender(); });
}
async function noOverflow(page: Page, lab: Lab) {
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, zoom: getComputedStyle(document.body).zoom,
    client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  for (const panel of [page.locator('[data-microbiology-tool]'), workspace(page, lab), editor(page, lab).locator('..')]) {
    const layout = await panel.evaluate(node => ({ id: node.id, class: node.className, client: node.clientWidth, scroll: node.scrollWidth,
      overflowing: [...node.querySelectorAll('*')].filter(child => child.clientWidth && child.scrollWidth > child.clientWidth + 1)
        .slice(0, 15).map(child => ({ tag: child.tagName, id: child.id, class: child.className, client: child.clientWidth, scroll: child.scrollWidth })) }));
    expect(layout.scroll <= layout.client + 1, JSON.stringify({ viewport, layout }, null, 2)).toBe(true);
  }
}

test('Growth typing preserves every imported raw row, draft, recovery, citation, and caret across JSON reload', async ({ page }) => {
  await mount(page, 'growth'); await selectSaved(page, 'growth', 139); await selectSaved(page, 'growth', selected.growth); const before = await state(page);
  expect(before.microbiology.growthInvestigation.trials.length).toBeGreaterThan(12);
  await caretInsert(page, 'growth', 'Growth '.length, 'new ');
  const text = 'Growth new annotation original.';
  await expect(editor(page, 'growth')).toHaveValue(text); expect(await state(page)).toEqual(noteChanged(before, 'growth', text));
  expect(await counters(page)).toEqual({ xp: [], random: 0 });
  await editor(page, 'growth').locator('..').screenshot({ path: path.join(out, 'annotation-growth-desktop.png') });
  const saved = await roundTrip(page, 'growth'); await expect(editor(page, 'growth')).toHaveValue(text);
  writeFileSync(path.join(out, 'growth-annotation-restored-state.json'), JSON.stringify(saved, null, 2) + '\n');
});

test('Resistance reflection preserves overflow imports, original snapshots, comparison choices, recovery, and focused caret', async ({ page }) => {
  await mount(page, 'resistance'); await selectSaved(page, 'resistance', 227); await selectSaved(page, 'resistance', selected.resistance); const before = await state(page);
  expect(before.microbiology.resistanceNotebook.records.length).toBeGreaterThan(8);
  await caretInsert(page, 'resistance', 'Resistance '.length, 'refined ');
  const text = 'Resistance refined annotation original.';
  await expect(editor(page, 'resistance')).toHaveValue(text); expect(await state(page)).toEqual(noteChanged(before, 'resistance', text));
  await expect(page.locator('[data-resistance-evidence="230"] blockquote')).toHaveText(before.microbiology.resistanceNotebook.records.find((row: any) => row && row.id === 230).evidence.notes);
  expect(await counters(page)).toEqual({ xp: [], random: 0 });
  const saved = await roundTrip(page, 'resistance'); await expect(editor(page, 'resistance')).toHaveValue(text);
  writeFileSync(path.join(out, 'resistance-annotation-restored-state.json'), JSON.stringify(saved, null, 2) + '\n');
});

test('both annotation updaters read the newest raw state and retain concurrent unrelated edits', async ({ page }) => {
  for (const lab of ['growth', 'resistance'] as Lab[]) {
    await mount(page, lab);
    await race(page, lab, 'unrelated', 'Later reasoning belongs to this original saved owner.');
    await expect(editor(page, lab)).toHaveValue('Later reasoning belongs to this original saved owner.');
    await harness.unmount(page);
  }
});

test('replaced owners, later selections, other tabs, and generated repair IDs reject stale implicit annotation writes', async ({ page }) => {
  for (const lab of ['growth', 'resistance'] as Lab[]) {
    for (const mode of ['replace', 'selection', 'tab'] as const) {
      await mount(page, lab); await race(page, lab, mode, 'This stale event must be discarded.'); await harness.unmount(page);
    }
    const data = seed(lab);
    data[field[lab]] = { [rows[lab]]: lab === 'growth' ? [trial('invalid-id', 1), trial(1, 2)] : [record('invalid-id', 1), record(1, 2)], selectedId: 2, nextId: 20, rawMarker: true };
    await mount(page, lab, data, false); if (lab === 'resistance') await open(page.locator('.micro-resistance-saved'));
    const before = await state(page);
    await expect(page.locator(lab === 'growth' ? '#gl-trial-2' : '#micro-resistance-evidence-2')).toBeVisible();
    await expect(page.locator(lab === 'growth' ? '#gl-explanation' : '[data-resistance-reflection]')).toHaveCount(0);
    expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 }); await harness.unmount(page);
  }
});

test('completed restored Resistance runs report four actual outcomes without inventing an original prediction', async ({ page }) => {
  const cases = [
    { name: 'increase', history: [[72, 8], [60, 8], [50, 8], [40, 8]], finalPct: 17, text: 'The resistant share increased by 7 percentage points.' },
    { name: 'similar', history: [[72, 8], [70, 8], [68, 8], [66, 8]], finalPct: 11, text: 'The resistant share stayed about the same (a 1-point change; changes within 5 points count as similar).' },
    { name: 'decrease', history: [[72, 8], [70, 6], [70, 4], [70, 2]], finalPct: 3, text: 'The resistant share decreased by 7 percentage points.' },
    { name: 'extinct', history: [[72, 8], [36, 4], [0, 0]], finalPct: null, text: 'The population died out. There is no surviving population from which to calculate a resistant share.' }
  ];
  for (const scenario of cases) {
    const data = seed('resistance'); data.resistanceInvestigation = { ...fullRun(scenario.history.map(([sensitive, resistant], day) => ({ day, sensitive, resistant }))), dose: 30 };
    await mount(page, 'resistance', data); const before = await state(page);
    const summary = page.locator('#micro-resistance-outcome-summary');
    await expect(summary).toHaveText('Observation summary. ' + scenario.text);
    await expect(summary).not.toContainText('was not classified'); await expect(summary).not.toContainText('Prediction');
    await expect(workspace(page, 'resistance')).toContainText('No prediction was saved for this restored run. Its observed outcome is shown without a prediction comparison.');
    await expect(page.locator('input[name="micro-resistance-prediction"]:checked')).toHaveCount(0);
    expect(before.microbiology.resistanceInvestigation.prediction).toBeNull();
    const last = before.microbiology.resistanceInvestigation.history.at(-1), total = last.sensitive + last.resistant;
    expect(total ? Math.round(last.resistant / total * 100) : null).toBe(scenario.finalPct);
    expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 }); await harness.unmount(page);
  }
});

test('a partial run without prediction resumes to a real outcome while annotations never advance or regrade it', async ({ page }) => {
  const data = seed('resistance'); data.resistanceInvestigation = { ...fullRun([0, 1].map(day => ({ day, sensitive: 72, resistant: 8 }))), runAwarded: false };
  await mount(page, 'resistance', data); const before = await state(page), originalBook = clone(before.microbiology.resistanceNotebook);
  await expect(page.locator('#micro-resistance-outcome-summary')).toHaveCount(0);
  await editor(page, 'resistance').fill('Reflection before resuming the original live observations.');
  expect(await state(page)).toEqual(noteChanged(before, 'resistance', 'Reflection before resuming the original live observations.'));
  expect(await counters(page)).toEqual({ xp: [], random: 0 });
  const step = page.getByRole('button', { name: 'Step round', exact: true });
  await step.focus(); await step.press('Enter');
  await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBe(2);
  await expect(page.locator('#micro-resistance-outcome-summary')).toHaveCount(0);
  await step.press('Enter');
  await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBe(3);
  await expect(step).toBeDisabled();
  await expect(page.locator('#micro-resistance-outcome-summary')).toHaveText('Observation summary. The resistant share stayed about the same (a 0-point change; changes within 5 points count as similar).');
  const completed = await state(page), steppedCounters = await counters(page);
  expect(completed.microbiology.resistanceInvestigation.prediction).toBeNull();
  expect(completed.microbiology.resistanceInvestigation.history).toEqual([0, 1, 2, 3].map(day => ({ day, sensitive: 72, resistant: 8 })));
  expect(steppedCounters.random).toBeGreaterThan(0);
  const expectedBook = clone(originalBook); expectedBook.records.find((row: any) => row && row.id === 230).reviewNote = 'Reflection before resuming the original live observations.';
  expect(completed.microbiology.resistanceNotebook).toEqual(expectedBook);
  await editor(page, 'resistance').fill('Reflection after observing the same zero-exposure full dish.');
  expect(await state(page)).toEqual(noteChanged(completed, 'resistance', 'Reflection after observing the same zero-exposure full dish.'));
  expect(await counters(page)).toEqual(steppedCounters);
  await page.locator('#micro-resistance-outcome-summary').locator('..').screenshot({ path: path.join(out, 'annotation-outcome-resume.png') });
});

test('literal keyboard annotations retain state at 320 pixels and 2×/4× CSS zoom without internal overflow', async ({ page }) => {
  for (const lab of ['growth', 'resistance'] as Lab[]) {
    await mount(page, lab); await page.setViewportSize({ width: 320, height: 844 });
    const before = await state(page), note = editor(page, lab), text = '<img src=x onerror="window.__annotationInjected=true"> Literal learner text.';
    await note.focus(); await note.press('Control+A'); await note.pressSequentially(text);
    await expect(note).toHaveValue(text); await expect(note).toBeFocused();
    const expected = noteChanged(before, lab, text); expect(await state(page)).toEqual(expected);
    expect(await page.evaluate(() => (window as any).__annotationInjected)).toBeUndefined();
    await expect(workspace(page, lab).locator('img[src="x"]')).toHaveCount(0); await noOverflow(page, lab);
    if (lab === 'resistance') await note.locator('..').screenshot({ path: path.join(out, 'annotation-resistance-phone.png') });
    await page.setViewportSize({ width: 1280, height: 960 });
    for (const zoom of [2, 4]) {
      await page.evaluate(value => { document.body.style.zoom = String(value); }, zoom);
      await note.focus(); await expect(note).toBeFocused(); await noOverflow(page, lab); expect(await state(page)).toEqual(expected);
    }
    if (lab === 'growth') await note.locator('..').screenshot({ path: path.join(out, 'annotation-zoom.png') });
    expect(await counters(page)).toEqual({ xp: [], random: 0 }); await harness.unmount(page);
  }
});
