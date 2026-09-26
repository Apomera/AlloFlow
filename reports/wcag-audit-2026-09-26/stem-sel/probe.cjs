// Depth axe probe for ONE STEM or SEL tool file, light + dark, full WCAG A/AA
// ruleset INCLUDING color-contrast (recorded separately). Adapted from
// dev-tools/axe_a11y_depth.cjs + axe_tool_depth.cjs, with these changes:
//  - renders through the REAL hub renderTool (StemLab / SelHub), with real
//    update/updateMulti so tab state driven by ctx.update actually switches
//  - loads the hub's support modules from the AlloFlowANTI manifest
//  - fixes the html-normalize regex (/s+/ -> /\s+/)
//  - executablePath for the sandbox chromium
//  - writes JSON to --out
//   node probe.cjs <toolFile> --out <json> [--modes light,dark]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = '/home/user/AlloFlow';
const SP = __dirname;
const args = process.argv.slice(2);
const toolFile = args[0];
const SRC = args.includes('--src') ? args[args.indexOf('--src') + 1] : null;
const OUT = args[args.indexOf('--out') + 1];
const MODES = (args.includes('--modes') ? args[args.indexOf('--modes') + 1] : 'light,dark').split(',');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const IS_SEL = /^sel_hub\//.test(toolFile);
const TW = fs.readFileSync(path.join(SP, 'tw-all.css'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(SP, 'modules.json'), 'utf8'));
const support = (IS_SEL ? manifest.sel.filter((f) => !/sel_tool_/.test(f)) : manifest.stem.filter((f) => !/stem_tool_/.test(f)));

function extractStemPalette() {
  const src = read('app_styles_module.js');
  const start = src.indexOf(':root, .theme-default {');
  const anchor = src.indexOf('.theme-contrast {', start);
  const end = src.indexOf('}', src.indexOf('--allo-stem-button-border', anchor));
  return src.slice(start, end + 1);
}
const PALETTE = extractStemPalette();

const SHELL = `
window.__probeErr = [];
window.__mount = function (ids, dark, isSel) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var hub = isSel ? window.SelHub : window.StemLab;
  var id = ids[0];
  var noop = function(){};
  var tpal = {
    bg: dark ? '#0f172a' : '#f8fafc', bgCard: dark ? '#1e293b' : '#ffffff', bgInput: dark ? '#1e293b' : '#ffffff',
    border: dark ? '#64748b' : '#94a3b8', text: dark ? '#f1f5f9' : '#0f172a', textMuted: dark ? '#94a3b8' : '#64748b',
    headerBg: dark ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    headerText: '#f1f5f9', btnBg: dark ? '#334155' : '#e2e8f0', btnText: dark ? '#f1f5f9' : '#334155', btnBorder: 'none',
    accent: '#7c3aed', accentText: '#ffffff', bgSoft: dark ? '#111827' : '#f8fafc', bgRaised: dark ? '#111827' : '#ffffff',
    bgDisabled: dark ? '#172033' : '#f1f5f9', accentSoftBg: dark ? 'rgba(124,58,237,0.2)' : '#f5f3ff', accentSoftText: dark ? '#ddd6fe' : '#6d28d9',
    successText: '#0f766e', dangerText: '#b91c1c', warningText: dark ? '#fbbf24' : '#92400e', pinkAccent: '#db2777', pinkText: '#be185d', onPink: '#ffffff'
  };
  class EB extends React.Component {
    constructor(p) { super(p); this.state = { err: null }; }
    static getDerivedStateFromError(e) { return { err: e }; }
    componentDidCatch(e) { window.__probeErr.push('react-boundary: ' + (e && e.message)); }
    render() { return this.state.err ? React.createElement('div', { 'data-probe-crash': '1' }, 'CRASH: ' + this.state.err.message) : this.props.children; }
  }
  var Bridge = function (p) { return hub.renderTool(p.id, p.ctx); };
  var Host = function () {
    var pair = React.useState(function () { return isSel ? {} : JSON.parse(JSON.stringify(window.__stemInit || {})); });
    var setTD = pair[1];
    var upd = function (toolId, key, val) { setTD(function (prev) { var s = Object.assign({}, (prev && prev[toolId]) || {}); s[key] = val; var p = {}; p[toolId] = s; return Object.assign({}, prev, p); }); };
    var updM = function (toolId, obj) { setTD(function (prev) { var s = Object.assign({}, (prev && prev[toolId]) || {}, obj); var p = {}; p[toolId] = s; return Object.assign({}, prev, p); }); };
    var common = { React: React, toolData: pair[0], setToolData: setTD, update: upd, updateMulti: updM,
      addToast: noop, announceToSR: noop, awardXP: noop, getXP: function () { return 0; }, beep: noop, celebrate: noop,
      callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, toolSnapshots: [], setToolSnapshots: noop,
      a11yClick: function (f) { return { onClick: f, onKeyDown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(e); } }, role: 'button', tabIndex: 0 }; },
      srOnly: function (text) { return React.createElement('span', { className: 'sr-only' }, text); },
      t: function (k, fb) { return fb != null ? fb : k; }, props: {}, isContrast: false, reduceMotion: false };
    var ctx = isSel ? Object.assign({}, common, {
        setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: id, toolLabel: function () { return ''; }, openTool: noop,
        theme: { isDark: !!dark, isContrast: false, reduceMotion: false, palette: tpal }, isDark: !!dark, themePalette: tpal,
        onSafetyFlag: noop, studentCodename: null, selectedVoice: null, activeSessionCode: null,
        icons: Icons, gradeLevel: '7th Grade', gradeBand: 'middle', saveSnapshot: noop, saveCheckpoint: noop,
        getSavePolicy: function () { return {}; }, savePolicy: {}, isCompact: false })
      : Object.assign({}, common, {
        theme: dark ? 'dark' : 'light', isDark: !!dark, gradeBand: 'g68', gradeLevel: '7th Grade',
        setStemLabTool: noop, setStemLabTab: noop, stemLabTab: 'explore', stemLabTool: id,
        canvasNarrate: noop, canvasA11yDesc: noop, setCanvasNarrateEnabled: noop, saveLocal: function () { return true; },
        getHint: null, aiHintsEnabled: false, aiAvailable: false, labToolData: pair[0], setLabToolData: setTD, icons: Icons,
        sourceText: '', inputText: '', sourceTopic: '' });
    return React.createElement(EB, null, React.createElement(Bridge, { id: id, ctx: ctx }));
  };
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return id;
};`;

