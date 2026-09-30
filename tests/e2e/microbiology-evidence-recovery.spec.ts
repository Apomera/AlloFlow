import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 90000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-evidence-recovery-2026-09-29');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const style = '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}';
let errors: string[];
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
const state = (page: Page) => page.evaluate(() => (window as any).__toolData.microbiology);
async function mount(page: Page, seed: Record<string, unknown>) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { microbiology: seed }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: style });
}
async function phone(page: Page, width = 390) {
  await page.setViewportSize({ width, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function reload(page: Page) {
  const saved = await state(page); await harness.unmount(page);
  await page.evaluate(data => (window as any).__mount({ microbiology: data }), saved); return saved;
}
async function open(page: Page, selector: string) {
  const details = page.locator(selector), summary = details.locator(':scope > summary');
  if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) { await summary.focus(); await page.keyboard.press('Enter'); }
  await expect(details).toHaveAttribute('open', ''); return details;
}
const snapshotA = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: 'A: cite counts as well as share.',
  history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 64, resistant: 8 }, { day: 2, sensitive: 60, resistant: 8 }] };
const snapshotB = { dose: 60, duration: 8, initRes: 10, prediction: 'increase', notes: 'B: a higher share with fewer resistant cells.',
  history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 2, resistant: 6 }] };
const extinct = { dose: 100, duration: 3, initRes: 0, prediction: 'extinct', explanation: 'extinction', explanationSubmitted: true, notes: 'No survivors.',
  history: [{ day: 0, sensitive: 80, resistant: 0 }, { day: 1, sensitive: 0, resistant: 0 }] };
async function resistance(page: Page) {
  await mount(page, { tab: 'resistance', resistanceInvestigation: snapshotA, resistanceNotebook: {
    records: [{ id: 7, evidence: snapshotA }, { id: 4, evidence: snapshotB }, { id: 9, evidence: extinct }], selectedId: 7, nextId: 12
  } });
}

test('compares saved resistance counts at a shared round without changing the live culture', async ({ page }) => {
  await resistance(page); const before = await state(page);
  const comparison = await open(page, '.micro-resistance-comparison');
  await expect(page.locator('#micro-resistance-compare-a')).toHaveValue(''); await expect(page.locator('#micro-resistance-compare-b')).toHaveValue('');
  await page.getByLabel('Snapshot A', { exact: true }).selectOption('7'); await page.getByLabel('Snapshot B', { exact: true }).selectOption('4');
  await expect(page.locator('#micro-resistance-comparison-round')).toContainText('1');
  const row = (name: string) => page.locator(`[data-resistance-compare-row="${name}"]`);
  await expect(row('resistant').locator('td').nth(0)).toHaveText('8'); await expect(row('resistant').locator('td').nth(1)).toHaveText('6');
  await expect(row('totalAlive').locator('td').nth(0)).toHaveText('72'); await expect(row('totalAlive').locator('td').nth(1)).toHaveText('8');
  await expect(row('sharePct').locator('td').nth(0)).toContainText('11'); await expect(row('sharePct').locator('td').nth(1)).toContainText('75');
  await expect(row('resistant').locator('td').nth(2)).toHaveText('-2'); await expect(row('sharePct').locator('td').nth(2)).toHaveText('+64 percentage points');
  const after = await state(page); expect(after.resistanceInvestigation).toEqual(before.resistanceInvestigation); expect(after.resistanceNotebook).toEqual(before.resistanceNotebook);
  await comparison.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'resistance-comparison-desktop.png') });
  await phone(page, 320); await comparison.scrollIntoViewIfNeeded();
  expect(await page.locator('#micro-resistance-comparison-table').evaluate(table => table.scrollWidth <= table.clientWidth + 1)).toBe(true);
  await comparison.screenshot({ path: path.join(out, 'resistance-comparison-phone.png') });
  await reload(page); await open(page, '.micro-resistance-comparison');
  await expect(page.locator('#micro-resistance-compare-a')).toHaveValue('7'); await expect(page.locator('#micro-resistance-compare-b')).toHaveValue('4');
  expect((await state(page)).resistanceInvestigation).toEqual(before.resistanceInvestigation);
});

