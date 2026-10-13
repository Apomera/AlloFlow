'use strict';

// Reuse an existing translation only when the command's English source is an
// exact match for a translated ui_strings.js leaf in the same pack. This is a
// conservative bridge for command keys that were registered after the main UI
// catalog already had the same copy. It never overwrites a non-English value,
// never guesses from another language, and rejects ambiguous/context-sensitive
// candidates. Exact matching identifies candidates, not reviewed translations:
// applying them requires an explicit source-to-command review bound to the
// current English and translated values.
//
// Usage:
//   node dev-tools/i18n/merge_cmd_ui_translations.cjs
//   node dev-tools/i18n/merge_cmd_ui_translations.cjs --apply --review-file=reviews.json
//   node dev-tools/i18n/merge_cmd_ui_translations.cjs --lang=french --apply --review-file=reviews.json
//   node dev-tools/i18n/merge_cmd_ui_translations.cjs --key=cmd.example --gate --json
//   node dev-tools/i18n/merge_cmd_ui_translations.cjs --gate --quiet
// Review file: { "version": 1, "approvals": [
//   { "slug": "french", "targetKey": "cmd.example", "sourceKey": "common.example",
//     "english": "Exact English", "translation": "Exact reviewed translation" }
// ] }. The file asserts review of this specific language and source/target pair.

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const UI_FILE = path.join(ROOT, 'ui_strings.js');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const COMMAND_FILE = path.join(__dirname, 'cmd_keys_en.json');
const ALLOWLIST_FILE = path.join(__dirname, 'cmd_value_identical_allowlist.json');
const REPORT_DIR = path.join(__dirname, 'cmd_ui_reuse');
const APPLY = process.argv.includes('--apply');
const GATE = process.argv.includes('--gate');
const QUIET = process.argv.includes('--quiet');
const JSON_OUTPUT = process.argv.includes('--json');
const langArg = process.argv.find((arg) => arg.startsWith('--lang='));
const requestedSlug = langArg ? langArg.slice('--lang='.length).trim() : null;
const reviewArg = process.argv.find((arg) => arg.startsWith('--review-file='));
const reviewFile = reviewArg ? reviewArg.slice('--review-file='.length).trim() : null;
const requestedKeys = new Set(process.argv.filter((arg) => arg.startsWith('--key='))
  .map((arg) => arg.slice('--key='.length)));
const inputSnapshots = new Map();

// A short grammatical fragment can vary by sentence even when its English
// source is identical. Keep this out of automatic reuse until a command-aware
// translation is reviewed. The report still exposes its identity debt.
const CONTEXT_SENSITIVE_KEYS = new Set(['cmd.read_this_page_of']);

function readJson(file) {
  const text = fs.readFileSync(file, 'utf8');
  inputSnapshots.set(file, fingerprint(text));
  return JSON.parse(text.replace(/^\uFEFF/, ''));
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

function placeholderTokens(value) {
  return [...String(value)
    .matchAll(/\$\{[^}]+\}|\{[^{}]+\}|<\/?[a-zA-Z][^>]*>/g)]
    .map((match) => match[0])
    .sort();
}

function samePlaceholders(left, right) {
  const a = placeholderTokens(left);
  const b = placeholderTokens(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function replaceFile(file, text) {
  const temporary = `${file}.cmd-ui-reuse-${process.pid}.tmp`;
  const transientCodes = new Set(['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN']);
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.writeFileSync(temporary, text, 'utf8');
      try {
        fs.renameSync(temporary, file);
      } catch (error) {
        if (!transientCodes.has(error.code)) throw error;
        fs.copyFileSync(temporary, file);
      }
      return;
    } catch (error) {
      lastError = error;
      if (!transientCodes.has(error.code) || attempt === 7) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 350);
    } finally {
      if (fs.existsSync(temporary)) {
        try { fs.unlinkSync(temporary); } catch (error) { lastError = error; }
      }
    }
  }
  throw lastError;
}

