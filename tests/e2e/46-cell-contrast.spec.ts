import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Cell Biology Simulator — measured text contrast across its modes.
 *
 * WHY THIS EXISTS
 * Measured 2026-08-16, before the fixes this spec guards:
 *   - `text-slate-400` on white at 2.56:1, repeated 13 times — including the
 *     "Not explored" progress label, which is exactly the text a student scans to see
 *     what is left to do.
 *   - The mode chips draw their accent colour on a 9% tint of ITSELF when inactive, and
 *     white on the raw accent when active. Both sit near the threshold by construction,
 *     and three of the five accents fell under it: 3.63 / 4.42 / 4.42 inactive, and
 *     4.10 for white on sky-600.
 *   - The quiz score tick at 3.07:1 and a card caption at 4.26:1.
 *
 * NOTE FOR ANYONE EXTENDING THIS: the tool has no dark theme at all — it never reads
 * `isDark`. Both themes are still exercised below so that adding one cannot silently
 * ship an unreadable half; today the two runs simply measure the same thing.
 *
 * The measurement composites the background stack, skips gradient-painted elements
 * (their real backdrop is not in computed style) and skips emoji-only text (emoji
 * ignore CSS colour). Each of those, left out, produced a wrong table first.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cell.js',
  toolId: 'cell',
  width: 1280,
  height: 900,
  // Mandatory: without the compiled stylesheet every Tailwind colour class is inert
  // and the run measures the harness rather than the tool.
  appStyles: true,
  probes: `
    window.__parse = function (c) {
      var m = String(c).match(/[\\d.]+/g);
      return m ? { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 } : null;
    };
    window.__over = function (fg, bg) {
      var a = fg.a;
      return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
    };
    window.__lum = function (c) {
      var f = [c.r, c.g, c.b].map(function (v) {
        v = v / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
    };
    window.__bgStack = function (el) {
      var layers = [], node = el;
      while (node && node !== document.documentElement) {
        var cs = getComputedStyle(node);
        if (cs.backgroundImage && cs.backgroundImage !== 'none') return 'gradient';
        var c = window.__parse(cs.backgroundColor);
        if (c && c.a > 0) { layers.push(c); if (c.a >= 0.999) break; }
        if (node.id === 'wrap') break;
        node = node.parentElement;
      }
      if (!layers.length) return null;
      var base = layers[layers.length - 1];
      if (base.a < 0.999) return null;
      var out = base;
      for (var i = layers.length - 2; i >= 0; i--) out = window.__over(layers[i], out);
      return out;
    };
    window.__emojiOnly = function (s) {
      return !/[0-9A-Za-z\\u00C0-\\u024F\\u0400-\\u04FF\\u4E00-\\u9FFF]/.test(s);
    };
    window.__report = function () {
      var fails = [], checked = 0;
      [].slice.call(document.querySelectorAll('#wrap *')).forEach(function (el) {
        var text = (el.textContent || '').trim();
        if (!text || el.children.length || window.__emojiOnly(text)) return;
        var cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return;
        var r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        var bg = window.__bgStack(el);
        if (!bg || bg === 'gradient') return;
        var fgRaw = window.__parse(cs.color);
        if (!fgRaw) return;
        checked++;
        var fg = fgRaw.a < 0.999 ? window.__over(fgRaw, bg) : fgRaw;
        var lf = window.__lum(fg), lb = window.__lum(bg);
        var ratio = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
        var px = parseFloat(cs.fontSize) || 12;
        var bold = (parseInt(cs.fontWeight, 10) || 400) >= 700;
        var need = (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5;
        if (ratio < need - 0.01) {
          fails.push({ text: text.slice(0, 40), ratio: Number(ratio.toFixed(2)), need: need,
            px: Math.round(px), fg: cs.color,
            bg: 'rgb(' + [bg.r, bg.g, bg.b].map(Math.round).join(',') + ')',
            cls: String(el.className).slice(0, 60) });
        }
      });
      return { checked: checked, fails: fails };
    };
  `,
});

// One mode per kind of surface: the petri dish, the organelle interior (the densest
// panel set), the quiz card and the reference lists.
const MODES = ['observe', 'interior', 'quiz', 'encyclopedia'];
const FLOOR: Record<string, number> = { observe: 40, interior: 100, quiz: 40, encyclopedia: 100 };

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.describe.configure({ timeout: 200_000 });

for (const mode of MODES) {
  for (const dark of [false, true]) {
    const theme = dark ? 'dark' : 'light';
    test(`${mode} mode text meets WCAG AA in ${theme}`, async ({ page }) => {
      await harness.mount(page, { cell: { mode, isDark: dark, quizMode: mode === 'quiz' } },
        undefined, { expectCanvas: false });
      await page.waitForTimeout(900);
      const report = await page.evaluate(() => (window as any).__report());

      // Guard the guard: a mode that stops rendering its panels would otherwise pass
      // by measuring nothing.
      expect(report.checked,
        `${mode}/${theme}: only ${report.checked} text nodes resolved a background — the `
        + 'mode probably did not render, so this run measured nothing')
        .toBeGreaterThan(FLOOR[mode]);

      expect(report.fails,
        `${mode} mode, ${theme} theme:\n`
        + report.fails.map((f: any) => `  ${f.ratio}:1 (needs ${f.need}) ${f.px}px `
          + `"${f.text}" ${f.fg} on ${f.bg} — ${f.cls}`).join('\n')).toEqual([]);
    });
  }
}
