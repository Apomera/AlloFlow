#!/usr/bin/env node
/*
 * check_stem_render.cjs — render-smoke gate for STEM Lab plugin tools.
 *
 * WHY: check_render_refs.cjs only resolves identifiers in hook DEPENDENCY ARRAYS.
 * It cannot catch the render-phase crash class that has repeatedly reached the live
 * pilot tool (2026-06-05: stem_tool_angles `g.tabs.map` undefined; annotation Toolbar
 * bare `t`): a TypeError thrown while a component renders (undefined.map, reading a
 * prop off undefined, a mis-shaped data literal). Only actually RENDERING the tool
 * surfaces it. This gate does that headlessly.
 *
 * HOW: load every stem_lab/stem_tool_*.js into a jsdom window (each self-registers via
 * window.StemLab.registerTool), then renderToStaticMarkup each registered tool through
 * renderTool(id, ctx) with a faithful STUB ctx that mirrors the real one built by
 * stem_lab_module.js StemPluginBridge (~line 4794). A throw = the tool's RENDER PHASE
 * is broken. SSR-only: this exercises render (incl. the crash-prone paths) but not
 * useEffect/handlers, so it won't catch effect-time or click-time bugs.
 *
 * MULTI-TAB COVERAGE (added 2026-06-08): After the default-tab smoke passes for a tool,
 * scan its source for `tab === '<X>'` literals + state-bucket keys (`ld.<bucket>` or
 * `(ctx.toolData||{}).<bucket>` patterns), then re-render each tool with each alternate
 * tab value pre-set in ctx.toolData. This catches the bug class the default smoke missed
 * — most notoriously, stem_tool_numberline.js shipped a `d.magHunt` ReferenceError on
 * 2026-06-08 in a `tab === 'magCompare' && (function(){...})()` IIFE branch that only
 * executed when a user clicked the magCompare tab. The default-tab smoke never tripped
 * it because the default tab is 'explore'. The multi-tab smoke would have.
 *
 * Stub philosophy: be PERMISSIVE about environment (icons/palette/unknown ctx fields →
 * harmless stubs) so a throw points at the tool's own render logic, not a ctx gap —
 * minimizing false positives while still catching real data-shape crashes.
 *
 * Usage:  node dev-tools/check_stem_render.cjs [--quiet]
 * Exit:   non-zero if any tool fails to load, throws on render, OR renders DEGRADED
 *         (catches its own render error → fallback UI). Set STEM_RENDER_LENIENT=1 to
 *         downgrade the degraded-render case to a non-blocking advisory.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MODULES = path.join(ROOT, 'desktop/web-app', 'node_modules');
const QUIET = process.argv.includes('--quiet');

let JSDOM, React, RDS;
try {
  JSDOM = require(path.join(MODULES, 'jsdom')).JSDOM;
  React = require(path.join(MODULES, 'react'));
  RDS = require(path.join(MODULES, 'react-dom', 'server'));
} catch (e) {
  // No test deps in this environment (e.g. a CI job that didn't install desktop/web-app/
  // node_modules). SKIP rather than fail — this gate is best-effort where React+jsdom exist
  // (locally + the test jobs); it must never block a deploy/CI lane that simply lacks them.
  console.warn('[check_stem_render] SKIPPED — React/jsdom not found at ' + MODULES + ' (' + e.message + ')');
  process.exit(0);
}

// Multi-tab known-latent allowlist (2026-06-08): bugs the gate WOULD catch on
// the multi-tab pass, but which already existed BEFORE the multi-tab smoke was
// added. Listing them here is a triage ledger, not a permanent exemption — fix
// each then DELETE the entry. New regressions still gate.
//   - (none currently — both 2026-06-08 entries fixed same day:
//     fractions renderNumberLineTab stub added; decomposer GEOMETRY data
//     added for 11 substances. If the gate surfaces new entries, document
//     each here with file:line + a one-liner on what's broken.)
const MULTI_TAB_KNOWN_LATENTS = [];
const isKnownLatent = function (id, label) {
  if (!label || !label.startsWith('tab=')) return false;
  const tabVal = (label.match(/tab=([\w-]+)/) || [])[1];
  return MULTI_TAB_KNOWN_LATENTS.some(function (entry) { return entry.id === id && entry.tab === tabVal; });
};

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { pretendToBeVisual: true });
// Some globals (e.g. navigator in Node 18+/24) are read-only getters — assign defensively.
function setGlobal(k, v) {
  try { global[k] = v; }
  catch (e) { try { Object.defineProperty(global, k, { value: v, configurable: true, writable: true }); } catch (_) {} }
}
setGlobal('window', dom.window);
setGlobal('document', dom.window.document);
setGlobal('navigator', dom.window.navigator);
setGlobal('HTMLElement', dom.window.HTMLElement);
setGlobal('getComputedStyle', dom.window.getComputedStyle);

const noop = function () {};
const stubComp = function () { return null; };
const iconsProxy = new Proxy({}, { get: function () { return stubComp; } });
const palProxy = new Proxy({}, { get: function () { return '#888888'; } });

global.React = React;
window.React = React;
window.AlloIcons = iconsProxy;
window.callGemini = null;
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = function () { return { matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }; };
}

// Faithful stub of the ctx built by stem_lab_module.js StemPluginBridge (~4794-4950).
function makeCtx() {
  const base = {
    React: React,
    toolData: {}, setToolData: noop, update: noop, updateMulti: noop,
    setStemLabTool: noop, setStemLabTab: noop, stemLabTab: '', stemLabTool: '',
    toolSnapshots: [], setToolSnapshots: noop,
    addToast: noop, awardXP: noop, getXP: function () { return 0; },
    announceToSR: noop, canvasNarrate: noop, setCanvasNarrateEnabled: noop, celebrate: noop,
    callGemini: null, getHint: noop, aiHintsEnabled: false, aiChat: null,
    sourceText: '', inputText: '', sourceTopic: '', gradeLevel: '5th Grade', gradeBand: 'g68',
    gridRange: { min: -10, max: 10 },
    t: function (k) { return k; },
    icons: iconsProxy,
    _codingCanvasRef: { current: null },
    saveSnapshot: noop, renderTutorial: function () { return null; }, _tutGalaxy: [], beep: noop,
    callTTS: null, callImagen: null, callGeminiVision: null, callGeminiImageEdit: null,
    srOnly: function (text) { return React.createElement('span', { className: 'sr-only' }, text); },
    a11yClick: function (h) { return { onClick: h, role: 'button', tabIndex: 0 }; },
    canvasA11yDesc: function (d) { return { role: 'img', 'aria-label': d }; },
    props: {},
    activeSessionCode: null, studentNickname: null, isTeacherMode: false,
    isDark: false, isContrast: false, theme: 'default', pal: palProxy,
    exploreScore: { correct: 0, total: 0 }, setExploreScore: noop,
    exploreDifficulty: 'medium', setExploreDifficulty: noop,
    angleValue: 45, setAngleValue: noop, angleChallenge: null, setAngleChallenge: noop,
    angleFeedback: null, setAngleFeedback: noop,
    multTableAnswer: '', setMultTableAnswer: noop, multTableChallenge: null, setMultTableChallenge: noop,
    multTableFeedback: null, setMultTableFeedback: noop, multTableHidden: false, setMultTableHidden: noop,
    multTableHover: null, setMultTableHover: noop, multTableRevealed: new Set(), setMultTableRevealed: noop,
    labToolData: {}, setLabToolData: noop, _renderingFlag: { current: false },
  };
  // Unknown ctx reads → noop fn (used-as-callback safe). Real fields above cover the
  // documented contract; this only catches drift, not the tool's own render logic.
  return new Proxy(base, { get: function (o, p) { return (p in o) ? o[p] : noop; } });
}

const dir = path.join(ROOT, 'stem_lab');
const files = fs.readdirSync(dir).filter(function (f) { return /^stem_tool_.*\.js$/.test(f); });
const loadErrors = [];
files.forEach(function (f) {
  try {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    new Function(src)(); // eslint-disable-line no-new-func
  } catch (e) {
    loadErrors.push({ file: f, error: (e && e.message) || String(e) });
  }
});

const registry = (window.StemLab && window.StemLab._registry) || {};
const ids = Object.keys(registry).sort();
const renderErrors = []; // uncaught throw → ErrorBoundary would take down the app (angles class)
const swallowed = [];    // tool caught its own render error → shows fallback UI, not the real tool
const _origErr = console.error;

// Multi-tab discovery: for each tool file, scan source for state-bucket keys
// (`ld.<X> || {}` or `(ctx.toolData||{}).<X>`) and tab values (`tab === '<X>'`).
// We try the cross product (every bucket × every tab) — at worst it's a small
// 2D matrix per tool, and the smoke is fast (jsdom + SSR).
function discoverTabsAndBuckets(src) {
  const buckets = new Set();
  // Pattern A: `var X = ld.bucket || {}` / `var X = data.bucket || {}` / etc.
  // Pattern B: `(ctx.toolData || {}).bucket` (no intermediate var).
  // Be permissive — flatten regexes into one set.
  const reA = /\b(?:var|let|const)\s+\w+\s*=\s*\w+\.(\_?\w+)\s*\|\|\s*\{\s*\}/g;
  const reB = /\(\s*ctx\.toolData\s*\|\|\s*\{\s*\}\s*\)\s*\.(\_?\w+)/g;
  let m;
  while ((m = reA.exec(src))) buckets.add(m[1]);
  while ((m = reB.exec(src))) buckets.add(m[1]);
  // Also accept underscore-prefixed bucket convention by id even if no destructure regex matches:
  // many tools use `_<toolId>`. We add this in the per-tool loop, not here.

  const tabs = new Set();
  const reTab = /\btab\s*===\s*['"]([\w-]+)['"]/g;
  while ((m = reTab.exec(src))) tabs.add(m[1]);
  // Also pick up `_X.tab || 'default'` patterns for the default tab.
  const reDefault = /\.tab\s*\|\|\s*['"]([\w-]+)['"]/g;
  while ((m = reDefault.exec(src))) tabs.add(m[1]);

  return { buckets: [...buckets], tabs: [...tabs] };
}

const TOOL_FILES_BY_ID = {};
files.forEach(function (f) {
  // tool id == file basename minus `stem_tool_` prefix + `.js` suffix
  const id = f.replace(/^stem_tool_/, '').replace(/\.js$/, '');
  TOOL_FILES_BY_ID[id] = f;
});

ids.forEach(function (id) {
  // Tools wrap render in try/catch and log "[StemLab] Error rendering <id>" then show a
  // fallback. That error is swallowed (no uncaught throw) — capture it so the gate sees the
  // degraded-tool class too, not just app-crashes.
  function runOne(label, toolData) {
    const caught = [];
    console.error = function () {
      try {
        var s = Array.prototype.map.call(arguments, function (x) { return x && x.message ? x.message : String(x); }).join(' ');
        if (/error rendering/i.test(s)) caught.push(s);
      } catch (_) {}
    };
    let threwError = null;
    try {
      const ctx = makeCtx();
      if (toolData) ctx.toolData = toolData;
      RDS.renderToStaticMarkup(React.createElement(function StemSmoke() {
        return window.StemLab.renderTool(id, ctx);
      }));
    } catch (e) {
      threwError = (e && e.message) || String(e);
    } finally {
      console.error = _origErr;
    }
    const fullLabel = id + (label ? ' [' + label + ']' : '');
    const allowed = isKnownLatent(id, label);
    if (threwError) {
      if (allowed) console.log('  (known-latent skipped) ' + fullLabel + ': ' + threwError);
      else renderErrors.push({ id: fullLabel, error: threwError });
    }
    if (caught.length) {
      if (allowed) console.log('  (known-latent skipped) ' + fullLabel + ': ' + caught[0]);
      else swallowed.push({ id: fullLabel, error: caught[0] });
    }
  }

  // (1) default smoke (toolData = {})
  runOne(null, null);

  // (2) multi-tab smoke. Skip if no source file for this id (e.g. dynamically-registered tools).
  const fname = TOOL_FILES_BY_ID[id];
  if (!fname) return;
  let src;
  try { src = fs.readFileSync(path.join(dir, fname), 'utf8'); } catch (_) { return; }
  const { buckets, tabs } = discoverTabsAndBuckets(src);
  // Also try the conventional `_<id>` bucket even if regexes didn't find it.
  const tryBuckets = Array.from(new Set([...buckets, '_' + id, id]));
  if (tabs.length <= 1) return; // nothing to permute
  // Default tab is whichever appeared in `_X.tab || 'Y'` — already in `tabs`; render every value.
  tabs.forEach(function (tabVal) {
    tryBuckets.forEach(function (bucket) {
      runOne('tab=' + tabVal + ' bucket=' + bucket, { [bucket]: { tab: tabVal } });
    });
  });
});

if (!QUIET) {
  console.log('[check_stem_render] ' + files.length + ' tool file(s), ' + ids.length + ' registered tool(s)');
}
if (loadErrors.length) {
  console.error('✗ ' + loadErrors.length + ' tool file(s) failed to LOAD:');
  loadErrors.forEach(function (e) { console.error('   - ' + e.file + ': ' + e.error); });
}
if (renderErrors.length) {
  console.error('✗ ' + renderErrors.length + ' tool(s) THREW (uncaught → ErrorBoundary crashes the app):');
  renderErrors.forEach(function (e) { console.error('   - ' + e.id + ': ' + e.error); });
}
// BLOCKING by default since 2026-06-07 (the 7-tool first-render backlog that justified the
// grace period is cleared). A "degraded render" = the tool caught its own render error and
// showed a fallback UI instead of the real tool — almost always a first-render bug (unhandled
// empty/initial state). Escape hatch: STEM_RENDER_LENIENT=1 downgrades to a non-blocking advisory.
const LENIENT = process.env.STEM_RENDER_LENIENT === '1';
if (swallowed.length) {
  const mark = LENIENT ? '⚠' : '✗';
  const tail = LENIENT ? ' (advisory — STEM_RENDER_LENIENT set)' : ' (BLOCKING — set STEM_RENDER_LENIENT=1 to override)';
  console.error(mark + ' ' + swallowed.length + ' STEM tool(s) render DEGRADED (caught render error → fallback UI, not the real tool)' + tail + ':');
  swallowed.forEach(function (e) { console.error('   - ' + e.id + ': ' + e.error); });
}
if (loadErrors.length || renderErrors.length || (!LENIENT && swallowed.length)) {
  process.exit(1);
}
console.log('✓ check_stem_render: no app-crash render failures across ' + ids.length + ' STEM tools'
  + (swallowed.length ? ' (' + swallowed.length + ' degraded-render advisory — LENIENT set, see above)' : '') + '.');
