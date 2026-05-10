#!/usr/bin/env node
// _jsx_dep_enumerator.cjs — scope-aware dep classifier for a JSX line range
//
// Usage:
//   node _jsx_dep_enumerator.cjs --start 20049 --end 20232
//   node _jsx_dep_enumerator.cjs --start 21492 --end 21664 --file AlloFlowANTI.txt
//
// Output: every identifier the JSX in [start,end] references, classified as:
//   STATE   — useState declared in AlloFlowContent before the slice (paired with a setter)
//   SETTER  — set* companion of a state hook
//   HANDLER — handler/callback declared in AlloFlowContent (const handle*, useCallback, etc.)
//   HELPER  — top-level const/function before AlloFlowContent
//   IMPORT  — top-of-file imports / globals (window.*, React, document, etc.)
//   LOCAL   — declared inside the slice itself (function param, .map((x)=>...))
//   UNKNOWN — referenced but no definition found (potential phantom)
//
// Plus: deps destructure block ready to paste into the new module.

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
if (!START || !END || START >= END) {
  console.error('Usage: node _jsx_dep_enumerator.cjs --start <N> --end <M>');
  process.exit(1);
}

const src = fs.readFileSync(path.resolve(FILE), 'utf8');
const lines = src.split(/\r?\n/);

// 1) Find AlloFlowContent component span
const componentRe = /^const AlloFlowContent\s*=\s*\(\)\s*=>\s*\{/;
const componentLine = lines.findIndex(l => componentRe.test(l));
if (componentLine < 0) { console.error('Cannot find AlloFlowContent'); process.exit(1); }

// 2) Built JS-friendly identifiers globally available without import
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

// 3) Cross-file declared identifiers BEFORE AlloFlowContent (top-level helpers, imports)
//    Includes: import { X } from..., const X = ..., function X(...){}, class X
const helperIdents = new Map(); // ident → line
const importIdents = new Set();
{
  const head = lines.slice(0, componentLine).join('\n');
  let ast;
  try {
    ast = parser.parse(head, {
      sourceType: 'module',
      plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
      errorRecovery: true,
    });
  } catch (e) {
    console.error('Failed to parse head section:', e.message);
    process.exit(1);
  }
  for (const node of ast.program.body) {
    const line = node.loc ? node.loc.start.line : 0;
    if (node.type === 'ImportDeclaration') {
      for (const spec of node.specifiers || []) {
        importIdents.add(spec.local.name);
      }
    } else if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        collectBindings(decl.id, helperIdents, line);
      }
    } else if (node.type === 'FunctionDeclaration' && node.id) {
      helperIdents.set(node.id.name, line);
    } else if (node.type === 'ClassDeclaration' && node.id) {
      helperIdents.set(node.id.name, line);
    }
  }
}
function collectBindings(id, map, line) {
  if (!id) return;
  if (id.type === 'Identifier') map.set(id.name, line);
  else if (id.type === 'ArrayPattern') id.elements.forEach(e => e && collectBindings(e, map, line));
  else if (id.type === 'ObjectPattern') {
    for (const p of id.properties) {
      if (p.type === 'RestElement') collectBindings(p.argument, map, line);
      else collectBindings(p.value, map, line);
    }
  } else if (id.type === 'RestElement') collectBindings(id.argument, map, line);
}

// 4) AlloFlowContent body parse — find state hooks, handlers, refs declared BEFORE the slice
//    Walk only top-of-component statements (not inside other functions).
const allofContentEndCandidate = (() => {
  let depth = 0;
  for (let i = componentLine; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) return i; }
    }
  }
  return -1;
})();

