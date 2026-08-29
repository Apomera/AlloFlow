// Screenshot every Weather Systems surface -- Map Lab (2D canvas), the
// Immersive 3D lab across scenarios / cameras / focus profiles / stage and
// presenter modes, Cause & Effect, Forecast Mission, Teacher Guide -- in light
// and dark, plus a phone viewport.
//
//   node dev-tools/build_sweep_tailwind_css.cjs      # once, if .cache is empty
//   node dev-tools/weather_scene_shots.cjs <out-dir> [--only=<substr>] [--wait=4500]
//
// WHY. The SSR suites (190 tests) prove source shapes and the contrast gates
// measure colour; neither can see a 3D scene whose camera stares at the wrong
// thing, a HUD that covers the subject, or a sky that reads as night at noon.
// Shots are the only check that looks. Same rationale as wc_scene_shots.cjs.
//
// WHAT EACH SHOT PROVES: 3D shots assert a LIVE, non-lost WebGL context and the
// tool's own immersiveSceneReady flag, and fail rather than photograph a parked
// canvas; mobile shots report horizontal overflow. Everything else is for eyes.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = process.argv[2] || '.';
const WAIT = Number((process.argv.find((a) => a.startsWith('--wait=')) || '--wait=4500').split('=')[1]);
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || '';
const SRC = (process.argv.find((a) => a.startsWith('--src=')) || '--src=stem_lab/stem_tool_weathersystems.js').split('=')[1];

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const TW_CSS_PATH = path.join(ROOT, 'dev-tools', '.cache', 'sweep-tailwind.css');
if (!fs.existsSync(TW_CSS_PATH)) {
  console.error('Missing ' + path.relative(ROOT, TW_CSS_PATH));
  console.error('Build it first:  node dev-tools/build_sweep_tailwind_css.cjs');
  process.exit(2);
}
const tailwindCss = fs.readFileSync(TW_CSS_PATH, 'utf8');
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const host = read('stem_lab/stem_lab_module.js');
const tool = read(SRC);
// The immersive scene reads window.THREE directly and gates on
// dataRoot._threeLoaded; its own loader only flips that flag when
// THREE.OrbitControls exists, so both must be preloaded.
const three = read('vendor/three-r128/three.min.js');
const orbit = read('vendor/three-r128/OrbitControls.js');

