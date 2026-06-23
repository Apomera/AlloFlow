#!/usr/bin/env node
// check_lang_staleness.cjs — find translations that went STALE because the English
// source was reworded after they were translated.
//
// The gap reports catch MISSING and PASSTHROUGH (still-English) keys. They are blind
// to the one failure mode you can't otherwise see: a key that is present and has a
// real (non-English) translation, but whose English source has since CHANGED. The
// translation still "looks" done, yet now describes the old wording.
//
// How it works: bless_lang_sources.cjs snapshots a hash of every English string into
// lang_source_baseline.json. Here we recompute the live English hashes; any key whose
// hash diverged from the baseline is "changed since bless." A pack is stale for that
// key iff it actually has a translation for it (present AND not equal to the English).
// Keys that are missing/passthrough are the gap report's job, not ours.
//
// USAGE
//   node dev-tools/i18n/check_lang_staleness.cjs            # report; writes lang_staleness/<lang>.json; exit 0
//   node dev-tools/i18n/check_lang_staleness.cjs --gate     # exit 1 if any pack has a stale translation
//   node dev-tools/i18n/check_lang_staleness.cjs --quiet    # summary only (for verify chains)
//
// After re-translating the flagged keys, re-bless them:
//   node dev-tools/i18n/bless_lang_sources.cjs --key <key> [--key <key> …]
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lang_src_lib.cjs');

const argv = process.argv.slice(2);
const GATE = argv.includes('--gate');
const QUIET = argv.includes('--quiet');

if (!fs.existsSync(L.BASELINE_PATH)) {
  console.log('check_lang_staleness: no baseline yet — run  node dev-tools/i18n/bless_lang_sources.cjs  first.');
  console.log('  (Without a baseline there is nothing to compare reworded English against.)');
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(L.BASELINE_PATH, 'utf8'));
const source = L.loadSourceStrings();

// English keys whose wording changed since they were blessed (and brand-new, never-blessed keys).
const changed = [];   // existed in baseline, hash differs now
const newKeys = [];   // in source but not in baseline (added since baseline → gap-report territory)
for (const k of Object.keys(source)) {
  if (!(k in baseline)) { newKeys.push(k); continue; }
  if (baseline[k] !== L.hashEn(source[k])) changed.push(k);
}
const changedSet = new Set(changed);

fs.mkdirSync(L.STALE_DIR, { recursive: true });

const slugs = L.getLangSlugs();
const summary = [];
let totalStale = 0;

for (const slug of slugs) {
  const pack = L.loadPack(slug);
  if (!pack) { summary.push({ slug, error: 'parse' }); continue; }
  const stale = {};
  for (const k of changedSet) {
    const pv = pack[k];
    if (pv === undefined) continue;                 // missing → gap report's job
    if (L.norm(pv) === L.norm(source[k])) continue; // still English (passthrough) → gap report's job
    stale[k] = source[k];                           // has a real translation against OLD English → STALE
  }
  const n = Object.keys(stale).length;
  totalStale += n;
  fs.writeFileSync(
    path.join(L.STALE_DIR, slug + '.json'),
    JSON.stringify({ langName: slug, staleKeys: n, stale }, null, 2) + '\n'
  );
  summary.push({ slug, stale: n });
}

// Machine-readable roll-up for any downstream re-translation pass.
fs.writeFileSync(
  path.join(L.STALE_DIR, '_summary.json'),
  JSON.stringify({
    baselineEntries: Object.keys(baseline).length,
    changedSourceKeys: changed.length,
    newSourceKeys: newKeys.length,
    packsWithStale: summary.filter(s => s.stale > 0).length,
    totalStaleEntries: totalStale,
    changedKeys: changed.sort(),
  }, null, 2) + '\n'
);

// ── Console summary ──
console.log(`check_lang_staleness: ${changed.length} English key(s) changed since baseline; ` +
  `${newKeys.length} new key(s) (gap-report territory).`);

if (changed.length && !QUIET) {
  console.log(`\nChanged English keys (need re-translation across packs that had them):`);
  for (const k of changed.slice(0, 40)) console.log(`  • ${k}`);
  if (changed.length > 40) console.log(`  …and ${changed.length - 40} more (see lang_staleness/_summary.json)`);
}

const withStale = summary.filter(s => s.stale > 0).sort((a, b) => b.stale - a.stale);
if (withStale.length) {
  if (!QUIET) {
    console.log(`\nPacks with stale translations:`);
    for (const s of withStale) console.log(`  ${s.slug.padEnd(24)} ${String(s.stale).padStart(5)} stale`);
  }
  console.log(`\n${GATE ? '❌' : '⚠'} ${totalStale} stale translation(s) across ${withStale.length} pack(s). ` +
    `Re-translate, then  bless_lang_sources.cjs --key <key>  to clear.`);
  console.log(`  Details: dev-tools/i18n/lang_staleness/<lang>.json`);
  if (GATE) process.exit(1);
} else {
  console.log(`✓ no stale translations — every changed English string is either re-translated or not yet present in any pack.`);
}
process.exit(0);
