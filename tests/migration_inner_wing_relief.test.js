import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing canonical inner-wing source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') +
  '\nreturn { createMigrationWingGeometry, createMigrationFlyer };')(num);
const guides = new Function(section('      function createMigrationMarkedWingPose(', '      function initMigrationFlightScene(') +
  '\nreturn { createMigrationWingtipPath, createMigrationMarkedWingPose };')();
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const birds = ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit'];
const planforms = [[1, 1], [1.38, .86], [1.7, .57], [1.62, .86], [1.38, .57]];
// Measured from frozen baseline dae5808c (baseline-inner-resource-measurements.json),
// including its two former shaft-line nodes/geometries.
// The new lit material replaces the single shaft material; it adds no budget.
const legacyResources = {
  canada_goose: [22, 15, 11], snow_goose: [21, 14, 10], arctic_tern: [23, 15, 11],
  ruby_hummingbird: [23, 15, 11], peregrine: [21, 14, 10], sandhill_crane: [26, 17, 13], bartailed_godwit: [23, 15, 11]
};
const roots = new Set(), geometries = new Set();
afterEach(() => {
  for (const root of roots) dispose(root);
  for (const geometry of geometries) geometry.dispose();
  roots.clear(); geometries.clear();
});
function point(attribute, index) { return new THREE.Vector3().fromBufferAttribute(attribute, index); }
function originalRim(side, reach, sweep) {
  const values = new Float32Array([.04 * side, 0, -.46 * sweep, .04 * side, 0, .44 * sweep,
    .50 * reach * side, .055, -.40 * sweep, .50 * reach * side, .055, .28 * sweep]);
  return [0, 2, 3, 1].map(index => new THREE.Vector3().fromArray(values, index * 3));
}
function edgeKey(a, b) { return [a, b].map(value => value.toArray().map(Math.fround).join(',')).sort().join('|'); }
function pairEdges(points) {
  const edges = [];
  for (let i = 0; i < points.length; i += 2) edges.push(edgeKey(points[i], points[i + 1]));
  return edges.sort();
}
function originalSurfaceXZ(value, rim) {
  // Independent triangles spanning the four legacy corners, not the inset grid.
  for (const [ia, ib, ic] of [[0, 1, 2], [0, 2, 3]]) {
    const a = rim[ia], b = rim[ib], c = rim[ic];
    const denominator = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
    const u = ((b.z - c.z) * (value.x - c.x) + (c.x - b.x) * (value.z - c.z)) / denominator;
    const v = ((c.z - a.z) * (value.x - c.x) + (a.x - c.x) * (value.z - c.z)) / denominator;
    const w = 1 - u - v;
    if (Math.min(u, v, w) >= -1e-6) return u * a.y + v * b.y + w * c.y;
  }
  return null;
}
function wingGeometry(side, reach, sweep, type = 'inner') {
  const geometry = model.createMigrationWingGeometry(THREE, side, reach, sweep, type);
  geometries.add(geometry); return geometry;
}
function dims(id) { return [id === 'arctic_tern' ? 1.7 : id === 'sandhill_crane' ? 1.62 : 1.38, id === 'arctic_tern' || id === 'peregrine' ? .57 : .86]; }
function inners(bird) { return bird.userData.wings.map(wing => wing.children.find(node => node.isMesh)); }
function snapshot(root) {
  const states = [];
  root.traverse(node => states.push({ node, rotation: node.rotation.toArray(), quaternion: node.quaternion.toArray(),
    matrix: node.matrix.toArray(), world: node.matrixWorld.toArray(), automatic: node.matrixAutoUpdate }));
  return states;
}
function expectSnapshot(states) {
  for (const state of states) {
    expect(state.node.rotation.toArray()).toEqual(state.rotation);
    expect(state.node.quaternion.toArray()).toEqual(state.quaternion);
    expect(state.node.matrix.toArray()).toEqual(state.matrix);
    expect(state.node.matrixWorld.toArray()).toEqual(state.world);
    expect(state.node.matrixAutoUpdate).toBe(state.automatic);
  }
}
function resources(root) {
  const nodes = [], geometry = new Set(), material = new Set();
  root.traverse(node => {
    nodes.push(node.uuid);
    if (node.geometry) geometry.add(node.geometry);
    for (const value of Array.isArray(node.material) ? node.material : [node.material]) if (value) material.add(value);
  });
  return { nodes, geometry: [...geometry], material: [...material] };
}

