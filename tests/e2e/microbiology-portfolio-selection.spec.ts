import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 90000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-selected-portfolio-2026-10-01');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const source = readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
const bankStart = source.indexOf('var QUIZ_QUESTIONS = [');
const bank = new Function(source.slice(bankStart, source.indexOf('// INTERACTIVE WIDGETS', bankStart)) + '\nreturn QUIZ_QUESTIONS;')() as { q: string; choices: string[]; answer: number; explain: string }[];
const activities = ['mystery', 'microscope', 'gram', 'growth', 'resistance', 'quiz'];
const titles: Record<string, string> = { mystery: 'Mystery specimens', microscope: 'Microscope measurements', gram: 'Gram-stain investigation',
  growth: 'Growth investigations', resistance: 'Resistance evidence', quiz: 'Quiz and practice' };
const base = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 50 };
const emptyGrowth = { profile: 'ecoli', tempC: 30, pH: 7, oxygen: 50, hypothesis: '', explanation: '', understood: false, stuckRevealed: false, log: [] };
const context = { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 };
const measured = { value: 2, unit: 'um', context };
const pond = { claim: 'protist', evidence: ['structure', 'behavior'], reasoning: 'Recorded pond explanation connects nuclei and cilia.', limitation: 'bounded' };
const gram = { prediction: 'both', interpretation: 'wall', explanation: 'Recorded Gram explanation connects envelopes and retained dye.' };
const run = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: 'Original Resistance notes.', history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] };
const trial = { id: 7, control: base, conditions: { ...base, tempC: 25 }, prediction: 'lower', hypothesis: 'Before saved Growth trial.', explanation: 'Saved Growth explanation.', citedHours: [0, 6, 24] };
let errors: string[];

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
const include = (page: Page, id: string) => page.locator('#micro-portfolio-include-' + id);
const selectedStatus = (page: Page) => page.locator('#micro-portfolio-selected-download-status');
const fullStatus = (page: Page) => page.locator('#micro-portfolio-download-status');

