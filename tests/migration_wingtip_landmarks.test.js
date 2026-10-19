import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const sourcePath = process.env.MIGRATION_LANDMARK_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing canonical landmarks section: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const createFlyer = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn createMigrationFlyer;')(num);
const createPath = new Function(section('      function createMigrationWingtipPath(', '      function initMigrationFlightScene(') + '\nreturn createMigrationWingtipPath;')();
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const tau = Math.PI * 2;
function fixture(id = 'canada_goose', individual = 1) {
  const scene = new THREE.Scene(), flock = new THREE.Group();
  flock.position.set(0.4, 1.2, 0.1); flock.rotation.y = 0.04; scene.add(flock);
  const bird = createFlyer(THREE, { id }, individual); flock.add(bird);
  bird.position.set(0, 0.5, -5); bird.userData.baseY = 0.5;
  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 900);
  camera.position.set(5, 4, 3); camera.lookAt(bird.position); camera.updateMatrixWorld(true);
  const root = createPath(THREE); scene.add(root);
  let phase = 1.234;
  bird.userData.applyWingPhase(phase); scene.updateMatrixWorld(true);
  return {
    scene, flock, bird, camera, root,
    update(nextPhase = phase, dark = false, height = 390, enabled = true, mode = 'study', selected = bird, species = id) {
      phase = nextPhase;
      root.updatePath(enabled, mode, selected, species, individual, camera, dark, height, phase);
      scene.updateMatrixWorld(true);
    },
    marks(side) { return root.getObjectByName(side ? 'migration-wingtip-right-landmarks' : 'migration-wingtip-left-landmarks'); },
    arrow(side) { return root.getObjectByName(side ? 'migration-wingtip-right-direction' : 'migration-wingtip-left-direction'); },
    dot(side) { return root.getObjectByName(side ? 'migration-wingtip-right-point' : 'migration-wingtip-left-point'); },
    cycle() { return root.getObjectByName('migration-wingtip-cycle'); }
  };
}
function anchor(bird, side) {
  let mesh = bird.userData.primaries[side];
  if (!mesh) bird.userData.wings[side].traverse(part => { if (part.name === 'migration-monarch-forewing') mesh = part; });
  const vertices = mesh.geometry.attributes.position;
  const count = mesh.geometry.userData.monarchBoundaryVertexCount || vertices.count;
  let index = 0;
  for (let i = 1; i < count; i++) {
    if (vertices.getX(i) > vertices.getX(index) || (vertices.getX(i) === vertices.getX(index) && vertices.getZ(i) > vertices.getZ(index))) index = i;
  }
  return { mesh, point: new THREE.Vector3().fromBufferAttribute(vertices, index) };
}
function independentSample(f, side, coordinate) {
  const wrapped = ((coordinate % 64) + 64) % 64, first = Math.floor(wrapped), blend = wrapped - first;
  const inverse = f.bird.matrixWorld.clone().invert(), tip = anchor(f.bird, side);
  f.bird.userData.applyWingPhase(first / 64 * tau); f.bird.updateWorldMatrix(true, true);
  const a = tip.point.clone().applyMatrix4(tip.mesh.matrixWorld).applyMatrix4(inverse);
  f.bird.userData.applyWingPhase(((first + 1) % 64) / 64 * tau); f.bird.updateWorldMatrix(true, true);
  const b = tip.point.clone().applyMatrix4(tip.mesh.matrixWorld).applyMatrix4(inverse);
  return a.lerp(b, blend);
}
function decomposeInstance(mesh, index) {
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
  mesh.getMatrixAt(index, matrix); matrix.decompose(position, quaternion, scale);
  return { matrix, position, quaternion, scale };
}
function resources(root) {
  const result = new Set(); root.traverse(node => { if (node.geometry) result.add(node.geometry); if (node.material) result.add(node.material); }); return result;
}
function walk(node, predicate, output = []) {
  if (!node || typeof node !== 'object') return output;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, output)); return output; }
  if (predicate(node)) output.push(node);
  walk(node.props?.children, predicate, output); return output;
}
beforeEach(() => resetStemLab());
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('Wingtip path cycle landmarks and direction', () => {
  it.each(['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit', 'monarch'])('puts all %s hollow marks on independently articulated eighth-cycle outer tips', id => {
    const f = fixture(id); f.update();
    expect(f.root.userData.landmarkSampleIndices).toEqual([0, 8, 16, 24, 32, 40, 48, 56]);
    expect(f.root.userData.landmarkCountPerSide).toBe(8);
    expect(f.marks(0).isInstancedMesh).toBe(true); expect(f.marks(0).count).toBe(8);
    expect(f.marks(1).count).toBe(8); expect(f.marks(0).geometry).toBe(f.marks(1).geometry);
    for (let side = 0; side < 2; side++) for (let checkpoint = 0; checkpoint < 8; checkpoint++) {
      const actual = decomposeInstance(f.marks(side), checkpoint).position;
      const expected = independentSample(f, side, checkpoint * 8);
      expect(actual.distanceTo(expected)).toBeLessThan(0.000001);
    }
  });

  it('billboards hollow rings toward the camera with a smaller CSS radius than live dots across phone and desktop heights', () => {
    const f = fixture('monarch');
    for (const height of [390, 678]) for (const x of [-5, 2, 6]) {
      f.camera.position.set(x, 4, 3); f.camera.lookAt(f.bird.position); f.camera.updateMatrixWorld(true); f.update(1.234, false, height);
      const cameraNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(f.camera.getWorldQuaternion(new THREE.Quaternion()));
      for (let side = 0; side < 2; side++) for (let checkpoint = 0; checkpoint < 8; checkpoint++) {
        const ring = decomposeInstance(f.marks(side), checkpoint);
        const world = ring.position.clone().applyMatrix4(f.bird.matrixWorld);
        const radiusWorld = ring.scale.x * f.bird.getWorldScale(new THREE.Vector3()).x;
        const cssRadius = radiusWorld / (world.distanceTo(f.camera.position) * 2 * Math.tan(f.camera.fov * Math.PI / 360) / height);
        expect(cssRadius).toBeCloseTo(3.2, 5);
        expect(ring.scale.x).toBeLessThan(f.dot(side).scale.x);
        const ringNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(ring.quaternion).transformDirection(f.bird.matrixWorld);
        expect(ringNormal.dot(cameraNormal)).toBeCloseTo(1, 5);
      }
    }
  });

  it.each(['canada_goose', 'monarch'])('anchors %s chevrons ahead on the real sampled cycle with increasing-phase tangents', id => {
    const f = fixture(id);
    for (const phase of [0, 1.234, Math.PI * 1.5, tau - 0.01, -0.03, tau * 17 + 0.7]) {
      f.bird.userData.applyWingPhase(phase); f.scene.updateMatrixWorld(true); f.update(phase);
      for (let side = 0; side < 2; side++) {
        const arrow = f.arrow(side), normalized = ((phase % tau) + tau) % tau;
        const coordinate = normalized / tau * 64 + 2;
        const expectedPosition = independentSample(f, side, coordinate);
        const expectedTangent = independentSample(f, side, coordinate + 0.5).sub(independentSample(f, side, coordinate - 0.5)).normalize();
        expect(arrow.position.distanceTo(expectedPosition)).toBeLessThan(0.000001);
        expect(new THREE.Vector3().fromArray(arrow.userData.directionVector).distanceTo(expectedTangent)).toBeLessThan(0.00002);
        expect(arrow.userData.phase).toBeCloseTo(normalized, 10);
        expect(arrow.userData.anchorPhase).toBeCloseTo((coordinate / 64 * tau) % tau, 10);
        if (arrow.visible) {
          const cameraQ = f.camera.getWorldQuaternion(new THREE.Quaternion());
          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraQ), up = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraQ);
          const before = independentSample(f, side, coordinate - 0.5).applyMatrix4(f.bird.matrixWorld).project(f.camera);
          const after = independentSample(f, side, coordinate + 0.5).applyMatrix4(f.bird.matrixWorld).project(f.camera);
          const expectedProjected = new THREE.Vector2((after.x - before.x) * f.camera.aspect, after.y - before.y).normalize();
          const glyphDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(arrow.quaternion).transformDirection(f.bird.matrixWorld);
          const actualProjected = new THREE.Vector2(glyphDirection.dot(right), glyphDirection.dot(up)).normalize();
          expect(actualProjected.distanceTo(expectedProjected)).toBeLessThan(0.00002);
        }
      }
    }
  });

  it('follows perspective-projected curve direction at off-axis tips across portrait and landscape views', () => {
    const f = fixture('canada_goose');
    const body = f.bird.getWorldPosition(new THREE.Vector3());
    let maxPerspectiveDifference = 0, visible = 0;
    for (const aspect of [390 / 678, 678 / 390]) {
      f.camera.aspect = aspect; f.camera.fov = 70; f.camera.updateProjectionMatrix();
      f.camera.position.copy(body).add(new THREE.Vector3(1.5, 1, 3));
      f.camera.lookAt(body.clone().add(new THREE.Vector3(-1.5, 0.7, 0)));
      f.camera.updateMatrixWorld(true);
      for (const phase of [0.7, 1.234, 3.7, 5.2]) {
        f.bird.userData.applyWingPhase(phase); f.scene.updateMatrixWorld(true); f.update(phase);
        const cameraQ = f.camera.getWorldQuaternion(new THREE.Quaternion());
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraQ), up = new THREE.Vector3(0, 1, 0).applyQuaternion(cameraQ);
        for (let side = 0; side < 2; side++) {
          const arrow = f.arrow(side); if (!arrow.visible) continue; visible++;
          const coordinate = phase / tau * 64 + 2;
          const before = independentSample(f, side, coordinate - 0.5).applyMatrix4(f.bird.matrixWorld);
          const after = independentSample(f, side, coordinate + 0.5).applyMatrix4(f.bird.matrixWorld);
          const worldDirection = after.clone().sub(before).normalize();
          const oldApproximation = new THREE.Vector2(worldDirection.dot(right), worldDirection.dot(up)).normalize();
          before.project(f.camera); after.project(f.camera);
          const expected = new THREE.Vector2((after.x - before.x) * aspect, after.y - before.y).normalize();
          maxPerspectiveDifference = Math.max(maxPerspectiveDifference, expected.distanceTo(oldApproximation));
          const actualWorld = new THREE.Vector3(1, 0, 0).applyQuaternion(arrow.quaternion).transformDirection(f.bird.matrixWorld);
          const actual = new THREE.Vector2(actualWorld.dot(right), actualWorld.dot(up)).normalize();
          expect(actual.distanceTo(expected)).toBeLessThan(0.00002);
          expect(new THREE.Vector2().fromArray(arrow.userData.projectedDirection).distanceTo(expected)).toBeLessThan(0.00002);
          expect(arrow.matrix.elements.every(Number.isFinite)).toBe(true);
        }
      }
    }
    expect(visible).toBeGreaterThan(4); expect(maxPerspectiveDifference).toBeGreaterThan(0.02);
  });

  it('hides arrows behind the camera or across its near plane without writing nonfinite transforms', () => {
    const f = fixture('monarch'); f.update(1.234);
    const body = f.bird.getWorldPosition(new THREE.Vector3());
    f.camera.position.copy(body).add(new THREE.Vector3(0, 0, 4));
    f.camera.lookAt(body.clone().add(new THREE.Vector3(0, 0, 8))); f.camera.updateMatrixWorld(true);
    f.update(1.234);
    expect(f.arrow(0).visible).toBe(false); expect(f.arrow(1).visible).toBe(false);
    for (let side = 0; side < 2; side++) expect(f.arrow(side).matrix.elements.every(Number.isFinite)).toBe(true);
    f.camera.lookAt(body); f.camera.near = 20; f.camera.updateProjectionMatrix(); f.camera.updateMatrixWorld(true); f.update(1.234);
    expect(f.arrow(0).visible).toBe(false); expect(f.arrow(1).visible).toBe(false);
    expect(f.root.visible).toBe(true); expect(f.marks(0).visible).toBe(true);
  });

  it('hides edge-on arrow projections safely while preserving rings, path and current tip dots', () => {
    const f = fixture('monarch'); f.update(1.234);
    const arrow = f.arrow(0), tangent = new THREE.Vector3().fromArray(arrow.userData.directionVector).transformDirection(f.bird.matrixWorld);
    const anchorWorld = arrow.position.clone().applyMatrix4(f.bird.matrixWorld);
    f.camera.position.copy(anchorWorld).addScaledVector(tangent, 6); f.camera.lookAt(anchorWorld); f.camera.updateMatrixWorld(true);
    f.update(1.234);
    expect(f.arrow(0).visible).toBe(false); expect(f.root.visible).toBe(true); expect(f.marks(0).visible).toBe(true); expect(f.dot(0).visible).toBe(true);
    expect(f.arrow(0).matrix.elements.every(Number.isFinite)).toBe(true);
  });

  it('accepts the original update API without inferring a fake direction phase', () => {
    const f = fixture(); f.root.updatePath(true, 'study', f.bird, 'canada_goose', 1, f.camera, false, 390);
    expect(f.root.visible).toBe(true); expect(f.arrow(0).visible).toBe(false); expect(f.arrow(1).visible).toBe(false);
    expect(f.arrow(0).userData.phase).toBeNull(); expect(f.arrow(0).userData.anchorPhase).toBeNull();
    expect(f.marks(0).count).toBe(8); expect(f.cycle().geometry.drawRange.count).toBe(256);
  });

  it('preserves live articulation, frozen path, resource identity and shared theme materials over repeated updates', () => {
    const f = fixture(); f.update();
    const pool = resources(f.root), frozen = Array.from(f.cycle().geometry.attributes.position.array);
    const attrs = { ...f.cycle().geometry.attributes }, instances = [f.marks(0).instanceMatrix, f.marks(1).instanceMatrix];
    const before = [];
    f.bird.traverse(node => before.push({ node, rotation: node.rotation.toArray(), position: node.position.toArray(), scale: node.scale.toArray() }));
    const apply = vi.spyOn(f.bird.userData, 'applyWingPhase');
    for (let i = 0; i < 40; i++) { f.camera.position.x += 0.01; f.camera.lookAt(f.bird.position); f.camera.updateMatrixWorld(true); f.update(i * 0.13, i % 2 === 0); }
    expect(apply).not.toHaveBeenCalled(); expect(resources(f.root)).toEqual(pool); expect(pool.size).toBe(7);
    expect(f.root.userData.buildVersion).toBe(1); expect(Array.from(f.cycle().geometry.attributes.position.array)).toEqual(frozen);
    for (const key of Object.keys(attrs)) expect(f.cycle().geometry.attributes[key]).toBe(attrs[key]);
    for (const state of before) { expect(state.node.rotation.toArray()).toEqual(state.rotation); expect(state.node.position.toArray()).toEqual(state.position); expect(state.node.scale.toArray()).toEqual(state.scale); }
    for (let side = 0; side < 2; side++) {
      expect(f.marks(side).instanceMatrix).toBe(instances[side]);
      expect(f.marks(side).material).toBe(f.dot(side).material); expect(f.arrow(side).material).toBe(f.dot(side).material);
      expect(f.dot(side).material.side).toBe(THREE.DoubleSide);
      expect(f.dot(side).material.color.getHex()).toBe(side === 0 ? 0x021016 : 0x240c01);
    }
    expect(f.marks(0).geometry.parameters.innerRadius).toBeGreaterThan(0);
  });

  it('keeps all pooled resources owned by the scene until one final deduplicated disposal', () => {
    const f = fixture(); f.update();
    const pool = resources(f.root), events = new Map([...pool].map(resource => [resource, 0]));
    for (const resource of pool) resource.addEventListener('dispose', () => events.set(resource, events.get(resource) + 1));
    f.root.invalidate(); expect(f.root.parent).toBe(f.scene); expect([...events.values()].every(count => count === 0)).toBe(true);
    expect(f.arrow(0).visible).toBe(false); expect(f.arrow(0).userData.phase).toBeNull();
    f.update(1.234); expect(f.root.visible).toBe(true); expect(resources(f.root)).toEqual(pool);
    dispose(f.scene); expect([...events.values()].every(count => count === 1)).toBe(true);
  });

  it('hides the entire guide for opt-out, other cameras and missing readiness without changing saved source buffers', () => {
    const f = fixture(); f.update(); const buffer = Array.from(f.cycle().geometry.attributes.position.array), pool = resources(f.root);
    for (const [enabled, mode] of [[false, 'study'], [true, 'chase'], [true, 'aerial'], [true, 'side']]) {
      f.update(1.234, false, 390, enabled, mode); expect(f.root.visible).toBe(false);
    }
    expect(resources(f.root)).toEqual(pool); expect(Array.from(f.cycle().geometry.attributes.position.array)).toEqual(buffer);
    f.update(); expect(f.root.visible).toBe(true);
  });

  it('rebuilds markers for a new individual without reallocating marker meshes or geometry', () => {
    const f = fixture(); f.update(); const marks = [f.marks(0), f.marks(1)], pool = resources(f.root);
    const other = createFlyer(THREE, { id: 'monarch' }, 2); f.flock.add(other); f.scene.updateMatrixWorld(true);
    f.update(0.3, false, 390, true, 'study', other, 'monarch');
    expect(f.root.userData.sourceBirdUuid).toBe(other.uuid); expect(f.root.userData.buildVersion).toBe(2);
    expect(f.marks(0)).toBe(marks[0]); expect(f.marks(1)).toBe(marks[1]); expect(resources(f.root)).toEqual(pool);
    f.root.invalidate(); f.update(0.3, false, 390, false); expect(f.root.visible).toBe(false); expect(f.arrow(0).visible).toBe(false);
  });

  it('explains equal cycle intervals and cycle direction only inside the existing native path legend', () => {
    const tool = loadTool(sourcePath, 'migration');
    let state = { tab: 'flight3d', flightCamera: 'study', flightShowWingtipPath: false, flightStudyObservations: { drafts: { 'canada_goose:head': 'My draft stays.' } }, reflection: 'Keep my words.' }, tree;
    const writes = [], ctx = makeCtx({ update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; } });
    function draw() { ctx.toolData = { migration: state }; return ReactDOMServer.renderToStaticMarkup(React.createElement(function View() { tree = tool.render(ctx); return tree; })); }
    expect(draw()).not.toContain('Hollow marks:');
    const control = walk(tree, node => node.props?.['data-study-wingtip-path'])[0];
    const checkbox = walk(control, node => node.type === 'input')[0];
    expect(checkbox.props.type).toBe('checkbox'); checkbox.props.onChange({ target: { checked: true } });
    const html = draw(); expect(html).toContain('Hollow marks: eight equal cycle intervals');
    expect(html).toContain('Arrowheads: cycle direction, not migration heading');
    expect(writes).toEqual([{ flightShowWingtipPath: true }]);
    expect(state.reflection).toBe('Keep my words.'); expect(state.flightStudyObservations.drafts['canada_goose:head']).toBe('My draft stays.');
    expect(walk(tree, node => node.props?.['data-wingtip-path-legend'])).toHaveLength(1);
  });
});
