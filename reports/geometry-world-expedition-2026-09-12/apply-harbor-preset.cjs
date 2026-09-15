'use strict';
// Preview by default. Parent task applies only after the ground batching change.
// This script changes only the canonical core; mirror synchronization is separate.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const target = path.join(root, 'stem_lab/stem_tool_geometryworld.js');
const fixturePath = path.join(__dirname, 'geometry-harbor.json');
const lesson = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const source = fs.readFileSync(target, 'utf8');
const eol = source.includes('\r\n') ? '\r\n' : '\n';
assert(!source.includes('SAMPLE_LESSONS.geometryHarbor ='), 'Harbor is already installed; review rather than duplicating it');
assert.equal(lesson.activities.length, 6);
assert(lesson.structures.filter(s=>s.y1===0&&s.y2===0).every(s=>s.measurementLayer==='ground'), 'Floor palettes require the ground overlay contract');
let result = source;
const marker = '  // The authored lessons put the correct choice first';
assert.equal(result.split(marker).length, 2, 'Expected one pre-rotation insertion marker');
const formatted = JSON.stringify(lesson, null, 2).split('\n').map((s,i)=>i===0?s:'  '+s).join(eol);
result = result.replace(marker,
  '  // Original connected expedition. Register before deterministic answer rotation.' + eol +
  '  SAMPLE_LESSONS.geometryHarbor = ' + formatted + ';' + eol + eol + marker);
const orderPattern = /var LESSON_ORDER\s*=\s*\[([^\]]+)\];/;
assert(orderPattern.test(result), 'Missing lesson sequence');
result = result.replace(orderPattern, (whole, body) => {
  assert(!body.includes('geometryHarbor'), 'Harbor already appears in the sequence');
  return "var LESSON_ORDER =[" + body + ", 'geometryHarbor'];";
});
const optionPattern = /^(\s*)el\('option', \{ value: 'fluencyMaze' \}, ([^\r\n]+)\)$/m;
assert(optionPattern.test(result), 'Expected the existing final built-in option');
result = result.replace(optionPattern, (whole, indent) => whole + ',' + eol + indent + "el('option', { value: 'geometryHarbor' }, '\\u2693 Geometry Harbor Expedition')");
new vm.Script(result, { filename: target });
if (process.argv.includes('--apply')) {
  const fd = fs.openSync(target, 'r+');
  fs.writeFileSync(fd, result); fs.ftruncateSync(fd, Buffer.byteLength(result)); fs.closeSync(fd);
  console.log(JSON.stringify({ applied: true, target, addedBytes: Buffer.byteLength(result)-Buffer.byteLength(source) }));
} else {
  console.log(JSON.stringify({ applied: false, syntaxValid: true, target, addedBytes: Buffer.byteLength(result)-Buffer.byteLength(source), apply: 'node reports/geometry-world-expedition-2026-09-12/apply-harbor-preset.cjs --apply' }));
}
