#!/usr/bin/env node
// scan_canvas_stale_reads.cjs — gate for the "guarded canvas callback reads a
// frozen render-scope value" class.
//
// A canvas ref callback guarded by `if (cv._fooInit) return;` runs its body ONCE.
// React hands the same <canvas> element back on every re-render, the guard bails,
// and so every function created inside that body — the rAF `frame()`, a click or
// pointer listener, a MutationObserver callback — keeps the FIRST render's
// closure for the life of the canvas. Anything those functions read from render
// scope is pinned to mount time and never changes again.
//
// scan_inline_canvas_refs covers the opposite failure (a ref with NO guard, so
// setup re-runs constantly). This one covers the cost of the guard working.
//
// THE WRITE SIDE was found in Moon Mission: appends computed from a frozen `d`
// snapshot each REPLACED the previous one, so the sample bag never exceeded one
// rock and two badges became unreachable.
//
// THE READ SIDE was found in Migration (2026-08-12), three shipped dead controls:
//   * Wind — the click listener closed over `placingObj` from the first render
//     (null), so `if (!placingObj) return;` always returned and clicking the
//     field placed NOTHING. Placing terrain is that tab's entire point.
//   * Wind — the Lines/Dots toggle flipped state and left the canvas alone.
//   * Routes — picking a species set `selectedSpecies` and left consecutive
//     canvas frames byte-identical; the bird never flew its route. The source
//     even carried a comment asserting "a species selection re-inits on a fresh
//     canvas". It does not, and that false premise is what hid the bug.
//
// Why every other gate is blind: jsdom has no canvas and no rAF; the WebGL
// conformance battery only proves the surface is alive; and SCREENSHOT tests all
// pass, because mounting WITH the state already set renders correctly. The
// failure exists only when a control is operated AFTER mount — the only way a
// student ever uses it.
//
// FLAG = an identifier that is
//   (a) declared in an enclosing render scope from the tool-state object `d`
//       (`var aoa = d.aoa || 5;`) — i.e. it changes between renders, and
//   (b) read inside a function NESTED in a guarded canvas-init callback — i.e.
//       it is read after mount, not during it, and
//   (c) not shadowed anywhere between that read and the callback.
//
// Reads in the callback's own top-level body are NOT flagged: that body runs
// once at init and is supposed to see mount-time values (sizing the initial
// flock from `birdCount` is correct). Only deferred callbacks are the bug.
//
// COVERAGE, so a green run is not over-read: this class only exists where a tool
// uses the `cv._fooInit` guarded-ref idiom, which is 22 of the 141 STEM tools
// (~234 deferred functions). The rest mount canvases through useEffect or the
// shared bay viewer and are out of scope here, NOT verified clean. Tools with no
// `toolData` binding at all are skipped and counted separately.
//
// The fix these tools already use is a live ref written on every render; alias it
// at the top of the deferred function so every reference below is live for free:
//     function frame() {
//       var lv = _liveVals.current;
//       var isDark = lv.isDark;                        // shadows the frozen name
//       var selectedSpecies = lv.selectedSpecies || null;
//       ...
//     }
// which is why (c) treats a shadowing declaration as the cure.
//
// Usage: node dev-tools/scan_canvas_stale_reads.cjs [--info] [--ctx] [--keyed]
//                                                   [--quiet] [--update-baseline]
//                                                   [files...]
//
// --ctx   advisory second tier: values lifted off the harness `ctx` (isDark,
//         gradeLevel) rather than off tool state. Same freeze, but the symptom is
//         a canvas left in the old palette after a theme switch rather than a
//         dead control, so it reports without failing the gate.
// --keyed sites excluded because the element carries a state-derived `key` and is
//         therefore remounted by design. Prints the key expression, because the
//         refresh only covers what is IN that key.

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const acorn = require(path.join(ROOT, 'desktop/web-app/node_modules/acorn'));

const FN_TYPES = new Set(['FunctionExpression', 'ArrowFunctionExpression', 'FunctionDeclaration']);

function isNode(v) { return v && typeof v === 'object' && typeof v.type === 'string'; }

function walk(node, visit, ancestors) {
  if (visit(node, ancestors) === false) return;
  ancestors.push(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    const v = node[key];
    if (Array.isArray(v)) { for (const c of v) if (isNode(c)) walk(c, visit, ancestors); }
    else if (isNode(v)) walk(v, visit, ancestors);
  }
  ancestors.pop();
}

