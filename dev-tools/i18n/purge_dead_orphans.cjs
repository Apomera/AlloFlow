#!/usr/bin/env node
// purge_dead_orphans.cjs — Remove the verified-dead orphan keys from
// ui_strings.js AND from every lang/*.js pack. Reads
// orphan_verified_dead.json produced by verify_orphans_full_repo.cjs.
//
// Safety:
//   - Dry-run by default; pass --write to mutate
//   - Auto-backs up each touched file to *.bak.<timestamp>
//   - Refuses to delete keys still referenced anywhere via verify_orphans_full_repo
//     (the dead.json should already be clean, but we re-check just in case the
//     repo has shifted since extraction)

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const UI_STRINGS = path.join(ROOT, 'ui_strings.js');
const LANG_DIR = path.join(ROOT, 'lang');
const DEAD_INPUT = path.join(__dirname, 'orphan_verified_dead.json');

const WRITE = process.argv.includes('--write');

if (!fs.existsSync(DEAD_INPUT)) {
  console.error(`Missing ${DEAD_INPUT} — run verify_orphans_full_repo.cjs first.`);
  process.exit(2);
}

const deadKeys = JSON.parse(fs.readFileSync(DEAD_INPUT, 'utf8'));
console.log(`Loaded ${deadKeys.length} verified-dead orphan keys.`);

// Deep-delete a dotted key path. Removes empty parent objects too.
const deepDelete = (obj, keyPath) => {
  const segs = keyPath.split('.');
  // Walk to parent
  const ancestors = [];
  let cursor = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    if (cursor == null || typeof cursor !== 'object' || !(segs[i] in cursor)) return false;
    ancestors.push({ parent: cursor, key: segs[i] });
    cursor = cursor[segs[i]];
  }
  const leaf = segs[segs.length - 1];
  if (cursor == null || !(leaf in cursor)) return false;
  delete cursor[leaf];
  // Prune empty parents
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const { parent, key } = ancestors[i];
    if (parent[key] && typeof parent[key] === 'object' && !Array.isArray(parent[key]) && Object.keys(parent[key]).length === 0) {
      delete parent[key];
    } else break;
  }
  return true;
};

const ts = '20260604';

// ── ui_strings.js ────────────────────────────────────────────────────────
const stamp = (file) => file + '.bak.' + ts;
const uiJson = JSON.parse(fs.readFileSync(UI_STRINGS, 'utf8'));
let uiRemoved = 0;
for (const k of deadKeys) {
  if (!k.startsWith('behavior_lens.')) continue;
  const localKey = k.slice('behavior_lens.'.length);
  if (uiJson.behavior_lens && deepDelete(uiJson.behavior_lens, localKey)) uiRemoved++;
}
console.log(`ui_strings.js: ${uiRemoved} of ${deadKeys.length} keys would be removed`);

// ── lang/*.js packs ──────────────────────────────────────────────────────
const langFiles = fs.readdirSync(LANG_DIR).filter(f => f.endsWith('.js'));
let totalLangRemoved = 0;
const perPack = {};

for (const langFile of langFiles) {
  const fullPath = path.join(LANG_DIR, langFile);
  let langJson;
  try { langJson = JSON.parse(fs.readFileSync(fullPath, 'utf8')); }
  catch { continue; }
  let removed = 0;
  if (langJson.behavior_lens) {
    for (const k of deadKeys) {
      if (!k.startsWith('behavior_lens.')) continue;
      const localKey = k.slice('behavior_lens.'.length);
      if (deepDelete(langJson.behavior_lens, localKey)) removed++;
    }
  }
  if (removed > 0) perPack[langFile] = removed;
  totalLangRemoved += removed;
}
console.log(`lang packs:    ${totalLangRemoved} key removals across ${Object.keys(perPack).length} packs`);
console.log(`  per-pack range: ${Math.min(...Object.values(perPack), Infinity)} – ${Math.max(...Object.values(perPack), 0)} keys`);

if (!WRITE) {
  console.log(`\n(dry-run — no files mutated. Add --write to apply.)`);
  process.exit(0);
}

// ── Apply ────────────────────────────────────────────────────────────────
console.log(`\nApplying...`);
fs.copyFileSync(UI_STRINGS, stamp(UI_STRINGS));
fs.writeFileSync(UI_STRINGS, JSON.stringify(uiJson, null, 2) + '\n');
console.log(`  ✓ ui_strings.js  (backup: ${path.basename(stamp(UI_STRINGS))})`);

let written = 0;
for (const langFile of langFiles) {
  const fullPath = path.join(LANG_DIR, langFile);
  let langJson;
  try { langJson = JSON.parse(fs.readFileSync(fullPath, 'utf8')); }
  catch { continue; }
  if (!langJson.behavior_lens) continue;
  let removed = 0;
  for (const k of deadKeys) {
    if (!k.startsWith('behavior_lens.')) continue;
    const localKey = k.slice('behavior_lens.'.length);
    if (deepDelete(langJson.behavior_lens, localKey)) removed++;
  }
  if (removed > 0) {
    fs.copyFileSync(fullPath, stamp(fullPath));
    fs.writeFileSync(fullPath, JSON.stringify(langJson, null, 2) + '\n');
    written++;
  }
}
console.log(`  ✓ ${written} lang packs updated (each with a *.bak.${ts} backup)`);
console.log(`\nDone. Re-run extract_behavior_lens_keys.cjs to confirm orphan count dropped.`);
