#!/usr/bin/env node
/*
 * check_stem_layout_defects.cjs
 *
 * Finds the layout bugs that every other gate in this repo is blind to.
 *
 *   node dev-tools/check_stem_layout_defects.cjs stem_lab/stem_tool_pets.js
 *   node dev-tools/check_stem_layout_defects.cjs stem_lab/stem_tool_pets.js --states='[{"view":"welfare"},{"view":"lifespan"}]'
 *   node dev-tools/check_stem_layout_defects.cjs --all            # every tool, default view
 *   node dev-tools/check_stem_layout_defects.cjs --all --deep     # …and walk each tool's tabs
 *   node dev-tools/check_stem_layout_defects.cjs <file> --json    # machine-readable
 *
 * WHY THIS EXISTS. On 2026-09-03 the Pets Lab shipped a bar chart that drew
 * NOTHING: each bar was `height: <pct>%` inside a column whose own height was
 * `auto`, and a percentage height against an auto-height parent resolves to
 * auto, so all six bars collapsed to their 2px minHeight. The readout said 488
 * descendants while the picture said nothing happened. That file parsed, passed
 * `node --check`, passed check_stem_render, passed axe with zero violations,
 * and passed all 297 of its own unit tests. Only a screenshot showed it.
 *
 * The same session found four more of the same family, none caught by anything:
 *   - view chrome painted on the host's white card (invisible cream-on-white)
 *   - two absolutely-positioned overlays pinned to the same corner
 *   - SVG <text> running off the edge of its own canvas
 *   - `rx` on a rect inside preserveAspectRatio="none" (stretched blob corners)
 *
 * So this gate measures GEOMETRY after a real render, which is the only place
 * these are visible. It is deliberately conservative: every detector reports a
 * concrete measured number, and REVIEW-grade heuristics are kept out.
 *
 * ★A SIXTH DETECTOR, 2026-09-05: `clipped-text` — the HTML analogue of the SVG
 * one. A label that does not fit its own overflow:hidden box is cut with no
 * ellipsis, no scrollbar and no error; the reader just sees a word end
 * mid-stroke. Deliberately narrow: overflow auto/scroll, text-overflow:ellipsis
 * and -webkit-line-clamp are all AFFORDANCES that announce the cut, and form
 * controls scroll their own value, so none of them are reported. Calibrated on
 * a four-box fixture (one real cut + those three affordances): it reports the
 * cut and stays silent on the rest, and nine sampled tools read 0. The fixture
 * is kept for re-calibration:
 *   node dev-tools/check_stem_layout_defects.cjs dev-tools/fixtures/clipped_text_fixture.js
 * must report exactly ONE clipped-text finding.
 *
 * ★★★A CLOSED <details> STILL HAS LAYOUT BOXES, 2026-09-05. Chromium gives the
 * collapsed subtree content-visibility:hidden — painting is skipped, geometry is
 * NOT — so getBoundingClientRect() returns real rects for content no reader can
 * see, and every geometry detector believed them. universe reported 72
 * light-ink findings in the dark sweep; with closed disclosures skipped it
 * reports ZERO. watercycle's "row overflows the column by 40px" was inside a
 * shut <details> too. invisible() now skips closed-<details> subtrees (but not
 * their <summary>, which IS painted) and anything with content-visibility:hidden.
 * ★The tell: Playwright's own actionability check calls these elements not
 * visible while getBoundingClientRect() hands you a box. When two instruments
 * disagree about the same element, one of them is measuring the wrong thing.
 *
 * ★A FOURTH AXIS, 2026-09-05: viewport width (--narrow = 768x1024, or
 * --viewport=WxH). Every sweep before this ran at 1280x1000, a teacher's laptop;
 * students are on Chromebooks and tablets, and a narrow column is where overlap
 * and clipping actually happen. Detector 4, `overflows-tool-column`, is the one
 * that speaks this axis: content past EITHER edge of the slot with NO
 * scrollable ancestor (a wide table inside overflow-x:auto is the correct
 * pattern and is not reported). Fixture:
 *   node dev-tools/check_stem_layout_defects.cjs dev-tools/fixtures/overflow_column_fixture.js --narrow
 * must report exactly ONE overflows-tool-column finding.
 *
 * ★Calibrated against the known-bad blob before first use:
 *   git show f25a88533:stem_lab/stem_tool_pets.js > /tmp/broken.js
 *   node dev-tools/check_stem_layout_defects.cjs /tmp/broken.js --states='[{"view":"welfare"}]'
 * must report the collapsed litter-math bars. A gate nobody has seen fail is
 * not a gate (see feedback_blind_gates / "calibrate on known-bad").
 *
 * KNOWN INTENTIONAL — verified by screenshot, do NOT "fix":
 *   money      overlay-collision — a stylised banknote draws the portrait
 *              initial in an oval with the name written across its lower edge.
 *              That is what a bill looks like.
 *   sourcebook light-ink-on-host-card — a large, deliberately faint "S"
 *              watermark, repeated once per view under --deep.
 *   (geo's disabled "Generate" button used to live here; the detector now skips
 *   anything disabled or aria-disabled, because WCAG 1.4.3 exempts inactive
 *   controls and authors dim them deliberately.)
 *
 * ★A WHOLE CLASS FOUND BY --contrast, 2026-09-04: `html:not(.theme-contrast)`.
 * Five tools (arccity, microbiology, nutritionLab, skatelab, throwlab) pinned a
 * fixed palette on their own root and tried to leave high-contrast mode to the
 * theme with that selector. It excluded NOTHING: stem_lab_module.js stamps
 * `theme-${theme}` on <main> (its own comment at ~102 says so), never on <html>,
 * so the negation matched in every theme and the pin overrode the contrast
 * palette. Arc City rendered #0f172a on #000000 — the entire tool, title and
 * all, at 1.05:1, and it alone accounted for 536 of the sweep's findings. The
 * fix is a plain root rule plus a `.theme-contrast <root>` rule that wins on
 * specificity. Same shape as the optics dead-hex selectors: a guard that reads
 * correctly, greps correctly, and never fires.
 *
 * ★A HOLE IN THE INSTRUMENT ITSELF, found 2026-09-04: this gate used to mount
 * only the FIRST registerTool() in a file. Nine files register more than one,
 * so rockCycle, geometryProver and fractions had never been rendered by it —
 * and "0 findings" on stem_tool_rocks.js looked exactly like a clean result.
 * Mounting every id turned up 97 contrast findings in rockCycle and 13 in
 * geometryProver. When a gate reports a count, check WHAT it counted: the
 * "N tool(s) rendered" line is the tell.
 *
 * ★★★A HARNESS THAT RENDERS LONGER TEXT THAN THE APP INVENTS LAYOUT BUGS. The
 * ctx stub's `t()` used to return the raw dotted key when a call site passed no
 * English fallback, so galaxy's "First stars" (11 chars) rendered as
 * "stem.galaxy.first_stars" (23) and two timeline markers 4 Gyr apart collided
 * at 78%. The keys resolve fine in the app — the packs carry them NESTED under
 * stem.galaxy.*, so a flat-key grep returns 0 and reads like they are missing.
 * The stub now humanises the last segment. Any stub that can return a
 * placeholder longer than the real value belongs on the false-positive list.
 *
 * ★★★A SINGLE-FILE --deep RUN AND A LAB-WIDE ONE DO NOT COVER THE SAME VIEWS.
 * DEEP_CAP is 30 alone and 12 under --all, and the walk dedupes by control
 * label, so neither pass is a superset of the other: one sweep found live
 * findings in decomposer and base10 views that per-tool runs had reported clean,
 * and — the other direction — magnetism reports 2 svg-text findings alone and 0
 * in all three axes of a full sweep, because its later controls sit past the
 * twelfth. Finish with --all --deep, not with a per-tool victory lap; but do not
 * read a sweep as a clean bill of health either.
 *   ★This paragraph existed BEFORE 2026-09-05 and I still burned an afternoon
 *   rediscovering it — a flakiness test, a contention test, a path-separator
 *   test — while debugging THIS FILE. Read the header before bisecting the code
 *   it describes. What made the fact actionable was not writing it down again
 *   but making the gate SAY it at runtime: every board now prints
 *   "N of M matched controls" per file, --deep-cap=N|all overrides the cap, and
 *   --only=<substr> runs the --all path over a subset so the two can be compared
 *   in one command instead of inferred.
 *
 * ★RUN IT IN BOTH THEMES. --dark is where the own-ground family lives, because
 * stem_lab renders every tool on a WHITE card in both themes. The first light
 * sweep found 154 findings; the first dark sweep found 517.
 *
 * As of 2026-09-04 the CONTRAST board is: 149 tools checked, ONE file with
 * findings — moneyMath's 18 overlay-collisions on the stylised banknote, which
 * is intentional. Zero dark-ink-on-contrast-surface lab-wide.
 * ★solarSystem's 13 "watermark overlaps" and galaxy's timeline collision were
 * BOTH the stub-t() artifact above, not tool defects. When two unrelated tools
 * show the same odd finding, suspect the harness before the tools.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const args = process.argv.slice(2);
const ALL = args.includes('--all');
// ★ --only=<substring> runs the --all CODE PATH over a subset. Added to bisect a
// real disagreement: magnetism reports 2 svg-text findings run on its own and 0
// inside a full sweep, both reproducibly. Restricting `--all` to just that file
// separates "the --all path measures differently" from "the browser is 84 files
// deep by then". Useful beyond that: re-checking one tool the way the board saw
// it, without a 25-minute run.
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').slice(7);
const DARK = args.includes('--dark');
const JSON_OUT = args.includes('--json');
const GATE = args.includes('--gate');
const DEEP = args.includes('--deep');
// ★ The THIRD theme. stem_lab wraps tools in a white card for light AND dark,
// but `contrast` deliberately keeps its pure-black surface (see the long comment
// in stem_lab_module.js: "a light card would fight it"). That INVERTS the
// own-ground failure: an unpainted tool inherits BLACK, so it is DARK ink that
// disappears there, not light.
const CONTRAST = args.includes('--contrast');
// ★ Under --contrast the host's own `.theme-contrast` rules are injected too
// (2026-09-05). app_styles_module.js recolours p/span/div/li/label/h1-h6/
// summary/legend/... to #ffff00 and paints every bg-* utility black; a tool
// whose dark utility ink lands on the black surface is rescued by those rules
// in production. Measuring without them reported 148 dark-ink sites across
// 50 tools on 2026-09-04, most of them phantom. What survives the host CSS is
// the real class: !important pins, inline styles, dead `html:not(...)` guards.
// --no-host-css reproduces the palette-only measurement.
// Calibration: dev-tools/fixtures/contrast_ink_fixture.js must report ONE
// finding with host CSS and FOUR without.
const HOST_CSS = CONTRAST && !args.includes('--no-host-css');
// ★ A FOURTH AXIS: viewport width. Every sweep before 2026-09-05 ran at
// 1280x1000, which is a teacher's laptop. Students are on Chromebooks and
// tablets, and a narrow column is where overlap and clipping actually
// happen — the same reason --contrast found a family nobody had seen.
// --narrow is 768x1024 (portrait tablet); --viewport=WxH sets any size.
const NARROW = args.includes('--narrow');
const vpArg = (args.find((a) => a.startsWith('--viewport=')) || '').slice(11);
const VIEWPORT = (function () {
  if (vpArg) {
    const m = /^(\d{2,5})x(\d{2,5})$/.exec(vpArg);
    if (!m) { console.error('bad --viewport (expected WxH, e.g. 768x1024)'); process.exit(2); }
    return { width: Number(m[1]), height: Number(m[2]) };
  }
  return NARROW ? { width: 768, height: 1024 } : { width: 1280, height: 1000 };
})();
// ★★★ A RESPONSIVE DEFECT LIVES IN A BAND, NOT AT A WIDTH, 2026-09-06.
// coding's header shoved six controls off the tool column, and it was invisible
// at BOTH widths this gate habitually sweeps: below 960px a media query wrapped
// the row correctly, and above ~1630px the row fits on one line. Only the middle
// broke. Had the toolbar needed 1200px instead of 1630px, neither 768 nor 1280
// would have caught it. skatelab is the same shape from the other direction —
// its markers overlap at 768 and 1024 but not at 800, 900 or 1280, because a
// sidebar reflow makes the timeline strip NARROWER at 1024 than at 768. Width
// is not monotonic, so two samples prove nothing about the range between them.
//
// --widths=768,1024,1280 measures each mounted view at every width inside ONE
// page build. Building the page (setContent + runtime + mount) is the expensive
// part and is paid once; a resize plus a re-probe is cheap, so a three-width
// band costs far less than three sweeps. Findings carry the widths they appear
// at, and the report names the widths where the same view was CLEAN — that gap
// is the band, and it is the whole point.
//
// ★CAVEAT: this RESIZES a page mounted at VIEWPORT.width. A component that reads
// its width only at mount will not re-render, so a finding seen only at a
// resized width should be confirmed with a dedicated --viewport=<W>x<H> run
// before it is treated as real. The reverse (a defect that a resize hides) is
// the reason --widths does not replace the routine per-width boards.
const widthsArg = (args.find((a) => a.startsWith('--widths=')) || '').slice(9);
const WIDTHS = widthsArg
  ? Array.from(new Set(widthsArg.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => n >= 200 && n <= 4000))).sort((a, b) => a - b)
  : [VIEWPORT.width];
if (widthsArg && !WIDTHS.length) {
  console.error('bad --widths (expected a comma list of pixel widths, e.g. 768,1024,1280)');
  process.exit(2);
}
// One re-mount per control, so this is the runtime knob. 30 covers the Pets
// Lab's 28 menu tiles; --all --deep is a long run by design.
// ★★★ THE SWEEP PROBES FEWER VIEWS THAN A SINGLE-FILE RUN. 12 under --all vs 30
// alone is a deliberate wall-clock tradeoff, but it silently means any tool with
// more than 12 top-level controls has its later views UNEXAMINED in every
// lab-wide board. That is exactly how magnetism reported 2 svg-text findings on
// its own and 0 in all three sweep axes: "Measurement lab" and "Magnetometer
// Hunt" sit past the twelfth control. A truncated measurement must never read as
// a clean one, so the cap is now (a) overridable with --deep-cap=N and (b)
// reported per file whenever it actually bites.
// ★ --settle-cap=N (ms) makes the animation wait testable. A hardcoded 1200ms
// cap cannot be distinguished from "long enough": when the light axis reported 4
// files measured mid-animation, the only way to learn whether their "clean" was
// real was to wait longer and compare.
const settleArg = (args.find((a) => a.startsWith('--settle-cap=')) || '').slice(13);
const SETTLE_CAP = settleArg ? Math.max(100, parseInt(settleArg, 10) || 1200) : 1200;
const capArg = (args.find((a) => a.startsWith('--deep-cap=')) || '').slice(11);
// `--deep-cap=all` probes every view. The first full-depth pass had to be a bash
// loop that read a file list and passed each tool's own total back in; the whole
// point of measuring coverage is to be able to close it in one command.
const DEEP_CAP = (capArg === 'all' || capArg === 'auto')
  ? Infinity
  : (capArg ? Math.max(1, parseInt(capArg, 10) || 0) : (ALL ? 12 : 30));
const toolArg = args.find((a) => !a.startsWith('--'));
const statesArg = (args.find((a) => a.startsWith('--states=')) || '').slice(9);
const stateArg = (args.find((a) => a.startsWith('--state=')) || '').slice(8);

if (!ALL && !toolArg) {
  console.error('usage: node dev-tools/check_stem_layout_defects.cjs <toolFile|--all> [--state=<json>] [--states=<json array>] [--dark] [--contrast [--no-host-css]] [--narrow|--viewport=WxH] [--widths=768,1024,1280] [--deep] [--json] [--gate] [--only=<substr> with --all] [--deep-cap=N|all] [--settle-cap=MS]');
  process.exit(2);
}

const read = (p) => fs.readFileSync(path.isAbsolute(p) ? p : path.join(ROOT, p), 'utf8');
const TW = path.join(ROOT, 'dev-tools', '.cache', 'sweep-tailwind.css');
if (!fs.existsSync(TW)) {
  console.error('Missing dev-tools/.cache/sweep-tailwind.css — build it with:');
  console.error('  node dev-tools/build_sweep_tailwind_css.cjs');
  process.exit(2);
}

// Same palette extraction the contrast instruments use: with --allo-stem-*
// undefined every var() falls back to a literal the app never renders, and the
// geometry can differ too (padding/size tokens). Instruments must agree.
function extractStemPalette() {
  const src = read('app_styles_module.js');
  const start = src.indexOf(':root, .theme-default {');
  if (start === -1) throw new Error('STEM palette block not found in app_styles_module.js');
  const anchor = src.indexOf('.theme-contrast {', start);
  if (anchor === -1) throw new Error('.theme-contrast block not found');
  const end = src.indexOf('}', src.indexOf('--allo-stem-button-border', anchor));
  if (end === -1) throw new Error('could not find the end of the .theme-contrast block');
  return src.slice(start, end + 1);
}

// Every rule in app_styles_module.js whose selector mentions `.theme-<theme>`,
// including its enclosing `@media screen { ... }` wrapper and multi-line
// selector lists. Rules with `${...}` interpolations (typography props) are
// skipped; none of the theme rules use them.
// ★★★ MEASURE THE SETTLED LAYOUT, NOT THE ENTRY ANIMATION. A CSS animation
// beats an inline style in the cascade, so while `arch-panel-in` runs,
// archstudio's onboarding panel loses the `translate(-50%,-50%)` that centres
// it and sits half a stage off — 56px past the tool column. The gate waited
// 450ms after mount, but that element only APPEARS once WebGL goes live, so its
// 0.2s animation started after the wait and was sampled 26% in. The finding was
// real for ~200ms and gone by the time a reader could see it.
// Waiting for running animations to finish (capped, because spinners and other
// infinite loops never do) is the difference between reporting a layout and
// reporting a frame of an animation.
// ★ Returns true when the 1200ms cap expired with animations STILL RUNNING —
// i.e. the measurement that follows is of a frame, not of a settled layout. The
// cap has to exist (infinite animations never finish), but an instrument that
// silently gives up and measures anyway is the exact failure this whole file has
// been chasing: "nothing went wrong" must not be spelled like "I stopped
// waiting". Callers surface it as a per-file caveat.
async function settle(page) {
  const gaveUp = await page.evaluate((cap) => {
    const running = (document.getAnimations ? document.getAnimations() : [])
      .filter((a) => a.playState === 'running' &&
        // An infinite animation never finishes; don't wait on it at all.
        !(a.effect && a.effect.getTiming && a.effect.getTiming().iterations === Infinity));
    if (!running.length) return false;
    return Promise.race([
      Promise.all(running.map((a) => a.finished.catch(() => {}))).then(() => false),
      new Promise((r) => setTimeout(() => r(true), cap))
    ]);
  }, SETTLE_CAP);
  // Two settled frames after the animations, for the same reason as before: a
  // style read taken mid-flush can mix values across elements.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return gaveUp;
}

// Measure the CURRENTLY MOUNTED view at every width in the band. With a single
// width (the default) this is byte-for-byte the old single probe: no resize, no
// extra wait, no `w` field on the findings — so every calibrated baseline holds.
async function probeWidths(page) {
  const out = [];
  const band = WIDTHS.length > 1;
  for (const w of WIDTHS) {
    if (band) {
      await page.setViewportSize({ width: w, height: VIEWPORT.height });
      // A resize reflows and may restart a transition; settle before reading,
      // for the same reason the mount path does.
      await page.waitForTimeout(160);
      await settle(page);
    }
    const found = await page.evaluate(PROBE, CONTRAST);
    found.forEach((f) => { if (band) f.w = w; out.push(f); });
  }
  if (band && WIDTHS[WIDTHS.length - 1] !== VIEWPORT.width) {
    // Re-mounts happen at VIEWPORT.width; leaving the page at the last band
    // width would silently move the goalposts for the next view.
    await page.setViewportSize(VIEWPORT);
    await page.waitForTimeout(120);
  }
  return out;
}

function extractHostThemeRules(theme) {
  const src = read('app_styles_module.js');
  const needle = '.theme-' + theme;
  const out = [];
  let i = 0;
  while ((i = src.indexOf(needle, i)) !== -1) {
    let start = src.lastIndexOf('\n', i) + 1;
    // A selector list may continue from previous lines that end with a comma.
    for (;;) {
      const prevStart = src.lastIndexOf('\n', start - 2) + 1;
      const prevLine = src.slice(prevStart, start).trim();
      if (start > 0 && prevLine.endsWith(',')) start = prevStart; else break;
    }
    let depth = 0, opened = false, j = start;
    for (; j < src.length; j++) {
      const c = src[j];
      if (c === '{') { depth++; opened = true; }
      else if (c === '}') { depth--; if (opened && depth === 0) { j++; break; } }
      else if (c === '`' && !opened) { break; }
    }
    const rule = src.slice(start, j).trim();
    // Skip needles inside JS or CSS comments and anything implausibly large.
    if (opened && !/^(\/\/|\/\*|\*)/.test(rule) && !rule.includes('${') && rule.length < 20000) out.push(rule);
    i = Math.max(j, i + needle.length);
  }
  return out.join('\n');
}

// ── Static lint: rx on a rect inside a non-uniformly scaled SVG ───────────
// `preserveAspectRatio: 'none'` scales x and y independently, and `rx` is in
// x-user-units while `ry` is in y-user-units. A bare `rx` therefore becomes an
// ellipse as wide as the scale ratio — the Pets Lab's commitment timeline drew
// a 52px-by-8px "corner" on a 16px-tall bar and read as two grey smudges.
function lintNonUniformRx(source, file) {
  const out = [];
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (!/preserveAspectRatio:\s*'none'/.test(lines[i])) continue;
    for (let j = i; j < Math.min(lines.length, i + 60); j += 1) {
      const line = lines[j];
      if (!/h\('rect'/.test(line)) continue;
      if (!/\brx:\s*[\d.]/.test(line)) continue;
      if (/\bry:/.test(line)) continue;
      out.push({
        kind: 'nonuniform-rx',
        file: file,
        line: j + 1,
        detail: 'rect has rx but no ry inside preserveAspectRatio="none" — the corner scales to an ellipse',
        snippet: line.trim().slice(0, 120)
      });
    }
  }
  return out;
}

const SHELL = `
window.__mount = function (id, dark, state, contrast) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry[id];
  if (!cfg) {
    var ks = Object.keys(window.StemLab._registry);
    if (ks.length === 1) { id = ks[0]; cfg = window.StemLab._registry[id]; }
  }
  if (!cfg) return 'not-registered:' + id;
  var Host = function () {
    var init = {}; init[id] = state || {};
    var pair = React.useState(init);
    function update(tool, key, value) {
      pair[1](function (old) {
        var nt = Object.assign({}, old[tool] || {});
        nt[key] = typeof value === 'function' ? value(nt[key]) : value;
        var n = Object.assign({}, old); n[tool] = nt; return n;
      });
    }
    function updateMulti(tool, patch) {
      pair[1](function (old) {
        var n = Object.assign({}, old); n[tool] = Object.assign({}, old[tool] || {}, patch); return n;
      });
    }
    var ctx = { React: React, toolData: pair[0], setToolData: pair[1],
      theme: contrast ? 'contrast' : (dark ? 'dark' : 'light'),
      isDark: !!dark, isContrast: !!contrast, gradeBand: 'g68', gradeLevel: '7th Grade',
      setStemLabTool: function(){}, setStemLabTab: function(){}, setToolSnapshots: function(){},
      addToast: function(){}, announceToSR: function(){}, awardXP: function(){},
      beep: function(){}, celebrate: function(){}, canvasNarrate: function(){},
      canvasA11yDesc: function(){}, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, stemLabTab: 'explore', stemLabTool: null,
      toolSnapshots: [], props: {}, srOnly: {},
      update: update, updateMulti: updateMulti, setLabToolData: pair[1],
      labToolData: pair[0],
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      // ★ A missing fallback must not become a 26-character label. Returning the
      // raw dotted key made galaxy's cosmic-timeline markers four times their
      // real width, and two of them then "collided" at 78% — a geometry finding
      // manufactured entirely by the stub. The keys resolve fine in the app
      // (packs carry stem.galaxy.first_stars = "First stars"), so humanise the
      // last segment instead: same order of magnitude as the real string.
      t: function (k, fb) {
        if (fb != null) return fb;
        if (typeof k === 'string' && k.indexOf('.') > 0) {
          var last = k.split('.').pop().replace(/_/g, ' ');
          return last.charAt(0).toUpperCase() + last.slice(1);
        }
        return k;
      }, getXP: function () { return 0; } };
    var rendered;
    try { rendered = cfg.render(ctx); } catch (e) { return React.createElement('div', null, 'threw: ' + e.message); }
    // Mirror the host's TWO layers: dark shell, white tool card. A harness that
    // paints a dark ground behind the tool hides the whole own-ground class.
    if (contrast) {
      // Mirror the host: contrast renders the tool straight onto pure black.
      return React.createElement('div', {
        style: { background: '#000000', color: '#ffffff', padding: 10 }
      }, rendered);
    }
    return React.createElement('div', {
      className: dark ? 'dark' : '',
      style: { background: dark ? '#0f172a' : '#ffffff', color: dark ? '#e2e8f0' : '#0f172a', padding: dark ? 10 : 8 }
    }, dark
      ? React.createElement('div', {
          'data-stem-tool-surface': 'probe',
          style: { background: '#ffffff', color: '#0f172a', borderRadius: 10, padding: 10 }
        }, rendered)
      : rendered);
  };
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return id;
};`;

// ── In-page detectors ────────────────────────────────────────────────────
const PROBE = function (CONTRAST) {
  const findings = [];
  const slot = document.getElementById('slot');
  const area = (r) => Math.max(0, r.width) * Math.max(0, r.height);

  function label(el) {
    const tag = el.tagName.toLowerCase();
    const cls = (el.getAttribute && el.getAttribute('class') || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 48);
    return tag + (cls ? '.' + cls : '') + (txt ? ' “' + txt + '”' : '');
  }

  // 1. COLLAPSED PERCENTAGE-HEIGHT BOX.
  // A box asking for a real share of its parent that renders as a hairline is
  // either a percentage against an auto-height parent, or a bar with no data.
  // Both are worth a look; the measured numbers say which.
  // ★★★ THE SPECIFIED HEIGHT LIVES IN THE CLASS LIST TOO, 2026-09-06. This
  // detector read `el.style.height` — the INLINE style — and nothing else, so
  // `h-full` (364 uses across the lab), `h-1/2` and `h-[28%]` were invisible to
  // it for as long as it existed. Computed style is no help: it returns the
  // USED px value, never the specified percentage. So the specified value is
  // read from the inline style first and the Tailwind utility second.
  function specifiedPct(el) {
    const inline = el.style && el.style.height;
    if (inline && /%$/.test(inline)) return { pct: parseFloat(inline), src: inline };
    for (const c of el.classList) {
      let m;
      if (c === 'h-full') return { pct: 100, src: 'h-full' };
      if ((m = /^h-(\d+)\/(\d+)$/.exec(c))) return { pct: 100 * Number(m[1]) / Number(m[2]), src: c };
      if ((m = /^h-\[(\d+(?:\.\d+)?)%\]$/.exec(c))) return { pct: Number(m[1]), src: c };
    }
    return null;
  }
  // A parent whose own height is DEFINITE is doing what it was told. Inline
  // px/rem/vh, or a Tailwind fixed-height utility (h-40, h-[320px], h-screen,
  // h-px) — and h-full/fraction on the parent too, since that resolves against
  // ITS parent and is the same question one level up, not this one.
  function definiteHeight(el) {
    if (el.style && el.style.height) return true;
    for (const c of el.classList) {
      if (/^h-(\d+(\.\d+)?|px|screen|full|svh|lvh|dvh|min|max|fit|\[[^\]]+\]|\d+\/\d+)$/.test(c)) return true;
    }
    return false;
  }
  slot.querySelectorAll('*').forEach((el) => {
    const spec = specifiedPct(el);
    if (!spec) return;
    const inline = spec.src;
    const pct = spec.pct;
    if (!(pct > 5)) return;
    const r = el.getBoundingClientRect();
    if (r.height > 3 || r.width < 6) return;
    const parent = el.parentElement;
    if (!parent) return;
    // ★Two guards, both learned from real false positives in the lab-wide run:
    //  - a parent WITH a definite height is doing what it was told; flightsim's
    //    3px progress fills inside a 3px inline-height track are correct.
    //  - a parent that is itself ≤8px tall had no room to give, so the child
    //    being short says nothing.
    if (definiteHeight(parent)) return;
    // ★ NO flex/grid-parent guard. A first cut skipped them on the theory that
    // a flex parent stretches its child anyway — true only under the default
    // `align-items: stretch`, and a bar chart is `flex items-end` with
    // `height: 60%` bars, which is THE motivating case. The guard silenced
    // three of the known-bad blob's seven findings (7 -> 4) and bought nothing:
    // a genuinely stretched child is taller than 3px and already silent.
    if (invisible(el)) return;
    const pr = parent.getBoundingClientRect();
    if (pr.height < 8) return;
    findings.push({
      kind: 'collapsed-percent-height',
      detail: 'asks for ' + inline + ' of a ' + pr.height.toFixed(0) + 'px parent but renders ' +
        r.height.toFixed(1) + 'px tall — a % height against an auto-height parent resolves to auto',
      el: label(el),
      parent: label(parent)
    });
  });

  // 2. SVG <text> DRAWN OUTSIDE ITS OWN CANVAS.
  // ★ MEASURE SCREEN RECTS, NOT getBBox(). getBBox returns the box in the
  // element's OWN user space, before its transform and before the viewBox
  // mapping — so a rotated y-axis label and a legend inside a translated <g>
  // both looked like they left the canvas when epidemic renders them perfectly.
  // getBoundingClientRect() is post-transform and directly comparable to the
  // <svg>'s own rect, which is the thing that actually clips.
  slot.querySelectorAll('svg').forEach((svg) => {
    const cs = getComputedStyle(svg);
    if (cs.overflow === 'visible') return; // nothing is clipped; not a defect
    const sr = svg.getBoundingClientRect();
    if (!sr.width || !sr.height) return;
    const scaleX = sr.width / (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width
      ? svg.viewBox.baseVal.width : sr.width);
    svg.querySelectorAll('text').forEach((t) => {
      const r = t.getBoundingClientRect();
      if (!r.width || !r.height) return;
      // ★★★ A RECT AROUND TEXT IS THE EM BOX, NOT THE INK. It includes the
      // font's internal leading, which is empty. For a label rotated -90 that
      // empty band becomes HORIZONTAL, so a y-axis title can overhang its canvas
      // by a couple of px with no glyph anywhere near the edge: magnetism's
      // "y position" measured 17px thick at an 11px font and reported a 2.6px
      // left clip that cut nothing. Canvas TextMetrics gives the real ink
      // extent, so the leading can be discounted instead of guessed at.
      // ★The slack applies ONLY to the axis PERPENDICULAR to the text run —
      // along the run, an overhang really is a cut-off glyph. Widening the raw
      // threshold instead would have hidden exactly that.
      const inkSlack = (function () {
        try {
          // ★ Single-line only. A <text> with stacked <tspan> lines measures as
          // ONE line in canvas but occupies several in the rect, which would
          // inflate the slack and start excusing real clipping. Untested case,
          // so it gets no slack rather than a guess.
          if (t.querySelector('tspan')) return { x: 0, y: 0 };
          const cs2 = getComputedStyle(t);
          const font = (cs2.fontStyle || 'normal') + ' ' + (cs2.fontWeight || '400') + ' ' +
            (cs2.fontSize || '10px') + ' ' + (cs2.fontFamily || 'sans-serif');
          window.__inkCanvas = window.__inkCanvas || document.createElement('canvas');
          const g = window.__inkCanvas.getContext('2d');
          g.font = font;
          const m = g.measureText(t.textContent || '');
          const ink = (m.actualBoundingBoxAscent || 0) + (m.actualBoundingBoxDescent || 0);
          if (!ink) return { x: 0, y: 0 };
          const thin = Math.min(r.width, r.height);
          const long = Math.max(r.width, r.height);
          // Only meaningful for a single line clearly longer than it is thick.
          if (long < thin * 1.5) return { x: 0, y: 0 };
          const slack = Math.max(0, (thin - ink) / 2);
          // Rotated (taller than wide) -> the empty band is horizontal.
          return r.height > r.width ? { x: slack, y: 0 } : { x: 0, y: slack };
        } catch (e) { return { x: 0, y: 0 }; }
      })();
      const over = [];
      if (r.right > sr.right + 1 + inkSlack.x) over.push('right by ' + (r.right - sr.right).toFixed(1));
      if (r.left < sr.left - 1 - inkSlack.x) over.push('left by ' + (sr.left - r.left).toFixed(1));
      if (r.bottom > sr.bottom + 1 + inkSlack.y) over.push('bottom by ' + (r.bottom - sr.bottom).toFixed(1));
      if (r.top < sr.top - 1 - inkSlack.y) over.push('top by ' + (sr.top - r.top).toFixed(1));
      if (!over.length) return;
      findings.push({
        kind: 'svg-text-outside-viewbox',
        detail: 'text is clipped by its own canvas — ' + over.join(', ') + ' CSS px' +
          (scaleX ? ' (~' + over.map((o) => (parseFloat(o.split('by ')[1]) / scaleX).toFixed(1)).join('/') + ' user units)' : ''),
        el: 'text “' + (t.textContent || '').trim().slice(0, 56) + '”'
      });
    });
  });

  // 3. TWO ABSOLUTELY-POSITIONED OVERLAYS PINNED TO THE SAME PLACE.
  // Anything the page has deliberately made invisible cannot collide with
  // anything. The 3D bay viewer parks every part label at opacity 0 until the
  // camera projects it, which made heatlab/nuclearlab/treelab look like they
  // had ten stacked callouts each.
  function invisible(el) {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) return true;
      // ★★★ A CLOSED <details> STILL HAS LAYOUT BOXES. Chromium gives the
      // collapsed subtree content-visibility:hidden, which skips PAINTING but
      // keeps geometry — so getBoundingClientRect() returns a real rect for
      // content no reader can see, and every geometry detector believes it.
      // watercycle's landing-choice row "overflowed the column by 40px" from
      // inside a shut disclosure. (Playwright's own actionability check calls
      // these elements not visible; that disagreement was the tell.)
      if (cs.contentVisibility === 'hidden') return true;
      if (n.tagName === 'DETAILS' && !n.open) {
        // <summary> is the one part of a closed <details> that IS painted.
        for (let m = el; m && m !== n; m = m.parentElement) {
          if (m.tagName === 'SUMMARY') return false;
        }
        return true;
      }
    }
    // Parked off-canvas until focused — the standard skip-link pattern
    // (transform: translateY(-180%)). dissection stacks two of them at the same
    // coordinates on purpose; only the focused one ever translates into view.
    //
    // ★★★ BUT "OUTSIDE THE SLOT" ALSO DESCRIBES THE WORST OVERFLOW THERE IS,
    // AND THIS CLAUSE WAS SWALLOWING IT. `r.left > sr.right` is true for a
    // skip-link parked to the right AND for any control shoved entirely past
    // the edge by a too-wide row — exactly what `overflows-tool-column` exists
    // to catch. coding's header spills seven buttons; the gate reported the ONE
    // that straddles the boundary (💾 Save, 2px over, left edge still inside)
    // and silently dropped 📂 Load, 📌 Pick, 🔇 Music, 🎨 FG at 65-262px over,
    // because those are wholly outside. **The worse the defect, the more
    // certainly it was invisible** — a detector inverted against itself.
    // Parked means MOVED BY A TRANSFORM; pushed means laid out there. Only the
    // former is deliberate, so only the former is invisible.
    const sr = slot.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const outside = r.bottom < sr.top || r.right < sr.left || r.top > sr.bottom || r.left > sr.right;
    if (!outside) return false;
    // ★ PARKED BY DISTANCE, 2026-09-06. The first 640px board reported three
    // skip links "9999px past the left edge" — the classic `left:-9999px`
    // park, which the transform clause below never sees. A real spill lands a
    // few hundred px out; nothing overflows by more than the column is wide
    // while sitting ENTIRELY outside it. Both halves matter: a 1500px table in
    // a 640px column spills 860px but starts inside, so it is still reported;
    // the overflow fixture's "Pushed clean off" control is entirely outside
    // but only ~40px away, so it is still reported too.
    const gap = Math.max(sr.left - r.right, r.left - sr.right, sr.top - r.bottom, r.top - sr.bottom);
    if (gap > sr.width) return true;
    for (let n = el; n && n !== slot.parentElement; n = n.parentElement) {
      const t = getComputedStyle(n).transform;
      if (t && t !== 'none') return true;
    }
    return false;
  }

  // 3. HTML TEXT CLIPPED BY AN overflow:hidden BOX.
  // The HTML analogue of detector 2. A label that does not fit its own box is
  // silently cut: no ellipsis, no scrollbar, no error - the reader just sees a
  // word end mid-stroke. Deliberately narrow, because truncation is often
  // intended and the affordances say so:
  //   - overflow auto/scroll   -> the reader can scroll to the rest
  //   - text-overflow: ellipsis -> the cut is announced by the "..."
  //   - -webkit-line-clamp      -> an explicit N-line clamp
  //   - <input>/<textarea>/<select> -> a caret scrolls the value
  // and it only judges leaf elements holding their own text, so a tall scroll
  // panel is not reported once per descendant.
  slot.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'svg' || el.namespaceURI === 'http://www.w3.org/2000/svg') return;
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'canvas') return;
    // Own text only: an element whose text lives in children is a container,
    // and the child is the thing that would actually be clipped.
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join('')
      .trim();
    // ★ \p{L}/\p{N}, not [A-Za-z0-9]: the ASCII form silently skipped clipped
    // Japanese, Arabic and Cyrillic labels in a lab that ships language packs.
    if (own.length < 2 || !/[\p{L}\p{N}]/u.test(own)) return;
    if (invisible(el)) return;
    const cs = getComputedStyle(el);
    // ★★★ CLIPPED BY AN ANCESTOR, 2026-09-06. This detector judged only an
    // element whose OWN overflow:hidden cuts its OWN text, so the commonest
    // Tailwind shape — a fixed-height `overflow-hidden` card cutting off the
    // paragraph inside it — was never measured, and `overflows-tool-column`
    // only sees spills past the SLOT edge, not an inner card edge. Walk up to
    // the nearest clipping ancestor; a scrollable box on the way wins (the
    // reader can reach the rest), a line-clamp announces the cut, and a
    // ~zero-height clipper is a collapsed panel, not clipped prose.
    if (cs.overflow !== 'hidden' && cs.overflowX !== 'hidden' && cs.overflowY !== 'hidden') {
      let clipper = null;
      for (let n = el.parentElement; n && n !== slot; n = n.parentElement) {
        const ns = getComputedStyle(n);
        if (/auto|scroll/.test(ns.overflowX + ns.overflowY)) return;
        if (ns.overflowX === 'hidden' || ns.overflowY === 'hidden' || ns.overflowX === 'clip' || ns.overflowY === 'clip') { clipper = n; break; }
      }
      if (!clipper) return;
      const ks = getComputedStyle(clipper);
      if (ks.webkitLineClamp && ks.webkitLineClamp !== 'none') return;
      if (clipper.clientWidth <= 2 || clipper.clientHeight <= 2) return;
      const er = el.getBoundingClientRect();
      if (er.width <= 2 || er.height <= 2) return;
      const kr = clipper.getBoundingClientRect();
      // ★ ONE DEFECT, ONE KIND. A box that also crosses the SLOT edge is
      // `overflows-tool-column`'s (it says "CUT OFF by an ancestor" there);
      // this branch owns clips at an INNER card edge only. Without the
      // partition the overflow fixture's clipped table reported twice (4 -> 6).
      const sr0 = slot.getBoundingClientRect();
      if (er.right > sr0.right + 2 || er.left < sr0.left - 2) return;
      // Padding box of the clipper: that is where painting stops.
      const padL = kr.left + clipper.clientLeft, padT = kr.top + clipper.clientTop;
      const padR = padL + clipper.clientWidth, padB = padT + clipper.clientHeight;
      const cutX = (ks.overflowX === 'hidden' || ks.overflowX === 'clip') ? Math.max(er.right - padR, padL - er.left) : 0;
      const cutY = (ks.overflowY === 'hidden' || ks.overflowY === 'clip') ? Math.max(er.bottom - padB, padT - er.top) : 0;
      if (cutX <= 2 && cutY <= 2) return;
      const axis = cutX > cutY ? 'horizontally by ' + Math.round(cutX) + 'px' : 'vertically by ' + Math.round(cutY) + 'px';
      findings.push({
        kind: 'clipped-text',
        detail: 'text is cut off ' + axis + ' by an ANCESTOR with overflow:hidden and no scrollbar — ' +
          'the box is ' + clipper.clientWidth + 'x' + clipper.clientHeight + ' and the text reaches ' +
          Math.round(er.right - padL) + 'x' + Math.round(er.bottom - padT) + ' inside it',
        el: label(el),
        parent: label(clipper)
      });
      return;
    }
    if (cs.textOverflow === 'ellipsis') return;
    if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') return;
    // sr-only / visually-hidden: a 1px clipped box is the whole point.
    const r = el.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2) return;
    // ★ GUARD THE CONTENT BOX TOO, NOT JUST THE BORDER BOX. anatomy's
    // `.anatomy-skip-link` is a textbook hidden-until-focused affordance
    // (width:1px;height:1px;overflow:hidden;clip-path:inset(50%), revealed on
    // :focus) and it reported "content 173x24 in a 0x0 box" — the rect guard
    // reads getBoundingClientRect while the message reads clientWidth, and
    // those are different boxes. A ~zero CONTENT box is the signature of a
    // hidden affordance, never of clipped prose; clientWidth/clientHeight are
    // also 0 for inline boxes, which cannot be clipped by overflow at all.
    if (el.clientWidth <= 2 || el.clientHeight <= 2) return;
    // 2px of slack absorbs sub-pixel layout noise; a real cut is bigger.
    const overX = cs.overflowX === 'hidden' ? el.scrollWidth - el.clientWidth : 0;
    const overY = cs.overflowY === 'hidden' ? el.scrollHeight - el.clientHeight : 0;
    if (overX <= 2 && overY <= 2) return;
    const axis = overX > overY ? 'horizontally by ' + overX + 'px' : 'vertically by ' + overY + 'px';
    findings.push({
      kind: 'clipped-text',
      detail: 'text is cut off ' + axis + ' by an overflow:hidden box with no ellipsis ' +
        'and no scrollbar — content ' + el.scrollWidth + 'x' + el.scrollHeight +
        ' in a ' + el.clientWidth + 'x' + el.clientHeight + ' box',
      el: label(el)
    });
  });

  // 4. CONTENT WIDER THAN THE TOOL'S OWN COLUMN.
  // The characteristic narrow-viewport defect, and invisible at 1280px: a fixed
  // min-width, a long unbroken string, or a rigid grid pushes past the right
  // edge of the slot. On a Chromebook that is a horizontal scrollbar on the
  // whole page, or content simply cut off at the card edge.
  // ★A wide table inside `overflow-x: auto` is the CORRECT pattern, not a
  // defect, so an element with a scrollable ancestor is skipped — only overflow
  // that actually reaches the slot is reported.
  (function () {
    const sr = slot.getBoundingClientRect();
    if (!sr.width) return;
    const worst = new Map();
    slot.querySelectorAll('*').forEach((el) => {
      if (el.namespaceURI === 'http://www.w3.org/2000/svg') return;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 4) return;
      // ★★★ THE LEFT EDGE WAS NEVER MEASURED, 2026-09-06. This detector read
      // `r.right - sr.right` and nothing else, so half of its own family was
      // invisible to it for as long as it existed. A left spill is the WORSE
      // half: a right spill at least produces a horizontal scrollbar, whereas in
      // an LTR page there is nothing to the left of the origin to scroll to, so
      // the content is simply gone. It also matters for the language packs — in
      // an RTL locale the overflow direction flips, and a right-only detector
      // reads clean on exactly the layouts most likely to break.
      const overRight = r.right - sr.right;
      const overLeft = sr.left - r.left;
      const over = Math.max(overRight, overLeft);
      if (over <= 2) return;
      if (invisible(el)) return;
      // What happens to the part that sticks out? Three different answers.
      // ★★★ CLIPPED IS NOT THE SAME AS CONTAINED. A first cut treated any
      // `overflow: hidden` ancestor as making the spill moot, which cleared
      // sourcebook's decorative ring correctly — and silently cleared
      // machineLab's energy-ledger TABLE and solarSystem's panel at the same
      // time. That is a false negative of the worst kind: tool cards are
      // routinely rounded `overflow-hidden` containers, so one blanket rule
      // blinds the detector to real overflow across an entire tool.
      //   • scrollable ancestor  → reachable, the correct pattern, silent.
      //   • clipping ancestor + DECORATIVE element → a deliberate bleed, silent.
      //     (sourcebook's aria-hidden ring at `-right-12`.)
      //   • clipping ancestor + CONTENT → REPORT. The columns past the edge are
      //     cut off with no way to scroll to them, which is worse than a
      //     scrollbar, not better.
      // ★ DO NOT STOP AT THE FIRST CLIP — KEEP LOOKING FOR A SCROLLER. A clipping
      // box nested inside a scrolling one is still reachable: magnetism's
      // station tabs each carry `overflow:hidden` (their labels truncate with
      // `text-overflow: ellipsis`, which is correct), and breaking on that
      // `hidden` meant never discovering whether the tab STRIP scrolls. Scroll-
      // ability anywhere up the chain wins, so walk the whole chain and let
      // `scrollable` override `clipped` regardless of which comes first.
      let scrollable = false, clipped = false;
      for (let n = el.parentElement; n && n !== slot.parentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        const ox = cs.overflowX, oy = cs.overflow;
        if (ox === 'auto' || ox === 'scroll' || oy === 'auto' || oy === 'scroll') { scrollable = true; break; }
        if (ox === 'hidden' || ox === 'clip' || oy === 'hidden' || oy === 'clip') clipped = true;
      }
      if (scrollable) return;
      if (clipped) {
        // ★ DECORATIVE MEANS "CARRIES NO TEXT", NOT "aria-hidden". An earlier
        // version also treated an `aria-hidden` ancestor as proof of decoration.
        // skatelab disproves that: its phase-marker labels (START, RAMP, APEX,
        // CONTACT, PULSE END) live inside an `aria-hidden="true"` strip and are
        // very much visible text — aria-hidden says "not exposed to assistive
        // tech", which is not the same as "not seen". Clipping one of those
        // would have been silenced. The case that motivated the clause,
        // sourcebook's ring, is an empty bordered div, so the text test alone
        // already covers it and the risky clause buys nothing.
        // ★ "Carries text" must mean "carries a LETTER or a NUMBER". Dropping the
        // aria-hidden clause (rightly — skatelab's aria-hidden phase labels are
        // visible text) made rocks and spacecolony report their decorative
        // corner watermarks: `absolute -right-6 -top-8 text-8xl opacity-[.06]`
        // holding a single 🪨 / 🌍. An emoji is Unicode Symbol-other, so asking
        // for \p{L} or \p{N} drops watermarks while keeping every real label —
        // and unlike /[A-Za-z0-9]/ it does not go blind to Japanese or Arabic
        // prose, which matters in a lab that ships language packs.
        if (!/[\p{L}\p{N}]/u.test(el.textContent || '')) return;
      }
      // Fixed/sticky chrome is positioned against the viewport on purpose.
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.position === 'sticky') return;
      // Keep the OUTERMOST offender: a spilling row reports itself, not each
      // of its twelve cells.
      let redundant = false;
      for (let n = el.parentElement; n && n !== slot; n = n.parentElement) {
        if (worst.has(n)) { redundant = true; break; }
      }
      if (redundant) return;
      worst.set(el, { over: over, clipped: clipped, side: overRight >= overLeft ? 'right' : 'left' });
    });
    worst.forEach((info, el) => {
      findings.push({
        kind: 'overflows-tool-column',
        detail: 'extends ' + info.over.toFixed(0) + 'px past the ' + info.side + ' edge of the tool column ' +
          '(' + Math.round(sr.width) + 'px wide) and ' + (info.clipped
            ? 'is CUT OFF by an ancestor with overflow:hidden — the content past the edge ' +
              'cannot be reached by scrolling at all'
            : (info.side === 'left'
              ? 'has nowhere to go — an LTR page cannot be scrolled to the left of its own ' +
                'origin, so this content is unreachable rather than merely awkward'
              : 'is neither clipped nor scrollable — on a narrow screen this forces a ' +
                'page-wide sideways scroll')),
        el: label(el)
      });
    });
  })();

  const positioned = new Map();
  slot.querySelectorAll('*').forEach((el) => {
    if (getComputedStyle(el).position !== 'absolute') return;
    if (!(el.textContent || '').trim()) return;
    if (invisible(el)) return;
    // ★Visually-hidden text is SUPPOSED to be stacked in one clipped pixel.
    // galaxy's six sr-only paragraphs produced six "100% overlap" findings on
    // markup that is exactly right.
    const own = el.getBoundingClientRect();
    if (own.width <= 3 || own.height <= 3) return;
    if (/\bsr-only\b|\bvisually-hidden\b/.test(el.getAttribute('class') || '')) return;
    const host = el.offsetParent || slot;
    // A full-bleed layer (inset:0 hit-target planes, scrims) overlaps every
    // chip inside it by definition. Those are layers, not collisions.
    const hr = host.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    if (area(hr) && area(er) / area(hr) > 0.8) return;
    if (!positioned.has(host)) positioned.set(host, []);
    positioned.get(host).push(el);
  });
  positioned.forEach((list) => {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        if (list[i].contains(list[j]) || list[j].contains(list[i])) continue;
        const a = list[i].getBoundingClientRect();
        const b = list[j].getBoundingClientRect();
        const ov = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
                   Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const smaller = Math.min(area(a), area(b));
        if (!smaller || ov / smaller < 0.4) continue;
        findings.push({
          kind: 'overlay-collision',
          detail: 'two absolutely-positioned overlays share ' + Math.round((ov / smaller) * 100) + '% of the smaller box',
          el: label(list[i]),
          parent: label(list[j])
        });
      }
    }
  });

  // 4. LIGHT INK LEFT ON THE HOST'S CARD.
  // stem_lab renders every tool on a WHITE card in both themes. A tool authored
  // for a dark ground must paint its own; wherever it does not, its cream/amber
  // inks land on white. The Pets Lab shipped 27 views whose back bar and <h2>
  // did exactly this at 1.09:1 — invisible, and axe scored it 0 because the
  // unpainted chain never resolves to a background axe will attribute.
  function parseRgb(s) {
    const m = /rgba?\(([^)]+)\)/.exec(s || '');
    if (!m) return null;
    const p = m[1].split(',').map((n) => parseFloat(n));
    if (p.length >= 4 && p[3] === 0) return null; // fully transparent
    return { r: p[0], g: p[1], b: p[2], a: p.length >= 4 ? p[3] : 1 };
  }
  function relLum(c) {
    const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  // ★ Composite the ALPHA. Reading only the nearest non-transparent
  // backgroundColor treats a 4%-alpha white wash as pure white: on the Pets
  // Lab care timeline that turned readable cream-on-espresso into six phantom
  // "1.10:1" findings. Layers are collected up to the first opaque ancestor
  // and folded bottom-up, which is how the pixel actually gets painted.
  function paintedBg(el) {
    const layers = [];
    let node = el;
    let base = null;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; // gradient/image — not measurable here
      // ★ …and the same on the pseudo-elements. birdlab paints its hero sky as
      // a ::before gradient, so reading only the element's own style walked
      // straight past it to a white ancestor and scored a perfectly legible
      // white-on-sky heading as 1.00:1.
      const before = getComputedStyle(node, '::before');
      const after = getComputedStyle(node, '::after');
      if ((before && before.backgroundImage && before.backgroundImage !== 'none') ||
          (after && after.backgroundImage && after.backgroundImage !== 'none')) return null;
      const bg = parseRgb(cs.backgroundColor);
      if (bg) {
        if (bg.a >= 0.999) { base = bg; break; }
        layers.push(bg);
      }
      node = node.parentElement;
    }
    if (!base) base = { r: 255, g: 255, b: 255, a: 1 };
    let out = base;
    for (let i = layers.length - 1; i >= 0; i -= 1) {
      const l = layers[i];
      out = {
        r: l.r * l.a + out.r * (1 - l.a),
        g: l.g * l.a + out.g * (1 - l.a),
        b: l.b * l.a + out.b * (1 - l.a),
        a: 1
      };
    }
    return out;
  }
  slot.querySelectorAll('*').forEach((el) => {
    let hasText = false;
    let own = '';
    el.childNodes.forEach((n) => {
      if (n.nodeType === 3 && n.textContent.trim()) { hasText = true; own += n.textContent; }
    });
    if (!hasText) return;
    // ★ EMOJI ARE A COLOUR FONT. They paint their own glyph colours and ignore
    // the CSS `color` property entirely, so measuring ink-vs-ground on a node
    // that is only emoji is meaningless. 290 of the 488 findings in the first
    // dark sweep were badge-icon grids (dna 156, molecule 143) whose emoji are
    // perfectly visible.
    // ★ \p{L}\p{N}, not [A-Za-z0-9]: the ASCII test also exempted every Greek
    // symbol a science lab paints with `color` (Δ, μ, Ω) and would go blind to
    // Japanese or Arabic prose outright. Same hole, same fix as the overflow
    // detector's decorative test.
    if (!/[\p{L}\p{N}]/u.test(own)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 6) return;
    if (invisible(el)) return;
    const cs = getComputedStyle(el);
    // ★★★ OPACITY IS PART OF THE INK, 2026-09-06. This detector read `color`
    // at full strength and never looked at `opacity`, so a slate-700 label
    // under `opacity-30` scored ~10:1 while the painted pixel is ~2:1. That is
    // a FALSE NEGATIVE in the one direction a contrast gate must not have:
    // dimmed-but-not-disabled text is the standard idiom for "muted", and
    // muted past 3:1 on white is simply unreadable. Fold the group alpha (the
    // product of every ancestor's opacity up to the slot) into the ink before
    // judging it. Disabled controls are still exempt below, as WCAG says.
    let alpha = 1;
    for (let n = el; n && n !== slot; n = n.parentElement) {
      const o = parseFloat(getComputedStyle(n).opacity);
      if (!Number.isNaN(o)) alpha *= o;
    }
    // ★ Two "painted over imagery" tells, where a DOM walk cannot answer and
    // guessing produces confident nonsense. birdlab's hero heading is white on
    // a sky gradient painted by a SIBLING layer below an absolutely-positioned
    // overlay: the walk reaches a white card and scores a perfectly legible
    // heading at 1.00:1. dev-tools/pixel_contrast_probe.cjs samples real
    // pixels and is the authority for anything over imagery — defer to it.
    if (cs.textShadow && cs.textShadow !== 'none') return;
    for (let n = el; n && n !== slot; n = n.parentElement) {
      const ns = getComputedStyle(n);
      if (ns.position === 'absolute' && ns.top === '0px' && ns.left === '0px' &&
          ns.right === '0px' && ns.bottom === '0px') return;
    }
    // ★★★ SVG TEXT IS OUT OF SCOPE FOR THIS DETECTOR, and pretending otherwise
    // produced its loudest false positives. Two independent reasons:
    //   1. it is painted by `fill`, not `color` — reading `color` called all
    //      twelve of statslab's dark-slate power-curve labels 1.15:1
    //      white-on-white (the same trap as feedback_contrast_probe_fidelity);
    //   2. even with `fill`, the ground behind SVG text is a SIBLING <rect> or
    //      <path> painted earlier in the same canvas, never a CSS background on
    //      an ancestor — coordgrid's white "e4" on its green selected square
    //      scored 1.00:1 against a DOM chain that knows nothing about the rect.
    // A DOM walk cannot model SVG painting. dev-tools/pixel_contrast_probe.cjs
    // samples real pixels and is the authority for anything inside an <svg>.
    if (el.namespaceURI === 'http://www.w3.org/2000/svg') return;
    // ★ <canvas> child text is FALLBACK content for browsers that cannot render
    // the element — it is never painted, so scoring its colour is meaningless.
    // watercycle's cross-section description scored 1.05:1 as "invisible" while
    // the canvas beside it draws perfectly. Same for <noscript>.
    if (el.tagName === 'CANVAS' || el.closest('canvas, noscript')) return;
    // ★ WCAG 1.4.3 exempts INACTIVE controls, and authors dim them on purpose:
    // microbiology's gram-stain steps paint the not-yet-reachable ones #475569
    // at opacity 0.4, which is the affordance doing its job, not a defect.
    // Judging them turned a deliberate design decision into 12 findings.
    for (let n = el; n && n !== slot; n = n.parentElement) {
      if (n.disabled === true || n.getAttribute('aria-disabled') === 'true') return;
    }
    const rawInk = parseRgb(cs.color);
    if (!rawInk) return;
    const bg = paintedBg(el);
    if (!bg) return;
    const bgL = relLum(bg);
    // Ink's own alpha and the group alpha both blend it into the ground it sits
    // on. On the host surface the ground behind the group IS the ground behind
    // the text, so one blend against `bg` is the painted pixel.
    const a = Math.max(0, Math.min(1, rawInk.a * alpha));
    const ink = a >= 0.999 ? rawInk : {
      r: rawInk.r * a + bg.r * (1 - a),
      g: rawInk.g * a + bg.g * (1 - a),
      b: rawInk.b * a + bg.b * (1 - a), a: 1
    };
    const inkL = relLum(ink);
    // Only judge text that landed on the HOST's own surface — that is what
    // "the tool painted no ground" looks like. White card in light and dark;
    // pure black in contrast. Anything else means the tool DID paint, and
    // grading it is axe's job, not this gate's.
    if (CONTRAST ? bgL > 0.08 : bgL < 0.6) return;
    if (!CONTRAST && inkL < 0.5) return;          // dark ink is safe on a light card
    if (CONTRAST && inkL > 0.35) return;          // light ink is safe on black
    const ratio = (Math.max(inkL, bgL) + 0.05) / (Math.min(inkL, bgL) + 0.05);
    if (ratio >= 3) return;
    findings.push({
      kind: CONTRAST ? 'dark-ink-on-contrast-surface' : 'light-ink-on-host-card',
      detail: (CONTRAST ? 'dark ink (' : 'light ink (') + cs.color +
        (a < 0.999 ? ' at opacity ' + a.toFixed(2) + ', painting as rgb(' + Math.round(ink.r) + ',' + Math.round(ink.g) + ',' + Math.round(ink.b) + ')' : '') +
        ') on an unpainted chain resolving to ' +
        'rgb(' + Math.round(bg.r) + ',' + Math.round(bg.g) + ',' + Math.round(bg.b) + ') — ' + ratio.toFixed(2) + ':1',
      el: label(el)
    });
  });

  return findings;
};

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const palette = extractStemPalette();
  const hostCss = HOST_CSS ? extractHostThemeRules('contrast') : '';
  const tw = fs.readFileSync(TW, 'utf8');
  const runtime = [
    read('desktop/web-app/node_modules/react/umd/react.production.min.js'),
    read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'),
    read('stem_lab/stem_lab_module.js')
  ];

  let files;
  if (ALL) {
    files = fs.readdirSync(path.join(ROOT, 'stem_lab'))
      .filter((f) => /^stem_tool_.*\.js$/.test(f))
      .filter((f) => !ONLY || f.indexOf(ONLY) !== -1)
      .map((f) => path.join('stem_lab', f));
  } else {
    files = [toolArg];
  }

  let states = [{}];
  if (statesArg) states = JSON.parse(statesArg);
  else if (stateArg) states = [JSON.parse(stateArg)];

  const browser = await chromium.launch();
  const report = [];
  let checked = 0;
  let scanned = 0;

  for (const file of files) {
    const src = fs.readFileSync(path.isAbsolute(file) ? file : path.join(ROOT, file), 'utf8');
    // ★ EVERY registered id, not just the first. Nine files register more than
    // one tool, and reading only `exec()[0]` meant fractions, geometryProver
    // and rockCycle had never been rendered by this gate at all — a silent hole
    // that looked exactly like a clean result. `<camelCaseId>` and `myTool` are
    // the doc-comment examples in stem_tool_forge.js, not real tools.
    const toolIds = Array.from(new Set(
      (src.match(/registerTool\(\s*['"]([^'"]+)['"]/g) || [])
        .map((m) => /registerTool\(\s*['"]([^'"]+)['"]/.exec(m)[1])
        .filter((id) => id !== 'myTool' && id.indexOf('<') === -1)
    ));
    if (!toolIds.length) continue;

    // ★★★ A SWEEP THAT PRINTS NOTHING CANNOT BE TOLD FROM A SWEEP THAT HUNG,
    // 2026-09-05. A --all run sat 32 minutes at zero bytes of output; because
    // the JSON is written only at exit, "0 bytes" looked exactly like "still
    // working". It had in fact died at chromium.launch() — the tell was that
    // NO chromium process existed and node had burned 15s of CPU in 32
    // minutes. An instrument needs an instrument: one line per file, on stderr
    // so it never contaminates the --json stdout a caller is parsing.
    process.stderr.write('[' + (++scanned) + '/' + files.length + '] ' + file +
      ' (' + toolIds.length + ' tool' + (toolIds.length === 1 ? '' : 's') + ')' + String.fromCharCode(10));

    const toolId = toolIds[0];
    const findings = lintNonUniformRx(src, file);
    // ★★★ SWALLOWED DEEP ERRORS ARE INVISIBLE MISSING FINDINGS. The deep loop
    // used to end in a bare `catch (e) {}` on the theory that "a control that
    // unmounts itself is not a defect" — true, but it discarded genuine probe
    // failures the same way, so a view that errored counted as a view with no
    // defects. magnetism reports 2 svg-text findings in every theme when run on
    // its own and 0 in every axis of the full sweep; both are reproducible, and
    // the swallow is why the difference left no trace anywhere. Silence must not
    // be spelled the same way as success.
    const deepErrors = [];
    let deepTruncated = 0;
    let settleGaveUp = 0;

    const page = await browser.newPage({ viewport: VIEWPORT });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)));
    await page.setContent('<!doctype html><html><head><style>' + tw + '</style><style>' + palette +
      '</style><style>' + hostCss + '</style><style>body{margin:0;font-family:system-ui;background:' + (DARK ? '#0f172a' : '#ffffff') +
      '}</style></head><body><main id="slot" class="' + (CONTRAST ? 'theme-contrast' : (DARK ? 'theme-dark' : 'theme-default')) + '"></main></body></html>');
    try {
      for (const code of runtime) await page.addScriptTag({ content: code });
      await page.addScriptTag({ content: src });
      await page.addScriptTag({ content: SHELL });
      for (const tid of toolIds) {
      for (const state of states) {
        const mounted = await page.evaluate(
          ({ id, dark, st, ct }) => window.__mount(id, dark, st, ct),
          { id: tid, dark: DARK, st: state, ct: CONTRAST }
        );
        if (typeof mounted === 'string' && mounted.indexOf('not-registered') === 0) continue;
        await page.waitForTimeout(450);
        // ★ Two settled frames before measuring. A style read taken while React's
        // re-render is still flushing can mix values ACROSS elements: after a
        // particlelab3d protocol click the span already reported its active
        // cyan-300 ink while the button still reported a stale slate-50 ground,
        // manufacturing a 1.39:1 finding on a card that is really slate-950.
        if (await settle(page)) settleGaveUp += 1;
        const found = await probeWidths(page);
        found.forEach((f) => { f.file = file; f.tool = tid; f.state = JSON.stringify(state); findings.push(f); });

        // ── --deep: walk the tool's own tabs ─────────────────────────────
        // A default-view sweep is shallow confidence: the collapsed litter
        // chart that motivated this gate lives three clicks inside the Pets
        // Lab. Clicking every role="tab" / aria-selected / aria-pressed
        // control reaches most sub-views without a per-tool manifest, and
        // those roles are exactly the ones authors use for view switches.
        if (!DEEP) continue;
        // ★ RE-MOUNT PER CONTROL, don't click through. Clicking tile #0 in the
        // Pets Lab navigates away and every remaining tile detaches, so a
        // single pass only ever reaches one view. Re-mounting and clicking the
        // i-th control gives one-click-deep coverage of EVERY top-level view.
        const COLLECT = `(function () {
          return Array.from(document.querySelectorAll('#slot button, #slot [role="tab"]')).filter(function (el) {
            var r = el.getBoundingClientRect();
            if (r.width <= 4 || r.height <= 4) return false;
            if (el.getAttribute('role') === 'tab') return true;
            if (el.hasAttribute('aria-selected') || el.hasAttribute('aria-pressed')) return true;
            // Buttons whose own data-* attribute names them as navigation.
            return Array.prototype.some.call(el.attributes, function (a) {
              return /^data-/.test(a.name) && /(module|view|tab|section|panel)/i.test(a.name);
            });
          }).map(function (el) { return (el.textContent || '').trim().slice(0, 40); });
        })()`;
        const labels = await page.evaluate(COLLECT);
        if (labels.length > DEEP_CAP) {
          deepTruncated = Math.max(deepTruncated, labels.length);
        }
        const seen = new Set();
        for (let ti = 0; ti < Math.min(labels.length, DEEP_CAP); ti += 1) {
          if (seen.has(labels[ti])) continue;
          seen.add(labels[ti]);
          try {
            await page.evaluate(
              ({ id, dark, st, ct }) => window.__mount(id, dark, st, ct),
              { id: tid, dark: DARK, st: state, ct: CONTRAST }
            );
            await page.waitForTimeout(260);
            const ok = await page.evaluate(({ collect, i }) => {
              const list = eval(collect);
              void list;
              const els = Array.from(document.querySelectorAll('#slot button, #slot [role="tab"]')).filter((el) => {
                const r = el.getBoundingClientRect();
                if (r.width <= 4 || r.height <= 4) return false;
                if (el.getAttribute('role') === 'tab') return true;
                if (el.hasAttribute('aria-selected') || el.hasAttribute('aria-pressed')) return true;
                return Array.prototype.some.call(el.attributes, (a) =>
                  /^data-/.test(a.name) && /(module|view|tab|section|panel)/i.test(a.name));
              });
              if (!els[i]) return false;
              els[i].click();
              return true;
            }, { collect: COLLECT, i: ti });
            if (!ok) continue;
            // ★ 700ms, not 330. Tools that inject a stylesheet or apply a mode
            // class after their first paint were probed mid-flight: watercycle's
            // "Full explorer" button reported white-on-near-white 1.02:1 when it
            // is white on sky-800, purely because the probe ran before the rule
            // landed. A settle time too short manufactures contrast findings.
            await page.waitForTimeout(700);
            if (await settle(page)) settleGaveUp += 1;
            const deepFound = await probeWidths(page);
            deepFound.forEach((f) => {
              f.file = file;
              f.tool = tid;
              f.state = JSON.stringify(state) + ' → “' + labels[ti] + '”';
              findings.push(f);
            });
          } catch (e) {
            // A control that unmounts itself is normal; a timeout is not. Keep
            // both, and let the summary below make them visible.
            deepErrors.push((labels[ti] || ('control#' + ti)) + ': ' + String(e && e.message).slice(0, 90));
          }
        }
      }
      checked += 1;
      }
    } catch (e) {
      findings.push({ kind: 'mount-error', file: file, detail: String(e.message).slice(0, 160) });
    }
    // ★ COVERAGE IS NOT A FINDING. A first cut pushed these into `findings`,
    // which broke every calibration baseline at once (known-bad 7 -> 8, pets
    // 0 -> 1) — because a caveat about what was MEASURED is not a defect that
    // was FOUND. They ride alongside the findings instead, so defect counts stay
    // comparable across runs while the limits of the run stay visible.
    await page.close();
    // ★★★ --deep RE-MOUNTS, SO ONE DEFECT REPORTS ONCE PER VIEW. A first
    // light board read "56 findings across 6 files"; the true figure was 13
    // distinct defects, each counted up to 13 times because every top-level
    // view re-renders the same header. An inflated count is not a harmless
    // cosmetic: it makes a board look like it is getting worse when a tool
    // merely grew a tab, and it buries the one new defect among its own echoes.
    // Collapse on (kind, element, detail) and keep a `seen` tally so the deep
    // coverage is still visible.
    const coverage = (deepTruncated > DEEP_CAP && Number.isFinite(DEEP_CAP))
      ? { probed: DEEP_CAP, total: deepTruncated }
      : null;
    if (findings.length || coverage || deepErrors.length || settleGaveUp) {
      const byKey = new Map();
      for (const f of findings) {
        // ★ EVERY FIELD THAT DISTINGUISHES A DEFECT MUST BE IN THE KEY. A first
        // cut keyed on (kind, el, detail) and silently merged three of the
        // known-bad blob's collapsed-height findings, dropping it from 7 to 4 —
        // they share the label "div" and differ only in the `vs` element they
        // collapse against. Deduping on a partial key does not tidy a board, it
        // deletes findings. Only `state` is deliberately excluded: collapsing
        // the same defect across re-mounted views is the whole point.
        const key = f.kind + '\u0000' + f.el + '\u0000' + f.detail +
          '\u0000' + (f.vs || '') + '\u0000' + (f.line || '');
        const hit = byKey.get(key);
        if (hit) {
          hit.seen++;
          // ★ Width is deliberately NOT in the key. One defect present at three
          // widths is one defect, not three — but WHICH widths is the band, and
          // losing it would make --widths a slower way to learn nothing.
          if (f.w && hit.widths && hit.widths.indexOf(f.w) < 0) hit.widths.push(f.w);
          continue;
        }
        f.seen = 1;
        if (f.w) f.widths = [f.w];
        byKey.set(key, f);
      }
      const distinct = Array.from(byKey.values());
      distinct.forEach((f) => { if (f.widths) f.widths.sort((a, b) => a - b); });
      const entry = { file: file, tool: toolId, findings: distinct, raw: findings.length };
      if (coverage) entry.coverage = coverage;
      if (deepErrors.length) entry.deepErrors = deepErrors.slice(0, 5);
      if (settleGaveUp) entry.settleGaveUp = settleGaveUp;
      report.push(entry);
    }
  }
  await browser.close();

  if (JSON_OUT) {
    console.log(JSON.stringify({ checked: checked, viewport: VIEWPORT.width + 'x' + VIEWPORT.height, widths: WIDTHS, theme: CONTRAST ? 'contrast' : (DARK ? 'dark' : 'light'), report: report }, null, 2));
  } else {
    let total = 0;
    report.forEach((entry) => {
      console.log('\n' + entry.file + '  [' + entry.tool + ']');
      entry.findings.forEach((f) => {
        total += 1;
        const where = f.line ? (' line ' + f.line) : (f.state && f.state !== '{}' ? ('  state ' + f.state) : '');
        console.log('  ' + f.kind + where);
        console.log('    ' + f.detail);
        if (f.widths) {
          const clean = WIDTHS.filter((w) => f.widths.indexOf(w) < 0);
          console.log('    widths: ' + f.widths.join('px, ') + 'px' +
            (clean.length ? '   (clean at ' + clean.join('px, ') + 'px — a BAND, so widths ' +
              'between these are unmeasured)' : ''));
        }
        if (f.el) console.log('    at: ' + f.el);
        if (f.parent) console.log('    vs: ' + f.parent);
        if (f.snippet) console.log('    ' + f.snippet);
      });
    });
    const partial = report.filter((e) => e.coverage);
    const errored = report.filter((e) => e.deepErrors && e.deepErrors.length);
    console.log('\n[check_stem_layout_defects] ' + checked + ' tool(s) rendered, ' +
      total + ' finding(s) across ' + report.filter((e) => e.findings.length).length + ' file(s).');
    if (partial.length) {
      console.log('  ! ' + partial.length + ' file(s) only partly probed — those views are ' +
        'UNMEASURED, not clean:');
      partial.slice(0, 8).forEach((e) => {
        console.log('      ' + e.file + ': ' + e.coverage.probed + ' of ' + e.coverage.total +
          ' matched controls (re-run with --deep-cap=' + e.coverage.total + ')');
      });
      if (partial.length > 8) console.log('      ... and ' + (partial.length - 8) + ' more');
    }
    const unsettled = report.filter((e) => e.settleGaveUp);
    if (unsettled.length) {
      // ★ Report the cap in force, not a literal. The message said "(1200ms cap)"
      // even under --settle-cap=6000, which is the same species of lie the whole
      // file exists to remove: a diagnostic that misreports its own conditions.
      console.log('  ! ' + unsettled.length + ' file(s) were measured while an animation was ' +
        'still running (' + SETTLE_CAP + 'ms cap) — those readings are frames, not settled ' +
        'layout. Compare with --settle-cap=<bigger>: if the findings match, the reading stands:');
      unsettled.slice(0, 5).forEach((e) => {
        console.log('      ' + e.file + ': ' + e.settleGaveUp + ' measurement(s)');
      });
    }
    if (errored.length) {
      console.log('  ! ' + errored.length + ' file(s) had view(s) fail to probe:');
      errored.slice(0, 5).forEach((e) => {
        console.log('      ' + e.file + ': ' + e.deepErrors.join(' | ').slice(0, 150));
      });
    }
  }
  // ★ FAIL ON DEFECTS, NOT ON CAVEATS. `report` now also carries entries that
  // hold only a coverage note or a probe error, so `report.length` would fail a
  // build for a lab with zero defects — a regression introduced by the very
  // change that made partial measurement visible. A caveat tells you the run was
  // incomplete; it is not itself a defect.
  if (GATE && report.some((e) => e.findings.length)) process.exit(1);
})().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
