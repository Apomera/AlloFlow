#!/usr/bin/env node
'use strict';

// Add canonical English fallbacks for literal runtime t() leaves that are
// absent from a language pack. Existing non-empty values are never replaced.
// This is the broad companion to reconcile_runtime_missing.cjs: the latter
// is for explicitly promoted namespaces and can reuse reviewed equivalents;
// this tool closes the remaining pack-shape gap with measurable English
// fallbacks only.
//
// Usage:
//   node dev-tools/i18n/reconcile_runtime_pack_coverage.cjs --quiet
//   node dev-tools/i18n/reconcile_runtime_pack_coverage.cjs --namespace=stem
//   node dev-tools/i18n/reconcile_runtime_pack_coverage.cjs --all --apply
//   node dev-tools/i18n/reconcile_runtime_pack_coverage.cjs --all --gate --quiet
//   node dev-tools/i18n/reconcile_runtime_pack_coverage.cjs --namespace=stem --lang=french --apply

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { LANGUAGE_CODES } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const SOURCE_FILE = path.join(ROOT, 'ui_strings.js');
const SOURCE_MIRROR_FILE = path.join(ROOT, 'desktop', 'web-app', 'public', 'ui_strings.js');
const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const GATE = argv.includes('--gate');
const JSON_OUTPUT = argv.includes('--json');
const QUIET = argv.includes('--quiet');
const ALL = argv.includes('--all');
const SKIP_DRIFT = argv.includes('--skip-drift');
const MERGE_DRIFT = argv.includes('--merge-drift');
const namespaceArg = argv.find((arg) => arg.startsWith('--namespace='));
const keyArg = argv.find((arg) => arg.startsWith('--key='));
const langArg = argv.find((arg) => arg.startsWith('--lang='));
const namespaces = namespaceArg
  ? namespaceArg.slice('--namespace='.length).split(',').map((value) => value.trim()).filter(Boolean)
  : [];
const explicitKeys = keyArg
  ? keyArg.slice('--key='.length).split(',').map((value) => value.trim()).filter(Boolean)
  : [];
const requestedSlug = langArg ? langArg.slice('--lang='.length).trim() : null;
const hasExplicitScope = ALL || namespaces.length > 0 || explicitKeys.length > 0;

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
    if (cursor[part] === undefined) cursor[part] = {};
    if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) {
      throw new Error(`cannot create ${dottedKey}: ${parts.slice(0, index + 1).join('.')} is not an object`);
    }
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