test('keeps extinct resistance shares undefined and requires reselection when an evidence ID is removed', async ({ page }) => {
  await resistance(page); const before = (await state(page)).resistanceInvestigation;
  await open(page, '.micro-resistance-comparison');
  await page.getByLabel('Snapshot A', { exact: true }).selectOption('7'); await page.getByLabel('Snapshot B', { exact: true }).selectOption('9');
  const share = page.locator('[data-resistance-compare-row="sharePct"]');
  await expect(share.locator('td').nth(1)).toContainText('Undefined'); await expect(share.locator('td').nth(2)).toContainText('Undefined');
  await page.getByLabel('Snapshot B', { exact: true }).selectOption('7'); await expect(page.locator('#micro-resistance-comparison-table')).toHaveCount(0);
  await page.getByLabel('Snapshot B', { exact: true }).selectOption('9');
  await open(page, '.micro-resistance-saved'); await page.locator('#micro-resistance-evidence-9').click();
  await page.getByRole('button', { name: 'Remove selected evidence', exact: true }).click();
  await expect(page.locator('#micro-resistance-compare-a')).toHaveValue('7'); await expect(page.locator('#micro-resistance-compare-b')).toHaveValue('');
  await expect(page.locator('#micro-resistance-comparison-table')).toHaveCount(0); await expect(page.locator('#micro-resistance-comparison-unavailable')).toBeVisible();
  expect((await state(page)).resistanceInvestigation).toEqual(before);
  await reload(page); await open(page, '.micro-resistance-comparison'); await expect(page.locator('#micro-resistance-compare-b')).toHaveValue('');
});

test('keeps a valid saved resistance comparison attached to its original snapshot when another ID is damaged', async ({ page }) => {
  await mount(page, { tab: 'resistance', resistanceInvestigation: snapshotA, resistanceNotebook: {
    records: [{ id: 'bad', evidence: snapshotA }, { id: 1, evidence: snapshotB }, { id: 9, evidence: extinct }], selectedId: 1, nextId: 12
  }, resistanceComparison: { aId: 1, bId: 9 } });
  const before = (await state(page)).resistanceInvestigation;
  await open(page, '.micro-resistance-comparison');
  await expect(page.locator('#micro-resistance-compare-a')).toHaveValue('1');
  await expect(page.locator('#micro-resistance-compare-b')).toHaveValue('9');
  await expect(page.locator('[data-resistance-compare-row="resistant"] td').nth(0)).toHaveText('6');
  await expect(page.locator('[data-resistance-compare-row="totalAlive"] td').nth(0)).toHaveText('8');
  await reload(page); await open(page, '.micro-resistance-comparison');
  await expect(page.locator('[data-resistance-compare-row="resistant"] td').nth(0)).toHaveText('6');
  expect((await state(page)).resistanceInvestigation).toEqual(before);
});