function writePair(rootFile, mirrorFile, pack) {
  const output = JSON.stringify(pack, null, 2) + '\n';
  replaceFile(rootFile, output);
  replaceFile(mirrorFile, output);
}

const english = readJson(COMMAND_FILE);
for (const key of requestedKeys) {
  if (!key || !Object.hasOwn(english, key)) {
    console.error(`Unknown or blank command key: ${key || '(blank)'}`);
    process.exit(2);
  }
}
const selectedKeys = Object.keys(english).filter((key) => !requestedKeys.size || requestedKeys.has(key));
const selectedKeySet = new Set(selectedKeys);
const fullAudit = !requestedSlug && !requestedKeys.size;
const reportName = fullAudit ? '_summary.json' : '_summary.scoped.json';
const allow = readJson(ALLOWLIST_FILE);
const allowKeys = new Set(allow.keys || []);
const allowValues = new Set(allow.values || []);
function commandSourceIndex() {
  const commandValues = new Set(Object.values(english));
  const sourcesByEnglish = new Map();
  for (const [key, value] of Object.entries(flatten(readJson(UI_FILE)))) {
    if (typeof value !== 'string' || !value.trim() || !commandValues.has(value)) continue;
    const sources = sourcesByEnglish.get(value) || [];
    sources.push(key);
    sourcesByEnglish.set(value, sources);
  }
  return sourcesByEnglish;
}
const sourceByEnglish = commandSourceIndex();

function fingerprint(text) {
  return createHash('sha256').update(text).digest('hex');
}

function changedReviewInputs() {
  const changed = [];
  for (const [file, snapshot] of inputSnapshots) {
    try {
      if (fingerprint(fs.readFileSync(file, 'utf8')) !== snapshot) changed.push(path.relative(ROOT, file));
    } catch (error) {
      changed.push(`${path.relative(ROOT, file)} (${error.code || error.message})`);
    }
  }
  return changed;
}

function isAllowed(key, value) {
  return key.startsWith('palette.ctx.') || allowKeys.has(key) || allowValues.has(value);
}

const availableSlugs = fs.readdirSync(LANG_DIR)
  .filter((file) => file.endsWith('.js') && !file.startsWith('.'))
  .map((file) => file.replace(/\.js$/, ''))
  .sort();
if (langArg && (!requestedSlug || !availableSlugs.includes(requestedSlug))) {
  console.error(`Unknown language slug: ${requestedSlug || '(blank)'}`);
  process.exit(2);
}
const slugs = requestedSlug ? [requestedSlug] : availableSlugs;
const errors = [];
const plans = [];
const approvals = new Map();
let totalIdentities = 0;
let totalRecoverable = 0;
let totalApproved = 0;
let totalAmbiguous = 0;
let totalContextSkipped = 0;
let totalWritten = 0;

function failWithErrors() {
  if (JSON_OUTPUT) console.log(JSON.stringify({ errors }, null, 2));
  else {
    console.error(`merge_cmd_ui_translations: ${errors.length} problem(s); nothing written.`);
    errors.slice(0, 80).forEach((error) => console.error(`  - ${error}`));
  }
  process.exit(1);
}

