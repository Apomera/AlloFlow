import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), process.env.MIGRATION_DIRECTION_CLEARANCE_CANDIDATE || 'stem_lab/stem_tool_migration.js'), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing canonical direction clearance source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') +
  '\nreturn { createMigrationFlyer, migrationStudyDistance };')(num);
function pathFactory(float64 = Float64Array) {
  return new Function('Float64Array', section('      function createMigrationWingtipPath(', '      function initMigrationFlightScene(') +
    '\nreturn createMigrationWingtipPath;')(float64);
}
const makePath = pathFactory();
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const ids = ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit', 'monarch'];
const tau = Math.PI * 2, roots = new Set();
const sizes = [{ name: 'desktop', width: 804, height: 678 }, { name: 'phone', width: 388, height: 391 }];

afterEach(() => { for (const root of roots) dispose(root); roots.clear(); });

function fixture(id = 'canada_goose', library = THREE, create = makePath) {
  const scene = new THREE.Scene(), flock = new THREE.Group(), rig = new THREE.Group(); scene.add(flock, rig); roots.add(scene);
  const bird = model.createMigrationFlyer(THREE, { id }, 2); flock.add(bird);
  const camera = new THREE.PerspectiveCamera(54, 804 / 678, .1, 900); rig.add(camera);
  const root = create(library); scene.add(root);
  const f = { scene, flock, rig, bird, camera, root, id, width: 804, height: 678, phase: Math.PI / 2, checkpoint: 2,
    arrow(side) { return root.getObjectByName(side ? 'migration-wingtip-right-direction' : 'migration-wingtip-left-direction'); },
    dot(side) { return root.getObjectByName(side ? 'migration-wingtip-right-point' : 'migration-wingtip-left-point'); },
    marks(side) { return root.getObjectByName(side ? 'migration-wingtip-right-landmarks' : 'migration-wingtip-left-landmarks'); },
    cycle() { return root.getObjectByName('migration-wingtip-cycle'); },
    view({ width = f.width, height = f.height, yaw = 0, pitch = 15, zoom = 1 } = {}) {
      f.width = width; f.height = height; camera.aspect = width / height; camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
      const center = bird.getWorldPosition(new THREE.Vector3()), radius = model.migrationStudyDistance(bird, camera, zoom);
      const y = yaw * Math.PI / 180, p = pitch * Math.PI / 180;
      const position = center.clone().add(new THREE.Vector3(Math.sin(y) * Math.cos(p) * radius,
        Math.sin(p) * radius, Math.cos(y) * Math.cos(p) * radius));
      camera.position.copy(rig.worldToLocal(position)); camera.lookAt(center); scene.updateMatrixWorld(true);
    },
    pose(phase = f.phase) {
      f.phase = phase; bird.userData.applyWingPhase(phase); bird.userData.lastRenderedWingPhase = phase; scene.updateMatrixWorld(true);
    },
    update(options = {}) {
      const phase = Object.hasOwn(options, 'phase') ? options.phase : f.phase;
      const checkpoint = Object.hasOwn(options, 'checkpoint') ? options.checkpoint : f.checkpoint;
      f.phase = phase; f.checkpoint = checkpoint;
      root.updatePath(options.enabled !== false, options.mode || 'study', Object.hasOwn(options, 'bird') ? options.bird : bird,
        id, 2, Object.hasOwn(options, 'camera') ? options.camera : camera, options.dark === true,
        Object.hasOwn(options, 'height') ? options.height : f.height, phase, checkpoint, options.follow, f.width);
      scene.updateMatrixWorld(true);
    }
  };
  f.view(); f.pose(); f.update(); return f;
}

