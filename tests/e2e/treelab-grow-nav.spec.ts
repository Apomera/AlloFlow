import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_treelab.js', toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1365, height: 1000,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'] });
test.describe.configure({ timeout: 240_000 });
test.use({ viewport: { width: 1365, height: 1000 }, video: 'off', trace: 'off',
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const IDS = ['grow-sec-clock', 'grow-sec-budget', 'grow-sec-memory', 'grow-sec-conditions', 'grow-sec-surplus'];

async function mountGrow(page: any) {
  await page.goto(`${harness.url}/__harness`);
  await page.evaluate(() => {
    const w = window as any, E = w.__alloTreeLabEngine;
    let tree = E.newTree('oak'); const sp = E.speciesById('oak');
    for (let y = 1; y < 30; y++) tree = E.simulateYear(tree, sp, { tempC: 22, light: 0.8, soilWater: 0.7, co2ppm: 420 }, E.normaliseAlloc());
    w.__mount({ treeLab: { view: 'grow', tree, speciesId: 'oak', playing: false } });
    w.__ctx.reduceMotion = true;
  });
  await page.waitForTimeout(1400);
}

test('jumps to each Grow step, moving focus and the viewport, in every theme', async ({ page }) => {
  await mountGrow(page);
  // The view is long enough that jumping is the point: confirm it before relying on it.
  const height = await page.evaluate(() => document.body.scrollHeight);
  expect(height).toBeGreaterThan(2500);
  for (const id of IDS) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('link', { name: await page.locator('#' + id).getAttribute('aria-label') || id }).first().click().catch(async () => {
      await page.locator(`.allo-tree-grow-nav a[href="#${id}"]`).click();
    });
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => document.activeElement?.id || ''), id).toBe(id);
    const box = await page.locator('#' + id).boundingBox();
    expect(box!.y, id).toBeLessThan(400);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.allo-tree-grow-nav').screenshot({ path: '.tmp/tree-review/grow-nav.png', animations: 'disabled' });
  for (const theme of ['light', 'dark', 'contrast']) {
    await page.evaluate(t => { const w = window as any; w.__ctx.isDark = t === 'dark'; w.__ctx.isContrast = t === 'contrast'; w.__rerender(); }, theme);
    await page.waitForTimeout(500);
    const issues = await page.evaluate(async () => (await (window as any).axe.run('.allo-tree-grow-nav', { resultTypes: ['violations'] })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
    expect(issues, theme).toEqual([]);
    await page.locator('.allo-tree-grow-nav').screenshot({ path: `.tmp/tree-review/grow-nav-${theme}.png`, animations: 'disabled' });
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('keeps the navigator reachable and tappable on a phone', async ({ page }) => {
  await mountGrow(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__rerender(); });
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  // Every jump target must be a 24px-plus tap target, and the last one must actually work.
  const sizes = await page.evaluate(() => [...document.querySelectorAll('.allo-tree-grow-nav a')].map(a => Math.round(a.getBoundingClientRect().height)));
  expect(sizes).toHaveLength(5);
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(24);
  await page.locator('.allo-tree-grow-nav a[href="#grow-sec-surplus"]').click();
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => document.activeElement?.id || '')).toBe('grow-sec-surplus');
  await page.locator('.allo-tree-grow-nav').screenshot({ path: '.tmp/tree-review/grow-nav-phone.png', animations: 'disabled' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
