// Screenshot the Rock Cycle transformation machine across its states.
//
//   node dev-tools/rc_scene_shots.cjs <out-dir>
//
// WHY. Every real defect found in the rocks tools this cycle was found by
// looking at the picture, not by a test: a caption promising something the
// drawing did not show, or a mark drawn in near-background colour so it was
// present in the markup and invisible on the screen. Tests caught none of them.
// The transformation machine has 8 specimens x 3 agents x a progress axis, so
// eyeballing it in the app means 24 runs; this lays the states out as files.
//
// The machine's SVG is deterministic (index-driven, never Math.random), so the
// same state always yields the same frame and these shots are comparable
// run-to-run.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2] || '.';
const CANVAS_MODE = process.argv.includes('--canvas');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const tool = read('stem_lab/stem_tool_rocks.js');
// The canonical English, so shots show what a user sees. A stub `t` returning
// the key renders the diagram's node labels as "stem.rocks.igneous" — which is
// what the tool would show only if the key were missing, so a screenshot taken
// that way cannot be read as evidence about the real UI.
const uiStrings = read('ui_strings.js');

// specimen, agent, progress-or-result, caption
const STATES = [
  ['granite', null, 'idle', 'no agent chosen yet'],
  ['granite', 'heat_pressure', 0, 'run just started'],
  ['granite', 'heat_pressure', 45, 'input still present'],
  ['granite', 'heat_pressure', 60, 'product emerging'],
  ['granite', 'heat_pressure', 'done', 'granite -> gneiss'],
  ['granite', 'weathering_erosion', 'done', 'granite -> sandstone + shale'],
  ['granite', 'melting_cooling', 'done', 'granite -> granite/rhyolite'],
  ['basalt', 'heat_pressure', 'done', 'basalt -> greenschist'],
  ['sandstone', 'heat_pressure', 'done', 'sandstone -> quartzite (nonfoliated)'],
  ['shale', 'heat_pressure', 'done', 'shale -> slate/phyllite/schist/gneiss'],
  ['limestone', 'heat_pressure', 'done', 'limestone -> marble'],
  ['limestone', 'melting_cooling', 'done', 'CAVEAT path: decarbonation'],
  ['marble', 'heat_pressure', 'done', 'marble -> coarse marble'],
  ['slate', 'weathering_erosion', 'done', 'slate -> shale'],
  ['gneiss', 'melting_cooling', 'done', 'gneiss -> migmatite'],
];

const SHELL = `
window.StemLab = { _registry: {},
  registerTool: function (id, cfg) { window.StemLab._registry[id] = cfg; },
  findById: function (a, i) { return (a || []).find(function (x) { return x && x.id === i; }) || null; },
  loadScriptResilient: function () { return Promise.resolve(); },
  ensureThree: function () { return new Promise(function () {}); },
  registerHelper: function () {}, getHelper: function () { return null; },
  makeBayViewer: function () { return { attach:function(){}, sync:function(){}, nudge:function(){}, zoom:function(){}, reset:function(){}, status:function(){return 'idle';} }; }
};
// A STATEFUL host. With a no-op setToolData the Transform button does nothing
// and every "done" shot would silently be an idle shot — the exact class of
// plausible-looking wrong screenshot that has bitten this work before.
window.__mount = function (state) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.rockCycle;
  var Host = function () {
  var pair = React.useState({ rocks: {}, rockCycle: state });
  var ctx = { React: React, toolData: pair[0], setToolData: pair[1], setStemLabTool: function(){},
    setStemLabTab: function(){}, setToolSnapshots: function(){}, addToast: function(){}, announceToSR: function(){},
    awardXP: function(){}, beep: function(){}, celebrate: function(){}, canvasNarrate: function(){}, canvasA11yDesc: function(){},
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, gradeLevel: '5th',
    stemLabTab: 'explore', stemLabTool: null, toolSnapshots: [], props: {}, srOnly: {},
    a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
    // Mirrors the host: resolve the dotted key against the nested canonical
    // English (AlloFlowANTI.txt:1748 does key.split('.')), then fall back the
    // way __alloT does. With a key-returning stub the diagram's node labels
    // render as "stem.rocks.igneous", which is what the tool would show only
    // if the key were MISSING — so shots taken that way are unreadable as
    // evidence about the real UI.
    t: function (k, fb) {
      var cur = window.__uiStrings, segs = String(k).split('.');
      for (var si = 0; si < segs.length; si++) {
        if (cur == null || typeof cur !== 'object') { cur = null; break; }
        cur = cur[segs[si]];
      }
      if (typeof cur === 'string') return cur;
      return fb != null ? fb : k;
    },
    getXP: function () { return 0; } };
    return cfg.render(ctx);
  };
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return true;
};
`;

