import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 150000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-resistance-rounds-2026-10-04');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const state = (page: Page) => page.evaluate(() => (window as any).__toolData);
const round = (page: Page) => page.getByLabel('Shared comparison round', { exact: true });
const panel = (page: Page) => page.locator('#micro-resistance-comparison');
const row = (page: Page, metric: string) => page.locator(`[data-resistance-compare-row="${metric}"]`);
const literal = '<img src=x onerror="window.__roundInjected=true"> Imported observations remain literal.';
const longNote = 'Keep the original imported note. '.repeat(80) + ' ORIGINAL END';
let errors: string[];

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });

const snapshotA = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: 'A original notes, saved at round 3.',
  history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }, { day: 2, sensitive: 50, resistant: 8 }, { day: 3, sensitive: 40, resistant: 8 }] };
const snapshotB = { dose: 60, duration: 8, initRes: 10, prediction: 'increase', notes: '=SUM(A1:A2) is literal imported evidence.',
  history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 2, resistant: 6 }, { day: 2, sensitive: 0, resistant: 4 }] };
const extinct = { dose: 100, duration: 3, initRes: 0, prediction: 'extinct', explanation: 'extinction', explanationSubmitted: true, notes: 'No survivors at round 1.',
  history: [{ day: 0, sensitive: 80, resistant: 0 }, { day: 1, sensitive: 0, resistant: 0 }] };
function record(id: number | string, evidence: any) {
  return { id, evidence: { ...clone(evidence), importedEvidence: { literal } }, reviewNote: longNote, importedRecord: { literal, original: ['Keep provenance.'] } };
}
function seed(): Record<string, any> {
  return { tab: 'resistance', showMicroLibrary: false, earnedXP: 53,
    resistanceInvestigation: { dose: 0, duration: 3, initRes: 10, prediction: 'similar', notes: 'Independent current culture notes.',
      history: [0, 1, 2, 3].map(day => ({ day, sensitive: 72, resistant: 8 })), runAwarded: true, explanationAwarded: false },
    resistanceNotebook: { records: [record(7, snapshotA), record(4, snapshotB), record(9, extinct)], selectedId: 7, nextId: 40,
      importedNotebook: { literal }, removed: { record: record(30, snapshotB), index: 1, importedRecovery: true } },
    resistanceComparison: { aId: null, bId: null, round: null, rawPreference: { literal, keep: true } },
    growthLab: { profile: 'ecoli', tempC: 18, pH: 7, oxygen: 100, hypothesis: 'Keep the next Growth hypothesis.' },
    metadata: { literal, notes: 'Keep unrelated Micro Lab state.' } };
}
async function open(details: Locator) {
  if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) {
    await details.locator(':scope > summary').focus(); await details.locator(':scope > summary').press('Enter');
  }
  await expect(details).toHaveAttribute('open', '');
}
async function instrument(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__roundXP = []; w.__roundRandom = 0; w.__ctx.awardXP = (...args: any[]) => w.__roundXP.push(args);
    if (!w.__roundOriginalRandom) {
      w.__roundOriginalRandom = Math.random;
      Math.random = () => { w.__roundRandom++; return w.__roundOriginalRandom(); };
    }
    w.__rerender();
  });
}
async function mount(page: Page, data = seed()) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { unrelatedTool: { note: literal, metadata: [1, 2, 3] }, microbiology: data }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBe(3);
  await open(panel(page)); await instrument(page);
}
async function choose(page: Page, a = '7', b = '4') {
  await page.getByLabel('Snapshot A', { exact: true }).selectOption(a);
  await page.getByLabel('Snapshot B', { exact: true }).selectOption(b);
}
async function counters(page: Page) {
  return page.evaluate(() => ({ xp: (window as any).__roundXP, random: (window as any).__roundRandom }));
}
function withPair(before: any, aId: number | null, bId: number | null, selectedRound: number | null) {
  const expected = clone(before);
  Object.assign(expected.microbiology.resistanceComparison, { aId, bId, round: selectedRound });
  return expected;
}
async function counts(page: Page, values: Record<string, string[]>) {
  for (const [metric, cells] of Object.entries(values)) await expect(row(page, metric).locator('td')).toHaveText(cells);
}
async function reload(page: Page) {
  const saved = clone(await state(page)); await harness.unmount(page);
  await page.evaluate(value => (window as any).__mount(value), saved);
  await open(panel(page)); await instrument(page); expect(await state(page)).toEqual(saved); return saved;
}
async function download(page: Page, format: 'text' | 'csv', name: string) {
  const pending = page.waitForEvent('download'); await page.locator('#micro-resistance-comparison-download-' + format).click();
  const file = await pending, text = readFileSync((await file.path())!, 'utf8');
  await file.saveAs(path.join(out, name)); return { text, filename: file.suggestedFilename() };
}
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\r\n').map(line => Array.from(line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g), match => match[1].replace(/""/g, '"')));
  const headers = lines.shift()!;
  return lines.map(cells => Object.fromEntries(headers.map((header, index) => [header, cells[index]])));
}
async function noOverflow(page: Page) {
  const viewport = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, zoom: getComputedStyle(document.body).zoom }));
  expect(viewport.scroll <= viewport.width + 1, JSON.stringify(viewport)).toBe(true);
  for (const node of [page.locator('[data-microbiology-tool]'), panel(page), round(page).locator('..'), page.locator('#micro-resistance-comparison-table')]) {
    const layout = await node.evaluate(element => ({ id: element.id, client: element.clientWidth, scroll: element.scrollWidth }));
    expect(layout.scroll <= layout.client + 1, JSON.stringify({ viewport, layout })).toBe(true);
  }
}

