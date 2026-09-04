// Galaxy Explorer accessibility + clarity audit, run against a REAL browser.
//
//   node dev-tools/galaxy_a11y_audit.cjs <out-dir> [--shots]
//
// Why a browser and not jsdom: three of the checks below cannot be answered
// from server-rendered markup.
//   • Accessible NAME — the accname algorithm inserts whitespace between
//     block-level children, so `textContent` reports "VisibleBest for…" where
//     Chromium reports "Visible Best for…". Auditing the string concatenation
//     invents defects that no screen reader has.
//   • Accessible name from `<label for>` / wrapping `<label>` — cheap to get
//     wrong by hand; Chromium already implements it.
//   • CONTRAST — needs computed styles and the real cascade, including the
//     unscoped `.text-slate-600` override this repo carries, which makes the
//     colour written in the source a poor guide to the colour on screen.
//
// It mounts the same shell as galaxy_no_webgl_check.cjs (real tool, real
// ui_strings, stubbed host ctx) and walks each mode/panel.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2] || '.';
const SHOTS = process.argv.includes('--shots');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const tool = read('stem_lab/stem_tool_galaxy.js');
const uiStrings = read('ui_strings.js');

const STATES = [
  ['galaxy-view', { simMode: 'galaxy', galaxyControlPanel: 'view' }],
  ['galaxy-motion', { simMode: 'galaxy', galaxyControlPanel: 'motion' }],
  ['galaxy-time', { simMode: 'galaxy', galaxyControlPanel: 'time' }],
  ['galaxy-discover', { simMode: 'galaxy', galaxyControlPanel: 'discover' }],
  ['blackHole', { simMode: 'blackHole' }],
  ['realSky', { simMode: 'realSky' }],
  ['metalHunt', { simMode: 'metalHunt' }],
  ['star', { simMode: 'star' }],
  ['unknown-mode', { simMode: 'quiz' }],
  ['quiz', { simMode: 'galaxy', quizMode: true }],
];

const SHELL = `
window.StemLab = window.StemLab || {};
window.StemLab._registry = window.StemLab._registry || {};
window.StemLab.registerTool = function (id, cfg) { window.StemLab._registry[id] = cfg; };
window.StemLab.findById = function (a, i) { return (a || []).find(function (x) { return x && x.id === i; }) || null; };
window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
window.StemLab.loadScriptResilient = function () { return Promise.resolve(); };
window.StemLab.registerHelper = function () {}; window.StemLab.getHelper = function () { return null; };
window.StemLab.makeBayViewer = function () { return { attach:function(){}, sync:function(){}, nudge:function(){}, zoom:function(){}, reset:function(){}, status:function(){return 'idle';} }; };
window._galaxyHasLoadedOnce = true;

window.__mount = function (state) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.galaxy;
  if (!cfg) { document.getElementById('slot').textContent = 'galaxy tool did not register'; return false; }
  var Host = function () {
    var pair = React.useState({ galaxy: state });
    var ctx = { React: React, toolData: pair[0], setToolData: pair[1], setStemLabTool: function(){},
      setStemLabTab: function(){}, setToolSnapshots: function(){}, addToast: function(){}, announceToSR: function(){},
      awardXP: function(){}, beep: function(){}, celebrate: function(){}, canvasNarrate: function(){}, canvasA11yDesc: function(){},
      callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, gradeLevel: '5th',
      stemLabTab: 'explore', stemLabTool: null, toolSnapshots: [], props: {}, srOnly: {},
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) {
        var cur = window.__uiStrings, segs = String(k).split('.');
        for (var si = 0; si < segs.length; si++) {
          if (cur == null || typeof cur !== 'object') { cur = null; break; }
          cur = cur[segs[si]];
        }
        if (typeof cur === 'string') return cur;
        return fb != null ? fb : k;
      },
      getXP: function () { return 0; }, update: function(){}, updateMulti: function(){}, tryAward: function(){} };
    return cfg.render(ctx);
  };
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return true;
};
`;

