#!/usr/bin/env node
// merge_blueprint_keys.cjs — Merge the hand-translated blueprint.* +
// chat_guide.* strings (the AI-guide chips, blueprint card, archive, template,
// STOP/progress copy) into the language packs. Modeled on merge_cmd_keys.cjs:
// ZERO network calls, add-only (never touches an existing key), and the packs
// are verified byte-faithful under JSON.parse -> stringify(null, 2), so the
// diff is exactly the added keys.
//
// Input per language: dev-tools/i18n/blueprint_translations/<slug>.json
//   (flat dotted keys; same key set as blueprint_keys_en.json)
// karen + chin_falam have no staging file BY DESIGN (their families are served
// by the runtime-AI fallback, which a written key would block) — they SKIP.
//
// Usage:
//   node dev-tools/i18n/merge_blueprint_keys.cjs --lang-dir=desktop/web-app/public/lang [--lang=<slug>] [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TR_DIR = path.join(__dirname, 'blueprint_translations');
const EN = JSON.parse(fs.readFileSync(path.join(__dirname, 'blueprint_keys_en.json'), 'utf8'));
const EN_KEYS = Object.keys(EN);

const argv = process.argv.slice(2);
const arg = (n, d) => { const f = '--' + n + '='; const h = argv.find(a => a.startsWith(f)); return h ? h.slice(f.length) : (argv.includes('--' + n) ? true : d); };
const ONLY = arg('lang', null);
const DRY = !!arg('dry-run', false);
const LANG_DIR = path.isAbsolute(String(arg('lang-dir', ''))) ? arg('lang-dir') : path.join(ROOT, String(arg('lang-dir', 'desktop/web-app/public/lang')));

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
  if (!fs.existsSync(trPath)) { console.log(`  SKIP ${slug}: no translation file (karen/chin_falam = by design)`); return null; }
  if (!fs.existsSync(packPath)) { console.log(`  SKIP ${slug}: no pack`); return null; }
  const tr = JSON.parse(fs.readFileSync(trPath, 'utf8'));
  const rawBefore = fs.readFileSync(packPath, 'utf8');
  const pack = JSON.parse(rawBefore);

  // placeholder integrity gate, per key, before anything is written
  for (const [k, v] of Object.entries(tr)) {
    const ph = (EN[k] || '').match(/\{[a-z]+\}/g) || [];
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

let slugs;
if (ONLY) slugs = [ONLY];
else slugs = fs.readdirSync(LANG_DIR).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, ''));

console.log(`merge_blueprint_keys: ${EN_KEYS.length} canonical keys | ${slugs.length} pack(s)${DRY ? ' | DRY RUN' : ''}`);
const results = slugs.map(mergeOne).filter(Boolean);
const tot = results.reduce((a, r) => a + r.added, 0);
console.log(`Done: +${tot} keys across ${results.length} pack(s).`);
