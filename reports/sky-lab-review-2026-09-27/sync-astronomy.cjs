// Update only the Sky Lab English keys; preserve other in-progress registry edits.
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('stem_lab/stem_tool_astronomy.js', 'utf8');
const strings = new Map();
const pattern = /(?:__alloT|\bt)\(\s*'stem\.astronomy\.([^']+)'\s*,\s*('(?:\\.|[^'\\])*')/g;
const matches = Array.from(source.matchAll(pattern));
const values = vm.runInNewContext('[' + matches.map(match => match[2]).join(',') + ']', Object.create(null), { timeout: 30000 });
matches.forEach((match, index) => strings.set(match[1], values[index]));
const deltaPath = process.env.SKY_STRINGS_DELTA || 'reports/sky-lab-review-2026-09-27/ui-strings.delta.json';
const delta = fs.existsSync(deltaPath) ? JSON.parse(fs.readFileSync(deltaPath, 'utf8')) : {};
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const registry = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [key, value] of strings) {
    if (!(key in registry.stem.astronomy)) { registry.stem.astronomy[key] = value; delta[key] = value; }
  }
  fs.writeFileSync(file, JSON.stringify(registry, null, 2) + '\n');
}
fs.writeFileSync(deltaPath, JSON.stringify(delta, null, 2) + '\n');
fs.copyFileSync('stem_lab/stem_tool_astronomy.js', 'desktop/web-app/public/stem_lab/stem_tool_astronomy.js');
console.log(JSON.stringify({ englishKeysAdded: Object.keys(delta).length, mirrorSynced: true }));
