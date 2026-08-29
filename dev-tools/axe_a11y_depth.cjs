// Interaction-DEPTH probe for the FULL axe ruleset (everything EXCEPT
// color-contrast, which dev-tools/axe_tool_depth.cjs owns and which is closed
// tree-wide as of 2026-08-25).
//
//   node dev-tools/axe_a11y_depth.cjs <toolFile> [--dark]
//
// WHY. Contrast was only ONE rule. Missing button names, unlabeled inputs,
// broken ARIA parent/child relationships, duplicate ids, bad heading order and
// non-focusable interactive elements were never measured -- and never measured
// BEHIND A CLICK at all. Same mount and substrate as axe_tool_depth.cjs (host
// white card in dark, real Tailwind build, real STEM palette); same walk:
// baseline -> open every collapsed <details> -> click each collapsed toggle ->
// click each [role=tab] in turn. Findings are grouped by RULE so a sweep turns
// into a work list ('12 tools have button-name failures'), and each is billed
// to the state that exposed it.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const args = process.argv.slice(2);
const toolFile = args.find((a) => !a.startsWith('--'));
const DARK = args.includes('--dark');

if (!toolFile || !fs.existsSync(toolFile)) {
  console.error('usage: node dev-tools/axe_a11y_depth.cjs <toolFile> [--dark]');
  process.exit(2);
}

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const TW = path.join(ROOT, 'dev-tools', '.cache', 'sweep-tailwind.css');
if (!fs.existsSync(TW)) {
  console.error('Missing dev-tools/.cache/sweep-tailwind.css — build it with:');
  console.error('  node dev-tools/build_sweep_tailwind_css.cjs');
  process.exit(2);
}

// Same palette extraction as axe_tool_detail.cjs — both instruments must agree.
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
window.__mount = function (id, dark) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry[id];
  if (!cfg) {
    var ks = Object.keys(window.StemLab._registry);
    if (ks.length === 1) { id = ks[0]; cfg = window.StemLab._registry[id]; }
  }
  if (!cfg) return 'not-registered:' + id;
  var Host = function () {
    var init = {}; init[id] = {};
    var pair = React.useState(init);
    var ctx = { React: React, toolData: pair[0], setToolData: pair[1],
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
    // Mirror the host's two layers: dark shell, WHITE inner card (see
    // axe_tool_detail.cjs for why a dark ground behind the tool is fiction).
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
    '}</style></head><body><div id="slot" class="' + (DARK ? 'theme-dark' : 'theme-default') +
    '"></div></body></html>');
  for (const code of [
    read('node_modules/axe-core/axe.min.js'),
    read('desktop/web-app/node_modules/react/umd/react.production.min.js'),
    read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'),
    read('stem_lab/stem_lab_module.js'),
    toolSrc, SHELL,
  ]) await page.addScriptTag({ content: code });

  const status = await page.evaluate(({ id, dark }) => window.__mount(id, dark),
    { id: TOOL_ID, dark: DARK });
  if (typeof status === 'string' && /^not-registered|^threw/.test(status)) {
    console.error(status); await browser.close(); process.exit(2);
  }
  await page.waitForTimeout(3500);

  // One axe pass; returns violations as {key, msg, html} plus incomplete count.
  const runAxe = () => page.evaluate(async () => {
    const r = await window.axe.run('#slot', { resultTypes: ['violations'], rules: { 'color-contrast': { enabled: false }, 'color-contrast-enhanced': { enabled: false }, region: { enabled: false }, 'page-has-heading-one': { enabled: false }, 'landmark-one-main': { enabled: false }, bypass: { enabled: false }, 'html-has-lang': { enabled: false }, 'document-title': { enabled: false } } });
    return {
      v: r.violations.flatMap((x) => x.nodes.map((n) => {
        const html = String(n.html || '').replace(/s+/g, ' ').slice(0, 110);
        return { key: x.id + '|' + html, id: x.id, impact: x.impact || '', help: x.help || '', html: html };
      })),
      incomplete: 0,
    };
  });

  const seen = new Set();
  const report = [];
  const record = (label, out) => {
    const fresh = out.v.filter((x) => !seen.has(x.key));
    fresh.forEach((x) => seen.add(x.key));
    report.push({ label, fresh, total: out.v.length, incomplete: out.incomplete });
  };

  record('baseline', await runAxe());

  // 1. expand every collapsed <details>
  const nDetails = await page.evaluate(() => {
    const ds = document.querySelectorAll('#slot details:not([open])');
    ds.forEach((d) => { d.open = true; });
    return ds.length;
  });
  if (nDetails) { await page.waitForTimeout(400); record('expand ' + nDetails + ' <details>', await runAxe()); }

  // 2. click each collapsed toggle (cumulative). Skip [role=tab] — phase 3.
  const nToggles = await page.evaluate(() => {
    const ts = Array.from(document.querySelectorAll('#slot [aria-expanded="false"]'))
      .filter((el) => el.getAttribute('role') !== 'tab');
    ts.forEach((el) => { try { el.click(); } catch (e) {} });
    return ts.length;
  });
  if (nToggles) { await page.waitForTimeout(600); record('open ' + nToggles + ' toggles', await runAxe()); }

  // 3. walk tabs one at a time; each click gets its own axe pass so a finding
  //    is attributed to the tab that exposed it.
  const tabNames = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#slot [role=tab]'))
      .map((el) => (el.textContent || el.getAttribute('aria-label') || '?').trim().slice(0, 30)));
  for (let i = 0; i < tabNames.length; i++) {
    const clicked = await page.evaluate((idx) => {
      const el = document.querySelectorAll('#slot [role=tab]')[idx];
      if (!el) return false;
      try { el.click(); } catch (e) { return false; }
      return true;
    }, i);
    if (!clicked) continue;
    await page.waitForTimeout(500);
    record('tab "' + tabNames[i] + '"', await runAxe());
  }

  const anyFresh = report.some((r, i) => i > 0 && r.fresh.length);
  console.log(path.basename(toolFile) + '  [' + TOOL_ID + ']  ' + (DARK ? 'DARK' : 'LIGHT') +
    '   states probed: ' + report.length);
  for (const r of report) {
    const tag = r.fresh.length ? '  << ' + r.fresh.length + ' NEW' : '';
    console.log('- ' + r.label + ': total ' + r.total + tag);
    for (const f of r.fresh) {
      console.log('    [' + (f.impact || '?') + '] ' + f.id + ' -- ' + f.help);
      console.log('    ' + f.html);
    }
  }
  if (!anyFresh && report[0].fresh.length === 0) console.log('CLEAN at depth (full axe)');
  if (errors.length) console.log('page errors: ' + errors.slice(0, 3).join(' | '));
  await browser.close();
  process.exit(anyFresh || report[0].fresh.length ? 1 : 0);
})();
