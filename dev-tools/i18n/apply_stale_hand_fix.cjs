#!/usr/bin/env node
// apply_stale_hand_fix.cjs — apply HAND-WRITTEN corrections for keys flagged stale by
// check_lang_staleness.cjs / check_staleness_delta.cjs.
//
// This is the hand-translation counterpart to merge_stale_translations.cjs (which calls
// Gemini). AlloFlow's standing policy is hand-translated packs only, so the translation
// itself is authored in-chat; this tool is only the safe write path for it.
//
// Payload shape (UTF-8 JSON, real characters — never \uXXXX escapes, see
// feedback_never_hand_type_nonlatin_codepoints):
//   { "<lang_slug>": { "<dotted.key>": "<translation>", ... }, ... }
//
// Guards, all of which refuse the whole payload rather than write a bad pack:
//   - the key must exist in the canonical English (ui_strings.js / help_strings.js)
//   - the value must be a non-empty string
//   - placeholder parity: every ${slot}, {slot} and <tag> in the English must appear
//     the same number of times in the translation (the class merge_stale also guards)
//   - passthrough: a value byte-equal to the English is refused unless --allow-passthrough
//     (legitimate for a DNT term or a language that shares the wording)
//
// Writes lang/<slug>.js AND the deploy mirror desktop/web-app/public/lang/<slug>.js,
// which are byte-identical by contract, with a *.bak.<stamp> backup of each.
//
// USAGE
//   node dev-tools/i18n/apply_stale_hand_fix.cjs <payload.json>            # dry run (default)
//   node dev-tools/i18n/apply_stale_hand_fix.cjs <payload.json> --apply
//   ... --allow-passthrough        # permit values identical to the English
//   ... --stamp <label>            # backup suffix (default: handfix-<UTC date>)
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lang_src_lib.cjs');

const argv = process.argv.slice(2);
const PAYLOAD = argv.find(a => !a.startsWith('--'));
const APPLY = argv.includes('--apply');
const ALLOW_PASSTHROUGH = argv.includes('--allow-passthrough');
const stampIdx = argv.indexOf('--stamp');
const STAMP = stampIdx !== -1 ? argv[stampIdx + 1] : 'handfix-' + new Date().toISOString().slice(0, 10);

const MIRROR_DIR = path.join(L.ROOT, 'desktop', 'web-app', 'public', 'lang');

if (!PAYLOAD || !fs.existsSync(PAYLOAD)) {
  console.error('Usage: apply_stale_hand_fix.cjs <payload.json> [--apply] [--allow-passthrough]');
  process.exit(2);
}

const payload = JSON.parse(fs.readFileSync(PAYLOAD, 'utf8'));
const source = L.loadSourceStrings();
const knownSlugs = new Set(L.getLangSlugs());

// Placeholders whose count must survive translation: ${slot}, {slot}, and HTML tags.
function placeholders(s) {
  const out = [];
  for (const m of String(s).matchAll(/\$\{[^}]*\}|\{[^}\s]+\}|<\/?[a-zA-Z][^>]*>/g)) out.push(m[0]);
  return out.sort();
}

const errors = [];
const packCache = {};
let entryCount = 0;
for (const [slug, entries] of Object.entries(payload)) {
  if (!knownSlugs.has(slug)) { errors.push(`${slug}: not a translatable pack slug`); continue; }
  for (const [key, value] of Object.entries(entries)) {
    entryCount++;
    const where = `${slug} / ${key}`;
    if (!(key in source)) { errors.push(`${where}: key absent from the English source`); continue; }
    // A handful of canonical keys are array-valued (about.features_list.items,
    // codenames.*). Those are structured data: only the leaf strings may change.
    if (Array.isArray(source[key])) {
      if (!Array.isArray(value)) { errors.push(`${where}: English is an array; value must be an array too`); continue; }
      // Shape is checked against the PACK's own current array, not the English: packs
      // legitimately hold fewer entries than the English (a gap-report concern), and a
      // surgical edit must not add, drop, or reorder items. Falls back to the English
      // shape only when the pack has no array yet.
      const packNow = (packCache[slug] || (packCache[slug] = L.loadPack(slug) || {}))[key];
      const ref = Array.isArray(packNow) ? packNow : source[key];
      const refLabel = Array.isArray(packNow) ? 'the pack' : 'the English';
      if (value.length !== ref.length) {
        errors.push(`${where}: array length ${value.length} != ${refLabel} ${ref.length}`); continue;
      }
      const shape = a => a.map(o => (o && typeof o === 'object' ? Object.keys(o).sort().join(',') : typeof o)).join('|');
      if (shape(value) !== shape(ref)) { errors.push(`${where}: array item shape differs from ${refLabel}`); continue; }
      continue;
    }
    if (typeof value !== 'string' || !value.trim()) { errors.push(`${where}: value must be a non-empty string`); continue; }
    const en = L.norm(source[key]);
    if (!ALLOW_PASSTHROUGH && L.norm(value) === en) { errors.push(`${where}: value is identical to the English (passthrough)`); continue; }
    const pe = placeholders(en).join(''), pv = placeholders(value).join('');
    if (pe !== pv) {
      errors.push(`${where}: placeholder/tag mismatch\n      English: ${placeholders(en).join(' ') || '(none)'}\n      Yours:   ${placeholders(value).join(' ') || '(none)'}`);
    }
  }
}

