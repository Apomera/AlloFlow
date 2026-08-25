#!/usr/bin/env node
'use strict';

// Reconcile only literal runtime t() leaves that are absent from a selected
// language-pack surface. This is deliberately narrower than the full catalog:
// dormant content and simulation namespaces can remain sparse without making
// an active UI render a raw key.
//
// An exact same-namespace translation may be reused when the canonical English
// text is identical and the pack has exactly one non-English candidate value.
// English fallback insertion is opt-in because it closes the runtime shape gap
// but is not the same thing as a reviewed translation.
//
// Usage:
//   node dev-tools/i18n/reconcile_runtime_missing.cjs --namespace=guided
//   node dev-tools/i18n/reconcile_runtime_missing.cjs --namespace=guided --reuse-exact --apply
//   node dev-tools/i18n/reconcile_runtime_missing.cjs --namespace=guided --fallback --apply
//   node dev-tools/i18n/reconcile_runtime_missing.cjs --key=guided.tab_how --reuse-exact --apply

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { LANGUAGE_CODES } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const REUSE_EXACT = argv.includes('--reuse-exact');
const FALLBACK = argv.includes('--fallback');
const GATE = argv.includes('--gate');
const JSON_OUTPUT = argv.includes('--json');
const QUIET = argv.includes('--quiet');
const namespaceArgs = argv
  .filter((arg) => arg.startsWith('--namespace='))
  .flatMap((arg) => arg.slice('--namespace='.length).split(','))
  .map((value) => value.trim())
  .filter(Boolean);
const keyArgs = argv
  .filter((arg) => arg.startsWith('--key='))
  .map((arg) => arg.slice('--key='.length).trim())
  .filter(Boolean);
