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

async function mountView(page: any, view: string) {
  await page.goto(`${harness.url}/__harness`);
  await page.evaluate(v => {
    const w = window as any, E = w.__alloTreeLabEngine;
    let tree = E.newTree('oak'); const sp = E.speciesById('oak');
    for (let y = 1; y < 30; y++) tree = E.simulateYear(tree, sp, { tempC: 22, light: 0.8, soilWater: 0.7, co2ppm: 420 }, E.normaliseAlloc());
    w.__mount({ treeLab: { view: v, tree, speciesId: 'oak', playing: false } });
    w.__ctx.reduceMotion = true;
  }, view);
  await page.waitForTimeout(1400);
}

test('jumps to each Grow step, moving focus and the viewport, in every theme', async ({ page }) => {
  await mountView(page, 'grow');
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
  }
  // One capture, taken outside the theme loop: screenshotting on every pass raced the 3D
  // scene's post-rerender settle and timed out under load. The axe checks above are the
  // assertion that matters; theme captures are reviewed from the light/dark/contrast files.
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__ctx.isContrast = false; w.__rerender(); });
  await page.waitForTimeout(600);
  await page.locator('.allo-tree-grow-nav').screenshot({ path: '.tmp/tree-review/grow-nav-light.png', animations: 'disabled', timeout: 60000 });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('keeps the navigator reachable and tappable on a phone', async ({ page }) => {
  await mountView(page, 'grow');
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

const XPORT_IDS = ['xport-sec-pipes', 'xport-sec-sugar', 'xport-sec-trunk', 'xport-sec-girdling'];

test('jumps to each Transport section through the same shared navigator', async ({ page }) => {
  await mountView(page, 'transport');
  const height = await page.evaluate(() => document.body.scrollHeight);
  expect(height).toBeGreaterThan(2000);
  for (const id of XPORT_IDS) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator(`.allo-tree-grow-nav a[href="#${id}"]`).click();
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => document.activeElement?.id || ''), id).toBe(id);
    const box = await page.locator('#' + id).boundingBox();
    expect(box!.y, id).toBeLessThan(400);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.allo-tree-grow-nav').screenshot({ path: '.tmp/tree-review/transport-nav.png', animations: 'disabled' });
  for (const theme of ['light', 'dark', 'contrast']) {
    await page.evaluate(t => { const w = window as any; w.__ctx.isDark = t === 'dark'; w.__ctx.isContrast = t === 'contrast'; w.__rerender(); }, theme);
    await page.waitForTimeout(450);
    const issues = await page.evaluate(async () => (await (window as any).axe.run('.allo-tree-lab', { resultTypes: ['violations'] })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
    expect(issues, theme).toEqual([]);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('jumps to each Chemistry section and keeps the strip out of short views', async ({ page }) => {
  await mountView(page, 'chem');
  const ids = await page.evaluate(() => [...document.querySelectorAll('.allo-tree-grow-nav a')].map(a => a.getAttribute('href')!.slice(1)));
  expect(ids.length).toBeGreaterThanOrEqual(4);
  for (const id of ids) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator(`.allo-tree-grow-nav a[href="#${id}"]`).click();
    await expect.poll(() => page.evaluate(() => document.activeElement?.id || ''), { message: id }).toBe(id);
    // Chemistry is short enough that its last sections cannot reach the top of a 1000px
    // viewport, so the meaningful check is that the jump brought the section into view.
    await expect(page.locator('#' + id)).toBeInViewport();
  }
  const issues = await page.evaluate(async () => (await (window as any).axe.run('.allo-tree-lab', { resultTypes: ['violations'] })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
  expect(issues).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.allo-tree-grow-nav').screenshot({ path: '.tmp/tree-review/chem-nav.png', animations: 'disabled', timeout: 60000 });
  // Spread is short enough that no navigator should appear.
  await mountView(page, 'spread');
  await expect(page.locator('.allo-tree-grow-nav')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('moves through the tab strip with the arrow keys, Home and End', async ({ page }) => {
  await mountView(page, 'grow');
  const tabs = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map(t => t.id));
  expect(tabs.length).toBeGreaterThan(3);
  await page.locator('#treelab-tab-grow').focus();
  // Roving tabindex: exactly one tab is reachable by Tab at any moment.
  expect(await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].filter(t => t.getAttribute('tabindex') === '0').length)).toBe(1);
  // ArrowRight selects the next tab and takes focus with it.
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id || '')).toBe(tabs[1]);
  expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-selected'))).toBe('true');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id || '')).toBe(tabs[0]);
  // ArrowLeft from the first tab wraps to the last.
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id || '')).toBe(tabs[tabs.length - 1]);
  await page.keyboard.press('Home');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id || '')).toBe(tabs[0]);
  await page.keyboard.press('End');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id || '')).toBe(tabs[tabs.length - 1]);
  expect(await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].filter(t => t.getAttribute('tabindex') === '0').length)).toBe(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

const CMP_IDS = ['cmp-sec-experiment', 'cmp-sec-trail', 'cmp-sec-species', 'cmp-sec-next'];

// Compare measured 2663px tall with no jump strip, next to Chemistry's 2240px which has one.
test('jumps to each Compare section through the same shared navigator', async ({ page }) => {
  await mountView(page, 'compare');
  const height = await page.evaluate(() => document.body.scrollHeight);
  expect(height).toBeGreaterThan(2000);
  const ids = await page.evaluate(() => [...document.querySelectorAll('.allo-tree-grow-nav a')].map(a => a.getAttribute('href')!.slice(1)));
  expect(ids).toEqual(CMP_IDS);
  for (const id of ids) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator(`.allo-tree-grow-nav a[href="#${id}"]`).click();
    await expect.poll(() => page.evaluate(() => document.activeElement?.id || ''), { message: id }).toBe(id);
    await expect(page.locator('#' + id)).toBeInViewport();
  }
  // The species stage was already a labelled landmark; it must not have gained a second one.
  expect(await page.evaluate(() => document.querySelectorAll('#cmp-sec-species').length)).toBe(1);
  expect(await page.evaluate(() => document.querySelectorAll('.allo-tree-species-stage').length)).toBe(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.allo-tree-grow-nav').screenshot({ path: '.tmp/tree-review/compare-nav.png', animations: 'disabled', timeout: 60000 });
  // No pill may read as pre-selected: weight, colour and background are identical across links.
  const looks = await page.evaluate(() => [...document.querySelectorAll('.allo-tree-grow-nav a')].map(a => {
    const s = getComputedStyle(a as HTMLElement);
    return [s.fontWeight, s.color, s.backgroundColor].join('|');
  }));
  expect(new Set(looks).size).toBe(1);
  for (const theme of ['light', 'dark', 'contrast']) {
    await page.evaluate(t => { const w = window as any; w.__ctx.isDark = t === 'dark'; w.__ctx.isContrast = t === 'contrast'; w.__rerender(); }, theme);
    await page.waitForTimeout(450);
    const issues = await page.evaluate(async () => (await (window as any).axe.run('.allo-tree-lab', { resultTypes: ['violations'] })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
    expect(issues, theme).toEqual([]);
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
