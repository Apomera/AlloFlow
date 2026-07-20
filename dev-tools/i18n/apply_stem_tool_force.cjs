#!/usr/bin/env node
// apply_stem_tool_force.cjs <tool> <handtl.json> [--only-passthrough] [--dry-run]
//
// Companion to apply_stem_tool_translations.cjs, which MERGES and never clobbers
// an existing key. That is correct for first-time fills, but makes it impossible
// to REDO a pack that was already filled badly — a normal apply reports "+0 keys"
// and silently changes nothing.
//
// Why this exists (2026-07-20): 14 solarsystem code-switch packs were written
// under guidance that framed "keep English" as authentic register. They landed
// ~93% English (i.e. the explanatory prose was never translated). Re-running the
// normal apply cannot fix them.
//
// SAFETY: --only-passthrough (recommended for redos) overwrites ONLY keys whose
// current pack value is byte-identical to the English source — i.e. exactly the
// untranslated leftovers. Keys that already hold a real translation are never
// touched, so a redo can add coverage but cannot regress prior good work.
// Without the flag, every key present in the handtl is overwritten.
//
// Only keys present in stem_<tool>_en.json are written (typo guard), matching
// the merge script. Packs are canonical 2-space JSON + trailing newline.
//
// Exit codes: 0 ok · 2 usage/setup error
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const tool = args[0];
const handtlPath = args[1];
const ONLY_PASSTHROUGH = args.includes('--only-passthrough');
const DRY_RUN = args.includes('--dry-run');

if (!tool || !handtlPath || handtlPath.startsWith('--')) {
  console.error('Usage: apply_stem_tool_force.cjs <tool> <handtl.json> [--only-passthrough] [--dry-run]');
  process.exit(2);
}
const enPath = path.join(__dirname, 'stem_' + tool + '_en.json');
if (!fs.existsSync(enPath)) { console.error('Missing English source: ' + enPath); process.exit(2); }
const EN = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const validKeys = new Set(Object.keys(EN));
const handtl = JSON.parse(fs.readFileSync(handtlPath, 'utf8'));

console.log('mode: ' + (ONLY_PASSTHROUGH ? 'ONLY-PASSTHROUGH (safe redo)' : 'FULL OVERWRITE') + (DRY_RUN ? ' + DRY-RUN' : ''));

let packs = 0, totalChanged = 0;
for (const [pack, trans] of Object.entries(handtl)) {
  const file = path.join(ROOT, 'lang', pack + '.js');
  if (!fs.existsSync(file)) { console.log('  ⚠ no pack: ' + pack + ' — skipped'); continue; }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.stem || typeof data.stem !== 'object') { console.log('  ⚠ ' + pack + ' has no stem namespace — skipped'); continue; }
  const tgt = (data.stem[tool] && typeof data.stem[tool] === 'object') ? data.stem[tool] : {};

  let changed = 0, added = 0, skippedTranslated = 0, bad = 0, stillEnglish = 0;
  for (const [k, v] of Object.entries(trans)) {
    if (!validKeys.has(k)) { bad++; continue; }
    if (typeof v !== 'string' || !v) continue;
    const cur = tgt[k];
    if (cur === undefined) { tgt[k] = v; added++; if (v === EN[k]) stillEnglish++; continue; }
    // Guard: in only-passthrough mode, leave anything already translated alone.
    if (ONLY_PASSTHROUGH && cur !== EN[k]) { skippedTranslated++; continue; }
    if (cur !== v) { tgt[k] = v; changed++; }
    if (v === EN[k]) stillEnglish++;
  }

  data.stem[tool] = tgt;
  if (!DRY_RUN) fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');

  const total = Object.keys(tgt).length;
  console.log('  ' + pack.padEnd(22) +
    'changed ' + String(changed).padStart(4) +
    ' | added ' + String(added).padStart(4) +
    ' | kept-translated ' + String(skippedTranslated).padStart(4) +
    ' | still-EN ' + String(stillEnglish).padStart(4) +
    ' | total ' + total +
    (bad ? ' (' + bad + ' unknown-key skipped)' : ''));
  packs++; totalChanged += changed;
}
console.log('\n' + (DRY_RUN ? '[dry-run] would update ' : 'Updated ') + packs + ' pack(s), ' + totalChanged + ' key(s) rewritten.');
