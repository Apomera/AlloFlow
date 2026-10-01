import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cell.js', toolId: 'cell', width: 1100, height: 900, appStyles: true });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

for (const width of [1200, 390]) {
  test(`focused study and recall work at ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await harness.mount(page, { cell: { mode: 'interior', interiorCellType: 'animal' } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: 'body{background:#f8fafc} #wrap{width:100%;max-width:1100px;display:block}' });
    const study = page.locator('[data-cell-interior-workspace]');
    await page.getByRole('button', { name: 'Focus on cell', exact: true }).click();
    await expect(page.locator('[data-cell-tool]')).toHaveAttribute('data-cell-study-focus', 'true');
    await page.getByRole('button', { name: 'Pause cell animation', exact: true }).click();
    const canvas = page.locator('[data-cell-interior-canvas]');
    const phase = await canvas.evaluate((el: any) => el._cellInteriorPhase || 0);
    await page.waitForTimeout(150);
    expect(await canvas.evaluate((el: any) => el._cellInteriorPhase || 0)).toBe(phase);
    await page.getByRole('button', { name: 'Next unexplored', exact: true }).click();
    await expect(page.locator('[data-cell-selected-structure]')).toHaveAttribute('data-cell-selected-structure', 'cellMembrane');
    await page.getByRole('button', { name: 'Next structure', exact: true }).click();
    await expect(page.locator('[data-cell-selected-structure]')).toHaveAttribute('data-cell-selected-structure', 'nucleus');
    await page.getByRole('button', { name: 'Practice recall', exact: true }).click();
    const quiz = page.locator('[data-cell-adaptive-quiz][role="region"]');
    await expect(quiz).toBeVisible();
    await expect(quiz).toBeFocused();
    await expect(study).toHaveAttribute('data-cell-recall-pending', 'true');
    await expect(page.locator('[data-cell-interior-canvas]')).toBeHidden();
    await expect(page.locator('[data-cell-selected-structure]')).toBeHidden();
    const answer = await page.evaluate(() => {
      const w = window as any;
      return w.__alloCellPure.CELL_ORGANELLES.cellMembrane.name;
    });
    await quiz.getByRole('button', { name: answer, exact: true }).click();
    await expect(quiz).toContainText('Correct.');
    await expect(page.locator('[data-cell-study-nav]')).toContainText('Recall accuracy: 100% (1/1)');
    await expect(page.locator('[data-cell-interior-canvas]')).toBeVisible();
    await quiz.getByRole('button', { name: 'Next review item' }).click();
    await expect(study).toHaveAttribute('data-cell-recall-pending', 'true');
    await quiz.getByRole('button', { name: 'End check' }).click();
    await page.getByRole('button', { name: 'Show full workspace', exact: true }).click();
    await expect(page.locator('[data-cell-navigation]')).toBeVisible();
    expect(errors).toEqual([]);
    await page.getByRole('button', { name: 'Focus on cell', exact: true }).click();
    await study.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `reports/cell-study-enhancement/focused-${width}.png`, fullPage: true });
  });
}

test('review queue clears conflicting filters and empty search can recover', async ({ page }) => {
  await harness.mount(page, { cell: { mode: 'interior', interiorCellType: 'animal', interiorReview: ['nucleus'], interiorSeen: ['nucleus'], interiorDirectoryUnexploredOnly: true, interiorDirectoryGroup: 'invalid', interiorDirectoryQuery: 'no-match' } }, undefined, { expectCanvas: false });
  await page.getByRole('region', { name: 'Focused cell study' }).getByRole('button', { name: 'Open review queue', exact: true }).click();
  const directory = page.getByRole('region', { name: 'Structure directory', exact: true });
  await expect(directory.getByRole('button', { name: /^Nucleus:/ })).toBeVisible();
  await directory.getByRole('searchbox').fill('does-not-exist');
  await directory.getByRole('button', { name: 'Clear search and filters' }).click();
  await expect(directory.getByRole('searchbox')).toHaveValue('');
  await expect(directory.getByRole('button', { name: /^Mitochondria:/ })).toBeVisible();
});
