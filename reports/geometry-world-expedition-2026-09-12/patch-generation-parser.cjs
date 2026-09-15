'use strict';
const fs = require('node:fs'), path = require('node:path');
if (!process.argv.includes('--apply')) throw new Error('Pass --apply to update canonical source.');
const target = path.resolve(__dirname, '../../stem_lab/stem_tool_geometryworld.js');
const input = fs.readFileSync(target, 'utf8'), newline = input.includes('\r\n') ? '\r\n' : '\n';
let source = input.replace(/\r\n/g, '\n');
if (source.includes('function parseGeometryLessonJson(')) throw new Error('Parser scope fix already applied.');
const start = source.indexOf('      function parseAiJson(result) {');
const end = source.indexOf('      // ── Helper: save lesson', start);
if (start < 0 || end < 0) throw new Error('Could not locate current JSON parser.');
const parser = source.slice(start, end).replace(/\n\n$/, '\n').replace(/^    /gm, '').replace('function parseAiJson(', 'function parseGeometryLessonJson(');
source = source.slice(0, start) + '      function parseAiJson(result) { return parseGeometryLessonJson(result); }\n\n' + source.slice(end);
if (!source.includes('  async function runGeometryLessonGeneration(options) {')) throw new Error('Missing module-scope runner.');
source = source.replace('  async function runGeometryLessonGeneration(options) {', parser + '\n  async function runGeometryLessonGeneration(options) {');
source = source.replace('parsed = parseAiJson(raw);', 'parsed = parseGeometryLessonJson(raw);');
const next = source.replace(/\n/g, newline);
const fd = fs.openSync(target, 'r+');
try { fs.writeFileSync(fd, next, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(next)); }
finally { fs.closeSync(fd); }
console.log('Shared lesson JSON parser is now available to the module-scope generation pipeline.');