test('previews and swaps calibrated microscope estimates while keeping the working draft and view', async ({ page }) => {
  await mount(page, { tab: 'microscope' });
  const scope = page.getByRole('region', { name: 'Virtual microscope investigation', exact: true });
  const input = scope.getByLabel('Your size estimate', { exact: true });
  await scope.getByRole('button', { name: 'Use recommended setup', exact: true }).click(); await scope.getByRole('button', { name: 'Focus assist', exact: true }).click();
  await input.fill('4'); await scope.getByRole('button', { name: 'Check and save estimate', exact: true }).click();
  const first = (await state(page)).microscopeMeasurements.ecoli.result;
  await input.fill('2'); await scope.getByRole('button', { name: 'Check and save estimate', exact: true }).click();
  const current = (await state(page)).microscopeMeasurements.ecoli.result;
  expect((await state(page)).microscopeMeasurements.ecoli.previousResult).toEqual(first);
  await scope.getByRole('button', { name: '400×', exact: true }).click(); await scope.getByLabel('3. Enlarge the display to measure', { exact: true }).selectOption('50');
  await scope.getByRole('button', { name: 'Start estimate for this view', exact: true }).click(); await input.fill('3000'); await scope.getByLabel('Estimate units', { exact: true }).selectOption('nm');
  await scope.getByRole('button', { name: 'Open measurement notebook · 1/5', exact: true }).click();
  const history = await open(page, '[data-measurement-history="ecoli"]');
  await expect(history.locator('[data-measurement-version="current"] [data-measurement-field="estimate"]')).toContainText('2 µm');
  await expect(history.locator('[data-measurement-version="previous"] [data-measurement-field="estimate"]')).toContainText('4 µm');
  const before = await state(page); await history.getByRole('button', { name: 'Restore previous estimate · E. coli', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#micro-measurement-history-ecoli-current')).toBeFocused();
  const after = await state(page); expect(after.microscopeMeasurements.ecoli).toEqual({ ...before.microscopeMeasurements.ecoli, result: first, previousResult: current });
  for (const key of ['scopeOrganism', 'selectedScope', 'magnification', 'microscopeZoom', 'microscopeFocus', 'microscopeTargetFocus', 'microscopeSeenSlides']) expect(after[key]).toEqual(before[key]);
  await phone(page); await history.scrollIntoViewIfNeeded(); await history.screenshot({ path: path.join(out, 'microscope-estimate-history-phone.png') });
  const download = page.waitForEvent('download'); await scope.getByRole('button', { name: 'Download measurement notebook', exact: true }).click(); const file = await download;
  const body = readFileSync((await file.path())!, 'utf8'); expect(body).toContain('Current checked estimate'); expect(body).toContain('Previous checked estimate (available to restore)'); expect(body).toContain('4 µm'); expect(body).toContain('2 µm');
  await file.saveAs(path.join(out, 'measurement-history.txt'));
  await reload(page); expect((await state(page)).microscopeMeasurements.ecoli).toEqual(after.microscopeMeasurements.ecoli);
  await scope.getByRole('button', { name: 'Open measurement notebook · 1/5', exact: true }).click(); await open(page, '[data-measurement-history="ecoli"]');
});

const base = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
const trials = [2, 7, 11].map(id => ({ id, control: base, conditions: { ...base, tempC: 30 + id }, prediction: 'lower', hypothesis: `Reasoning before trial ${id}.`, explanation: `Saved explanation ${id}.` }));
const growthBook = { trials, selectedId: 7, nextId: 20, control: base, prediction: 'higher', hypothesis: 'Next run draft', explanation: '', sweepVariable: 'pH', sweep: { variable: 'pH', conditions: base } };
const growthSetup = { ...base, tempC: 18, pH: 6.5, oxygen: 25, hypothesis: 'Earlier notes', explanation: 'Keep these too', log: [] };
async function growth(page: Page) { await mount(page, { tab: 'growthLab', growthInvestigation: growthBook, growthLab: growthSetup, growthReviewHour: 6 }); }

test('recovers a removed Growth trial after reload with its original ID, position, and evidence', async ({ page }) => {
  await growth(page); const before = await state(page);
  await page.getByRole('button', { name: 'Remove selected trial', exact: true }).click();
  expect((await state(page)).growthInvestigation.trials.map((trial: any) => trial.id)).toEqual([2, 11]);
  await expect(page.locator('#gl-removed-trial')).toBeVisible(); await expect(page.locator('#gl-restore-removed')).toBeFocused();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download trial CSV', exact: true }).click(); const file = await download;
  expect(readFileSync((await file.path())!, 'utf8')).not.toContain('Saved explanation 7.'); await file.saveAs(path.join(out, 'growth-after-removal.csv'));
  await phone(page, 320); await page.locator('#gl-removed-trial').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'growth-removal-recovery-phone.png') });
  await reload(page); const restore = page.locator('#gl-restore-removed'); await restore.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#gl-trial-7')).toBeFocused(); const after = await state(page);
  expect(after.growthInvestigation.trials).toEqual(before.growthInvestigation.trials); expect(after.growthInvestigation.selectedId).toBe(7);
  for (const key of ['control', 'prediction', 'hypothesis', 'explanation', 'nextId', 'sweepVariable', 'sweep']) expect(after.growthInvestigation[key]).toEqual(before.growthInvestigation[key]);
  expect(after.growthReviewHour).toBe(6); expect(after.growthLab).toEqual(before.growthLab);
  await expect(page.locator('#gl-removed-trial')).toHaveCount(0);
});

test('a new saved Growth trial completes the removal and keeps the remaining evidence and next ID', async ({ page }) => {
  await growth(page); await page.getByRole('button', { name: 'Remove selected trial', exact: true }).click();
  await expect(page.locator('#gl-removed-trial')).toContainText('saving another trial');
  await page.getByRole('button', { name: 'Run comparison', exact: true }).click();
  const after = await state(page); expect(after.growthInvestigation.trials.map((trial: any) => trial.id)).toEqual([2, 11, 20]);
  expect(after.growthInvestigation.trials.slice(0, 2)).toEqual([trials[0], trials[2]]); expect(after.growthInvestigation.nextId).toBe(21);
  expect(after.growthInvestigation.removed).toBeFalsy(); expect(after.growthLab).toEqual(growthSetup); expect(after.growthReviewHour).toBe(6);
  await expect(page.locator('#gl-removed-trial')).toHaveCount(0);
});
