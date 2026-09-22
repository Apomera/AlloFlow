#!/usr/bin/env node
'use strict';
/*
 * Hostile-toolData sweep for the STEM Lab.
 *
 * A saved project file is INPUT: a student can save it, copy it between
 * devices, hand-edit it, or carry it across tool versions. 147 of 150 STEM
 * tools read it straight out of `ctx.toolData` as `d.<key>`. The shell's error
 * boundary is unkeyed, so ONE tool's throw blanks the lab — and the bad file
 * need not even belong to the tool the student is looking at.
 *
 * WHY THIS EXISTS when the 2026-09-07 sweep already ran and fixed 7 tools:
 * that sweep used a hostile set of essentially `"abc"` and `9999`. Its own
 * write-up recorded the gap —
 *
 *     "Worth re-running the lab-wide sweep with out-of-range integers added
 *      to the hostile set — the 4% figure is probably low."
 *
 * climateExplorer was found only afterwards, by hand, and needed an
 * out-of-range option INDEX. This gate is that recommended re-run, made
 * permanent, with the full 8-value set the SEL gate settled on.
 *
 * DETECTION ONLY — writes nothing.
 *
 * The prior sweeps recorded THREE silent false negatives, each of which
 * reported "clean" while testing nothing. Guarded against here:
 *   1. A malformed value only matters on the screen that READS it -> cross the
 *      hostile values with each tool's own views.
 *   2. Key discovery must match the idiom the tools actually use -> discover
 *      `d.<key>` reads (147 of 150 tools), not a niche hook. STEM differs from
 *      SEL here: only 5 tools define `defaultState()` and only 29 use `TABS`,
 *      so view discovery also reads `d.mode` (553 reads) and `d.phase`.
 *   3. The hostile patch sets a discovered key, and a view key is often one of
 *      them -> apply the VIEW LAST so the screen under test survives.
 *
 * Calibration: --selftest injects a known-bad tool and asserts the sweep
 * catches it. A sweep that cannot fail is worse than no sweep, because it
 * closes the question.
 *
 * Usage:  node dev-tools/check_stem_hostile_tooldata.cjs [--json] [--selftest]
 *                                                        [--tool=<id>]
 * Exit:   non-zero if any tool throws on a malformed save.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const WEB = path.join(ROOT, 'desktop/web-app', 'node_modules');
const { JSDOM } = require(path.join(WEB, 'jsdom'));
const React = require(path.join(WEB, 'react'));
const RDS = require(path.join(WEB, 'react-dom/server'));

const SELFTEST = process.argv.includes('--selftest');
const ONLY = (process.argv.find((a) => a.startsWith('--tool=')) || '').slice(7);
// Mounting all 150 tools in one process exhausts the default 4GB heap before
// the summary prints, so the whole-lab run has to be split. --shard=i/n takes
// the i-th slice (1-based) of the id list; the slices are disjoint and cover
// everything, so running all n and summing is the same sweep. Sharding is the
// ONLY safe way to parallelise this: separate processes racing over the SAME
// working tree report crashes for guards that are actually present, because a
// concurrently-edited tool file is read half-written.
const SHARD = (process.argv.find((a) => a.startsWith('--shard=')) || '').slice(8);
const STEM = path.join(ROOT, 'stem_lab');

// jsdom's CSS parser rejects modern at-rules (@container, :focus-visible) that
// the tools legitimately ship, and each rejection prints a full stylesheet dump.
// That is harness noise, not a finding — silence it so real output is readable.
const vc = new (require(path.join(WEB, 'jsdom')).VirtualConsole)();
vc.on('jsdomError', () => {});
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, virtualConsole: vc });
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
// Tools that reach for WebGL/audio must not die in the harness for that reason;
// a crash here would be blamed on the hostile value. See the harness traps note.
dom.window.HTMLCanvasElement.prototype.getContext = function () { return null; };

const noop = () => {};
const registry = {};
const FILES = {};
dom.window.StemLab = {
  _registry: registry, _order: [],
  registerTool(id, c) { c.id = id; registry[id] = c; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: (id) => !!registry[id],
  renderTool(id, ctx) { const t = registry[id]; return t && t.render ? t.render(ctx) : null; },
};
// Engines and data modules the tools expect to already be on window.
for (const f of fs.readdirSync(STEM).filter((n) => /\.js$/.test(n) && !/^stem_tool_/.test(n) && n !== 'stem_lab_module.js')) {
  try { new Function(fs.readFileSync(path.join(STEM, f), 'utf8')).call(dom.window); } catch (e) {}
}
for (const f of fs.readdirSync(STEM).filter((n) => /^stem_tool_.*\.js$/.test(n)).sort()) {
  const before = new Set(Object.keys(registry));
  try { new Function(fs.readFileSync(path.join(STEM, f), 'utf8')).call(dom.window); } catch (e) {}
  for (const k of Object.keys(registry)) if (!before.has(k)) FILES[k] = f;
}

if (SELFTEST) {
  // A deliberately fragile tool: it will throw on any non-array `items`.
  dom.window.StemLab.registerTool('__canary', {
    render(ctx) {
      const d = (ctx.toolData && ctx.toolData.__canary) || {};
      const items = d.items;
      return React.createElement('div', null, items.map((x) => String(x)).join(','));
    },
  });
  FILES.__canary = '(synthetic)';
}

/** Keys the tool reads off its own state bag, plus its view ids. */
function discover(id) {
  const file = FILES[id];
  // The canary must PASS its clean control and fail only on hostile input —
  // otherwise it is skipped as a broken view and proves nothing.
  if (!file || file === '(synthetic)') return { keys: ['items'], views: [] };
  const src = fs.readFileSync(path.join(STEM, file), 'utf8');
  const keys = new Set();
  const views = new Set();
  let m;
  // idiom: d.<key> — 147 of 150 tools
  const re = /\bd\.([a-zA-Z_$][\w$]*)/g;
  while ((m = re.exec(src)) !== null) keys.add(m[1]);

  // View ids. STEM mostly does NOT use a TABS array (only 29 tools), so also
  // harvest the literals each view key is COMPARED against — that is where the
  // real screen names live for the other 121.
  const at = src.indexOf('var TABS');
  if (at !== -1) {
    const end = src.indexOf('];', at);
    const block = src.slice(at, end === -1 ? at + 6000 : end);
    const vre = /\{\s*id:\s*'([a-zA-Z][\w]*)'/g;
    while ((m = vre.exec(block)) !== null) views.add(m[1]);
  }
  const cmp = /\bd\.(?:mode|tab|view|phase|stage|activeTab|screen|section)\s*===?\s*'([a-zA-Z][\w]*)'/g;
  while ((m = cmp.exec(src)) !== null) views.add(m[1]);

  // ★ The idiom that produced a SILENT FALSE NEGATIVE (2026-09-20):
  //   var viewState = useState(d.view || 'menu');   ... if (view === 'x')
  // The screen name is compared against the LOCAL React variable, never against
  // `d.view`, so the two patterns above harvest nothing and every hostile value
  // is tested on the menu. An injected `d.misconIdx || 0` bug in evoLab went
  // undetected this way. The 5 tools using it (bikelab, birdlab, evolab,
  // nutritionlab, weldlab) are 4 of the 6 crashers the 2026-09-07 sweep found
  // plus the one its notes call "unusually exposed" — precisely the tools that
  // must not be skipped.
  //
  // useState's initializer DOES run under renderToStaticMarkup, so seeding
  // `d.view` reaches the screen. Harvest names from the local comparisons and
  // the navigation calls.
  const local = /\b(?:view|mode|tab|phase|stage|screen|section)\s*===?\s*'([a-zA-Z][\w]*)'/g;
  while ((m = local.exec(src)) !== null) views.add(m[1]);
  const nav = /\bset(?:View|Mode|Tab|Phase|Stage|Screen|Section)\(\s*'([a-zA-Z][\w]*)'/g;
  while ((m = nav.exec(src)) !== null) views.add(m[1]);

  views.delete('menu'); // the default screen is already covered by the null view
  // Deep tools have 20+ screens; the cap was hiding most of them.
  const allKeys = [...keys];
  const kept = allKeys.slice(0, KEY_CAP);
  if (allKeys.length > KEY_CAP) {
    truncated.push({ tool: id, read: allKeys.length, swept: KEY_CAP });
  }
  const allViews = [...views];
  if (allViews.length > VIEW_CAP) {
    viewTruncated.push({ tool: id, found: allViews.length, mounted: VIEW_CAP });
  }
  return { keys: kept, views: allViews.slice(0, VIEW_CAP) };
}

/** Which of the view key names this tool actually uses, so we set only those. */
function viewKeysOf(id) {
  const file = FILES[id];
  if (!file || file === '(synthetic)') return [];
  const src = fs.readFileSync(path.join(STEM, file), 'utf8');
  // Includes keys seeded through `useState(d.view || 'menu')` — `\bd\.view\b`
  // matches that too, which is what makes the seeded navigation work.
  return ['mode', 'tab', 'view', 'phase', 'stage', 'activeTab', 'screen', 'section']
    .filter((k) => new RegExp(`\\bd\\.${k}\\b`).test(src));
}

function defaultsOf(id) {
  const file = FILES[id];
  if (file === '(synthetic)') return { items: ['ok'] };
  if (!file) return {};
  const src = fs.readFileSync(path.join(STEM, file), 'utf8');
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

// Hostile values. Out-of-range integers included per the climateExplorer note:
// that crash needed an out-of-range option INDEX, which "abc"/9999 never reach.
const HOSTILE = ['abc', 9999, -1, 1.5, {}, [], null, 0];

// Keys swept per tool. A cap is needed — a full run already exhausts an
// 8 GB heap — but it MUST be visible: slicing silently meant 53 of 150 tools
// were partially swept while the gate printed a clean tick, and that is how
// nuclearLab's nkQuery crash (the 81st key) shipped. --deep raises it.
const KEY_CAP = process.argv.includes('--deep') ? 400 : 60;
const truncated = [];

// ★Views had the SAME failure the key cap comment above describes, but silently:
// `views.slice(0, 30)` was hardcoded, unreported and not raised by --deep, so
// 15 tools lost 671 of the 2048 discovered view ids while the gate printed a
// clean tick. aquaculture mounted 30 of 146, birdlab 30 of 137, fisherlab
// 30 of 122. A hostile value is only ever tested on the screens that got
// mounted, so an unmounted view is UNTESTED, not passing — exactly the
// distinction the key cap already makes visible.
const VIEW_CAP = process.argv.includes('--deep') ? 200 : 30;
const viewTruncated = [];

const palProxy = new Proxy({}, { get: () => '#888888' });
const theme = new Proxy({ isDark: true, isContrast: false, reduceMotion: false, palette: palProxy },
  { get: (o, p) => (p in o ? o[p] : '#888888') });

function ctxFor(id, bag) {
  const base = {
    React, theme, isDark: true, isContrast: false, isCompact: false,
    toolData: { [id]: bag }, labToolData: { [id]: bag },
    setToolData: noop, setLabToolData: noop, update: noop, updateMulti: noop,
    setStemTool: noop, setStemTab: noop, addToast: noop, awardXP: noop,
    getXP: () => 0, announceToSR: noop, celebrate: noop, beep: noop,
    t: (k) => k, callGemini: null, callGeminiVision: null, tryAward: noop,
    icons: new Proxy({}, { get: () => () => null }),
    gradeLevel: '8th Grade', gradeBand: 'middle',
    toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t),
    a11yClick: (h) => ({ onClick: h, onKeyDown: noop, role: 'button', tabIndex: 0 }),
    props: {},
  };
  return new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
}

function render(id, bag) {
  const Probe = () => dom.window.StemLab.renderTool(id, ctxFor(id, bag));
  RDS.renderToStaticMarkup(React.createElement(Probe));
}

const crashes = [];
const skipped = [];
let exercised = 0;
let viewsMounted = 0;
const unenterable = [];

// A filter that matches nothing must not look like a clean sweep. Tool ids are
// camelCase (`climateExplorer`), not the file slug (`climateexplorer`), so a
// plausible-looking --tool= typo silently exercised 0 tools and still exited 0.
const ALL_IDS = Object.keys(registry);
if (ONLY && !ALL_IDS.includes(ONLY)) {
  const near = ALL_IDS.filter((i) => i.toLowerCase() === ONLY.toLowerCase());
  console.error(`✗ --tool=${ONLY} matches no registered tool.`);
  if (near.length) console.error(`  Ids are camelCase — did you mean --tool=${near[0]} ?`);
  process.exit(2);
}

let shardIds = null;
if (SHARD) {
  const m = /^(\d+)\/(\d+)$/.exec(SHARD);
  if (!m) { console.error(`✗ --shard=${SHARD} must look like i/n, e.g. --shard=1/6.`); process.exit(2); }
  const i = Number(m[1]); const n = Number(m[2]);
  if (!(n >= 1) || !(i >= 1) || i > n) { console.error(`✗ --shard=${SHARD}: need 1 <= i <= n.`); process.exit(2); }
  // Contiguous slices, so every id lands in exactly one shard.
  const per = Math.ceil(ALL_IDS.length / n);
  shardIds = new Set(ALL_IDS.slice((i - 1) * per, i * per));
}

for (const id of ALL_IDS) {
  if (ONLY && id !== ONLY) continue;
  if (shardIds && !shardIds.has(id)) continue;
  const { keys, views } = discover(id);
  if (!keys.length) continue;
  const defaults = defaultsOf(id);
  const vKeys = viewKeysOf(id);
  // ★A view NAME is not an enterable view. discover() harvests names from
  // `view === 'x'` and `setView('x')`, but the patch can only navigate by
  // setting a toolData key, and viewKeysOf() finds one only if the tool reads
  // `d.<viewkey>`. When it returns [], `viewBits` below stays {} and EVERY
  // named view re-renders the default screen — so the run still counts them as
  // mounted while testing one screen N times. 48 of 118 tools with views are in
  // this state (754 names), incl. aquaculture 146, fisherlab 122,
  // cephalopodlab 117, all of which hold their screen in local React state or
  // localStorage. Those need a click path, not a state patch.
  if (views.length && !vKeys.length) {
    unenterable.push({ tool: id, views: views.length });
  }

  // CONTROL: a view that is broken for unrelated reasons must not be blamed on
  // hostile input. Mount clean first; skip the views that already fail.
  const liveViews = [];
  for (const view of [null, ...views]) {
    const viewBits = {};
    if (view) for (const vk of vKeys) viewBits[vk] = view;
    try { render(id, Object.assign({}, defaults, viewBits)); liveViews.push(view); }
    catch (e) { skipped.push({ tool: id, view: view || '(default)', msg: String(e && e.message || e).slice(0, 70) }); }
  }
  if (!liveViews.length) continue;
  exercised += 1;
  // The denominator this gate never reported. Without it a tool whose views
  // could not be entered looks identical to one probed end to end, which is how
  // a crash behind `section === 'spotter'` in llmLiteracy read as a clean pass.
  viewsMounted += liveViews.length;
  const seen = new Set();

  for (const view of liveViews) {
    for (const key of keys) {
      for (const bad of HOSTILE) {
        // TRAP 3: view LAST so the hostile patch cannot navigate away from the
        // screen under test (a view key is often itself a discovered key).
        const bag = Object.assign({}, defaults, { [key]: bad });
        if (view) for (const vk of vKeys) bag[vk] = view;
        // Setting the view key hostilely IS the test when key is a view key.
        if (view && vKeys.indexOf(key) !== -1) bag[key] = bad;
        try { render(id, bag); } catch (e) {
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
console.log(`distinct crashes: ${crashes.length}`);
console.log(`views mounted   : ${viewsMounted} (each tool's default screen plus every view reached)`);
console.log(`views skipped   : ${skipped.length} (failed their CLEAN control — not hostile-input bugs)\n`);
// Partial coverage must never read as complete. Without this, the tick at the
// end said "no STEM tool crashes" while solarsystem had swept 60 of its 379
// keys — 53 of 150 tools read more than the cap.
if (truncated.length) {
  const worst = truncated.slice().sort((a, b) => b.read - a.read);
  const unswept = truncated.reduce((n, t) => n + (t.read - t.swept), 0);
  console.log(`PARTIAL COVERAGE: ${truncated.length} tool(s) read more than ${KEY_CAP} keys; `
    + `${unswept} key(s) were NOT swept. Re-run with --deep for full coverage.`);
  for (const t of worst.slice(0, 5)) console.log(`  ${t.tool}: swept ${t.swept} of ${t.read}`);
  console.log('');
}
if (unenterable.length) {
  const worst = unenterable.slice().sort((a, b) => b.views - a.views);
  const names = unenterable.reduce((n, t) => n + t.views, 0);
  console.log(`NOT ENTERABLE: ${unenterable.length} tool(s) name ${names} view(s) that this gate `
    + `cannot navigate to — they keep their screen in local state or localStorage, so setting a `
    + `toolData key does nothing and every one re-renders the default screen.`);
  for (const t of worst.slice(0, 5)) console.log(`  ${t.tool}: ${t.views} view(s) named, 0 reachable`);
  console.log(`  These are UNMEASURED by this gate, not clean. The only way in is a click, so`);
  console.log(`  they need an e2e spec (tests/e2e/) that opens each screen — 18 of them have no`);
  console.log(`  e2e spec at all today, so those views are tested by neither instrument.`);
  console.log('');
}
if (viewTruncated.length) {
  const worst = viewTruncated.slice().sort((a, b) => b.found - a.found);
  const unmounted = viewTruncated.reduce((n, t) => n + (t.found - t.mounted), 0);
  console.log(`PARTIAL COVERAGE: ${viewTruncated.length} tool(s) have more than ${VIEW_CAP} views; `
    + `${unmounted} view(s) were NOT mounted. Re-run with --deep for full coverage.`);
  for (const t of worst.slice(0, 5)) console.log(`  ${t.tool}: mounted ${t.mounted} of ${t.found}`);
  console.log('');
}
for (const [tool, list] of Object.entries(byTool)) {
  console.log(`  ${tool} (${list.length})`);
  for (const c of list.slice(0, 6)) {
    console.log(`     ${c.key} = ${c.bad}  @${c.view}`);
    console.log(`         ${c.msg}`);
  }
}

if (SELFTEST) {
  // The canary is only a calibration if it was actually REACHED. A --selftest
  // run that dies (or is sharded away) before the canary's turn would print
  // nothing and exit 0 — a green that proves the opposite of what it claims.
  const reached = exercised > 0 && (SHARD ? shardIds.has('__canary') : true);
  const ok = !!byTool.__canary;
  if (!reached) {
    console.log('\nSELFTEST: canary NEVER EXERCISED ✗ — this run proves nothing.');
    console.log('  (Run --selftest without --shard, and check the sweep completed.)');
    process.exit(1);
  }
  console.log(`\nSELFTEST: canary ${ok ? 'CAUGHT ✓' : 'MISSED ✗ — the sweep is blind'}`);
  process.exit(ok ? 0 : 1);
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ exercised, crashes, skipped }, null, 2));
}
const scope = SHARD ? ` [shard ${SHARD}]` : (ONLY ? ` [--tool=${ONLY}]` : '');
// Exercising nothing is not the same as finding nothing. A tool whose views all
// fail their CLEAN control, or that never mounts, otherwise printed the same ✓
// as a tool that was swept and came back clean — so a fix could be "verified"
// by a run that never tested it.
if (exercised === 0) {
  console.log(`✗ check_stem_hostile_tooldata${scope}: 0 tools exercised — nothing was tested, so this is NOT a pass.`);
  if (skipped.length) console.log(`  ${skipped.length} view(s) failed their clean control; the tool may be broken independently of hostile input.`);
  process.exit(2);
}
if (crashes.length === 0 && truncated.length) {
  // The PARTIAL COVERAGE block above is printed, but a plain green tick under
  // it still reads as "clean" — that is how a 29-tools-fixed sweep got
  // reported as a clear board while --deep was hiding 78 crashes (lifeSkills
  // 69, opticsLab 8, solarSystem 1). Say NOT PROVEN, and keep the exit code
  // distinct from both a pass (0) and a real crash (1) so CI cannot read a
  // capped run as either.
  console.log(`~ check_stem_hostile_tooldata${scope}: no crashes in what was swept, but ${truncated.length} tool(s) were only PARTLY swept — NOT PROVEN clean.`);
  console.log('  Those tools are UNMEASURED, not clean. Re-run with --deep before calling them done.');
  process.exit(3);
}
if (crashes.length === 0) {
  console.log(`✓ check_stem_hostile_tooldata${scope}: no STEM tool crashes on a malformed save file (${exercised} tools exercised).`);
} else {
  console.log(`✗ check_stem_hostile_tooldata: ${crashes.length} crash(es) across ${Object.keys(byTool).length} tool(s).`);
  console.log('  A saved project file is INPUT. Guard on TYPE, not truthiness:');
  console.log("    d.x || []  ->  Array.isArray(d.x) ? d.x : []");
  console.log("    d.x || ''  ->  typeof d.x === 'string' ? d.x : ''");
  console.log('    d.i || 0   ->  Number.isInteger(d.i) && d.i >= 0 && d.i < ARR.length ? d.i : 0');
}
process.exit(crashes.length ? 1 : 0);
