#!/usr/bin/env node
// bless_lang_sources.cjs — write/update the English source-of-truth baseline that
// translation-staleness detection compares against.
//
// THE BASELINE  (dev-tools/i18n/lang_source_baseline.json)
//   { "<key>": "<englishHash>", ... }  — one entry per canonical English string
//   (ui_strings.js + help_strings.js). It records the English wording that the
//   CURRENT translations are considered correct against. When you later reword an
//   English string, its live hash diverges from the baseline → check_lang_staleness
//   flags every pack that has a translation for that key as STALE.
//
// "Blessing" = asserting "the translations are current as of THIS English." So you
// run it (a) once to establish the baseline, and (b) again, scoped to the keys you
// just re-translated, to clear their staleness.
//
// USAGE
//   node dev-tools/i18n/bless_lang_sources.cjs              # create baseline (refuses to clobber an existing one)
//   node dev-tools/i18n/bless_lang_sources.cjs --force      # re-snapshot ALL keys to current English (full re-bless)
//   node dev-tools/i18n/bless_lang_sources.cjs --key common.foo --key alerts.bar   # re-bless only these keys
//   node dev-tools/i18n/bless_lang_sources.cjs --prune      # also drop baseline entries whose source key no longer exists
//
// Exit: 0 on success; 1 on a refused clobber or bad args.
'use strict';
const fs = require('fs');
const L = require('./lang_src_lib.cjs');

const argv = process.argv.slice(2);
const FORCE = argv.includes('--force');
const PRUNE = argv.includes('--prune');
const KEYS = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--key') { const k = argv[i + 1]; if (k) KEYS.push(k); i++; }
}

const source = L.loadSourceStrings();
const sourceKeys = Object.keys(source);
const exists = fs.existsSync(L.BASELINE_PATH);

let baseline = {};
if (exists) {
  try { baseline = JSON.parse(fs.readFileSync(L.BASELINE_PATH, 'utf8')); }
  catch (e) { console.error(`✗ existing baseline is unreadable: ${e.message}`); process.exit(1); }
}

if (KEYS.length) {
  // Scoped re-bless: only re-stamp the named keys (use after re-translating them).
  let stamped = 0, unknown = [];
  for (const k of KEYS) {
    if (!(k in source)) { unknown.push(k); continue; }
    baseline[k] = L.hashEn(source[k]);
    stamped++;
  }
  if (unknown.length) console.warn(`  ⚠ ${unknown.length} key(s) not found in canonical English (skipped): ${unknown.slice(0, 5).join(', ')}${unknown.length > 5 ? '…' : ''}`);
  writeBaseline(baseline);
  console.log(`✓ re-blessed ${stamped} key(s) to current English. Baseline now has ${Object.keys(baseline).length} entries.`);
  process.exit(0);
}

if (exists && !FORCE) {
  console.error('✗ baseline already exists. Re-blessing ALL keys would clear every pending staleness flag.');
  console.error('  • To re-bless only what you just re-translated:  --key <key> [--key <key> …]');
  console.error('  • To deliberately re-snapshot everything:        --force');
  process.exit(1);
}

// Full snapshot (initial baseline, or deliberate --force re-bless of everything).
const next = {};
for (const k of sourceKeys) {
  // --prune (or a fresh baseline) keeps only live keys; without it we also carry
  // forward any pre-existing entries so a --force re-snapshot never silently drops history.
  next[k] = L.hashEn(source[k]);
}
if (!PRUNE && exists) {
  for (const k of Object.keys(baseline)) if (!(k in next)) next[k] = baseline[k];
}

writeBaseline(next);
const carried = Object.keys(next).length - sourceKeys.length;
console.log(`✓ ${exists ? 're-snapshotted' : 'created'} baseline: ${sourceKeys.length} live source keys` +
  (carried > 0 ? ` (+${carried} retired keys carried; use --prune to drop)` : '') + '.');
console.log(`  → ${L.BASELINE_PATH}`);

function writeBaseline(obj) {
  // Deterministic key order so the committed file diffs cleanly.
  const sorted = {};
  for (const k of Object.keys(obj).sort()) sorted[k] = obj[k];
  fs.writeFileSync(L.BASELINE_PATH, JSON.stringify(sorted, null, 0) + '\n');
}
