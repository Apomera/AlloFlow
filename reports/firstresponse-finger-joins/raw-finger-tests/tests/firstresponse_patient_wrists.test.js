import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import geometryDelta from './helpers/firstresponse_manikin_refinement_delta.cjs';

// This fixture retains its fixed historical geometry contract. Reverse only
// the exact later manikin refinement; current head/palm/reach checks use raw source.
const source = geometryDelta.revertManikinRefinement(readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8'));
const THREE = {}, scenes = [], ages = ['adult', 'child', 'infant'];
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
// Captured from the completed sleeve pass before the wrist connector changed.
// Every patient-arm object transform and every other geometry remains included.
const originalPatientArms = /* captured baseline */ {
  "adult:0": "ddcecd00cccb5b9b601182f0842dbaa3417bf66110f851e7ff6ef545251380de",
  "adult:1": "ddcecd00cccb5b9b601182f0842dbaa3417bf66110f851e7ff6ef545251380de",
  "adult:2": "44dd1a2a609ca2cee4746d35e81f3d856dfd8d9bd8085e7fa98716214d19998d",
  "adult:3": "680d55ca96d0f73292974a072a47bb023d07dae66ee2b120e58968de8f690dd2",
  "adult:4": "680d55ca96d0f73292974a072a47bb023d07dae66ee2b120e58968de8f690dd2",
  "adult:5": "44956bd86d400477324095f424574e1a7d5189fee7942477c049f4bb5b72f06a",
  "adult:6": "ddbdeb38a4e66d9d10af62996a5428040fce18197e01d0b5544ff6b883023683",
  "adult:7": "7db058885f5a51bd6ea7a44c0dbc61378023af42b67c57a2cc245e5ee4880f63",
  "adult:8": "7db058885f5a51bd6ea7a44c0dbc61378023af42b67c57a2cc245e5ee4880f63",
  "child:0": "600c814f980bc548e47b0d165804157b090cdeafda1535b8cb62751fa53b7a41",
  "child:1": "600c814f980bc548e47b0d165804157b090cdeafda1535b8cb62751fa53b7a41",
  "child:2": "55f25c63e3276a79344d53041622afc634187ce23feecd6e83ca70533b480b66",
  "child:3": "49835b6b56c438a5ddf4665ddd5dab06e3bdb642ab67e0a4bf171cc2524c1d4b",
  "child:4": "49835b6b56c438a5ddf4665ddd5dab06e3bdb642ab67e0a4bf171cc2524c1d4b",
  "child:5": "b6c5d40e88f23539c9540d3dc0d8f5b2c476231dddbd1874dc6f38956118d715",
  "child:6": "829dca858fdbf1965e62de8bbef7ca8c864f49cff943b606da11e95360ba6821",
  "child:7": "c565ccd631e5ad82340bf85a4eaa9ea6e6b272009f3bd6bb6df37121ed8c7696",
  "child:8": "c565ccd631e5ad82340bf85a4eaa9ea6e6b272009f3bd6bb6df37121ed8c7696",
  "infant:0": "9ebc76bdbcabff2621873709d7135303d65037bd70ccf1f975f261093a246766",
  "infant:1": "9ebc76bdbcabff2621873709d7135303d65037bd70ccf1f975f261093a246766",
  "infant:2": "dfab8060f9a7255810c0ac9d600b18f16800111a75c128dcaf1ad9c97b58b605",
  "infant:3": "ebea0e085ce54239311fbc3ca5750927dac886fde5dc8b112c22e8b532d21781",
  "infant:4": "ebea0e085ce54239311fbc3ca5750927dac886fde5dc8b112c22e8b532d21781",
  "infant:5": "9a033b958bc21532e289d2033bb3c6a99fd61aca87bbdec723daf3b56002edf7",
  "infant:6": "8778cdd5d52a853e1a4be84d888f97425f1d940d7fb8cf9a810548484c18fbff",
  "infant:7": "acc842a84078da735896bf12af9eb225cbe7f882175b90da6a4559077b23ceb1",
  "infant:8": "acc842a84078da735896bf12af9eb225cbe7f882175b90da6a4559077b23ceb1"
};
const originalRescuerGeometry = /* captured baseline */ {
  "adult:0": "735181ae4ec540fb2ffaed5d76833d391961172d62e2387149f5573098c191da",
  "adult:1": "735181ae4ec540fb2ffaed5d76833d391961172d62e2387149f5573098c191da",
  "adult:2": "735181ae4ec540fb2ffaed5d76833d391961172d62e2387149f5573098c191da",
  "adult:3": "735181ae4ec540fb2ffaed5d76833d391961172d62e2387149f5573098c191da",
  "adult:4": "735181ae4ec540fb2ffaed5d76833d391961172d62e2387149f5573098c191da",
  "adult:5": "735181ae4ec540fb2ffaed5d76833d391961172d62e2387149f5573098c191da",
  "adult:6": "735181ae4ec540fb2ffaed5d76833d391961172d62e2387149f5573098c191da",
  "adult:7": "735181ae4ec540fb2ffaed5d76833d391961172d62e2387149f5573098c191da",
  "adult:8": "735181ae4ec540fb2ffaed5d76833d391961172d62e2387149f5573098c191da",
  "child:0": "bec4e30876095594b345a54b213eb9fc5250c7ac9afd1dbdce4e9cf34e08eaae",
  "child:1": "bec4e30876095594b345a54b213eb9fc5250c7ac9afd1dbdce4e9cf34e08eaae",
  "child:2": "bec4e30876095594b345a54b213eb9fc5250c7ac9afd1dbdce4e9cf34e08eaae",
  "child:3": "bec4e30876095594b345a54b213eb9fc5250c7ac9afd1dbdce4e9cf34e08eaae",
  "child:4": "bec4e30876095594b345a54b213eb9fc5250c7ac9afd1dbdce4e9cf34e08eaae",
  "child:5": "bec4e30876095594b345a54b213eb9fc5250c7ac9afd1dbdce4e9cf34e08eaae",
  "child:6": "bec4e30876095594b345a54b213eb9fc5250c7ac9afd1dbdce4e9cf34e08eaae",
  "child:7": "bec4e30876095594b345a54b213eb9fc5250c7ac9afd1dbdce4e9cf34e08eaae",
  "child:8": "bec4e30876095594b345a54b213eb9fc5250c7ac9afd1dbdce4e9cf34e08eaae",
  "infant:0": "c816aa75cc908bb9c72161f454d9bd24577997c9410488a5a494390be57559dc",
  "infant:1": "c816aa75cc908bb9c72161f454d9bd24577997c9410488a5a494390be57559dc",
  "infant:2": "c816aa75cc908bb9c72161f454d9bd24577997c9410488a5a494390be57559dc",
  "infant:3": "c816aa75cc908bb9c72161f454d9bd24577997c9410488a5a494390be57559dc",
  "infant:4": "c816aa75cc908bb9c72161f454d9bd24577997c9410488a5a494390be57559dc",
  "infant:5": "c816aa75cc908bb9c72161f454d9bd24577997c9410488a5a494390be57559dc",
  "infant:6": "c816aa75cc908bb9c72161f454d9bd24577997c9410488a5a494390be57559dc",
  "infant:7": "c816aa75cc908bb9c72161f454d9bd24577997c9410488a5a494390be57559dc",
  "infant:8": "c816aa75cc908bb9c72161f454d9bd24577997c9410488a5a494390be57559dc"
};
let previous, build;

beforeAll(() => {
  previous = window.StemLab;
  window.StemLab = { isRegistered: () => false, registerTool() {}, makeBayViewer(config) {
    build = config.buildScene;
    return { attach() {}, sync() {}, reset() {}, nudge() {}, zoom() {}, status: () => 'failed' };
  } };
  new Function(source)();
});
afterAll(() => { window.StemLab = previous; });
afterEach(() => {
  const geometries = new Set(), materials = new Set();
  scenes.splice(0).forEach(scene => scene.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    for (const material of Array.isArray(o.material) ? o.material : [o.material]) if (material) materials.add(material);
  }));
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
});

