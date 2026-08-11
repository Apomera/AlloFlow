// Screenshot Machine Lab across its views, machines, themes and wall states.
//
//   node dev-tools/ml_scene_shots.cjs <out-dir> [--dark] [--band=g68]
//
// WHY. Every visual claim in this tool is currently unverified: the 3D
// trebuchet, ballista and onager, the 3D wall, and above all the rubble heap
// that was the stated reason for NOT vendoring a physics engine. The SSR tests
// prove the markup exists and the numbers are right. They cannot see whether a
// thing is drawn in near-background colour, framed off camera, or simply not
// there, and that is the class of defect that has repeatedly survived every
// test in this repo and been caught only by looking.
//
// The real host module is loaded, not a stub, so these shots exercise the
// actual makeOrbitViewer, makeVoxelBatch and ensureThree paths. THREE and
// OrbitControls are PRELOADED from vendor/ so ensureThree short-circuits: a
// harness that lets it reach for a CDN silently produces the 2D fallback and
// the shots then "prove" a 3D view that never rendered.
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = process.argv[2] || '.';
const DARK = process.argv.includes('--dark');
// High contrast is a distinct THIRD palette, not dark with the knobs turned up.
// It carries its own hardcoded-colour risk and nobody had looked at it.
const CONTRAST = process.argv.includes('--contrast');
const BAND = (process.argv.find((a) => a.startsWith('--band=')) || '--band=g68').split('=')[1];

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const orbit = read('vendor/three-r128/OrbitControls.js');
const host = read('stem_lab/stem_lab_module.js');
const tool = read('stem_lab/stem_tool_machinelab.js');

// The tool ships no lang-pack entries yet, so every string resolves through
// __alloT's English fallback. A t() that returns the fallback is therefore an
// exact model of what a user sees today, not an approximation.
const SHELL = `
window.__mlReady = function () {
  return !!(window.StemLab && window.StemLab._registry && window.StemLab._registry.machineLab);
};
window.__mlMath = function () { return window.StemLab._registry.machineLab._math; };

window.__mount = function (state, opts) {
  opts = opts || {};
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.machineLab;
  var Host = function () {
    var pair = React.useState({ machineLab: state, archStudio: opts.archStudio || null });
    var ctx = {
      React: React, toolData: pair[0], setToolData: pair[1],
      isDark: !!opts.dark, isContrast: !!opts.contrast,
      gradeBand: opts.band || 'g68', gradeLevel: '7th Grade',
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

// Batter the wall with the tool's OWN model, so a damaged-wall shot shows a
// state the game can actually reach. Hand-authoring block states here would
// let the picture show a collapse the rules never produce.
window.__batter = function (preset, shots, aimRow) {
  var M = window.__mlMath();
  var blocks = M.buildWall(preset);
  for (var i = 0; i < shots; i++) {
    var row = (typeof aimRow === 'number') ? aimRow : (i % 2);
    var impact = { status: 'hit', y: row + 0.5, z: ((i * 7) % 9) - 4, v: 95, t: 1 };
    var res = M.applyDamage(blocks, impact, { projMass: 90, projDiameter: 0.45 });
    if (res && res.blocks) blocks = res.blocks;
  }
  return blocks;
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
const S = (o) => Object.assign({}, BASE, o);

// [label, state, opts, waitMs]
const SHOTS = [
  ['01-machines-lever', S({ view: 'machines', bench: 'lever' }), {}, 400],
  ['02-machines-pulley', S({ view: 'machines', bench: 'pulley' }), {}, 400],
  ['03-machines-screw', S({ view: 'machines', bench: 'screw' }), {}, 400],
  ['04-machines-k2', S({ view: 'machines', bench: 'ramp' }), { band: 'k2' }, 400],
  ['05-build-trebuchet', S({ view: 'build', machine: 'trebuchet' }), {}, 2600],
  ['06-build-ballista', S({ view: 'build', machine: 'ballista' }), {}, 2600],
  ['07-build-onager', S({ view: 'build', machine: 'onager' }), {}, 2600],
  ['08-range-fresh', S({ view: 'range' }), {}, 500],
  ['09-siege-fresh', S({ view: 'siege', wallPreset: 'curtain' }), {}, 2600],
  ['10-siege-gatehouse', S({ view: 'siege', wallPreset: 'gatehouse' }), {}, 2600],
  ['11-siege-motte', S({ view: 'siege', wallPreset: 'motte' }), {}, 2600],
  ['12-compare', S({ view: 'compare' }), {}, 500],
  ['13-manual-history', S({ view: 'learn', manualTopic: 'history' }), {}, 500],
  ['14-manual-model', S({ view: 'learn', manualTopic: 'model' }), {}, 500]
];

(async () => {
  const { chromium } = require('playwright');
  fs.mkdirSync(OUT, { recursive: true });

  const pagePath = path.join(OUT, 'ml-shots.html');
  fs.writeFileSync(pagePath, `<!doctype html><html lang="en"><head><meta charset="utf-8">
