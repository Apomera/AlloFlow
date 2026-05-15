// Scope-aware closure-dep enumerator for an extracted JSX subtree.
// Same logic as scope_aware_dep_check.js but takes a slice of a file
// (start/end line) and wraps it as a function body.
const fs = require('fs');
const path = require('path');
const ROOT = 'c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const { parse } = require(path.join(ROOT, 'node_modules', '@babel', 'parser'));

const FILE = process.argv[2];
const START = parseInt(process.argv[3], 10);
const END = parseInt(process.argv[4], 10);
if (!FILE || !START || !END) { console.error('Usage: node enumerate_block_scope_aware.js <file> <startLine> <endLine>'); process.exit(1); }

const src = fs.readFileSync(FILE, 'utf-8');
const lines = src.split(/\r?\n/);
const blockSrc = lines.slice(START - 1, END).join('\n');
const wrapped = '/* @jsx */\nfunction __wrap() {\n  return (\n    <div>\n' + blockSrc + '\n    </div>\n  );\n}\n';

let ast;
try {
  ast = parse(wrapped, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
    errorRecovery: true,
  });
} catch (e) { console.error('Parse failed:', e.message, '@', e.loc); process.exit(1); }

const free = new Set();
function newScope(parent) { return { parent, names: new Set() }; }
function declare(scope, p) {
  if (!p) return;
  if (p.type === 'Identifier') { scope.names.add(p.name); return; }
  if (p.type === 'ObjectPattern') {
    for (const prop of p.properties) {
      if (prop.type === 'ObjectProperty') declare(scope, prop.value);
      else if (prop.type === 'RestElement') declare(scope, prop.argument);
    }
    return;
  }
  if (p.type === 'ArrayPattern') { for (const el of p.elements) if (el) declare(scope, el); return; }
  if (p.type === 'AssignmentPattern') { declare(scope, p.left); return; }
  if (p.type === 'RestElement') { declare(scope, p.argument); return; }
}
function resolve(scope, name) { for (let s = scope; s; s = s.parent) if (s.names.has(name)) return true; return false; }
function hoist(scope, node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => hoist(scope, n)); return; }
  if (node.type === 'FunctionDeclaration' && node.id) scope.names.add(node.id.name);
  if (node.type === 'VariableDeclaration' && node.kind === 'var') {
    for (const d of node.declarations) declare(scope, d.id);
  }
  if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') return;
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'range') continue;
    const v = node[k];
    if (v && typeof v === 'object') hoist(scope, v);
  }
}
function walk(node, scope, parent) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => walk(n, scope, parent)); return; }
  if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
    const s = newScope(scope);
    if (node.id && node.type === 'FunctionExpression') s.names.add(node.id.name);
    if (node.params) for (const p of node.params) declare(s, p);
    hoist(s, node.body);
    walk(node.body, s, node);
    return;
  }
  if (node.type === 'CatchClause') {
    const s = newScope(scope);
    if (node.param) declare(s, node.param);
    hoist(s, node.body);
    walk(node.body, s, node);
    return;
  }
  if (node.type === 'BlockStatement' && parent && parent.type !== 'FunctionDeclaration' && parent.type !== 'FunctionExpression' && parent.type !== 'ArrowFunctionExpression' && parent.type !== 'CatchClause') {
    const s = newScope(scope);
    for (const stmt of node.body) {
      if (stmt.type === 'VariableDeclaration' && (stmt.kind === 'let' || stmt.kind === 'const')) {
        for (const d of stmt.declarations) declare(s, d.id);
      }
    }
    walk(node.body, s, node);
    return;
  }
  if (node.type === 'VariableDeclaration' && (node.kind === 'let' || node.kind === 'const')) {
    for (const d of node.declarations) declare(scope, d.id);
    for (const d of node.declarations) if (d.init) walk(d.init, scope, d);
    return;
  }
  if (node.type === 'ClassDeclaration' && node.id) scope.names.add(node.id.name);
  if (node.type === 'Identifier') {
    let isRef = true;
    if (parent) {
      if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) isRef = false;
      else if (parent.type === 'OptionalMemberExpression' && parent.property === node && !parent.computed) isRef = false;
      else if ((parent.type === 'ObjectProperty' || parent.type === 'ObjectMethod') && parent.key === node && !parent.computed && !parent.shorthand) isRef = false;
      else if (parent.type === 'ClassMethod' && parent.key === node && !parent.computed) isRef = false;
      else if (parent.type === 'JSXAttribute' && parent.name === node) isRef = false;
      else if (parent.type === 'VariableDeclarator' && parent.id === node) isRef = false;
      else if ((parent.type === 'FunctionDeclaration' || parent.type === 'FunctionExpression' || parent.type === 'ClassDeclaration') && parent.id === node) isRef = false;
      else if (parent.type === 'ImportSpecifier') isRef = false;
      else if (parent.type === 'LabeledStatement' && parent.label === node) isRef = false;
    }
    if (isRef && !resolve(scope, node.name)) free.add(node.name);
    return;
  }
  if (node.type === 'JSXIdentifier') {
    const name = node.name;
    if (name && name[0] === name[0].toUpperCase()) {
      if (parent && parent.type === 'JSXMemberExpression' && parent.property === node) {}
      else if (parent && parent.type === 'JSXAttribute' && parent.name === node) {}
      else if (!resolve(scope, name)) free.add(name);
    }
    return;
  }
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'range') continue;
    const v = node[k];
    if (v && typeof v === 'object') walk(v, scope, node);
  }
}
const root = newScope(null);
hoist(root, ast);
walk(ast, root, null);

const GLOBALS = new Set([
  'window', 'document', 'console', 'Math', 'Date', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
  'Error', 'TypeError', 'RangeError', 'Promise', 'Set', 'Map', 'WeakMap', 'WeakSet', 'Symbol',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'undefined', 'null', 'true', 'false', 'NaN', 'Infinity',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'fetch', 'URL', 'URLSearchParams', 'FormData', 'Blob', 'File', 'FileReader', 'ImageData',
  'navigator', 'localStorage', 'sessionStorage',
  // NOTE: `history` and `location` are intentionally NOT in this set even
  // though they're browser globals (window.history, window.location). In this
  // codebase `history` is also a useState in AlloFlowContent (the lesson-
  // history array) and we MUST flag bare `history` references as closure deps,
  // not silently treat them as the global. Same logic could apply to `location`
  // if it ever shadows window.location. Round 8 QuizPanel shipped broken
  // because `history` was filtered as a global → wasn't passed as a prop →
  // resolved to window.history at runtime → `history.some is not a function`.
  'React', 'ReactDOM', 'atob', 'btoa', 'encodeURIComponent', 'decodeURIComponent',
  'Reflect', 'Proxy', 'Function', 'arguments', 'this', 'super', 'eval',
  'Audio', 'Image', 'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent',
  'AudioContext', 'OffscreenCanvas', 'AbortController',
  'crypto', 'Element', 'HTMLElement', 'Node',
  'DOMParser', 'MutationObserver', 'RegExp', 'TextEncoder', 'Uint8Array', 'unescape',
  'prompt', 'alert', 'confirm', 'structuredClone',
]);

const out = [...free].filter(n => !GLOBALS.has(n)).sort();
console.log('Closure deps:', out.length);
out.forEach(n => console.log(n));