describe('Shallow inner-wing relief inside the preserved shoulder rim', () => {
  it.each(planforms)('keeps a closed interior triangulation and the exact four boundary edges for reach%s sweep%s', (reach, sweep) => {
    for (const side of [-1, 1]) {
      const geometry = wingGeometry(side, reach, sweep), p = geometry.attributes.position, rim = originalRim(side, reach, sweep);
      const usage = new Map();
      let projectedArea = 0;
      expect(p.count).toBeGreaterThan(12); expect(p.count).toBeLessThan(64);
      expect(geometry.index.count / 3).toBeLessThan(120);
      for (let i = 0; i < geometry.index.count; i += 3) {
        const triangle = [geometry.index.getX(i), geometry.index.getX(i + 1), geometry.index.getX(i + 2)];
        expect(triangle.every(index => Number.isInteger(index) && index >= 0 && index < p.count)).toBe(true);
        const [a, b, c] = triangle.map(index => point(p, index));
        const normal = b.sub(a).cross(c.sub(a));
        expect(normal.length()).toBeGreaterThan(.000001);
        expect(normal.y * side).toBeLessThan(0);
        projectedArea += Math.abs(normal.y) / 2;
        for (let j = 0; j < 3; j++) {
          const key = [triangle[j], triangle[(j + 1) % 3]].sort((a, b) => a - b).join(':');
          usage.set(key, (usage.get(key) || 0) + 1);
        }
      }
      expect([...usage.values()].every(count => count === 1 || count === 2)).toBe(true);
      expect(p.count - usage.size + geometry.index.count / 3).toBe(1);
      const boundary = [...usage.entries()].filter(([, count]) => count === 1).map(([key]) => key.split(':').map(Number));
      expect(boundary).toHaveLength(4);
      const expectedEdges = rim.map((value, index) => edgeKey(value, rim[(index + 1) % 4])).sort();
      expect(boundary.map(([a, b]) => edgeKey(point(p, a), point(p, b))).sort()).toEqual(expectedEdges);
      const edges = new THREE.EdgesGeometry(geometry, 180); geometries.add(edges);
      expect(edges.attributes.position.count).toBe(8);
      expect(pairEdges(Array.from({ length: 8 }, (_, i) => point(edges.attributes.position, i)))).toEqual(expectedEdges);
      const rimArea = Math.abs(rim.reduce((area, value, index) => area + value.x * rim[(index + 1) % 4].z - rim[(index + 1) % 4].x * value.z, 0)) / 2;
      expect(projectedArea).toBeCloseTo(rimArea, 7);
    }
  });

  it.each(planforms)('adds mirrored raised surface normals and tints within the rim at reach%s sweep%s', (reach, sweep) => {
    const left = wingGeometry(-1, reach, sweep), right = wingGeometry(1, reach, sweep);
    expect(Array.from(left.index.array)).toEqual(Array.from(right.index.array));
    for (const [side, geometry] of [[-1, left], [1, right]]) {
      const p = geometry.attributes.position, normals = geometry.attributes.normal, colors = geometry.attributes.color, rim = originalRim(side, reach, sweep);
      expect(normals.count).toBe(p.count); expect(colors.count).toBe(p.count);
      for (const attribute of Object.values(geometry.attributes)) expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
      const shades = [], sidewaysNormals = [];
      for (let i = 0; i < p.count; i++) {
        const value = point(p, i), plane = originalSurfaceXZ(value, rim), normal = point(normals, i);
        expect(plane).not.toBeNull(); expect(value.y).toBeLessThan(.12);
        expect(normal.length()).toBeCloseTo(1, 5); expect(normal.y * side).toBeLessThan(0);
        expect(colors.getX(i)).toBe(colors.getY(i)); expect(colors.getY(i)).toBe(colors.getZ(i));
        expect(colors.getX(i)).toBeGreaterThanOrEqual(.8); expect(colors.getX(i)).toBeLessThanOrEqual(1);
        if (i >= 4) expect(value.y - plane).toBeGreaterThan(.001);
        shades.push(colors.getX(i)); sidewaysNormals.push(normals.getX(i));
      }
      expect(Math.max(...shades) - Math.min(...shades)).toBeGreaterThan(.12);
      expect(Math.max(...sidewaysNormals) - Math.min(...sidewaysNormals)).toBeGreaterThan(.2);
    }
    for (let i = 0; i < left.attributes.position.count; i++) {
      const a = point(left.attributes.position, i), b = point(right.attributes.position, i);
      expect(a.toArray()).toEqual([-b.x, b.y, b.z]);
      const na = point(left.attributes.normal, i), nb = point(right.attributes.normal, i);
      expect(na.distanceTo(new THREE.Vector3(nb.x, -nb.y, -nb.z))).toBeLessThan(.000001);
    }
  });

  it.each(planforms)('keeps surface facets facing the From above view and nearby elevations at reach%s sweep%s', (reach, sweep) => {
    for (const side of [-1, 1]) {
      const geometry = wingGeometry(side, reach, sweep), p = geometry.attributes.position;
      // The original four-corner winding changes with the mirrored shoulder.
      // Compare actual triangle normals with independent camera directions;
      // this does not depend on grid rows, ridge heights, or a shading formula.
      for (const elevation of [55, 60, 65, 70]) {
        const radians = elevation * Math.PI / 180;
        const towardCamera = new THREE.Vector3(0, Math.sin(radians), Math.cos(radians));
        for (let i = 0; i < geometry.index.count; i += 3) {
          const a = point(p, geometry.index.getX(i));
          const b = point(p, geometry.index.getX(i + 1));
          const c = point(p, geometry.index.getX(i + 2));
          const upperFace = b.sub(a).cross(c.sub(a)).normalize().multiplyScalar(-side);
          // Near-reversed transition facets triggered DoubleSide shading flips
          // and tiny dark speckles. Leave a margin before that grazing angle.
          expect(upperFace.dot(towardCamera)).toBeGreaterThan(.2);
        }
      }
    }
  });

  it.each(birds)('reuses the %s inner surfaces through articulation and disposes each shared resource once', id => {
    const bird = model.createMigrationFlyer(THREE, { id }, 0); roots.add(bird); bird.updateMatrixWorld(true);
    const inner = inners(bird), material = inner[0].material, before = resources(bird), [reach, sweep] = dims(id);
    const [oldNodes, oldGeometry, oldMaterial] = legacyResources[id];
    // Peregrine rings share their bill material. Continuous hummingbird and
    // crane, tern and Canada Goose head colors replace detached markings.
    const headNodes = id === 'peregrine' ? 1 : id === 'ruby_hummingbird' ? -2 : id === 'sandhill_crane' ? -3 : id === 'arctic_tern' || id === 'canada_goose' ? -1 : 0;
    const headGeometry = id === 'peregrine' ? 1 : id === 'ruby_hummingbird' ? -1 : id === 'sandhill_crane' ? -2 : id === 'arctic_tern' || id === 'canada_goose' ? -1 : 0;
    const headMaterialsRemoved = id === 'ruby_hummingbird' ? 1 : id === 'sandhill_crane' ? 2 : id === 'arctic_tern' || id === 'canada_goose' ? 1 : 0;
    expect(before.nodes).toHaveLength(oldNodes - 2 + headNodes);
    expect(before.geometry).toHaveLength(oldGeometry - 2 + headGeometry);
    expect(before.material).toHaveLength(oldMaterial - headMaterialsRemoved);
    expect(inner).toHaveLength(2); expect(inner[1].material).toBe(material);
    expect(material.isMeshStandardMaterial).toBe(true); expect(material.vertexColors).toBe(true); expect(material.side).toBe(THREE.DoubleSide);
    expect(material.roughness).toBe(.72);
    const buffers = [];
    let oldEnvelope = 0;
    bird.traverse(node => {
      const p = node.geometry?.attributes.position;
      if (!p) return;
      const points = inner.includes(node) ? originalRim(node === inner[0] ? -1 : 1, reach, sweep) : Array.from({ length: p.count }, (_, i) => point(p, i));
      for (const value of points) oldEnvelope = Math.max(oldEnvelope, value.applyMatrix4(node.matrixWorld).length());
    });
    expect(bird.userData.studyRadius).toBeCloseTo(oldEnvelope * 1.08, 12);
    for (let side = 0; side < 2; side++) {
      const shoulder = bird.userData.wings[side], hand = bird.userData.wrists[side].children.find(node => node !== bird.userData.primaries[side]);
      expect(inner[side].parent).toBe(shoulder); expect(inner[side].children).toHaveLength(0);
      expect(shoulder.children.filter(node => node.isLineSegments)).toHaveLength(0);
      expect(shoulder.children).toHaveLength(2);
      expect(hand.material).not.toBe(material); expect(hand.material.vertexColors).toBe(false);
      expect(hand.material.color.getHex()).toBe(material.color.getHex()); expect(hand.material.roughness).toBe(material.roughness);
      expect(hand.geometry.attributes.position.count).toBe(7); expect(hand.geometry.attributes.color).toBeUndefined();
      const anatomy = bird.userData.anatomyAnchorsBySide[side];
      expect(anatomy[1].node).toBe(shoulder);
      expect(anatomy[1].point.toArray()).toEqual([(side === 0 ? -1 : 1) * reach * .27, .10, 0]);
      expect(anatomy[1].outline.length).toBe(24);
      for (const attribute of Object.values(inner[side].geometry.attributes)) buffers.push({ attribute, array: attribute.array, copy: Array.from(attribute.array) });
    }
    for (let phase = 0; phase < 8; phase++) {
      bird.userData.applyWingPhase(phase * Math.PI / 4); bird.updateWorldMatrix(true, true);
      for (const mesh of inner) for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
        expect(point(mesh.geometry.attributes.position, i).applyMatrix4(mesh.matrixWorld).length()).toBeLessThan(bird.userData.studyRadius);
      }
    }
    expect(resources(bird)).toEqual(before);
    for (const item of buffers) { expect(item.attribute.array).toBe(item.array); expect(Array.from(item.array)).toEqual(item.copy); }
    const observed = [...before.geometry, ...before.material].map(resource => {
      const counter = { count: 0 }; resource.addEventListener('dispose', () => counter.count++); return counter;
    });
    dispose(bird); roots.delete(bird);
    expect(observed.every(counter => counter.count === 1)).toBe(true);
  });

  it.each(birds)('keeps %s marks on the old shoulder outline and samples the same live primary tip without moving the pose', id => {
    const scene = new THREE.Scene(), bird = model.createMigrationFlyer(THREE, { id }, 0);
    roots.add(scene); scene.add(bird); bird.position.set(.3, 1.2, -5); bird.rotation.y = .07;
    bird.userData.applyWingPhase(.713);
    const path = guides.createMigrationWingtipPath(THREE), marked = guides.createMigrationMarkedWingPose(THREE);
    scene.add(path, marked); scene.updateMatrixWorld(true);
    const camera = new THREE.PerspectiveCamera(54, 1, .1, 900);
    camera.position.set(4, 3, 2); camera.lookAt(bird.position); camera.updateMatrixWorld(true);
    const saved = snapshot(bird), before = resources(scene), inner = inners(bird), [reach, sweep] = dims(id);
    path.updatePath(true, 'study', bird, id, 0, camera, true, 390, .713, null, 0);
    expect(path.userData.available).toBe(true); expectSnapshot(saved);
    expect(marked.capturePose(bird, id, 0)).toBe(true); expectSnapshot(saved);
    const inverse = bird.matrixWorld.clone().invert(), captured = marked.geometry.attributes.position;
    for (let side = 0; side < 2; side++) {
      const record = marked.userData.sources.find(item => item.nodeUuid === inner[side].uuid);
      expect(record.vertexCount).toBe(8);
      const rim = originalRim(side === 0 ? -1 : 1, reach, sweep).map(value => value.applyMatrix4(inner[side].matrixWorld).applyMatrix4(inverse));
      const actual = Array.from({ length: 8 }, (_, i) => point(captured, record.offset + i));
      // Capture buffers quantize body-relative points; compare each whole edge.
      for (let edge = 0; edge < 4; edge++) {
        const a = rim[edge], b = rim[(edge + 1) % 4];
        expect(actual.some((value, index) => index % 2 === 0 &&
          ((value.distanceTo(a) < 1e-6 && actual[index + 1].distanceTo(b) < 1e-6) ||
          (value.distanceTo(b) < 1e-6 && actual[index + 1].distanceTo(a) < 1e-6)))).toBe(true);
      }
      const endpoint = path.userData.sources.find(item => item.side === side), primary = bird.userData.primaries[side];
      expect(endpoint.nodeUuid).toBe(primary.uuid); expect(endpoint.geometryUuid).toBe(primary.geometry.uuid);
      const tip = point(primary.geometry.attributes.position, endpoint.vertexIndex);
      // Outermost original primary's five-point rim; relief is never the tip.
      const feather = 4, x = (.10 + feather * .072) * reach, spread = (.06 + feather * .038) * reach;
      expect(tip.x).toBe(Math.fround(x + spread + .047 * reach * .60));
      expect(tip.y).toBe(Math.fround(.075));
    }
    const frozen = Array.from(captured.array);
    bird.userData.applyWingPhase(2.713); bird.updateWorldMatrix(true, true);
    marked.updatePose(bird, 'study', true, true, camera, 390, 0, 390);
    expect(Array.from(captured.array)).toEqual(frozen);
    expect(resources(scene)).toEqual(before);
  });

  it('keeps Monarch membranes and the legacy continuous-wing helper outside bird secondary relief', () => {
    for (const side of [-1, 1]) {
      const geometry = wingGeometry(side, .82, .62, '');
      expect(geometry.attributes.position.count).toBe(7); expect(geometry.index.count).toBe(15);
      expect(geometry.attributes.color).toBeUndefined();
    }
    const monarch = model.createMigrationFlyer(THREE, { id: 'monarch' }, 0); roots.add(monarch);
    expect(monarch.userData.primaries).toEqual([]); expect(monarch.userData.wrists).toEqual([]);
    for (const wing of monarch.userData.wings) {
      expect(wing.children.map(node => node.name)).toEqual(['migration-monarch-forewing', 'migration-monarch-hindwing']);
      expect(wing.children.every(node => node.geometry.userData.monarchBoundaryVertexCount > 0)).toBe(true);
    }
    expect(monarch.getObjectByName('migration-monarch-legs').isLineSegments).toBe(true);
  });
});
