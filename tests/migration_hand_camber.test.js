import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const sourcePath = process.env.MIGRATION_HAND_CAMBER_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing canonical hand camber source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') +
  '\nreturn { createMigrationWingGeometry, createMigrationFlyer, migrationStudyDistance };')(num);
const guides = new Function(section('      function createMigrationMarkedWingPose(', '      function initMigrationFlightScene(') +
  '\nreturn { createMigrationWingtipPath, createMigrationMarkedWingPose };')();
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') +
  '\nreturn disposeMigrationObject;')();
const birds = ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit'];
const planforms = [[1, 1], [1.38, .86], [1.7, .57], [1.62, .86], [1.38, .57]];
const mirroredPlanforms = planforms.flatMap(([reach, sweep]) => [-1, 1].map(side => ({ reach, sweep, side })));
const roots = new Set(), geometries = new Set();
const rimOrder = [0, 2, 3, 4, 1];

afterEach(() => {
  for (const root of roots) dispose(root);
  for (const geometry of geometries) geometry.dispose();
  roots.clear(); geometries.clear();
});
function point(attribute, index) { return new THREE.Vector3().fromBufferAttribute(attribute, index); }
function originalHandVertices(side, reach, sweep) {
  const values = new Float32Array([0, 0, -.40 * sweep, 0, 0, .28 * sweep,
    .28 * reach * side, .03, -.24 * sweep, .50 * reach * side, .06, .05 * sweep,
    .34 * reach * side, .045, .14 * sweep]);
  return Array.from({ length: 5 }, (_, i) => new THREE.Vector3().fromArray(values, i * 3));
}
function pointKey(value) { return value.toArray().map(Math.fround).join(','); }
function edgeKey(a, b) { return [pointKey(a), pointKey(b)].sort().join('|'); }
function pairEdges(points) {
  const result = [];
  for (let i = 0; i < points.length; i += 2) result.push(edgeKey(points[i], points[i + 1]));
  return result.sort();
}
function oldSurfaceHeight(value, rim) {
  // Independent original three-triangle surface oracle, rather than the new
  // stations or triangulation. An interior point must lie on exactly its planform.
  for (const [ia, ib, ic] of [[0, 2, 1], [2, 4, 1], [2, 3, 4]]) {
    const a = rim[ia], b = rim[ib], c = rim[ic];
    const denominator = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
    const u = ((b.z - c.z) * (value.x - c.x) + (c.x - b.x) * (value.z - c.z)) / denominator;
    const v = ((c.z - a.z) * (value.x - c.x) + (a.x - c.x) * (value.z - c.z)) / denominator;
    const w = 1 - u - v;
    if (Math.min(u, v, w) >= -1e-6) return u * a.y + v * b.y + w * c.y;
  }
  return null;
}
function reachAndSweep(id) {
  return [id === 'arctic_tern' ? 1.7 : id === 'sandhill_crane' ? 1.62 : 1.38,
    id === 'arctic_tern' || id === 'peregrine' ? .57 : .86];
}
function hands(bird) {
  return bird.userData.wrists.map((wrist, side) => wrist.children.find(node => node.isMesh && node !== bird.userData.primaries[side]));
}
function resources(root) {
  const nodes = [], geometry = new Set(), material = new Set();
  root.traverse(node => {
    nodes.push(node.uuid);
    if (node.geometry) geometry.add(node.geometry.uuid);
    for (const item of Array.isArray(node.material) ? node.material : [node.material]) if (item) material.add(item.uuid);
  });
  return { nodes: nodes.sort(), geometry: [...geometry].sort(), material: [...material].sort() };
}
function snapshot(root) {
  const states = [];
  root.traverse(node => states.push({ node, rotation: node.rotation.toArray(), quaternion: node.quaternion.toArray(),
    matrix: node.matrix.toArray(), world: node.matrixWorld.toArray(), automatic: node.matrixAutoUpdate }));
  return states;
}
function expectSnapshot(states) {
  for (const item of states) {
    expect(item.node.rotation.toArray()).toEqual(item.rotation);
    expect(item.node.quaternion.toArray()).toEqual(item.quaternion);
    expect(item.node.matrix.toArray()).toEqual(item.matrix);
    expect(item.node.matrixWorld.toArray()).toEqual(item.world);
    expect(item.node.matrixAutoUpdate).toBe(item.automatic);
  }
}
function fixture(id) {
  const scene = new THREE.Scene(), flock = new THREE.Group(); scene.add(flock); roots.add(scene);
  flock.position.set(.3, 1.2, -.4); flock.rotation.y = .07;
  const bird = model.createMigrationFlyer(THREE, { id }, 0); flock.add(bird);
  bird.position.set(0, .5, -5); bird.userData.applyWingPhase(.713);
  const camera = new THREE.PerspectiveCamera(54, 1, .1, 900);
  const pathGuide = guides.createMigrationWingtipPath(THREE), marked = guides.createMigrationMarkedWingPose(THREE);
  scene.add(pathGuide, marked); scene.updateMatrixWorld(true);
  camera.position.copy(bird.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(4, 3, 7));
  camera.lookAt(bird.getWorldPosition(new THREE.Vector3())); camera.updateMatrixWorld(true);
  return { scene, flock, bird, camera, pathGuide, marked };
}

