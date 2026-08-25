#!/usr/bin/env node
'use strict';

// Correct a single generated English fallback whose readable-label synthesis
// was not appropriate for the runtime label. Keep this explicit and guarded:
// if a pack has been translated or otherwise changed, do not overwrite it.
//
// Usage:
//   node dev-tools/i18n/fix_obvious_stem_labels.cjs
//   node dev-tools/i18n/fix_obvious_stem_labels.cjs --apply

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const APPLY = process.argv.includes('--apply');
const KEY = 'stem.rocks.wb_matches_count';
const OLD = 'Wb matches count';
const NEXT = 'matches';

function readPack(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function getDeep(target, dottedKey) {
  return dottedKey.split('.').reduce((value, part) => value == null ? undefined : value[part], target);
}

function setDeep(target, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) cursor = cursor[parts[i]];
  cursor[parts[parts.length - 1]] = value;
}

function replaceFile(file, text) {
  const temporary = `${file}.stem-label-fix-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

const errors = [];
let changed = 0;
const slugs = fs.readdirSync(LANG_DIR)
  .filter((file) => file.endsWith('.js'))
  .map((file) => file.replace(/\.js$/, ''))
  .sort();

for (const slug of slugs) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(mirrorFile)) {
    errors.push(`${slug}: deployed mirror missing`);
    continue;
  }
  const rootText = fs.readFileSync(rootFile, 'utf8');
  const mirrorText = fs.readFileSync(mirrorFile, 'utf8');
  if (rootText !== mirrorText) {
    errors.push(`${slug}: root/public mirror drift; refusing to overwrite`);
    continue;
  }
  const pack = readPack(rootFile);
  const current = getDeep(pack, KEY);
  if (current !== OLD && current !== NEXT) {
    errors.push(`${slug}: unexpected ${KEY} value ${JSON.stringify(current)}`);
    continue;
  }
  if (current === NEXT) continue;
  changed += 1;
  if (APPLY) {
    setDeep(pack, KEY, NEXT);
    const output = JSON.stringify(pack, null, 2) + '\n';
    JSON.parse(output);
    replaceFile(rootFile, output);
    replaceFile(mirrorFile, output);
  }
}

if (errors.length) {
  console.error(`fix_obvious_stem_labels: ${errors.length} problem(s); nothing written.`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`fix_obvious_stem_labels: ${changed} correction(s)${APPLY ? ' applied' : ' pending'}.`);
