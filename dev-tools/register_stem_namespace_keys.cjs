#!/usr/bin/env node
// Register literal t()/__alloT() fallbacks for one STEM tool while preserving
// reviewed values already present in every locale pack.
//
// Usage: node dev-tools/register_stem_namespace_keys.cjs --tool=applab

const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '..');
const tool = String((process.argv.find((arg) => arg.startsWith('--tool=')) || '').slice('--tool='.length)).trim();
if (!/^[a-z0-9_-]+$/i.test(tool)) throw new Error('Usage: --tool=<stem tool slug>');

const SOURCE = path.join(ROOT, 'stem_lab', `stem_tool_${tool}.js`);
const UI_PATH = path.join(ROOT, 'ui_strings.js');
const DEPLOY_UI_PATH = path.join(ROOT, 'desktop', 'web-app', 'public', 'ui_strings.js');
const LANG_DIRS = [
  path.join(ROOT, 'lang'),
  path.join(ROOT, 'desktop', 'web-app', 'public', 'lang')
];
const namespace = `stem.${tool}`;

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
function replaceProperty(raw, parentName, property, value, file) {
  const parentStart = raw.indexOf('"' + parentName + '"');
  const parentOpen = raw.indexOf('{', parentStart);
  const parentClose = matchingBrace(raw, parentOpen);
  if (parentStart < 0 || parentOpen < 0 || parentClose < 0) throw new Error(`${file}: malformed ${parentName}`);
  const body = raw.slice(parentOpen + 1, parentClose);
  const match = new RegExp('"' + property + '"\\s*:').exec(body);
  if (!match) {
    const trimmed = raw.slice(0, parentClose).trimEnd();
    const trailing = raw.slice(trimmed.length, parentClose);
    const formatted = JSON.stringify(value, null, 2).replace(/^/gm, '    ');
    return trimmed + (trimmed.endsWith('{') ? '' : ',') + '\n    ' + JSON.stringify(property) + ': ' + formatted + trailing + raw.slice(parentClose);
  }
  const propertyStart = parentOpen + 1 + match.index;
  const valueStart = raw.indexOf('{', propertyStart);
  const valueClose = matchingBrace(raw, valueStart);
  if (valueStart < 0 || valueClose < 0 || valueClose > parentClose) throw new Error(`${file}: malformed ${parentName}.${property}`);
  return raw.slice(0, valueStart) + JSON.stringify(value, null, 2) + raw.slice(valueClose + 1);
}

function collectFallbacks() {
  const ast = acorn.parse(fs.readFileSync(SOURCE, 'utf8'), { ecmaVersion: 2022 });
  const prefix = namespace + '.';
  const values = {};
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression') {
      const name = node.callee && node.callee.type === 'Identifier' ? node.callee.name : '';
      const key = node.arguments[0];
      const fallback = node.arguments[1];
      if ((name === 't' || name === '__alloT') && key && key.type === 'Literal' &&
          typeof key.value === 'string' && key.value.startsWith(prefix)) {
        if (!fallback || fallback.type !== 'Literal' || typeof fallback.value !== 'string') {
          throw new Error(`${SOURCE}: ${key.value} has no literal English fallback`);
        }
        values[key.value.slice(prefix.length)] = fallback.value;
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
  if (!Object.keys(values).length) throw new Error(`${SOURCE}: no literal ${namespace} keys found`);
  return values;
}

const fallbacks = collectFallbacks();
const root = readJson(UI_PATH);
const rootNamespace = Object.assign({}, (root.stem && root.stem[tool]) || {}, fallbacks);
writeAtomic(UI_PATH, replaceProperty(fs.readFileSync(UI_PATH, 'utf8'), 'stem', tool, rootNamespace, UI_PATH));
const deployedUi = readJson(DEPLOY_UI_PATH);
const deployedNamespace = rootNamespace;
writeAtomic(DEPLOY_UI_PATH, replaceProperty(fs.readFileSync(DEPLOY_UI_PATH, 'utf8'), 'stem', tool, deployedNamespace, DEPLOY_UI_PATH));

let updated = 0;
const canonicalValues = new Map();
for (let dirIndex = 0; dirIndex < LANG_DIRS.length; dirIndex += 1) {
  const dir = LANG_DIRS[dirIndex];
  const files = fs.readdirSync(dir).filter((file) => file.endsWith('.js')).sort();
  if (files.length !== 63) throw new Error(`${dir}: expected 63 locale files, found ${files.length}`);
  for (const file of files) {
    const full = path.join(dir, file);
    const pack = readJson(full);
    const existing = pack.stem && pack.stem[tool] && typeof pack.stem[tool] === 'object' ? pack.stem[tool] : {};
    let merged = canonicalValues.get(file);
    if (!merged) {
      merged = Object.assign({}, existing);
      for (const [key, fallback] of Object.entries(fallbacks)) {
        if (!Object.prototype.hasOwnProperty.call(merged, key)) merged[key] = fallback;
      }
      canonicalValues.set(file, merged);
    }
    writeAtomic(full, replaceProperty(fs.readFileSync(full, 'utf8'), 'stem', tool, merged, full));
    updated += 1;
  }
}
console.log('Registered ' + Object.keys(fallbacks).length + ' ' + namespace + ' keys across ' + updated + ' locale mirrors.');