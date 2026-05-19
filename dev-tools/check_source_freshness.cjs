#!/usr/bin/env node
// check_source_freshness.cjs — Detect manual edits to compiled *_module.js files
// that will be wiped by the next build of *_source.jsx.
//
// Why this exists:
//   Memory: feedback_alloflow_anti_is_source.md, feedback_edit_source_not_compiled.md,
//           feedback_doc_pipeline_edit_compiled.md
//
//   AlloFlow's build pipeline compiles `*_source.jsx` → `*_module.js`. The
//   compiled module file is auto-generated and OVERWRITTEN on every build.
//   If a developer (or parallel chat) edits the compiled file directly, the
//   change LOOKS like it works in dev — until the next `node build.js` run
//   wipes it.
//
//   The diff-modal portal fix (commit e9b7fac) was applied to App.jsx — the
//   auto-generated file — and got wiped by every prod build for weeks before
//   anyone noticed. This check would have caught it the next time `npm run
//   verify` ran.
//
//   Detection rule: if `<name>_module.js` mtime > `<name>_source.jsx` mtime,
//   the compiled file was edited after its source. That's the wrong direction.
//
// What this check covers:
//   - All paired files at root (`*_source.jsx` ↔ `*_module.js`)
//   - The monolith pair (`AlloFlowANTI.txt` ↔ `prismflow-deploy/src/App.jsx`)
//
// Usage:
//   node dev-tools/check_source_freshness.cjs
//   node dev-tools/check_source_freshness.cjs --verbose
//
// Exit codes:
//   0 — every compiled file is older than its source (normal)
//   1 — at least one compiled file is newer than its source (manual-edit risk)
//   2 — usage / setup error

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');
const STRICT = args.includes('--strict');

// Build pipeline writes source first, then esbuild compiles, then writes module.
// Normal compile time is 1-3 minutes. Anything beyond that suggests the compiled
// file was edited independently (the bug class we're catching). 30 min tolerance
// avoids false positives from a slow build while catching real divergence
// (the WordSoundsSetup case had 12 DAYS of drift).
const SKEW_TOLERANCE_MS = 30 * 60 * 1000;  // 30 minutes

// Find pairs
function listPairs() {
  const pairs = [];
  // Root: *_source.jsx ↔ *_module.js
  const rootFiles = fs.readdirSync(ROOT);
  for (const f of rootFiles) {
    if (!f.endsWith('_source.jsx')) continue;
    const base = f.replace(/_source\.jsx$/, '');
    const mod = base + '_module.js';
    if (fs.existsSync(path.join(ROOT, mod))) {
      pairs.push({
        label: base,
        source: path.join(ROOT, f),
        compiled: path.join(ROOT, mod),
        category: 'module-source-pair',
      });
    }
  }
  // Monolith pair
  const monolithSrc = path.join(ROOT, 'AlloFlowANTI.txt');
  const monolithCompiled = path.join(ROOT, 'prismflow-deploy', 'src', 'App.jsx');
  if (fs.existsSync(monolithSrc) && fs.existsSync(monolithCompiled)) {
    pairs.push({
      label: 'AlloFlowANTI → App.jsx',
      source: monolithSrc,
      compiled: monolithCompiled,
      category: 'monolith',
    });
  }
  return pairs;
}

const pairs = listPairs();
const violations = [];
const ok = [];

for (const pair of pairs) {
  const srcMtime = fs.statSync(pair.source).mtimeMs;
  const compMtime = fs.statSync(pair.compiled).mtimeMs;
  const driftMs = compMtime - srcMtime;
  if (driftMs > SKEW_TOLERANCE_MS) {
    violations.push({
      ...pair,
      driftMs,
      driftMin: Math.round(driftMs / 60000),
      srcMtime: new Date(srcMtime).toISOString(),
      compMtime: new Date(compMtime).toISOString(),
    });
  } else {
    ok.push(pair);
  }
}

if (!QUIET || violations.length > 0) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   Source/Compiled Freshness Check                                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  Pairs scanned:  ' + pairs.length);
  console.log('  In sync:        ' + ok.length);
  console.log('  Compiled newer: ' + violations.length + ' (manual-edit risk)');
  console.log('');
}

if (violations.length > 0) {
  console.log('═══ ' + (STRICT ? '✗' : '⚠') + ' COMPILED FILE NEWER THAN SOURCE (' + violations.length + ') — likely manual edit; will be wiped by next build ═══');
  console.log('     Memory: feedback_alloflow_anti_is_source.md, feedback_edit_source_not_compiled.md');
  console.log('     Default behavior: informational. Pass --strict to block deploys on drift.');
  console.log('');
  for (const v of violations) {
    console.log('  ✗ ' + v.label);
    console.log('      Source:   ' + path.relative(ROOT, v.source) + '   (mtime ' + v.srcMtime + ')');
    console.log('      Compiled: ' + path.relative(ROOT, v.compiled) + '   (mtime ' + v.compMtime + ')');
    console.log('      Drift:    ' + v.driftMin + ' minutes newer than source');
    console.log('      Action:   port edits back to ' + path.basename(v.source) + ', then rebuild');
    console.log('');
  }
}

if (VERBOSE && ok.length > 0) {
  console.log('═══ ✓ In sync (' + ok.length + ') ═══');
  for (const p of ok.slice(0, 30)) {
    console.log('  ✓ ' + p.label);
  }
  if (ok.length > 30) console.log('  (... ' + (ok.length - 30) + ' more)');
  console.log('');
}

if (violations.length === 0) {
  console.log('  ✅ All ' + pairs.length + ' source/compiled pairs are in correct order.');
} else if (STRICT) {
  console.log('  ❌ ' + violations.length + ' / ' + pairs.length + ' compiled file(s) newer than source — back-port + rebuild.');
} else {
  console.log('  ⚠ ' + violations.length + ' / ' + pairs.length + ' compiled file(s) newer than source (informational — see --verbose for fix-list).');
}
console.log('');

process.exit((STRICT && violations.length > 0) ? 1 : 0);
