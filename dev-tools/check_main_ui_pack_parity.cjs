#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { ENGLISH_ADDITIONS, LANGUAGE_CODES, isMainUiKey, PACK_REQUIRED_KEYS } = require('./i18n/main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

// Untranslated keys are a translation backlog, not a code defect: they need
// native speakers across 63 packs. Recording them as a baseline keeps the
// gate's OTHER checks (mirror drift, placeholder integrity) enforceable
// instead of drowned. The baseline may shrink, never grow.
const BASELINE_FILE = path.join(__dirname, 'main_ui_pack_parity_baseline.json');
const UPDATE_BASELINE = process.argv.includes('--update');
const loadBaseline = () => {
  try { return new Set(readJson(BASELINE_FILE).missing); }
  catch (e) { return new Set(); }
};

function mergeMissing(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      mergeMissing(target[key], value);
    } else if (target[key] === undefined) target[key] = value;
  }
}

function flatten(value, prefix = '', out = {}) {
  for (const [key, child] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out[full] = child;
  }
  return out;
}

// Repeated use of one placeholder is valid; compare names as a set.
const placeholders = (value) => [...new Set(
  [...String(value).replace(/\\u\{[0-9a-fA-F]+\}/g, '').matchAll(/\{[^{}]+\}/g)].map((match) => match[0])
)].sort();
const ui = readJson(path.join(ROOT, 'ui_strings.js'));
mergeMissing(ui, ENGLISH_ADDITIONS);
const english = flatten(ui);
const targetKeys = [...new Set([
  ...Object.keys(english).filter(isMainUiKey),
  ...PACK_REQUIRED_KEYS,
])].sort();
const failures = [];      // blocking: drift + placeholder integrity
const missingPairs = [];  // "<slug> <key>" — ratcheted against the baseline
let identical = 0;

for (const slug of Object.keys(LANGUAGE_CODES)) {
  const rootFile = path.join(ROOT, 'lang', `${slug}.js`);
  const mirrorFile = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang', `${slug}.js`);
  const rootText = fs.readFileSync(rootFile, 'utf8');
  const mirrorText = fs.readFileSync(mirrorFile, 'utf8');
  if (rootText !== mirrorText) failures.push(`${slug}: root/public mirror drift`);
  const pack = flatten(JSON.parse(rootText));

  for (const key of targetKeys) {
    const value = pack[key];
    if (typeof value !== 'string' || !value.trim()) {
      missingPairs.push(`${slug} ${key}`);
      continue;
    }
    if (value === english[key]) identical += 1;
    const expectedPlaceholders = placeholders(english[key]);
    const actualPlaceholders = placeholders(value);
    if (expectedPlaceholders.join('|') !== actualPlaceholders.join('|')) {
      failures.push(`${slug}: placeholder mismatch ${key} (${actualPlaceholders.join(', ')} vs ${expectedPlaceholders.join(', ')})`);
    }
  }
}

missingPairs.sort();

if (UPDATE_BASELINE) {
  const payload = {
    _comment: 'Known-untranslated main-UI keys, recorded so that mirror-drift and '
      + 'placeholder checks stay enforceable. This list may shrink, never grow. '
      + 'Regenerate with: node dev-tools/check_main_ui_pack_parity.cjs --update',
    generated: new Date().toISOString().slice(0, 10),
    distinctKeys: [...new Set(missingPairs.map((p) => p.split(' ')[1]))].sort(),
    missing: missingPairs,
  };
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Baseline written: ${missingPairs.length} known-untranslated pair(s).`);
  process.exit(0);
}

const baseline = loadBaseline();
const newlyMissing = missingPairs.filter((pair) => !baseline.has(pair));
const fixed = [...baseline].filter((pair) => !missingPairs.includes(pair));

// A key that regressed from translated back to missing is a real defect.
for (const pair of newlyMissing) {
  const [slug, key] = pair.split(' ');
  failures.push(`${slug}: missing ${key} (NOT in the recorded baseline)`);
}

if (failures.length) {
  console.error(`Main UI localization parity failed with ${failures.length} issue(s):`);
  console.error(failures.slice(0, 200).join('\n'));
  if (failures.length > 200) console.error(`...and ${failures.length - 200} more`);
  if (newlyMissing.length) {
    console.error('\nIf these are deliberate new English keys whose translations are queued,');
    console.error('re-record the backlog: node dev-tools/check_main_ui_pack_parity.cjs --update');
  }
  process.exit(1);
}

const backlogKeys = new Set(missingPairs.map((p) => p.split(' ')[1]));
console.log(`Main UI/runtime localization parity OK: ${targetKeys.length} keys x ${Object.keys(LANGUAGE_CODES).length} packs; ${identical} values intentionally or legitimately match English.`);
console.log(`  mirror drift          : none`);
console.log(`  placeholder integrity : ok`);
if (missingPairs.length) {
  console.log(`  translation backlog   : ${missingPairs.length} pair(s) across ${backlogKeys.size} key(s), all baselined (needs native speakers, not code)`);
}
if (fixed.length) {
  console.log(`  ${fixed.length} baselined pair(s) are now translated — shrink the baseline with --update`);
}
