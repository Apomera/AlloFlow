// Insert newly-extracted Water Cycle keys into ui_strings.js and its mirror,
// taking the English straight out of the t() fallback in the tool source.
//
//   node dev-tools/wc_extract_master.cjs --dry
//   node dev-tools/wc_extract_master.cjs --write
//
// WHY THE FALLBACK IS THE SOURCE OF TRUTH. Extraction MOVES the literal into the
// fallback slot, so the fallback is the byte-identical original English. Reading
// the value from there (instead of retyping it) makes the master insert provably
// a no-op for an English user - the same property the earlier gap fix relied on.
//
// Targeted insertion, never parse-and-reserialize: ui_strings.js is a strict JSON
// document of ~8.5k keys shared by every lane. It is validated with JSON.parse
// immediately after writing, and the mirror is re-read from disk to confirm.
'use strict';

const fs = require('fs');
const WRITE = process.argv.includes('--write');
const SRC = 'stem_lab/stem_tool_watercycle.js';
const FILES = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];

const src = fs.readFileSync(SRC, 'utf8');
// t('stem.watercycle.<key>', '<english>')  — single or double quoted fallback.
const re = /t\('stem\.watercycle\.([a-z0-9_]+)',\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*\)/g;
const found = new Map();
let m;
while ((m = re.exec(src))) {
  const key = m[1];
  // Decode JS string escapes PROPERLY for both quote styles. A hand-rolled
  // unescape here silently stored the literal text "🌧️ ..." in
  // the master, and because the master WINS over the t() fallback, the tool then
  // rendered raw escape sequences on screen instead of the emoji. Re-quote as
  // JSON and let JSON.parse do the decoding.
  let val;
  try {
    const body = m[2] !== undefined
      ? m[2]
      : m[3].replace(/\\'/g, "'").replace(/"/g, '\\"');
    val = JSON.parse('"' + body + '"');
  } catch (e) { continue; }
  if (found.has(key) && found.get(key) !== val) {
    console.error(`CONFLICT ${key}: two different fallbacks — ${JSON.stringify(found.get(key))} vs ${JSON.stringify(val)}`);
    process.exitCode = 1;
  }
  found.set(key, val);
}

const master = JSON.parse(fs.readFileSync(FILES[0], 'utf8')).stem.watercycle;
const add = [...found.entries()].filter(([k]) => !(k in master));

console.log(`t() keys in source: ${found.size}; already in master: ${found.size - add.length}; to insert: ${add.length}`);
for (const [k, v] of add) console.log(`  + ${k}: ${JSON.stringify(v).slice(0, 90)}`);
if (!add.length || !WRITE) { if (!WRITE) console.log('\n(dry run — pass --write to apply)'); process.exit(0); }

for (const file of FILES) {
  let text = fs.readFileSync(file, 'utf8');
  const anchor = /("watercycle"\s*:\s*\{)/.exec(text);
  if (!anchor) throw new Error(`${file}: "watercycle" anchor not found`);
  const indent = '      ';
  const block = add.map(([k, v]) => `\n${indent}${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('');
  text = text.slice(0, anchor.index + anchor[1].length) + block + text.slice(anchor.index + anchor[1].length);
  const parsed = JSON.parse(text);                       // strict-JSON gate
  for (const [k, v] of add) {
    if (parsed.stem.watercycle[k] !== v) throw new Error(`${file}: ${k} did not round-trip`);
  }
  fs.writeFileSync(file, text);
  const disk = JSON.parse(fs.readFileSync(file, 'utf8')).stem.watercycle;
  const ok = add.filter(([k, v]) => disk[k] === v).length;
  console.log(`  verified on disk ${file}: ${ok}/${add.length}`);
}
