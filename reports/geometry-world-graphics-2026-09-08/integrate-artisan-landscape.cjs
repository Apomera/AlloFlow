const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sourcePath = path.join(process.cwd(),'stem_lab/stem_tool_geometryworld.js');
const mirrorPath = path.join(process.cwd(),'desktop/web-app/public/stem_lab/stem_tool_geometryworld.js');
const helper = fs.readFileSync(path.join(__dirname,'artisan-landscape-helper.txt'),'utf8');
// Read immediately before the bounded replacement so other agents' source edits
// outside initLandscape survive intact.
let source = fs.readFileSync(sourcePath,'utf8');
const newline = source.includes('\r\n') ? '\r\n' : '\n';
const start = source.indexOf('        (function initLandscape() {');
const end = source.indexOf('        // Soft rim light from behind for depth',start);
assert.ok(start>0&&end>start);
source = source.slice(0,start)+helper.replace(/\r?\n/g,newline).trimEnd()+newline+source.slice(end);
for(const file of [sourcePath,mirrorPath]) {
  const fd=fs.openSync(file,'r+');
  try { fs.writeFileSync(fd,source,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(source)); }
  finally { fs.closeSync(fd); }
}
assert.deepEqual(fs.readFileSync(sourcePath),fs.readFileSync(mirrorPath));
console.log('Replaced initLandscape only; root and desktop mirror match.');
