// WebGL smoke for the rocks tool's 3D crystal lab.
//
//   node dev-tools/gl_smoke_crystal_lab.cjs <out-prefix> [mineral,mineral,...]
//
// WHY THIS EXISTS. The crystal lab shipped for a long time without anyone
// having seen it render, because there was no way to. It needs real three.js,
// a real WebGL context and the host shell's makeBayViewer, none of which the
// jsdom unit suite can provide — so the vitest tests reason about the scene
// GRAPH (atom and bond lists) and stop there. That is enough to catch wrong
// chemistry and it is not enough to catch "the panel is black".
//
// This runs the shipping path end to end: the vendored three r128, the tool's
// own rkBuildCrystalScene, and the React ref that fires attach(), inside
// Chromium with SwiftShader. It reports per-mineral atom and scene-child
// counts, fails loudly on any page error, and writes a screenshot of each GL
// canvas plus a contact sheet.
//
// NOT part of `npx vitest run`. It launches Chromium, and two Playwright
// suites running at once in this repo tread on each other — keep it manual.
//
// TRAP, learned the hard way: `page.$('canvas')` does NOT find the crystal.
// The mineral panel has 2D canvases of its own and they come first in the
// document, so the first run screenshotted the hardness cards and looked
// plausible. The renderer's canvas is tagged data-gl="crystal" below and
// selected by that attribute; do not relax it back to a bare tag selector.
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
if (!OUT) {
  console.error('usage: node dev-tools/gl_smoke_crystal_lab.cjs <out-prefix> [minerals]');
  process.exit(2);
}
const ROOT = process.cwd();
const MINERALS = (process.argv[3]
  || 'halite,galena,fluorite,diamond,pyrite,calcite,mica,talc,quartz,gypsum,garnet,topaz,magnetite,feldspar,sulfur,olivine,corundum,hematite').split(',');

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const three = read('vendor/three-r128/three.min.js');
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const tool = read('stem_lab/stem_tool_rocks.js');

// A minimal stand-in for the host's makeBayViewer. It implements the same
// contract the tool depends on — attach(node) and a buildScene callback — so
// the tool's own scene builder runs untouched against real three.js.
const SHELL = `
window.StemLab = {
  _registry: {},
  registerTool: function (id, cfg) { window.StemLab._registry[id] = cfg; },
  findById: function (a, i) { return (a || []).find(function (x) { return x && x.id === i; }) || null; },
  loadScriptResilient: function () { return Promise.resolve(); },
  ensureThree: function () { return Promise.resolve(window.THREE); },
  makeBayViewer: function (opts) {
    var state = { built: false };
    return {
      attach: function (node) {
        if (!node) return;
        try {
          var THREE = window.THREE;
          var w = node.clientWidth || 360, h = node.clientHeight || 240;
          var renderer = new THREE.WebGLRenderer({ antialias: true });
          renderer.setSize(w, h);
          renderer.setClearColor(0x0f172a, 1);
          renderer.domElement.setAttribute('data-gl', 'crystal');
          node.appendChild(renderer.domElement);
          var scene = new THREE.Scene();
          var cam = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
          var home = opts.home || { yaw: -0.6, pitch: 0.62, dist: 5.0 };
          cam.position.set(
            Math.cos(home.pitch) * Math.sin(home.yaw) * home.dist,
            Math.sin(home.pitch) * home.dist,
            Math.cos(home.pitch) * Math.cos(home.yaw) * home.dist
          );
          cam.lookAt(0, 0.3, 0);
          scene.add(new THREE.AmbientLight(0xffffff, 0.62));
          var key = new THREE.DirectionalLight(0xffffff, 0.85);
          key.position.set(3, 5, 4);
          scene.add(key);
          var res = opts.buildScene(THREE, { scene: scene, contrast: false, dark: true, wantShadow: false });
          renderer.render(scene, cam);
          state.built = true;
          window.__glResult = {
            ok: true,
            atoms: (res.picks || []).length,
            children: res.anchor ? res.anchor.children.length : 0
          };
        } catch (e) {
          window.__glResult = { ok: false, error: String((e && e.message) || e) };
        }
      },
      sync: function () {}, nudge: function () {}, zoom: function () {}, reset: function () {},
      status: function () { return state.built ? 'ready' : 'loading'; }
    };
  }
};
`;