function defaults(): Record<string, any> {
  return { tab: 'home', showMicroLibrary: false, selectedBacterium: 'ecoli', selectedVirus: 'covid', selectedScope: 'lightbright',
    selectedMicrobiome: 'gut', selectedFerment: 'sourdough', selectedCase: 'snow', scopeOrganism: 'ecoli', magnification: 1000,
    microscopeZoom: 20, microscopeFocus: 50, microscopeTargetFocus: 50, microscopeSeenSlides: [], gramStep: 0, quizIdx: 0,
    quizAnswers: [], quizSubmitted: false, quizCorrect: 0, growthLab: clone(emptyGrowth), savedSentinel: { keep: 'Raw independent metadata.' } };
}
function richSeed(): Record<string, any> {
  return { ...defaults(),
    mysteryLab: { active: 'pond', cases: { pond: { ...pond, revealed: ['context', 'structure', 'behavior'], record: pond,
      previousRecord: { ...pond, reasoning: 'Previous pond explanation.' }, reasoning: 'Working pond revision.', reportView: 'recorded', checked: false } } },
    microscopeMeasurements: { ecoli: { result: measured, previousResult: { ...measured, value: 1.8 }, draft: { ...measured, value: '3' } } },
    gramInvestigation: { ...gram, step: 2, maxStep: 4, record: gram, previousRecord: { ...gram, explanation: 'Previous Gram explanation.' }, explanation: 'Working Gram revision.' },
    growthLab: { ...base, tempC: 18, understood: true, stuckRevealed: true, hypothesis: 'Earlier Growth notes.', explanation: 'Earlier Growth explanation.', log: [], legacyExtra: { keep: true } },
    growthInvestigation: { control: base, trials: [{ ...trial, trialExtra: { keep: true } }], selectedId: 7, nextId: 20, prediction: 'higher',
      hypothesis: 'Working Growth reasoning.', explanation: 'Working Growth notes.', sweepVariable: 'pH', sweep: { variable: 'pH', conditions: base },
      previousSweep: { variable: 'tempC', conditions: base }, removed: { trial: { ...trial, id: 9, hypothesis: 'Removed Growth reasoning.',
        explanation: 'Removed Growth explanation.', citedHours: [12] }, index: 1 }, notebookExtra: { keep: 'Original notebook metadata.' } }, growthReviewHour: 6,
    resistanceInvestigation: { ...run, notes: 'Working Resistance notes.' },
    resistanceNotebook: { selectedId: 4, nextId: 10, records: [{ id: 4, evidence: run, reviewNote: 'Later Resistance reflection.' }],
      removed: { record: { id: 8, evidence: { ...run, notes: 'Removed Resistance notes.' }, reviewNote: 'Removed Resistance reflection.' }, index: 1 } },
    quizAnswers: bank.map((q, i) => i === 0 ? (q.answer + 1) % q.choices.length : q.answer), quizSubmitted: true, quizCorrect: 999,
    quizPractice: { answers: bank.map(q => q.answer), checked: bank.map((_, i) => i === 0), reflections: ['Later quiz correction reflection.'] }
  };
}
async function instrument(page: Page) {
  await page.evaluate(() => {
    const w = window as any; w.__selectionXP = []; w.__selectionRngCalls = 0;
    w.__ctx.awardXP = (...args: unknown[]) => w.__selectionXP.push(args);
    w.__selectionOriginalRandom = w.__selectionOriginalRandom || Math.random;
    Math.random = () => { w.__selectionRngCalls++; return w.__selectionOriginalRandom(); };
  });
}
async function noLearningChanges(page: Page) {
  expect(await page.evaluate(() => (window as any).__selectionXP)).toEqual([]);
  expect(await page.evaluate(() => (window as any).__selectionRngCalls)).toBe(0);
}
async function mount(page: Page, data: Record<string, unknown> = richSeed()) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { unrelatedNotebook: { note: 'Keep other work.' }, microbiology: data }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await instrument(page);
}
async function press(button: Locator) { await button.focus(); await button.press('Enter'); }
async function open(page: Page) {
  if (!await page.locator('#micro-portfolio').evaluate(node => (node as HTMLDetailsElement).open)) await press(page.locator('#micro-portfolio-summary'));
  await expect(page.locator('#micro-portfolio')).toHaveAttribute('open', '');
}
async function review(page: Page, id: string) {
  await page.locator('#micro-portfolio-activity').selectOption(id);
  await expect(page.locator('#micro-portfolio-preview')).toHaveAttribute('data-portfolio-activity', id);
  return page.locator('#micro-portfolio-preview').innerText();
}
async function checkedIds(page: Page) {
  return page.locator('#micro-portfolio-selection input:checked').evaluateAll(nodes => nodes.map(node => node.id.replace('micro-portfolio-include-', '')));
}
async function toggle(page: Page, id: string) {
  await include(page, id).focus(); await include(page, id).press('Space'); await expect(include(page, id)).toBeFocused();
}
async function download(page: Page, selected: boolean, saveAs: string) {
  const button = page.locator(selected ? '#micro-portfolio-download-selected' : '#micro-portfolio-download'); await button.focus();
  const pending = page.waitForEvent('download'); await button.press('Enter'); const file = await pending;
  expect(file.suggestedFilename()).toBe(selected ? 'micro-lab-selected-portfolio.txt' : 'micro-lab-portfolio.txt');
  const text = readFileSync((await file.path())!, 'utf8'); await file.saveAs(path.join(out, saveAs)); await expect(button).toBeFocused(); return text;
}
function sections(text: string) {
  const markers = [...text.matchAll(/^=== (.+) ===$/gm)];
  return markers.map((marker, index) => ({ title: marker[1], text: text.slice(marker.index! + marker[0].length, markers[index + 1]?.index ?? text.length).trim() }));
}
async function reload(page: Page) {
  const saved = clone(await state(page)); await harness.unmount(page); await page.evaluate(data => (window as any).__mount(data), saved);
  await instrument(page); await expect(page.locator('[data-microbiology-tool]')).toBeVisible(); return saved;
}
async function externalData(page: Page, data: any) {
  await page.evaluate(next => (window as any).__ctx.setToolData(next), data); expect(await state(page)).toEqual(data);
}
async function noOverflow(page: Page) {
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, rootZoom: getComputedStyle(document.documentElement).zoom,
    bodyZoom: getComputedStyle(document.body).zoom, documentScrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.documentScrollWidth <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  for (const selector of ['[data-microbiology-tool]', '.micro-workspace-home', '.micro-portfolio', '#micro-portfolio-selection', '#micro-portfolio-included', '#micro-portfolio-preview']) {
    const box = await page.locator(selector).evaluate(node => ({ clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
      overflowing: [...node.querySelectorAll('*')].filter(child => child.scrollWidth > child.clientWidth + 1).slice(0, 18)
        .map(child => ({ tag: child.tagName, id: child.id, classes: child.getAttribute('class'), clientWidth: child.clientWidth, scrollWidth: child.scrollWidth })) }));
    expect(box.scrollWidth <= box.clientWidth + 1, JSON.stringify({ selector, viewport, ...box })).toBe(true);
  }
}

