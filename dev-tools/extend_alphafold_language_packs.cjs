#!/usr/bin/env node
// Keep AlphaFold's language registry synchronized after source strings are
// extracted. Existing locale translations are preserved; newly added keys
// receive the source fallback until reviewed translations are supplied.

const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'stem_lab', 'stem_tool_alphafold.js');
const UI_PATH = path.join(ROOT, 'ui_strings.js');
const LANG_DIRS = [
  path.join(ROOT, 'lang'),
  path.join(ROOT, 'desktop', 'web-app', 'public', 'lang')
];

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function writeAtomic(file, text) {
  const temp = `${file}.codex-tmp`;
  fs.writeFileSync(temp, text, 'utf8');
  fs.renameSync(temp, file);
}

function matchingBrace(raw, start) {
  let depth = 0; let string = false; let escaped = false;
  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];
    if (string) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') string = false;
      continue;
    }
    if (ch === '"') { string = true; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return i;
  }
  return -1;
}

function replaceJsonProperty(raw, parentName, property, value, file) {
  const parentStart = raw.indexOf('"' + parentName + '"');
  if (parentStart < 0) throw new Error(`${file}: missing ${parentName} object`);
  const parentOpen = raw.indexOf('{', parentStart);
  const parentClose = matchingBrace(raw, parentOpen);
  if (parentOpen < 0 || parentClose < 0) throw new Error(`${file}: malformed ${parentName} object`);
  const parentBody = raw.slice(parentOpen + 1, parentClose);
  const propertyMatch = new RegExp('"' + property + '"\\s*:').exec(parentBody);
  if (!propertyMatch) throw new Error(`${file}: missing ${parentName}.${property}`);
  const propertyStart = parentOpen + 1 + propertyMatch.index;
  const valueStart = raw.indexOf('{', propertyStart);
  const valueClose = matchingBrace(raw, valueStart);
  if (valueStart < 0 || valueClose < 0 || valueStart > parentClose || valueClose > parentClose) {
    throw new Error(`${file}: malformed ${parentName}.${property}`);
  }
  const formatted = JSON.stringify(value, null, 2);
  return raw.slice(0, valueStart) + formatted + raw.slice(valueClose + 1);
}

function collectFallbacks() {
  const ast = acorn.parse(fs.readFileSync(SOURCE, 'utf8'), { ecmaVersion: 2022 });
  const values = {};
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression') {
      const name = node.callee && node.callee.type === 'Identifier' ? node.callee.name : '';
      const first = node.arguments[0]; const second = node.arguments[1];
      if ((name === 't' || name === '__alloT') && first && first.type === 'Literal' &&
          typeof first.value === 'string' && first.value.startsWith('stem.alphaFold.') &&
          second && second.type === 'Literal' && typeof second.value === 'string') {
        values[first.value.slice('stem.alphaFold.'.length)] = second.value;
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc') continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    }
  }
  walk(ast);
  if (Object.keys(values).length < 100) {
    throw new Error(`Expected at least 100 AlphaFold fallback strings, found ${Object.keys(values).length}`);
  }
  return values;
}

function mergePack(file, fallbacks) {
  const pack = readJson(file);
  if (!pack.stem || typeof pack.stem !== 'object') throw new Error(`${file}: missing stem object`);
  const existing = pack.stem.alphaFold && typeof pack.stem.alphaFold === 'object' ? pack.stem.alphaFold : {};
  const merged = {};
  for (const [key, fallback] of Object.entries(fallbacks)) {
    merged[key] = Object.prototype.hasOwnProperty.call(existing, key) ? existing[key] : fallback;
  }
  const raw = fs.readFileSync(file, 'utf8');
  writeAtomic(file, replaceJsonProperty(raw, 'stem', 'alphaFold', merged, file));
}

const fallbacks = collectFallbacks();
const ui = readJson(UI_PATH);
const uiAlphaFold = Object.assign({}, (ui.stem && ui.stem.alphaFold) || {}, fallbacks);
writeAtomic(UI_PATH, replaceJsonProperty(fs.readFileSync(UI_PATH, 'utf8'), 'stem', 'alphaFold', uiAlphaFold, UI_PATH));

let updated = 0;
for (const dir of LANG_DIRS) {
  const files = fs.readdirSync(dir).filter((file) => file.endsWith('.js')).sort();
  if (files.length !== 63) throw new Error(`${dir}: expected 63 locale files, found ${files.length}`);
  for (const file of files) {
    mergePack(path.join(dir, file), fallbacks);
    updated += 1;
  }
}

console.log(`Synchronized ${Object.keys(fallbacks).length} AlphaFold keys across ${updated} locale mirrors.`);
