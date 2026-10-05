const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const cp = require('node:child_process');
const input = require('./validation-inputs.cjs');
const root = path.resolve(__dirname, '../..');
function collect(source) {
  const map = new Map();
  const prefixes = { gt: 'investigation_', mt: 'mystery_', qt: 'quiz_', pt: 'print_', ht: 'workspace_', glt: 'gram_lab_', ct: 'resistance_comparison_' };
  function walk(node) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
      const [key, fallback] = node.arguments, name = node.callee.name;
      if (key?.type === 'Literal' && typeof key.value === 'string' && fallback?.type === 'Literal' && typeof fallback.value === 'string') {
        if (prefixes[name]) map.set(prefixes[name] + key.value, fallback.value);
        else if (['__alloT', '__alloMBT'].includes(name) && key.value.startsWith('stem.microbiology.')) map.set(key.value.slice('stem.microbiology.'.length), fallback.value);
      }
    }
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child.type === 'string') walk(child);
    }
  }
  walk(acorn.parse(source, { ecmaVersion: 'latest' })); return map;
}
function inspect(source, previousSource, registries) {
  const current = collect(source), previous = collect(previousSource);
  const own = require('./registry-patch.cjs').collect(source);
  const sourceKeyChanges = {
    added: [...current.keys()].filter(key => !previous.has(key)).sort(),
    removed: [...previous.keys()].filter(key => !current.has(key)).sort(),
    changed: [...current].filter(([key, fallback]) => previous.has(key) && previous.get(key) !== fallback).map(([key, fallback]) => ({ key, previous: previous.get(key), fallback }))
  };
  const report = { keys: current.size, ownLabels: own, sourceKeyChanges, registries: [] };
  for (const [file, bytes] of registries) {
    const strings = JSON.parse(bytes).stem.microbiology;
    const missing = [], changedFallbacks = [], ownedLabelMismatches = [];
    for (const [key, fallback] of current) {
      if (typeof strings[key] !== 'string') missing.push(key);
      else if (strings[key] !== fallback && previous.has(key) && previous.get(key) !== fallback) changedFallbacks.push({ key, registry: strings[key], fallback });
    }
    for (const [key, fallback] of Object.entries(own)) if (strings[key] !== fallback) ownedLabelMismatches.push({ key, registry: strings[key], fallback });
    report.registries.push({ file, namespaceKeys: Object.keys(strings).length, missing, changedFallbacks, ownedLabelMismatches });
  }
  return report;
}
module.exports = inspect;
if (require.main === module) {
  const source = fs.readFileSync(path.join(root, input.runtime[0]), 'utf8');
  const previous = cp.execFileSync('git', ['show', input.parent + ':' + input.runtime[0]], { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const report = inspect(source, previous, input.registries.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
  report.mirrored = source === fs.readFileSync(path.join(root, input.runtime[1]), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  if (!report.mirrored || report.keys !== input.expectedInterfaceKeys || Object.keys(report.ownLabels).length !== input.expectedOwnLabels || Object.values(report.sourceKeyChanges).some(rows => rows.length) || report.registries.some(row => row.namespaceKeys !== input.expectedNamespaceKeys || row.missing.length || row.changedFallbacks.length || row.ownedLabelMismatches.length)) process.exitCode = 1;
}
