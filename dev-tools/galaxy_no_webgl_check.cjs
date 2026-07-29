// What does Galaxy Explorer do on a device that cannot run WebGL?
//
//   node dev-tools/galaxy_no_webgl_check.cjs <out-dir>
//
// Aaron hit "Galaxy Explorer 3D Mode Unresolved / WebGL failed to initialize.
// Your browser or device might not support 3D hardware acceleration." on an
// ARM machine. That card was reached three different ways — no WebGL, a
// blocked three.js CDN, or the scene builder throwing — and asserted a
// hardware limitation for all three.
//
// This runs the real tool with WebGL genuinely removed (getContext returns
// null for every 3-D context id, before any tool code runs) and screenshots
// the result, so the fallback is verified against a browser rather than
// against a mock of one.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2] || '.';
// --real: leave WebGL alone and load the VENDORED three.js, to answer the
// separate question of whether the 3-D scene builds at all on a machine that
// can run it. The stubbed unit test (galaxy_scene_build) is currently red for
// reasons of its own, so it cannot answer that.
const REAL_MODE = process.argv.includes('--real');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const tool = read('stem_lab/stem_tool_galaxy.js');
const uiStrings = read('ui_strings.js');

const SHELL = `
window.StemLab = window.StemLab || {};
window.StemLab._registry = window.StemLab._registry || {};
window.StemLab.registerTool = function (id, cfg) { window.StemLab._registry[id] = cfg; };
window.StemLab.findById = function (a, i) { return (a || []).find(function (x) { return x && x.id === i; }) || null; };
// Resolves, so a "no WebGL" result cannot be an artifact of the loader failing.
window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
window.StemLab.loadScriptResilient = function () { return Promise.resolve(); };
window.StemLab.registerHelper = function () {}; window.StemLab.getHelper = function () { return null; };
window.StemLab.makeBayViewer = function () { return { attach:function(){}, sync:function(){}, nudge:function(){}, zoom:function(){}, reset:function(){}, status:function(){return 'idle';} }; };

window.__mount = function (state) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.galaxy;
  if (!cfg) { document.getElementById('slot').textContent = 'galaxy tool did not register'; return false; }
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
        if (typeof cur === 'string') return cur;
        return fb != null ? fb : k;
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
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 820 }, deviceScaleFactor: 2 });

  // Remove WebGL before any page script runs. 2-D keeps working, which is the
  // whole point: the fallback must draw.
  if (!REAL_MODE) await pg.addInitScript(() => {
    const real = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind) {
      if (typeof kind === 'string' && /webgl|experimental-webgl/i.test(kind)) return null;
      return real.apply(this, arguments);
    };
  });

  const logs = [];
  pg.on('console', (m) => { if (m.type() === 'error') logs.push(m.text().slice(0, 1400)); });

  const file = path.join(OUT, 'galaxy-no-webgl.html');
  fs.writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"><\/script>
<style>body{margin:0;padding:10px;background:#fff;font-family:system-ui}</style></head>
<body><main id="slot"></main>
<script>${react}<\/script><script>${reactDom}<\/script>
${REAL_MODE ? '<script>' + read('vendor/three-r128/three.min.js') + '<\/script>' : ''}
<script>window.__uiStrings = ${uiStrings};<\/script>
<script>${SHELL}<\/script><script>window.React = React;<\/script>
<script>${tool}<\/script></body></html>`, 'utf8');
  await pg.goto('file://' + file.replace(/\\/g, '/'));
  await pg.waitForTimeout(3500);

  const shapes = ['barredSpiral', 'grandDesign', 'elliptical', 'irregular'];
  for (const shape of shapes) {
    await pg.evaluate((s) => window.__mount({ simMode: 'galaxy', galaxyType: s }), shape);
    await pg.waitForTimeout(1200);

    const probe = await pg.evaluate(() => {
      const root = document.querySelector('[data-galaxy-fallback]');
      const cv = document.querySelector('[data-galaxy-fallback-canvas]');
      if (!cv) {
        // No fallback: the real 3-D path should have taken over. Report what it
        // actually produced, so "no fallback" cannot be confused with "nothing".
        const gl = document.querySelector('[data-galaxy-canvas]');
        return {
          fallback: false,
          reason: root && root.getAttribute('data-galaxy-fallback'),
          glCanvas: !!gl,
          layers: gl && gl._layers ? Object.keys(gl._layers).sort().join(',') : '(none)',
          resolution: gl ? gl.getAttribute('data-render-resolution') : '',
          quality: gl ? gl.getAttribute('data-resolved-quality') : '',
        };
      }
      // Is anything actually painted? Sample the pixels rather than trusting
      // that a canvas element exists — an empty canvas would look identical in
      // the DOM and pass a naive check.
      const g = cv.getContext('2d');
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4 * 97) {
        if (d[i] > 24 || d[i + 1] > 24 || d[i + 2] > 24) lit++;
      }
      return {
        fallback: true,
        reason: root && root.getAttribute('data-galaxy-fallback'),
        litFraction: lit / (d.length / (4 * 97)),
        size: cv.width + 'x' + cv.height,
        drawnAttr: cv.getAttribute('data-fallback-drawn'),
        notice: (document.querySelector('[data-galaxy-fallback] [role=status]') || {}).innerText || '',
      };
    });

    // Non-fatal: with real WebGL the scene animates, so Playwright can wait
    // forever for the element to be "stable". A timeout here is itself a
    // signal that the 3-D loop is running.
    try {
      await (await pg.$('#slot')).screenshot({
        path: path.join(OUT, (REAL_MODE ? 'galaxy-real-' : 'galaxy-nowebgl-') + shape + '.png'),
        animations: 'disabled', timeout: 8000,
      });
    } catch (shotError) {
      console.log('   (screenshot skipped: ' + String(shotError.message).split('\n')[0] + ')');
    }
    console.log(shape.padEnd(14) + (probe.fallback
      ? ('fallback=true  reason=' + probe.reason
        + '  drawn=' + probe.drawnAttr
        + '  lit=' + (probe.litFraction != null ? (probe.litFraction * 100).toFixed(1) + '%' : 'n/a')
        + '  ' + probe.size)
      : ('fallback=false  3D canvas=' + probe.glCanvas
        + '  quality=' + probe.quality
        + '  res=' + probe.resolution
        + '  layers=' + probe.layers)));
    if (probe.notice) console.log('   notice: ' + probe.notice.replace(/\s+/g, ' ').slice(0, 150));
  }

  console.log('\nconsole errors (' + logs.length + '):');
  logs.slice(0, 6).forEach((l) => console.log('   ' + l));
  await b.close();
})();