test('inspects initial and earlier observed rounds while keeping original endpoints, annotations and the current culture intact', async ({ page }) => {
  await mount(page); const before = await state(page); await choose(page);
  await expect(round(page)).toHaveValue('');
  await expect(round(page).locator('option')).toHaveCount(4);
  await expect(page.locator('#micro-resistance-comparison-round')).toContainText('2');
  await counts(page, { sensitive: ['50', '0', '-50'], resistant: ['8', '4', '-4'], totalAlive: ['58', '4', '-54'], sharePct: ['14%', '100%', '+86 percentage points'] });
  expect(await state(page)).toEqual(withPair(before, 7, 4, null));
  await round(page).selectOption('0');
  await expect(page.locator('#micro-resistance-comparison-table caption')).toHaveText('Saved counts at shared round 0');
  await counts(page, { sensitive: ['72', '72', '0'], resistant: ['8', '8', '0'], totalAlive: ['80', '80', '0'], sharePct: ['10%', '10%', '0 percentage points'] });
  expect(await state(page)).toEqual(withPair(before, 7, 4, 0));
  await round(page).selectOption('1');
  await counts(page, { sensitive: ['60', '2', '-58'], resistant: ['8', '6', '-2'], totalAlive: ['68', '8', '-60'], sharePct: ['12%', '75%', '+63 percentage points'] });
  expect(await state(page)).toEqual(withPair(before, 7, 4, 1));
  expect(await counters(page)).toEqual({ xp: [], random: 0 });
  await panel(page).screenshot({ path: path.join(out, 'resistance-earlier-round-desktop.png') });
});

