#!/usr/bin/env node
'use strict';
/*
 * Hostile-toolData sweep for the SEL Hub.
 *
 * A saved project file is INPUT: a student can save it, copy it between
 * devices, hand-edit it, or carry it across tool versions. SEL tools read it
 * straight out of `labToolData[id]` as `d.<key>`. The hub shell catches a
 * render throw and returns null, so ONE malformed key blanks the tool the
 * student is looking at — and for SEL that could be a safety plan.
 *
 * The 2026-09-07 STEM sweep found 6 of 143 tools crash this way (7 with the
 * climateExplorer follow-up). It was never run against the 72 SEL tools.
 *
 * DETECTION ONLY — writes nothing.
 *
 * The STEM sweep's notes record THREE silent false negatives, each of which
 * reported "clean" while testing nothing. Guarded against here:
 *   1. A malformed value only matters on the screen that READS it -> cross the
 *      hostile values with each tool's own views.
 *   2. Key discovery must match the idiom the tools actually use -> discover
 *      `d.<key>` reads, not a niche hook.
 *   3. The hostile patch sets every discovered key, and `view` is often one of
 *      them -> apply the BASE LAST so the view under test survives.
 * And per the climateExplorer follow-up, the hostile set includes out-of-range
 * INTEGERS, not just "abc"/9999.
 *
 * Calibration: --selftest injects a known-bad tool and asserts the sweep
 * catches it. A sweep that cannot fail is worse than no sweep.
 *
 * Usage:  node dev-tools/check_sel_hostile_tooldata.cjs [--json] [--selftest]
 * Exit:   non-zero if any tool throws on a malformed save.
 *
 * RUNTIME ~4-6 min: it renders every tool x every discovered key x 8 hostile
 * values x every view. That is slow, and deliberately so — all eight values
 * earn their place. Of the original 100 crashes "abc" found 61 and 9999 found
 * 20, but the remaining ~19 (including out-of-range option indices, the
 * climateExplorer class) were only reachable via -1, 1.5, {}, [] and null.
 * Trimming the set for speed would blind it to exactly the subtle cases.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const WEB = path.join(ROOT, 'desktop/web-app', 'node_modules');
const { JSDOM } = require(path.join(WEB, 'jsdom'));
const React = require(path.join(WEB, 'react'));
const RDS = require(path.join(WEB, 'react-dom/server'));

const SELFTEST = process.argv.includes('--selftest');

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
const FILES = {};
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
for (const f of fs.readdirSync(path.join(ROOT, 'sel_hub')).filter((n) => /^sel_tool_.*\.js$/.test(n)).sort()) {
  const before = new Set(Object.keys(registry));
  try { new Function(fs.readFileSync(path.join(ROOT, 'sel_hub', f), 'utf8')).call(dom.window); } catch (e) {}
  for (const k of Object.keys(registry)) if (!before.has(k)) FILES[k] = f;
}

if (SELFTEST) {
  // A deliberately fragile tool: it will throw on any non-array `items`.
  dom.window.SelHub.registerTool('__canary', {
    render(ctx) {
      const d = (ctx.labToolData || {}).__canary || {};
      const items = d.items;
      return React.createElement('div', null, items.map((x) => String(x)).join(','));
    },
  });
  FILES.__canary = '(synthetic)';
}

/** Keys the tool reads off its own state bag, plus its view ids. */
function discover(id) {
  const file = FILES[id];
  const keys = new Set();
  const views = new Set();
  if (!file || file === '(synthetic)') return { keys: ['items'], views: [] };
  const src = fs.readFileSync(path.join(ROOT, 'sel_hub', file), 'utf8');
  // idiom 1: d.<key>  (what 145 of 149 tools use)
  let m;
  const re = /\bd\.([a-zA-Z_$][\w$]*)/g;
  while ((m = re.exec(src)) !== null) keys.add(m[1]);
  // view ids from the tool's own TABS list
  const at = src.indexOf('var TABS');
  if (at !== -1) {
    const end = src.indexOf('];', at);
    const block = src.slice(at, end === -1 ? at + 6000 : end);
    const vre = /\{\s*id:\s*'([a-zA-Z][\w]*)'/g;
    while ((m = vre.exec(block)) !== null) views.add(m[1]);
  }
  return { keys: [...keys].slice(0, 40), views: [...views].slice(0, 14) };
}

function defaultsOf(id) {
  const file = FILES[id];
  if (!file || file === '(synthetic)') return {};
  const src = fs.readFileSync(path.join(ROOT, 'sel_hub', file), 'utf8');
  const at = src.indexOf('function defaultState()');
  if (at === -1) return {};
  let depth = 0; let end = -1;
  for (let i = src.indexOf('{', at); i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') { depth -= 1; if (depth === 0) { end = i + 1; break; } }
  }
  if (end === -1) return {};
  try { return new Function('return (function d() ' + src.slice(src.indexOf('{', at), end) + ')();')() || {}; }
  catch (e) { return {}; }
}

// Hostile values. Out-of-range integers included per the climateExplorer note.
const HOSTILE = ['abc', 9999, -1, 1.5, {}, [], null, 0];

const palProxy = new Proxy({}, { get: () => '#888888' });
const theme = new Proxy({ isDark: true, isContrast: false, reduceMotion: false, palette: palProxy },
  { get: (o, p) => (p in o ? o[p] : '#888888') });

function ctxFor(id, bag) {
  const base = {
    React, theme, isDark: true, isContrast: false, isCompact: false,
    toolData: { [id]: bag }, labToolData: { [id]: bag },
    setToolData: noop, setLabToolData: noop, update: noop, updateMulti: noop,
    setSelHubTool: noop, setSelHubTab: noop, addToast: noop, awardXP: noop,
    getXP: () => 0, announceToSR: noop, celebrate: noop, beep: noop,
    t: (k) => k, callGemini: null, onSafetyFlag: noop,
    icons: new Proxy({}, { get: () => () => null }),
    gradeLevel: '8th Grade', gradeBand: 'middle',
    toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t),
    a11yClick: (h) => ({ onClick: h, onKeyDown: noop, role: 'button', tabIndex: 0 }),
    props: {},
  };
  return new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
}