<style>body{margin:0;background:${CONTRAST ? '#000000' : (DARK ? '#0f172a' : '#f8fafc')};font-family:system-ui}</style></head>
<body><main id="slot"></main>
<script>${three}<\/script>
<script>${orbit}<\/script>
<script>${react}<\/script><script>${reactDom}<\/script>
<script>window.React = React;<\/script>
<script>${host}<\/script>
<script>${tool}<\/script>
<script>${SHELL}<\/script>
</body></html>`, 'utf8');

  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1180, height: 1500 }, deviceScaleFactor: 2 });
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e && e.message || e)));
  pg.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await pg.goto('file://' + pagePath.replace(/\\/g, '/'));
  await pg.waitForTimeout(1500);

  const ready = await pg.evaluate(() => ({
    tool: typeof window.__mlReady === 'function' && window.__mlReady(),
    three: !!window.THREE,
    orbit: !!(window.THREE && window.THREE.OrbitControls),
    orbitViewer: !!(window.StemLab && typeof window.StemLab.makeOrbitViewer === 'function'),
    voxel: !!(window.StemLab && typeof window.StemLab.makeVoxelBatch === 'function')
  }));
  console.log('harness:', JSON.stringify(ready));
  if (!ready.tool) { console.error('FAIL: tool did not register'); await b.close(); process.exit(2); }
  if (!ready.three || !ready.orbitViewer) {
    console.error('FAIL: 3D prerequisites missing; shots would show the 2D fallback and prove nothing');
    await b.close(); process.exit(2);
  }

  const manifest = [];
  for (const [label, state, opts, wait] of SHOTS) {
    let st = state;
    if (label === '09-siege-fresh') st = S({ view: 'siege', wallPreset: 'curtain' });
    await pg.evaluate(([s, o]) => window.__mount(s, o), [st, Object.assign({ dark: DARK || CONTRAST, contrast: CONTRAST, band: BAND }, opts)]);
    await pg.waitForTimeout(wait);
    const file = path.join(OUT, label + (CONTRAST ? '-contrast' : (DARK ? '-dark' : '')) + '.png');
    await pg.screenshot({ path: file, fullPage: true });
    manifest.push(label);
    console.log('shot', label);
  }

  // The one that matters most: a wall the tool's own rules actually knocked
  // down, so the rubble heap can be judged rather than assumed.
  for (const [preset, shots, aim, tag] of [
    ['curtain', 10, 0, 'base-course'],
    ['curtain', 22, null, 'heavy'],
    ['keep', 26, 0, 'keep'],
    ['motte', 14, 0, 'motte']
  ]) {
    const st = await pg.evaluate(([p, n, a]) => window.__batter(p, n, a), [preset, shots, aim]);
    const summary = st.reduce((acc, b2) => { acc[b2.state] = (acc[b2.state] || 0) + 1; return acc; }, {});
    await pg.evaluate(([s, o]) => window.__mount(s, o), [
      S({ view: 'siege', wallPreset: preset, wallBlocks: st, shotsFired: shots }),
      { dark: DARK || CONTRAST, contrast: CONTRAST, band: BAND }
    ]);
    await pg.waitForTimeout(2600);
    const label = '15-rubble-' + tag;
    await pg.screenshot({ path: path.join(OUT, label + (CONTRAST ? '-contrast' : (DARK ? '-dark' : '')) + '.png'), fullPage: true });
    console.log('shot', label, JSON.stringify(summary));
    manifest.push(label);
  }

  if (errors.length) {
    console.log('\nPAGE ERRORS (' + errors.length + '):');
    errors.slice(0, 12).forEach((e) => console.log('  ' + e));
  } else {
    console.log('\nno page errors');
  }
  console.log('\n' + manifest.length + ' shots -> ' + OUT);
  await b.close();
})();