if (reviewArg) {
  try {
    if (!reviewFile) throw new Error('empty --review-file path');
    const review = readJson(path.resolve(reviewFile));
    if (!review || review.version !== 1 || !Array.isArray(review.approvals)) {
      throw new Error('expected version 1 and an approvals array');
    }
    for (const [index, approval] of review.approvals.entries()) {
      const fields = ['slug', 'targetKey', 'sourceKey', 'english', 'translation'];
      if (!approval || fields.some((field) => typeof approval[field] !== 'string' || !approval[field].trim())) {
        errors.push(`review approval ${index + 1}: expected nonblank slug, targetKey, sourceKey, english and translation`);
        continue;
      }
      const target = `${approval.slug}\u0000${approval.targetKey}`;
      if (approvals.has(target)) {
        errors.push(`review approval ${index + 1}: duplicate target ${approval.slug}/${approval.targetKey}`);
        continue;
      }
      if (!availableSlugs.includes(approval.slug) || !Object.hasOwn(english, approval.targetKey)) {
        errors.push(`review approval ${index + 1}: unknown language or command key`);
        continue;
      }
      if (english[approval.targetKey] !== approval.english ||
          !(sourceByEnglish.get(approval.english) || []).includes(approval.sourceKey) ||
          approval.translation.trim() === approval.english.trim() || !samePlaceholders(approval.translation, approval.english)) {
        errors.push(`review approval ${index + 1}: English, source key or placeholder contract no longer matches`);
        continue;
      }
      approvals.set(target, approval);
    }
  } catch (error) {
    errors.push(`could not load review file (${error.message})`);
  }
}
if (errors.length) failWithErrors();

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

  const pack = JSON.parse(rootText.replace(/^\uFEFF/, ''));
  for (const approval of approvals.values()) {
    if (approval.slug !== slug || !selectedKeySet.has(approval.targetKey)) continue;
    const current = getDeep(pack, approval.targetKey);
    if (getDeep(pack, approval.sourceKey) !== approval.translation ||
        (current !== approval.english && current !== approval.translation)) {
      errors.push(`${slug}/${approval.targetKey}: reviewed source or target value no longer matches`);
    }
  }
  const recoveries = [];
  const ambiguous = [];
  const contextSkipped = [];
  for (const key of selectedKeys) {
    const englishValue = english[key];
    if (isAllowed(key, englishValue)) continue;
    const current = getDeep(pack, key);
    if (current !== englishValue || typeof englishValue !== 'string' || !englishValue.trim()) continue;
    totalIdentities += 1;
    if (CONTEXT_SENSITIVE_KEYS.has(key)) {
      contextSkipped.push(key);
      totalContextSkipped += 1;
      continue;
    }
    const candidates = new Map();
    for (const sourceKey of sourceByEnglish.get(englishValue) || []) {
      const value = getDeep(pack, sourceKey);
      if (typeof value === 'string' && value.trim() && value.trim() !== englishValue.trim() && samePlaceholders(value, englishValue)) {
        const sourceKeys = candidates.get(value) || [];
        sourceKeys.push(sourceKey);
        candidates.set(value, sourceKeys);
      }
    }
    if (candidates.size === 1) {
      const [[value, sourceKeys]] = candidates;
      const approval = approvals.get(`${slug}\u0000${key}`);
      const approved = !!approval && approval.translation === value && sourceKeys.includes(approval.sourceKey);
      recoveries.push({ key, english: englishValue, value, sourceKeys, approved });
      if (approved) totalApproved += 1;
    } else if (candidates.size > 1) ambiguous.push({ key, candidates: [...candidates.keys()].slice(0, 8) });
  }
  totalRecoverable += recoveries.length;
  totalAmbiguous += ambiguous.length;
  plans.push({ slug, rootFile, mirrorFile, snapshot: fingerprint(rootText), recoveries, ambiguous, contextSkipped });
}

if (APPLY && totalRecoverable && !reviewArg) {
  errors.push('--apply requires --review-file=<path> with value-bound source-to-command approvals');
}

// Recheck review inputs and all approved targets before the first write.
if (APPLY && !errors.length) {
  for (const file of changedReviewInputs()) {
    errors.push(`${file}: review input changed after planning; refusing to apply`);
  }
  for (const plan of plans) {
    if (!plan.recoveries.some(({ approved }) => approved)) continue;
    const rootText = fs.readFileSync(plan.rootFile, 'utf8');
    const mirrorText = fs.readFileSync(plan.mirrorFile, 'utf8');
    if (rootText !== mirrorText || fingerprint(rootText) !== plan.snapshot) {
      errors.push(`${plan.slug}: pack changed after planning; refusing to overwrite it`);
    }
  }
}

