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

// Row grouping needs a tolerance: a highlighted panel sits a couple of pixels proud of its
// row, and exact-top bucketing splits one row into two.
// Passed as a real function, not a string: Playwright ignores the argument when the
// callback is a string, so the selector would never arrive.
const rowsOf = (sel: string) => {
  const g = document.querySelector(sel);
  if (!g) return null;
  const tops = [...g.children].map(k => k.getBoundingClientRect().top).sort((a, b) => a - b);
  const rows: { t: number; n: number }[] = [];
  tops.forEach(t => { const r = rows.find(r => Math.abs(r.t - t) <= 6); if (r) r.n++; else rows.push({ t, n: 1 }); });
  const kids = [...g.children];
  return { perRow: rows.map(r => r.n), n: kids.length,
    overflowing: kids.filter(k => k.scrollWidth > k.clientWidth + 1).length,
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
};

async function mount(page: any, view: string) {
  await page.goto(`${harness.url}/__harness`);
  await page.evaluate(v => {
    const w = window as any, E = w.__alloTreeLabEngine;
    w.__mount({ treeLab: { view: v, tree: E.newTree('oak'), speciesId: 'oak', playing: false } });
    w.__ctx.reduceMotion = true;
  }, view);
  await page.waitForTimeout(1300);
}

// A set with a fixed member count must never leave one member alone on the last row.
const CASES = [
  { view: 'chem', sel: '.allo-tree-curve-grid', n: 4, expect: { 1365: [4], 1000: [4], 860: [2, 2], 700: [2, 2], 390: [1, 1, 1, 1] } },
  { view: 'quiz', sel: '.allo-tree-quiz-story-path', n: 6, expect: { 1365: [6], 1000: [6], 860: [3, 3], 700: [2, 2, 2], 390: [1, 1, 1, 1, 1, 1] } }
];

for (const c of CASES) {
  test(`keeps ${c.sel} free of a stranded last item`, async ({ page }) => {
    await mount(page, c.view);
    for (const width of [1365, 1000, 860, 700, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__rerender(); });
      await page.waitForTimeout(400);
      const m = await page.evaluate(rowsOf, c.sel);
      expect(m, `${c.sel} @${width}`).not.toBeNull();
      expect(m!.n, `${c.sel} @${width}`).toBe(c.n);
      expect(m!.perRow, `${c.sel} @${width}`).toEqual((c.expect as any)[width]);
      // The defining property: no row may hold exactly one item while an earlier row holds more.
      const rows = m!.perRow;
      expect(rows.length === 1 || rows[rows.length - 1] !== 1 || rows[0] === 1, `${c.sel} @${width} orphan`).toBe(true);
      expect(m!.overflowing, `${c.sel} @${width}`).toBe(0);
      expect(m!.pageOverflow, `${c.sel} @${width}`).toBeLessThanOrEqual(1);
    }
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
}

// The progress trail's member count changes with the band, so it cannot join CASES above:
// its row shape is chosen from the pool size rather than fixed by the layout.
test('never strands a single progress chip on the last row, in any band', async ({ page }) => {
  for (const band of ['k2', 'g35', 'g68', 'g912']) {
    await page.goto(`${harness.url}/__harness`);
    await page.evaluate(b => {
      const w = window as any, E = w.__alloTreeLabEngine;
      w.__mount({ treeLab: { view: 'quiz', bandOverride: b, tree: E.newTree('oak'), speciesId: 'oak', playing: false } });
      w.__ctx.reduceMotion = true;
    }, band);
    await page.waitForTimeout(1000);
    for (const width of [1365, 760, 480, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__rerender(); });
      await page.waitForTimeout(350);
      const m = await page.evaluate(rowsOf, '.allo-tree-quiz-leaf-trail');
      const at = `${band} @${width}`;
      expect(m, at).not.toBeNull();
      expect(m!.n, at).toBeGreaterThanOrEqual(5);
      const rows = m!.perRow;
      expect(rows.length === 1 || rows[rows.length - 1] !== 1, at + ' orphan ' + rows.join(',')).toBe(true);
      expect(m!.pageOverflow, at).toBeLessThanOrEqual(1);
    }
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
