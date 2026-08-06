// Which STEM tools break specifically in the DARK theme?
//
//   node dev-tools/theme_contrast_sweep.cjs <out-prefix> [tool,tool,...]
//   (no tool list = every stem_lab/stem_tool_*.js)
//
// The host wraps every tool in a white card when the shell is dark, so a
// light-palette tool lands on white rather than on #0f172a. That closes most
// of the gap but not all of it, and the only way to know which tools are still
// affected is to render each one in BOTH themes and diff the counts.
//
// It reports four outcomes per tool:
//   DARK-SPECIFIC          dark is worse than light — the dark gap, still open
//   pre-existing in BOTH   a plain contrast bug, nothing to do with the theme
//   UNMEASURED             axe could not resolve the background (gradient/image),
//                          so the zero is meaningless — go and look at it
//   clean                  no violations AND nothing left unresolved
//
// TRAPS, both of which produced numbers I briefly believed:
//   * ONE TOOL PER PAGE. Loading several tool scripts into one document lets
//     them collide over globals and the registry; a shared page reported rocks
//     as failing when it is clean.
//   * RENDER INSIDE A COMPONENT. Calling cfg.render(ctx) bare throws for every
//     tool that uses hooks, and those then look like crashes rather than
//     unmeasured.
//
// Tailwind is loaded from its CDN and given 3.2s; without it every colour is
// unstyled and the numbers are fiction.
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const axe = read('node_modules/axe-core/axe.min.js');

// ── STEM palette variables (added 2026-08-05) ───────────────────────────────
// WHY THIS EXISTS. This sweep used to render tools with the --allo-stem-*
// variables UNDEFINED. Tools write `var(--allo-stem-text, #cbd5e1)`, so every
// one of those silently fell back to the light-on-dark fallback — which looks
// correct on a dark surface no matter which theme is being measured. The sweep
// therefore could not see the entire class of "surface and text described by
// different palettes", and reported stem_tool_kitchenlab as "light 0, dark 0,
// clean" while its body text was #0f172a on #1c1410 = 1.02:1, invisible.
// Measured on fireecology the same day: 8 violations without these variables,
// 22 with them.
//
// The block is read from AlloFlowANTI.txt rather than copied, so it cannot drift
// from what the app ships. If extraction ever fails this ABORTS rather than
// quietly reverting to the blind behaviour that hid the bug.
//
// NOTE: counts from this tool are NOT comparable to runs before this date — the
// light theme in particular will report more, because it is finally being
// measured with the palette the app actually applies.
function extractStemPalette() {
  const anti = read('AlloFlowANTI.txt');
  const start = anti.indexOf(':root, .theme-default {');
  if (start === -1) throw new Error('STEM palette block not found in AlloFlowANTI.txt (looked for ":root, .theme-default {")');
  const anchor = anti.indexOf('.theme-contrast {', start);
  if (anchor === -1) throw new Error('.theme-contrast block not found after :root/.theme-default');
  const end = anti.indexOf('}', anti.indexOf('--allo-stem-button-border', anchor));
  if (end === -1) throw new Error('could not find the end of the .theme-contrast block');
  const css = anti.slice(start, end + 1);
  for (const needle of ['--allo-stem-text:', '.theme-dark', '.theme-contrast']) {
    if (!css.includes(needle)) throw new Error('extracted palette is missing ' + needle);
  }
  return css;
}
const STEM_PALETTE = extractStemPalette();
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');

const TOOLS = (process.argv[3] || 'anatomy,volume,wave,universe').split(',');

