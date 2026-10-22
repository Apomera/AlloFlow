import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), process.env.MIGRATION_ANATOMY_CANDIDATE || 'stem_lab/stem_tool_migration.js'), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing anatomy-focus source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const createFlyer = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn createMigrationFlyer;')(num);
const createMarkers = new Function(section('      function createMigrationAnatomyMarkers(', '      function createMigrationMarkedWingPose(') + '\nreturn createMigrationAnatomyMarkers;')();
const initAnatomy = new Function('THREE', 'scene', 'engine', 'flockRoot', 'migrNum', 'createMigrationAnatomyMarkers', section('          // One pooled, colored line buffer for all four anatomy callouts.', '          engine.updateStudyBackdrop =') + '\nreturn { overlay: anatomyOverlay, markers: anatomyMarkers };');
const ids = ['head', 'inner-wing', 'primaries', 'tail'];
const day = [0x78350f, 0x164e63, 0x14532d, 0x831843];
const species = ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit'];

function fixture(id = 'canada_goose') {
  const scene = new THREE.Scene(), flock = new THREE.Group();
  scene.add(flock); flock.position.set(.4, 1.2, -1); flock.rotation.set(.03, .12, -.05); flock.scale.set(1.1, .9, 1.2);
  const bird = createFlyer(THREE, { id }, 2); bird.position.set(.7, .5, -5); flock.add(bird);
  bird.userData.applyWingPhase(1.7); bird.userData.lastRenderedWingPhase = 1.7;
  const camera = new THREE.PerspectiveCamera(54, 1.4, .1, 900);
  camera.position.set(7, 5, 3); camera.lookAt(bird.getWorldPosition(new THREE.Vector3())); camera.updateMatrixWorld(true);
  const engine = { speciesId: id, flyers: [bird], camera, host: { clientWidth: 780, clientHeight: 560 },
    disposed: false, contextLost: false, time: 13.75, wingStepSerial: 6, wingStepPhase: .87,
    learnerWork: { notes: 'The primary feathers changed angle while the camera stayed fixed.', prediction: 'outer section moves' } };
  const parts = initAnatomy(THREE, scene, engine, flock, num, createMarkers);
  return { ...parts, scene, flock, bird, camera, engine,
    update(region, side = 1, isDark, enabled = true) {
      engine.updateAnatomy(enabled, 0, region, side, isDark); scene.updateMatrixWorld(true);
    } };
}
function softened(base, isDark) {
  const background = isDark === false ? 0xe2e8f0 : 0x18344a;
  return [16, 8, 0].reduce((result, shift) => result | Math.round(((base >> shift) & 255) * .6 + ((background >> shift) & 255) * .4) << shift, 0);
}
function assertColors(f, region, side, isDark) {
  const anchors = f.bird.userData.anatomyAnchorsBySide[side];
  const array = f.overlay.geometry.attributes.color.array;
  let offset = 0;
  for (let index = 0; index < anchors.length; index++) {
    const base = isDark === false ? day[index] : anchors[index].color;
    const target = ids.includes(region) && region !== ids[index] ? softened(base, isDark) : base;
    const rgb = [((target >> 16) & 255) / 255, ((target >> 8) & 255) / 255, (target & 255) / 255];
    const end = offset + anchors[index].outline.length + 12;
    let maximumError = 0;
    for (; offset < end; offset += 3) {
      for (let component = 0; component < 3; component++) maximumError = Math.max(maximumError,
        Number.isFinite(array[offset + component]) ? Math.abs(array[offset + component] - rgb[component]) : Infinity);
    }
    expect(maximumError, ids[index] + ' outline and both leader segments').toBeLessThan(.0000005);
  }
  expect(f.overlay.geometry.drawRange).toEqual({ start: 0, count: offset / 3 });
}
function resources(f) {
  const pool = new Set();
  for (const root of [f.overlay, f.markers]) root.traverse(node => {
    if (node.geometry) pool.add(node.geometry);
    if (node.material) pool.add(node.material);
  });
  return pool;
}
function pose(bird) {
  const values = [];
  bird.traverse(node => values.push([node.uuid, node.position.toArray(), node.quaternion.toArray(), node.scale.toArray()]));
  return values;
}
function markerAppearance(f) {
  return f.markers.children.map(marker => marker.children.slice(0, 3).map(node => ({
    geometry: node.geometry && node.geometry.uuid,
    material: node.material && node.material.uuid,
    color: node.material && node.material.color && node.material.color.getHex(),
    opacity: node.material && node.material.opacity,
    visible: node.visible,
    scale: node.scale.toArray()
  })));
}
function hidden(f) {
  for (const root of [f.overlay, f.markers]) {
    expect(root.visible).toBe(false); expect(root.userData.selectedAnatomyId).toBe('');
    expect(root.userData.sourceBirdUuid).toBe(''); expect(root.userData.anatomySide).toBeNull();
  }
  expect(f.overlay.geometry.drawRange.count).toBe(0);
  expect(f.markers.children.map(marker => marker.userData.focused)).toEqual([false, false, false, false]);
  expect(f.markers.children.map(marker => marker.children[3].visible)).toEqual([false, false, false, false]);
}

