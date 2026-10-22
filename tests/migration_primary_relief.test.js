import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing canonical primary relief section: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') +
  '\nreturn { createMigrationPrimaryGeometry, createMigrationFlyer, migrationStudyDistance };')(num);
const guides = new Function(section('      function createMigrationMarkedWingPose(', '      function initMigrationFlightScene(') +
  '\nreturn { createMigrationWingtipPath, createMigrationMarkedWingPose };')();
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const birds = ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit'];
const planforms = [[1, 1], [1.38, .86], [1.7, .57], [1.62, .86]];
const roots = new Set();
const geometries = new Set();
afterEach(() => {
  for (const root of roots) dispose(root);
  for (const geometry of geometries) geometry.dispose();
  roots.clear(); geometries.clear();
});
function primaryGeometry(reach, sweep) {
  const geometry = model.createMigrationPrimaryGeometry(THREE, reach, sweep);
  geometries.add(geometry); return geometry;
}
function point(positions, index) { return new THREE.Vector3().fromBufferAttribute(positions, index); }
// This is the preserved five-point rim contract from the previous model.
// Tests compare real indexed boundaries and real guide output with that rim.
function originalRim(feather, reach, sweep) {
  const x = (.10 + feather * .072) * reach, z = (.08 + feather * .013) * sweep;
  const length = (.47 - feather * .041) * sweep, spread = (.06 + feather * .038) * reach, half = .047 * reach;
  const values = new Float32Array([x - half, .048, z, x + half, .048, z,
    x + spread + half * .60, .075, z + length * .82,
    x + spread, .065, z + length, x + spread - half * .60, .075, z + length * .82]);
  return Array.from({ length: 5 }, (_, i) => new THREE.Vector3().fromArray(values, i * 3));
}
function pointKey(value) { return value.toArray().map(Math.fround).join(','); }
function edgeKey(a, b) { return [pointKey(a), pointKey(b)].sort().join('|'); }
function insideRimXZ(value, rim) {
  let inside = false;
  for (let i = 0, j = rim.length - 1; i < rim.length; j = i++) {
    const a = rim[i], b = rim[j];
    if ((a.z > value.z) !== (b.z > value.z) && value.x < (b.x - a.x) * (value.z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
function edgesFromPairs(points) {
  const out = [];
  for (let i = 0; i < points.length; i += 2) out.push(edgeKey(points[i], points[i + 1]));
  return out.sort();
}
function fixture(id) {
  const scene = new THREE.Scene(), flock = new THREE.Group(); scene.add(flock); roots.add(scene);
  flock.position.set(.3, 1.2, -.4); flock.rotation.y = .07;
  const bird = model.createMigrationFlyer(THREE, { id }, 0); flock.add(bird);
  bird.position.set(0, .5, -5); bird.userData.applyWingPhase(.713);
  const camera = new THREE.PerspectiveCamera(54, 1, .1, 900);
  camera.position.set(4, 3, 2); camera.lookAt(bird.position);
  const pathGuide = guides.createMigrationWingtipPath(THREE), marked = guides.createMigrationMarkedWingPose(THREE);
  scene.add(pathGuide, marked); scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  return { scene, flock, bird, camera, pathGuide, marked };
}
function snapshot(bird) {
  const states = [];
  bird.traverse(node => states.push({ node, rotation: node.rotation.toArray(), quaternion: node.quaternion.toArray(),
    matrix: node.matrix.toArray(), world: node.matrixWorld.toArray(), automatic: node.matrixAutoUpdate }));
  return states;
}
function resourceIds(root) {
  const nodes = [], geometry = new Set(), material = new Set();
  root.traverse(node => {
    nodes.push(node.uuid);
    if (node.geometry) geometry.add(node.geometry.uuid);
    for (const item of Array.isArray(node.material) ? node.material : [node.material]) if (item) material.add(item.uuid);
  });
  return { nodes: nodes.sort(), geometry: [...geometry].sort(), material: [...material].sort() };
}
function reachAndSweep(id) { return [id === 'arctic_tern' ? 1.7 : id === 'sandhill_crane' ? 1.62 : 1.38, id === 'arctic_tern' || id === 'peregrine' ? .57 : .86]; }

describe('Migration stylized primary feather relief', () => {
  it.each(planforms)('retains each five-edge rim at reach%s and sweep%s without marking the new interior triangulation', (reach, sweep) => {
    const geometry = primaryGeometry(reach, sweep), p = geometry.attributes.position;
    expect(p.count).toBe(35); expect(geometry.index.count).toBe(105);
    expect(geometry.attributes.color.count).toBe(p.count); expect(geometry.attributes.normal.count).toBe(p.count);
    const expected = [];
    for (let feather = 0; feather < 5; feather++) {
      const rim = originalRim(feather, reach, sweep);
      for (let i = 0; i < 5; i++) {
        expect(point(p, feather * 7 + i).toArray()).toEqual(rim[i].toArray());
        expected.push(rim[i], rim[(i + 1) % 5]);
      }
      const usage = new Map();
      for (let i = feather * 21; i < (feather + 1) * 21; i += 3) {
        const tri = [geometry.index.getX(i), geometry.index.getX(i + 1), geometry.index.getX(i + 2)];
        expect(tri.every(index => index >= feather * 7 && index < (feather + 1) * 7)).toBe(true);
        for (let edge = 0; edge < 3; edge++) {
          const key = [tri[edge], tri[(edge + 1) % 3]].sort((a, b) => a - b).join(':');
          usage.set(key, (usage.get(key) || 0) + 1);
        }
      }
      const boundary = [...usage.entries()].filter(([, count]) => count === 1);
      expect(boundary).toHaveLength(5);
      expect(boundary.every(([edge]) => edge.split(':').every(index => Number(index) % 7 < 5))).toBe(true);
      expect([...usage.values()].every(count => count === 1 || count === 2)).toBe(true);
    }
    const edges = new THREE.EdgesGeometry(geometry, 180); geometries.add(edges);
    const actual = Array.from({ length: edges.attributes.position.count }, (_, i) => point(edges.attributes.position, i));
    expect(actual).toHaveLength(50);
    expect(edgesFromPairs(actual)).toEqual(edgesFromPairs(expected));
  });

  it.each(planforms)('adds shallow interior relief with finite consistently wound normals at reach%s and sweep%s', (reach, sweep) => {
    const geometry = primaryGeometry(reach, sweep), p = geometry.attributes.position, n = geometry.attributes.normal, color = geometry.attributes.color;
    for (const attribute of Object.values(geometry.attributes)) expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
    for (let i = 0; i < geometry.index.count; i += 3) {
      const a = point(p, geometry.index.getX(i)), b = point(p, geometry.index.getX(i + 1)), c = point(p, geometry.index.getX(i + 2));
      const normal = b.sub(a).cross(c.sub(a));
      expect(normal.length() / 2).toBeGreaterThan(.000001);
      // Preserve the original negative localY convention of the DoubleSide mesh.
      expect(normal.y).toBeLessThan(0);
    }
    for (let i = 0; i < n.count; i++) { expect(point(n, i).length()).toBeCloseTo(1, 5); expect(n.getY(i)).toBeLessThan(0); }
    for (let feather = 0; feather < 5; feather++) {
      const base = feather * 7, rim = originalRim(feather, reach, sweep);
      for (const index of [base + 5, base + 6]) {
        const ridge = point(p, index);
        // Later feathers have a slightly concave rim; ray crossing handles it.
        expect(insideRimXZ(ridge, rim)).toBe(true);
        const fraction = (ridge.z - rim[0].z) / (rim[2].z - rim[0].z);
        const edgeY = rim[0].y + (rim[2].y - rim[0].y) * fraction;
        expect(ridge.y - edgeY).toBeGreaterThan(.018);
        expect(ridge.y - edgeY).toBeLessThan(.05);
        expect(ridge.y).toBeLessThanOrEqual(.105001);
        expect(color.getX(index)).toBeGreaterThan(color.getX(base));
      }
      const nx = Array.from({ length: 7 }, (_, i) => n.getX(base + i));
      expect(Math.max(...nx) - Math.min(...nx)).toBeGreaterThan(.1);
    }
    expect(Array.from(color.array).every(value => value >= 0 && value <= 1)).toBe(true);
  });

  it.each(birds)('keeps %s primary resources shared and the existing perimeter-derived Study envelope', id => {
    const bird = model.createMigrationFlyer(THREE, { id }, 0); roots.add(bird); bird.updateMatrixWorld(true);
    const [left, right] = bird.userData.primaries, geometry = left.geometry, material = left.material;
    expect(left.name).toBe('migration-primary-feathers'); expect(right.name).toBe('migration-primary-feathers');
    expect(right.geometry).toBe(geometry); expect(right.material).toBe(material);
    expect(left.scale.x).toBe(-1); expect(right.scale.x).toBe(1); expect(material.side).toBe(THREE.DoubleSide);
    const nodes = []; bird.traverse(node => { if (node.name === 'migration-primary-feathers') nodes.push(node); });
    expect(nodes).toHaveLength(2); expect(left.children).toHaveLength(0); expect(right.children).toHaveLength(0);
    const resources = resourceIds(bird), attributes = Object.values(geometry.attributes), arrays = attributes.map(attribute => attribute.array);
    const copies = arrays.map(array => Array.from(array));
    let legacyExtent = 0;
    bird.traverse(part => {
      const positions = part.geometry?.attributes.position;
      if (!positions) return;
      for (let i = 0; i < positions.count; i++) {
        if ((part === left || part === right) && i % 7 >= 5) continue;
        legacyExtent = Math.max(legacyExtent, point(positions, i).applyMatrix4(part.matrixWorld).length());
      }
    });
    expect(bird.userData.studyRadius).toBeCloseTo(legacyExtent * 1.08, 12);
    for (let phase = 0; phase < 8; phase++) {
      bird.userData.applyWingPhase(phase * Math.PI / 4); bird.updateWorldMatrix(true, true);
      for (const mesh of [left, right]) for (let i = 0; i < geometry.attributes.position.count; i++) {
        expect(point(geometry.attributes.position, i).applyMatrix4(mesh.matrixWorld).length()).toBeLessThan(bird.userData.studyRadius);
      }
    }
    expect(resourceIds(bird)).toEqual(resources);
    attributes.forEach((attribute, index) => { expect(attribute.array).toBe(arrays[index]); expect(Array.from(attribute.array)).toEqual(copies[index]); });
    expect(left.geometry).toBe(geometry); expect(right.geometry).toBe(geometry); expect(left.material).toBe(material); expect(right.material).toBe(material);
  });

  it.each(birds)('samples the unchanged %s outer tip and restores live joints with relief present', id => {
    const f = fixture(id), saved = snapshot(f.bird), resources = resourceIds(f.scene);
    f.pathGuide.updatePath(true, 'study', f.bird, id, 0, f.camera, true, 390, .713, null, 0);
    expect(f.pathGuide.userData.available).toBe(true); expect(f.pathGuide.userData.buildVersion).toBe(1);
    for (const state of saved) {
      expect(state.node.rotation.toArray()).toEqual(state.rotation); expect(state.node.quaternion.toArray()).toEqual(state.quaternion);
      expect(state.node.matrix.toArray()).toEqual(state.matrix); expect(state.node.matrixWorld.toArray()).toEqual(state.world);
      expect(state.node.matrixAutoUpdate).toBe(state.automatic);
    }
    const [reach, sweep] = reachAndSweep(id), rim = Array.from({ length: 5 }, (_, feather) => originalRim(feather, reach, sweep)).flat();
    const outer = rim.reduce((chosen, value) => value.x > chosen.x || value.x === chosen.x && value.z > chosen.z ? value : chosen, rim[0]);
    const inverse = f.bird.matrixWorld.clone().invert(), cycle = f.pathGuide.getObjectByName('migration-wingtip-cycle').geometry.attributes.position;
    for (const source of f.pathGuide.userData.sources) {
      const mesh = f.bird.userData.primaries[source.side];
      expect(source.nodeUuid).toBe(mesh.uuid); expect(source.geometryUuid).toBe(mesh.geometry.uuid);
      expect(source.vertexIndex % 7).toBeLessThan(5);
      expect(point(mesh.geometry.attributes.position, source.vertexIndex).toArray()).toEqual(outer.toArray());
      for (let sample = 0; sample < 64; sample++) {
        f.bird.userData.applyWingPhase(sample * Math.PI / 32); f.bird.updateWorldMatrix(true, true);
        const expected = outer.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
        expect(point(cycle, source.side * 128 + sample * 2).distanceTo(expected)).toBeLessThan(.000001);
      }
    }
    expect(resourceIds(f.scene)).toEqual(resources);
  });

  it.each(birds)('marks only the preserved %s primary rims and leaves the reference frozen through live motion', id => {
    const f = fixture(id), resources = resourceIds(f.scene), saved = snapshot(f.bird);
    expect(f.marked.capturePose(f.bird, id, 0)).toBe(true);
    const sources = f.marked.userData.sources.filter(item => item.role === 'migration-primary-feathers');
    expect(sources).toHaveLength(2); expect(f.marked.userData.vertexCount).toBeLessThan(300);
    const [reach, sweep] = reachAndSweep(id), inverse = f.bird.matrixWorld.clone().invert(), positions = f.marked.geometry.attributes.position;
    for (const source of sources) {
      expect(source.vertexCount).toBe(50);
      const mesh = f.bird.userData.primaries[source.side], expected = [];
      for (let feather = 0; feather < 5; feather++) {
        const rim = originalRim(feather, reach, sweep).map(value => value.applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse));
        for (let edge = 0; edge < 5; edge++) expected.push(rim[edge], rim[(edge + 1) % 5]);
      }
      const actual = Array.from({ length: source.vertexCount }, (_, i) => point(positions, source.offset + i));
      expect(edgesFromPairs(actual)).toEqual(edgesFromPairs(expected));
    }
    for (const state of saved) { expect(state.node.rotation.toArray()).toEqual(state.rotation); expect(state.node.matrixWorld.toArray()).toEqual(state.world); }
    const frozen = Array.from(positions.array), geometry = f.marked.geometry, material = f.marked.material;
    f.bird.userData.applyWingPhase(2.713); f.bird.updateWorldMatrix(true, true);
    f.marked.updatePose(f.bird, 'study', true, true, f.camera, 390, 0, 390);
    expect(Array.from(positions.array)).toEqual(frozen); expect(f.marked.geometry).toBe(geometry); expect(f.marked.material).toBe(material);
    expect(resourceIds(f.scene)).toEqual(resources);
  });

  it('keeps Monarch membrane geometry separate from bird primary relief', () => {
    const monarch = model.createMigrationFlyer(THREE, { id: 'monarch' }, 0); roots.add(monarch);
    expect(monarch.userData.primaries).toEqual([]);
    const primaryMeshes = []; monarch.traverse(node => { if (node.name === 'migration-primary-feathers') primaryMeshes.push(node); });
    expect(primaryMeshes).toEqual([]);
    expect(monarch.getObjectByName('migration-monarch-forewing')).toBeTruthy();
    expect(monarch.getObjectByName('migration-monarch-hindwing')).toBeTruthy();
  });
});
