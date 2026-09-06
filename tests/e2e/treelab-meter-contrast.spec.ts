/**
 * Tree Life Lab — can you see how full a meter is?
 *
 * The filled part of a meter and its track are the pair a reader has to separate, so 3:1
 * between them is the bar. Measured on the page, several sat far below it: the strategy bars
 * on Spread at 1.53:1 and 1.44:1 against their track, the trait meters on Compare at 1.44:1,
 * the grove water bars at 2.54:1, and — worst — the high contrast theme drew a yellow fill on
 * a white track at 1.07:1, which is no bar at all.
 *
 * Every fill is hidden for one capture, and the pixel just past its filled end is the track
 * it is measured against.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, contrastRatio, luminance } from './helpers/png_pixels';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_treelab.js', toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1180, height: 1000 });
test.describe.configure({ timeout: 900_000 });
test.use({ viewport: { width: 1180, height: 1000 }, video: 'off', trace: 'off',
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const FILLS = ['.allo-tree-habitat-fill', '.allo-tree-species-trait-fill', '.allo-tree-strategy-fill', '.grove-patch-water i'];

const CASES: Array<[string, string, string, string]> = [
  ['Grow light', 'grow', 'g68', 'light'],
  ['Grow dark', 'grow', 'g68', 'dark'],
  ['Grow high contrast', 'grow', 'g68', 'contrast'],
  ['Spread light', 'spread', 'g68', 'light'],
  ['Spread high contrast', 'spread', 'g68', 'contrast'],
  ['Grove light', 'grove', 'g68', 'light'],
  ['Compare light', 'compare', 'g912', 'light'],
];

for (const [label, view, band, theme] of CASES) {
  test(`separates every meter from its track (${label})`, async ({ page }) => {
    await page.goto(`${harness.url}/__harness`);
    await page.evaluate(({ view, band, theme }) => {
      const w = window as any, E = w.__alloTreeLabEngine;
      const id = view === 'spread' ? 'aspen' : 'oak';
      const sp = E.speciesById(id);
      let t = E.newTree(id);
      for (let i = 0; i < 40; i += 1) t = E.simulateYear(t, sp, { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 }, E.normaliseAlloc());
      w.__mount({ treeLab: { view, bandOverride: band, tree: t, speciesId: id, playing: false } });
      const ctx = w.__ctx;
      ctx.isDark = theme === 'dark';
      ctx.isContrast = theme === 'contrast';
      ctx.reduceMotion = true;
      w.__rerender();
    }, { view, band, theme });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      for (const el of [...document.querySelectorAll('.allo-tree-lab *')] as HTMLElement[]) {
        const p = getComputedStyle(el).position;
        if (p === 'sticky' || p === 'fixed') el.style.position = 'static';
      }
    });

    const marks = await page.evaluate((sels) => {
      const out: any[] = [];
      for (const sel of sels) {
        for (const el of [...document.querySelectorAll('.allo-tree-lab ' + sel)] as HTMLElement[]) {
          const r = el.getBoundingClientRect();
          if (r.width < 3 || r.height < 2) continue;
          const s = getComputedStyle(el);
          const rgb = (s.backgroundColor.match(/[\d.]+/g) || []).map(Number);
          // A translucent or gradient fill cannot be judged from its declared colour.
          if (rgb.length < 3 || (rgb.length > 3 && rgb[3] < 0.9) || s.backgroundImage !== 'none') continue;
          el.setAttribute('data-meter-probe', String(out.length));
          out.push({ sel, rgb: rgb.slice(0, 3),
            tx: Math.round(r.right + window.scrollX + 3),
            ty: Math.round(r.top + window.scrollY + r.height / 2) });
        }
      }
      return out;
    }, FILLS);

    await page.addStyleTag({ content: '.allo-tree-lab canvas{visibility:hidden!important}[data-meter-probe]{visibility:hidden!important}' });
    await page.waitForTimeout(250);
    const png = readPng(await page.screenshot({ fullPage: true, animations: 'disabled', timeout: 180_000 }));

    const weak: string[] = [];
    for (const m of marks) {
      if (m.tx >= png.width || m.ty >= png.height) continue;
      const patch: Array<[number, number, number]> = [];
      for (let dx = -2; dx <= 2; dx += 1) for (let dy = -2; dy <= 2; dy += 1) {
        patch.push(png.at(Math.min(png.width - 1, Math.max(0, m.tx + dx)), Math.min(png.height - 1, Math.max(0, m.ty + dy))));
      }
      patch.sort((a, b) => luminance(a) - luminance(b));
      const track = patch[Math.floor(patch.length / 2)];
      const ratio = contrastRatio(m.rgb as [number, number, number], track);
      if (ratio < 3) weak.push(`${m.sel}: rgb(${m.rgb}) on track rgb(${track}) is ${ratio.toFixed(2)}:1`);
    }
    expect(marks.length, `${label}: no meters found`).toBeGreaterThanOrEqual(4);
    expect(weak, `${label}: ${marks.length} meters measured`).toEqual([]);
  });
}
