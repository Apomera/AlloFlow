// Fly the Be-The-Water mode for real, and photograph each form on the way.
//
//   node dev-tools/wc_pilot_flight.cjs <out-dir> [--scenario=tropicalOcean]
//
// WHY THIS EXISTS. The static shot harness mounts a state and photographs it,
// which for this mode proves only that the sea renders. Every interesting
// surface - vapour above the cloud base, the nuclei that gate condensation, the
// droplet growing by coalescence, and the cloud culmination the mode is built
// around - is reachable ONLY by holding thrust for twenty-odd seconds. A shot
// cannot hold a key, so those five surfaces would go permanently unverified and
// a regression in any of them would look exactly like a passing run.
//
// So this drives the real input object the keyboard drives (`_wcPilotInput`),
// polls the parcel's form off the canvas dataset, and captures the frame the
// first time each form appears. It fails loudly if a form is never reached,
// because "the cloud never formed" is the single most important thing that can
// break here.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = process.argv[2] || '.';
const SCENARIO = (process.argv.find((a) => a.startsWith('--scenario=')) || '--scenario=tropicalOcean').split('=')[1];
// The budget is in SIMULATED seconds read off `dataset.parcelElapsed`, not wall
// time. Under swiftshader requestAnimationFrame timestamps advance ~10 ms per
// frame at ~8 fps, so the sim runs at roughly a tenth of wall speed and a
// wall-clock budget failed a perfectly healthy flight.
const BUDGET_SIM_S = Number((process.argv.find((a) => a.startsWith('--budget=')) || '--budget=240').split('=')[1]);
const WALL_CAP_MS = Number((process.argv.find((a) => a.startsWith('--wall=')) || '--wall=900000').split('=')[1]);

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const TW = path.join(ROOT, 'dev-tools', '.cache', 'sweep-tailwind.css');
if (!fs.existsSync(TW)) {
  console.error('Missing ' + path.relative(ROOT, TW) + ' - run node dev-tools/build_sweep_tailwind_css.cjs');
  process.exit(2);
}
const tailwindCss = fs.readFileSync(TW, 'utf8');
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const orbit = read('vendor/three-r128/OrbitControls.js');
const host = read('stem_lab/stem_lab_module.js');
const tool = read('stem_lab/stem_tool_watercycle.js');

// Forms worth a picture, in the order a warm-cycle flight meets them.
const WANTED = ['liquid', 'vapor', 'droplet', 'cloud', 'rain'];

