#!/usr/bin/env node
// record_pack_translation_review.cjs - record a reviewed translation for one pack
// without globally blessing the English key for every language.
//
// The ledger stores both the current English hash and the reviewed translation hash.
// If either the source wording or the pack value changes later, normal staleness
// detection resumes. This is intentionally narrower than bless_lang_sources.cjs.
//
// USAGE
//   node dev-tools/i18n/record_pack_translation_review.cjs \
//     --lang=spanish_latin_america --key=tour.actions_text \
//     --key=tour.brainstorm_text --key=tour.note_taking_text
//   ... --reason=preserved-condensed-summary  # optional audit annotation
//   ... --apply
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lang_src_lib.cjs');

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const MIRROR_DIR = path.join(L.ROOT, 'desktop', 'web-app', 'public', 'lang');

function readFlag(name) {
  const inline = argv.find(arg => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1).trim();
  const index = argv.indexOf(name);
  return index >= 0 ? (argv[index + 1] || '').trim() : '';
}

const slug = readFlag('--lang');
const reviewReason = readFlag('--reason');
const keys = [...new Set(argv.reduce((out, arg, index) => {
  if (arg.startsWith('--key=')) out.push(arg.slice('--key='.length).trim());
  else if (arg === '--key' && argv[index + 1]) out.push(argv[index + 1].trim());
  return out;
}, []))].filter(Boolean).sort();

if (!slug || !keys.length) {
  console.error('Usage: record_pack_translation_review.cjs --lang=<slug> --key=<key> [--key=<key> ...] [--reason=<audit-note>] [--apply]');
  process.exit(2);
}

const knownSlugs = new Set(L.getLangSlugs());
const source = L.loadSourceStrings();
const errors = [];
const alreadyRecorded = [];
const toRecord = {};
const rootPath = path.join(L.LANG_DIR, `${slug}.js`);
const mirrorPath = path.join(MIRROR_DIR, `${slug}.js`);

if (!knownSlugs.has(slug)) errors.push(`${slug}: not a translatable pack slug`);
if (!fs.existsSync(rootPath) || !fs.existsSync(mirrorPath)) {
  errors.push(`${slug}: root or deploy mirror is missing`);
}

function placeholders(value) {
  return [...String(value).matchAll(/\$\{[^}]*\}|\{[^}\s]+\}|<\/?[a-zA-Z][^>]*>/g)]
    .map(match => match[0]).sort();
}

let pack = null;
let mirrorPack = null;
let staleForPack = {};
if (!errors.length) {
  const rootRaw = fs.readFileSync(rootPath, 'utf8');
  const mirrorRaw = fs.readFileSync(mirrorPath, 'utf8');
  if (rootRaw !== mirrorRaw) errors.push(`${slug}: root and deploy mirror are not byte-identical`);
  try {
    pack = L.flatten(JSON.parse(rootRaw.replace(/^\uFEFF/, '')));
    mirrorPack = L.flatten(JSON.parse(mirrorRaw.replace(/^\uFEFF/, '')));
    staleForPack = L.computeStaleness({ slugs: [slug] }).perPack[slug] || {};
  } catch (error) {
    errors.push(`${slug}: could not parse the root/mirror pack (${error.message})`);
  }
}

const ledger = L.loadPackReviewBaseline();
for (const key of keys) {
  const where = `${slug} / ${key}`;
  if (!(key in source)) { errors.push(`${where}: key absent from the English source`); continue; }
  if (!pack || !mirrorPack) continue;
  if (pack[key] === undefined || mirrorPack[key] === undefined) {
    errors.push(`${where}: key is missing from the root or deploy pack`); continue;
  }
  if (typeof source[key] !== 'string' || typeof pack[key] !== 'string') {
    errors.push(`${where}: review ledger currently accepts string leaves only`); continue;
  }
  if (L.norm(pack[key]) !== L.norm(mirrorPack[key])) {
    errors.push(`${where}: root and deploy values differ`); continue;
  }
  if (!pack[key].trim()) { errors.push(`${where}: translation is empty`); continue; }
  if (L.norm(pack[key]) === L.norm(source[key])) {
    errors.push(`${where}: translation is still English (passthrough)`); continue; }
  if (placeholders(source[key]).join('\u0001') !== placeholders(pack[key]).join('\u0001')) {
    errors.push(`${where}: placeholder/tag mismatch`); continue;
  }

  const sourceHash = L.hashEn(source[key]);
  const translationHash = L.hashEn(pack[key]);
  const previous = ledger[slug] && ledger[slug][key];
  if (previous && previous.sourceHash === sourceHash && previous.translationHash === translationHash) {
    alreadyRecorded.push(key);
    continue;
  }
  if (!staleForPack[key]) {
    errors.push(`${where}: not currently stale against the global English baseline; no review record needed`);
    continue;
  }
  toRecord[key] = {
    sourceHash,
    translationHash,
    ...(reviewReason ? { reviewReason } : {}),
  };
}

if (errors.length) {
  console.error(`record_pack_translation_review: ${errors.length} problem(s) - nothing written.`);
  for (const error of errors.slice(0, 40)) console.error(`  - ${error}`);
  if (errors.length > 40) console.error(`  ...and ${errors.length - 40} more`);
  process.exit(1);
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortObject(value[key])]));
}

function replaceFile(file, text) {
  const temporary = `${file}.pack-review-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text, 'utf8');
    try {
      fs.renameSync(temporary, file);
    } catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      fs.writeFileSync(file, text, 'utf8');
    }
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

const nextLedger = JSON.parse(JSON.stringify(ledger));
if (!nextLedger[slug]) nextLedger[slug] = {};
Object.assign(nextLedger[slug], toRecord);
const out = JSON.stringify(sortObject(nextLedger), null, 2) + '\n';
if (APPLY && Object.keys(toRecord).length) {
  if (fs.existsSync(L.PACK_REVIEW_BASELINE_PATH)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(L.PACK_REVIEW_BASELINE_PATH, `${L.PACK_REVIEW_BASELINE_PATH}.bak.${stamp}`);
  }
  replaceFile(L.PACK_REVIEW_BASELINE_PATH, out);
  JSON.parse(fs.readFileSync(L.PACK_REVIEW_BASELINE_PATH, 'utf8'));
}

console.log(`record_pack_translation_review: ${keys.length} key(s) checked for ${slug} - ` +
  `${Object.keys(toRecord).length} to record, ${alreadyRecorded.length} already recorded. ` +
  `${APPLY ? 'WRITTEN' : 'DRY RUN (pass --apply to write)'}`);
for (const key of Object.keys(toRecord)) console.log(`  ${key}  reviewed`);
for (const key of alreadyRecorded) console.log(`  ${key}  already recorded`);
if (APPLY && Object.keys(toRecord).length) console.log(`Ledger: ${path.relative(L.ROOT, L.PACK_REVIEW_BASELINE_PATH)}`);