// Runs INSIDE the page. Returns raw observations; all judgement happens in node.
const PROBE = function () {
  const lum = (r, g, b) => {
    const f = (x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const parse = (c) => {
    const m = String(c).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  function effectiveBg(el) {
    let node = el, acc = null;
    while (node && node !== document.documentElement) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0) {
        acc = acc ? over(acc, c) : c;
        if (acc.a >= 1 || c.a >= 1) return acc;
      }
      node = node.parentElement;
    }
    return acc || { r: 255, g: 255, b: 255, a: 1 };
  }
  const ratio = (a, b) => {
    const la = lum(a.r, a.g, a.b), lb = lum(b.r, b.g, b.b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  const root = document.getElementById('slot');
  const INTERACTIVE = 'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="checkbox"], [role="switch"]';

  const controls = [];
  for (const el of root.querySelectorAll(INTERACTIVE)) {
    // A checkbox wrapped in a <label> is activated by clicking anywhere in the
    // label, so the POINTER TARGET is the label box, not the 16px input. Measuring
    // the input reports a target-size failure the user cannot experience.
    const wrap = el.closest('label');
    const r = (wrap && wrap.contains(el) ? wrap : el).getBoundingClientRect();
    controls.push({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || '',
      role: el.getAttribute('role') || '',
      cls: (el.getAttribute('class') || '').slice(0, 90),
      w: Math.round(r.width), h: Math.round(r.height),
      valuetext: el.getAttribute('aria-valuetext') || '',
      isRange: el.getAttribute('type') === 'range',
      text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90),
      disabled: el.disabled === true,
    });
  }

  // Text contrast. Two backdrops CANNOT be graded from a single colour and must
  // be reported as ungraded rather than scored against a wrong one:
  //   • a CSS gradient — computed backgroundColor is transparent, so walking
  //     ancestors finds whatever sits behind the gradient and invents a failure
  //   • the live 3-D canvas — an overlay's backdrop is millions of changing
  //     pixels, so any single number is fiction
  // Scoring those anyway is how "white on white" appears for legible white text.
  const contrast = [];
  const ungraded = [];
  for (const el of root.querySelectorAll('*')) {
    if (el.children.length) continue;
    const t = (el.textContent || '').trim();
    if (!t) continue;
    // Emoji are COLOUR glyphs: they paint their own palette and ignore `color`
    // entirely. Grading them against the CSS colour reports failures that cannot
    // exist — and worse, invites a "fix" that changes nothing on screen.
    if (!/[\p{L}\p{N}]/u.test(t)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const fg = parse(cs.color);
    if (!fg) continue;

    // What is actually painted underneath this text?
    const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 2);
    const cy = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 2);
    const stack = document.elementsFromPoint(cx, cy);
    const i = stack.indexOf(el);
    const below = i >= 0 ? stack.slice(i + 1) : stack;
    let overCanvas = false, overGradient = /gradient/.test(cs.backgroundImage || '');
    for (const n of below) {
      if (n.tagName === 'CANVAS') { overCanvas = true; break; }
      const ncs = getComputedStyle(n);
      if (/gradient/.test(ncs.backgroundImage || '')) { overGradient = true; break; }
      const nb = parse(ncs.backgroundColor);
      if (nb && nb.a >= 1) break; // reached an opaque solid: safe to grade
    }
    const size = Math.round(parseFloat(cs.fontSize) * 10) / 10;
    const bold = +cs.fontWeight >= 700;
    if (overCanvas || overGradient) {
      ungraded.push({ text: t.slice(0, 46), why: overCanvas ? 'over 3-D canvas' : 'gradient backdrop', color: cs.color, size, bold });
      continue;
    }
    const bg = effectiveBg(el);
    const solidFg = fg.a < 1 ? over(fg, bg) : fg;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    const cr = ratio(solidFg, bg);
    if (cr < need) {
      contrast.push({
        text: t.slice(0, 58), ratio: Math.round(cr * 100) / 100, need,
        color: cs.color, bg: 'rgb(' + Math.round(bg.r) + ',' + Math.round(bg.g) + ',' + Math.round(bg.b) + ')',
        size, bold,
        cls: (el.getAttribute('class') || '').slice(0, 80),
      });
    }
  }

  const headings = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({
    lvl: +h.tagName[1], text: (h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70),
  }));

  // divs/spans that LOOK like section headings but carry no heading semantics
  const fakeHeadings = [];
  for (const el of root.querySelectorAll('div,span,p')) {
    if (el.children.length) continue;
    const cs = getComputedStyle(el);
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!t || t.length > 46) continue;
    if (el.closest('button, a, label, [role="tab"]')) continue;
    const looksHeading = cs.textTransform === 'uppercase' && parseFloat(cs.letterSpacing) > 0 && +cs.fontWeight >= 600;
    if (looksHeading) fakeHeadings.push({ text: t, cls: (el.getAttribute('class') || '').slice(0, 70) });
  }

  return { controls, contrast, ungraded, headings, fakeHeadings };
};

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1180, height: 3200 }, deviceScaleFactor: 1 });
  const errors = [];
  pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  pg.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e.message).slice(0, 300)));

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'galaxy-a11y.html');
  fs.writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"><\/script>
