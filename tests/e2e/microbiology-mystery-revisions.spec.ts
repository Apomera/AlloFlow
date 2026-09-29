import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 120000 });
const out = path.resolve('reports/micro-lab-workspace-evidence-2026-09-28');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });

test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

async function mount(page: Page, saved: Record<string, unknown> = { tab: 'mystery' }) {
  await harness.mount(page, { microbiology: saved }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
}
const state = (page: Page) => page.evaluate(() => (window as any).__toolData.microbiology);
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test('reviews original evidence while preserving revisions, citations, and the next case across reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 960 });
  await mount(page);
  const originalReasoning = 'The supplied nucleus and cilia support a ciliated protist. Bacteria lack a membrane-bound nucleus; species and safety remain unknown.';
  const revisedReasoning = 'Unfinished revision: I need to compare the supplied nucleus observation before changing my classification.';
  const reasoning = page.getByRole('textbox', { name: 'My evidence and reasoning', exact: true });
  const structureCitation = page.getByRole('checkbox', { name: 'Cell structure and chemistry', exact: true });
  const behaviorCitation = page.getByRole('checkbox', { name: 'Behavior and reproduction', exact: true });

  for (const label of ['Size and shape', 'Cell structure and chemistry', 'Behavior and reproduction']) {
    await page.getByRole('button', { name: 'Reveal: ' + label, exact: true }).click();
  }
  await page.getByRole('radio', { name: 'Ciliated protist', exact: true }).check();
  await structureCitation.check();
  await behaviorCitation.check();
  await page.getByRole('radio', { name: /^The evidence supports a broad group/ }).check();
  await reasoning.fill(originalReasoning);
  await page.getByRole('button', { name: 'Check my evidence', exact: true }).click();
  await page.getByRole('button', { name: 'Record specimen report', exact: true }).click();
  await expect(page.locator('.micro-mystery-progress')).toHaveText('1/6 reports recorded');
  const recorded = (await state(page)).mysteryLab.cases.pond.record;
  expect(recorded.reasoning).toBe(originalReasoning);
  await expect(page.getByRole('button', { name: 'Update recorded report', exact: true })).toBeDisabled();

  // Folding an observation changes presentation only, including when used as evidence.
  const structureDisclosure = page.locator('#micro-clue-pond-structure-toggle');
  const structureRegion = page.locator('#micro-clue-pond-structure');
  const revealed = (await state(page)).mysteryLab.cases.pond.revealed;
  await expect(structureDisclosure).toHaveAttribute('aria-controls', 'micro-clue-pond-structure');
  await expect(structureRegion).toHaveAttribute('aria-labelledby', 'micro-clue-pond-structure-toggle');
  await structureDisclosure.focus();
  await page.keyboard.press('Enter');
  await expect(structureDisclosure).toHaveAccessibleName('Show: Cell structure and chemistry');
  await expect(structureDisclosure).toHaveAttribute('aria-expanded', 'false');
  await expect(structureRegion).toBeHidden();
  await expect(structureCitation).toBeEnabled();
  await expect(structureCitation).toBeChecked();
  expect((await state(page)).mysteryLab.cases.pond.revealed).toEqual(revealed);
  expect((await state(page)).mysteryLab.cases.pond.record).toEqual(recorded);
  await expect(page.locator('[data-mystery-pending="false"]')).toContainText('Working notes match the recorded report');

  // Change every report field without replacing the original checked report.
  await page.getByRole('radio', { name: 'Bacterium', exact: true }).check();
  await behaviorCitation.uncheck();
  await page.getByRole('radio', { name: 'These observations establish the exact species.', exact: true }).check();
  await reasoning.fill(revisedReasoning);
  const working = (await state(page)).mysteryLab.cases.pond;
  await expect(page.locator('[data-mystery-pending="true"]')).toContainText('classification, cited observations, written reasoning, conclusion about limits');
  await expect(page.locator('.micro-mystery-progress')).toContainText('Reports with pending revisions: 1');

  const recordedButton = page.getByRole('button', { name: 'Recorded report', exact: true });
  const workingButton = page.getByRole('button', { name: 'Working notes', exact: true });
  await recordedButton.focus();
  await page.keyboard.press('Enter');
  await expect(recordedButton).toHaveAttribute('aria-pressed', 'true');
  await expect(workingButton).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#micro-mystery-report-heading')).toBeFocused();
  const report = page.locator('[data-recorded-report="pond"]');
  await expect(report).toContainText('Recorded claim: Ciliated protist');
  await expect(report).toContainText(originalReasoning);
  await expect(report).not.toContainText(revisedReasoning);
  await expect(report.locator('li')).toHaveCount(2);
  await expect(report).toContainText('Cell structure and chemistry:');
  await expect(report).toContainText('Behavior and reproduction:');
  await expect(report).toContainText('species and safety remain unknown');
  await expect(reasoning).toHaveCount(0);
  expect((await state(page)).mysteryLab.cases.pond).toEqual({ ...working, reportView: 'recorded' });
  await page.locator('.micro-mystery-grid').screenshot({ path: path.join(out, 'mystery-recorded-evidence-desktop.png') });

  await workingButton.click();
  await expect(workingButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#micro-mystery-report-heading')).toBeFocused();
  await expect(reasoning).toHaveValue(revisedReasoning);
  await expect(page.getByRole('radio', { name: 'Bacterium', exact: true })).toBeChecked();
  await expect(structureCitation).toBeChecked();
  await expect(behaviorCitation).not.toBeChecked();
  await expect(page.getByRole('radio', { name: 'These observations establish the exact species.', exact: true })).toBeChecked();
  expect((await state(page)).mysteryLab.cases.pond).toEqual(working);

  await page.getByRole('button', { name: 'Next unrecorded case: B · A growing neighbor', exact: true }).click();
  await expect(page.locator('[data-micro-mystery="budding"]')).toBeVisible();
  await expect(page.locator('#micro-mystery-observation-heading')).toBeFocused();
  await expect(reasoning).toHaveValue('');
  expect((await state(page)).mysteryLab.cases.pond).toEqual(working);
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  const homeMystery = page.locator('[data-work-card="mystery"]');
  await expect(homeMystery).toContainText('Reports with working revisions: 1');
  await homeMystery.getByRole('button', { name: 'Open specimen cases', exact: true }).click();
  await expect(page.locator('[data-micro-mystery="budding"]')).toBeVisible();
  expect((await state(page)).mysteryLab.cases.pond).toEqual(working);
  await page.getByRole('button', { name: /A Freshwater drifter/ }).click();
  await expect(reasoning).toHaveValue(revisedReasoning);
  await recordedButton.click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download specimen reports', exact: true }).click();
  const download = await downloadPromise;
  const downloadPath = path.join(out, 'mystery-pending-revisions.txt');
  await download.saveAs(downloadPath);
  const text = readFileSync(downloadPath, 'utf8');
  expect(text).toContain('Revision status: Working notes contain revisions that have not replaced the recorded report.');
  expect(text).toContain('Recorded claim: Ciliated protist');
  expect(text).toContain(originalReasoning);
  expect(text).toContain(revisedReasoning);
  expect(text).toContain('Current cited observations');
  expect(text).toContain('Current conclusion about limits');
  expect((await state(page)).mysteryLab.cases.pond.record).toEqual(recorded);

  // Harness mount navigates to a fresh document; only JSON-serialized state survives.
  const serialized = JSON.stringify(await state(page));
  await harness.unmount(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await mount(page, JSON.parse(serialized));
  await expect(recordedButton).toHaveAttribute('aria-pressed', 'true');
  await expect(report).toContainText(originalReasoning);
  await expect(structureDisclosure).toHaveAccessibleName('Show: Cell structure and chemistry');
  await expect(structureRegion).toBeHidden();
  expect((await state(page)).mysteryLab.cases.pond).toEqual({ ...working, reportView: 'recorded' });
  await noOverflow(page);
  await report.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'mystery-recorded-evidence-phone.png') });
  await workingButton.click();
  await expect(reasoning).toHaveValue(revisedReasoning);
  await expect(structureCitation).toBeChecked();
  await expect(structureCitation).toBeEnabled();
  await expect(behaviorCitation).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Update recorded report', exact: true })).toBeDisabled();
  await noOverflow(page);
  await page.locator('[data-mystery-pending="true"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'mystery-working-revisions-phone.png') });
  expect((await state(page)).mysteryLab.cases.pond.record).toEqual(recorded);
  expect(errors).toEqual([]);
});
