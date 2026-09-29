import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ mode: 'serial', retries: 0, timeout: 120000 });
const out = path.resolve('reports/micro-lab-portable-evidence-2026-09-29');
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

test('previews and restores one previous report while preserving drafts, views and portable evidence', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 960 });
  await mount(page);
  await page.getByRole('button', { name: /C The wall is the clue/ }).click();
  for (const name of ['Size and shape', 'Cell structure and chemistry', 'Behavior and reproduction']) {
    await page.getByRole('button', { name: 'Reveal: ' + name, exact: true }).click();
  }
  const reason = page.getByRole('textbox', { name: 'My evidence and reasoning', exact: true });
  const firstReason = 'First report: peptidoglycan and division support bacteria, but species and safety remain unknown.';
  const secondReason = 'Second report: peptidoglycan distinguishes bacteria; rod size supports the broader cell description.';
  const draftReason = 'Unfinished revision: compare another interpretation before changing my conclusion.';
  await page.getByRole('radio', { name: 'Bacterium', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Cell structure and chemistry', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Behavior and reproduction', exact: true }).check();
  await page.getByRole('radio', { name: /^The evidence supports a broad group/ }).check();
  await reason.fill(firstReason);
  await page.getByRole('button', { name: 'Check my evidence', exact: true }).click();
  await page.getByRole('button', { name: 'Record specimen report', exact: true }).click();
  const first = (await state(page)).mysteryLab.cases.wall.record;
  await expect(page.locator('[data-mystery-history]')).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Behavior and reproduction', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'Size and shape', exact: true }).check();
  await reason.fill(secondReason);
  await page.getByRole('button', { name: 'Check my evidence', exact: true }).click();
  await page.getByRole('button', { name: 'Update recorded report', exact: true }).click();
  const second = (await state(page)).mysteryLab.cases.wall.record;
  expect((await state(page)).mysteryLab.cases.wall.previousRecord).toEqual(first);

  const history = page.locator('[data-mystery-history="wall"]');
  const preview = history.locator('[data-previous-report="wall"]');
  await expect(history.locator('summary')).toHaveText('Review previous report');
  await history.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(history).toHaveAttribute('open', '');
  await expect(preview.locator('[data-previous-field]')).toHaveCount(4);
  await expect(preview).toContainText(firstReason);
  await expect(preview).toContainText('Chemical analysis detects peptidoglycan');
  await expect(preview).toContainText('cells dividing into two');
  await expect(preview).toContainText('species and safety remain unknown');
  await expect(preview.locator('input,textarea,button')).toHaveCount(0);
  await history.screenshot({ path: path.join(out, 'mystery-previous-report-desktop.png') });

  await page.getByRole('radio', { name: 'Archaeon', exact: true }).check();
  await page.getByRole('radio', { name: 'These observations establish the exact species.', exact: true }).check();
  await reason.fill(draftReason);
  await page.getByRole('button', { name: 'Hide: Cell structure and chemistry', exact: true }).click();
  const working = (await state(page)).mysteryLab.cases.wall;
  const restore = history.getByRole('button', { name: 'Restore previous report', exact: true });
  await restore.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#micro-mystery-report-heading')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Working notes', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(reason).toHaveValue(draftReason);
  expect((await state(page)).mysteryLab.cases.wall).toEqual({ ...working, record: first, previousRecord: second });
  await expect(preview).toContainText(secondReason);
  await expect(page.locator('[data-mystery-notice="restored"]')).toContainText('Your working notes and current view were kept.');
  await expect(page.locator('.micro-mystery-progress')).toContainText('1/6 reports recorded');
  await page.getByRole('button', { name: 'Recorded report', exact: true }).click();
  await expect(page.locator('[data-recorded-report="wall"]')).toContainText(firstReason);
  await restore.click();
  await expect(page.getByRole('button', { name: 'Recorded report', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-recorded-report="wall"]')).toContainText(secondReason);
  expect((await state(page)).mysteryLab.cases.wall).toEqual({ ...working, reportView: 'recorded' });

  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await page.getByRole('tab', { name: 'Mystery specimens', exact: true }).click();
  await expect(history).toBeVisible();
  expect((await state(page)).mysteryLab.cases.wall).toEqual({ ...working, reportView: 'recorded' });
  const saved = JSON.parse(JSON.stringify(await state(page)));
  await harness.unmount(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await mount(page, saved);
  await history.locator('summary').click();
  await expect(preview).toContainText(firstReason);
  await expect(page.locator('#micro-clue-wall-structure')).toBeHidden();
  expect((await state(page)).mysteryLab.cases.wall).toEqual({ ...working, reportView: 'recorded' });
  await noOverflow(page);
  await history.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'mystery-previous-report-phone.png') });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download specimen reports', exact: true }).click();
  const download = await downloadPromise;
  const downloadPath = path.join(out, 'mystery-current-previous-and-working.txt');
  await download.saveAs(downloadPath);
  const report = readFileSync(downloadPath, 'utf8');
  const [current, remaining] = report.split('Previous recorded report (available to restore)');
  const [previous, unfinished] = remaining.split('Current working notes');
  expect(current).toContain(secondReason); expect(current).not.toContain(firstReason);
  expect(previous).toContain(firstReason);
  expect(previous).toContain('Behavior and reproduction: The observation sequence shows cells dividing into two');
  expect(previous).toContain('Previous conclusion about limits:');
  expect(unfinished).toContain(draftReason);
  expect(report).not.toContain('Freshwater drifter');
  await restore.click();
  await expect(page.locator('[data-recorded-report="wall"]')).toContainText(firstReason);
  expect((await state(page)).mysteryLab.cases.wall.previousRecord).toEqual(second);
  await restore.click();
  await page.getByRole('button', { name: 'Working notes', exact: true }).click();
  await expect(reason).toHaveValue(draftReason);
  await expect(page.getByRole('radio', { name: 'Archaeon', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Cell structure and chemistry', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: 'Bacterium', exact: true }).check();
  await page.getByRole('radio', { name: /^The evidence supports a broad group/ }).check();
  await reason.fill('Third report: keep the conclusion at the broad group supported by peptidoglycan and cell size.');
  await page.getByRole('button', { name: 'Check my evidence', exact: true }).click();
  await page.getByRole('button', { name: 'Update recorded report', exact: true }).click();
  expect((await state(page)).mysteryLab.cases.wall.previousRecord).toEqual(second);
  await expect(preview).toContainText(secondReason);
  await expect(preview).not.toContainText(firstReason);
  await expect(page.locator('[data-mystery-history]')).toHaveCount(1);
  await noOverflow(page);
  expect(errors).toEqual([]);
});