const langArg = argv.find((arg) => arg.startsWith('--lang='));
const requestedSlug = langArg ? langArg.slice('--lang='.length).trim() : null;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function flatten(value, prefix = '', out = {}) {
  if (value === null || value === undefined) return out;
  if (typeof value !== 'object' || Array.isArray(value)) {
    if (prefix) out[prefix] = value;
    return out;
  }
  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
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

function placeholders(value) {
  return [...String(value)
    .replace(/\\u\{[0-9a-fA-F]+\}/g, '')
    .matchAll(/\{[^{}]+\}/g)]
    .map((match) => match[0])
    .sort();
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTargetKey(key) {
  return namespaceArgs.some((namespace) => key === namespace || key.startsWith(`${namespace}.`))
    || keyArgs.includes(key);
}

function replaceFile(file, text) {
  const temporary = `${file}.runtime-reconcile-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function fail(message) {
  if (JSON_OUTPUT) console.log(JSON.stringify({ error: message }, null, 2));
  else console.error(`reconcile_runtime_missing: ${message}`);
  process.exit(2);
}

if (APPLY && !namespaceArgs.length && !keyArgs.length) {
  fail('--apply requires --namespace= or --key= so a broad catalog write cannot happen accidentally');
}
if (APPLY && !REUSE_EXACT && !FALLBACK) {
  fail('--apply requires --reuse-exact and/or --fallback to make the write policy explicit');
}
if (requestedSlug && !Object.prototype.hasOwnProperty.call(LANGUAGE_CODES, requestedSlug)) {
  fail(`unknown language slug: ${requestedSlug}`);
}

const scanner = spawnSync(process.execPath, [path.join(ROOT, 'dev-tools', 'check_translation_keys.cjs'), '--json'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
if (scanner.status !== 0 && !scanner.stdout) {
  fail(`runtime scanner failed (exit ${scanner.status})${scanner.stderr ? `: ${scanner.stderr.trim()}` : ''}`);
}

let scan;
try {
  scan = JSON.parse(scanner.stdout);
} catch (error) {
  fail(`could not parse runtime scanner JSON (${error.message})`);
}

const english = flatten(readJson(path.join(ROOT, 'ui_strings.js')));
const targetKeys = [...new Set((scan.literalTKeys || [])
  .filter((key) => typeof english[key] === 'string' && isTargetKey(key)))]
  .sort();
const errors = (scan.missingT || []).map(({ key }) => `runtime key is not in ui_strings.js: ${key}`);
if (errors.length) {
  if (JSON_OUTPUT) console.log(JSON.stringify({ errors }, null, 2));
  else errors.forEach((error) => console.error(`reconcile_runtime_missing: ${error}`));
  process.exit(1);
}

const allSlugs = Object.keys(LANGUAGE_CODES);
const slugs = requestedSlug ? [requestedSlug] : allSlugs;
const packs = {};
for (const slug of slugs) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(rootFile) || !fs.existsSync(mirrorFile)) {
    errors.push(`${slug}: root or deployed pack is missing`);
    continue;
  }
  const rootText = fs.readFileSync(rootFile, 'utf8');
  const mirrorText = fs.readFileSync(mirrorFile, 'utf8');
  if (rootText !== mirrorText) {
    errors.push(`${slug}: root/public mirror drift; refusing to overwrite it`);
    continue;
  }
  packs[slug] = { rootFile, mirrorFile, pack: readJson(rootFile) };
}
if (errors.length) {
  if (JSON_OUTPUT) console.log(JSON.stringify({ errors }, null, 2));
  else errors.forEach((error) => console.error(`reconcile_runtime_missing: ${error}`));
  process.exit(1);
}

// Index exact English duplicates by top-level namespace. Restricting reuse to
// one namespace avoids copying a generic label such as "Open" from an unrelated
// workflow where the same word has a different grammatical role.
const duplicateIndex = new Map();
for (const [key, value] of Object.entries(english)) {
  if (!isNonEmptyString(value)) continue;
  const group = key.split('.')[0];
  const indexKey = `${group}\u0000${value}`;
  if (!duplicateIndex.has(indexKey)) duplicateIndex.set(indexKey, []);
  duplicateIndex.get(indexKey).push(key);
}
for (const candidates of duplicateIndex.values()) candidates.sort();

const report = {
  namespaces: namespaceArgs,
  keysRequested: keyArgs,
  runtimeKeys: targetKeys.length,
  packCount: slugs.length,
  apply: APPLY,
  reuseExact: REUSE_EXACT,
  fallback: FALLBACK,
  gate: GATE,
  missingBefore: 0,
  reusableEntries: 0,
  ambiguousEntries: 0,
  fallbackEntries: 0,
  stillMissing: 0,
  changedByPack: {},
  missingByKey: {},
  reusableByKey: {},
  ambiguousByKey: {},
  fallbackByKey: {},
};

for (const slug of slugs) {
  const item = packs[slug];
  const flatPack = flatten(item.pack);
  const changes = [];
  for (const key of targetKeys) {
    const current = getDeep(item.pack, key);
    if (current !== undefined && current !== null && String(current).trim() !== '') {
      if (typeof current !== 'string') errors.push(`${slug}: ${key} resolves to a non-string value`);
      else if (placeholders(current).join('|') !== placeholders(english[key]).join('|')) {
        errors.push(`${slug}: placeholder mismatch in existing ${key}`);
      }
      continue;
    }

    report.missingBefore += 1;
    report.missingByKey[key] = (report.missingByKey[key] || 0) + 1;
    const group = key.split('.')[0];
    const candidates = (duplicateIndex.get(`${group}\u0000${english[key]}`) || [])
      .filter((candidate) => candidate !== key)
      .map((candidate) => ({ key: candidate, value: flatPack[candidate] }))
      .filter((candidate) => isNonEmptyString(candidate.value)
        && candidate.value !== english[key]
        && placeholders(candidate.value).join('|') === placeholders(english[key]).join('|'));
    const uniqueValues = [...new Set(candidates.map((candidate) => candidate.value))];

    let next;
    let mode;
    if (REUSE_EXACT && uniqueValues.length === 1) {
      next = uniqueValues[0];
      mode = 'reused';
      report.reusableEntries += 1;
      report.reusableByKey[key] = (report.reusableByKey[key] || 0) + 1;
    } else if (REUSE_EXACT && uniqueValues.length > 1) {
      report.ambiguousEntries += 1;
      report.ambiguousByKey[key] = (report.ambiguousByKey[key] || 0) + 1;
    } else if (FALLBACK) {
      next = english[key];
      mode = 'fallback';
      report.fallbackEntries += 1;
      report.fallbackByKey[key] = (report.fallbackByKey[key] || 0) + 1;
    }

    if (!next) {
      report.stillMissing += 1;
      continue;
    }
    if (APPLY) {
      setDeep(item.pack, key, next);
      changes.push({ key, mode });
    }
  }
  report.changedByPack[slug] = changes.length;
  if (APPLY && changes.length) {
    const output = JSON.stringify(item.pack, null, 2) + '\n';
    replaceFile(item.rootFile, output);
    replaceFile(item.mirrorFile, output);
  }
}

if (errors.length) {
  if (JSON_OUTPUT) console.log(JSON.stringify({ ...report, errors }, null, 2));
  else {
    console.error(`reconcile_runtime_missing: ${errors.length} problem(s); nothing written.`);
    errors.slice(0, 80).forEach((error) => console.error(`  - ${error}`));
  }
  process.exit(1);
}

if (JSON_OUTPUT) {
  console.log(JSON.stringify(report, null, 2));
} else if (!QUIET) {
  console.log(`reconcile_runtime_missing: ${targetKeys.length} runtime keys x ${slugs.length} pack(s)`);
  console.log(`  Missing before: ${report.missingBefore}`);
  console.log(`  Exact same-namespace reuse: ${report.reusableEntries}`);
  console.log(`  Ambiguous reuse candidates: ${report.ambiguousEntries}`);
  console.log(`  English fallback candidates: ${report.fallbackEntries}`);
  console.log(`  Still missing: ${report.stillMissing}`);
  console.log(`  ${APPLY ? 'Applied changes to root/deploy mirrors.' : 'Dry run only; pass --apply with an explicit policy to write.'}`);
} else {
  console.log(`reconcile_runtime_missing: missing=${report.missingBefore}; reusable=${report.reusableEntries}; fallback=${report.fallbackEntries}; stillMissing=${report.stillMissing}; mirror writes=${APPLY ? 'yes' : 'no'}`);
}

if (GATE && report.stillMissing > 0) process.exit(1);