async function probeMode(browser, mode, ids) {
  const DARK = mode === 'dark';
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: DARK ? 'dark' : 'light', reducedMotion: 'reduce' });
  const page = await ctxB.newPage();
  const errors = [];
  let cur = 'load';
  page.on('pageerror', (e) => errors.push('[' + cur + '] pageerror: ' + String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') { const t = m.text(); if (/error rendering|Plugin render error|react|TypeError|ReferenceError/i.test(t)) errors.push('[' + cur + '] console: ' + t.slice(0, 200)); } });
  const HTML = ('<!doctype html><html lang="en"><head><title>probe</title><style>' + TW + '</style><style>' +
    '</style><style>*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important}</style><style>body{margin:0;font-family:system-ui;background:' + (DARK ? '#0f172a' : '#ffffff') +
    '}</style></head><body><div id="appstyles"></div><main class="min-h-screen bg-slate-50 font-sans text-slate-800 theme-' + (DARK ? 'dark' : 'light') + '">' + (IS_SEL ? '' : '<div class="stem-lab-modal">') + '<div id="slot"></div>' + (IS_SEL ? '' : '</div>') + '</main></body></html>');
  await page.route('http://probe.local/**', (route) => (new URL(route.request().url()).pathname === '/' ? route.fulfill({ status: 200, contentType: 'text/html', body: HTML }) : route.fulfill({ status: 404, contentType: 'text/plain', body: '' })));
  await page.goto('http://probe.local/');
  const hubFile = IS_SEL ? 'sel_hub/sel_hub_module.js' : 'stem_lab/stem_lab_module.js';
  for (const code of [read('node_modules/axe-core/axe.min.js'),
    read('desktop/web-app/node_modules/react/umd/react.production.min.js'),
    read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js')]) await page.addScriptTag({ content: code });
  await page.evaluate(() => { window.AlloIcons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } }); });
  await page.addScriptTag({ content: read('app_styles_module.js') });
  await page.evaluate(() => { const AS = window.AlloModules.AppStyles.AppStyles; ReactDOM.render(React.createElement(AS, {}), document.getElementById('appstyles')); });
  await page.addScriptTag({ content: read(hubFile) });
  for (const s of support) { try { await page.addScriptTag({ content: read(s) }); } catch (e) { errors.push('support ' + s + ': ' + String(e).slice(0, 120)); } }
  const hubName = IS_SEL ? 'SelHub' : 'StemLab';
  const before = await page.evaluate((h) => Object.keys((window[h] && window[h]._registry) || {}), hubName);
  await page.addScriptTag({ content: SRC ? fs.readFileSync(SRC, 'utf8') : read(toolFile) }).catch((e) => errors.push('tool load: ' + String(e).slice(0, 200)));
  let newIds = await page.evaluate(({ h, b }) => Object.keys((window[h] && window[h]._registry) || {}).filter((k) => b.indexOf(k) === -1), { h: hubName, b: before });
  if (!newIds.length && ids && ids.length) newIds = ids;
  if (!newIds.length) { await ctxB.close(); return { mode, ids: [], error: 'no tool registered', errors }; }
  await page.addScriptTag({ content: 'window.__stemInit = ' + fs.readFileSync(path.join(SP, 'stem_init.json'), 'utf8') + ';' });
  await page.addScriptTag({ content: SHELL });
  const results = [];
  for (const id of newIds) {
    const t0 = Date.now();
    await page.evaluate(() => { try { ReactDOM.unmountComponentAtNode(document.getElementById('slot')); } catch (e) {} window.__probeErr = []; });
    cur = id + ':mount';
    await page.evaluate(({ id, dark, isSel }) => window.__mount([id], dark, isSel), { id, dark: DARK, isSel: IS_SEL });
    await page.waitForTimeout(2200);
    const health = await page.evaluate(() => {
      const slot = document.getElementById('slot');
      let txt = (slot.innerText || '').trim();
      slot.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) txt += (el.shadowRoot.textContent || '').trim(); });
      return { textLen: txt.length, shadow: Array.from(slot.querySelectorAll('*')).some((el) => !!el.shadowRoot), crash: !!slot.querySelector('[data-probe-crash]'),
        selFallback: /This tool could not open/.test(txt), stemErr: (window.StemLab && window.StemLab._lastRenderError) ? window.StemLab._lastRenderError.message : null,
        probeErr: window.__probeErr.slice(0, 5), nodes: slot.querySelectorAll('*').length };
    });
    const runAxe = () => page.evaluate(async () => {
      const r = await window.axe.run('#slot', { resultTypes: ['violations'], rules: { 'color-contrast-enhanced': { enabled: false }, region: { enabled: false }, 'page-has-heading-one': { enabled: false }, 'landmark-one-main': { enabled: false }, bypass: { enabled: false } } });
      return r.violations.flatMap((x) => x.nodes.map((n) => {
        const html = String(n.html || '').replace(/\s+/g, ' ').slice(0, 400);
        const d = (n.any && n.any[0] && n.any[0].data) || {};
        const c = x.id === 'color-contrast' ? { fg: d.fgColor, bg: d.bgColor, ratio: d.contrastRatio, need: d.expectedContrastRatio, size: d.fontSize, weight: d.fontWeight } : null;
        const target = (n.target || []).join(' ');
        let op = 1, dis = false, darkCls = false;
        if (x.id === 'color-contrast') {
          try {
            let el = document.querySelector(n.target[0]);
            darkCls = !!(el && /\bdark:/.test(el.getAttribute('class') || ''));
            for (; el && el !== document.body; el = el.parentElement) {
              const o = parseFloat(getComputedStyle(el).opacity); if (o < op) op = o;
              if (el.disabled || el.getAttribute('aria-disabled') === 'true') dis = true;
            }
          } catch (e) {}
          if (c) { c.minOpacity = op; c.disabled = dis; c.darkVariant = darkCls; }
        }
        return { id: x.id, impact: x.impact || '', help: x.help || '', tags: x.tags.filter((t) => /^wcag|best-practice/.test(t)), html, target, contrast: c,
          summary: String(n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 300) };
      }));
    });
    const seen = new Set();
    const states = [];
    const keyOf = (x) => x.id + '|' + x.html.slice(0, 200) + (x.contrast ? '|' + x.contrast.fg + x.contrast.bg : '');
    const record = async (label) => {
      cur = id + ':' + label;
      let v;
      const hh = await page.evaluate(() => { const slot = document.getElementById('slot'); const t = slot.innerText || ''; return { crash: !!slot.querySelector('[data-probe-crash]'), selFallback: /This tool could not open/.test(t), textLen: t.trim().length }; }).catch(() => ({}));
      try { v = await runAxe(); } catch (e) { states.push({ label, error: String(e).slice(0, 200) }); return; }
      const fresh = v.filter((x) => !seen.has(keyOf(x)));
      fresh.forEach((x) => seen.add(keyOf(x)));
      states.push({ label, total: v.length, fresh, health: hh });
    };
    await record('baseline');
    const nDetails = await page.evaluate(() => { const ds = document.querySelectorAll('#slot details:not([open])'); ds.forEach((d) => { d.open = true; }); return ds.length; });
    if (nDetails) { await page.waitForTimeout(400); await record('expand ' + nDetails + ' <details>'); }
    const crashes = [];
    const isBroken = () => page.evaluate(() => { const slot = document.getElementById('slot'); return !!slot.querySelector('[data-probe-crash]') || /This tool could not open/.test(slot.innerText || '') || ((slot.innerText || '').trim().length < 5 && !Array.from(slot.querySelectorAll('*')).some((el) => !!el.shadowRoot)); });
    const remount = async () => {
      await page.evaluate(({ id, dark, isSel }) => { try { ReactDOM.unmountComponentAtNode(document.getElementById('slot')); } catch (e) {} window.__mount([id], dark, isSel); }, { id, dark: DARK, isSel: IS_SEL });
      await page.waitForTimeout(1200);
    };
    cur = id + ':click toggles';
    const togLabels = await page.evaluate(() => Array.from(document.querySelectorAll('#slot [aria-expanded="false"]')).filter((el) => el.getAttribute('role') !== 'tab' && el.getAttribute('role') !== 'combobox').map((el) => (el.getAttribute('aria-label') || el.textContent || '?').trim().slice(0, 40)));
    let nToggles = 0;
    for (let k = 0; k < Math.min(togLabels.length, 30); k++) {
      const ok = await page.evaluate((lab) => {
        const el = Array.from(document.querySelectorAll('#slot [aria-expanded="false"]')).filter((e) => e.getAttribute('role') !== 'tab' && e.getAttribute('role') !== 'combobox').find((e) => (e.getAttribute('aria-label') || e.textContent || '?').trim().slice(0, 40) === lab);
        if (!el) return false; try { el.click(); } catch (e) { return false; } return true; }, togLabels[k]);
      if (!ok) continue;
      nToggles++;
      await page.waitForTimeout(250);
      if (await isBroken()) { crashes.push('toggle "' + togLabels[k] + '"'); await remount(); break; }
    }
    if (nToggles) { await page.waitForTimeout(400); await record('open ' + nToggles + ' toggles'); }
    const tabNames = await page.evaluate(() => Array.from(document.querySelectorAll('#slot [role=tab]')).map((el) => (el.textContent || el.getAttribute('aria-label') || '?').trim().slice(0, 40)));
    const MAX_TABS = 40;
    for (let i = 0; i < Math.min(tabNames.length, MAX_TABS); i++) {
      cur = id + ':click tab ' + i;
      const clicked = await page.evaluate((idx) => { const el = document.querySelectorAll('#slot [role=tab]')[idx]; if (!el) return false; try { el.click(); } catch (e) { return false; } return true; }, i);
      if (!clicked) continue;
      await page.waitForTimeout(450);
      // open details that the new tab revealed, so their contents are graded too
      await page.evaluate(() => { document.querySelectorAll('#slot details:not([open])').forEach((d) => { d.open = true; }); });
      await page.waitForTimeout(150);
      if (await isBroken()) { crashes.push('tab "' + tabNames[i] + '"'); await record('tab "' + tabNames[i] + '" (CRASHED)'); await remount(); continue; }
      await record('tab "' + tabNames[i] + '"');
    }
    const health2 = await page.evaluate(() => ({ crash: !!document.querySelector('#slot [data-probe-crash]'), probeErr: window.__probeErr.slice(0, 5) }));
    results.push({ id, health, crashes, crashedDuringWalk: health2.crash && !health.crash, lateErrors: health2.probeErr, nTabs: tabNames.length, nDetails, nToggles, states, ms: Date.now() - t0 });
  }
  await ctxB.close();
  return { mode, ids: newIds, results, errors: errors.slice(0, 10) };
}

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const out = { file: toolFile, hub: IS_SEL ? 'sel' : 'stem', startedAt: new Date().toISOString(), modes: [] };
  try {
    for (const m of MODES) {
      try { out.modes.push(await probeMode(browser, m)); }
      catch (e) { out.modes.push({ mode: m, error: 'harness: ' + String(e && e.stack || e).slice(0, 400) }); }
    }
  } finally {
    await browser.close().catch(() => {});
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  process.exit(0);
})();
