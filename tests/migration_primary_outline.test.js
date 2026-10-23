import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing primary-outline source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const createFlyer = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn createMigrationFlyer;')(num);
const createMarkers = new Function(section('      function createMigrationAnatomyMarkers(', '      function createMigrationMarkedWingPose(') + '\nreturn createMigrationAnatomyMarkers;')();
const initAnatomy = new Function('THREE', 'scene', 'engine', 'flockRoot', 'migrNum', 'createMigrationAnatomyMarkers', section('          // One pooled, colored line buffer for all four anatomy callouts.', '          engine.updateStudyBackdrop =') + '\nreturn { overlay: anatomyOverlay, markers: anatomyMarkers };');
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const species = ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit'];
const phases = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];

function fixture(id) {
  const scene = new THREE.Scene(), flock = new THREE.Group();
  scene.add(flock);
  flock.position.set(.4, 1.2, -1); flock.rotation.set(.03, .12, -.05); flock.scale.set(1.1, .9, 1.2);
  const bird = createFlyer(THREE, { id }, 2);
  bird.position.set(.7, .5, -5); flock.add(bird);
  bird.userData.applyWingPhase(.73); bird.userData.lastRenderedWingPhase = .73;
  const camera = new THREE.PerspectiveCamera(54, 1.4, .1, 900);
  camera.position.set(7, 5, 3); camera.lookAt(bird.getWorldPosition(new THREE.Vector3())); camera.updateMatrixWorld(true);
  const engine = { speciesId: id, flyers: [bird], camera, host: { clientWidth: 780, clientHeight: 560 },
    disposed: false, contextLost: false, time: 13.75, wingStepSerial: 6, wingStepPhase: .87,
    learnerWork: { notes: 'The outer edges separate when I look from above.', comparison: 'Keep my saved comparison.' } };
  const parts = initAnatomy(THREE, scene, engine, flock, num, createMarkers);
  // Exercise the actual overlay-local conversion, not only an identity root.
  parts.overlay.position.set(-.6, .2, .3); parts.overlay.rotation.set(.08, -.12, .02);
  parts.overlay.scale.set(.9, 1.2, 1.1);
  return { ...parts, scene, flock, bird, camera, engine,
    update(side, region = 'primaries', isDark = false) {
      engine.updateAnatomy(true, 0, region, side, isDark); scene.updateMatrixWorld(true);
    },
    phase(value) {
      bird.userData.applyWingPhase(value); bird.userData.lastRenderedWingPhase = value; scene.updateMatrixWorld(true);
    } };
}
function vertexKey(array, offset) {
  return [array[offset], array[offset + 1], array[offset + 2]].map(value => value.toFixed(7)).join(',');
}
function edgeSet(array) {
  const result = [];
  for (let offset = 0; offset < array.length; offset += 6) {
    result.push([vertexKey(array, offset), vertexKey(array, offset + 3)].sort().join('|'));
  }
  return result.sort();
}
function primaryStart(anchors) {
  return anchors.slice(0, 2).reduce((count, anchor) => count + anchor.outline.length + 12, 0);
}
function resourceSet(root) {
  const result = new Set();
  root.traverse(node => {
    if (node.geometry) result.add(node.geometry);
    if (node.material) for (const material of Array.isArray(node.material) ? node.material : [node.material]) result.add(material);
  });
  return result;
}
function geometrySnapshot(bird) {
  const result = [];
  bird.traverse(node => {
    if (!node.geometry) return;
    const geometry = node.geometry;
    result.push({ node, geometry, material: node.material, index: geometry.index,
      indices: geometry.index && Array.from(geometry.index.array),
      attributes: Object.keys(geometry.attributes).sort().map(key => ({ key,
        attribute: geometry.attributes[key], array: geometry.attributes[key].array,
        values: Array.from(geometry.attributes[key].array) })) });
  });
  return result;
}
function assertGeometryUnchanged(snapshot) {
  for (const entry of snapshot) {
    expect(entry.node.geometry).toBe(entry.geometry);
    expect(entry.node.material).toBe(entry.material);
    expect(entry.geometry.index).toBe(entry.index);
    if (entry.index) expect(Array.from(entry.index.array)).toEqual(entry.indices);
    for (const attribute of entry.attributes) {
      expect(entry.geometry.attributes[attribute.key]).toBe(attribute.attribute);
      expect(attribute.attribute.array).toBe(attribute.array);
      expect(Array.from(attribute.array)).toEqual(attribute.values);
    }
  }
}

