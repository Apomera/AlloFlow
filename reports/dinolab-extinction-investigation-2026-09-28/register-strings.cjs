const fs = require('node:fs');
const vm = require('node:vm');
const file = 'stem_lab/stem_tool_dinolab.js';
const src = fs.readFileSync(file, 'utf8');
const data = vm.runInNewContext('(' + src.match(/var KPG_EVIDENCE = (\[[\s\S]*?\n  \]);/)[1] + ')');
const strings = {};
for (const item of data) for (const field of ['label','text','supports','limit','source','diagram']) strings['kpg_' + item.id + '_' + field] = item[field];
for (const m of src.matchAll(/\bkt\('([^']+)', ('(?:[^'\\]|\\.)*')\)/g)) strings['kpg_' + m[1]] = vm.runInNewContext(m[2]);
for (const m of src.matchAll(/\bt\('stem\.dinolab\.(kpg_[^']+)', ('(?:[^'\\]|\\.)*')\)/g)) strings[m[1]] = vm.runInNewContext(m[2]);
for (const path of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
  const original = fs.readFileSync(path, 'utf8'), registry = JSON.parse(original);
  Object.assign(registry.stem.dinolab, strings);
  delete registry.stem.dinolab.kpg_choose_connection; // Removed when radio choices replaced the menus.
  if (fs.readFileSync(path, 'utf8') !== original) throw new Error('Concurrent registry edit: ' + path);
  fs.writeFileSync(path, JSON.stringify(registry, null, 2) + (original.endsWith('\n') ? '\n' : ''));
}
fs.copyFileSync(file, 'desktop/web-app/public/' + file);
console.log('Registered ' + Object.keys(strings).length + ' extinction strings and synchronized the shipped module.');