function stateFor(spec, agent, prog) {
  const s = { startingRock: spec, geologicalAgent: agent };
  if (prog === 'idle' || prog === 'done') return s;
  s.transformationAnimActive = true;
  s.transformationProgress = prog;
  return s;
}

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  // Reduced motion makes the tool's own run resolve synchronously (SC 2.3.3
  // path), so a "done" shot comes from the real machine rather than from a
  // result record hand-built here — which could show a pairing it never makes.
  const pg = await b.newPage({ viewport: { width: 900, height: 1400 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = path.join(OUT, 'rc-shots.html');
  fs.writeFileSync(page, `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"><\/script>
<style>body{margin:0;padding:12px;background:#fff;font-family:system-ui}</style></head>
<body><main id="slot"></main>
<script>${react}<\/script><script>${reactDom}<\/script>
<script>window.__uiStrings = ${uiStrings};<\/script>
<script>${SHELL}<\/script><script>window.React = React;<\/script>
<script>${tool}<\/script></body></html>`, 'utf8');
  await pg.goto('file://' + page.replace(/\\/g, '/'));
  await pg.waitForTimeout(3500);

  // --canvas: shoot the animated diagram instead of the machine. It is the
  // 420px-tall thing a student sees first and the only surface here that is
  // Canvas2D rather than SVG, so nothing in the SSR tests can see it at all.
  // Needs a real animation frame or two, hence the longer settle.
  if (CANVAS_MODE) {
    const CANVAS_STATES = [
      [null, 'nothing selected'],
      ['igneous', 'igneous selected'],
      ['sedimentary', 'sedimentary selected'],
      ['metamorphic', 'metamorphic selected'],
    ];
    for (let i = 0; i < CANVAS_STATES.length; i++) {
      const [sel, caption] = CANVAS_STATES[i];
      await pg.evaluate((s) => window.__mount(s ? { selectedRock: s } : {}), sel);
      await pg.waitForTimeout(900);
      const label = 'canvas-' + String(i).padStart(2, '0') + '-' + (sel || 'none');
      const el = (await pg.$('canvas')) || (await pg.$('#slot'));
      await el.screenshot({ path: path.join(OUT, label + '.png') });
      console.log(label.padEnd(42) + caption);
    }
    await b.close();
    console.log('\nwrote ' + CANVAS_STATES.length + ' canvas shots to ' + OUT);
    return;
  }

  for (let i = 0; i < STATES.length; i++) {
    const [spec, agent, prog, caption] = STATES[i];
    await pg.evaluate((st) => window.__mount(st), stateFor(spec, agent, prog));
    await pg.waitForTimeout(120);

    if (prog === 'done') {
      // Click the tool's own Transform button and wait for the result panel.
      // prefers-reduced-motion is forced below, so the run resolves instantly.
      const btn = await pg.$('button:has-text("Transform!")');
      if (btn) { await btn.click(); await pg.waitForTimeout(300); }
    }

    const label = String(i).padStart(2, '0') + '-' + spec + '-' + (agent || 'none') + '-' + prog;
    const el = await pg.$('[data-rc-machine]');
    const target = el || (await pg.$('#slot'));
    await target.screenshot({ path: path.join(OUT, label + '.png') });
    console.log(label.padEnd(42) + caption);
  }
  await b.close();
  console.log('\nwrote ' + STATES.length + ' shots to ' + OUT);
})();
