#!/usr/bin/env node
// extract_behavior_lens_keys.cjs — Extract every t('behavior_lens.X') call in
// behavior_lens_module.js along with its English fallback string, compare to
// the canonical behavior_lens namespace in ui_strings.js, and emit a
// translator-ready JSON dictionary of missing keys.
//
// Why this exists:
//   The module already routes ~1,540 strings through t(), most with English
//   fallbacks (`t('key') || 'English'`). The English-source-of-truth lives in
//   ui_strings.js. When a developer adds a new t() call but forgets to add the
//   key to ui_strings.js, the t() returns the dotted-key string verbatim and
//   the UI shows literal "behavior_lens.foo.bar" text. Translators also can't
//   produce a translation because the key has no English to translate from.
//
// What it does:
//   1. Parses behavior_lens_module.js for two shapes:
//        t('behavior_lens.X') || 'fallback'      (preferred — fallback IS the English)
//        t('behavior_lens.X')                    (no fallback — flagged as needing one)
//   2. Loads the canonical ui_strings.js behavior_lens namespace as JSON.
//   3. Reports:
//        - Missing keys (used in source but not in ui_strings.js)
//        - Hardcoded fallbacks that differ from ui_strings.js (source drift)
//        - Keys in ui_strings.js that no source code references (orphans)
//   4. Writes the missing-key dictionary to dev-tools/i18n/missing_behavior_lens_keys.json
//      ready for hand-merge into ui_strings.js or translator handoff.
//
// Usage:
//   node dev-tools/i18n/extract_behavior_lens_keys.cjs
//   node dev-tools/i18n/extract_behavior_lens_keys.cjs --write   (auto-merge into ui_strings.js)

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE_SRC = path.join(ROOT, 'behavior_lens_module.js');
const UI_STRINGS = path.join(ROOT, 'ui_strings.js');
const OUT_DIR = path.join(ROOT, 'dev-tools', 'i18n');
const OUT_MISSING = path.join(OUT_DIR, 'missing_behavior_lens_keys.json');
const OUT_DRIFT = path.join(OUT_DIR, 'drift_behavior_lens_keys.json');
const OUT_ORPHAN = path.join(OUT_DIR, 'orphan_behavior_lens_keys.json');

const WRITE = process.argv.includes('--write');

// ─── Parse module source for t() calls ─────────────────────────────────────
const src = fs.readFileSync(MODULE_SRC, 'utf8');

// Match every t('behavior_lens.X') call site. Surrounding context handles
// optional fallback in any of these shapes:
//   t('key') || 'fallback'
//   t('key') || "fallback"
//   t('key') || `template`
//   (t && t('key')) || 'fallback'             ← `_v2` polish-pass keys use this
//   (t && t('key')) || `template ${x}`
//
// The regex captures the key and the position; a follow-up scan checks the
// next ~60 chars for any of those `|| <stringish>` shapes.
const T_KEY_RE = /\bt\(\s*(['"`])(behavior_lens\.[a-zA-Z0-9_.]+)\1\s*\)/g;
const FALLBACK_AFTER_RE = /^\)?\s*\|\|\s*(['"`])((?:\\.|(?!\1).)*)\1/;

const sourceKeys = new Map(); // key → { fallback?: string, count: number, firstLine?: number }

// Helper to find approximate line number for an offset.
const lineForOffset = (text, offset) => text.slice(0, offset).split('\n').length;

let m;
while ((m = T_KEY_RE.exec(src)) !== null) {
  const key = m[2];
  const afterIdx = m.index + m[0].length;
  // Look for fallback in the next ~1500 chars. The shape can be
  // `) || 'X'` (guarded) or ` || \`X\`` (direct). The disclaimer copy
  // strings on print pipelines can be >250 chars so be generous.
  const tail = src.slice(afterIdx, afterIdx + 1500);
  const fbMatch = tail.match(FALLBACK_AFTER_RE);
  const fallback = fbMatch ? fbMatch[2] : undefined;
  const existing = sourceKeys.get(key) || { count: 0 };
  existing.count++;
  if (fallback !== undefined && !existing.fallback) {
    // Decode escape sequences (e.g. \n, \', \\) the way JS would.
    try {
      existing.fallback = JSON.parse(`"${fallback.replace(/\\(?!["\\nrtbf/u])/g, '\\\\').replace(/"/g, '\\"').replace(/\\'/g, "'")}"`);
    } catch {
      existing.fallback = fallback; // keep raw if decode fails
    }
  }
  if (!existing.firstLine) existing.firstLine = lineForOffset(src, m.index);
  sourceKeys.set(key, existing);
}

console.log(`Source: ${sourceKeys.size} unique t('behavior_lens.*') keys across ${[...sourceKeys.values()].reduce((s, v) => s + v.count, 0)} call sites`);
const withFallback = [...sourceKeys.values()].filter(v => v.fallback != null).length;
console.log(`        ${withFallback} have an English fallback (${sourceKeys.size - withFallback} do NOT)`);

// ─── Load canonical English from ui_strings.js ─────────────────────────────
const uiJson = JSON.parse(fs.readFileSync(UI_STRINGS, 'utf8'));
const blNamespace = uiJson.behavior_lens || {};

// Flatten nested namespace into 'a.b.c' form.
const flatten = (obj, prefix = '') => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, full));
    else out[full] = v;
  }
  return out;
};

