#!/usr/bin/env node
/**
 * Source/module pair drift auditor.
 *
 * For each *_source.jsx ↔ *_module.js pair in the repo root, extracts the set of
 * top-level declaration names (functions, components, constants) from each file
 * and diffs them. Gives us a function-level picture of drift, not just line count.
 *
 * Why: raw line count is misleading. A module may be shorter because it's minified
 * or because JSX got compiled to createElement calls (which can reduce line count).
 * Only a declaration-level diff tells us if actual code is missing.
 *
 * Usage: node audit-pair-drift.js [--verbose]
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const verbose = process.argv.includes('--verbose');

// Find pairs
const pairs = fs.readdirSync(ROOT)
  .filter(f => f.endsWith('_source.jsx'))
  .map(srcName => {
    const base = srcName.replace(/_source\.jsx$/, '');
    const modName = base + '_module.js';
    return { base, srcPath: path.join(ROOT, srcName), modPath: path.join(ROOT, modName) };
  })
  .filter(p => fs.existsSync(p.modPath));

// Known noise: React hook names, Babel helpers, common library bindings, short iteration vars.
// These are declarations but not "features" — they'd naturally differ between source.jsx (which
// relies on ambient React/lucide) and module.js (which destructures them into locals at the top).
const NOISE = new Set([
  'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'useContext', 'useReducer', 'useLayoutEffect',
  'memo', 'React', 'ReactDOM', 'LanguageContext', 'I', '_extends', '_assign', '_toConsumableArray',
  '_arrayWithHoles', '_nonIterableSpread', '_unsupportedIterableToArray', '_iterableToArray', '_arrayLikeToArray',
]);

// Look for function-like top-level declarations only. A declaration "counts" if:
//   - const/let/var FOO = (..) => { ... }   (arrow function)
//   - const FOO = function(..) { ... }       (function expression)
//   - const FOO = React.memo(...) / memo(...) (memoized component)
//   - const FOO = async (..) =>              (async arrow)
//   - function FOO(...) { ... }              (function declaration)
//   - async function FOO(...)                 (async function)
// AND not in our noise list AND name length > 1.
// Indent 0-4 only = top-level or one nested scope (factory module). Deeper = function body locals.
function extractDeclarations(src) {
  const names = new Set();
  // Accept any indent — React components often nest helpers deep inside their body.
  // We rely on the diff (source vs module) to filter out locals that appear in both.
  const funcDecl = /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  // Match arrow functions (with or without parens for single arg), function expressions, and memoized components.
  const assignFn = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:[A-Za-z_$][\w$]*\s*=>|\([^)]*\)\s*=>|function\s*\(|React\.memo\(|memo\()/gm;
  let m;
  while ((m = funcDecl.exec(src)) !== null) {
    if (!NOISE.has(m[1]) && m[1].length > 1) names.add(m[1]);
  }
  while ((m = assignFn.exec(src)) !== null) {
    if (!NOISE.has(m[1]) && m[1].length > 1) names.add(m[1]);
  }
  return names;
}

// Strip JSX + module-specific noise so whitespace-only diffs stand out.
// Crude but effective for a heuristic: remove all whitespace runs, comments, and
// the two common module wrappers.
function normalize(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')           // block comments
    .replace(/\/\/[^\n]*/g, '')                 // line comments
    .replace(/^\s*\(function\(\)\s*\{\s*["']use strict["'];?\s*/m, '') // IIFE wrapper
    .replace(/^\s*if\s*\(window\.AlloModules[^)]*\)[^{]*\{[^}]*\}\s*/m, '') // idempotency guard
    .replace(/\s+/g, '');                       // all whitespace
}

const classify = (delta) => {
  if (delta === 0) return 'IDENTICAL';
  if (Math.abs(delta) < 50) return 'MINOR';
  if (delta > 0) return '⚠ REVERSED';   // module > source = time bomb
  return 'MISSING';                      // source > module = features in git, not in deploy
};

const results = [];
for (const p of pairs) {
  const src = fs.readFileSync(p.srcPath, 'utf-8');
  const mod = fs.readFileSync(p.modPath, 'utf-8');
  const srcDecls = extractDeclarations(src);
  const modDecls = extractDeclarations(mod);
  const inSrcOnly = [...srcDecls].filter(d => !modDecls.has(d)).sort();
  const inModOnly = [...modDecls].filter(d => !srcDecls.has(d)).sort();
  const srcLines = src.split('\n').length;
  const modLines = mod.split('\n').length;
  const delta = modLines - srcLines;
  const normSame = normalize(src) === normalize(mod);
  results.push({
    base: p.base,
    srcLines, modLines, delta,
    srcDecls: srcDecls.size, modDecls: modDecls.size,
    inSrcOnly, inModOnly,
    normSame,
    class: normSame ? 'WHITESPACE-ONLY' : classify(delta),
  });
}

// Print summary table
console.log('\n─────────────────────────── Pair drift audit ───────────────────────────');
console.log('Legend: MISSING = source > module (features not in deploy).');
console.log('        ⚠ REVERSED = module > source (features will die on next clobber).');
console.log('        WHITESPACE-ONLY = same code, different formatting (harmless).');
console.log('');
console.log(['Module', 'src→', 'mod→', 'Δ lines', 'src-only', 'mod-only', 'Status'].map((s, i) => s.padEnd([22, 6, 6, 9, 9, 9, 20][i])).join(''));
console.log('─'.repeat(80));
// Sort: reversed drift first (highest risk), then by missing-from-module count desc.
results.sort((a, b) => {
  const aR = a.class === '⚠ REVERSED' ? 0 : 1;
  const bR = b.class === '⚠ REVERSED' ? 0 : 1;
  if (aR !== bR) return aR - bR;
  return b.inSrcOnly.length - a.inSrcOnly.length;
});
for (const r of results) {
  const cols = [
    r.base.padEnd(22),
    String(r.srcDecls).padEnd(6),
    String(r.modDecls).padEnd(6),
    (r.delta >= 0 ? '+' : '') + r.delta,
    String(r.inSrcOnly.length).padEnd(9),
    String(r.inModOnly.length).padEnd(9),
    r.class,
  ];
  console.log(cols.map((c, i) => String(c).padEnd([22, 6, 6, 9, 9, 9, 20][i])).join(''));
}

// Detail section
console.log('\n─────────────────────────── Details ───────────────────────────\n');
for (const r of results) {
  if (r.normSame) {
    console.log(`${r.base}: WHITESPACE-ONLY drift — harmless.\n`);
    continue;
  }
  console.log(`${r.base} [${r.class}]  src decls=${r.srcDecls}  mod decls=${r.modDecls}  Δ=${r.delta >= 0 ? '+' : ''}${r.delta} lines`);
  if (r.inModOnly.length > 0) {
    console.log(`  ⚠ In MODULE.js but NOT in source.jsx (${r.inModOnly.length}): ${verbose ? r.inModOnly.join(', ') : r.inModOnly.slice(0, 10).join(', ') + (r.inModOnly.length > 10 ? ', …' : '')}`);
  }
  if (r.inSrcOnly.length > 0) {
    console.log(`  ✗ In source.jsx but NOT in module.js (${r.inSrcOnly.length}): ${verbose ? r.inSrcOnly.join(', ') : r.inSrcOnly.slice(0, 10).join(', ') + (r.inSrcOnly.length > 10 ? ', …' : '')}`);
  }
  console.log('');
}

// Overall risk summary
const reversedCount = results.filter(r => r.class === '⚠ REVERSED').length;
const whitespaceCount = results.filter(r => r.normSame).length;
const totalModOnly = results.reduce((s, r) => s + r.inModOnly.length, 0);
const totalSrcOnly = results.reduce((s, r) => s + r.inSrcOnly.length, 0);
console.log('─────────────────────────── Summary ───────────────────────────');
console.log(`Pairs: ${results.length}`);
console.log(`Whitespace-only drift (safe): ${whitespaceCount}`);
console.log(`Reversed drift (⚠ at-risk): ${reversedCount}`);
console.log(`Total declarations in module-only (would vanish on clobber): ${totalModOnly}`);
console.log(`Total declarations in source-only (not in deploy): ${totalSrcOnly}`);
console.log('\nRerun with --verbose to see full name lists.\n');
