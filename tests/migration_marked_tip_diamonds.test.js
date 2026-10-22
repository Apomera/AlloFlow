import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const sourcePath = process.env.MIGRATION_TIP_DIAMONDS_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing marked-diamond source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const createFlyer = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn createMigrationFlyer;')(num);
const createPose = new Function(section('      function createMigrationMarkedWingPose(', '      function createMigrationWingtipPath(') + '\nreturn createMigrationMarkedWingPose;')();
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const species = ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit', 'monarch'];

function fixture(id = 'canada_goose') {
  const scene = new THREE.Scene(), flock = new THREE.Group(); scene.add(flock);
  flock.position.set(0.4, 1.2, -1); flock.rotation.set(0.02, 0.1, -0.03);
  const bird = createFlyer(THREE, { id }, 2); bird.position.set(0.7, 0.5, -5); flock.add(bird);
  const root = createPose(THREE); scene.add(root);
  const links = root.getObjectByName('migration-marked-wingtip-links');
  const diamonds = root.getObjectByName('migration-marked-wingtip-diamonds');
  const camera = new THREE.PerspectiveCamera(54, 1.4, 0.1, 900);
  camera.position.set(7, 5, 3); camera.lookAt(bird.getWorldPosition(new THREE.Vector3())); camera.updateMatrixWorld(true);
  const f = { scene, flock, bird, root, links, diamonds, camera,
    pose(phase) { bird.userData.applyWingPhase(phase); bird.userData.lastRenderedWingPhase = phase; scene.updateMatrixWorld(true); },
    update({ enabled = true, mode = 'study', dark = false, viewCamera = camera, height = 390, flyer = bird } = {}) {
      root.updatePose(flyer, mode, dark, enabled, viewCamera, height); scene.updateMatrixWorld(true);
    },
    mark() { f.pose(Math.PI / 2); expect(root.capturePose(bird, id, 2)).toBe(true); },
    compare() { f.mark(); f.pose(3 * Math.PI / 2); f.update(); }
  };
  f.pose(0); return f;
}
function outerTips(f) {
  return [0, 1].map(side => {
    let node = f.bird.userData.primaries[side];
    if (!node) f.bird.userData.wings[side].traverse(part => { if (part.name === 'migration-monarch-forewing') node = part; });
    const positions = node.geometry.attributes.position, limit = node.geometry.userData.monarchBoundaryVertexCount || positions.count;
    let chosen = 0;
    for (let index = 1; index < limit; index++) if (positions.getX(index) > positions.getX(chosen) ||
      (positions.getX(index) === positions.getX(chosen) && positions.getZ(index) > positions.getZ(chosen))) chosen = index;
    return new THREE.Vector3().fromBufferAttribute(positions, chosen).applyMatrix4(node.matrixWorld);
  });
}
function marker(f, index) {
  const local = new THREE.Matrix4(); f.diamonds.getMatrixAt(index, local);
  const world = new THREE.Matrix4().multiplyMatrices(f.diamonds.matrixWorld, local);
  return { local, world, centre: new THREE.Vector3().setFromMatrixPosition(world), side: f.diamonds.userData.segmentSides[index] };
}
function projectedRadius(f, index, height = 390) {
  const item = marker(f, index), projectedCentre = item.centre.clone().project(f.camera);
  const width = height * f.camera.aspect, vertices = f.diamonds.geometry.attributes.position;
  let radius = 0;
  for (let vertex = 0; vertex < vertices.count; vertex++) {
    const point = new THREE.Vector3().fromBufferAttribute(vertices, vertex).applyMatrix4(item.world).project(f.camera);
    radius = Math.max(radius, Math.hypot((point.x - projectedCentre.x) * width / 2, (point.y - projectedCentre.y) * height / 2));
  }
  return radius;
}
function pool(root) {
  const resources = new Set(); root.traverse(node => { if (node.geometry) resources.add(node.geometry); if (node.material) resources.add(node.material); }); return resources;
}
function hidden(f) {
  expect(f.diamonds.visible).toBe(false); expect(f.diamonds.count).toBe(0);
  expect(f.diamonds.userData.segmentCount).toBe(0); expect(f.diamonds.userData.segmentSides).toEqual([-1, -1]);
}
function expectFacing(f, index) {
  const normal = new THREE.Vector3(0, 0, 1).transformDirection(marker(f, index).world);
  const cameraNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(f.camera.getWorldQuaternion(new THREE.Quaternion()));
  expect(normal.dot(cameraNormal)).toBeCloseTo(1, 5);
}

