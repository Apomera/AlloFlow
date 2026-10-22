import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), process.env.MIGRATION_MARKED_REFERENCE_CANDIDATE || 'stem_lab/stem_tool_migration.js'), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing marked-reference source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const createFlyer = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn createMigrationFlyer;')(num);
const createPose = new Function(section('      function createMigrationMarkedWingPose(', '      function createMigrationWingtipPath(') + '\nreturn createMigrationMarkedWingPose;')();
const ids = ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit', 'monarch'];

function fixture(id = 'canada_goose', width = 804, height = 560, library = THREE) {
  const scene = new THREE.Scene(), flock = new THREE.Group(), rig = new THREE.Group(); scene.add(flock, rig);
  flock.position.set(.4, 1.2, -.3); flock.rotation.set(.07, .12, -.04);
  const bird = createFlyer(THREE, { id }, 2); bird.position.set(.6, .5, -5); flock.add(bird);
  const camera = new THREE.PerspectiveCamera(54, width / height, .1, 900); rig.add(camera); scene.updateMatrixWorld(true);
  const target = bird.getWorldPosition(new THREE.Vector3()); camera.position.copy(target).add(new THREE.Vector3(6, 4, 9)); camera.lookAt(target); camera.updateMatrixWorld(true);
  const root = createPose(library); scene.add(root);
  const f = { scene, flock, rig, bird, camera, root, id, width, height,
    links: root.getObjectByName('migration-marked-wingtip-links'), diamonds: root.getObjectByName('migration-marked-wingtip-diamonds'),
    pose(phase) { bird.userData.applyWingPhase(phase); bird.userData.lastRenderedWingPhase = phase; scene.updateMatrixWorld(true); },
    mark() { f.pose(Math.PI / 2); expect(root.capturePose(bird, id, 2)).toBe(true); },
    update(side, options = {}) {
      scene.updateMatrixWorld(true);
      const viewCamera = Object.hasOwn(options, 'camera') ? options.camera : camera;
      const viewWidth = Object.hasOwn(options, 'width') ? options.width : f.width;
      const viewHeight = Object.hasOwn(options, 'height') ? options.height : f.height;
      root.updatePose(bird, options.mode || 'study', options.dark === true, options.enabled !== false, viewCamera, viewHeight, side, viewWidth);
      scene.updateMatrixWorld(true);
    }
  };
  f.mark(); return f;
}
function pixel(f, world) {
  const point = world.clone().project(f.camera);
  return new THREE.Vector2(point.x * f.width / 2, -point.y * f.height / 2);
}
function actualMarked(f, side) { return new THREE.Vector3().fromArray(f.root.userData.markedTipPositions, side * 3).applyMatrix4(f.bird.matrixWorld); }
function renderedMatrix(f, index) {
  const instance = new THREE.Matrix4(); f.diamonds.getMatrixAt(index, instance);
  return new THREE.Matrix4().multiplyMatrices(f.diamonds.matrixWorld, instance);
}
function expectReference(f, sides) {
  expect(f.diamonds.visible).toBe(sides.length > 0); expect(f.diamonds.count).toBe(sides.length);
  expect(f.diamonds.userData.segmentCount).toBe(sides.length); expect(f.diamonds.userData.segmentSides).toEqual([...sides, ...Array(2 - sides.length).fill(-1)]);
  for (let index = 0; index < sides.length; index++) {
    const world = renderedMatrix(f, index), centre = new THREE.Vector3().applyMatrix4(world), centrePx = pixel(f, centre);
    expect(centre.distanceTo(actualMarked(f, sides[index]))).toBeLessThan(.000003);
    const positions = f.diamonds.geometry.attributes.position;
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const local = new THREE.Vector3().fromBufferAttribute(positions, vertex), radius = Math.hypot(local.x, local.y);
      const rendered = pixel(f, local.applyMatrix4(world));
      expect(rendered.distanceTo(centrePx)).toBeCloseTo(7 * radius, 3);
    }
    const x = pixel(f, new THREE.Vector3(1, 0, 0).applyMatrix4(world)).sub(centrePx);
    const y = pixel(f, new THREE.Vector3(0, 1, 0).applyMatrix4(world)).sub(centrePx);
    expect(x.x).toBeCloseTo(7, 3); expect(x.y).toBeCloseTo(0, 3); expect(y.x).toBeCloseTo(0, 3); expect(y.y).toBeCloseTo(-7, 3);
    expect(world.elements.every(Number.isFinite)).toBe(true);
  }
}
function expectNoLinks(f) {
  expect(f.links.visible).toBe(false); expect(f.links.geometry.drawRange.count).toBe(0);
  expect(f.links.userData.segmentCount).toBe(0); expect(f.links.userData.segmentSides).toEqual([-1, -1]); expect(f.links.userData.followSide).toBeNull();
}
function expectHiddenDiamonds(f) {
  expect(f.diamonds.visible).toBe(false); expect(f.diamonds.count).toBe(0); expect(f.diamonds.userData.segmentCount).toBe(0);
  expect(f.diamonds.userData.segmentSides).toEqual([-1, -1]); expect([...f.diamonds.instanceMatrix.array].every(Number.isFinite)).toBe(true);
}
function resources(root) {
  const result = new Set(); root.traverse(node => { if (node.geometry) result.add(node.geometry); if (node.material) result.add(node.material); }); return result;
}

