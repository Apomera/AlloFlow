import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8');
function region(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b <= a) throw new Error('Could not locate live plant region: ' + start);
  return source.slice(a, b);
}
const helperSource = region('function shadeCLHuntPlantFlex(', 'function createCLHuntMarineSnowGeometry(');
const noRandom = Object.create(Math);
noRandom.random = () => { throw new Error('Plant geometry must not consume the gameplay random stream'); };
const createPlant = new Function('Math', helperSource + ';return createCLHuntPlantGeometry;')(noRandom);

function dispose(fixture) { fixture.scene.traverse(object => { object.geometry?.dispose();object.material?.dispose(); }); }
function construct() {
  const grass = region('        var grass = [];', '        // Terrain-conforming caustics:');
  const kelp = region('        var kelpStrands = [];', '        // ─── Hydrothermal vent');
  const math = Object.create(Math), draws = [];let seed = 2741;
  math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;const value = seed / 4294967296;draws.push(value);return value; };
  const result = new Function('THREE', 'Math', helperSource + ';var scene=new THREE.Scene();' + grass + kelp + ';return {scene,grass,kelp:kelpStrands};')(THREE, math);
  return { ...result, draws };
}
function basalCenter(geometry) {
  const positions = geometry.attributes.position, center = new THREE.Vector3();
  for (let i = 0; i < 3; i++) center.add(new THREE.Vector3().fromBufferAttribute(positions, i));
  return center.multiplyScalar(1 / 3);
}

// Execute the production sway blocks under the live loop's actual pause guard.
const loop = source.indexOf('function loop() {');
const guardAt = source.indexOf('if (!gameState.gameOver && !gameState.paused) {', loop);
if (guardAt < 0) throw new Error('Could not locate the production pause guard');
const guard = source.slice(guardAt, source.indexOf('\n', guardAt));
const kelpSway = region('            kelpStrands.forEach(function(k) {', '            // Vent plume rises');
const grassSway = region('            grass.forEach(function(g) {', '            // ─── Floor + caustics follow');
const sway = new Function('kelpStrands', 'grass', 'gameState', 'now', helperSource + ';' + guard + '\n' + kelpSway + grassSway + '\n}');

