#!/usr/bin/env node
'use strict';
/*
 * Sweep the RENDERED OUTPUT of every SEL tool for text a student should never
 * see: "undefined", "NaN", "[object Object]", "null".
 *
 * Same family as the stray `0` found in Emotion Zones: the tool renders
 * successfully, so check_sel_render passes, but a broken value reaches the
 * screen as visible text. Static scans cannot see it — the template is fine,
 * the VALUE is wrong, and only at particular states.
 *
 * Rendering at INITIAL state is the important case: that is what a student
 * meets on first open, before any data exists, which is exactly when
 * `d.something.name` or `Number(undefined)` misbehaves.
 *
 * Only DOM TEXT counts. These strings appearing inside an attribute (a style
 * value, a data-* payload) are not read by a student, so the check strips tags
 * before looking.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const MODULES = path.join(ROOT, 'desktop/web-app', 'node_modules');
const { JSDOM } = require(path.join(MODULES, 'jsdom'));
const React = require(path.join(MODULES, 'react'));
const RDS = require(path.join(MODULES, 'react-dom/server'));

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
function setGlobal(k, v) {
  try { global[k] = v; } catch (e) {
    try { Object.defineProperty(global, k, { value: v, configurable: true, writable: true }); } catch (_) {}
  }
}
setGlobal('window', dom.window);
setGlobal('document', dom.window.document);
setGlobal('navigator', dom.window.navigator);
setGlobal('HTMLElement', dom.window.HTMLElement);
setGlobal('getComputedStyle', dom.window.getComputedStyle);
setGlobal('React', React);
dom.window.React = React;
dom.window.AlloIcons = new Proxy({}, { get: () => () => null });
dom.window.callGemini = null;
if (typeof dom.window.matchMedia !== 'function') {
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
}

const noop = () => {};
const registry = {};
dom.window.SelHub = {
  _registry: registry, _order: [],
  registerTool(id, c) { c.id = id; registry[id] = c; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: (id) => !!registry[id],
  renderTool(id, ctx) { const t = registry[id]; return t && t.render ? t.render(ctx) : null; },
};

for (const f of ['sel_safety_layer.js', 'sel_standards_alignment.js']) {
  const p = path.join(ROOT, 'sel_hub', f);
  if (fs.existsSync(p)) { try { new Function(fs.readFileSync(p, 'utf8')).call(dom.window); } catch (e) {} }
}
const FILES = {};
for (const f of fs.readdirSync(path.join(ROOT, 'sel_hub')).filter((n) => /^sel_tool_.*\.js$/.test(n)).sort()) {
  const before = new Set(Object.keys(registry));
  try { new Function(fs.readFileSync(path.join(ROOT, 'sel_hub', f), 'utf8')).call(dom.window); } catch (e) {}
  for (const k of Object.keys(registry)) if (!before.has(k)) FILES[k] = f;
}

const palProxy = new Proxy({}, { get: () => '#888888' });
const theme = new Proxy({ isDark: true, isContrast: false, reduceMotion: false, palette: palProxy },
  { get: (o, p) => (p in o ? o[p] : '#888888') });

function makeCtx() {
  const base = {
    React, theme, isDark: true, isContrast: false, isCompact: false,
    toolData: {}, setToolData: noop, labToolData: {}, setLabToolData: noop,
    update: noop, updateMulti: noop, setSelHubTool: noop, setSelHubTab: noop,
    addToast: noop, awardXP: noop, getXP: () => 0, announceToSR: noop, celebrate: noop, beep: noop,
    t: (k) => k, callGemini: null, onSafetyFlag: noop,
    icons: new Proxy({}, { get: () => () => null }),
    gradeLevel: '5th Grade', gradeBand: 'middle',
    toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t),
    a11yClick: (h) => ({ onClick: h, onKeyDown: noop, role: 'button', tabIndex: 0 }),
    props: {},
  };
  return new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
}

// Text a student must never see.
const SMELLS = [
  { id: 'undefined', re: /\bundefined\b/g },
  { id: 'NaN', re: /\bNaN\b/g },
  { id: 'object-Object', re: /\[object Object\]/g },
  { id: 'null-text', re: /(^|[>\s])null([<\s]|$)/g },
];

const findings = [];
const seen = new Set();
let rendered = 0;

// Each tool's own tab list, harvested from its source, so we visit real views
// rather than only the default one. The Emotion Zones stray-0 lived on the
// default tab, but most state-dependent leaks hide one tab deeper.
// Pull a tool's own defaultState() so seeded state EXTENDS it instead of
// wiping it. Without this the harness invents the very defects it looks for.
const DEFAULTS = {};
function defaultsFor(id) {
  if (DEFAULTS[id] !== undefined) return DEFAULTS[id];
  DEFAULTS[id] = {};
  const file = FILES[id];
  if (!file) return DEFAULTS[id];
  const src = fs.readFileSync(path.join(ROOT, 'sel_hub', file), 'utf8');
  const at = src.indexOf('function defaultState()');
  if (at === -1) return DEFAULTS[id];
  let depth = 0; let end = -1;
  for (let i = src.indexOf('{', at); i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') { depth -= 1; if (depth === 0) { end = i + 1; break; } }
  }
  if (end === -1) return DEFAULTS[id];
  try {
    // eslint-disable-next-line no-new-func
    DEFAULTS[id] = new Function('return (function defaultState() ' + src.slice(src.indexOf('{', at), end) + ')();')() || {};
  } catch (e) { /* a defaultState that needs closure scope stays empty */ }
  return DEFAULTS[id];
}

