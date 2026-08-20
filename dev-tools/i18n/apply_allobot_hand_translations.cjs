#!/usr/bin/env node
'use strict';

/**
 * Merge a reviewed, hand-authored AlloBot translation batch.
 *
 * Payload shape:
 * {
 *   "spanish_latin_america": {
 *     "tips.student_extra_goal": "...",
 *     "bot_events.student_resource_ready": "..."
 *   }
 * }
 *
 * The command is deliberately stricter than the generic namespace merger:
 * every key must come from the current English AlloBot catalog, every
 * placeholder must be preserved, and an exact English copy is rejected unless
 * the caller explicitly opts into --allow-english. Root and deployed packs
 * are updated together for every AlloBot key while unrelated namespaces keep
 * their existing (possibly staged) differences.
 * Existing values are preserved by default; use --replace when a reviewed
 * correction intentionally supersedes an existing value.
 */

const fs = require('fs');
const path = require('path');
const { LANGUAGE_CODES, isAlloBotKey } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const PUBLIC_LANG_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const args = process.argv.slice(2);
const payloadPath = args.find((arg) => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');
const replace = args.includes('--replace');
const allowEnglish = args.includes('--allow-english');
const requireComplete = args.includes('--require-complete');

if (!payloadPath) {
  console.error('Usage: node apply_allobot_hand_translations.cjs <payload.json> [--dry-run] [--replace] [--allow-english] [--require-complete]');
  process.exit(2);
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const flatten = (value, prefix = '', output = {}) => {
  for (const [key, child] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, output);
    else output[full] = child;
  }
  return output;
};
const placeholders = (value) => (String(value).match(/\{[^{}]+\}/g) || []).sort();
const atomicWrite = (file, value) => {
  const temp = `${file}.allobot-tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  try {
    fs.renameSync(temp, file);
  } catch (_) {
    fs.copyFileSync(temp, file);
    try { fs.unlinkSync(temp); } catch (__) { /* best effort cleanup */ }
  }
};
const setDeep = (object, dottedKey, value) => {
  const parts = dottedKey.split('.');
  let cursor = object;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
};

if (!fs.existsSync(payloadPath)) {
  console.error(`Payload not found: ${payloadPath}`);
  process.exit(2);
}

const source = flatten(readJson(path.join(ROOT, 'ui_strings.js')));
const allobotSource = Object.fromEntries(
  Object.entries(source).filter(([key, value]) => isAlloBotKey(key) && typeof value === 'string'),
);
const sourceKeys = new Set(Object.keys(allobotSource));
const payload = readJson(path.resolve(payloadPath));
const errors = [];
const results = [];
const pendingWrites = [];

for (const [slug, entries] of Object.entries(payload || {})) {
  if (!Object.prototype.hasOwnProperty.call(LANGUAGE_CODES, slug)) {
    errors.push(`${slug}: unknown language pack`);
    continue;
  }
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
    errors.push(`${slug}: payload must be an object of dotted AlloBot keys`);
    continue;
  }
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const publicFile = path.join(PUBLIC_LANG_DIR, `${slug}.js`);
  if (!fs.existsSync(rootFile) || !fs.existsSync(publicFile)) {
    errors.push(`${slug}: root/public language pack is missing`);
    continue;
  }
  const rootText = fs.readFileSync(rootFile, 'utf8');
  const publicText = fs.readFileSync(publicFile, 'utf8');
  const rootPack = JSON.parse(rootText);
  const publicPack = JSON.parse(publicText);
  const rootFlat = flatten(rootPack);
  const publicFlat = flatten(publicPack);
  const mirrorDrift = [...sourceKeys].some((key) => rootFlat[key] !== publicFlat[key]);
  if (mirrorDrift) {
    errors.push(`${slug}: root/public AlloBot keys already differ; resolve that drift before applying a batch`);
    continue;
  }
  let added = 0;
  let replaced = 0;
  let preserved = 0;
  for (const [key, value] of Object.entries(entries)) {
    if (!sourceKeys.has(key)) {
      errors.push(`${slug}: unknown/non-AlloBot key ${key}`);
      continue;
    }
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(`${slug}.${key}: translation must be a non-empty string`);
      continue;
    }
    if (JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(allobotSource[key]))) {
      errors.push(`${slug}.${key}: placeholder mismatch (expected ${placeholders(allobotSource[key]).join(', ') || 'none'})`);
      continue;
    }
    if (!allowEnglish && value === allobotSource[key]) {
      errors.push(`${slug}.${key}: exact English copy rejected; use a reviewed translation or --allow-english explicitly`);
      continue;
    }
    const existed = Object.prototype.hasOwnProperty.call(rootFlat, key);
    if (existed && !replace) {
      preserved += 1;
      continue;
    }
    setDeep(rootPack, key, value);
    setDeep(publicPack, key, value);
    if (existed) replaced += 1;
    else added += 1;
    rootFlat[key] = value;
    publicFlat[key] = value;
  }
  if (requireComplete) {
    const missing = [...sourceKeys].filter((key) => !Object.prototype.hasOwnProperty.call(entries, key));
    if (missing.length) errors.push(`${slug}: --require-complete needs all ${sourceKeys.size} keys (missing ${missing.length})`);
  }
  results.push({ slug, added, replaced, preserved, supplied: Object.keys(entries).length });
  pendingWrites.push({ rootFile, publicFile, rootPack, publicPack });
}

if (errors.length) {
  console.error(errors.map((error) => `ERROR ${error}`).join('\n'));
  process.exit(1);
}

if (!dryRun) {
  for (const { rootFile, publicFile, rootPack, publicPack } of pendingWrites) {
    atomicWrite(rootFile, rootPack);
    atomicWrite(publicFile, publicPack);
  }
}

const total = results.reduce((sum, row) => sum + row.added + row.replaced, 0);
console.log(`${dryRun ? 'DRY-RUN' : 'APPLIED'} ${total} hand translation value(s) across ${results.length} pack(s).`);
for (const row of results) {
  console.log(`  ${row.slug}: +${row.added} replaced ${row.replaced} preserved ${row.preserved} supplied ${row.supplied}`);
}