test('downloads the selected observed round in text and CSV while retaining each original saved endpoint and full history', async ({ page }) => {
  await mount(page); await choose(page); await round(page).selectOption('1'); const before = await state(page);
  const text = await download(page, 'text', 'resistance-round-1.txt');
  expect(text.filename).toBe('micro-lab-resistance-comparison-A7-B4-round1.txt');
  expect(text.text).toContain('Shared comparison round: 1'); expect(text.text).toContain('Latest shared observed round: 2');
  expect(text.text).toContain('Sensitive cells\t60\t2\t-58'); expect(text.text).toContain('Resistant cells\t8\t6\t-2');
  expect(text.text).toContain('Resistant share\t12%\t75%\t+63 percentage points');
  expect(text.text).toContain('Snapshot A: Evidence 7; saved history ends at round 3');
  expect(text.text).toContain('Snapshot B: Evidence 4; saved history ends at round 2');
  expect(text.text).toContain('3\t40\t8\t48\t17%'); expect(text.text).toContain('2\t0\t4\t4\t100%');
  const csv = await download(page, 'csv', 'resistance-round-1.csv');
  expect(csv.filename).toBe('micro-lab-resistance-comparison-A7-B4-round1.csv'); const parsed = parseCSV(csv.text);
  expect(parsed).toHaveLength(3);
  for (const line of parsed) { expect(line.shared_round).toBe('1'); expect(line.comparison_a_id).toBe('7'); expect(line.comparison_b_id).toBe('4'); }
  expect(parsed[0]).toMatchObject({ row_kind: 'snapshot_a', shared_sensitive_cells: '60', shared_resistant_cells: '8', shared_total_alive: '68',
    shared_resistant_share_pct_rounded: '12', saved_end_round: '3', saved_end_sensitive_cells: '40', saved_end_resistant_cells: '8', saved_end_total_alive: '48' });
  expect(parsed[1]).toMatchObject({ row_kind: 'snapshot_b', shared_sensitive_cells: '2', shared_resistant_cells: '6', shared_total_alive: '8',
    shared_resistant_share_pct_rounded: '75', saved_end_round: '2', saved_end_sensitive_cells: '0', saved_end_resistant_cells: '4', saved_end_total_alive: '4',
    written_evidence: "'=SUM(A1:A2) is literal imported evidence." });
  expect(parsed[2]).toMatchObject({ row_kind: 'difference_b_minus_a', shared_sensitive_cells: '-58', shared_resistant_cells: '-2',
    shared_total_alive: '-60', shared_share_difference_percentage_points: '63', saved_end_round: '' });
  expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
});

test('restores an explicit round after JSON reload and resets it when either snapshot changes', async ({ page }) => {
  await mount(page); await choose(page); await round(page).selectOption('1'); const saved = await reload(page);
  await expect(round(page)).toHaveValue('1'); await expect(page.locator('#micro-resistance-comparison-table caption')).toContainText('round 1');
  await page.getByLabel('Snapshot B', { exact: true }).selectOption('9');
  await expect(round(page)).toHaveValue(''); expect(await state(page)).toEqual(withPair(saved, 7, 9, null));
  await expect(round(page).locator('option')).toHaveCount(3);
  await round(page).selectOption('0'); const selected = await state(page);
  await page.getByLabel('Snapshot A', { exact: true }).selectOption('4');
  await expect(round(page)).toHaveValue(''); expect(await state(page)).toEqual(withPair(selected, 4, 9, null));
  const latest = page.locator('#micro-resistance-comparison-latest'); await expect(latest).toBeDisabled();
  await round(page).selectOption('0'); await expect(latest).toBeEnabled(); await latest.focus(); await latest.press('Enter');
  await expect(round(page)).toHaveValue(''); await expect(latest).toBeFocused();
  await expect(page.locator('#micro-resistance-comparison-table caption')).toContainText('round 1');
  const data = await reload(page); expect(data.microbiology.resistanceComparison).toMatchObject({ aId: 4, bId: 9, round: null });
  writeFileSync(path.join(out, 'resistance-round-restored-state.json'), JSON.stringify(data, null, 2) + '\n');
  await harness.unmount(page);
  const imported = seed(); imported.resistanceComparison = { ...imported.resistanceComparison, aId: 7, bId: 4, round: 99 };
  await mount(page, imported); const importedBefore = await state(page);
  await expect(round(page)).toHaveValue(''); await expect(page.locator('#micro-resistance-comparison-table caption')).toHaveText('Saved counts at shared round 2');
  expect(importedBefore.microbiology.resistanceComparison.round).toBe(99); expect(await state(page)).toEqual(importedBefore);
});