describe('Stylized wrist-local hand-panel camber', () => {
  it.each(mirroredPlanforms)('preserves the five-point rim and valid shallow relief for side$side reach$reach sweep$sweep', ({ side, reach, sweep }) => {
    const geometry = model.createMigrationWingGeometry(THREE, side, reach, sweep, 'outer'); geometries.add(geometry);
    const positions = geometry.attributes.position, normals = geometry.attributes.normal, rim = originalHandVertices(side, reach, sweep);
    expect(positions.count).toBe(7); expect(normals.count).toBe(7); expect(geometry.index.count).toBe(21);
    expect(geometry.attributes.color).toBeUndefined();
    for (let i = 0; i < 5; i++) expect(point(positions, i).toArray()).toEqual(rim[i].toArray());
    for (const attribute of Object.values(geometry.attributes)) expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
    const usage = new Map();
    for (let i = 0; i < geometry.index.count; i += 3) {
      const tri = [geometry.index.getX(i), geometry.index.getX(i + 1), geometry.index.getX(i + 2)];
      expect(tri.every(index => Number.isInteger(index) && index >= 0 && index < 7)).toBe(true);
      const [a, b, c] = tri.map(index => point(positions, index));
      const normal = b.sub(a).cross(c.sub(a));
      expect(normal.length() / 2).toBeGreaterThan(.00001);
      expect(-side * normal.clone().normalize().y).toBeGreaterThan(.7);
      for (let edge = 0; edge < 3; edge++) {
        const key = [tri[edge], tri[(edge + 1) % 3]].sort((a, b) => a - b).join(':');
        usage.set(key, (usage.get(key) || 0) + 1);
      }
    }
    expect([...usage.values()].every(count => count === 1 || count === 2)).toBe(true);
    const actualBoundary = [...usage].filter(([, count]) => count === 1).map(([key]) => key).sort();
    const expectedBoundary = rimOrder.map((value, i) => [value, rimOrder[(i + 1) % 5]].sort((a, b) => a - b).join(':')).sort();
    expect(actualBoundary).toEqual(expectedBoundary);
    for (let i = 0; i < normals.count; i++) {
      expect(point(normals, i).length()).toBeCloseTo(1, 5); expect(-side * normals.getY(i)).toBeGreaterThan(0);
    }
    for (const index of [5, 6]) {
      const value = point(positions, index), originalY = oldSurfaceHeight(value, rim);
      expect(originalY).not.toBeNull();
      expect(value.y - originalY).toBeGreaterThan(.012);
      expect(value.y - originalY).toBeLessThan(.05);
      expect(value.y).toBeLessThan(.075);
    }
    const edges = new THREE.EdgesGeometry(geometry, 180); geometries.add(edges);
    const actualEdges = Array.from({ length: edges.attributes.position.count }, (_, i) => point(edges.attributes.position, i));
    const expectedEdges = [];
    for (let i = 0; i < rimOrder.length; i++) expectedEdges.push(rim[rimOrder[i]], rim[rimOrder[(i + 1) % 5]]);
    expect(actualEdges).toHaveLength(10); expect(pairEdges(actualEdges)).toEqual(pairEdges(expectedEdges));
  });

  it.each(birds)('retains%s material sharing, study envelope, anatomy and wake anchors through the illustrative cycle', id => {
    const bird = model.createMigrationFlyer(THREE, { id }, 0); roots.add(bird); bird.updateMatrixWorld(true);
    const handMeshes = hands(bird), [reach, sweep] = reachAndSweep(id), resourceBefore = resources(bird);
    expect(handMeshes).toHaveLength(2);
    const material = handMeshes[0].material;
    expect(handMeshes[1].material).toBe(material); expect(material.side).toBe(THREE.DoubleSide);
    expect(material.vertexColors).toBe(false);
    for (let side = 0; side < 2; side++) {
      const hand = handMeshes[side], wrist = bird.userData.wrists[side];
      expect(hand.parent).toBe(wrist); expect(hand.children).toHaveLength(0);
      expect(hand.geometry.attributes.position.count).toBe(7);
      expect(wrist.children).toHaveLength(2);
      const inner = bird.userData.wings[side].children.find(node => node.isMesh);
      const otherInner = bird.userData.wings[1 - side].children.find(node => node.isMesh);
      expect(hand.material).not.toBe(inner.material);
      expect(inner.material).toBe(otherInner.material);
      expect(inner.material.vertexColors).toBe(true);
      expect(inner.material.color.getHex()).toBe(hand.material.color.getHex());
      expect(inner.material.roughness).toBe(hand.material.roughness);
      const anchor = bird.userData.wakeAnchors[side];
      expect(anchor.node).toBe(wrist); expect(anchor.side).toBe(side === 0 ? -1 : 1);
      expect(anchor.point.toArray()).toEqual([(side === 0 ? -1 : 1) * reach * .50, .06, .05 * sweep]);
      const anatomy = bird.userData.anatomyAnchorsBySide[side];
      expect(anatomy[1].node).toBe(bird.userData.wings[side]); expect(anatomy[1].outline.length).toBe(24);
      expect(anatomy[2].node).toBe(bird.userData.primaries[side]);
      expect(anatomy[2].point.toArray()).toEqual([reach * .39, .10, sweep * .32]);
    }
    const fixed = handMeshes.map(mesh => ({ mesh, geometry: mesh.geometry, material: mesh.material,
      index: mesh.geometry.index, indexArray: mesh.geometry.index.array,
      attributes: Object.values(mesh.geometry.attributes).map(attribute => ({ attribute, array: attribute.array, values: Array.from(attribute.array) })) }));
    let legacyRadius = 0;
    bird.traverse(node => {
      const positions = node.geometry?.attributes.position;
      if (!positions) return;
      for (let i = 0; i < positions.count; i++) {
        if (handMeshes.includes(node) && i >= 5) continue;
        legacyRadius = Math.max(legacyRadius, point(positions, i).applyMatrix4(node.matrixWorld).length());
      }
    });
    expect(bird.userData.studyRadius).toBeCloseTo(legacyRadius * 1.08, 12);
    const previousFit = model.migrationStudyDistance(bird, new THREE.PerspectiveCamera(54, 388 / 390, .1, 900), 1);
    expect(Number.isFinite(previousFit)).toBe(true);
    for (let phase = 0; phase < 8; phase++) {
      bird.userData.applyWingPhase(phase * Math.PI / 4); bird.updateMatrixWorld(true);
      for (const hand of handMeshes) for (let i = 0; i < hand.geometry.attributes.position.count; i++)
        expect(point(hand.geometry.attributes.position, i).applyMatrix4(hand.matrixWorld).length()).toBeLessThan(bird.userData.studyRadius);
    }
    expect(resources(bird)).toEqual(resourceBefore);
    for (const item of fixed) {
      expect(item.mesh.geometry).toBe(item.geometry); expect(item.mesh.material).toBe(item.material);
      expect(item.geometry.index).toBe(item.index); expect(item.geometry.index.array).toBe(item.indexArray);
      for (const attribute of item.attributes) { expect(attribute.attribute.array).toBe(attribute.array); expect(Array.from(attribute.array)).toEqual(attribute.values); }
    }
  });

  it.each(birds)('keeps%s actual path sampling, marked hand boundaries and all resources stable', id => {
    const f = fixture(id), saved = snapshot(f.bird), fixedResources = resources(f.scene), handMeshes = hands(f.bird);
    const handBuffers = handMeshes.map(hand => ({ geometry: hand.geometry, positions: hand.geometry.attributes.position.array,
      values: Array.from(hand.geometry.attributes.position.array) }));
    f.pathGuide.updatePath(true, 'study', f.bird, id, 0, f.camera, true, 390, .713, null, 0);
    expect(f.pathGuide.userData.available).toBe(true); expect(f.pathGuide.userData.sampleCount).toBe(64);
    expectSnapshot(saved);
    expect(f.pathGuide.userData.sources.map(source => source.nodeUuid)).toEqual(f.bird.userData.primaries.map(primary => primary.uuid));
    expect(f.pathGuide.userData.sources.some(source => handMeshes.some(hand => hand.uuid === source.nodeUuid))).toBe(false);
    expect(f.marked.capturePose(f.bird, id, 0)).toBe(true); expectSnapshot(saved);
    const [reach, sweep] = reachAndSweep(id), inverseBird = f.bird.matrixWorld.clone().invert(), captured = f.marked.geometry.attributes.position;
    for (let side = 0; side < 2; side++) {
      const hand = handMeshes[side], source = f.marked.userData.sources.find(source => source.nodeUuid === hand.uuid);
      expect(source).toBeTruthy(); expect(source.vertexCount).toBe(10);
      const rim = originalHandVertices(side === 0 ? -1 : 1, reach, sweep).map(value => value.applyMatrix4(hand.matrixWorld).applyMatrix4(inverseBird));
      const expected = [];
      for (let i = 0; i < rimOrder.length; i++) expected.push(rim[rimOrder[i]], rim[rimOrder[(i + 1) % 5]]);
      const actual = Array.from({ length: source.vertexCount }, (_, i) => point(captured, source.offset + i));
      expect(pairEdges(actual)).toEqual(pairEdges(expected));
    }
    expect(f.marked.geometry.drawRange.count).toBeLessThan(300);
    const frozen = Array.from(captured.array);
    f.bird.userData.applyWingPhase(2.713); f.bird.updateWorldMatrix(true, true);
    f.marked.updatePose(f.bird, 'study', true, true, f.camera, 390, 0, 390);
    expect(Array.from(captured.array)).toEqual(frozen); expect(resources(f.scene)).toEqual(fixedResources);
    handMeshes.forEach((mesh, side) => {
      expect(mesh.geometry).toBe(handBuffers[side].geometry);
      expect(mesh.geometry.attributes.position.array).toBe(handBuffers[side].positions);
      expect(Array.from(mesh.geometry.attributes.position.array)).toEqual(handBuffers[side].values);
    });
  });

  it.each([-1, 1])('leaves the legacy continuous-membrane branch unchanged for side%s', side => {
    const geometry = model.createMigrationWingGeometry(THREE, side, .82, .62, ''); geometries.add(geometry);
    expect(geometry.attributes.position.count).toBe(7); expect(geometry.index.count).toBe(15);
    const expected = new Float32Array([.04 * side, 0, -.46 * .62, .04 * side, 0, .44 * .62,
      .50 * .82 * side, .055, -.40 * .62, .48 * .82 * side, .045, .33 * .62,
      .78 * .82 * side, .085, -.24 * .62, .82 * side, .115, .05 * .62, .90 * .82 * side, .100, .27 * .62]);
    expect(Array.from(geometry.attributes.position.array)).toEqual(Array.from(expected));
  });

  it('leaves actual Monarch lobes and their shared resources outside the bird hand-panel change', () => {
    const monarch = model.createMigrationFlyer(THREE, { id: 'monarch' }, 0); roots.add(monarch);
    expect(monarch.userData.wrists).toEqual([]); expect(monarch.userData.primaries).toEqual([]);
    for (const name of ['migration-monarch-forewing', 'migration-monarch-hindwing']) {
      const meshes = []; monarch.traverse(node => { if (node.name === name) meshes.push(node); });
      expect(meshes).toHaveLength(2); expect(meshes[0].geometry).toBe(meshes[1].geometry);
      expect(meshes[0].material).toBe(meshes[1].material);
    }
  });
});
