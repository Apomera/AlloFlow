const fs = require('node:fs');
const acorn = require('acorn');
const cp = require('node:child_process');
const sourcePath = 'stem_lab/stem_tool_microbiology.js';
function collect(source) {
  const map = new Map();
  const prefixes = { gt: 'investigation_', mt: 'mystery_', qt: 'quiz_', pt: 'print_', ht: 'workspace_', glt: 'gram_lab_', ct: 'resistance_comparison_' };
  function walk(node) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
      const [key, fallback] = node.arguments;
      const name = node.callee.name;
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
  walk(acorn.parse(source, { ecmaVersion: 2022 })); return map;
}
const source = fs.readFileSync(sourcePath, 'utf8');
const current = collect(source);
const previous = collect(cp.execFileSync('git', ['show', 'HEAD:' + sourcePath], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }));
const report = { mirrored: source === fs.readFileSync('desktop/web-app/public/' + sourcePath, 'utf8'), keys: current.size, registries: [] };
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const strings = JSON.parse(fs.readFileSync(file, 'utf8')).stem.microbiology;
  const missing = [], changedFallbacks = [];
  for (const [key, fallback] of current) {
    if (typeof strings[key] !== 'string') missing.push(key);
    else if (strings[key] !== fallback && previous.has(key) && previous.get(key) !== fallback) changedFallbacks.push({ key, registry: strings[key], fallback });
  }
  report.registries.push({ file, missing, changedFallbacks });
}
console.log(JSON.stringify(report, null, 2));
if (!report.mirrored || report.registries.some(r => r.missing.length || r.changedFallbacks.length)) process.exitCode = 1;
