// Screenshot the Science of Pets Lab across its views (light + dark).
//   node dev-tools/pets_scene_shots.cjs <out-dir> [viewA,viewB,...]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = path.resolve(process.argv[2] || path.join('dev-tools', '.cache', 'pets-shots'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const tailwindPath = path.join(ROOT, 'dev-tools', '.cache', 'sweep-tailwind.css');

const scripts = [
  read('desktop/web-app/node_modules/react/umd/react.production.min.js'),
  read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'),
  read('stem_lab/stem_lab_module.js'),
  read('stem_lab/stem_tool_pets.js'),
];

const shell = `
window.__mountPets = function (state, dark) {
  document.documentElement.classList.toggle('dark', !!dark);
  document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.petsLab;
  function Host() {
    var pair = React.useState({ petsLab: state || {} });
    function update(tool, key, value) {
      pair[1](function (old) {
        var nt = Object.assign({}, old[tool] || {}); nt[key] = value;
        var n = Object.assign({}, old); n[tool] = nt; return n;
      });
    }
    function updateMulti(tool, obj) {
      pair[1](function (old) {
        var nt = Object.assign({}, old[tool] || {}, obj);
        var n = Object.assign({}, old); n[tool] = nt; return n;
      });
    }
    var ctx = {
      React: React, toolData: pair[0], setToolData: pair[1], update: update, updateMulti: updateMulti,
      isDark: !!dark, isContrast: false, gradeBand: 'g68', gradeLevel: '7th Grade',
      setStemLabTool: function(){}, setStemLabTab: function(){}, setToolSnapshots: function(){},
      setLabToolData: function(){}, labToolData: {},
      addToast: function(){}, announceToSR: function(){}, awardXP: function(){},
      beep: function(){}, celebrate: function(){}, canvasNarrate: function(){},
      canvasA11yDesc: function(){}, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, stemLabTab: 'explore', stemLabTool: 'petsLab',
      toolSnapshots: [], props: {}, srOnly: {}, icons: Icons,
      a11yClick: function (f) { return { onClick: f }; },
      t: function (k, fb) { return fb != null ? fb : k; },
      getXP: function () { return 0; }
    };
    return cfg.render(ctx);
  }
  var slot = document.getElementById('slot');
  ReactDOM.unmountComponentAtNode(slot);
  ReactDOM.render(React.createElement(Host), slot);
};
`;

const DEFAULT_VIEWS = ['menu', 'careSim', 'bodyLang', 'picker', 'dogs', 'cats', 'training', 'welfare', 'cost', 'quiz', 'sensory', 'lifespan', 'nutrition', 'genetics'];
const views = (process.argv[3] ? process.argv[3].split(',') : DEFAULT_VIEWS).filter(Boolean);

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  // Host renders STEM tools on a WHITE card even in dark theme (see memory).
  const html = '<!doctype html><html><head><style>body{margin:0;background:#e2e8f0;font-family:system-ui}' +
    '.dark body{background:#0f172a}#card{background:#ffffff;margin:0;padding:14px}' +
    '.dark #card{background:#ffffff}</style></head><body><div id="card"><main id="slot"></main></div></body></html>';
  for (const dark of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(String((e && e.stack) || e).slice(0, 500)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.setContent(html);
    await page.addStyleTag({ content: fs.readFileSync(tailwindPath, 'utf8') });
    for (const code of scripts.concat(shell)) await page.addScriptTag({ content: code });
    for (const view of views) {
      await page.evaluate(({ view, dark }) => window.__mountPets({ view: view }, dark), { view, dark });
      await page.waitForTimeout(700);
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      await page.setViewportSize({ width: 1180, height: Math.min(6000, Math.max(900, h)) });
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(OUT, (dark ? 'dark-' : 'light-') + view + '.png'), animations: 'disabled' });
      await page.setViewportSize({ width: 1180, height: 900 });
      console.log((dark ? 'dark-' : 'light-') + view + ' h=' + h);
    }
    await page.close();
  }
  await browser.close();
  if (errors.length) { console.error('ERRORS:\n' + errors.slice(0, 20).join('\n')); }
  console.log('Pets shots: ' + OUT);
})().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
