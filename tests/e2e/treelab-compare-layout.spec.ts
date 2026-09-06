import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_treelab.js', toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1365, height: 1000 });
test.describe.configure({ timeout: 240_000 });
test.use({ viewport: { width: 1365, height: 1000 }, video: 'off', trace: 'off',
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

// Five species always render together, so a four-column layout strands the fifth card beside
// three empty slots. These widths pin the column counts that avoid that.
test('lays the five species cards out without a stranded fifth card', async ({ page }) => {
  await page.goto(`${harness.url}/__harness`);
  await page.evaluate(() => {
    const w = window as any, E = w.__alloTreeLabEngine;
    w.__mount({ treeLab: { view: 'compare', tree: E.newTree('oak'), speciesId: 'oak', playing: false } });
    w.__ctx.reduceMotion = true;
  });
  await page.waitForTimeout(1600);
  const measure = async () => page.evaluate(() => {
    const cards = [...document.querySelectorAll('.allo-tree-species-grid > *')] as HTMLElement[];
    const rows: Record<number, number> = {};
    cards.forEach(c => { const t = Math.round(c.getBoundingClientRect().top); rows[t] = (rows[t] || 0) + 1; });
    return { count: cards.length, perRow: Object.values(rows),
      overflowing: cards.filter(c => c.scrollWidth > c.clientWidth + 1).length,
      heights: cards.map(c => Math.round(c.getBoundingClientRect().height)),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  const expected: Record<number, number[]> = { 1365: [5], 1100: [3, 2], 900: [2, 2, 1], 700: [2, 2, 1], 390: [1, 1, 1, 1, 1] };
  for (const width of [1365, 1100, 900, 700, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__rerender(); });
    await page.waitForTimeout(500);
    const m = await measure();
    expect(m.count, String(width)).toBe(5);
    expect(m.perRow, String(width)).toEqual(expected[width]);
    // No row of four: that is the layout that strands a single card.
    expect(m.perRow.includes(4), String(width)).toBe(false);
    expect(m.overflowing, String(width)).toBe(0);
    expect(m.pageOverflow, String(width)).toBeLessThanOrEqual(1);
  }
  // Back at desktop width the five cards share one row and one height, so their stat bars
  // line up and can be read across species.
  await page.setViewportSize({ width: 1365, height: 1000 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__rerender(); });
  await page.waitForTimeout(600);
  const wide = await measure();
  expect(new Set(wide.heights).size).toBe(1);
  await page.locator('.allo-tree-species-grid').screenshot({ path: '.tmp/tree-review/species-grid-5.png', animations: 'disabled', timeout: 60000 });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
