// Screenshot Solar System Explorer across the orrery and the rover/drone worlds.
//
//   node dev-tools/ss_scene_shots.cjs <out-dir> [--planet=mars] [--wait=4000]
//
// WHY. Every visual claim in this tool is otherwise unverified. The SSR suites
// prove the markup and the numbers; they cannot see a boulder rendered as a fan
// of loose triangles, a label stack that has piled up on itself, or a horizon
// drawn in near-sky colour. That class of defect has repeatedly survived every
// test in this repo and been caught only by looking.
//
// THREE and OrbitControls are PRELOADED from vendor/, so the tool's loader
// short-circuits. A harness that lets it reach for the CDN silently renders the
// 2D fallback, and the shots then "prove" a 3D scene that never existed.
//
// Two traps, both of which produced confident nonsense before they were pinned:
//   1. `viewTab:'drone'` alone does NOT mount the drone view - `sel` must
//      resolve, and PLANETS carry `name: t('stem.solar_sys.<x>')`. This harness
//      echoes keys from t(), so `selectedPlanet` must be the KEY STRING
//      ('stem.solar_sys.mars'), never 'Mars'.
//   2. "First canvas with a GL context" returns the ORRERY, not the drone.
//      Select the drone canvas by [data-drone-canvas] or five planets will
//      report byte-identical pixels, which is the tell.
//   3. TAILWIND MUST BE LOADED. The drone canvas's wrapper carries the class
//      `relative`; with no stylesheet it computes to position:static, so every
//      absolutely-positioned overlay - the rover HUD above all - escapes to a
//      further ancestor and lands ~134px ABOVE the canvas. That looks exactly
//      like a real clipping bug and is not one. Measured, not assumed:
//      hud.top - canvas.top was -134 at 1280x860, 1440x720 and 1100x620 alike,
//      and the wrapper reported position:static while its className said
//      `relative rounded-xl overflow-hidden`.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = process.argv[2] || '.';
const WAIT = Number((process.argv.find((a) => a.startsWith('--wait=')) || '--wait=4200').split('=')[1]);
const ONLY = (process.argv.find((a) => a.startsWith('--planet=')) || '').split('=')[1] || '';

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const orbit = read('vendor/three-r128/OrbitControls.js');
const host = read('stem_lab/stem_lab_module.js');
const tool = read('stem_lab/stem_tool_solarsystem.js');

const SHELL = `
window.__ssReady = function () {
  return !!(window.StemLab && window.StemLab._registry && window.StemLab._registry.solarSystem);
};
window.__mount = function (state) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.solarSystem;
  var Host = function () {
    var pair = React.useState({ solarSystem: state });
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
      t: function (k, fb) { return fb != null ? fb : k; },
      getXP: function () { return 0; }
    };
    return cfg.render(ctx);
  };
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return true;
};
// Report which canvases actually carry a GL context, so a shot can never be
// silently taken of a 2D fallback.
window.__glReport = function () {
  return Array.prototype.slice.call(document.querySelectorAll('canvas')).map(function (c) {
    return {
      drone: c.hasAttribute('data-drone-canvas'),
      w: c.width, h: c.height,
      gl: !!(c.getContext('webgl2', {}) || c.getContext('webgl', {}))
    };
  });
};
`;

// PLANETS match on t('stem.solar_sys.<x>'); this harness echoes the key.
const K = (p) => 'stem.solar_sys.' + p;
const BASE = { viewTab: 'overview', selectedPlanet: null, simSpeed: 1, paused: false };
const S = (o) => Object.assign({}, BASE, o);

let SHOTS = [
  ['01-orrery', S({ viewTab: 'overview' })],
  ['02-orrery-selected', S({ viewTab: 'overview', selectedPlanet: K('mars') })],
  ['03-drone-mars', S({ viewTab: 'drone', selectedPlanet: K('mars') })],
  ['04-drone-pluto', S({ viewTab: 'drone', selectedPlanet: K('pluto') })],
  ['05-drone-venus', S({ viewTab: 'drone', selectedPlanet: K('venus') })],
  ['06-drone-earth', S({ viewTab: 'drone', selectedPlanet: K('earth') })],
  ['07-drone-jupiter', S({ viewTab: 'drone', selectedPlanet: K('jupiter') })]
];
if (ONLY) SHOTS = SHOTS.filter((s) => s[0].indexOf(ONLY) !== -1);

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));

  await pg.setContent(
    '<!doctype html><html><head><script src="https://cdn.tailwindcss.com"><\/script>'
    + '<style>body{margin:0;background:#0f172a;font-family:system-ui}</style></head>'
    + '<body><div id="slot"></div></body></html>',
    { waitUntil: 'networkidle' },
  );
  const tw = await pg.evaluate(() => typeof window.tailwind !== 'undefined');
  if (!tw) { console.error('FAIL: Tailwind did not load - overlays would be mispositioned (see trap 3)'); await b.close(); process.exit(2); }
  for (const code of [react, reactDom, three, orbit, host, tool, SHELL]) {
    await pg.addScriptTag({ content: code });
  }
  const ready = await pg.evaluate(() => window.__ssReady());
  if (!ready) { console.error('FAIL: solarSystem never registered'); await b.close(); process.exit(2); }

  const manifest = [];
  for (const [label, state] of SHOTS) {
    await pg.evaluate((s) => window.__mount(s), state);
    await pg.waitForTimeout(WAIT);
    const gl = await pg.evaluate(() => window.__glReport());
    const wantDrone = label.indexOf('drone') !== -1;
    const sel = wantDrone ? 'canvas[data-drone-canvas]' : 'canvas';
    const cv = await pg.$(sel);
    if (!cv) {
      console.error('FAIL: ' + label + ' - no ' + (wantDrone ? 'drone ' : '') + 'canvas mounted; GL report ' + JSON.stringify(gl));
      continue;
    }
    // Shoot the WRAPPER, not the bare canvas: the HUD, the action buttons and
    // the orrery's planet labels are DOM siblings of the canvas, so a
    // canvas-only capture silently omits every overlay a student actually sees.
    const placement = await pg.evaluate((s) => {
      const c = document.querySelector(s);
      const wrap = c.parentElement;
      const overlays = Array.prototype.slice.call(wrap.children).filter((e) => e !== c && getComputedStyle(e).position === 'absolute');
      const C = c.getBoundingClientRect();
      const escaped = overlays.filter((e) => {
        const R = e.getBoundingClientRect();
        return R.height > 0 && (R.top < C.top - 2 || R.left < C.left - 2);
      }).length;
      return { wrapPos: getComputedStyle(wrap).position, overlays: overlays.length, escaped: escaped };
    }, sel);
    if (placement.wrapPos === 'static') {
      console.error('FAIL: ' + label + ' - canvas wrapper is position:static, overlays will escape (trap 3)');
      continue;
    }
    const handle = await pg.evaluateHandle((s) => document.querySelector(s).parentElement, sel);
    const file = path.join(OUT, label + '.png');
    await handle.asElement().screenshot({ path: file });
    manifest.push(label);
    console.log('shot ' + label + '  gl=' + JSON.stringify(gl) + '  overlays=' + placement.overlays + ' escaped=' + placement.escaped);
  }

  if (errors.length) {
    console.log('\nPAGE ERRORS (' + errors.length + '):');
    errors.slice(0, 10).forEach((e) => console.log('  ' + e));
  } else {
    console.log('\nno page errors');
  }
  console.log('\n' + manifest.length + '/' + SHOTS.length + ' shots -> ' + OUT);
  await b.close();
})();
