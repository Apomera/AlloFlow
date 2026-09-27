// Register Living Island's fallback-aware translator keys without touching
// unrelated strings in this shared repository. No machine translations are invented.
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_evolab.js'), 'utf8');
const ast = acorn.parse(source, { ecmaVersion: 2020 });
const entries = {};
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
    const [key, value] = node.arguments;
    if (key?.type === 'Literal' && value?.type === 'Literal' && typeof value.value === 'string') {
      if (node.callee.name === 'tx') entries['island_' + key.value] = value.value;
      if (['t', '__alloT'].includes(node.callee.name) && String(key.value).startsWith('stem.evolab.island_')) entries[key.value.slice('stem.evolab.'.length)] = value.value;
    }
  }
  if (node.type === 'VariableDeclarator' && node.id.name === 'habitats' && node.init.type === 'ObjectExpression') {
    for (const habitat of node.init.properties) {
      const fields = Object.fromEntries(habitat.value.properties.map(p => [p.key.name, p.value.value]));
      entries['island_habitat_' + habitat.key.name] = fields.name;
      entries['island_hint_' + habitat.key.name] = fields.hint;
    }
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') walk(value);
  }
}
walk(ast);
['Generation', 'Habitat', 'Population', 'Insulation', 'Coat', 'Legs'].forEach((label, i) => { entries['island_col_' + i] = label; });
const check = process.argv.includes('--check');
if (!check && !process.argv.includes('--apply')) {
  const delta = Object.fromEntries(Object.entries(entries).map(([key, value]) => ['stem.evolab.' + key, value]));
  const output = path.join(root, 'reports/evolab-living-island/ui-strings.delta.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(delta, null, 2) + '\n');
  console.log(Object.keys(delta).length + ' translation keys prepared for the shared catalog owner. Use --apply only with catalog ownership.');
  process.exit(0);
}
let failures = 0;
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const full = path.join(root, file), raw = fs.readFileSync(full, 'utf8'), data = JSON.parse(raw);
  const changes = Object.entries(entries).filter(([key, value]) => data.stem.evolab[key] !== value);
  if (!changes.length) { console.log(file + ': island strings current'); continue; }
  if (check) { console.error(file + ': ' + changes.length + ' island strings missing or stale'); failures++; continue; }
  // Insert only the new keys; existing keys are updated individually in the
  // EvoLab object, preserving file formatting and other tools' concurrent edits.
  const start = raw.indexOf('"evolab": {');
  if (start < 0) throw new Error('Missing EvoLab namespace');
  let tail = raw.slice(start), added = [];
  for (const [key, value] of changes) {
    if (Object.prototype.hasOwnProperty.call(data.stem.evolab, key)) {
      tail = tail.replace(new RegExp('("' + key + '"\\s*:\\s*)"(?:\\\\.|[^"\\\\])*"'), (_, prefix) => prefix + JSON.stringify(value));
    } else added.push('      ' + JSON.stringify(key) + ': ' + JSON.stringify(value) + ',');
  }
  if (added.length) tail = tail.replace('"evolab": {', '"evolab": {\n' + added.join('\n'));
  const result = raw.slice(0, start) + tail;
  JSON.parse(result);
  const temporary = full + '.island-strings.tmp';
  fs.writeFileSync(temporary, result);
  // OneDrive can briefly hold the destination open. Replacing a prepared file
  // also avoids truncating the canonical registry if a write is interrupted.
  for (let attempt = 0; ; attempt++) {
    try { fs.renameSync(temporary, full); break; }
    catch (error) {
      if (attempt >= 7) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50 * (attempt + 1));
    }
  }
  console.log(file + ': registered ' + changes.length + ' island strings');
}
if (failures) process.exitCode = 1;
