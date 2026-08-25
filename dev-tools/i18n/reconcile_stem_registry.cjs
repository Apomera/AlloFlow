#!/usr/bin/env node
'use strict';

// Register every literal stem.* key called by a STEM tool.
//
// A tool-level fallback can make a missing key look harmless in English, but
// it is still impossible to translate until the same leaf exists in
// ui_strings.js and the language packs. This reconciler uses the strongest
// English source available in this order:
//   1. a checked-in per-tool English extraction table;
//   2. a checked-in STEM report catalog;
//   3. the literal fallback at the call site;
//   4. a readable label derived from the key (reported for review).
//
// Existing source leaves and existing pack values are never replaced.
// Canonical/deployed mirrors must already match before --apply can write.
//
// Usage:
//   node dev-tools/i18n/reconcile_stem_registry.cjs          # dry run
//   node dev-tools/i18n/reconcile_stem_registry.cjs --apply
//   node dev-tools/i18n/reconcile_stem_registry.cjs --lang=french --apply

const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '..', '..');
const UI_FILE = path.join(ROOT, 'ui_strings.js');
const UI_MIRROR_FILE = path.join(ROOT, 'desktop', 'web-app', 'public', 'ui_strings.js');
const TOOL_DIR = path.join(ROOT, 'stem_lab');
const LANG_DIR = path.join(ROOT, 'lang');
const LANG_MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const I18N_DIR = __dirname;
const REPORT_DIR = path.join(ROOT, 'dev-tools', 'stem_i18n_report');
const APPLY = process.argv.includes('--apply');
const GATE = process.argv.includes('--gate');
const langArg = process.argv.find((arg) => arg.startsWith('--lang='));
const requestedSlug = langArg ? langArg.slice('--lang='.length) : null;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out[full] = child;
  }
  return out;
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

function getDeep(target, dottedKey) {
  return dottedKey.split('.').reduce((value, key) => value == null ? undefined : value[key], target);
}

function replaceFile(file, text) {
  const temporary = `${file}.stem-reconcile-${process.pid}.tmp`;
  const transientCodes = new Set(['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN']);
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      fs.writeFileSync(temporary, text, 'utf8');
      try {
        fs.renameSync(temporary, file);
      } catch (error) {
        // OneDrive can hold the destination during a sync tick. Fall back to
        // an in-place copy, then retry the complete pair write if that copy is
        // also transiently denied.
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

function writeJsonPair(file, mirrorFile, value) {
  const output = JSON.stringify(value, null, 2) + '\n';
  replaceFile(file, output);
  replaceFile(mirrorFile, output);
}

function toolNameFromFile(file) {
  return path.basename(file).replace(/^stem_tool_/, '').replace(/\.js$/, '');
}

function getCalleeName(callee) {
  if (!callee) return null;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type !== 'MemberExpression' || callee.computed) return null;
  return callee.property && callee.property.type === 'Identifier' ? callee.property.name : null;
}

function staticString(node) {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const left = staticString(node.left);
    const right = staticString(node.right);
    return left !== null && right !== null ? left + right : null;
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0] && node.quasis[0].value.cooked;
  }
  return null;
}

function collectCalls(file) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = acorn.parse(source, { ecmaVersion: 2022, sourceType: 'script', locations: true });
  const calls = [];
  const walk = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'CallExpression' && ['t', '__alloT'].includes(getCalleeName(node.callee))) {
      const key = staticString(node.arguments[0]);
      if (key && /^stem\.[A-Za-z0-9_$-]+\.[A-Za-z0-9_$.-]+$/.test(key)) {
        calls.push({
          key,
          fallback: staticString(node.arguments[1]),
          file: path.relative(ROOT, file),
          line: node.loc && node.loc.start.line,
        });
      }
    }
    for (const property of Object.keys(node)) {
      if (property === 'loc' || property === 'start' || property === 'end') continue;
      const value = node[property];
      if (Array.isArray(value)) value.forEach((child) => child && typeof child.type === 'string' && walk(child));
      else if (value && typeof value.type === 'string') walk(value);
    }
  };
  walk(ast);
  return calls;
}

function addCandidate(map, key, value, source, priority) {
  if (typeof value !== 'string' || !value.trim()) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push({ value, source, priority });
}

function addCatalogCandidates(map) {
  const englishFiles = fs.readdirSync(I18N_DIR)
    .filter((file) => /^stem_.+_en\.json$/.test(file));
  for (const file of englishFiles) {
    const tool = file.replace(/^stem_/, '').replace(/_en\.json$/, '');
    const catalog = readJson(path.join(I18N_DIR, file));
    for (const [key, value] of Object.entries(flatten(catalog))) {
      addCandidate(map, `stem.${tool}.${key}`, value, `i18n/${file}`, 10);
    }
  }

  if (!fs.existsSync(REPORT_DIR)) return;
  const reportFiles = fs.readdirSync(REPORT_DIR)
    .filter((file) => /^ui_strings_stem_.+\.json$/.test(file));
  for (const file of reportFiles) {
    const catalog = readJson(path.join(REPORT_DIR, file));
    const flat = flatten(catalog);
    const basenameTool = file.replace(/^ui_strings_stem_/, '').replace(/\.json$/, '');
    for (const [key, value] of Object.entries(flat)) {
      const fullKey = key.startsWith('stem.') ? key : `stem.${key}`;
      if (fullKey.split('.').length >= 3) addCandidate(map, fullKey, value, `stem_i18n_report/${file}`, 20);
      else addCandidate(map, `stem.${basenameTool}.${key}`, value, `stem_i18n_report/${file}`, 20);
    }
  }
}

