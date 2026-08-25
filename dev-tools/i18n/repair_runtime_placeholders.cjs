#!/usr/bin/env node
'use strict';

// Repair only reviewed placeholder-loss patterns in runtime packs:
//   - translated legacy toasts used a standalone N for missing placeholders;
//   - pdf_audit.score.confirmed_issues retained the old {count} token after
//     the canonical source stopped using a count.
//   - one reviewed Hmong entry contains an unresolvable duplicate {n}; use
//     the canonical English fallback rather than ship an invalid token shape.
//
// Everything else is reported for human/API review. Existing prose is kept;
// this tool changes only the placeholder marker itself.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { LANGUAGE_CODES } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const SOURCE_FILE = path.join(ROOT, 'ui_strings.js');
const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const GATE = argv.includes('--gate');
const JSON_OUTPUT = argv.includes('--json');
const QUIET = argv.includes('--quiet');
const SKIP_DRIFT = argv.includes('--skip-drift');
const namespaceArg = argv.find((arg) => arg.startsWith('--namespace='));
const keyArg = argv.find((arg) => arg.startsWith('--key='));
const langArg = argv.find((arg) => arg.startsWith('--lang='));
const namespaces = namespaceArg ? namespaceArg.slice('--namespace='.length).split(',').map((value) => value.trim()).filter(Boolean) : [];
const explicitKeys = keyArg ? keyArg.slice('--key='.length).split(',').map((value) => value.trim()).filter(Boolean) : [];
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
  for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, out);
  return out;
}

function getDeep(target, dottedKey) {
  return dottedKey.split('.').reduce((value, key) => value == null ? undefined : value[key], target);
}

function setDeep(target, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) cursor = cursor[parts[index]];
  cursor[parts[parts.length - 1]] = value;
}

function tokens(value) {
  return [...String(value).replace(/\\u\{[0-9a-fA-F]+\}/g, '').matchAll(/\{[^{}]+\}/g)].map((match) => match[0]);
}

function counts(values) {
  const result = new Map();
  for (const value of values) result.set(value, (result.get(value) || 0) + 1);
  return result;
}

function missingTokens(sourceTokens, currentTokens) {
  const result = [];
  const current = counts(currentTokens);
  for (const token of sourceTokens) {
    const count = current.get(token) || 0;
    if (count > 0) current.set(token, count - 1);
    else result.push(token);
  }
  return result;
}

function extraTokens(sourceTokens, currentTokens) {
  const result = [];
  const source = counts(sourceTokens);
  for (const token of currentTokens) {
    const count = source.get(token) || 0;
    if (count > 0) source.set(token, count - 1);
    else result.push(token);
  }
  return result;
}

function repairStandaloneN(sourceValue, currentValue) {
  const sourceTokens = tokens(sourceValue);
  const currentTokens = tokens(currentValue);
  const missing = missingTokens(sourceTokens, currentTokens);
  if (!missing.length || extraTokens(sourceTokens, currentTokens).length) return null;
  // Legacy machine translations used both `N` and `Ns` as placeholder
  // markers. Preserve a suffix such as the English seconds marker.
  const nMatches = [...String(currentValue).matchAll(/\bN(?=\b|[a-z])/g)];
  if (nMatches.length !== missing.length) return null;
  let index = 0;
  return String(currentValue).replace(/\bN(?=\b|[a-z])/g, () => missing[index++]);
}

function repairRepeatedNPlaceholderAlias(sourceValue, currentValue) {
  const sourceTokens = tokens(sourceValue);
  const currentTokens = tokens(currentValue);
  if (!sourceTokens.length || currentTokens.length !== sourceTokens.length) return null;
  if (!currentTokens.every((token) => token === '{n}')) return null;
  let index = 0;
  return String(currentValue).replace(/\$?\{[^{}]+\}/g, () => sourceTokens[index++]);
}

function repairStaleCountToken(key, sourceValue, currentValue) {
  if (key !== 'pdf_audit.score.confirmed_issues') return null;
  if (tokens(sourceValue).length !== 0 || tokens(currentValue).join('|') !== '{count}') return null;
  return String(currentValue).replace('{count}', '').replace(/^\s+/, '');
}

function repairKnownMalformedFallback(slug, key, sourceValue, currentValue) {
  if (slug !== 'hmong') return null;
  if (key !== 'behavior_lens.toast.added_n_entries_to_abc_data') return null;
  if (sourceValue !== 'Added {n} entries to ABC data!') return null;
  if (currentValue !== '{n}txiv {n} nkag rau ABC cov ntaub ntawv!') return null;
  return sourceValue;
}

