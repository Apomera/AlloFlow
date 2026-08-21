// Render the real Geology Explorer WebGL engine across all six worlds.
//
//   node dev-tools/geology_scene_shots.cjs <out-dir>
//
// Static tests can prove that materials and effects are wired, but cannot catch
// a buried geode, an opaque ocean mask, a blown-out glow, or a lost GL context.
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = path.resolve(process.argv[2] || path.join('dev-tools', '.cache', 'geology-shots'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const tailwindPath = path.join(ROOT, 'dev-tools', '.cache', 'sweep-tailwind.css');
if (!fs.existsSync(tailwindPath)) {
  console.error('Missing dev-tools/.cache/sweep-tailwind.css; run node dev-tools/build_sweep_tailwind_css.cjs first.');
  process.exit(2);
}

const scripts = [
  read('desktop/web-app/node_modules/react/umd/react.production.min.js'),
  read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'),
  read('vendor/three-r128/three.min.js'),
  read('vendor/three-r128/OrbitControls.js'),
  read('stem_lab/stem_lab_module.js'),
  read('stem_lab/stem_tool_geologyexplorer.js'),
];

const shell = `
window.__mountGeology = function (state, dark) {
  document.documentElement.classList.toggle('dark', !!dark);
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.geologyExplorer;
  function Host() {
    var pair = React.useState({ geologyExplorer: state || {}, _threeLoaded: true });
    function update(tool, key, value) {
      pair[1](function (old) {
        var nextTool = Object.assign({}, old[tool] || {}); nextTool[key] = value;
        var next = Object.assign({}, old); next[tool] = nextTool; return next;
      });
    }
    var ctx = {
      React: React, toolData: pair[0], setToolData: pair[1], update: update,
      isDark: !!dark, isContrast: false, gradeBand: 'g68', gradeLevel: '7th Grade',
      setStemLabTool: function(){}, setStemLabTab: function(){}, setToolSnapshots: function(){},
      addToast: function(){}, announceToSR: function(){}, awardXP: function(){},
      beep: function(){}, celebrate: function(){}, canvasNarrate: function(){},
      canvasA11yDesc: function(){}, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, stemLabTab: 'explore', stemLabTool: 'geologyExplorer',
      toolSnapshots: [], props: {}, srOnly: {}, icons: Icons,
      a11yClick: function (f) { return { onClick: f }; },
      t: function (k, fallback) { return fallback != null ? fallback : k; },
      getXP: function () { return 0; }
    };
    return cfg.render(ctx);
  }
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
};
`;

const shots = [
  { name: '01-crust-cutaway', scene: 'crust', slice: 3 },
  { name: '02-geode-cavern', scene: 'geode', slice: 7 },
  { name: '03-deep-earth-core', scene: 'deepEarth', slice: 7 },
  { name: '04-subduction-flow', scene: 'subduction', slice: 4 },
  { name: '05-ridge-spreading', scene: 'ridge', slice: 4 },
  { name: '06-hotspot-plume', scene: 'hotspot', slice: 4 },
  { name: '07-geode-dark', scene: 'geode', slice: 7, dark: true },
];

function viewportClip(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas[data-geology-material-rendering]');
    if (!canvas) return null;
    const frame = canvas.parentElement && canvas.parentElement.parentElement;
    const r = (frame || canvas).getBoundingClientRect();
    return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: r.height };
  });
}

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String((error && error.stack) || error).slice(0, 900)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push('console: ' + message.text()); });
  await page.setContent('<!doctype html><html><head><style>body{margin:0;background:#e2e8f0;font-family:system-ui}.dark body{background:#020617}#slot{padding:12px}</style></head><body><main id="slot"></main></body></html>');
  await page.addStyleTag({ content: fs.readFileSync(tailwindPath, 'utf8') });
  for (const code of scripts.concat(shell)) await page.addScriptTag({ content: code });

  for (const shot of shots) {
    await page.evaluate(({ scene, dark }) => window.__mountGeology({ scene, res: 'standard' }, dark), shot);
    await page.waitForFunction(() => !!window.__alloGeologyEngine && !!document.querySelector('canvas[data-geology-material-rendering]'));
    await page.evaluate((slice) => window.__alloGeologyEngine.setSlice(slice), shot.slice);
    await page.waitForTimeout(1200);
    const state = await page.evaluate(() => {
      const canvas = document.querySelector('canvas[data-geology-material-rendering]');
      const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
      return {
        gl: !!gl && !gl.isContextLost(),
        material: canvas && canvas.dataset.geologyMaterialRendering,
        atmosphere: canvas && canvas.dataset.geologyAtmosphereRendering,
        process: canvas && canvas.dataset.geologyProcessRendering,
        cutaway: canvas && canvas.dataset.geologyCutawayRendering,
        surface: canvas && canvas.dataset.geologySurfaceRendering,
        water: canvas && canvas.dataset.geologyWaterRendering,
        crystals: canvas && canvas.dataset.geologyCrystalRendering,
        quality: canvas && canvas.dataset.geologyRenderQuality,
        visual: window.__alloGeologyEngine.getVisualState(),
      };
    });
    if (!state.gl) throw new Error(shot.name + ': WebGL context is missing or lost');
    const clip = await viewportClip(page);
    if (!clip || clip.width < 300 || clip.height < 300) throw new Error(shot.name + ': invalid viewport clip');
    await page.screenshot({ path: path.join(OUT, shot.name + '.png'), clip, animations: 'disabled' });
    console.log(shot.name + ' ' + JSON.stringify(state));
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  mobile.on('pageerror', (error) => errors.push('[mobile] ' + String((error && error.stack) || error).slice(0, 900)));
  await mobile.setContent('<!doctype html><html><head><style>body{margin:0;background:#e2e8f0;font-family:system-ui}#slot{padding:8px}</style></head><body><main id="slot"></main></body></html>');
  await mobile.addStyleTag({ content: fs.readFileSync(tailwindPath, 'utf8') });
  for (const code of scripts.concat(shell)) await mobile.addScriptTag({ content: code });
  await mobile.evaluate(() => window.__mountGeology({ scene: 'subduction', res: 'low' }, false));
  await mobile.waitForFunction(() => !!window.__alloGeologyEngine && !!document.querySelector('canvas[data-geology-material-rendering]'));
  await mobile.evaluate(() => window.__alloGeologyEngine.setSlice(2));
  await mobile.waitForTimeout(1000);
  await mobile.screenshot({ path: path.join(OUT, '08-subduction-mobile.png'), fullPage: true, animations: 'disabled' });
  const mobileState = await mobile.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    quality: document.querySelector('canvas[data-geology-material-rendering]').dataset.geologyRenderQuality,
  }));
  if (mobileState.documentWidth > mobileState.viewportWidth + 1) {
    throw new Error('mobile horizontal overflow: ' + JSON.stringify(mobileState));
  }
  console.log('08-subduction-mobile ' + JSON.stringify(mobileState));

  await browser.close();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('Geology visual QA complete: ' + OUT);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
