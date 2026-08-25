#!/usr/bin/env node
'use strict';

// Read-only audit of the complete ui_strings.js leaf catalog against every
// canonical lang pack. The narrower main-ui, STEM, literal-fallback, and
// command-palette gates remain the deploy contracts; this report exposes the
// rest of the catalog so newly added namespaces cannot hide coverage gaps.
//
// Usage:
//   node dev-tools/i18n/audit_ui_pack_coverage.cjs
//   node dev-tools/i18n/audit_ui_pack_coverage.cjs --namespace=behavior_lens
//   node dev-tools/i18n/audit_ui_pack_coverage.cjs --json
//   node dev-tools/i18n/audit_ui_pack_coverage.cjs --namespace=stem --gate

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const UI_FILE = path.join(ROOT, 'ui_strings.js');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const argv = process.argv.slice(2);
const JSON_OUTPUT = argv.includes('--json');
const QUIET = argv.includes('--quiet');
const BY_NAMESPACE = argv.includes('--by-namespace');
const GATE = argv.includes('--gate');
const namespaceArg = argv.find((arg) => arg.startsWith('--namespace='));
const namespace = namespaceArg ? namespaceArg.slice('--namespace='.length).trim() : null;

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
    const full = prefix ? `${prefix}.${key}` : key;
    flatten(child, full, out);
  }
  return out;
}

function getDeep(pack, dottedKey) {
  return dottedKey.split('.').reduce((value, part) => value == null ? undefined : value[part], pack);
}

function placeholders(value) {
  // Repeated use of the same placeholder is valid only when its multiplicity
  // matches the source contract. Preserve duplicates so an accidental second
  // `{n}` cannot pass as a set-equivalent value.
  return [...String(value).replace(/\\u\{[0-9a-fA-F]+\}/g, '').matchAll(/\{[^{}]+\}/g)]
    .map((match) => match[0])
    .sort();
}

const allEnglish = flatten(readJson(UI_FILE));
const keys = Object.keys(allEnglish)
  .filter((key) => !namespace || key === namespace || key.startsWith(`${namespace}.`))
  .filter((key) => typeof allEnglish[key] === 'string' && allEnglish[key].trim())
  .sort();
const files = fs.readdirSync(LANG_DIR)
  .filter((file) => file.endsWith('.js') && !file.startsWith('.'))
  .sort();
const errors = [];
const rows = [];
let totalMissing = 0;
let totalInvalidType = 0;
let totalPassthrough = 0;
let totalTranslated = 0;
let totalPlaceholderMismatches = 0;
let mirrorDrift = 0;
const namespaceSummary = {};
for (const key of keys) {
  const group = key.split('.')[0];
  if (!namespaceSummary[group]) namespaceSummary[group] = { sourceKeys: 0, missing: 0, invalidType: 0, passthrough: 0, translated: 0, placeholderMismatch: 0 };
  namespaceSummary[group].sourceKeys += 1;
}

for (const file of files) {
  const rootFile = path.join(LANG_DIR, file);
  const mirrorFile = path.join(MIRROR_DIR, file);
  if (!fs.existsSync(mirrorFile)) {
    errors.push(`${file}: deployed mirror missing`);
    continue;
  }
  const rootText = fs.readFileSync(rootFile, 'utf8');
  const mirrorText = fs.readFileSync(mirrorFile, 'utf8');
  if (rootText !== mirrorText) mirrorDrift += 1;
  let pack;
  try { pack = readJson(rootFile); }
  catch (error) {
    errors.push(`${file}: invalid JSON (${error.message})`);
    continue;
  }
  const missing = [];
  const invalidType = [];
  const passthrough = [];
  const placeholderMismatch = [];
  let translated = 0;
  for (const key of keys) {
    const group = key.split('.')[0];
    const value = getDeep(pack, key);
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      missing.push(key);
      namespaceSummary[group].missing += 1;
    } else if (typeof value !== 'string') {
      invalidType.push(key);
      namespaceSummary[group].invalidType += 1;
    } else {
      if (placeholders(value).join('|') !== placeholders(allEnglish[key]).join('|')) {
        placeholderMismatch.push(key);
        namespaceSummary[group].placeholderMismatch += 1;
      }
      if (value === allEnglish[key]) {
        passthrough.push(key);
        namespaceSummary[group].passthrough += 1;
      } else if (typeof value === 'string') {
        translated += 1;
        namespaceSummary[group].translated += 1;
      }
    }
  }
  totalMissing += missing.length;
  totalInvalidType += invalidType.length;
  totalPassthrough += passthrough.length;
  totalTranslated += translated;
  totalPlaceholderMismatches += placeholderMismatch.length;
  rows.push({
    slug: file.replace(/\.js$/, ''),
    keys: keys.length,
    missing: missing.length,
    invalidType: invalidType.length,
    passthrough: passthrough.length,
    translated,
    placeholderMismatch: placeholderMismatch.length,
    missingSample: missing.slice(0, 12),
    invalidTypeSample: invalidType.slice(0, 12),
    placeholderMismatchSample: placeholderMismatch.slice(0, 12),
  });
}

