#!/usr/bin/env node
// scan_pack_stale_consensus.cjs — find STALE ENGLISH frozen inside language packs.
//
//   node dev-tools/scan_pack_stale_consensus.cjs [--section stem.rocks]
//                                                [--threshold 8] [--list] [--gate]
//
// THE BUG THIS CATCHES, which nothing else does
// ---------------------------------------------
// A pack can hold the PREVIOUS English wording for a key. It differs from the
// current English, so every coverage counter — including
// audit_ui_pack_coverage — scores it as translated. It is worse than
// passthrough: the reader gets copy that a later editorial pass already
// corrected. Found live in the rocks banks of 62 of 63 packs, ~2,500 strings,
// where it had quietly reverted a scientific-accuracy pass:
//
//   what_gives_mars_its_red_color
//     current  "Which iron-oxide mineral has been identified on Mars?"
//     packs    "What gives Mars its red color?"      ← the claim that was FIXED
//
// WHY THE OBVIOUS DETECTORS FAIL
// -------------------------------
//   "value === english"            → misses it by definition; that is the point
//   English stopwords in the value  → misses every short label ("Streak")
//   "every word is an English word" → misses stale text whose vocabulary was
//                                     REMOVED from the English by the rewrite:
//                                     "Plate scratched — streak inconclusive"
//                                     survived, because "inconclusive" no longer
//                                     appears anywhere in the namespace
//   diff against git HEAD           → useless once the new English is committed
//
// HOW THIS ONE WORKS
// ------------------
// It never asks whether a string is English. It asks whether many packs in
// DIFFERENT languages hold the byte-identical value for one key. Real
// translations diverge: Arabic, Khmer, Kreyòl and Thai do not independently
// produce the same string. A widely shared value that is not the current
// English is pipeline output frozen from an older ui_strings.
//
// ★ KNOWN FALSE POSITIVE, and it is unavoidable by design: closely related
//   languages genuinely converge on a word. "Granito" is correct Portuguese AND
//   correct Spanish, so it is shared and is not the English. Raise --threshold
//   to push past small families, and read the report rather than trusting the
//   count — a true finding is English prose, which is obvious on sight.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const SECTION = flag('section', '');            // dotted path, e.g. stem.rocks; empty = every bank
const THRESHOLD = parseInt(flag('threshold', '8'), 10);
const LIST = args.includes('--list');
const GATE = args.includes('--gate');

function load(p) {
  const s = fs.readFileSync(p, 'utf8');
  const i = s.indexOf('{'), j = s.lastIndexOf('}');
  return JSON.parse(s.slice(i, j + 1));
}
function resolve(obj, dotted) {
  if (!dotted) return obj;
  let cur = obj;
  for (const seg of dotted.split('.')) {
    if (cur == null || typeof cur !== 'object') return null;
    cur = cur[seg];
  }
  return cur;
}
// Flatten to dotted leaf paths so the scan works on any bank shape.
function leaves(obj, prefix, out) {
  for (const k of Object.keys(obj || {})) {
    const v = obj[k];
    const p = prefix ? prefix + '.' + k : k;
    if (typeof v === 'string') out.set(p, v);
    else if (v && typeof v === 'object') leaves(v, p, out);
  }
  return out;
}

const ui = load(path.join(ROOT, 'ui_strings.js'));
const root = resolve(ui, SECTION);
if (!root) {
  console.error('scan_pack_stale_consensus: no such section in ui_strings.js: ' + SECTION);
  process.exit(2);
}
const english = leaves(root, '', new Map());

const langDir = path.join(ROOT, 'lang');
const slugs = fs.readdirSync(langDir).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, ''));
const packLeaves = {};
for (const s of slugs) {
  let pack;
  try { pack = load(path.join(langDir, s + '.js')); } catch (e) { continue; }
  const bank = resolve(pack, SECTION);
  if (!bank) continue;
  packLeaves[s] = leaves(bank, '', new Map());
}
const packNames = Object.keys(packLeaves);

const findings = [];
for (const [key, en] of english) {
  const tally = new Map();
  for (const s of packNames) {
    const v = packLeaves[s].get(key);
    if (typeof v !== 'string' || v === en) continue;   // passthrough is a different gate
    if (!tally.has(v)) tally.set(v, []);
    tally.get(v).push(s);
  }
  for (const [v, packs] of tally) {
    if (packs.length < THRESHOLD) continue;
    findings.push({ key, shared: packs.length, packs, value: v, english: en });
  }
}
findings.sort((a, b) => b.shared - a.shared);

const label = SECTION || '(all banks)';
console.log('scan_pack_stale_consensus: ' + english.size + ' English leaves in ' + label
  + ' x ' + packNames.length + ' pack(s), threshold ' + THRESHOLD);
console.log('  suspected stale-English keys: ' + findings.length);

if (LIST) {
  for (const f of findings) {
    console.log('\n  ' + f.key + '   (' + f.shared + ' packs)');
    console.log('    packs:   ' + f.value);
    console.log('    English: ' + f.english);
  }
} else if (findings.length) {
  for (const f of findings.slice(0, 20)) {
    console.log('  ' + String(f.shared).padStart(3) + '  ' + f.key
      + '  ' + JSON.stringify(f.value).slice(0, 60)
      + '  (English: ' + JSON.stringify(f.english).slice(0, 60) + ')');
  }
  if (findings.length > 20) console.log('  ... ' + (findings.length - 20) + ' more; re-run with --list');
}

if (GATE && findings.length) {
  console.error('\nscan_pack_stale_consensus: FAIL — packs are serving superseded English.');
  process.exit(1);
}
