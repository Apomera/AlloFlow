#!/usr/bin/env node
// check_aria_handler.cjs — static lint for two render/handler crash classes that
// the render-smoke gates (check_stem_render / check_sel_render) structurally miss
// or only catch after the fact.
//
// Bug classes (both seen in production June 2026):
//
//   (A) must-be-string ATTRIBUTE given a provably non-string (object/array) value.
//       SEL Hub 2026-06-07: `h('button', { 'aria-label': st.breathPatternsUsed || {} })`
//       and `{ 'aria-label': st.techsDone || {} }` — an `aria-label` that evaluates to
//       an object. (The sibling `popBadge.icon` crashes were a different cause — an
//       undefined identifier — caught by the render-smoke; this targets the
//       object/array-typed-value signature, which is unambiguous and near-zero FP:
//       an aria-label/title/alt is ALWAYS a string.)  → BLOCKING.
//
//   (B) unguarded SPREAD of a TOOL-STATE member: `[...d.results]` where `d` is the
//       tool's per-open state object (declared from labToolData / ctx.toolData and
//       therefore `{}` on first open, so `d.results` is undefined → spread throws).
//       probability/runTrial 2026-06-07: the render-path deref was guarded but the
//       HANDLER spread was not, so it crashed on the first click — a path the SSR
//       render-smoke does not exercise. SCOPED to detected state vars (a plain
//       `[...arr.items]` / `[...prev.x]` setState spread is NOT flagged — those are
//       reliably arrays), which is the difference between signal and 199 lines of
//       noise.  → BLOCKING (the scoped set is high-signal; ARIA_HANDLER_LENIENT_SPREAD=1
//       downgrades to advisory).
//
// Scope: directly-maintained render code — root *_module.js + stem_lab/*.js +
// sel_hub/*.js (same family as check_render_refs / check_keyless_map). These have no
// _source.jsx; they ARE the source. (*_source.jsx is JSX and isn't scanned.)
//
// Usage:
//   node dev-tools/check_aria_handler.cjs            (default scope)
//   node dev-tools/check_aria_handler.cjs file.js …  (explicit files)
//   node dev-tools/check_aria_handler.cjs --quiet
// Exit: 0 — clean.  1 — a must-be-string violation, an unguarded state-spread, or a parse fail.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const acorn = require(path.join(ROOT, 'node_modules', 'acorn'));

const QUIET = process.argv.includes('--quiet');
const LENIENT_SPREAD = process.env.ARIA_HANDLER_LENIENT_SPREAD === '1';
const argFiles = process.argv.slice(2).filter((a) => !a.startsWith('--'));

// Attributes whose value must be a string — an object/array there is always a bug.
const STRING_ATTRS = new Set([
  'aria-label', 'aria-description', 'aria-roledescription', 'aria-valuetext',
  'aria-placeholder', 'aria-keyshortcuts', 'title', 'alt', 'placeholder',
]);
// Identifiers whose member chain marks a value as per-open tool state.
const STATE_ROOTS = new Set(['labToolData', 'toolData', 'selToolData']);
const BASE_CREATE = new Set(['h', 'e', 'createElement', '_jsx', '_jsxs']);
const SKIP_KEYS = new Set(['type', 'start', 'end', 'loc']);

function defaultFiles() {
  const files = [];
  for (const f of fs.readdirSync(ROOT)) if (/_module\.js$/.test(f)) files.push(path.join(ROOT, f));
  for (const sub of ['stem_lab', 'sel_hub']) {
    const dir = path.join(ROOT, sub);
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (/\.js$/.test(f) && !/^_build/.test(f)) files.push(path.join(dir, f));
  }
  return files;
}

// Iterative full-AST walk (modules reach 600KB-1.6MB — avoid deep recursion).
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

// Does this expression provably evaluate to an object/array (i.e. NOT a valid string attr)?
// Only true when SURE (literal, or a ||/??/&&/?: whose reachable result is one). No FP.
function valueIsObjectish(node, depth) {
  if (!node || depth > 8) return false;
  switch (node.type) {
    case 'ObjectExpression':
    case 'ArrayExpression': return true;
    case 'LogicalExpression': return valueIsObjectish(node.right, depth + 1);
    case 'ConditionalExpression': return valueIsObjectish(node.consequent, depth + 1) || valueIsObjectish(node.alternate, depth + 1);
    default: return false;
  }
}

function attrKeyName(prop) {
  const k = prop.key;
  if (!k) return null;
  if (k.type === 'Identifier') return k.name;
  if (k.type === 'Literal') return String(k.value);
  return null;
}

// Unwrap `x || {}` / `x ?? []` to the underlying base expression.
function unwrapDefault(n) {
  while (n && n.type === 'LogicalExpression' && (n.operator === '||' || n.operator === '??')
    && (n.right.type === 'ObjectExpression' || n.right.type === 'ArrayExpression')) n = n.left;
  return n;
}
function chainNames(m) {
  const names = []; let cur = m;
  while (cur) {
    if (cur.type === 'MemberExpression') { if (cur.property && cur.property.type === 'Identifier' && !cur.computed) names.push(cur.property.name); cur = cur.object; }
    else if (cur.type === 'Identifier') { names.push(cur.name); break; }
    else break;
  }
  return names;
}
function chainRoot(m) { let cur = m; while (cur && cur.type === 'MemberExpression') cur = cur.object; return (cur && cur.type === 'Identifier') ? cur.name : null; }

