// Does a STEM tool's 3-D canvas still follow its container after three.js has sized it?
//
//   node dev-tools/stem_canvas_resize_check.cjs <out-dir>
//   node dev-tools/stem_canvas_resize_check.cjs <out-dir> --tool=galaxy
//
// Found 2026-08-16 in Galaxy Explorer. `renderer.setSize(w, h)` leaves updateStyle at
// its default of true, so three.js writes width/height in PIXELS onto the canvas's
// inline style. Where the canvas is laid out at width:100%/height:100% and w/h were
// measured FROM that canvas, the element pins itself to its first measurement and can
// never change size again — and the ResizeObserver watching that same canvas therefore
// never fires either. The visible symptom is "fullscreen does nothing" and "the scene
// ignores a window resize", neither of which points at the real cause.
//
// Two independent signals, because either alone lies:
//   1. INSTRUMENTED — THREE.WebGLRenderer is wrapped before the tool runs, so every
//      setSize call is recorded with its updateStyle argument, along with whether the
//      renderer was handed an existing canvas and what that canvas's CSS size was
//      BEFORE three touched it. A percentage CSS size + updateStyle !== false is the
//      defect signature.
//   2. MEASURED — the viewport is resized and every canvas is re-measured. A canvas
//      that does not follow its own parent is pinned, whatever the instrumentation says.
// A tool passes only if neither signal fires.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.';
const onlyTool = (process.argv.find((a) => a.startsWith('--tool=')) || '').split('=')[1];
// Point --tool at a different copy of its source (an older revision, say) to confirm
// this gate actually discriminates rather than passing everything.
const srcOverride = (process.argv.find((a) => a.startsWith('--src=')) || '').split('=')[1];

const read = (p) => fs.readFileSync(path.isAbsolute(p) ? p : path.join(ROOT, p), 'utf8');

// tool file -> registered id, plus any state needed to reach the 3-D view.
const TOOLS = [
  { file: 'stem_tool_galaxy.js', id: 'galaxy', state: { simMode: 'galaxy' } },
  { file: 'stem_tool_particlelab3d.js', id: 'particleLab3d', state: {} },
  { file: 'stem_tool_cephalopodlab.js', id: 'cephalopodLab', state: {} },
  { file: 'stem_tool_echolocation.js', id: 'echolocation', state: {} },
  { file: 'stem_tool_geosandbox.js', id: 'geoSandbox', state: {} },
  { file: 'stem_tool_solarsystem.js', id: 'solarSystem', state: {} },
  { file: 'stem_tool_raptorhunt.js', id: 'raptorHunt', state: {} },
  { file: 'stem_tool_moonmission.js', id: 'moonMission', state: {} },
  { file: 'stem_tool_roadready.js', id: 'roadReady', state: {} },
  { file: 'stem_tool_optics.js', id: 'opticsLab', state: {} },
  { file: 'stem_tool_echotrainer.js', id: 'echoTrainer', state: {} },
  { file: 'stem_tool_astronomy.js', id: 'astronomy', state: {} },
];

// Wraps THREE before any tool code runs. Kept as a string so it can be injected
// straight into the page ahead of the tool script.
const INSTRUMENT = `
window.__setSizeCalls = [];
window.__threeCanvases = 0;
(function () {
  var Real = window.THREE.WebGLRenderer;
  function Wrapped(opts) {
    var inst = new Real(opts);
    var bound = opts && opts.canvas ? opts.canvas : null;
    // Tag the canvas three owns. Only these can suffer the pinning bug — a tool's
    // other canvases (a fixed-size minimap, a 2-D chart) legitimately ignore a
    // container resize, and counting them produced a false positive on echoTrainer.
    try {
      var owned = inst.domElement;
      if (owned && owned.setAttribute) {
        owned.setAttribute('data-three-canvas', String(++window.__threeCanvases));
        owned.setAttribute('data-three-css-before',
          bound ? ((bound.style.width || '(none)') + ' x ' + (bound.style.height || '(none)')) : '(three-created)');
      }
    } catch (e) {}
    // The CSS size BEFORE three writes anything. A percentage here is what makes the
    // px write destructive; a canvas three created itself has no CSS size to lose.
    var cssBefore = bound ? { width: bound.style.width || '(none)', height: bound.style.height || '(none)' } : null;
    var attrBefore = bound ? (bound.getAttribute('style') || '') : '';
    var realSetSize = inst.setSize.bind(inst);
    inst.setSize = function (w, h, updateStyle) {
      window.__setSizeCalls.push({
        w: Math.round(w), h: Math.round(h),
        updateStyle: updateStyle === undefined ? 'default(true)' : String(updateStyle),
        boundCanvas: !!bound,
        cssBefore: cssBefore,
        attrBefore: attrBefore.slice(0, 120),
      });
      return realSetSize(w, h, updateStyle);
    };
    return inst;
  }
  Wrapped.prototype = Real.prototype;
  window.THREE.WebGLRenderer = Wrapped;
})();
`;

