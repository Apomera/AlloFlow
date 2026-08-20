#!/usr/bin/env node
'use strict';

// Create an editable payload skeleton for a human translation batch. Blank
// values are intentional: the apply contract will reject them until a
// translator supplies reviewed text.

const fs = require('fs');
const path = require('path');
const { LANGUAGE_CODES, isAlloBotKey } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const requested = (args.find((arg) => arg.startsWith('--langs=')) || '').slice('--langs='.length);
const output = (args.find((arg) => arg.startsWith('--out=')) || '').slice('--out='.length)
  || path.join(ROOT, 'translations', 'pending', 'allobot-hand-template.json');
const languages = requested
  ? requested.split(',').map((slug) => slug.trim()).filter(Boolean)
  : Object.keys(LANGUAGE_CODES);
const flatten = (value, prefix = '', result = {}) => {
  for (const [key, child] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, result);
    else result[full] = child;
  }
  return result;
};
const source = flatten(JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8')));
const allobot = Object.fromEntries(Object.entries(source).filter(([key, value]) => isAlloBotKey(key) && typeof value === 'string'));
const payload = {};
const errors = [];
for (const slug of languages) {
  if (!Object.prototype.hasOwnProperty.call(LANGUAGE_CODES, slug)) {
    errors.push(`unknown language slug: ${slug}`);
    continue;
  }
  const file = path.join(ROOT, 'lang', `${slug}.js`);
  if (!fs.existsSync(file)) {
    errors.push(`missing language pack: ${slug}`);
    continue;
  }
  const existing = flatten(JSON.parse(fs.readFileSync(file, 'utf8')));
  payload[slug] = {};
  for (const key of Object.keys(allobot)) {
    if (!Object.prototype.hasOwnProperty.call(existing, key)) payload[slug][key] = '';
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(path.resolve(output), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
const total = Object.values(payload).reduce((sum, entries) => sum + Object.keys(entries).length, 0);
console.log(`Wrote ${total} blank AlloBot slots for ${Object.keys(payload).length} language pack(s) to ${path.resolve(output)}`);
