#!/usr/bin/env node
// Verify one STEM namespace against its source calls, root/deployed registries,
// and both 63-locale mirrors.
// Usage: node dev-tools/verify_stem_namespace.cjs --tool=applab

const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '..');
const tool = String((process.argv.find((arg) => arg.startsWith('--tool=')) || '').slice('--tool='.length)).trim();
if (!/^[a-z0-9_-]+$/i.test(tool)) throw new Error('Usage: --tool=<stem tool slug>');
const namespace = `stem.${tool}`;
const source = path.join(ROOT, 'stem_lab', `stem_tool_${tool}.js`);
const uiPaths = [path.join(ROOT, 'ui_strings.js'), path.join(ROOT, 'desktop', 'web-app', 'public', 'ui_strings.js')];
const langDirs = [path.join(ROOT, 'lang'), path.join(ROOT, 'desktop', 'web-app', 'public', 'lang')];
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const ast = acorn.parse(fs.readFileSync(source, 'utf8'), { ecmaVersion: 2022 });
const keys = new Set();
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression') {
    const name = node.callee && node.callee.type === 'Identifier' ? node.callee.name : '';
    const first = node.arguments[0];
    if ((name === 't' || name === '__alloT') && first && first.type === 'Literal' &&
        typeof first.value === 'string' && first.value.startsWith(namespace + '.')) {
      keys.add(first.value.slice(namespace.length + 1));
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

function assertKeys(value, file) {
  const actual = Object.keys(value || {});
  if (actual.length < keys.size || [...keys].some((key) => !Object.prototype.hasOwnProperty.call(value || {}, key))) {
    throw new Error(`${file}: expected ${keys.size} ${namespace} keys, found ${actual.length}`);
  }
}

for (const file of uiPaths) assertKeys(read(file).stem[tool], file);
const files = langDirs.map((dir) => fs.readdirSync(dir).filter((file) => file.endsWith('.js')).sort());
if (files.some((list) => list.length !== 63)) throw new Error('Expected 63 locale files in each mirror.');
for (const file of files[0]) {
  const left = read(path.join(langDirs[0], file)).stem[tool];
  const right = read(path.join(langDirs[1], file)).stem[tool];
  assertKeys(left, path.join(langDirs[0], file));
  assertKeys(right, path.join(langDirs[1], file));
  if (JSON.stringify(left) !== JSON.stringify(right)) throw new Error(`${namespace} mirror mismatch: ${file}`);
}
console.log(`${namespace} parity OK: ${keys.size} keys, 63 locales, root/deployed registries.`);
