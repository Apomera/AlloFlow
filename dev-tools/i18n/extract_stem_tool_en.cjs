#!/usr/bin/env node
// extract_stem_tool_en.cjs <tool> — pull t('stem.<tool>.<key>','English')
// pairs from stem_lab/stem_tool_<tool>.js into stem_<tool>_en.json (short keys).
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const tool = process.argv[2];
if (!tool) { console.error('Usage: extract_stem_tool_en.cjs <tool>'); process.exit(2); }
const srcPath = path.join(ROOT, 'stem_lab', 'stem_tool_' + tool + '.js');
const src = fs.readFileSync(srcPath, 'utf8');
// t(  <q1> stem.<tool>.<key> <q1> , <q2> <english> <q2>
const re = new RegExp(
  "t\\(\\s*(['\"])stem\\." + tool + "\\.([a-zA-Z0-9_]+)\\1\\s*,\\s*(['\"])((?:\\\\.|(?!\\3).)*)\\3",
  'g');
let m, dup = 0;
const out = {};
while ((m = re.exec(src))) {
  const key = m[2];
  let val = m[4]
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\(["'`])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
  if (Object.prototype.hasOwnProperty.call(out, key)) { if (out[key] !== val) dup++; continue; }
  out[key] = val;
}
const keys = Object.keys(out);
fs.writeFileSync(path.join(__dirname, 'stem_' + tool + '_en.json'), JSON.stringify(out, null, 2) + '\n');
console.log('extracted ' + keys.length + ' unique keys from ' + tool + '; dup-with-diff: ' + dup);
console.log('sample: ' + keys.slice(0, 10).join(', '));
