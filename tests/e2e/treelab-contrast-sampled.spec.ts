/**
 * Tree Life Lab — the contrast axe cannot judge.
 *
 * The accessibility suite asserts on axe VIOLATIONS. On these surfaces axe returns 85 to 261
 * colour-contrast nodes as INCOMPLETE instead, because the text sits on a gradient and the
 * rule cannot resolve a single background colour. Filtering to violations drops all of them
 * silently, so most of the tool's text was never actually checked: small accent text sat at
 * 3.25-3.77:1 against the light cards, under the 4.5:1 AA floor, with a clean axe report.
 *
 * This spec decides those nodes by measurement. Every glyph is made invisible, including SVG
 * text (which uses fill, not color, and therefore survives a color:transparent rule and gets
 * sampled as its own background), the page is captured once, and the pixel under each text
 * box is read back as the colour that text is really painted on.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, contrastRatio, luminance } from './helpers/png_pixels';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_treelab.js', toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1180, height: 1000,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'] });
test.describe.configure({ timeout: 900_000 });
test.use({ viewport: { width: 1180, height: 1000 }, video: 'off', trace: 'off',
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const SURFACES: Array<[string, string, string, string]> = [
  ['Grow (light)', 'grow', 'g68', 'light'],
  ['Grow (dark)', 'grow', 'g68', 'dark'],
  ['Grow (high contrast)', 'grow', 'g68', 'contrast'],
  ['Chemistry (light)', 'chem', 'g912', 'light'],
  // Transport carries the season field guide, whose identity hues were the second fault
  // this measurement found: five of them were legible as swatches but not as text.
  ['Transport (light)', 'transport', 'g68', 'light'],
  ['Transport (high contrast)', 'transport', 'g68', 'contrast'],
  ['Spread (dark)', 'spread', 'g68', 'dark'],
  ['Grove (light)', 'grove', 'g68', 'light'],
  ['Grove (dark)', 'grove', 'g68', 'dark'],
  ['Quiz (light)', 'quiz', 'g68', 'light'],
  ['Quiz (high contrast)', 'quiz', 'g68', 'contrast'],
  ['Compare (dark)', 'compare', 'g912', 'dark'],
];

// A decorative glyph is a graphical object, not text: WCAG asks 3:1 of it. This one is the
// trend arrow inside the memory comparison badge, aria-hidden and duplicated in words beside
// it, and it measures 3.46:1 on the light card.
const GRAPHICAL = ['.allo-tree-memory-compare-arrow'];

for (const [label, view, band, theme] of SURFACES) {
  test(`decides the contrast axe left open on ${label}`, async ({ page }) => {
    await page.goto(`${harness.url}/__harness`);
    await page.evaluate(({ view, band, theme }) => {
      const w = window as any, E = w.__alloTreeLabEngine;
      const sp = E.speciesById('oak');
      let t = E.newTree('oak');
      for (let i = 0; i < 40; i += 1) t = E.simulateYear(t, sp, { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 }, E.normaliseAlloc());
      w.__mount({ treeLab: { view, bandOverride: band, tree: t, speciesId: 'oak', playing: false } });
      const ctx = w.__ctx;
      ctx.isDark = theme === 'dark';
      ctx.isContrast = theme === 'contrast';
      ctx.reduceMotion = true;
      w.__rerender();
    }, { view, band, theme });
    await page.waitForTimeout(1500);

    const nodes = await page.evaluate(async () => {
      const r = await (window as any).axe.run('.allo-tree-lab', { runOnly: { type: 'rule', values: ['color-contrast'] } });
      const out: any[] = [];
      for (const v of r.incomplete) for (const n of v.nodes) {
        const sel = n.target.join(' ');
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 4 || rect.height < 4) continue;
        const s = getComputedStyle(el);
        const rgba = (s.color.match(/[\d.]+/g) || []).map(Number);
        // Translucent ink cannot be judged against a sample of what is behind it.
        if (rgba.length > 3 && rgba[3] < 0.999) continue;
        const size = parseFloat(s.fontSize), weight = parseInt(s.fontWeight, 10) || 400;
        out.push({
          sel, color: rgba.slice(0, 3),
          large: size >= 24 || (size >= 18.66 && weight >= 700),
          x: Math.round(rect.left + window.scrollX + Math.min(rect.width / 2, 40)),
          y: Math.round(rect.top + window.scrollY + rect.height / 2),
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 34)
        });
      }
      return out;
    });
    // If axe ever resolves these itself the count drops to zero, and this spec would pass
    // while checking nothing. The suite that owns violations still covers that case.
    expect(nodes.length, 'nothing left incomplete to measure').toBeGreaterThan(20);

    // A full-page capture stitches the page while sticky and fixed elements stay pinned, so
    // a sampled pixel can come from a panel that was never behind that text. Pin nothing.
    await page.evaluate(() => {
      for (const el of [...document.querySelectorAll('.allo-tree-lab *')] as HTMLElement[]) {
        const p = getComputedStyle(el).position;
        if (p === 'sticky' || p === 'fixed') el.style.position = 'static';
      }
    });
    await page.addStyleTag({ content: '.allo-tree-lab *,.allo-tree-lab{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important}.allo-tree-lab svg text,.allo-tree-lab svg tspan{fill:transparent!important;stroke:none!important}' });
    await page.waitForTimeout(300);
    const png = readPng(await page.screenshot({ fullPage: true, animations: 'disabled', timeout: 180_000 }));

    const failures: string[] = [];
    for (const n of nodes) {
      if (n.x >= png.width || n.y >= png.height) continue;
      // The MEDIAN pixel of a small patch, not the worst one: a chip border is a single
      // white line in the high contrast theme, and a worst-pixel rule reads that border as
      // the background and reports white text on white. The median is what the glyph sits on.
      const patch: Array<[number, number, number]> = [];
      for (let dx = -3; dx <= 3; dx += 1) for (let dy = -3; dy <= 3; dy += 1) {
        const x = Math.min(png.width - 1, Math.max(0, n.x + dx));
        const y = Math.min(png.height - 1, Math.max(0, n.y + dy));
        patch.push(png.at(x, y));
      }
      patch.sort((a, b) => luminance(a) - luminance(b));
      const background = patch[Math.floor(patch.length / 2)];
      const worst = contrastRatio(n.color as [number, number, number], background);
      const worstPixel = background;
      const need = n.large ? 3 : 4.5;
      const graphical = GRAPHICAL.some(g => n.sel.includes(g));
      if (worst < (graphical ? 3 : need)) {
        failures.push(`${worst.toFixed(2)} < ${graphical ? 3 : need} · ${n.sel} · rgb(${n.color}) on rgb(${worstPixel}) · "${n.text}"`);
      }
    }
    expect(failures, `${label}: ${nodes.length} nodes measured`).toEqual([]);
  });
}
