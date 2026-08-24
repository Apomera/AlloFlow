// Enumerate a STEM tool's axe colour-contrast violations, with the offending
// colours and the element that carries them.
//
//   node dev-tools/axe_tool_detail.cjs <toolFile> [--dark] [--state='{"k":1}']
//   node dev-tools/axe_tool_detail.cjs stem_lab/stem_tool_music.js
//
// WHY. dev-tools/theme_contrast_sweep.cjs reports COUNTS ("music light 9"),
// which is the right shape for a sweep but useless for fixing: it does not say
// which element, which colour, or which ratio. This prints exactly that, so a
// count can be turned into a work list. It resolves the tool's registry id from
// the source rather than guessing (the file is stem_tool_music.js but the id is
// 'musicSynth' -- guessing gives "Cannot read properties of undefined").
//
// ★It loads the PRECOMPILED Tailwind stylesheet, same as the sweeps. Without it
// every colour is unstyled and the numbers are fiction.
//
// ★--dark WRAPS the tool in a dark shell. Toggling a `dark` class on a page
// whose body is still white reports white-on-white nonsense: a hand-rolled dark
// probe produced 39 such phantom violations before this was fixed.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const args = process.argv.slice(2);
const toolFile = args.find((a) => !a.startsWith('--'));
const DARK = args.includes('--dark');
const stateArg = (args.find((a) => a.startsWith('--state=')) || '').slice(8);
// --css=<rules>: injected AFTER mount, before axe runs. For disabling decorative
// blockers (a dot-grid ::before, an alpha wash) so axe can grade the nodes behind
// them -- beehive's overlay hid ~100 real dark failures until it was probed this
// way. The CSS affects only the measurement page, never the product.
const cssArg = (args.find((a) => a.startsWith('--css=')) || '').slice(6);

if (!toolFile || !fs.existsSync(toolFile)) {
  console.error('usage: node dev-tools/axe_tool_detail.cjs <toolFile> [--dark] [--state=<json>] [--css=<rules>]');
  process.exit(2);
}

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const TW = path.join(ROOT, 'dev-tools', '.cache', 'sweep-tailwind.css');
if (!fs.existsSync(TW)) {
  console.error('Missing dev-tools/.cache/sweep-tailwind.css — build it with:');
  console.error('  node dev-tools/build_sweep_tailwind_css.cjs');
  process.exit(2);
}

// ★THE STEM PALETTE MUST BE DEFINED. Tools write
// `var(--allo-stem-text-soft, #64748b)`; with the variables undefined every one
// of those silently falls back to its hardcoded literal, so this would measure
// a colour the app never renders -- and "fixing" the fallback would be fixing
// the wrong thing. theme_contrast_sweep.cjs learned this in 2026-08-05; the
// same extraction is reused here so both instruments agree.
function extractStemPalette() {
  const src = read('app_styles_module.js');
  const start = src.indexOf(':root, .theme-default {');
  if (start === -1) throw new Error('STEM palette block not found in app_styles_module.js');
  const anchor = src.indexOf('.theme-contrast {', start);
  if (anchor === -1) throw new Error('.theme-contrast block not found after :root/.theme-default');
  const end = src.indexOf('}', src.indexOf('--allo-stem-button-border', anchor));
  if (end === -1) throw new Error('could not find the end of the .theme-contrast block');
  return src.slice(start, end + 1);
}
const STEM_PALETTE = extractStemPalette();