if (errors.length) {
  console.error(`apply_stale_hand_fix: ${errors.length} problem(s) — nothing written.`);
  for (const e of errors.slice(0, 40)) console.error('  - ' + e);
  if (errors.length > 40) console.error(`  ...and ${errors.length - 40} more`);
  process.exit(1);
}

// This tree lives under OneDrive, which intermittently holds a handle on a file it is
// syncing and makes writeFileSync throw UNKNOWN (errno -4094). A run that dies between
// the pack write and the mirror write leaves the two copies disagreeing, so write to a
// sibling temp file and rename it into place (rename is atomic and far less contended),
// retrying briefly while the sync settles.
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function writeFileResilient(target, data) {
  const tmp = target + '.tmp.' + process.pid;
  for (let attempt = 1; ; attempt++) {
    try {
      fs.writeFileSync(tmp, data, 'utf8');
      fs.renameSync(tmp, target);
      return;
    } catch (err) {
      try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) { /* best effort */ }
      if (attempt >= 5) throw err;
      sleepSync(200 * attempt);
    }
  }
}

function copyFileResilient(from, to) {
  for (let attempt = 1; ; attempt++) {
    try {
      fs.copyFileSync(from, to);
      return;
    } catch (err) {
      if (attempt >= 5) throw err;
      sleepSync(200 * attempt);
    }
  }
}

function setDeep(obj, dotPath, value) {
  const segs = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    if (cur[segs[i]] == null || typeof cur[segs[i]] !== 'object' || Array.isArray(cur[segs[i]])) cur[segs[i]] = {};
    cur = cur[segs[i]];
  }
  cur[segs[segs.length - 1]] = value;
}

const report = [];
for (const [slug, entries] of Object.entries(payload)) {
  const packPath = path.join(L.LANG_DIR, slug + '.js');
  const mirrorPath = path.join(MIRROR_DIR, slug + '.js');
  const raw = fs.readFileSync(packPath, 'utf8');
  const json = JSON.parse(raw.replace(/^﻿/, ''));
  const flatBefore = L.flatten(json);
  let changed = 0, noop = 0;
  for (const [key, value] of Object.entries(entries)) {
    if (flatBefore[key] !== undefined && L.norm(flatBefore[key]) === L.norm(value)) { noop++; continue; }
    setDeep(json, key, value);
    changed++;
  }
  const out = JSON.stringify(json, null, 2) + '\n';

  // `changed` is measured against the ROOT pack only. If a previous run died between
  // the two writes (OneDrive throws EUNKNOWN on a locked file often enough to matter),
  // root is current while the mirror still holds the old text — and root-only accounting
  // calls that "already correct" and skips it, leaving the deploy serving the bad string.
  // Compare the mirror against the exact bytes we are about to write instead.
  const mirrorExists = fs.existsSync(mirrorPath);
  const mirrorStale = mirrorExists && fs.readFileSync(mirrorPath, 'utf8') !== out;

  if (APPLY && (changed || mirrorStale)) {
    if (changed) {
      copyFileResilient(packPath, packPath + '.bak.' + STAMP);
      writeFileResilient(packPath, out);
    }
    if (mirrorExists) {
      copyFileResilient(mirrorPath, mirrorPath + '.bak.' + STAMP);
      writeFileResilient(mirrorPath, out);
    } else {
      report.push({ slug, changed, noop, mirrorStale, warn: 'mirror missing' });
      continue;
    }
    // Re-read and re-parse BOTH copies: a pack that no longer parses is the one failure
    // this tool must never leave behind, and the mirror is the copy that actually ships.
    JSON.parse(fs.readFileSync(packPath, 'utf8'));
    JSON.parse(fs.readFileSync(mirrorPath, 'utf8'));
  }
  report.push({ slug, changed, noop, mirrorStale });
}

const totalChanged = report.reduce((n, r) => n + r.changed, 0);
const totalNoop = report.reduce((n, r) => n + r.noop, 0);
console.log(`apply_stale_hand_fix: ${entryCount} entry/entries across ${report.length} pack(s) — ` +
  `${totalChanged} to write, ${totalNoop} already correct. ${APPLY ? 'WRITTEN' : 'DRY RUN (pass --apply to write)'}`);
for (const r of report) {
  console.log(`  ${r.slug.padEnd(24)} ${String(r.changed).padStart(3)} changed` +
    (r.noop ? `, ${r.noop} already correct` : '') +
    (r.mirrorStale ? `  [mirror out of sync${APPLY ? ' — resynced' : ', will resync'}]` : '') +
    (r.warn ? `  [${r.warn}]` : ''));
}
if (APPLY) console.log(`\nBackups: lang/<slug>.js.bak.${STAMP} (+ mirror). Next: npm run verify:stale-delta, then bless the keys.`);