describe('Selected anatomical outline focus', () => {
  it.each(species)('emphasizes the chosen %s region on either anatomical side in both themes', id => {
    const f = fixture(id), numberedMarkers = markerAppearance(f);
    for (const side of [0, 1]) {
      f.update('', side, false);
      const positions = f.overlay.geometry.attributes.position.array.slice();
      for (const isDark of [false, true, undefined]) for (const region of ids) {
        f.update(region, side, isDark); assertColors(f, region, side, isDark);
        expect(f.overlay.userData.selectedAnatomyId).toBe(region);
        expect(f.markers.userData.selectedAnatomyId).toBe(region);
        expect(f.markers.children.map(marker => marker.userData.focused)).toEqual(ids.map(value => value === region));
        expect(f.markers.children.map(marker => marker.children[3].visible)).toEqual(ids.map(value => value === region));
        expect(markerAppearance(f)).toEqual(numberedMarkers);
        expect(f.overlay.geometry.attributes.position.array).toEqual(positions);
      }
    }
  });

  it.each(['', 'unknown', '__proto__', undefined, null])('keeps the complete theme palette for unfocused region %s', region => {
    const f = fixture();
    for (const isDark of [false, true, undefined]) for (const side of [0, 1]) {
      f.update('primaries', side, isDark); f.update(region, side, isDark);
      assertColors(f, region, side, isDark);
      expect(f.overlay.userData.selectedAnatomyId).toBe('');
      expect(f.markers.userData.selectedAnatomyId).toBe('');
      expect(f.markers.children.every(marker => !marker.userData.focused && !marker.children[3].visible)).toBe(true);
    }
  });

  it('reuses the same buffers and fifteen GPU resources without changing camera, pose, timing, or learner work', () => {
    const f = fixture(); f.update('head', 0, false);
    const pool = resources(f), positions = f.overlay.geometry.attributes.position.array, colors = f.overlay.geometry.attributes.color.array;
    const fixedPositions = positions.slice(), fixedPose = pose(f.bird), work = JSON.stringify(f.engine.learnerWork);
    const camera = [f.camera.position.toArray(), f.camera.quaternion.toArray(), f.camera.projectionMatrix.toArray()];
    const timing = [f.engine.time, f.engine.wingStepSerial, f.engine.wingStepPhase, f.bird.userData.phase, f.bird.userData.lastRenderedWingPhase];
    const apply = vi.spyOn(f.bird.userData, 'applyWingPhase');
    expect(pool.size).toBe(15); expect(positions.length).toBe(576); expect(colors.length).toBe(576);
    expect(positions.byteLength + colors.byteLength).toBe(4608);
    for (let iteration = 0; iteration < 32; iteration++) {
      const isDark = iteration % 2 === 0, region = ids[iteration % ids.length];
      f.update(region, 0, isDark); assertColors(f, region, 0, isDark);
      expect(resources(f)).toEqual(pool);
      expect(f.overlay.geometry.attributes.position.array).toBe(positions);
      expect(f.overlay.geometry.attributes.color.array).toBe(colors);
      expect(positions).toEqual(fixedPositions);
      expect(positions.every(Number.isFinite)).toBe(true); expect(colors.every(Number.isFinite)).toBe(true);
    }
    expect(apply).not.toHaveBeenCalled(); expect(pose(f.bird)).toEqual(fixedPose);
    expect(JSON.stringify(f.engine.learnerWork)).toBe(work);
    expect([f.camera.position.toArray(), f.camera.quaternion.toArray(), f.camera.projectionMatrix.toArray()]).toEqual(camera);
    expect([f.engine.time, f.engine.wingStepSerial, f.engine.wingStepPhase, f.bird.userData.phase, f.bird.userData.lastRenderedWingPhase]).toEqual(timing);
  });

  it('clears focused geometry metadata and rings on every unavailable path', () => {
    const f = fixture();
    for (const kind of ['disabled', 'disposed', 'context-lost', 'hidden-bird', 'missing-bird', 'invalid-anchor']) {
      f.update('inner-wing', 0, false);
      const anchors = f.bird.userData.anatomyAnchorsBySide[0], previousPoint = anchors[1].point.x;
      if (kind === 'disposed') f.engine.disposed = true;
      if (kind === 'context-lost') f.engine.contextLost = true;
      if (kind === 'hidden-bird') f.bird.visible = false;
      if (kind === 'missing-bird') f.engine.flyers = [];
      if (kind === 'invalid-anchor') anchors[1].point.x = NaN;
      f.update('inner-wing', 0, false, kind !== 'disabled'); hidden(f);
      f.engine.disposed = false; f.engine.contextLost = false; f.bird.visible = true; f.engine.flyers = [f.bird]; anchors[1].point.x = previousPoint;
    }
    f.update('tail', 1, true); expect(f.overlay.userData.selectedAnatomyId).toBe('tail');
  });

  it('continues excluding Monarch from bird anatomy and focus metadata', () => {
    const f = fixture('monarch');
    for (const side of [0, 1]) for (const region of ids) { f.update(region, side, false); hidden(f); }
  });
});
