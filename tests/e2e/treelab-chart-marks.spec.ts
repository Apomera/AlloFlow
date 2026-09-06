/**
 * Tree Life Lab — can you see the growth lines?
 *
 * A chart line is a graphical object that carries the information, so it needs 3:1 against
 * what it is drawn on. Three of the five light-theme hues did not have it: the green measured
 * 2.82:1 against the white chart, the amber 2.17:1 and the pink 2.69:1. Every line has carried
 * a dash pattern since an earlier pass, so identity was never colour alone — but a line you
 * cannot see is not saved by its dash.
 *
 * Only the marks that carry data are measured. The dots on each line wear a stroke in the
 * surface colour on purpose, as a separator between overlapping marks, and the axis grid is
 * deliberately recessive; neither is information, and both would fail a rule aimed at lines.
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

const THEMES = ['light', 'dark', 'contrast'];

// Marks that carry data, per view: the growth lines on Compare and the four response curves
// on Chemistry. Both are named in the markup so the measurement cannot drift onto a halo.
const VIEWS: Array<[string, string, string, number]> = [
  ['Compare', 'compare', 'polyline[data-species]', 5],
  ['Chemistry', 'chem', 'path[data-curve]', 4],
];

for (const theme of THEMES) for (const [name, view, selector, count] of VIEWS) {
  test(`draws every ${name} mark clearly enough to follow (${theme})`, async ({ page }) => {
    await page.goto(`${harness.url}/__harness`);
    await page.evaluate(({ theme, view }) => {
      const w = window as any, E = w.__alloTreeLabEngine;
      const sp = E.speciesById('oak');
      let t = E.newTree('oak');
      for (let i = 0; i < 40; i += 1) t = E.simulateYear(t, sp, { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 }, E.normaliseAlloc());
      w.__mount({ treeLab: { view, bandOverride: 'g912', tree: t, speciesId: 'oak', playing: false } });
      const ctx = w.__ctx;
      ctx.isDark = theme === 'dark';
      ctx.isContrast = theme === 'contrast';
      ctx.reduceMotion = true;
      w.__rerender();
    }, { theme, view });
    await page.waitForTimeout(1500);

    const lines = await page.evaluate((selector) => {
      const out: any[] = [];
      for (const el of [...document.querySelectorAll('.allo-tree-lab ' + selector)] as SVGGraphicsElement[]) {
        const s = getComputedStyle(el);
        const rgb = (s.stroke.match(/[\d.]+/g) || []).map(Number).slice(0, 3);
        const r = el.getBoundingClientRect();
        if (rgb.length < 3 || r.width < 4) continue;
        out.push({ species: el.getAttribute('data-species') || el.getAttribute('data-curve'), rgb,
          x: Math.round(r.left + window.scrollX + r.width / 2),
          y: Math.round(r.top + window.scrollY + r.height / 2) });
      }
      return out;
    }, selector);
    expect(lines.length, name + ' marks not found').toBe(count);

    // Hide the marks and read the chart surface underneath them.
    await page.addStyleTag({ content: '.allo-tree-lab svg polyline,.allo-tree-lab svg circle,.allo-tree-lab svg line,.allo-tree-lab svg path{visibility:hidden!important}.allo-tree-lab canvas{visibility:hidden!important}' });
    await page.waitForTimeout(250);
    const png = readPng(await page.screenshot({ fullPage: true, animations: 'disabled', timeout: 180_000 }));

    const weak: string[] = [];
    for (const line of lines) {
      const patch: Array<[number, number, number]> = [];
      for (let dx = -3; dx <= 3; dx += 1) for (let dy = -3; dy <= 3; dy += 1) {
        patch.push(png.at(Math.min(png.width - 1, Math.max(0, line.x + dx)), Math.min(png.height - 1, Math.max(0, line.y + dy))));
      }
      patch.sort((a, b) => luminance(a) - luminance(b));
      const surface = patch[Math.floor(patch.length / 2)];
      const ratio = contrastRatio(line.rgb as [number, number, number], surface);
      if (ratio < 3) weak.push(`${line.species}: rgb(${line.rgb}) on rgb(${surface}) is ${ratio.toFixed(2)}:1`);
    }
    expect(weak, `${theme} ${name}: ${lines.length} marks measured`).toEqual([]);
  });
}
