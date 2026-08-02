#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'stem_lab', 'stem_tool_alphafold.js');
const UI_PATH = path.join(ROOT, 'ui_strings.js');
const DIRS = [path.join(ROOT, 'lang'), path.join(ROOT, 'desktop', 'web-app', 'public', 'lang')];
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const ast = acorn.parse(fs.readFileSync(SOURCE, 'utf8'), { ecmaVersion: 2022 });
const keys = new Set();
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression') {
    const name = node.callee && node.callee.type === 'Identifier' ? node.callee.name : '';
    const first = node.arguments[0];
    if ((name === 't' || name === '__alloT') && first && first.type === 'Literal' &&
        typeof first.value === 'string' && first.value.startsWith('stem.alphaFold.')) {
      keys.add(first.value.slice('stem.alphaFold.'.length));
    }
  }
  for (const name of Object.keys(node)) {
    if (name === 'loc') continue;
    const value = node[name];
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') walk(value);
  }
}
walk(ast);

function assertPack(file) {
  const value = read(file).stem.alphaFold || {};
  const actual = Object.keys(value);
  if (actual.length !== keys.size || [...keys].some((key) => !Object.prototype.hasOwnProperty.call(value, key))) {
    throw new Error(`${file}: expected ${keys.size} AlphaFold keys, found ${actual.length}`);
  }
  return value;
}

const root = read(UI_PATH).stem.alphaFold || {};
if (Object.keys(root).length !== keys.size || [...keys].some((key) => !Object.prototype.hasOwnProperty.call(root, key))) {
  throw new Error(`ui_strings.js: expected ${keys.size} AlphaFold keys, found ${Object.keys(root).length}`);
}
const files = DIRS.map((dir) => fs.readdirSync(dir).filter((file) => file.endsWith('.js')).sort());
if (files.some((list) => list.length !== 63)) throw new Error('Expected 63 locale files in each mirror.');
for (const file of files[0]) {
  const left = assertPack(path.join(DIRS[0], file));
  const right = assertPack(path.join(DIRS[1], file));
  if (JSON.stringify(left) !== JSON.stringify(right)) throw new Error(`AlphaFold mirror mismatch: ${file}`);
}
console.log(`AlphaFold registry parity OK: ${keys.size} keys, 63 locales, 2 mirrors.`);
