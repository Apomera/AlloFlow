import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 90000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-notebook-recovery-2026-09-30');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
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
async function phone(page: Page) {
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function open(details: Locator) {
  if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) await details.locator(':scope > summary').press('Enter');
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
const evidence = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: 'Original saved counts and prediction.',
  history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] };
const context = { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 };

test('removed Resistance evidence resumes from Home and restores its identity and reflection without reviving comparison membership', async ({ page }) => {
  await mount(page, { tab: 'resistance', resistanceInvestigation: { ...evidence, dose: 60, notes: 'Independent live culture.' },
    resistanceNotebook: { records: [{ id: 3, evidence }, { id: 7, evidence, reviewNote: 'A later reflection on the original counts.' }], selectedId: 7, nextId: 12 },
    resistanceComparison: { aId: 3, bId: 7 } });
  const live = (await state(page)).resistanceInvestigation;
  await open(page.locator('.micro-resistance-saved'));
  await page.getByRole('button', { name: 'Remove selected evidence', exact: true }).press('Enter');
  await expect(page.locator('#micro-resistance-restore-removed')).toBeFocused();
  const removed = (await state(page)).resistanceNotebook.removed;
  expect(removed.record.id).toBe(7); expect(removed.index).toBe(1); expect(removed.record.reviewNote).toContain('later reflection');
  expect((await state(page)).resistanceComparison).toEqual({ aId: 3, bId: null });
  const exported = csv(await download(page, page.getByRole('button', { name: 'Download resistance CSV', exact: true }), 'resistance-active-after-removal.csv'));
  expect(exported.every(row => row.evidence_id === '3')).toBe(true);
  await page.locator('#micro-tab-home').press('Enter'); await phone(page);
  const panel = page.locator('#micro-content[role="tabpanel"]');
  await expect(panel).toHaveAttribute('aria-labelledby', 'micro-tab-home'); await expect(panel.locator('[data-work-card]')).toHaveCount(6);
  await expect(panel.locator('[data-work-recovery="resistance"]')).toContainText('Removed evidence 7');
  await panel.locator('[data-work-card="resistance"]').screenshot({ path: path.join(out, 'resistance-recovery-home-phone.png') });
  const bookBefore = (await state(page)).resistanceNotebook;
  await page.locator('[data-work-next="resistance"]').press('Enter'); await expect(page.locator('#micro-resistance-restore-removed')).toBeFocused();
  expect((await state(page)).resistanceNotebook).toEqual(bookBefore);
  await open(page.locator('#micro-resistance-removed-evidence details'));
  await page.locator('#micro-resistance-removed-evidence').screenshot({ path: path.join(out, 'resistance-removed-evidence-phone.png') });
  await reload(page); await expect(page.locator('#micro-resistance-removed-evidence')).toBeVisible();
  await page.locator('#micro-resistance-restore-removed').press('Enter'); await expect(page.locator('#micro-resistance-evidence-7')).toBeFocused();
  const saved = await state(page); expect(saved.resistanceNotebook.records.map((row: any) => row.id)).toEqual([3, 7]);
  expect(saved.resistanceNotebook.records[1]).toEqual(removed.record); expect(saved.resistanceNotebook.removed).toBeUndefined();
  expect(saved.resistanceComparison).toEqual({ aId: 3, bId: null }); expect(saved.resistanceInvestigation).toEqual(live);
});

test('removed-only and full imported Resistance notebooks offer explicit recovery without counting or evicting snapshots', async ({ page }) => {
  await mount(page, { tab: 'home', resistanceNotebook: { records: [], removed: { record: { id: 9, evidence, reviewNote: 'Keep this reflection.' }, index: 0 } } });
  await expect(page.locator('[data-work-card="resistance"] strong')).toHaveText('0');
  await page.locator('[data-work-next="resistance"]').press('Enter'); await expect(page.locator('#micro-resistance-restore-removed')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Download resistance CSV', exact: true })).toBeDisabled();
  await page.locator('#micro-resistance-keep-removal').press('Enter'); await expect(page.locator('#micro-resistance-notebook-title')).toBeFocused();
  expect((await state(page)).resistanceNotebook.removed).toBeUndefined();
  await harness.unmount(page);
  const records = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, evidence }));
  await mount(page, { tab: 'home', resistanceNotebook: { records, removed: { record: { id: 9, evidence }, index: 7 } } });
  const before = (await state(page)).resistanceNotebook;
  await page.locator('[data-work-next="resistance"]').press('Enter'); await expect(page.locator('#micro-resistance-removed-evidence')).toBeFocused();
  await expect(page.locator('#micro-resistance-restore-removed')).toBeDisabled(); expect((await state(page)).resistanceNotebook).toEqual(before);
  await expect(page.locator('#micro-resistance-recovery-full')).toContainText('eight saved snapshots');
});

