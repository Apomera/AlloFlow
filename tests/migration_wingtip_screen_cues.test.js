import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), process.env.MIGRATION_SCREEN_CUES_CANDIDATE || 'stem_lab/stem_tool_migration.js'), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing screen-cue source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const createFlyer = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn createMigrationFlyer;')(num);
const createPath = new Function(section('      function createMigrationWingtipPath(', '      function initMigrationFlightScene(') + '\nreturn createMigrationWingtipPath;')();
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const ids = ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit', 'monarch'];
const tau = Math.PI * 2;

function fixture(id = 'canada_goose') {
  const scene = new THREE.Scene(), flock = new THREE.Group(), rig = new THREE.Group();
  scene.add(flock, rig); flock.position.set(.4, 1.2, -.3); flock.rotation.set(.07, .12, -.04);
  const bird = createFlyer(THREE, { id }, 2); flock.add(bird); bird.position.set(.6, .5, -5);
  const camera = new THREE.PerspectiveCamera(54, 1, .1, 900); rig.add(camera);
  scene.updateMatrixWorld(true);
  camera.position.copy(bird.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(6, 4, 9));
  camera.lookAt(bird.getWorldPosition(new THREE.Vector3())); camera.updateMatrixWorld(true);
  const root = createPath(THREE); scene.add(root);
  const f = { scene, flock, rig, bird, camera, root, phase: tau * 3 / 8, height: 390,
    update(options = {}) {
      const { phase = f.phase, checkpoint = 3, dark = false,
        enabled = true, mode = 'study', selected = bird, chosenCamera = camera, follow } = options;
      const height = Object.prototype.hasOwnProperty.call(options, 'height') ? options.height : f.height;
      f.phase = phase; f.height = height;
      if (selected && Number.isFinite(phase)) { selected.userData.applyWingPhase(phase); selected.userData.lastRenderedWingPhase = phase; }
      scene.updateMatrixWorld(true);
      root.updatePath(enabled, mode, selected, id, 2, chosenCamera, dark, height, phase, checkpoint, follow);
      scene.updateMatrixWorld(true);
    },
    dot(side) { return root.getObjectByName(side ? 'migration-wingtip-right-point' : 'migration-wingtip-left-point'); },
    marks(side) { return root.getObjectByName(side ? 'migration-wingtip-right-landmarks' : 'migration-wingtip-left-landmarks'); },
    arrow(side) { return root.getObjectByName(side ? 'migration-wingtip-right-direction' : 'migration-wingtip-left-direction'); },
    cycle() { return root.getObjectByName('migration-wingtip-cycle'); }
  };
  f.update(); return f;
}
function pool(root) {
  const resources = new Set();
  root.traverse(node => { if (node.geometry) resources.add(node.geometry); if (node.material) resources.add(node.material); });
  return resources;
}
function pixels(f, world, height = f.height) {
  const p = world.clone().project(f.camera);
  return new THREE.Vector2(p.x * height * f.camera.aspect / 2, -p.y * height / 2);
}
function cueMatrix(node, instance) {
  const matrix = node.matrixWorld.clone();
  if (instance !== undefined) { const local = new THREE.Matrix4(); node.getMatrixAt(instance, local); matrix.multiply(local); }
  return matrix;
}
// Project actual geometry vertices and the full rendered matrix. A distance or
// decomposed scale formula could accidentally reproduce the original bug.
function expectPixelGeometry(f, node, expectedScale, instance, height = f.height) {
  const world = cueMatrix(node, instance), center = new THREE.Vector3().applyMatrix4(world);
  const centerPx = pixels(f, center, height), vertices = node.geometry.attributes.position;
  let boundary = 0;
  for (let i = 0; i < vertices.count; i++) {
    const local = new THREE.Vector3().fromBufferAttribute(vertices, i);
    const distance = Math.hypot(local.x, local.y);
    if (distance < .000001) continue;
    const rendered = pixels(f, local.clone().applyMatrix4(world), height);
    expect(rendered.distanceTo(centerPx)).toBeCloseTo(expectedScale * distance, 3); boundary++;
  }
  expect(boundary).toBeGreaterThan(5); expect(world.elements.every(Number.isFinite)).toBe(true);
  return center;
}
function sourceTip(f, side) {
  const source = f.root.userData.sources[side]; let node;
  f.bird.traverse(part => { if (part.uuid === source.nodeUuid) node = part; });
  return new THREE.Vector3().fromBufferAttribute(node.geometry.attributes.position, source.vertexIndex).applyMatrix4(node.matrixWorld);
}
function sampledTip(f, side, coordinate) {
  const wrapped = ((coordinate % 64) + 64) % 64, first = Math.floor(wrapped), blend = wrapped - first;
  const attribute = f.cycle().geometry.attributes.position;
  const start = side * 128 + first * 2;
  return new THREE.Vector3().fromBufferAttribute(attribute, start)
    .lerp(new THREE.Vector3().fromBufferAttribute(attribute, start + 1), blend).applyMatrix4(f.bird.matrixWorld);
}
function expectFiniteGuides(f) {
  for (let side = 0; side < 2; side++) {
    expect(f.dot(side).matrix.elements.every(Number.isFinite)).toBe(true);
    expect(f.arrow(side).matrix.elements.every(Number.isFinite)).toBe(true);
    expect([...f.marks(side).instanceMatrix.array].every(Number.isFinite)).toBe(true);
  }
}
function expectHidden(f) {
  expect(f.root.visible).toBe(false); expect(f.root.userData.followSide).toBeNull();
  expect(f.cycle().geometry.drawRange.count).toBe(0);
  for (let side = 0; side < 2; side++) {
    expect(f.dot(side).visible).toBe(false); expect(f.marks(side).visible).toBe(false); expect(f.arrow(side).visible).toBe(false);
    expect(f.marks(side).userData.activeCheckpoint).toBeNull(); expect(f.arrow(side).userData.phase).toBeNull();
  }
  expectFiniteGuides(f);
}
function pose(f) {
  const result = [];
  f.bird.traverse(node => result.push([node.uuid, node.position.toArray(), node.rotation.toArray(), node.scale.toArray(), node.matrix.toArray(), node.matrixWorld.toArray()]));
  return result;
}


