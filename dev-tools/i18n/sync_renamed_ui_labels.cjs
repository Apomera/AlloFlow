#!/usr/bin/env node
'use strict';

// Product-name renames are not ordinary prose translations: leaving the old
// localized label in a pack makes the current English source lose at runtime.
// This small, explicit map normalizes only the two Blueprint Mode labels. It
// never touches unrelated translated values.
//
// Usage:
//   node dev-tools/i18n/sync_renamed_ui_labels.cjs          # dry run
//   node dev-tools/i18n/sync_renamed_ui_labels.cjs --apply
//   node dev-tools/i18n/sync_renamed_ui_labels.cjs --restore-overwritten --apply

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { LANGUAGE_CODES } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const APPLY = process.argv.includes('--apply');
const RESTORE_OVERWRITTEN = process.argv.includes('--restore-overwritten');

const RENAMED_LABELS = {
  'common.toggle_is_auto_fill_mode': 'Toggle Blueprint Mode',
  'chat_guide.autofill_label': 'Blueprint Mode',
};

// These are the old English source labels. A pack value is eligible for the
// normal rename only when it is still exactly the old source label. Any other
// value is presumed to be a translation and must be preserved.
const OLD_ENGLISH_LABELS = {
  'common.toggle_is_auto_fill_mode': 'Toggle is auto fill mode',
  'chat_guide.autofill_label': 'Auto-Fill Settings',
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function getDeep(target, dottedKey) {
  return dottedKey.split('.').reduce((value, key) => value == null ? undefined : value[key], target);
}

function setDeep(target, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object' || Array.isArray(cursor[parts[i]])) cursor[parts[i]] = {};
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
}

function replaceFile(file, text) {
  const temporary = `${file}.rename-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    try {
      fs.renameSync(temporary, file);
    } catch (error) {
      // OneDrive can briefly deny replacement of a mirrored file even though
      // it permits opening the file for a normal write. Keep the operation
      // retryable rather than leaving the root and deploy copies divergent.
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      fs.writeFileSync(file, text, 'utf8');
    }
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function readHeadPack(slug) {
  const text = execFileSync('git', ['show', `HEAD:lang/${slug}.js`], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(text.replace(/^\uFEFF/, ''));
}

const errors = [];
let totalChanged = 0;
let totalAlreadyCurrent = 0;
let totalPreservedTranslations = 0;
let totalRestored = 0;
for (const slug of Object.keys(LANGUAGE_CODES)) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(rootFile) || !fs.existsSync(mirrorFile)) {
    errors.push(`${slug}: root or deploy mirror file is missing`);
    continue;
  }
  const rootText = fs.readFileSync(rootFile, 'utf8');
  const mirrorText = fs.readFileSync(mirrorFile, 'utf8');
  if (rootText !== mirrorText) {
    errors.push(`${slug}: root/public mirror drift; refusing to overwrite it`);
    continue;
  }
  const pack = readJson(rootFile);
  let headPack;
  if (RESTORE_OVERWRITTEN) {
    try {
      headPack = readHeadPack(slug);
    } catch (error) {
      errors.push(`${slug}: could not read HEAD snapshot (${error.message})`);
      continue;
    }
  }
  const changes = [];
  for (const [key, value] of Object.entries(RENAMED_LABELS)) {
    const current = getDeep(pack, key);
    if (typeof current !== 'string') {
      errors.push(`${slug}: ${key} is missing or not a string`);
      continue;
    }
    if (current === value) {
      const headValue = headPack && getDeep(headPack, key);
      // The previous bulk rename wrote the new English value over native
      // translations. Restore only when HEAD proves that exact history; do
      // not guess from script or character heuristics.
      if (
        RESTORE_OVERWRITTEN &&
        typeof headValue === 'string' &&
        headValue !== value &&
        headValue !== OLD_ENGLISH_LABELS[key] &&
        headValue.trim() !== ''
      ) {
        setDeep(pack, key, headValue);
        changes.push(key);
        totalChanged += 1;
        totalRestored += 1;
      } else {
        totalAlreadyCurrent += 1;
      }
    } else if (current === OLD_ENGLISH_LABELS[key]) {
      setDeep(pack, key, value);
      changes.push(key);
      totalChanged += 1;
    } else {
      totalPreservedTranslations += 1;
    }
  }
  if (APPLY && changes.length) {
    const out = JSON.stringify(pack, null, 2) + '\n';
    replaceFile(rootFile, out);
    replaceFile(mirrorFile, out);
  }
}

if (errors.length) {
  console.error(`sync_renamed_ui_labels: ${errors.length} problem(s); nothing written.`);
  for (const error of errors.slice(0, 80)) console.error(`  - ${error}`);
  if (errors.length > 80) console.error(`  ...and ${errors.length - 80} more`);
  process.exit(1);
}

console.log(
  `sync_renamed_ui_labels: ${totalChanged} value(s) ${APPLY ? 'written' : 'would be written'}; ` +
  `${totalAlreadyCurrent} already current; ${totalPreservedTranslations} existing translation(s) preserved` +
  `${RESTORE_OVERWRITTEN ? `; ${totalRestored} overwritten translation(s) ${APPLY ? 'restored' : 'would be restored'}` : ''}.`,
);
