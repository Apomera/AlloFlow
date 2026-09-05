import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_treelab.js', toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1365, height: 900,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'] });
test.describe.configure({ timeout: 180_000 });
test.use({ viewport: { width: 1365, height: 900 },
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('keeps the tree beside lower controls and releases it for short screens and expanded guides', async ({ page }) => {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.evaluate(() => (window as any).__mount({ treeLab: { discoveryMode: 'free' } }));
  await page.waitForSelector('canvas');
  await page.locator('#treelab-alloc-root').scrollIntoViewIfNeeded();
  const sticky = page.locator('.allo-tree-workbench-sticky');
  const box = await sticky.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeLessThanOrEqual(14);
  expect(box!.y + box!.height).toBeLessThanOrEqual(900);
  await page.screenshot({ path: '.tmp/tree-review/refined-sticky-scene.png' });
  await page.locator('[data-tree-fold="seasons"] > summary').click();
  expect(await sticky.evaluate(node => getComputedStyle(node).position)).toBe('static');
  await page.locator('[data-tree-fold="seasons"] > summary').click();
  await page.setViewportSize({ width: 1365, height: 700 });
  expect(await sticky.evaluate(node => getComputedStyle(node).position)).toBe('static');
  await page.setViewportSize({ width: 820, height: 1000 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; window.scrollTo(0, 0); });
  const grid = page.locator('.allo-tree-workbench');
  const mission = page.locator('.allo-tree-workbench-mission');
  const scene = page.locator('.allo-tree-workbench-scene');
  const gridBox = await grid.boundingBox(), missionBox = await mission.boundingBox(), sceneBox = await scene.boundingBox();
  expect(Math.abs(missionBox!.width - gridBox!.width)).toBeLessThan(2);
  expect(Math.abs(sceneBox!.width - gridBox!.width)).toBeLessThan(2);
  expect(sceneBox!.y).toBeGreaterThanOrEqual(missionBox!.y + missionBox!.height);
  expect(await sticky.evaluate(node => getComputedStyle(node).position)).toBe('static');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('shows signed food evidence with accessible details and stable saved results', async ({ page }) => {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.evaluate(() => {
    const w = window as any, E = w.__alloTreeLabEngine;
    const env = { tempC: 22, light: 0.8, soilWater: 0.7, co2ppm: 420 };
    let tree = E.newTree('oak');
    for (let i = 0; i < 20; i++) tree = E.simulateYear(tree, E.speciesById('oak'), env, E.normaliseAlloc());
    const record = E.runDroughtDiscovery(tree, 'oak', { ...env, soilWater: 0.5 }, E.normaliseAlloc());
    w.__mount({ treeLab: { ...env, tree: record.drought.tree, discovery: { prediction: 'more', record } } });
  });
  await page.waitForSelector('canvas');
  const chart = page.locator('.allo-tree-food-evidence');
  const details = page.locator('[data-tree-fold="discovery-details"]');
  await expect(chart).toBeVisible();
  await expect(details).not.toHaveAttribute('open');
  const balances = await chart.locator('[data-carbon-balance]').evaluateAll(nodes => nodes.map(n => Number((n as HTMLElement).dataset.carbonBalance)));
  expect(balances[0]).toBeGreaterThan(0);
  expect(balances[1]).toBeLessThan(0);
  await expect(chart).toContainText('bar left of the zero line');
  await chart.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.tmp/tree-review/refined-food-evidence.png' });
  await details.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(details.locator('svg')).toBeVisible();
  await details.locator('summary').press('Enter');
  for (const theme of ['light', 'dark', 'contrast']) {
    await page.evaluate(theme => { const w = window as any; w.__ctx.isDark = theme === 'dark'; w.__ctx.isContrast = theme === 'contrast'; w.__rerender(); }, theme);
    const issues = await page.evaluate(async () => (await (window as any).axe.run('.allo-tree-discovery', { resultTypes: ['violations'] })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
    expect(issues, theme).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; });
  await chart.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.tmp/tree-review/refined-food-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect(await chart.locator('[data-carbon-balance]').evaluateAll(nodes => nodes.map(n => Number((n as HTMLElement).dataset.carbonBalance)))).toEqual(balances);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
