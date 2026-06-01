#!/usr/bin/env node
// check_keyless_map.cjs — catch the React "each child in a list should have a
// unique key" warning class in directly-maintained CDN render modules
// (*_module.js + the stem_lab/ tools).
//
// Bug class (production warning, June 2026):
//   "Each child in a list should have a unique key prop. Check the render method
//    of StemPluginBridge" (stem_lab_module.js)
//   A STEM tool rendered a list via .map(...) without a `key`. It surfaced as
//   StemPluginBridge because plugin tools render through a plain renderTool()
//   call, so React attributes the keyless list to the bridge, not the tool — which
//   makes it nearly impossible to locate by hand across ~100 tools. This gate finds
//   it at the source.
//
// What it flags:
//   • a React element returned from a .map()/.flatMap() callback whose props object
//     has no `key` (and no spread that might carry one);
//   • >=2 React elements placed in a static array-literal child position
//     (createEl(tag, props, [ el, el, ... ])) where one lacks a `key`.
// Per file it learns createElement aliases (var h = React.createElement, etc.) and
// the bare h/e/createElement/_jsx forms. React.Children.map is excluded (it auto-keys).
// Props that aren't an object literal (a variable/expr) are skipped to avoid false
// positives. Pure data .map()s (not returning elements) are ignored.
//
// Usage:
//   node dev-tools/check_keyless_map.cjs            (default: root *_module.js + stem_lab/*.js)
//   node dev-tools/check_keyless_map.cjs file.js …  (explicit files)
//   node dev-tools/check_keyless_map.cjs --quiet
// Exit codes: 0 — no keyless list children.  1 — keyless list child(ren) found.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const acorn = require(path.join(ROOT, 'node_modules', 'acorn'));

const QUIET = process.argv.includes('--quiet');
const argFiles = process.argv.slice(2).filter((a) => !a.startsWith('--'));

function defaultFiles() {
  const files = [];
  for (const f of fs.readdirSync(ROOT)) if (/_module\.js$/.test(f)) files.push(path.join(ROOT, f));
  const stemDir = path.join(ROOT, 'stem_lab');
  if (fs.existsSync(stemDir)) for (const f of fs.readdirSync(stemDir)) if (/\.js$/.test(f)) files.push(path.join(stemDir, f));
  return files;
}

const BASE_CREATE = new Set(['h', 'e', 'createElement', '_jsx', '_jsxs']);
const SKIP_KEYS = new Set(['type', 'start', 'end', 'loc']);

// Iterative full-AST walk (these modules reach 600KB+, so avoid deep recursion).
function walkAll(root, visit) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node.type !== 'string') continue;
    visit(node);
    for (const k in node) {
      if (SKIP_KEYS.has(k)) continue;
      const v = node[k];
      if (Array.isArray(v)) { for (const n of v) if (n && typeof n.type === 'string') stack.push(n); }
      else if (v && typeof v.type === 'string') stack.push(v);
    }
  }
}

function discoverAliases(ast) {
  const aliases = new Set(BASE_CREATE);
  walkAll(ast, (n) => {
    const isCreateMember = (m) => m && m.type === 'MemberExpression' && m.property && m.property.name === 'createElement';
    if (n.type === 'VariableDeclarator' && n.id && n.id.type === 'Identifier' && isCreateMember(n.init)) aliases.add(n.id.name);
    if (n.type === 'AssignmentExpression' && n.left.type === 'Identifier' && isCreateMember(n.right)) aliases.add(n.left.name);
  });
  return aliases;
}

function makeIsCreate(aliases) {
  return function isCreate(node) {
    if (!node || node.type !== 'CallExpression') return false;
    const c = node.callee;
    if (c.type === 'MemberExpression' && c.property && c.property.name === 'createElement') return true;
    if (c.type === 'Identifier' && aliases.has(c.name)) return true;
    return false;
  };
}

function propsHasKeyOrSpread(props) {
  if (!props) return false;                          // missing props arg => no key
  if (props.type !== 'ObjectExpression') return true; // a variable/expr we can't introspect -> skip (avoid FP)
  for (const p of props.properties) {
    if (p.type === 'SpreadElement' || p.type === 'ExperimentalSpreadProperty') return true; // spread may carry key
    const k = p.key;
    if (k && ((k.type === 'Identifier' && k.name === 'key') || (k.type === 'Literal' && k.value === 'key'))) return true;
  }
  return false;
}

