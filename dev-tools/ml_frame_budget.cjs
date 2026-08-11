// Measure how many frames Machine Lab's 3D bays actually draw.
//
//   node dev-tools/ml_frame_budget.cjs        (exit 0 = pass, 2 = fail)
//
// WHY. The spec, the code comments and the memory notes all claim that pushing
// `static: true` means an idle bay costs nothing and the loop only runs for the
// ~1.5 s of a shot. That claim has been asserted everywhere and measured
// nowhere. A no-tick orbit bay quietly burning 60 fps is a documented
// regression in this repo, and it is invisible to every other kind of test:
// the markup is identical, the numbers are identical, and the only symptom is
// a warm laptop.
//
// This counts real WebGLRenderer.render calls by wrapping the prototype before
// any scene is built.
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const orbit = read('vendor/three-r128/OrbitControls.js');
const host = read('stem_lab/stem_lab_module.js');
const tool = read('stem_lab/stem_tool_machinelab.js');

// Wrapped BEFORE the host module builds anything, so no renderer escapes it.
// three.js r128 assigns `render` as an OWN property on each WebGLRenderer
// instance, NOT on the prototype, so wrapping the prototype counts nothing at
// all. The first version of this file did exactly that and reported a serene
// 0 frames everywhere, including while the scene was visibly animating. Wrap
// the CONSTRUCTOR and patch each instance, and prove the counter works before
// trusting a single zero.
const COUNTER = `
window.__frames = 0;
(function () {
  var T = window.THREE;
  if (!T || !T.WebGLRenderer) { window.__counterFailed = 'no-THREE'; return; }
  var Real = T.WebGLRenderer;
  T.WebGLRenderer = function (opts) {
    var inst = new Real(opts);
    if (typeof inst.render === 'function') {
      var real = inst.render.bind(inst);
      inst.render = function () { window.__frames++; return real.apply(null, arguments); };
    } else { window.__counterFailed = 'no-instance-render'; }
    return inst;
  };
  T.WebGLRenderer.prototype = Real.prototype;
})();
window.__resetFrames = function () { window.__frames = 0; };
`;

const SHELL = `
window.__state = null;
window.__mount = function (state, opts) {
  opts = opts || {};
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.machineLab;
  var Host = function () {
    var pair = React.useState({ machineLab: state });
    window.__state = function () { return pair[0].machineLab; };
    var ctx = {
      React: React, toolData: pair[0], setToolData: pair[1],
      isDark: false, isContrast: false, gradeBand: 'g68', gradeLevel: '7th Grade',
      setStemLabTool: function(){}, setStemLabTab: function(){}, setToolSnapshots: function(){},
      addToast: function(){}, announceToSR: function(){}, awardXP: function(){},
      beep: function(){}, celebrate: function(){}, canvasNarrate: function(){},
      canvasA11yDesc: function(){}, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, stemLabTab: 'explore', stemLabTool: null,
      toolSnapshots: [], props: {}, srOnly: {},
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) { return fb != null ? fb : k; }, getXP: function () { return 0; }
    };
    return cfg.render(ctx);
  };
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return true;
};
window.__click = function (text) {
  var btns = Array.prototype.slice.call(document.querySelectorAll('button'));
  var hit = btns.filter(function (b) { return (b.textContent || '').trim().indexOf(text) !== -1; })[0];
  if (!hit || hit.disabled) return 'no';
  hit.click(); return 'ok';
};
`;

const BASE = {
  view: 'machines', bench: 'lever', machine: 'trebuchet',
  cwMass: 1200, cwDrop: 3.2, beamLong: 4.5, beamShort: 1.2, slingLength: 2.0, armMass: 60,
  projMass: 25, projDiameter: 0.24, releaseAngle: 45, launchElevation: 2,
  winchHandleR: 0.45, winchDrumR: 0.08, winchPulleys: 2,
  gravity: 9.81, drag: true, windZ: 0,
  torsionTurns: 12, torsionArmLength: 1.1, torsionDraw: 0.85, torsionArmMass: 6,
  ballistaStringMass: 0.35, onagerSling: 1.0,
  loadDistance: 0.5, leverEffortArm: 2.0, leverLoadArm: 1.0, leverLoad: 400,
  pulleySegments: 2, pulleyLoad: 400,
  windlassHandleR: 0.45, windlassDrumR: 0.10, windlassLoad: 400,
  rampLength: 4.0, rampHeight: 1.0, rampLoad: 400,
  wedgeLength: 0.30, wedgeThickness: 0.06, wedgeLoad: 800,
  screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000,
  standoff: 80, wallPreset: 'curtain', provenBenches: {}, shotHistory: [], machinesFired: []
};

const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail: String(detail === undefined ? '' : detail) }); }

