const fs = require('node:fs');
const file = 'stem_lab/stem_tool_geometryworld_builder.js';
let source = fs.readFileSync(file, 'utf8');
const before = "h('span', null, 'Free Build', h('small', { style: { display: 'block' } }, 'Sandbox studio'))";
const after = "h('span', null, 'Open Free Build', h('small', { style: { display: 'block' } }, 'Create in a sandbox'))";
if (source.split(before).length !== 2) throw Error('Expected one Free Build shortcut');
source = source.replace(before, after);
const fd = fs.openSync(file, 'r+');
try { fs.writeSync(fd, source, 0, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(source)); }
finally { fs.closeSync(fd); }
console.log('Clarified Free Build shortcut.');
