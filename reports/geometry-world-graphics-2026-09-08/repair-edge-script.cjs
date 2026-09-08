const fs = require('node:fs');
const path = require('node:path');
const p = path.join(__dirname, 'fix-block-edge-lifecycle.cjs');
const s = fs.readFileSync(p, 'utf8').replace('assert.deepEqual(', '}\nassert.deepEqual(');
const fd = fs.openSync(p, 'r+');
try { fs.writeFileSync(fd, s, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(s)); }
finally { fs.closeSync(fd); }
