/**
 * Tree Life Lab — the reader's own text spacing (WCAG 1.4.12).
 *
 * A reader may force line height to 1.5, letter spacing to 0.12em, word spacing to 0.16em and
 * paragraph spacing to 2em. Nothing may be lost when they do. Two places lost text here: the
 * hint under every tab label was one nowrap line with an ellipsis, so "Find the bottleneck"
 * became "Find the bottlen…", and the same was true of the chips in the knowledge check's
 * story strip. Both now wrap instead of truncating, which also removes a translation risk:
 * a longer word in another language was already being cut before this criterion applied.
 *
 * Leaf text elements only. A card with a decorative blob overflows its own box for reasons
 * that have nothing to do with type, and would drown the signal.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_treelab.js', toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1180, height: 1000 });
test.describe.configure({ timeout: 900_000 });
test.use({ viewport: { width: 1180, height: 1000 }, video: 'off', trace: 'off',
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

// WCAG 1.4.12: with these overrides applied by the reader, no content or function may be lost.
const SPACING = `.allo-tree-lab, .allo-tree-lab * {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}
.allo-tree-lab p { margin-bottom: 2em !important; }`;

const VIEWS = ['grow', 'chem', 'transport', 'spread', 'grove', 'compare', 'quiz'];

for (const view of VIEWS) {
  test(`keeps every word when the reader sets their own text spacing (${view})`, async ({ page }) => {
    await page.goto(`${harness.url}/__harness`);
    await page.evaluate((view) => {
      const w = window as any, E = w.__alloTreeLabEngine;
      const id = view === 'spread' ? 'aspen' : 'oak';
      const sp = E.speciesById(id); let t = E.newTree(id);
      for (let i = 0; i < 40; i++) t = E.simulateYear(t, sp, { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 }, E.normaliseAlloc());
      w.__mount({ treeLab: { view, bandOverride: 'g68', tree: t, speciesId: id, playing: false } });
      w.__ctx.reduceMotion = true; w.__rerender();
    }, view);
    await page.waitForTimeout(1400);
    const measure = () => {
      const out: any = { clipped: [], probe: '', pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      const first = document.querySelector('.allo-tree-lab p, .allo-tree-lab span') as HTMLElement | null;
      if (first) { const fs = getComputedStyle(first); out.probe = fs.letterSpacing + '/' + fs.lineHeight + '/' + fs.wordSpacing; }
      // Only leaf text elements: a card with a decorative blob overflows for reasons that
      // have nothing to do with type, and would drown the signal.
      const leaves = [...document.querySelectorAll('.allo-tree-lab p,.allo-tree-lab span,.allo-tree-lab strong,.allo-tree-lab b,.allo-tree-lab li,.allo-tree-lab label,.allo-tree-lab button,.allo-tree-lab h1,.allo-tree-lab h2,.allo-tree-lab h3,.allo-tree-lab h4,.allo-tree-lab td,.allo-tree-lab summary')] as HTMLElement[];
      for (const el of leaves) {
        const s = getComputedStyle(el);
        const clips = s.overflow !== 'visible' || s.overflowY !== 'visible' || s.textOverflow === 'ellipsis';
        if (!clips) continue;
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) {
          out.clipped.push({ cls: (el.className || '').toString().slice(0, 34), tag: el.tagName,
            sh: el.scrollHeight, ch: el.clientHeight, sw: el.scrollWidth, cw: el.clientWidth, text: text.slice(0, 28) });
        }
      }
      return out;
    };
    const before = await page.evaluate(measure);
    await page.addStyleTag({ content: SPACING });
    await page.waitForTimeout(600);
    const after = await page.evaluate(measure);
    // The overrides must actually be in force, or this spec proves nothing.
    expect(after.probe, 'text spacing did not apply').not.toBe(before.probe);
    expect(before.clipped, `${view}: text was already clipped before the overrides`).toEqual([]);
    expect(after.clipped.map((c: any) => `${c.tag}.${c.cls} "${c.text}" ${c.sw}x${c.sh} in ${c.cw}x${c.ch}`),
      `${view}: content lost under the reader's text spacing`).toEqual([]);
    expect(after.pageOverflow, `${view}: the page scrolls sideways under the overrides`).toBeLessThanOrEqual(1);
  });
}