const HARNESS = `
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  window.__renderMineral = function (id) {
    window.__glResult = null;
    var store = { rocks: { mode: 'minerals', selectedMineral: id }, rockCycle: {} };
    var ctx = {
      React: React, toolData: store, setToolData: function () {}, setStemLabTool: function () {},
      setStemLabTab: function () {}, setToolSnapshots: function () {}, addToast: function () {},
      announceToSR: function () {}, awardXP: function () {}, beep: function () {}, celebrate: function () {},
      canvasNarrate: function () {}, canvasA11yDesc: function () {}, callGemini: null, callTTS: null,
      callImagen: null, callGeminiVision: null, gradeLevel: '5th', stemLabTab: 'explore',
      stemLabTool: null, toolSnapshots: [], props: {}, srOnly: {},
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) { return fb || k; }, getXP: function () { return 0; }
    };
    ReactDOM.render(React.createElement(function () {
      return window.StemLab._registry.rocks.render(ctx);
    }), document.getElementById('root'));
    return window.__glResult;
  };
  window.__unmount = function () { ReactDOM.unmountComponentAtNode(document.getElementById('root')); };
`;

fs.writeFileSync(OUT + '.html', `<!doctype html><html><head><meta charset="utf-8">
<style>body{margin:0;background:#0f172a;font-family:system-ui,sans-serif}</style></head><body>
<div id="root"></div>
<script>${three}<\/script><script>${react}<\/script><script>${reactDom}<\/script>
<script>${SHELL}<\/script><script>window.React = React;<\/script>
<script>${tool}<\/script><script>${HARNESS}<\/script>
</body></html>`, 'utf8');

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const pg = await browser.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 2 });
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e)));
  pg.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await pg.goto('file://' + (OUT + '.html').replace(/\\/g, '/'));
  await pg.waitForTimeout(900);

  const shots = [];
  let failures = 0;
  for (const id of MINERALS) {
    const res = await pg.evaluate((m) => window.__renderMineral(m), id);
    await pg.waitForTimeout(300);
    const canvas = await pg.$('canvas[data-gl="crystal"]');
    if (res && res.ok && canvas) {
      const file = OUT + '-' + id + '.png';
      await canvas.screenshot({ path: file });
      shots.push({ id, file });
      console.log(id.padEnd(11) + 'ok   atoms ' + String(res.atoms).padStart(3)
        + '   scene children ' + String(res.children).padStart(4));
    } else {
      failures++;
      console.log(id.padEnd(11) + 'FAILED  ' + (res && res.error ? res.error : (canvas ? 'no result' : 'no GL canvas')));
    }
    await pg.evaluate(() => window.__unmount());
    await pg.waitForTimeout(100);
  }
  await browser.close();

  if (errors.length) {
    failures += errors.length;
    console.log('\nPAGE ERRORS:');
    errors.slice(0, 12).forEach((e) => console.log('   ' + e.slice(0, 220)));
  } else {
    console.log('\nno page errors');
  }

  const cells = shots.map((s) =>
    '<div class="c"><img src="' + path.basename(s.file) + '"><div>' + s.id + '</div></div>').join('');
  const sheet = OUT + '-sheet';
  fs.writeFileSync(sheet + '.html',
    '<!doctype html><meta charset="utf-8"><style>body{background:#0b1220;margin:0;padding:14px}'
    + '.g{display:flex;flex-wrap:wrap;gap:12px}.c{background:#111c33;border:1px solid #24354f;border-radius:10px;padding:8px}'
    + '.c img{display:block;width:300px;border-radius:6px}'
    + '.c div{color:#e2e8f0;font:700 13px system-ui;margin-top:6px;text-transform:capitalize}</style>'
    + '<div class="g">' + cells + '</div>', 'utf8');
  const b2 = await chromium.launch();
  const p2 = await b2.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await p2.goto('file://' + (sheet + '.html').replace(/\\/g, '/'));
  await p2.waitForTimeout(400);
  await p2.screenshot({ path: sheet + '.png', fullPage: true });
  await b2.close();
  console.log('wrote ' + sheet + '.png  (' + shots.length + '/' + MINERALS.length + ' minerals)');

  process.exit(failures ? 1 : 0);
})();