test('keeps extinction undefined only at the observed extinct round and disables inspection for missing or identical snapshots', async ({ page }) => {
  await mount(page); await choose(page, '7', '9');
  await counts(page, { resistant: ['8', '0', '-8'], totalAlive: ['68', '0', '-68'], sharePct: ['12%', 'Undefined', 'Undefined'] });
  await round(page).selectOption('0');
  await counts(page, { totalAlive: ['80', '80', '0'], sharePct: ['10%', '0%', '-10 percentage points'] });
  await page.getByLabel('Snapshot B', { exact: true }).selectOption('7');
  await expect(page.locator('#micro-resistance-comparison-table')).toHaveCount(0); await expect(round(page)).toHaveCount(0);
  await expect(page.locator('#micro-resistance-comparison-download-text')).toBeDisabled();
  await page.getByLabel('Snapshot B', { exact: true }).selectOption(''); await expect(round(page)).toHaveCount(0);
  await page.getByLabel('Snapshot B', { exact: true }).selectOption('9'); await round(page).selectOption('0');
  const before = await state(page); await open(page.locator('.micro-resistance-saved'));
  await page.locator('#micro-resistance-evidence-9').click(); await page.getByRole('button', { name: 'Remove selected evidence', exact: true }).click();
  await expect(page.getByLabel('Snapshot B', { exact: true })).toHaveValue('');
  await expect(round(page)).toHaveCount(0); await expect(page.locator('#micro-resistance-comparison-table')).toHaveCount(0);
  expect((await state(page)).microbiology.resistanceInvestigation).toEqual(before.microbiology.resistanceInvestigation);
  await reload(page); await expect(round(page)).toHaveCount(0);
  expect(await counters(page)).toEqual({ xp: [], random: 0 });
});

test('explicitly selecting a repaired identifier preserves every raw imported snapshot, long note, recovery and comparison preference', async ({ page }) => {
  const data = seed(); data.resistanceNotebook.records = [record('broken', snapshotA), record(1, snapshotB), null,
    { id: 88, evidence: 'Malformed imported evidence stays raw.', metadata: { literal } }, record(9, extinct)];
  data.resistanceComparison = { ...data.resistanceComparison, aId: null, bId: 1, round: 0 };
  await mount(page, data); const before = await state(page);
  await expect(page.getByLabel('Snapshot A', { exact: true }).locator('option[value="2"]')).toHaveCount(1);
  await page.getByLabel('Snapshot A', { exact: true }).selectOption('2');
  const expected = withPair(before, 2, 1, null); expected.microbiology.resistanceNotebook.records[0].id = 2;
  expect(await state(page)).toEqual(expected);
  expect((await state(page)).microbiology.resistanceNotebook.records[0].reviewNote).toBe(longNote);
  expect((await state(page)).microbiology.resistanceNotebook.records[1].reviewNote).toBe(longNote);
  await round(page).selectOption('0'); await counts(page, { resistant: ['8', '8', '0'], totalAlive: ['80', '80', '0'] });
  const saved = await reload(page); expect(saved.microbiology.resistanceNotebook).toEqual(expected.microbiology.resistanceNotebook);
  expect(saved.microbiology.resistanceComparison).toEqual({ ...expected.microbiology.resistanceComparison, round: 0 });
  expect(await page.evaluate(() => Boolean((window as any).__roundInjected))).toBe(false);
  await expect(page.locator('[data-microbiology-tool] img[src="x"]')).toHaveCount(0);
});