function replaceFile(file, text) {
  const temporary = `${file}.runtime-pack-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    try {
      fs.renameSync(temporary, file);
    } catch (error) {
      // OneDrive can transiently hold a mirror open. The validated temporary
      // file is still safe to copy into the exact target.
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      fs.copyFileSync(temporary, file);
    }
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function fail(message, code = 2) {
  if (JSON_OUTPUT) console.log(JSON.stringify({ errors: [message] }, null, 2));
  else console.error(`reconcile_runtime_pack_coverage: ${message}`);
  process.exit(code);
}

if (APPLY && !hasExplicitScope) {
  fail('--apply requires --all, --namespace=..., or --key=...');
}
if (ALL && (namespaces.length || explicitKeys.length)) {
  fail('--all cannot be combined with --namespace or --key');
}
if (MERGE_DRIFT && !requestedSlug) {
  fail('--merge-drift requires --lang=... so both sides of one named pack can be merged safely');
}
if (MERGE_DRIFT && SKIP_DRIFT) {
  fail('--merge-drift cannot be combined with --skip-drift');
}
if (requestedSlug && !Object.prototype.hasOwnProperty.call(LANGUAGE_CODES, requestedSlug)) {
  fail(`unknown language slug: ${requestedSlug}`);
}

const sourceText = fs.readFileSync(SOURCE_FILE, 'utf8');
const sourceMirrorText = fs.readFileSync(SOURCE_MIRROR_FILE, 'utf8');
if (sourceText !== sourceMirrorText) fail('ui_strings.js root/public mirror drift; refusing to write packs');

const scanner = spawnSync(process.execPath, [path.join(ROOT, 'dev-tools', 'check_translation_keys.cjs'), '--json'], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
if (!scanner.stdout) fail(`runtime scanner produced no JSON (exit ${scanner.status})`);

let scan;
try {
  scan = JSON.parse(scanner.stdout);
} catch (error) {
  fail(`could not parse runtime scanner JSON (${error.message})`);
}

const sourceLeaves = flatten(readJson(SOURCE_FILE));
const scanErrors = (scan.missingT || []).map(({ key }) => `runtime key is not in ui_strings.js: ${key}`);
if (scanErrors.length) {
  if (JSON_OUTPUT) console.log(JSON.stringify({ errors: scanErrors }, null, 2));
  else {
    console.error(`reconcile_runtime_pack_coverage: ${scanErrors.length} runtime key(s) have no ui_strings source leaf; nothing written.`);
    scanErrors.slice(0, 80).forEach((error) => console.error(`  - ${error}`));
  }
  process.exit(1);
}

const selectedKeys = new Set(explicitKeys);
const runtimeKeys = [...new Set(
  (scan.literalTKeys || [])
    .filter((key) => typeof sourceLeaves[key] === 'string' && sourceLeaves[key].trim())
    .filter((key) => ALL || (!namespaces.length && !explicitKeys.length)
      || namespaces.some((namespace) => key === namespace || key.startsWith(`${namespace}.`)))
)];

for (const key of explicitKeys) {
  if (typeof sourceLeaves[key] !== 'string' || !sourceLeaves[key].trim()) {
    fail(`--key=${key} is not a non-empty literal runtime leaf in ui_strings.js`);
  }
  selectedKeys.add(key);
}
const targetKeys = [...new Set([...runtimeKeys, ...selectedKeys])].sort();
const slugs = requestedSlug ? [requestedSlug] : Object.keys(LANGUAGE_CODES);
const errors = [];
const skipped = [];
const plans = [];
const missingByNamespace = {};
const mirrorMissingByNamespace = {};
let totalMissing = 0;
let totalMirrorMissing = 0;
let totalWritten = 0;
let mirrorDrift = 0;

function collectMissing(pack, slug, side, namespaceCounts) {
  const missing = [];
  for (const key of targetKeys) {
    const current = getDeep(pack, key);
    if (current !== undefined && current !== null && String(current).trim() !== '') {
      if (typeof current !== 'string') errors.push(`${slug} ${side}: ${key} resolves to a non-string value`);
      continue;
    }
    missing.push({ key, value: sourceLeaves[key] });
    const group = key.split('.')[0];
    namespaceCounts[group] = (namespaceCounts[group] || 0) + 1;
  }
  return missing;
}

for (const slug of slugs) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(rootFile) || !fs.existsSync(mirrorFile)) {
    errors.push(`${slug}: root or deployed pack is missing`);
    continue;
  }
  const rootText = fs.readFileSync(rootFile, 'utf8');
  const mirrorText = fs.readFileSync(mirrorFile, 'utf8');
  const drift = rootText !== mirrorText;
  if (drift) {
    mirrorDrift += 1;
    if (MERGE_DRIFT) {
      // The named merge mode adds only absent leaves to each side. Unique
      // existing content on either side is preserved byte-for-byte in the
      // parsed object; no side is used to overwrite the other.
    } else {
      if (SKIP_DRIFT) {
        skipped.push(`${slug}: root/public mirror drift`);
        continue;
      }
      errors.push(`${slug}: root/public mirror drift; refusing to overwrite it`);
      continue;
    }
  }
  const rootPack = readJson(rootFile);
  const mirrorPack = drift ? readJson(mirrorFile) : rootPack;
  const rootMissing = collectMissing(rootPack, slug, 'root', missingByNamespace);
  const mirrorMissing = drift
    ? collectMissing(mirrorPack, slug, 'mirror', mirrorMissingByNamespace)
    : rootMissing;
  totalMissing += rootMissing.length;
  totalMirrorMissing += mirrorMissing.length;
  plans.push({ slug, rootFile, mirrorFile, rootPack, mirrorPack, rootMissing, mirrorMissing, drift });
}

if (errors.length) {
  if (JSON_OUTPUT) console.log(JSON.stringify({ errors }, null, 2));
  else {
    console.error(`reconcile_runtime_pack_coverage: ${errors.length} problem(s); nothing written.`);
    errors.slice(0, 80).forEach((error) => console.error(`  - ${error}`));
  }
  process.exit(1);
}

if (APPLY) {
  for (const plan of plans) {
    if (!plan.rootMissing.length && !plan.mirrorMissing.length) continue;
    for (const item of plan.rootMissing) setDeep(plan.rootPack, item.key, item.value);
    for (const item of plan.mirrorMissing) setDeep(plan.mirrorPack, item.key, item.value);
    const rootOutput = JSON.stringify(plan.rootPack, null, 2) + '\n';
    const mirrorOutput = plan.drift ? JSON.stringify(plan.mirrorPack, null, 2) + '\n' : rootOutput;
    replaceFile(plan.rootFile, rootOutput);
    replaceFile(plan.mirrorFile, mirrorOutput);
    totalWritten += plan.rootMissing.length + (plan.drift ? plan.mirrorMissing.length : 0);
  }
}

const report = {
  apply: APPLY,
  scope: ALL ? 'all runtime literal t() keys' : namespaces.length ? namespaces : explicitKeys,
  runtimeKeys: targetKeys.length,
  packCount: plans.length,
  totalMissing,
  totalMirrorMissing,
  totalWritten,
  mirrorDrift,
  mergeDrift: MERGE_DRIFT,
  skipped,
  missingByNamespace: Object.fromEntries(Object.entries(missingByNamespace).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  mirrorMissingByNamespace: Object.fromEntries(Object.entries(mirrorMissingByNamespace).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  packs: Object.fromEntries(plans.filter((plan) => plan.rootMissing.length).map((plan) => [plan.slug, plan.rootMissing.length])),
  mirrorPacks: Object.fromEntries(plans.filter((plan) => plan.drift && plan.mirrorMissing.length).map((plan) => [plan.slug, plan.mirrorMissing.length])),
};

if (JSON_OUTPUT) {
  console.log(JSON.stringify(report, null, 2));
} else if (!QUIET) {
  console.log(`reconcile_runtime_pack_coverage: ${targetKeys.length} runtime keys x ${plans.length} pack(s)`);
  console.log(`  Missing root leaves before apply: ${totalMissing}`);
  if (MERGE_DRIFT) console.log(`  Missing mirror leaves before apply: ${totalMirrorMissing}`);
  if (skipped.length) console.log(`  Skipped due to mirror drift: ${skipped.length}`);
  console.log(`  ${APPLY ? `Added ${totalWritten} canonical English fallback(s) to root/deploy mirrors.` : 'Dry run only; pass --apply with an explicit scope to write.'}`);
  for (const [namespace, count] of Object.entries(report.missingByNamespace).slice(0, 30)) {
    console.log(`  ${namespace.padEnd(24)} ${String(count).padStart(7)} missing`);
  }
} else {
  console.log(`reconcile_runtime_pack_coverage: keys=${targetKeys.length}; packs=${plans.length}; missing=${totalMissing}; mirrorMissing=${totalMirrorMissing}; written=${totalWritten}; skipped=${skipped.length}`);
}

if (GATE && (totalMissing > 0 || totalMirrorMissing > 0 || skipped.length > 0)) {
  if (!APPLY) console.error(`reconcile_runtime_pack_coverage: gate failed with ${totalMissing} missing root leaves, ${totalMirrorMissing} missing mirror leaves, and ${skipped.length} skipped drift pack(s); run with --apply first and resolve drift.`);
  else if (skipped.length) console.error(`reconcile_runtime_pack_coverage: gate failed with ${skipped.length} skipped drift pack(s); resolve root/public parity before gating.`);
  process.exit(1);
}
