import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 90000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-evidence-review-2026-09-30');
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

const context = { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 };

test('microscope draft review explains numbers and saved-view blockers without grading or resuming', async ({ page }) => {
  await mount(page, { tab: 'microscope', scopeOrganism: 'phage', selectedScope: 'em', magnification: 10000, microscopeFocus: 15,
    microscopeMeasurements: {
      ecoli: { draft: { value: '3000', unit: 'nm', context } },
      strep: { draft: { value: '0.8', unit: 'um', context: { ...context, specimen: 'strep', zoom: 1, fieldUm: 180, scaleUm: 20, referenceUm: 1 } } },
      parame: { draft: { value: '250', unit: 'um', context: { ...context, specimen: 'parame', zoom: 1, fieldUm: 180, scaleUm: 20, referenceUm: 250 } } },
      phage: { draft: { value: 'invalid', unit: 'um', context: { ...context, specimen: 'phage', zoom: 1, fieldUm: 180, scaleUm: 20, referenceUm: 0.2 } } }
    } });
  const before = await state(page); await page.getByRole('button', { name: /^Open measurement notebook/ }).click();
  const review = page.locator('[data-measurement-draft-review="ecoli"]');
  await expect(review.locator('[data-draft-number-status="valid"]')).toContainText('3 µm');
  await expect(review.locator('[data-draft-view-status="suitable"]')).toContainText('Verify live focus');
  await expect(review.locator('[data-draft-focus-status="unknown"]')).toContainText('does not check the estimate');
  for (const [id, status] of [['strep', 'too_small'], ['parame', 'cropped'], ['phage', 'unresolved']])
    await expect(page.locator('[data-measurement-draft-review="' + id + '"] [data-draft-view-status="' + status + '"]')).toBeVisible();
  await expect(page.locator('[data-measurement-draft-review="phage"] [data-draft-number-status="invalid"]')).toBeVisible();
  const shape = await page.evaluate(() => (window as any).__MicrobiologyCore.measurements.draftReview('ecoli', (window as any).__toolData.microbiology.microscopeMeasurements.ecoli));
  expect(shape.estimateUm).toBe(3); expect(shape.focusStatus).toBe('unknown');
  expect(shape.referenceUm).toBeUndefined(); expect(shape.view.referenceUm).toBeUndefined(); expect(await state(page)).toEqual(before);
  await phone(page); await page.locator('#micro-measurement-notebook-ecoli').screenshot({ path: path.join(out, 'microscope-draft-review-phone.png') });
  await reload(page); await page.getByRole('button', { name: /^Open measurement notebook/ }).click();
  await expect(review.locator('[data-draft-number-status="valid"]')).toContainText('3 µm');
});

test('previous microscope view replay preserves evidence and observation progress across tabs and reload', async ({ page }) => {
  const entry = { result: { value: 2, unit: 'um', context }, previousResult: { value: 4, unit: 'um', context: { ...context, mag: 400, zoom: 50 } }, draft: { value: '3000', unit: 'nm', context } };
  await mount(page, { tab: 'microscope', scopeOrganism: 'phage', selectedScope: 'em', magnification: 10000, microscopeFocus: 15,
    microscopeSeenSlides: [], microscopeMeasurements: { ecoli: entry } });
  await page.getByRole('button', { name: /^Open measurement notebook/ }).click(); await open(page.locator('[data-measurement-history="ecoli"]'));
  await page.locator('#micro-measurement-review-previous-ecoli').press('Enter');
  await expect(page.getByLabel('Your size estimate', { exact: true })).toBeFocused();
  let saved = await state(page); expect(saved.microscopeMeasurements.ecoli).toEqual(entry); expect(saved.microscopeSeenSlides).toEqual([]);
  expect(saved.magnification).toBe(400); expect(saved.microscopeZoom).toBe(50); await expect(page.locator('#micro-measurement-evidence-view')).toBeVisible();
  await phone(page); await page.locator('#micro-measurement-evidence-view').screenshot({ path: path.join(out, 'microscope-previous-view-phone.png') });
  await page.locator('#micro-tab-home').press('Enter'); await page.locator('#micro-tab-microscope').press('Enter');
  expect((await state(page)).microscopeSeenSlides).toEqual([]); await expect(page.locator('#micro-measurement-evidence-view')).toBeVisible();
  await reload(page); expect((await state(page)).microscopeSeenSlides).toEqual([]); expect((await state(page)).microscopeMeasurements.ecoli).toEqual(entry);
  await page.locator('#micro-measurement-resume-observation').press('Enter');
  await expect.poll(async () => (await state(page)).microscopeSeenSlides).toEqual(['ecoli']);
  saved = await state(page); expect(saved.microscopeMeasurements.ecoli).toEqual(entry); await expect(page.locator('#micro-measurement-evidence-view')).toHaveCount(0);
});

