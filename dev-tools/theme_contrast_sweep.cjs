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
// It reports three outcomes per tool:
//   DARK-SPECIFIC          dark is worse than light — the dark gap, still open
//   pre-existing in BOTH   a plain contrast bug, nothing to do with the theme
//   clean                  no colour-contrast violations either way
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
<style>body{margin:0;padding:10px;background:#020617;font-family:system-ui}</style></head>
<body><main id="slot"></main>
<script>${axe}<\/script><script>${react}<\/script><script>${reactDom}<\/script>
<script>${SHELL}<\/script><script>window.React = React;<\/script>
<script>${read(f)}<\/script></body></html>`, 'utf8');

    const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
    await pg.goto('file://' + page.replace(/\\/g, '/'));
    await pg.waitForTimeout(3200);
    const row = { id, light: null, dark: null, note: '' };
    for (const theme of ['default', 'dark']) {
      const status = await pg.evaluate((t) => window.__mount(t), theme);
      if (!status || /threw|mount|not-registered/.test(status)) { row.note = status; break; }
      await pg.waitForTimeout(200);
      const n = await pg.evaluate(async () => {
        const r = await window.axe.run('#slot', { runOnly: { type: 'rule', values: ['color-contrast'] } });
        return r.violations.reduce((a, v) => a + v.nodes.length, 0);
      });
      row[theme === 'dark' ? 'dark' : 'light'] = n;
      await pg.evaluate(() => window.__unmount());
      await pg.waitForTimeout(80);
    }
    await pg.close();
    results.push(row);
    const verdict = row.note ? row.note
      : (row.dark > row.light ? 'DARK-SPECIFIC (+' + (row.dark - row.light) + ')'
        : row.light > 0 ? 'pre-existing in BOTH themes' : 'clean');
    console.log(id.padEnd(14) + 'light ' + String(row.light).padStart(3) + '   dark ' + String(row.dark).padStart(3) + '   ' + verdict);
  }
  await b.close();
  const darkSpecific = results.filter((r) => r.dark !== null && r.light !== null && r.dark > r.light);
  console.log('\ntools where DARK is worse than light: ' + (darkSpecific.length ? darkSpecific.map((r) => r.id).join(', ') : 'none'));
})();
