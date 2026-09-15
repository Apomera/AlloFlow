'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), vm = require('node:vm');
const target = path.resolve(__dirname, '../../stem_lab/stem_tool_geometryworld.js');
const old = fs.readFileSync(target, 'utf8'), eol = old.includes('\r\n') ? '\r\n' : '\n';
let source = old.replace(/\r\n/g, '\n');
for (const [id, next, file] of [['areaSurface', 'buildChallenge', 'area-surface-guided.json'], ['compositeVolume', 'fractionVolume', 'composite-volume-guided.json']]) {
  const lesson = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
  const start = source.indexOf('    ' + id + ': {'), end = source.indexOf('    ' + next + ': {', start);
  assert(start >= 0 && end > start, 'Missing preset ' + id);
  const formatted = JSON.stringify(lesson, null, 2).split('\n').map((line, i) => i ? '    ' + line : line).join('\n');
  source = source.slice(0, start) + '    ' + id + ': ' + formatted + ',\n' + source.slice(end);
}
source = source.replace(/\n/g, eol);
new vm.Script(source, {filename: target});
if (process.argv.includes('--apply')) {
  const fd = fs.openSync(target, 'r+');
  fs.writeFileSync(fd, source); fs.ftruncateSync(fd, Buffer.byteLength(source)); fs.closeSync(fd);
}
console.log(JSON.stringify({applied: process.argv.includes('--apply'), syntaxValid: true, changed: source !== old, addedBytes: Buffer.byteLength(source) - Buffer.byteLength(old)}));