// Names a function introduces: its params, plus every declaration in its body
// that is not inside a nested function. `var` is function-scoped; let/const are
// folded in too, which can only make the scanner more conservative.
function declaredIn(fnNode) {
  const names = new Set();
  for (const p of fnNode.params || []) collectPattern(p, names);
  const body = fnNode.body;
  if (!body || body.type !== 'BlockStatement') return names;
  walk(body, (n) => {
    if (n !== body && FN_TYPES.has(n.type)) {
      if (n.type === 'FunctionDeclaration' && n.id) names.add(n.id.name);
      return false; // do not descend into nested scopes
    }
    if (n.type === 'VariableDeclarator') collectPattern(n.id, names);
    if (n.type === 'FunctionDeclaration' && n.id) names.add(n.id.name);
    if (n.type === 'ClassDeclaration' && n.id) names.add(n.id.name);
    return undefined;
  }, []);
  return names;
}

function collectPattern(pat, out) {
  if (!pat) return;
  if (pat.type === 'Identifier') out.add(pat.name);
  else if (pat.type === 'ObjectPattern') for (const p of pat.properties) collectPattern(p.value || p.argument, out);
  else if (pat.type === 'ArrayPattern') for (const e of pat.elements) if (e) collectPattern(e, out);
  else if (pat.type === 'AssignmentPattern') collectPattern(pat.left, out);
  else if (pat.type === 'RestElement') collectPattern(pat.argument, out);
}

// `if (cv._fooInit) return;` where cv is one of the function's params — the
// idempotence guard that makes the whole body run exactly once.
function guardedParam(fnNode) {
  const params = new Set((fnNode.params || []).filter((p) => p.type === 'Identifier').map((p) => p.name));
  if (!params.size) return null;
  const body = fnNode.body;
  if (!body || body.type !== 'BlockStatement') return null;
  for (const st of body.body) {
    if (st.type !== 'IfStatement' || !st.test) continue;
    const t = st.test;
    if (t.type !== 'MemberExpression' || t.computed) continue;
    if (!t.object || t.object.type !== 'Identifier' || !params.has(t.object.name)) continue;
    const prop = t.property && t.property.name;
    if (!prop || prop[0] !== '_') continue;
    const c = st.consequent;
    const isReturn = c && (c.type === 'ReturnStatement'
      || (c.type === 'BlockStatement' && c.body.length && c.body[0].type === 'ReturnStatement'));
    if (isReturn) return t.object.name;
  }
  return null;
}

// Does this initializer read the per-render tool-state object? `var aoa = d.aoa
// || 5;` changes every render; `var TABS = [...]` does not.
function readsStateObject(node, stateNames) {
  let hit = false;
  walk(node, (n) => {
    if (hit) return false;
    if (n.type === 'MemberExpression' && n.object && n.object.type === 'Identifier' && stateNames.has(n.object.name)) hit = true;
    return undefined;
  }, []);
  return hit;
}

// THE OTHER LEGITIMATE FIX. A live ref is one way to defeat the frozen closure;
// re-keying the element is the other. `React.createElement('canvas', { key:
// 'stereo-' + d.stereoGen, ref: function (canvas) { if (canvas._stereoInit) ... } })`
// gives React a NEW element whenever the key changes, so `_stereoInit` is unset
// on it and the whole body re-runs against a current `d`.
//
// Art Studio's stereogram does exactly this — "Render Stereogram" stamps
// `stereoGen` with Date.now() — and the first version of this scanner reported
// it as a dead control. Returning the key EXPRESSION rather than just a boolean
// keeps the judgement with the reader: the closure refreshes on that value, so
// anything the callback reads which is NOT in the key is still worth a look.
function refreshKeyFor(fnNode, ancestors, src, stateNames) {
  const idx = ancestors.indexOf(fnNode);
  if (idx < 2) return null;
  const prop = ancestors[idx - 1];
  const obj = ancestors[idx - 2];
  if (!prop || prop.type !== 'Property' || obj.type !== 'ObjectExpression') return null;
  const propName = prop.key && (prop.key.name || prop.key.value);
  if (propName !== 'ref') return null;
  for (const p of obj.properties) {
    if (p.type !== 'Property') continue;
    const nm = p.key && (p.key.name || p.key.value);
    if (nm !== 'key' || !p.value) continue;
    if (!readsStateObject(p.value, stateNames)) return null;
    return src.slice(p.value.start, p.value.end).replace(/\s+/g, ' ');
  }
  return null;
}

