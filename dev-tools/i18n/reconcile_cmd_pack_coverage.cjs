#!/usr/bin/env node
'use strict';

// Keep every command-palette key present in every language pack. Existing
// values are never replaced. If an out-of-band translation catalog contains a
// value for a missing key, use it; otherwise add the canonical English value
// as an explicit, safe fallback so the runtime and all pack shapes stay in
// sync until a reviewed translation is available.
//
// Usage:
//   node dev-tools/i18n/reconcile_cmd_pack_coverage.cjs
//   node dev-tools/i18n/reconcile_cmd_pack_coverage.cjs --apply
//   node dev-tools/i18n/reconcile_cmd_pack_coverage.cjs --lang=french --apply

const fs = require('node:fs');
const path = require('node:path');
const { extractFromSource, SRC, OUT } = require('./extract_cmd_keys.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const TRANSLATIONS_DIR = path.join(__dirname, 'cmd_translations');
const APPLY = process.argv.includes('--apply');
const GATE = process.argv.includes('--gate');
const langArg = process.argv.find((arg) => arg.startsWith('--lang='));
const requestedSlug = langArg ? langArg.slice('--lang='.length) : null;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function getDeep(target, dottedKey) {
  return dottedKey.split('.').reduce((value, key) => value == null ? undefined : value[key], target);
}

function setDeep(target, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (cursor[part] === undefined) cursor[part] = {};
    if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) {
      throw new Error(`cannot create ${dottedKey}: ${parts.slice(0, i + 1).join('.')} is not an object`);
    }
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function placeholders(value) {
  return [...String(value).matchAll(/\{[^{}]+\}/g)].map((match) => match[0]).sort();
}

function sameList(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function replaceFile(file, text) {
  const temporary = `${file}.cmd-reconcile-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function writePair(rootFile, mirrorFile, pack) {
  const output = JSON.stringify(pack, null, 2) + '\n';
  JSON.parse(output);
  replaceFile(rootFile, output);
  replaceFile(mirrorFile, output);
}

function manifestIsFresh(manifest, fresh) {
  const manifestKeys = Object.keys(manifest);
  const freshKeys = Object.keys(fresh);
  if (manifestKeys.length !== freshKeys.length) return false;
  return freshKeys.every((key) => manifest[key] === fresh[key]);
}

const errors = [];
const manifest = readJson(OUT);
const freshManifest = extractFromSource(SRC);
if (!manifestIsFresh(manifest, freshManifest)) {
  errors.push('cmd_keys_en.json is stale; run node dev-tools/i18n/extract_cmd_keys.cjs first');
}
const english = manifestIsFresh(manifest, freshManifest) ? manifest : freshManifest;
const canonicalKeys = Object.keys(english).sort();

const availableSlugs = fs.readdirSync(LANG_DIR)
  .filter((file) => file.endsWith('.js') && !file.startsWith('.'))
  .map((file) => file.replace(/\.js$/, ''))
  .sort();
if (requestedSlug && !availableSlugs.includes(requestedSlug)) {
  console.error(`Unknown language slug: ${requestedSlug}`);
  process.exit(2);
}
const slugs = requestedSlug ? [requestedSlug] : availableSlugs;

const translationCache = new Map();
function translationFor(slug) {
  if (translationCache.has(slug)) return translationCache.get(slug);
  const file = path.join(TRANSLATIONS_DIR, `${slug}.json`);
  const value = fs.existsSync(file) ? readJson(file) : {};
  translationCache.set(slug, value);
  return value;
}

for (const key of canonicalKeys) {
  if (typeof english[key] !== 'string' || !english[key].trim()) {
    errors.push(`canonical ${key} is not a non-empty string`);
  }
}

let totalMissing = 0;
let totalEnglishFallback = 0;
let totalCatalogTranslation = 0;
let totalWritten = 0;
const report = [];

for (const slug of slugs) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(rootFile) || !fs.existsSync(mirrorFile)) {
    errors.push(`${slug}: root or deploy mirror file is missing`);
    continue;
  }
  const rootText = fs.readFileSync(rootFile, 'utf8');
  const mirrorText = fs.readFileSync(mirrorFile, 'utf8');
  if (rootText !== mirrorText) {
    errors.push(`${slug}: root/public mirror drift; refusing to overwrite it`);
    continue;
  }

  const pack = readJson(rootFile);
  const catalog = translationFor(slug);
  const missing = [];
  let englishFallback = 0;
  let catalogTranslation = 0;
  for (const key of canonicalKeys) {
    const current = getDeep(pack, key);
    if (current !== undefined && current !== null && String(current).trim() !== '') {
      if (typeof current !== 'string') errors.push(`${slug}: ${key} resolves to a non-string value`);
      continue;
    }
    const candidate = catalog[key];
    const candidateIsSafe = typeof candidate === 'string'
      && candidate.trim()
      && sameList(placeholders(candidate), placeholders(english[key]));
    const value = candidateIsSafe ? candidate : english[key];
    missing.push({ key, value, fallback: !candidateIsSafe });
    if (candidateIsSafe) catalogTranslation += 1;
    else englishFallback += 1;
  }
  totalMissing += missing.length;
  totalEnglishFallback += englishFallback;
  totalCatalogTranslation += catalogTranslation;
  if (APPLY && missing.length) {
    for (const item of missing) setDeep(pack, item.key, item.value);
    writePair(rootFile, mirrorFile, pack);
    totalWritten += missing.length;
  }
  report.push({ slug, missing: missing.length, englishFallback, catalogTranslation });
}

if (errors.length) {
  console.error(`reconcile_cmd_pack_coverage: ${errors.length} problem(s); nothing written.`);
  for (const error of errors.slice(0, 80)) console.error(`  - ${error}`);
  if (errors.length > 80) console.error(`  ...and ${errors.length - 80} more`);
  process.exit(1);
}

const commandCount = canonicalKeys.filter((key) => key.startsWith('cmd.')).length;
const paletteCount = canonicalKeys.length - commandCount;
console.log(`reconcile_cmd_pack_coverage: ${canonicalKeys.length} canonical keys (${commandCount} cmd + ${paletteCount} palette) x ${slugs.length} pack(s)`);
console.log(`  Missing leaves before apply: ${totalMissing}`);
console.log(`  Catalog translations used: ${totalCatalogTranslation}`);
console.log(`  English fallbacks used: ${totalEnglishFallback}`);
console.log(`  ${APPLY ? `Added ${totalWritten} missing leaves to root/deploy mirrors.` : 'Dry run only; pass --apply to add missing leaves.'}`);
for (const item of report.filter((entry) => entry.missing > 0)) {
  console.log(`  ${item.slug.padEnd(24)} ${String(item.missing).padStart(4)} missing (${item.englishFallback} English fallback, ${item.catalogTranslation} catalog)`);
}

if (GATE && !APPLY && totalMissing > 0) {
  console.error(`reconcile_cmd_pack_coverage: gate failed with ${totalMissing} missing canonical leaves; run with --apply first.`);
  process.exit(1);
}
