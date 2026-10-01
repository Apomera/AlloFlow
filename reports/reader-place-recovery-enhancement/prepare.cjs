// Candidate-only preparation: never writes shared reader/translation files.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '../..');
const output = file => path.join(__dirname, file);
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('view_simplified_source.jsx');
fs.writeFileSync(output('candidate-inputs.json'), JSON.stringify(Object.fromEntries(['view_simplified_source.jsx', 'ui_strings.js', 'reader_place_store.js']
  .map(file => [file, createHash('sha256').update(read(file)).digest('hex')])), null, 2) + '\n');
const start = source.indexOf('    function storeReadingPlace(update) {');
const end = source.indexOf('    function passageParagraphNodes() {', start);
if (start < 0 || end < 0 || source.includes('    function resolveReadingConflict(choice)')) throw new Error('Reader integration anchors changed; review ownership and rebase this candidate.');
const next = source.slice(0, start) + fs.readFileSync(output('ui-replacement.jsx'), 'utf8') + '\n' + source.slice(end);
fs.writeFileSync(output('view_simplified_source.jsx'), next);
const compiled = babel.transformSync(read('reader_place_store.js') + '\n' + next, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]], babelrc: false, configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] }, generatorOpts: { jsescOption: { minimal: true } }
});
fs.writeFileSync(output('view_simplified_module.js'), `(function(){'use strict';var React=window.React;var Fragment=React.Fragment;\n${compiled.code}\nwindow.AlloModules=window.AlloModules||{};window.AlloModules.SimplifiedView=SimplifiedView;window.AlloModules.ViewSimplifiedModule=true;})();\n`);
const strings = JSON.parse(read('ui_strings.js'));
Object.assign(strings.simplified, JSON.parse(fs.readFileSync(output('strings.json'), 'utf8')));
fs.writeFileSync(output('ui_strings.js'), JSON.stringify(strings, null, 2) + '\n');
let patch = '';
for (const file of ['view_simplified_source.jsx', 'ui_strings.js']) {
  const candidate = path.relative(root, output(file)).replace(/\\/g, '/');
  const diff = spawnSync('git', ['--no-optional-locks', 'diff', '--no-index', '--', file, candidate], { cwd: root, encoding: 'utf8' });
  if (diff.status > 1 || diff.error) throw diff.error || new Error(diff.stderr);
  patch += diff.stdout.split(candidate).join(file);
}
fs.writeFileSync(output('shared-ui.patch'), patch);
console.log('Prepared isolated reader/UI-string candidate and shared-ui.patch. Shared files were not changed.');
