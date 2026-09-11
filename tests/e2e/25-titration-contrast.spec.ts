/**
 * WCAG contrast for the titration lab, in a real browser with the real stylesheet,
 * under all three host themes.
 *
 * WHY THIS EXISTS
 * Nothing checked this. `tests/titration_axe_a11y.test.js` disables colour-contrast on
 * purpose — jsdom has no stylesheet, so axe there would be grading unstyled text and
 * reporting nonsense — and its header says outright that contrast "has to be checked in
 * a real browser". `tests/titration_contrast.test.js` covers only the colours the tool
 * hard-codes in an inline style, and says so. Everything painted by a Tailwind utility,
 * which is most of the tool, was uncovered, and so was every case where an ancestor's
 * opacity multiplies a colour that is fine on its own.
 *
 * What that gap was hiding, found the first time this ran: the pre-lab safety briefing
 * — the gate every student passes through — had steps at 1.2:1, lab-map labels at
 * 1.7:1, the "SDS Hazards" control at 2.4:1, and an infinite opacity pulse on the PPE
 * cards that halved the contrast of the safety text underneath it.
 *
 * FIVE TRAPS, each of which produced a wrong answer before it was handled:
 *  1. SVG text is painted by `fill`. `color` is the inherited CSS default, i.e. black,
 *     and reading it reports every label in every chart in this tool as a 1.2:1
 *     failure. 192 phantom findings came from this alone.
 *  2. Source-over compositing must carry alpha through. Forcing the result to a:1
 *     makes two stacked translucent layers look opaque after one step, so the walk
 *     stops early on a ground that is not on screen — the SDS badge came out as red
 *     text on solid red, ratio exactly 1.00.
 *  3. A one-shot entrance animation legitimately passes through opacity 0, and under
 *     emulated reduced motion its duration collapses so it can be sampled anywhere on
 *     that ramp. Only a persistent dimming is a defect.
 *  4. A Tailwind `bg-gradient-to-*` is background-IMAGE, not background-color. A naive
 *     walk steps straight past it to whatever solid colour is behind, which can be
 *     wildly wrong in either direction (a sibling spec once reported 1.01:1 for a
 *     perfectly readable button this way; axe shares the blind spot). Skipping such
 *     elements is safe but blinds the audit to the whole safety briefing, whose four
 *     stations are gradients. So the stops are read out of the background-image and
 *     the text is graded against the WORST of them — every pixel of a gradient lies
 *     between its stops, so this is conservative, never generous. Only a gradient
 *     with no parseable stop is skipped, and it is counted.
 *  5. A run that measured nothing passes trivially, so each surface asserts a floor
 *     on the number of text nodes it actually graded.
 *
 * THEMES
 * GlHarness hardcodes isDark/isContrast false, so a browser test sees one theme unless
 * it rebuilds the host's wrapper itself: default = no wrapper; dark = the tool inside a
 * WHITE card (these tools are authored for a light substrate); contrast = no card, pure
 * black ground. This runs every surface under all three, which is where the tool's own
 * `ctx.isContrast ? … : …` branches actually get exercised.
 *
 * Disabled controls are exempt under WCAG 1.4.3 and are reported separately rather
 * than failing the run.
 */
import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000 });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_titration.js',
  toolId: 'titrationLab',
  width: 1200,
  height: 900,
  // The whole point: without the real stylesheet every ratio here would be fiction.
  appStyles: true,
});

const SURFACES: Array<[string, Record<string, unknown>]> = [
  ['safety briefing — suit up', { safetyChecked: false, safetyStation: 1 }],
  ['safety briefing — lab scan', { safetyChecked: false, safetyStation: 2, safetyChecks: { goggles: true, gloves: true, coat: true, shoes: true } }],
  ['safety briefing — chemicals', { safetyChecked: false, safetyStation: 3, safetyChecks: { goggles: true, gloves: true, coat: true, shoes: true } }],
  ['safety briefing — drill', { safetyChecked: false, safetyStation: 4, safetyChecks: { goggles: true, gloves: true, coat: true, shoes: true } }],
  // Paused so the countdown does not tick the state out from under the audit. This is
  // the surface the urgency pulse lived on: the question and its answers, under a timer.
  ['safety briefing — drill running', { safetyChecked: false, safetyStation: 4, safetyChecks: { goggles: true, gloves: true, coat: true, shoes: true }, drillActive: true, drillStartTime: 1, drillPaused: true, drillPausedTimeLeft: 12 }],
  ['titrate — start', { safetyChecked: true, labTab: 'titrate' }],
  ['titrate — near equivalence', { safetyChecked: true, labTab: 'titrate', volumeAdded: 24.9 }],
  ['titrate — past equivalence', { safetyChecked: true, labTab: 'titrate', volumeAdded: 30 }],
  ['titrate — weak acid', { safetyChecked: true, labTab: 'titrate', presetId: 'wa_sb', volumeAdded: 12 }],
  ['titrate — redox', { safetyChecked: true, labTab: 'titrate', presetId: 'redox_kmno4', volumeAdded: 3 }],
  ['challenge — graded', { safetyChecked: true, labTab: 'challenge', chMode: 'graded', gRun: 1, gVb: 10, gEyeCm: 8 }],
  ['challenge — quiz', { safetyChecked: true, labTab: 'challenge', chMode: 'quiz' }],
  ['safety drills', { safetyChecked: true, labTab: 'incidents' }],
  ['equipment', { safetyChecked: true, labTab: 'equipment' }],
  ['dilution', { safetyChecked: true, labTab: 'molarity' }],
  ['buffers — holding', { safetyChecked: true, labTab: 'buffers' }],
  ['buffers — failed', { safetyChecked: true, labTab: 'buffers', buffers: { ka: 1e-9, ratio: 0.06, log: [] } }],
];

