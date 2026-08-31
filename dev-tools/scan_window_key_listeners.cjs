#!/usr/bin/env node
// scan_window_key_listeners.cjs — gate for window-level key handlers that keep
// firing after their tool is gone.
//
// A STEM tool renders inline in the host, so a `window.addEventListener('keydown', …)`
// it registers outlives it unless something takes the listener back down.
// multtable's Q / S / ? kept starting quizzes, speed runs and AI calls from
// INSIDE OTHER TOOLS (e1950eb7c); a six-handler sweep followed (549801ccf) and
// solarsystem's Alt+digit handler was closed after that (199f11620).
//
// Two shapes are safe, and both appear in the repo:
//   * a useEffect that returns a cleanup calling removeEventListener
//   * a DOM-presence guard at the top of the handler
//     (`if (!document.querySelector('[data-volume-root]')) return;`), which is
//     what render-scope handlers must use since they have no unmount hook
// Also safe: a handler that only acts on events targeted inside the tool
// (`e.target.closest(...)`).
//
// tests/stem_keydown_leak_guards.test.js already pins the eight known fixes and
// their mirrors. This scanner is the shape-agnostic complement: that test's
// catalog sweep only matches `window._X = function`, so a NEW tool that writes
// `useEffect(() => { window.addEventListener('keydown', h); }, [])` with no
// cleanup would not be caught by it.
//
// Usage: node dev-tools/scan_window_key_listeners.cjs [--quiet] [dir]

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// Resolve acorn from whichever install exists — CI's static-gate job installs
// only the ROOT node_modules (same fallback as check_sel_dead_content).
let acorn;
for (const p of [path.join(ROOT, 'node_modules', 'acorn'), path.join(ROOT, 'desktop/web-app', 'node_modules', 'acorn'), 'acorn']) {
  try { acorn = require(p); break; } catch (e) { /* try next */ }
}
if (!acorn) { console.error('[scan_window_key_listeners] acorn not found; cannot scan.'); process.exit(2); }

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const DIR = args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'stem_lab');

const KEY_EVENTS = new Set(['keydown', 'keyup', 'keypress']);
const FN_TYPES = new Set(['FunctionExpression', 'ArrowFunctionExpression', 'FunctionDeclaration']);
const GUARD_RE = /document\.querySelector|document\.getElementById|\.closest\(|isConnected|_KeyActive|KeyActive/;

function isNode(v) { return v && typeof v === 'object' && typeof v.type === 'string'; }
function walk(node, visit, ancestors) {
  visit(node, ancestors);
  ancestors.push(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc') continue;
    const v = node[key];
    if (Array.isArray(v)) { for (const c of v) if (isNode(c)) walk(c, visit, ancestors); }
    else if (isNode(v)) walk(v, visit, ancestors);
  }
  ancestors.pop();
}

function scanFile(file, src) {
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  } catch (e) { return { parseError: e.message, hits: [] }; }

  // Named functions, so a listener passed by reference can be inspected.
  const fnByName = new Map();
  walk(ast, (n) => {
    if (n.type === 'FunctionDeclaration' && n.id) fnByName.set(n.id.name, n);
    else if (n.type === 'VariableDeclarator' && n.id && n.id.name && n.init && FN_TYPES.has(n.init.type)) fnByName.set(n.id.name, n.init);
    else if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression'
             && n.left.property && n.right && FN_TYPES.has(n.right.type)) {
      fnByName.set(n.left.property.name || String(n.left.property.value), n.right);
    }
  }, []);

  const hits = [];
  walk(ast, (node, ancestors) => {
    if (node.type !== 'CallExpression') return;
    const c = node.callee;
    if (c.type !== 'MemberExpression' || !c.property || c.property.name !== 'addEventListener') return;
    const onWindow = c.object.type === 'Identifier' && c.object.name === 'window';
    if (!onWindow) return;
    const evt = node.arguments[0];
    if (!evt || evt.type !== 'Literal' || !KEY_EVENTS.has(evt.value)) return;

    // Safe #1: a RETURNED cleanup closure that removes the listener.
    //
    // The removal must sit inside the function this effect returns. A bare
    // removeEventListener in straight-line code before the add is the SWAP
    // idiom — `if (window._kb) removeEventListener(...); window._kb = fn;
    // addEventListener(...)` — which de-duplicates the handler but never takes
    // it down on unmount. Every tool in the 549801ccf sweep looked exactly like
    // that, so accepting a same-scope removal passes the whole known-bad set.
    // Source text of the handler being registered, so a removal only counts
    // when it takes THAT handler back off. Without this, one unrelated nested
    // removal anywhere in a large enclosing function clears every listener in
    // it — which silently dropped pre-sweep fractions, a genuine leaker.
    const addedHandlerSrc = node.arguments[1] ? src.slice(node.arguments[1].start, node.arguments[1].end) : null;

    let cleaned = false;
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const a = ancestors[i];
      if (!FN_TYPES.has(a.type)) continue;
      walk(a, (n2, anc2) => {
        if (n2.type !== 'CallExpression') return;
        const c2 = n2.callee;
        if (!(c2.type === 'MemberExpression' && c2.property && c2.property.name === 'removeEventListener')) return;
        if (!(n2.arguments[0] && n2.arguments[0].type === 'Literal' && KEY_EVENTS.has(n2.arguments[0].value))) return;
        const removedSrc = n2.arguments[1] ? src.slice(n2.arguments[1].start, n2.arguments[1].end) : null;
        if (!addedHandlerSrc || removedSrc !== addedHandlerSrc) return;
        // ONLY a RETURNED closure counts as teardown.
        //
        // "Nested inside some function" is tempting and wrong. Pre-sweep
        // fractions removed this very handler inside its Back BUTTON's onClick
        // — real code, genuinely nested, and it fires on exactly one exit path.
        // Leave by any other route and the listener survives, which is why the
        // sweep still had to add a DOM guard there. Accepting nested removals
        // silently dropped fractions from the known-bad set.
        // A straight-line removal before the add is the SWAP idiom: it drops
        // the PREVIOUS handler so only one is registered, and never runs again
        // once the tool leaves the screen.
        // Modal focus traps (cyberdefense, SEL civicaction/execfunction) remove
        // theirs from finish(), which IS reliable because the modal owns every
        // exit — but that is not distinguishable from the Back-button shape
        // statically, so those are handled by the baseline, where a human
        // decision is recorded. A gate may carry reviewed false positives; it
        // may not miss real leaks.
        for (let j = anc2.length - 1; j >= 0; j--) {
          const f = anc2[j];
          if (!FN_TYPES.has(f.type)) continue;
          const parent = anc2[j - 1];
          if (parent && parent.type === 'ReturnStatement') cleaned = true;
          break;
        }
      }, []);
      break; // nearest enclosing function only
    }
    if (cleaned) return;

    // Safe #2: the handler refuses to act when its tool is not on screen.
    const arg = node.arguments[1];
    let body = null;
    if (arg && FN_TYPES.has(arg.type)) body = arg;
    else if (arg && arg.type === 'Identifier' && fnByName.has(arg.name)) body = fnByName.get(arg.name);
    else if (arg && arg.type === 'MemberExpression' && arg.property && fnByName.has(arg.property.name)) body = fnByName.get(arg.property.name);
    if (body && GUARD_RE.test(src.slice(body.start, body.end))) return;

    hits.push({
      line: node.loc.start.line,
      evt: evt.value,
      how: !arg ? 'no handler arg' : (arg.type === 'Identifier' ? 'handler ' + arg.name : 'inline handler'),
    });
  }, []);
  return { hits };
}