describe('Primary feather anatomy contours', () => {
  it.each(species)('traces exactly five closed mesh perimeters for %s without relief seams', id => {
    const f = fixture(id), anchors = f.bird.userData.anatomyAnchorsBySide;
    const mesh = f.bird.userData.primaries[1], geometry = mesh.geometry;
    const outline = anchors[1][2].outline;
    expect(outline).toBeInstanceOf(Float32Array);
    expect(outline.length).toBe(150);
    expect(anchors[0][2].outline).toBe(outline);
    expect(anchors[0][2].node).toBe(f.bird.userData.primaries[0]);
    expect(anchors[1][2].node).toBe(mesh);
    expect(f.bird.userData.primaries[0].geometry).toBe(geometry);
    const independent = new THREE.EdgesGeometry(geometry, 180);
    expect(independent.attributes.position.count).toBe(50);
    expect(edgeSet(outline)).toEqual(edgeSet(independent.attributes.position.array));
    independent.dispose();

    // Degree-two components establish five distinct closed contours, with no
    // crossing bridges between neighboring feather silhouettes.
    const graph = new Map();
    for (let offset = 0; offset < outline.length; offset += 6) {
      const from = vertexKey(outline, offset), to = vertexKey(outline, offset + 3);
      expect(from).not.toBe(to);
      for (const [a, b] of [[from, to], [to, from]]) {
        if (!graph.has(a)) graph.set(a, new Set());
        graph.get(a).add(b);
      }
    }
    expect(graph.size).toBe(25);
    for (const neighbors of graph.values()) expect(neighbors.size).toBe(2);
    const unseen = new Set(graph.keys()), components = [];
    while (unseen.size) {
      const pending = [unseen.values().next().value], component = new Set();
      while (pending.length) {
        const point = pending.pop();
        if (component.has(point)) continue;
        component.add(point); unseen.delete(point);
        pending.push(...graph.get(point));
      }
      components.push(component.size);
    }
    expect(components).toEqual([5, 5, 5, 5, 5]);
    const positions = geometry.attributes.position.array;
    for (let feather = 0; feather < 5; feather++) {
      for (const interior of [5, 6]) expect(graph.has(vertexKey(positions, (feather * 7 + interior) * 3))).toBe(false);
    }
    dispose(f.scene);
  });

  it.each(species)('keeps the %s cue attached to both articulated feather surfaces at four wing phases', id => {
    const f = fixture(id);
    const output = f.overlay.geometry.attributes.position.array;
    for (const phase of phases) {
      f.phase(phase);
      for (const side of [0, 1]) {
        f.update(side);
        const anchors = f.bird.userData.anatomyAnchorsBySide[side], primary = anchors[2];
        const start = primaryStart(anchors);
        expect(f.overlay.visible).toBe(true);
        expect(f.overlay.userData.anatomySide).toBe(side);
        expect(f.markers.children.map(marker => marker.userData.focused)).toEqual([false, false, true, false]);
        let maximumError = 0;
        for (let coordinate = 0; coordinate < primary.outline.length; coordinate += 3) {
          const expected = new THREE.Vector3().fromArray(primary.outline, coordinate).applyMatrix4(primary.node.matrixWorld);
          const actual = new THREE.Vector3().fromArray(output, start + coordinate).applyMatrix4(f.overlay.matrixWorld);
          maximumError = Math.max(maximumError, expected.distanceTo(actual));
        }
        expect(maximumError).toBeLessThan(.000003);
        const leader = new THREE.Vector3().fromArray(output, start + primary.outline.length).applyMatrix4(f.overlay.matrixWorld);
        expect(leader.distanceTo(primary.point.clone().applyMatrix4(primary.node.matrixWorld))).toBeLessThan(.000003);
        expect(f.overlay.geometry.drawRange).toEqual({ start: 0, count: 130 });
        expect(f.overlay.geometry.attributes.position.array).toBe(output);
        expect(output.every(Number.isFinite)).toBe(true);
      }
    }
    dispose(f.scene);
  });

  it.each(species)('preserves %s camera fit, geometry, phase and learner work when changing contour focus', id => {
    const f = fixture(id), bird = f.bird;
    f.update(1);
    const snapshot = geometrySnapshot(bird), resources = resourceSet(f.scene);
    const camera = [f.camera.position.toArray(), f.camera.quaternion.toArray(), f.camera.projectionMatrix.toArray()];
    const pose = [];
    bird.traverse(node => pose.push([node.uuid, node.position.toArray(), node.quaternion.toArray(), node.scale.toArray()]));
    const radius = bird.userData.studyRadius, work = JSON.stringify(f.engine.learnerWork);
    const timing = [f.engine.time, f.engine.wingStepSerial, f.engine.wingStepPhase, bird.userData.phase, bird.userData.lastRenderedWingPhase];
    const apply = vi.spyOn(bird.userData, 'applyWingPhase');
    for (const side of [0, 1]) for (const isDark of [false, true]) for (const region of ['primaries', 'head', 'inner-wing', 'tail']) f.update(side, region, isDark);
    expect(apply).not.toHaveBeenCalled();
    expect(resourceSet(f.scene)).toEqual(resources);
    expect(bird.userData.studyRadius).toBe(radius);
    const after = [];
    bird.traverse(node => after.push([node.uuid, node.position.toArray(), node.quaternion.toArray(), node.scale.toArray()]));
    expect(after).toEqual(pose);
    assertGeometryUnchanged(snapshot);
    expect([f.camera.position.toArray(), f.camera.quaternion.toArray(), f.camera.projectionMatrix.toArray()]).toEqual(camera);
    expect([f.engine.time, f.engine.wingStepSerial, f.engine.wingStepPhase, bird.userData.phase, bird.userData.lastRenderedWingPhase]).toEqual(timing);
    expect(JSON.stringify(f.engine.learnerWork)).toBe(work);
    dispose(f.scene);
  });

  it.each(species)('keeps %s contours inside the existing pooled overlay and disposes resources once', id => {
    const f = fixture(id), positions = f.overlay.geometry.attributes.position.array;
    const colors = f.overlay.geometry.attributes.color.array;
    const overlayResources = new Set([...resourceSet(f.overlay), ...resourceSet(f.markers)]);
    const allResources = resourceSet(f.scene);
    expect(overlayResources.size).toBe(15);
    expect(positions.length).toBe(576); expect(colors.length).toBe(576);
    expect(positions.byteLength + colors.byteLength).toBe(4608);
    const outline = f.bird.userData.anatomyAnchors[2].outline;
    const captured = outline.slice();
    for (let iteration = 0; iteration < 12; iteration++) {
      f.engine.host.clientWidth = iteration % 2 ? 390 : 780;
      f.engine.host.clientHeight = iteration % 2 ? 700 : 560;
      f.camera.aspect = f.engine.host.clientWidth / f.engine.host.clientHeight;
      f.camera.updateProjectionMatrix(); f.phase(iteration * .3); f.update(iteration % 2, 'primaries', iteration % 3 === 0);
      expect(f.overlay.geometry.drawRange.count).toBe(130);
      expect(f.overlay.geometry.drawRange.count).toBeLessThanOrEqual(f.overlay.geometry.attributes.position.count);
      expect(f.overlay.geometry.attributes.position.array).toBe(positions);
      expect(f.overlay.geometry.attributes.color.array).toBe(colors);
      expect(f.bird.userData.anatomyAnchorsBySide[iteration % 2][2].outline).toBe(outline);
      expect(outline).toEqual(captured);
      expect(resourceSet(f.scene)).toEqual(allResources);
    }
    const listeners = [...allResources].map(resource => {
      const listener = vi.fn(); resource.addEventListener('dispose', listener); return listener;
    });
    dispose(f.scene);
    for (const listener of listeners) expect(listener).toHaveBeenCalledTimes(1);
  });

  it('retains whole-wing Monarch semantics without bird contours', () => {
    const f = fixture('monarch');
    expect(f.bird.userData.anatomyAnchors).toEqual([]);
    expect(f.bird.userData.anatomyAnchorsBySide).toEqual([]);
    const geometry = geometrySnapshot(f.bird), resources = resourceSet(f.scene);
    for (const side of [0, 1]) {
      f.update(side);
      expect(f.overlay.visible).toBe(false); expect(f.markers.visible).toBe(false);
      expect(f.overlay.geometry.drawRange.count).toBe(0);
      expect(f.overlay.userData.sourceBirdUuid).toBe('');
    }
    expect(resourceSet(f.scene)).toEqual(resources); assertGeometryUnchanged(geometry);
    dispose(f.scene);
  });
});
