#!/usr/bin/env node
// harvest_unregistered_keys.cjs — collect translation keys that are CALLED with
// an inline English fallback but never registered in ui_strings.js.
//
//   node dev-tools/harvest_unregistered_keys.cjs <prefix> [file ...]
//
// Why these matter: `t('input.qs_book') || 'Open reading catalog'` looks
// localized and never shows a dotted key, so nothing flags it — but the runtime
// pack builder derives its work list from ui_strings.js, so a key that is not
// there is never handed to the translator and renders English in every
// language, permanently. Registering the key IS the fix: useTranslation()
// diffs ui_strings.js against the user's cached pack and fills whatever is new.
//
// The English text is already at the call site as the fallback, so this is a
// mechanical harvest, not a writing task.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function flat(o, p, out) {
  for (const k in o) {
    const v = o[k]; const key = p ? p + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, out); else out.add(key);
  }
  return out;
}
function loadJson(rel) {
  const s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
}

const argv = process.argv.slice(2);
const prefix = argv[0];
const files = argv.slice(1);
if (!prefix || !files.length) {
  console.error('usage: harvest_unregistered_keys.cjs <key-prefix> <file> [file ...]');
  process.exit(2);
}

const registered = flat(loadJson('ui_strings.js'), '', new Set());

// Both call shapes in this codebase:
//   t('key', 'English')  /  tr('key', 'English')  /  __alloT('key', 'English')
//   t('key') || 'English'
const TWO_ARG = /\b(?:t|tr|tx|ts|tt|__alloT)\s*\(\s*(['"])([A-Za-z0-9_$.\-]{2,80})\1\s*,\s*(['"])((?:\\.|(?!\3).)*)\3\s*\)/g;
const OR_FORM = /\b(?:t|tr|tx|ts|tt|__alloT)\s*\(\s*(['"])([A-Za-z0-9_$.\-]{2,80})\1\s*\)\s*\|\|\s*(['"])((?:\\.|(?!\3).)*)\3/g;

const found = new Map();      // key -> English
const conflicts = new Map();  // key -> Set of differing English texts

function record(key, text, file, line) {
  if (!key.startsWith(prefix)) return;
  if (registered.has(key)) return;
  const clean = text.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n');
  if (!found.has(key)) { found.set(key, { text: clean, file, line }); return; }
  if (found.get(key).text !== clean) {
    if (!conflicts.has(key)) conflicts.set(key, new Set([found.get(key).text]));
    conflicts.get(key).add(clean);
  }
}

for (const rel of files) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const lineAt = (i) => src.slice(0, i).split('\n').length;
  for (const re of [TWO_ARG, OR_FORM]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) record(m[2], m[4], rel, lineAt(m.index));
  }
}

// A key with two different English texts cannot be registered blind — one of
// the call sites would silently start rendering the other's wording.
if (conflicts.size) {
  console.error(`\n${conflicts.size} key(s) have CONFLICTING English text — resolve before registering:`);
  for (const [k, texts] of conflicts) {
    console.error(`  ${k}`);
    for (const t of texts) console.error(`      "${t}"`);
  }
}

const out = {};
for (const [k, v] of [...found].sort((a, b) => a[0].localeCompare(b[0]))) {
  if (conflicts.has(k)) continue;
  out[k] = v.text;
}
const dest = path.join(__dirname, `harvest_${prefix.replace(/[^A-Za-z0-9]/g, '_')}.json`);
fs.writeFileSync(dest, JSON.stringify(out, null, 2), 'utf8');
console.log(`\nharvested ${Object.keys(out).length} unregistered "${prefix}" key(s) from ${files.length} file(s)`);
console.log(`  -> ${path.relative(ROOT, dest)}`);
if (conflicts.size) { console.log(`  (${conflicts.size} skipped for conflicting text)`); process.exitCode = 1; }
