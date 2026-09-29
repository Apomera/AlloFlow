import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ mode: 'serial', retries: 0, timeout: 90000 });
const out = path.resolve('reports/micro-lab-portable-evidence-2026-09-29');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

async function mount(page: Page, seed = {}) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { microbiology: { tab: 'bacteria', ...seed } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
}
const state = (page: Page) => page.evaluate(() => (window as any).__toolData.microbiology);
async function downloadReport(page: Page, name: string, keyboard = false) {
  const control = page.getByRole('button', { name: 'Download Gram evidence report', exact: true });
  const pending = page.waitForEvent('download');
  if (keyboard) { await control.focus(); await page.keyboard.press('Enter'); }
  else await control.click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('micro-lab-gram-evidence.txt');
  const file = path.join(out, name);
  await download.saveAs(file);
  await expect(page.locator('#micro-gram-download-status')).toContainText('The Gram evidence report download has started.');
  return readFileSync(file, 'utf8');
}

test('exports saved and working evidence separately and compares only changed written fields on a phone', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const lab = page.locator('#micro-gram-lab');
  await lab.locator('#micro-gram-prediction-thin').check();
  const stages = lab.locator('.micro-gram-stages button');
  for (let i = 1; i <= 4; i++) await stages.nth(i).click();
  await lab.locator('input[name="micro-gram-interpretation"][value="wall"]').check();
  const original = 'My prediction was different: A kept purple at decolorization. The cell envelopes explain the difference.';
  await lab.locator('#micro-gram-explanation').fill(original);
  await lab.getByRole('button', { name: 'Save Gram-stain report', exact: true }).click();
  const record = (await state(page)).gramInvestigation.record;
  const revised = '<b>A literal working note</b>\nI am still considering the shape explanation.';
  await lab.locator('#micro-gram-explanation').fill(revised);
  await lab.locator('input[name="micro-gram-interpretation"][value="shape"]').check();
  await stages.nth(1).click();

  await page.setViewportSize({ width: 390, height: 844 });
  const comparison = page.locator('#micro-gram-comparison');
  await comparison.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(comparison).toHaveAttribute('open', '');
  await expect(comparison.locator('[data-gram-change]')).toHaveCount(2);
  await expect(comparison.locator('[data-gram-change="prediction"]')).toHaveCount(0);
  await expect(comparison.locator('[data-gram-change="explanation"] [data-gram-value="saved"]')).toHaveText(original);
  await expect(comparison.locator('[data-gram-change="explanation"] [data-gram-value="working"]')).toHaveText(revised);
  await expect(comparison.locator('b')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await comparison.screenshot({ path: path.join(out, 'gram-written-changes-phone.png') });

  const before = await state(page);
  const text = await downloadReport(page, 'gram-saved-and-working.txt', true);
  const [saved, working] = text.split('Current working notes');
  expect(saved).toContain('Prediction: Only model B');
  expect(saved).toContain(original); expect(saved).not.toContain(revised);
  expect(saved).toContain('It does not store a historical log of observed stages.');
  expect(working).toContain(revised);
  expect(working).toContain('Selected interpretation: Round cells retain purple dye');
  expect(working).toContain('Stages observed in the current investigation: 4/4');
  expect(working).toContain('4. Safranin counterstain: Model A — Purple; Model B — Pink');
  expect(text).toContain('cannot identify a species or establish antibiotic susceptibility');
  expect(text).toContain('https://asm.org/protocols/gram-stain-protocols');
  expect(await state(page)).toEqual(before);
  expect((await state(page)).gramInvestigation.record).toEqual(record);
  await expect(lab.getByRole('button', { name: 'Download Gram evidence report', exact: true })).toBeFocused();
  await expect(page.locator('a[download="micro-lab-gram-evidence.txt"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('exports note-only and partially observed investigations without unobserved model results', async ({ page }) => {
  await mount(page);
  const lab = page.locator('#micro-gram-lab');
  await expect(lab.getByRole('button', { name: 'Download Gram evidence report', exact: true })).toBeDisabled();
  await lab.locator('#micro-gram-explanation').fill('When will the two colors first differ?');
  const notes = await downloadReport(page, 'gram-notes-before-observation.txt');
  expect(notes).toContain('No report has been saved.');
  expect(notes).toContain('No prediction selected.');
  expect(notes).toContain('No staining stages have been observed in the current investigation.');
  await lab.locator('#micro-gram-prediction-both').check();
  const stages = lab.locator('.micro-gram-stages button');
  await stages.nth(1).click(); await stages.nth(2).click();
  const partial = await downloadReport(page, 'gram-partial-observations.txt');
  expect(partial).toContain('Stages observed in the current investigation: 2/4');
  expect(partial).toContain('2. Iodine: Model A — Purple; Model B — Purple');
  expect(partial).not.toContain('3. Decolorization:');
  expect(partial).not.toContain('4. Safranin counterstain:');
  expect(partial).not.toContain('allow the complex to wash out');
  expect((await state(page)).gramInvestigation.record).toBeNull();
});

test('keeps a legacy saved report portable after restart and JSON restoration with no invented stage history', async ({ page }) => {
  const record = { prediction: '', interpretation: 'wall', explanation: 'A legacy saved explanation whose original prediction is unavailable.' };
  await mount(page, { gramStep: 99, gramInvestigation: { record } });
  const lab = page.locator('#micro-gram-lab');
  await lab.getByRole('button', { name: 'Start a new investigation', exact: true }).click();
  await expect(lab.locator('#micro-gram-prediction-thick')).toBeFocused();
  const first = await downloadReport(page, 'gram-legacy-after-restart.txt');
  const [saved, working] = first.split('Current working notes');
  expect(saved).toContain(record.explanation);
  expect(saved).toContain('No prediction was saved for this earlier observation.');
  expect(working).toContain('No prediction selected.');
  expect(working).toContain('Stages observed in the current investigation: 0/4');
  expect(first).not.toContain('1. Crystal violet:');
  const restored = JSON.parse(JSON.stringify(await state(page)));
  await harness.unmount(page);
  await page.evaluate(data => (window as any).__mount({ microbiology: data }), restored);
  const second = await downloadReport(page, 'gram-legacy-after-restoration.txt');
  expect(second).toBe(first);
  expect((await state(page)).gramInvestigation.record).toEqual(record);
  await expect(lab.locator('.micro-gram-record blockquote')).toHaveText(record.explanation);
});
