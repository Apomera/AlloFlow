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

// ROOT = repo root (parent of dev-tools/)
const ROOT = path.resolve(__dirname, '..');
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

// May 12 2026 — catches the generate_dispatcher class of drift where edits
// land INSIDE existing top-level functions (so the declaration count stays
// identical but the body content diverges by hundreds of lines).
//
// For each top-level declaration, returns Map<name, normalizedBodyBytes>
// where normalizedBody is the source text between this declaration and
// the next top-level declaration (or EOF), with comments + whitespace
// stripped so reformatting doesn't register as drift.
function extractDeclarationBodies(src) {
  const decls = [];
  const funcDecl = /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  const assignFn = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:[A-Za-z_$][\w$]*\s*=>|\([^)]*\)\s*=>|function\s*\(|React\.memo\(|memo\()/gm;
  let m;
  while ((m = funcDecl.exec(src)) !== null) {
    if (!NOISE.has(m[1]) && m[1].length > 1) decls.push({ name: m[1], start: m.index });
  }
  while ((m = assignFn.exec(src)) !== null) {
    if (!NOISE.has(m[1]) && m[1].length > 1) decls.push({ name: m[1], start: m.index });
  }
  decls.sort((a, b) => a.start - b.start);
  const bodies = new Map();
  for (let i = 0; i < decls.length; i++) {
    const start = decls[i].start;
    const end = i + 1 < decls.length ? decls[i + 1].start : src.length;
    const slice = src.slice(start, end)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\s+/g, '');
    // If the same name appears multiple times (rare — usually accidental dup
    // declarations or re-bindings), sum the spans so we don't miss drift.
    bodies.set(decls[i].name, (bodies.get(decls[i].name) || 0) + slice.length);
  }
  return bodies;
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
  // Nested-body drift: for declarations present in both files, compare
  // body byte counts (normalized). Catches the generate_dispatcher class
  // of drift where edits land inside top-level fn bodies.
  const srcBodies = extractDeclarationBodies(src);
  const modBodies = extractDeclarationBodies(mod);
  const commonDecls = [...srcDecls].filter(d => modDecls.has(d));
  const nestedDrift = [];
  for (const name of commonDecls) {
    const s = srcBodies.get(name) || 0;
    const m = modBodies.get(name) || 0;
    const diff = Math.abs(s - m);
    const big = Math.max(s, m);
    // Flag when (a) absolute drift > 200 bytes AND (b) relative drift > 15%
    if (big >= 200 && diff / big > 0.15 && diff > 200) {
      nestedDrift.push({ name, srcBytes: s, modBytes: m, diff, direction: m > s ? 'MOD_BIGGER' : 'SRC_BIGGER' });
    }
  }
  nestedDrift.sort((a, b) => b.diff - a.diff);
  const nestedDriftTotal = nestedDrift.reduce((sum, d) => sum + d.diff, 0);

  results.push({
    base: p.base,
    srcLines, modLines, delta,
    srcDecls: srcDecls.size, modDecls: modDecls.size,
    inSrcOnly, inModOnly,
    nestedDrift, nestedDriftTotal,
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
console.log(['Module', 'src→', 'mod→', 'Δ lines', 'src-only', 'mod-only', 'nested', 'Status'].map((s, i) => s.padEnd([22, 6, 6, 9, 9, 9, 8, 20][i])).join(''));
console.log('─'.repeat(89));
// Sort: reversed drift first (highest risk), then nested-body drift, then by missing-from-module count.
results.sort((a, b) => {
  const aR = a.class === '⚠ REVERSED' ? 0 : 1;
  const bR = b.class === '⚠ REVERSED' ? 0 : 1;
  if (aR !== bR) return aR - bR;
  if (a.nestedDrift.length !== b.nestedDrift.length) return b.nestedDrift.length - a.nestedDrift.length;
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
    r.nestedDrift.length > 0 ? (r.nestedDrift.length + 'fn').padEnd(8) : ''.padEnd(8),
    r.class,
  ];
  console.log(cols.map((c, i) => String(c).padEnd([22, 6, 6, 9, 9, 9, 8, 20][i])).join(''));
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
  if (r.nestedDrift.length > 0) {
    console.log(`  ⚠ Nested-body drift (declaration in both files, body bytes differ): ${r.nestedDrift.length} fn, ~${r.nestedDriftTotal} bytes total`);
    const showCount = verbose ? r.nestedDrift.length : Math.min(5, r.nestedDrift.length);
    for (let i = 0; i < showCount; i++) {
      const d = r.nestedDrift[i];
      const arrow = d.direction === 'MOD_BIGGER' ? '→' : '←';
      console.log(`     ${d.name.padEnd(36)} src=${String(d.srcBytes).padStart(6)} ${arrow} mod=${String(d.modBytes).padStart(6)} (Δ ${d.diff} bytes ${d.direction === 'MOD_BIGGER' ? 'in module — hand-edit risk' : 'in source'})`);
    }
    if (!verbose && r.nestedDrift.length > 5) {
      console.log(`     … and ${r.nestedDrift.length - 5} more (run --verbose to see all)`);
    }
  }
  console.log('');
}

// Overall risk summary
const reversedCount = results.filter(r => r.class === '⚠ REVERSED').length;
const whitespaceCount = results.filter(r => r.normSame).length;
const totalModOnly = results.reduce((s, r) => s + r.inModOnly.length, 0);
const totalSrcOnly = results.reduce((s, r) => s + r.inSrcOnly.length, 0);
const totalNestedDrift = results.reduce((s, r) => s + r.nestedDrift.length, 0);
const pairsWithNestedDrift = results.filter(r => r.nestedDrift.length > 0).length;
const totalNestedBytes = results.reduce((s, r) => s + r.nestedDriftTotal, 0);
console.log('─────────────────────────── Summary ───────────────────────────');
console.log(`Pairs: ${results.length}`);
console.log(`Whitespace-only drift (safe): ${whitespaceCount}`);
console.log(`Reversed drift (⚠ at-risk): ${reversedCount}`);
console.log(`Total declarations in module-only (would vanish on clobber): ${totalModOnly}`);
console.log(`Total declarations in source-only (not in deploy): ${totalSrcOnly}`);
console.log(`Nested-body drift (function exists in both, bodies differ): ${totalNestedDrift} fn across ${pairsWithNestedDrift} pair(s), ~${totalNestedBytes} bytes total`);
console.log('\nRerun with --verbose to see full name lists + per-function nested drift.\n');
