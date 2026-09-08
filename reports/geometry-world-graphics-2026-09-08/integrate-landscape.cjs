const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sourcePath = path.join(process.cwd(), 'stem_lab/stem_tool_geometryworld.js');
const mirrorPath = path.join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_geometryworld.js');
let source = fs.readFileSync(sourcePath, 'utf8');
const newline = source.includes('\r\n') ? '\r\n' : '\n';
const helper = fs.readFileSync(path.join(__dirname, 'landscape-helper.txt'), 'utf8').replace(/\r?\n/g, newline).trimEnd();
function replaceOnce(before, after) {
  assert.equal(source.split(before).length - 1, 1, 'expected one integration anchor: ' + before);
  source = source.replace(before, after);
}
assert.ok(!source.includes('(function initLandscape()'));
replaceOnce('        // Soft rim light from behind for depth', helper + newline + '        // Soft rim light from behind for depth');
replaceOnce('        engine.clearWorld = function() {', '        engine.clearWorld = function() {' + newline + '          if (engine.disposeLandscape) engine.disposeLandscape();');
replaceOnce('          engine.refreshAllAO();' + newline + '          if (engine._fillTruncated', '          engine.refreshAllAO();' + newline + '          if (engine.refreshLandscape) engine.refreshLandscape(lesson.ground);' + newline + '          if (engine._fillTruncated');
function writeExisting(file, content) {
  const fd = fs.openSync(file, 'r+');
  try { fs.writeFileSync(fd, content, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(content)); }
  finally { fs.closeSync(fd); }
}
writeExisting(sourcePath, source);
writeExisting(mirrorPath, source);
assert.deepEqual(fs.readFileSync(sourcePath), fs.readFileSync(mirrorPath));
console.log('Integrated landscape creation, lesson refresh and world-clear disposal; source and public mirror match.');
