#!/usr/bin/env node
// extract_passthroughs.cjs — For each lang pack named on the command line,
// emit a JSON file listing every behavior_lens.* key whose translated value
// is BYTE-IDENTICAL to the canonical English in ui_strings.js. These are
// the passthrough strings that translators need to finish translating.
//
// Output: dev-tools/i18n/passthroughs/<langSlug>.json
//   { langSlug, total, items: { "behavior_lens.X.Y": "English value", ... } }
//
// Usage:
//   node dev-tools/i18n/extract_passthroughs.cjs <slug> [<slug>...]
//   node dev-tools/i18n/extract_passthroughs.cjs --all

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const UI_STRINGS = path.join(ROOT, 'ui_strings.js');
const LANG_DIR = path.join(ROOT, 'lang');
const OUT_DIR = path.join(__dirname, 'passthroughs');

const flatten = (obj, prefix = '') => {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, full));
    else out[full] = v;
  }
  return out;
};

const en = JSON.parse(fs.readFileSync(UI_STRINGS, 'utf8'));
const enFlat = flatten(en.behavior_lens || {});

let slugs;
if (process.argv.includes('--all')) {
  slugs = fs.readdirSync(LANG_DIR).filter(f => f.endsWith('.js')).map(f => f.replace(/\.js$/, ''));
} else {
  slugs = process.argv.slice(2).filter(s => !s.startsWith('--'));
}
if (slugs.length === 0) {
  console.error('Usage: extract_passthroughs.cjs <slug> [<slug>...]  OR  --all');
  process.exit(2);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const slug of slugs) {
  const langPath = path.join(LANG_DIR, slug + '.js');
  if (!fs.existsSync(langPath)) { console.log(`skip ${slug}: file not found`); continue; }
  let langJson;
  try { langJson = JSON.parse(fs.readFileSync(langPath, 'utf8')); }
  catch (e) { console.log(`skip ${slug}: parse error`); continue; }
  const langFlat = flatten(langJson.behavior_lens || {});

  const passthroughs = {};
  for (const [key, enVal] of Object.entries(enFlat)) {
    const langVal = langFlat[key];
    if (typeof langVal === 'string' && typeof enVal === 'string' && langVal === enVal) {
      passthroughs[key] = enVal;
    }
  }

  const outPath = path.join(OUT_DIR, slug + '.json');
  fs.writeFileSync(outPath, JSON.stringify({
    langSlug: slug,
    canonicalEnglishKeys: Object.keys(enFlat).length,
    passthroughCount: Object.keys(passthroughs).length,
    items: passthroughs
  }, null, 2) + '\n');
  console.log(`${slug}: ${Object.keys(passthroughs).length} passthroughs → ${path.relative(ROOT, outPath)}`);
}
