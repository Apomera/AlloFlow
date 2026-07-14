#!/usr/bin/env node
// merge_cmd_keys.cjs — Merge pre-translated Ctrl+K command-palette strings into
// the lang/*.js packs. Translations are produced OUT OF BAND (a Claude workflow
// returns per-language JSON; this script does ZERO network calls — it only merges).
//
// Input per language: dev-tools/i18n/cmd_translations/<slug>.json
//   { "cmd.open_stem_lab": "Abrir el Laboratorio STEM", "palette.group.navigate": "Navegar", ... }
// (flat dotted keys, same key set as cmd_keys_en.json).
//
// Merge: nests each dotted key into the pack (pack.cmd.*, pack.palette.group.*,
// pack.palette.ctx.*, pack.palette.<leaf>), WITHOUT touching existing keys, and
// writes the pack back as JSON.stringify(_, null, 2) — proven byte-faithful, so the
// diff is exactly the added namespaces. A .bak.<ts> is written first.
//
// Usage:
//   node dev-tools/i18n/merge_cmd_keys.cjs --lang=spanish_castilian [--dry-run] [--overwrite] [--no-backup]
//   node dev-tools/i18n/merge_cmd_keys.cjs            # every <slug>.json in cmd_translations/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TR_DIR = path.join(__dirname, 'cmd_translations');
const EN = JSON.parse(fs.readFileSync(path.join(__dirname, 'cmd_keys_en.json'), 'utf8'));
const EN_KEYS = Object.keys(EN);

const argv = process.argv.slice(2);
const arg = (n, d) => { const f = '--' + n + '='; const h = argv.find(a => a.startsWith(f)); return h ? h.slice(f.length) : (argv.includes('--' + n) ? true : d); };
const ONLY = arg('lang', null);
const DRY = !!arg('dry-run', false);
const OVERWRITE = !!arg('overwrite', false);
const NOBACKUP = !!arg('no-backup', false);
const STAMP = arg('stamp', String(process.env.MERGE_STAMP || 'manual'));
const LANG_DIR = path.isAbsolute(String(arg('lang-dir', ''))) ? arg('lang-dir') : path.join(ROOT, String(arg('lang-dir', 'lang')));

function setDeep(obj, dotted, value, overwrite) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {};
    cur = cur[p];
  }
  const leaf = parts[parts.length - 1];
  if (!overwrite && Object.prototype.hasOwnProperty.call(cur, leaf)) return false;
  cur[leaf] = value;
  return true;
}

function mergeOne(slug) {
  const trPath = path.join(TR_DIR, slug + '.json');
  const packPath = path.join(LANG_DIR, slug + '.js');
  if (!fs.existsSync(trPath)) { console.log(`  SKIP ${slug}: no translation file`); return null; }
  if (!fs.existsSync(packPath)) { console.log(`  SKIP ${slug}: no pack`); return null; }
  const tr = JSON.parse(fs.readFileSync(trPath, 'utf8'));
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));

  // Coverage + passthrough (untranslated == identical to English) report.
  const missing = EN_KEYS.filter(k => !(k in tr) || tr[k] == null || String(tr[k]).trim() === '');
  const passthrough = EN_KEYS.filter(k => k in tr && String(tr[k]).trim() === String(EN[k]).trim());

  let added = 0, skipped = 0;
  for (const k of EN_KEYS) {
    const val = (k in tr && String(tr[k]).trim() !== '') ? tr[k] : EN[k]; // fall back to English for gaps
    if (setDeep(pack, k, val, OVERWRITE)) added++; else skipped++;
  }

  if (!DRY) {
    const out = JSON.stringify(pack, null, 2);
    JSON.parse(out); // self-check: still valid JSON
    if (!NOBACKUP) fs.copyFileSync(packPath, packPath + '.bak.' + STAMP);
    fs.writeFileSync(packPath, out, 'utf8');
  }
  console.log(`  ${DRY ? '[dry] ' : ''}${slug}: +${added} added, ${skipped} already-present, ${missing.length} EN-fallback, ${passthrough.length} passthrough`);
  return { slug, added, skipped, missing: missing.length, passthrough: passthrough.length };
}

let slugs;
if (ONLY) slugs = [ONLY];
else slugs = fs.readdirSync(TR_DIR).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));

console.log(`merge_cmd_keys: ${EN_KEYS.length} canonical keys | ${slugs.length} pack(s)${DRY ? ' | DRY RUN' : ''}`);
const results = slugs.map(mergeOne).filter(Boolean);
const tot = results.reduce((a, r) => a + r.added, 0);
console.log(`Done: +${tot} keys across ${results.length} pack(s).`);
