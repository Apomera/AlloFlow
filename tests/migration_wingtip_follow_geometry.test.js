import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const sourcePath = process.env.MIGRATION_FOLLOW_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing wingtip-follow source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const createFlyer = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn createMigrationFlyer;')(num);
const factories = new Function(section('      function createMigrationMarkedWingPose(', '      function initMigrationFlightScene(') + '\nreturn { pose: createMigrationMarkedWingPose, path: createMigrationWingtipPath };')();
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const species = ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit', 'monarch'];
const tau = Math.PI * 2;

function fixture(id = 'canada_goose') {
  const scene = new THREE.Scene(), flock = new THREE.Group(); scene.add(flock);
  flock.position.set(0.4, 1.2, -1); flock.rotation.set(0.02, 0.1, -0.03);
  const bird = createFlyer(THREE, { id }, 2); bird.position.set(0.7, 0.5, -5); flock.add(bird);
  const pose = factories.pose(THREE), pathRoot = factories.path(THREE); scene.add(pose, pathRoot);
  const camera = new THREE.PerspectiveCamera(54, 1.4, 0.1, 900);
  camera.position.set(7, 5, 3); camera.lookAt(bird.getWorldPosition(new THREE.Vector3())); camera.updateMatrixWorld(true);
  const apply = bird.userData.applyWingPhase; let applyCalls = 0;
  bird.userData.applyWingPhase = phase => { applyCalls++; apply(phase); };
  const f = {
    id, scene, flock, bird, pose, path: pathRoot, camera, phase: 0,
    links: pose.getObjectByName('migration-marked-wingtip-links'),
    diamonds: pose.getObjectByName('migration-marked-wingtip-diamonds'),
    cycle: pathRoot.getObjectByName('migration-wingtip-cycle'),
    dot(side) { return pathRoot.getObjectByName(side === 0 ? 'migration-wingtip-left-point' : 'migration-wingtip-right-point'); },
    marks(side) { return pathRoot.getObjectByName(side === 0 ? 'migration-wingtip-left-landmarks' : 'migration-wingtip-right-landmarks'); },
    arrow(side) { return pathRoot.getObjectByName(side === 0 ? 'migration-wingtip-left-direction' : 'migration-wingtip-right-direction'); },
    poseAt(phase) {
      f.phase = phase; bird.userData.applyWingPhase(phase); bird.userData.lastRenderedWingPhase = phase; scene.updateMatrixWorld(true);
    },
    mark(phase = Math.PI / 2) { f.poseAt(phase); expect(pose.capturePose(bird, id, 2)).toBe(true); },
    update({ side, enabled = true, mode = 'study', dark = false, checkpoint = 6, flyer = bird } = {}) {
      pose.updatePose(flyer, mode, dark, enabled, camera, 390, side);
      pathRoot.updatePath(enabled, mode, flyer, id, 2, camera, dark, 390, f.phase, checkpoint, side);
      scene.updateMatrixWorld(true);
    },
    compare() { f.mark(); f.poseAt(3 * Math.PI / 2); f.update(); },
    calls() { return applyCalls; }
  };
  f.poseAt(0); return f;
}

function actualTip(f, side) {
  let node = f.bird.userData.primaries[side];
  if (!node) f.bird.userData.wings[side].traverse(part => { if (part.name === 'migration-monarch-forewing') node = part; });
  const vertices = node.geometry.attributes.position, limit = node.geometry.userData.monarchBoundaryVertexCount || vertices.count;
  let chosen = 0;
  for (let index = 1; index < limit; index++) if (vertices.getX(index) > vertices.getX(chosen) ||
      (vertices.getX(index) === vertices.getX(chosen) && vertices.getZ(index) > vertices.getZ(chosen))) chosen = index;
  return new THREE.Vector3().fromBufferAttribute(vertices, chosen).applyMatrix4(node.matrixWorld);
}
function actualLocalAt(f, side, phase) {
  f.bird.userData.applyWingPhase(phase); f.scene.updateMatrixWorld(true);
  const point = actualTip(f, side).applyMatrix4(f.bird.matrixWorld.clone().invert());
  f.bird.userData.applyWingPhase(f.phase); f.scene.updateMatrixWorld(true);
  return point;
}
function bufferPoint(mesh, vertex) {
  return new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, vertex).applyMatrix4(mesh.matrixWorld);
}
function instancePoint(mesh, index) {
  const matrix = new THREE.Matrix4(); mesh.getMatrixAt(index, matrix);
  return new THREE.Vector3().setFromMatrixPosition(matrix).applyMatrix4(mesh.matrixWorld);
}
function hiddenSide(f, side) {
  expect(f.dot(side).visible).toBe(false); expect(f.marks(side).visible).toBe(false);
  expect(f.marks(side).userData.activeCheckpoint).toBeNull();
  const arrow = f.arrow(side); expect(arrow.visible).toBe(false);
  expect(arrow.userData.phase).toBeNull(); expect(arrow.userData.anchorPhase).toBeNull();
  expect(arrow.userData.directionVector).toEqual([0, 0, 0]);
  expect(arrow.userData.projectedDirection).toEqual([0, 0]);
}
function resources(...roots) {
  const pool = new Set();
  for (const root of roots) root.traverse(node => {
    if (node.geometry) pool.add(node.geometry);
    if (node.material) pool.add(node.material);
  });
  return pool;
}

