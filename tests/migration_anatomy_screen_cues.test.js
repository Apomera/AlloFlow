import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), process.env.MIGRATION_ANATOMY_CANDIDATE || 'stem_lab/stem_tool_migration.js'), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing anatomy screen-cue source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const createFlyer = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn createMigrationFlyer;')(num);
const createMarkers = new Function(section('      function createMigrationAnatomyMarkers(', '      function createMigrationMarkedWingPose(') + '\nreturn createMigrationAnatomyMarkers;')();
const init = new Function('THREE', 'scene', 'engine', 'flockRoot', 'migrNum', 'createMigrationAnatomyMarkers', section('          // One pooled, colored line buffer for all four anatomy callouts.', '          engine.updateStudyBackdrop =') + '\nreturn { overlay: anatomyOverlay, markers: anatomyMarkers };');
const pick = new Function(section('      function migrationAnatomyAtPoint(', '      function createMigrationAnatomyMarkers(') + '\nreturn migrationAnatomyAtPoint;')();
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const species = ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit'];
const regions = ['head', 'inner-wing', 'primaries', 'tail'];

function fixture(id = 'canada_goose', width = 780, height = 560, library = THREE) {
  const scene = new THREE.Scene(), flock = new THREE.Group(), rig = new THREE.Group();
  scene.add(flock, rig); flock.position.set(.4, 1.2, -.3); flock.rotation.set(.07, .12, -.04); flock.scale.set(1.1, .9, 1.2);
  const bird = createFlyer(THREE, { id }, 2); bird.position.set(.6, .5, -5); flock.add(bird);
  bird.userData.applyWingPhase(1.7); bird.userData.lastRenderedWingPhase = 1.7;
  const camera = new THREE.PerspectiveCamera(54, width / height, .1, 900); rig.add(camera);
  scene.updateMatrixWorld(true);
  const target = bird.getWorldPosition(new THREE.Vector3());
  camera.position.copy(target).add(new THREE.Vector3(6, 4, 9)); camera.lookAt(target); camera.updateMatrixWorld(true);
  const host = { clientWidth: width, clientHeight: height, getAttribute: () => 'true' };
  const engine = { speciesId: id, flyers: [bird], camera, host, disposed: false, contextLost: false,
    time: 13.75, wingStepSerial: 6, wingStepPhase: .87, anatomyPickPoint: new THREE.Vector3(),
    renderer: { domElement: { getBoundingClientRect: () => ({ left: 31, top: 47, width: host.clientWidth, height: host.clientHeight }) } } };
  const parts = init(library, scene, engine, flock, num, createMarkers);
  const f = { ...parts, scene, flock, rig, bird, camera, engine, width, height,
    update(region = '', side = 1, enabled = true) { engine.updateAnatomy(enabled, 0, region, side, false); scene.updateMatrixWorld(true); } };
  f.update(); return f;
}
function pixels(f, world) {
  const point = world.clone().project(f.camera);
  return new THREE.Vector2((point.x + 1) * f.width / 2, (1 - point.y) * f.height / 2);
}
function centerPixels(f, marker) { return pixels(f, marker.getWorldPosition(new THREE.Vector3())); }
// Measure full rendered matrices and actual mesh vertices. No Euclidean camera
// distance or decomposed marker scale appears in the expected pixel geometry.
function expectDisk(f, marker, radius = 13) {
  const disk = marker.children[0], vertices = disk.geometry.attributes.position;
  const center = pixels(f, new THREE.Vector3().applyMatrix4(disk.matrixWorld));
  let boundary = 0;
  for (let vertex = 0; vertex < vertices.count; vertex++) {
    const local = new THREE.Vector3().fromBufferAttribute(vertices, vertex);
    if (Math.hypot(local.x, local.y) < .001) continue;
    const rendered = pixels(f, local.applyMatrix4(disk.matrixWorld));
    expect(rendered.distanceTo(center)).toBeCloseTo(radius, 4); boundary++;
  }
  expect(boundary).toBe(33);
  expect(disk.matrixWorld.elements.every(Number.isFinite)).toBe(true);
  const a = pixels(f, new THREE.Vector3(1, 0, 0).applyMatrix4(disk.matrixWorld)).sub(center);
  const b = pixels(f, new THREE.Vector3(0, 1, 0).applyMatrix4(disk.matrixWorld)).sub(center);
  expect(Math.abs(a.dot(b))).toBeLessThan(.00001);
  return center;
}
function expectCenters(f) {
  for (const marker of f.markers.children) {
    const center = centerPixels(f, marker);
    expect(center.x).toBeGreaterThanOrEqual(Math.min(28, f.width / 2) - .00001);
    expect(center.x).toBeLessThanOrEqual(Math.max(Math.min(28, f.width / 2), f.width - 28) + .00001);
    expect(center.y).toBeGreaterThanOrEqual(Math.min(128, f.height / 2) - .00001);
    expect(center.y).toBeLessThanOrEqual(Math.max(Math.min(128, f.height / 2), f.height - 124) + .00001);
  }
}
function expectLines(f, side) {
  const attribute = f.overlay.geometry.attributes.position;
  let coordinate = 0;
  for (let index = 0; index < 4; index++) {
    const anchor = f.bird.userData.anatomyAnchorsBySide[side][index];
    for (let offset = 0; offset < anchor.outline.length; offset += 3) {
      const expected = new THREE.Vector3().fromArray(anchor.outline, offset).applyMatrix4(anchor.node.matrixWorld);
      const rendered = new THREE.Vector3().fromBufferAttribute(attribute, coordinate / 3).applyMatrix4(f.overlay.matrixWorld);
      expect(rendered.distanceTo(expected)).toBeLessThan(.00001); coordinate += 3;
    }
    const expectedAnchor = anchor.point.clone().applyMatrix4(anchor.node.matrixWorld);
    const renderedAnchor = new THREE.Vector3().fromBufferAttribute(attribute, coordinate / 3).applyMatrix4(f.overlay.matrixWorld);
    expect(renderedAnchor.distanceTo(expectedAnchor)).toBeLessThan(.00001);
    const end = new THREE.Vector3().fromBufferAttribute(attribute, coordinate / 3 + 3).applyMatrix4(f.overlay.matrixWorld);
    expect(end.distanceTo(f.markers.children[index].getWorldPosition(new THREE.Vector3()))).toBeLessThan(.00001);
    coordinate += 12;
  }
  expect(f.overlay.geometry.drawRange).toEqual({ start: 0, count: coordinate / 3 });
}
function resources(f) {
  const result = new Set();
  for (const root of [f.markers, f.overlay]) root.traverse(node => {
    if (node.geometry) result.add(node.geometry);
    if (node.material) result.add(node.material);
  });
  return result;
}
function expectHidden(f) {
  for (const root of [f.markers, f.overlay]) {
    expect(root.visible).toBe(false); expect(root.userData.sourceBirdUuid).toBe('');
    expect(root.userData.anatomySide).toBeNull(); expect(root.userData.selectedAnatomyId).toBe('');
  }
  expect(f.overlay.geometry.drawRange.count).toBe(0);
  expect(f.markers.children.every(marker => marker.userData.anatomySide === null && !marker.userData.focused && !marker.children[3].visible)).toBe(true);
  expect(f.overlay.geometry.attributes.position.array.every(Number.isFinite)).toBe(true);
}