function humanizeKey(key) {
  const leaf = key.split('.').pop()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return leaf ? leaf.charAt(0).toUpperCase() + leaf.slice(1) : key;
}

function chooseCandidate(candidates) {
  if (!candidates || !candidates.length) return null;
  const byValue = new Map();
  for (const candidate of candidates) {
    const entry = byValue.get(candidate.value) || { count: 0, bestPriority: Infinity, sources: [] };
    entry.count += 1;
    entry.bestPriority = Math.min(entry.bestPriority, candidate.priority);
    entry.sources.push(candidate.source);
    byValue.set(candidate.value, entry);
  }
  return [...byValue.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].bestPriority - b[1].bestPriority || b[0].length - a[0].length)[0][0];
}

const errors = [];
const calls = [];
for (const file of fs.readdirSync(TOOL_DIR).filter((name) => /^stem_tool_.*\.js$/.test(name)).sort()) {
  const full = path.join(TOOL_DIR, file);
  try {
    calls.push(...collectCalls(full));
  } catch (error) {
    errors.push(`${file}: ${error.message}`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const byKey = new Map();
for (const call of calls) {
  if (!byKey.has(call.key)) byKey.set(call.key, []);
  byKey.get(call.key).push(call);
}

const ui = readJson(UI_FILE);
const currentUi = flatten(ui);
const candidates = new Map();
for (const [key, entries] of byKey) {
  for (const entry of entries) {
    if (entry.fallback) addCandidate(candidates, key, entry.fallback, `${entry.file}:${entry.line}`, 30);
  }
}
addCatalogCandidates(candidates);

const values = new Map();
const sourceKeysToAdd = [];
const generated = [];
const conflicts = [];
for (const key of [...byKey.keys()].sort()) {
  if (typeof currentUi[key] === 'string' && currentUi[key].trim()) {
    // An existing English source leaf still needs to be considered below:
    // older pack runs may have missed it before the source was registered.
    values.set(key, currentUi[key]);
    continue;
  }
  const value = chooseCandidate(candidates.get(key)) || humanizeKey(key);
  if (!candidates.has(key) || !candidates.get(key).length) generated.push({ key, value });
  const distinct = new Set((candidates.get(key) || []).map((candidate) => candidate.value));
  if (distinct.size > 1) conflicts.push({ key, values: [...distinct].slice(0, 8) });
  values.set(key, value);
  sourceKeysToAdd.push(key);
}

const calledKeys = [...values.keys()];
const availableSlugs = fs.readdirSync(LANG_DIR)
  .filter((file) => file.endsWith('.js') && !file.startsWith('.'))
  .map((file) => file.replace(/\.js$/, ''))
  .sort();
if (requestedSlug && !availableSlugs.includes(requestedSlug)) {
  console.error(`Unknown language slug: ${requestedSlug}`);
  process.exit(2);
}
const slugs = requestedSlug ? [requestedSlug] : availableSlugs;

for (const slug of slugs) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(LANG_MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(mirrorFile)) errors.push(`${slug}: deploy mirror missing`);
  else if (fs.readFileSync(rootFile, 'utf8') !== fs.readFileSync(mirrorFile, 'utf8')) errors.push(`${slug}: root/public mirror drift`);
}
if (fs.readFileSync(UI_FILE, 'utf8') !== fs.readFileSync(UI_MIRROR_FILE, 'utf8')) errors.push('ui_strings.js: root/public mirror drift');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

let packsMissing = 0;
let packsWritten = 0;
if (APPLY && sourceKeysToAdd.length) {
  for (const key of sourceKeysToAdd) setDeep(ui, key, values.get(key));
  writeJsonPair(UI_FILE, UI_MIRROR_FILE, ui);
}
for (const slug of slugs) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const pack = readJson(rootFile);
  const missing = calledKeys.filter((key) => {
    const current = getDeep(pack, key);
    return current === undefined || current === null || (typeof current === 'string' && !current.trim());
  });
  packsMissing += missing.length;
  if (APPLY && missing.length) {
    for (const key of missing) setDeep(pack, key, values.get(key));
    writeJsonPair(rootFile, path.join(LANG_MIRROR_DIR, `${slug}.js`), pack);
    packsWritten += 1;
  }
}

if (errors.length) process.exit(1);
console.log(`reconcile_stem_registry: ${byKey.size} called key(s); ${sourceKeysToAdd.length} source leaf(s) to add; ${slugs.length} pack(s)`);
console.log(`  Pack leaves missing before apply: ${packsMissing}`);
console.log(`  Conflicting English candidates: ${conflicts.length}`);
console.log(`  Synthesized readable labels: ${generated.length}`);
if (sourceKeysToAdd.length) console.log(`  Pending source sample: ${sourceKeysToAdd.slice(0, 16).join(', ')}`);
if (generated.length) console.log(`    ${generated.slice(0, 12).map((item) => `${item.key}=${JSON.stringify(item.value)}`).join('\n    ')}`);
if (conflicts.length) console.log(`    conflict sample: ${conflicts.slice(0, 5).map((item) => item.key).join(', ')}`);

console.log(APPLY
  ? `  Added ${sourceKeysToAdd.length} source leaves and updated ${packsWritten} pack mirror pair(s).`
  : '  Dry run only; pass --apply to register source leaves and fill missing pack leaves.');

if (GATE && !APPLY && (sourceKeysToAdd.length || packsMissing)) {
  console.error(`reconcile_stem_registry: gate failed with ${sourceKeysToAdd.length} source and ${packsMissing} pack leaves pending; run with --apply first.`);
  process.exit(1);
}