describe('Migration anatomical wingtip guide following', () => {
  it.each(species)('isolates either %s anatomical side using the actual tip geometry, keeping both captured wings intact', id => {
    const f = fixture(id); f.mark(); const markedTips = [actualTip(f, 0), actualTip(f, 1)];
    const outline = f.pose.geometry.attributes.position.array.slice(), outlineCount = f.pose.geometry.drawRange.count;
    const visibleBirdParts = []; f.bird.traverse(part => visibleBirdParts.push([part, part.visible]));
    f.poseAt(3 * Math.PI / 2); const liveTips = [actualTip(f, 0), actualTip(f, 1)]; f.update();
    const buildVersion = f.path.userData.buildVersion, sourceDescriptors = f.path.userData.sources;
    const pathBuffer = f.cycle.geometry.attributes.position.array.slice();
    for (const side of [0, 1]) {
      const calls = f.calls(); f.update({ side }); expect(f.calls()).toBe(calls);
      expect(f.path.userData.followSide).toBe(side); expect(f.cycle.geometry.drawRange).toEqual({ start: side * 128, count: 128 });
      expect(f.dot(side).visible).toBe(true); expect(f.marks(side).visible).toBe(true); hiddenSide(f, 1 - side);
      expect(f.dot(side).getWorldPosition(new THREE.Vector3()).distanceTo(liveTips[side])).toBeLessThan(0.000001);
      expect(f.marks(side).userData.activeCheckpoint).toBe(6);
      expect(instancePoint(f.marks(side), 6).distanceTo(liveTips[side])).toBeLessThan(0.000001);
      expect(f.arrow(side).userData.phase).toBeCloseTo(f.phase);
      expect(f.links.userData.segmentSides).toEqual([side, -1]); expect(f.links.userData.segmentCount).toBe(1);
      expect(f.links.userData.followSide).toBe(side); expect(f.links.geometry.drawRange).toEqual({ start: 0, count: 2 });
      expect(bufferPoint(f.links, 0).distanceTo(markedTips[side])).toBeLessThan(0.000001);
      expect(bufferPoint(f.links, 1).distanceTo(liveTips[side])).toBeLessThan(0.000001);
      expect(f.links.geometry.attributes.lineDistance.getX(1) > 0).toBe(side === 1);
      expect(f.diamonds.count).toBe(1); expect(f.diamonds.userData.segmentSides).toEqual([side, -1]);
      expect(instancePoint(f.diamonds, 0).distanceTo(markedTips[side])).toBeLessThan(0.000001);
      for (const sample of [0, 8, 32, 63]) {
        const expected = actualLocalAt(f, side, sample * tau / 64);
        const actual = new THREE.Vector3().fromBufferAttribute(f.cycle.geometry.attributes.position, side * 128 + sample * 2);
        expect(actual.distanceTo(expected)).toBeLessThan(0.000001);
      }
      expect(f.path.userData.buildVersion).toBe(buildVersion); expect(f.path.userData.sources).toBe(sourceDescriptors);
      expect(f.cycle.geometry.attributes.position.array).toEqual(pathBuffer);
      expect(f.pose.geometry.attributes.position.array).toEqual(outline); expect(f.pose.geometry.drawRange.count).toBe(outlineCount);
      expect(f.pose.userData.sources.some(item => item.side === 0)).toBe(true);
      expect(f.pose.userData.sources.some(item => item.side === 1)).toBe(true);
      for (const [part, visible] of visibleBirdParts) expect(part.visible).toBe(visible);
    }
    f.update();
    expect(f.path.userData.followSide).toBeNull(); expect(f.cycle.geometry.drawRange).toEqual({ start: 0, count: 256 });
    expect(f.links.userData.segmentSides).toEqual([0, 1]); expect(f.diamonds.userData.segmentSides).toEqual([0, 1]);
    for (const side of [0, 1]) { expect(f.dot(side).visible).toBe(true); expect(f.marks(side).visible).toBe(true); }
  });

  it.each([null, -1, 2, 0.5, '0', true, NaN])('treats invalid follow value %s as both anatomical sides', side => {
    const f = fixture(); f.compare(); f.update({ side });
    expect(f.path.userData.followSide).toBeNull(); expect(f.links.userData.followSide).toBeNull();
    expect(f.cycle.geometry.drawRange).toEqual({ start: 0, count: 256 });
    expect(f.links.userData.segmentSides).toEqual([0, 1]); expect(f.diamonds.count).toBe(2);
    for (const index of [0, 1]) { expect(f.dot(index).visible).toBe(true); expect(f.marks(index).visible).toBe(true); }
  });

  it('preserves the existing path and marked-pose argument forms and fully restores both cached sides', () => {
    const f = fixture(); f.compare(); const version = f.path.userData.buildVersion;
    f.update({ side: 1 }); const calls = f.calls();
    f.path.updatePath(true, 'study', f.bird, f.id, 2, f.camera, false, 390, f.phase);
    f.pose.updatePose(f.bird, 'study', false, true, f.camera, 390); f.scene.updateMatrixWorld(true);
    expect(f.calls()).toBe(calls); expect(f.path.userData.buildVersion).toBe(version);
    expect(f.cycle.geometry.drawRange).toEqual({ start: 0, count: 256 });
    expect(f.links.userData.segmentSides).toEqual([0, 1]); expect(f.diamonds.count).toBe(2);
    for (const side of [0, 1]) { expect(f.dot(side).visible).toBe(true); expect(f.marks(side).visible).toBe(true); }
    f.pose.updatePose(f.bird, 'study', false);
    expect(f.pose.visible).toBe(true); expect(f.links.visible).toBe(false); expect(f.diamonds.visible).toBe(false);
    expect(f.links.userData.followSide).toBeNull();
  });

  it('keeps anatomical side identity across camera orbits and theme changes, including portrait sizing', () => {
    const f = fixture(); f.compare();
    for (const [x, y, z] of [[0, 2, -10], [10, 2, 0], [0, 12, 1]]) {
      f.camera.aspect = 390 / 700; f.camera.updateProjectionMatrix();
      const centre = f.bird.getWorldPosition(new THREE.Vector3());
      f.camera.position.copy(centre).add(new THREE.Vector3(x, y, z)); f.camera.lookAt(centre); f.camera.updateMatrixWorld(true);
      for (const side of [0, 1]) {
        f.update({ side, dark: true });
        expect(f.path.userData.followSide).toBe(side); expect(f.links.userData.segmentSides[0]).toBe(side);
        expect(f.dot(side).getWorldPosition(new THREE.Vector3()).distanceTo(actualTip(f, side))).toBeLessThan(0.000001);
        const color = new THREE.Color(side === 0 ? 0x67e8f9 : 0xfbbf24);
        expect(f.dot(side).material.color.getHex()).toBe(color.getHex());
        const colors = f.cycle.geometry.attributes.color;
        expect(colors.getX(side * 128)).toBeCloseTo(color.r, 6); expect(colors.getY(side * 128)).toBeCloseTo(color.g, 6);
        hiddenSide(f, 1 - side);
      }
    }
  });

  it('clears hidden and invalidated follow metadata and reuses the cache after a path toggle', () => {
    const f = fixture(); f.compare(); f.update({ side: 0 }); const version = f.path.userData.buildVersion;
    for (const options of [{ enabled: false }, { mode: 'chase' }]) {
      f.update({ side: 0, ...options });
      expect(f.path.visible).toBe(false); expect(f.path.userData.followSide).toBeNull();
      expect(f.cycle.geometry.drawRange).toEqual({ start: 0, count: 0 });
      expect(f.links.userData.followSide).toBeNull(); expect(f.links.userData.segmentSides).toEqual([-1, -1]);
      expect(f.diamonds.count).toBe(0); for (const side of [0, 1]) hiddenSide(f, side);
      f.update(); expect(f.path.userData.buildVersion).toBe(version); expect(f.cycle.geometry.drawRange.count).toBe(256);
    }
    f.update({ side: 1 }); f.path.invalidate();
    expect(f.path.userData.followSide).toBeNull(); expect(f.path.userData.sources).toEqual([]);
    expect(f.cycle.geometry.drawRange.count).toBe(0); for (const side of [0, 1]) hiddenSide(f, side);
    f.update(); expect(f.path.userData.buildVersion).toBe(version + 1); expect(f.cycle.geometry.drawRange.count).toBe(256);
    f.pose.clearPose(); expect(f.links.userData.followSide).toBeNull(); expect(f.diamonds.count).toBe(0);
    const replacement = createFlyer(THREE, { id: f.id }, 3); f.flock.add(replacement); f.update({ side: 1, flyer: replacement });
    expect(f.pose.userData.captured).toBe(false); expect(f.links.userData.followSide).toBeNull();
    expect(f.path.userData.sourceBirdUuid).toBe(replacement.uuid); expect(f.path.userData.followSide).toBe(1);
    f.update({ side: 1, flyer: new THREE.Group() });
    expect(f.path.visible).toBe(false); expect(f.path.userData.followSide).toBeNull(); expect(f.cycle.geometry.drawRange.count).toBe(0);
    for (const side of [0, 1]) hiddenSide(f, side);
  });

  it('keeps the selected marked diamond at overlap without a displacement link and validates both sources', () => {
    const f = fixture(); f.mark(); f.update({ side: 1 });
    expect(f.pose.visible).toBe(true); expect(f.links.visible).toBe(false); expect(f.links.userData.followSide).toBeNull();
    expect(f.diamonds.visible).toBe(true); expect(f.diamonds.count).toBe(1); expect(f.diamonds.userData.segmentSides).toEqual([1, -1]);
    const coincident = new THREE.Matrix4(); f.diamonds.getMatrixAt(0, coincident);
    const markedWorld = new THREE.Vector3().applyMatrix4(coincident).applyMatrix4(f.diamonds.matrixWorld);
    expect(markedWorld.distanceTo(actualTip(f, 1))).toBeLessThan(0.000001);
    expect(f.links.geometry.drawRange.count).toBe(0);
    f.poseAt(3 * Math.PI / 2); f.update({ side: 0 }); expect(f.links.userData.segmentSides).toEqual([0, -1]);
    const other = f.bird.userData.primaries[1], previousGeometry = other.geometry;
    other.geometry = previousGeometry.clone();
    f.pose.updatePose(f.bird, 'study', false, true, f.camera, 390, 0);
    expect(f.links.visible).toBe(false); expect(f.links.userData.followSide).toBeNull(); expect(f.diamonds.count).toBe(0);
    expect(f.pose.visible).toBe(true); other.geometry.dispose(); other.geometry = previousGeometry;
  });

  it('retains the exact thirteen-resource pool and GPU buffers through repeated filtering, then disposes them once', () => {
    const f = fixture(); f.compare();
    const pool = resources(f.path, f.pose); expect(pool.size).toBe(13);
    const buffers = [f.cycle.geometry.attributes.position.array, f.cycle.geometry.attributes.color.array,
      f.cycle.geometry.attributes.lineDistance.array, f.links.geometry.attributes.position.array,
      f.links.geometry.attributes.color.array, f.links.geometry.attributes.lineDistance.array,
      f.marks(0).instanceMatrix.array, f.marks(1).instanceMatrix.array, f.diamonds.instanceMatrix.array];
    const version = f.path.userData.buildVersion, calls = f.calls();
    for (let index = 0; index < 36; index++) f.update({ side: index % 3 === 2 ? undefined : index % 3, dark: index % 2 === 0 });
    expect(f.path.userData.buildVersion).toBe(version); expect(f.calls()).toBe(calls);
    expect(resources(f.path, f.pose)).toEqual(pool);
    expect([f.cycle.geometry.attributes.position.array, f.cycle.geometry.attributes.color.array,
      f.cycle.geometry.attributes.lineDistance.array, f.links.geometry.attributes.position.array,
      f.links.geometry.attributes.color.array, f.links.geometry.attributes.lineDistance.array,
      f.marks(0).instanceMatrix.array, f.marks(1).instanceMatrix.array, f.diamonds.instanceMatrix.array]
      .every((buffer, index) => buffer === buffers[index])).toBe(true);
    const events = [...pool].map(resource => { const listener = vi.fn(); resource.addEventListener('dispose', listener); return listener; });
    const meshes = [f.marks(0), f.marks(1), f.diamonds].map(mesh => { const listener = vi.fn(); mesh.addEventListener('dispose', listener); return listener; });
    dispose(f.path); dispose(f.pose);
    for (const listener of [...events, ...meshes]) expect(listener).toHaveBeenCalledTimes(1);
  });
});
