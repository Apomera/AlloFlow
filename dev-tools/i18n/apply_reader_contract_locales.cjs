#!/usr/bin/env node
// Scoped locale batches. English copy and unrelated pack keys are never written.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const BATCHES = { contract: { file: 'reader-contract-locales.json', keys: 66 }, recovery: { file: 'reader-recovery-locales.json', keys: 34 }, terms: { file: 'reader-terms-locales.json', keys: 17 } };
const LOCALES = ['spanish_latin_america', 'spanish_castilian', 'arabic', 'chinese_simplified', 'thai'];
const lookup = (object, key) => key.split('.').reduce((value, part) => value && value[part], object);
const placeholders = value => [...String(value).matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
function validatePayload(payload, english, expectedKeys = 66) {
  const keys = Object.keys(payload.english || {});
  if (payload.schemaVersion !== 1 || keys.length !== expectedKeys) throw Error('Expected the frozen ' + expectedKeys + '-key reader contract.');
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
function run(apply = false, batch = 'contract') {
  const names = batch === 'all' ? Object.keys(BATCHES) : [batch];
  if (names.some(name => !Object.hasOwn(BATCHES, name))) throw Error('Use --batch=contract, --batch=recovery, --batch=terms or --batch=all.');
  const english = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8'));
  const mirrorEnglish = JSON.parse(fs.readFileSync(path.join(ROOT, 'desktop/web-app/public/ui_strings.js'), 'utf8'));
  const keys = [], values = Object.fromEntries(LOCALES.map(locale => [locale, {}]));
  for (const name of names) {
    const spec = BATCHES[name], payload = JSON.parse(fs.readFileSync(path.join(ROOT, 'translations', spec.file), 'utf8'));
    const batchKeys = validatePayload(payload, english, spec.keys);
    for (const key of batchKeys) {
      if (keys.includes(key)) throw Error('Duplicate owned key across batches: ' + key);
      if (lookup(mirrorEnglish, key) !== payload.english[key]) throw Error('English mirror copy changed: ' + key);
      keys.push(key);
    }
    for (const locale of LOCALES) Object.assign(values[locale], payload.locales[locale]);
  }
  const changes = [];
  for (const locale of LOCALES) for (const prefix of ['lang', 'desktop/web-app/public/lang']) {
    const file = path.join(ROOT, prefix, locale + '.js');
    const original = fs.readFileSync(file, 'utf8'), pack = JSON.parse(original);
    const next = mergePack(pack, values[locale]);
    const missing = keys.filter(key => lookup(pack, key) !== values[locale][key]);
    if (missing.length) changes.push({ file, original, contents: JSON.stringify(next, null, 2) + (original.endsWith('\n') ? '\n' : '') });
  }
  if (!apply && changes.length) throw Error(changes.length + ' packs need the scoped merge; run with --apply --batch=' + batch + '.');
  // Validate every payload/pack before writing; recheck each target immediately before its atomic replacement.
  for (const change of changes) if (fs.readFileSync(change.file, 'utf8') !== change.original) throw Error('Pack changed during merge: ' + change.file);
  for (const change of changes) {
    if (fs.readFileSync(change.file, 'utf8') !== change.original) throw Error('Pack changed during merge: ' + change.file);
    const temporary = change.file + '.reader-locale-' + process.pid + '.tmp';
    try { fs.writeFileSync(temporary, change.contents); fs.renameSync(temporary, change.file); }
    finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  }
  return { batches: names, keys: keys.length, locales: LOCALES.length, changedFiles: changes.length, mode: apply ? 'apply' : 'check' };
}
function parseArgs(args) {
  let apply = false, mode, batch = 'contract', seenBatch = false;
  for (const arg of args) {
    if (arg === '--apply' || arg === '--check') { if (mode) throw Error('Choose one of --check or --apply.'); mode = arg; apply = arg === '--apply'; }
    else if (/^--batch=(contract|recovery|terms|all)$/.test(arg) && !seenBatch) { batch = arg.slice(8); seenBatch = true; }
    else throw Error('Use --check (default) or --apply, and --batch=contract|recovery|terms|all.');
  }
  return { apply, batch };
}
module.exports = { validatePayload, mergePack, placeholders, lookup, run, parseArgs };
if (require.main === module) { const { apply, batch } = parseArgs(process.argv.slice(2)); console.log(JSON.stringify(run(apply, batch), null, 2)); }
