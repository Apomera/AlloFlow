#!/usr/bin/env node
// _audit_all_phantoms.cjs — whole-monolith phantom-reference audit.
//
// Walks every identifier reference inside AlloFlowContent's component body
// and reports any reference whose binding cannot be resolved to a definition
// reachable from that scope. Output is a prioritized backlog of latent
// bugs: identifiers that "look" available because the inline JS engine
// never errors at parse time, but would throw ReferenceError if the
// affected code path ever actually executed.
//
// This complements _jsx_phantom_ref_check.cjs (which audits a specific
// slice during extraction). The whole-monolith audit runs once and gives
// you the full backlog.
//
// Usage:
//   node _audit_all_phantoms.cjs                  # JSX-only (default)
//   node _audit_all_phantoms.cjs --full           # entire AlloFlowContent body
//   node _audit_all_phantoms.cjs --verbose        # show all hits, not just top 50
//   node _audit_all_phantoms.cjs --file foo.txt   # different source
//
// Output: human-readable report grouped by phantom identifier, with
// occurrence count + first-occurrence line number for each.
//
// Exit codes: 0 = clean, 1 = phantoms found.

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const args = process.argv.slice(2);
const argv = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) argv[args[i].slice(2)] = args[i + 1] || true;
}
const FILE = argv.file || 'AlloFlowANTI.txt';
const FULL = !!argv.full;
const VERBOSE = !!argv.verbose;

// ── Globals that are always available (won't be flagged as phantoms) ──
const GLOBAL_BUILTINS = new Set([
  // ES + browser
  'window', 'document', 'console', 'navigator', 'localStorage', 'sessionStorage',
  'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask',
  'Math', 'Date', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
  'RegExp', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'Function',
  'Error', 'TypeError', 'RangeError', 'SyntaxError',
  'URL', 'URLSearchParams', 'FormData', 'Blob', 'File', 'FileReader',
  'AbortController', 'CustomEvent', 'Event', 'EventTarget', 'MessageChannel',
  'undefined', 'null', 'true', 'false', 'NaN', 'Infinity',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'encodeURIComponent', 'decodeURIComponent', 'btoa', 'atob',
  'structuredClone', 'globalThis', 'process', 'require', 'module', 'exports',
  'self', 'top', 'parent', 'crypto', 'performance', 'TextEncoder', 'TextDecoder',
  // Browser audio/media constructors + APIs
  'Audio', 'Image', 'Video', 'MediaSource', 'MediaStream', 'MediaRecorder',
  'AudioContext', 'webkitAudioContext', 'OfflineAudioContext',
  'SpeechSynthesisUtterance', 'speechSynthesis',
  'Notification', 'Worker', 'SharedWorker', 'BroadcastChannel',
  'IntersectionObserver', 'MutationObserver', 'ResizeObserver',
  'XMLHttpRequest', 'WebSocket', 'EventSource',
  'IDBKeyRange', 'indexedDB',
  // React + DOM
  'React', 'ReactDOM',
  // Common globals exposed by AlloFlow's runtime
  'firebase', '__firebase_config', '__initial_auth_token', '__app_id',
  // Loop control + reserved
  'arguments', 'this', 'super',
]);

const src = fs.readFileSync(path.resolve(FILE), 'utf8');
const lines = src.split(/\r?\n/);

// ── Locate AlloFlowContent body ──
const componentLine = lines.findIndex(l => /^const AlloFlowContent\s*=\s*\(\)\s*=>\s*\{/.test(l));
if (componentLine < 0) {
  console.error('Could not find `const AlloFlowContent` in', FILE);
  process.exit(2);
}

// Walk brace depth from componentLine to find matching closing brace
let braceDepth = 0;
let componentEnd = -1;
let started = false;
for (let i = componentLine; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === '{') { braceDepth++; started = true; }
    else if (ch === '}') {
      braceDepth--;
      if (started && braceDepth === 0) { componentEnd = i; break; }
    }
  }
  if (componentEnd >= 0) break;
}
if (componentEnd < 0) {
  console.error('Could not match closing brace of AlloFlowContent');
  process.exit(2);
}

