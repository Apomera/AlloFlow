// Resolve the six keys where ui_strings.js disagrees with the tool's own English.
//
//   node dev-tools/wc_fix_master_drift.cjs --dry
//   node dev-tools/wc_fix_master_drift.cjs --write
//
// THE BUG. The host resolves pack -> master -> caller fallback, so for any key
// present in the master the MASTER WINS and the fallback written beside the
// t() call is dead. In these six cases somebody edited the copy in the source
// and never updated the master, so the edit never took effect - in English or
// in any of the 63 languages.
//
// Two of the six are not cosmetic:
//   · water_cycle_keyboard_shortcuts_1_throu - the spoken shortcut list omits G
//     (Guided Walkthrough) and Escape (exit Focus Canvas), both of which the tool
//     implements and both of which it declares in aria-keyshortcuts. A screen
//     reader user is told a different set of keys than the ones that work.
//   · healthy_buffers_cool_headwater_streams - the source adds the hedge
//     "Outcomes are hand-authored teaching indices, not field measurements,
//     forecasts, or project guarantees." The master drops it, so a modelled
//     outcome is presented without its caveat.
//
// The source is taken as canonical for all six: it is the later edit, and for
// the two above it is demonstrably the correct one.
//
// NOTE FOR TRANSLATION: changing the master English makes the existing pack
// translations of these six keys correspond to superseded English. They are
// listed on completion so they can be re-translated.
'use strict';

const fs = require('fs');
const WRITE = process.argv.includes('--write');
const FILES = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'];

const collected = JSON.parse(fs.readFileSync('dev-tools/.cache/wc_pilot_keys.json', 'utf8'));
const wanted = collected.all;
const master0 = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8')).stem.watercycle;

const drift = Object.keys(wanted)
  .filter((k) => k in master0 && master0[k] !== wanted[k])
  .sort();

console.log(`drifted keys: ${drift.length}`);
for (const k of drift) {
  console.log(`\n  ${k}`);
  console.log(`    master (renders today): ${JSON.stringify(master0[k]).slice(0, 120)}`);
  console.log(`    source (intended)     : ${JSON.stringify(wanted[k]).slice(0, 120)}`);
}
if (!drift.length) process.exit(0);

function apply(file) {
  let src = fs.readFileSync(file, 'utf8');
  for (const k of drift) {
    // Match the key line only within the file; the key names here are unique
    // across the document, and the count is asserted rather than assumed.
    const re = new RegExp(`(\\n\\s*${JSON.stringify(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`, 'g');
    const hits = src.match(re) || [];
    if (hits.length !== 1) throw new Error(`${file}: ${k} matched ${hits.length} lines`);
    src = src.replace(re, (whole, head) => head + JSON.stringify(wanted[k]));
  }
  const parsed = JSON.parse(src);
  for (const k of drift) {
    if (parsed.stem.watercycle[k] !== wanted[k]) throw new Error(`${file}: ${k} did not round-trip`);
  }
  return { file, src };
}

const results = FILES.map(apply);
if (!WRITE) { console.log('\n(dry run - pass --write to apply)'); process.exit(0); }

for (const r of results) fs.writeFileSync(r.file, r.src);
for (const r of results) {
  const wc = JSON.parse(fs.readFileSync(r.file, 'utf8')).stem.watercycle;
  const ok = drift.filter((k) => wc[k] === wanted[k]).length;
  console.log(`\n  verified on disk ${r.file}: ${ok}/${drift.length}`);
}
console.log('\nRE-TRANSLATE these keys in every pack that already has them:');
for (const k of drift) console.log(`  ${k}`);
