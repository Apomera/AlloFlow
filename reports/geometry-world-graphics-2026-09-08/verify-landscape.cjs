const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const snippet = fs.readFileSync(path.join(__dirname, 'landscape-helper.txt'), 'utf8');
const engine = { scene: new THREE.Scene(), blocks: new Map([['0,0,0', 'sentinel']]) };
new Function('THREE', 'engine', 'geometryWorldSrgbColor', snippet)(THREE, engine, (T, hex) => new T.Color(hex).convertSRGBToLinear());
let disposedGeometry = 0, disposedMaterial = 0;
function hash(group) {
  const h = crypto.createHash('sha256');
  group.children.forEach(mesh => h.update(Buffer.from(mesh.geometry.attributes.position.array.buffer)));
  return h.digest('hex');
}
function inspect(ground) {
  engine.refreshLandscape(ground);
  const group = engine._landscape;
  assert.equal(group.children.length, 4);
  let triangles = 0, minimumClearance = Infinity;
  group.children.forEach(mesh => {
    assert.ok(mesh.userData.gwLandscape);
    assert.equal(mesh.castShadow, false);
    assert.equal(mesh.receiveShadow, false);
    assert.equal(mesh.material.fog, true);
    const hits = [];
    mesh.raycast({}, hits);
    assert.equal(hits.length, 0);
    const arr = mesh.geometry.attributes.position.array;
    triangles += arr.length / 9;
    assert.ok(arr.every(Number.isFinite));
    if (mesh.name === 'gw-rolling-hills' || mesh.name === 'gw-distant-ridges') {
      const normals = mesh.geometry.attributes.normal.array;
      for (let j = 1; j < normals.length; j += 3) assert.ok(normals[j] > 0, 'terrain normals face upwards');
      for (let t = 0; t < arr.length; t += 9) {
        const points = [0, 3, 6].map(k => [arr[t + k], arr[t + k + 2]]);
        points.push([(arr[t] + arr[t + 3] + arr[t + 6]) / 3, (arr[t + 2] + arr[t + 5] + arr[t + 8]) / 3]);
        for (const [x, z] of points) {
          const dx = Math.max(ground.xMin - 0.5 - x, 0, x - ground.xMax - 0.5);
          const dz = Math.max(ground.zMin - 0.5 - z, 0, z - ground.zMax - 0.5);
          minimumClearance = Math.min(minimumClearance, Math.hypot(dx, dz));
        }
      }
    }
    mesh.geometry.addEventListener('dispose', () => disposedGeometry++);
    mesh.material.addEventListener('dispose', () => disposedMaterial++);
  });
  assert.equal(triangles, 1584);
  assert.ok(minimumClearance > 29.8);
  engine.refreshLandscape({...ground});
  assert.equal(engine._landscape, group, 'equal ground bounds reuse the same meshes');
  assert.equal(engine.blocks.size, 1);
  assert.equal(engine.blocks.get('0,0,0'), 'sentinel');
  return { ground, triangles, minimumClearance, hash: hash(group) };
}
const ground = {xMin:-4,xMax:24,zMin:-4,zMax:24,y:0};
const results = [inspect(ground), inspect({xMin:100,xMax:1000,zMin:-100,zMax:-95,y:12})];
assert.equal(disposedGeometry, 4);
assert.equal(disposedMaterial, 4);
results.push(inspect(ground));
assert.equal(results[0].hash, results[2].hash, 'landscape generation is deterministic');
engine.disposeLandscape();
assert.equal(disposedGeometry, 12);
assert.equal(disposedMaterial, 12);
assert.equal(engine._landscape, null);
assert.equal(engine.scene.children.length, 0);
engine.disposeLandscape();
assert.equal(disposedGeometry, 12);
engine._destroyed = true;
engine.refreshLandscape(ground);
assert.equal(engine._landscape, null);
console.log(JSON.stringify({pass:true, drawCalls:4, triangles:1584, disposedGeometry, disposedMaterial, results}, null, 2));
