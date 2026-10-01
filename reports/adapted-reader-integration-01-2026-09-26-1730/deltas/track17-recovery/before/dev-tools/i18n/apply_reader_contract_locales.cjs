#!/usr/bin/env node
// Scoped, repeatable locale merge. English copy and unrelated pack keys are never written.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const PAYLOAD = path.join(ROOT, 'translations/reader-contract-locales.json');
const LOCALES = ['spanish_latin_america', 'spanish_castilian', 'arabic', 'chinese_simplified', 'thai'];
const lookup = (object, key) => key.split('.').reduce((value, part) => value && value[part], object);
const placeholders = value => [...String(value).matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
function validatePayload(payload, english) {
  const keys = Object.keys(payload.english || {});
  if (payload.schemaVersion !== 1 || keys.length !== 66) throw Error('Expected the frozen 66-key reader contract.');
  if (JSON.stringify(Object.keys(payload.locales || {}).sort()) !== JSON.stringify([...LOCALES].sort())) throw Error('Unexpected locale set.');
  for (const key of keys) {
    if (!/^simplified\.[a-z_]+$/.test(key)) throw Error('Unexpected key: ' + key);
    if (lookup(english, key) !== payload.english[key]) throw Error('English copy changed; review before translating: ' + key);
  }
  for (const locale of LOCALES) {
    const values = payload.locales[locale];
    if (JSON.stringify(Object.keys(values).sort()) !== JSON.stringify([...keys].sort())) throw Error('Key coverage differs: ' + locale);
    for (const key of keys) {
      const value = values[key];
      if (typeof value !== 'string' || !value.trim() || value === key || value === payload.english[key]) throw Error('Missing translation: ' + locale + ' ' + key);
      if (JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(payload.english[key]))) throw Error('Placeholder mismatch: ' + locale + ' ' + key);
    }
  }
  return keys;
}
function mergePack(pack, values) {
  const next = { ...pack, simplified: { ...pack.simplified } };
  for (const [key, value] of Object.entries(values)) {
    const leaf = key.slice('simplified.'.length), existing = next.simplified[leaf];
    if (existing !== undefined && existing !== value) throw Error('Existing translation differs; resolve ownership first: ' + key);
    next.simplified[leaf] = value;
  }
  return next;
}
function run(apply = false) {
  const payload = JSON.parse(fs.readFileSync(PAYLOAD, 'utf8'));
  const english = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8'));
  const keys = validatePayload(payload, english);
  const mirrorEnglish = JSON.parse(fs.readFileSync(path.join(ROOT, 'desktop/web-app/public/ui_strings.js'), 'utf8'));
  for (const key of keys) if (lookup(mirrorEnglish, key) !== payload.english[key]) throw Error('English mirror copy changed: ' + key);
  const changes = [];
  for (const locale of LOCALES) for (const prefix of ['lang', 'desktop/web-app/public/lang']) {
    const file = path.join(ROOT, prefix, locale + '.js');
    const original = fs.readFileSync(file, 'utf8'), pack = JSON.parse(original);
    const next = mergePack(pack, payload.locales[locale]);
    const missing = keys.filter(key => lookup(pack, key) !== payload.locales[locale][key]);
    if (missing.length) changes.push({ file, original, contents: JSON.stringify(next, null, 2) + (original.endsWith('\n') ? '\n' : '') });
  }
  if (!apply && changes.length) throw Error(changes.length + ' packs need the scoped merge; run with --apply.');
  // Preflight every file before writing any; never copy one whole pack over another.
  for (const change of changes) {
    if (fs.readFileSync(change.file, 'utf8') !== change.original) throw Error('Pack changed during merge: ' + change.file);
    const temporary = change.file + '.reader-locale-' + process.pid + '.tmp';
    try { fs.writeFileSync(temporary, change.contents); fs.renameSync(temporary, change.file); }
    finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  }
  return { keys: keys.length, locales: LOCALES.length, changedFiles: changes.length, mode: apply ? 'apply' : 'check' };
}
module.exports = { validatePayload, mergePack, placeholders, lookup, run };
if (require.main === module) {
  if (process.argv.slice(2).some(arg => !['--apply', '--check'].includes(arg))) throw Error('Use --check (default) or --apply.');
  console.log(JSON.stringify(run(process.argv.includes('--apply')), null, 2));
}
