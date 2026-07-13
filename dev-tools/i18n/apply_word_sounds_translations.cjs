#!/usr/bin/env node
// apply_word_sounds_translations.cjs — Merge a hand-translated payload of the
// word_sounds.voice_pack_* keys into the corresponding lang/*.js packs. Same
// shape and safety as apply_hand_translations.cjs, but targets the
// `word_sounds` namespace instead of `behavior_lens`.
//
//   { "<lang_slug>": { "voice_pack_title": "...", ... }, ... }
//
// For each language present in the payload:
//   - load lang/<slug>.js (pure JSON)
//   - merge every provided key into the word_sounds.* namespace
//   - write back as pretty 2-space JSON
//   - back up the prior pack to *.bak.handtl-vp-<timestamp>
//
// Usage:
//   node dev-tools/i18n/apply_word_sounds_translations.cjs <payload.json> [--dry-run]

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');

const argv = process.argv.slice(2);
const PAYLOAD = argv.find(a => !a.startsWith('--'));
const DRY_RUN = argv.includes('--dry-run');

if (!PAYLOAD) { console.error('Usage: apply_word_sounds_translations.cjs <payload.json> [--dry-run]'); process.exit(2); }
if (!fs.existsSync(PAYLOAD)) { console.error('Payload not found: ' + PAYLOAD); process.exit(2); }

const payload = JSON.parse(fs.readFileSync(PAYLOAD, 'utf8'));
const ts = 'handtl-vp-20260620';

function setDeep(obj, dotPath, value) {
  const segs = dotPath.split('.');
  let cursor = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    if (cursor[segs[i]] == null || typeof cursor[segs[i]] !== 'object' || Array.isArray(cursor[segs[i]])) cursor[segs[i]] = {};
    cursor = cursor[segs[i]];
  }
  cursor[segs[segs.length - 1]] = value;
}

const summary = [];
for (const [slug, entries] of Object.entries(payload)) {
  const langPath = path.join(LANG_DIR, slug + '.js');
  if (!fs.existsSync(langPath)) { summary.push({ slug, status: 'lang-pack-not-found' }); continue; }
  let langJson;
  try { langJson = JSON.parse(fs.readFileSync(langPath, 'utf8')); }
  catch (err) { summary.push({ slug, status: 'parse-error', error: err.message }); continue; }
  if (!langJson.word_sounds || typeof langJson.word_sounds !== 'object') langJson.word_sounds = {};
  let merged = 0;
  for (const [localKey, value] of Object.entries(entries)) {
    if (typeof value !== 'string') continue;
    setDeep(langJson.word_sounds, localKey, value);
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
if (errors.length) { console.log(`\nErrors (${errors.length}):`); errors.forEach(s => console.log(`  ${s.slug}: ${s.status}${s.error ? ' — ' + s.error.slice(0, 80) : ''}`)); }
if (!DRY_RUN) console.log(`\nBackups: lang/<slug>.js.bak.${ts}`);
