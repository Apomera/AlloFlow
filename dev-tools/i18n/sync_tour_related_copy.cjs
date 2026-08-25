#!/usr/bin/env node
'use strict';

// Seed newly introduced guided-tour keys from already reviewed, semantically
// equivalent localized UI copy. This is intentionally an explicit reuse map:
// it closes a namespace/coverage gap without pretending to be a fresh native
// translation of a long tour paragraph. A later native review can replace any
// reused value in place.
//
// Usage:
//   node dev-tools/i18n/sync_tour_related_copy.cjs
//   node dev-tools/i18n/sync_tour_related_copy.cjs --apply

const fs = require('node:fs');
const path = require('node:path');
const { LANGUAGE_CODES } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const APPLY = process.argv.includes('--apply');

// The source labels are present in every canonical pack and describe the same
// UI surfaces as the four new tour fallbacks.
const REUSE_MAP = {
  'tour.tool_finder_title': 'sidebar.tool_finder_title',
  'tour.tool_finder_text': 'sidebar.tool_finder_hint',
  'tour.directions_title': 'directions.title',
  'tour.directions_text': 'directions.subtitle',
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
    if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object' || Array.isArray(cursor[parts[i]])) {
      cursor[parts[i]] = {};
    }
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
}

function writePair(rootFile, mirrorFile, value) {
  const rootTmp = `${rootFile}.tour-copy-${process.pid}.tmp`;
  const mirrorTmp = `${mirrorFile}.tour-copy-${process.pid}.tmp`;
  const text = JSON.stringify(value, null, 2) + '\n';
  try {
    fs.writeFileSync(rootTmp, text, 'utf8');
    fs.writeFileSync(mirrorTmp, text, 'utf8');
    fs.renameSync(rootTmp, rootFile);
    fs.renameSync(mirrorTmp, mirrorFile);
  } finally {
    if (fs.existsSync(rootTmp)) fs.unlinkSync(rootTmp);
    if (fs.existsSync(mirrorTmp)) fs.unlinkSync(mirrorTmp);
  }
}

const errors = [];
const pending = [];
let totalChanged = 0;
let totalAlreadyCurrent = 0;

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

  let pack;
  try {
    pack = readJson(rootFile);
  } catch (error) {
    errors.push(`${slug}: invalid JSON (${error.message})`);
    continue;
  }

  const changes = [];
  for (const [targetKey, sourceKey] of Object.entries(REUSE_MAP)) {
    const source = getDeep(pack, sourceKey);
    const current = getDeep(pack, targetKey);
    if (typeof source !== 'string' || !source.trim()) {
      errors.push(`${slug}: ${sourceKey} is missing or not a non-empty string`);
      continue;
    }
    if (current !== undefined && current !== null && String(current).trim() !== '') {
      if (current === source) totalAlreadyCurrent += 1;
      else errors.push(`${slug}: refusing to overwrite existing ${targetKey}`);
      continue;
    }
    setDeep(pack, targetKey, source);
    changes.push(`${targetKey} <- ${sourceKey}`);
    totalChanged += 1;
  }

  if (changes.length) pending.push({ rootFile, mirrorFile, pack });
}

if (errors.length) {
  console.error(`sync_tour_related_copy: ${errors.length} problem(s); nothing written.`);
  for (const error of errors.slice(0, 80)) console.error(`  - ${error}`);
  if (errors.length > 80) console.error(`  ...and ${errors.length - 80} more`);
  process.exit(1);
}

if (APPLY) {
  for (const { rootFile, mirrorFile, pack } of pending) writePair(rootFile, mirrorFile, pack);
}

console.log(`sync_tour_related_copy: ${totalChanged} value(s) ${APPLY ? 'written' : 'would be written'}; ${totalAlreadyCurrent} already current.`);
