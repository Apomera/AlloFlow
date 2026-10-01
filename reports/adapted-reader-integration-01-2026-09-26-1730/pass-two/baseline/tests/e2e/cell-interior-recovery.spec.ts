import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cell.js', toolId: 'cell', width: 1100, height: 900, appStyles: true });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
test.describe.configure({ timeout: 120000 });
test('cell types preserve outgoing guide position and restore independent study records', async ({ page }) => {
  await harness.mount(page, { cell: { mode: 'interior', interiorCellType: 'animal', interiorGuide: 'geneExpression', interiorGuideStep: 2, interiorSel: 'roughER', interiorSeen: ['roughER'] } }, undefined, { expectCanvas: false });
  const types = page.getByRole('group', { name: 'Cell type', exact: true });
  await types.getByRole('button', { name: /Plant/ }).click();
  await types.getByRole('button', { name: /Animal/ }).click();
  await expect(page.locator('[data-cell-guided-pathway="geneExpression"]')).toContainText('Step 3');
  expect(await page.evaluate(() => (window as any).__toolData.cell.interiorSel)).toBe('roughER');
});
test('rejects unrelated imports and preserves multiword directory input', async ({ page }) => {
  await harness.mount(page, { cell: { mode: 'interior', interiorCellType: 'animal', interiorSeen: ['nucleus'], interiorMastered: ['nucleus'] } }, undefined, { expectCanvas: false });
  const transfer = page.locator('[data-cell-progress-portability]');
  await transfer.getByText('Portable progress record', { exact: true }).click();
  const json = page.getByRole('textbox', { name: 'Portable cell progress JSON' });
  for (const invalid of ['[]', '{}', '{"schemaVersion":1,"byCellType":[]}']) {
    await json.fill(invalid);
    await transfer.getByRole('button', { name: 'Import progress', exact: true }).click();
    await expect(transfer.getByRole('status')).toContainText('Import failed');
    expect(await page.evaluate(() => (window as any).__toolData.cell.interiorMastered)).toEqual(['nucleus']);
  }
  await page.getByRole('button', { name: 'Explore directory', exact: true }).click();
  const directory = page.getByRole('region', { name: 'Structure directory', exact: true });
  const search = directory.getByRole('searchbox');
  await search.pressSequentially('cell membrane');
  await expect(search).toHaveValue('cell membrane');
  await expect(directory.getByRole('button', { name: /^Cell membrane:/ })).toBeVisible();
});
test('pause keeps a stable frame while inspection works, and resume advances motion', async ({ page }) => {
  await harness.mount(page, { cell: { mode: 'interior', interiorStudyFocus: true } }, undefined, { expectCanvas: false });
  const canvas = page.locator('[data-cell-interior-canvas]');
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((cv: any) => cv._cellInteriorPhase || 0)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause cell animation', exact: true }).click();
  const phase = await canvas.evaluate((cv: any) => cv._cellInteriorPhase);
  await page.waitForTimeout(250);
  expect(await canvas.evaluate((cv: any) => cv._cellInteriorPhase)).toBe(phase);
  await canvas.focus();
  await canvas.press('ArrowRight');
  await expect(page.locator('[data-cell-selected-structure]')).toHaveAttribute('data-cell-selected-structure', 'cellMembrane');
  await page.getByRole('button', { name: 'Resume cell animation', exact: true }).click();
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((cv: any) => cv._cellInteriorPhase)).toBeGreaterThan(phase);
});
test('reduced motion remains still and explains the preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { cell: { mode: 'interior', interiorStudyFocus: true } }, undefined, { expectCanvas: false });
  await expect(page.locator('[data-cell-motion-controls]')).toContainText('reduced-motion preference');
  await expect(page.getByRole('button', { name: 'Resume cell animation' })).toBeDisabled();
});
