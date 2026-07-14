#!/usr/bin/env node
// apply_help_mode_translations.cjs — Merge hand-translated help-mode tooltips
// into lang/*.js packs under the `help_mode` namespace. Same payload shape and
// safety as apply_word_sounds_translations.cjs.
//
//   { "<lang_slug>": { "<help_key>": "...", ... }, ... }
//
// Usage:
//   node dev-tools/i18n/apply_help_mode_translations.cjs <payload.json> [--dry-run]

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');

const argv = process.argv.slice(2);
const PAYLOAD = argv.find(a => !a.startsWith('--'));
const DRY_RUN = argv.includes('--dry-run');

if (!PAYLOAD) { console.error('Usage: apply_help_mode_translations.cjs <payload.json> [--dry-run]'); process.exit(2); }
if (!fs.existsSync(PAYLOAD)) { console.error('Payload not found: ' + PAYLOAD); process.exit(2); }

const payload = JSON.parse(fs.readFileSync(PAYLOAD, 'utf8'));
const ts = 'handtl-help-20260621';

const summary = [];
for (const [slug, entries] of Object.entries(payload)) {
  const langPath = path.join(LANG_DIR, slug + '.js');
  if (!fs.existsSync(langPath)) { summary.push({ slug, status: 'lang-pack-not-found' }); continue; }
  let langJson;
  try { langJson = JSON.parse(fs.readFileSync(langPath, 'utf8')); }
  catch (err) { summary.push({ slug, status: 'parse-error', error: err.message }); continue; }
  if (!langJson.help_mode || typeof langJson.help_mode !== 'object') langJson.help_mode = {};
  let merged = 0;
  for (const [key, value] of Object.entries(entries)) {
    if (typeof value !== 'string') continue;
    langJson.help_mode[key] = value;
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
