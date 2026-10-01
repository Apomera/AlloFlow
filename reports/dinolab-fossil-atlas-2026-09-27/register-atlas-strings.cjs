// Register only this pass's strings; retain unrelated in-progress registry edits.
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');
const anatomy = vm.runInNewContext('(' + source.match(/var ANATOMY = (\[[\s\S]*?\n  \]);/)[1] + ')');
const additions = {};
for (const item of anatomy) for (const field of ['name','tag','what','tells','limit','question','diagram','source']) additions['atlas_' + item.id + '_' + field] = item[field];
for (const match of source.matchAll(/\bat\('([^']+)', ('(?:[^'\\]|\\.)*')\)/g)) additions['atlas_' + match[1]] = vm.runInNewContext(match[2]);
for (const match of source.matchAll(/__alloT\('stem\.dinolab\.(atlas_[^']+)', ('(?:[^'\\]|\\.)*')\)/g)) additions[match[1]] = vm.runInNewContext(match[2]);
for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const original = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(original);
  Object.assign(data.stem.dinolab, additions);
  const updated = JSON.stringify(data, null, 2) + (original.endsWith('\n') ? '\n' : '');
  if (fs.readFileSync(file, 'utf8') !== original) throw new Error('Registry changed during read: ' + file);
  fs.writeFileSync(file, updated);
}
fs.copyFileSync('stem_lab/stem_tool_dinolab.js', 'desktop/web-app/public/stem_lab/stem_tool_dinolab.js');
console.log('Registered ' + Object.keys(additions).length + ' atlas strings in both registries; synchronized the shipped module.');
