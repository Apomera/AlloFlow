// Grade the elements axe CANNOT: text over gradient/image backgrounds.
//
//   node dev-tools/pixel_contrast_probe.cjs <toolFile> [--dark] [--state=<json>] [--json]
//
// WHY. axe's color-contrast rule marks any text whose background it cannot
// resolve (gradient, image, canvas behind) as "incomplete" and says nothing
// more. theme_contrast_sweep.cjs / axe_tool_detail.cjs surface that count as
// "unmeasurable" — beehive carries 408 such elements, birdlab 407 — so a tool
// can sweep 0/0 while its most decorated text has never been graded at all.
// This probe grades them from PIXELS: what actually rendered, not what CSS
// claims.
//
// METHOD (the platetectonics recipe, 2026-08-23 — four wrong versions before
// this one worked):
//   1. Mount the tool EXACTLY like axe_tool_detail.cjs: precompiled Tailwind,
//      the real --allo-stem-* palette, and the host's two-layer dark model
//      (dark page, WHITE content card behind the tool). Divergence between the
//      instruments would mean two verdicts from one question.
//   2. Run axe color-contrast; keep the INCOMPLETE nodes. Read each node's
//      rect, ink colour, font size/weight IN THE SAME EVALUATE, at scroll 0,
//      immediately before the screenshot — a scroll step whose scrollY drifts
//      between screenshot and rect read invents failures.
//   3. Screenshot at deviceScaleFactor 1, decoded in Node with the PNG
//      decoder playwright already bundles. No serve-it-back dance needed:
//      the rects and the pixels meet in Node, not in the page.
//      ★NOT fullPage: capture-beyond-viewport paints background-attachment:
//      fixed layers only in the first viewport strip, so a tool whose root
//      ground is a fixed gradient (kitchenlab) measures phantom white below
//      the fold — 38 invented fails on the first run. The viewport is resized
//      to the full content height instead: real rendering, no artifact.
//   4. For each node, sample its OWN box, DROP pixels within manhattan-90 of
//      the ink (glyph cores + antialiasing), and take the MODE of the rest as
//      the effective background. Averaging gradient stops over-reports
//      (it "found" a fine panel failing); the mode is the calibrated choice.
//      A 5th-percentile contrast is also computed: mode-pass + weak p05 means
//      "part of the gradient span is risky — eyeball it", not "fail".
//   5. Skip emoji-only nodes (they paint in colour regardless) and invisible/
//      zero-area boxes.
//
// ★SVG text carries its ink in `fill`, not `color` (ProbeFidelity memory) —
// the ink read checks the element's namespace.
// ★Animated canvases can shift between rect-read and screenshot: re-run
// before believing a single marginal hit.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const args = process.argv.slice(2);
const toolFile = args.find((a) => !a.startsWith('--'));
const DARK = args.includes('--dark');
const AS_JSON = args.includes('--json');
const stateArg = (args.find((a) => a.startsWith('--state=')) || '').slice(8);

if (!toolFile || !fs.existsSync(toolFile)) {
  console.error('usage: node dev-tools/pixel_contrast_probe.cjs <toolFile> [--dark] [--state=<json>] [--json]');
  process.exit(2);
}

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const TW = path.join(ROOT, 'dev-tools', '.cache', 'sweep-tailwind.css');
if (!fs.existsSync(TW)) {
  console.error('Missing dev-tools/.cache/sweep-tailwind.css — build it with:');
  console.error('  node dev-tools/build_sweep_tailwind_css.cjs');
  process.exit(2);
}