test('mixed selections export complete included activities in canonical order while the full export and preview stay independent', async ({ page }) => {
  await mount(page); const before = await state(page); await open(page);
  await expect(page.locator('#micro-portfolio-selection')).toHaveAccessibleName('Activities to include in a selected download');
  await expect(page.locator('#micro-portfolio-download-selected')).toBeDisabled(); expect(await checkedIds(page)).toEqual([]);
  const previews: Record<string, string> = {};
  for (const id of activities) { await expect(include(page, id)).toBeEnabled(); previews[id] = (await review(page, id)).trim(); }
  for (const id of ['quiz', 'growth', 'mystery']) await toggle(page, id);
  expect(await checkedIds(page)).toEqual(['mystery', 'growth', 'quiz']);
  await expect(page.locator('#micro-portfolio-included')).toHaveText('Included activities: Mystery specimens, Growth investigations, Quiz and practice');
  await expect(page.locator('#micro-portfolio-download-selected')).toHaveAttribute('aria-describedby', 'micro-portfolio-included micro-portfolio-selection-help');
  await review(page, 'resistance'); expect(await checkedIds(page)).toEqual(['mystery', 'growth', 'quiz']);
  const selected = await download(page, true, 'selected-portfolio.txt');
  expect(sections(selected)).toEqual(['mystery', 'growth', 'quiz'].map(id => ({ title: titles[id], text: previews[id] })));
  expect(selected.split('\n')[1]).toBe('Included activities: Mystery specimens, Growth investigations, Quiz and practice');
  for (const marker of ['Recorded pond explanation', 'Previous pond explanation', 'Working pond revision', 'Saved Growth explanation', 'Removed Growth explanation',
    'Working Growth reasoning', 'Earlier Growth notes', 'Current saved sweep', 'Previous saved sweep', 'Cited model hour\tOriginal control population\tTrial population\tTrial minus control',
    'Original score: 14/15', 'Later quiz correction reflection']) expect(selected).toContain(marker);
  for (const marker of ['Recorded Gram explanation', 'Original Resistance notes', 'Later Resistance reflection']) expect(selected).not.toContain(marker);
  const full = await download(page, false, 'full-portfolio.txt'); expect(sections(full)).toEqual(activities.map(id => ({ title: titles[id], text: previews[id] })));
  expect(full).toContain('Previous Gram explanation'); expect(full).toContain('Removed Resistance reflection.');
  expect(await state(page)).toEqual(before); await noLearningChanges(page);
  await page.locator('#micro-portfolio').screenshot({ path: path.join(out, 'selected-portfolio-desktop.png') });
});