<style>body{margin:0;padding:12px;background:#fff;font-family:system-ui}</style></head>
<body><main id="slot"></main>
<script>${react}<\/script><script>${reactDom}<\/script>
<script>${read('vendor/three-r128/three.min.js')}<\/script>
<script>window.__uiStrings = ${uiStrings};<\/script>
<script>${SHELL}<\/script><script>window.React = React;<\/script>
<script>${tool}<\/script></body></html>`, 'utf8');

  await pg.goto('file:///' + path.resolve(file).replace(/\\/g, '/'));
  await pg.waitForTimeout(2500);
  if (!(await pg.evaluate(() => typeof window.__mount === 'function'))) {
    console.log('shell did not initialise; is Tailwind reachable?');
    await b.close();
    process.exit(1);
  }

  const lines = [];
  const allUnnamed = [], allContrast = [], allSmall = [], allRangeNoVT = [], allFake = [], allUngraded = [];

  for (const [name, state] of STATES) {
    await pg.evaluate((s) => window.__mount(s), state);
    // The Tailwind play CDN generates classes lazily off a MutationObserver, so a
    // short settle screenshots the page BEFORE any newly-used utility exists -
    // a fresh w-6 rendered as an 8px sliver here and looked like a real layout
    // bug until it was measured in a slower harness. Give the JIT time to land.
    await pg.waitForTimeout(2800);

    // Accessible names straight from Chromium's accessibility tree. ariaSnapshot
    // yields one line per node: `- button "Back to tools"`, and a bare `- button`
    // when the node has NO accessible name — which is the defect we are after.
    const snap = await pg.locator('#slot').ariaSnapshot();
    const axNames = [];
    for (const raw of snap.split('\n')) {
      // \b after the role matters: without it `tablist` and `tabpanel` match as a
      // nameless `tab` and every panel reports a phantom unnamed control.
      const m = raw.match(/^\s*-\s+(button|tab|checkbox|switch|slider|textbox|combobox|link|radio|spinbutton)\b(?!list|panel)(?:\s+"((?:[^"\\]|\\.)*)")?/);
      if (m) axNames.push({ role: m[1], name: (m[2] || '').trim() });
    }
    fs.writeFileSync(path.join(OUT, 'aria-' + name + '.txt'), snap, 'utf8');

    const raw = await pg.evaluate(PROBE);

    for (const a of axNames) if (!a.name) allUnnamed.push(name + '  role=' + a.role + '  (no accessible name)');
    for (const c of raw.controls) {
      if (c.isRange && !c.valuetext) allRangeNoVT.push(name + '  range  ' + c.cls.slice(0, 50));
      if (!c.disabled && c.w > 0 && c.h > 0 && (c.w < 24 || c.h < 24)) {
        allSmall.push(name + '  ' + c.w + 'x' + c.h + '  "' + (c.text || c.cls).slice(0, 46) + '"');
      }
    }
    for (const c of raw.contrast) {
      allContrast.push(name + '  ' + String(c.ratio).padStart(5) + ':1 (needs ' + c.need + ')  ' +
        c.size + 'px' + (c.bold ? ' bold' : '') + '  ' + c.color + ' on ' + c.bg + '   "' + c.text + '"');
    }
    for (const f of raw.fakeHeadings) allFake.push(name + '  "' + f.text + '"');
    for (const u of raw.ungraded) allUngraded.push(name + '  [' + u.why + ']  ' + u.size + 'px  ' + u.color + '  "' + u.text + '"');

    lines.push('');
    lines.push('######## ' + name + '   ax-controls=' + axNames.length + '  headings=' + raw.headings.length +
      '  heading-styled-divs=' + raw.fakeHeadings.length + '  contrast-fails=' + raw.contrast.length);
    for (const h of raw.headings) lines.push('   ' + '  '.repeat(Math.max(0, h.lvl - 3)) + 'h' + h.lvl + '  ' + h.text);

    if (SHOTS) await pg.screenshot({ path: path.join(OUT, 'galaxy-' + name + '.png'), fullPage: true });
  }

  const sec = (t, arr) => {
    lines.push('');
    lines.push('=== ' + t + ' (' + arr.length + ') ===');
    const seen = new Set();
    for (const x of arr) { if (seen.has(x)) continue; seen.add(x); lines.push('  ' + x); }
    if (!arr.length) lines.push('  none');
  };
  sec('CONTROLS WITH NO ACCESSIBLE NAME (Chromium ax tree)', allUnnamed);
  sec('RANGE INPUTS WITHOUT aria-valuetext', allRangeNoVT);
  sec('TARGETS UNDER 24x24 CSS px', allSmall);
  sec('TEXT BELOW WCAG AA CONTRAST', allContrast);
  sec('HEADING-STYLED TEXT THAT IS NOT A HEADING', allFake);
  sec('TEXT NOT GRADEABLE FROM ONE COLOUR (gradient / live canvas backdrop)', allUngraded);
  sec('CONSOLE ERRORS', errors);

  const outFile = path.join(OUT, 'galaxy-a11y-report.txt');
  fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
  console.log(lines.join('\n'));
  console.log('\nwrote ' + outFile);
  await b.close();
})();
