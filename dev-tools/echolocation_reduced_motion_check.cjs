// Does Echolocation Lab actually honor prefers-reduced-motion on its canvases?
//
//   node dev-tools/echolocation_reduced_motion_check.cjs <out-dir>
//
// The tool's CSS blanket does nothing for canvas (a rAF loop is not a CSS
// animation), and its reducedMotion ref was an ORPHAN SETTER - written on mount
// and on media-query change, read by nothing - so every canvas animated
// regardless of the preference. The fix gates the three decorative loops (wave
// scroll, reflection scroll, soundscape ambience); the doppler sim and the two
// games stay animated because their motion is the content or user-driven.
//
// This mounts the real tool in Chromium twice - reducedMotion emulated 'reduce'
// vs 'no-preference' - and hashes every visible canvas's pixels at t and
// t+700ms. A decorative canvas must be STATIC under reduce and ANIMATED
// without it; both halves are asserted so a broken harness cannot pass as "all
// static". Exits non-zero on any violation.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2] || '.';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const tool = read('stem_lab/stem_tool_echolocation.js');
const uiStrings = read('ui_strings.js');

const SHELL = `
window.StemLab = window.StemLab || {};
window.StemLab._registry = window.StemLab._registry || {};
window.StemLab.registerTool = function (id, cfg) { window.StemLab._registry[id] = cfg; };
window.StemLab.findById = function (a, i) { return (a || []).find(function (x) { return x && x.id === i; }) || null; };
window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE || null); };
window.StemLab.loadScriptResilient = function () { return Promise.resolve(); };
window.StemLab.registerHelper = function () {}; window.StemLab.getHelper = function () { return null; };
window.__mount = function (state) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.echolocation;
  if (!cfg) return false;
  var Host = function () {
    var pair = React.useState({ echolocation: state });
    var setAll = pair[1];
    var ctx = { React: React, toolData: pair[0],
      update: function (tool, key, val) { setAll(function (prev) { var t2 = Object.assign({}, prev[tool]); t2[key] = val; var n = Object.assign({}, prev); n[tool] = t2; return n; }); },
      updateMulti: function (tool, obj) { setAll(function (prev) { var n = Object.assign({}, prev); n[tool] = Object.assign({}, prev[tool], obj); return n; }); },
      setToolData: setAll, setStemLabTool: function(){}, setStemLabTab: function(){}, setToolSnapshots: function(){},
      addToast: function(){}, announceToSR: function(){}, awardXP: function(){}, beep: function(){}, celebrate: function(){},
      canvasNarrate: function(){}, canvasA11yDesc: function(){}, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, gradeLevel: '5th', stemLabTab: 'explore', stemLabTool: null, toolSnapshots: [],
      props: {}, srOnly: {}, isDark: false, isContrast: false, theme: 'light',
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) {
        var cur = window.__uiStrings, segs = String(k).split('.');
        for (var si = 0; si < segs.length; si++) { if (cur == null || typeof cur !== 'object') { cur = null; break; } cur = cur[segs[si]]; }
        return typeof cur === 'string' ? cur : (fb != null ? fb : k);
      },
      getXP: function () { return 0; }, tryAward: function(){} };
    return cfg.render(ctx);
  };
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return true;
};
window.__hashCanvases = function () {
  var out = [];
  var list = document.querySelectorAll('canvas');
  for (var i = 0; i < list.length; i++) {
    var cv = list[i];
    var r = cv.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) continue;
    var h = 0;
    try {
      var g = cv.getContext('2d');
      if (!g) { out.push({ i: i, hash: 'gl' }); continue; }
      var d = g.getImageData(0, 0, cv.width, cv.height).data;
      for (var p = 0; p < d.length; p += 16) h = ((h * 31) + d[p] + d[p + 1] + d[p + 2]) >>> 0;
      out.push({ i: i, w: cv.width, h2: cv.height, hash: h });
    } catch (e) { out.push({ i: i, hash: 'err:' + e.message.slice(0, 40) }); }
  }
  return out;
};
`;

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'echolocation-rm.html');
  fs.writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"><\/script>
<style>body{margin:0;padding:12px;background:#fff;font-family:system-ui}</style></head>
<body><main id="slot"></main>
<script>${react}<\/script><script>${reactDom}<\/script>
<script>window.__uiStrings = ${uiStrings};<\/script>
<script>${SHELL}<\/script><script>window.React = React;<\/script>
<script>${tool}<\/script></body></html>`, 'utf8');

  // {tab, expectation under reduce}. 'static' = every 2D canvas frozen;
  // 'animated' = at least one canvas still moving (games/doppler are exempt).
  const CASES = [
    { tab: 'waves', reduced: 'static', normal: 'animated' },
    { tab: 'ecology', reduced: 'static', normal: 'animated' },
    { tab: 'doppler', reduced: 'animated', normal: 'animated' },
  ];
  let failures = 0;
  for (const mode of ['reduce', 'no-preference']) {
    const pg = await b.newPage({ viewport: { width: 1180, height: 900 } });
    await pg.emulateMedia({ reducedMotion: mode });
    await pg.goto('file:///' + path.resolve(file).replace(/\\/g, '/'));
    await pg.waitForTimeout(1500);
    for (const c of CASES) {
      await pg.evaluate((t) => window.__mount({ tab: t }), c.tab);
      await pg.waitForTimeout(1500);
      const a = await pg.evaluate(() => window.__hashCanvases());
      await pg.waitForTimeout(700);
      const b2 = await pg.evaluate(() => window.__hashCanvases());
      const moving = a.filter((x, i) => b2[i] && typeof x.hash === 'number' && x.hash !== b2[i].hash).length;
      const total = a.filter((x) => typeof x.hash === 'number').length;
      const expect = mode === 'reduce' ? c.reduced : c.normal;
      const ok = expect === 'static' ? moving === 0 : moving > 0;
      if (!ok) failures++;
      console.log((ok ? 'PASS' : 'FAIL').padEnd(5), mode.padEnd(14), 'tab=' + c.tab.padEnd(9),
        moving + '/' + total + ' canvases moving, expected ' + expect);
      if (total === 0) { failures++; console.log('FAIL  no measurable canvases on tab=' + c.tab + ' - harness broken, not the tool'); }
    }
    await pg.close();
  }
  await b.close();
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