function pixel(f, world) {
  const value = world.clone().project(f.camera);
  return new THREE.Vector2(value.x * f.width / 2, -value.y * f.height / 2);
}
function cueWorld(node, instance) {
  const matrix = node.matrixWorld.clone();
  if (instance !== undefined) { const local = new THREE.Matrix4(); node.getMatrixAt(instance, local); matrix.multiply(local); }
  return matrix;
}
function cueCenter(f, node, instance) { return pixel(f, new THREE.Vector3().applyMatrix4(cueWorld(node, instance))); }
function actualRadius(f, node, instance) {
  const matrix = cueWorld(node, instance), center = cueCenter(f, node, instance), attribute = node.geometry.attributes.position;
  let radius = 0;
  for (let i = 0; i < attribute.count; i++) radius = Math.max(radius,
    pixel(f, new THREE.Vector3().fromBufferAttribute(attribute, i).applyMatrix4(matrix)).distanceTo(center));
  return radius;
}
function edgeDistance(point, a, b) {
  const edge = b.clone().sub(a), fraction = edge.lengthSq() ? Math.max(0, Math.min(1, point.clone().sub(a).dot(edge) / edge.lengthSq())) : 0;
  return point.distanceTo(a.clone().addScaledVector(edge, fraction));
}
function triangleDistance(point, a, b, c) {
  // Independent distances to the actual rendered triangle, including its
  // interior. A center separation alone would miss the broad chevron arms.
  const orientation = (u, v) => (v.x - u.x) * (point.y - u.y) - (v.y - u.y) * (point.x - u.x);
  const signs = [orientation(a, b), orientation(b, c), orientation(c, a)];
  if (signs.every(value => value >= 0) || signs.every(value => value <= 0)) return 0;
  return Math.min(edgeDistance(point, a, b), edgeDistance(point, b, c), edgeDistance(point, c, a));
}
function arrowTriangles(f, side) {
  const arrow = f.arrow(side), vertices = arrow.geometry.attributes.position, triangles = [];
  for (let i = 0; i < vertices.count; i += 3) {
    const triangle = [];
    for (let j = 0; j < 3; j++) triangle.push(pixel(f,
      new THREE.Vector3().fromBufferAttribute(vertices, i + j).applyMatrix4(arrow.matrixWorld)));
    triangles.push(triangle);
  }
  return triangles;
}
function sampledTip(f, side, coordinate) {
  const wrapped = ((coordinate % 64) + 64) % 64, first = Math.floor(wrapped), fraction = wrapped - first;
  const positions = f.cycle().geometry.attributes.position, offset = side * 128 + first * 2;
  return new THREE.Vector3().fromBufferAttribute(positions, offset)
    .lerp(new THREE.Vector3().fromBufferAttribute(positions, offset + 1), fraction).applyMatrix4(f.bird.matrixWorld);
}
function assertArrow(f, side) {
  const arrow = f.arrow(side), normalized = ((f.phase % tau) + tau) % tau;
  expect(arrow.matrix.elements.every(Number.isFinite)).toBe(true);
  expect(arrow.userData.phase).toBeCloseTo(normalized, 10);
  if (!arrow.visible) { expect(arrow.userData.anchorPhase).toBeNull(); return false; }
  const anchor = arrow.userData.anchorPhase, advance = ((anchor - normalized + tau) % tau) / tau * 64;
  expect(advance).toBeGreaterThanOrEqual(2 - 1e-8); expect(advance).toBeLessThanOrEqual(8 + 1e-8);
  expect(advance * 2).toBeCloseTo(Math.round(advance * 2), 8);
  const coordinate = anchor / tau * 64;
  const center = new THREE.Vector3().applyMatrix4(arrow.matrixWorld);
  expect(center.distanceTo(sampledTip(f, side, coordinate))).toBeLessThan(.000003);
  const before = sampledTip(f, side, coordinate - .5), after = sampledTip(f, side, coordinate + .5);
  const expectedLocal = after.clone().sub(before).transformDirection(f.bird.matrixWorld.clone().invert());
  expect(new THREE.Vector3().fromArray(arrow.userData.directionVector).distanceTo(expectedLocal)).toBeLessThan(.00002);
  const expectedScreen = pixel(f, after).sub(pixel(f, before)).normalize();
  const renderedAxis = pixel(f, new THREE.Vector3(1, 0, 0).applyMatrix4(arrow.matrixWorld)).sub(pixel(f, center)).normalize();
  expect(renderedAxis.distanceTo(expectedScreen)).toBeLessThan(.000003);
  const dot = cueCenter(f, f.dot(side)), dotRadius = actualRadius(f, f.dot(side));
  const mark = f.marks(side), active = mark.userData.activeCheckpoint;
  const ring = active === null ? null : cueCenter(f, mark, active);
  const ringRadius = active === null ? 0 : actualRadius(f, mark, active);
  for (const triangle of arrowTriangles(f, side)) {
    for (const vertex of triangle) {
      expect(Math.abs(vertex.x)).toBeLessThanOrEqual(f.width / 2 + .0001);
      expect(Math.abs(vertex.y)).toBeLessThanOrEqual(f.height / 2 + .0001);
    }
    expect(triangleDistance(dot, ...triangle)).toBeGreaterThanOrEqual(dotRadius + 2 - .0001);
    if (ring) expect(triangleDistance(ring, ...triangle)).toBeGreaterThanOrEqual(ringRadius + 2 - .0001);
  }
  return true;
}
function modelPose(f) {
  const nodes = []; f.bird.traverse(node => nodes.push([node.uuid, node.position.toArray(), node.rotation.toArray(), node.scale.toArray(), node.matrix.toArray(), node.matrixWorld.toArray()]));
  return { nodes, phase: f.bird.userData.lastRenderedWingPhase, radius: f.bird.userData.studyRadius };
}
function resources(f) {
  const nodes = []; f.root.traverse(node => nodes.push({ node, geometry: node.geometry, material: node.material,
    attributes: node.geometry && Object.entries(node.geometry.attributes).map(([name, attr]) => [name, attr, attr.array]),
    instance: node.instanceMatrix, instanceArray: node.instanceMatrix && node.instanceMatrix.array })); return nodes;
}
function expectResources(f, before) {
  const after = resources(f); expect(after.length).toBe(before.length);
  for (let i = 0; i < before.length; i++) {
    expect(after[i].node).toBe(before[i].node); expect(after[i].geometry).toBe(before[i].geometry); expect(after[i].material).toBe(before[i].material);
    expect(after[i].instance).toBe(before[i].instance); expect(after[i].instanceArray).toBe(before[i].instanceArray);
    for (let j = 0; j < (before[i].attributes || []).length; j++) {
      expect(after[i].attributes[j][0]).toBe(before[i].attributes[j][0]);
      expect(after[i].attributes[j][1]).toBe(before[i].attributes[j][1]); expect(after[i].attributes[j][2]).toBe(before[i].attributes[j][2]);
    }
  }
}
function expectFinite(f) {
  for (const side of [0, 1]) {
    expect(f.arrow(side).matrix.elements.every(Number.isFinite)).toBe(true);
    expect(f.dot(side).matrix.elements.every(Number.isFinite)).toBe(true);
    expect([...f.marks(side).instanceMatrix.array].every(Number.isFinite)).toBe(true);
  }
}