const THEMES = ['default', 'dark', 'contrast'] as const;

const AUDIT = `(function () {
  var parse = function (c) {
    var m = String(c).match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    var p = m[1].split(/[,\\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] };
  };
  var over = function (f, b) {
    var a = f.a + b.a * (1 - f.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    return {
      r: (f.r * f.a + b.r * b.a * (1 - f.a)) / a,
      g: (f.g * f.a + b.g * b.a * (1 - f.a)) / a,
      b: (f.b * f.a + b.b * b.a * (1 - f.a)) / a,
      a: a
    };
  };
  var lum = function (c) {
    var ch = function (v) { var s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  };
  // The page behind everything. Under the theme wrapper the card or main carries its
  // own opaque colour, so the walk normally stops before reaching this.
  var PAGE = { r: 15, g: 23, b: 42, a: 1 };
  var out = [], measured = 0, skipped = 0;
  var all = document.querySelectorAll('#wrap *');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    var own = '';
    for (var k = 0; k < el.childNodes.length; k++) {
      var n = el.childNodes[k];
      if (n.nodeType === 3 && n.textContent.trim()) own += (own ? ' ' : '') + n.textContent.trim();
    }
    if (!own) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (el.closest('.sr-only')) continue;
    // Emoji and lone symbols are painted by the font in their own colours, so grading
    // them against the ground says nothing. Anything with a letter or digit stays in.
    if (!/[A-Za-z0-9\\u00C0-\\u024F]/.test(own)) continue;
    var cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    var box = el.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;

    var mult = 1, entering = false;
    for (var a = el; a && a !== document.body; a = a.parentElement) {
      var acs = getComputedStyle(a);
      var o = parseFloat(acs.opacity);
      if (!isNaN(o)) mult *= o;
      var names = acs.animationName;
      if (names && names !== 'none' && acs.animationIterationCount !== 'infinite'
          && /Enter|FadeUp|Pop|Glow$/i.test(names)) entering = true;
    }
    if (entering && mult < 0.999) continue;

    var isSvg = el.namespaceURI === 'http://www.w3.org/2000/svg';
    var paint = isSvg ? cs.fill : cs.color;
    if (isSvg && (!paint || paint === 'none')) continue;
    var fg = parse(paint);
    if (!fg) continue;
    if (isSvg && cs.fillOpacity) fg = { r: fg.r, g: fg.g, b: fg.b, a: fg.a * (parseFloat(cs.fillOpacity) || 1) };

    // Walk the ground. A gradient reached before the stack is opaque IS the ground;
    // it cannot be composited as one colour, but its stops can be read out of the
    // background-image string, and the WORST ratio across those stops is a sound
    // conservative grade — every pixel of the gradient lies between them. Only a
    // gradient with no parseable stop is skipped, and it is counted.
    var bg = null, stops = null;
    for (var b2 = el; b2; b2 = b2.parentElement) {
      var bcs = getComputedStyle(b2);
      var c = parse(bcs.backgroundColor);
      var img = bcs.backgroundImage;
      if (img && img !== 'none' && (!bg || bg.a < 0.999)) {
        var toks = img.match(/rgba?\\([^)]*\\)|#[0-9a-fA-F]{3,8}\\b/g) || [];
        stops = [];
        for (var t = 0; t < toks.length; t++) {
          var tok = toks[t], sc = null;
          if (tok[0] === '#') {
            var h = tok.slice(1);
            if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
            if (h.length === 6 || h.length === 8) sc = { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
          } else sc = parse(tok);
          if (sc) stops.push(sc);
        }
        break;
      }
      if (!c || c.a === 0) continue;
      bg = bg ? over(bg, c) : c;
      if (bg.a >= 0.999) break;
    }
    var grounds = [];
    if (stops) {
      if (!stops.length) { skipped++; continue; }
      for (var g2 = 0; g2 < stops.length; g2++) grounds.push(over(bg ? over(bg, stops[g2]) : stops[g2], PAGE));
    } else {
      grounds.push(bg ? over(bg, PAGE) : PAGE);
    }
    measured++;

    var ratio = Infinity;
    for (var g3 = 0; g3 < grounds.length; g3++) {
      var ground = grounds[g3];
      var front = over({ r: fg.r, g: fg.g, b: fg.b, a: fg.a * mult }, ground);
      var lf = lum(front), lb = lum(ground);
      var hi = Math.max(lf, lb), lo = Math.min(lf, lb);
      var rr = (hi + 0.05) / (lo + 0.05);
      if (rr < ratio) ratio = rr;
    }
    var size = parseFloat(cs.fontSize);
    var weight = parseInt(cs.fontWeight, 10) || 400;
    var need = (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3.0 : 4.5;
    if (ratio >= need) continue;
    // WCAG 1.4.3 exempts a control that is genuinely disabled.
    var ctl = el.closest('button, input, select, textarea');
    var disabled = !!(ctl && (ctl.disabled || ctl.getAttribute('aria-disabled') === 'true'));
    out.push({
      text: own.slice(0, 60), ratio: Math.round(ratio * 100) / 100, need: need,
      size: size, weight: weight, color: paint, disabled: disabled
    });
  }
  var seen = {}, rows = [];
  for (var r = 0; r < out.length; r++) {
    var key = out[r].text + '|' + out[r].color + '|' + out[r].ratio;
    if (seen[key]) continue;
    seen[key] = 1;
    rows.push(out[r]);
  }
  rows.sort(function (x, y) { return x.ratio - y.ratio; });
  return { rows: rows, measured: measured, skipped: skipped };
})()`;