function model(age, phase = 0, contrast = false) {
  const scene = new THREE.Scene(); scenes.push(scene);
  const content = build(THREE, { scene, phase, dark: true, contrast, wantShadow: false,
    trim: (color, shininess) => new THREE.MeshPhongMaterial({ color, shininess }),
    sceneProps: { age, tab: phase ? 'recovery' : 'depth' } });
  const sample = (settings = {}) => {
    content.frame(0, { depthLab: { age, motion: 'release', depth: 100, lean: 0, ...settings }, childHands: 'two' }, true);
    scene.updateMatrixWorld(true);
  };
  if (!phase) sample(); else scene.updateMatrixWorld(true);
  return { scene, sample };
}
function part(scene, name) {
  const mesh = scene.getObjectByName(name); expect(mesh, name).toBeTruthy(); return mesh;
}
function point(mesh, index) {
  return new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, index).applyMatrix4(mesh.matrixWorld);
}
function fingerprint(scene) {
  const root = part(scene, 'fr-patient-arms'), hash = createHash('sha256');
  hash.update(JSON.stringify(root.matrixWorld.toArray()));
  root.traverse(o => {
    hash.update(JSON.stringify([o.type, o.name, o.matrix.toArray()]));
    // Only the two wrist geometries are allowed to change; their frames above
    // stay locked, as do sleeves, palms, fingers, forearms and upper arms.
    if (/^fr-patient-(left|right)-wrist$/.test(o.name) || !o.geometry) return;
    const g = o.geometry; hash.update(g.type); hash.update(JSON.stringify([g.drawRange, g.groups]));
    for (const key of Object.keys(g.attributes).sort()) {
      const a = g.attributes[key], b = a.array;
      hash.update(JSON.stringify([key, a.itemSize, a.normalized, b.constructor.name]));
      hash.update(Buffer.from(b.buffer, b.byteOffset, b.byteLength));
    }
    if (g.index) { const b = g.index.array; hash.update(b.constructor.name); hash.update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)); }
  });
  return hash.digest('hex');
}
function rescuerFingerprint(scene) {
  const hash = createHash('sha256'); let count = 0;
  scene.traverse(o => {
    if (!/^fr-rescuer-/.test(o.name)) return;
    hash.update(JSON.stringify([o.type, o.name, o.matrix.toArray()]));
    if (!o.geometry) return;
    count++; const g = o.geometry; hash.update(g.type); hash.update(JSON.stringify([g.drawRange, g.groups]));
    for (const key of Object.keys(g.attributes).sort()) {
      const a = g.attributes[key], b = a.array;
      hash.update(JSON.stringify([key, a.itemSize, a.normalized, b.constructor.name]));
      hash.update(Buffer.from(b.buffer, b.byteOffset, b.byteLength));
    }
    if (g.index) { const b = g.index.array; hash.update(b.constructor.name); hash.update(Buffer.from(b.buffer, b.byteOffset, b.byteLength)); }
  });
  expect(count, 'rescuer anatomy is included in preservation hash').toBeGreaterThan(0);
  return hash.digest('hex');
}
function inside(mesh, sample, scale) {
  const ray = new THREE.Raycaster(sample, new THREE.Vector3(.237, .821, .519).normalize());
  const unique = [];
  for (const hit of ray.intersectObject(mesh, false)) {
    if (!unique.length || hit.distance - unique[unique.length - 1] > .000001 * scale) unique.push(hit.distance);
  }
  return unique.length % 2 === 1;
}
function topology(mesh) {
  const g = mesh.geometry, p = g.parameters, vertices = g.attributes.position, normals = g.attributes.normal;
  const around = p.radialSegments, rows = p.ringCount;
  expect(vertices.count).toBe(rows * around); expect(normals.count).toBe(vertices.count);
  expect(g.index.count).toBe((rows - 1) * around * 6);
  expect(g.groups).toHaveLength(0); expect(g.drawRange.start).toBe(0);
  const edges = new Map();
  for (let i = 0; i < vertices.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(vertices, i), n = new THREE.Vector3().fromBufferAttribute(normals, i);
    expect(v.toArray().every(Number.isFinite), 'finite wrist surface').toBe(true);
    expect(n.toArray().every(Number.isFinite), 'finite wrist normal').toBe(true);
    expect(n.length(), 'unit wrist normal').toBeCloseTo(1, 5);
  }
  for (let i = 0; i < g.index.count; i += 3) {
    const ids = [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)];
    ids.forEach(id => { expect(id).toBeGreaterThanOrEqual(0); expect(id).toBeLessThan(vertices.count); });
    const q = ids.map(id => new THREE.Vector3().fromBufferAttribute(vertices, id));
    const face = q[1].clone().sub(q[0]).cross(q[2].clone().sub(q[0]));
    expect(face.length(), 'nondegenerate skin triangle').toBeGreaterThan(1e-10);
    const normal = ids.reduce((sum, id) => sum.add(new THREE.Vector3().fromBufferAttribute(normals, id)), new THREE.Vector3());
    expect(face.normalize().dot(normal.normalize()), 'normals follow drawn skin').toBeGreaterThan(0);
    for (let j = 0; j < 3; j++) {
      const a = ids[j], b = ids[(j + 1) % 3], key = Math.min(a, b) + ':' + Math.max(a, b);
      const edge = edges.get(key) || { count: 0, winding: 0, a, b };
      edge.count++; edge.winding += a < b ? 1 : -1; edges.set(key, edge);
    }
  }
  const boundary = [...edges.values()].filter(edge => edge.count === 1);
  expect(boundary).toHaveLength(2 * around);
  for (const edge of edges.values()) {
    expect(edge.count === 1 || edge.count === 2, 'manifold skin edges').toBe(true);
    if (edge.count === 2) expect(edge.winding, 'consistent triangle winding').toBe(0);
    else {
      const rowA = Math.floor(edge.a / around), rowB = Math.floor(edge.b / around);
      expect(rowA).toBe(rowB);
      expect(rowA === p.rootRing || rowA === p.palmRing, 'only buried end rings are open').toBe(true);
    }
  }
}
function checkWrist(scene, side) {
  const prefix = 'fr-patient-' + side, wrist = part(scene, prefix + '-wrist');
  const forearm = part(scene, prefix + '-forearm'), palm = part(scene, prefix + '-palm'), hand = part(scene, prefix + '-hand');
  expect(wrist.parent).toBe(hand); expect(wrist.children).toHaveLength(0);
  expect(wrist.position.toArray()).toEqual([0, 0, .015]); expect(wrist.scale.toArray()).toEqual([.048, .04, .055]);
  expect(wrist.quaternion.toArray()).toEqual([0, 0, 0, 1]);
  expect(wrist.material).toBe(forearm.material); expect(wrist.material).toBe(palm.material);
  expect(wrist.material.transparent).toBe(false); expect(wrist.material.depthWrite).toBe(true);
  topology(wrist);
  const length = forearm.geometry.parameters.height;
  const start = new THREE.Vector3(0, -length / 2, 0).applyMatrix4(forearm.matrixWorld);
  const centre = new THREE.Vector3(0, length / 2, 0).applyMatrix4(forearm.matrixWorld);
  const scale = centre.distanceTo(start) / length, p = wrist.geometry.parameters, n = p.radialSegments;
  const capSegments = forearm.geometry.parameters.radialSegments;
  const rim = Array.from({ length: capSegments }, (_, i) => point(forearm, i));
  // Probe the real distal disk's rim, edge midpoints, triangle interiors and
  // inner radial points. This tests the drawn triangles after wrist relief.
  const samples = [];
  for (let i = 0; i < capSegments; i++) {
    const a = rim[i], b = rim[(i + 1) % capSegments];
    samples.push(a, a.clone().lerp(b, .5), a.clone().add(b).add(centre).multiplyScalar(1 / 3));
    for (const fraction of [.25, .5, .75]) samples.push(centre.clone().lerp(a, fraction));
  }
  const originalSide = wrist.material.side;
  try {
    wrist.material.side = THREE.DoubleSide;
    for (const sample of samples) {
      const direction = sample.clone().sub(centre).normalize(), offset = .4 * scale;
      const ray = new THREE.Raycaster(centre.clone().addScaledVector(direction, offset), direction.clone().negate());
      const hit = ray.intersectObjects([wrist, palm], false)[0];
      expect(hit, 'skin covers the actual forearm end disk').toBeTruthy();
      expect((offset - hit.distance - sample.distanceTo(centre)) / scale, 'cap lies inside the connecting skin').toBeGreaterThanOrEqual(-.00002);
    }
    for (let i = 0; i < n; i++) {
      expect(inside(forearm, point(wrist, p.rootRing * n + i), scale), 'open root is buried in forearm').toBe(true);
      expect(inside(palm, point(wrist, p.palmRing * n + i), scale), 'open end is buried in palm').toBe(true);
    }
  } finally { wrist.material.side = originalSide; }
  return wrist;
}