test('selection persists while the disclosure stays mounted and resets after JSON remount without changing saved work', async ({ page }) => {
  await mount(page); const before = await state(page); await open(page); await toggle(page, 'growth'); await toggle(page, 'resistance');
  await review(page, 'quiz'); await download(page, true, 'selected-before-remount.txt');
  await expect(selectedStatus(page)).toContainText('download has started');
  await page.locator('#micro-portfolio-summary').focus(); await page.keyboard.press('Space');
  await expect(page.locator('#micro-portfolio')).not.toHaveAttribute('open', ''); await page.keyboard.press('Space');
  expect(await checkedIds(page)).toEqual(['growth', 'resistance']); await expect(page.locator('#micro-portfolio-activity')).toHaveValue('quiz');
  expect(await state(page)).toEqual(before); await noLearningChanges(page); const saved = await reload(page); expect(saved).toEqual(before);
  await open(page); expect(await checkedIds(page)).toEqual([]); await expect(page.locator('#micro-portfolio-download-selected')).toBeDisabled();
  await expect(selectedStatus(page)).toBeEmpty(); await expect(fullStatus(page)).toBeEmpty(); await expect(page.locator('#micro-portfolio-activity')).toHaveValue('mystery');
  await expect(page.locator('#micro-portfolio-download')).toBeEnabled();
  expect(await state(page)).toEqual(before); await noLearningChanges(page);
});

test('empty and malformed sections have disabled checkboxes with help and include-all chooses only available activities', async ({ page }) => {
  const damaged = { ...defaults(), quizAnswers: Array(15).fill('1'), quizSubmitted: true, quizCorrect: 500,
    growthInvestigation: { trials: [null] }, resistanceNotebook: { records: [null] }, microscopeMeasurements: { ecoli: { result: { ...measured, value: null } } },
    gramInvestigation: { step: 99, maxStep: 'all', record: 'yes' }, mysteryLab: { cases: { pond: { record: { claim: 'anything', reasoning: 'x' } } } } };
  for (const data of [defaults(), damaged]) {
    await mount(page, data); const before = await state(page); await open(page);
    for (const id of activities) {
      await expect(include(page, id)).toBeDisabled(); await expect(include(page, id)).not.toBeChecked();
      await expect(include(page, id)).toHaveAttribute('aria-describedby', 'micro-portfolio-availability-' + id);
      await expect(page.locator('#micro-portfolio-availability-' + id)).toHaveText('No evidence or working notes yet.');
    }
    for (const id of ['#micro-portfolio-download', '#micro-portfolio-download-selected', '#micro-portfolio-select-all', '#micro-portfolio-clear-selection']) await expect(page.locator(id)).toBeDisabled();
    expect(await checkedIds(page)).toEqual([]); await expect(page.locator('#micro-portfolio-included')).toContainText('Select at least one activity');
    expect(await state(page)).toEqual(before); await noLearningChanges(page); await harness.unmount(page);
  }
  await mount(page, { ...defaults(), quizAnswers: [0] }); const before = await state(page); await open(page);
  for (const id of activities) { if (id === 'quiz') await expect(include(page, id)).toBeEnabled(); else await expect(include(page, id)).toBeDisabled(); }
  await press(page.locator('#micro-portfolio-select-all')); await expect(page.locator('#micro-portfolio-select-all')).toBeFocused();
  expect(await checkedIds(page)).toEqual(['quiz']); await expect(page.locator('#micro-portfolio-download-selected')).toBeEnabled();
  const text = await download(page, true, 'selected-draft-quiz.txt'); expect(sections(text).map(section => section.title)).toEqual(['Quiz and practice']);
  expect(text).toContain('Unsubmitted or incomplete attempt'); expect(text).not.toContain('Correct answer:');
  await press(page.locator('#micro-portfolio-clear-selection')); expect(await checkedIds(page)).toEqual([]);
  await expect(page.locator('#micro-portfolio-download-selected')).toBeDisabled(); await expect(page.locator('#micro-portfolio-download')).toBeEnabled();
  expect(await state(page)).toEqual(before); await noLearningChanges(page);
});

