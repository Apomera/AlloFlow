import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_treelab.js', toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1365, height: 900,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'],
});
test.describe.configure({ timeout: 300_000 });
test.use({ viewport: { width: 1365, height: 900 },
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, data: any = {}) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.evaluate((state) => (window as any).__mount({ treeLab: state }), data);
  await page.waitForSelector('canvas');
}

test('predicts, compares matched trees, reflects, and preserves evidence through recovery', async ({ page }) => {
  await mount(page);
  const discovery = page.locator('.allo-tree-discovery');
  await expect(discovery.getByRole('button', { name: 'Test 3 dry years' })).toBeDisabled();
  await page.screenshot({ path: '.tmp/tree-review/updated-initial.png' });
  const bounds = await page.locator('canvas').first().boundingBox();
  expect(bounds!.y).toBeLessThan(500);

  // Keyboard activation covers the new interaction, not just ARIA markup.
  await discovery.getByRole('button', { name: 'More food left', exact: true }).focus();
  await page.keyboard.press('Enter');
  await discovery.getByRole('button', { name: 'Test 3 dry years' }).click();
  await expect(discovery).toHaveAttribute('data-discovery-phase', 'explain');
  await expect(page.locator('#treelab-discovery-heading')).toBeFocused();
  await expect(discovery.locator('[data-done="true"]')).toHaveCount(2);
  const evidence = await page.evaluate(() => JSON.stringify((window as any).__toolData.treeLab.discovery.record));
  const record = JSON.parse(evidence);
  expect(record.control.summary.startAge).toBe(record.drought.summary.startAge);
  expect(record.control.summary.yearsCompleted).toBe(3);
  expect(record.drought.summary.yearsCompleted).toBe(3);
  expect(record.drought.summary.meanNet).toBeLessThan(record.control.summary.meanNet);
  await discovery.getByRole('button', { name: 'Less food left', exact: true }).click();
  await expect(discovery).toHaveAttribute('data-discovery-phase', 'complete');
  await expect(discovery).toContainText('reason to revise');
  await page.screenshot({ path: '.tmp/tree-review/updated-comparison.png' });
  for (const theme of ['light', 'dark', 'contrast']) {
    await page.evaluate(theme => { const w = window as any; w.__ctx.isDark = theme === 'dark'; w.__ctx.isContrast = theme === 'contrast'; w.__rerender(); }, theme);
    const issues = await page.evaluate(async () => (await (window as any).axe.run('.allo-tree-discovery', { resultTypes: ['violations'] })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
    expect(issues, theme + ' discovery accessibility').toEqual([]);
  }
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__ctx.isContrast = false; w.__rerender(); });

  await discovery.getByRole('button', { name: 'Watch 3 years of recovery' }).click();
  expect(await page.evaluate(() => (window as any).__toolData.treeLab.tree.age)).toBe(7);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.treeLab.discovery.record))).toBe(evidence);
  await expect(page.locator('[data-mission-next]')).toHaveAttribute('data-mission-next', 'complete');

  const issues = await page.evaluate(async () => {
    const result = await (window as any).axe.run('#wrap', { resultTypes: ['violations'] });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }));
  });
  expect(issues).toEqual([]);
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  await expect(page.getByRole('dialog', { name: /Immersive tree viewer/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /Immersive tree viewer/ })).toBeHidden();
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('keeps a completed drought action and explains that result without starting another trial', async ({ page }) => {
  await mount(page, { discoveryMode: 'free' });
  await page.getByRole('button', { name: /Try a 3-year drought/ }).click();
  await page.getByRole('button', { name: /Grow 10 years/ }).click();
  await expect(page.locator('[data-mission-next]')).toHaveAttribute('data-mission-next', 'explain');
  await expect(page.locator('[data-tree-effect]')).toContainText('Limiting at that change');
  await expect(page.locator('[data-tree-effect]')).toContainText('Age 1');
  const snapshot = await page.evaluate(() => JSON.stringify((window as any).__toolData.treeLab.lastYearOutcome));
  await page.getByRole('button', { name: 'Explain this result', exact: true }).click();
  await page.getByLabel('What changed? Use one number or ring from this result.').fill('Ten rings formed. Some years were dry and later years had usual water.');
  await page.getByRole('button', { name: 'Save my explanation' }).click();
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.treeLab.lastYearOutcome))).toBe(snapshot);
  expect(await page.evaluate(() => (window as any).__toolData.treeLab.experiment?.phase || 'idle')).toBe('idle');
  await expect(page.locator('[data-mission-next]')).toHaveAttribute('data-mission-next', 'complete');
});

test('offers younger learners a calm, accessible phone layout with optional detail', async ({ page }) => {
  await mount(page, { bandOverride: 'k2' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; window.scrollTo(0, 0); });
  await expect(page.locator('#treelab-alloc-leaf')).toBeHidden();
  await expect(page.locator('[data-tree-fold="budget"]')).not.toHaveAttribute('open');
  await page.screenshot({ path: '.tmp/tree-review/updated-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.locator('[data-tree-fold="allocation"] > summary').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#treelab-alloc-leaf')).toBeVisible();
  await page.locator('[data-tree-fold="allocation"] > summary').press('Enter');
  const issues = await page.evaluate(async () => {
    const result = await (window as any).axe.run('#wrap', { resultTypes: ['violations'] });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }));
  });
  expect(issues).toEqual([]);
});