const SHELL = `
window.StemLab = { _registry: {},
  registerTool: function (id, cfg) { window.StemLab._registry[id] = cfg; },
  findById: function (a, i) { return (a || []).find(function (x) { return x && x.id === i; }) || null; },
  loadScriptResilient: function () { return Promise.resolve(); },
  ensureThree: function () { return new Promise(function () {}); },
  registerHelper: function () {}, getHelper: function () { return null; },
  makeBayViewer: function () { return { attach:function(){}, sync:function(){}, nudge:function(){}, zoom:function(){}, reset:function(){}, status:function(){return 'loading';} }; }
};
window.__mount = function (theme) {
  var ids = Object.keys(window.StemLab._registry);
  var toolId = ids[0];
  if (!toolId) return 'not-registered';
  // Put the theme CLASS on <html>, which is what the palette block selects on
  // (":root, .theme-default" / ".theme-dark"). Without this the variables never
  // resolve to the theme being measured and every var() falls back — the blind
  // spot this sweep had until 2026-08-05.
  document.documentElement.className = (theme === 'dark') ? 'theme-dark' : 'theme-default';
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var store = {};
  var ctx = { React: React, toolData: store, setToolData: function(){}, setStemLabTool: function(){},
    setStemLabTab: function(){}, setToolSnapshots: function(){}, addToast: function(){}, announceToSR: function(){},
    awardXP: function(){}, beep: function(){}, celebrate: function(){}, canvasNarrate: function(){}, canvasA11yDesc: function(){},
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, gradeLevel: '5th',
    stemLabTab: 'explore', stemLabTool: null, toolSnapshots: [], props: {}, srOnly: {},
    a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
    t: function (k, fb) { return fb || k; }, getXP: function () { return 0; } };
  var cfg = window.StemLab._registry[toolId];
  // Render INSIDE a component: tools that use hooks throw if render() is
  // called bare, and a good number of STEM tools do.
  var rendered = React.createElement(function () { return cfg.render(ctx); });
  var node;
  if (theme === 'dark') {
    var card = React.createElement('div', { 'data-stem-tool-surface': toolId,
      style: { background: '#ffffff', color: '#0f172a', borderRadius: 10, padding: 10 } }, rendered);
    node = React.createElement('div', { style: { background: '#0f172a', color: '#e2e8f0', borderRadius: 12, padding: 10 },
      'data-stem-tool-shell': toolId, 'data-stem-theme': 'dark' }, card);
  } else {
    node = React.createElement('div', { style: { background: '#ffffff', color: '#0f172a', borderRadius: 12, padding: 0 },
      'data-stem-tool-shell': toolId, 'data-stem-theme': 'default' }, rendered);
  }
  try { ReactDOM.render(node, document.getElementById('slot')); } catch (e) { return 'mount: ' + e.message; }
  return toolId;
};
window.__unmount = function () { ReactDOM.unmountComponentAtNode(document.getElementById('slot')); };
`;

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const results = [];
  for (const id of TOOLS) {
    const f = 'stem_lab/stem_tool_' + id.toLowerCase() + '.js';
    if (!fs.existsSync(path.join(ROOT, f))) { console.log(id.padEnd(14) + 'no file'); continue; }
    const page = OUT + '-' + id + '.html';
    fs.writeFileSync(page, `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"><\/script>
<style>${STEM_PALETTE}</style>
<style>body{margin:0;padding:10px;background:#020617;font-family:system-ui}</style></head>
<body><main id="slot"></main>
<script>${axe}<\/script><script>${react}<\/script><script>${reactDom}<\/script>
<script>${SHELL}<\/script><script>window.React = React;<\/script>
<script>${read(f)}<\/script></body></html>`, 'utf8');

    const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
    await pg.goto('file://' + page.replace(/\\/g, '/'));
    await pg.waitForTimeout(3200);
    const row = { id, light: [], dark: [], lightIncomplete: [], darkIncomplete: [], note: '' };
    // REPEAT each theme. A single reading is not trustworthy: the Tailwind CDN
    // compiles classes on demand, so a run can be audited before every rule
    // exists. Measured on `calculus`, the light count came back 5, 9, 11 and 11
    // on four runs of identical code while dark stayed at 6 — which is enough
    // to invent a "DARK-SPECIFIC (+2)" finding out of nothing, and did.
    const REPEATS = 3;
    for (const theme of ['default', 'dark']) {
      for (let attempt = 0; attempt < REPEATS; attempt++) {
        const status = await pg.evaluate((t) => window.__mount(t), theme);
        if (!status || /threw|mount|not-registered/.test(status)) { row.note = status; break; }
        await pg.waitForTimeout(220);
        // A tool that catches its own error and renders an error card still
        // "mounts". Measuring that card tells you nothing about the tool — and
        // its own styling is usually where the contrast failures then come
        // from. roadready did exactly this because the harness lacks ctx.update.
        const broken = await pg.evaluate(() => {
          const txt = (document.getElementById('slot').innerText || '').slice(0, 400);
          return /is not a function|Cannot read propert|undefined is not|Error\b/i.test(txt);
        });
        if (broken) { row.note = 'renders an error card — not measurable here'; break; }
        const n = await pg.evaluate(async () => {
          const r = await window.axe.run('#slot', { runOnly: { type: 'rule', values: ['color-contrast'] } });
          return {
            v: r.violations.reduce((a, x) => a + x.nodes.length, 0),
            // INCOMPLETE is not noise, it is "axe could not compute this". A
            // gradient or image background defeats the rule entirely, so a tool
            // painted on one returns 0 violations no matter how bad it is.
            // kitchenlab measured 0 violations / 150 incomplete both BEFORE and
            // AFTER its 1.02:1 invisible-text bug was fixed — the violation count
            // carried no information about it at all.
            i: r.incomplete.reduce((a, x) => a + x.nodes.length, 0),
          };
        });
        row[theme === 'dark' ? 'dark' : 'light'].push(n.v);
        row[theme === 'dark' ? 'darkIncomplete' : 'lightIncomplete'].push(n.i);
        await pg.evaluate(() => window.__unmount());
        await pg.waitForTimeout(80);
      }
      if (row.note) break;
    }
    await pg.close();
    results.push(row);

    const lo = (a) => Math.min.apply(null, a);
    const hi = (a) => Math.max.apply(null, a);
    let verdict;
    if (row.note) {
      verdict = row.note;
    } else {
      // Compare dark's WORST against light's BEST. Only call it dark-specific
      // if dark loses even when light is given every benefit of the doubt.
      const darkMin = lo(row.dark), lightMax = hi(row.light);
      const unstable = (hi(row.light) - lo(row.light)) + (hi(row.dark) - lo(row.dark));
      const maxIncomplete = Math.max(hi(row.lightIncomplete.length ? row.lightIncomplete : [0]),
                                     hi(row.darkIncomplete.length ? row.darkIncomplete : [0]));
      if (darkMin > lightMax) verdict = 'DARK-SPECIFIC (+' + (darkMin - lightMax) + ')';
      else if (hi(row.light) > 0 || hi(row.dark) > 0) verdict = 'pre-existing in BOTH themes';
      // A zero violation count is only "clean" if axe could actually SEE the
      // elements. With unresolved elements it means "not measured", and saying
      // clean there is the false assurance that let kitchenlab ship invisible.
      else if (maxIncomplete > 0) verdict = 'UNMEASURED — ' + maxIncomplete + ' element(s) axe could not resolve (gradient/image bg): screenshot it';
      else verdict = 'clean';
      if (unstable) verdict += '   [unstable spread ' + unstable + ']';
    }
    const fmt = (a) => (a.length ? (lo(a) === hi(a) ? String(lo(a)) : lo(a) + '-' + hi(a)) : '-');
    console.log(id.padEnd(14) + 'light ' + fmt(row.light).padStart(6) + '   dark ' + fmt(row.dark).padStart(6) + '   ' + verdict);
  }
  await b.close();
  const darkSpecific = results.filter((r) => !r.note && r.dark.length && r.light.length
    && Math.min.apply(null, r.dark) > Math.max.apply(null, r.light));
  console.log('\ntools where DARK is worse than light on EVERY run: '
    + (darkSpecific.length ? darkSpecific.map((r) => r.id).join(', ') : 'none'));
  console.log('Anything not on that line is unproven — re-read the elements before acting on it.');
})();
