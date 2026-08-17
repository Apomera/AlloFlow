// Screenshot the Water Cycle explorer scene and steward setup, light + dark.
//
//   node dev-tools/wc_scene_shots.cjs <out-dir> [--wait=9000]
//
// WHY. The 2026-08-16 visual pass added volumetric gradient clouds, a leaping
// fish, shore cattails, a night shooting star, and CSS depth polish. The SSR
// suites prove the source shapes; they cannot see a cloud rendered as a grey
// slab or a reed drawn into the ocean. Shots are the only check that looks.
//
// The wait is deliberately >8.7s: the fish cycle is 520 ticks (~8.7s at 60fps),
// so a full wait guarantees the fish/splash code path EXECUTED at least once
// under the pageerror listener even when the shot itself misses the jump.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = process.argv[2] || '.';
const WAIT = Number((process.argv.find((a) => a.startsWith('--wait=')) || '--wait=9000').split('=')[1]);

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
// Tailwind is INLINED (pass --tailwind=<file> of the Play CDN script): the
// sandboxed harness browser has no network, and without Tailwind `relative`
// wrappers compute to position:static and every overlay escapes the canvas.
const twPath = (process.argv.find((a) => a.startsWith('--tailwind=')) || '').split('=')[1];
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const host = read('stem_lab/stem_lab_module.js');
const tool = read('stem_lab/stem_tool_watercycle.js');
// The 3D journey reads window.THREE DIRECTLY and parks at engineState='loading'
// when it is absent - it never fetches. Without this preload the 3D shots would
// photograph an empty canvas and "prove" a scene that never rendered.
const three = read('vendor/three-r128/three.min.js');
// OrbitControls too: the host's real readiness gate is
// `window.THREE && window.THREE.OrbitControls`, so loading core alone would
// diverge from production.
const orbit = read('vendor/three-r128/OrbitControls.js');

