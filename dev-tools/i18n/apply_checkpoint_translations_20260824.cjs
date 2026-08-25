#!/usr/bin/env node
'use strict';

// Apply an auditable, hand-authored checkpoint namespace payload without
// touching unrelated language-pack content. Dry-run by default.

const fs = require('node:fs');
const path = require('node:path');
const L = require('./lang_src_lib.cjs');

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const payloadArg = argv.find(arg => !arg.startsWith('--'));
const MIRROR_DIR = path.join(L.ROOT, 'desktop', 'web-app', 'public', 'lang');
const PREFIXES = {
  listening: '🔴 ',
  mode_audio: '🎤 ',
  mode_choice: '☑️ ',
  mode_point: '👆 ',
  mode_text: '⌨️ ',
  speak: '🎤 ',
};

if (!payloadArg) {
  console.error('Usage: apply_checkpoint_translations_20260824.cjs <payload.json> [--apply]');
  process.exit(2);
}

const payloadPath = path.resolve(payloadArg);
if (!fs.existsSync(payloadPath)) {
  console.error(`Payload not found: ${payloadArg}`);
  process.exit(2);
}

const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
const keyNames = payload._keys;
const packs = payload.packs;
const source = L.loadSourceStrings();
const expectedKeys = Object.keys(source)
  .filter(key => key.startsWith('checkpoint.'))
  .map(key => key.slice('checkpoint.'.length));
const knownSlugs = new Set(L.getLangSlugs());
const errors = [];
const report = [];

if (!Array.isArray(keyNames) || !packs || typeof packs !== 'object' || Array.isArray(packs)) {
  console.error('Payload must contain _keys (array) and packs (object).');
  process.exit(2);
}

if (keyNames.length !== expectedKeys.length ||
    [...keyNames].sort().join('\u0001') !== [...expectedKeys].sort().join('\u0001')) {
  errors.push(`payload keys do not exactly match the ${expectedKeys.length}-key checkpoint namespace`);
}

function placeholders(value) {
  return [...String(value).matchAll(/\$\{[^}]*\}|\{[^}\s]+\}|<\/?[a-zA-Z][^>]*>/g)]
    .map(match => match[0]).sort().join('\u0001');
}

function namespaceBlock(namespace) {
  const value = JSON.stringify(namespace, null, 2);
  const indented = value.split('\n').map((line, index) => index ? `  ${line}` : line).join('\n');
  return `  \"checkpoint\": ${indented}`;
}

