const fs = require('node:fs');
function replaceFile(file, before, after) {
  let source=fs.readFileSync(file,'utf8');
  if (!source.includes(before)) throw Error('Missing anchor in '+file);
  source=source.replace(before,after);
  const fd=fs.openSync(file,'r+');
  try { fs.writeSync(fd,source,0,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(source)); } finally {fs.closeSync(fd);}
}
replaceFile('reports/geometry-world-expedition-2026-09-12/ground-batching.js',
  "    var geo = new THREE.BoxGeometry(1, 1, 1), uv = geo.getAttribute('uv');",
  "    var geo = new THREE.BoxGeometry(1, 1, 1), uv = geo.getAttribute('uv');\n    // r128 enables USE_COLOR whenever instanceColor exists, then multiplies\n    // geometry color by instance color. Missing base colors make terrain black.\n    geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count * 3).fill(1), 3));");
replaceFile('tests/geometry_world_ground_batching.test.js',
  "describe('Geometry World batched lesson ground', () => {",
  `describe('Geometry World batched lesson ground', () => {
  it('provides white base vertex colors for r128 instance tint multiplication', () => {
    const engine = fixture();
    engine.placeBlock(0, 0, 0, 'grass'); engine.placeBlock(1, 0, 0, 'stone');
    engine._groundChunks.forEach(chunk => {
      const color = chunk.geometry.getAttribute('color');
      expect(color).toBeTruthy();
      expect(color.count).toBe(chunk.geometry.getAttribute('position').count);
      expect(Array.from(color.array).every(value => value === 1)).toBe(true);
      expect(chunk.instanceColor).toBeTruthy();
    });
  });
`);
console.log('Added the r128 instanced-color regression and updated the report-only helper. Production core is owned by the parent.');
