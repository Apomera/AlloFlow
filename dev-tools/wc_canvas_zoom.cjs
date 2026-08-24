// Zoom into one region of the Water Cycle 2D canvas.
//
//   node dev-tools/wc_canvas_zoom.cjs <out.png> [--region=land|shore|soil|sky]
//                                     [--dark] [--state='{"k":1}'] [--scale=3]
//
// WHY. Fine canvas work - a grass fringe, soil horizons, a shoreline wedge -
// occupies a few dozen pixels in a 1040x520 screenshot, which is far too small
// to judge. Several changes in this tool have been called "done" from a full
// canvas shot and turned out to be invisible or wrong when finally looked at
// closely. This renders the tool at a high device scale factor and clips to the
// region under review, so a claim about texture is checked at the size the
// texture actually exists.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = process.argv[2] || 'zoom.png';
const arg = (k, d) => (process.argv.find((a) => a.startsWith('--' + k + '=')) || ('--' + k + '=' + d)).split('=').slice(1).join('=');
const REGION = arg('region', 'land');
const SCALE = Number(arg('scale', '3'));
const DARK = process.argv.includes('--dark');
const STATE = JSON.parse(arg('state', '{}'));

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const TW = path.join(ROOT, 'dev-tools', '.cache', 'sweep-tailwind.css');
if (!fs.existsSync(TW)) { console.error('Missing ' + path.relative(ROOT, TW)); process.exit(2); }
const tailwindCss = fs.readFileSync(TW, 'utf8');
const parts = [
  'desktop/web-app/node_modules/react/umd/react.production.min.js',
  'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
  'vendor/three-r128/three.min.js',
  'vendor/three-r128/OrbitControls.js',
  'stem_lab/stem_lab_module.js',
  'stem_lab/stem_tool_watercycle.js',
].map(read);

// Fractions of the canvas box. The canvas draws land at 0.62-0.72 and the
// subsurface below that, so these track the same constants the renderer uses.
const REGIONS = {
  sky: { x: 0, y: 0, w: 1, h: 0.6 },
  land: { x: 0.42, y: 0.55, w: 0.58, h: 0.22 },
  shore: { x: 0.4, y: 0.55, w: 0.32, h: 0.25 },
  soil: { x: 0, y: 0.68, w: 0.7, h: 0.32 },
};

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
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: SCALE });
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  await pg.setContent('<!doctype html><html><head><style>body{margin:0;background:#f1f5f9;font-family:system-ui}</style>'
    + '</head><body><div id="slot" style="padding:12px"></div></body></html>');
  await pg.addStyleTag({ content: tailwindCss });
  for (const c of parts) await pg.addScriptTag({ content: c });
  await pg.addScriptTag({ content: SHELL });
  if (!(await pg.evaluate(() => window.__wcReady()))) { console.error('FAIL: waterCycle never registered'); await b.close(); process.exit(2); }
  await pg.evaluate(({ s, d }) => window.__mount(s, d), { s: STATE, d: DARK });
  await pg.waitForTimeout(4000);

  // The canvas sits well below the fold in the Explorer, and a viewport clip
  // outside the visible area is an error rather than an empty image - so scroll
  // it into view and re-read the box AFTER scrolling, never before.
  const canvasHandle = await pg.$('#wcCanvas');
  if (!canvasHandle) { console.error('FAIL: no #wcCanvas in DOM'); await b.close(); process.exit(2); }
  await canvasHandle.scrollIntoViewIfNeeded();
  await pg.waitForTimeout(400);
  const box = await canvasHandle.boundingBox();
  if (!box) { console.error('FAIL: #wcCanvas has no box'); await b.close(); process.exit(2); }
  const r = REGIONS[REGION] || REGIONS.land;
  await pg.screenshot({
    path: OUT,
    clip: { x: box.x + box.width * r.x, y: box.y + box.height * r.y, width: box.width * r.w, height: box.height * r.h },
  });
  console.log(`zoom ${REGION} @${SCALE}x -> ${OUT}${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}`);
  await b.close();
})();
