// Insert the Be-The-Water / mode-bar / section-tab keys into ui_strings.js and
// its mirror, without reformatting the rest of the file.
//
//   node dev-tools/wc_pilot_i18n_master.cjs --dry
//   node dev-tools/wc_pilot_i18n_master.cjs --write
//
// Targeted insertion, never a parse-and-reserialize: ui_strings.js is ~8.5k keys
// shared by every lane, and rewriting the whole document would produce an
// unreviewable diff and silently drop any concurrent edit. Keys are appended
// just inside the existing "watercycle" object.
//
// ui_strings.js is a STRICT JSON document despite the .js extension, so: no
// comments, and it is validated with JSON.parse immediately after writing.
'use strict';

const fs = require('fs');
const WRITE = process.argv.includes('--write');
const MASTER = 'ui_strings.js';
const MIRROR = 'desktop/web-app/public/ui_strings.js';

const keyMap = JSON.parse(fs.readFileSync('dev-tools/.cache/wc_pilot_keys.json', 'utf8'));
// Only the keys this work introduced. The rest of the missing set is a
// pre-existing gap in this tool and is reported, not silently swept in.
const MINE = /^(pilot_|mode_|sect_)/;
const toAdd = {};
for (const [k, v] of Object.entries(keyMap.missing)) if (MINE.test(k)) toAdd[k] = v;
const preExisting = Object.keys(keyMap.missing).filter((k) => !MINE.test(k));

const sortedKeys = Object.keys(toAdd).sort();
console.log(`keys to add        : ${sortedKeys.length}`);
console.log(`pre-existing gap   : ${preExisting.length}  (reported, not touched)`);

function insert(file) {
  const src = fs.readFileSync(file, 'utf8');
  // Anchor on the watercycle object inside stem. Indentation in this file is
  // four spaces at that depth; matched rather than assumed.
  const anchorRe = /("watercycle"\s*:\s*\{)/;
  const m = anchorRe.exec(src);
  if (!m) throw new Error(`${file}: "watercycle" object not found`);
  const indentMatch = /\n(\s+)"/.exec(src.slice(m.index + m[0].length));
  const indent = indentMatch ? indentMatch[1] : '      ';

  const existing = JSON.parse(src).stem.watercycle;
  const fresh = sortedKeys.filter((k) => !(k in existing));
  if (!fresh.length) return { file, added: 0, src };

  const block = fresh
    .map((k) => `${indent}${JSON.stringify(k)}: ${JSON.stringify(toAdd[k])},`)
    .join('\n');
  const out = src.slice(0, m.index + m[0].length) + '\n' + block + src.slice(m.index + m[0].length);

  // Validate before it ever reaches disk.
  let parsed;
  try {
    parsed = JSON.parse(out);
  } catch (e) {
    throw new Error(`${file}: insertion broke JSON - ${e.message}`);
  }
  for (const k of fresh) {
    if (parsed.stem.watercycle[k] !== toAdd[k]) {
      throw new Error(`${file}: key ${k} did not round-trip`);
    }
  }
  return { file, added: fresh.length, src: out };
}

const results = [MASTER, MIRROR].map(insert);
for (const r of results) console.log(`  ${r.file}: +${r.added}`);

if (WRITE) {
  for (const r of results) if (r.added) fs.writeFileSync(r.file, r.src);
  // Re-read from disk and parse, so the check is on what actually landed.
  for (const r of results) {
    const check = JSON.parse(fs.readFileSync(r.file, 'utf8'));
    const n = sortedKeys.filter((k) => check.stem.watercycle[k] === toAdd[k]).length;
    console.log(`  verified on disk ${r.file}: ${n}/${sortedKeys.length} keys present and equal`);
  }
} else {
  console.log('\n(dry run - pass --write to apply)');
}
