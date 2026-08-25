#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { ENGLISH_ADDITIONS, LANGUAGE_CODES, isMainUiKey, PACK_REQUIRED_KEYS } = require('./i18n/main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

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
const failures = [];
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
      failures.push(`${slug}: missing ${key}`);
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

if (failures.length) {
  console.error(`Main UI localization parity failed with ${failures.length} issue(s):`);
  console.error(failures.slice(0, 200).join('\n'));
  if (failures.length > 200) console.error(`...and ${failures.length - 200} more`);
  process.exit(1);
}

console.log(`Main UI/runtime localization parity OK: ${targetKeys.length} keys x ${Object.keys(LANGUAGE_CODES).length} packs; ${identical} values intentionally or legitimately match English.`);