test('microscope CSV separates saved checks and unscored invalid drafts with their original calibration', async ({ page }) => {
  const draft = '=SUM(1,2)\n"unfinished"';
  await mount(page, { tab: 'microscope', scopeOrganism: 'phage', selectedScope: 'em', magnification: 10000, microscopeZoom: 4, microscopeFocus: 15,
    microscopeMeasurements: { ecoli: { result: { value: 2, unit: 'um', context }, previousResult: { value: 4000, unit: 'nm', context }, draft: { value: draft, unit: 'nm', context } },
      strep: { draft: { value: '1.2', unit: 'um', context: { ...context, specimen: 'strep', referenceUm: 1 } } } } });
  await page.getByRole('button', { name: /^Open measurement notebook/ }).click();
  const before = await state(page), button = page.locator('#micro-measurement-download-csv');
  const text = await download(page, button, 'microscope-checks-and-drafts.csv'), rows = csv(text);
  expect(rows.map(row => [row.specimen_id, row.record_kind])).toEqual([['ecoli', 'current_checked'], ['ecoli', 'previous_checked'], ['ecoli', 'pending_draft'], ['strep', 'pending_draft']]);
  expect(rows[1].estimate_um).toBe('4'); expect(rows[1].absolute_error_pct).toBe('100'); expect(rows[1].within_practice_band).toBe('false');
  expect(rows[2].original_value_text).toBe("'" + draft); expect(rows[2].estimate_um).toBe(''); expect(rows[2].value_status).toBe('invalid_numeric');
  for (const row of rows.slice(2)) { expect(row.reference_um).toBe(''); expect(row.absolute_error_pct).toBe(''); expect(row.within_practice_band).toBe(''); }
  expect(rows.every(row => row.viewing_method === 'lightbright' && row.magnification_x === '1000' && row.display_zoom_x === '20')).toBe(true);
  expect(await state(page)).toEqual(before); await expect(page.locator('#micro-measurement-csv-status')).toContainText('download has started');
  await phone(page); await page.locator('#micro-measurement-notebook-ecoli').screenshot({ path: path.join(out, 'microscope-csv-drafts-phone.png') });
  await reload(page); await page.getByRole('button', { name: /^Open measurement notebook/ }).click();
  await expect(page.locator('#micro-measurement-csv-status')).toHaveText('');
  expect(await download(page, button, 'microscope-checks-and-drafts-restored.csv')).toBe(text);
});

test('unchecked-only microscope evidence downloads as unscored CSV and failure remains retryable', async ({ page }) => {
  await mount(page, { tab: 'microscope', microscopeMeasurements: { ecoli: { draft: { value: '2.5', unit: 'um', context } } } });
  await page.getByRole('button', { name: /^Open measurement notebook/ }).click();
  await expect(page.getByRole('button', { name: 'Download measurement notebook', exact: true })).toBeDisabled();
  const button = page.locator('#micro-measurement-download-csv'), before = await state(page);
  await page.evaluate(() => { (window as any).__originalObjectURL = URL.createObjectURL; URL.createObjectURL = () => { throw new Error('Simulated download failure'); }; });
  await button.press('Enter'); await expect(page.locator('#micro-measurement-csv-status')).toContainText('try again'); await expect(button).toBeFocused();
  expect(await state(page)).toEqual(before);
  await page.evaluate(() => { URL.createObjectURL = (window as any).__originalObjectURL; delete (window as any).__originalObjectURL; });
  const rows = csv(await download(page, button, 'microscope-pending-only.csv'));
  expect(rows).toHaveLength(1); expect(rows[0].record_kind).toBe('pending_draft'); expect(rows[0].estimate_um).toBe('2.5'); expect(rows[0].absolute_error_pct).toBe('');
  expect(await state(page)).toEqual(before);
});

test('Mystery history compares saved citation membership and reasoning independently of working notes across restoration and reload', async ({ page }) => {
  const previous = { claim: 'bacterium', evidence: ['structure', 'behavior'], reasoning: 'First recorded explanation.', limitation: 'bounded' };
  const current = { ...previous, evidence: ['size', 'structure'], reasoning: 'Current recorded explanation.' };
  const draft = { ...current, reasoning: 'Independent unfinished working notes.', revealed: ['context', 'size', 'structure', 'behavior'], collapsed: ['behavior'], checked: true, reportView: 'recorded', record: current, previousRecord: previous };
  await mount(page, { tab: 'mystery', mysteryLab: { active: 'wall', cases: { wall: draft } } });
  const before = await state(page), history = page.locator('[data-mystery-history="wall"]'); await open(history);
  const comparison = page.locator('[data-mystery-history-comparison="wall"]');
  await expect(comparison.locator('[data-mystery-history-fields]')).toHaveText('Fields that differ: Cited observations; Written reasoning.');
  await expect(comparison.locator('[data-history-citations="previous"]')).toContainText('Behavior and reproduction');
  await expect(comparison.locator('[data-history-citations="current"]')).toContainText('Size and shape');
  await expect(comparison.locator('[data-mystery-history-change="reasoning"] [data-history-version="previous"]')).toContainText(previous.reasoning);
  await expect(comparison.locator('[data-mystery-history-change="reasoning"] [data-history-version="current"]')).toContainText(current.reasoning);
  await expect(comparison).not.toContainText(draft.reasoning); expect(await state(page)).toEqual(before);
  await phone(page); await history.screenshot({ path: path.join(out, 'mystery-history-comparison-phone.png') });
  await history.getByRole('button', { name: 'Restore previous report', exact: true }).press('Enter'); await expect(page.locator('#micro-mystery-report-heading')).toBeFocused();
  let saved = (await state(page)).mysteryLab.cases.wall;
  expect(saved.record).toEqual(previous); expect(saved.previousRecord).toEqual(current);
  for (const key of ['reasoning', 'collapsed', 'revealed', 'checked', 'reportView']) expect(saved[key]).toEqual(draft[key as keyof typeof draft]);
  await expect(comparison.locator('[data-history-citations="current"]')).toContainText('Behavior and reproduction');
  await reload(page); await open(history); await history.getByRole('button', { name: 'Restore previous report', exact: true }).press('Enter');
  saved = (await state(page)).mysteryLab.cases.wall; expect(saved.record).toEqual(current); expect(saved.previousRecord).toEqual(previous); expect(saved.reasoning).toBe(draft.reasoning);
});
