#!/usr/bin/env node
// stem_tm_lookup.cjs <tool> [pack] — translation MEMORY: each lang pack already
// has ~11K translated strings. Join ui_strings.js (English) with a pack on the
// key path to get an English->translation map for that language, then auto-fill
// any stem.<tool> key whose English value EXACTLY matches a string already
// translated elsewhere in that pack. Accurate + consistent (reuses the pack's own
// established terminology), and works even for low-resource languages.
//
// Writes dev-tools/i18n/tm_<tool>/<pack>.json = { filled:{k:translation},
// missing:{k:english} } and prints per-pack coverage. With no <pack>, runs all.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const tool = process.argv[2];
const onePack = process.argv[3];
if (!tool) { console.error('Usage: stem_tm_lookup.cjs <tool> [pack]'); process.exit(2); }
const EN = JSON.parse(fs.readFileSync(path.join(__dirname, 'stem_' + tool + '_en.json'), 'utf8'));
const enValues = Object.entries(EN); // [key, english]

// Flatten an object to leaf paths -> string value.
function flatten(obj, prefix, out) {
  for (const k of Object.keys(obj)) {
    const v = obj[k]; const p = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out);
    else if (typeof v === 'string') out[p] = v;
  }
  return out;
}
const enFlat = flatten(JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8')), '', {});

const packs = onePack ? [onePack] : fs.readdirSync(path.join(ROOT, 'lang')).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, ''));
const outDir = path.join(__dirname, 'tm_' + tool);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const summary = [];
for (const pack of packs) {
  const file = path.join(ROOT, 'lang', pack + '.js');
  if (!fs.existsSync(file)) continue;
  const packFlat = flatten(JSON.parse(fs.readFileSync(file, 'utf8')), '', {});
  // Build English -> translation TM: for each pack leaf, look up its English by
  // the SAME key path in ui_strings; keep only non-passthrough (translated) pairs.
  const tm = new Map();
  for (const [keyPath, translated] of Object.entries(packFlat)) {
    const eng = enFlat[keyPath];
    if (eng && translated && eng !== translated && !tm.has(eng)) tm.set(eng, translated);
  }
  const filled = {}, missing = {};
  for (const [k, eng] of enValues) {
    if (tm.has(eng)) filled[k] = tm.get(eng);
    else missing[k] = eng;
  }
  fs.writeFileSync(path.join(outDir, pack + '.json'), JSON.stringify({ filled, missing }, null, 2) + '\n');
  const nf = Object.keys(filled).length;
  summary.push({ pack, filled: nf, missing: enValues.length - nf, pct: Math.round(nf / enValues.length * 100) });
}
summary.sort((a, b) => b.filled - a.filled);
let tf = 0;
for (const s of summary) { console.log('  ' + s.pack.padEnd(24) + 'TM-filled ' + String(s.filled).padStart(3) + '/' + enValues.length + ' (' + s.pct + '%)  missing ' + s.missing); tf += s.filled; }
console.log('\n' + summary.length + ' packs; avg TM auto-fill ' + Math.round(tf / summary.length) + '/' + enValues.length + ' keys. Maps in dev-tools/i18n/tm_' + tool + '/.');
