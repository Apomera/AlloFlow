// Is the text painted OVER the galaxy's 3-D canvas actually readable?
//
//   node dev-tools/galaxy_canvas_text_contrast.cjs <out-dir> [--shape=barredSpiral]
//
// galaxy_a11y_audit.cjs deliberately refuses to grade these: an overlay's backdrop
// is millions of changing pixels, so no single colour describes it and scoring one
// invents failures. But "ungraded" is not "fine" — 96 labels sit over the scene,
// including the OBAFGKM legend that teaches star colour, and a prior measurement
// found 11-25% of this viewport clipped to pure white by the additively stacked
// star field. White text on a blown-out region is invisible.
//
// So: render the REAL scene, hide only the GLYPHS (keeping every scrim, pill and
// chip, which are legitimately part of the backdrop), screenshot, and read the
// actual pixels under each label back out. Contrast is then computed per pixel
// against the text's own colour.
//
// Traps this had to survive, all previously recorded for this tool:
//   • the scene auto-rotates, so a screenshot without _galaxySetAutoRotate(false)
//     samples a different galaxy each run
//   • star placement uses Math.random, so every load is a different galaxy unless
//     it is seeded before any page script runs
//   • reading the GL canvas in-page returns BLACK (no preserveDrawingBuffer);
//     Playwright's screenshot captures it correctly, so the pixels must come back
//     through an <img>, not through getImageData on the live canvas
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2] || '.';
const SHAPE = (process.argv.find((a) => a.startsWith('--shape=')) || '--shape=barredSpiral').split('=')[1];
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

  // Seed Math.random BEFORE any page script: star placement uses it, so without
  // this every run measures a different galaxy and the table looks like structure.
  await pg.addInitScript(() => {
    let s = 123456789;
    Math.random = () => { s = (1103515245 * s + 12345) % 2147483648; return s / 2147483648; };
  });

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'galaxy-canvas-text.html');
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
  await pg.evaluate((s) => window.__mount({ simMode: 'galaxy', galaxyControlPanel: 'view', galaxyType: s }), SHAPE);

  // Let the scene build, then freeze it so the screenshot and the geometry agree.
  await pg.waitForTimeout(6000);
  const frozen = await pg.evaluate(() => {
    const cv = document.querySelector('[data-galaxy-canvas]');
    if (cv && cv._galaxySetAutoRotate) { cv._galaxySetAutoRotate(false); return true; }
    return false;
  });
  await pg.waitForTimeout(1500);

  // Collect the labels sitting over the canvas, then hide ONLY their glyphs.
  const targets = await pg.evaluate(() => {
    const out = [];
    const root = document.getElementById('slot');
    for (const el of root.querySelectorAll('*')) {
      if (el.children.length) continue;
      const t = (el.textContent || '').trim();
      if (!t) continue;
      if (!/[\p{L}\p{N}]/u.test(t)) continue; // emoji paint their own colours
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const stack = document.elementsFromPoint(
        Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 2),
        Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 2));
      const i = stack.indexOf(el);
      const below = i >= 0 ? stack.slice(i + 1) : stack;
      let overCanvas = false;
      for (const n of below) {
        if (n.tagName === 'CANVAS') { overCanvas = true; break; }
        const bg = getComputedStyle(n).backgroundColor;
        const m = bg.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
        if (m && (m[4] === undefined || +m[4] >= 1)) break; // opaque scrim: not our case
      }
      if (!overCanvas) continue;
      el.setAttribute('data-cttarget', String(out.length));
      out.push({
        i: out.length, text: t.slice(0, 44), color: cs.color,
        size: Math.round(parseFloat(cs.fontSize) * 10) / 10,
        bold: +cs.fontWeight >= 700,
        shadow: cs.textShadow && cs.textShadow !== 'none' ? cs.textShadow.slice(0, 60) : '',
        x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      });
    }
    return out;
  });

  if (!targets.length) { console.log('no over-canvas text found (did the scene build?)'); await b.close(); return; }

  await pg.addStyleTag({ content: '[data-cttarget]{color:transparent !important;text-shadow:none !important;}' });
  await pg.waitForTimeout(400);
  const shotB64 = (await pg.screenshot({ animations: 'disabled', timeout: 15000 })).toString('base64');

  // Read the captured pixels back through an <img>: getImageData on the live GL
  // canvas returns black because the context has no preserveDrawingBuffer.
  const results = await pg.evaluate(async ({ b64, targets }) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const g = cv.getContext('2d');
    g.drawImage(img, 0, 0);
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const L = (r, gg, bb) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(bb);
    const parse = (c) => {
      const m = String(c).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
    };
    const out = [];
    for (const t of targets) {
      if (t.x < 0 || t.y < 0 || t.x + t.w > cv.width || t.y + t.h > cv.height) { out.push({ ...t, skipped: 'off-screen' }); continue; }
      const d = g.getImageData(t.x, t.y, t.w, t.h).data;
      const fg = parse(t.color);
      if (!fg) { out.push({ ...t, skipped: 'unparseable colour' }); continue; }
      // Text drawn at alpha < 1 composites over whatever pixel is beneath it.
      const ratios = [];
      for (let p = 0; p < d.length; p += 4) {
        const br = d[p], bg_ = d[p + 1], bb = d[p + 2];
        const cr = fg.r * fg.a + br * (1 - fg.a);
        const cg = fg.g * fg.a + bg_ * (1 - fg.a);
        const cb = fg.b * fg.a + bb * (1 - fg.a);
        const l1 = L(cr, cg, cb), l2 = L(br, bg_, bb);
        ratios.push((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
      }
      ratios.sort((a, b) => a - b);
      const at = (q) => ratios[Math.min(ratios.length - 1, Math.floor(q * ratios.length))];
      out.push({ ...t, worst: +ratios[0].toFixed(2), p10: +at(0.10).toFixed(2), median: +at(0.5).toFixed(2), px: ratios.length });
    }
    return out;
  }, { b64: shotB64, targets });

  await pg.evaluate(() => { for (const el of document.querySelectorAll('[data-cttarget]')) el.removeAttribute('data-cttarget'); });

  const lines = [];
  lines.push('Galaxy over-canvas text contrast — shape=' + SHAPE + ', auto-rotation frozen=' + frozen);
  lines.push('Contrast is measured against the REAL painted pixels under each label.');
  lines.push('p10 = the worst 10% of pixels behind the label; that is the part that fails first.');
  lines.push('');
  const need = (t) => (t.size >= 24 || (t.size >= 18.66 && t.bold)) ? 3 : 4.5;
  const graded = results.filter((r) => !r.skipped);
  const failing = graded.filter((r) => r.p10 < need(r)).sort((a, b) => a.p10 - b.p10);
  lines.push('labels over canvas: ' + results.length + '   graded: ' + graded.length + '   below AA on their worst 10%: ' + failing.length);
  lines.push('');
  lines.push('p10   worst median  need  size  scrim?  colour                      text');
  for (const r of failing) {
    lines.push(String(r.p10).padStart(5) + String(r.worst).padStart(6) + String(r.median).padStart(7) +
      String(need(r)).padStart(6) + String(r.size).padStart(6) + (r.shadow ? '   yes ' : '    no ') + '  ' +
      r.color.padEnd(26) + '  "' + r.text + '"');
  }
  if (!failing.length) lines.push('  none');
  lines.push('');
  lines.push('PASSING (worst 10% still above AA), for reference:');
  for (const r of graded.filter((x) => x.p10 >= need(x)).sort((a, b) => a.p10 - b.p10).slice(0, 12)) {
    lines.push('  p10 ' + String(r.p10).padStart(6) + '  ' + (r.shadow ? 'scrim ' : '      ') + '"' + r.text + '"');
  }
  const outFile = path.join(OUT, 'galaxy-canvas-text-contrast.txt');
  fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
  console.log(lines.join('\n'));
  await pg.screenshot({ path: path.join(OUT, 'galaxy-scene.png'), animations: 'disabled', timeout: 15000 }).catch(() => {});
  await b.close();
})();