test('round selection retains concurrent unrelated edits and rejects replacement imports, newer pairs and another active tab', async ({ page }) => {
  for (const mode of ['unrelated', 'import', 'pair', 'tab'] as const) {
    await mount(page); await choose(page);
    await page.evaluate(mode => {
      const w = window as any, original = w.__ctx.setToolData;
      w.__roundBaseSetter = original; w.__roundRaceConsumed = false;
      const intercept = (update: any) => {
        if (typeof update === 'function' && !w.__roundRaceConsumed) {
          w.__roundRaceConsumed = true;
          original((previous: any) => {
            const micro = previous.microbiology;
            let next: any;
            if (mode === 'import') { next = JSON.parse(JSON.stringify(previous)); next.microbiology.metadata.imported = true; }
            else next = { ...previous, unrelatedTool: { ...previous.unrelatedTool, concurrent: true }, microbiology: { ...micro,
              resistanceNotebook: { ...micro.resistanceNotebook, concurrentNotebookMetadata: ['Keep the newest metadata.'] },
              resistanceComparison: { ...micro.resistanceComparison, concurrentPreference: true },
              ...(mode === 'pair' ? { resistanceComparison: { ...micro.resistanceComparison, bId: 9, round: null, concurrentPreference: true } } : {}),
              ...(mode === 'tab' ? { tab: 'quiz' } : {}) } };
            w.__roundRaceExpected = JSON.parse(JSON.stringify(next));
            if (mode === 'unrelated') w.__roundRaceExpected.microbiology.resistanceComparison.round = 0;
            return next;
          });
        }
        original(update);
      };
      w.__ctx.setToolData = intercept; w.__ctx.setLabToolData = intercept; w.__rerender();
    }, mode);
    await round(page).selectOption('0');
    expect(await page.evaluate(() => (window as any).__roundRaceConsumed)).toBe(true);
    expect(await state(page)).toEqual(await page.evaluate(() => (window as any).__roundRaceExpected));
    expect(await counters(page)).toEqual({ xp: [], random: 0 });
    await page.evaluate(() => { const w = window as any; w.__ctx.setToolData = w.__roundBaseSetter; w.__ctx.setLabToolData = w.__roundBaseSetter; w.__rerender(); });
    await harness.unmount(page);
  }
});

test('a failed download retains the chosen round and retries with that same observed evidence', async ({ page }) => {
  await mount(page); await choose(page); await round(page).selectOption('1'); const before = await state(page);
  await page.evaluate(() => { (window as any).__roundObjectURL = URL.createObjectURL; URL.createObjectURL = () => { throw new Error('Simulated comparison download failure'); }; });
  const button = page.locator('#micro-resistance-comparison-download-text'); await button.focus(); await button.press('Enter');
  await expect(page.locator('#micro-resistance-comparison-export-status')).toContainText('could not download');
  await expect(button).toBeFocused(); await expect(round(page)).toHaveValue('1'); expect(await state(page)).toEqual(before);
  await page.evaluate(() => { URL.createObjectURL = (window as any).__roundObjectURL; delete (window as any).__roundObjectURL; });
  const file = await download(page, 'text', 'resistance-round-retry.txt');
  expect(file.filename).toBe('micro-lab-resistance-comparison-A7-B4-round1.txt'); expect(file.text).toContain('Shared comparison round: 1');
  await expect(page.locator('#micro-resistance-comparison-export-status')).toContainText('download has started');
  expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 });
});

test('earlier-round inspection works by keyboard at 320 pixels and 400 percent zoom without clipped controls or counts', async ({ page }) => {
  await mount(page); await choose(page); await page.setViewportSize({ width: 320, height: 844 });
  const before = await state(page); await round(page).focus(); await round(page).press('Home'); await round(page).press('ArrowDown');
  await expect(round(page)).toHaveValue('0'); await expect(round(page)).toBeFocused();
  expect(await state(page)).toEqual(withPair(before, 7, 4, 0));
  await round(page).press('ArrowDown'); await expect(round(page)).toHaveValue('1');
  await noOverflow(page); await panel(page).screenshot({ path: path.join(out, 'resistance-round-phone.png') });
  const latest = page.locator('#micro-resistance-comparison-latest'); await latest.focus(); await latest.press('Enter');
  await expect(round(page)).toHaveValue(''); await expect(latest).toBeFocused();
  expect(await state(page)).toEqual(withPair(before, 7, 4, null));
  await page.setViewportSize({ width: 1280, height: 960 }); await page.evaluate(() => { document.body.style.zoom = '4'; });
  await round(page).focus(); await round(page).press('Home'); await round(page).press('ArrowDown');
  await expect(round(page)).toHaveValue('0'); await expect(round(page)).toBeFocused(); await noOverflow(page);
  await expect(page.locator('#micro-resistance-comparison-table caption')).toHaveText('Saved counts at shared round 0');
  await panel(page).screenshot({ path: path.join(out, 'resistance-round-400-percent.png') });
  expect(await counters(page)).toEqual({ xp: [], random: 0 });
});
