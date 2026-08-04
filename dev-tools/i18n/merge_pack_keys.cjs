#!/usr/bin/env node
// merge_pack_keys.cjs — GENERIC pack merger for any hand-translated key set.
//
// Generalizes merge_cmd_keys.cjs / merge_blueprint_keys.cjs: point it at a
// "set" name and it merges dev-tools/i18n/<set>_translations/<slug>.json into
// the language packs, using dev-tools/i18n/<set>_keys_en.json as canon.
//
// Contract (same as the lanes it generalizes):
//   - ZERO network calls; merging only.
//   - ADD-ONLY: an existing key in a pack is never overwritten.
//   - Placeholder-integrity gate per key BEFORE anything is written.
//   - Packs are byte-faithful under JSON.parse -> stringify(_, null, 2), so the
//     diff is exactly the added keys. Verify with --check-faithful.
//   - A pack with no staging file SKIPS (e.g. karen/chin_falam are served by the
//     runtime-AI fallback, which a written key would block).
//
// Usage:
//   node dev-tools/i18n/merge_pack_keys.cjs --set=stem_timeline --dry-run
//   node dev-tools/i18n/merge_pack_keys.cjs --set=stem_timeline --lang-dir=lang
//   node dev-tools/i18n/merge_pack_keys.cjs --set=stem_timeline --lang-dir=desktop/web-app/public/lang
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const arg = (n, d) => { const f = '--' + n + '='; const h = argv.find(a => a.startsWith(f)); return h ? h.slice(f.length) : (argv.includes('--' + n) ? true : d); };

const SET = arg('set', null);
if (!SET) { console.error('merge_pack_keys: --set=<name> is required'); process.exit(2); }
const DRY = !!arg('dry-run', false);
const ONLY = arg('lang', null);
const LANG_DIR = path.isAbsolute(String(arg('lang-dir', ''))) ? String(arg('lang-dir')) : path.join(ROOT, String(arg('lang-dir', 'lang')));

const TR_DIR = path.join(__dirname, SET + '_translations');
const EN_PATH = path.join(__dirname, SET + '_keys_en.json');
for (const p of [TR_DIR, EN_PATH]) {
  if (!fs.existsSync(p)) { console.error('merge_pack_keys: missing ' + p); process.exit(2); }
}
const EN = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
const EN_KEYS = Object.keys(EN);

function setDeep(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (typeof cur[p] !== 'object' || cur[p] === null) cur[p] = {};
    cur = cur[p];
  }
  const leaf = parts[parts.length - 1];
  if (Object.prototype.hasOwnProperty.call(cur, leaf)) return false; // add-only
  cur[leaf] = value;
  return true;
}

function mergeOne(slug) {
  const trPath = path.join(TR_DIR, slug + '.json');
  const packPath = path.join(LANG_DIR, slug + '.js');
  if (!fs.existsSync(trPath)) { console.log(`  SKIP ${slug}: no staging file`); return null; }
  if (!fs.existsSync(packPath)) { console.log(`  SKIP ${slug}: no pack`); return null; }
  const tr = JSON.parse(fs.readFileSync(trPath, 'utf8'));
  const rawBefore = fs.readFileSync(packPath, 'utf8');

  // byte-faithfulness guard: refuse to rewrite a pack we would reformat
  const reserialized = JSON.stringify(JSON.parse(rawBefore), null, 2);
  if (rawBefore.trimEnd() !== reserialized.trimEnd()) {
    throw new Error(`${slug}: pack is NOT byte-faithful under parse->stringify; merging would reformat unrelated regions`);
  }
  const pack = JSON.parse(rawBefore);

  // placeholder integrity, checked across the whole set before any write
  for (const [k, v] of Object.entries(tr)) {
    const ph = (EN[k] || '').match(/\{[a-zA-Z]+\}/g) || [];
    for (const p of ph) if (!String(v).includes(p)) throw new Error(`${slug}: ${k} lost placeholder ${p}`);
  }

  const missing = EN_KEYS.filter(k => !(k in tr) || String(tr[k]).trim() === '');
  let added = 0, skipped = 0;
  for (const k of EN_KEYS) {
    const val = (k in tr && String(tr[k]).trim() !== '') ? tr[k] : EN[k];
    if (setDeep(pack, k, val)) added++; else skipped++;
  }

  if (!DRY) {
    const out = JSON.stringify(pack, null, 2) + (rawBefore.endsWith('\n') ? '\n' : '');
    JSON.parse(out); // self-check
    fs.writeFileSync(packPath, out, 'utf8');
  }
  console.log(`  ${DRY ? '[dry] ' : ''}${slug}: +${added} added, ${skipped} already-present, ${missing.length} EN-fallback`);
  return { slug, added, skipped };
}

const slugs = ONLY ? [String(ONLY)] : fs.readdirSync(LANG_DIR).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, ''));
console.log(`merge_pack_keys [${SET}]: ${EN_KEYS.length} canonical keys | ${slugs.length} pack(s) | dir=${path.relative(ROOT, LANG_DIR)}${DRY ? ' | DRY RUN' : ''}`);
const results = slugs.map(mergeOne).filter(Boolean);
console.log(`Done: +${results.reduce((a, r) => a + r.added, 0)} keys across ${results.length} pack(s).`);
