#!/usr/bin/env node
// apply_hand_translations.cjs — Merge a hand-translated payload of the 46 new
// behavior_lens keys into the corresponding lang/*.js packs. Input is a JSON
// file with shape:
//   { "<lang_slug>": { "hub.riskscreen_desc_v2": "...", ... }, ... }
//
// For each language present in the payload:
//   - load lang/<slug>.js
//   - merge every provided key into the behavior_lens.* namespace (creating
//     nested objects as needed)
//   - write back as pretty JSON
//   - back up the prior pack to *.bak.handtl-<timestamp>
//
// Then re-run lang_pack_gap_report.cjs to confirm missingKeys dropped.
//
// Usage:
//   node dev-tools/i18n/apply_hand_translations.cjs <payload.json>
//   node dev-tools/i18n/apply_hand_translations.cjs <payload.json> --dry-run

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');

const argv = process.argv.slice(2);
const PAYLOAD = argv.find(a => !a.startsWith('--'));
const DRY_RUN = argv.includes('--dry-run');

if (!PAYLOAD) {
  console.error('Usage: apply_hand_translations.cjs <payload.json> [--dry-run]');
  process.exit(2);
}
if (!fs.existsSync(PAYLOAD)) {
  console.error('Payload not found: ' + PAYLOAD);
  process.exit(2);
}

const payload = JSON.parse(fs.readFileSync(PAYLOAD, 'utf8'));
const ts = 'handtl-20260604';

function setDeep(obj, dotPath, value) {
  const segs = dotPath.split('.');
  let cursor = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    if (cursor[segs[i]] == null || typeof cursor[segs[i]] !== 'object' || Array.isArray(cursor[segs[i]])) {
      cursor[segs[i]] = {};
    }
    cursor = cursor[segs[i]];
  }
  cursor[segs[segs.length - 1]] = value;
}

const summary = [];
for (const [slug, entries] of Object.entries(payload)) {
  const langPath = path.join(LANG_DIR, slug + '.js');
  if (!fs.existsSync(langPath)) {
    summary.push({ slug, status: 'lang-pack-not-found' });
    continue;
  }
  let langJson;
  try { langJson = JSON.parse(fs.readFileSync(langPath, 'utf8')); }
  catch (err) { summary.push({ slug, status: 'parse-error', error: err.message }); continue; }
  if (!langJson.behavior_lens || typeof langJson.behavior_lens !== 'object') langJson.behavior_lens = {};
  let merged = 0;
  for (const [localKey, value] of Object.entries(entries)) {
    if (typeof value !== 'string') continue;
    setDeep(langJson.behavior_lens, localKey, value);
    merged++;
  }
  if (!DRY_RUN && merged > 0) {
    fs.copyFileSync(langPath, langPath + '.bak.' + ts);
    fs.writeFileSync(langPath, JSON.stringify(langJson, null, 2) + '\n');
  }
  summary.push({ slug, status: 'ok', merged });
}

const ok = summary.filter(s => s.status === 'ok');
const errors = summary.filter(s => s.status !== 'ok');
console.log(`Applied to ${ok.length} language pack${ok.length === 1 ? '' : 's'} (${DRY_RUN ? 'DRY-RUN' : 'WRITTEN'}):`);
ok.forEach(s => console.log(`  ${s.slug}: ${s.merged} keys`));
if (errors.length > 0) {
  console.log(`\nErrors (${errors.length}):`);
  errors.forEach(s => console.log(`  ${s.slug}: ${s.status}${s.error ? ' — ' + s.error.slice(0, 80) : ''}`));
}
if (!DRY_RUN) {
  console.log(`\nBackups: lang/<slug>.js.bak.${ts}`);
  console.log(`Recommended: re-run lang_pack_gap_report.cjs`);
}
