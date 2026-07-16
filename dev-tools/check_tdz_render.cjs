#!/usr/bin/env node
/**
 * check_tdz_render.cjs — blocks the render-time temporal-dead-zone (TDZ) crash class.
 *
 * A `const`/`let` in AlloFlowContent that is READ during the component's render pass
 * (a hook deps array, a live-ref object assignment like `_x.current = { ...v... }`, or any
 * top-level expression — i.e. NOT inside a deferred nested function body) BEFORE its own
 * declaration line throws `ReferenceError: Cannot access 'X' before initialization` — a fatal
 * whole-app crash caught by the ErrorBoundary.
 *
 * check_free_vars / check_render_refs do NOT catch this: the variable IS declared (just later),
 * so it is not a "free" variable. This gate is scope-aware (Babel AST) and catches it.
 *
 * Fix a hit by declaring the binding before its first render use (move the `useState`/`const`
 * up into the top-level cluster), or by converting a `const X = function(){}` to a hoisted
 * `function X(){}` (available before its textual position; still recreated each render).
 *
 * Usage: node dev-tools/check_tdz_render.cjs [--quiet]   (exit 1 on any hit)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const QUIET = process.argv.includes('--quiet');

let parser, traverse;
try {
  parser = require(path.join(ROOT, 'node_modules', '@babel', 'parser'));
  traverse = require(path.join(ROOT, 'node_modules', '@babel', 'traverse')).default;
} catch (e) {
  console.error('check_tdz_render: @babel/parser/traverse not available — skipping (run npm install).');
  process.exit(0);
}

const FILE = path.join(ROOT, 'AlloFlowANTI.txt');
const src = fs.readFileSync(FILE, 'utf8');
const lineOf = (pos) => src.slice(0, pos).split('\n').length;

let ast;
try {
  ast = parser.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
} catch (e) {
  console.error('check_tdz_render: could not parse AlloFlowANTI.txt — ' + e.message);
  process.exit(1);
}

let compPath = null;
traverse(ast, {
  Function(p) {
    let name = null;
    if (p.parent && p.parent.type === 'VariableDeclarator' && p.parent.id) name = p.parent.id.name;
    if (p.node.id && p.node.id.name) name = p.node.id.name;
    if (name === 'AlloFlowContent') { compPath = p; p.stop(); }
  },
});
if (!compPath) {
  console.error('check_tdz_render: AlloFlowContent component not found (structure changed?) — failing closed.');
  process.exit(1);
}

const compNode = compPath.node;
const bindings = compPath.scope.bindings;
const hits = [];
for (const name in bindings) {
  const b = bindings[name];
  if (b.kind !== 'const' && b.kind !== 'let') continue; // var / function decls / params are hoisted-safe
  const declStart = b.identifier.start;
  for (const ref of b.referencePaths) {
    const fp = ref.getFunctionParent();
    if (!fp || fp.node !== compNode) continue; // read is inside a deferred nested function => safe
    if (ref.node.start < declStart) {
      hits.push({ name, decl: lineOf(declStart), use: lineOf(ref.node.start) });
      break;
    }
  }
}

if (!hits.length) {
  if (!QUIET) console.log('check_tdz_render: OK — no render-time TDZ (use-before-declaration) in AlloFlowContent.');
  process.exit(0);
}
hits.sort((a, b) => a.use - b.use);
console.error('❌ check_tdz_render: ' + hits.length + ' render-time TDZ crash(es) in AlloFlowContent:');
console.error('   (a const/let read at render BEFORE its declaration => "Cannot access X before initialization", fatal)');
hits.forEach((h) => console.error('     ' + h.name + '  declared@L' + h.decl + '  read-at-render@L' + h.use));
console.error('   Fix: declare it before first use, or make a `const X = function(){}` a hoisted `function X(){}`.');
process.exit(1);
