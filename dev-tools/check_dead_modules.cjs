#!/usr/bin/env node
// check_dead_modules.cjs — find fossil / dead code in the CDN module layer.
//
// Why this exists:
//   AlloFlow modules are extracted from the AlloFlowANTI.txt monolith over time.
//   When a component is modularized into its own registered file, the ORIGINAL
//   inline copy is sometimes left behind — a closure-trapped component that is
//   never registered on window.AlloModules, never createElement'd, and never
//   returned. It ships to every client and parses, with zero runtime effect.
//   The 2026-06-03 case: a ~10,450-line StudentAnalyticsPanel duplicate inside
//   word_sounds_module.js (the live one lives in student_analytics_module.js).
//   See feedback_verify_reachability_before_fixing + project_word_sounds_review.
//
// Three detection classes:
//   A) DEAD COMPONENTS — a PascalCase component binding (React.memo / forwardRef
//      / arrow / function) with ZERO references (eslint-scope). Defined but used
//      nowhere. This is the StudentAnalyticsPanel class.
//   B) DUPLICATE NAMES — the same component name DEFINED in 2+ module files. A
//      cross-file twin; when one copy is also Class-A dead, it is a high-
//      confidence extraction fossil (the StudentAnalyticsPanel signature).
//   C) ORPHANED FILES — a root *_module.js whose basename is referenced NOWHERE
//      in AlloFlowANTI.txt or build.js (i.e. the host never loads it).
//
// IMPORTANT: a finding is a CANDIDATE, not a verdict. Each needs the
//   dead-vs-intentional-vs-unfinished judgment (a "ComingSoon" stub may be a
//   deliberately-retained safety placeholder; a defined-but-unwired feature may
//   be unfinished and worth WIRING, not deleting). Verify before removing.
//
// Usage:
//   node dev-tools/check_dead_modules.cjs              (report all classes)
//   node dev-tools/check_dead_modules.cjs --strict     (exit 1 on non-allowlisted Class A)
//   node dev-tools/check_dead_modules.cjs --class=A     (A | B | C)
//
// Exit codes: 0 ok / informational; 1 (--strict) non-allowlisted dead component; 2 usage.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MODS = path.join(ROOT, 'desktop/web-app', 'node_modules');
const espree = require(path.join(MODS, 'espree'));
const eslintScope = require(path.join(MODS, 'eslint-scope'));

const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const QUIET = args.includes('--quiet'); // silent unless something is actionable
const classArg = (args.find((a) => a.startsWith('--class=')) || '').split('=')[1];
const wantClass = (c) => !classArg || classArg.toUpperCase() === c;

// Components intentionally retained even though unreferenced. Keep this list
// SMALL and documented — each entry is a deliberate decision, not a TODO.
const ALLOW = [
  // Intentional placeholder stubs (deliberately retained).
  { file: 'stem_lab/stem_tool_nutritionlab.js', name: 'ComingSoon', reason: 'documented "retained for safety" stub' },
  { file: 'stem_lab/stem_tool_weldlab.js', name: 'ComingSoon', reason: 'documented "retained for safety" stub' },
  { file: 'stem_lab/stem_tool_evolab.js', name: 'ComingSoon', reason: 'same intentional "Coming soon" placeholder stub as its sibling tools' },
  // StemAIHintButton (stem_lab/stem_lab_module.js) — RESOLVED 2026-06-04: the
  // orphan was removed and replaced by a gated ctx.getHint entry point + a
  // default-OFF, teacher-only header toggle with consent + reveal-check guardrails
  // (slice 1 of the AI-hints control plane; per-tool adoption is a later slice).
  // LoopBackPicker (research_lane_scientific) — RESOLVED 2026-06-04: wired into
  // the scientific lane's LaneRoot render (loopback && <LoopBackPicker .../>),
  // mirroring engineering/humanities. No longer dead; allowlist entry removed.
];
const allowEntry = (file, name) => ALLOW.find((a) => a.file === file.replace(/\\/g, '/') && a.name === name);
const isAllowed = (file, name) => !!allowEntry(file, name);

// ── file discovery ──────────────────────────────────────────────────────────
function moduleFiles() {
  const out = [];
  for (const f of fs.readdirSync(ROOT)) if (f.endsWith('_module.js')) out.push(path.join(ROOT, f));
  for (const sub of ['stem_lab', 'sel_hub']) {
    const d = path.join(ROOT, sub);
    if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (f.endsWith('.js')) out.push(path.join(d, f));
  }
  return out;
}
const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');

// ── component-binding detection ──────────────────────────────────────────────
const isPascal = (n) => /^[A-Z][a-zA-Z0-9]*$/.test(n) && /[a-z]/.test(n);
function initIsComponentLike(init) {
  if (!init) return false;
  if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') return true;
  if (init.type === 'CallExpression' && init.callee && init.callee.type === 'MemberExpression') {
    const o = init.callee.object, p = init.callee.property;
    if (o && o.name === 'React' && p && (p.name === 'memo' || p.name === 'forwardRef')) return true;
  }
  return false;
}

