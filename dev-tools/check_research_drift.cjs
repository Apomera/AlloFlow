#!/usr/bin/env node
// check_research_drift.cjs — TRUE rebuild-diff gate for the Research Hub modules.
//
// Why this exists:
//   2026-06-07 review caught a P0 footgun: research_lane_scientific_module.js (and
//   its prismflow mirror) carried a hand-patched `{loopback && <LoopBackPicker/>}`
//   render that the canonical research_lane_scientific_source.jsx never produced.
//   The deployed lane worked, but a routine `node _build_research_lane_scientific_module.js`
//   would have regenerated from source and SILENTLY DELETED the lane's core
//   loop-back feature.
//
//   The existing tooling missed it:
//     - check_source_freshness.cjs   → mtime only (a hand-patch isn't "newer")
//     - audit_pair_drift.js          → regex/byte heuristic, "often noisy", advisory
//     - research_hub_substrate_golden → only loads research_hub_module.js
//
//   This check is definitive and false-positive-free: it re-runs the EXACT esbuild
//   invocation the _build_research_*_module.js scripts use, into a temp file, then
//   compares the bytes against BOTH the committed root module and the
//   desktop/web-app/public mirror. Any delta = the committed artifact does not
//   match what the canonical source compiles to → fix forward in source + rebuild.
//
// Usage:
//   node dev-tools/check_research_drift.cjs            (report + exit 1 on drift)
//   node dev-tools/check_research_drift.cjs --quiet    (silent unless drift)
//
// Exit codes: 0 = all in sync; 1 = drift found; 2 = setup error.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const QUIET = process.argv.includes('--quiet');

// One entry per research source that has a _build_research_*_module.js script.
// Keep in sync with those build scripts (identical esbuild flags).
const TARGETS = [
  'research_hub',
  'research_hub_educator',
  'research_lane_scientific',
  'research_lane_engineering',
  'research_lane_humanities',
];

// Mirror the exact transform from the _build_research_*_module.js scripts.
function rebuild(sourcePath, outPath, base) {
  let compileSource = sourcePath;
  let compositeSource = null;
  let compositeDir = null;
  if (base === 'research_hub') {
    const evidenceGraph = path.join(ROOT, 'research_evidence_graph.js');
    if (!fs.existsSync(evidenceGraph)) throw new Error('Evidence Graph source not found: ' + evidenceGraph);
    compositeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-rh-drift-'));
    compositeSource = path.join(compositeDir, '_tmp_research_hub_entry.jsx');
    fs.writeFileSync(compositeSource, fs.readFileSync(evidenceGraph, 'utf8') + '\n' + fs.readFileSync(sourcePath, 'utf8'), 'utf8');
    compileSource = compositeSource;
  }
  try {
    execSync(
      'npx esbuild "' + compileSource + '" --bundle=false --format=esm ' +
      '--jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment ' +
      '--outfile="' + outPath + '" --target=es2020',
      { cwd: ROOT, stdio: 'pipe' }
    );
    const compiled = fs.readFileSync(outPath, 'utf-8');
    return compiled
      .replace(/"[^"\n]*_tmp_research_hub_entry\.jsx"\(exports, module\)/, '"_tmp_research_hub_entry.jsx"(exports, module)')
      .replace(/\nexport default (require_[A-Za-z0-9_]+)\(\);?\s*$/, '\n$1();\n')
      .replace(/\nexport\s*\{\s*\}\s*;?\s*$/, '\n');
  } finally {
    if (compositeDir) { try { fs.rmSync(compositeDir, { recursive: true, force: true }); } catch (_) {} }
  }
}

const drifts = [];
const clean = [];

for (const base of TARGETS) {
  const sourcePath = path.join(ROOT, base + '_source.jsx');
  const rootModule = path.join(ROOT, base + '_module.js');
  const mirror = path.join(ROOT, 'desktop/web-app', 'public', base + '_module.js');

  if (!fs.existsSync(sourcePath)) { console.error('Source not found: ' + sourcePath); process.exit(2); }
  if (!fs.existsSync(rootModule)) { console.error('Module not found: ' + rootModule); process.exit(2); }

  const tmp = path.join(os.tmpdir(), base + '.driftcheck.' + process.pid + '.js');
  let expected;
  try {
    expected = rebuild(sourcePath, tmp, base);
  } catch (e) {
    console.error('esbuild failed for ' + base + ': ' + (e && e.message));
    process.exit(2);
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) {}
  }

  const rootActual = fs.readFileSync(rootModule, 'utf-8');
  const issues = [];
  if (rootActual !== expected) {
    issues.push({ where: base + '_module.js', delta: rootActual.length - expected.length });
  }
  if (fs.existsSync(mirror)) {
    const mirrorActual = fs.readFileSync(mirror, 'utf-8');
    if (mirrorActual !== expected) {
      issues.push({ where: 'desktop/web-app/public/' + base + '_module.js', delta: mirrorActual.length - expected.length });
    }
  } else {
    issues.push({ where: 'desktop/web-app/public/' + base + '_module.js', delta: null, missing: true });
  }

  if (issues.length) drifts.push({ base, issues });
  else clean.push(base);
}

if (!QUIET || drifts.length) {
  console.log('');
  console.log('Research Hub rebuild-diff (source.jsx → esbuild → committed module + mirror)');
  console.log('  In sync: ' + clean.length + ' / ' + TARGETS.length);
}

if (drifts.length) {
  console.log('');
  console.log('═══ ✗ DRIFT: committed artifact does not match what source compiles to (' + drifts.length + ') ═══');
  for (const d of drifts) {
    console.log('  ✗ ' + d.base);
    for (const i of d.issues) {
      if (i.missing) console.log('      ' + i.where + '  — MIRROR MISSING');
      else console.log('      ' + i.where + '  — ' + (i.delta >= 0 ? '+' : '') + i.delta + ' bytes vs source rebuild');
    }
    console.log('      Fix: port the difference into ' + d.base + '_source.jsx, then `node _build_' + d.base + '_module.js`.');
  }
  console.log('');
  process.exit(1);
}

console.log('  ✅ All ' + TARGETS.length + ' research modules + mirrors match their source rebuild.');
console.log('');
process.exit(0);
