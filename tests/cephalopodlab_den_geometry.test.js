import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
// Candidate validation reads the guarded output; ordinary runs exercise production.
const source = readFileSync(process.env.CLH_DEN_TEST_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8');
function region(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'Expected live den region: ' + start);
  return source.slice(a, b);
}
const geometrySource = region('function createCLHuntDenRockGeometry(', '// ─── Dens (4 rock arches');
const shaderSource = region('function shadeCLHuntRockSurface(', 'function shadeCLHuntCoralSurface(');
const fallbackSource = region('function reefSurface(shader){', '// ─── Reef rocks');
const block = region('var DEN_RADIUS = 2.0;', '// ─── Clams');
const noRandom = Object.create(Math);
noRandom.random = () => { throw new Error('Den shaping must not consume seeded dive randomness'); };
const { rock, shadow } = new Function('Math', geometrySource + ';return{rock:createCLHuntDenRockGeometry,shadow:createCLHuntDenShadowGeometry};')(noRandom);
const poses = [
  { position: [-.9, .7, 0], scale: [.7, 1.05, .8] },
  { position: [.9, .7, 0], scale: [.8, 1.02, .8] },
  { position: [0, 1.6, 0], scale: [1.5, .36, .66] },
];
const locations = [[-28, 5], [32, -18], [8, -35], [-20, -28]];
function construct(derivatives = true, webgl2 = false) {
  let seed = 2741;
  const draws = [], extensionCalls = [], math = Object.create(Math);
  math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;const value = seed / 4294967296;draws.push(value);return value; };
  const renderer = { capabilities: { isWebGL2: webgl2 }, extensions: { has(name) { extensionCalls.push(name);return derivatives; } } };
  const result = new Function('THREE', 'Math', 'renderer', shaderSource + fallbackSource + geometrySource + ';var scene=new THREE.Scene();' + block + ';return{scene,dens,radius:DEN_RADIUS};')(THREE, math, renderer);
  return { ...result, draws, extensionCalls };
}
function dispose(fixture) {
  const materials = new Set();
  fixture.scene.traverse(object => { if (object.geometry) object.geometry.dispose();if (object.material) materials.add(object.material); });
  materials.forEach(material => material.dispose());
}
function finiteGeometry(geometry) {
  const p = geometry.attributes.position, n = geometry.attributes.normal, point = new THREE.Vector3();
  for (const attr of Object.values(geometry.attributes)) for (const value of attr.array) assert.ok(Number.isFinite(value));
  for (let i = 0; i < p.count; i++) {
    point.fromBufferAttribute(p, i);
    assert.ok(geometry.boundingBox.containsPoint(point));
    assert.ok(point.distanceTo(geometry.boundingSphere.center) <= geometry.boundingSphere.radius + 1e-6);
    assert.ok(Math.abs(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)) - 1) < 2e-6);
  }
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < geometry.index.count; i += 3) {
    const ids = [geometry.index.getX(i), geometry.index.getX(i + 1), geometry.index.getX(i + 2)];
    assert.ok(ids.every(index => Number.isInteger(index) && index >= 0 && index < p.count));
    a.fromBufferAttribute(p, ids[0]);b.fromBufferAttribute(p, ids[1]);c.fromBufferAttribute(p, ids[2]);
    assert.ok(b.sub(a).cross(c.sub(a)).length() > 1e-8, 'Every referenced triangle has finite nonzero area');
  }
}
function bufferBytes(geometry) {
  return Object.values(geometry.attributes).reduce((sum, attr) => sum + attr.array.byteLength, geometry.index.array.byteLength);
}

