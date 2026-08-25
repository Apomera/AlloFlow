/*
 * check_sel_dead_content.cjs
 *
 * Content that is authored, shipped, parsed on every load — and never read.
 *
 * WHY THIS GATE EXISTS: a 2026-08-25 sweep found 652 module-scope content
 * declarations across 11 SEL tools, ~5 MB, that nothing in the repo ever reads.
 * Some is generated filler; some is the best clinical writing in the hub
 * (mindfulness TRAUMA_ADAPTATIONS, zones ZONE_COREGULATION, howl
 * CONFERENCE_SCRIPTS). Either way a student can never reach a word of it, and
 * every one of those bytes is downloaded and parsed on every tool open.
 *
 * The existing debt is BASELINED, not failed — deciding wire-vs-delete on 5 MB of
 * clinical content is the maintainer's call. What this gate prevents is the debt
 * GROWING: a new never-read declaration, or an existing one growing past its
 * recorded size, fails.
 *
 * DETECTION IS ON THE AST, NEVER A REGEX. The walk carries the PARENT node so an
 * assignment target, an object key, or a non-computed member property is not
 * mistaken for a read — the same trap that made the find-deref scanner's first
 * regex attempt useless.
 *
 * Usage:
 *   node dev-tools/check_sel_dead_content.cjs            # check against baseline
 *   node dev-tools/check_sel_dead_content.cjs --list     # print every finding
 *   node dev-tools/check_sel_dead_content.cjs --update-baseline
 *
 * Exit: 0 clean, 1 regression (new or grown dead content), 2 could not scan.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SEL = path.join(ROOT, 'sel_hub');
const BASELINE_PATH = path.join(ROOT, 'dev-tools', 'sel_dead_content_baseline.json');
const LIST = process.argv.includes('--list');
const UPDATE = process.argv.includes('--update-baseline');
const QUIET = process.argv.includes('--quiet');

// Only bodies big enough to be "content". Below this, an unread constant is
// ordinary dead code, not a content-delivery failure.
const MIN_BYTES = 2000;

let acorn;
for (const p of [path.join(ROOT, 'node_modules', 'acorn'), path.join(ROOT, 'desktop/web-app', 'node_modules', 'acorn'), 'acorn']) {
  try { acorn = require(p); break; } catch (e) { /* try next */ }
}
if (!acorn) { console.error('[check_sel_dead_content] acorn not found; cannot scan.'); process.exit(2); }

if (!fs.existsSync(SEL)) { console.error('[check_sel_dead_content] no sel_hub/ directory at ' + SEL); process.exit(2); }
const files = fs.readdirSync(SEL).filter((f) => /^sel_tool_.*\.js$/.test(f) || f === 'sel_hub_module.js').sort();
if (!files.length) { console.error('[check_sel_dead_content] scanned 0 files — the filter is wrong.'); process.exit(2); }

function walk(node, parent, visit) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent);
  for (const k of Object.keys(node)) {
    if (k === 'type' || k === 'start' || k === 'end' || k === 'loc') continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') walk(c, node, visit); }
    else if (v && typeof v.type === 'string') walk(v, node, visit);
  }
}

function scanFile(src) {
  const ast = acorn.parse(src, { ecmaVersion: 2020, locations: true });
  const decls = [];
  walk(ast, null, (n) => {
    if (n.type !== 'VariableDeclarator' || !n.id || n.id.type !== 'Identifier' || !n.init) return;
    if (n.init.type !== 'ArrayExpression' && n.init.type !== 'ObjectExpression') return;
    const size = n.end - n.start;
    if (size < MIN_BYTES) return;
    decls.push({ name: n.id.name, size, line: n.loc.start.line });
  });
  if (!decls.length) return [];

  const reads = Object.create(null);
  walk(ast, null, (n, parent) => {
    if (n.type !== 'Identifier' || !parent) return;
    // Not a read: the declarator's own id, an object key, a non-computed member
    // property, an assignment target, a function name, or a parameter.
    if (parent.type === 'VariableDeclarator' && parent.id === n) return;
    if (parent.type === 'Property' && parent.key === n && !parent.computed) return;
    if (parent.type === 'MemberExpression' && parent.property === n && !parent.computed) return;
    if (parent.type === 'AssignmentExpression' && parent.left === n) return;
    if ((parent.type === 'FunctionDeclaration' || parent.type === 'FunctionExpression') && parent.id === n) return;
    if ((parent.type === 'FunctionDeclaration' || parent.type === 'FunctionExpression' || parent.type === 'ArrowFunctionExpression') && (parent.params || []).indexOf(n) >= 0) return;
    reads[n.name] = (reads[n.name] || 0) + 1;
  });

  return decls.filter((d) => !reads[d.name]);
}

