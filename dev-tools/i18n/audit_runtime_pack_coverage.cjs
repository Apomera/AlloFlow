#!/usr/bin/env node
'use strict';

// Read-only pack coverage audit for literal t('namespace.key') consumers.
// Unlike the whole-catalog audit, this follows the existing runtime scanner so
// dormant/sparse simulation catalogs do not look like deployed UI failures.
// Missing entries are presence gaps; English-identical values are reported
// separately as translation debt and are not treated as missing.
//
// Usage:
//   node dev-tools/i18n/audit_runtime_pack_coverage.cjs
//   node dev-tools/i18n/audit_runtime_pack_coverage.cjs --namespace=tour
//   node dev-tools/i18n/audit_runtime_pack_coverage.cjs --quiet --json
//   node dev-tools/i18n/audit_runtime_pack_coverage.cjs --gate

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { LANGUAGE_CODES } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const argv = process.argv.slice(2);
const JSON_OUTPUT = argv.includes('--json');
const QUIET = argv.includes('--quiet');
const GATE = argv.includes('--gate');
const BY_NAMESPACE = argv.includes('--by-namespace');
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
    flatten(child, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function getDeep(pack, dottedKey) {
  return dottedKey.split('.').reduce((value, key) => value == null ? undefined : value[key], pack);
}

function placeholders(value) {
  // Repeated use of the same placeholder is valid, but its multiplicity is
  // part of the runtime contract. Keep duplicates so an accidental second
  // `{n}` is detected instead of being hidden by set comparison.
  return [...String(value).replace(/\\u\{[0-9a-fA-F]+\}/g, '').matchAll(/\{[^{}]+\}/g)]
    .map((match) => match[0])
    .sort();
}

const scanner = spawnSync(process.execPath, [path.join(ROOT, 'dev-tools', 'check_translation_keys.cjs'), '--json'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
if (!scanner.stdout) {
  console.error(`audit_runtime_pack_coverage: runtime scanner produced no JSON (exit ${scanner.status})`);
  if (scanner.stderr) console.error(scanner.stderr.trim());
  process.exit(2);
}

let scan;
try {
  scan = JSON.parse(scanner.stdout);
} catch (error) {
  console.error(`audit_runtime_pack_coverage: could not parse runtime scanner JSON (${error.message})`);
  process.exit(2);
}

const english = flatten(readJson(path.join(ROOT, 'ui_strings.js')));
const targetKeys = scan.literalTKeys
  .filter((key) => typeof english[key] === 'string')
  .filter((key) => !namespace || key === namespace || key.startsWith(`${namespace}.`))
  .sort();
const slugs = Object.keys(LANGUAGE_CODES);
const packs = Object.fromEntries(slugs.map((slug) => [slug, readJson(path.join(LANG_DIR, `${slug}.js`))]));
const errors = [...(scan.missingT || []).map(({ key }) => `runtime key is not in ui_strings.js: ${key}`)];
const rows = [];
const missingByKey = {};
const invalidTypeByKey = {};
const passthroughByKey = {};
const mirrorMissingByKey = {};
const mirrorInvalidTypeByKey = {};
const mirrorPassthroughByKey = {};
const namespaceSummary = {};
let totalMissing = 0;
let totalInvalidType = 0;
let totalPassthrough = 0;
let totalTranslated = 0;
let totalPlaceholderMismatches = 0;
let totalMirrorMissing = 0;
let totalMirrorInvalidType = 0;
let totalMirrorPassthrough = 0;
let totalMirrorTranslated = 0;
let totalMirrorPlaceholderMismatches = 0;
let mirrorDrift = 0;

function inspectPack(pack, side) {
  const missing = [];
  const invalidType = [];
  const passthrough = [];
  const placeholderMismatch = [];
  let translated = 0;
  for (const key of targetKeys) {
    const value = getDeep(pack, key);
    const group = key.split('.')[0];
    if (!namespaceSummary[group]) {
      namespaceSummary[group] = {
        runtimeKeys: 0,
        missing: 0,
        invalidType: 0,
        passthrough: 0,
        translated: 0,
        placeholderMismatch: 0,
        mirrorMissing: 0,
        mirrorInvalidType: 0,
        mirrorPassthrough: 0,
        mirrorTranslated: 0,
        mirrorPlaceholderMismatch: 0,
      };
    }
    const missingField = side === 'mirror' ? 'mirrorMissing' : 'missing';
    const invalidTypeField = side === 'mirror' ? 'mirrorInvalidType' : 'invalidType';
    const passthroughField = side === 'mirror' ? 'mirrorPassthrough' : 'passthrough';
    const translatedField = side === 'mirror' ? 'mirrorTranslated' : 'translated';
    const placeholderField = side === 'mirror' ? 'mirrorPlaceholderMismatch' : 'placeholderMismatch';
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      missing.push(key);
      const target = side === 'mirror' ? mirrorMissingByKey : missingByKey;
      target[key] = (target[key] || 0) + 1;
      namespaceSummary[group][missingField] += 1;
    } else if (typeof value !== 'string') {
      invalidType.push(key);
      const target = side === 'mirror' ? mirrorInvalidTypeByKey : invalidTypeByKey;
      target[key] = (target[key] || 0) + 1;
      namespaceSummary[group][invalidTypeField] += 1;
    } else {
      if (placeholders(value).join('|') !== placeholders(english[key]).join('|')) {
        placeholderMismatch.push(key);
        namespaceSummary[group][placeholderField] += 1;
      }
      if (value === english[key]) {
        passthrough.push(key);
        const target = side === 'mirror' ? mirrorPassthroughByKey : passthroughByKey;
        target[key] = (target[key] || 0) + 1;
        namespaceSummary[group][passthroughField] += 1;
      } else {
        translated += 1;
        namespaceSummary[group][translatedField] += 1;
      }
    }
  }
  return { missing, invalidType, passthrough, translated, placeholderMismatch };
}

for (const slug of slugs) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  if (fs.readFileSync(rootFile, 'utf8') !== fs.readFileSync(mirrorFile, 'utf8')) mirrorDrift += 1;
  const rootMetrics = inspectPack(packs[slug], 'root');
  const mirrorMetrics = inspectPack(readJson(mirrorFile), 'mirror');
  totalMissing += rootMetrics.missing.length;
  totalInvalidType += rootMetrics.invalidType.length;
  totalPassthrough += rootMetrics.passthrough.length;
  totalTranslated += rootMetrics.translated;
  totalPlaceholderMismatches += rootMetrics.placeholderMismatch.length;
  totalMirrorMissing += mirrorMetrics.missing.length;
  totalMirrorInvalidType += mirrorMetrics.invalidType.length;
  totalMirrorPassthrough += mirrorMetrics.passthrough.length;
  totalMirrorTranslated += mirrorMetrics.translated;
  totalMirrorPlaceholderMismatches += mirrorMetrics.placeholderMismatch.length;
  rows.push({
    slug,
    keys: targetKeys.length,
    missing: rootMetrics.missing.length,
    invalidType: rootMetrics.invalidType.length,
    passthrough: rootMetrics.passthrough.length,
    translated: rootMetrics.translated,
    placeholderMismatch: rootMetrics.placeholderMismatch.length,
    missingSample: rootMetrics.missing.slice(0, 20),
    invalidTypeSample: rootMetrics.invalidType.slice(0, 20),
    placeholderMismatchSample: rootMetrics.placeholderMismatch.slice(0, 20),
    mirrorMissing: mirrorMetrics.missing.length,
    mirrorInvalidType: mirrorMetrics.invalidType.length,
    mirrorPassthrough: mirrorMetrics.passthrough.length,
    mirrorTranslated: mirrorMetrics.translated,
    mirrorPlaceholderMismatch: mirrorMetrics.placeholderMismatch.length,
    mirrorMissingSample: mirrorMetrics.missing.slice(0, 20),
    mirrorInvalidTypeSample: mirrorMetrics.invalidType.slice(0, 20),
    mirrorPlaceholderMismatchSample: mirrorMetrics.placeholderMismatch.slice(0, 20),
  });
}

for (const key of targetKeys) {
  const group = key.split('.')[0];
  namespaceSummary[group].runtimeKeys += 1;
  if (namespaceSummary[group].placeholderMismatch === undefined) namespaceSummary[group].placeholderMismatch = 0;
}

const placeholderMismatchByKey = {};
const mirrorPlaceholderMismatchByKey = {};
for (const row of rows) {
  for (const key of row.placeholderMismatchSample) placeholderMismatchByKey[key] = (placeholderMismatchByKey[key] || 0) + 1;
  for (const key of row.mirrorPlaceholderMismatchSample) mirrorPlaceholderMismatchByKey[key] = (mirrorPlaceholderMismatchByKey[key] || 0) + 1;
}

const report = {
  namespace: namespace || '(all runtime literal t keys)',
  runtimeKeys: targetKeys.length,
  packCount: slugs.length,
  totalMissing,
  totalInvalidType,
  totalPassthrough,
  totalTranslated,
  totalPlaceholderMismatches,
  totalMirrorMissing,
  totalMirrorInvalidType,
  totalMirrorPassthrough,
  totalMirrorTranslated,
  totalMirrorPlaceholderMismatches,
  mirrorDrift,
  scanner: {
    dynamicTCount: scan.dynamicTCount,
    safeInlineFallbackCount: scan.safeInlineFallbackCount,
    missingT: scan.missingT,
  },
  packs: rows.sort((a, b) => b.missing - a.missing || b.passthrough - a.passthrough || a.slug.localeCompare(b.slug)),
  missingByKey: Object.fromEntries(Object.entries(missingByKey).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  invalidTypeByKey: Object.fromEntries(Object.entries(invalidTypeByKey).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  passthroughByKey: Object.fromEntries(Object.entries(passthroughByKey).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  placeholderMismatchByKey: Object.fromEntries(Object.entries(placeholderMismatchByKey).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  mirrorMissingByKey: Object.fromEntries(Object.entries(mirrorMissingByKey).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  mirrorInvalidTypeByKey: Object.fromEntries(Object.entries(mirrorInvalidTypeByKey).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  mirrorPassthroughByKey: Object.fromEntries(Object.entries(mirrorPassthroughByKey).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  mirrorPlaceholderMismatchByKey: Object.fromEntries(Object.entries(mirrorPlaceholderMismatchByKey).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  byNamespace: Object.fromEntries(Object.entries(namespaceSummary).sort((a, b) => b[1].missing - a[1].missing || b[1].invalidType - a[1].invalidType || a[0].localeCompare(b[0]))),
  errors,
};

if (JSON_OUTPUT) {
  console.log(JSON.stringify(report, null, 2));
} else if (!QUIET) {
  console.log(`audit_runtime_pack_coverage: ${targetKeys.length} runtime keys x ${slugs.length} packs`);
  console.log(`  Root: missing=${totalMissing} | invalidType=${totalInvalidType} | passthrough=${totalPassthrough} | translated=${totalTranslated} | placeholders=${totalPlaceholderMismatches}`);
  console.log(`  Mirror: missing=${totalMirrorMissing} | invalidType=${totalMirrorInvalidType} | passthrough=${totalMirrorPassthrough} | translated=${totalMirrorTranslated} | placeholders=${totalMirrorPlaceholderMismatches} | drift=${mirrorDrift}`);
  for (const row of report.packs.filter((item) => item.missing || item.invalidType || item.passthrough || item.placeholderMismatch || item.mirrorMissing || item.mirrorInvalidType || item.mirrorPlaceholderMismatch).slice(0, 30)) {
    console.log(`  ${row.slug.padEnd(24)} root(m=${String(row.missing).padStart(5)}, i=${String(row.invalidType).padStart(5)}, p=${String(row.passthrough).padStart(5)}, t=${String(row.translated).padStart(5)}, x=${String(row.placeholderMismatch).padStart(5)}) mirror(m=${String(row.mirrorMissing).padStart(5)}, i=${String(row.mirrorInvalidType).padStart(5)}, x=${String(row.mirrorPlaceholderMismatch).padStart(5)})`);
  }
} else {
  console.log(`audit_runtime_pack_coverage: ${targetKeys.length} keys x ${slugs.length} packs; rootMissing=${totalMissing}; rootInvalidType=${totalInvalidType}; mirrorMissing=${totalMirrorMissing}; mirrorInvalidType=${totalMirrorInvalidType}; rootPlaceholders=${totalPlaceholderMismatches}; mirrorPlaceholders=${totalMirrorPlaceholderMismatches}; mirrorDrift=${mirrorDrift}`);
}

if (BY_NAMESPACE && !JSON_OUTPUT) {
  console.log('  namespace'.padEnd(28) + 'keys'.padStart(8) + 'missing'.padStart(10) + 'invalid'.padStart(10) + 'mirror'.padStart(10) + 'passthrough'.padStart(13) + 'translated'.padStart(12) + 'placeholders'.padStart(13));
  for (const [group, stats] of Object.entries(report.byNamespace)) {
    console.log(`  ${group.padEnd(26)}${String(stats.runtimeKeys).padStart(8)}${String(stats.missing).padStart(10)}${String(stats.invalidType).padStart(10)}${String(stats.mirrorMissing).padStart(10)}${String(stats.passthrough).padStart(13)}${String(stats.translated).padStart(12)}${String(stats.placeholderMismatch || 0).padStart(13)}`);
  }
}

if (report.errors.length || (GATE && (totalMissing > 0 || totalInvalidType > 0 || totalMirrorMissing > 0 || totalMirrorInvalidType > 0 || totalPlaceholderMismatches > 0 || totalMirrorPlaceholderMismatches > 0 || mirrorDrift > 0))) process.exit(1);