const toolSrc = fs.readFileSync(toolFile, 'utf8');
const idMatch = /registerTool\(\s*['"]([^'"]+)['"]/.exec(toolSrc);
if (!idMatch) { console.error('no registerTool() id found in ' + toolFile); process.exit(2); }
const TOOL_ID = idMatch[1];

const SHELL = `
window.__mount = function (id, dark, state) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry[id];
  // The id comes from a source-text regex, and the FIRST registerTool( in a
  // file can be a code EXAMPLE in a string (forge teaches tool-building and
  // registers 'myTool' in a lesson snippet). One page = one tool, so when the
  // guessed id is absent but exactly one tool registered, trust the registry.
  if (!cfg) {
    var ks = Object.keys(window.StemLab._registry);
    if (ks.length === 1) { id = ks[0]; cfg = window.StemLab._registry[id]; }
  }
  if (!cfg) return 'not-registered:' + id;
  var Host = function () {
    var init = {}; init[id] = state || {};
    var pair = React.useState(init);
    var ctx = { React: React, toolData: pair[0], setToolData: pair[1],
      // theme AND isDark: tools read one or the other, and a missing field is
      // undefined for every tool that reads it. cityLab tests
      // ctx.theme !== 'light', so omitting theme made it render dark inks on a
      // light page and report 143 phantom violations.
      // (No backticks in this comment: it lives inside a template literal.)
      theme: dark ? 'dark' : 'light',
      isDark: !!dark, isContrast: false, gradeBand: 'g68', gradeLevel: '7th Grade',
      setStemLabTool: function(){}, setStemLabTab: function(){}, setToolSnapshots: function(){},
      addToast: function(){}, announceToSR: function(){}, awardXP: function(){},
      beep: function(){}, celebrate: function(){}, canvasNarrate: function(){},
      canvasA11yDesc: function(){}, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, stemLabTab: 'explore', stemLabTool: null,
      toolSnapshots: [], props: {}, srOnly: {},
      update: function(){}, updateMulti: function(){}, setLabToolData: pair[1],
      labToolData: pair[0],
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) { return fb != null ? fb : k; }, getXP: function () { return 0; } };
    var rendered;
    try { rendered = cfg.render(ctx); } catch (e) { return React.createElement('div', null, 'threw: ' + e.message); }
    // ★THIS USED TO PAINT A DARK GROUND IN DARK MODE, AND THE PRODUCT DOES NOT.
    // stem_lab_module.js (see the long comment at ~1633) deliberately wraps every
    // tool in a WHITE CARD when the shell is dark -- tools are authored for a light
    // substrate -- while --allo-stem-* stay on <html>.theme-dark and keep resolving
    // to their DARK values. So the real dark-theme hazard is light ink on a white
    // card, and a harness that paints #0f172a behind the tool hides exactly that.
    // It reported 0 dark violations for arccity where the sweep found 52, and 0 for
    // heatlab where the sweep found 141. Mirror the host's two layers instead.
    return React.createElement('div', {
      className: dark ? 'dark' : '',
      style: { background: dark ? '#0f172a' : '#ffffff', color: dark ? '#e2e8f0' : '#0f172a', padding: dark ? 10 : 8 }
    }, dark
      ? React.createElement('div', {
          'data-stem-tool-surface': 'probe',
          style: { background: '#ffffff', color: '#0f172a', borderRadius: 10, padding: 10 }
        }, rendered)
      : rendered);
  };
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return id;
};`;

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));

  await page.setContent('<!doctype html><html><head><style>' + fs.readFileSync(TW, 'utf8') +
    '</style><style>' + STEM_PALETTE +
    '</style><style>body{margin:0;font-family:system-ui;background:' + (DARK ? '#0f172a' : '#ffffff') +
    '}</style></head><body><main id="slot" class="' + (DARK ? 'theme-dark' : 'theme-default') +
    '"></main></body></html>');
  for (const code of [
    read('node_modules/axe-core/axe.min.js'),
    read('desktop/web-app/node_modules/react/umd/react.production.min.js'),
    read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'),
    read('stem_lab/stem_lab_module.js'),
    toolSrc, SHELL,
  ]) await page.addScriptTag({ content: code });

  let state = {};
  if (stateArg) { try { state = JSON.parse(stateArg); } catch (e) { console.error('bad --state json'); process.exit(2); } }
  const status = await page.evaluate(({ id, dark, st }) => window.__mount(id, dark, st),
    { id: TOOL_ID, dark: DARK, st: state });
  if (typeof status === 'string' && /^not-registered|^threw/.test(status)) {
    console.error(status); await browser.close(); process.exit(2);
  }
  await page.waitForTimeout(3500);
  if (cssArg) await page.addStyleTag({ content: cssArg });

  const out = await page.evaluate(async () => {
    const r = await window.axe.run('#slot', { runOnly: { type: 'rule', values: ['color-contrast'] } });
    return {
      v: r.violations.flatMap((x) => x.nodes.map((n) => ({
        msg: (n.any[0] && n.any[0].message) || '',
        html: String(n.html || '').replace(/\s+/g, ' ').slice(0, 100),
      }))),
      incomplete: r.incomplete.reduce((a, x) => a + x.nodes.length, 0),
    };
  });

  console.log(path.basename(toolFile) + '  [' + TOOL_ID + ']  ' + (DARK ? 'DARK' : 'LIGHT'));
  console.log('violations: ' + out.v.length + '   unmeasurable (gradient/image bg): ' + out.incomplete);
  out.v.forEach((v, i) => {
    const m = /contrast of ([\d.]+).*?foreground color: (#[0-9a-f]{6}), background color: (#[0-9a-f]{6})/i.exec(v.msg);
    console.log('\n' + (i + 1) + '. ' + (m ? m[1] + ':1   fg ' + m[2] + '  bg ' + m[3] : v.msg.slice(0, 110)));
    console.log('   ' + v.html);
  });
  if (errors.length) console.log('\npage errors: ' + errors.slice(0, 3).join(' | '));
  await browser.close();
})();