const SHELL = `
window.__wcReady = function () {
  return !!(window.StemLab && window.StemLab._registry && window.StemLab._registry.waterCycle);
};
window.__mount = function (state, dark) {
  document.documentElement.classList.toggle('dark', !!dark);
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.waterCycle;
  var Host = function () {
    // _threeLoaded is normally set by the HOST component's useEffect, which
    // render()-only mounting bypasses; without it the "Loading the 3D water
    // journey..." overlay covers a scene that is actually live.
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

// Fabricated 10-year campaign so the debrief + trend chart render without
// playing the game. Shapes mirror defaultStewardState()/yearLog snapshots.
const WS_IDS = ['headwaterStreams', 'riverMainstem', 'floodplainWetlands', 'forestBuffer', 'agriculturalWatershed', 'suburbanEdges'];
const wsYearLog = Array.from({ length: 10 }, (_, i) => ({
  year: i + 1,
  post: WS_IDS.map((id, k) => ({ id, quality: Math.min(96, 34 + k * 3 + i * 4 + ((i * 7 + k * 13) % 9)), connectivity: 50 + i * 2, support: 45 + i * 3 })),
  cascades: [],
}));
const wsDebrief = {
  phase: 'debrief', difficulty: 'coordinator', year: 11, maxYears: 10,
  hoursPerYear: 18, hoursLeft: 0, yearActions: [], cascadesFiredThisYear: [],
  connectivityBoosts: 3, fundingBonusNextYear: 0, deepDiveComponent: null,
  components: wsYearLog[9].post.map((c) => Object.assign({}, c)),
  yearLog: wsYearLog,
  finalOutcome: { color: '#10b981', icon: '\u{1F3C6}', label: 'Thriving watershed', desc: 'Fabricated harness state to render the debrief and trend chart.' },
};

// Mid-campaign states. 'year' = the planning board, 'review' = the end-of-year
// debrief with its event card and per-component deltas.
const wsMidComponents = WS_IDS.map((id, k) => ({ id, quality: 48 + k * 6, connectivity: 44 + k * 5, support: 40 + k * 7 }));
const wsYear = {
  phase: 'year', difficulty: 'coordinator', year: 4, maxYears: 10,
  hoursPerYear: 18, hoursLeft: 11, yearActions: [], cascadesFiredThisYear: [],
  connectivityBoosts: 1, fundingBonusNextYear: 0, deepDiveComponent: null,
  components: wsMidComponents.map((c) => Object.assign({}, c)),
  yearLog: wsYearLog.slice(0, 3), lastEvent: null, finalOutcome: null,
};
const wsReview = Object.assign({}, wsYear, {
  phase: 'review', hoursLeft: 0,
  lastEvent: { id: 'drought', icon: '☀️', name: 'Drought year', desc: 'A dry summer lowered headwater flows.' },
  cascadesFiredThisYear: [{ msg: 'Shaded buffers held headwater temperature despite low flow.' }],
  yearLog: wsYearLog.slice(0, 3).concat([{
    year: 4, eventId: 'drought', event: 'Drought year', eventIcon: '☀️',
    eventDesc: 'A dry summer lowered headwater flows.',
    pre: wsMidComponents.map((c) => Object.assign({}, c)),
    post: wsMidComponents.map((c, k) => Object.assign({}, c, { quality: c.quality + (k % 3 === 0 ? -6 : 4), support: c.support + 3 })),
    actions: [], cascades: [{ msg: 'Shaded buffers held headwater temperature despite low flow.' }],
  }]),
});

const SHOTS = [
  ['01-explorer-light', {}, false],
  ['02-explorer-dark', {}, true],
  ['03-explorer-night-light', { climSolar: 0.2, climateAdjusted: true }, false],
  ['04-steward-setup-light', { wcMode: 'steward' }, false],
  ['05-steward-setup-dark', { wcMode: 'steward' }, true],
  ['06-steward-debrief-light', { wcMode: 'steward', steward: wsDebrief }, false],
  ['07-steward-debrief-dark', { wcMode: 'steward', steward: wsDebrief }, true],
  // Precipitation Lab: values copied verbatim from WC_PRECIP_PRESETS so the
  // scenes match what the preset buttons produce.
  ['08-preciplab-rain-light', { wcMode: 'precipHunt' }, false],
  ['09-preciplab-storm-dark', { wcMode: 'precipHunt', precipHunt: { preset: 'summerStorm', moisture: 94, tempC: -6, midLevelTempC: 8, lowLevelHumidity: 82, surfaceTempC: 28, wind: 22, windDirection: 'east', updraft: 78, cloudDepth: 11, terrain: 'plains' } }, true],
  ['10-preciplab-snow-light', { wcMode: 'precipHunt', precipHunt: { preset: 'mountainSnow', moisture: 88, tempC: -16, midLevelTempC: -10, lowLevelHumidity: 76, surfaceTempC: -5, wind: 20, windDirection: 'east', updraft: 58, cloudDepth: 8, terrain: 'mountains' } }, false],
  // 3D journey. journeyActive + journeyState mirror openPrecipitationIn3d().
  ['11-journey3d-evaporating', { journeyView: '3d', journeyActive: true, journeyState: 'evaporating', journeyPaused: false, activeStage: 'evaporation' }, false],
  ['12-journey3d-precipitating', { journeyView: '3d', journeyActive: true, journeyState: 'precipitating', journeyPaused: false, activeStage: 'precipitation' }, false],
  ['13-journey3d-aquifer-dark', { journeyView: '3d', journeyActive: true, journeyState: 'aquifer_flow', journeyPaused: false, activeStage: 'infiltration' }, true],
  // Canvas scenes that only exist under particular climate/land settings.
  ['17-canvas-urban', { landCover: 'urban', landAdjusted: true, runoffIndex: 82 }, false],
  ['18-canvas-freezing', { climTemp: -12, climateAdjusted: true }, false],
  ['19-canvas-storm', { climTemp: 34, landRainIntensity: 92, climateAdjusted: true, landAdjusted: true }, false],
  ['14-steward-year-light', { wcMode: 'steward', steward: wsYear }, false],
  ['15-steward-review-light', { wcMode: 'steward', steward: wsReview }, false],
  ['16-steward-review-dark', { wcMode: 'steward', steward: wsReview }, true],
];

// Narrow-viewport pass: the tool carries a lot of responsive CSS (@media 840/700/
// 640/560/460) that no test exercises. Same states, phone-width viewport.
const MOBILE_SHOTS = [
  ['M1-explorer-light', {}, false],
  ['M2-preciplab-light', { wcMode: 'precipHunt' }, false],
  ['M3-steward-review-light', { wcMode: 'steward', steward: wsReview }, false],
];

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));

  await pg.setContent(
    '<!doctype html><html><head>'
    + '<style>body{margin:0;background:#f1f5f9;font-family:system-ui}.dark body{background:#0f172a}</style></head>'
    + '<body><div id="slot" style="padding:12px"></div></body></html>',
  );
  if (twPath) await pg.addScriptTag({ content: fs.readFileSync(twPath, 'utf8') });
  const tw = await pg.evaluate(() => typeof window.tailwind !== 'undefined');
  if (!tw) { console.error('FAIL: Tailwind did not load - pass --tailwind=<play-cdn-file>'); await b.close(); process.exit(2); }
  for (const code of [react, reactDom, three, orbit, host, tool, SHELL]) {
    await pg.addScriptTag({ content: code });
  }
  if (!(await pg.evaluate(() => window.__wcReady()))) {
    console.error('FAIL: waterCycle never registered'); await b.close(); process.exit(2);
  }

  for (const [label, state, dark] of SHOTS) {
    await pg.evaluate(({ s, d }) => window.__mount(s, d), { s: state, d: dark });
    await pg.waitForTimeout(label.startsWith('01') ? WAIT : 3500);
    const file = path.join(OUT, label + '.png');
    await pg.screenshot({ path: file, fullPage: false });
    // A 3D shot must prove it photographed a LIVE GL scene, never a parked
    // canvas: engineState stays 'loading' if THREE is missing, and a lost
    // context photographs as a plausible-looking blank.
    let glNote = '';
    if (label.indexOf('journey3d') !== -1) {
      const gl = await pg.evaluate(() => {
        const c = document.querySelector('canvas.wc-journey-3d');
        if (!c) return { ok: false, why: 'no 3D canvas in DOM' };
        const ctx = c.getContext('webgl2') || c.getContext('webgl');
        if (!ctx) return { ok: false, why: 'canvas has no GL context', state: c.dataset.engineState };
        return { ok: !ctx.isContextLost(), why: ctx.isContextLost() ? 'context lost' : '', state: c.dataset.engineState };
      });
      if (!gl.ok) {
        console.error('FAIL: ' + label + ' - ' + gl.why + ' (engineState=' + gl.state + ')');
        continue;
      }
      glNote = '  [GL live, engineState=' + gl.state + ']';
    }
    const shell = await pg.$('canvas.wc-journey-3d') || await pg.$('.wc-canvas-shell') || await pg.$('.wc-precip-chamber');
    if (shell) await shell.screenshot({ path: path.join(OUT, label + '-canvas.png') });
    // The lightning flash is random (~0.3%/frame) and lasts only a few frames,
    // so one screenshot usually misses it. Report the gate flag - which is the
    // thing that was broken - and burst-capture to catch an actual strike.
    if (label.indexOf('canvas-storm') !== -1) {
      const flag = await pg.evaluate(() => document.getElementById('wcCanvas').dataset.stormActive);
      console.log('   storm gate: dataset.stormActive=' + flag);
      const cv = await pg.$('#wcCanvas');
      for (let i = 0; i < 10; i++) {
        await cv.screenshot({ path: path.join(OUT, label + '-burst' + i + '.png') });
        await pg.waitForTimeout(260);
      }
    }
    console.log('shot ' + label + glNote + (errors.length ? '  ERRORS: ' + errors.join(' | ') : ''));
  }
  // ── Narrow viewport ──
  // fullPage here: phone layouts are tall, and a viewport-only shot would hide
  // exactly the stacked content the media queries rearrange. Each shot also
  // reports horizontal overflow, the classic narrow-width failure - the page
  // body must never scroll sideways.
  const mob = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  mob.on('pageerror', (e) => errors.push('[mobile] ' + String(e).slice(0, 200)));
  await mob.setContent(
    '<!doctype html><html><head>'
    + '<style>body{margin:0;background:#f1f5f9;font-family:system-ui}.dark body{background:#0f172a}</style></head>'
    + '<body><div id="slot" style="padding:8px"></div></body></html>',
  );
  if (twPath) await mob.addScriptTag({ content: fs.readFileSync(twPath, 'utf8') });
  for (const code of [react, reactDom, three, orbit, host, tool, SHELL]) {
    await mob.addScriptTag({ content: code });
  }
  for (const [label, state, dark] of MOBILE_SHOTS) {
    await mob.evaluate(({ s, d }) => window.__mount(s, d), { s: state, d: dark });
    await mob.waitForTimeout(3500);
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
      ? '  ★OVERFLOW doc=' + overflow.doc + ' > win=' + overflow.win + (overflow.widest ? ' worst=' + JSON.stringify(overflow.widest) : '')
      : '  [no h-overflow]'));
  }

  await b.close();
  if (errors.length) { console.error('PAGE ERRORS:\n' + errors.join('\n')); process.exit(1); }
  console.log('done, no page errors');
})();