test('Growth previews and swaps a complete previous sweep and exports both versions without changing drafts', async ({ page }) => {
  const current = { variable: 'oxygen', conditions: { profile: 'thermus', tempC: 70, pH: 7.5, oxygen: 100 } };
  const previous = { variable: 'pH', conditions: { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 } };
  await mount(page, { tab: 'growthLab', growthLab: { profile: 'ecoli', tempC: 18, pH: 6.5, oxygen: 35 }, growthReviewHour: 6,
    growthInvestigation: { control: {}, prediction: 'lower', hypothesis: 'My independent next-run reasoning.', selectedId: 7, nextId: 8,
      trials: [{ id: 7, conditions: {}, control: {}, prediction: 'higher', hypothesis: 'Original reasoning.', explanation: 'Saved explanation.' }], sweep: current, previousSweep: previous } });
  await open(page.locator('.micro-growth-sweep')); const history = page.locator('#gl-previous-sweep'); await open(history);
  const preview = page.locator('[data-micro-growth-previous-sweep]');
  await expect(preview.getByRole('table')).toHaveAccessibleName(/Previous sweep/); await expect(preview.getByRole('img')).toHaveAccessibleName(/Previous sweep/);
  const rows = await page.evaluate(() => (window as any).__MicrobiologyCore.growth.sweep((window as any).__toolData.microbiology.growthInvestigation.previousSweep.conditions, 'pH').points.length);
  await expect(preview.locator('tbody tr')).toHaveCount(rows); const before = await state(page);
  await phone(page); await history.screenshot({ path: path.join(out, 'growth-previous-sweep-phone.png') });
  await page.locator('#gl-restore-previous-sweep').press('Enter'); await expect(page.locator('#gl-current-sweep-heading')).toBeFocused();
  let saved = await state(page); expect(saved.growthInvestigation.sweep).toEqual(previous); expect(saved.growthInvestigation.previousSweep).toEqual(current);
  expect(saved.growthLab).toEqual(before.growthLab); expect(saved.growthReviewHour).toBe(6);
  const unchanged = (value: any) => { const copy = { ...value }; delete copy.sweep; delete copy.previousSweep; return copy; };
  const canonicalBefore = await page.evaluate(data => (window as any).__MicrobiologyCore.growth.normalizeNotebook(data), before.growthInvestigation);
  expect(unchanged(saved.growthInvestigation)).toEqual(unchanged(canonicalBefore)); await expect(page.locator('#gl-sweep-history-status')).toContainText(/restored/i);
  const text = await download(page, page.getByRole('button', { name: 'Download notebook', exact: true }), 'growth-current-and-previous-sweeps.txt');
  expect(text).toContain('Current sweep'); expect(text).toContain('Previous sweep'); expect(text).toContain('Original reasoning.');
  expect(text).toContain('Variable to sweep: pH'); expect(text).toContain('Variable to sweep: Oxygen availability');
  await reload(page); await open(page.locator('.micro-growth-sweep')); await open(history); await page.locator('#gl-restore-previous-sweep').press('Enter');
  saved = await state(page); expect(saved.growthInvestigation.sweep).toEqual(current); expect(saved.growthInvestigation.previousSweep).toEqual(previous);
});

