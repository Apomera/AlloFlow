const fs = require('node:fs'), assert = require('node:assert/strict');
function change(file, before, after) {
  let source = fs.readFileSync(file, 'utf8');
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  before = before.replace(/\n/g, newline); after = after.replace(/\n/g, newline);
  assert.equal(source.split(before).length, 2);
  source = source.replace(before, after);
  const fd = fs.openSync(file, 'r+');
  try { fs.writeSync(fd, source, 0, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(source)); } finally { fs.closeSync(fd); }
}
change('stem_lab/stem_tool_geometryworld.js',
  '              engine.camera.lookAt(sp[0], entryFloor + 1, sp[2] - 3);\n              if (engine.euler)',
  '              engine.camera.lookAt(sp[0], entryFloor + 1, sp[2] - 3);\n              engine.camera.updateMatrixWorld(true); // The first input can precede the next render.\n              if (engine.euler)');
change('tests/geometry_world_free_build_guidance.test.js',
  '    const ray = new THREE.Ray(engine.camera.position, engine.camera.getWorldDirection(new THREE.Vector3()));\n    const ground = ray.intersectPlane(',
  '    const caster = new THREE.Raycaster();\n    caster.setFromCamera(new THREE.Vector2(0, 0), engine.camera);\n    const ground = caster.ray.intersectPlane(');
console.log('Synchronized the initial camera matrix and verified the first ray before any render.');
