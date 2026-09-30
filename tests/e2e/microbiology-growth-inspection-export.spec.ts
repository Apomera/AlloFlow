import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 90000 });
test.use({ video: 'off' });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-portable-evidence-2026-09-29');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
const layoutStyle = '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}';
const control = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
const conditions = { ...control, tempC: 35 };
const originalNotes = 'Earlier counts differ, "even when endpoints look similar."\nThese are model values.';

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });
const state = (page: Page) => page.evaluate(() => (window as any).__toolData.microbiology);

async function mount(page: Page, extra: Record<string, unknown> = {}) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { microbiology: {
    tab: 'growthLab', growthLab: { ...control, oxygen: 0 },
    growthInvestigation: {
      trials: [
        { id: 3, control, conditions, prediction: 'similar', hypothesis: '=1+1', explanation: originalNotes },
        { id: 9, conditions: control, prediction: 'lower', explanation: 'Recovered without a control snapshot.' },
      ],
      selectedId: 3, nextId: 12, control: { profile: 'thermus', tempC: 70, pH: 7.5, oxygen: 100 }, prediction: 'higher', hypothesis: 'Next run draft',
    }, ...extra,
  } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: layoutStyle });
  const summary = page.locator('.micro-growth-review summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.micro-growth-review')).toHaveAttribute('open', '');
}

function readQuotedCSV(csv: string): Record<string, string>[] {
  const records: string[][] = [];
  let row: string[] = [];
  const cells = [...csv.matchAll(/"((?:[^"]|"")*)"(,|\r\n|$)/g)];
  expect(cells.map(cell => cell[0]).join('')).toBe(csv);
  for (const cell of cells) {
    row.push(cell[1].replace(/""/g, '"'));
    if (cell[2] !== ',') { records.push(row); row = []; }
  }
  const [headings, ...data] = records;
  return data.map(values => {
    expect(values).toHaveLength(headings.length);
    return Object.fromEntries(headings.map((heading, index) => [heading, values[index]]));
  });
}

