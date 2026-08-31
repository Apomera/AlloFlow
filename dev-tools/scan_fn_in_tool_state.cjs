#!/usr/bin/env node
// scan_fn_in_tool_state.cjs — gate for the "functions do not survive state
// serialization" class.
//
// Tool state round-trips through JSON (host persistence, project save/load,
// Canvas reload). A function stored on a state object is silently dropped, and
// what happens next is worse than a crash sometimes:
//   * Number Line (f31baa5c9) stored `ch._checkFn = function(ans){...}` on
//     challenge objects. After serialization the grader fell back to exact
//     match, so CORRECT answers were marked wrong — no error, just a student
//     being told they are wrong.
//   * Fractions (68015ac8c) returned `{ n, d, val, choices, answer, labelOf }`
//     with labelOf a function; calling it after a reload threw.
//
// Detection: an object that carries a function-valued property AND looks like
// DATA rather than React props. Event handlers (on*), `ref`, and anything in
// the props position of createElement/h are excluded, because a handler on a
// props object is correct and never persisted.
//
// Usage: node dev-tools/scan_fn_in_tool_state.cjs [--quiet] [dir]

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
if (!acorn) { console.error('[' + path.basename(__filename, '.cjs') + '] acorn not found; cannot scan.'); process.exit(2); }

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const DIR = args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'stem_lab');
// Same name-blindness fix as scan_mouse_only_controls: the filename filter was
// hardcoded to stem_tool_*.js, so pointing this at any other lab scanned ZERO
// files and printed a clean report.
const patternArg = args.find((a) => a.startsWith('--pattern='));
const FILE_RE = patternArg ? new RegExp(patternArg.slice('--pattern='.length)) : /^stem_tool_.*\.js$/;

const FN_TYPES = new Set(['FunctionExpression', 'ArrowFunctionExpression']);
// Property names that are legitimately functions on a non-persisted object.
const HANDLER_RE = /^(on[A-Z]|ref$|key$|render$|component$|children$)/;
// Names that mark an object as tool DATA — the shape that gets persisted.
const DATA_KEY_RE = /^(id|type|question|answer|choices|options|val|value|label|prompt|correct|items|n|d|low|high|exact|text|title|name)$/;
const ELEMENT_FNS = new Set(['createElement', 'h', 'H', 'el', 'e']);
// Calls that persist tool state (and therefore JSON round-trip it).
const STATE_WRITERS = new Set(['upd', 'updMulti', 'update', 'updateMulti', 'setToolData', 'setLabToolData', 'setStemLabTool']);
// Identifiers that name a DOM node rather than a state record.
const DOM_NAME_RE = /^(canvas|cv|cvs|cvEl|el|elem|element|node|dom|container|mount|ref|host|wrap|wrapper|svg|c)$/i;

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

// True when this object literal sits in the props slot of createElement/h(...).
function inPropsPosition(objNode, ancestors) {
  const parent = ancestors[ancestors.length - 1];
  if (!parent || parent.type !== 'CallExpression') return false;
  const callee = parent.callee;
  const name = callee.type === 'Identifier' ? callee.name
    : (callee.type === 'MemberExpression' && callee.property ? callee.property.name : null);
  return ELEMENT_FNS.has(name) && parent.arguments[1] === objNode;
}

function scanFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  } catch (e) {
    return { file, parseError: e.message, hits: [] };
  }
  const hits = [];

  // Names bound to functions anywhere in the file. `{ labelOf: labelOf }` is
  // only a defect when labelOf IS a function; geologyexplorer's
  // `{ checks: checks }` names an array of plain records and must not flag.
  const fnNames = new Set();
  walk(ast, (n) => {
    if (n.type === 'FunctionDeclaration' && n.id) fnNames.add(n.id.name);
    if (n.type === 'VariableDeclarator' && n.id && n.id.name && n.init && FN_TYPES.has(n.init.type)) fnNames.add(n.id.name);
  }, []);

  walk(ast, (node, ancestors) => {
    // Shape 1: object literal with a function-valued property, alongside
    // data-shaped keys (a challenge / item / card record).
    if (node.type === 'ObjectExpression') {
      if (inPropsPosition(node, ancestors)) return;
      // Only objects that actually REACH state. A tool file is one big IIFE, so
      // "module scope" is useless as a filter: badge/achievement tables like
      // `var ACHIEVEMENTS = [{ id, name, check: fn }]` are nested in a function
      // too, yet they live in code and are never serialized. What separates the
      // real defects is that they are RETURNED as a freshly built record (the
      // Fractions shape) or handed straight to a state writer. Constant tables
      // are array elements in a declaration, so they match neither.
      const parent = ancestors[ancestors.length - 1];
      const returned = parent && parent.type === 'ReturnStatement';
      const intoState = parent && parent.type === 'CallExpression'
        && STATE_WRITERS.has(parent.callee.type === 'Identifier' ? parent.callee.name
          : (parent.callee.property && parent.callee.property.name) || '');
      if (!returned && !intoState) return;
      const fnProps = [], dataKeys = [];
      for (const p of node.properties) {
        if (p.type !== 'Property' || p.computed) continue;
        const key = p.key && (p.key.name || p.key.value);
        if (!key) continue;
        if (DATA_KEY_RE.test(key)) dataKeys.push(key);
        if (p.value && FN_TYPES.has(p.value.type) && !HANDLER_RE.test(key)) fnProps.push(key);
        // `{ labelOf: labelOf }` — a bare identifier that names a local function
        // is the Fractions shape, so treat a non-handler shorthand as suspect
        // only when the object is otherwise clearly data.
        // Identifier-valued property (`{ labelOf: labelOf }`). Two conditions,
        // because `fnNames` is file-wide and therefore scope-blind: a local
        // parameter can share a name with a file-level function, which is how
        // lumen's `colorIdx: idx` (idx = a map index) first read as a defect.
        // Requiring the KEY to read as a predicate/formatter as well keeps the
        // real shape and drops that collision.
        else if (p.value && p.value.type === 'Identifier' && !HANDLER_RE.test(key)
                 && fnNames.has(p.value.name)
                 && /^(fn|.*Fn|labelOf|check.*|grade.*|validate.*|predicate|format.*|render.*)$/.test(key)) fnProps.push(key);
      }
      if (fnProps.length && dataKeys.length >= 2) {
        hits.push({ line: node.loc.start.line, why: 'data object literal carries function-valued key(s): ' + fnProps.join(', ')
          + ' (data keys: ' + dataKeys.slice(0, 5).join(', ') + ')' });
      }
    }
    // Shape 2: `something._checkFn = function(...)` — a function bolted onto an
    // existing record, which is how Number Line did it.
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression'
        && node.right && FN_TYPES.has(node.right.type)) {
      const key = node.left.property && (node.left.property.name || node.left.property.value);
      if (key && !HANDLER_RE.test(key) && /^(_?[a-z].*Fn|_check.*|labelOf|grade.*|validate.*|predicate)$/i.test(key)) {
        const objName = node.left.object.type === 'Identifier' ? node.left.object.name : '<expr>';
        // Stashing a callback on a DOM NODE is a legitimate, common pattern
        // (ecosystem parks _checkEcoChallenges on its canvas). DOM nodes are
        // never serialized, so only tool-state records matter here.
        if (DOM_NAME_RE.test(objName)) return;
        hits.push({ line: node.loc.start.line, why: 'function assigned to ' + objName + '.' + key + ' (stripped by serialization)' });
      }
    }
  }, []);
  return { file, hits };
}

const files = fs.readdirSync(DIR).filter((f) => FILE_RE.test(f)).map((f) => path.join(DIR, f));
if (files.length === 0) {
  console.error('scan_fn_in_tool_state: pattern ' + FILE_RE + ' matched NO files in ' + DIR + ' - nothing was scanned.');
  process.exit(2);
}
let bad = 0, total = 0, parseErrors = 0;
for (const f of files) {
  const r = scanFile(f);
  if (r.parseError) { parseErrors++; console.log('PARSE FAIL ' + path.basename(f) + ': ' + r.parseError); continue; }
  if (!r.hits.length) continue;
  bad++; total += r.hits.length;
  console.log('FLAG ' + path.relative(ROOT, f).split(path.sep).join('/'));
  for (const h of r.hits) console.log('   - @' + h.line + ' — ' + h.why);
}
if (bad) {
  console.log('  Fix: grade DECLARATIVELY from data (store low/high/exact/tolerance and');
  console.log('  branch on `type` at check time) instead of storing the predicate itself.');
}
if (!quiet || bad || parseErrors) {
  console.log('---');
  console.log('scan_fn_in_tool_state: ' + files.length + ' file(s), ' + total + ' function-in-state site(s) in '
    + bad + ' file(s), ' + parseErrors + ' parse failure(s).');
}
process.exit(bad || parseErrors ? 1 : 0);
