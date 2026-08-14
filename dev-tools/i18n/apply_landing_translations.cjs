#!/usr/bin/env node
// apply_landing_translations.cjs — merge hand-written translations for the
// landing-page keys into every lang/*.js pack and its deploy mirror.
//
//   node dev-tools/i18n/apply_landing_translations.cjs <payload.json> [--dry-run]
//
// Payload shape (root-relative dotted keys, unlike the behavior_lens-scoped
// apply_hand_translations.cjs):
//   { "<lang_slug>": { "input.qs_book": "…", "input.actions.books_short": "…" } }
//
// Guards, each earned:
//   · refuses to overwrite an existing value — a pack may already carry curated
//     copy for a key, and a bulk merge must never quietly replace it;
//   · rejects a translation identical to the English source, which is how a
//     half-finished batch used to slip through looking complete;
//   · re-parses each pack after writing, because one malformed pack takes the
//     entire UI down for that language;
//   · writes the deploy mirror in the same pass, since a pack that lands in
//     lang/ but not in desktop/web-app/public/lang/ ships as English anyway.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG = path.join(ROOT, 'lang');
const MIRROR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const payloadPath = argv.find((a) => !a.startsWith('--'));
if (!payloadPath) { console.error('usage: apply_landing_translations.cjs <payload.json> [--dry-run]'); process.exit(2); }

const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
const english = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8'));

function get(obj, dotted) {
  return dotted.split('.').reduce((acc, p) => (acc == null ? undefined : acc[p]), obj);
}
function setDeep(obj, dotted, value) {
  const segs = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    if (cur[segs[i]] == null || typeof cur[segs[i]] !== 'object' || Array.isArray(cur[segs[i]])) cur[segs[i]] = {};
    cur = cur[segs[i]];
  }
  cur[segs[segs.length - 1]] = value;
}

// Scripts where a Latin-script token in the value is a red flag rather than a
// legitimate loanword. Used only to report, never to block.
const NON_LATIN = /^(amharic|arabic|bengali|burmese|chinese_simplified|chinese_traditional|dari|farsi|greek|gujarati|hebrew|hindi|japanese|kannada|karen|khmer|korean|lao|malayalam|marathi|nepali|pashto|punjabi|russian|tamil|telugu|thai|tigrinya|ukrainian|urdu)$/;

const problems = [];
const results = [];

for (const [slug, entries] of Object.entries(payload)) {
  const src = path.join(LANG, slug + '.js');
  if (!fs.existsSync(src)) { problems.push(`${slug}: pack not found`); continue; }
  let pack;
  try { pack = JSON.parse(fs.readFileSync(src, 'utf8')); }
  catch (err) { problems.push(`${slug}: unparseable before edit — ${err.message}`); continue; }

  let merged = 0; const skipped = [];
  for (const [key, value] of Object.entries(entries)) {
    if (typeof value !== 'string' || !value.trim()) { problems.push(`${slug}/${key}: empty`); continue; }
    const existing = get(pack, key);
    if (existing !== undefined) { skipped.push(key); continue; }
    const en = get(english, key);
    if (en && value === en && slug !== 'english') {
      problems.push(`${slug}/${key}: identical to the English source`);
      continue;
    }
    setDeep(pack, key, value);
    merged += 1;
  }

  const out = JSON.stringify(pack, null, 2) + '\n';
  try { JSON.parse(out); } catch (err) { problems.push(`${slug}: would write invalid JSON — ${err.message}`); continue; }

  if (!DRY && merged > 0) {
    fs.writeFileSync(src, out, 'utf8');
    const mir = path.join(MIRROR, slug + '.js');
    if (fs.existsSync(MIRROR)) fs.writeFileSync(mir, out, 'utf8');
  }

  // Advisory: untranslated Latin-script residue in a non-Latin pack.
  const latinResidue = NON_LATIN.test(slug)
    ? Object.entries(entries).filter(([, v]) => /\b(the|your|book|source|paste|link|topic|search|write|open|find)\b/i.test(v)).map(([k]) => k)
    : [];
  results.push({ slug, merged, skipped, latinResidue });
}

const total = results.reduce((n, r) => n + r.merged, 0);
console.log(`${DRY ? 'DRY-RUN' : 'WRITTEN'}: ${total} translation(s) across ${results.length} pack(s)`);
for (const r of results) {
  if (r.skipped.length) console.log(`  ${r.slug}: ${r.merged} merged, ${r.skipped.length} already present (${r.skipped.join(', ')})`);
  if (r.latinResidue.length) console.log(`  ${r.slug}: English words left in ${r.latinResidue.join(', ')}`);
}
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log('  ' + p);
  process.exitCode = 1;
}
