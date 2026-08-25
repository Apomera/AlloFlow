#!/usr/bin/env node
'use strict';

// The header uses common.session_default_placeholder for an ARIA label while
// the visible input uses session.default_placeholder. These are the same label
// in two paths. A stale extractor entry left the common English value as the
// literal key name and caused many packs to lose the {id} placeholder.
//
// This is intentionally narrower than a translation rewrite: a pack value is
// changed only when its placeholder signature is wrong, and the replacement is
// that same pack's existing session.default_placeholder value.
//
// Usage:
//   node dev-tools/i18n/sync_session_placeholder_label.cjs
//   node dev-tools/i18n/sync_session_placeholder_label.cjs --apply

const fs = require('node:fs');
const path = require('node:path');
const { LANGUAGE_CODES } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const APPLY = process.argv.includes('--apply');
const OLD_ENGLISH = 'session.default_placeholder';
const NEW_ENGLISH = 'Default: {id}';
const COMMON_KEY = 'common.session_default_placeholder';
const SESSION_KEY = 'session.default_placeholder';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
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

function replaceFile(file, text) {
  const temporary = `${file}.placeholder-sync-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    try {
      fs.renameSync(temporary, file);
    } catch (error) {
      // OneDrive can keep the deployed mirror open while the root pack is
      // writable. A validated same-file copy is the safe fallback here; the
      // caller has already checked root/public parity before entering this
      // function.
      if (!['EPERM', 'EACCES'].includes(error.code)) throw error;
      fs.copyFileSync(temporary, file);
    }
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

const errors = [];
const sourceFile = path.join(ROOT, 'ui_strings.js');
const sourceMirrorFile = path.join(ROOT, 'desktop', 'web-app', 'public', 'ui_strings.js');
const sourceText = fs.readFileSync(sourceFile, 'utf8');
const sourceMirrorText = fs.readFileSync(sourceMirrorFile, 'utf8');
if (sourceText !== sourceMirrorText) errors.push('ui_strings.js root/public mirror drift');
const source = readJson(sourceFile);
const currentEnglish = getDeep(source, COMMON_KEY);
if (currentEnglish !== OLD_ENGLISH && currentEnglish !== NEW_ENGLISH) {
  errors.push(`${COMMON_KEY} changed unexpectedly: ${JSON.stringify(currentEnglish)}`);
}

let sourceChanged = currentEnglish === OLD_ENGLISH;
let changed = 0;
let alreadyCorrect = 0;
const changesByPack = {};

for (const slug of Object.keys(LANGUAGE_CODES)) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(rootFile) || !fs.existsSync(mirrorFile)) {
    errors.push(`${slug}: root or deployed pack is missing`);
    continue;
  }
  const rootText = fs.readFileSync(rootFile, 'utf8');
  const mirrorText = fs.readFileSync(mirrorFile, 'utf8');
  if (rootText !== mirrorText) {
    errors.push(`${slug}: root/public mirror drift`);
    continue;
  }
  const pack = readJson(rootFile);
  const sessionValue = getDeep(pack, SESSION_KEY);
  if (typeof sessionValue !== 'string' || !sessionValue.trim()) {
    errors.push(`${slug}: ${SESSION_KEY} is missing or empty`);
    continue;
  }
  if (placeholders(sessionValue).join('|') !== placeholders(NEW_ENGLISH).join('|')) {
    errors.push(`${slug}: ${SESSION_KEY} has the wrong placeholder signature`);
    continue;
  }
  const commonValue = getDeep(pack, COMMON_KEY);
  if (typeof commonValue !== 'string') {
    errors.push(`${slug}: ${COMMON_KEY} is missing or not a string`);
    continue;
  }
  if (placeholders(commonValue).join('|') === placeholders(NEW_ENGLISH).join('|')) {
    alreadyCorrect += 1;
    changesByPack[slug] = 0;
    continue;
  }
  setDeep(pack, COMMON_KEY, sessionValue);
  changed += 1;
  changesByPack[slug] = 1;
  if (APPLY) {
    const output = JSON.stringify(pack, null, 2) + '\n';
    replaceFile(rootFile, output);
    replaceFile(mirrorFile, output);
  }
}

if (errors.length) {
  console.error(`sync_session_placeholder_label: ${errors.length} problem(s); nothing written.`);
  errors.slice(0, 80).forEach((error) => console.error(`  - ${error}`));
  if (errors.length > 80) console.error(`  ...and ${errors.length - 80} more`);
  process.exit(1);
}

if (APPLY && sourceChanged) {
  setDeep(source, COMMON_KEY, NEW_ENGLISH);
  const output = JSON.stringify(source, null, 2) + '\n';
  replaceFile(sourceFile, output);
  replaceFile(sourceMirrorFile, output);
}

console.log(`sync_session_placeholder_label: ${changed} pack value(s) ${APPLY ? 'fixed' : 'would be fixed'}; ${alreadyCorrect} already had the correct placeholder.`);
console.log(`  English source: ${sourceChanged ? (APPLY ? 'updated' : 'would update') : 'already current'}.`);