test('equivalent Growth reruns retain meaningful history when only the swept starting value changes', async ({ page }) => {
  const current = { variable: 'oxygen', conditions: { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 } };
  const previous = { variable: 'pH', conditions: { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 50 } };
  await mount(page, { tab: 'growthLab', growthLab: { ...current.conditions, oxygen: 25 }, growthInvestigation: { sweep: current, previousSweep: previous, sweepVariable: 'oxygen' } });
  const details = page.locator('.micro-growth-sweep'); await open(details);
  await details.getByRole('button', { name: 'Run variable sweep', exact: true }).press('Enter');
  const saved = await state(page); expect(saved.growthInvestigation.sweep).toEqual(current); expect(saved.growthInvestigation.previousSweep).toEqual(previous);
});

test('Mystery download failures retry with local feedback while preserving saved and working evidence', async ({ page }) => {
  const report = { claim: 'bacterium', evidence: ['structure', 'behavior'], reasoning: 'Original recorded explanation.', limitation: 'bounded' };
  await mount(page, { tab: 'mystery', mysteryLab: { active: 'wall', notice: 'download_failed', cases: { wall: { ...report, reasoning: 'Unfinished working notes.', revealed: ['context', 'structure', 'behavior'], record: report } } } });
  const before = await state(page), button = page.locator('#micro-mystery-download'), status = page.locator('#micro-mystery-download-status');
  await expect(status).toHaveText('');
  await page.evaluate(() => { (window as any).__originalObjectURL = URL.createObjectURL; URL.createObjectURL = () => { throw new Error('Simulated download failure'); }; });
  await button.press('Enter'); await expect(status).toContainText('could not'); await expect(button).toBeFocused(); expect(await state(page)).toEqual(before);
  await page.evaluate(() => { URL.createObjectURL = (window as any).__originalObjectURL; delete (window as any).__originalObjectURL; });
  const text = await download(page, button, 'mystery-retry-evidence.txt'); expect(text).toContain(report.reasoning); expect(text).toContain('Unfinished working notes.');
  await expect(status).toContainText('download has started'); expect(await state(page)).toEqual(before);
  await phone(page); await button.locator('..').screenshot({ path: path.join(out, 'mystery-download-retry-phone.png') });
  const reason = page.locator('#micro-mystery-reasoning'); await reason.fill('Temporary edit.'); await expect(status).toHaveText('');
  await reason.fill('Unfinished working notes.'); await expect(status).toHaveText(''); await reload(page); await expect(status).toHaveText('');
});

test('Home queued focus respects a newer focus-only action inside the opened activity', async ({ page }) => {
  const evidence = { dose: 30, duration: 3, initRes: 10, history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] };
  await mount(page, { tab: 'home', resistanceNotebook: { records: [{ id: 7, evidence }], selectedId: 7 } });
  await page.evaluate(() => {
    const original = window.setTimeout; (window as any).__microOriginalTimeout = original; (window as any).__microPendingFocus = [];
    window.setTimeout = ((callback: (...args: any[]) => void, delay?: number, ...args: any[]) => {
      if (delay === 0) { (window as any).__microPendingFocus.push(() => callback(...args)); return 0; }
      return original(callback, delay, ...args);
    }) as typeof window.setTimeout;
  });
  await page.locator('[data-work-next="resistance"]').click(); const notes = page.locator('#micro-resistance-notes'); await notes.focus(); const before = await state(page);
  await page.evaluate(() => { window.setTimeout = (window as any).__microOriginalTimeout; for (const callback of (window as any).__microPendingFocus) callback(); delete (window as any).__microPendingFocus; delete (window as any).__microOriginalTimeout; });
  await expect(notes).toBeFocused(); expect(await state(page)).toEqual(before);
});