const crashes = [];
let exercised = 0;

for (const id of Object.keys(registry)) {
  const { keys, views } = discover(id);
  if (!keys.length) continue;
  const defaults = defaultsOf(id);
  exercised += 1;
  const seen = new Set();

  for (const view of [null, ...views]) {
    for (const key of keys) {
      for (const bad of HOSTILE) {
        // TRAP 3: base LAST so the view under test is not overwritten by the
        // hostile patch (which may itself set `view`).
        const patch = { [key]: bad };
        const viewBits = view ? { activeTab: view, tab: view, view, screen: view, mode: view } : {};
        const bag = Object.assign({}, defaults, patch, viewBits);
        try {
          const Probe = () => dom.window.SelHub.renderTool(id, ctxFor(id, bag));
          RDS.renderToStaticMarkup(React.createElement(Probe));
        } catch (e) {
          const msg = String(e && e.message || e).slice(0, 90);
          const k = `${id}|${key}|${msg}`;
          if (seen.has(k)) continue;
          seen.add(k);
          crashes.push({ tool: id, view: view || '(default)', key, bad: JSON.stringify(bad), msg });
        }
      }
    }
  }
}

const byTool = {};
for (const c of crashes) (byTool[c.tool] = byTool[c.tool] || []).push(c);

console.log(`tools exercised : ${exercised}`);
console.log(`crashing tools  : ${Object.keys(byTool).length}`);
console.log(`distinct crashes: ${crashes.length}\n`);
for (const [tool, list] of Object.entries(byTool)) {
  console.log(`  ${tool} (${list.length})`);
  for (const c of list.slice(0, 5)) {
    console.log(`     ${c.key} = ${c.bad}  @${c.view}`);
    console.log(`         ${c.msg}`);
  }
}

if (SELFTEST) {
  const ok = !!byTool.__canary;
  console.log(`\nSELFTEST: canary ${ok ? 'CAUGHT ✓' : 'MISSED ✗ — the sweep is blind'}`);
  process.exit(ok ? 0 : 1);
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ exercised, crashes }, null, 2));
}
if (crashes.length === 0) {
  console.log(`✓ check_sel_hostile_tooldata: no SEL tool crashes on a malformed save file (${exercised} tools exercised).`);
} else {
  console.log(`✗ check_sel_hostile_tooldata: ${crashes.length} crash(es) across ${Object.keys(byTool).length} tool(s).`);
  console.log('  A saved project file is INPUT. Guard on TYPE, not truthiness:');
  console.log("    d.x || []  ->  Array.isArray(d.x) ? d.x : []");
  console.log("    d.x || ''  ->  typeof d.x === 'string' ? d.x : ''");
  console.log('    d.i || 0   ->  Number.isInteger(d.i) && d.i >= 0 && d.i < ARR.length ? d.i : 0');
}
process.exit(crashes.length ? 1 : 0);
