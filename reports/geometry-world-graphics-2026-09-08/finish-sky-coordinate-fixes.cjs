const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sourcePath = path.join(process.cwd(), 'stem_lab/stem_tool_geometryworld.js');
const mirrorPath = path.join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_geometryworld.js');
let source = fs.readFileSync(sourcePath, 'utf8');
[
  ['float s = max(dot(dir, sunDir), 0.0);', 'float s = max(dot(normalize(vWorldPosition), sunDir), 0.0);'],
  ['engine.camera.position.x + sdir.x * 90, Math.max(6, sdir.y * 90), engine.camera.position.z + sdir.z * 90', 'engine.camera.position.x + sdir.x * 90, engine.camera.position.y + Math.max(6, sdir.y * 90), engine.camera.position.z + sdir.z * 90'],
  ['engine.camera.position.x - sdir.x * mfl * 90, mel * 90, engine.camera.position.z - sdir.z * mfl * 90', 'engine.camera.position.x - sdir.x * mfl * 90, engine.camera.position.y + mel * 90, engine.camera.position.z - sdir.z * mfl * 90']
].forEach(([before, after]) => {
  assert.equal(source.split(before).length - 1, 1, 'expected one coordinate-fix anchor');
  source = source.replace(before, after);
});
for (const file of [sourcePath, mirrorPath]) {
  const fd = fs.openSync(file, 'r+');
  try { fs.writeFileSync(fd, source, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(source)); }
  finally { fs.closeSync(fd); }
}
assert.deepEqual(fs.readFileSync(sourcePath), fs.readFileSync(mirrorPath));
console.log('Solar shader direction and camera-relative celestial sprite heights corrected; source and mirror match.');
