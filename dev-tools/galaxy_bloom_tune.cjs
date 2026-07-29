// Measure how much of the galaxy the bloom is burning away.
//
//   node dev-tools/galaxy_bloom_tune.cjs <out-dir> [shape]
//
// WHY THIS EXISTS. The star profile and bloom were retuned together in an
// earlier pass and committed with the note "UNVERIFIED VISUALLY -- need a
// browser pass". That browser pass never happened, and three of the four
// morphologies could not render at all until the ordering bug was fixed, so
// nobody had seen the result. They come out blown: 11-25% of the viewport
// clipped to pure white, and only ~14-27% of lit pixels carrying any colour --
// in a tool whose corner legend teaches star colour (OBAFGKM, HOT to COOL) and
// whose science labels point at "young blue stars" and "dust lanes".
//
// Bloom is added AFTER ACES tone mapping, so the tone mapper's highlight
// roll-off is bypassed and the additive pass clips freely. That makes strength
// and threshold the levers worth measuring.
//
// Two numbers per setting:
//   blown%   fraction of the viewport at >=250 in all three channels
//   colour%  of the LIT pixels, how many have a channel spread >=25
// Good looks like: blown near zero, colour high, and the galaxy still bright
// enough to read -- so `mean` is reported too, to catch over-correction.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2] || '.';
const SHAPE = process.argv[3] || 'barredSpiral';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const tool = read('stem_lab/stem_tool_galaxy.js');
const uiStrings = read('ui_strings.js');

// strength, threshold
// SETTING _bloomPass.strength LIVE DOES NOT WORK. The render loop eases both
// strength and threshold back toward its own adaptive targets every frame
// (`adaptiveBloomStrength` / `adaptationRate`), so a live write decays away
// within a few frames and every sample lands somewhere on a relaxation curve.
// A first attempt at this swept the live object and produced a confident,
// non-monotonic table that was pure transient — the giveaway was that the
// repeated control row matched exactly while the middle wobbled.
//
// So each candidate patches the SOURCE and reloads the page. The first and
// last entries stay identical as a repeatability control.
const CANDIDATES = [
  { label: 'shipping',            bloom: null, exposure: null },
  { label: 'no bloom at all',     bloom: 0.0,  exposure: null },
  { label: 'bloom 0.6',           bloom: 0.6,  exposure: null },
  { label: 'exposure 0.95',       bloom: null, exposure: 0.95 },
  { label: 'bloom 0.6 + exp 0.95', bloom: 0.6, exposure: 0.95 },
  { label: 'bloom 0.8 + exp 1.05', bloom: 0.8, exposure: 1.05 },
  { label: 'shipping (control)',  bloom: null, exposure: null },
];

function patchSource(src, cand) {
  let out = src;
  if (cand.bloom !== null) {
    out = out.replace(/var bloomModeStrength = [\d.]+/, 'var bloomModeStrength = ' + cand.bloom);
  }
  if (cand.exposure !== null) {
    out = out.replace(/renderer\.toneMappingExposure = [\d.]+/g, 'renderer.toneMappingExposure = ' + cand.exposure);
  }
  return out;
}