test('selected downloads retry, clean up, announce repetitions and discard stale feedback and lost-content choices', async ({ page }) => {
  await mount(page); await open(page); await toggle(page, 'growth'); const before = await state(page);
  const button = page.locator('#micro-portfolio-download-selected');
  await expect(selectedStatus(page)).toHaveAttribute('role', 'status'); await expect(selectedStatus(page)).toHaveAttribute('aria-live', 'polite');
  await expect(selectedStatus(page)).toHaveAttribute('aria-atomic', 'true');
  await page.evaluate(() => {
    const w = window as any; w.__selectionCreate = URL.createObjectURL; w.__selectionRevoke = URL.revokeObjectURL;
    w.__selectionClick = HTMLAnchorElement.prototype.click; w.__selectionCreated = []; w.__selectionRevoked = [];
    URL.createObjectURL = () => { throw new Error('Unavailable object URL for selected download test'); };
    URL.revokeObjectURL = url => { w.__selectionRevoked.push(url); w.__selectionRevoke.call(URL, url); };
  });
  await press(button); await expect(selectedStatus(page)).toContainText('could not download'); await expect(button).toBeFocused();
  expect(await state(page)).toEqual(before); await toggle(page, 'mystery'); await expect(selectedStatus(page)).toBeEmpty();
  await toggle(page, 'mystery'); await expect(selectedStatus(page)).toBeEmpty();
  await page.evaluate(() => {
    const w = window as any; URL.createObjectURL = blob => { const url = w.__selectionCreate.call(URL, blob); w.__selectionCreated.push(url); return url; };
    HTMLAnchorElement.prototype.click = function() { throw new Error('Unavailable anchor click for selected download test'); };
  });
  await press(button); await expect(selectedStatus(page)).toContainText('could not download'); await expect(button).toBeFocused();
  await expect(page.locator('a[download="micro-lab-selected-portfolio.txt"]')).toHaveCount(0);
  await page.evaluate(() => { HTMLAnchorElement.prototype.click = (window as any).__selectionClick; });
  const text = await download(page, true, 'selected-retry.txt'); await expect(selectedStatus(page)).toContainText('download has started');
  await page.evaluate(() => { (window as any).__selectionNoticeNode = document.querySelector('#micro-portfolio-selected-download-status span'); });
  expect(await download(page, true, 'selected-repeated.txt')).toBe(text);
  expect(await page.evaluate(() => (window as any).__selectionNoticeNode?.isConnected)).toBe(false);
  await expect.poll(() => page.evaluate(() => (window as any).__selectionRevoked.length)).toBe(3);
  expect(await page.evaluate(() => (window as any).__selectionCreated)).toEqual(await page.evaluate(() => (window as any).__selectionRevoked));
  await review(page, 'resistance'); await expect(selectedStatus(page)).toContainText('download has started');
  await download(page, false, 'full-before-source-change.txt'); await expect(fullStatus(page)).toContainText('download has started');
  expect(await state(page)).toEqual(before);
  const revised = clone(before); revised.microbiology.gramInvestigation.explanation += ' External working revision.';
  await externalData(page, revised); await expect(fullStatus(page)).toBeEmpty(); await expect(selectedStatus(page)).toBeEmpty(); expect(await checkedIds(page)).toEqual(['growth']);
  await externalData(page, before); await expect(fullStatus(page)).toBeEmpty(); await expect(selectedStatus(page)).toBeEmpty();
  const unavailable = clone(before); unavailable.microbiology.growthLab = clone(emptyGrowth); unavailable.microbiology.growthInvestigation = { trials: [], selectedId: null, nextId: 20 };
  await externalData(page, unavailable); await expect(include(page, 'growth')).toBeDisabled(); await expect(include(page, 'growth')).not.toBeChecked();
  await expect(page.locator('#micro-portfolio-download-selected')).toBeDisabled(); expect(await checkedIds(page)).toEqual([]);
  await externalData(page, before); await expect(include(page, 'growth')).toBeEnabled(); await expect(include(page, 'growth')).not.toBeChecked();
  await expect(page.locator('#micro-portfolio-download-selected')).toBeDisabled(); expect(await checkedIds(page)).toEqual([]);
  await expect.poll(() => page.evaluate(() => (window as any).__selectionRevoked.length)).toBe(4);
  expect(await page.evaluate(() => (window as any).__selectionCreated)).toEqual(await page.evaluate(() => (window as any).__selectionRevoked));
  await expect(page.locator('a[download="micro-lab-selected-portfolio.txt"],a[download="micro-lab-portfolio.txt"]')).toHaveCount(0);
  expect(await state(page)).toEqual(before); await noLearningChanges(page);
});

