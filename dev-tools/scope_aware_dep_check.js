// Proper scope-aware free-variable analyzer. Each function creates a new
// scope; params + var/let/const declarations are local; references that
// don't resolve in any enclosing scope are "free" (= closure deps).
const fs = require('fs');
const path = require('path');
const ROOT = 'c:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const { parse } = require(path.join(ROOT, 'node_modules', '@babel', 'parser'));

const TARGET = process.argv[2];
if (!TARGET) { console.error('Usage: node scope_aware_dep_check.js <file.jsx>'); process.exit(1); }

const src = fs.readFileSync(TARGET, 'utf-8');
const ast = parse(src, {
  sourceType: 'module',
  plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
  errorRecovery: true,
});

const free = new Set();

function newScope(parent) {
  return { parent, names: new Set() };
}

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
  if (p.type === 'ArrayPattern') {
    for (const el of p.elements) if (el) declare(scope, el);
    return;
  }
  if (p.type === 'AssignmentPattern') { declare(scope, p.left); return; }
  if (p.type === 'RestElement') { declare(scope, p.argument); return; }
}

function resolve(scope, name) {
  for (let s = scope; s; s = s.parent) if (s.names.has(name)) return true;
  return false;
}

// Pre-scan a function/block body to hoist var/function declarations
function hoist(scope, node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => hoist(scope, n)); return; }
  if (node.type === 'FunctionDeclaration' && node.id) scope.names.add(node.id.name);
  if (node.type === 'VariableDeclaration' && node.kind === 'var') {
    for (const d of node.declarations) declare(scope, d.id);
  }
  // Don't recurse into nested function bodies (they have their own var scope)
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

  // New function scope
  if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
    const s = newScope(scope);
    if (node.id && node.type === 'FunctionExpression') s.names.add(node.id.name);
    if (node.params) for (const p of node.params) declare(s, p);
    hoist(s, node.body);
    walk(node.body, s, node);
    return;
  }

  // CatchClause introduces a parameter binding
  if (node.type === 'CatchClause') {
    const s = newScope(scope);
    if (node.param) declare(s, node.param);
    hoist(s, node.body);
    walk(node.body, s, node);
    return;
  }

  // BlockStatement creates a let/const block scope
  if (node.type === 'BlockStatement' && parent && parent.type !== 'FunctionDeclaration' && parent.type !== 'FunctionExpression' && parent.type !== 'ArrowFunctionExpression' && parent.type !== 'CatchClause') {
    const s = newScope(scope);
    // hoist vars to outer? Actually let's keep it simple: vars hoist via outer scope already
    // For let/const, declare as we encounter them inline (handled below)
    for (const stmt of node.body) {
      if (stmt.type === 'VariableDeclaration' && (stmt.kind === 'let' || stmt.kind === 'const')) {
        for (const d of stmt.declarations) declare(s, d.id);
      }
    }
    walk(node.body, s, node);
    return;
  }

  // VariableDeclaration at function scope: hoist let/const to current scope
  if (node.type === 'VariableDeclaration' && (node.kind === 'let' || node.kind === 'const')) {
    for (const d of node.declarations) declare(scope, d.id);
    // walk into init expressions
    for (const d of node.declarations) {
      if (d.init) walk(d.init, scope, d);
    }
    return;
  }

  // ClassDeclaration introduces a binding
  if (node.type === 'ClassDeclaration' && node.id) scope.names.add(node.id.name);

  // Identifier reference (skip property names + decl IDs)
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
// Treat module-scope vars as globals (we want only what flows into the function)
hoist(root, ast);
walk(ast, root, null);

const GLOBALS = new Set([
  'window', 'document', 'console', 'Math', 'Date', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
  'Error', 'TypeError', 'RangeError', 'Promise', 'Set', 'Map', 'WeakMap', 'WeakSet', 'Symbol',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'undefined', 'null', 'true', 'false', 'NaN', 'Infinity',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'fetch', 'URL', 'URLSearchParams', 'FormData', 'Blob', 'File', 'FileReader', 'ImageData',
  'navigator', 'location', 'history', 'localStorage', 'sessionStorage',
  'React', 'ReactDOM', 'atob', 'btoa', 'encodeURIComponent', 'decodeURIComponent',
  'Reflect', 'Proxy', 'Function', 'arguments', 'this', 'super', 'eval',
  'Audio', 'Image', 'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent',
  'AudioContext', 'OffscreenCanvas', 'AbortController',
  'crypto', 'Element', 'HTMLElement', 'Node',
  'DOMParser', 'MutationObserver', 'RegExp', 'TextEncoder', 'Uint8Array', 'unescape',
  'prompt', 'alert', 'confirm', 'structuredClone',
]);

const out = [...free].filter(n => !GLOBALS.has(n)).sort();
console.log('Free variables (closure deps):', out.length);
out.forEach(n => console.log(n));
