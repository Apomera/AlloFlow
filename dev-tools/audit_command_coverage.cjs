#!/usr/bin/env node
// audit_command_coverage.cjs — turns "does agentic control cover the app?"
// into a number instead of a guess.
//
// Compares two inventories:
//   1. The command registry (allo_commands_module.js): every { id: "..." }
//      entry plus its label/alias words.
//   2. The app's interactive surface (AlloFlowANTI.txt + view/module sources):
//      every data-help-key="..." — the same inventory "where is X?" spotlights.
//
// A help-key counts as COVERED when its words overlap a command's id, label,
// or aliases. This is deliberately fuzzy — the output is a ranked to-register
// list for a human, not a gate. Nothing here fails a build.
//
// Usage: node dev-tools/audit_command_coverage.cjs [--all]
//   default: prints summary + top 40 uncovered keys; --all prints every one.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf-8');

// ── 1. Registry inventory ───────────────────────────────────────────────────
const reg = read('allo_commands_module.js');
const commands = [];
// Entries are single-object literals: { id: "...", ... label: t("...", "..."), aliases: [...] }
const idRe = /\{ id: "([a-z_0-9]+)",([\s\S]{0,600}?)(?=run|runAsync)/g;
let m;
while ((m = idRe.exec(reg))) {
  const id = m[1];
  const head = m[2];
  const words = new Set(id.split('_'));
  const label = /label: t\("[^"]*", "([^"]+)"\)/.exec(head);
  if (label) label[1].toLowerCase().split(/[^a-z0-9]+/).forEach((w) => w && words.add(w));
  const aliases = /aliases: \[([^\]]*)\]/.exec(head);
  if (aliases) {
    for (const a of aliases[1].matchAll(/"([^"]+)"/g)) {
      a[1].toLowerCase().split(/[^a-z0-9]+/).forEach((w) => w && words.add(w));
    }
  }
  commands.push({ id, words });
}

// ── 2. Surface inventory ────────────────────────────────────────────────────
const SURFACE_FILES = [
  'AlloFlowANTI.txt',
  ...fs.readdirSync(ROOT).filter((f) => /^view_.*_source\.jsx$/.test(f) || /^view_.*_module\.js$/.test(f)),
];
const helpKeys = new Map(); // key -> first file seen
for (const f of SURFACE_FILES) {
  let text;
  try { text = read(f); } catch (_) { continue; }
  for (const k of text.matchAll(/data-help-key="([a-z0-9_]+)"/g)) {
    if (!helpKeys.has(k[1])) helpKeys.set(k[1], f);
  }
  // JSX-compiled form: "data-help-key": "..."
  for (const k of text.matchAll(/"data-help-key": "([a-z0-9_]+)"/g)) {
    if (!helpKeys.has(k[1])) helpKeys.set(k[1], f);
  }
}

// ── 3. Match ────────────────────────────────────────────────────────────────
const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'and', 'or', 'btn', 'button', 'panel', 'input', 'check', 'select', 'label', 'row', 'tab', 'open', 'view']);
const keyWords = (k) => k.split('_').filter((w) => w && !STOP.has(w));
const covered = [], uncovered = [];
for (const [key, file] of helpKeys) {
  const kws = keyWords(key);
  const hit = commands.find((c) => kws.length && kws.every((w) => c.words.has(w)))
    || commands.find((c) => kws.filter((w) => c.words.has(w)).length >= Math.max(1, kws.length - 1) && kws.length >= 2);
  if (hit) covered.push({ key, cmd: hit.id });
  else uncovered.push({ key, file });
}

// ── 4. Report ───────────────────────────────────────────────────────────────
const pct = helpKeys.size ? Math.round((covered.length / helpKeys.size) * 100) : 0;
console.log('Command coverage audit');
console.log('  registry commands : ' + commands.length);
console.log('  help-key surfaces : ' + helpKeys.size + ' (across ' + SURFACE_FILES.length + ' files scanned)');
console.log('  covered (fuzzy)   : ' + covered.length + ' (' + pct + '%)');
console.log('  uncovered         : ' + uncovered.length);
console.log('');
console.log('Uncovered surfaces (candidates to register as commands):');
const showAll = process.argv.includes('--all');
const list = showAll ? uncovered : uncovered.slice(0, 40);
for (const u of list) console.log('  - ' + u.key + '  (' + u.file + ')');
if (!showAll && uncovered.length > list.length) {
  console.log('  … and ' + (uncovered.length - list.length) + ' more (run with --all)');
}
console.log('');
console.log('Caveats: word-overlap matching over-counts nothing but UNDER-counts');
console.log('commands whose labels use different words than the help-key, and many');
console.log('surfaces are inputs a command legitimately should not own (text fields,');
console.log('per-item rows). Treat the list as a menu, not a debt register.');
