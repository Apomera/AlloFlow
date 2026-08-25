#!/usr/bin/env node
'use strict';

// Recover reviewed command/palette catalog translations that are currently
// masked by an English value already present in a pack. This is intentionally
// separate from reconcile_cmd_pack_coverage.cjs: that tool fills missing leaves
// but must not overwrite anything, while this tool overwrites only an exact
// English passthrough with a non-English catalog value whose placeholders match.
// Existing non-English/stale values are never touched.
//
// Usage:
//   node dev-tools/i18n/merge_cmd_catalog_translations.cjs
//   node dev-tools/i18n/merge_cmd_catalog_translations.cjs --json
//   node dev-tools/i18n/merge_cmd_catalog_translations.cjs --apply
//   node dev-tools/i18n/merge_cmd_catalog_translations.cjs --lang=french --apply

const fs = require('node:fs');
const path = require('node:path');
const { LANGUAGE_CODES } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const CATALOG_DIR = path.join(__dirname, 'cmd_translations');
const ENGLISH_FILE = path.join(__dirname, 'cmd_keys_en.json');
const APPLY = process.argv.includes('--apply');
const JSON_OUTPUT = process.argv.includes('--json');
const QUIET = process.argv.includes('--quiet');
const langArg = process.argv.find((arg) => arg.startsWith('--lang='));
const requestedSlug = langArg ? langArg.slice('--lang='.length).trim() : null;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function getDeep(target, dottedKey) {
  return dottedKey.split('.').reduce((value, key) => value == null ? undefined : value[key], target);
}

function setDeep(target, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function placeholderTokens(value) {
  return [...String(value)
    .matchAll(/\$\{[^}]+\}|\{[^{}]+\}|<\/?[a-zA-Z][^>]*>/g)]
    .map((match) => match[0])
    .sort();
}

function sameTokens(left, right) {
  const a = placeholderTokens(left);
  const b = placeholderTokens(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function replaceFile(file, text) {
  const temporary = `${file}.cmd-catalog-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    try {
      fs.renameSync(temporary, file);
    } catch (error) {
      // OneDrive may transiently deny a rename of a deployed mirror while a
      // validated temporary file is available. A direct copy is the safe
      // fallback; the pair was checked before any writes begin.
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      fs.copyFileSync(temporary, file);
    }
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function fail(message) {
  if (JSON_OUTPUT) console.log(JSON.stringify({ errors: [message] }, null, 2));
  else console.error(`merge_cmd_catalog_translations: ${message}`);
  process.exit(2);
}

if (!fs.existsSync(ENGLISH_FILE)) fail('cmd_keys_en.json is missing');
const english = readJson(ENGLISH_FILE);
const canonicalKeys = Object.keys(english).sort();
const allSlugs = Object.keys(LANGUAGE_CODES);
if (requestedSlug && !allSlugs.includes(requestedSlug)) fail(`unknown language slug: ${requestedSlug}`);
const slugs = requestedSlug ? [requestedSlug] : allSlugs;

const errors = [];
const plans = [];
let totalEnglishPassthrough = 0;
let totalRecoverable = 0;
let totalPlaceholderRejects = 0;
let totalCatalogMissing = 0;

for (const slug of slugs) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  const catalogFile = path.join(CATALOG_DIR, `${slug}.json`);
  if (!fs.existsSync(rootFile) || !fs.existsSync(mirrorFile)) {
    errors.push(`${slug}: root or deployed pack is missing`);
    continue;
  }
  if (!fs.existsSync(catalogFile)) {
    errors.push(`${slug}: cmd translation catalog is missing`);
    continue;
  }
  const rootText = fs.readFileSync(rootFile, 'utf8');
  const mirrorText = fs.readFileSync(mirrorFile, 'utf8');
  if (rootText !== mirrorText) {
    errors.push(`${slug}: root/public mirror drift; refusing to overwrite it`);
    continue;
  }
  const pack = readJson(rootFile);
  const catalog = readJson(catalogFile);
  const recoveries = [];
  let englishPassthrough = 0;
  let placeholderRejects = 0;
  let catalogMissing = 0;
  for (const key of canonicalKeys) {
    const current = getDeep(pack, key);
    if (current !== english[key]) continue;
    englishPassthrough += 1;
    const candidate = catalog[key];
    if (typeof candidate !== 'string' || !candidate.trim()) {
      catalogMissing += 1;
      continue;
    }
    if (candidate === english[key]) continue;
    if (!sameTokens(candidate, english[key])) {
      placeholderRejects += 1;
      continue;
    }
    recoveries.push({ key, value: candidate });
  }
  totalEnglishPassthrough += englishPassthrough;
  totalRecoverable += recoveries.length;
  totalPlaceholderRejects += placeholderRejects;
  totalCatalogMissing += catalogMissing;
  plans.push({ slug, rootFile, mirrorFile, pack, recoveries, englishPassthrough, placeholderRejects, catalogMissing });
}

if (errors.length) {
  if (JSON_OUTPUT) console.log(JSON.stringify({ errors }, null, 2));
  else {
    console.error(`merge_cmd_catalog_translations: ${errors.length} problem(s); nothing written.`);
    errors.slice(0, 80).forEach((error) => console.error(`  - ${error}`));
  }
  process.exit(1);
}

let totalWritten = 0;
for (const plan of plans) {
  if (!APPLY || plan.recoveries.length === 0) continue;
  for (const { key, value } of plan.recoveries) setDeep(plan.pack, key, value);
  const output = JSON.stringify(plan.pack, null, 2) + '\n';
  replaceFile(plan.rootFile, output);
  replaceFile(plan.mirrorFile, output);
  totalWritten += plan.recoveries.length;
}

const report = {
  apply: APPLY,
  languageCount: plans.length,
  canonicalKeyCount: canonicalKeys.length,
  totalEnglishPassthrough,
  totalRecoverable,
  totalWritten,
  totalPlaceholderRejects,
  totalCatalogMissing,
  perPack: Object.fromEntries(plans.map((plan) => [plan.slug, {
    englishPassthrough: plan.englishPassthrough,
    recoverable: plan.recoveries.length,
    placeholderRejects: plan.placeholderRejects,
    catalogMissing: plan.catalogMissing,
  }])),
  recoverableKeysByPack: Object.fromEntries(plans
    .filter((plan) => plan.recoveries.length)
    .map((plan) => [plan.slug, plan.recoveries.map(({ key }) => key)])),
};

if (JSON_OUTPUT) {
  console.log(JSON.stringify(report, null, 2));
} else if (!QUIET) {
  console.log(`merge_cmd_catalog_translations: ${canonicalKeys.length} canonical keys x ${plans.length} pack(s)`);
  console.log(`  English passthroughs inspected: ${totalEnglishPassthrough}`);
  console.log(`  Recoverable catalog translations: ${totalRecoverable}`);
  console.log(`  Placeholder rejects: ${totalPlaceholderRejects}`);
  console.log(`  Catalog gaps: ${totalCatalogMissing}`);
  console.log(`  ${APPLY ? `Wrote ${totalWritten} translated value(s) to root/deploy mirrors.` : 'Dry run only; pass --apply to write.'}`);
} else {
  console.log(`merge_cmd_catalog_translations: passthrough=${totalEnglishPassthrough}; recoverable=${totalRecoverable}; written=${totalWritten}; placeholderRejects=${totalPlaceholderRejects}; catalogMissing=${totalCatalogMissing}`);
}

