#!/usr/bin/env node
'use strict';

// Read-only coverage gate for the separately generated AlloBot catalog.
// Run without --gate while preparing translations; use --gate in CI after the
// additive locale pass has been generated.
const fs = require('fs');
const path = require('path');
const { LANGUAGE_CODES, isAlloBotKey } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const PUBLIC_LANG_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const gate = process.argv.includes('--gate');
const jsonOutput = process.argv.includes('--json');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const flatten = (value, prefix = '', out = {}) => {
  for (const [key, child] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out[full] = child;
  }
  return out;
};
const placeholders = (value) => (String(value).match(/\{[^{}]+\}/g) || []).sort();

const english = flatten(readJson(path.join(ROOT, 'ui_strings.js')));
const source = Object.fromEntries(Object.entries(english).filter(([key, value]) => isAlloBotKey(key) && typeof value === 'string'));
const rows = [];
const failures = [];

for (const slug of Object.keys(LANGUAGE_CODES)) {
  const rootFile = path.join(LANG_DIR, `${slug}.js`);
  const publicFile = path.join(PUBLIC_LANG_DIR, `${slug}.js`);
  const row = { slug, total: Object.keys(source).length, present: 0, translated: 0, missing: [], placeholderDrift: [], mirrorDrift: false, unrelatedFileDrift: false };
  let pack;
  try {
    const rootText = fs.readFileSync(rootFile, 'utf8');
    const publicText = fs.readFileSync(publicFile, 'utf8');
    const rootPack = flatten(JSON.parse(rootText));
    const publicPack = flatten(JSON.parse(publicText));
    row.mirrorDrift = Object.keys(source).some((key) => rootPack[key] !== publicPack[key]);
    row.unrelatedFileDrift = rootText !== publicText && !row.mirrorDrift;
    pack = rootPack;
  } catch (error) {
    row.missing.push(`pack parse/read error: ${error.message}`);
    rows.push(row);
    failures.push(`${slug}: ${error.message}`);
    continue;
  }
  for (const [key, englishValue] of Object.entries(source)) {
    const value = pack[key];
    if (typeof value !== 'string' || !value.trim()) {
      row.missing.push(key);
      continue;
    }
    row.present += 1;
    if (value !== englishValue) row.translated += 1;
    if (JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(englishValue))) row.placeholderDrift.push(key);
  }
  if (row.mirrorDrift) failures.push(`${slug}: root/public AlloBot mirror drift`);
  if (row.missing.length) failures.push(`${slug}: ${row.missing.length} missing AlloBot keys`);
  if (row.placeholderDrift.length) failures.push(`${slug}: ${row.placeholderDrift.length} placeholder mismatches`);
  rows.push(row);
}

if (jsonOutput) {
  console.log(JSON.stringify({ generated: new Date().toISOString(), totalKeys: Object.keys(source).length, rows, failures }, null, 2));
} else {
  console.log(`AlloBot locale coverage: ${Object.keys(source).length} keys x ${rows.length} packs`);
  console.log('LANG'.padEnd(26) + 'PRESENT'.padStart(8) + 'TRANSL'.padStart(8) + 'MISSING'.padStart(9) + 'DRIFT'.padStart(8));
  for (const row of rows) {
    console.log(row.slug.padEnd(26) + String(row.present).padStart(8) + String(row.translated).padStart(8) + String(row.missing.length).padStart(9) + String(row.placeholderDrift.length + (row.mirrorDrift ? 1 : 0)).padStart(8));
  }
  if (failures.length) console.log(`\n${failures.length} issue(s). Re-run with --json for details.`);
  else console.log('\nAll AlloBot locale packs are complete and mirrored for the AlloBot namespaces.');
}

if (gate && failures.length) process.exit(1);
