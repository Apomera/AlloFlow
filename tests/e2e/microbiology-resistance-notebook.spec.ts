import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 90000 });

const out = path.resolve('reports/micro-lab-workspace-evidence-2026-09-28');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_microbiology.js',
  toolId: 'microbiology',
  width: 1280,
  height: 960,
  layout: 'document',
});
const layoutStyle = '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}';
const writtenEvidence = 'After one exposure round, 68 sensitive and 12 resistant cells remain. The resistant share is still 15% because zero exposure gives neither group a survival advantage.';
const laterDraft = 'Later draft for the current run only; preserve the original saved evidence.';

test.beforeAll(async () => {
  mkdirSync(out, { recursive: true });
  await harness.start();
});
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

const state = (page: Page) => page.evaluate(() => (window as any).__toolData.microbiology);

async function openSavedEvidence(page: Page) {
  const disclosure = page.locator('.micro-resistance-saved');
  const summary = disclosure.locator('summary');
  await expect(summary).toHaveText('Review saved resistance evidence');
  await summary.focus();
  await expect(summary).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('open', '');
  return disclosure;
}

test('preserves partial resistance evidence through edits, reset, downloads, JSON reload, and mobile review', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { microbiology: { tab: 'resistance' } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: layoutStyle });

  const notebook = page.getByRole('region', { name: 'Resistance evidence notebook', exact: true });
  const save = notebook.getByRole('button', { name: 'Save evidence', exact: true });
  const notes = notebook.getByLabel('My written evidence for the current run', { exact: true });
  const downloadText = notebook.getByRole('button', { name: 'Download resistance notebook', exact: true });
  const downloadCSV = notebook.getByRole('button', { name: 'Download resistance CSV', exact: true });
  await expect(save).toBeDisabled();
  await expect(downloadText).toBeDisabled();
  await expect(downloadCSV).toBeDisabled();

  // A full dish at zero exposure has deterministic counts, without replacing Math.random.
  const initial = page.getByRole('slider', { name: 'Initial resistance', exact: true });
  await initial.focus();
  await page.keyboard.press('End');
  await expect(initial).toHaveValue('15');
  const exposure = page.getByRole('slider', { name: 'Antibiotic exposure strength in the teaching model', exact: true });
  await exposure.focus();
  await page.keyboard.press('Home');
  await expect(exposure).toHaveValue('0');
  const duration = page.getByRole('slider', { name: 'Number of exposure rounds in the teaching model', exact: true });
  await duration.focus();
  await page.keyboard.press('Home');
  await expect(duration).toHaveValue('3');
  await page.getByRole('radio', { name: 'Stay about the same', exact: true }).check();
  await page.getByRole('button', { name: 'Step round', exact: true }).click();
  await notes.fill(writtenEvidence);
  await expect(notes).toBeFocused();
  await expect.poll(async () => (await state(page)).resistanceInvestigation.day).toBe(1);
  await save.click();

  await expect.poll(async () => (await state(page)).resistanceNotebook.records.length).toBe(1);
  const saved = (await state(page)).resistanceNotebook.records[0];
  expect(saved.id).toBe(1);
  expect(saved.evidence).toMatchObject({
    dose: 0, duration: 3, initRes: 15, day: 1,
    status: 'in-progress', prediction: 'similar', notes: writtenEvidence,
    initialPct: 15, finalPct: 15, finalAlive: 80,
    history: [
      { day: 0, sensitive: 68, resistant: 12 },
      { day: 1, sensitive: 68, resistant: 12 },
    ],
  });

  // Re-saving identical evidence selects its stable ID instead of duplicating it.
  await save.click();
  expect((await state(page)).resistanceNotebook).toMatchObject({ selectedId: 1, nextId: 2, records: [saved] });
  const disclosure = await openSavedEvidence(page);
  const recordButton = disclosure.getByRole('button', { name: /Evidence 1.*Partial run.*Round 1\/3/ });
  await expect(recordButton).toHaveAttribute('aria-pressed', 'true');
  await recordButton.focus();
  await page.keyboard.press('Enter');
  await expect(recordButton).toBeFocused();
  const archived = disclosure.locator('[data-resistance-evidence="1"]');
  await expect(archived.getByRole('heading', { name: 'Evidence 1 · Partial run', exact: true })).toBeVisible();
  await expect(archived).toContainText('Strength 0/100 · 3 planned rounds · 15% initial resistance requested');
  await expect(archived).toContainText('Actual starting resistant count: 12/80 (15%)');
  await expect(archived).toContainText('Original prediction: Stay about the same');
  await expect(archived).toContainText('Its original prediction has not been evaluated as a final outcome.');
  await expect(archived.locator('[data-resistance-prediction-review]')).toHaveCount(0);
  await expect(archived.locator('blockquote')).toHaveText(writtenEvidence);
  await expect(archived.locator('table caption')).toContainText('Shares are rounded to whole percentages');
  await expect(archived.locator('thead th[scope="col"]')).toHaveText(['Round', 'Sensitive', 'Resistant', 'Total alive', 'Resistant share']);
  await expect(archived.locator('tbody th[scope="row"]')).toHaveText(['0', '1']);
  await expect(archived.locator('tbody tr').nth(1).locator('td')).toHaveText(['68', '12', '80', '15%']);

  // Continue the live history and change its notes; the saved record stays immutable.
  await notes.fill(laterDraft);
  await page.getByRole('button', { name: 'Step round', exact: true }).click();
  await expect.poll(async () => (await state(page)).resistanceInvestigation.day).toBe(2);
  expect((await state(page)).resistanceNotebook.records).toEqual([saved]);
  await expect(archived.locator('blockquote')).toHaveText(writtenEvidence);
  await expect(archived.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: '↺ Reset current run', exact: true }).click();
  await expect.poll(async () => (await state(page)).resistanceInvestigation.day).toBe(0);
  await expect(notes).toHaveValue('');
  await expect(save).toBeDisabled();
  await expect(page.locator('[data-resistance-current-history] tbody tr')).toHaveCount(1);
  expect((await state(page)).resistanceNotebook.records).toEqual([saved]);
  await expect(archived.locator('blockquote')).toHaveText(writtenEvidence);
  await expect(downloadText).toBeEnabled();
  await expect(downloadCSV).toBeEnabled();

  const textEvent = page.waitForEvent('download');
  await downloadText.click();
  const textDownload = await textEvent;
  expect(textDownload.suggestedFilename()).toBe('micro-lab-resistance-notebook.txt');
  const textPath = path.join(out, 'resistance-notebook.txt');
  await textDownload.saveAs(textPath);
  const text = readFileSync(textPath, 'utf8');
  expect(text).toContain('Evidence 1');
  expect(text).toContain('Status: in-progress');
  expect(text).toContain('Exposure strength: 0/100; planned rounds: 3; observed rounds: 1');
  expect(text).toContain('Original prediction: similar');
  expect(text).toContain(writtenEvidence);
  expect(text).toContain('0\t68\t12\t80\t15%');
  expect(text).toContain('1\t68\t12\t80\t15%');
  expect(text).not.toContain(laterDraft);
  const csvEvent = page.waitForEvent('download');
  await downloadCSV.click();
  const csvDownload = await csvEvent;
  expect(csvDownload.suggestedFilename()).toBe('micro-lab-resistance-evidence.csv');
  const csvPath = path.join(out, 'resistance-evidence.csv');
  await csvDownload.saveAs(csvPath);
  const csv = readFileSync(csvPath, 'utf8');
  expect(csv).toContain('"evidence_id","status","exposure_strength_0_100"');
  expect(csv).toContain('"actual_initial_resistant_cells","original_prediction"');
  expect(csv).toContain('"1","in-progress","0","3","1","15","12","similar"');
  expect(csv).toContain(writtenEvidence);
  expect(csv).toContain('"1","68","12","80","15"');
  expect(csv).not.toContain(laterDraft);
  expect(csv.trim().split(/\r?\n/)).toHaveLength(3);
  await notebook.screenshot({ path: path.join(out, 'resistance-notebook-desktop.png') });

  // Round-trip JSON through a fresh browser document, then restore via the host harness.
  // This tests the tool's restoration contract; the harness does not provide app storage.
  const browserJSON = await page.evaluate(() => JSON.stringify((window as any).__toolData.microbiology));
  writeFileSync(path.join(out, 'resistance-notebook-restored-state.json'), browserJSON, 'utf8');
  await page.reload();
  await page.waitForFunction(() => typeof (window as any).__mount === 'function');
  await page.evaluate(json => (window as any).__mount({ microbiology: JSON.parse(json) }), browserJSON);
  await page.addStyleTag({ content: layoutStyle });
  await expect(notebook).toBeVisible();
  expect((await state(page)).resistanceNotebook.records).toEqual([saved]);
  expect((await state(page)).resistanceNotebook.selectedId).toBe(1);
  await expect(notes).toHaveValue('');
  await expect(save).toBeDisabled();
  await openSavedEvidence(page);
  await expect(archived.locator('blockquote')).toHaveText(writtenEvidence);
  await expect(archived.locator('tbody th[scope="row"]')).toHaveText(['0', '1']);
  await expect(recordButton).toHaveAttribute('aria-pressed', 'true');

  await page.setViewportSize({ width: 320, height: 800 });
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const countRegion = archived.getByRole('region', { name: 'Saved resistance counts; scroll horizontally if needed', exact: true });
  await countRegion.focus();
  await expect(countRegion).toBeFocused();
  await page.keyboard.press('ArrowRight');
  const notebookBounds = await notebook.boundingBox();
  expect(notebookBounds).not.toBeNull();
  expect(notebookBounds!.x).toBeGreaterThanOrEqual(0);
  expect(notebookBounds!.x + notebookBounds!.width).toBeLessThanOrEqual(321);
  for (const button of [recordButton, downloadText, downloadCSV]) {
    const bounds = await button.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.height).toBeGreaterThanOrEqual(42);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
  }
  await notebook.screenshot({ path: path.join(out, 'resistance-notebook-phone.png') });
  expect((await state(page)).resistanceNotebook.records).toEqual([saved]);
  expect(errors).toEqual([]);
});