describe('Direction chevrons remain readable beside the actual live tip', () => {
  it.each(ids)('keeps every visible %s triangle clear across viewpoints, cycle positions and phone/desktop fits', id => {
    const f = fixture(id), pool = resources(f), positions = f.cycle().geometry.attributes.position.array.slice(), distances = f.cycle().geometry.attributes.lineDistance.array.slice();
    const buildVersion = f.root.userData.buildVersion, seen = [0, 0];
    for (const size of sizes) for (const [yaw, pitch] of [[0, 15], [90, 15], [0, 60], [35, 15], [0, -60], [180, -60], [90, -45]]) {
      f.view({ ...size, yaw, pitch });
      for (let checkpoint = 0; checkpoint < 8; checkpoint++) {
        f.pose(checkpoint * tau / 8); const before = modelPose(f), camera = f.camera.matrixWorld.toArray();
        f.update({ checkpoint });
        expect(modelPose(f)).toEqual(before); expect(f.camera.matrixWorld.toArray()).toEqual(camera);
        for (const side of [0, 1]) {
          expect(f.marks(side).userData.activeCheckpoint).toBe(checkpoint);
          if (assertArrow(f, side)) seen[side]++;
        }
      }
    }
    expect(seen[0]).toBeGreaterThan(3); expect(seen[1]).toBeGreaterThan(3);
    expect(f.cycle().geometry.attributes.position.array).toEqual(positions);
    expect(f.cycle().geometry.attributes.lineDistance.array).toEqual(distances);
    expect(f.root.userData.buildVersion).toBe(buildVersion); expectResources(f, pool);
  });

  it.each(sizes)('recovers the buried Goose Front cycle-3 direction on $name without shifting any tip or ring', size => {
    const f = fixture(); f.view({ ...size, yaw: 0, pitch: 15 }); f.pose(Math.PI / 2);
    const before = modelPose(f), positions = f.cycle().geometry.attributes.position.array.slice(); f.update({ checkpoint: 2 });
    for (const side of [0, 1]) {
      expect(f.arrow(side).visible).toBe(true); expect(assertArrow(f, side)).toBe(true);
      const advance = ((f.arrow(side).userData.anchorPhase - Math.PI / 2 + tau) % tau) / tau * 64;
      expect(advance).toBeGreaterThan(2);
      expect(actualRadius(f, f.dot(side))).toBeCloseTo(6, 3);
      expect(actualRadius(f, f.marks(side), 2)).toBeCloseTo(8, 3);
      expect(cueCenter(f, f.dot(side)).distanceTo(cueCenter(f, f.marks(side), 2))).toBeLessThan(.0001);
    }
    expect(modelPose(f)).toEqual(before); expect(f.cycle().geometry.attributes.position.array).toEqual(positions);
  });

  it.each(['canada_goose', 'peregrine', 'monarch'])('keeps %s anchors and tangents truthful across wrapped phases without a selected ring', id => {
    const f = fixture(id); let visible = 0;
    for (const phase of [-.03, tau - .01, tau * 17 + .7, 1.234, 3.7]) {
      f.pose(phase); const before = modelPose(f); f.update({ checkpoint: null });
      for (const side of [0, 1]) { expect(f.marks(side).userData.activeCheckpoint).toBeNull(); if (assertArrow(f, side)) visible++; }
      expect(modelPose(f)).toEqual(before);
    }
    expect(visible).toBeGreaterThan(1);
  });

  it.each([-Infinity, NaN, -1000000])('keeps a fixed finite search when informational ahead metadata is %s', value => {
    const f = fixture(), pool = resources(f); f.root.userData.directionAheadSamples = value;
    const before = modelPose(f); f.update();
    for (const side of [0, 1]) { expect(f.arrow(side).visible).toBe(true); expect(assertArrow(f, side)).toBe(true); }
    expect(modelPose(f)).toEqual(before); expectResources(f, pool);
  });

  it('measures complete rendered geometry under mirrored nonuniform parents, zoom and asymmetric view offsets', () => {
    const f = fixture('monarch'); f.flock.scale.set(-1.2, .8, 1.15); f.flock.rotation.set(.12, -.15, .07);
    f.rig.scale.set(1.3, .7, 1.1); f.rig.rotation.set(.06, -.04, .03);
    let visible = 0;
    for (const size of sizes) {
      f.view({ ...size, yaw: 35, pitch: 15, zoom: 1.25 });
      f.camera.zoom = 1.1; f.camera.setViewOffset(1600, 1100, 100, 60, 1300, 900); f.camera.updateProjectionMatrix();
      for (const phase of [.3, 1.2, 2.4, 4.1, 5.5]) {
        f.pose(phase); const before = modelPose(f); f.update({ checkpoint: null });
        for (const side of [0, 1]) if (assertArrow(f, side)) visible++;
        expect(modelPose(f)).toEqual(before);
      }
      f.camera.clearViewOffset(); f.camera.zoom = 1; f.camera.updateProjectionMatrix();
    }
    expect(visible).toBeGreaterThan(1);
  });

  it.each(['behind', 'near-plane', 'outside-viewport', 'cramped', 'singular', 'nonfinite', 'missing'])('hides misleading directions for a %s camera with finite retained transforms', kind => {
    const f = fixture('monarch'), pool = resources(f); f.pose(1.234);
    if (kind === 'behind') { f.camera.position.set(0, 0, 5); f.camera.lookAt(0, 0, 10); }
    if (kind === 'near-plane') { f.camera.near = 50; f.camera.updateProjectionMatrix(); }
    if (kind === 'outside-viewport') { f.camera.position.set(0, 0, 5); f.camera.lookAt(20, 0, 0); }
    if (kind === 'cramped') { f.camera.far = 1000000; f.camera.position.set(0, 0, 100000); f.camera.lookAt(0, 0, 0); f.camera.updateProjectionMatrix(); }
    if (kind === 'singular') f.rig.scale.set(0, 1, 1);
    if (kind === 'nonfinite') f.camera.projectionMatrix.elements[0] = NaN;
    f.scene.updateMatrixWorld(true); const before = modelPose(f);
    f.update({ checkpoint: null, ...(kind === 'missing' ? { camera: null } : {}) });
    for (const side of [0, 1]) { expect(f.arrow(side).visible).toBe(false); expect(f.arrow(side).userData.anchorPhase).toBeNull(); }
    if (kind === 'cramped') { expect(f.root.visible).toBe(true); expect(f.dot(0).visible).toBe(true); expect(f.marks(0).visible).toBe(true); }
    expect(modelPose(f)).toEqual(before); expectFinite(f); expectResources(f, pool);
  });

  it('leaves a degenerate custom cycle and its current dots finite without inventing a direction', () => {
    const f = fixture('monarch'); f.bird.userData.applyWingPhase = () => {}; f.root.invalidate(); f.pose(1.234); f.update({ checkpoint: null });
    expect(f.root.userData.available).toBe(true); expect(f.root.visible).toBe(true);
    for (const side of [0, 1]) { expect(f.dot(side).visible).toBe(true); expect(f.arrow(side).visible).toBe(false); expect(f.arrow(side).userData.anchorPhase).toBeNull(); }
    expectFinite(f);
  });

  it('filters followed sides and hides opt-outs without replacing path, cue or material resources', () => {
    const f = fixture(), pool = resources(f), positions = f.cycle().geometry.attributes.position.array.slice();
    for (const follow of [0, 1, undefined]) {
      f.update({ follow });
      for (const side of [0, 1]) {
        if (follow === undefined || side === follow) { expect(f.arrow(side).visible).toBe(true); assertArrow(f, side); }
        else { expect(f.arrow(side).visible).toBe(false); expect(f.arrow(side).userData.phase).toBeNull(); expect(f.arrow(side).userData.anchorPhase).toBeNull(); }
      }
    }
    for (const option of [{ enabled: false }, { mode: 'chase' }, { bird: null }]) {
      f.update(option); expect(f.root.visible).toBe(false);
      for (const side of [0, 1]) { expect(f.arrow(side).visible).toBe(false); expect(f.arrow(side).userData.anchorPhase).toBeNull(); }
      expectFinite(f);
    }
    f.update(); expectResources(f, pool); expect(f.cycle().geometry.attributes.position.array).toEqual(positions);
    expect(f.arrow(0).geometry).toBe(f.arrow(1).geometry); expect(f.dot(0).geometry).toBe(f.dot(1).geometry);
    for (const side of [0, 1]) { expect(f.arrow(side).material).toBe(f.dot(side).material); expect(f.marks(side).material).toBe(f.dot(side).material); }
  });

  it('reuses all scratch objects and scene buffers through repeated moving, theme and follow updates', () => {
    const counts = new Map(), counted = Object.create(THREE);
    for (const name of ['Vector3', 'Matrix4', 'Vector2', 'Quaternion', 'BufferGeometry', 'BufferAttribute', 'MeshBasicMaterial']) {
      Object.defineProperty(counted, name, { value: new Proxy(THREE[name], { construct(target, args, receiver) {
        counts.set(name, (counts.get(name) || 0) + 1); return Reflect.construct(target, args, receiver);
      } }) });
    }
    const float64 = new Proxy(Float64Array, { construct(target, args, receiver) {
      counts.set('Float64Array', (counts.get('Float64Array') || 0) + 1); return Reflect.construct(target, args, receiver);
    } });
    const f = fixture('canada_goose', counted, pathFactory(float64)), pool = resources(f), before = new Map(counts);
    const positions = f.cycle().geometry.attributes.position.array.slice(), version = f.root.userData.buildVersion;
    for (let frame = 0; frame < 48; frame++) {
      f.pose(frame * .17); const pose = modelPose(f); f.update({ checkpoint: null, dark: frame % 2 === 0, follow: frame % 3 === 0 ? undefined : frame % 2 });
      expect(modelPose(f)).toEqual(pose); expectFinite(f);
    }
    expect(counts).toEqual(before); expect(before.get('Float64Array')).toBe(1);
    expectResources(f, pool); expect(f.root.userData.buildVersion).toBe(version);
    expect(f.cycle().geometry.attributes.position.array).toEqual(positions);
  });
});
