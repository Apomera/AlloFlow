// Dump the rendered TEXT of a Water Cycle mode, for byte-comparison.
//
//   node dev-tools/wc_text_snapshot.cjs <out.txt> [--state='{"wcMode":"pilot"}'] [--dark]
//
// WHY. Moving a literal into a t() fallback must not change one character of
// the shipped English, and the only proof of that is the rendered text before
// and after. Tests pin a handful of phrases; most of this tool's copy has no
// test at all, and a silent de-punctuation during extraction is exactly the
// failure this guards ([[feedback_no_copy_edits_during_i18n_extraction]]).
//
// Output is one visible string per line so a plain diff localises any change.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = process.argv[2];
if (!OUT) { console.error('usage: wc_text_snapshot.cjs <out.txt> [--state=json] [--dark]'); process.exit(2); }
const arg = (k, d) => (process.argv.find((a) => a.startsWith('--' + k + '=')) || ('--' + k + '=' + d)).split('=').slice(1).join('=');
const STATE = JSON.parse(arg('state', '{}'));
const DARK = process.argv.includes('--dark');
// --pack=<slug> resolves keys through a real language pack, falling back to the
// English master exactly as the host does. Without this the harness always
// returns the English fallback, so it can prove the extraction is faithful but
// says nothing about whether a translation ever reaches the screen.
const PACK = arg('pack', '');
// --master resolves through ui_strings.js with NO pack: that is exactly what an
// English user sees, and it is the only way to prove that adding a key to the
// master changes nothing for them. Without it the harness always returns the
// source fallback, which is a different code path from production.
const MASTER_ONLY = process.argv.includes('--master');
const packData = PACK ? JSON.parse(fs.readFileSync(path.join(ROOT, 'lang', PACK + '.js'), 'utf8')) : null;
const masterData = (PACK || MASTER_ONLY) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8')) : null;

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const tailwindCss = fs.readFileSync(path.join(ROOT, 'dev-tools', '.cache', 'sweep-tailwind.css'), 'utf8');
const parts = [
  'desktop/web-app/node_modules/react/umd/react.production.min.js',
  'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
  'vendor/three-r128/three.min.js',
  'vendor/three-r128/OrbitControls.js',
  'stem_lab/stem_lab_module.js',
  'stem_lab/stem_tool_watercycle.js',
].map(read);

const SHELL = `
// Resolution order copied from the host (App.jsx): language pack, then the
// English master, then the caller's fallback. Dotted key, nested storage.
window.__PACK = ${JSON.stringify(packData)};
window.__MASTER = ${JSON.stringify(masterData)};
window.__t = function (key, fallback) {
  function look(root) {
    if (!root) return undefined;
    var node = root;
    var parts = String(key).split('.');
    for (var i = 0; i < parts.length; i++) {
      if (node == null || typeof node !== 'object') return undefined;
      node = node[parts[i]];
    }
    return typeof node === 'string' ? node : undefined;
  }
  var hit = look(window.__PACK);
  if (hit != null) return hit;
  hit = look(window.__MASTER);
  if (hit != null) return hit;
  return fallback != null ? fallback : key;
};
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
      t: window.__t,
      getXP: function () { return 0; }
    };
    return cfg.render(ctx);
  };
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return true;
};
// Every visible text node plus every accessible name, in document order.
// aria-label is included deliberately: it is copy a screen-reader user hears,
// and it has been left untranslated across this codebase before.
window.__text = function () {
  var out = [];
  var walker = document.createTreeWalker(document.getElementById('slot'), NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  var n;
  while ((n = walker.nextNode())) {
    if (n.nodeType === 3) {
      var s = (n.nodeValue || '').replace(/\\s+/g, ' ').trim();
      if (s) out.push('TEXT\\t' + s);
    } else {
      ['aria-label', 'title', 'placeholder', 'aria-keyshortcuts'].forEach(function (a) {
        var v = n.getAttribute && n.getAttribute(a);
        if (v) out.push(a.toUpperCase() + '\\t' + v.replace(/\\s+/g, ' ').trim());
      });
    }
  }
  return out.join('\\n');
};
`;

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
  await pg.setContent('<!doctype html><html><head></head><body><div id="slot"></div></body></html>');
  await pg.addStyleTag({ content: tailwindCss });
  for (const c of parts) await pg.addScriptTag({ content: c });
  await pg.addScriptTag({ content: SHELL });
  if (!(await pg.evaluate(() => window.__wcReady()))) { console.error('FAIL: not registered'); await b.close(); process.exit(2); }
  await pg.evaluate(({ s, d }) => window.__mount(s, d), { s: STATE, d: DARK });
  await pg.waitForTimeout(2500);
  const text = await pg.evaluate(() => window.__text());
  fs.writeFileSync(OUT, text, 'utf8');
  console.log(`${OUT}: ${text.split('\n').length} strings${errors.length ? '  ERRORS: ' + errors.join(' | ') : ''}`);
  await b.close();
})();