console.log(`AlloFlowContent: line ${componentLine + 1} to ${componentEnd + 1} (${componentEnd - componentLine + 1} lines)`);

// ── Parse the full file as a module to get global definitions ──
let fullAst;
try {
  fullAst = parser.parse(src, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
    errorRecovery: true,
  });
} catch (e) {
  console.error('Parser failed on full file:', e.message);
  process.exit(2);
}

// Collect every name that's *defined* somewhere in the file: imports,
// top-level consts/lets/functions/classes, function params at any depth.
const definedNames = new Set();
function bindPattern(node) {
  if (!node) return;
  if (node.type === 'Identifier') definedNames.add(node.name);
  else if (node.type === 'ArrayPattern') (node.elements || []).forEach(bindPattern);
  else if (node.type === 'ObjectPattern') {
    for (const p of node.properties) {
      if (p.type === 'RestElement') bindPattern(p.argument);
      else if (p.value) bindPattern(p.value);
    }
  } else if (node.type === 'RestElement') bindPattern(node.argument);
  else if (node.type === 'AssignmentPattern') bindPattern(node.left);
}
function harvestDefinitions(node) {
  if (!node || typeof node.type !== 'string') return;
  switch (node.type) {
    case 'ImportDeclaration':
      for (const spec of (node.specifiers || [])) if (spec.local) definedNames.add(spec.local.name);
      break;
    case 'ImportSpecifier':
    case 'ImportDefaultSpecifier':
    case 'ImportNamespaceSpecifier':
      if (node.local) definedNames.add(node.local.name);
      break;
    case 'VariableDeclarator':
      bindPattern(node.id);
      break;
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      if (node.id) definedNames.add(node.id.name);
      for (const p of (node.params || [])) bindPattern(p);
      break;
    case 'ClassDeclaration':
    case 'ClassExpression':
      if (node.id) definedNames.add(node.id.name);
      break;
    case 'CatchClause':
      if (node.param) bindPattern(node.param);
      break;
  }
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'range' || k === 'start' || k === 'end' || k === 'extra') continue;
    const v = node[k];
    if (v && typeof v === 'object') {
      if (Array.isArray(v)) v.forEach(harvestDefinitions);
      else if (typeof v.type === 'string') harvestDefinitions(v);
    }
  }
}
harvestDefinitions(fullAst);

console.log(`Defined names harvested from full file: ${definedNames.size}`);

// ── Walk references inside AlloFlowContent ──
// Strategy: extract AlloFlowContent's body text and reparse it, tracking
// lexical scope as we walk so we don't flag locals.

// Use AST nodes directly to find AlloFlowContent's body
let allofContentBody = null;
function findAlloFlowContent(node) {
  if (!node || typeof node.type !== 'string' || allofContentBody) return;
  if (node.type === 'VariableDeclarator' && node.id && node.id.name === 'AlloFlowContent' && node.init) {
    const init = node.init;
    if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
      allofContentBody = init;
      return;
    }
  }
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'range' || k === 'start' || k === 'end' || k === 'extra') continue;
    const v = node[k];
    if (v && typeof v === 'object') {
      if (Array.isArray(v)) v.forEach(findAlloFlowContent);
      else if (typeof v.type === 'string') findAlloFlowContent(v);
    }
  }
}
findAlloFlowContent(fullAst);
if (!allofContentBody) {
  console.error('Could not locate AlloFlowContent AST node');
  process.exit(2);
}

// Walk AlloFlowContent with proper scope tracking
const localScopes = [new Set()]; // stack of binding sets
function pushScope() { localScopes.push(new Set()); }
function popScope() { localScopes.pop(); }
function bindLocal(name) { localScopes[localScopes.length - 1].add(name); }
function isLocal(name) {
  for (const s of localScopes) if (s.has(name)) return true;
  return false;
}
function bindLocalPattern(node) {
  if (!node) return;
  if (node.type === 'Identifier') bindLocal(node.name);
  else if (node.type === 'ArrayPattern') (node.elements || []).forEach(bindLocalPattern);
  else if (node.type === 'ObjectPattern') {
    for (const p of node.properties) {
      if (p.type === 'RestElement') bindLocalPattern(p.argument);
      else if (p.value) bindLocalPattern(p.value);
    }
  } else if (node.type === 'RestElement') bindLocalPattern(node.argument);
  else if (node.type === 'AssignmentPattern') bindLocalPattern(node.left);
}