const dead = [];          // Class A: {file, name, line, kind, refs:0}
const defsByName = {};    // Class B: name -> [{file, line, refs}]
const parseErrors = [];

for (const file of moduleFiles()) {
  const src = fs.readFileSync(file, 'utf8');
  let ast, sm;
  try { ast = espree.parse(src, { ecmaVersion: 'latest', sourceType: 'script', loc: true, range: true }); }
  catch (e) { parseErrors.push(rel(file) + ': ' + e.message.split('\n')[0]); continue; }
  try { sm = eslintScope.analyze(ast, { ecmaVersion: 'latest', sourceType: 'script' }); }
  catch (e) { parseErrors.push(rel(file) + ' (scope): ' + e.message.split('\n')[0]); continue; }

  const r = rel(file);
  const seen = new Set();
  const walk = (scope) => {
    for (const v of scope.variables) {
      const def = v.defs && v.defs[0];
      if (!def) continue;
      const node = def.node;
      let compLike = false, line = 0;
      if (def.type === 'Variable' && node.type === 'VariableDeclarator') { compLike = initIsComponentLike(node.init); line = node.loc.start.line; }
      else if (def.type === 'FunctionName' && node.type === 'FunctionDeclaration') { compLike = true; line = node.loc.start.line; }
      if (!compLike || !isPascal(v.name)) continue;
      const key = r + '::' + v.name + '::' + line;
      if (seen.has(key)) continue; seen.add(key);
      const refs = v.references.length;
      (defsByName[v.name] = defsByName[v.name] || []).push({ file: r, line, refs });
      if (refs === 0) dead.push({ file: r, name: v.name, line, kind: node.type });
    }
    scope.childScopes.forEach(walk);
  };
  walk(sm.globalScope);
}

// ── Class C: orphaned root *_module.js (basename referenced nowhere host-side) ─
function hostText() {
  let t = '';
  for (const f of ['AlloFlowANTI.txt', 'build.js']) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) t += fs.readFileSync(p, 'utf8');
  }
  return t;
}
const HOST = hostText();
const orphanFiles = [];
for (const f of fs.readdirSync(ROOT)) {
  if (!f.endsWith('_module.js')) continue;
  // Skip build-layer intermediates / sources: `_build_*` and other underscore-
  // prefixed files are compiled INTO runtime modules, not loaded by the host.
  if (f.startsWith('_')) continue;
  if (!HOST.includes(f)) orphanFiles.push(f);
}

// ── report ───────────────────────────────────────────────────────────────────
const LINES = [];
const P = (s) => LINES.push(s);
let nonAllowedDead = 0;
if (wantClass('A')) {
  P('=== Class A: DEAD COMPONENTS (PascalCase, 0 references) ===');
  if (!dead.length) P('  (none)');
  dead.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file))).forEach((d) => {
    const twin = (defsByName[d.name] || []).filter((x) => !(x.file === d.file && x.line === d.line) && x.refs > 0);
    const entry = allowEntry(d.file, d.name);
    if (!entry) nonAllowedDead++;
    P(`  ${d.file}:${d.line}  ${d.name}  [${d.kind}]`
      + (twin.length ? `  ⚑ live twin in ${twin.map((t) => t.file).join(', ')}` : '')
      + (entry ? `\n      ↳ allowlisted: ${entry.reason}` : '  ← NEW (triage: dead? unfinished? intentional?)'));
  });
}
if (wantClass('B')) {
  P('\n=== Class B: DUPLICATE COMPONENT NAMES (defined in 2+ files) ===');
  const dups = Object.entries(defsByName).filter(([, defs]) => new Set(defs.map((d) => d.file)).size > 1);
  if (!dups.length) P('  (none)');
  dups.sort().forEach(([name, defs]) => {
    P(`  ${name}:`);
    defs.forEach((d) => P(`      ${d.file}:${d.line}  (refs=${d.refs}${d.refs === 0 ? ' ← DEAD copy' : ''})`));
  });
}
if (wantClass('C')) {
  P('\n=== Class C: ORPHANED ROOT *_module.js (basename not in AlloFlowANTI.txt or build.js) ===');
  if (!orphanFiles.length) P('  (none)');
  orphanFiles.sort().forEach((f) => P('  ' + f));
}
P('\n--- parse/scope failures: ' + parseErrors.length + ' ---');
parseErrors.slice(0, 15).forEach((e) => P('  ' + e));
P(`\nSummary: ${dead.length} dead component(s) (${nonAllowedDead} non-allowlisted), `
  + `${Object.values(defsByName).filter((d) => new Set(d.map((x) => x.file)).size > 1).length} duplicate name(s), `
  + `${orphanFiles.length} orphaned file(s).`);

// --quiet: stay silent unless something is actionable (a NEW non-allowlisted
// dead component, or an orphaned file). Everything else is informational.
const actionable = nonAllowedDead > 0 || orphanFiles.length > 0;
if (!QUIET || actionable) console.log(LINES.join('\n'));

if (STRICT && nonAllowedDead > 0) process.exit(1);
process.exit(0);
