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
// ── Partial gating (2026-08-16, W1) ──────────────────────────────────────────
// Full --gate is unusable while the backlog exists (>20k stale entries), which is how this
// check spent months printing the right answer and exiting 0 while renamed surfaces shipped
// stale in 63 languages. Two composable partial gates:
//
//   --gate-guarded  HARD-fails on any stale entry whose key's top-level namespace is in
//                   GUARDED below. These are the surface-name namespaces where a stale value
//                   OVERRIDES a product rename (the Glossary/Throughline/STEAM Lab class).
//                   All of them were verified clean when this gate was added; keeping them
//                   clean is the contract. If your English edit trips this, re-translate the
//                   key across packs and bless it — do not remove the namespace from the list.
//
//   --ratchet       HARD-fails only if the TOTAL stale count exceeds the checked-in
//                   watermark (lang_staleness_watermark.json). Stops backlog growth
//                   everywhere without requiring the backlog to be fixed first. When the
//                   count drops, the watermark auto-lowers so improvements lock in.
const GATE_GUARDED = argv.includes('--gate-guarded');
const RATCHET = argv.includes('--ratchet');
// X4 2026-08-17: + 'guided' (the recommended entry route for new teachers — the
// single highest-visibility namespace for non-English users) and 'hints' (the
// renamed Messages log). Both verified stale-free at addition time, same
// contract as the original eight: keep them clean, never delist.
const GUARDED = ['sidebar', 'tools', 'glossary', 'visuals', 'universal', 'launch_pad', 'storage', 'alignment_graph', 'guided', 'hints'];
const WATERMARK_PATH = path.join(__dirname, 'lang_staleness_watermark.json');

// OneDrive can briefly return UNKNOWN/EPERM while it is syncing a JSON file.
// Keep ratchet updates recoverable without weakening the gate or using a
// non-atomic direct overwrite.
function writeFileWithRetry(file, text) {
  const temporary = `${file}.staleness-${process.pid}.tmp`;
  const transientCodes = new Set(['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN']);
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.writeFileSync(temporary, text, 'utf8');
      try {
        fs.renameSync(temporary, file);
      } catch (error) {
        if (!transientCodes.has(error.code)) throw error;
        fs.copyFileSync(temporary, file);
      }
      return;
    } catch (error) {
      lastError = error;
      if (!transientCodes.has(error.code) || attempt === 7) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350);
    } finally {
      if (fs.existsSync(temporary)) {
        try { fs.unlinkSync(temporary); } catch (error) { lastError = error; }
      }
    }
  }
  throw lastError;
}

if (!fs.existsSync(L.BASELINE_PATH)) {
  console.log('check_lang_staleness: no baseline yet — run  node dev-tools/i18n/bless_lang_sources.cjs  first.');
  console.log('  (Without a baseline there is nothing to compare reworded English against.)');
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(L.BASELINE_PATH, 'utf8'));
const slugs = L.getLangSlugs();
const { changedKeys: changed, newKeys, perPack } = L.computeStaleness({ baseline, slugs });

fs.mkdirSync(L.STALE_DIR, { recursive: true });

// Write a per-pack report for every pack (including the clean ones), matching the
// gap-report convention so a worklist file always exists for each slug.
const summary = [];
let totalStale = 0;
for (const slug of slugs) {
  const stale = perPack[slug] || {};
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
    `Re-translate and record per-pack reviews, or use bless_lang_sources.cjs --key <key> only after every affected pack is current.`);
  console.log(`  Details: dev-tools/i18n/lang_staleness/<lang>.json`);
  if (GATE) process.exit(1);
} else {
  console.log(`✓ no stale translations — every changed English string is either re-translated or not yet present in any pack.`);
}

let failed = false;

if (GATE_GUARDED) {
  const guardedHits = new Map(); // key -> pack count
  for (const slug of slugs) {
    for (const k of Object.keys(perPack[slug] || {})) {
      if (GUARDED.includes(k.split('.')[0])) guardedHits.set(k, (guardedHits.get(k) || 0) + 1);
    }
  }
  if (guardedHits.size) {
    failed = true;
    console.error(`\n❌ gate-guarded: ${guardedHits.size} stale key(s) in protected namespaces [${GUARDED.join(', ')}]:`);
    for (const [k, n] of [...guardedHits.entries()].slice(0, 12)) console.error(`   ${k} (${n} pack(s))`);
    console.error(`   These namespaces carry surface names; a stale pack value OVERRIDES the current English.`);
    console.error(`   Fix: re-translate the key across packs, then bless_lang_sources.cjs --key <key>.`);
  } else if (!QUIET) {
    console.log(`✓ gate-guarded: protected namespaces [${GUARDED.join(', ')}] are stale-free.`);
  }
}

if (RATCHET) {
  let watermark = null;
  if (fs.existsSync(WATERMARK_PATH)) {
    try { watermark = JSON.parse(fs.readFileSync(WATERMARK_PATH, 'utf8')); } catch (e) { watermark = null; }
  }
  if (!watermark || typeof watermark.totalStaleEntries !== 'number') {
    writeFileWithRetry(WATERMARK_PATH, JSON.stringify({ totalStaleEntries: totalStale, note: 'High-water mark for check_lang_staleness --ratchet. Auto-lowers when the count drops; a count ABOVE it fails the gate. Do not raise by hand — re-translate or bless instead.' }, null, 2) + '\n');
    console.log(`ratchet: watermark initialised at ${totalStale}.`);
  } else if (totalStale > watermark.totalStaleEntries) {
    failed = true;
    console.error(`\n❌ ratchet: stale count ${totalStale} EXCEEDS the watermark ${watermark.totalStaleEntries}.`);
    console.error(`   An English edit landed without its re-translation. See lang_staleness/_summary.json`);
    console.error(`   (changedKeys) for what moved; re-translate + bless, or revert the English edit.`);
  } else if (totalStale < watermark.totalStaleEntries) {
    writeFileWithRetry(WATERMARK_PATH, JSON.stringify({ ...watermark, totalStaleEntries: totalStale }, null, 2) + '\n');
    if (!QUIET) console.log(`✓ ratchet: stale count dropped ${watermark.totalStaleEntries} -> ${totalStale}; watermark lowered.`);
  } else if (!QUIET) {
    console.log(`✓ ratchet: stale count holding at the watermark (${totalStale}).`);
  }
}

process.exit(failed ? 1 : 0);