function tabsFor(id) {
  const file = FILES[id];
  if (!file) return [null];
  const src = fs.readFileSync(path.join(ROOT, 'sel_hub', file), 'utf8');
  const ids = new Set();
  const re = /\{\s*id:\s*'([a-zA-Z][a-zA-Z0-9_-]{2,24})'\s*,\s*(?:label|name|title):/g;
  let m;
  while ((m = re.exec(src)) !== null) { ids.add(m[1]); if (ids.size > 14) break; }
  return [null, ...ids];
}

for (const id of Object.keys(registry)) {
  let ok = false;
  for (const tab of tabsFor(id)) {
    let html = '';
    try {
      const ctx = makeCtx();
      // Seed the tool's own state bag with a tab guess; unknown keys are
      // ignored by tools that do not use them.
      // CRITICAL: tools read `labToolData[id] || defaultState()`, so ANY
      // truthy object here REPLACES every default. Seeding a bare
      // {view: tab} manufactured `undefined`/`NaN` in a tool whose real
      // defaults are fine — a harness artifact, not a bug. So merge the
      // tool's own defaults underneath the tab guess.
      const defaults = defaultsFor(id);
      const seeded = tab ? Object.assign({}, defaults, { activeTab: tab, tab, view: tab, screen: tab, mode: tab }) : null;
      const withState = new Proxy(ctx, {
        get(o, p) {
          if (p === 'toolData' || p === 'labToolData') return seeded ? { [id]: seeded } : {};
          return o[p];
        },
      });
      const Probe = () => dom.window.SelHub.renderTool(id, withState);
      html = RDS.renderToStaticMarkup(React.createElement(Probe));
      ok = true;
    } catch (e) { continue; }
    scan(id, tab, html);
  }
  if (ok) rendered += 1;
}

function scan(id, tab, html) {

  // Strip tags so attribute values (styles, data-*) do not count as text.
  const text = html.replace(/<[^>]*>/g, ' ');
  for (const smell of SMELLS) {
    smell.re.lastIndex = 0;
    const hits = text.match(smell.re) || [];
    if (!hits.length) continue;
    smell.re.lastIndex = 0;
    const m = smell.re.exec(text);
    const ctxText = m ? text.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\s+/g, ' ').trim() : '';
    const key = id + '|' + smell.id + '|' + ctxText;
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({ tool: id, tab: tab || '(default)', smell: smell.id, count: hits.length, context: ctxText });
  }
}

const QUIET = process.argv.includes('--quiet');
for (const f of findings) {
  console.log(`[RENDERED-TEXT-LEAK: ${f.smell}] ${f.tool} @ ${f.tab} (${f.count}x)`);
  console.log(`    ...${f.context}...`);
  console.log('    A broken value reached the screen as text. Check the value, not the');
  console.log('    template: string-concatenating a React element yields [object Object],');
  console.log('    and an absent field yields undefined / NaN.');
  console.log();
}
if (!QUIET) console.log(`tools rendered: ${rendered}`);
if (findings.length === 0) {
  console.log(`✓ check_sel_rendered_text_leak: no undefined/NaN/[object Object]/null in rendered SEL text (${rendered} tools).`);
} else {
  console.log(`✗ check_sel_rendered_text_leak: ${findings.length} rendered-text leak(s).`);
}
process.exit(findings.length ? 1 : 0);
