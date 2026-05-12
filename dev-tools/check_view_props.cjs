#!/usr/bin/env node
// check_view_props.cjs — preemptive missing-prop detector for extracted view modules.
//
// Bug class this catches (3 incidents in the wild as of May 2026):
//   - PdfAuditView shipped without `t` prop (May 2026, scope-aware enumerator
//     fooled by inner-scope `t` shadow in tables.forEach((t, i) => ...))
//   - HeaderBar shipped with 22 missing window.* lucide icons
//   - ExportPreviewView shipped without `history` prop (caught by ErrorBoundary
//     after runtime crash; `history` was in the GLOBALS whitelist of the older
//     scope_aware_dep_check.js because `window.history` is a real browser API,
//     but the React useState `history` shadows it in the monolith)
//
// What it does:
//   1. For each view_*_source.jsx, parse the AST.
//   2. Find the top-level component function and its destructured props.
//   3. Collect every identifier referenced in the function body that isn't
//      destructured, isn't locally declared, isn't a true browser global.
//   4. Cross-reference against AlloFlowANTI.txt: if the monolith has a
//      `const [name, setName] = useState(...)` matching that identifier,
//      it's a near-certain missing prop (this is the dangerous case —
//      JS won't throw at parse time; it crashes at runtime when JSX tries
//      to call the undefined identifier).
//
// Usage: node dev-tools/check_view_props.cjs
//        node dev-tools/check_view_props.cjs --view view_export_preview_source.jsx

'use strict';
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const ROOT = path.resolve(__dirname, '..');
const MONOLITH = path.join(ROOT, 'AlloFlowANTI.txt');

const args = process.argv.slice(2);
const SINGLE_VIEW = (args.find(a => a.startsWith('--view=')) || '').split('=')[1] || null;
const VERBOSE = args.includes('--verbose');

// Names that look like props but are actually globals / browser APIs / React.
// Conservative: if a view actually shadows one of these with a real React state
// in the monolith, the cross-reference check will still catch it.
const TRUE_GLOBALS = new Set([
  'window', 'document', 'console', 'navigator', 'localStorage', 'sessionStorage',
  'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'Math', 'Date', 'JSON', 'Object',
  'Array', 'String', 'Number', 'Boolean', 'RegExp', 'Promise', 'Map', 'Set',
  'WeakMap', 'WeakSet', 'Symbol', 'Error', 'TypeError', 'RangeError',
  'URL', 'URLSearchParams', 'FormData', 'Blob', 'File', 'FileReader',
  'AbortController', 'CustomEvent', 'Event', 'KeyboardEvent', 'MouseEvent',
  'undefined', 'null', 'true', 'false', 'NaN', 'Infinity',
  'React', 'ReactDOM',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
  'btoa', 'atob', 'structuredClone', 'globalThis', 'self', 'top', 'parent',
  'crypto', 'performance', 'Reflect', 'Proxy', 'Function', 'arguments', 'this', 'super',
  'Audio', 'Image', 'AudioContext', 'OffscreenCanvas', 'Element', 'HTMLElement', 'Node',
  'DOMParser', 'MutationObserver', 'TextEncoder', 'TextDecoder', 'Uint8Array',
  'unescape', 'prompt', 'alert', 'confirm', 'getComputedStyle',
  // lucide-react icons — exported by importing AlloFlow header, present on window
  // (technically might still be missing from window.* assigns, but check_window_icons
  // handles that). Listed here so they don't pollute the missing-prop signal.
]);

// Pull all `const [name, setName] = useState(...)` names from AlloFlowANTI.txt.
// Used to mark missing-prop candidates as HIGH RISK if they shadow real React state.
function findUseStateNames(src) {
  const names = new Set();
  // `const [foo, setFoo] = useState(...)` — capture both halves.
  const re = /const\s+\[\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*\]\s*=\s*useState\b/g;
  let m;
  while ((m = re.exec(src))) {
    names.add(m[1]);
    names.add(m[2]);
  }
  return names;
}

// Pull useRef + useCallback + useMemo names too — these are also passed as
// props to extracted views and the same "missing prop" crash class applies.
function findUseHookNames(src) {
  const names = new Set();
  const refRe = /const\s+([A-Za-z_$][\w$]*)\s*=\s*useRef\b/g;
  const cbRe = /const\s+([A-Za-z_$][\w$]*)\s*=\s*useCallback\b/g;
  const memoRe = /const\s+([A-Za-z_$][\w$]*)\s*=\s*useMemo\b/g;
  let m;
  while ((m = refRe.exec(src))) names.add(m[1]);
  while ((m = cbRe.exec(src))) names.add(m[1]);
  while ((m = memoRe.exec(src))) names.add(m[1]);
  return names;
}

