#!/usr/bin/env node
// register_ui_strings.cjs — add harvested key/English pairs to ui_strings.js.
//
//   node dev-tools/register_ui_strings.cjs dev-tools/harvest_input_.json [...]
//   node dev-tools/register_ui_strings.cjs --dry <file.json>
//
// ui_strings.js is the work list the runtime pack builder diffs against the
// user's cached pack (see useTranslation in AlloFlowANTI.txt): whatever is in
// here and not in their pack gets translated and cached on next load. A key
// that never lands here is never translated for anyone, in any language, no
// matter how correctly its call site is wrapped.
//
// Refuses to overwrite an existing key — a harvested fallback is one call
// site's wording, and silently replacing curated copy with it would be a
// regression disguised as a fix.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'ui_strings.js');

const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
const inputs = argv.filter((a) => !a.startsWith('--'));
if (!inputs.length) { console.error('usage: register_ui_strings.cjs [--dry] <harvest.json> [...]'); process.exit(2); }

const before = fs.readFileSync(FILE, 'utf8');
const root = JSON.parse(before);

function countKeys(o) {
  let n = 0;
  for (const k in o) {
    const v = o[k];
    n += (v && typeof v === 'object' && !Array.isArray(v)) ? countKeys(v) : 1;
  }
  return n;
}
const keysBefore = countKeys(root);

let added = 0; const skipped = []; const blocked = [];
for (const rel of inputs) {
  const pairs = JSON.parse(fs.readFileSync(path.resolve(ROOT, rel), 'utf8'));
  for (const [dotted, english] of Object.entries(pairs)) {
    const parts = dotted.split('.');
    let node = root; let ok = true;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      if (node[seg] === undefined) node[seg] = {};
      // A dotted key cannot be nested under an existing STRING — that would
      // mean two call sites disagree about whether `foo.bar` is a leaf.
      if (typeof node[seg] !== 'object' || Array.isArray(node[seg])) { blocked.push(dotted + ' (parent "' + seg + '" is a string)'); ok = false; break; }
      node = node[seg];
    }
    if (!ok) continue;
    const leaf = parts[parts.length - 1];
    if (node[leaf] !== undefined) { skipped.push(dotted); continue; }
    node[leaf] = english;
    added += 1;
  }
}

const after = JSON.stringify(root, null, 2) + '\n';
// Re-parse what we are about to write: a corrupt 5.7MB registry would take the
// whole UI down in every language at once.
const verify = JSON.parse(after);
const keysAfter = countKeys(verify);
if (keysAfter !== keysBefore + added) {
  console.error(`FAIL key accounting: before=${keysBefore} added=${added} after=${keysAfter}`);
  process.exit(1);
}

console.log(`registered ${added} key(s); ${skipped.length} already present; ${blocked.length} blocked`);
for (const s of skipped.slice(0, 10)) console.log('  already present: ' + s);
for (const b of blocked) console.log('  BLOCKED: ' + b);
if (dry) { console.log('(dry run — nothing written)'); process.exit(0); }
fs.writeFileSync(FILE, after, 'utf8');
console.log(`ui_strings.js: ${keysBefore} -> ${keysAfter} keys`);
