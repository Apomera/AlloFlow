#!/usr/bin/env node
// _jsx_phantom_ref_check.cjs — verify every identifier a JSX block uses still has a definition
//
// Usage:
//   # In-place check (before any edits): every JSX ref should resolve to current source.
//   node _jsx_phantom_ref_check.cjs --start 20085 --end 20122
//
//   # Simulate post-extraction state. Two flag families:
//   #   --moving "id1,id2"   — names that WILL exist in the new module's deps (not phantoms)
//   #   --deleting "id1,id2" — names that will be REMOVED from the source file
//   #                          (use this to predict orphan-ref errors before you make the deletes)
//   #
//   # Typical use: --moving and --deleting carry the SAME list (you're moving handlers from
//   # source to module). If --deleting names are not also in --moving, they become phantoms.
//   node _jsx_phantom_ref_check.cjs --start 20085 --end 20122 \
//        --moving "showKokoroOfferModal,setShowKokoroOfferModal,setSelectedVoice,addToast" \
//        --deleting "showKokoroOfferModal,setShowKokoroOfferModal,setSelectedVoice,addToast"
//
// What it catches: the orphan-handler class — JSX still calls handler X but X was deleted
// from the source file's scope and not re-exported via the new module. Has bitten this
// project repeatedly (memory: feedback_extraction_orphan_class.md).
//
// Exit code: 0 if clean, 1 if any phantom refs found.

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const args = process.argv.slice(2);
const argv = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) argv[args[i].slice(2)] = args[i + 1] || true;
}
const FILE = argv.file || 'AlloFlowANTI.txt';
const START = parseInt(argv.start, 10);
const END = parseInt(argv.end, 10);
const MOVING = new Set((argv.moving || '').split(',').map(s => s.trim()).filter(Boolean));
const DELETING = new Set((argv.deleting || '').split(',').map(s => s.trim()).filter(Boolean));
if (!START || !END || START > END) {
  console.error('Usage: node _jsx_phantom_ref_check.cjs --start <N> --end <M> [--moving "id1,id2,..."]');
  process.exit(2);
}

const src = fs.readFileSync(path.resolve(FILE), 'utf8');
const lines = src.split(/\r?\n/);

const GLOBAL_BUILTINS = new Set([
  'window', 'document', 'console', 'navigator', 'localStorage', 'sessionStorage',
  'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'Math', 'Date', 'JSON', 'Object',
  'Array', 'String', 'Number', 'Boolean', 'RegExp', 'Promise', 'Map', 'Set',
  'WeakMap', 'WeakSet', 'Symbol', 'Error', 'TypeError', 'URL', 'URLSearchParams',
  'FormData', 'Blob', 'File', 'FileReader', 'AbortController', 'CustomEvent',
  'Event', 'undefined', 'null', 'true', 'false', 'NaN', 'Infinity',
  'React', 'ReactDOM',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
  'btoa', 'atob', 'structuredClone', 'globalThis', 'process', 'require', 'module',
  'self', 'top', 'parent', 'crypto', 'performance',
]);