describe('Migration marked wingtip diamond markers', () => {
  it.each(species)('places %s diamonds on both actual captured anatomical tips and link starts', id => {
    const f = fixture(id); f.mark(); const actualMarked = outerTips(f);
    f.pose(3 * Math.PI / 2); f.update();
    expect(f.diamonds.isInstancedMesh).toBe(true); expect(f.diamonds.count).toBe(2); expect(f.diamonds.userData.segmentCount).toBe(2);
    expect(f.diamonds.userData.segmentSides).toEqual([0, 1]); expect(f.links.userData.segmentSides).toEqual([0, 1]);
    for (let index = 0; index < 2; index++) {
      const item = marker(f, index); expect(item.centre.distanceTo(actualMarked[item.side])).toBeLessThan(0.000001);
      const linkStart = new THREE.Vector3().fromBufferAttribute(f.links.geometry.attributes.position, index * 2).applyMatrix4(f.links.matrixWorld);
      expect(item.centre.distanceTo(linkStart)).toBeLessThan(0.000001);
      expect(projectedRadius(f, index)).toBeCloseTo(7, 3); expectFacing(f, index);
    }
    expect(f.diamonds.geometry.parameters.thetaSegments).toBe(4); expect(f.diamonds.geometry.parameters.innerRadius).toBe(0.72);
    expect(f.diamonds.material.side).toBe(THREE.DoubleSide); expect(f.diamonds.renderOrder).toBe(8);
  });

  it('stays seven pixels and camera-facing through front/profile/above orbits, portrait/landscape and camera zoom', () => {
    const f = fixture(); f.compare(); const target = f.bird.getWorldPosition(new THREE.Vector3());
    for (const [yaw, pitch, height, aspect, zoom] of [[180, 10, 390, 390 / 678, 1], [90, 10, 678, 678 / 390, 1.7], [0, 60, 390, 1.4, 0.8]]) {
      const y = yaw * Math.PI / 180, p = pitch * Math.PI / 180;
      f.camera.aspect = aspect; f.camera.zoom = zoom; f.camera.updateProjectionMatrix();
      f.camera.position.copy(target).add(new THREE.Vector3(Math.sin(y) * Math.cos(p) * 11, Math.sin(p) * 11, Math.cos(y) * Math.cos(p) * 11));
      f.camera.lookAt(target); f.update({ height }); expect(f.diamonds.count).toBe(2);
      for (let index = 0; index < 2; index++) { expect(projectedRadius(f, index, height)).toBeCloseTo(7, 3); expectFacing(f, index); }
    }
    f.camera.setViewOffset(1200, 800, 100, 70, 900, 600); f.update();
    for (let index = 0; index < 2; index++) expect(projectedRadius(f, index)).toBeCloseTo(7, 3);
  });

  it('cancels the entire body matrix so nonuniform parent scales and rotations do not distort the diamonds', () => {
    const f = fixture('monarch'); f.compare();
    f.flock.scale.set(1.4, 0.7, 1.15); f.flock.rotation.set(0.3, -0.4, 0.2);
    f.bird.scale.set(0.8, 1.2, 0.9); f.bird.rotation.set(-0.2, 0.1, 0.07); f.scene.updateMatrixWorld(true);
    f.camera.lookAt(f.bird.getWorldPosition(new THREE.Vector3())); f.update();
    expect(f.diamonds.count).toBe(2);
    for (let index = 0; index < 2; index++) {
      expect(projectedRadius(f, index)).toBeCloseTo(7, 3); expectFacing(f, index);
      const expected = new THREE.Vector3().fromArray(f.root.userData.markedTipPositions, marker(f, index).side * 3).applyMatrix4(f.bird.matrixWorld);
      expect(marker(f, index).centre.distanceTo(expected)).toBeLessThan(0.000002);
    }
  });

  it('packs only changed links while both marked diamonds remain visible when wings match again', () => {
    const f = fixture(); f.mark();
    const left = [f.bird.userData.wings[0], f.bird.userData.wrists[0], f.bird.userData.primaries[0]].filter(Boolean).map(node => ({ node, rotation: node.rotation.clone() }));
    f.pose(3 * Math.PI / 2); left.forEach(item => item.node.rotation.copy(item.rotation)); f.update();
    expect(f.links.userData.segmentSides).toEqual([1, -1]); expect(f.diamonds.userData.segmentSides).toEqual([0, 1]); expect(f.diamonds.count).toBe(2);
    for (let index = 0; index < 2; index++) { expect(marker(f, index).side).toBe(index); expect(projectedRadius(f, index)).toBeCloseTo(7, 3); }
    f.pose(Math.PI / 2); f.update(); expect(f.links.userData.segmentCount).toBe(0); expect(f.links.visible).toBe(false);
    expect(f.diamonds.visible).toBe(true); expect(f.diamonds.count).toBe(2); expect(f.diamonds.userData.segmentSides).toEqual([0, 1]);
    const returnedTips = outerTips(f);
    for (let index = 0; index < 2; index++) expect(marker(f, index).centre.distanceTo(returnedTips[index])).toBeLessThan(0.000001);
  });

  it('rejects near, behind-camera and far-clipped anchors and packs the one visible side independently of link storage', () => {
    const f = fixture(); f.compare(); const points = [0, 1].map(side => new THREE.Vector3().fromArray(f.root.userData.markedTipPositions, side * 3).applyMatrix4(f.bird.matrixWorld));
    f.camera.position.copy(points[0]).add(points[1]).multiplyScalar(0.5); f.camera.lookAt(f.camera.position.clone().add(new THREE.Vector3(1, 0, 0))); f.camera.updateMatrixWorld(true); f.update();
    const visibleSide = points.findIndex(point => -point.clone().applyMatrix4(f.camera.matrixWorldInverse).z > f.camera.near);
    expect(f.links.userData.segmentCount).toBe(2); expect(f.diamonds.count).toBe(1); expect(f.diamonds.userData.segmentSides).toEqual([visibleSide, -1]);
    f.camera.near = 1000; f.camera.far = 2000; f.camera.updateProjectionMatrix(); f.update(); hidden(f);
    f.camera.near = 0.1; f.camera.far = 0.2; f.camera.updateProjectionMatrix(); f.camera.position.set(7, 5, 3); f.camera.lookAt(f.bird.getWorldPosition(new THREE.Vector3())); f.update(); hidden(f);
    f.camera.far = 900; f.camera.updateProjectionMatrix(); f.camera.position.set(0, 0, -100); f.camera.lookAt(0, 0, -101); f.update(); hidden(f);
  });

  it('hides markers for missing or invalid optional view arguments while preserving the old link API', () => {
    const f = fixture(); f.compare();
    for (const height of [undefined, null, 0, -1, NaN, Infinity, '390']) {
      f.root.updatePose(f.bird, 'study', false, true, f.camera, height); hidden(f); expect(f.links.visible).toBe(true);
    }
    for (const camera of [undefined, null, {}, new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 900)]) {
      f.root.updatePose(f.bird, 'study', false, true, camera, 390); hidden(f); expect(f.links.visible).toBe(true);
    }
    f.update(); expect(f.diamonds.visible).toBe(true); f.root.updatePose(f.bird, 'study', false, true); hidden(f); expect(f.links.visible).toBe(true);
    f.camera.projectionMatrix.elements[5] = NaN; f.update(); hidden(f);
    f.camera.updateProjectionMatrix(); f.camera.near = NaN; f.update(); hidden(f);
  });

  it('follows the marked outline theme while keeping geometry, material and two matrix slots pooled', () => {
    const f = fixture(); f.compare(); const geometry = f.diamonds.geometry, material = f.diamonds.material, instance = f.diamonds.instanceMatrix;
    const sides = f.diamonds.userData.segmentSides, positions = f.root.geometry.attributes.position;
    const frozen = Array.from(positions.array); expect(instance.array.byteLength).toBe(128); expect(instance.count).toBe(2);
    for (const dark of [true, false, false, true]) {
      f.update({ dark }); expect(material.color.getHex()).toBe(dark ? 0xc4b5fd : 0x301056);
      expect(material.color.getHex()).toBe(f.root.material.color.getHex()); expect(f.diamonds.geometry).toBe(geometry); expect(f.diamonds.material).toBe(material);
      expect(f.diamonds.instanceMatrix).toBe(instance); expect(f.diamonds.userData.segmentSides).toBe(sides); expect(Array.from(positions.array)).toEqual(frozen);
    }
    expect(material.depthTest).toBe(false); expect(material.depthWrite).toBe(false); expect(material.toneMapped).toBe(false);
  });

  it('clears visibility and metadata on layer/camera changes, explicit clear, replaced flyer and failed recapture', () => {
    const f = fixture(); f.compare(); const sides = f.diamonds.userData.segmentSides;
    for (const options of [{ enabled: false }, { mode: 'chase' }, { mode: 'aerial' }]) { f.update(); f.update(options); hidden(f); }
    f.update(); f.root.clearPose(); hidden(f); expect(f.diamonds.userData.segmentSides).toBe(sides);
    f.compare(); const other = createFlyer(THREE, { id: 'monarch' }, 0); f.update({ flyer: other }); hidden(f);
    f.compare(); expect(f.root.capturePose(null, '', -1)).toBe(false); hidden(f);
  });

  it('adds exactly two pooled resources and disposes the instance and every shared resource only at teardown', () => {
    const f = fixture(); const resources = pool(f.root); expect(resources.size).toBe(6);
    const counts = new Map([...resources].map(resource => [resource, 0])); let instanceDisposals = 0;
    resources.forEach(resource => resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1)));
    f.diamonds.addEventListener('dispose', () => instanceDisposals++);
    const matrix = f.diamonds.instanceMatrix;
    for (let cycle = 0; cycle < 8; cycle++) { f.compare(); f.root.clearPose(); expect(pool(f.root)).toEqual(resources); expect(f.diamonds.instanceMatrix).toBe(matrix); }
    expect([...counts.values()].every(count => count === 0)).toBe(true); expect(instanceDisposals).toBe(0);
    dispose(f.scene); expect([...counts.values()].every(count => count === 1)).toBe(true); expect(instanceDisposals).toBe(1);
  });
});