const SHELL = `
window.StemLab = window.StemLab || {};
window.StemLab._registry = window.StemLab._registry || {};
window.StemLab.registerTool = function (id, cfg) { window.StemLab._registry[id] = cfg; };
window.StemLab.findById = function (a, i) { return (a || []).find(function (x) { return x && x.id === i; }) || null; };
window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
window.StemLab.loadScriptResilient = function () { return Promise.resolve(); };
window.StemLab.registerHelper = function () {}; window.StemLab.getHelper = function () { return null; };
window.StemLab.makeBayViewer = function () { return { attach:function(){}, sync:function(){}, nudge:function(){}, zoom:function(){}, reset:function(){}, status:function(){return 'idle';} }; };
window.__mount = function (state) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.galaxy;
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
        for (var si = 0; si < segs.length; si++) {
          if (cur == null || typeof cur !== 'object') { cur = null; break; }
          cur = cur[segs[si]];
        }
        return typeof cur === 'string' ? cur : (fb != null ? fb : k);
      },
      getXP: function () { return 0; }, update: function(){}, updateMulti: function(){}, tryAward: function(){} };
    return cfg.render(ctx);
  };
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return true;
};
// Read the GL canvas back through a 2-D copy. Sampling the framebuffer this way
// measures exactly what a learner sees, after tone mapping and bloom.
window.__measure = function () {
  var cv = document.querySelector('[data-galaxy-canvas]');
  if (!cv) return null;
  var off = document.createElement('canvas');
  off.width = Math.min(cv.width, 900); off.height = Math.min(cv.height, 520);
  var g = off.getContext('2d');
  g.drawImage(cv, 0, 0, off.width, off.height);
  var d = g.getImageData(0, 0, off.width, off.height).data;
  var n = 0, blown = 0, lit = 0, colour = 0, sum = 0;
  for (var i = 0; i < d.length; i += 4) {
    var r = d[i], gg = d[i + 1], b = d[i + 2];
    n++;
    var mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    sum += (r + gg + b) / 3;
    if (r >= 250 && gg >= 250 && b >= 250) blown++;
    if (mx >= 120) { lit++; if (mx - mn >= 25) colour++; }
  }
  return { blown: blown / n, colour: lit ? colour / lit : 0, mean: sum / n, lit: lit / n };
};
window.__setBloom = function (strength, threshold) {
  var cv = document.querySelector('[data-galaxy-canvas]');
  if (!cv || !cv._bloomPass) return false;
  cv._bloomPass.strength = strength;
  cv._bloomPass.threshold = threshold;
  return true;
};
`;

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1100, height: 820 } });

  // The star field is placed with Math.random(), so every page load builds a
  // DIFFERENT galaxy and cross-load numbers wobble by ~2.5 points — enough to
  // swamp the effect being measured. (The tell: a repeated "shipping" control
  // came back 13.66 and then 11.36.) Seeding it makes each candidate render
  // the same galaxy, so a difference in the table is a difference from the
  // parameter. Harness-side only; the product is untouched.
  await pg.addInitScript(() => {
    let s = 1234567;
    Math.random = function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  });

  const shots = [];

  for (let ci = 0; ci < CANDIDATES.length; ci++) {
    const cand = CANDIDATES[ci];
    const file = path.join(OUT, 'galaxy-bloom-tune-' + ci + '.html');
    fs.writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"><\/script>
<style>body{margin:0;padding:10px;background:#fff;font-family:system-ui}</style></head>
<body><main id="slot"></main>
<script>${react}<\/script><script>${reactDom}<\/script>
<script>${three}<\/script>
<script>window.__uiStrings = ${uiStrings};<\/script>
<script>${SHELL}<\/script><script>window.React = React;<\/script>
<script>${patchSource(tool, cand)}<\/script></body></html>`, 'utf8');
    await pg.goto('file://' + file.replace(/\\/g, '/'));
    await pg.waitForTimeout(2500);
    await pg.evaluate((s) => window.__mount({ simMode: 'galaxy', galaxyType: s }), SHAPE);
    await pg.waitForTimeout(3500);

    const ok = await pg.evaluate(() => !!document.querySelector('[data-galaxy-canvas]'));
    if (!ok) { console.log(cand.label.padEnd(22) + 'no canvas'); continue; }

    // Freeze before sampling: the galaxy auto-rotates, so otherwise each
    // sample is a different frame and the sweep measures rotation.
    // NOTE: reading the GL canvas back in-page returns BLACK (no
    // preserveDrawingBuffer), so the measurement goes through Playwright's
    // screenshot, which does capture it.
    await pg.evaluate(() => {
      const cv = document.querySelector('[data-galaxy-canvas]');
      if (cv && cv._galaxySetAutoRotate) cv._galaxySetAutoRotate(false);
      if (cv && cv._galaxyResetView) cv._galaxyResetView();
    });
    await pg.waitForTimeout(1200);

    const canvasBox = await (await pg.$('[data-galaxy-canvas]')).boundingBox();
    const name = 'bloom-' + SHAPE + '-' + ci + '.png';
    await pg.screenshot({ path: path.join(OUT, name), clip: canvasBox });
    shots.push({ strength: cand.label, threshold: '', name });
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'bloom-shots.json'), JSON.stringify(shots, null, 2));
  console.log('wrote ' + shots.length + ' shots for ' + SHAPE + '; measure them with galaxy_bloom_measure.py');
  shots.forEach((s) => console.log('   ' + s.name));
})();
