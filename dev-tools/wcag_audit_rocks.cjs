// Live WCAG 2.1 A/AA sweep over every view of the two rock tools.
//
//   node dev-tools/wcag_audit_rocks.cjs <out-prefix>
//
// Runs axe-core against 20 views (including the states that only exist after
// an interaction) and writes a JSON report. Needs Chromium, so it is NOT part
// of the vitest suite; tests/rocks_wcag.test.js pins the invariants that this
// found, and adds the two classes axe cannot see at all:
//
//   * SVG <text> contrast. axe reads CSS colours and does not evaluate inline
//     SVG text, so it reported these tools clean while the streak-plate hint
//     sat at 3.78:1 and the machine prompt at 2.36:1.
//   * SC 1.4.11 non-text contrast on the graphics themselves.
//
// Tailwind is loaded from its CDN and given 3.5s; without it every colour is
// unstyled and the contrast numbers are fiction.
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2];
const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const axe = read('node_modules/axe-core/axe.min.js');
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const tool = read('stem_lab/stem_tool_rocks.js');

// Every reachable view, including the states that only appear after interaction.
const VIEWS = [
  ['rocks', 'landscape', { mode: 'landscape' }],
  ['rocks', 'rocks grid', { mode: 'rocks' }],
  ['rocks', 'rock detail', { mode: 'rocks', selectedRock: 'granite' }],
  ['rocks', 'rock detail + thin section PPL', { mode: 'rocks', selectedRock: 'sandstone', thinSection: { xpl: false, stage: 0 } }],
  ['rocks', 'rock detail + thin section XPL', { mode: 'rocks', selectedRock: 'sandstone', thinSection: { xpl: true, stage: 20 } }],
  ['rocks', 'minerals grid', { mode: 'minerals' }],
  ['rocks', 'mineral detail', { mode: 'minerals', selectedMineral: 'pyrite' }],
  ['rocks', 'streak revealed', { mode: 'minerals', selectedMineral: 'pyrite', streakResult: 'Powder Streak Result: Greenish-black' }],
  ['rocks', 'streak too hard', { mode: 'minerals', selectedMineral: 'diamond', streakResult: 'Powder Streak Result: None (too hard)' }],
  ['rocks', 'scratch done', { mode: 'minerals', selectedMineral: 'quartz', scratchTool: 'fingernail', scratchAnimProgress: 100 }],
  ['rocks', 'fizz done', { mode: 'minerals', selectedMineral: 'calcite', fizzResult: 'Fizz!' }],
  ['rocks', 'mystery', { mode: 'mystery' }],
  ['rocks', 'quiz', { mode: 'quiz' }],
  ['rocks', 'weathering minimal', { mode: 'weathHunt', weathHunt: { tempSwing: 5, rainfall: 50, pH: 7, hypothesis: '', log: [] } }],
  ['rocks', 'weathering chemDom', { mode: 'weathHunt', weathHunt: { tempSwing: 5, rainfall: 480, pH: 3.2, hypothesis: '', log: [] } }],
  ['rockCycle', 'cycle main', { mode: 'cycle' }],
  ['rockCycle', 'machine idle', { mode: 'machine' }],
  ['rockCycle', 'machine granite', { mode: 'machine', startingRock: 'granite' }],
  ['rockCycle', 'processes', { mode: 'processes' }],
  ['rockCycle', 'cycle quiz', { mode: 'quiz' }],
];

const SHELL = `
window.StemLab = {
  _registry: {},
  registerTool: function (id, cfg) { window.StemLab._registry[id] = cfg; },
  findById: function (a, i) { return (a || []).find(function (x) { return x && x.id === i; }) || null; },
  loadScriptResilient: function () { return Promise.resolve(); },
  ensureThree: function () { return new Promise(function () {}); },
  makeBayViewer: function () {
    return { attach: function () {}, sync: function () {}, nudge: function () {}, zoom: function () {},
             reset: function () {}, status: function () { return 'loading'; } };
  }
};
`;