test('selected unfinished work withholds quiz solutions, measurement references, Growth outcomes and unrevealed Mystery answers', async ({ page }) => {
  const data = { ...defaults(), quizAnswers: [0, '1'], quizSubmitted: true, quizCorrect: 500,
    quizPractice: { answers: bank.map(q => q.answer), checked: Array(15).fill(true), reflections: ['Forged private practice reflection.'] },
    microscopeMeasurements: { ecoli: { draft: { value: '3', unit: 'um', context } } },
    mysteryLab: { active: 'wall', cases: { wall: { revealed: ['context'], evidence: ['structure'], claim: 'unresolved', limitation: 'bounded', reasoning: 'Context-only working uncertainty.' } } },
    growthLab: { ...emptyGrowth, tempC: 18 }, growthInvestigation: { control: base, prediction: 'higher', hypothesis: 'Pending selection Growth reasoning.', citedHours: [6] } };
  await mount(page, data); const before = await state(page); await open(page); await press(page.locator('#micro-portfolio-select-all'));
  expect(await checkedIds(page)).toEqual(['mystery', 'microscope', 'growth', 'quiz']);
  const text = await download(page, true, 'selected-pending-work.txt');
  expect(sections(text).map(section => section.title)).toEqual(['Mystery specimens', 'Microscope measurements', 'Growth investigations', 'Quiz and practice']);
  for (const marker of ['Context-only working uncertainty.', 'Unchecked working estimate', 'Original estimate: 3 um', 'Pending selection Growth reasoning.', 'Unsubmitted or incomplete attempt']) expect(text).toContain(marker);
  for (const marker of ['Original score:', 'Correct answer:', 'Explanation:', 'Practice status:', 'Forged private practice reflection.', 'Drawing reference (µm):',
    'Absolute difference from the drawing reference (%):', 'Within the ±20% practice band:', 'Model comparison at hour 24', 'Model hour\tOriginal control population\tTrial population',
    'Population at hour 24\tModeled lag (hours)', 'Cited model hour\tOriginal control population\tTrial population\tTrial minus control']) expect(text).not.toContain(marker);
  expect(text).not.toContain(bank[0].explain);
  const hidden = await page.evaluate(() => (window as any).__MicrobiologyCore.mystery.catalog().find((item: any) => item.id === 'wall'));
  expect(text).toContain(hidden.context); for (const key of ['size', 'structure', 'behavior', 'feedback']) expect(text).not.toContain(hidden[key]);
  expect(await state(page)).toEqual(before); await noLearningChanges(page);
});

test('selection labels and controls reflow at phone width and enlarged layouts and learner markup stays literal', async ({ page }) => {
  const data = richSeed(), literal = '<img src=x onerror="window.selectionInjected=true">' + 'longnote'.repeat(140);
  data.mysteryLab.cases.pond.reasoning = literal; await mount(page, data); const before = await state(page); await open(page);
  await review(page, 'mystery'); await expect(page.locator('#micro-portfolio-preview')).toContainText(literal);
  await expect(page.locator('#micro-portfolio-preview img')).toHaveCount(0); expect(await page.evaluate(() => (window as any).selectionInjected)).toBeUndefined();
  await press(page.locator('#micro-portfolio-select-all')); expect(await checkedIds(page)).toEqual(activities);
  const text = await download(page, true, 'selected-literal-work.txt'); expect(text).toContain(literal);
  await page.setViewportSize({ width: 320, height: 844 }); await noOverflow(page);
  for (const label of await page.locator('.micro-portfolio-inclusion').all()) expect(await label.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  for (const id of ['#micro-portfolio-summary', '#micro-portfolio-activity', '#micro-portfolio-download', '#micro-portfolio-download-selected', '#micro-portfolio-select-all', '#micro-portfolio-clear-selection'])
    expect(await page.locator(id).evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await page.locator('#micro-portfolio').screenshot({ path: path.join(out, 'selected-portfolio-phone.png') });
  await review(page, 'microscope'); await page.setViewportSize({ width: 1280, height: 960 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const zoom of [2, 4]) { await page.evaluate(value => { document.body.style.zoom = String(value); }, zoom); await noOverflow(page); }
  await page.locator('#micro-portfolio').screenshot({ path: path.join(out, 'selected-portfolio-zoom.png') });
  expect(await checkedIds(page)).toEqual(activities); expect(await state(page)).toEqual(before); await noLearningChanges(page);
});
