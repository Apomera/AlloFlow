#!/usr/bin/env node
'use strict';

// Add only missing, validated English fallback leaves to every language pack.
// Existing translations are never replaced. This is intentionally incremental:
// the full ui_strings catalog is much larger than the pack contract, while the
// main-shell catalog and explicit runtime keys are the surfaces that must be
// present in every deployed pack.
//
// Usage:
//   node dev-tools/i18n/merge_main_ui_missing.cjs          # dry run
//   node dev-tools/i18n/merge_main_ui_missing.cjs --apply
//   node dev-tools/i18n/merge_main_ui_missing.cjs --lang=french --apply

const fs = require('node:fs');
const path = require('node:path');
const {
  ENGLISH_ADDITIONS,
  LANGUAGE_CODES,
  isMainUiKey,
  PACK_REQUIRED_KEYS,
} = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const APPLY = process.argv.includes('--apply');
const langArg = process.argv.find((arg) => arg.startsWith('--lang='));
const requestedSlug = langArg ? langArg.slice('--lang='.length) : null;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function mergeMissing(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
      mergeMissing(target[key], value);
    } else if (target[key] === undefined) {
      target[key] = value;
    }
  }
}

function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out[full] = child;
  }
  return out;
}

function getDeep(target, dottedKey) {
  return dottedKey.split('.').reduce((value, key) => value == null ? undefined : value[key], target);
}

function setDeep(target, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function placeholders(value) {
  return [...String(value).replace(/\\u\{[0-9a-fA-F]+\}/g, '').matchAll(/\{[^{}]+\}/g)].map((match) => match[0]).sort();
}

function replaceFile(file, text) {
  // OneDrive can briefly hold a hydrated file open. Writing a same-directory
  // temporary and replacing it is more reliable than opening the destination
  // directly, and leaves no partial JSON if the first open is refused.
  const temporary = `${file}.reconcile-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

const ui = readJson(path.join(ROOT, 'ui_strings.js'));
mergeMissing(ui, ENGLISH_ADDITIONS);
const english = flatten(ui);
const targetKeys = [...new Set([
  ...Object.keys(english).filter(isMainUiKey),
  ...PACK_REQUIRED_KEYS,
])].sort();
const errors = [];
for (const key of targetKeys) {
  if (typeof english[key] !== 'string' || !english[key].trim()) errors.push(`English source is not a non-empty string: ${key}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const availableSlugs = Object.keys(LANGUAGE_CODES);
if (requestedSlug && !availableSlugs.includes(requestedSlug)) {
  console.error(`Unknown language slug: ${requestedSlug}`);
  process.exit(2);
}
const slugs = requestedSlug ? [requestedSlug] : availableSlugs;
let totalMissing = 0;
let totalWritten = 0;
let totalAlreadyPresent = 0;
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
  const flat = flatten(pack);
  const missingKeys = [];
  for (const key of targetKeys) {
    const current = getDeep(pack, key);
    if (current === undefined || current === null || (typeof current === 'string' && !current.trim())) {
      missingKeys.push(key);
      continue;
    }
    if (typeof current !== 'string') {
      errors.push(`${slug}: ${key} resolves to a non-string object; refusing to clobber it`);
      continue;
    }
    if (placeholders(current).join('|') !== placeholders(english[key]).join('|')) {
      errors.push(`${slug}: placeholder mismatch ${key}`);
    }
  }
  totalMissing += missingKeys.length;
  totalAlreadyPresent += targetKeys.length - missingKeys.length;
  if (APPLY && missingKeys.length) {
    for (const key of missingKeys) setDeep(pack, key, english[key]);
    const out = JSON.stringify(pack, null, 2) + '\n';
    replaceFile(rootFile, out);
    replaceFile(mirrorFile, out);
    totalWritten += missingKeys.length;
  }
  report.push({ slug, missing: missingKeys.length });
}

if (errors.length) {
  console.error(`merge_main_ui_missing: ${errors.length} problem(s); nothing written.`);
  for (const error of errors.slice(0, 80)) console.error(`  - ${error}`);
  if (errors.length > 80) console.error(`  ...and ${errors.length - 80} more`);
  process.exit(1);
}

console.log(`merge_main_ui_missing: ${targetKeys.length} required keys x ${slugs.length} pack(s)`);
console.log(`  Missing fallback leaves: ${totalMissing}`);
console.log(`  Already present: ${totalAlreadyPresent}`);
console.log(`  ${APPLY ? `Added ${totalWritten} English fallback leaves to root/deploy mirrors.` : 'Dry run only; pass --apply to add missing English fallback leaves.'}`);
for (const item of report.filter((entry) => entry.missing > 0)) {
  console.log(`  ${item.slug.padEnd(24)} ${String(item.missing).padStart(4)} missing`);
}