const HARNESS = `
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  window.__mount = function (toolId, state) {
    var store = { rocks: {}, rockCycle: {} };
    store[toolId] = state;
    var ctx = {
      React: React, toolData: store, setToolData: function () {}, setStemLabTool: function () {},
      setStemLabTab: function () {}, setToolSnapshots: function () {}, addToast: function () {},
      announceToSR: function () {}, awardXP: function () {}, beep: function () {}, celebrate: function () {},
      canvasNarrate: function () {}, canvasA11yDesc: function () {}, callGemini: null, callTTS: null,
      callImagen: null, callGeminiVision: null, gradeLevel: '5th', stemLabTab: 'explore',
      stemLabTool: null, toolSnapshots: [], props: {}, srOnly: {},
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) { return fb || k; }, getXP: function () { return 0; }
    };
    ReactDOM.render(React.createElement(function () {
      return window.StemLab._registry[toolId].render(ctx);
    }), document.getElementById('slot'));
  };
  window.__unmount = function () { ReactDOM.unmountComponentAtNode(document.getElementById('slot')); };
`;

fs.writeFileSync(OUT + '.html', `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>rocks a11y harness</title>
<script src="https://cdn.tailwindcss.com"><\/script>
<style>body{background:#ffffff;margin:0;padding:12px;font-family:system-ui,sans-serif}</style>
</head><body>
<main id="slot"></main>
<script>${axe}<\/script><script>${react}<\/script><script>${reactDom}<\/script>
<script>${SHELL}<\/script><script>window.React = React;<\/script>
<script>${tool}<\/script><script>${HARNESS}<\/script>
</body></html>`, 'utf8');

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const pg = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const pageErrors = [];
  pg.on('pageerror', (e) => pageErrors.push(String(e)));
  await pg.goto('file://' + (OUT + '.html').replace(/\\/g, '/'));
  // Tailwind CDN needs a moment or every colour is unstyled and contrast is fiction.
  await pg.waitForTimeout(3500);
  const tailwindUp = await pg.evaluate(() => !!document.querySelector('style[data-tailwind], style'));
  console.log('tailwind stylesheet present: ' + tailwindUp);

  const all = [];
  for (const [toolId, name, state] of VIEWS) {
    await pg.evaluate(([t, s]) => window.__mount(t, s), [toolId, state]);
    await pg.waitForTimeout(260);
    const res = await pg.evaluate(async () => {
      const r = await window.axe.run('#slot', {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      });
      return r.violations.map((v) => ({
        id: v.id, impact: v.impact, help: v.help, n: v.nodes.length,
        sample: v.nodes.slice(0, 3).map((n) => ({
          target: n.target.join(' '),
          summary: (n.failureSummary || '').split('\n').filter(Boolean).slice(0, 3).join(' | '),
          html: (n.html || '').slice(0, 160),
        })),
      }));
    });
    const total = res.reduce((a, v) => a + v.n, 0);
    console.log((toolId + '/' + name).padEnd(38) + (res.length ? res.length + ' rule(s), ' + total + ' node(s)' : 'clean'));
    res.forEach((v) => {
      console.log('      [' + (v.impact || '?') + '] ' + v.id + ' x' + v.n + ' — ' + v.help);
      v.sample.forEach((s) => console.log('           ' + s.target + '  ' + s.summary.slice(0, 150)));
    });
    all.push({ tool: toolId, view: name, violations: res });
    await pg.evaluate(() => window.__unmount());
    await pg.waitForTimeout(80);
  }
  await browser.close();

  fs.writeFileSync(OUT + '.json', JSON.stringify(all, null, 2), 'utf8');
  const rules = {};
  all.forEach((v) => v.violations.forEach((r) => { rules[r.id] = (rules[r.id] || 0) + r.n; }));
  console.log('\n=== totals across ' + VIEWS.length + ' views ===');
  const keys = Object.keys(rules);
  if (!keys.length) console.log('NO WCAG A/AA VIOLATIONS');
  else keys.sort((a, b) => rules[b] - rules[a]).forEach((k) => console.log('   ' + k.padEnd(34) + rules[k]));
  if (pageErrors.length) { console.log('\nPAGE ERRORS:'); pageErrors.slice(0, 8).forEach((e) => console.log('   ' + e.slice(0, 200))); }
})();
