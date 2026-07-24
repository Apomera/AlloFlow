#!/usr/bin/env node
// verify_orphans_full_repo.cjs — A behavior_lens.* key that no `t('behavior_lens.X')`
// call references is a candidate orphan, but we must check across the WHOLE
// codebase (AlloFlowANTI.txt + every CDN module + every test) before deleting
// it from ui_strings.js + 56 lang packs. A reference found anywhere — even in
// a comment that explains the migration — should be enough to keep the key.
//
// Output: orphan_verified_dead.json (safe to delete) and orphan_verified_kept.json
// (some other module / file references this — do NOT delete).

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const ORPHAN_INPUT = path.join(__dirname, 'orphan_behavior_lens_keys.json');
const OUT_DEAD = path.join(__dirname, 'orphan_verified_dead.json');
const OUT_KEPT = path.join(__dirname, 'orphan_verified_kept.json');

// Files to ignore — never canonical, can have stale references.
const IGNORE = [
  /[\\/]node_modules[\\/]/,
  /[\\/]\.git[\\/]/,
  /[\\/]desktop/web-app[\\/]/,        // mirror, not source
  /[\\/]coverage[\\/]/,
  /[\\/]dist[\\/]/,
  /[\\/]lang[\\/]/,                    // lang packs themselves contain the keys; not a "reference"
  /[\\/]dev-tools[\\/]i18n[\\/]/,      // our own i18n tooling (includes this verifier — would self-match)
  /ui_strings\.js\.bak$/,
  /[\\/]_archive[\\/]/,                // frozen historical snapshots — not live source
  /\.bak$/,                            // any backup file
  /nonshareabletest\.txt$/,            // local scratch file
];

const orphans = JSON.parse(fs.readFileSync(ORPHAN_INPUT, 'utf8'));
console.log(`Checking ${orphans.length} orphan keys against full repo...`);

// Walk repo to collect text content. Cap file size at 10 MB to skip lockfiles etc.
const FILE_BUDGET = 10 * 1024 * 1024;
const allFiles = [];

function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (IGNORE.some(re => re.test(full))) continue;
    if (e.isDirectory()) walk(full);
    else if (e.isFile()) {
      try {
        const st = fs.statSync(full);
        if (st.size > FILE_BUDGET) continue;
        // Skip binary-ish
        if (/\.(png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|ico|pdf|zip|tar|gz|wav|mp3|mp4)$/i.test(full)) continue;
        allFiles.push(full);
      } catch {}
    }
  }
}
walk(ROOT);
console.log(`Scanning ${allFiles.length} files...`);

// Build a corpus blob with all file content concatenated — fast contains check.
let corpus = '';
for (const f of allFiles) {
  try { corpus += fs.readFileSync(f, 'utf8') + '\n'; } catch {}
}
console.log(`Corpus: ${(corpus.length / 1024 / 1024).toFixed(1)} MB`);

// For each orphan key, search for either:
//   t('behavior_lens.X')
//   t("behavior_lens.X")
//   "behavior_lens.X"   (string-literal reference, e.g. in a tests assertion)
// Skip the orphan's own ui_strings.js definition by requiring the reference
// be in a function call shape OR be the right-hand side of a string assignment
// distinct from a JSON value.
const dead = [];
const kept = [];

for (const fullKey of orphans) {
  const localKey = fullKey.slice('behavior_lens.'.length);
  const callShape1 = `t('${fullKey}'`;
  const callShape2 = `t("${fullKey}"`;
  const callShape3 = `t(\`${fullKey}\``;
  // Also check the nested local-key with dot syntax — e.g. some modules might
  // do t('behavior_lens.abc.title') but the orphan is the FLAT 'behavior_lens.abc_title'.
  // We only care about the EXACT orphan key string, not aliased nested versions.

  const corpusContainsCall = corpus.includes(callShape1) || corpus.includes(callShape2) || corpus.includes(callShape3);
  // Also check for the bare key string appearance (e.g. in a HELP_STRINGS lookup or test).
  // We require the surrounding context to look like a code reference (preceded by `'`/`"`/`\`` and followed by same).
  const bareKeyShape1 = `'${fullKey}'`;
  const bareKeyShape2 = `"${fullKey}"`;
  // But bareKeyShape will match the ui_strings.js DEFINITION too. We exclude
  // ui_strings.js (and its bak) from the corpus to avoid that false positive.
  // Already done via IGNORE... wait we did NOT add ui_strings.js to IGNORE.
  // Let me do that scoping differently: count occurrences and require ≥1 in a
  // file OTHER than ui_strings.js.

  const refFiles = [];
  for (const f of allFiles) {
    if (f.endsWith('ui_strings.js') || f.endsWith('ui_strings.js.bak')) continue;
    let content;
    try { content = fs.readFileSync(f, 'utf8'); } catch { continue; }
    if (
      content.includes(callShape1) || content.includes(callShape2) || content.includes(callShape3) ||
      content.includes(bareKeyShape1) || content.includes(bareKeyShape2)
    ) {
      refFiles.push(path.relative(ROOT, f));
    }
  }

  if (refFiles.length === 0) dead.push(fullKey);
  else kept.push({ key: fullKey, referencedIn: refFiles.slice(0, 5) });
}

fs.writeFileSync(OUT_DEAD, JSON.stringify(dead, null, 2) + '\n');
fs.writeFileSync(OUT_KEPT, JSON.stringify(kept, null, 2) + '\n');

console.log(`\n── Result ──`);
console.log(`  Verified DEAD (safe to delete):  ${dead.length}`);
console.log(`  KEPT (referenced elsewhere):     ${kept.length}`);
console.log(`\nWrote:`);
console.log(`  ${OUT_DEAD}`);
console.log(`  ${OUT_KEPT}`);

if (kept.length > 0 && kept.length <= 10) {
  console.log(`\n${kept.length} key(s) kept due to references:`);
  kept.forEach(k => console.log(`  - ${k.key}  → ${k.referencedIn.join(', ')}`));
}
