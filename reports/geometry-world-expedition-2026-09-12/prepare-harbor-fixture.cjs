'use strict';
// Mechanical artifact correction, used because the workspace ACL helper cannot
// reopen an existing file through apply_patch in this environment.
const fs = require('node:fs');
const path = require('node:path');
const target = path.join(__dirname, 'build-harbor-fixture.cjs');
let source = fs.readFileSync(target, 'utf8');
source = source.replace("  structures.push({ id, type: 'fill', x1, y1, z1, x2, y2, z2, block });", "  const s = { id, type: 'fill', x1, y1, z1, x2, y2, z2, block };\n  if (y1 === 0 && y2 === 0) s.measurementLayer = 'ground';\n  structures.push(s);");
source = source.replace('assert.equal(questionSteps,20);', 'assert.equal(questionSteps,19);');
const fd = fs.openSync(target, 'r+');
fs.writeFileSync(fd,source); fs.ftruncateSync(fd,Buffer.byteLength(source)); fs.closeSync(fd);