function replaceFile(file, text) {
  const temporary = `${file}.placeholder-repair-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    try {
      fs.renameSync(temporary, file);
    } catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      fs.copyFileSync(temporary, file);
    }
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function fail(message, code = 2) {
  if (JSON_OUTPUT) console.log(JSON.stringify({ errors: [message] }, null, 2));
  else console.error(`repair_runtime_placeholders: ${message}`);
  process.exit(code);
}

if (requestedSlug && !Object.prototype.hasOwnProperty.call(LANGUAGE_CODES, requestedSlug)) fail(`unknown language slug: ${requestedSlug}`);

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
if ((scan.missingT || []).length) fail('runtime scanner still has t() keys missing from ui_strings.js');

const english = flatten(readJson(SOURCE_FILE));
const selected = new Set(explicitKeys);
for (const key of scan.literalTKeys || []) {
  if (typeof english[key] !== 'string') continue;
  if (explicitKeys.length && !explicitKeys.includes(key)) continue;
  if (namespaces.length && !namespaces.some((namespace) => key === namespace || key.startsWith(`${namespace}.`))) continue;
  if ((!explicitKeys.length && (!namespaces.length || namespaces.some((namespace) => key === namespace || key.startsWith(`${namespace}.`)))
    || explicitKeys.includes(key))) selected.add(key);
}
for (const key of explicitKeys) {
  if (typeof english[key] !== 'string' || !english[key].trim()) fail(`--key=${key} is not a non-empty ui_strings leaf`);
}
const targetKeys = [...selected].sort();
const slugs = requestedSlug ? [requestedSlug] : Object.keys(LANGUAGE_CODES);
const errors = [];
const skipped = [];
const plans = [];
const unresolvedByKey = {};
const repairsByPolicy = {
  standaloneN: 0,
  repeatedNPlaceholderAlias: 0,
  staleCountToken: 0,
  knownMalformedFallback: 0,
};
let totalMismatches = 0;
let totalRepairs = 0;

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
    if (SKIP_DRIFT) {
      skipped.push(`${slug}: root/public mirror drift`);
      continue;
    }
    errors.push(`${slug}: root/public mirror drift; refusing to overwrite it`);
    continue;
  }
  const root = readJson(rootFile);
  const mirror = readJson(mirrorFile);
  const repairs = [];
  for (const key of targetKeys) {
    const sourceValue = english[key];
    const current = getDeep(root, key);
    const mirrorValue = getDeep(mirror, key);
    if (typeof current !== 'string' || typeof mirrorValue !== 'string') continue;
    if (tokens(current).sort().join('|') === tokens(sourceValue).sort().join('|')) continue;
    totalMismatches += 1;
    if (current !== mirrorValue) {
      unresolvedByKey[key] = (unresolvedByKey[key] || 0) + 1;
      continue;
    }
    let repaired = repairStandaloneN(sourceValue, current);
    let policy = 'standaloneN';
    if (!repaired) {
      repaired = repairRepeatedNPlaceholderAlias(sourceValue, current);
      policy = 'repeatedNPlaceholderAlias';
    }
    if (!repaired) {
      repaired = repairStaleCountToken(key, sourceValue, current);
      policy = 'staleCountToken';
    }
    if (!repaired) {
      repaired = repairKnownMalformedFallback(slug, key, sourceValue, current);
      policy = 'knownMalformedFallback';
    }
    if (!repaired || repaired === current) {
      unresolvedByKey[key] = (unresolvedByKey[key] || 0) + 1;
      continue;
    }
    repairs.push({ key, value: repaired, policy });
    repairsByPolicy[policy] += 1;
  }
  if (repairs.length) plans.push({ slug, rootFile, mirrorFile, root, repairs });
}

if (errors.length) {
  if (JSON_OUTPUT) console.log(JSON.stringify({ errors }, null, 2));
  else {
    console.error(`repair_runtime_placeholders: ${errors.length} problem(s); nothing written.`);
    errors.slice(0, 80).forEach((error) => console.error(`  - ${error}`));
  }
  process.exit(1);
}

if (APPLY) {
  for (const plan of plans) {
    for (const repair of plan.repairs) setDeep(plan.root, repair.key, repair.value);
    const output = JSON.stringify(plan.root, null, 2) + '\n';
    replaceFile(plan.rootFile, output);
    replaceFile(plan.mirrorFile, output);
    totalRepairs += plan.repairs.length;
  }
} else {
  totalRepairs = plans.reduce((total, plan) => total + plan.repairs.length, 0);
}

const report = {
  apply: APPLY,
  runtimeKeys: targetKeys.length,
  packCount: slugs.length,
  totalMismatches,
  totalRepairs,
  repairsByPolicy,
  unresolvedByKey: Object.fromEntries(Object.entries(unresolvedByKey).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
  skipped,
  affectedPacks: plans.length,
};

if (JSON_OUTPUT) console.log(JSON.stringify(report, null, 2));
else if (!QUIET) {
  console.log(`repair_runtime_placeholders: ${targetKeys.length} runtime keys x ${slugs.length} pack(s)`);
  console.log(`  Mismatches: ${totalMismatches}; exact repairs: ${totalRepairs}`);
  console.log(`  Policies: standaloneN=${repairsByPolicy.standaloneN}; repeatedNPlaceholderAlias=${repairsByPolicy.repeatedNPlaceholderAlias}; staleCountToken=${repairsByPolicy.staleCountToken}; knownMalformedFallback=${repairsByPolicy.knownMalformedFallback}`);
  if (skipped.length) console.log(`  Skipped mirror drift packs: ${skipped.length}`);
  if (Object.keys(unresolvedByKey).length) console.log(`  Unresolved keys: ${Object.entries(unresolvedByKey).map(([key, count]) => `${key} (${count})`).join(', ')}`);
  console.log(`  ${APPLY ? `Wrote ${plans.length} repaired pack pair(s).` : 'Dry run only; pass --apply to write.'}`);
} else {
  console.log(`repair_runtime_placeholders: mismatches=${totalMismatches}; repairs=${totalRepairs}; unresolved=${Object.keys(unresolvedByKey).length}; skipped=${skipped.length}`);
}

if (GATE && (totalMismatches > totalRepairs || skipped.length)) {
  console.error(`repair_runtime_placeholders: gate failed with ${totalMismatches - totalRepairs} unresolved mismatch(es) and ${skipped.length} skipped drift pack(s).`);
  process.exit(1);
}
