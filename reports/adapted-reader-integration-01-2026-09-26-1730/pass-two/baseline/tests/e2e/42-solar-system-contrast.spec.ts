import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Solar System — measured text contrast in BOTH themes.
 *
 * WHY THIS EXISTS
 * The tool themes carefully in places and not at all in others, and the gap is
 * invisible to every static check: the classes look deliberate either way. Measured
 * 2026-08-16, before the fixes this spec now guards:
 *   - Ten panel headers themed their TITLE (-300 dark / -700 light) and left the
 *     toggle beside it on a single -500 shade, failing in BOTH themes (1.93-4.27).
 *   - The progress tiles used slate-400 muted and green-500 earned, both chosen
 *     against the dark card: 2.45 and ~2.0 on the light one. A light-mode student
 *     could not read their own progress, least of all once they had earned it.
 *   - The magnetosphere badge glyph had no colour at all and inherited the host's.
 *
 * HOW IT MEASURES, and why the obvious version lies:
 *   - Backgrounds are COMPOSITED. A 0.6-alpha scrim over a dark page is not white,
 *     and treating it as white produced a confident, wrong table on the first pass.
 *   - Elements whose background never resolves to something opaque inside the tool
 *     are skipped: those depend on the host shell, not on this tool.
 *   - Elements painted with a background-image (gradient) are skipped: their real
 *     backdrop cannot be read from computed style, and counting them flagged a badge
 *     whose contrast was actually fine.
 *   - Emoji-only text is skipped: emoji ignore CSS colour, so a ratio is meaningless.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js',
  toolId: 'solarSystem',
  width: 1280,
  height: 1000,
  // Required: without the compiled stylesheet every Tailwind colour class is inert
  // and the whole measurement is of the harness, not the tool.
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
    window.__isEmojiOnly = function (s) {
      return !/[0-9A-Za-z\\u00C0-\\u024F\\u0400-\\u04FF\\u4E00-\\u9FFF]/.test(s);
    };
    window.__contrastFailures = function () {
      var fails = [], checked = 0, skipped = 0;
      [].slice.call(document.querySelectorAll('#wrap *')).forEach(function (el) {
        var text = (el.textContent || '').trim();
        if (!text || el.children.length || window.__isEmojiOnly(text)) return;
        var cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return;
        var r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        var bg = window.__bgStack(el);
        if (!bg || bg === 'gradient') { skipped++; return; }
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
          fails.push({ text: text.slice(0, 44), ratio: Number(ratio.toFixed(2)), need: need,
                       px: Math.round(px), fg: cs.color,
                       bg: 'rgb(' + [bg.r, bg.g, bg.b].map(Math.round).join(',') + ')',
                       cls: String(el.className).slice(0, 60) });
        }
      });
      return { checked: checked, skipped: skipped, fails: fails };
    };
  `,
});

// Panels are opened explicitly rather than left at their defaults: a collapsed panel
// contributes nothing to the sample, and the panels that had never been themed were
// exactly the ones a default mount does not show. A wrong answer is seeded so the
// explanation box, the vocabulary definition and the wrong-choice styling all render.
const SEED = {
  tutorialDismissed: true,
  selectedPlanet: 'stem.solar_sys.venus',
  quizAsked: ['Which planet is the hottest?'],
  showMoons: true,
  showWhatIf: true,
  showScale: true,
  showOrbital: true,
  showTimeline: true,
  showEscape: true,
  showLog: true,
  showVocab: true,
  vocabSelected: 'greenhouse effect',
  learningPath: 'tour_guide',
  quiz: {
    q: 'Which planet is the hottest?',
    a: 'Venus',
    opts: ['Mercury', 'Venus', 'Mars', 'Jupiter'],
    tip: 'Venus has a runaway greenhouse effect.',
    concept: 'greenhouse effect',
    wrongFeedback: { Mercury: 'Mercury is closer but has almost no atmosphere.' },
    answered: true, correct: false, chosen: 'Mercury', score: 1, streak: 0,
  },
};

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.describe.configure({ timeout: 200_000 });

for (const dark of [false, true]) {
  const theme = dark ? 'dark' : 'light';
  test(`text meets WCAG AA in ${theme} mode`, async ({ page }) => {
    await harness.mount(page, { solarSystem: Object.assign({ isDark: dark }, SEED) },
      undefined, { expectCanvas: false });

    const report = await page.evaluate(() => (window as any).__contrastFailures());

    // Guard the guard: a selector or stylesheet change that empties the sample would
    // otherwise make this pass without measuring anything.
    expect(report.checked,
      `${theme}: only ${report.checked} text nodes resolved a background — the harness `
      + 'probably lost its stylesheet, so this run measured nothing').toBeGreaterThan(150);

    expect(report.fails,
      `${theme} mode contrast failures:\n`
      + report.fails.map((f: any) => `  ${f.ratio}:1 (needs ${f.need}) ${f.px}px `
        + `"${f.text}" ${f.fg} on ${f.bg} — ${f.cls}`).join('\n')).toEqual([]);
  });
}