const found = {};
let totalDecls = 0, totalBytes = 0;
for (const f of files) {
  let dead;
  try { dead = scanFile(fs.readFileSync(path.join(SEL, f), 'utf8')); }
  catch (e) { console.error('[check_sel_dead_content] parse failed for ' + f + ': ' + e.message); process.exit(2); }
  if (!dead.length) continue;
  // Names can repeat within a file (re-declared volumes); key by name and keep the
  // largest, so the baseline is stable regardless of declaration order.
  const byName = {};
  for (const d of dead) byName[d.name] = Math.max(byName[d.name] || 0, d.size);
  found[f] = byName;
  totalDecls += dead.length;
  totalBytes += dead.reduce((a, b) => a + b.size, 0);
}

if (LIST) {
  for (const f of Object.keys(found).sort()) {
    const names = Object.keys(found[f]).sort((a, b) => found[f][b] - found[f][a]);
    console.log('\n' + f + '  (' + names.length + ' declarations, ' + Math.round(names.reduce((a, n) => a + found[f][n], 0) / 1024) + ' KB)');
    for (const n of names) console.log('   ' + String(Math.round(found[f][n] / 1024)).padStart(5) + ' KB  ' + n);
  }
}

if (UPDATE) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify({
    note: 'Never-read SEL content declarations >= ' + MIN_BYTES + ' bytes. RATCHET: this may only ever shrink. A new name, or an existing one growing, fails the gate. Refresh with: node dev-tools/check_sel_dead_content.cjs --update-baseline',
    scannedFiles: files.length,
    totalDeclarations: totalDecls,
    totalBytes,
    entries: found,
  }, null, 2) + '\n');
  console.log('[check_sel_dead_content] baseline written: ' + totalDecls + ' declarations, ' + (totalBytes / 1024 / 1024).toFixed(2) + ' MB across ' + Object.keys(found).length + ' files.');
  process.exit(0);
}

if (!fs.existsSync(BASELINE_PATH)) {
  console.error('[check_sel_dead_content] no baseline at ' + BASELINE_PATH + '. Create it with --update-baseline.');
  process.exit(2);
}
const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
const base = baseline.entries || {};
const regressions = [];
for (const f of Object.keys(found)) {
  for (const name of Object.keys(found[f])) {
    const was = (base[f] || {})[name];
    if (was === undefined) regressions.push(f + ' :: ' + name + ' (' + Math.round(found[f][name] / 1024) + ' KB) is NEW never-read content');
    else if (found[f][name] > was * 1.05) regressions.push(f + ' :: ' + name + ' grew ' + Math.round(was / 1024) + ' KB -> ' + Math.round(found[f][name] / 1024) + ' KB while still never being read');
  }
}
// Report progress too, so wiring or deleting content is visible and rewarded.
const fixed = [];
for (const f of Object.keys(base)) {
  for (const name of Object.keys(base[f])) {
    if (!(found[f] || {})[name]) fixed.push(f + ' :: ' + name);
  }
}

if (!QUIET) {
  console.log('[check_sel_dead_content] scanned ' + files.length + ' file(s); ' + totalDecls + ' never-read content declaration(s), ' + (totalBytes / 1024 / 1024).toFixed(2) + ' MB.');
  console.log('  Baseline: ' + baseline.totalDeclarations + ' declarations, ' + (baseline.totalBytes / 1024 / 1024).toFixed(2) + ' MB. Skipped is not shipped: every byte here is downloaded and parsed, and no student can reach it.');
  if (fixed.length) console.log('  Resolved since the baseline (' + fixed.length + '): ' + fixed.slice(0, 8).join(', ') + (fixed.length > 8 ? ', ...' : ''));
}
if (regressions.length) {
  console.error('\n[check_sel_dead_content] FAIL — dead content grew:');
  regressions.forEach((r) => console.error('  ' + r));
  console.error('\nEither wire the content into a render path or remove it. If it is deliberately staged for a\nfuture surface, say so in the review queue and refresh the baseline.');
  process.exit(1);
}
if (!QUIET) console.log('✓ check_sel_dead_content: no new or grown never-read content.');
process.exit(0);