describe('First Response patient wrist skin connection', () => {
  for (const age of ages) for (let phase = 0; phase <= 8; phase++) {
    it(age + ' covers the forearm end and preserves the existing anatomy in pose ' + phase, () => {
      const m = model(age, phase);
      for (const side of ['left', 'right']) checkWrist(m.scene, side);
      expect(fingerprint(m.scene)).toBe(originalPatientArms[age + ':' + phase]);
      const rescuer = model(age);
      rescuer.sample({ motion: 'inspect', phase: phase * 12.5 });
      expect(rescuerFingerprint(rescuer.scene)).toBe(originalRescuerGeometry[age + ':' + phase]);
    });
  }
  for (const age of ages) for (const contrast of [false, true]) {
    it(age + ' reuses wrist meshes and buffers during ' + (contrast ? 'contrast' : 'normal') + ' compression', () => {
      const m = model(age, 0, contrast);
      const wrists = ['left', 'right'].map(side => checkWrist(m.scene, side));
      const resources = wrists.map(wrist => [wrist, wrist.geometry, wrist.material, wrist.geometry.attributes.position, wrist.geometry.attributes.normal, wrist.geometry.index]);
      for (const settings of [{ motion: 'press', lean: 2 }, { motion: 'release', lean: 2 }, { motion: 'inspect', phase: 25, lean: 0 }, { motion: 'release', lean: 0 }]) {
        m.sample(settings);
        ['left', 'right'].forEach((side, i) => {
          const wrist = part(m.scene, 'fr-patient-' + side + '-wrist');
          expect([wrist, wrist.geometry, wrist.material, wrist.geometry.attributes.position, wrist.geometry.attributes.normal, wrist.geometry.index]).toEqual(resources[i]);
        });
        expect(fingerprint(m.scene)).toBe(originalPatientArms[age + ':0']);
      }
    });
  }
});