const phantoms = new Map(); // name → { count, firstLine, samples: [{line, context}], allDefensive }

// A "defensive" reference is one inside a `typeof X !== 'undefined'` pattern
// or directly inside a TypeofExpression argument. These are intentional —
// the source author was explicitly guarding against undefined. They're not
// runtime bugs.
function isDefensiveContext(line) {
  const text = lines[line - 1] || '';
  return /typeof\s+\w+\s*!==?\s*['"`]undefined['"`]/.test(text);
}

function record(name, line) {
  if (isLocal(name)) return;
  if (definedNames.has(name)) return;
  if (GLOBAL_BUILTINS.has(name)) return;
  const defensive = isDefensiveContext(line);
  if (!phantoms.has(name)) {
    phantoms.set(name, { count: 0, firstLine: line, samples: [], allDefensive: true });
  }
  const entry = phantoms.get(name);
  entry.count++;
  if (!defensive) entry.allDefensive = false;
  if (entry.samples.length < 3) {
    entry.samples.push({ line, context: (lines[line - 1] || '').trim().slice(0, 130), defensive });
  }
}

function visit(node, parent) {
  if (!node || typeof node.type !== 'string') return;
  const t = node.type;

  // Scope-introducing nodes
  if (t === 'ArrowFunctionExpression' || t === 'FunctionExpression' || t === 'FunctionDeclaration') {
    pushScope();
    for (const p of (node.params || [])) bindLocalPattern(p);
    if (t === 'FunctionDeclaration' && node.id) bindLocal(node.id.name);
    visit(node.body, node);
    popScope();
    return;
  }
  if (t === 'BlockStatement') {
    pushScope();
    for (const stmt of (node.body || [])) visit(stmt, node);
    popScope();
    return;
  }
  if (t === 'CatchClause') {
    pushScope();
    if (node.param) bindLocalPattern(node.param);
    if (node.body) visit(node.body, node);
    popScope();
    return;
  }

  // Bindings
  if (t === 'VariableDeclarator') {
    bindLocalPattern(node.id);
    if (node.init) visit(node.init, node);
    return;
  }

  // Suppress non-reference contexts
  if (t === 'JSXAttribute') { if (node.value) visit(node.value, node); return; }
  if (t === 'MemberExpression') {
    visit(node.object, node);
    if (node.computed) visit(node.property, node);
    return;
  }
  if (t === 'OptionalMemberExpression') {
    visit(node.object, node);
    if (node.computed) visit(node.property, node);
    return;
  }
  if (t === 'ObjectProperty' || t === 'Property') {
    if (node.computed) visit(node.key, node);
    visit(node.value, node);
    return;
  }
  if (t === 'JSXMemberExpression') {
    let root = node;
    while (root.object) root = root.object;
    if (root.type === 'JSXIdentifier' && /^[A-Z]/.test(root.name)) {
      record(root.name, node.loc ? node.loc.start.line : 0);
    }
    return;
  }
  if (t === 'JSXOpeningElement' || t === 'JSXClosingElement') {
    const name = node.name;
    if (name && name.type === 'JSXIdentifier' && /^[A-Z]/.test(name.name)) {
      record(name.name, name.loc ? name.loc.start.line : 0);
    } else if (name && name.type === 'JSXMemberExpression') {
      let root = name;
      while (root.object) root = root.object;
      if (root.type === 'JSXIdentifier' && /^[A-Z]/.test(root.name)) {
        record(root.name, root.loc ? root.loc.start.line : 0);
      }
    }
    if (node.attributes) for (const a of node.attributes) visit(a, node);
    return;
  }

  if (t === 'Identifier') {
    // Suppress non-reference positions (declarations, keys, labels)
    if (parent && parent.type === 'VariableDeclarator' && parent.id === node) return;
    if (parent && parent.type === 'AssignmentPattern' && parent.left === node) return;
    if (parent && (parent.type === 'ObjectProperty' || parent.type === 'Property') && parent.key === node && !parent.computed) return;
    if (parent && parent.type === 'LabeledStatement' && parent.label === node) return;
    if (parent && parent.type === 'BreakStatement') return;
    if (parent && parent.type === 'ContinueStatement') return;
    if (parent && parent.type === 'ImportSpecifier' && parent.imported === node) return;
    record(node.name, node.loc ? node.loc.start.line : 0);
    return;
  }

  // Default recursion
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'range' || k === 'start' || k === 'end' || k === 'extra') continue;
    const v = node[k];
    if (v && typeof v === 'object') {
      if (Array.isArray(v)) v.forEach(c => visit(c, node));
      else if (typeof v.type === 'string') visit(v, node);
    }
  }
}