describe('Cephalopod Hunter natural den stones', () => {
  it('builds twelve deterministic angular stones inside the original boxes with exact support heights and bounded finite topology', () => {
    const fingerprints = new Set();
    for (let den = 0; den < 4; den++) for (let part = 0; part < 3; part++) {
      const radius = part === 2 ? 1 : .7, width = part === 2 ? 24 : 20, height = part === 2 ? 16 : 14;
      const old = new THREE.SphereGeometry(radius, width, height), next = rock(THREE, radius, width, height, den * 3 + part), duplicate = rock(THREE, radius, width, height, den * 3 + part);
      try {
        finiteGeometry(next);
        assert.deepEqual(Object.keys(next.attributes).sort(), ['normal', 'position', 'uv']);
        assert.equal(next.attributes.position.count, part === 2 ? 144 : 176);
        assert.equal(next.index.count / 3, part === 2 ? 64 : 80);
        old.computeBoundingBox();
        assert.equal(next.boundingBox.min.y, old.boundingBox.min.y);assert.equal(next.boundingBox.max.y, old.boundingBox.max.y);
        assert.ok(next.boundingBox.min.x >= old.boundingBox.min.x - 1e-6 && next.boundingBox.max.x <= old.boundingBox.max.x + 1e-6);
        assert.ok(next.boundingBox.min.z >= old.boundingBox.min.z - 1e-6 && next.boundingBox.max.z <= old.boundingBox.max.z + 1e-6);
        for (const value of next.attributes.uv.array) assert.ok(value >= 0 && value <= 1);
        for (const [name, attr] of Object.entries(next.attributes)) assert.deepEqual(attr.array, duplicate.attributes[name].array);
        assert.deepEqual(next.index.array, duplicate.index.array);
        const p = next.attributes.position;
        // Each broad side is an independently shaded four-vertex panel. Adjacent
        // panels must meet exactly, even though their normals may form a crease.
        const bands = part === 2 ? 3 : 4;
        for (let band = 0; band < bands; band++) for (let side = 0; side < 8; side++) {
          const first = (band * 8 + side) * 4, following = (band * 8 + (side + 1) % 8) * 4;
          const point = index => new THREE.Vector3().fromBufferAttribute(p, index).toArray();
          assert.deepEqual(point(first + 3), point(following));assert.deepEqual(point(first + 2), point(following + 1));
          if (band < bands - 1) { assert.deepEqual(point(first + 1), point(first + 32));assert.deepEqual(point(first + 2), point(first + 35)); }
        }
        if (part < 2) {
          const sole = new Set();
          for (let vertex = 0; vertex < p.count; vertex++) if (p.getY(vertex) === -Math.fround(radius)) sole.add([p.getX(vertex), p.getZ(vertex)].join(','));
          assert.ok(sole.size >= 8, 'Pillars have a broad grounded sole rather than a single egg-shaped contact point');
        }
        fingerprints.add(Array.from(p.array).join(','));
      } finally { old.dispose();next.dispose();duplicate.dispose(); }
    }
    assert.equal(fingerprints.size, 12);
  });

  it('retains the doorway and footing while keeping the actual lintel triangles in contact with both pillars', () => {
    const fixture = construct();
    try {
      for (const den of fixture.dens) {
        for (let part = 0; part < 3; part++) {
          const mesh = den.group.children[part], old = new THREE.SphereGeometry(part === 2 ? 1 : .7, part === 2 ? 24 : 20, part === 2 ? 16 : 14);
          try {
            assert.deepEqual(mesh.position.toArray(), poses[part].position);assert.deepEqual(mesh.scale.toArray(), poses[part].scale);
            old.computeBoundingBox();
            assert.equal(mesh.geometry.boundingBox.min.y, old.boundingBox.min.y);assert.equal(mesh.geometry.boundingBox.max.y, old.boundingBox.max.y);
            assert.ok(mesh.geometry.boundingBox.min.x >= old.boundingBox.min.x - 1e-6);assert.ok(mesh.geometry.boundingBox.max.x <= old.boundingBox.max.x + 1e-6);
            assert.ok(mesh.geometry.boundingBox.min.z >= old.boundingBox.min.z - 1e-6);assert.ok(mesh.geometry.boundingBox.max.z <= old.boundingBox.max.z + 1e-6);
          } finally { old.dispose(); }
        }
        const roof = den.group.children[2], localRoof = new THREE.Mesh(roof.geometry, roof.material);
        localRoof.position.copy(roof.position);localRoof.scale.copy(roof.scale);localRoof.updateMatrixWorld(true);
        for (const pillar of den.group.children.slice(0, 2)) {
          const ray = new THREE.Raycaster(new THREE.Vector3(pillar.position.x, -2, pillar.position.z), new THREE.Vector3(0, 1, 0));
          const hit = ray.intersectObject(localRoof, false)[0];assert.ok(hit, 'The visible roof spans each pillar center');
          const localPillar = new THREE.Mesh(pillar.geometry, pillar.material);localPillar.position.copy(pillar.position);localPillar.scale.copy(pillar.scale);localPillar.updateMatrixWorld(true);
          const top = new THREE.Raycaster(new THREE.Vector3(pillar.position.x, 3, pillar.position.z), new THREE.Vector3(0, -1, 0)).intersectObject(localPillar, false)[0];
          assert.ok(top);assert.ok(top.point.y - hit.point.y > .005, 'The actual canopy and pillar triangles overlap at the support');
        }
      }
      const geometry = shadow(THREE);
      try {
        finiteGeometry(geometry);assert.equal(geometry.attributes.position.count, 19);assert.equal(geometry.index.count / 3, 30);
        const p = geometry.attributes.position, colors = geometry.attributes.color;
        assert.equal(colors.itemSize, 3);assert.equal(colors.count, p.count);
        assert.equal(geometry.boundingBox.min.y, -.75);assert.ok(geometry.boundingBox.max.y <= .59 + 1e-6);
        assert.equal(geometry.boundingBox.min.z, Math.fround(-.41));assert.equal(geometry.boundingBox.max.z, Math.fround(.16));
        for (let i = 0; i < p.count; i++) assert.ok(Math.abs(p.getX(i)) <= 1);
        for (const value of colors.array) assert.ok(value >= .002 - 1e-8 && value <= .038 + 1e-8);
        for (let side = 0; side < 6; side++) {
          assert.equal(p.getX(side), p.getX(side + 12));assert.equal(p.getY(side), p.getY(side + 12));
          assert.equal(p.getZ(side), Math.fround(.16));assert.equal(p.getZ(side + 6), 0);assert.equal(p.getZ(side + 12), Math.fround(-.41));
          assert.ok(Math.abs(p.getX(side + 6)) < Math.abs(p.getX(side)));
          for (const axis of ['getX', 'getY', 'getZ']) { assert.equal(colors[axis](side), colors[axis](side + 12));assert.ok(colors[axis](side) > colors[axis](side + 6) * 4); }
        }
        // The back and both sets of reveals form one connected mesh, not three
        // unrelated sheets which can separate at an oblique camera angle.
        const adjacency = Array.from({ length: p.count }, () => new Set());
        for (let i = 0; i < geometry.index.count; i += 3) { const ids = [0, 1, 2].map(offset => geometry.index.getX(i + offset));for (const a of ids) for (const b of ids) adjacency[a].add(b); }
        const visited = new Set([0]), queue = [0];while (queue.length) for (const next of adjacency[queue.shift()]) if (!visited.has(next)) { visited.add(next);queue.push(next); }
        assert.equal(visited.size, p.count);
      } finally { geometry.dispose(); }
    } finally { dispose(fixture); }
  });

  it('keeps the four seeded den anchors, five-child order and exact reusable shelter ring within the fixed resource budget', () => {
    const fixture = construct(), oldShadow = new THREE.PlaneGeometry(2, 1.5), expectedRing = new THREE.RingGeometry(1.7, 2, 24);
    try {
      assert.equal(fixture.radius, 2);assert.equal(fixture.dens.length, 4);assert.equal(fixture.draws.length, 4);
      let seed = 2741, vertices = 0, triangles = 0, bytes = 0;
      const materials = new Set();
      fixture.dens.forEach((den, i) => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        assert.equal(fixture.draws[i], seed / 4294967296);
        assert.deepEqual([den.x, den.z], locations[i]);assert.deepEqual(den.group.position.toArray(), [locations[i][0], 0, locations[i][1]]);
        assert.equal(den.group.rotation.y, fixture.draws[i] * Math.PI);assert.equal(den.group.children.length, 5);assert.equal(den.group.name, 'cl-den');
        assert.deepEqual(den.group.userData, {});assert.equal(den.glow, den.group.children[4]);
        den.group.children.forEach((mesh, part) => {
          assert.deepEqual(mesh.userData, {});assert.equal(mesh.castShadow, false);assert.equal(mesh.receiveShadow, false);assert.equal(mesh.frustumCulled, true);
          assert.ok(!mesh.material.map && !mesh.material.normalMap && !mesh.material.roughnessMap);
          vertices += mesh.geometry.attributes.position.count;triangles += mesh.geometry.index.count / 3;bytes += bufferBytes(mesh.geometry);materials.add(mesh.material);
          if (part < 3) { assert.equal(mesh.name, 'cl-den-rock');assert.equal(mesh.material, den.group.children[0].material); }
        });
        if (i) assert.notEqual(den.group.children[0].material, fixture.dens[i - 1].group.children[0].material);
        const cavity = den.group.children[3], ring = den.glow;
        assert.deepEqual(cavity.position.toArray(), [0, .75, .01]);assert.equal(cavity.material.opacity, 1);assert.equal(cavity.material.transparent, false);assert.equal(cavity.material.vertexColors, true);assert.equal(cavity.material.color.getHex(), 0xffffff);assert.equal(cavity.material.side, THREE.DoubleSide);
        assert.deepEqual(ring.position.toArray(), [0, .06, 0]);assert.equal(ring.rotation.x, -Math.PI / 2);
        assert.equal(ring.material.color.getHex(), 0x22c55e);assert.equal(ring.material.transparent, true);assert.equal(ring.material.opacity, 0);assert.equal(ring.material.side, THREE.DoubleSide);
        assert.deepEqual(ring.geometry.index.array, expectedRing.index.array);
        for (const [name, attr] of Object.entries(expectedRing.attributes)) assert.deepEqual(ring.geometry.attributes[name].array, attr.array);
      });
      assert.equal(materials.size, 12);assert.equal(vertices, 2260);assert.equal(triangles, 1208);assert.equal(bytes, 80480);
      const pillar = new THREE.SphereGeometry(.7, 20, 14), lintel = new THREE.SphereGeometry(1, 24, 16);
      try { const baselineBytes = 4 * (2 * bufferBytes(pillar) + bufferBytes(lintel) + bufferBytes(oldShadow) + bufferBytes(expectedRing));assert.equal(bytes - baselineBytes, -104912); }
      finally { pillar.dispose();lintel.dispose(); }
    } finally { oldShadow.dispose();expectedRing.dispose();dispose(fixture); }
  });

  it('reuses the accepted rock finish on supported renderers and the existing fallback without mutating any buffers', () => {
    for (const [derivatives, webgl2] of [[true, false], [false, true], [false, false]]) {
      const fixture = construct(derivatives, webgl2);
      try {
        assert.equal(fixture.extensionCalls.length, webgl2 ? 0 : 4);assert.ok(fixture.extensionCalls.every(name => name === 'OES_standard_derivatives'));
        fixture.dens.forEach((den, i) => {
          const material = den.group.children[0].material, geometry = den.group.children[0].geometry;
          const snapshots = Object.fromEntries(Object.entries(geometry.attributes).map(([name, attr]) => [name, attr.array.slice()]));
          const palette = new THREE.Color([0x55483a, 0x3f4d3d, 0x5c4f3f, 0x46524a][i]).convertSRGBToLinear();
          assert.deepEqual(material.color.toArray(), palette.toArray());assert.equal(material.roughness, .9);assert.equal(material.name, 'cl-den-rock-material');
          const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} };
          material.onBeforeCompile(shader);
          if (derivatives || webgl2) {
            assert.equal(material.customProgramCacheKey(), 'cl-rock-surface-v1');assert.equal(material.extensions.derivatives, true);
            assert.ok(shader.vertexShader.includes('clRockPosition'));assert.ok(shader.fragmentShader.includes('clRockCoarseField'));
          } else { assert.equal(material.onBeforeCompile.name, 'reefSurface');assert.ok(shader.vertexShader.includes('clReefPos')); }
          assert.deepEqual(shader.uniforms, {});
          for (const [name, snapshot] of Object.entries(snapshots)) assert.deepEqual(geometry.attributes[name].array, snapshot);
        });
      } finally { dispose(fixture); }
    }
  });
});
