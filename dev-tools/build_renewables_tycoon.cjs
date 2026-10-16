#!/usr/bin/env node
'use strict';
// Keep the stand-alone campaign modules testable while shipping them in the
// existing Renewables Lab entry point (including the desktop/offline mirror).
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = ['renewables_tycoon_engine.js', 'renewables_tycoon_scene.js', 'renewables_tycoon_view.js'];
const start = '// BEGIN GENERATED RENEWABLES TYCOON MODULES';
const end = '// END GENERATED RENEWABLES TYCOON MODULES';
const sourcePath = path.join(root, 'stem_lab/stem_tool_renewables.js');
const mirrorPath = path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_renewables.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const payload = start + '\n' + files.map(name => '// Source: stem_lab/' + name + '\n' + fs.readFileSync(path.join(root, 'stem_lab', name), 'utf8').trim()).join('\n\n') + '\n' + end;
let next;
if (source.includes(start)) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (last < 0 || source.indexOf(start, first + start.length) >= 0) throw new Error('Invalid Tycoon bundle boundaries');
  next = source.slice(0, first) + payload + source.slice(last + end.length);
} else {
  const anchor = "if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('renewablesLab'))) {";
  if (!source.includes(anchor)) throw new Error('Renewables registration boundary missing');
  next = source.replace(anchor, () => payload + '\n\n' + anchor);
}
if (process.argv.includes('--check')) {
  if (next !== source || fs.readFileSync(mirrorPath, 'utf8') !== next) {
    console.error('Renewables Tycoon bundle or desktop mirror needs rebuilding.');
    process.exitCode = 1;
  } else console.log('Renewables Tycoon modules, source and desktop mirror match.');
} else {
  fs.writeFileSync(sourcePath, next);
  fs.writeFileSync(mirrorPath, next);
  console.log('Bundled Renewables Tycoon into the lab and desktop mirror.');
}