const SHELL = `
window.StemLab = window.StemLab || {};
window.StemLab._registry = window.StemLab._registry || {};
window.StemLab.registerTool = function (id, cfg) { window.StemLab._registry[id] = cfg; };
window.StemLab.findById = function (a, i) { return (a || []).find(function (x) { return x && x.id === i; }) || null; };
window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
window.StemLab.loadScriptResilient = function () { return Promise.resolve(); };
window.StemLab.registerHelper = function () {}; window.StemLab.getHelper = function () { return null; };
window.StemLab.makeBayViewer = function () { return { attach:function(){}, sync:function(){}, nudge:function(){}, zoom:function(){}, reset:function(){}, status:function(){return 'idle';} }; };

window.__mount = function (id, state) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry[id];
  if (!cfg) return 'ids: ' + Object.keys(window.StemLab._registry).join(',');
  var seed = {}; seed[id] = state || {};
  var Host = function () {
    var pair = React.useState(seed);
    var labPair = React.useState({});
    var ctx = { React: React, toolData: pair[0], setToolData: pair[1],
      labToolData: labPair[0], setLabToolData: labPair[1],
      setStemLabTool: function(){}, setStemLabTab: function(){}, setToolSnapshots: function(){},
      addToast: function(){}, announceToSR: function(){}, awardXP: function(){}, beep: function(){},
      celebrate: function(){}, canvasNarrate: function(){}, canvasA11yDesc: function(){},
      callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, gradeLevel: '5th',
      stemLabTab: 'explore', stemLabTool: null, toolSnapshots: [], props: {}, srOnly: {},
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) { return fb != null ? fb : k; },
      getXP: function () { return 0; }, update: function(){}, updateMulti: function(){}, tryAward: function(){} };
    return cfg.render(ctx);
  };
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return 'ok';
};
`;

const BIG = { width: 1200, height: 900 };
const SMALL = { width: 720, height: 620 };

function measureScript() {
  // Only the canvases three owns: see the tagging note in INSTRUMENT.
  return () => Array.from(document.querySelectorAll('canvas[data-three-canvas]')).map((cv, i) => {
    const r = cv.getBoundingClientRect();
    const p = cv.parentElement;
    const pr = p ? p.getBoundingClientRect() : null;
    return {
      i,
      w: Math.round(r.width), h: Math.round(r.height),
      pw: pr ? Math.round(pr.width) : 0, ph: pr ? Math.round(pr.height) : 0,
      styleW: cv.style.width || '', styleH: cv.style.height || '',
      cssBefore: cv.getAttribute('data-three-css-before') || '',
      mark: cv.getAttribute('data-galaxy-canvas') ? 'galaxy' : (cv.className || '').slice(0, 24),
    };
  });
}

async function runTool(chromium, tool) {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: BIG, deviceScaleFactor: 1 });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));

  const file = path.join(OUT, 'resize-' + tool.id + '.html');
  fs.writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"><\/script>
