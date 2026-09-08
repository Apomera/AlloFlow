/**
 * WCAG contrast for the titration lab, in a real browser with the real stylesheet.
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
 * 1.7:1, and the "SDS Hazards" control at 2.4:1.
 *
 * THREE TRAPS, each of which produced a wrong answer before it was handled:
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
 *
 * Disabled controls are exempt under WCAG 1.4.3 and are reported separately rather
 * than failing the run.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000 });

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
  var PAGE = { r: 15, g: 23, b: 42, a: 1 };
  var out = [];
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

    var bg = null;
    for (var b2 = el; b2; b2 = b2.parentElement) {
      var c = parse(getComputedStyle(b2).backgroundColor);
      if (!c || c.a === 0) continue;
      bg = bg ? over(bg, c) : c;
      if (bg.a >= 0.999) break;
    }
    bg = bg ? over(bg, PAGE) : PAGE;

    var front = over({ r: fg.r, g: fg.g, b: fg.b, a: fg.a * mult }, bg);
    var lf = lum(front), lb = lum(bg);
    var hi = Math.max(lf, lb), lo = Math.min(lf, lb);
    var ratio = (hi + 0.05) / (lo + 0.05);
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
  return rows;
})()`;

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

for (const [name, state] of SURFACES) {
  test(`${name} — every text node meets WCAG AA`, async ({ page }) => {
    await harness.mount(page, { titrationLab: state }, undefined, { expectCanvas: false });
    // The bench and the reference animation both settle over a few frames.
    await page.waitForTimeout(1200);
    const rows = (await page.evaluate(AUDIT)) as Array<{
      text: string; ratio: number; need: number; size: number; weight: number;
      color: string; disabled: boolean;
    }>;
    const failures = rows.filter((r) => !r.disabled);
    const report = failures
      .map((r) => `  ${r.ratio}:1 (needs ${r.need}) ${r.size}px/${r.weight} ${r.color} — "${r.text}"`)
      .join('\n');
    expect(failures, `${name}: ${failures.length} text node(s) below WCAG AA\n${report}`).toEqual([]);
  });
}