// Baselined, like check_free_vars. A 2026-08-11 sweep read ALL 38 registration
// sites by hand and fixed the eight that were behaviourally leaking
// (549801ccf, 199f11620; pinned by tests/stem_keydown_leak_guards.test.js).
// The sites left below are the ones that sweep judged safe in shapes this
// scanner cannot verify statically: a modal focus trap whose removal lives in a
// sibling finish(), a bind-once trampoline that indirects through a nullable
// window._xHandler, and game-engine dispose paths. Baselining them keeps the
// gate useful for what it CAN prove — a NEW unguarded listener — instead of
// making it noisy enough to be ignored. Re-verify a line before deleting it.
const BASELINE_FILE = path.join(__dirname, 'window_key_listeners_baseline.json');
let baseline = {};
try { baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')).accepted || {}; } catch (e) {}
const writeBaseline = args.includes('--update-baseline');

// SEL Hub tools are the same shape (React tools rendered inline by a host) and
// were never scanned by any of these gates — 71 files with no coverage until
// 2026-08-11. Scan both trees unless the caller pins one directory.
const roots = args.some((a) => !a.startsWith('--'))
  ? [DIR]
  : [path.join(ROOT, 'stem_lab'), path.join(ROOT, 'sel_hub')].filter((d) => fs.existsSync(d));
const files = [];
for (const root of roots) {
  for (const f of fs.readdirSync(root).filter((n) => /^(stem|sel)_tool_.*\.js$/.test(n))) {
    files.push(path.join(root, f));
  }
}

let bad = 0, total = 0, parseErrors = 0, accepted = 0;
const found = {};
for (const full of files) {
  const f = path.basename(full);
  const src = fs.readFileSync(full, 'utf8');
  const r = scanFile(f, src);
  if (r.parseError) { parseErrors++; console.log('PARSE FAIL ' + f + ': ' + r.parseError); continue; }
  if (!r.hits.length) continue;
  // Match on handler shape, not line number: a line moves every time anything
  // above it changes, and a baseline that churns is a baseline nobody trusts.
  const keys = r.hits.map((h) => h.evt + ':' + h.how);
  found[f] = keys;
  const fresh = r.hits.filter((h, i) => !(baseline[f] || []).includes(keys[i]));
  accepted += r.hits.length - fresh.length;
  if (!fresh.length) continue;
  bad++; total += fresh.length;
  console.log('FLAG ' + f);
  for (const h of fresh) console.log('   - @' + h.line + ' window ' + h.evt + ' (' + h.how + ') — no removeEventListener cleanup and no DOM-presence guard');
}
if (writeBaseline) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify({
    note: 'Sites the 2026-08-11 all-38 sweep judged safe in shapes this scanner cannot verify statically (modal focus traps, bind-once trampolines, engine dispose paths). Regenerate with --update-baseline only after re-reading the sites.',
    accepted: found,
  }, null, 2) + '\n', 'utf8');
  console.log('baseline written: ' + Object.keys(found).length + ' file(s)');
}
if (bad) {
  console.log("  Fix: either return a cleanup that removeEventListener's the same event, or");
  console.log("  open the handler with a presence check, e.g.");
  console.log("  if (!document.querySelector('[data-<tool>-root]')) return;   // and render that marker");
}
if (!quiet || bad || parseErrors) {
  console.log('---');
  console.log('scan_window_key_listeners: ' + files.length + ' file(s), ' + total + ' unguarded window key listener(s) in '
    + bad + " file(s), " + parseErrors + ' parse failure(s).');
}
process.exit(bad || parseErrors ? 1 : 0);