describe('Cephalopod Hunter plant geometry', () => {
  it('builds finite folded ribbons with valid triangles, normals and final bounds across plant variants', () => {
    for (const kind of ['grass', 'kelp']) for (let variant = 0; variant < 18; variant++) {
      const height = kind === 'grass' ? .6 + variant / 17 * 1.3 : 5 + variant / 17 * 4;
      const geometry = createPlant(THREE, kind, height, variant);
      try {
        const positions = geometry.attributes.position, normals = geometry.attributes.normal, colors = geometry.attributes.color, index = geometry.index;
        expect(positions.count).toBe(kind === 'grass' ? 33 : 57);
        expect(index.count / 3).toBe(kind === 'grass' ? 40 : 72);
        expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
        expect(Array.from(colors.array).every(value => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
        expect(geometry.boundingBox.min.y).toBe(0);
        expect(geometry.boundingBox.max.y).toBeCloseTo(height, 5);
        expect(Number.isFinite(geometry.boundingSphere.radius)).toBe(true);
        for (let i = 0; i < normals.count; i++) expect(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i))).toBeCloseTo(1, 5);
        const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
        for (let i = 0; i < index.count; i += 3) {
          a.fromBufferAttribute(positions, index.getX(i));b.fromBufferAttribute(positions, index.getX(i + 1));c.fromBufferAttribute(positions, index.getX(i + 2));
          expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(1e-8);
        }
        const top = positions.count - 3, middle = Math.floor(geometry.userData.clPlantSections / 2) * 3;
        const widthAt = row => new THREE.Vector3().fromBufferAttribute(positions, row).distanceTo(new THREE.Vector3().fromBufferAttribute(positions, row + 2));
        expect(widthAt(top)).toBeLessThan(widthAt(middle) * .12);
        const edgeMidpoint = new THREE.Vector3().fromBufferAttribute(positions, middle).add(new THREE.Vector3().fromBufferAttribute(positions, middle + 2)).multiplyScalar(.5);
        expect(new THREE.Vector3().fromBufferAttribute(positions, middle + 1).distanceTo(edgeMidpoint)).toBeGreaterThan(.005);
      } finally { geometry.dispose(); }
    }
  });

  it('uses deterministic variation without random draws or shared mutable geometry', () => {
    const a = createPlant(THREE, 'grass', 1.2, 2), b = createPlant(THREE, 'grass', 1.2, 2), c = createPlant(THREE, 'grass', 1.2, 3);
    try {
      expect(Array.from(a.attributes.position.array)).toEqual(Array.from(b.attributes.position.array));
      expect(a.attributes.position.array.buffer).not.toBe(b.attributes.position.array.buffer);
      expect(Array.from(a.attributes.position.array)).not.toEqual(Array.from(c.attributes.position.array));
      expect(Array.from(a.attributes.color.array)).not.toEqual(Array.from(c.attributes.color.array));
    } finally { a.dispose();b.dispose();c.dispose(); }
  });

  it('preserves all 525 seeded placement, height, yaw and phase draws plus counts and camouflage data', () => {
    const fixture = construct();
    try {
      expect(fixture.draws).toHaveLength(525);
      expect(fixture.grass).toHaveLength(80);expect(fixture.kelp).toHaveLength(25);
      let at = 0;
      for (const [kind, plants] of [['grass', fixture.grass], ['kelp', fixture.kelp]]) for (const plant of plants) {
        const mesh = plant.mesh, span = kind === 'grass' ? 120 : 100;
        const expectedX = (fixture.draws[at++] - .5) * span, expectedZ = (fixture.draws[at++] - .5) * span;
        const height = kind === 'grass' ? .6 + fixture.draws[at++] * 1.3 : 5 + fixture.draws[at++] * 4;
        expect(mesh.position.x).toBe(expectedX);expect(mesh.position.z).toBe(expectedZ);
        expect(mesh.geometry.userData.clPlantHeight).toBe(height);
        expect(mesh.rotation.y).toBe(fixture.draws[at++] * Math.PI);expect(plant.phase).toBe(fixture.draws[at++] * Math.PI * 2);
        expect(mesh.position.y).toBe(kind === 'grass' ? .05 : 0);
        expect(mesh.userData.substrate).toBe('grass');expect(mesh.userData.substrateRadius).toBe(kind === 'grass' ? .6 : 1.4);
        expect(mesh.castShadow).toBe(false);
        if (kind === 'grass') { expect(mesh.count).toBe(7);expect(mesh.frustumCulled).toBe(false); }
        else { expect(mesh.material.isMeshStandardMaterial).toBe(true);expect(mesh.material.depthWrite).toBe(false); }
      }
      expect(at).toBe(525);
    } finally { dispose(fixture); }
  });

  it('keeps grass instance base and top heights while preserving their radial layout, yaw and scale', () => {
    const fixture = construct(), matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
    try {
      for (const { mesh } of fixture.grass) {
        const height = mesh.geometry.userData.clPlantHeight;
        mesh.updateMatrixWorld(true);
        for (let blade = 0; blade < 7; blade++) {
          mesh.getMatrixAt(blade, matrix);matrix.decompose(position, rotation, scale);
          const size = .62 + (blade % 4) * .12, angle = blade * 2.4;
          expect(position.x).toBeCloseTo(Math.cos(angle) * .24, 7);expect(position.z).toBeCloseTo(Math.sin(angle) * .24, 7);expect(position.y).toBe(0);
          expect(scale.x).toBeCloseTo(size, 7);expect(scale.y).toBeCloseTo(size, 7);expect(scale.z).toBeCloseTo(size, 7);
          expect(basalCenter(mesh.geometry).applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld).y).toBeCloseTo(.05, 6);
          expect(new THREE.Vector3(0, height, 0).applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld).y).toBeCloseTo(.05 + height * size, 6);
        }
      }
    } finally { dispose(fixture); }
  });

  it('pivots kelp around its fixed root and bounds grass-root movement by cluster radius rather than height', () => {
    const fixture = construct(), instance = new THREE.Matrix4();
    try {
      for (const angle of [-.12, 0, .12]) {
        for (const { mesh } of fixture.kelp) {
          mesh.position.y = -7.5;mesh.rotation.z = angle;mesh.updateMatrixWorld(true);
          const root = basalCenter(mesh.geometry).applyMatrix4(mesh.matrixWorld);
          expect(root.x).toBeCloseTo(mesh.position.x, 8);expect(root.y).toBeCloseTo(-7.5, 8);expect(root.z).toBeCloseTo(mesh.position.z, 8);
        }
        for (const { mesh } of fixture.grass) {
          mesh.position.y = -7.45;mesh.rotation.z = angle;mesh.updateMatrixWorld(true);
          for (let blade = 0; blade < 7; blade++) {
            mesh.getMatrixAt(blade, instance);
            const root = basalCenter(mesh.geometry).applyMatrix4(instance).applyMatrix4(mesh.matrixWorld);
            expect(Math.abs(root.y + 7.45)).toBeLessThanOrEqual(.24 * Math.sin(.12) + 1e-7);
          }
        }
      }
    } finally { dispose(fixture); }
  });

  it('retains primary sway frequency, freezes flex under pause, and makes both kinds static under reduced motion', () => {
    const fixture = construct(), state = { paused: false, gameOver: false, a11y: { reducedMotion: false } };
    try {
      const all = [...fixture.grass, ...fixture.kelp], arrays = all.map(plant => plant.mesh.geometry.attributes.position.array), snapshots = arrays.map(array => Array.from(array));
      sway(fixture.kelp, fixture.grass, state, 1200);
      fixture.grass.forEach(plant => expect(plant.flex.value.x).toBe((1200 * .001 + plant.phase) % (Math.PI * 2)));
      fixture.kelp.forEach(plant => expect(plant.flex.value.x).toBe((1200 * .0008 + plant.phase) % (Math.PI * 2)));
      expect(all.every(plant => plant.mesh.rotation.z === 0 && plant.flex.value.w === 1)).toBe(true);
      const poses = all.map(plant => plant.flex.value.toArray());state.paused = true;
      sway(fixture.kelp, fixture.grass, state, 5500);
      expect(all.map(plant => plant.flex.value.toArray())).toEqual(poses);
      state.paused = false;state.a11y.reducedMotion = true;
      for (const now of [5600, 8000, 15000]) { sway(fixture.kelp, fixture.grass, state, now);expect(all.every(plant => plant.mesh.rotation.z === 0 && plant.flex.value.w === 0)).toBe(true);expect(all.map(plant => plant.flex.value.toArray())).toEqual(poses.map(pose => [...pose.slice(0, 3), 0])); }
      state.a11y.reducedMotion = false;sway(fixture.kelp, fixture.grass, state, 16000);
      fixture.grass.forEach(plant => expect(plant.flex.value.x).toBe((16000 * .001 + plant.phase) % (Math.PI * 2)));
      fixture.kelp.forEach(plant => expect(plant.flex.value.x).toBe((16000 * .0008 + plant.phase) % (Math.PI * 2)));
      expect(all.every(plant => plant.flex.value.w === 1)).toBe(true);
      all.forEach((plant, i) => { expect(plant.mesh.geometry.attributes.position.array).toBe(arrays[i]);expect(Array.from(arrays[i])).toEqual(snapshots[i]); });
    } finally { dispose(fixture); }
  });
});