function replaceFile(file, text) {
  const temporary = `${file}.checkpoint-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    try {
      fs.renameSync(temporary, file);
    } catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN'].includes(error.code)) throw error;
      fs.writeFileSync(file, text, 'utf8');
    }
  } finally {
    if (fs.existsSync(temporary)) {
      try {
        fs.unlinkSync(temporary);
      } catch (error) {
        if (!['EPERM', 'EACCES', 'EBUSY', 'UNKNOWN'].includes(error.code)) throw error;
      }
    }
  }
}

for (const [slug, values] of Object.entries(packs || {})) {
  const rowErrors = [];
  if (!knownSlugs.has(slug)) {
    errors.push(`${slug}: unknown or excluded language pack`);
    continue;
  }
  if (!Array.isArray(values) || values.length !== keyNames.length) {
    errors.push(`${slug}: expected ${keyNames.length} translated values`);
    continue;
  }

  const translated = Object.fromEntries(keyNames.map((key, index) => [key, values[index]]));
  for (const key of keyNames) {
    const where = `${slug} / checkpoint.${key}`;
    const value = translated[key];
    const english = source[`checkpoint.${key}`];
    if (typeof value !== 'string' || !value.trim()) rowErrors.push(`${where}: empty or non-string translation`);
    else if (L.norm(value) === L.norm(english)) rowErrors.push(`${where}: still an English passthrough`);
    else if (placeholders(value) !== placeholders(english)) rowErrors.push(`${where}: placeholder/tag mismatch`);
    if (PREFIXES[key] && !String(value).startsWith(PREFIXES[key])) {
      rowErrors.push(`${where}: must preserve the ${JSON.stringify(PREFIXES[key].trim())} prefix`);
    }
  }
  if (typeof translated.support_note === 'string' && !translated.support_note.endsWith(' ')) {
    rowErrors.push(`${slug} / checkpoint.support_note: must preserve the trailing space before dynamic content`);
  }
  if (typeof translated.support_note2 === 'string' && !/^\p{P}/u.test(translated.support_note2)) {
    rowErrors.push(`${slug} / checkpoint.support_note2: must begin with sentence punctuation after dynamic content`);
  }
  if (rowErrors.length) {
    errors.push(...rowErrors);
    continue;
  }

  const rootFile = path.join(L.LANG_DIR, `${slug}.js`);
  const mirrorFile = path.join(MIRROR_DIR, `${slug}.js`);
  if (!fs.existsSync(rootFile) || !fs.existsSync(mirrorFile)) {
    errors.push(`${slug}: root or deploy mirror is missing`);
    continue;
  }
  const rootRaw = fs.readFileSync(rootFile, 'utf8');
  const mirrorRaw = fs.readFileSync(mirrorFile, 'utf8');
  if (rootRaw !== mirrorRaw) {
    let rootJson;
    let mirrorJson;
    try {
      rootJson = JSON.parse(rootRaw.replace(/^\uFEFF/, ''));
      mirrorJson = JSON.parse(mirrorRaw.replace(/^\uFEFF/, ''));
    } catch (error) {
      errors.push(`${slug}: root/deploy drift includes invalid JSON (${error.message})`);
      continue;
    }
    const rootIsRequested = keyNames.every(key => rootJson.checkpoint && rootJson.checkpoint[key] === translated[key]);
    const mirrorIsEnglish = keyNames.every(key => mirrorJson.checkpoint &&
      mirrorJson.checkpoint[key] === source[`checkpoint.${key}`]);
    const reconciledMirror = JSON.parse(JSON.stringify(mirrorJson));
    reconciledMirror.checkpoint = rootJson.checkpoint;
    const driftIsOnlyCheckpoint = JSON.stringify(reconciledMirror) === JSON.stringify(rootJson);
    if (!rootIsRequested || !mirrorIsEnglish || !driftIsOnlyCheckpoint) {
      errors.push(`${slug}: root and deploy mirror differ beyond this interrupted checkpoint update`);
      continue;
    }
    if (APPLY) {
      try {
        replaceFile(mirrorFile, rootRaw);
      } catch (error) {
        errors.push(`${slug}: mirror repair failed (${error.code || error.message})`);
        continue;
      }
    }
    report.push({ slug, status: APPLY ? 'mirror-repaired' : 'would-repair-mirror' });
    continue;
  }

  let json;
  try {
    json = JSON.parse(rootRaw.replace(/^\uFEFF/, ''));
  } catch (error) {
    errors.push(`${slug}: invalid JSON (${error.message})`);
    continue;
  }
  if (!json.checkpoint || typeof json.checkpoint !== 'object' || Array.isArray(json.checkpoint)) {
    errors.push(`${slug}: checkpoint namespace is missing or invalid`);
    continue;
  }

  for (const key of keyNames) {
    const current = json.checkpoint[key];
    const english = source[`checkpoint.${key}`];
    if (current !== english && current !== translated[key]) {
      rowErrors.push(`${slug} / checkpoint.${key}: refusing to overwrite a non-English value`);
    }
  }
  if (rowErrors.length) {
    errors.push(...rowErrors);
    continue;
  }

  const oldBlock = namespaceBlock(json.checkpoint);
  const nextNamespace = { ...json.checkpoint, ...translated };
  const newBlock = namespaceBlock(nextNamespace);
  const first = rootRaw.indexOf(oldBlock);
  const second = first < 0 ? -1 : rootRaw.indexOf(oldBlock, first + oldBlock.length);
  if (first < 0 || second >= 0) {
    errors.push(`${slug}: checkpoint block did not have one exact serialization match`);
    continue;
  }
  const output = rootRaw.slice(0, first) + newBlock + rootRaw.slice(first + oldBlock.length);
  JSON.parse(output.replace(/^\uFEFF/, ''));

  if (APPLY && output !== rootRaw) {
    try {
      replaceFile(rootFile, output);
      fs.copyFileSync(rootFile, mirrorFile);
      if (fs.readFileSync(rootFile, 'utf8') !== fs.readFileSync(mirrorFile, 'utf8')) {
        errors.push(`${slug}: root/deploy mirror mismatch after write`);
        continue;
      }
    } catch (error) {
      errors.push(`${slug}: write failed (${error.code || error.message})`);
      continue;
    }
  }
  report.push({ slug, status: output === rootRaw ? 'already-current' : (APPLY ? 'written' : 'would-write') });
}

if (errors.length) {
  console.error(`apply_checkpoint_translations: ${errors.length} problem(s); see details below.`);
  for (const error of errors.slice(0, 80)) console.error(`  - ${error}`);
  if (errors.length > 80) console.error(`  ...and ${errors.length - 80} more`);
  process.exit(1);
}

const changedStatuses = APPLY
  ? new Set(['written', 'mirror-repaired'])
  : new Set(['would-write', 'would-repair-mirror']);
console.log(`apply_checkpoint_translations: ${report.length} pack(s) checked; ` +
  `${report.filter(row => changedStatuses.has(row.status)).length} ` +
  `${APPLY ? 'changed' : 'would change'}.`);
for (const row of report) console.log(`  ${row.slug.padEnd(24)} ${row.status}`);
