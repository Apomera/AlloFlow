#!/usr/bin/env node
// insert_pack_array.cjs — positional-array front end for insert_pack_keys.cjs.
//
//   node dev-tools/insert_pack_array.cjs <slug> <array.json> [--section a11y]
//                                        [--prefix storyforge_] [--from N]
//
// Why this exists: hand-translating 566 keys into 60 packs means re-typing
// ~22 KB of key names PER LANGUAGE for zero information gain — the key order is
// fully derivable from ui_strings.js. This takes a bare JSON array of strings
// in that canonical order and expands it to the {key: value} form the real
// inserter wants.
//
// ★ It does NOT re-implement any validation. It expands, then execs
//   insert_pack_keys.cjs, which stays the single derivation of "is this pack
//   change legal" — placeholder survival, DNT terms, key parity, .bak, mirror.
//   Two derivations of one correctness rule is how the checks drift apart.
//
// --from N lets a language be delivered in batches (array[0] maps to key N),
// so a long pack can land in several passes without holding 566 strings in one
// write. Batches merge; later batches never clobber earlier keys they omit.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const flag = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : dflt;
};

const slug = positional[0];
const arrPath = positional[1];
const SECTION = flag('section', 'a11y');
const PREFIX = flag('prefix', 'storyforge_');
const FROM = parseInt(flag('from', '0'), 10) || 0;

if (!slug || !arrPath) {
  console.error('usage: node dev-tools/insert_pack_array.cjs <slug> <array.json> '
    + '[--section a11y] [--prefix storyforge_] [--from N]');
  process.exit(2);
}

const ui = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8'));
if (!ui[SECTION]) { console.error('no such section: ' + SECTION); process.exit(1); }

// Canonical order = insertion order of the section in ui_strings.js, filtered by
// prefix. This is the same order dev-tools/... dumps for translation, so an
// array written against that dump lines up by construction.
const keys = Object.keys(ui[SECTION]).filter((k) => k.startsWith(PREFIX));

let arr;
try { arr = JSON.parse(fs.readFileSync(arrPath, 'utf8')); }
catch (e) { console.error('cannot parse ' + arrPath + ': ' + e.message); process.exit(1); }
if (!Array.isArray(arr)) { console.error('expected a JSON array of strings'); process.exit(1); }

if (FROM + arr.length > keys.length) {
  console.error('array overruns the key list: --from ' + FROM + ' + ' + arr.length
    + ' entries > ' + keys.length + ' ' + PREFIX + '* keys');
  process.exit(1);
}

const out = {};
let skipped = 0;
arr.forEach((v, i) => {
  // null / "" means "not translated in this batch" — leave the key untouched
  // rather than writing an empty string the inserter would reject anyway.
  if (v === null || v === undefined || v === '') { skipped++; return; }
  out[keys[FROM + i]] = v;
});

const tmp = path.join(os.tmpdir(), 'pack_array_' + slug + '_' + FROM + '.json');
fs.writeFileSync(tmp, JSON.stringify(out, null, 1), 'utf8');
console.log('expand: ' + Object.keys(out).length + ' key(s) from index ' + FROM
  + (skipped ? ('  (' + skipped + ' left untranslated)') : '')
  + '  ->  ' + keys[FROM] + ' … ' + keys[FROM + arr.length - 1]);

const r = spawnSync(process.execPath,
  [path.join(__dirname, 'insert_pack_keys.cjs'), slug, tmp, '--section', SECTION],
  { stdio: 'inherit' });
try { fs.unlinkSync(tmp); } catch (_) {}
process.exit(r.status === null ? 1 : r.status);
