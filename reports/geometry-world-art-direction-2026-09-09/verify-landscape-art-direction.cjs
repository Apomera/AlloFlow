const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const snippet = fs.readFileSync(path.join(__dirname, 'landscape-art-direction.js'), 'utf8');
const horizonColor = new THREE.Color(0x496d46).convertSRGBToLinear();
const blocks = { '0,0,0': { fixture: true } }, history = [{ fixture: true }];
const engine = { scene: new THREE.Scene(), blocks, _undoStack: history, _renderProfile: { tier: 'detail' }, _horizon: { material: { color: horizonColor } } };
new Function('THREE', 'engine', 'geometryWorldSrgbColor', snippet)(THREE, engine, (T, hex) => new T.Color(hex).convertSRGBToLinear());
let disposedGeometry = 0, disposedMaterial = 0, createdMeshes = 0;
function digest(group) {
  const hash = crypto.createHash('sha256');
  for (const mesh of group.children) for (const key of ['position', 'normal', 'color']) hash.update(Buffer.from(mesh.geometry.attributes[key].array.buffer));
  return hash.digest('hex');
}
function pointSegmentDistance(a, p, q) {
  const dx = q[0] - p[0], dz = q[1] - p[1], denom = dx * dx + dz * dz;
  const t = denom ? Math.max(0, Math.min(1, ((a[0] - p[0]) * dx + (a[1] - p[1]) * dz) / denom)) : 0;
  return Math.hypot(a[0] - p[0] - t * dx, a[1] - p[1] - t * dz);
}
function cross(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
function segmentDistance(a, b, c, d) {
  const s1 = cross(a, b, c), s2 = cross(a, b, d), s3 = cross(c, d, a), s4 = cross(c, d, b);
  if (s1 * s2 < 0 && s3 * s4 < 0) return 0;
  return Math.min(pointSegmentDistance(a, c, d), pointSegmentDistance(b, c, d), pointSegmentDistance(c, a, b), pointSegmentDistance(d, a, b));
}
function inspect(ground, tier) {
  engine._renderProfile.tier = tier;
  engine.refreshLandscape(ground);
  const group = engine._landscape;
  assert.equal(group.children.length, 6);
  assert.equal(engine.scene.children.length, 1);
  const x0 = Math.min(ground.xMin, ground.xMax) - 0.5, x1 = Math.max(ground.xMin, ground.xMax) + 0.5;
  const z0 = Math.min(ground.zMin, ground.zMax) - 0.5, z1 = Math.max(ground.zMin, ground.zMax) + 0.5;
  const corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  let triangles = 0, minimumClearance = Infinity, maxHeight = -Infinity;
  const meshes = [];
  for (const mesh of group.children) {
    assert.ok(mesh.userData.gwLandscape);
    assert.equal(mesh.castShadow, false);
    assert.equal(mesh.receiveShadow, false);
    assert.equal(mesh.material.fog, true);
    assert.equal(mesh.material.isMeshStandardMaterial, true);
    assert.equal(mesh.material.map, null);
    const hits = []; mesh.raycast({}, hits); assert.equal(hits.length, 0);
    const pos = mesh.geometry.attributes.position.array, normals = mesh.geometry.attributes.normal.array, colors = mesh.geometry.attributes.color.array;
    assert.ok(pos.every(Number.isFinite)); assert.ok(normals.every(Number.isFinite)); assert.ok(colors.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
    const terrain = mesh.name === 'gw-rolling-hills' || mesh.name === 'gw-mountain-ridges' || mesh.name === 'gw-distant-ridges';
    if (terrain) for (let i = 1; i < normals.length; i += 3) assert.ok(normals[i] > 0, 'terrain normals face upward');
    for (let i = 1; i < pos.length; i += 3) maxHeight = Math.max(maxHeight, pos[i] - ground.y);
    for (let i = 0; i < pos.length; i += 9) {
      const tri = [0, 3, 6].map(k => [pos[i + k], pos[i + k + 2]]);
      for (let edge = 0; edge < 3; edge++) for (let re = 0; re < 4; re++) minimumClearance = Math.min(minimumClearance, segmentDistance(tri[edge], tri[(edge + 1) % 3], corners[re], corners[(re + 1) % 4]));
      const centroid = [(tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][1] + tri[1][1] + tri[2][1]) / 3];
      assert.ok(centroid[0] < x0 || centroid[0] > x1 || centroid[1] < z0 || centroid[1] > z1, 'no triangle occupies the lesson footprint');
    }
    if (terrain) {
      for (let i = 0; i < pos.length; i += 3) if (Math.abs(pos[i + 1] - (ground.y - 0.12)) < 0.0001) {
        assert.ok(Math.abs(colors[i] - horizonColor.r) < 0.000001);
        assert.ok(Math.abs(colors[i + 1] - horizonColor.g) < 0.000001);
        assert.ok(Math.abs(colors[i + 2] - horizonColor.b) < 0.000001);
      }
    }
    triangles += pos.length / 9;
    meshes.push({ name: mesh.name, triangles: pos.length / 9 });
    mesh.geometry.addEventListener('dispose', () => disposedGeometry++);
    mesh.material.addEventListener('dispose', () => disposedMaterial++);
    createdMeshes++;
  }
  assert.equal(triangles, tier === 'saver' ? 3292 : 5468);
  assert.ok(minimumClearance >= 30, 'all decorative triangle edges stay 30 units beyond occupied lesson ground');
  engine.refreshLandscape({ ...ground });
  assert.equal(engine._landscape, group, 'same bounds and tier reuse meshes');
  assert.equal(engine.blocks, blocks); assert.equal(engine._undoStack, history);
  assert.equal(Object.keys(blocks).length, 1); assert.equal(history.length, 1);
  return { ground, tier, triangles, drawCalls: group.children.length, minimumClearance, maxHeight, detail: group.userData.gwLandscapeDetail, meshes, hash: digest(group) };
}
const standard = { xMin: -5, xMax: 5, zMin: -4, zMax: 4, y: 0 };
const fixtures = [standard, { xMin: 100, xMax: 1000, zMin: -100, zMax: -95, y: 12 }, { xMin: 20, xMax: -20, zMin: 2, zMax: -2, y: -4 }, { xMin: 0, xMax: 0, zMin: 0, zMax: 0, y: 0 }];
const results = [];
for (const tier of ['detail', 'saver']) for (const ground of fixtures) results.push(inspect(ground, tier));
const repeat = inspect(standard, 'detail');
assert.equal(repeat.hash, results[0].hash, 'regeneration is deterministic');
engine.disposeLandscape();
assert.equal(disposedGeometry, createdMeshes); assert.equal(disposedMaterial, createdMeshes);
assert.equal(engine._landscape, null); assert.equal(engine.scene.children.length, 0);
engine.disposeLandscape(); assert.equal(disposedGeometry, createdMeshes);
engine._destroyed = true; engine.refreshLandscape(standard); assert.equal(engine._landscape, null);
const report = { pass: true, scope: 'Actual vendored THREE r128 geometry/lifecycle test; no browser launch', results, repeatHash: repeat.hash, createdMeshes, disposedGeometry, disposedMaterial };
fs.writeFileSync(path.join(__dirname, 'landscape-art-direction-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ pass: true, detailTriangles: results[0].triangles, saverTriangles: results[4].triangles, minimumClearance: Math.min(...results.map(r => r.minimumClearance)), maxHeight: Math.max(...results.map(r => r.maxHeight)), createdMeshes, disposedGeometry, disposedMaterial }, null, 2));
