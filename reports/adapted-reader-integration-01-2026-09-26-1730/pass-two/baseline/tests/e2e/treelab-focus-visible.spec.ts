/**
 * Tree Life Lab — is the keyboard focus indicator actually visible?
 *
 * A computed-style diff answers "does anything change on focus", and on every control here
 * something does. It does not answer "can a person see it": the light theme drew its ring in
 * #34d399, which measures 1.92:1 against white and 1.75:1 against the slate card, under the
 * 3:1 that a focus indicator needs against what sits next to it.
 *
 * So the ring is measured against the real page. Each control is focused to read the ring the
 * cascade actually gives it, then one capture of the unfocused page supplies the colour of the
 * pixels the ring will be drawn over — its own outline offset out from the control's edge.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, contrastRatio } from './helpers/png_pixels';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_treelab.js', toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1180, height: 1000 });
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
  ['Grove (light)', 'grove', 'g68', 'light'],
  ['Quiz (light)', 'quiz', 'g68', 'light'],
];

for (const [label, view, band, theme] of SURFACES) {
  test(`draws a focus ring you can see on ${label}`, async ({ page }) => {
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

    // Every focusable control that is on screen and not folded away, with the ring the
    // cascade gives it. Controls inside a closed disclosure cannot take focus at all, which
    // is why an earlier sweep of this same page reported them as having no indicator.
    const controls = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.allo-tree-lab button,.allo-tree-lab a[href],.allo-tree-lab select,.allo-tree-lab summary,.allo-tree-lab [tabindex="0"]')] as HTMLElement[];
      const out: any[] = [];
      for (const el of els) {
        if ((el as any).disabled || el.closest('details:not([open])')) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 12 || r.height < 12) continue;
        el.focus({ preventScroll: true } as any);
        if (document.activeElement !== el) continue;
        const s = getComputedStyle(el);
        const width = parseFloat(s.outlineWidth) || 0;
        const offset = parseFloat(s.outlineOffset) || 0;
        const rgb = (s.outlineColor.match(/[\d.]+/g) || []).map(Number).slice(0, 3);
        out.push({
          ring: s.outlineStyle !== 'none' && width >= 1 ? rgb : null,
          shadow: s.boxShadow !== 'none',
          // The middle of the ring: offset out from the border box, then half its width.
          probeX: Math.round(r.left + window.scrollX + r.width / 2),
          probeY: Math.round(r.top + window.scrollY - offset - width / 2),
          tag: el.tagName, text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 26)
        });
        el.blur();
      }
      return out;
    });
    expect(controls.length, 'no focusable controls found').toBeGreaterThanOrEqual(8);

    // One unfocused capture of the whole page: the ring is drawn over these pixels. Sticky
    // panels are un-pinned first, or a stitched capture paints them somewhere else.
    await page.evaluate(() => {
      for (const el of [...document.querySelectorAll('.allo-tree-lab *')] as HTMLElement[]) {
        const p = getComputedStyle(el).position;
        if (p === 'sticky' || p === 'fixed') el.style.position = 'static';
      }
      (document.activeElement as HTMLElement | null)?.blur();
    });
    await page.addStyleTag({ content: '.allo-tree-lab canvas{visibility:hidden!important}' });
    await page.waitForTimeout(250);
    const png = readPng(await page.screenshot({ fullPage: true, animations: 'disabled', timeout: 180_000 }));

    const weak: string[] = [];
    let measured = 0;
    for (const c of controls) {
      // A control with no outline may still be indicated by a shadow or a background change;
      // those are reported rather than measured, and there are none in this tool today.
      if (!c.ring) { if (!c.shadow) weak.push(`${label} · ${c.tag} "${c.text}": no focus ring at all`); continue; }
      if (c.probeY < 0 || c.probeY >= png.height || c.probeX < 0 || c.probeX >= png.width) continue;
      measured += 1;
      let worst = Infinity, worstPixel: number[] = [];
      for (let dx = -6; dx <= 6; dx += 3) {
        const px = png.at(Math.min(png.width - 1, Math.max(0, c.probeX + dx)), c.probeY);
        const ratio = contrastRatio(c.ring as [number, number, number], px);
        if (ratio < worst) { worst = ratio; worstPixel = px; }
      }
      if (worst < 3) {
        weak.push(`${label} · ${c.tag} "${c.text}": ring rgb(${c.ring}) on rgb(${worstPixel}) is ${worst.toFixed(2)}:1`);
      }
    }
    expect(measured, 'no rings measured').toBeGreaterThanOrEqual(8);
    expect(weak, `${measured} rings measured`).toEqual([]);
  });
}
