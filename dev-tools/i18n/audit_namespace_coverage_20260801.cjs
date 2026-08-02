const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const namespace = process.argv[2];
if (!namespace) throw new Error('Usage: node audit_namespace_coverage_20260801.cjs <namespace>');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const flatten = (value, prefix = '', out = {}) => {
  if (typeof value === 'string') { out[prefix] = value; return out; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    flatten(child, next, out);
  }
  return out;
};

const source = flatten(readJson(path.join(root, 'ui_strings.js'))[namespace]);
const files = fs.readdirSync(path.join(root, 'lang')).filter((name) => name.endsWith('.js')).sort();
const rows = [];
let totalMissing = 0;
for (const file of files) {
  const pack = flatten(readJson(path.join(root, 'lang', file))[namespace]);
  const missing = Object.keys(source).filter((key) => !Object.prototype.hasOwnProperty.call(pack, key));
  totalMissing += missing.length;
  rows.push({ pack: file, missing: missing.length, keys: missing });
}
const byGroup = {};
for (const row of rows) for (const key of row.keys) {
  const group = key.split('.')[0];
  byGroup[group] = (byGroup[group] || 0) + 1;
}
console.log(JSON.stringify({
  namespace,
  sourceStringKeys: Object.keys(source).length,
  packCount: rows.length,
  totalMissing,
  byGroup: Object.fromEntries(Object.entries(byGroup).sort((a, b) => b[1] - a[1])),
  packs: rows.filter((row) => row.missing).sort((a, b) => b.missing - a.missing || a.pack.localeCompare(b.pack)),
}, null, 2));