const stateIdents = new Map(); // ident → { line, kind, setter }
const handlerIdents = new Map(); // ident → line
const refIdents = new Map();
{
  const componentSrc = lines.slice(componentLine, allofContentEndCandidate + 1).join('\n');
  // Wrap so we can parse the const declaration cleanly
  let ast;
  try {
    ast = parser.parse(componentSrc, {
      sourceType: 'module',
      plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
      errorRecovery: true,
    });
  } catch (e) {
    console.error('Failed to parse AlloFlowContent body:', e.message);
    process.exit(1);
  }
  // const AlloFlowContent = () => { BODY }
  const decl = ast.program.body[0];
  if (!decl || decl.type !== 'VariableDeclaration') {
    console.error('Unexpected: AlloFlowContent is not a VariableDeclaration at expected position');
    process.exit(1);
  }
  const arrow = decl.declarations[0].init;
  if (!arrow || (arrow.type !== 'ArrowFunctionExpression' && arrow.type !== 'FunctionExpression')) {
    console.error('Unexpected: AlloFlowContent init is not a function');
    process.exit(1);
  }
  const body = arrow.body;
  if (!body || body.type !== 'BlockStatement') return;

  for (const stmt of body.body) {
    const stmtSourceLine = stmt.loc.start.line + componentLine; // 1-indexed source

    // Skip if declared at or after START (declarations after the slice can't be deps for the slice)
    if (stmtSourceLine >= START) continue;

    if (stmt.type === 'VariableDeclaration') {
      for (const decl of stmt.declarations) {
        // Detect: const [x, setX] = useState(...)
        if (decl.id.type === 'ArrayPattern' && decl.init && decl.init.type === 'CallExpression') {
          const callee = decl.init.callee;
          const calleeName = callee && callee.name;
          if (calleeName === 'useState' || calleeName === 'useReducer') {
            const elems = decl.id.elements;
            if (elems[0] && elems[0].type === 'Identifier') stateIdents.set(elems[0].name, { line: stmtSourceLine, kind: 'STATE', setter: elems[1]?.name });
            if (elems[1] && elems[1].type === 'Identifier') stateIdents.set(elems[1].name, { line: stmtSourceLine, kind: 'SETTER', state: elems[0]?.name });
            continue;
          }
        }
        // useRef / useMemo / useCallback → handler/ref category
        if (decl.id.type === 'Identifier' && decl.init && decl.init.type === 'CallExpression') {
          const calleeName = decl.init.callee?.name || decl.init.callee?.property?.name;
          if (calleeName === 'useRef') {
            refIdents.set(decl.id.name, stmtSourceLine);
            continue;
          }
          if (calleeName === 'useMemo' || calleeName === 'useCallback') {
            handlerIdents.set(decl.id.name, stmtSourceLine);
            continue;
          }
        }
        // Plain const X = ... or const X = (a) => {...}
        collectBindings(decl.id, handlerIdents, stmtSourceLine);
      }
    } else if (stmt.type === 'FunctionDeclaration' && stmt.id) {
      handlerIdents.set(stmt.id.name, stmtSourceLine);
    }
  }
}

