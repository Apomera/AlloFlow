// Full-page screenshots of the Plate Tectonics tool per tab, light + dark.
//   node pt_shots.cjs <out-dir> <tab,tab,...>   (run from the repo root)
const fs = require('fs'); const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2]; const TABS = (process.argv[3] || 'sim').split(',');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const stemLab = read('stem_lab/stem_lab_module.js'); const tool = read('stem_lab/stem_tool_platetectonics.js'); const uiStrings = read('ui_strings.js');
const SHELL = `
window.__mount = function (dark, tab) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.plateTectonics;
  var Host = function () {
    var pair = React.useState({ plateTectonics: { simTab: tab } });
    var ctx = { React: React, toolData: pair[0], setToolData: pair[1], setStemLabTool: function(){}, setStemLabTab: function(){}, setToolSnapshots: function(){}, addToast: function(){},
      announceToSR: function(m){ window.__sr = (window.__sr || []).concat([m]); }, awardXP: function(){}, getXP: function(){ return 0; }, beep: function(){}, celebrate: function(){},
      canvasNarrate: function(){}, canvasA11yDesc: function(){}, callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, gradeLevel: '5th',
      stemLabTab: 'explore', stemLabTool: 'plateTectonics', toolSnapshots: [], props: {}, srOnly: {}, isDark: dark, isContrast: false, pal: null,
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) { var cur = window.__uiStrings, segs = String(k).split('.'); for (var si = 0; si < segs.length; si++) { if (cur == null || typeof cur !== 'object') { cur = null; break; } cur = cur[segs[si]]; } if (typeof cur === 'string') return cur; return fb != null ? fb : k; } };
    return cfg.render(ctx);
  };
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  document.body.style.background = dark ? '#0f172a' : '#fff';
  return true;
};`;
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: parseInt(process.env.PT_W || '1100', 10), height: 900 }, deviceScaleFactor: 1 });
  pg.on('pageerror', (e) => console.log('  [page error] ' + e.message));
  const page = path.join(OUT, 'pt-shots.html');
  const html = ['<!doctype html><html lang="en"><head><meta charset="utf-8"><script src="https://cdn.tailwindcss.com"></script><style>body{margin:0;padding:12px;font-family:system-ui}</style></head><body><main id="slot"></main>',
    '<script>', react, '</script><script>', reactDom, '</script><script>', three, '</script>',
    '<script>window.React = React; window.ReactDOM = ReactDOM;</script>',
    '<script>window.__uiStrings = ', uiStrings, ';</script>',
    '<script>', stemLab, '</script><script>', tool, '</script><script>', SHELL, '</script></body></html>'].join('\n');
  fs.writeFileSync(page, html, 'utf8');
  await pg.goto('file:///' + page.split('\\').join('/'));
  for (const tab of TABS) for (const dark of [false, true]) {
    await pg.evaluate(([d, t]) => window.__mount(d, t), [dark, tab]);
    await pg.waitForTimeout(2500);
    const H = await pg.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < H; y += 800) { await pg.evaluate((yy) => window.scrollTo(0, yy), y); await pg.waitForTimeout(250); }
    await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(600);
    const name = (process.env.PT_W ? 'w' + process.env.PT_W + '-' : '') + 'pt-' + tab + '-' + (dark ? 'dark' : 'light') + '.png';
    if (process.argv[4] === 'viewport') {
      let k = 0;
      for (let y = 0; y < H; y += 850) { await pg.evaluate((yy) => window.scrollTo(0, yy), y); await pg.waitForTimeout(700);
        await pg.screenshot({ path: path.join(OUT, name.replace('.png', '-v' + (k++) + '.png')), animations: 'disabled', timeout: 30000 }); }
      console.log('wrote ' + k + ' viewport shots for ' + name);
    } else {
      await pg.screenshot({ path: path.join(OUT, name), fullPage: true, animations: 'disabled', timeout: 30000 });
      console.log('wrote ' + name + ' height=' + H);
    }
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