if (FULL) {
  visit(allofContentBody.body, null);
} else {
  // JSX-only mode: only walk the return-statement subtree
  function walkForReturn(node) {
    if (!node) return;
    if (node.type === 'ReturnStatement' && node.argument) {
      visit(node.argument, node);
      return;
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'range' || k === 'start' || k === 'end' || k === 'extra') continue;
      const v = node[k];
      if (v && typeof v === 'object') {
        if (Array.isArray(v)) v.forEach(walkForReturn);
        else if (typeof v.type === 'string') walkForReturn(v);
      }
    }
  }
  // Push AlloFlowContent's param scope before walking
  pushScope();
  for (const p of (allofContentBody.params || [])) bindLocalPattern(p);
  walkForReturn(allofContentBody.body);
  popScope();
}

// ── Report ──

// Split into two categories: LATENT (would throw at runtime if reached)
// vs DEFENSIVE (intentional typeof-guarded, not a bug).
const latent = [];
const defensive = [];
for (const [name, info] of phantoms) {
  if (info.allDefensive) defensive.push([name, info]);
  else latent.push([name, info]);
}
latent.sort((a, b) => b[1].count - a[1].count || a[1].firstLine - b[1].firstLine);
defensive.sort((a, b) => b[1].count - a[1].count || a[1].firstLine - b[1].firstLine);

console.log('');
console.log(`Phantom identifiers total: ${phantoms.size}`);
console.log(`  Latent (would throw if reached):     ${latent.length}`);
console.log(`  Defensive (typeof-guarded, not bug): ${defensive.length}`);
console.log(`Mode: ${FULL ? 'FULL body' : 'JSX return-tree only'}`);
console.log('');

if (latent.length === 0 && defensive.length === 0) {
  console.log('No phantom references found.');
  process.exit(0);
}

if (latent.length > 0) {
  const showCount = VERBOSE ? latent.length : Math.min(50, latent.length);
  console.log(`### LATENT PHANTOMS (priority backlog — these would throw ReferenceError if reached)`);
  console.log('');
  for (let i = 0; i < showCount; i++) {
    const [name, info] = latent[i];
    console.log(`  ${name.padEnd(40)}  uses: ${String(info.count).padStart(4)}   first: line ${info.firstLine}`);
    for (const s of info.samples.slice(0, 1)) {
      console.log(`    line ${s.line}: ${s.context}`);
    }
  }
  if (!VERBOSE && latent.length > showCount) {
    console.log('');
    console.log(`... ${latent.length - showCount} more not shown. Re-run with --verbose to see all.`);
  }
  console.log('');
}

if (defensive.length > 0 && VERBOSE) {
  console.log(`### DEFENSIVE (typeof-guarded — intentional, not bugs)`);
  console.log('');
  for (const [name, info] of defensive) {
    console.log(`  ${name.padEnd(40)}  uses: ${String(info.count).padStart(4)}   first: line ${info.firstLine}`);
  }
  console.log('');
} else if (defensive.length > 0) {
  console.log(`(${defensive.length} defensive (typeof-guarded) phantoms suppressed. Re-run with --verbose to see.)`);
}

process.exit(latent.length > 0 ? 1 : 0);