// An Identifier in a value-reading position (not `obj.name`, not `{name: ...}`).
function isRead(node, parent) {
  if (!parent) return true;
  if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) return false;
  if (parent.type === 'Property' && parent.key === node && !parent.computed) return false;
  if (parent.type === 'VariableDeclarator' && parent.id === node) return false;
  if (FN_TYPES.has(parent.type) && (parent.params || []).includes(node)) return false;
  if (parent.type === 'LabeledStatement' || parent.type === 'BreakStatement' || parent.type === 'ContinueStatement') return false;
  return true;
}

// Every name a scope binds, mapped to the declarator that binds it, so a read
// can be resolved to the ONE declaration that actually reaches it.
function ownedDecls(fnNode) {
  const map = new Map();
  const add = (pat, decl) => {
    const names = new Set();
    collectPattern(pat, names);
    for (const nm of names) if (!map.has(nm)) map.set(nm, decl);
  };
  if (fnNode.type === 'Program') {
    for (const st of fnNode.body) {
      if (st.type === 'VariableDeclaration') for (const dcl of st.declarations) add(dcl.id, dcl);
      if (st.type === 'FunctionDeclaration' && st.id) add(st.id, st);
    }
    return map;
  }
  for (const p of fnNode.params || []) add(p, { isParam: true });
  const body = fnNode.body;
  if (!body || body.type !== 'BlockStatement') return map;
  walk(body, (n) => {
    if (n !== body && FN_TYPES.has(n.type)) {
      if (n.type === 'FunctionDeclaration' && n.id) add(n.id, n);
      return false;                       // do not descend into nested scopes
    }
    if (n.type === 'VariableDeclarator') add(n.id, n);
    if (n.type === 'FunctionDeclaration' && n.id) add(n.id, n);
    return undefined;
  }, []);
  return map;
}

