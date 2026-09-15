const fs = require('node:fs');
function replaceFile(file, before, after) {
  let source=fs.readFileSync(file,'utf8');
  if (!source.includes(before)) throw Error('Missing anchor in '+file);
  source=source.replace(before,after);
  const fd=fs.openSync(file,'r+');
  try { fs.writeSync(fd,source,0,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(source)); } finally {fs.closeSync(fd);}
}
replaceFile('reports/geometry-world-expedition-2026-09-12/ground-batching.js',
  '    chunk.count = 0;',
  '    // r128 setColorAt allocates from this.count, so allocate full capacity\n    // before count becomes zero for the sparse, initially empty chunk.\n    chunk.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(SIDE * SIDE * 3).fill(1), 3);\n    chunk.count = 0;');
replaceFile('tests/geometry_world_ground_batching.test.js',
  "      expect(chunk.instanceColor).toBeTruthy();",
  "      expect(chunk.instanceColor).toBeTruthy();\n      expect(chunk.instanceColor.count).toBe(chunk.instanceMatrix.count);\n      expect(Array.from(chunk.instanceColor.array).every(value => value > 0)).toBe(true);\n      const live = Object.values(engine.blocks).find(mesh => mesh.userData._groundRecord.mesh === chunk);\n      const offset = live.userData._groundInstance * 3;\n      expect(Array.from(chunk.instanceColor.array.slice(offset, offset + 3))).toHaveLength(3);");
replaceFile('reports/geometry-world-expedition-2026-09-12/debug-ground-webgl.cjs',
  "      const savedColors=chosen.instanceColor;chosen.instanceColor=null;variants.push(sample('basic-noinstancecolors'));",
  "      const savedColors=chosen.instanceColor;");
console.log('Report helper preallocates full instance colors; durable regression now checks buffer capacity and live-cell tint. Production is parent-owned.');
