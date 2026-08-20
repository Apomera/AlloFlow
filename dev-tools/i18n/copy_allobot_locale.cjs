#!/usr/bin/env node
'use strict';

// Copy an already reviewed AlloBot batch between equivalent locale variants
// (for example Spanish Latin America -> Spanish Castilian). This is additive
// by default so existing dialect-specific wording remains untouched.

const fs = require('fs');
const path = require('path');
const { LANGUAGE_CODES, isAlloBotKey } = require('./main_ui_i18n_manifest.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const PUBLIC_LANG_DIR = path.join(ROOT, 'desktop', 'web-app', 'public', 'lang');
const [sourceSlug, targetSlug] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const dryRun = process.argv.includes('--dry-run');
const replace = process.argv.includes('--replace');

if (!sourceSlug || !targetSlug) {
  console.error('Usage: node copy_allobot_locale.cjs <source-slug> <target-slug> [--dry-run] [--replace]');
  process.exit(2);
}
for (const slug of [sourceSlug, targetSlug]) {
  if (!Object.prototype.hasOwnProperty.call(LANGUAGE_CODES, slug)) {
    console.error(`Unknown language slug: ${slug}`);
    process.exit(2);
  }
}
if (sourceSlug === targetSlug) {
  console.error('Source and target must be different locale packs.');
  process.exit(2);
}

const flatten = (value, prefix = '', output = {}) => {
  for (const [key, child] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, output);
    else output[full] = child;
  }
  return output;
};
const placeholders = (value) => (String(value).match(/\{[^{}]+\}/g) || []).sort();
const atomicWrite = (file, value) => {
  const temp = `${file}.allobot-copy-tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  try { fs.renameSync(temp, file); }
  catch (_) { fs.copyFileSync(temp, file); try { fs.unlinkSync(temp); } catch (__) {} }
};
const setDeep = (object, dottedKey, value) => {
  const parts = dottedKey.split('.');
  let cursor = object;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object' || Array.isArray(cursor[parts[i]])) cursor[parts[i]] = {};
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
};

const english = flatten(JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8')));
const allobotKeys = Object.keys(english).filter((key) => isAlloBotKey(key) && typeof english[key] === 'string');
const sourceFile = path.join(LANG_DIR, `${sourceSlug}.js`);
const targetFile = path.join(LANG_DIR, `${targetSlug}.js`);
const sourcePublicFile = path.join(PUBLIC_LANG_DIR, `${sourceSlug}.js`);
const targetPublicFile = path.join(PUBLIC_LANG_DIR, `${targetSlug}.js`);
const sourcePack = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
const targetText = fs.readFileSync(targetFile, 'utf8');
const targetPublicText = fs.readFileSync(targetPublicFile, 'utf8');
const targetPack = JSON.parse(targetText);
const targetPublicPack = JSON.parse(targetPublicText);
const sourceFlat = flatten(sourcePack);
const targetFlat = flatten(targetPack);
const targetPublicFlat = flatten(targetPublicPack);
if (allobotKeys.some((key) => targetFlat[key] !== targetPublicFlat[key])) {
  console.error(`${targetSlug}: root/public AlloBot keys already differ; resolve that drift before copying`);
  process.exit(1);
}
let copied = 0;
let preserved = 0;
const errors = [];
for (const key of allobotKeys) {
  const value = sourceFlat[key];
  if (typeof value !== 'string' || !value.trim()) continue;
  if (JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(english[key]))) {
    errors.push(`${sourceSlug}.${key}: placeholder mismatch in source pack`);
    continue;
  }
  if (Object.prototype.hasOwnProperty.call(targetFlat, key) && !replace) {
    preserved += 1;
    continue;
  }
  setDeep(targetPack, key, value);
  setDeep(targetPublicPack, key, value);
  targetFlat[key] = value;
  targetPublicFlat[key] = value;
  copied += 1;
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
if (!dryRun) {
  atomicWrite(targetFile, targetPack);
  atomicWrite(targetPublicFile, targetPublicPack);
}
console.log(`${dryRun ? 'DRY-RUN' : 'COPIED'} ${copied} AlloBot value(s) from ${sourceSlug} to ${targetSlug}; preserved ${preserved}.`);