function scanFile(abs) {
  const src = fs.readFileSync(abs, 'utf8');
  const file = path.relative(ROOT, abs).split(path.sep).join('/');
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: 2020, locations: true, allowReturnOutsideFunction: true });
  } catch (e) { return { file, parseError: e.message, fails: [], infos: [] }; }

  // 1. The tool-state objects: `var d = (ctx.toolData && ctx.toolData['x']) || {}`
  const stateNames = new Set();
  walk(ast, (n) => {
    if (n.type !== 'VariableDeclarator' || !n.id || n.id.type !== 'Identifier' || !n.init) return undefined;
    const txt = src.slice(n.init.start, n.init.end);
    if (/\b(toolData|labToolData)\b/.test(txt)) stateNames.add(n.id.name);
    return undefined;
  }, []);
  if (!stateNames.size) return { file, fails: [], infos: [], skipped: 'no toolData binding' };

  // Names ever used in callee position. `ctx` carries both per-render VALUES
  // (isDark, gradeLevel) and stable HELPERS (t, upd, beep, announceToSR), and
  // only the values go stale in a way that matters. A helper is given away by
  // being called somewhere — `if (beep) beep(...)` reads it as a plain value
  // too, so "never read as a value" is the wrong test; "never called" is right.
  const calledNames = new Set();
  walk(ast, (n) => {
    if (n.type === 'CallExpression' && n.callee && n.callee.type === 'Identifier') calledNames.add(n.callee.name);
    return undefined;
  }, []);

  // Is THIS declarator a per-render value? Resolution happens per read, so an
  // unrelated `var x = d.xyX` elsewhere in the file cannot poison another `x`.
  // (An earlier version keyed on the bare NAME and reported 14 sites across
  // five tools, most of them phantoms, for exactly that reason.)
  const isStatefulDecl = (decl) => {
    if (!decl || decl.isParam) return false;
    if (decl.type === 'FunctionDeclaration') return false;
    if (!decl.init || FN_TYPES.has(decl.init.type)) return false;   // helpers are stable
    if (decl.id && decl.id.type === 'Identifier' && stateNames.has(decl.id.name)) return true;
    return readsStateObject(decl.init, stateNames);
  };

  // Second tier: values lifted off the harness ctx. Same freeze, different
  // source — a theme switch left four of Migration's canvases painted in the
  // old palette until the tab was changed, and the `d`-only rule could not see
  // it. Reported separately because the failure is cosmetic drift rather than a
  // dead control.
  const isCtxValueDecl = (decl) => {
    if (!decl || decl.isParam || decl.type === 'FunctionDeclaration') return false;
    if (!decl.init || FN_TYPES.has(decl.init.type)) return false;
    if (!decl.id || decl.id.type !== 'Identifier') return false;
    if (calledNames.has(decl.id.name)) return false;                // a helper, not a value
    let hit = false;
    walk(decl.init, (n) => {
      if (hit) return false;
      if (n.type === 'MemberExpression' && n.object && n.object.type === 'Identifier' && n.object.name === 'ctx') hit = true;
      return undefined;
    }, []);
    return hit;
  };

  const scopeCache = new Map();
  const declsFor = (fn) => {
    if (!scopeCache.has(fn)) scopeCache.set(fn, ownedDecls(fn));
    return scopeCache.get(fn);
  };

  const fails = new Map();     // deferred fn node -> {line, fn, guard, names:Set}
  const ctxFails = new Map();  // same shape, second tier (ctx-derived values)
  const keyedFails = new Map();// same shape, but the element carries a refresh key
  const keyCache = new Map();  // guarded fn -> key expression | null
  let cleanDeferred = 0;
  const deferredSeen = new Set();

  walk(ast, (node, anc) => {
    if (node.type !== 'Identifier') return undefined;
    if (!isRead(node, anc[anc.length - 1])) return undefined;

    // Scope chain, innermost first, ending at Program.
    const chain = [];
    for (let i = anc.length - 1; i >= 0; i--) if (FN_TYPES.has(anc[i].type) || anc[i].type === 'Program') chain.push(anc[i]);
    // The nearest guarded canvas-init callback, and the deferred function under
    // it that this read sits in. A read in the callback's OWN body runs once at
    // mount and is supposed to see mount-time values, so it is not a bug.
    let guardIdx = -1, guardParam = null;
    for (let i = 0; i < chain.length; i++) {
      const p = FN_TYPES.has(chain[i].type) ? guardedParam(chain[i]) : null;
      if (p) { guardIdx = i; guardParam = p; break; }
    }
    if (guardIdx < 1) return undefined;             // not inside one, or not nested
    const guardFn = chain[guardIdx];
    if (!keyCache.has(guardFn)) keyCache.set(guardFn, refreshKeyFor(guardFn, anc, src, stateNames));
    const refreshKey = keyCache.get(guardFn);
    const deferred = chain[guardIdx - 1];
    deferredSeen.add(deferred);

    // Resolve the binding: first scope in the chain that declares this name.
    let bindIdx = -1, decl = null;
    for (let i = 0; i < chain.length; i++) {
      const m = declsFor(chain[i]);
      if (m.has(node.name)) { bindIdx = i; decl = m.get(node.name); break; }
    }
    if (bindIdx < 0) return undefined;              // global / import — not our class
    if (bindIdx <= guardIdx) return undefined;      // local to the callback or below
    const stateTier = isStatefulDecl(decl);
    const ctxTier = !stateTier && isCtxValueDecl(decl);
    if (!stateTier && !ctxTier) return undefined;

    const bucket = refreshKey ? keyedFails : (stateTier ? fails : ctxFails);
    if (!bucket.has(deferred)) {
      const holder = anc.slice(0, anc.indexOf(deferred)).reverse().find((a) => a.type === 'VariableDeclarator');
      bucket.set(deferred, {
        line: deferred.loc.start.line,
        fn: deferred.id ? deferred.id.name : (holder && holder.id && holder.id.name) || 'anonymous',
        guard: guardParam,
        refreshKey: refreshKey,
        names: new Set(),
      });
    }
    bucket.get(deferred).names.add(node.name);
    return undefined;
  }, []);

  for (const fn of deferredSeen) if (!fails.has(fn) && !ctxFails.has(fn) && !keyedFails.has(fn)) cleanDeferred++;
  const shape = (m) => [...m.values()].map((f) => ({ ...f, names: [...f.names].sort() }));
  return {
    file,
    fails: shape(fails),
    ctxFails: shape(ctxFails),
    keyedFails: shape(keyedFails),
    infos: new Array(cleanDeferred).fill(0).map(() => ({})),
  };
}