// 5) Parse the JSX slice and walk every identifier
const sliceText = lines.slice(START - 1, END).join('\n');
function tryParse(text) {
  try {
    return parser.parse(text, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
  } catch (e) { return null; }
}
// Most JSX slices in our monolith are either:
//   (a) a JSX element starting with `<...>` (e.g., line 20049 starts with the root `<div>`)
//   (b) a JSXExpressionContainer like `{cond && <div>...</div>}`
//   (c) a top-level conditional that is a sibling of other JSX
// The most permissive wrapper is `<>{ slice-as-children }</>`.
// Lead-in `return (` and trailing `)` from outer scope must be stripped.
let cleaned = sliceText
  .replace(/^\s*return\s*\(/, '') // strip leading "return ("
  .replace(/\)\s*;?\s*$/, '');     // strip trailing ");"
let sliceAst = tryParse(`const __x = <>${cleaned}</>;`);
if (!sliceAst) {
  // Maybe it's already a complete JSX element — try direct wrap
  sliceAst = tryParse(`const __x = (${cleaned});`);
}
if (!sliceAst) {
  // Some slices may include leftover braces; try wrapping as a function body
  sliceAst = tryParse(`function __wrap() { return (<>${cleaned}</>); }`);
}
if (!sliceAst) {
  console.error('Could not parse the JSX slice. Check that line range starts/ends on safe boundaries.');
  console.error('First few lines:');
  cleaned.split('\n').slice(0, 5).forEach((l, i) => console.error(`  ${i + 1}: ${l}`));
  process.exit(1);
}

// Walk identifiers, tracking lexical scope inside the slice
const localScopes = []; // stack of Sets
const seenIdents = new Map(); // name → { count, firstLine }
function pushScope() { localScopes.push(new Set()); }
function popScope() { localScopes.pop(); }
function bindLocal(name) { if (!localScopes.length) pushScope(); localScopes[localScopes.length - 1].add(name); }
function isLocal(name) { for (const s of localScopes) if (s.has(name)) return true; return false; }

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
  // Track scope-introducing nodes
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
  if (t === 'VariableDeclarator') {
    bindPattern(node.id);
    if (node.init) visit(node.init, node);
    return;
  }
  if (t === 'JSXAttribute') {
    // Don't treat attribute name as identifier — only walk value
    if (node.value) visit(node.value, node);
    return;
  }
  if (t === 'MemberExpression') {
    visit(node.object, node);
    if (node.computed) visit(node.property, node);
    // Skip non-computed property — it's a property name, not a free identifier
    return;
  }
  if (t === 'ObjectProperty' || t === 'Property') {
    if (node.computed) visit(node.key, node);
    visit(node.value, node);
    return;
  }
  if (t === 'JSXOpeningElement' || t === 'JSXClosingElement') {
    // Component name: <CanvasLoadingTips /> → CanvasLoadingTips is referenced
    const name = node.name;
    if (name && name.type === 'JSXIdentifier' && /^[A-Z]/.test(name.name)) {
      recordIdent(name.name, name.loc.start.line);
    } else if (name && name.type === 'JSXMemberExpression') {
      // <Module.Component /> → root object (Module) is referenced
      let root = name;
      while (root.object) root = root.object;
      if (root.type === 'JSXIdentifier') recordIdent(root.name, root.loc.start.line);
    }
    // Walk attribute values
    if (node.attributes) for (const a of node.attributes) visit(a, node);
    return;
  }
  if (t === 'Identifier') {
    if (parent && parent.type === 'VariableDeclarator' && parent.id === node) return; // handled
    if (parent && parent.type === 'AssignmentPattern' && parent.left === node) return;
    if (parent && (parent.type === 'ObjectProperty' || parent.type === 'Property') && parent.key === node && !parent.computed) return;
    if (parent && parent.type === 'LabeledStatement' && parent.label === node) return;
    if (parent && parent.type === 'BreakStatement') return;
    if (parent && parent.type === 'ContinueStatement') return;
    recordIdent(node.name, node.loc.start.line);
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

function recordIdent(name, astLine) {
  if (isLocal(name)) return;
  if (GLOBAL_BUILTINS.has(name)) return;
  // AST line offset: the wrapper starts at column 0, line 1.
  // When we used `function __wrap() { return (` the JSX starts on line 1 too.
  // For simplicity, just store first-seen line.
  const sourceLine = START + (astLine - 1);
  if (!seenIdents.has(name)) {
    seenIdents.set(name, { count: 1, firstLine: sourceLine });
  } else {
    seenIdents.get(name).count++;
  }
}

visit(sliceAst, null);

// 6) Classify
const classified = { STATE: [], SETTER: [], HANDLER: [], REF: [], HELPER: [], IMPORT: [], UNKNOWN: [] };
for (const [name, info] of seenIdents) {
  if (stateIdents.has(name)) {
    const e = stateIdents.get(name);
    classified[e.kind].push({ name, ...info, defLine: e.line });
  } else if (refIdents.has(name)) {
    classified.REF.push({ name, ...info, defLine: refIdents.get(name) });
  } else if (handlerIdents.has(name)) {
    classified.HANDLER.push({ name, ...info, defLine: handlerIdents.get(name) });
  } else if (helperIdents.has(name)) {
    classified.HELPER.push({ name, ...info, defLine: helperIdents.get(name) });
  } else if (importIdents.has(name)) {
    classified.IMPORT.push({ name, ...info });
  } else {
    classified.UNKNOWN.push({ name, ...info });
  }
}

for (const cat of Object.keys(classified)) classified[cat].sort((a, b) => a.name.localeCompare(b.name));

// 7) Output
console.log(`# JSX dep classification — ${FILE} lines ${START}–${END}`);
console.log(`# Total distinct identifiers: ${seenIdents.size}`);
console.log('');

function table(cat, label) {
  const rows = classified[cat];
  if (!rows.length) return;
  console.log(`## ${label} (${rows.length})`);
  for (const r of rows) {
    const def = r.defLine ? `def:${r.defLine}` : '';
    console.log(`  ${r.name.padEnd(40)} uses:${String(r.count).padStart(3)}  first:${r.firstLine}  ${def}`);
  }
  console.log('');
}

table('STATE',   'STATE (useState/useReducer values)');
table('SETTER',  'SETTERS');
table('HANDLER', 'HANDLERS / callbacks / memos');
table('REF',     'REFS');
table('HELPER',  'HELPERS / file-level consts before AlloFlowContent');
table('IMPORT',  'IMPORTS / globals');
table('UNKNOWN', 'UNKNOWN — declared after slice OR phantom');

// 8) Emit deps destructure block
console.log('## Deps destructure block (paste into module function signature)');
const allDeps = [
  ...classified.STATE,
  ...classified.SETTER,
  ...classified.HANDLER,
  ...classified.REF,
  ...classified.HELPER,
].map(r => r.name).sort();
const lines2 = [];
let cur = '    ';
for (const name of allDeps) {
  if ((cur + name + ', ').length > 78) { lines2.push(cur.trimEnd()); cur = '    '; }
  cur += name + ', ';
}
if (cur.trim().length) lines2.push(cur.trimEnd());
console.log('  function ViewModule(deps) {');
console.log('    const {');
console.log(lines2.join('\n'));
console.log('    } = deps;');
console.log('    // ... JSX here ...');
console.log('  }');