// Same palette extraction as axe_tool_detail.cjs / theme_contrast_sweep.cjs:
// with --allo-stem-* undefined, every var() falls back to a literal the app
// never renders, and the probe measures fiction.
function extractStemPalette() {
  const src = read('app_styles_module.js');
  const start = src.indexOf(':root, .theme-default {');
  if (start === -1) throw new Error('STEM palette block not found in app_styles_module.js');
  const anchor = src.indexOf('.theme-contrast {', start);
  if (anchor === -1) throw new Error('.theme-contrast block not found after :root/.theme-default');
  const end = src.indexOf('}', src.indexOf('--allo-stem-button-border', anchor));
  if (end === -1) throw new Error('could not find the end of the .theme-contrast block');
  return src.slice(start, end + 1);
}
const STEM_PALETTE = extractStemPalette();

const toolSrc = fs.readFileSync(toolFile, 'utf8');
const idMatch = /registerTool\(\s*['"]([^'"]+)['"]/.exec(toolSrc);
if (!idMatch) { console.error('no registerTool() id found in ' + toolFile); process.exit(2); }
const TOOL_ID = idMatch[1];

// Byte-for-byte the axe_tool_detail.cjs shell: two layers in dark (dark page,
// white card), full ctx surface, theme AND isDark both set.
const SHELL = `
window.__mount = function (id, dark, state) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry[id];
  // The id comes from a source-text regex, and the FIRST registerTool( in a
  // file can be a code EXAMPLE in a string (forge teaches tool-building and
  // registers 'myTool' in a lesson snippet). One page = one tool, so when the
  // guessed id is absent but exactly one tool registered, trust the registry.
  if (!cfg) {
    var ks = Object.keys(window.StemLab._registry);
    if (ks.length === 1) { id = ks[0]; cfg = window.StemLab._registry[id]; }
  }
  if (!cfg) return 'not-registered:' + id;
  var Host = function () {
    var init = {}; init[id] = state || {};
    var pair = React.useState(init);
    var ctx = { React: React, toolData: pair[0], setToolData: pair[1],
      theme: dark ? 'dark' : 'light',
      isDark: !!dark, isContrast: false, gradeBand: 'g68', gradeLevel: '7th Grade',
      setStemLabTool: function(){}, setStemLabTab: function(){}, setToolSnapshots: function(){},
      addToast: function(){}, announceToSR: function(){}, awardXP: function(){},
      beep: function(){}, celebrate: function(){}, canvasNarrate: function(){},
      canvasA11yDesc: function(){}, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, stemLabTab: 'explore', stemLabTool: null,
      toolSnapshots: [], props: {}, srOnly: {},
      update: function(){}, updateMulti: function(){}, setLabToolData: pair[1],
      labToolData: pair[0],
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) { return fb != null ? fb : k; }, getXP: function () { return 0; } };
    var rendered;
    try { rendered = cfg.render(ctx); } catch (e) { return React.createElement('div', null, 'threw: ' + e.message); }
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

function relLum(r, g, b) {
  const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(l1, l2) {
  const a = Math.max(l1, l2), b = Math.min(l1, l2);
  return (a + 0.05) / (b + 0.05);
}

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const { PNG } = require(path.join(ROOT, 'node_modules', 'playwright-core', 'lib', 'utilsBundle'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));

  await page.setContent('<!doctype html><html><head><style>' + fs.readFileSync(TW, 'utf8') +
    '</style><style>' + STEM_PALETTE +
    '</style><style>body{margin:0;font-family:system-ui;background:' + (DARK ? '#0f172a' : '#ffffff') +
    '}</style></head><body><main id="slot" class="' + (DARK ? 'theme-dark' : 'theme-default') +
    '"></main></body></html>');
  for (const code of [
    read('node_modules/axe-core/axe.min.js'),
    read('desktop/web-app/node_modules/react/umd/react.production.min.js'),
    read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'),
    read('stem_lab/stem_lab_module.js'),
    toolSrc, SHELL,
  ]) await page.addScriptTag({ content: code });

  let state = {};
  if (stateArg) { try { state = JSON.parse(stateArg); } catch (e) { console.error('bad --state json'); process.exit(2); } }
  const status = await page.evaluate(({ id, dark, st }) => window.__mount(id, dark, st),
    { id: TOOL_ID, dark: DARK, st: state });
  if (typeof status === 'string' && /^not-registered|^threw/.test(status)) {
    console.error(status); await browser.close(); process.exit(2);
  }
  await page.waitForTimeout(3500);

  // Grow the viewport to the content height so the whole tool renders in ONE
  // viewport (fixed-attachment grounds included), then settle resize handlers.
  const contentH = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
  await page.setViewportSize({ width: 1280, height: Math.min(Math.max(900, contentH), 14000) });
  await page.waitForTimeout(800);

  // Rects, inks and metrics read at scroll 0, in one evaluate, straight after
  // the axe run and straight before the screenshot.
  const nodes = await page.evaluate(async () => {
    const r = await window.axe.run('#slot', { runOnly: { type: 'rule', values: ['color-contrast'] } });
    window.scrollTo(0, 0);
    const out = [];
    const seen = new Set();
    const emojiOnly = new RegExp('^[\\p{Extended_Pictographic}\\p{Emoji_Presentation}\\s\\u200d\\ufe0f\\u20e3\\u2b50\\u2705\\u274c#*0-9.,:%/+\\-]*$', 'u');
    for (const item of r.incomplete) {
      for (const n of item.nodes) {
        const sel = n.target && n.target[0];
        if (!sel || seen.has(sel)) continue;
        seen.add(sel);
        let el;
        try { el = document.querySelector(sel); } catch (e) { continue; }
        if (!el) continue;
        // Direct text only — axe hangs the incomplete on the element that
        // carries the text node.
        let direct = '';
        for (const c of el.childNodes) if (c.nodeType === 3) direct += c.textContent;
        direct = direct.trim();
        if (!direct || emojiOnly.test(direct)) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;
        if (Number(cs.opacity) === 0) continue;
        const isSvg = el.namespaceURI === 'http://www.w3.org/2000/svg';
        const ink = isSvg && cs.fill && cs.fill !== 'none' ? cs.fill : cs.color;
        out.push({
          sel,
          text: direct.slice(0, 60),
          ink,
          fontSize: parseFloat(cs.fontSize) || 16,
          bold: (parseInt(cs.fontWeight, 10) || 400) >= 700,
          x: rect.left + window.scrollX, y: rect.top + window.scrollY,
          w: rect.width, h: rect.height,
          reason: ((n.any && n.any[0] && n.any[0].message) || '').slice(0, 80),
        });
      }
    }
    return { nodes: out, violations: r.violations.reduce((a, x) => a + x.nodes.length, 0), incompleteRaw: r.incomplete.reduce((a, x) => a + x.nodes.length, 0) };
  });

  const shot = PNG.sync.read(await page.screenshot());
  await browser.close();

  const parseColor = (s) => {
    const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/.exec(s || '');
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
    const h = /^#([0-9a-f]{6})$/i.exec((s || '').trim());
    if (h) return [parseInt(h[1].slice(0, 2), 16), parseInt(h[1].slice(2, 4), 16), parseInt(h[1].slice(4, 6), 16), 1];
    return null;
  };

  const results = [];
  for (const n of nodes.nodes) {
    const ink = parseColor(n.ink);
    if (!ink) { results.push({ ...n, verdict: 'SKIP', note: 'unparseable ink ' + n.ink }); continue; }
    const x0 = Math.max(0, Math.floor(n.x)), y0 = Math.max(0, Math.floor(n.y));
    const x1 = Math.min(shot.width, Math.ceil(n.x + n.w)), y1 = Math.min(shot.height, Math.ceil(n.y + n.h));
    if (x1 - x0 < 2 || y1 - y0 < 2) { results.push({ ...n, verdict: 'SKIP', note: 'off-image box' }); continue; }
    const area = (x1 - x0) * (y1 - y0);
    const stride = Math.max(1, Math.floor(Math.sqrt(area / 4000)));
    const buckets = new Map();
    const lums = [];
    let sampled = 0;
    for (let y = y0; y < y1; y += stride) {
      for (let x = x0; x < x1; x += stride) {
        const i = (y * shot.width + x) * 4;
        const r = shot.data[i], g = shot.data[i + 1], b = shot.data[i + 2];
        if (Math.abs(r - ink[0]) + Math.abs(g - ink[1]) + Math.abs(b - ink[2]) <= 90) continue; // glyph/AA
        sampled++;
        const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
        const e = buckets.get(key) || { c: 0, r: 0, g: 0, b: 0 };
        e.c++; e.r += r; e.g += g; e.b += b;
        buckets.set(key, e);
        lums.push(relLum(r, g, b));
      }
    }
    if (!sampled) { results.push({ ...n, verdict: 'SKIP', note: 'box is all ink (tight inline label)' }); continue; }
    let mode = null;
    for (const e of buckets.values()) if (!mode || e.c > mode.c) mode = e;
    const bg = [mode.r / mode.c, mode.g / mode.c, mode.b / mode.c];
    // Translucent ink composites over the sampled ground before grading.
    const eff = ink[3] >= 1 ? ink : [ink[0] * ink[3] + bg[0] * (1 - ink[3]), ink[1] * ink[3] + bg[1] * (1 - ink[3]), ink[2] * ink[3] + bg[2] * (1 - ink[3])];
    const inkLum = relLum(eff[0], eff[1], eff[2]);
    const modeRatio = ratio(inkLum, relLum(bg[0], bg[1], bg[2]));
    lums.sort((a, b) => a - b);
    // p05 against the ink: the darkest and lightest ends of the sampled span.
    const p = (q) => lums[Math.min(lums.length - 1, Math.floor(q * lums.length))];
    const p05 = Math.min(ratio(inkLum, p(0.05)), ratio(inkLum, p(0.95)));
    const threshold = n.fontSize >= 24 || (n.fontSize >= 18.66 && n.bold) ? 3.0 : 4.5;
    const verdict = modeRatio < threshold ? 'FAIL' : (p05 < threshold ? 'REVIEW' : 'PASS');
    results.push({ ...n, verdict, modeRatio: Math.round(modeRatio * 100) / 100, p05: Math.round(p05 * 100) / 100, threshold, bg: bg.map(Math.round) });
  }

  const tally = results.reduce((a, r) => { a[r.verdict] = (a[r.verdict] || 0) + 1; return a; }, {});
  const summary = {
    tool: path.basename(toolFile), id: TOOL_ID, theme: DARK ? 'dark' : 'light',
    axeViolations: nodes.violations, axeIncomplete: nodes.incompleteRaw,
    probed: results.length, tally,
    pageErrors: errors.slice(0, 3),
  };

  if (AS_JSON) {
    console.log(JSON.stringify({ summary, results }, null, 1));
    return;
  }
  console.log(summary.tool + '  [' + TOOL_ID + ']  ' + summary.theme.toUpperCase());
  console.log('axe violations: ' + summary.axeViolations + '   axe incomplete: ' + summary.axeIncomplete +
    '   probed (deduped, text-bearing): ' + summary.probed);
  console.log('verdicts: ' + JSON.stringify(tally));
  for (const r of results) {
    if (r.verdict === 'PASS') continue;
    console.log('\n' + r.verdict + '  ' + (r.modeRatio !== undefined ? r.modeRatio + ':1 (p05 ' + r.p05 + ') need ' + r.threshold : r.note));
    console.log('  ink ' + r.ink + (r.bg ? '  bg-mode rgb(' + r.bg.join(',') + ')' : '') + '  ' + r.fontSize + 'px' + (r.bold ? ' bold' : ''));
    console.log('  "' + r.text + '"  ' + r.sel.slice(0, 110));
  }
  if (errors.length) console.log('\npage errors: ' + errors.slice(0, 3).join(' | '));
})();