test('downloads the restored hour comparison with original controls, notes, and final prediction outcomes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await page.getByLabel('Inspect model hour', { exact: true }).selectOption('6');
  const savedJSON = await page.evaluate(() => JSON.stringify((window as any).__toolData.microbiology));
  writeFileSync(path.join(out, 'growth-inspection-export-state.json'), savedJSON, 'utf8');
  await page.reload();
  await page.waitForFunction(() => typeof (window as any).__mount === 'function');
  await page.evaluate(json => (window as any).__mount({ microbiology: JSON.parse(json) }), savedJSON);
  await page.addStyleTag({ content: layoutStyle });
  const review = page.locator('.micro-growth-review');
  await review.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Inspect model hour', { exact: true })).toHaveValue('6');
  const before = await state(page);
  const feedback = await page.locator('.micro-growth-result-head').textContent();
  const downloadButton = review.getByRole('button', { name: 'Download comparison at hour 6', exact: true });
  await expect(downloadButton).toHaveAttribute('aria-describedby', 'gl-review-export-note');
  await expect(page.locator('#gl-review-export-note')).toContainText('every saved trial at this hour');
  const downloadEvent = page.waitForEvent('download');
  await downloadButton.focus();
  await page.keyboard.press('Enter');
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('micro-lab-comparison-hour-6.csv');
  const file = path.join(out, 'micro-lab-comparison-hour-6.csv');
  await download.saveAs(file);
  const rows = readQuotedCSV(readFileSync(file, 'utf8'));
  expect(rows.map(row => row.trial_id)).toEqual(['3', '9']);
  expect(rows[0]).toMatchObject({ inspection_hour: '6', control_profile: 'ecoli', control_temperature_C: '37', trial_temperature_C: '35',
    original_prediction: 'similar', outcome_at_24h: 'similar', hypothesis: "'=1+1", explanation: originalNotes, population_units: 'arbitrary population units' });
  const visibleRow = review.locator('[data-review-trial="3"]');
  expect(Number(rows[0].control_population_at_inspection_hour).toFixed(1)).toBe(await visibleRow.locator('td').nth(3).textContent());
  expect(Number(rows[0].trial_population_at_inspection_hour).toFixed(1)).toBe(await visibleRow.locator('td').nth(4).textContent());
  expect(Number(rows[0].difference_at_inspection_hour)).toBeLessThan(-2);
  expect(Number(rows[0].difference_at_inspection_hour).toFixed(1)).toBe(await visibleRow.locator('td').nth(5).textContent());
  expect(rows[0].model_note).toContain('not measurements');
  expect(rows[0].model_note).toContain('Prediction outcomes refer to hour 24');
  expect(rows[1]).toMatchObject({ inspection_hour: '6', control_profile: '', control_population_at_inspection_hour: '', difference_at_inspection_hour: '', outcome_at_24h: '', original_prediction: 'lower' });
  expect(Number(rows[1].trial_population_at_inspection_hour)).toBeGreaterThan(5);
  expect(await state(page)).toEqual(before);
  expect(await page.locator('.micro-growth-result-head').textContent()).toBe(feedback);
  await expect(page.locator('#gl-hypothesis')).toHaveValue('Next run draft');
  await expect(downloadButton).toBeFocused();

  const originalEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download trial CSV', exact: true }).click();
  const originalDownload = await originalEvent;
  expect(originalDownload.suggestedFilename()).toBe('micro-lab-trials.csv');
  const originalFile = path.join(out, 'micro-lab-trials-hour-24.csv');
  await originalDownload.saveAs(originalFile);
  const originalRows = readQuotedCSV(readFileSync(originalFile, 'utf8'));
  expect(Number(originalRows[0].control_population_at_24h)).toBeGreaterThan(99);
  expect(originalRows[0].modeled_outcome).toBe('similar');
  expect(originalRows[0]).not.toHaveProperty('inspection_hour');
  await review.screenshot({ path: path.join(out, 'growth-inspection-export-desktop.png') });
  await page.setViewportSize({ width: 320, height: 800 });
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await downloadButton.focus();
  const bounds = await downloadButton.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.height).toBeGreaterThanOrEqual(42);
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
  await review.screenshot({ path: path.join(out, 'growth-inspection-export-phone.png') });
  expect(await state(page)).toEqual(before);
  expect(errors).toEqual([]);
});

test('reports an unavailable comparison download without losing the normalized hour or evidence, then allows a retry', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mount(page, { growthReviewHour: '6' });
  await expect(page.getByLabel('Inspect model hour', { exact: true })).toHaveValue('24');
  const downloadButton = page.getByRole('button', { name: 'Download comparison at hour 24', exact: true });
  const before = await state(page);
  await page.evaluate(() => {
    (window as any).__originalInspectionObjectURL = URL.createObjectURL;
    URL.createObjectURL = () => { throw new Error('Object URLs unavailable for this check'); };
  });
  await downloadButton.click();
  await expect.poll(async () => page.evaluate(() => (window as any).__events.toasts.at(-1))).toEqual({
    message: 'The comparison could not download. Your saved trials and selected hour are unchanged.', kind: 'error',
  });
  expect(await state(page)).toEqual(before);
  await expect(page.locator('a[download="micro-lab-comparison-hour-24.csv"]')).toHaveCount(0);
  await page.evaluate(() => { URL.createObjectURL = (window as any).__originalInspectionObjectURL; delete (window as any).__originalInspectionObjectURL; });
  const retryEvent = page.waitForEvent('download');
  await downloadButton.click();
  const retry = await retryEvent;
  expect(retry.suggestedFilename()).toBe('micro-lab-comparison-hour-24.csv');
  const file = path.join(out, 'micro-lab-comparison-hour-24-retry.csv');
  await retry.saveAs(file);
  expect(readQuotedCSV(readFileSync(file, 'utf8')).every(row => row.inspection_hour === '24')).toBe(true);
  expect(await state(page)).toEqual(before);
  expect(errors).toEqual([]);
});
