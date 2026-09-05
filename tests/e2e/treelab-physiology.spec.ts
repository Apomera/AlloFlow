import { test, expect } from '@playwright/test';
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

test('previews allocation without advancing, then agrees with the grown tree and live water slider', async ({ page }) => {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.evaluate(() => {
    const w = window as any, E = w.__alloTreeLabEngine;
    const weather = { tempC: 22, light: 0.85, soilWater: 0.75, co2ppm: 420 };
    const alloc = { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 };
    let tree = E.newTree('oak');
    for (let i = 0; i < 10; i++) tree = E.simulateYear(tree, E.speciesById('oak'), weather, alloc);
    w.__mount({ treeLab: { ...weather, soilWater: 0.3, tree, alloc, bandOverride: 'g68', discoveryMode: 'free' } });
  });
  await page.waitForSelector('canvas');
  const fold = page.locator('[data-tree-fold="root-water"]');
  await fold.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(fold).toHaveAttribute('open');
  const before = await page.evaluate(() => JSON.stringify((window as any).__toolData.treeLab.tree));
  const initial = await fold.locator('[data-root-preview]').getAttribute('data-root-preview');
  const root = page.locator('#treelab-alloc-root');
  await root.focus();
  await page.keyboard.press('End');
  const preview = await fold.locator('[data-root-preview]').getAttribute('data-root-preview');
  expect(preview).not.toBe(initial);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.treeLab.tree))).toBe(before);
  await expect(fold).toContainText('The tree has not advanced yet');
  await page.getByRole('button', { name: '+1 year', exact: true }).click();
  await expect(fold.locator('[data-water-access]')).toHaveAttribute('data-water-access', preview!);
  await fold.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.tmp/tree-review/roots-preview.png' });

  const water = page.getByRole('slider', { name: /Soil water/i });
  await water.focus();
  await page.keyboard.press('Home');
  await expect(fold.locator('[data-water-access]')).toHaveAttribute('data-water-access', '0');
  const physiology = await page.evaluate(() => {
    const w = window as any, d = w.__toolData.treeLab, E = w.__alloTreeLabEngine;
    return E.treePhysiology(d.tree, E.speciesById('oak'), E.envForYear(d, d.tree.age));
  });
  expect(physiology.gross).toBe(0);
  expect(physiology.aperture).toBe(0);
  for (const theme of ['light', 'dark', 'contrast']) {
    await page.evaluate(theme => { const w = window as any; w.__ctx.isDark = theme === 'dark'; w.__ctx.isContrast = theme === 'contrast'; w.__rerender(); }, theme);
    const issues = await page.evaluate(async () => (await (window as any).axe.run('.allo-tree-root-water', { resultTypes: ['violations'] })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
    expect(issues, theme).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