(async () => {
  const { chromium } = require('playwright');
  const tmp = path.join(require('os').tmpdir(), 'ml-frames.html');
  fs.writeFileSync(tmp, `<!doctype html><html lang="en"><head><meta charset="utf-8">
<style>body{margin:0;background:#f8fafc;font-family:system-ui}</style></head>
<body><main id="slot"></main>
<script>${three}<\/script><script>${orbit}<\/script>
<script>${COUNTER}<\/script>
<script>${react}<\/script><script>${reactDom}<\/script>
<script>window.React = React;<\/script>
<script>${host}<\/script><script>${tool}<\/script><script>${SHELL}<\/script>
</body></html>`, 'utf8');

  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1180, height: 1400 } });
  await pg.goto('file://' + tmp.replace(/\\/g, '/'));
  await pg.waitForTimeout(1200);

  const S = (o) => Object.assign({}, BASE, o);

  // PREMISE GUARD. Every other check in this file reads a zero as good news, so
  // a counter that silently counts nothing would turn the whole run green while
  // measuring absolutely nothing. Prove it ticks on a scene that must render.
  await pg.evaluate((s) => window.__mount(s, {}), S({ view: 'build', machine: 'trebuchet' }));
  await pg.waitForTimeout(3000);
  const warmup = await pg.evaluate(() => window.__frames);
  const counterFail = await pg.evaluate(() => window.__counterFailed || null);
  check('the frame counter actually counts', warmup > 0 && !counterFail,
        warmup + ' frames while building the scene' + (counterFail ? ' | ' + counterFail : ''));
  if (!(warmup > 0)) {
    await b.close();
    results.forEach((x) => console.log((x.ok ? '  ok   ' : '  FAIL ') + x.name + (x.detail ? '   [' + x.detail + ']' : '')));
    console.error('the counter is not counting; every zero below would be meaningless');
    process.exit(2);
  }
  // Measure over a window long enough that a 60 fps loop is unmistakable:
  // 2.5 s of unthrottled rendering is ~150 frames.
  const WINDOW = 2500;
  async function framesOver(ms) {
    await pg.evaluate(() => window.__resetFrames());
    await pg.waitForTimeout(ms);
    return pg.evaluate(() => window.__frames);
  }

  // 1. A view with no 3D at all must never touch the GPU.
  await pg.evaluate((s) => window.__mount(s, {}), S({ view: 'machines' }));
  await pg.waitForTimeout(1200);
  let f = await framesOver(WINDOW);
  check('the Machine Shop draws no frames at all', f === 0, f + ' frames');

  // 2. The build bay, settled and idle. A handful of frames is fine (build,
  //    resize, first paint); anything near 60/s means the loop never parked.
  await pg.evaluate((s) => window.__mount(s, {}), S({ view: 'build', machine: 'trebuchet' }));
  await pg.waitForTimeout(3000);
  f = await framesOver(WINDOW);
  check('an idle trebuchet bay parks its loop', f <= 10, f + ' frames in ' + WINDOW + 'ms');

  // 3. The siege view holds TWO scenes' worth of expectation: it pushes
  //    static:true unconditionally, so it should be quieter still.
  await pg.evaluate((s) => window.__mount(s, {}), S({ view: 'siege', wallPreset: 'keep' }));
  await pg.waitForTimeout(3000);
  f = await framesOver(WINDOW);
  check('an idle target wall parks its loop', f <= 10, f + ' frames in ' + WINDOW + 'ms');

  // 4. Firing MUST wake the loop, or the animation claim is empty.
  await pg.evaluate((s) => window.__mount(s, {}), S({ view: 'build', machine: 'trebuchet' }));
  await pg.waitForTimeout(3000);
  await pg.evaluate(() => window.__resetFrames());
  await pg.evaluate(() => window.__click('Test fire'));
  await pg.waitForTimeout(1200);
  const during = await pg.evaluate(() => window.__frames);
  check('firing wakes the animation loop', during > 20, during + ' frames during the swing');

  // 5. ...and it must go back to sleep on its own.
  await pg.waitForTimeout(2600);
  f = await framesOver(WINDOW);
  check('the loop parks again once the shot is over', f <= 10, f + ' frames after the swing');

  // 6. A hidden document must not render at all.
  await pg.evaluate((s) => window.__mount(s, {}), S({ view: 'build' }));
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  f = await framesOver(WINDOW);
  check('a backgrounded tab draws nothing', f === 0, f + ' frames while hidden');

  await b.close();
  const failed = results.filter((x) => !x.ok);
  results.forEach((x) => console.log((x.ok ? '  ok   ' : '  FAIL ') + x.name + (x.detail ? '   [' + x.detail + ']' : '')));
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' frame-budget checks passed');
  if (failed.length) { console.error('\n' + failed.length + ' FAILED'); process.exit(2); }
})();
