#!/usr/bin/env node
// check_iife_lazy_lookup.cjs — Flag IIFE-load-time snapshots of window.AlloModules.X
//
// Why this exists:
//   CDN modules are loaded as standalone IIFE scripts in parallel. Module A
//   cannot assume module B has finished loading at the moment A's IIFE
//   executes. If A captures a reference to module B at the IIFE's top
//   level — `var X = window.AlloModules.B.something || fallback;` — and
//   B hasn't loaded yet, X is forever stuck on the fallback. The bug is
//   silent: the fallback works "well enough" until a feature that depends
//   on B's real behavior breaks.
//
//   QuickStart Fetch button (April 26 2026) shipped broken this way.
//   Memory: feedback_iife_lazy_lookup.md.
//
//   The fix is always to wrap the lookup in a function so it runs at call
//   time, not at load time:
//
//     // BAD (load-time snapshot — silent footgun)
//     var fetcher = window.AlloModules.SomeModule.fetcher || (() => null);
//
//     // GOOD (lazy lookup — always sees the current state)
//     function getFetcher() {
//       var mod = window.AlloModules.SomeModule;
//       return mod && mod.fetcher ? mod.fetcher : (() => null);
//     }
//
// What this check does:
//   1. Parses every CDN *_module.js file with acorn.
//   2. Walks the AST. For each top-level statement INSIDE an IIFE's body
//      (Program → ExpressionStatement(CallExpression(FunctionExpression))
//      → BlockStatement), flags VariableDeclarations whose initializer
//      references `window.AlloModules.<anything>`.
//   3. References inside function bodies are NOT flagged — those run at
//      call time, which is what we want.
//
// What this check does NOT catch:
//   - References to `window.<otherGlobal>` (only AlloModules is async-loaded
//     in this project; lucide icons, React, etc. are sync-attached early).
//   - References via aliases (`var mods = window.AlloModules; var X = mods.A`)
//     — would require flow analysis. The naive pattern catches 95%.
//
// Usage:
//   node dev-tools/check_iife_lazy_lookup.cjs
//   node dev-tools/check_iife_lazy_lookup.cjs --verbose
//   node dev-tools/check_iife_lazy_lookup.cjs --quiet
//
// Exit codes:
//   0 — no top-level IIFE snapshots of window.AlloModules found
//   1 — at least one flagged
//   2 — usage / parse error

'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

function log(s) { if (!QUIET) console.log(s); }

// Find every *_module.js in root (not in prismflow-deploy mirrors — those
// are deploy copies that we'd just double-report)
const modules = fs.readdirSync(ROOT)
  .filter(f => /_module\.js$/.test(f))
  .sort();

if (modules.length === 0) {
  console.error('No *_module.js files found in repo root');
  process.exit(2);
}

// ──────────────────────────────────────────────────────────────────────────
// Check if a node references `window.AlloModules.<X>` anywhere in its tree.
// Returns the first matching MemberExpression node, or null.
// ──────────────────────────────────────────────────────────────────────────
function findAlloModulesRef(node) {
  if (!node || typeof node !== 'object') return null;
  // MemberExpression: window.AlloModules
  if (node.type === 'MemberExpression') {
    // window.AlloModules.X — outer object is MemberExpression(window, AlloModules)
    const obj = node.object;
    if (
      obj && obj.type === 'MemberExpression' &&
      obj.object && obj.object.type === 'Identifier' && obj.object.name === 'window' &&
      obj.property && obj.property.type === 'Identifier' && obj.property.name === 'AlloModules'
    ) {
      return node;
    }
  }
  // Recurse into children
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'range' || key === 'start' || key === 'end' || key === 'type') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const c of child) {
        const r = findAlloModulesRef(c);
        if (r) return r;
      }
    } else if (child && typeof child === 'object' && child.type) {
      const r = findAlloModulesRef(child);
      if (r) return r;
    }
  }
  return null;
}

// Locate the IIFE body in the top-level program. Pattern is:
//   (function() { ...body... })();
// or:
//   ;(function() { ... })();
// AST: ExpressionStatement → CallExpression → callee is FunctionExpression
//      whose body is a BlockStatement.
function getIifeBody(programNode) {
  for (const stmt of programNode.body) {
    if (stmt.type !== 'ExpressionStatement') continue;
    let call = stmt.expression;
    // Allow (function(){})() and !function(){}() patterns
    if (call.type === 'UnaryExpression') call = call.argument;
    if (call.type !== 'CallExpression') continue;
    let callee = call.callee;
    // Allow parenthesized
    if (!callee) continue;
    if (callee.type === 'FunctionExpression' || callee.type === 'ArrowFunctionExpression') {
      if (callee.body && callee.body.type === 'BlockStatement') return callee.body;
    }
  }
  return null;
}

let totalFindings = 0;
const fileFindings = [];

for (const file of modules) {
  const fp = path.join(ROOT, file);
  const src = fs.readFileSync(fp, 'utf8');
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  } catch (e) {
    log('  ⚠ Parse error in ' + file + ': ' + e.message);
    continue;
  }
  // Find IIFE body
  const iifeBody = getIifeBody(ast);
  if (!iifeBody) continue;
  // Walk top-level statements of the IIFE body
  const findings = [];
  for (const stmt of iifeBody.body) {
    if (stmt.type !== 'VariableDeclaration') continue;
    for (const d of stmt.declarations) {
      if (!d.init) continue;
      const ref = findAlloModulesRef(d.init);
      if (ref) {
        // Reconstruct the path: window.AlloModules.<prop>
        const moduleName = (ref.property && ref.property.type === 'Identifier') ? ref.property.name : '?';
        findings.push({
          line: stmt.loc.start.line,
          varName: (d.id && d.id.name) || '(destructured)',
          moduleName,
          kind: stmt.kind,
        });
      }
    }
  }
  if (findings.length > 0) {
    fileFindings.push({ file, findings });
    totalFindings += findings.length;
  }
}

log('');
log('IIFE lazy-lookup audit');
log('──────────────────────');
log('  Scanned ' + modules.length + ' *_module.js IIFEs');
log('  Top-level snapshots of window.AlloModules.X: ' + totalFindings);
log('');

if (totalFindings === 0) {
  log('  ✅ No IIFE-load-time snapshots of window.AlloModules.X found.');
  log('  All references happen inside function bodies (lazy at call time).');
  log('');
  process.exit(0);
}

for (const { file, findings } of fileFindings) {
  log('  ' + file + ':');
  for (const f of findings) {
    log('     L' + f.line + '  ' + f.kind + ' ' + f.varName + ' = window.AlloModules.' + f.moduleName + ' …');
  }
  log('');
}

log('  Fix: wrap each in a lazy getter so the lookup happens at call time:');
log('');
log('       function getX() {');
log('         var mod = window.AlloModules.<Module>;');
log('         return mod && mod.<prop> ? mod.<prop> : <fallback>;');
log('       }');
log('');
log('  See feedback memory: feedback_iife_lazy_lookup.md (QuickStart Fetch bug class).');
log('');

process.exit(1);
