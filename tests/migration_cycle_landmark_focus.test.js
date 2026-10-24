import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const sourcePath = process.env.MIGRATION_CHECKPOINT_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing cycle focus source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const createFlyer = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn createMigrationFlyer;')(num);
const createPath = new Function(section('      function createMigrationWingtipPath(', '      function initMigrationFlightScene(') + '\nreturn createMigrationWingtipPath;')();
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const tau = Math.PI * 2;
function fixture(id = 'canada_goose') {
  const scene = new THREE.Scene(), flock = new THREE.Group();
  flock.position.set(0.4, 1.2, 0.1); flock.rotation.y = 0.04; scene.add(flock);
  const bird = createFlyer(THREE, { id }, 2); flock.add(bird);
  bird.position.set(0, 0.5, -5); bird.userData.baseY = 0.5;
  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 900);
  camera.position.set(5, 4, 3); camera.lookAt(bird.position); camera.updateMatrixWorld(true);
  const root = createPath(THREE); scene.add(root); scene.updateMatrixWorld(true);
  return {
    scene, flock, bird, camera, root,
    update(checkpoint = null, phase = 0, { enabled = true, mode = 'study', dark = false, height = 390, selected = bird, speciesId = id } = {}) {
      if (selected && Number.isFinite(phase)) selected.userData.applyWingPhase(phase);
      scene.updateMatrixWorld(true);
      root.updatePath(enabled, mode, selected, speciesId, 2, camera, dark, height, phase, checkpoint);
      scene.updateMatrixWorld(true);
    },
    marks(side) { return root.getObjectByName(side ? 'migration-wingtip-right-landmarks' : 'migration-wingtip-left-landmarks'); },
    dot(side) { return root.getObjectByName(side ? 'migration-wingtip-right-point' : 'migration-wingtip-left-point'); },
    cycle() { return root.getObjectByName('migration-wingtip-cycle'); }
  };
}
function projectedPixelRadius(f, node, instanceMatrix, height) {
  const worldMatrix = node.matrixWorld.clone();
  if (instanceMatrix) worldMatrix.multiply(instanceMatrix);
  const center = new THREE.Vector3().applyMatrix4(worldMatrix).project(f.camera);
  const edge = new THREE.Vector3(1, 0, 0).applyMatrix4(worldMatrix).project(f.camera);
  return Math.hypot((edge.x - center.x) * height * f.camera.aspect / 2, (edge.y - center.y) * height / 2);
}
function ring(f, side, index, height = 390) {
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
  f.marks(side).getMatrixAt(index, matrix); matrix.decompose(position, quaternion, scale);
  const world = position.clone().applyMatrix4(f.bird.matrixWorld);
  const pixelRadius = projectedPixelRadius(f, f.marks(side), matrix, height);
  return { position, world, matrix, quaternion, scale, pixelRadius };
}
function actualTip(f, side) {
  let mesh = f.bird.userData.primaries[side];
  if (!mesh) f.bird.userData.wings[side].traverse(part => { if (part.name === 'migration-monarch-forewing') mesh = part; });
  const vertices = mesh.geometry.attributes.position;
  const count = mesh.geometry.userData.monarchBoundaryVertexCount || vertices.count;
  let chosen = 0;
  for (let i = 1; i < count; i++) if (vertices.getX(i) > vertices.getX(chosen) || (vertices.getX(i) === vertices.getX(chosen) && vertices.getZ(i) > vertices.getZ(chosen))) chosen = i;
  return new THREE.Vector3().fromBufferAttribute(vertices, chosen).applyMatrix4(mesh.matrixWorld).applyMatrix4(f.bird.matrixWorld.clone().invert());
}
function pool(root) {
  const resources = new Set(); root.traverse(node => { if (node.geometry) resources.add(node.geometry); if (node.material) resources.add(node.material); }); return resources;
}
function expectOrdinary(f) {
  for (let side = 0; side < 2; side++) {
    expect(f.marks(side).userData.activeCheckpoint).toBeNull();
    for (let mark = 0; mark < 8; mark++) expect(ring(f, side, mark).pixelRadius).toBeCloseTo(3.2, 5);
  }
}