const argv = process.argv.slice(2);
const showInfo = argv.includes('--info');
// Second tier off by default: it is advisory, and printing it beside real dead
// controls would dilute the thing the gate exists to stop.
const showCtx = argv.includes('--ctx');
const showKeyed = argv.includes('--keyed');
const quiet = argv.includes('--quiet');
const writeBaseline = argv.includes('--update-baseline');
const fileArgs = argv.filter((a) => !a.startsWith('--'));
const files = fileArgs.length ? fileArgs
  : fs.readdirSync(path.join(ROOT, 'stem_lab'))
      .filter((f) => /^stem_tool_.*\.js$/.test(f))
      .map((f) => path.join('stem_lab', f));

// Baselined like scan_inline_canvas_refs, so the gate can BLOCK anything new
// while acknowledging the existing backlog. Keyed on "function: names" rather
// than a line number, because a line moves whenever anything above it changes.
const BASELINE_FILE = path.join(__dirname, 'canvas_stale_reads_baseline.json');
let baseline = {};
try { baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')).accepted || {}; } catch (e) {}
const seen = {};

let failFiles = 0, failCount = 0, infoCount = 0, ctxCount = 0, keyedCount = 0, parseErrors = 0, skipped = 0;
for (const rel of files) {
  const r = scanFile(path.resolve(ROOT, rel));
  if (r.parseError) { parseErrors++; console.log('PARSE FAIL ' + rel + ': ' + r.parseError); continue; }
  if (r.skipped) { skipped++; continue; }
  const base = path.basename(rel);
  const key = (f) => f.fn + ': ' + f.names.join(',');
  if (r.fails.length) seen[base] = r.fails.map(key);
  const fresh = r.fails.filter((f) => !(baseline[base] || []).includes(key(f)));
  if (fresh.length) {
    failFiles++; failCount += fresh.length;
    console.log('FLAG ' + rel);
    for (const f of fresh) {
      console.log('   - ' + f.fn + '() @' + f.line + ' runs after mount inside a `' + f.guard
        + '._*`-guarded init; reads frozen: ' + f.names.join(', '));
    }
  }
  // ctx-derived staleness is cosmetic drift (a theme switch leaving a canvas in
  // the old palette), not a dead control, so it reports without failing the gate.
  keyedCount += (r.keyedFails || []).length;
  if (showKeyed && (r.keyedFails || []).length) {
    console.log('KEYED ' + rel);
    for (const f of r.keyedFails) {
      console.log('   ~ ' + f.fn + '() @' + f.line + ' reads ' + f.names.join(', ')
        + ' — but the element is re-keyed on `' + f.refreshKey + '`, so the closure refreshes');
    }
  }
  ctxCount += (r.ctxFails || []).length;
  if (showCtx && (r.ctxFails || []).length) {
    console.log('CTX  ' + rel);
    for (const f of r.ctxFails) {
      console.log('   ~ ' + f.fn + '() @' + f.line + ' reads frozen ctx value(s): ' + f.names.join(', '));
    }
  }
  infoCount += r.infos.length;
  if (showInfo && r.infos.length) {
    console.log('INFO ' + rel + ': ' + r.infos.length + ' deferred fn(s) clean');
  }
}
if (writeBaseline) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify({
    note: 'Deferred canvas callbacks reading frozen render-scope values, accepted for now. '
      + 'Each entry is a real staleness risk, not a false positive: verify by DRIVING the control '
      + 'in a browser before clearing one. Regenerate with --update-baseline only after re-reading each site.',
    accepted: seen,
  }, null, 2) + '\n', 'utf8');
  console.log('baseline written: ' + Object.keys(seen).length + ' file(s)');
}
if (!quiet || failFiles || parseErrors) {
  console.log('---');
  console.log('scan_canvas_stale_reads: ' + files.length + ' file(s), ' + failCount + ' NEW stale-read site(s) in '
    + failFiles + ' file(s), ' + ctxCount + ' ctx-value site(s) (' + (showCtx ? 'shown' : '--ctx to list')
    + ', advisory), ' + keyedCount + ' re-keyed (' + (showKeyed ? 'shown' : '--keyed to list')
    + ', refreshed by design), ' + infoCount + ' deferred fn(s) clean, ' + skipped + ' without a toolData binding, '
    + parseErrors + ' parse failure(s).');
}
process.exit(failFiles || parseErrors ? 1 : 0);
