import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const probes = `
  const make = window.StemLab.makeBayViewer;
  window.StemLab.makeBayViewer = function (cfg) {
    const build = cfg.buildScene;
    return make(Object.assign({}, cfg, { buildScene: function (T, api) {
      const p = api.sceneProps || {};
      window.__grovePortrait = { id: p.inspectionId || null, species: p.species && p.species.id,
        age: p.tree && p.tree.age, height: p.tree && p.tree.heightM, water: p.soilWater, light: p.light };
      return build(T, api);
    } }));
  };
`;
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_treelab.js', toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1365, height: 1000, probes,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'] });
test.describe.configure({ timeout: 240_000 });
test.use({ viewport: { width: 1365, height: 1000 }, video: 'off', trace: 'off',
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('renders the real campaign tree, reuses the canvas during growth, and releases it for the map', async ({ page }) => {
  await page.goto(`${harness.url}/__harness`);
  await page.evaluate(() => {
    const w = window as any;
    w.__mount({ treeLab: { view: 'grove', tree: w.__alloTreeLabEngine.newTree('willow'), speciesId: 'willow',
      grovePatch: 0, groveRun: { version: 1, seed: 'GROVE-01', mode: 'deck', choices: [] } } });
    w.__ctx.reduceMotion = true;
  });
  const lab = await page.evaluate(() => JSON.stringify((window as any).__ctx.toolData.treeLab.tree));
  await page.getByRole('button', { name: '3D close-up', exact: true }).click();
  await page.waitForFunction(() => (window as any).__grovePortrait?.id === 'oak-parent');
  await expect(page.getByRole('button', { name: 'Rotate tree left' })).toBeEnabled();
  await expect(page.locator('.grove-closeup-heading')).toContainText('Age 40');
  expect(await page.evaluate(() => (window as any).__grovePortrait.species)).toBe('oak');
  await page.evaluate(() => { (window as any).__groveCanvas = document.querySelector('.grove-closeup-canvas canvas'); });
  await page.getByRole('button', { name: 'Rotate tree left' }).click();
  await page.getByRole('button', { name: 'Zoom in on tree' }).click();
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await page.getByRole('button', { name: 'Roots', exact: true }).click();
  await expect(page.locator('.grove-closeup')).toContainText('schematic cutaway');
  await page.getByRole('button', { name: 'Live through year 1' }).click();
  await page.waitForFunction(() => (window as any).__grovePortrait?.age === 41);
  expect(await page.evaluate(() => (window as any).__groveCanvas === document.querySelector('.grove-closeup-canvas canvas'))).toBe(true);
  const expected = await page.evaluate(() => {
    const w = window as any, E = w.__alloTreeLabEngine;
    const state = E.groveRestore(w.__ctx.toolData.treeLab.groveRun), p = E.groveSceneState(state, 0, 'oak-parent');
    return { height: p.node.tree.heightM, water: p.env.soilWater, light: p.env.light };
  });
  expect(await page.evaluate(() => (window as any).__grovePortrait)).toMatchObject(expected);
  await page.locator('#grove-inspect-patch').selectOption('4');
  await page.waitForFunction(() => (window as any).__grovePortrait?.id === 'aspen-parent');
  expect(await page.evaluate(() => (window as any).__groveCanvas === document.querySelector('.grove-closeup-canvas canvas'))).toBe(true);
  await page.locator('#grove-inspect-patch').selectOption('2');
  await expect(page.getByText('Room for a future tree.', { exact: true })).toBeVisible();
  await expect(page.locator('.grove-closeup-canvas canvas')).toHaveCount(0);
  await page.locator('#grove-inspect-patch').selectOption('0');
  await page.waitForFunction(() => (window as any).__grovePortrait?.id === 'oak-parent');
  await expect(page.getByRole('button', { name: 'Rotate tree left' })).toBeEnabled();
  await page.waitForTimeout(600);
  await page.locator('.grove-closeup').screenshot({ path: '.tmp/tree-review/grove-3d-oak.png' });
  await page.getByRole('button', { name: 'Habitat map', exact: true }).click();
  await expect(page.locator('.grove-map button')).toHaveCount(9);
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify((window as any).__ctx.toolData.treeLab.tree))).toBe(lab);
  await page.locator('#treelab-tab-grow').click();
  await page.waitForFunction(() => (window as any).__grovePortrait?.id === null && (window as any).__grovePortrait?.species === 'willow');
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('keeps the 3D close-up accessible in dark and high contrast and fits a phone', async ({ page }) => {
  await page.goto(`${harness.url}/__harness`);
  await page.evaluate(() => {
    const w = window as any;
    w.__mount({ treeLab: { view: 'grove', groveView: '3d', grovePatch: 4,
      groveRun: { version: 1, seed: 'GROVE-01', mode: 'deck', choices: [] } } });
    w.__ctx.reduceMotion = true;
  });
  await expect(page.getByRole('button', { name: 'Rotate tree left' })).toBeEnabled();
  for (const theme of ['light', 'dark', 'contrast']) {
    await page.evaluate(theme => { const w = window as any; w.__ctx.isDark = theme === 'dark'; w.__ctx.isContrast = theme === 'contrast'; w.__rerender(); }, theme);
    await expect(page.getByRole('button', { name: 'Rotate tree left' })).toBeEnabled();
    await page.waitForTimeout(600);
    const issues = await page.evaluate(async () => (await (window as any).axe.run('.allo-tree-grove', { resultTypes: ['violations'] })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })));
    expect(issues, theme).toEqual([]);
    await page.locator('.grove-closeup').screenshot({ path: `.tmp/tree-review/grove-3d-${theme}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { const w = window as any; document.getElementById('wrap')!.style.width = '100%'; w.__ctx.isContrast = false; w.__ctx.isDark = false; w.__rerender(); });
  await expect(page.getByRole('button', { name: 'Rotate tree left' })).toBeEnabled();
  await page.waitForTimeout(600);
  await page.locator('.grove-closeup').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const canvas = await page.locator('.grove-closeup-canvas canvas').boundingBox();
  expect(canvas!.width).toBeGreaterThan(250); expect(canvas!.height).toBeGreaterThanOrEqual(350);
  await page.getByRole('button', { name: 'Zoom out from tree' }).focus();
  await page.keyboard.press('Enter');
  await page.locator('.grove-closeup').screenshot({ path: '.tmp/tree-review/grove-3d-phone.png' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