describe('Study checkpoint selection uses existing pooled path landmarks', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7])('surrounds both actual live tips at checkpoint %i with one 8px halo per side', checkpoint => {
    for (const id of ['canada_goose', 'monarch']) {
      const f = fixture(id); f.update(checkpoint, checkpoint * tau / 8);
      for (let side = 0; side < 2; side++) {
        expect(f.marks(side).userData.activeCheckpoint).toBe(checkpoint);
        const selected = ring(f, side, checkpoint);
        expect(selected.pixelRadius).toBeCloseTo(8, 5);
        expect(selected.position.distanceTo(actualTip(f, side))).toBeLessThan(0.000001);
        expect(selected.position.distanceTo(f.dot(side).position)).toBeLessThan(0.000001);
        for (let mark = 0; mark < 8; mark++) if (mark !== checkpoint) expect(ring(f, side, mark).pixelRadius).toBeCloseTo(3.2, 5);
      }
    }
  });

  it.each(['snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit'])('uses actual %s outer geometry for the selected halo', id => {
    const f = fixture(id); f.update(3, 3 * tau / 8);
    for (let side = 0; side < 2; side++) {
      expect(ring(f, side, 3).position.distanceTo(actualTip(f, side))).toBeLessThan(0.000001);
      expect(ring(f, side, 3).pixelRadius).toBeCloseTo(8, 5);
    }
  });

  it('rejects malformed checkpoint arguments and clears the previous halo when the phase is stale', () => {
    const f = fixture();
    for (const invalid of [null, undefined, -1, 8, 1.5, '2', NaN, Infinity, {}, true]) {
      f.update(2, tau / 4); f.update(invalid, tau / 4); expectOrdinary(f);
    }
    for (const stalePhase of [0, tau / 4 + 0.000002, tau / 4 - 0.000002, NaN, Infinity, undefined, null]) {
      f.update(2, tau / 4); f.update(2, stalePhase); expectOrdinary(f);
    }
  });

  it('matches periodic phases across positive and negative cycle boundaries with a small tolerance', () => {
    const f = fixture();
    for (const [checkpoint, phase] of [[0, -tau], [0, tau * 16 + 0.0000005], [0, -0.0000005], [7, 7 * tau / 8 + tau * 17], [2, tau / 4 - tau * 9]]) {
      f.update(checkpoint, phase);
      for (let side = 0; side < 2; side++) { expect(f.marks(side).userData.activeCheckpoint).toBe(checkpoint); expect(ring(f, side, checkpoint).pixelRadius).toBeCloseTo(8, 5); }
    }
  });

  it('keeps all rings ordinary with the original nine-argument path API', () => {
    const f = fixture(); f.update(4, Math.PI);
    f.root.updatePath(true, 'study', f.bird, 'canada_goose', 2, f.camera, false, 390, Math.PI); f.scene.updateMatrixWorld(true);
    expectOrdinary(f); expect(f.root.visible).toBe(true);
  });

  it('clears selection metadata for hidden, unavailable and invalidated guides without disposing pooled resources', () => {
    const f = fixture(); f.update(1, tau / 8); const resources = pool(f.root);
    const events = new Map([...resources].map(resource => [resource, 0]));
    for (const resource of resources) resource.addEventListener('dispose', () => events.set(resource, events.get(resource) + 1));
    for (const options of [{ enabled: false }, { mode: 'chase' }, { mode: 'aerial' }, { selected: null }]) {
      f.update(1, tau / 8); f.update(1, tau / 8, options);
      expect(f.root.visible).toBe(false); expect(f.marks(0).userData.activeCheckpoint).toBeNull(); expect(f.marks(1).userData.activeCheckpoint).toBeNull();
    }
    f.update(1, tau / 8); f.root.invalidate();
    expect(f.marks(0).userData.activeCheckpoint).toBeNull(); expect(f.marks(1).userData.activeCheckpoint).toBeNull();
    expect(pool(f.root)).toEqual(resources); expect([...events.values()].every(count => count === 0)).toBe(true);
    dispose(f.scene); expect([...events.values()].every(count => count === 1)).toBe(true);
  });

  it('preserves ordinary and halo pixel sizes through portrait/landscape orbit and shares all geometry, material and instance buffers', () => {
    const f = fixture('monarch'); f.update(0, 0);
    const resources = pool(f.root), instances = [f.marks(0).instanceMatrix, f.marks(1).instanceMatrix];
    const cycle = f.cycle().geometry.attributes.position, frozen = Array.from(cycle.array);
    const articulation = vi.spyOn(f.bird.userData, 'applyWingPhase');
    for (const [height, aspect, dark, x] of [[390, 390 / 678, false, -4], [678, 678 / 390, true, 4], [390, 1, true, 7]]) {
      f.camera.aspect = aspect; f.camera.updateProjectionMatrix(); f.camera.position.x = x; f.camera.lookAt(f.bird.position); f.camera.updateMatrixWorld(true);
      f.update(0, 0, { height, dark });
      for (let side = 0; side < 2; side++) {
        expect(ring(f, side, 0, height).pixelRadius).toBeCloseTo(8, 5); expect(ring(f, side, 1, height).pixelRadius).toBeCloseTo(3.2, 5);
        expect(f.marks(side).instanceMatrix).toBe(instances[side]); expect(f.marks(side).material).toBe(f.dot(side).material);
        expect(f.marks(side).material.color.getHex()).toBe((dark ? [0x67e8f9, 0xfbbf24] : [0x021016, 0x240c01])[side]);
      }
      expect(pool(f.root)).toEqual(resources); expect(Array.from(cycle.array)).toEqual(frozen);
    }
    // Only the fixture's explicit articulation per update runs; the path stays cached.
    expect(articulation).toHaveBeenCalledTimes(3); expect(f.root.userData.buildVersion).toBe(1); expect(resources.size).toBe(7);
  });

  it('moves the halo between checkpoints while preserving the captured path positions and both current dot scales', () => {
    const f = fixture(); f.update(0, 0); const frozen = Array.from(f.cycle().geometry.attributes.position.array);
    for (let checkpoint = 0; checkpoint < 8; checkpoint++) {
      f.update(checkpoint, checkpoint * tau / 8);
      for (let side = 0; side < 2; side++) {
        expect(f.marks(side).userData.activeCheckpoint).toBe(checkpoint);
        expect(projectedPixelRadius(f, f.dot(side), null, 390)).toBeCloseTo(6, 5);
      }
      expect(Array.from(f.cycle().geometry.attributes.position.array)).toEqual(frozen);
    }
  });
});