type Row = { text: string; ratio: number; need: number; size: number; weight: number; color: string; disabled: boolean };
type Audit = { rows: Row[]; measured: number; skipped: number };

/** Rebuild the host's per-theme wrapper, which the harness does not provide. */
async function installThemeSwitch(page: Page) {
  await page.evaluate(() => {
    const wrap = document.getElementById('wrap') as HTMLElement;
    const main = document.createElement('main');
    wrap.parentNode!.insertBefore(main, wrap);
    main.appendChild(wrap);
    const card = document.createElement('div');
    main.insertBefore(card, wrap);
    card.appendChild(wrap);
    (window as any).__setTheme = (t: string) => {
      const ctx = (window as any).__ctx;
      ctx.isDark = t === 'dark';
      ctx.isContrast = t === 'contrast';
      ctx.theme = t;
      main.className = t === 'default' ? '' : 'theme-' + t;
      card.setAttribute('style', t === 'dark'
        ? 'background:#ffffff;color:#0f172a;color-scheme:light;padding:10px;border-radius:10px'
        : (t === 'contrast' ? 'background:#000000;color:#ffffff;padding:10px' : ''));
      (window as any).__rerender();
    };
  });
}

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

for (const [name, state] of SURFACES) {
  test(`${name} — every text node meets WCAG AA in all three themes`, async ({ page }) => {
    await harness.mount(page, { titrationLab: state }, undefined, { expectCanvas: false });
    await installThemeSwitch(page);
    const coverage: string[] = [];
    for (const theme of THEMES) {
      await page.evaluate((t) => (window as any).__setTheme(t), theme);
      // The bench and the reference animation both settle over a few frames.
      await page.waitForTimeout(900);
      const audit = (await page.evaluate(AUDIT)) as Audit;
      // A surface that rendered nothing must not sail through. The sparsest surface,
      // the lab-map station, carries 22 measurable text nodes; a broken mount has 0.
      expect(audit.measured,
        `${name} [${theme}]: only ${audit.measured} text nodes were measurable (${audit.skipped} on unparseable gradients)`)
        .toBeGreaterThanOrEqual(15);
      const failures = audit.rows.filter((r) => !r.disabled);
      const report = failures
        .map((r) => `  ${r.ratio}:1 (needs ${r.need}) ${r.size}px/${r.weight} ${r.color} — "${r.text}"`)
        .join('\n');
      expect(failures, `${name} [${theme}]: ${failures.length} text node(s) below WCAG AA\n${report}`).toEqual([]);
      coverage.push(`${theme}: ${audit.measured} measured, ${audit.skipped} skipped`);
    }
    test.info().annotations.push({ type: 'coverage', description: coverage.join(' · ') });
  });
}