describe('Rendered anatomy callouts stay readable in CSS pixels', () => {
  it.each(species)('keeps all four %s disks circular in landscape, portrait and phone scenes', id => {
    for (const [width, height] of [[980, 560], [390, 678], [320, 390]]) {
      const f = fixture(id, width, height);
      for (const side of [0, 1]) {
        f.camera.zoom = side ? 1.8 : .75; f.camera.updateProjectionMatrix(); f.update('', side);
        expect(f.markers.visible).toBe(true); expectCenters(f); expectLines(f, side);
        for (const marker of f.markers.children) expectDisk(f, marker);
      }
    }
  });

  it.each(['zoom-and-film-offset', 'view-offset', 'nonuniform-camera-parent', 'mirrored-camera-and-bird-parents'])('uses actual rendered geometry for %s', kind => {
    const f = fixture('arctic_tern', 804, 390);
    if (kind === 'zoom-and-film-offset') { f.camera.zoom = 2.1; f.camera.filmOffset = 8; f.camera.updateProjectionMatrix(); }
    if (kind === 'view-offset') { f.camera.setViewOffset(2000, 1100, 350, 60, 1100, 800); f.camera.zoom = 1.4; f.camera.updateProjectionMatrix(); }
    if (kind === 'nonuniform-camera-parent' || kind === 'mirrored-camera-and-bird-parents') {
      f.rig.position.set(.7, -.4, .3); f.rig.rotation.set(.12, -.16, .08); f.rig.scale.set(1.7, .65, 1.2);
      if (kind === 'mirrored-camera-and-bird-parents') { f.rig.scale.x *= -1; f.flock.scale.set(-1.2, .8, 1.1); }
    }
    for (const region of regions) {
      f.update(region, 0); expect(f.markers.visible).toBe(true); expectCenters(f); expectLines(f, 0);
      for (const marker of f.markers.children) expectDisk(f, marker, 13 * (marker.userData.focused ? 1.08 : 1));
    }
  });

  it('keeps rendered leader starts and ends correct under independently transformed marker and line parents', () => {
    const f = fixture();
    const sourceParent = new THREE.Group(), markerParent = new THREE.Group(), lineParent = new THREE.Group();
    f.scene.add(sourceParent, markerParent, lineParent); sourceParent.add(f.flock); markerParent.add(f.markers); lineParent.add(f.overlay);
    sourceParent.position.set(.2, -.1, .4); sourceParent.rotation.set(.03, -.06, .02); sourceParent.scale.set(1.05, .85, 1.1);
    markerParent.position.set(2, -1, .5); markerParent.rotation.set(.3, -.2, .1); markerParent.scale.set(-1.4, .6, 1.2);
    lineParent.position.set(-.8, 1.7, -2); lineParent.rotation.set(.2, .1, -.15); lineParent.scale.set(.7, 1.5, 1.1);
    for (const side of [0, 1]) for (const phase of [0, Math.PI / 2, Math.PI]) {
      f.bird.userData.applyWingPhase(phase); f.update('primaries', side);
      expect(f.markers.visible).toBe(true); expectLines(f, side); expectCenters(f);
      for (const marker of f.markers.children) {
        expectDisk(f, marker, 13 * (marker.userData.focused ? 1.08 : 1));
        const center = centerPixels(f, marker);
        expect(pick(f.engine, center.x + 31, center.y + 47)).toBe(marker.userData.anatomyId);
      }
    }
  });

  it('reserves the largest focus-ring footprint without moving centers when the selected region changes', () => {
    const f = fixture('sandhill_crane', 320, 390); f.camera.zoom = 2.4; f.camera.filmOffset = 5; f.camera.updateProjectionMatrix();
    f.update(); const positions = f.markers.children.map(marker => marker.getWorldPosition(new THREE.Vector3()).toArray());
    for (const region of regions) {
      f.update(region); expectCenters(f);
      expect(f.markers.children.map(marker => marker.getWorldPosition(new THREE.Vector3()).toArray())).toEqual(positions);
      for (const marker of f.markers.children) {
        const ring = marker.children[3], attribute = ring.geometry.attributes.position;
        const center = pixels(f, new THREE.Vector3().applyMatrix4(ring.matrixWorld));
        let outerRadius = 0;
        for (let vertex = 0; vertex < attribute.count; vertex++) {
          const point = pixels(f, new THREE.Vector3().fromBufferAttribute(attribute, vertex).applyMatrix4(ring.matrixWorld));
          outerRadius = Math.max(outerRadius, point.distanceTo(center));
        }
        expect(outerRadius).toBeCloseTo(13 * 1.29 * (marker.userData.focused ? 1.08 : 1), 1);
        expect(center.y + outerRadius).toBeLessThanOrEqual(f.height - 104.5);
      }
    }
  });

  it('picks the rendered centers with the existing 44px target and rejects hidden or outside-canvas targets', () => {
    const f = fixture('canada_goose', 980, 678); f.update('tail', 0);
    for (const marker of f.markers.children) {
      const center = centerPixels(f, marker);
      expect(pick(f.engine, center.x + 31, center.y + 47)).toBe(marker.userData.anatomyId);
      expect(pick(f.engine, center.x + 31 + 21.9, center.y + 47)).toBe(marker.userData.anatomyId);
      expect(pick(f.engine, center.x + 31 + 22.1, center.y + 47)).toBe('');
    }
    expect(pick(f.engine, 30, 47)).toBe(''); expect(pick(f.engine, 31, 46)).toBe('');
    f.update('tail', 0, false); expect(pick(f.engine, 100, 100)).toBe('');
  });

  it('reuses fifteen GPU resources and both fixed line buffers without allocating during updates or changing pose, camera or time', () => {
    const construction = new Map(), names = new Set(['BufferGeometry', 'CircleGeometry', 'RingGeometry', 'MeshBasicMaterial', 'LineBasicMaterial', 'BufferAttribute']);
    const constructors = new Map();
    const library = new Proxy(THREE, { get(target, key) {
      if (!names.has(key)) return target[key];
      if (!constructors.has(key)) constructors.set(key, new Proxy(target[key], { construct(Type, args) {
        construction.set(key, (construction.get(key) || 0) + 1); return Reflect.construct(Type, args);
      } }));
      return constructors.get(key);
    } });
    const f = fixture('canada_goose', 780, 560, library), pool = resources(f), counts = [...construction];
    const positions = f.overlay.geometry.attributes.position.array, colors = f.overlay.geometry.attributes.color.array;
    const pose = []; f.bird.traverse(node => pose.push([node.uuid, node.position.toArray(), node.quaternion.toArray(), node.scale.toArray()]));
    const camera = [f.camera.position.toArray(), f.camera.quaternion.toArray(), f.camera.projectionMatrix.toArray()];
    const time = [f.engine.time, f.engine.wingStepSerial, f.engine.wingStepPhase, f.bird.userData.phase, f.bird.userData.lastRenderedWingPhase];
    const phase = vi.spyOn(f.bird.userData, 'applyWingPhase');
    expect(pool.size).toBe(15); expect(positions.byteLength + colors.byteLength).toBe(4608);
    for (let frame = 0; frame < 40; frame++) {
      f.update(regions[frame % 4], frame % 2); expect(resources(f)).toEqual(pool); expectLines(f, frame % 2);
      expect(f.overlay.geometry.attributes.position.array).toBe(positions); expect(f.overlay.geometry.attributes.color.array).toBe(colors);
    }
    expect([...construction]).toEqual(counts); expect(phase).not.toHaveBeenCalled();
    const afterPose = []; f.bird.traverse(node => afterPose.push([node.uuid, node.position.toArray(), node.quaternion.toArray(), node.scale.toArray()]));
    expect(afterPose).toEqual(pose); expect([f.camera.position.toArray(), f.camera.quaternion.toArray(), f.camera.projectionMatrix.toArray()]).toEqual(camera);
    expect([f.engine.time, f.engine.wingStepSerial, f.engine.wingStepPhase, f.bird.userData.phase, f.bird.userData.lastRenderedWingPhase]).toEqual(time);
    const cleanup = [...pool].map(resource => vi.spyOn(resource, 'dispose')); dispose(f.scene);
    for (const spy of cleanup) expect(spy).toHaveBeenCalledTimes(1);
  });

  it('retains fixed-world fallback and valid derived viewport defaults without a camera or host dimensions', () => {
    const f = fixture(); f.engine.camera = undefined; f.update('head', 0);
    expect(f.markers.visible).toBe(true); expectLines(f, 0);
    expect(f.markers.children.map(marker => marker.scale.x)).toEqual([.14 * 1.08, .14, .14, .14]);
    f.engine.camera = f.camera; delete f.engine.host.clientWidth; delete f.engine.host.clientHeight;
    f.width = 560 * f.camera.aspect; f.height = 560; f.update('', 1);
    for (const marker of f.markers.children) expectDisk(f, marker); expectCenters(f); expectLines(f, 1);
  });

  it('keeps tiny positive viewports finite and their reserved center bounds ordered', () => {
    const f = fixture('canada_goose', 40, 180); f.update('head');
    expect(f.markers.visible).toBe(true); expectCenters(f);
    for (const marker of f.markers.children) expectDisk(f, marker, 13 * (marker.userData.focused ? 1.08 : 1));
  });

  it.each(['orthographic', 'nan-projection', 'negative-x-projection', 'zero-projection', 'unsupported-projection-row',
    'singular-camera-parent', 'nan-camera', 'singular-source', 'nan-source', 'inside-near', 'outside-far', 'behind-camera',
    'invalid-near', 'invalid-far', 'missing-inverse-matrix', 'singular-marker-parent', 'nan-overlay-parent', 'invalid-anchor', 'disabled', 'disposed', 'context-lost', 'monarch'])('clears stale visible cues and metadata for %s', kind => {
    const f = fixture(); f.update('primaries', 0); expect(f.markers.visible).toBe(true);
    if (kind === 'orthographic') f.engine.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 900);
    if (kind === 'nan-projection') f.camera.projectionMatrix.elements[0] = NaN;
    if (kind === 'negative-x-projection') f.camera.projectionMatrix.elements[0] *= -1;
    if (kind === 'zero-projection') f.camera.projectionMatrix.elements.fill(0);
    if (kind === 'unsupported-projection-row') f.camera.projectionMatrix.elements[15] = 1;
    if (kind === 'singular-camera-parent') f.rig.scale.x = 0;
    if (kind === 'nan-camera') f.camera.position.x = NaN;
    if (kind === 'singular-source') f.flock.scale.x = 0;
    if (kind === 'nan-source') f.flock.position.y = NaN;
    if (kind === 'inside-near' || kind === 'outside-far' || kind === 'behind-camera') {
      const target = f.bird.getWorldPosition(new THREE.Vector3());
      f.camera.position.copy(target).add(new THREE.Vector3(0, 0, kind === 'inside-near' ? .05 : kind === 'outside-far' ? 1000 : -1)); f.camera.quaternion.identity();
    }
    if (kind === 'invalid-near') f.camera.near = 0;
    if (kind === 'invalid-far') f.camera.far = f.camera.near;
    if (kind === 'missing-inverse-matrix') f.camera.matrixWorldInverse = null;
    if (kind === 'singular-marker-parent') f.markers.scale.x = 0;
    if (kind === 'nan-overlay-parent') f.overlay.position.x = NaN;
    if (kind === 'invalid-anchor') f.bird.userData.anatomyAnchorsBySide[0][1].point.x = Infinity;
    if (kind === 'disposed') f.engine.disposed = true;
    if (kind === 'context-lost') f.engine.contextLost = true;
    if (kind === 'monarch') f.engine.speciesId = 'monarch';
    f.engine.updateAnatomy(kind !== 'disabled', 0, 'primaries', 0, false); expectHidden(f);
    expect(pick(f.engine, 120, 190)).toBe('');
  });
});