// Unwrap conditional / logical / array expressions to the element-bearing candidates.
function* candidates(expr) {
  if (!expr) return;
  if (expr.type === 'ConditionalExpression') { yield* candidates(expr.consequent); yield* candidates(expr.alternate); return; }
  if (expr.type === 'LogicalExpression') { yield* candidates(expr.right); return; }
  if (expr.type === 'ArrayExpression') { for (const el of expr.elements) yield* candidates(el); return; }
  yield expr;
}

// The expressions a map callback returns (arrow-expr body, or every shallow ReturnStatement).
function returnedExprs(cb) {
  const out = [];
  if (!cb) return out;
  if (cb.type === 'ArrowFunctionExpression' && cb.expression) { out.push(cb.body); return out; }
  (function find(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'ReturnStatement' && node.argument) out.push(node.argument);
    const isFn = (n) => n && (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression' || n.type === 'FunctionDeclaration');
    for (const key in node) {
      if (SKIP_KEYS.has(key)) continue;
      const v = node[key];
      if (Array.isArray(v)) v.forEach((n) => { if (n && n.type && !isFn(n)) find(n); });
      else if (v && v.type && !isFn(v)) find(v);
    }
  })(cb.body);
  return out;
}

// React.Children.map / Children.map auto-assign keys — never flag those.
function isChildrenMap(callee) {
  if (callee.type !== 'MemberExpression') return false;
  const obj = callee.object;
  if (obj.type === 'Identifier' && obj.name === 'Children') return true;
  if (obj.type === 'MemberExpression' && obj.property && obj.property.name === 'Children') return true;
  return false;
}

const flagged = [];
let examined = 0;

function scan(file) {
  let ast;
  try { ast = acorn.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 'latest', locations: true }); }
  catch (e) { console.log('PARSE-FAIL ' + path.relative(ROOT, file) + ': ' + e.message); return; }
  const isCreate = makeIsCreate(discoverAliases(ast));
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  walkAll(ast, (node) => {
    if (node.type !== 'CallExpression') return;
    const c = node.callee;
    // (1) .map / .flatMap returning a keyless element
    if (c.type === 'MemberExpression' && c.property && (c.property.name === 'map' || c.property.name === 'flatMap') && !isChildrenMap(c)) {
      const cb = node.arguments[0];
      if (cb && (cb.type === 'ArrowFunctionExpression' || cb.type === 'FunctionExpression')) {
        for (const ret of returnedExprs(cb)) for (const cand of candidates(ret)) if (isCreate(cand)) {
          examined++;
          if (!propsHasKeyOrSpread(cand.arguments[1])) flagged.push(rel + ':' + cand.loc.start.line + '  (.' + c.property.name + ' return)');
        }
      }
    }
    // (2) static array-literal child position with >=2 keyless elements
    if (isCreate(node)) {
      for (let i = 2; i < node.arguments.length; i++) {
        const arg = node.arguments[i];
        if (arg && arg.type === 'ArrayExpression' && arg.elements.length >= 2) {
          const els = [];
          for (const el of arg.elements) for (const cand of candidates(el)) if (isCreate(cand)) els.push(cand);
          if (els.length >= 2) { examined += els.length; if (els.some((el) => !propsHasKeyOrSpread(el.arguments[1]))) flagged.push(rel + ':' + arg.loc.start.line + '  (array-literal children)'); }
        }
      }
    }
  });
}

const files = argFiles.length ? argFiles.map((f) => path.resolve(ROOT, f)) : defaultFiles();
files.forEach(scan);

if (flagged.length) {
  console.error('✗ check_keyless_map: ' + flagged.length + ' keyless list child(ren) (React "unique key" warning class):');
  for (const f of flagged) console.error('    ' + f);
  console.error('  Fix: give each element a stable, unique key (e.g. key: item.id or key: \'prefix-\' + i).');
  process.exit(1);
}
if (!QUIET) console.log('✓ check_keyless_map: ' + files.length + ' file(s), ' + examined + ' list-element site(s), no keyless children.');
process.exit(0);