const missingByKey = {};
const invalidTypeByKey = {};
const placeholderMismatchByKey = {};
for (const row of rows) {
  for (const key of row.missingSample) missingByKey[key] = (missingByKey[key] || 0) + 1;
  for (const key of row.invalidTypeSample) invalidTypeByKey[key] = (invalidTypeByKey[key] || 0) + 1;
  for (const key of row.placeholderMismatchSample) placeholderMismatchByKey[key] = (placeholderMismatchByKey[key] || 0) + 1;
}
const report = {
  namespace: namespace || '(all)',
  sourceStringKeys: keys.length,
  packCount: rows.length,
  totalMissing,
  totalInvalidType,
  totalPassthrough,
  totalTranslated,
  totalPlaceholderMismatches,
  mirrorDrift,
  errors,
  packs: rows.sort((a, b) => b.missing - a.missing || b.passthrough - a.passthrough || a.slug.localeCompare(b.slug)),
  missingSampleByPackCount: Object.fromEntries(Object.entries(missingByKey).sort((a, b) => b[1] - a[1]).slice(0, 40)),
  invalidTypeSampleByPackCount: Object.fromEntries(Object.entries(invalidTypeByKey).sort((a, b) => b[1] - a[1]).slice(0, 40)),
  placeholderMismatchByPackCount: Object.fromEntries(Object.entries(placeholderMismatchByKey).sort((a, b) => b[1] - a[1]).slice(0, 40)),
  byNamespace: Object.fromEntries(Object.entries(namespaceSummary).sort((a, b) => b[1].missing - a[1].missing || b[1].invalidType - a[1].invalidType || a[0].localeCompare(b[0]))),
};

if (JSON_OUTPUT) {
  console.log(JSON.stringify(report, null, 2));
} else if (!QUIET) {
  console.log(`audit_ui_pack_coverage: ${keys.length} English string leaves in ${report.namespace} x ${rows.length} packs`);
  console.log(`  Missing: ${totalMissing} | invalidType: ${totalInvalidType} | passthrough: ${totalPassthrough} | translated: ${totalTranslated} | placeholder mismatches: ${totalPlaceholderMismatches} | mirror drift: ${mirrorDrift}`);
  if (errors.length) console.log(`  Errors: ${errors.length}`);
  for (const row of report.packs.filter((item) => item.missing || item.invalidType || item.passthrough || item.placeholderMismatch).slice(0, 20)) {
    console.log(`  ${row.slug.padEnd(24)} missing=${String(row.missing).padStart(5)} invalid=${String(row.invalidType).padStart(5)} passthrough=${String(row.passthrough).padStart(5)} translated=${String(row.translated).padStart(5)} placeholders=${String(row.placeholderMismatch).padStart(5)}`);
  }
} else {
  console.log(`audit_ui_pack_coverage: ${keys.length} keys x ${rows.length} packs; missing=${totalMissing}; invalidType=${totalInvalidType}; passthrough=${totalPassthrough}; translated=${totalTranslated}; placeholderMismatches=${totalPlaceholderMismatches}; mirrorDrift=${mirrorDrift}`);
}

if (BY_NAMESPACE && !JSON_OUTPUT) {
  console.log('  namespace'.padEnd(28) + 'source'.padStart(8) + 'missing'.padStart(10) + 'invalid'.padStart(10) + 'passthrough'.padStart(13) + 'translated'.padStart(12) + 'placeholders'.padStart(13));
  for (const [group, stats] of Object.entries(report.byNamespace)) {
    console.log(`  ${group.padEnd(26)}${String(stats.sourceKeys).padStart(8)}${String(stats.missing).padStart(10)}${String(stats.invalidType).padStart(10)}${String(stats.passthrough).padStart(13)}${String(stats.translated).padStart(12)}${String(stats.placeholderMismatch).padStart(13)}`);
  }
}

if (errors.length || (GATE && (totalMissing > 0 || totalInvalidType > 0 || totalPlaceholderMismatches > 0 || mirrorDrift > 0))) process.exit(1);