const SHELL = `
window.__wsReady = function () {
  return !!(window.StemLab && window.StemLab._registry && window.StemLab._registry.weatherSystems);
};
window.__mount = function (state, dark, grade) {
  document.documentElement.classList.toggle('dark', !!dark);
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.weatherSystems;
  var Host = function () {
    var pair = React.useState({ weatherSystems: state, _threeLoaded: !!(window.THREE && window.THREE.OrbitControls) });
    window.__wsState = pair[0];
    var ctx = {
      React: React, toolData: pair[0], setToolData: pair[1],
      isDark: !!dark, isContrast: false, gradeBand: 'g68', gradeLevel: grade || '7th Grade',
      setStemLabTool: function(){}, setStemLabTab: function(){}, setToolSnapshots: function(){},
      addToast: function(){}, announceToSR: function(){}, awardXP: function(){},
      beep: function(){}, celebrate: function(){}, canvasNarrate: function(){},
      canvasA11yDesc: function(){}, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, stemLabTab: 'explore', stemLabTool: null,
      toolSnapshots: [], props: {}, srOnly: {},
      setLabToolData: pair[1], labToolData: pair[0],
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

const IMM = { tab: 'immersive', immersiveQuality: 'balanced' };
const SHOTS = [
  ['01-map-light', {}, false],
  ['02-map-dark', {}, true],
  ['03-map-coldfront-h6-light', { scenario: 'coldFront', simHour: 6 }, false],
  ['04-map-winter-dark', { scenario: 'winterStorm', simHour: 3 }, true],
  ['05-map-fullpage-light', {}, false],
  ['06-map-fullpage-dark', {}, true],
  ['07-map-k2-light', {}, false, 'Kindergarten'],
  ['08-map-hs-light', { scenario: 'summerStorm' }, false, '11th Grade'],
  // Immersive conceptual 3D. Scenario x camera x focus x mode.
  ['10-imm-fair-light', Object.assign({}, IMM, { scenario: 'fair' }), false],
  ['11-imm-coldfront-light', Object.assign({}, IMM, { scenario: 'coldFront' }), false],
  ['12-imm-coldfront-dark', Object.assign({}, IMM, { scenario: 'coldFront' }), true],
  ['13-imm-warmfront-light', Object.assign({}, IMM, { scenario: 'warmFront', simHour: 4 }), false],
  ['14-imm-summerstorm-light', Object.assign({}, IMM, { scenario: 'summerStorm', simHour: 2 }), false],
  ['15-imm-winter-dark', Object.assign({}, IMM, { scenario: 'winterStorm', simHour: 2 }), true],
  ['16-imm-front-camera', Object.assign({}, IMM, { scenario: 'coldFront', immersiveCameraPreset: 'front', immersiveFocus: 'front', immersiveExplainerFeature: 'frontBoundary' }), false],
  ['17-imm-surface-camera', Object.assign({}, IMM, { scenario: 'coldFront', immersiveCameraPreset: 'surface', immersiveFocus: 'stations', immersiveExplainerFeature: 'stationMarkers' }), false],
  ['18-imm-moisture-focus', Object.assign({}, IMM, { scenario: 'warmFront', immersiveFocus: 'moisture', immersiveExplainerFeature: 'cloudLayer' }), true],
  ['19-imm-stage-mode', Object.assign({}, IMM, { scenario: 'coldFront', immersiveStageMode: true }), true],
  ['20-imm-presenter', Object.assign({}, IMM, { scenario: 'coldFront', immersiveAudienceMode: 'teacher', immersivePresenterMode: true, immersiveCheckpointRunnerOpen: true }), true],
  ['21-imm-mountain', Object.assign({}, IMM, { scenario: 'coldFront', immersiveGeography: 'mountain' }), false],
  ['22-imm-coastal', Object.assign({}, IMM, { scenario: 'winterStorm', immersiveGeography: 'coastal' }), false],
  ['23-imm-urban', Object.assign({}, IMM, { scenario: 'summerStorm', immersiveGeography: 'urban' }), false],
  ['24-imm-high-quality', Object.assign({}, IMM, { scenario: 'coldFront', immersiveQuality: 'high' }), false],
  ['25-imm-fullpage-light', Object.assign({}, IMM, { scenario: 'coldFront' }), false],
  ['26-imm-fullpage-dark', Object.assign({}, IMM, { scenario: 'coldFront', immersiveAudienceMode: 'teacher' }), true],
  ['27-imm-compare', Object.assign({}, IMM, { scenario: 'coldFront', immersiveComparisonFeature: 'airMasses', immersiveExplainerFeature: 'frontBoundary', immersiveInspectorPanel: 'compare' }), true],
  ['28-imm-k2', Object.assign({}, IMM, { scenario: 'coldFront' }), false, 'Kindergarten'],
  ['29-imm-fullscreen', Object.assign({}, IMM, { scenario: 'coldFront' }), true, null, 'fullscreen'],
  ['29b-imm-front-h6', Object.assign({}, IMM, { scenario: 'coldFront', simHour: 6, immersiveCameraPreset: 'front', immersiveFocus: 'front', immersiveExplainerFeature: 'frontBoundary' }), false],
  ['29c-imm-warm-front-h4', Object.assign({}, IMM, { scenario: 'warmFront', simHour: 4, immersiveCameraPreset: 'front', immersiveExplainerFeature: 'frontBoundary' }), false],
  ['29d-imm-stage-collapsed', Object.assign({}, IMM, { scenario: 'coldFront', immersiveStageMode: true, immersiveStageLegendCollapsed: true }), true],
  // Other tabs.
  ['30-experiment-light', { tab: 'experiment' }, false],
  ['31-experiment-dark', { tab: 'experiment', experimentVariable: 'humidity' }, true],
  ['32-forecast-light', { tab: 'forecast' }, false],
  ['33-forecast-dark', { tab: 'forecast', scenario: 'coldFront', simHour: 5 }, true],
  ['34-teacher-light', { tab: 'teacher' }, false],
  ['35-teacher-dark', { tab: 'teacher' }, true],
];

const MOBILE_SHOTS = [
  ['M1-map-light', {}, false],
  ['M2-imm-light', Object.assign({}, IMM, { scenario: 'coldFront' }), false],
  ['M3-imm-stage-dark', Object.assign({}, IMM, { scenario: 'coldFront', immersiveStageMode: true }), true],
  ['M4-forecast-light', { tab: 'forecast' }, false],
];

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [];
  async function prep(pg, pad) {
    pg.on('pageerror', (e) => errors.push(String((e && e.stack) || e).slice(0, 700)));
    await pg.setContent(
      '<!doctype html><html><head>'
      + '<style>body{margin:0;background:#f1f5f9;font-family:system-ui}.dark body{background:#0f172a}</style></head>'
      + '<body><div id="slot" style="padding:' + pad + 'px"></div></body></html>',
    );
    await pg.addStyleTag({ content: tailwindCss });
    const tw = await pg.evaluate(() => {
      const probe = document.createElement('div');
      probe.className = 'relative bg-slate-800';
      document.body.appendChild(probe);
      const cs = getComputedStyle(probe);
      const ok = cs.position === 'relative' && cs.backgroundColor === 'rgb(30, 41, 59)';
      probe.remove();
      return ok;
    });
    if (!tw) { console.error('FAIL: Tailwind stylesheet did not apply'); await b.close(); process.exit(2); }
    for (const code of [react, reactDom, three, orbit, host, tool, SHELL]) await pg.addScriptTag({ content: code });
    if (!(await pg.evaluate(() => window.__wsReady()))) { console.error('FAIL: weatherSystems never registered'); await b.close(); process.exit(2); }
  }

  async function glCheck(pg) {
    return pg.evaluate(() => {
      const c = document.querySelector('canvas[data-weather-immersive-canvas]');
      if (!c) return { ok: false, why: 'no immersive canvas in DOM' };
      const ctx = c.getContext('webgl2') || c.getContext('webgl');
      if (!ctx) return { ok: false, why: 'canvas has no GL context' };
      const s = window.__wsState && window.__wsState.weatherSystems || {};
      return { ok: !ctx.isContextLost() && !!s.immersiveSceneReady, why: ctx.isContextLost() ? 'context lost' : (!s.immersiveSceneReady ? 'immersiveSceneReady=false err=' + (s.immersiveRenderError || '') : ''), q: s.immersiveActiveQuality, cw: c.clientWidth, ch: c.clientHeight, bw: c.width, bh: c.height };
    });
  }

  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await prep(pg, 12);
  for (const [label, state, dark, grade, action] of SHOTS.filter((s) => !ONLY || s[0].indexOf(ONLY) !== -1)) {
    await pg.evaluate(({ s, d, g }) => window.__mount(s, d, g), { s: state, d: dark, g: grade || null });
    // Element screenshots scroll the page; a later mount into the same page inherits that
    // scroll and photographs the wrong strip.
    await pg.evaluate(() => window.scrollTo(0, 0));
    await pg.waitForTimeout(label.indexOf('imm') !== -1 ? WAIT : 2200);
    if (action === 'fullscreen') {
      // Drives the shared host helper: native fullscreen when the page allows it, the CSS
      // fill-frame fallback otherwise. Either way the stage should fill the viewport.
      await pg.click('[data-weather-fullscreen-toggle]');
      await pg.waitForTimeout(1800);
      const fs = await pg.evaluate(() => {
        const stage = document.querySelector('[data-weather-immersive-stage]');
        const r = stage && stage.getBoundingClientRect();
        return { mode: stage && stage.getAttribute('data-weather-immersive-stage'), w: r && Math.round(r.width), h: r && Math.round(r.height), vw: window.innerWidth, vh: window.innerHeight };
      });
      console.log('   fullscreen: ' + JSON.stringify(fs));
    }
    const file = path.join(OUT, label + '.png');
    await pg.screenshot({ path: file, fullPage: label.indexOf('fullpage') !== -1 });
    let glNote = '';
    if (label.indexOf('imm') !== -1 && label.indexOf('fullpage') === -1) {
      const gl = await glCheck(pg);
      if (!gl.ok) { console.error('FAIL: ' + label + ' - ' + gl.why); continue; }
      glNote = '  [GL live q=' + gl.q + ' css=' + gl.cw + 'x' + gl.ch + ' buf=' + gl.bw + 'x' + gl.bh + ']';
      const cv = await pg.$('canvas[data-weather-immersive-canvas]');
      if (cv) await cv.screenshot({ path: path.join(OUT, label + '-canvas.png') });
    }
    if (label.indexOf('map') !== -1 && label.indexOf('fullpage') === -1) {
      const cv = await pg.$('canvas[data-weather-map-canvas]');
      if (cv) await cv.screenshot({ path: path.join(OUT, label + '-canvas.png') });
    }
    console.log('shot ' + label + glNote + (errors.length ? '  ERRORS: ' + errors.join(' | ') : ''));
  }

  const mob = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await prep(mob, 8);
  for (const [label, state, dark] of MOBILE_SHOTS.filter((s) => !ONLY || s[0].indexOf(ONLY) !== -1)) {
    await mob.evaluate(({ s, d }) => window.__mount(s, d, null), { s: state, d: dark });
    await mob.waitForTimeout(label.indexOf('imm') !== -1 ? WAIT : 2200);
    await mob.screenshot({ path: path.join(OUT, label + '.png'), fullPage: true });
    const overflow = await mob.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      win: window.innerWidth,
      widest: (() => {
        let worst = null;
        document.querySelectorAll('#slot *').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > window.innerWidth + 1 && (!worst || r.right > worst.right)) {
            worst = { right: Math.round(r.right), cls: (el.className || '').toString().slice(0, 60) };
          }
        });
        return worst;
      })(),
    }));
    const bad = overflow.doc > overflow.win + 1;
    console.log('shot ' + label + (bad
      ? '  OVERFLOW doc=' + overflow.doc + ' > win=' + overflow.win + (overflow.widest ? ' worst=' + JSON.stringify(overflow.widest) : '')
      : '  [no h-overflow]'));
  }

  await b.close();
  if (errors.length) { console.error('PAGE ERRORS:\n' + errors.join('\n')); process.exit(1); }
  console.log('done, no page errors');
})();
