// Bring ui_strings.js (and its mirror) into exact agreement with the keys the
// Water Cycle tool actually asks for.
//
//   node dev-tools/wc_pilot_i18n_reconcile.cjs --dry
//   node dev-tools/wc_pilot_i18n_reconcile.cjs --write
//
// Adds keys the tool needs and removes ones it no longer names - but ONLY
// within the pilot_/mode_/sect_ namespace introduced by this work. It will not
// touch the tool's other 349 unlocalised keys, which are a pre-existing gap
// belonging to a different piece of work.
//
// Removal matters as much as addition: an obsolete key is dead weight that a
// translator would spend real effort on, in 63 languages, for a string nothing
// renders.
'use strict';

const fs = require('fs');
const WRITE = process.argv.includes('--write');
const FILES = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
const MINE = /^(pilot_|mode_|sect_)/;

const plan = JSON.parse(fs.readFileSync('dev-tools/.cache/wc_reconcile.json', 'utf8'));
const { obsolete, missing } = plan;

for (const k of obsolete) if (!MINE.test(k)) throw new Error(`refusing to remove out-of-scope key ${k}`);
for (const k of Object.keys(missing)) if (!MINE.test(k)) throw new Error(`refusing to add out-of-scope key ${k}`);

console.log(`remove: ${obsolete.length}   add: ${Object.keys(missing).length}`);

function apply(file) {
  let src = fs.readFileSync(file, 'utf8');

  // Remove obsolete keys, one whole line each, asserted to match exactly once.
  for (const k of obsolete) {
    const re = new RegExp(`\\n\\s*${JSON.stringify(k)}\\s*:\\s*"(?:[^"\\\\]|\\\\.)*",`, 'g');
    const hits = src.match(re) || [];
    if (hits.length !== 1) throw new Error(`${file}: key ${k} matched ${hits.length} lines on removal`);
    src = src.replace(re, '');
  }

  // Add the new keys just inside the watercycle object.
  const m = /("watercycle"\s*:\s*\{)/.exec(src);
  if (!m) throw new Error(`${file}: "watercycle" anchor not found`);
  const indentMatch = /\n(\s+)"/.exec(src.slice(m.index + m[0].length));
  const indent = indentMatch ? indentMatch[1] : '      ';
  const fresh = Object.keys(missing).sort();
  if (fresh.length) {
    const block = fresh.map((k) => `${indent}${JSON.stringify(k)}: ${JSON.stringify(missing[k])},`).join('\n');
    src = src.slice(0, m.index + m[0].length) + '\n' + block + src.slice(m.index + m[0].length);
  }

  const parsed = JSON.parse(src);
  for (const k of obsolete) if (k in parsed.stem.watercycle) throw new Error(`${file}: ${k} survived removal`);
  for (const k of fresh) if (parsed.stem.watercycle[k] !== missing[k]) throw new Error(`${file}: ${k} did not round-trip`);
  return { file, src };
}

const results = FILES.map(apply);
if (!WRITE) { console.log('(dry run)'); process.exit(0); }

for (const r of results) fs.writeFileSync(r.file, r.src);

// Final proof, read back off disk: the master's pilot_/mode_/sect_ namespace
// must equal the tool's requirement set exactly.
const need = JSON.parse(fs.readFileSync('dev-tools/.cache/wc_en.json', 'utf8'));
for (const f of FILES) {
  const wc = JSON.parse(fs.readFileSync(f, 'utf8')).stem.watercycle;
  const have = Object.keys(wc).filter((k) => MINE.test(k)).sort();
  const want = Object.keys(need).sort();
  const same = have.length === want.length && have.every((k, i) => k === want[i] && wc[k] === need[k]);
  console.log(`  ${f}: ${have.length} keys, exact match with tool requirement: ${same}`);
  if (!same) process.exitCode = 1;
}