// Collect every name that's defined anywhere in the source file.
// We don't need to be scope-perfect here; we just need a Set of "this name has at least
// one definition somewhere in the file." If yes, it's not a phantom.
function collectAllDefinedNames() {
  const all = new Set();
  let ast;
  try {
    ast = parser.parse(src, {
      sourceType: 'module',
      plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
      errorRecovery: true,
    });
  } catch (e) {
    console.error('Failed to parse source file for definitions:', e.message);
    process.exit(2);
  }
  function bind(node) {
    if (!node) return;
    if (node.type === 'Identifier') all.add(node.name);
    else if (node.type === 'ArrayPattern') node.elements.forEach(bind);
    else if (node.type === 'ObjectPattern') {
      for (const p of node.properties) {
        if (p.type === 'RestElement') bind(p.argument);
        else bind(p.value);
      }
    } else if (node.type === 'RestElement') bind(node.argument);
    else if (node.type === 'AssignmentPattern') bind(node.left);
  }
  function walk(node) {
    if (!node || typeof node.type !== 'string') return;
    switch (node.type) {
      case 'VariableDeclarator': bind(node.id); break;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        if (node.id) all.add(node.id.name);
        if (node.params) node.params.forEach(bind);
        break;
      case 'ClassDeclaration':
      case 'ClassExpression':
        if (node.id) all.add(node.id.name);
        break;
      case 'ImportDeclaration':
        for (const spec of node.specifiers || []) all.add(spec.local.name);
        break;
      case 'ImportSpecifier':
      case 'ImportDefaultSpecifier':
      case 'ImportNamespaceSpecifier':
        if (node.local) all.add(node.local.name);
        break;
      case 'CatchClause': if (node.param) bind(node.param); break;
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'range' || k === 'start' || k === 'end' || k === 'extra') continue;
      const v = node[k];
      if (v && typeof v === 'object') {
        if (Array.isArray(v)) v.forEach(walk);
        else if (typeof v.type === 'string') walk(v);
      }
    }
  }
  walk(ast);
  return all;
}
const definedAnywhere = collectAllDefinedNames();

// Parse the JSX slice to collect references
const sliceText = lines.slice(START - 1, END).join('\n');
let cleaned = sliceText
  .replace(/^\s*return\s*\(/, '')
  .replace(/\)\s*;?\s*$/, '');
function tryParse(text) {
  try { return parser.parse(text, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true }); }
  catch (e) { return null; }
}
let sliceAst = tryParse(`const __x = <>${cleaned}</>;`);
if (!sliceAst) sliceAst = tryParse(`const __x = (${cleaned});`);
if (!sliceAst) sliceAst = tryParse(`function __wrap() { return (<>${cleaned}</>); }`);
if (!sliceAst) {
  console.error('Could not parse the JSX slice.');
  cleaned.split('\n').slice(0, 5).forEach((l, i) => console.error(`  ${i + 1}: ${l}`));
  process.exit(2);
}

