// Wire the Water Cycle tool's PRE-EXISTING unlocalised keys into ui_strings.js.
//
//   node dev-tools/wc_gap_master.cjs --dry
//   node dev-tools/wc_gap_master.cjs --write
//
// WHAT THIS IS. 349 keys that `stem_tool_watercycle.js` already asks for by name
// were never added to the master strings file - mostly the quiz banks and the
// Steward campaign. Because the host resolves pack -> master -> caller fallback,
// a key absent from the master can never be translated: it renders the English
// fallback in all 63 languages, silently, with nothing reporting a problem.
//
// WHY IT IS SAFE. The value inserted IS the source's own English fallback, so
// for an English reader the resolved string is unchanged - it simply arrives
// from the master instead of from the fallback. That claim is not assumed: the
// caller is expected to snapshot the rendered text with --master before and
// after and diff it.
//
// It refuses to touch the pilot_/mode_/sect_ namespace (handled elsewhere) and
// refuses any key whose English is blank.
'use strict';

const fs = require('fs');
const WRITE = process.argv.includes('--write');
const FILES = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];
const MINE = /^(pilot_|mode_|sect_)/;

const collected = JSON.parse(fs.readFileSync('dev-tools/.cache/wc_pilot_keys.json', 'utf8'));
const gap = {};
for (const [k, v] of Object.entries(collected.missing)) {
  if (MINE.test(k)) continue;
  if (typeof v !== 'string' || !v.trim()) { console.error(`skipping blank value: ${k}`); continue; }
  gap[k] = v;
}
const keys = Object.keys(gap).sort();
console.log(`pre-existing keys to wire: ${keys.length}`);

function apply(file) {
  const src = fs.readFileSync(file, 'utf8');
  const existing = JSON.parse(src).stem.watercycle;
  const fresh = keys.filter((k) => !(k in existing));
  const clash = keys.filter((k) => k in existing && existing[k] !== gap[k]);
  if (clash.length) {
    // A key present in the master with DIFFERENT text is drift, not a gap, and
    // it is a content decision rather than a mechanical one. Never overwrite.
    throw new Error(`${file}: ${clash.length} keys already exist with different text (drift): ${clash.slice(0, 5).join(', ')}`);
  }
  if (!fresh.length) return { file, added: 0, src };

  const m = /("watercycle"\s*:\s*\{)/.exec(src);
  if (!m) throw new Error(`${file}: "watercycle" anchor not found`);
  const indentMatch = /\n(\s+)"/.exec(src.slice(m.index + m[0].length));
  const indent = indentMatch ? indentMatch[1] : '      ';
  const block = fresh.map((k) => `${indent}${JSON.stringify(k)}: ${JSON.stringify(gap[k])},`).join('\n');
  const out = src.slice(0, m.index + m[0].length) + '\n' + block + src.slice(m.index + m[0].length);

  const parsed = JSON.parse(out);
  for (const k of fresh) {
    if (parsed.stem.watercycle[k] !== gap[k]) throw new Error(`${file}: ${k} did not round-trip`);
  }
  return { file, added: fresh.length, src: out };
}

const results = FILES.map(apply);
for (const r of results) console.log(`  ${r.file}: +${r.added}`);

if (!WRITE) { console.log('\n(dry run - pass --write to apply)'); process.exit(0); }

for (const r of results) if (r.added) fs.writeFileSync(r.file, r.src);
for (const r of results) {
  const wc = JSON.parse(fs.readFileSync(r.file, 'utf8')).stem.watercycle;
  const ok = keys.filter((k) => wc[k] === gap[k]).length;
  console.log(`  verified on disk ${r.file}: ${ok}/${keys.length}`);
}
