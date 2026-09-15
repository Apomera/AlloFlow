const fs=require('node:fs'),assert=require('node:assert/strict');
function edit(file,replacements){
 const raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n';let source=raw.replace(/\r\n/g,'\n');
 for(const [before,after] of replacements){assert.equal(source.split(before).length,2,before);source=source.replace(before,after);}
 const data=Buffer.from(source.replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}
}
edit('stem_lab/stem_tool_geometryworld.js',[
 ['          var target = new THREE.Vector3(cam.position.x + fwd.x * 3, floorTop, cam.position.z + fwd.z * 3);\n          cam.lookAt(target);',
  '          // Aim inside a cell: a ray on a shared voxel edge can hit its side.\n          var target = new THREE.Vector3(Math.floor(cam.position.x + fwd.x * 3) + 0.5, floorTop, Math.floor(cam.position.z + fwd.z * 3) + 0.5);\n          cam.lookAt(target);\n          cam.updateMatrixWorld(true); // Publish the new aim before the next render.'],
 ['              engine.camera.lookAt(sp[0], entryFloor + 1, sp[2] - 3);',
  '              engine.camera.lookAt(Math.floor(sp[0]) + 0.5, entryFloor + 1, Math.floor(sp[2] - 3) + 0.5);']
]);
edit('tests/geometry_world_free_build_guidance.test.js',[
 ['expect(ground.x).toBeCloseTo(0); expect(ground.y).toBeCloseTo(1); expect(ground.z).toBeCloseTo(3);',
  'expect(ground.x).toBeCloseTo(0.5); expect(ground.y).toBeCloseTo(1); expect(ground.z).toBeCloseTo(3.5);'],
 ['const expected = new THREE.Vector3(0, 6 - 7.6, -3).normalize();',
  'const expected = new THREE.Vector3(0.5, 6 - 7.6, -2.5).normalize();']
]);
console.log('Centered entry and Aim targets inside ground cells, and refreshed the camera before preview.');