const localScopes = [];
const refs = new Map(); // name → first source line
function pushScope() { localScopes.push(new Set()); }
function popScope() { localScopes.pop(); }
function bindLocal(n) { if (!localScopes.length) pushScope(); localScopes[localScopes.length - 1].add(n); }
function isLocal(n) { for (const s of localScopes) if (s.has(n)) return true; return false; }
function bindPattern(node) {
  if (!node) return;
  if (node.type === 'Identifier') bindLocal(node.name);
  else if (node.type === 'ArrayPattern') node.elements.forEach(bindPattern);
  else if (node.type === 'ObjectPattern') {
    for (const p of node.properties) {
      if (p.type === 'RestElement') bindPattern(p.argument);
      else bindPattern(p.value);
    }
  } else if (node.type === 'RestElement') bindPattern(node.argument);
  else if (node.type === 'AssignmentPattern') bindPattern(node.left);
}
function visit(node, parent) {
  if (!node || typeof node.type !== 'string') return;
  const t = node.type;
  if (t === 'ArrowFunctionExpression' || t === 'FunctionExpression' || t === 'FunctionDeclaration') {
    pushScope();
    for (const p of node.params) bindPattern(p);
    if (t === 'FunctionDeclaration' && node.id) bindLocal(node.id.name);
    visit(node.body, node);
    popScope();
    return;
  }
  if (t === 'BlockStatement' || t === 'CatchClause') {
    pushScope();
    if (t === 'CatchClause' && node.param) bindPattern(node.param);
    for (const k of Object.keys(node)) {
      if (k === 'param') continue;
      const v = node[k];
      if (v && typeof v === 'object') {
        if (Array.isArray(v)) v.forEach(c => visit(c, node));
        else if (typeof v.type === 'string') visit(v, node);
      }
    }
    popScope();
    return;
  }
  if (t === 'VariableDeclarator') { bindPattern(node.id); if (node.init) visit(node.init, node); return; }
  if (t === 'JSXAttribute') { if (node.value) visit(node.value, node); return; }
  if (t === 'MemberExpression') { visit(node.object, node); if (node.computed) visit(node.property, node); return; }
  if (t === 'ObjectProperty' || t === 'Property') { if (node.computed) visit(node.key, node); visit(node.value, node); return; }
  if (t === 'JSXOpeningElement' || t === 'JSXClosingElement') {
    const name = node.name;
    if (name && name.type === 'JSXIdentifier' && /^[A-Z]/.test(name.name)) record(name.name, name.loc.start.line);
    else if (name && name.type === 'JSXMemberExpression') {
      let root = name; while (root.object) root = root.object;
      if (root.type === 'JSXIdentifier') record(root.name, root.loc.start.line);
    }
    if (node.attributes) for (const a of node.attributes) visit(a, node);
    return;
  }
  if (t === 'Identifier') {
    if (parent && parent.type === 'VariableDeclarator' && parent.id === node) return;
    if (parent && parent.type === 'AssignmentPattern' && parent.left === node) return;
    if (parent && (parent.type === 'ObjectProperty' || parent.type === 'Property') && parent.key === node && !parent.computed) return;
    if (parent && parent.type === 'LabeledStatement' && parent.label === node) return;
    if (parent && parent.type === 'BreakStatement') return;
    if (parent && parent.type === 'ContinueStatement') return;
    record(node.name, node.loc.start.line);
    return;
  }
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'range' || k === 'start' || k === 'end' || k === 'extra') continue;
    const v = node[k];
    if (v && typeof v === 'object') {
      if (Array.isArray(v)) v.forEach(c => visit(c, node));
      else if (typeof v.type === 'string') visit(v, node);
    }
  }
}
function record(name, astLine) {
  if (isLocal(name)) return;
  if (GLOBAL_BUILTINS.has(name)) return;
  const sourceLine = START + (astLine - 1);
  if (!refs.has(name)) refs.set(name, sourceLine);
}
visit(sliceAst, null);

// Classify each ref. Simulation: a name "exists post-extraction" if either
//   (a) it's in --moving (defined in the new module's deps), OR
//   (b) it's defined in the source AND not in --deleting.
const phantoms = [];
const movedOK = [];
const sourceOK = [];
for (const [name, line] of refs) {
  if (MOVING.has(name)) movedOK.push({ name, line });
  else if (definedAnywhere.has(name) && !DELETING.has(name)) sourceOK.push({ name, line });
  else phantoms.push({ name, line, reason: DELETING.has(name) ? 'in --deleting but not --moving' : 'no definition found' });
}

// Output
console.log(`# Phantom-ref preflight — ${FILE} lines ${START}–${END}`);
console.log(`# Total refs: ${refs.size}  source-defined: ${sourceOK.length}  moving: ${movedOK.length}  phantom: ${phantoms.length}`);
console.log('');
if (MOVING.size) {
  console.log(`## Moving (declared in --moving, expected to be redefined in new module): ${movedOK.length}`);
  for (const r of movedOK.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ✓ ${r.name.padEnd(40)} at line ${r.line}`);
  }
  console.log('');
}
if (phantoms.length) {
  console.log(`## ❌ PHANTOM REFS (${phantoms.length}) — these IDs would have no definition after the planned extraction`);
  for (const r of phantoms.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ❌ ${r.name.padEnd(40)} first ref at line ${r.line}  (${r.reason})`);
  }
  console.log('');
  console.log('Action: either add these to --moving (will be defined in new module) OR remove them from --deleting.');
  process.exit(1);
}
console.log('✅ No phantoms. Every JSX-referenced identifier has a definition in the source file.');
process.exit(0);
