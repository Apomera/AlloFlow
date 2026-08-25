#!/usr/bin/env node
'use strict';

// Apply only reviewed, explicit corrections for malformed translation values.
// This is intentionally a small allowlist: it must never mass-rewrite a pack
// based on heuristics or silently replace a legitimate translation.
//
// Usage:
//   node dev-tools/i18n/fix_obvious_translation_quality.cjs
//   node dev-tools/i18n/fix_obvious_translation_quality.cjs --apply

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const MIRROR_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const APPLY = process.argv.includes('--apply');
const KEY = 'functional_communication_training_planning_tool';
const FIXES = {
  dari: 'ابزار برنامه‌ریزی آموزش ارتباط کارکردی (Functional Communication Training)',
  farsi: 'ابزار برنامه‌ریزی آموزش ارتباط کارکردی (Functional Communication Training)',
  pashto: 'د Functional Communication Training د پلان جوړولو وسیله',
  urdu: 'Functional Communication Training کی منصوبہ بندی کا آلہ',
};
const OLD = {
  dari: 'ابزار رد شدنط Functional Communication Training',
  farsi: 'ابزار رد شدنط Functional Communication Training',
  pashto: 'وسیله چھاوڑیںط Functional Communication Training',
  urdu: 'آلہ چھاورڑیںط Functional Communication Training',
};

function readPack(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function getValue(pack) {
  return pack?.behavior_lens?.ui?.[KEY];
}

function replaceFile(file, text) {
  const temporary = `${file}.quality-fix-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

const errors = [];
let changed = 0;
for (const [slug, next] of Object.entries(FIXES)) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(rootFile) || !fs.existsSync(mirrorFile)) {
    errors.push(`${slug}: missing root or deployed pack`);
    continue;
  }
  const rootText = fs.readFileSync(rootFile, 'utf8');
  const mirrorText = fs.readFileSync(mirrorFile, 'utf8');
  if (rootText !== mirrorText) {
    errors.push(`${slug}: root/public mirror drift; refusing to overwrite`);
    continue;
  }
  const rootPack = readPack(rootFile);
  const current = getValue(rootPack);
  if (current !== OLD[slug] && current !== next) {
    errors.push(`${slug}: current value changed unexpectedly: ${JSON.stringify(current)}`);
    continue;
  }
  if (current === next) continue;
  changed += 1;
  if (APPLY) {
    rootPack.behavior_lens.ui[KEY] = next;
    const output = JSON.stringify(rootPack, null, 2) + '\n';
    JSON.parse(output);
    replaceFile(rootFile, output);
    replaceFile(mirrorFile, output);
  }
  console.log(`  ${APPLY ? 'fixed' : 'would fix'} ${slug}`);
}

if (errors.length) {
  console.error(`fix_obvious_translation_quality: ${errors.length} problem(s); nothing written.`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`fix_obvious_translation_quality: ${changed} explicit correction(s)${APPLY ? ' applied' : ' pending'}.`);
