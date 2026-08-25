'use strict';

// Reuse an existing translation only when the command's English source is an
// exact match for a translated ui_strings.js leaf in the same pack. This is a
// conservative bridge for command keys that were registered after the main UI
// catalog already had the same copy. It never overwrites a non-English value,
// never guesses from another language, and rejects ambiguous/context-sensitive
// candidates.
//
// Usage:
//   node dev-tools/i18n/merge_cmd_ui_translations.cjs
//   node dev-tools/i18n/merge_cmd_ui_translations.cjs --apply
//   node dev-tools/i18n/merge_cmd_ui_translations.cjs --lang=french --apply
//   node dev-tools/i18n/merge_cmd_ui_translations.cjs --gate --quiet

const fs = require('node:fs');
const path = require('node:path');

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

// A short grammatical fragment can vary by sentence even when its English
// source is identical. Keep this out of automatic reuse until a command-aware
// translation is reviewed. The report still exposes its identity debt.
const CONTEXT_SENSITIVE_KEYS = new Set(['cmd.read_this_page_of']);

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
const allow = readJson(ALLOWLIST_FILE);
const allowKeys = new Set(allow.keys || []);
const allowValues = new Set(allow.values || []);
const ui = flatten(readJson(UI_FILE));
const sourceByEnglish = new Map();
for (const [key, value] of Object.entries(ui)) {
  if (typeof value !== 'string' || !value.trim()) continue;
  const sources = sourceByEnglish.get(value) || [];
  sources.push(key);
  sourceByEnglish.set(value, sources);
}

function isAllowed(key, value) {
  return key.startsWith('palette.ctx.') || allowKeys.has(key) || allowValues.has(value);
}

const availableSlugs = fs.readdirSync(LANG_DIR)
  .filter((file) => file.endsWith('.js') && !file.startsWith('.'))
  .map((file) => file.replace(/\.js$/, ''))
  .sort();
if (requestedSlug && !availableSlugs.includes(requestedSlug)) {
  console.error(`Unknown language slug: ${requestedSlug}`);
  process.exit(2);
}
const slugs = requestedSlug ? [requestedSlug] : availableSlugs;
const errors = [];
const plans = [];
let totalIdentities = 0;
let totalRecoverable = 0;
let totalAmbiguous = 0;
let totalContextSkipped = 0;
let totalWritten = 0;

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

  const pack = readJson(rootFile);
  const recoveries = [];
  const ambiguous = [];
  const contextSkipped = [];
  for (const [key, englishValue] of Object.entries(english)) {
    if (isAllowed(key, englishValue)) continue;
    const current = getDeep(pack, key);
    if (current !== englishValue || typeof englishValue !== 'string' || !englishValue.trim()) continue;
    totalIdentities += 1;
    if (CONTEXT_SENSITIVE_KEYS.has(key)) {
      contextSkipped.push(key);
      totalContextSkipped += 1;
      continue;
    }
    const candidates = new Set();
    for (const sourceKey of sourceByEnglish.get(englishValue) || []) {
      const value = getDeep(pack, sourceKey);
      if (typeof value === 'string' && value.trim() && value !== englishValue && samePlaceholders(value, englishValue)) {
        candidates.add(value);
      }
    }
    if (candidates.size === 1) recoveries.push({ key, value: [...candidates][0] });
    else if (candidates.size > 1) ambiguous.push({ key, candidates: [...candidates].slice(0, 8) });
  }
  totalRecoverable += recoveries.length;
  totalAmbiguous += ambiguous.length;
  plans.push({ slug, rootFile, mirrorFile, pack, recoveries, ambiguous, contextSkipped });
}

if (errors.length) {
  const message = `merge_cmd_ui_translations: ${errors.length} problem(s); nothing written.`;
  if (JSON_OUTPUT) console.log(JSON.stringify({ errors }, null, 2));
  else {
    console.error(message);
    errors.slice(0, 80).forEach((error) => console.error(`  - ${error}`));
  }
  process.exit(1);
}

for (const plan of plans) {
  if (!APPLY || !plan.recoveries.length) continue;
  for (const { key, value } of plan.recoveries) setDeep(plan.pack, key, value);
  writePair(plan.rootFile, plan.mirrorFile, plan.pack);
  totalWritten += plan.recoveries.length;
}

fs.mkdirSync(REPORT_DIR, { recursive: true });
const report = {
  apply: APPLY,
  languageCount: plans.length,
  canonicalKeyCount: Object.keys(english).length,
  totalIdentities,
  totalRecoverable,
  totalAmbiguous,
  totalContextSkipped,
  totalWritten,
  contextSensitiveKeys: [...CONTEXT_SENSITIVE_KEYS],
  perPack: Object.fromEntries(plans.map((plan) => [plan.slug, {
    recoverable: plan.recoveries.length,
    ambiguous: plan.ambiguous.length,
    contextSkipped: plan.contextSkipped.length,
    recoverableKeys: plan.recoveries.map(({ key }) => key),
    ambiguousKeys: plan.ambiguous,
  }])),
};
replaceFile(path.join(REPORT_DIR, '_summary.json'), JSON.stringify(report, null, 2) + '\n');

if (JSON_OUTPUT) {
  console.log(JSON.stringify(report, null, 2));
} else if (!QUIET) {
  console.log(`merge_cmd_ui_translations: ${plans.length} pack(s); identities=${totalIdentities}; recoverable=${totalRecoverable}; ambiguous=${totalAmbiguous}; contextSkipped=${totalContextSkipped}; written=${totalWritten}`);
} else {
  console.log(`merge_cmd_ui_translations: identities=${totalIdentities}; recoverable=${totalRecoverable}; ambiguous=${totalAmbiguous}; contextSkipped=${totalContextSkipped}; written=${totalWritten}`);
}

if (GATE && !APPLY && totalRecoverable > 0) {
  console.error(`merge_cmd_ui_translations: gate failed with ${totalRecoverable} exact, unique UI translations pending; run with --apply first.`);
  process.exit(1);
}