// Mount shell copied verbatim from dev-tools/wc_scene_shots.cjs. Keeping it
// identical matters: that shell already encodes two non-obvious requirements
// (the registry lives at StemLab._registry, and _threeLoaded must be seeded or
// a loading overlay hides a live scene), and a hand-rolled variant that gets
// either wrong fails in a way that looks like a broken tool.
const SHELL = `
window.__wcReady = function () {
  return !!(window.StemLab && window.StemLab._registry && window.StemLab._registry.waterCycle);
};
window.__mount = function (state, dark) {
  document.documentElement.classList.toggle('dark', !!dark);
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.waterCycle;
  var Host = function () {
    var pair = React.useState({ waterCycle: state, _threeLoaded: !!window.THREE });
    var ctx = {
      React: React, toolData: pair[0], setToolData: pair[1],
      isDark: !!dark, isContrast: false, gradeBand: 'g68', gradeLevel: '7th Grade',
      setStemLabTool: function(){}, setStemLabTab: function(){}, setToolSnapshots: function(){},
      addToast: function(){}, announceToSR: function(){}, awardXP: function(){},
      beep: function(){}, celebrate: function(){}, canvasNarrate: function(){},
      canvasA11yDesc: function(){}, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, stemLabTab: 'explore', stemLabTool: null,
      toolSnapshots: [], props: {}, srOnly: {},
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) { return fb != null ? fb : k; },
      getXP: function () { return 0; }
    };
    return cfg.render(ctx);
  };
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return true;
};
`;

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String((e && e.stack) || e).slice(0, 500)));

  await pg.setContent('<!doctype html><html><head><style>body{margin:0;background:#f1f5f9;font-family:system-ui}</style>'
    + '</head><body><div id="slot" style="padding:12px"></div></body></html>');
  await pg.addStyleTag({ content: tailwindCss });
  for (const code of [react, reactDom, three, orbit, host, tool, SHELL]) await pg.addScriptTag({ content: code });
  if (!(await pg.evaluate(() => window.__wcReady()))) { console.error('FAIL: waterCycle never registered'); await b.close(); process.exit(2); }

  await pg.evaluate(({ s }) => window.__mount(s, false), { s: { wcMode: 'pilot', pilot: { scenario: SCENARIO } } });
  await pg.waitForTimeout(1200);
  // The launch card gates the sim: until it is dismissed React pins
  // `input.paused = true` on every render, so a harness that only pokes the
  // input object sits at "liquid" forever and reports a false failure.
  const launch = await pg.$('.wc-pilot-launch-btn');
  if (launch) { await launch.click(); await pg.waitForTimeout(600); }

  const live = await pg.evaluate(() => {
    const c = document.querySelector('canvas.wc-pilot-canvas');
    if (!c) return { ok: false, why: 'no pilot canvas' };
    const g = c.getContext('webgl2') || c.getContext('webgl');
    if (!g) return { ok: false, why: 'no GL context' };
    return { ok: !g.isContextLost(), why: g.isContextLost() ? 'context lost' : '', input: !!c._wcPilotInput };
  });
  if (!live.ok || !live.input) { console.error('FAIL: ' + (live.why || 'no _wcPilotInput')); await b.close(); process.exit(2); }

  const seen = new Set();
  const started = Date.now();
  let lastForm = '';
  let simT = 0;
  while (Date.now() - started < WALL_CAP_MS && simT < BUDGET_SIM_S && seen.size < WANTED.length) {
    // The autopilot: climb while vapour, hold a gentle lift once condensed so
    // coalescence has time to work, and drift downwind toward the land so the
    // landing is on a real surface rather than back into the open sea.
    const form = await pg.evaluate(() => {
      const c = document.querySelector('canvas.wc-pilot-canvas');
      const i = c && c._wcPilotInput;
      const f = c ? c.dataset.parcelForm : '';
      if (!i) return f;
      i.up = (f === 'vapor' || f === 'droplet' || f === 'ice') ? 1 : 0;
      i.down = 0;
      // Coalescence needs MOVEMENT through the droplet field now that the
      // field no longer rides with the parcel; sweep forward and weave.
      i.fwd = (f === 'droplet' || f === 'cloud') ? 1 : 0;
      i.right = (f === 'droplet' || f === 'cloud') && (Math.floor((Number(c.dataset.parcelElapsed) || 0) / 3) % 2 === 0) ? 1 : 0;
      i.left = (f === 'droplet' || f === 'cloud') && !i.right ? 1 : 0;
      return f;
    });
    simT = await pg.evaluate(() => Number(document.querySelector('canvas.wc-pilot-canvas').dataset.parcelElapsed) || 0);
    if (form && form !== lastForm) {
      lastForm = form;
      if (WANTED.includes(form) && !seen.has(form)) {
        seen.add(form);
        await pg.waitForTimeout(form === 'cloud' ? 2600 : 700);   // let the camera settle
        const el = await pg.$('.wc-pilot-stage');
        const file = path.join(OUT, `flight-${String(seen.size).padStart(2, '0')}-${form}.png`);
        if (el) await el.screenshot({ path: file });
        const alt = await pg.evaluate(() => document.querySelector('canvas.wc-pilot-canvas').dataset.parcelAltitudeM);
        console.log(`  reached ${form.padEnd(8)} @ ${String(alt).padStart(5)} m  after ${simT.toFixed(1)}s sim / ${((Date.now() - started) / 1000).toFixed(0)}s wall -> ${path.basename(file)}`);
      }
    }
    await pg.waitForTimeout(180);
  }

  const missed = WANTED.filter((f) => !seen.has(f));
  if (errors.length) console.error('PAGE ERRORS: ' + errors.join(' | '));
  if (missed.length) {
    console.error(`FAIL: never reached ${missed.join(', ')} within ${BUDGET_SIM_S}s of sim time (${simT.toFixed(0)}s simulated, ${((Date.now() - started) / 1000).toFixed(0)}s wall) on ${SCENARIO}`);
    await b.close();
    process.exit(1);
  }
  console.log(`OK: flew ${SCENARIO} through ${WANTED.join(' -> ')}${errors.length ? ' (with page errors)' : ''}`);
  await b.close();
  if (errors.length) process.exit(1);
})();
