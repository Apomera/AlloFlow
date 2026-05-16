#!/usr/bin/env node
// _audit_help_keys.cjs — Audit help-mode coverage.
//
// Usage:  node _audit_help_keys.cjs
//
// 1. Parse help_strings.js to get the set of DEFINED help keys.
// 2. Scan all *_source.jsx + AlloFlowANTI.txt + *_module.js for
//    `data-help-key="..."` and `data-help-key={'...'}` references.
// 3. Report which referenced keys have no help string (missing coverage),
//    and which defined keys are never referenced (dead entries).
//
// Run before deploys after adding/renaming any data-help-key attribute,
// or before shipping a new tool that needs help-mode coverage.
//
// Sibling: _audit_help_anchors.cjs (finds Panels/Cards with no data-help-key
// at all — the "feature is help-mode-blind" gap class, different from this one).
// Sibling: _check_tool_catalog.cjs (validates tool registry sync).

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

// ─── 1. Load help_strings.js ─────────────────────────────────────
let helpSrc = fs.readFileSync(path.join(ROOT, 'help_strings.js'), 'utf8');
// Strip leading // comments before the {
helpSrc = helpSrc.replace(/^\/\/[^\n]*\n/gm, '').trim();
let HELP = null;
try {
  // eslint-disable-next-line no-eval
  HELP = eval('(' + helpSrc + ')');
} catch (e) {
  console.error('Failed to eval help_strings.js:', e.message);
  process.exit(1);
}
const definedKeys = new Set(Object.keys(HELP));

// ─── 2. Walk files for data-help-key="..." references ────────────
function listFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (['node_modules','dist','_archive','prismflow-deploy','graphify-out',
           '.git','docker','tts-server','website','pilot','examples',
           'tests','test_data','a11y-audit','dev-tools','src',
           'my-video','sel_hub','stem_lab','Lesson JSONs','Phoneme library',
           'audio_banks','Letter Name audio','audio_input','audio_input2',
           'audio_input3','audio_input4','Feedback','Instructions List',
           'scripts'].includes(e.name)) continue;
      out.push(...listFiles(path.join(dir, e.name)));
    } else if (/_source\.jsx$/.test(e.name) || e.name === 'AlloFlowANTI.txt' || /_module\.js$/.test(e.name)) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}
const files = listFiles(ROOT);

// data-help-key="foo"  OR  data-help-key={'foo'}  OR  data-help-key={"foo"}
const refRe = /data-help-key\s*=\s*(?:\{?\s*['"]([a-z][\w-]*)['"]\s*\}?)/g;

const refsByKey = new Map();   // key -> { count, files: Set }
for (const file of files) {
  let txt;
  try { txt = fs.readFileSync(file, 'utf8'); } catch (_) { continue; }
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  let m;
  refRe.lastIndex = 0;
  while ((m = refRe.exec(txt))) {
    const k = m[1];
    if (!refsByKey.has(k)) refsByKey.set(k, { count: 0, files: new Set() });
    const e = refsByKey.get(k);
    e.count++;
    e.files.add(rel);
  }
}

const referencedKeys = new Set(refsByKey.keys());

// Missing: referenced but not defined
const missing = [...referencedKeys].filter(k => !definedKeys.has(k)).sort();
// Dead: defined but not referenced
const dead = [...definedKeys].filter(k => !referencedKeys.has(k)).sort();

// Summary
const lines = [];
lines.push('====================================================');
lines.push('  HELP MODE COVERAGE AUDIT');
lines.push('====================================================');
lines.push('');
lines.push(`Files scanned: ${files.length}`);
lines.push(`Defined help keys (help_strings.js): ${definedKeys.size}`);
lines.push(`Referenced help keys (data-help-key attrs): ${referencedKeys.size}`);
lines.push(`  - With definition: ${referencedKeys.size - missing.length}`);
lines.push(`  - MISSING definition: ${missing.length}`);
lines.push(`Dead entries (defined but never referenced): ${dead.length}`);
lines.push('');
lines.push('--- MISSING help strings (referenced, no definition) ---');
for (const k of missing) {
  const e = refsByKey.get(k);
  lines.push(`  ${k}  [${e.count}x in ${e.files.size} file(s)]`);
  for (const f of [...e.files].slice(0, 2)) lines.push(`     - ${f}`);
}
lines.push('');
lines.push('--- DEAD entries (defined but never used) ---');
for (const k of dead.slice(0, 80)) {
  lines.push(`  ${k}`);
}
if (dead.length > 80) lines.push(`  ... and ${dead.length - 80} more`);
lines.push('');
lines.push('--- Top sections of MISSING keys (by snake_case prefix) ---');
const sec = {};
for (const k of missing) {
  const p = k.split('_')[0];
  sec[p] = (sec[p] || 0) + 1;
}
for (const [s, n] of Object.entries(sec).sort((a,b) => b[1]-a[1])) {
  lines.push(`  ${n.toString().padStart(4,' ')}  ${s}`);
}

const reportPath = path.join(ROOT, 'a11y-audit', 'help_audit.txt');
try {
  if (!fs.existsSync(path.dirname(reportPath))) fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, lines.join('\n'));
  console.log(`Wrote ${path.relative(ROOT, reportPath)} — ${missing.length} missing, ${dead.length} dead`);
} catch (e) {
  // Fallback: write to repo root if a11y-audit/ isn't writable
  fs.writeFileSync(path.join(ROOT, 'help_audit.txt'), lines.join('\n'));
  console.log(`Wrote help_audit.txt — ${missing.length} missing, ${dead.length} dead`);
}

if (missing.length > 0) {
  console.error('\n❌ Missing help strings detected. Add entries to help_strings.js.');
  process.exit(1);
}