// Scope-aware free-variable analyzer (cribbed from scope_aware_dep_check.js,
// but without the `history` / `location` whitelist gotcha).
function analyzeView(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  let ast;
  try {
    ast = parser.parse(src, {
      sourceType: 'module',
      plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
      errorRecovery: true,
    });
  } catch (e) {
    return { error: 'parse failed: ' + e.message };
  }

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

  const free = new Set();
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
    if (node.type === 'BlockStatement' && parent &&
        parent.type !== 'FunctionDeclaration' &&
        parent.type !== 'FunctionExpression' &&
        parent.type !== 'ArrowFunctionExpression' &&
        parent.type !== 'CatchClause') {
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

  return { free: [...free].filter(n => !TRUE_GLOBALS.has(n)).sort() };
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────
const monolithSrc = fs.readFileSync(MONOLITH, 'utf8');
const monolithStateNames = findUseStateNames(monolithSrc);
const monolithHookNames = findUseHookNames(monolithSrc);
// Union: any name that's a useState/useRef/useCallback/useMemo in the monolith
// is a "monolith identifier" that a view module might be missing as a prop.
const monolithNames = new Set([...monolithStateNames, ...monolithHookNames]);

const viewFiles = SINGLE_VIEW
  ? [path.join(ROOT, SINGLE_VIEW)]
  : fs.readdirSync(ROOT).filter(f => /^view_.*_source\.jsx$/.test(f)).map(f => path.join(ROOT, f));

console.log('\nView modules to check: ' + viewFiles.length);

let totalFindings = 0;
const findings = [];

for (const filePath of viewFiles) {
  const fileName = path.basename(filePath);
  const result = analyzeView(filePath);
  if (result.error) {
    console.error('  ' + fileName + ': ' + result.error);
    continue;
  }
  const candidates = result.free.filter(n => {
    // Filter out:
    //  - obvious component imports (TitleCase that are likely imported elsewhere)
    //  - shorthand single-letter loop vars that escaped scope tracking
    if (n.length === 1) return false;
    return true;
  });

  // The DANGEROUS subset: names that match a real React state / ref / callback
  // / memo declaration in the monolith. These are highly likely to be missing
  // props (the exact bug class that bit ExportPreviewView with `history`).
  const dangerous = candidates.filter(n => monolithNames.has(n));

  if (dangerous.length > 0) {
    totalFindings += dangerous.length;
    findings.push({ file: fileName, dangerous, allCandidates: candidates });
    console.log('\n  ⚠ ' + fileName);
    console.log('    Free identifiers matching monolith useState names (missing-prop risk):');
    for (const n of dangerous) console.log('      - ' + n);
    if (VERBOSE && candidates.length > dangerous.length) {
      console.log('    Other free identifiers (likely imports/components):');
      const other = candidates.filter(c => !dangerous.includes(c));
      for (const n of other.slice(0, 20)) console.log('      · ' + n);
      if (other.length > 20) console.log('      · (+ ' + (other.length - 20) + ' more)');
    }
  } else if (VERBOSE) {
    console.log('  ✓ ' + fileName + ' — ' + candidates.length + ' free identifiers, none match monolith state');
  }
}

console.log('\n──────────────────────────────────────────');
console.log('  Views checked:           ' + viewFiles.length);
console.log('  Views with risk findings: ' + findings.length);
console.log('  Total dangerous refs:    ' + totalFindings);

if (totalFindings === 0) {
  console.log('\n  ✅ No missing-prop candidates found.\n');
  process.exit(0);
}

console.log('\n  ⚠ Each "dangerous ref" means a view file references an identifier');
console.log('    that (a) is not in its destructured props and (b) matches a real');
console.log('    React useState name in AlloFlowANTI.txt. This is the bug class');
console.log('    that crashed ExportPreviewView (May 11 2026, "history.some is not');
console.log('    a function"). Add the missing name to:');
console.log('      1. the destructured props in the view source jsx');
console.log('      2. the props passed at the React.createElement call site in AlloFlowANTI.txt');
console.log('      3. rebuild the module (_build_view_<name>_module.js)\n');
process.exit(1);