if (errors.length) failWithErrors();

for (const plan of plans) {
  const approvedRecoveries = plan.recoveries.filter(({ approved }) => approved);
  if (!APPLY || !approvedRecoveries.length) continue;
  const changedInputs = changedReviewInputs();
  if (changedInputs.length) {
    console.error(`merge_cmd_ui_translations: review input changed before writing ${plan.slug}; stopped after ${totalWritten} value(s) written.`);
    changedInputs.forEach((file) => console.error(`  - ${file}`));
    process.exit(1);
  }
  const rootText = fs.readFileSync(plan.rootFile, 'utf8');
  const mirrorText = fs.readFileSync(plan.mirrorFile, 'utf8');
  if (rootText !== mirrorText || fingerprint(rootText) !== plan.snapshot) {
    console.error(`merge_cmd_ui_translations: ${plan.slug}: pack changed before writing; stopped after ${totalWritten} value(s) written.`);
    process.exit(1);
  }
  const pack = JSON.parse(rootText.replace(/^\uFEFF/, ''));
  for (const { key, value } of approvedRecoveries) setDeep(pack, key, value);
  writePair(plan.rootFile, plan.mirrorFile, pack);
  totalWritten += approvedRecoveries.length;
}

fs.mkdirSync(REPORT_DIR, { recursive: true });
const report = {
  apply: APPLY,
  languageCount: plans.length,
  canonicalKeyCount: Object.keys(english).length,
  selectedKeyCount: selectedKeys.length,
  scope: { fullAudit, language: requestedSlug, keys: requestedKeys.size ? selectedKeys : null },
  totalIdentities,
  totalRecoverable,
  totalApproved,
  totalUnreviewed: totalRecoverable - totalApproved,
  totalAmbiguous,
  totalContextSkipped,
  totalWritten,
  reviewNote: 'Exact English matches identify candidates, not translation correctness. Writes require a value-bound review of the specific language and source-to-command pair.',
  contextSensitiveKeys: [...CONTEXT_SENSITIVE_KEYS],
  perPack: Object.fromEntries(plans.map((plan) => [plan.slug, {
    recoverable: plan.recoveries.length,
    ambiguous: plan.ambiguous.length,
    contextSkipped: plan.contextSkipped.length,
    approved: plan.recoveries.filter(({ approved }) => approved).length,
    unreviewed: plan.recoveries.filter(({ approved }) => !approved).length,
    recoverableKeys: plan.recoveries.map(({ key }) => key),
    recoverableEntries: plan.recoveries,
    ambiguousKeys: plan.ambiguous,
  }])),
};
replaceFile(path.join(REPORT_DIR, reportName), JSON.stringify(report, null, 2) + '\n');

if (JSON_OUTPUT) {
  console.log(JSON.stringify(report, null, 2));
} else if (!QUIET) {
  console.log(`merge_cmd_ui_translations: scope=${fullAudit ? 'full' : 'filtered'}; ${plans.length} pack(s); identities=${totalIdentities}; recoverable=${totalRecoverable}; approved=${totalApproved}; unreviewed=${totalRecoverable - totalApproved}; ambiguous=${totalAmbiguous}; contextSkipped=${totalContextSkipped}; written=${totalWritten}`);
} else {
  console.log(`merge_cmd_ui_translations: scope=${fullAudit ? 'full' : 'filtered'}; identities=${totalIdentities}; recoverable=${totalRecoverable}; approved=${totalApproved}; unreviewed=${totalRecoverable - totalApproved}; ambiguous=${totalAmbiguous}; contextSkipped=${totalContextSkipped}; written=${totalWritten}`);
}

const pending = totalRecoverable - totalWritten;
if (GATE && pending > 0) {
  console.error(`merge_cmd_ui_translations: ${fullAudit ? 'full' : 'filtered'} gate failed with ${pending} exact-match candidate(s) pending; review the reported source-to-command pairs before applying approved values.`);
  process.exit(1);
}