describe('Stable marked tip references use the rendered camera plane', () => {
  it.each(ids)('keeps %s marked endpoints visible at original, opposite and returned poses without inventing displacement', id => {
    const f = fixture(id); const outline = f.root.geometry.attributes.position.array.slice(), marked = [...f.root.userData.markedTipPositions], version = f.root.userData.captureVersion;
    for (const side of [undefined, 0, 1]) {
      const expectedSides = side === undefined ? [0, 1] : [side];
      f.pose(Math.PI / 2); f.update(side); expectReference(f, expectedSides); expectNoLinks(f);
      f.pose(3 * Math.PI / 2); f.update(side); expectReference(f, expectedSides); expect(f.links.userData.segmentCount).toBe(expectedSides.length);
      f.pose(Math.PI / 2); f.update(side); expectReference(f, expectedSides); expectNoLinks(f);
      expect(f.root.geometry.attributes.position.array).toEqual(outline); expect(f.root.userData.markedTipPositions).toEqual(marked);
      expect(f.root.userData.captureVersion).toBe(version); expect(f.bird.userData.lastRenderedWingPhase).toBe(Math.PI / 2);
    }
  });

  it.each(['zoom-and-film-offset', 'asymmetric-view-offset', 'nonuniform-camera-parent', 'mirrored-camera-and-bird-parents'])('projects every actual ring vertex at seven CSS pixels for %s', kind => {
    const f = fixture('monarch', 390, 678);
    if (kind === 'zoom-and-film-offset') { f.camera.zoom = 1.8; f.camera.filmOffset = 7; f.camera.updateProjectionMatrix(); }
    if (kind === 'asymmetric-view-offset') { f.camera.setViewOffset(2000, 1100, 350, 60, 1100, 800); f.camera.zoom = 1.4; f.camera.updateProjectionMatrix(); }
    if (kind.includes('camera-parent') || kind.includes('camera-and-bird')) {
      f.rig.position.set(.7, -.4, .3); f.rig.rotation.set(.12, -.16, .08); f.rig.scale.set(1.7, .65, 1.2);
      if (kind.includes('mirrored')) { f.rig.scale.x *= -1; f.flock.scale.set(-1.2, .8, 1.1); }
    }
    // Measure projection while a displacement link exists as well. This
    // isolates camera-plane correctness from the persistent-overlap behavior.
    f.pose(3 * Math.PI / 2); f.update(); expectReference(f, [0, 1]); expect(f.links.userData.segmentCount).toBe(2);
    f.update(1); expectReference(f, [1]); expect(f.links.userData.segmentSides).toEqual([1, -1]);
  });

  it('preserves the seven-argument API while accepting actual CSS width independently of the camera aspect', () => {
    const f = fixture(); f.camera.setViewOffset(1800, 1100, 100, 70, 900, 750); f.camera.updateProjectionMatrix();
    f.width = 390; f.height = 678; f.update(); expectReference(f, [0, 1]);
    f.camera.clearViewOffset(); f.camera.aspect = f.width / f.height; f.camera.updateProjectionMatrix();
    f.root.updatePose(f.bird, 'study', false, true, f.camera, f.height, 0); f.scene.updateMatrixWorld(true); expectReference(f, [0]); expectNoLinks(f);
    f.root.updatePose(f.bird, 'study', false, true); expectHiddenDiamonds(f); expectNoLinks(f); expect(f.root.visible).toBe(true);
  });

  it.each([null, 0, -1, NaN, Infinity, '390'])('hides stale diamond metadata for invalid explicit viewport width %s', width => {
    const f = fixture(); f.update(); expectReference(f, [0, 1]); f.update(undefined, { width }); expectHiddenDiamonds(f); expectNoLinks(f);
    f.update(); expectReference(f, [0, 1]);
  });

  it.each(['singular-camera', 'nan-camera', 'singular-projection', 'nan-projection', 'negative-x-projection', 'zero-y-projection', 'invalid-aspect', 'invalid-near', 'invalid-far'])('fails closed for %s after a valid reference', kind => {
    const f = fixture(); f.pose(3 * Math.PI / 2); f.update(); expectReference(f, [0, 1]);
    if (kind === 'singular-camera') f.rig.scale.x = 0;
    if (kind === 'nan-camera') { f.camera.matrixAutoUpdate = false; f.camera.matrix.elements[12] = NaN; }
    if (kind === 'singular-projection') f.camera.projectionMatrix.elements.fill(0);
    if (kind === 'nan-projection') f.camera.projectionMatrix.elements[8] = NaN;
    if (kind === 'negative-x-projection') f.camera.projectionMatrix.elements[0] *= -1;
    if (kind === 'zero-y-projection') f.camera.projectionMatrix.elements[5] = 0;
    if (kind === 'invalid-aspect') f.camera.aspect = NaN;
    if (kind === 'invalid-near') f.camera.near = 0;
    if (kind === 'invalid-far') f.camera.far = f.camera.near;
    f.update(); expectHiddenDiamonds(f); expect(f.root.userData.captured).toBe(true);
  });

  it.each(['singular-source', 'nan-source', 'changed-unselected-geometry', 'detached-unselected-anchor'])('suppresses both comparison layers for %s without changing the frozen outline', kind => {
    const f = fixture(); f.pose(3 * Math.PI / 2); f.update(0); const frozen = f.root.geometry.attributes.position.array.slice();
    if (kind === 'singular-source') f.flock.scale.x = 0;
    if (kind === 'nan-source') { f.bird.matrixAutoUpdate = false; f.bird.matrix.elements[12] = NaN; }
    const node = f.bird.userData.primaries[1], original = node.geometry;
    if (kind === 'changed-unselected-geometry') node.geometry = original.clone();
    if (kind === 'detached-unselected-anchor') node.parent.remove(node);
    f.update(0); expectHiddenDiamonds(f); expectNoLinks(f); expect(f.root.geometry.attributes.position.array).toEqual(frozen);
    expect(f.root.userData.captured).toBe(true); if (node.geometry !== original) node.geometry.dispose();
  });

  it('keeps the six-resource pool, all buffer identities and allocation counts through repeated overlap and follow changes', () => {
    let allocations = 0; const library = { ...THREE };
    for (const key of ['Vector3', 'Quaternion', 'Matrix4', 'Color']) {
      library[key] = class extends THREE[key] { constructor(...args) { super(...args); allocations++; } };
    }
    const f = fixture('canada_goose', 804, 560, library), pool = resources(f.root);
    const attributes = [f.root.geometry.attributes.position, f.root.geometry.attributes.lineDistance, f.links.geometry.attributes.position, f.links.geometry.attributes.color, f.links.geometry.attributes.lineDistance, f.diamonds.instanceMatrix];
    const initialAllocations = allocations, sides = f.diamonds.userData.segmentSides, marked = f.root.userData.markedTipPositions, sources = f.root.userData.tipSources;
    expect(pool.size).toBe(6); expect(f.diamonds.instanceMatrix.array.byteLength).toBe(128);
    expect(attributes.slice(2, 5).reduce((total, attribute) => total + attribute.array.byteLength, 0)).toBe(112);
    for (let index = 0; index < 36; index++) {
      f.pose(index % 2 ? Math.PI / 2 : 3 * Math.PI / 2); f.update(index % 3 === 2 ? undefined : index % 3, { dark: index % 2 === 0 });
      expect(f.diamonds.count).toBe(index % 3 === 2 ? 2 : 1);
    }
    expect(allocations).toBe(initialAllocations); expect(resources(f.root)).toEqual(pool);
    expect([f.root.geometry.attributes.position, f.root.geometry.attributes.lineDistance, f.links.geometry.attributes.position, f.links.geometry.attributes.color, f.links.geometry.attributes.lineDistance, f.diamonds.instanceMatrix]).toEqual(attributes);
    expect(f.diamonds.userData.segmentSides).toBe(sides); expect(f.root.userData.markedTipPositions).toBe(marked); expect(f.root.userData.tipSources).toBe(sources);
    for (const options of [{ enabled: false }, { mode: 'chase' }]) { f.update(undefined, options); expectHiddenDiamonds(f); expectNoLinks(f); }
    f.root.clearPose(); expectHiddenDiamonds(f); expectNoLinks(f); expect(resources(f.root)).toEqual(pool);
  });
});