// Per-file set of variables that hold per-open tool state (transitive: d = labToolData.x||{},
// then _y = d.sub||{} also counts). These are {} on first open, so member access is undefined.
function collectStateVars(ast) {
  const decls = [];
  walkAll(ast, (n) => {
    if (n.type === 'VariableDeclarator' && n.id && n.id.type === 'Identifier' && n.init) decls.push({ name: n.id.name, init: n.init });
    if (n.type === 'AssignmentExpression' && n.left.type === 'Identifier' && n.right) decls.push({ name: n.left.name, init: n.right });
  });
  const stateVars = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of decls) {
      if (stateVars.has(d.name)) continue;
      const base = unwrapDefault(d.init);
      if (base && base.type === 'MemberExpression') {
        const names = chainNames(base); const root = chainRoot(base);
        if (names.some((x) => STATE_ROOTS.has(x)) || (root && stateVars.has(root))) { stateVars.add(d.name); changed = true; }
      }
    }
  }
  return stateVars;
}

const ariaViolations = [];   // check A (blocking)
const spreadViolations = []; // check B (blocking unless LENIENT)
let parseFails = 0;
let createSites = 0;
let spreadScanned = 0;

function scan(file) {
  let ast;
  try { ast = acorn.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 'latest', locations: true }); }
  catch (e) { console.error('PARSE-FAIL ' + path.relative(ROOT, file) + ': ' + e.message); parseFails++; return; }
  const isCreate = makeIsCreate(discoverAliases(ast));
  const stateVars = collectStateVars(ast);
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  walkAll(ast, (node) => {
    // (A) createElement props → must-be-string attribute with object/array value
    if (isCreate(node)) {
      const props = node.arguments[1];
      if (props && props.type === 'ObjectExpression') {
        for (const p of props.properties) {
          if (p.type !== 'Property' || p.computed) continue;
          const name = attrKeyName(p);
          if (name && STRING_ATTRS.has(name)) {
            createSites++;
            if (valueIsObjectish(p.value, 0)) {
              ariaViolations.push(rel + ':' + (p.value.loc || p.loc).start.line + "  '" + name + "' = object/array value (must be a string)");
            }
          }
        }
      }
    }
    // (B) unguarded ARRAY-spread of a TOOL-STATE member: [...d.prop] with d a state var.
    // Scoped to ArrayExpression elements on purpose: only array spread ([...x]) throws on
    // undefined ("x is not iterable"); object spread ({...x}) of undefined/null is SAFE
    // (yields {}), so the `{ ...prev.slice }` setState pattern must NOT be flagged.
    if (node.type === 'ArrayExpression') {
      for (const el of node.elements) {
        if (!el || el.type !== 'SpreadElement') continue;
        const a = el.argument;
        if (a && a.type === 'MemberExpression' && !a.optional) {
          spreadScanned++;
          const root = chainRoot(a);
          if (root && stateVars.has(root)) {
            spreadViolations.push(rel + ':' + a.loc.start.line + '  [...' + memberText(a) + '] — unguarded array-spread of tool state (use `[...(' + memberText(a) + ' || [])]`)');
          }
        }
      }
    }
  });
}

function memberText(m) {
  try {
    const obj = m.object.type === 'Identifier' ? m.object.name : m.object.type === 'MemberExpression' ? memberText(m.object) : '…';
    const prop = m.computed ? '[' + (m.property.type === 'Identifier' ? m.property.name : '…') + ']' : '.' + (m.property && m.property.name ? m.property.name : '…');
    return obj + prop;
  } catch (e) { return '…'; }
}

const files = argFiles.length ? argFiles.map((f) => path.resolve(ROOT, f)) : defaultFiles();
files.forEach(scan);

// ── Check B (blocking unless lenient) ──
if (spreadViolations.length) {
  const blocking = !LENIENT_SPREAD;
  console.error((blocking ? '✗' : '⚠') + ' ' + spreadViolations.length + ' unguarded spread(s) of tool-state members'
    + (blocking ? '' : ' (advisory — ARIA_HANDLER_LENIENT_SPREAD set)') + ' — the [...d.results]/runTrial first-interaction crash class:');
  for (const s of spreadViolations) console.error('    ' + s);
  console.error('  On first open the state object is {}, so the property is undefined and the spread throws. Guard with `|| []`.');
}
// ── Check A (blocking) + parse fails ──
if (ariaViolations.length) {
  console.error('✗ ' + ariaViolations.length + ' must-be-string attribute(s) with an object/array value:');
  for (const v of ariaViolations) console.error('    ' + v);
  console.error('  Fix: an aria-label/title/alt/placeholder must be a string; a `… || {}`/object value crashes or mislabels.');
}
if (parseFails) console.error('✗ ' + parseFails + ' file(s) failed to parse (see PARSE-FAIL above).');

if (ariaViolations.length || parseFails || (!LENIENT_SPREAD && spreadViolations.length)) process.exit(1);
if (!QUIET) {
  console.log('✓ check_aria_handler: ' + files.length + ' file(s); ' + createSites + ' string-attr site(s) clean; '
    + spreadScanned + ' member-spread(s) scanned, no unguarded tool-state spreads'
    + (spreadViolations.length ? ' (' + spreadViolations.length + ' advisory)' : '') + '.');
}
process.exit(0);