const flatBl = flatten(blNamespace);
const definedKeys = new Set(Object.keys(flatBl).map(k => 'behavior_lens.' + k));

console.log(`ui_strings.js: ${definedKeys.size} defined behavior_lens.* keys`);

// ─── Compute the three buckets ─────────────────────────────────────────────
const missing = {};       // key → fallback (or null if no fallback)
const drift = {};         // key → { source: 'X', uiStrings: 'Y' }
const noFallback = [];    // keys without a fallback in source — needs a human

for (const [key, info] of sourceKeys) {
  const localKey = key.slice('behavior_lens.'.length);
  if (!definedKeys.has(key)) {
    missing[key] = info.fallback || null;
    if (!info.fallback) noFallback.push({ key, firstLine: info.firstLine });
    continue;
  }
  const uiValue = flatBl[localKey];
  if (info.fallback && typeof uiValue === 'string' && info.fallback !== uiValue) {
    drift[key] = { source: info.fallback, uiStrings: uiValue, line: info.firstLine };
  }
}

const orphans = [];
for (const key of definedKeys) {
  if (!sourceKeys.has(key)) orphans.push(key);
}

console.log(`\n── Gap report ──`);
console.log(`  Missing keys (in source, not in ui_strings.js): ${Object.keys(missing).length}`);
console.log(`    - with English fallback (ready to merge):     ${Object.keys(missing).length - noFallback.length}`);
console.log(`    - WITHOUT English fallback (need a human):    ${noFallback.length}`);
console.log(`  Drift (source fallback != ui_strings.js value): ${Object.keys(drift).length}`);
console.log(`  Orphans (in ui_strings.js, not in source):      ${orphans.length}`);

// ─── Write outputs ─────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_MISSING, JSON.stringify(missing, null, 2) + '\n');
fs.writeFileSync(OUT_DRIFT, JSON.stringify(drift, null, 2) + '\n');
fs.writeFileSync(OUT_ORPHAN, JSON.stringify(orphans, null, 2) + '\n');
console.log(`\nWrote:`);
console.log(`  ${OUT_MISSING}`);
console.log(`  ${OUT_DRIFT}`);
console.log(`  ${OUT_ORPHAN}`);

if (noFallback.length > 0) {
  console.log(`\n${noFallback.length} key(s) missing an English fallback in source:`);
  noFallback.slice(0, 10).forEach(x => console.log(`  - ${x.key}  (first used at line ${x.firstLine})`));
  if (noFallback.length > 10) console.log(`  ... ${noFallback.length - 10} more`);
}

// ─── Optionally merge missing keys into ui_strings.js ──────────────────────
if (WRITE && Object.keys(missing).length > 0) {
  console.log(`\n--write specified: merging ${Object.keys(missing).length} missing keys into ui_strings.js...`);

  // Reconstruct ui_strings.js with the missing keys inserted into the
  // behavior_lens namespace, preserving the existing nested structure.
  const updated = JSON.parse(JSON.stringify(uiJson)); // deep clone
  updated.behavior_lens = updated.behavior_lens || {};

  for (const [fullKey, fallback] of Object.entries(missing)) {
    if (fallback == null) continue; // skip keys without fallback — needs human
    const localKey = fullKey.slice('behavior_lens.'.length);
    const segments = localKey.split('.');
    let cursor = updated.behavior_lens;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (cursor[seg] == null || typeof cursor[seg] !== 'object' || Array.isArray(cursor[seg])) {
        cursor[seg] = {};
      }
      cursor = cursor[seg];
    }
    const leaf = segments[segments.length - 1];
    if (cursor[leaf] == null) cursor[leaf] = fallback;
  }

  fs.writeFileSync(UI_STRINGS, JSON.stringify(updated, null, 2) + '\n');
  console.log(`  ✓ ui_strings.js updated. Re-run without --write to verify gap closed.`);
}

process.exit(0);