<style>body{margin:0;padding:8px;background:#0f172a;font-family:system-ui}</style></head>
<body><main id="slot"></main>
<script>${read('desktop/web-app/node_modules/react/umd/react.production.min.js')}<\/script>
<script>${read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js')}<\/script>
<script>${read('vendor/three-r128/three.min.js')}<\/script>
<script>${read('vendor/three-r128/OrbitControls.js')}<\/script>
<script>${INSTRUMENT}<\/script>
<script>${SHELL}<\/script><script>window.React = React;<\/script>
<script>${read(srcOverride && onlyTool === tool.id ? srcOverride : 'stem_lab/' + tool.file)}<\/script></body></html>`, 'utf8');

  await pg.goto('file://' + file.replace(/\\/g, '/'));
  await pg.waitForTimeout(1200);
  const mounted = await pg.evaluate(([id, st]) => window.__mount(id, st), [tool.id, tool.state]);
  if (mounted !== 'ok') {
    console.log(tool.id.padEnd(16) + 'SKIP  ' + mounted.slice(0, 110));
    await b.close();
    return { id: tool.id, status: 'skip' };
  }
  await pg.waitForTimeout(4000);

  const calls = await pg.evaluate(() => window.__setSizeCalls);
  const before = await pg.evaluate(measureScript());
  await pg.setViewportSize(SMALL);
  await pg.waitForTimeout(1800);
  const after = await pg.evaluate(measureScript());

  if (!calls.length) {
    console.log(tool.id.padEnd(16) + 'N/A   no WebGL renderer built in the default view'
      + (errs.length ? '  [' + errs[0] + ']' : ''));
    await b.close();
    return { id: tool.id, status: 'not-reached' };
  }

  // Signal 1: a bound canvas that had a percentage CSS size, sized with updateStyle on.
  const risky = calls.filter((c) => c.boundCanvas && c.updateStyle !== 'false'
    && c.cssBefore && /%/.test(c.cssBefore.width + c.cssBefore.height));
  // Signal 2: a canvas whose parent changed width but which did not follow.
  const pinned = before.map((bef, i) => ({ bef, aft: after[i] }))
    .filter(({ bef, aft }) => aft && bef.w > 0
      && Math.abs(aft.pw - bef.pw) > 8         // its container really did change
      && Math.abs(aft.w - bef.w) <= 1          // ...and it did not
      // A canvas the tool itself sized in px (a fixed minimap) is meant to stay put.
      && !/^\d+px x \d+px$/.test(bef.cssBefore));

  const status = risky.length || pinned.length ? 'FAIL' : 'ok';
  console.log(tool.id.padEnd(16) + (status === 'ok' ? 'OK   ' : 'FAIL ')
    + calls.length + ' setSize call(s), '
    + calls.filter((c) => c.updateStyle === 'false').length + ' with updateStyle=false');
  risky.forEach((c) => console.log('    risky: bound canvas was css ' + c.cssBefore.width + ' x ' + c.cssBefore.height
    + ', sized ' + c.w + 'x' + c.h + ' with updateStyle=' + c.updateStyle));
  pinned.forEach(({ bef, aft }) => console.log('    pinned: canvas[' + bef.i + '] "' + bef.mark + '" stayed '
    + bef.w + 'x' + bef.h + ' while its parent went ' + bef.pw + ' -> ' + aft.pw + ' (inline ' + aft.styleW + ')'));
  if (errs.length) console.log('    pageerror: ' + errs[0]);

  await b.close();
  return { id: tool.id, status };
}

(async () => {
  const { chromium } = require('playwright');
  const list = onlyTool ? TOOLS.filter((t) => t.id === onlyTool) : TOOLS;
  if (!list.length) { console.log('no such tool in the list'); process.exit(2); }
  const results = [];
  for (const tool of list) {
    try {
      results.push(await runTool(chromium, tool));
    } catch (e) {
      console.log(tool.id.padEnd(16) + 'ERROR ' + String(e.message).split(/\r?\n/)[0]);
      results.push({ id: tool.id, status: 'error' });
    }
  }
  const bad = results.filter((r) => r.status === 'FAIL' || r.status === 'error');
  console.log('\n' + (bad.length
    ? 'canvas resize: ' + bad.map((r) => r.id).join(', ') + ' need attention'
    : 'canvas resize: every tool reached follows its container'));
  process.exit(bad.length ? 1 : 0);
})();