describe('Wingtip observation cues keep their actual CSS size', () => {
  it.each(ids)('projects %s dots and rings at fixed radii across view, zoom and mirrored nonuniform parents', id => {
    const f = fixture(id);
    const cases = [[390, 390 / 678, 1, false], [678, 678 / 390, 1.65, true]];
    for (const [height, aspect, zoom, transformed] of cases) {
      f.camera.aspect = aspect; f.camera.zoom = zoom; f.camera.updateProjectionMatrix();
      if (transformed) {
        f.flock.scale.set(-1.35, .7, 1.2); f.flock.rotation.set(.15, -.2, .11);
        f.rig.scale.set(1.2, .85, 1.1); f.rig.rotation.set(.05, -.06, .03);
      }
      f.scene.updateMatrixWorld(true);
      f.update({ height, dark: transformed });
      for (let side = 0; side < 2; side++) {
        expect(f.dot(side).visible).toBe(true); expect(f.marks(side).visible).toBe(true);
        const dot = expectPixelGeometry(f, f.dot(side), 6);
        expect(dot.distanceTo(sourceTip(f, side))).toBeLessThan(.000002);
        for (let checkpoint = 0; checkpoint < 8; checkpoint++) {
          const center = expectPixelGeometry(f, f.marks(side), checkpoint === 3 ? 8 : 3.2, checkpoint);
          expect(center.distanceTo(sampledTip(f, side, checkpoint * 8))).toBeLessThan(.000003);
        }
        expect(f.marks(side).userData.activeCheckpoint).toBe(3);
      }
    }
  });

  it('moves the 8px selected halo between every checkpoint while the live dots remain 6px', () => {
    const f = fixture('monarch');
    for (let checkpoint = 0; checkpoint < 8; checkpoint++) {
      f.camera.zoom = .7 + checkpoint * .17; f.camera.updateProjectionMatrix();
      f.update({ checkpoint, phase: checkpoint * tau / 8 });
      for (let side = 0; side < 2; side++) {
        const dot = expectPixelGeometry(f, f.dot(side), 6);
        const halo = expectPixelGeometry(f, f.marks(side), 8, checkpoint);
        expect(dot.distanceTo(halo)).toBeLessThan(.000003);
        for (let mark = 0; mark < 8; mark++) if (mark !== checkpoint) expectPixelGeometry(f, f.marks(side), 3.2, mark);
      }
    }
  });

  it('keeps projected chevrons at 8px scale and aligned with increasing phase under nonuniform transforms', () => {
    const f = fixture();
    f.flock.scale.set(-1.4, .65, 1.15); f.flock.rotation.set(.1, -.2, .15);
    f.rig.scale.set(1.25, .8, 1.1); f.rig.rotation.set(.03, -.05, .02);
    f.camera.aspect = 390 / 678; f.camera.zoom = 1.7; f.camera.updateProjectionMatrix();
    let visible = 0;
    for (const phase of [.3, .7, 1.2, 1.8, 2.4, 3.2, 4.1, 4.8, 5.5, 6.1]) {
      f.update({ phase, checkpoint: null });
      for (let side = 0; side < 2; side++) {
        const arrow = f.arrow(side); if (!arrow.visible) continue; visible++;
        const center = expectPixelGeometry(f, arrow, 8);
        const coordinate = arrow.userData.anchorPhase / tau * 64;
        expect(center.distanceTo(sampledTip(f, side, coordinate))).toBeLessThan(.000003);
        const before = pixels(f, sampledTip(f, side, coordinate - .5)), after = pixels(f, sampledTip(f, side, coordinate + .5));
        const expected = after.sub(before).normalize();
        const world = cueMatrix(arrow), origin = pixels(f, new THREE.Vector3().applyMatrix4(world));
        const axis = pixels(f, new THREE.Vector3(1, 0, 0).applyMatrix4(world)).sub(origin).normalize();
        expect(axis.distanceTo(expected)).toBeLessThan(.000003);
        expect(new THREE.Vector2(arrow.userData.projectedDirection[0], -arrow.userData.projectedDirection[1]).distanceTo(expected)).toBeLessThan(.000003);
      }
    }
    expect(visible).toBeGreaterThan(3);
  });

  it.each([undefined, 0, -1, NaN, Infinity])('preserves the original 390px height fallback for %s', height => {
    const f = fixture(); f.update({ height });
    for (let side = 0; side < 2; side++) expectPixelGeometry(f, f.dot(side), 6, undefined, 390);
  });

  it('keeps the original nine-argument API without inventing a phase or selected checkpoint', () => {
    const f = fixture(); f.root.updatePath(true, 'study', f.bird, 'canada_goose', 2, f.camera, false, 390); f.scene.updateMatrixWorld(true);
    expect(f.root.visible).toBe(true);
    for (let side = 0; side < 2; side++) {
      expectPixelGeometry(f, f.dot(side), 6);
      expect(f.arrow(side).visible).toBe(false); expect(f.arrow(side).userData.phase).toBeNull();
      expect(f.marks(side).userData.activeCheckpoint).toBeNull();
      for (let mark = 0; mark < 8; mark++) expectPixelGeometry(f, f.marks(side), 3.2, mark);
    }
  });

  it.each([
    ['missing camera', f => ({ chosenCamera: null })],
    ['orthographic camera', f => ({ chosenCamera: new THREE.OrthographicCamera(-1, 1, 1, -1) })],
    ['zero aspect', f => { f.camera.aspect = 0; }],
    ['near plane', f => { f.camera.near = 0; }],
    ['far plane', f => { f.camera.far = f.camera.near; }],
    ['zero horizontal projection', f => { f.camera.projectionMatrix.elements[0] = 0; }],
    ['negative horizontal projection', f => { f.camera.projectionMatrix.elements[0] = -1; }],
    ['singular projection', f => { f.camera.projectionMatrix.elements[14] = 0; }],
    ['zero projection', f => { f.camera.projectionMatrix.elements[5] = 0; }],
    ['negative projection', f => { f.camera.projectionMatrix.elements[5] = -1; }],
    ['nonfinite projection', f => { f.camera.projectionMatrix.elements[5] = NaN; }],
    ['nonfinite camera', f => { f.camera.position.x = NaN; }],
    ['singular camera', f => { f.rig.scale.x = 0; }],
    ['singular body', f => { f.flock.scale.z = 0; }]
  ])('clears all visible cue metadata for invalid %s without writing nonfinite matrices', (_, change) => {
    const f = fixture(), resources = pool(f.root), options = change(f) || {};
    f.update(options); expectHidden(f); expect(pool(f.root)).toEqual(resources);
  });

  it('clips cue planes behind the camera and outside near/far depth while retaining the cached path', () => {
    const f = fixture(), body = f.bird.getWorldPosition(new THREE.Vector3());
    f.camera.position.copy(body).add(new THREE.Vector3(0, 0, 6));
    for (const mode of ['behind', 'near', 'far']) {
      f.camera.near = .1; f.camera.far = 900;
      f.camera.lookAt(mode === 'behind' ? body.clone().add(new THREE.Vector3(0, 0, 12)) : body);
      if (mode === 'near') f.camera.near = 20;
      if (mode === 'far') f.camera.far = 2;
      f.camera.updateProjectionMatrix(); f.update();
      expect(f.root.visible).toBe(true); expect(f.root.userData.available).toBe(true);
      for (let side = 0; side < 2; side++) {
        expect(f.dot(side).visible).toBe(false); expect(f.marks(side).visible).toBe(false); expect(f.arrow(side).visible).toBe(false);
        expect(f.marks(side).userData.activeCheckpoint).toBeNull();
      }
      expectFiniteGuides(f);
    }
    expect(f.root.userData.buildVersion).toBe(1);
  });

  it('filters one followed side without rebuilding its sampled path or changing pixel sizes', () => {
    const f = fixture(); const positions = f.cycle().geometry.attributes.position.array.slice();
    for (const follow of [0, 1, undefined]) {
      f.update({ follow }); expect(f.root.userData.followSide).toBe(follow === undefined ? null : follow);
      for (let side = 0; side < 2; side++) {
        expect(f.dot(side).visible).toBe(follow === undefined || side === follow);
        expect(f.marks(side).visible).toBe(follow === undefined || side === follow);
        if (f.dot(side).visible) expectPixelGeometry(f, f.dot(side), 6);
      }
      expect(f.cycle().geometry.attributes.position.array).toEqual(positions);
    }
    expect(f.root.userData.buildVersion).toBe(1);
  });

  it('reuses all 7 resources and fixed buffers without changing articulation, source phase or the cached path', () => {
    const f = fixture(); const resources = pool(f.root), fixed = { ...f.cycle().geometry.attributes };
    const matrices = [f.marks(0).instanceMatrix, f.marks(1).instanceMatrix];
    const frozen = f.cycle().geometry.attributes.position.array.slice(), original = pose(f), phase = f.bird.userData.lastRenderedWingPhase;
    const apply = vi.spyOn(f.bird.userData, 'applyWingPhase');
    for (let index = 0; index < 40; index++) {
      f.camera.zoom = .65 + index * .02; f.camera.updateProjectionMatrix();
      f.root.updatePath(true, 'study', f.bird, 'canada_goose', 2, f.camera, !!(index % 2), 390, f.phase, 3, index % 2);
      f.scene.updateMatrixWorld(true);
      expect(pool(f.root)).toEqual(resources); expect(resources.size).toBe(7);
      for (const key of Object.keys(fixed)) expect(f.cycle().geometry.attributes[key]).toBe(fixed[key]);
      expect(f.marks(0).instanceMatrix).toBe(matrices[0]); expect(f.marks(1).instanceMatrix).toBe(matrices[1]);
    }
    expect(apply).not.toHaveBeenCalled(); expect(pose(f)).toEqual(original);
    expect(f.bird.userData.lastRenderedWingPhase).toBe(phase);
    expect(f.cycle().geometry.attributes.position.array).toEqual(frozen); expect(f.root.userData.buildVersion).toBe(1);
    apply.mockRestore();
    const events = [...resources].map(resource => { const listener = vi.fn(); resource.addEventListener('dispose', listener); return listener; });
    f.root.invalidate(); expectHidden(f); expect(pool(f.root)).toEqual(resources);
    expect(events.every(listener => listener.mock.calls.length === 0)).toBe(true);
    dispose(f.scene); for (const listener of events) expect(listener).toHaveBeenCalledTimes(1);
  });
});
