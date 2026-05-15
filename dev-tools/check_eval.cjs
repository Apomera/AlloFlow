#!/usr/bin/env node
// check_eval.cjs — Find eval() and `new Function(string)` usage.
//
// Why this exists:
//   `eval(x)` and `new Function(stringExpr)` execute arbitrary code from a
//   string. If the string contains user-controlled or AI-generated content,
//   that's full code injection — far worse than XSS.
//
//   Some legitimate uses exist (parsing JS-literal-but-not-strict-JSON
//   files like AlloFlow's help_strings.js — see the existing fallback in
//   `let HELP_STRINGS = new Function("return " + hsText)();`).
//
//   This check reports every site so they can be triaged. It is informational
//   by default; flip to --strict to block on findings.
//
// What this check finds:
//   - eval(x) — direct eval
//   - new Function(string) or new Function('a', 'b', stringExpr) — indirect eval
//   - setTimeout/setInterval(string, ms) — string-as-code variant
//
// Usage:
//   node dev-tools/check_eval.cjs
//   node dev-tools/check_eval.cjs --strict   (exit 1 on any finding)
//   node dev-tools/check_eval.cjs --verbose
//
// Exit codes:
//   0 — informational pass (default)
//   1 — at least one finding in --strict mode

'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');
const STRICT = args.includes('--strict');

function listFiles(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(filter).map(f => path.join(dir, f));
}

const files = [
  ...listFiles(ROOT, f => /^[^_].*_module\.js$/.test(f)),
  ...listFiles(ROOT, f => /^quiz_[a-z_]+\.js$/.test(f)),
  ...listFiles(path.join(ROOT, 'stem_lab'), f => f.endsWith('.js') && !f.startsWith('_')),
  ...listFiles(path.join(ROOT, 'sel_hub'), f => f.endsWith('.js') && !f.startsWith('_')),
  ...listFiles(path.join(ROOT, 'prismflow-deploy', 'functions'), f => f.endsWith('.js') && !f.startsWith('_')),
];

const findings = [];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf-8');
  let ast;
  try {
    ast = acorn.parse(src, {
      ecmaVersion: 2022, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true,
      allowImportExportEverywhere: true, allowHashBang: true, allowSuperOutsideMethod: true,
      locations: true,
    });
  } catch (e) { continue; }

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }

    // eval(x)
    if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier' && node.callee.name === 'eval') {
      findings.push({
        file: path.relative(ROOT, file),
        line: node.loc.start.line,
        kind: 'eval',
        snippet: src.substring(node.start, Math.min(node.start + 80, node.end)).replace(/\n/g, ' '),
      });
    }

    // new Function(string) — at least one arg is a string-typed expression
    if (node.type === 'NewExpression' && node.callee && node.callee.type === 'Identifier' && node.callee.name === 'Function') {
      findings.push({
        file: path.relative(ROOT, file),
        line: node.loc.start.line,
        kind: 'new Function',
        snippet: src.substring(node.start, Math.min(node.start + 80, node.end)).replace(/\n/g, ' '),
      });
    }

    // setTimeout(string, ms) / setInterval(string, ms) — first arg is a string literal or string variable
    if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier'
        && (node.callee.name === 'setTimeout' || node.callee.name === 'setInterval')
        && node.arguments[0]
        && (node.arguments[0].type === 'Literal' && typeof node.arguments[0].value === 'string'
            || node.arguments[0].type === 'TemplateLiteral')) {
      findings.push({
        file: path.relative(ROOT, file),
        line: node.loc.start.line,
        kind: node.callee.name + '(string)',
        snippet: src.substring(node.start, Math.min(node.start + 80, node.end)).replace(/\n/g, ' '),
      });
    }

    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'range') continue;
      if (node[k] && typeof node[k] === 'object') walk(node[k]);
    }
  }
  walk(ast);
}

if (!QUIET || (findings.length > 0 && STRICT)) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   eval() / new Function() Usage Scan                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  Files scanned: ' + files.filter(f => fs.existsSync(f)).length);
  console.log('  Findings:      ' + findings.length);
  console.log('');
}

if (findings.length > 0) {
  const byKind = {};
  for (const f of findings) {
    if (!byKind[f.kind]) byKind[f.kind] = [];
    byKind[f.kind].push(f);
  }
  for (const kind of Object.keys(byKind)) {
    console.log('═══ ' + kind + ' (' + byKind[kind].length + ') ═══');
    for (const f of byKind[kind].slice(0, 20)) {
      console.log('  ' + (STRICT ? '✗' : '⚠') + ' ' + f.file + ':' + f.line);
      if (VERBOSE) console.log('      ' + f.snippet);
    }
    if (byKind[kind].length > 20) console.log('  (... ' + (byKind[kind].length - 20) + ' more)');
    console.log('');
  }
  console.log('  Triage: for each, ask "is the string ever user-controlled or AI-generated?"');
  console.log('     - YES → replace with safer alternative (JSON.parse, function reference, etc.)');
  console.log('     - NO  → safe (e.g., parsing JS-literal config from a trusted source file)');
  console.log('');
}

if (STRICT && findings.length > 0) {
  console.log('  ❌ ' + findings.length + ' eval/Function(string) site(s) in --strict mode.');
  process.exit(1);
}

console.log('  ' + (findings.length === 0 ? '✅' : '⚠') + ' ' + findings.length + ' eval/Function(string) site(s) — informational by default.');
console.log('');

process.exit(0);
