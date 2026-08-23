// How much of the galaxy canvas is blown out to clipped white?
//
//   node dev-tools/galaxy_core_clipping.cjs <out-dir> [--shapes=barredSpiral,grandDesign]
//
// The spiral core renders as a saturated white disc: the additively blended star
// layers sum past 1.0 and UnrealBloom spreads the clip. A prior over-canvas text
// measurement found 11-25% of the viewport at pure white. That is not "a bright
// core": a blown region carries NO structure, so the bulge the tool teaches about
// is exactly the part of the scene that stops being visible. Ellipticals and
// irregulars already ship anti-clip tuning (bloomStrength/bloomThreshold/
// exposureBias in morphologyVisual); the spiral branch is the identity config.
//
// This renders each shape headless, freezes the scene, screenshots the CANVAS
// only, and reports the fraction of pixels at or near clip - whole canvas and the
// central core box - so a tuning change is a measured claim, not an impression.
// Reuses the loading recipe (and its recorded traps: seed Math.random before any
// page script, freeze auto-rotation, read pixels back through an <img>) from
// galaxy_canvas_text_contrast.cjs. Reports only; changes nothing.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2] || '.';
const SHAPES = ((process.argv.find((a) => a.startsWith('--shapes=')) || '--shapes=barredSpiral,grandDesign').split('=')[1]).split(',');
// --hide=arms,nebulae turns those layer groups off before measuring, which
// attributes the clipping: whichever hidden layer moves the number owns it.
const HIDE = ((process.argv.find((a) => a.startsWith('--hide=')) || '--hide=').split('=')[1] || '').split(',').filter(Boolean);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const tool = read('stem_lab/stem_tool_galaxy.js');
const uiStrings = read('ui_strings.js');

const SHELL = `
window.StemLab = window.StemLab || {};
window.StemLab._registry = window.StemLab._registry || {};
window.StemLab.registerTool = function (id, cfg) { window.StemLab._registry[id] = cfg; };
window.StemLab.findById = function (a, i) { return (a || []).find(function (x) { return x && x.id === i; }) || null; };
window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
window.StemLab.loadScriptResilient = function () { return Promise.resolve(); };
window.StemLab.registerHelper = function () {}; window.StemLab.getHelper = function () { return null; };
window.StemLab.makeBayViewer = function () { return { attach:function(){}, sync:function(){}, nudge:function(){}, zoom:function(){}, reset:function(){}, status:function(){return 'idle';} }; };
window._galaxyHasLoadedOnce = true;
window.__mount = function (state) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.galaxy;
  if (!cfg) return false;
  var Host = function () {
    var pair = React.useState({ galaxy: state });
    var ctx = { React: React, toolData: pair[0], setToolData: pair[1], setStemLabTool: function(){},
      setStemLabTab: function(){}, setToolSnapshots: function(){}, addToast: function(){}, announceToSR: function(){},
      awardXP: function(){}, beep: function(){}, celebrate: function(){}, canvasNarrate: function(){}, canvasA11yDesc: function(){},
      callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, gradeLevel: '5th',
      stemLabTab: 'explore', stemLabTool: null, toolSnapshots: [], props: {}, srOnly: {},
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) {
        var cur = window.__uiStrings, segs = String(k).split('.');
        for (var si = 0; si < segs.length; si++) { if (cur == null || typeof cur !== 'object') { cur = null; break; } cur = cur[segs[si]]; }
        return typeof cur === 'string' ? cur : (fb != null ? fb : k);
      },
      getXP: function () { return 0; }, update: function(){}, updateMulti: function(){}, tryAward: function(){} };
    return cfg.render(ctx);
  };
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return true;
};
`;

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 1 });
  await pg.addInitScript(() => {
    let s = 123456789;
    Math.random = () => { s = (1103515245 * s + 12345) % 2147483648; return s / 2147483648; };
  });

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'galaxy-core-clipping.html');
  fs.writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"><\/script>
<style>body{margin:0;padding:12px;background:#fff;font-family:system-ui}</style></head>
<body><main id="slot"></main>
<script>${react}<\/script><script>${reactDom}<\/script><script>${three}<\/script>
<script>window.__uiStrings = ${uiStrings};<\/script>
<script>${SHELL}<\/script><script>window.React = React;<\/script>
<script>${tool}<\/script></body></html>`, 'utf8');
  await pg.goto('file:///' + path.resolve(file).replace(/\\/g, '/'));
  await pg.waitForTimeout(2500);

  const lines = [];
  lines.push('Galaxy canvas clipping - fraction of pixels blown to (near-)white');
  lines.push('clip = min(R,G,B) >= 250; near = min(R,G,B) >= 235. Core box = central 34% of each side.');
  lines.push('');
  for (const shape of SHAPES) {
    await pg.evaluate(({ s, hide }) => {
      const layers = { arms: true, bulge: true, blackHole: true, nebulae: true, bgStars: true, grid: false, labels: false };
      for (const h of hide) layers[h] = false;
      return window.__mount({ simMode: 'galaxy', galaxyControlPanel: 'view', galaxyType: s, layers });
    }, { s: shape, hide: HIDE });
    await pg.waitForTimeout(6000);
    await pg.evaluate(() => {
      const cv = document.querySelector('[data-galaxy-canvas]');
      if (cv && cv._galaxySetAutoRotate) cv._galaxySetAutoRotate(false);
    });
    await pg.waitForTimeout(1500);
    const box = await pg.evaluate(() => {
      const cv = document.querySelector('[data-galaxy-canvas]');
      if (!cv) return null;
      const r = cv.getBoundingClientRect();
      return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height };
    });
    if (!box) { lines.push(shape + ': no canvas found'); continue; }
    const shotB64 = (await pg.screenshot({ clip: box, animations: 'disabled', timeout: 15000 })).toString('base64');
    fs.writeFileSync(path.join(OUT, 'galaxy-core-' + shape + '.png'), Buffer.from(shotB64, 'base64'));
    const stats = await pg.evaluate(async (b64) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
      const cv = document.createElement('canvas');
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const g = cv.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      const W = cv.width, H = cv.height;
      const cx0 = Math.floor(W * 0.33), cx1 = Math.ceil(W * 0.67);
      const cy0 = Math.floor(H * 0.33), cy1 = Math.ceil(H * 0.67);
      let clip = 0, near = 0, coreClip = 0, coreNear = 0, coreN = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const p = (y * W + x) * 4;
          const mn = Math.min(d[p], d[p + 1], d[p + 2]);
          const inCore = x >= cx0 && x < cx1 && y >= cy0 && y < cy1;
          if (inCore) coreN++;
          if (mn >= 250) { clip++; if (inCore) coreClip++; }
          if (mn >= 235) { near++; if (inCore) coreNear++; }
        }
      }
      const n = W * H;
      return { W, H, clipPct: 100 * clip / n, nearPct: 100 * near / n, coreClipPct: 100 * coreClip / coreN, coreNearPct: 100 * coreNear / coreN };
    }, shotB64);
    lines.push(shape.padEnd(14) + ' canvas ' + stats.W + 'x' + stats.H +
      '  clip ' + stats.clipPct.toFixed(2) + '%  near ' + stats.nearPct.toFixed(2) + '%' +
      '  | core box: clip ' + stats.coreClipPct.toFixed(2) + '%  near ' + stats.coreNearPct.toFixed(2) + '%');
  }
  const outFile = path.join(OUT, 'galaxy-core-clipping.txt');
  fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
  console.log(lines.join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
