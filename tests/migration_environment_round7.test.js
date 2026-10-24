import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
function section(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing canonical environment section: ' + start);
  return source.slice(first, last);
}
const createRidge = new Function(section('      function createMigrationRidgeGeometry(', '      function createMigrationWingGeometry(') + '\nreturn createMigrationRidgeGeometry;')();
const buildEnvironment = new Function('THREE', 'engine', 'scene', 'clamp', 'lerp', 'createMigrationRidgeGeometry',
  section('          // ── Land belt ──', '          // The route ribbon is uniform') + '\nreturn { landHeight, landRiverX };');
function fixture() {
  const engine = {};
  const scene = new THREE.Scene();
  const terrain = buildEnvironment(THREE, engine, scene, (n, a, b) => Math.max(a, Math.min(b, n)), (a, b, t) => a + (b - a) * t, createRidge);
  engine.paintLand('spring');
  engine.placeLand();
  return { engine, scene, ...terrain };
}
function instanceMatrices(engine) {
  return engine.landTiles.map(tile => [tile.c, tile.peaks.count, tile.caps.count,
    Array.from(tile.peaks.instanceMatrix.array), Array.from(tile.caps.instanceMatrix.array)]);
}


describe('Migration connected ridge environment', () => {
  it('builds three distinct summits inside a finite, grounded disk footprint', () => {
    const geometry = createRidge(THREE, false);
    const p = geometry.attributes.position;
    expect(geometry.userData.migrationRidgeGrid).toBe(20);
    expect(geometry.userData.migrationSnowy).toBe(false);
    expect(p.count).toBe(441);
    expect(geometry.index.count).toBe(2400);
    const summits = [];
    for (let vertex = 0; vertex < p.count; vertex++) {
      expect(Math.hypot(p.getX(vertex), p.getZ(vertex))).toBeLessThanOrEqual(1.000001);
      expect(p.getY(vertex)).toBeGreaterThanOrEqual(-0.5);
      expect(p.getY(vertex)).toBeLessThanOrEqual(0.5);
      const x = vertex % 21;
      const z = Math.floor(vertex / 21);
      if (x === 0 || x === 20 || z === 0 || z === 20) {
        expect(p.getY(vertex)).toBe(-0.5);
        expect(Math.hypot(p.getX(vertex), p.getZ(vertex))).toBeCloseTo(1, 5);
      } else if (p.getY(vertex) > 0.1 && [-22, -21, -20, -1, 1, 20, 21, 22].every(offset => p.getY(vertex + offset) < p.getY(vertex))) {
        summits.push(new THREE.Vector3().fromBufferAttribute(p, vertex));
      }
    }
    expect(summits).toHaveLength(3);
    expect(Math.max(...summits.map(point => point.y))).toBe(0.5);
    for (let a = 0; a < summits.length; a++) for (let b = a + 1; b < summits.length; b++) expect(summits[a].distanceTo(summits[b])).toBeGreaterThan(0.4);
    for (const attribute of Object.values(geometry.attributes)) expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
  });

  it('joins every facet without internal holes or downward-facing triangles', () => {
    const geometry = createRidge(THREE, true);
    const p = geometry.attributes.position;
    const edges = new Map();
    const linked = new Map();
    const v = index => new THREE.Vector3().fromBufferAttribute(p, index);
    for (let index = 0; index < geometry.index.count; index += 3) {
      const vertices = [geometry.index.getX(index), geometry.index.getX(index + 1), geometry.index.getX(index + 2)];
      const [a, b, c] = vertices.map(v);
      expect(b.clone().sub(a).cross(c.clone().sub(a)).y).toBeGreaterThan(0);
      for (let side = 0; side < 3; side++) {
        const first = vertices[side];
        const second = vertices[(side + 1) % 3];
        const key = [first, second].sort((a, b) => a - b).join(':');
        edges.set(key, (edges.get(key) || 0) + 1);
        if (!linked.has(first)) linked.set(first, new Set());
        linked.get(first).add(second);
      }
    }
    expect([...edges.values()].filter(count => count === 1)).toHaveLength(80);
    expect([...edges.values()].every(count => count === 1 || count === 2)).toBe(true);
    const visited = new Set([0]);
    const pending = [0];
    while (pending.length) for (const next of linked.get(pending.pop())) if (!visited.has(next)) { visited.add(next); pending.push(next); }
    expect(visited.size).toBe(p.count);
    expect(Array.from({ length: p.count }, (_, index) => geometry.attributes.normal.getY(index)).every(y => y > 0)).toBe(true);
  });

  it('keeps snow on the identical terrain surface and varies the snow line deterministically', () => {
    const rock = createRidge(THREE, false);
    const snow = createRidge(THREE, true);
    const repeat = createRidge(THREE, true);
    for (const attr of ['position', 'normal']) expect(Array.from(rock.attributes[attr].array)).toEqual(Array.from(snow.attributes[attr].array));
    expect(Array.from(rock.index.array)).toEqual(Array.from(snow.index.array));
    expect(Array.from(snow.attributes.color.array)).toEqual(Array.from(repeat.attributes.color.array));
    const p = snow.attributes.position;
    const color = snow.attributes.color;
    let unchanged = 0;
    let snowier = 0;
    for (let vertex = 0; vertex < p.count; vertex++) {
      const difference = color.getX(vertex) - rock.attributes.color.getX(vertex);
      if (difference === 0) unchanged++;
      if (difference > 0.3) snowier++;
      if (p.getY(vertex) < 0) expect(difference).toBe(0);
      for (const component of [color.getX(vertex), color.getY(vertex), color.getZ(vertex)]) expect(component).toBeGreaterThanOrEqual(0);
    }
    expect(unchanged).toBeGreaterThan(300);
    expect(snowier).toBeGreaterThan(15);
    expect(snow.userData.migrationSnowy).toBe(true);
  });

  it('instances six complete ridges per tile from two shared buffers and materials', () => {
    const { engine } = fixture();
    const rock = engine.landTiles[0].peaks;
    const snow = engine.landTiles[0].caps;
    expect(engine.landTiles).toHaveLength(8);
    for (const tile of engine.landTiles) {
      expect(tile.peaks.name).toBe('migration-rock-ridges');
      expect(tile.caps.name).toBe('migration-snow-ridges');
      expect(tile.peaks.count + tile.caps.count).toBe(6);
      expect(tile.peaks.geometry).toBe(rock.geometry);
      expect(tile.caps.geometry).toBe(snow.geometry);
      expect(tile.peaks.material).toBe(rock.material);
      expect(tile.caps.material).toBe(snow.material);
      for (const mesh of [tile.peaks, tile.caps]) {
        expect(mesh.material.vertexColors).toBe(true);
        expect(mesh.material.color.getHex()).toBe(0xffffff);
        expect(mesh.frustumCulled).toBe(false);
        expect(mesh.receiveShadow).toBe(true);
        expect(mesh.castShadow).toBe(true);
        expect(mesh.parent).toBe(tile.group);
      }
    }
  });

  it('grounds each full snowy and bare ridge with the same complete-height transform', () => {
    const { engine, landHeight, landRiverX } = fixture();
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const turn = new THREE.Quaternion();
    for (const tile of engine.landTiles) for (const mesh of [tile.peaks, tile.caps]) for (let index = 0; index < mesh.count; index++) {
      mesh.getMatrixAt(index, matrix);
      matrix.decompose(position, turn, scale);
      expect(scale.y).toBeGreaterThanOrEqual(8);
      expect(scale.y).toBeLessThanOrEqual(22);
      expect(scale.x).toBeCloseTo(scale.z, 5);
      expect(scale.x).toBeGreaterThanOrEqual(9);
      expect(scale.x).toBeLessThanOrEqual(14);
      if (position.x > 0) expect(position.x - scale.x - landRiverX(tile.c * 64 - position.z)).toBeGreaterThanOrEqual(9.9999);
      expect(Math.abs(position.x)).toBeGreaterThanOrEqual(54);
      expect(Math.abs(position.x)).toBeLessThanOrEqual(84);
      expect(position.z).toBeLessThanOrEqual(0);
      expect(position.z).toBeGreaterThanOrEqual(-64);
      const bottom = position.y - scale.y / 2;
      expect(bottom).toBeLessThan(-6 + landHeight(position.x, tile.c * 64 - position.z) - 0.45);
      if (mesh === tile.caps) expect(scale.y).toBeGreaterThan(13);
      else expect(scale.y).toBeLessThanOrEqual(13);
    }
  });

  it('preserves the terrain and ridge placements when the season changes', () => {
    const { engine } = fixture();
    const before = instanceMatrices(engine);
    const refs = engine.landTiles.map(tile => [tile.peaks.geometry, tile.caps.geometry]);
    engine.paintLand('fall');
    expect(instanceMatrices(engine)).toEqual(before);
    engine.landTiles.forEach((tile, index) => {
      expect(tile.peaks.geometry).toBe(refs[index][0]);
      expect(tile.caps.geometry).toBe(refs[index][1]);
    });
  });

  it('recycles the existing tile buffers and holds every scene transform at frozen distance', () => {
    const { engine } = fixture();
    const before = instanceMatrices(engine);
    const locations = engine.landTiles.map(tile => tile.group.position.z);
    const refs = engine.landTiles.map(tile => [tile.peaks.instanceMatrix.array, tile.caps.instanceMatrix.array]);
    engine.placeLand();
    engine.placeLand();
    expect(instanceMatrices(engine)).toEqual(before);
    expect(engine.landTiles.map(tile => tile.group.position.z)).toEqual(locations);
    engine.flown = 530;
    engine.placeLand();
    expect(engine.landTiles.every(tile => tile.c >= 8)).toBe(true);
    engine.landTiles.forEach((tile, index) => {
      expect(tile.peaks.count + tile.caps.count).toBe(6);
      expect(tile.peaks.instanceMatrix.array).toBe(refs[index][0]);
      expect(tile.caps.instanceMatrix.array).toBe(refs[index][1]);
      expect(Array.from(tile.peaks.instanceMatrix.array).every(Number.isFinite)).toBe(true);
      expect(Array.from(tile.caps.instanceMatrix.array).every(Number.isFinite)).toBe(true);
    });
  });

  it('keeps both new shared ridge buffers and materials in the existing disposal traversal', () => {
    const { engine, scene } = fixture();
    const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
    const resources = new Set([engine.landTiles[0].peaks.geometry, engine.landTiles[0].caps.geometry, engine.landTiles[0].peaks.material, engine.landTiles[0].caps.material]);
    const released = new Set();
    for (const resource of resources) resource.addEventListener('dispose', () => released.add(resource));
    dispose(scene);
    expect(released.size).toBe(resources.size);
  });
});
