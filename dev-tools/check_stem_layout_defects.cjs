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
 * ★A SINGLE-FILE --deep RUN AND A LAB-WIDE ONE DO NOT COVER THE SAME VIEWS.
 * DEEP_CAP is 30 alone and 12 under --all, and the walk dedupes by control
 * label, so neither pass is a superset of the other: the final sweep found live
 * findings in decomposer and base10 views that per-tool runs had reported clean.
 * Finish with --all --deep, not with a per-tool victory lap.
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
// One re-mount per control, so this is the runtime knob. 30 covers the Pets
// Lab's 28 menu tiles; --all --deep is a long run by design.
const DEEP_CAP = ALL ? 12 : 30;
const toolArg = args.find((a) => !a.startsWith('--'));
const statesArg = (args.find((a) => a.startsWith('--states=')) || '').slice(9);
const stateArg = (args.find((a) => a.startsWith('--state=')) || '').slice(8);

if (!ALL && !toolArg) {
  console.error('usage: node dev-tools/check_stem_layout_defects.cjs <toolFile|--all> [--state=<json>] [--states=<json array>] [--dark] [--contrast [--no-host-css]] [--deep] [--json] [--gate]');
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
  slot.querySelectorAll('*').forEach((el) => {
    const inline = el.style && el.style.height;
    if (!inline || !/%$/.test(inline)) return;
    const pct = parseFloat(inline);
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
    if (parent.style && parent.style.height) return;
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
      const over = [];
      if (r.right > sr.right + 1) over.push('right by ' + (r.right - sr.right).toFixed(1));
      if (r.left < sr.left - 1) over.push('left by ' + (sr.left - r.left).toFixed(1));
      if (r.bottom > sr.bottom + 1) over.push('bottom by ' + (r.bottom - sr.bottom).toFixed(1));
      if (r.top < sr.top - 1) over.push('top by ' + (sr.top - r.top).toFixed(1));
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
    }
    // Parked off-canvas until focused — the standard skip-link pattern
    // (transform: translateY(-180%)). dissection stacks two of them at the same
    // coordinates on purpose; only the focused one ever translates into view.
    const sr = slot.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.bottom < sr.top || r.right < sr.left || r.top > sr.bottom || r.left > sr.right) return true;
    return false;
  }

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
    if (!/[A-Za-z0-9]/.test(own)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 6) return;
    if (invisible(el)) return;
    const cs = getComputedStyle(el);
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
    const ink = parseRgb(cs.color);
    if (!ink) return;
    const inkL = relLum(ink);
    const bg = paintedBg(el);
    if (!bg) return;
    const bgL = relLum(bg);
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
      detail: (CONTRAST ? 'dark ink (' : 'light ink (') + cs.color + ') on an unpainted chain resolving to ' +
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
    const toolId = toolIds[0];
    const findings = lintNonUniformRx(src, file);

    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
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
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const found = await page.evaluate(PROBE, CONTRAST);
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
            await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
            const deepFound = await page.evaluate(PROBE, CONTRAST);
            deepFound.forEach((f) => {
              f.file = file;
              f.tool = tid;
              f.state = JSON.stringify(state) + ' → “' + labels[ti] + '”';
              findings.push(f);
            });
          } catch (e) { /* a control that unmounts itself is not a defect */ }
        }
      }
      checked += 1;
      }
    } catch (e) {
      findings.push({ kind: 'mount-error', file: file, detail: String(e.message).slice(0, 160) });
    }
    await page.close();
    if (findings.length) report.push({ file: file, tool: toolId, findings: findings });
  }
  await browser.close();

  if (JSON_OUT) {
    console.log(JSON.stringify({ checked: checked, report: report }, null, 2));
  } else {
    let total = 0;
    report.forEach((entry) => {
      console.log('\n' + entry.file + '  [' + entry.tool + ']');
      entry.findings.forEach((f) => {
        total += 1;
        const where = f.line ? (' line ' + f.line) : (f.state && f.state !== '{}' ? ('  state ' + f.state) : '');
        console.log('  ' + f.kind + where);
        console.log('    ' + f.detail);
        if (f.el) console.log('    at: ' + f.el);
        if (f.parent) console.log('    vs: ' + f.parent);
        if (f.snippet) console.log('    ' + f.snippet);
      });
    });
    console.log('\n[check_stem_layout_defects] ' + checked + ' tool(s) rendered, ' +
      total + ' finding(s) across ' + report.length + ' file(s).');
  }
  if (GATE && report.length) process.exit(1);
})().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
