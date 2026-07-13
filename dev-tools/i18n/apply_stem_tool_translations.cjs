#!/usr/bin/env node
// apply_stem_tool_translations.cjs <tool> <handtl.json> — inject translated
// stem.<tool>.<key> into each pack's stem namespace. Packs are canonical 2-space
// JSON, so load -> merge -> stringify keeps diffs minimal. handtl shape:
//   { "<packname>": { "<key>": "<translation>", … }, … }
// Only keys present in the English source (stem_<tool>_en.json) are injected
// (guards typos). Merges (never clobbers an existing translated key). Reports
// per-pack counts + any passthrough (translation === English) for review.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const tool = process.argv[2];
const handtlPath = process.argv[3];
if (!tool || !handtlPath) { console.error('Usage: apply_stem_tool_translations.cjs <tool> <handtl.json>'); process.exit(2); }
const enPath = path.join(__dirname, 'stem_' + tool + '_en.json');
if (!fs.existsSync(enPath)) { console.error('Missing English source: ' + enPath); process.exit(2); }
const EN = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const validKeys = new Set(Object.keys(EN));
const handtl = JSON.parse(fs.readFileSync(handtlPath, 'utf8'));

let packs = 0, totalKeys = 0;
for (const [pack, trans] of Object.entries(handtl)) {
  const file = path.join(ROOT, 'lang', pack + '.js');
  if (!fs.existsSync(file)) { console.log('  ⚠ no pack: ' + pack + ' — skipped'); continue; }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.stem || typeof data.stem !== 'object') { console.log('  ⚠ ' + pack + ' has no stem namespace — skipped'); continue; }
  const tgt = (data.stem[tool] && typeof data.stem[tool] === 'object') ? data.stem[tool] : {};
  let added = 0, bad = 0, passthrough = 0;
  for (const [k, v] of Object.entries(trans)) {
    if (!validKeys.has(k)) { bad++; continue; }
    if (typeof v !== 'string' || !v) continue;
    if (!(k in tgt)) { tgt[k] = v; added++; if (v === EN[k]) passthrough++; }
  }
  data.stem[tool] = tgt;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log('  ' + pack.padEnd(24) + '+' + added + ' keys' + (bad ? ' (' + bad + ' unknown-key skipped)' : '') + (passthrough ? ' [' + passthrough + ' = English, review]' : ''));
  packs++; totalKeys += added;
}
console.log('\nApplied stem.' + tool + ' into ' + packs + ' packs, ' + totalKeys + ' keys total.');
