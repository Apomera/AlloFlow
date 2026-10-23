import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing Peregrine source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn {createMigrationFlyer, migrationStudyDistance};')(num);
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const flyer = (id = 'peregrine') => model.createMigrationFlyer(THREE, { id }, 0);
const parts = bird => ['migration-bird-head', 'migration-bird-bill', 'migration-peregrine-eye-rings'].map(name => bird.getObjectByName(name));
const vector = (attribute, i) => new THREE.Vector3().fromBufferAttribute(attribute, i);
function resources(bird) {
  const nodes = [], geometries = new Set(), materials = new Set();
  bird.traverse(node => { nodes.push(node); if (node.geometry) geometries.add(node.geometry); for (const m of Array.isArray(node.material) ? node.material : [node.material]) if (m) materials.add(m); });
  return { nodes, geometries, materials };
}
function nearest(geometry, direction) {
  const target = new THREE.Vector3(...direction).normalize().multiplyScalar(.2);
  let best = 0, distance = Infinity;
  for (let i = 0; i < geometry.attributes.position.count; i++) {
    const d = vector(geometry.attributes.position, i).distanceToSquared(target);
    if (d < distance) { best = i; distance = d; }
  }
  return vector(geometry.attributes.color, best);
}

describe('Peregrine head identity and resource stability', () => {
  it('uses a smooth spherical head with finite unit normals and bounded colors', () => {
    const bird = flyer(), [head] = parts(bird), g = head.geometry;
    expect(g.attributes.position.count).toBe(425);
    expect(g.index.count / 3).toBe(720);
    expect(head.material.vertexColors).toBe(true);
    expect(head.material.color.getHex()).toBe(0xffffff);
    for (let i = 0; i < g.attributes.position.count; i++) {
      expect(vector(g.attributes.position, i).length()).toBeCloseTo(.2, 6);
      expect(vector(g.attributes.normal, i).length()).toBeCloseTo(1, 6);
    }
    expect([...g.attributes.color.array].every(v => Number.isFinite(v) && v >= 0 && v <= 1)).toBe(true);
    dispose(bird);
  });

  it.each([-1, 1])('distinguishes the dark helmet and malar stripe from the pale cheek on side %s', side => {
    const bird = flyer(), g = parts(bird)[0].geometry;
    const cheek = nearest(g, [side * .9, -.38, 0]);
    const stripe = nearest(g, [side * .87, -.38, -.31]);
    const helmet = nearest(g, [side * .7, .7, 0]);
    expect(cheek.x).toBeGreaterThan(.85);
    expect(stripe.x).toBeLessThan(.2);
    expect(helmet.x).toBeLessThan(.2);
    expect(cheek.distanceTo(stripe)).toBeGreaterThan(.9);
    dispose(bird);
  });

  it('mirrors facial color across the head without decal geometry', () => {
    const bird = flyer(), g = parts(bird)[0].geometry;
    const key = p => p.toArray().map(v => Math.round(v * 1e6) || 0).join(',');
    const map = new Map();
    for (let i = 0; i < g.attributes.position.count; i++) map.set(key(vector(g.attributes.position, i)), vector(g.attributes.color, i));
    for (let i = 0; i < g.attributes.position.count; i++) {
      const p = vector(g.attributes.position, i); p.x *= -1;
      expect(map.has(key(p))).toBe(true);
      expect(map.get(key(p)).distanceTo(vector(g.attributes.color, i))).toBeLessThan(1e-6);
    }
    expect(parts(bird)[0].children).toHaveLength(0);
    dispose(bird);
  });

  it('closes the hooked bill with outward winding and no degenerate triangles', () => {
    const bird = flyer(), g = parts(bird)[1].geometry, edges = new Map();
    let volume = 0;
    expect(g.attributes.position.count).toBe(74);
    expect(g.index.count / 3).toBe(144);
    for (let i = 0; i < g.index.count; i += 3) {
      const ids = [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)];
      const [a, b, c] = ids.map(id => vector(g.attributes.position, id));
      expect(b.clone().sub(a).cross(c.clone().sub(a)).length() / 2).toBeGreaterThan(.0001);
      volume += a.dot(b.clone().cross(c)) / 6;
      for (let e = 0; e < 3; e++) {
        const u = ids[e], v = ids[(e + 1) % 3], key = [u, v].sort((x, y) => x - y).join(':');
        const value = edges.get(key) || { count: 0, winding: 0 };
        value.count++; value.winding += u < v ? 1 : -1; edges.set(key, value);
      }
    }
    expect(volume).toBeGreaterThan(.001);
    for (const edge of edges.values()) expect(edge).toEqual({ count: 2, winding: 0 });
    expect([...g.attributes.normal.array].every(Number.isFinite)).toBe(true);
    dispose(bird);
  });

  it('curves the dark bill tip down and back beneath its yellow cere', () => {
    const bird = flyer(), [head, bill] = parts(bird), g = bill.geometry;
    const positions = Array.from({ length: g.attributes.position.count }, (_, i) => vector(g.attributes.position, i));
    const tip = positions[73], base = positions[72];
    expect(tip.y).toBeLessThan(base.y - .1);
    expect(tip.z).toBeGreaterThan(Math.min(...positions.map(p => p.z)) + .01);
    expect(tip.z).toBeLessThan(base.z - .1);
    expect(vector(g.attributes.color, 0).x).toBeGreaterThan(.9);
    expect(vector(g.attributes.color, 0).y).toBeGreaterThan(.7);
    expect(vector(g.attributes.color, 73).length()).toBeLessThan(.2);
    expect(bill.position.toArray()).toEqual(head.position.toArray());
    expect(bill.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
    dispose(bird);
  });

  it('places two outward-facing orbital rings just above the head surface', () => {
    const bird = flyer(), [head, bill, rings] = parts(bird), g = rings.geometry;
    expect(g.attributes.position.count).toBe(64);
    expect(g.index.count / 3).toBe(64);
    expect(rings.position.toArray()).toEqual(head.position.toArray());
    expect(rings.material).toBe(bill.material);
    for (let side = 0; side < 2; side++) {
      const center = new THREE.Vector3();
      for (let i = side * 32; i < side * 32 + 32; i++) {
        const p = vector(g.attributes.position, i); center.add(p);
        expect(p.length()).toBeCloseTo(.204, 6);
        expect(vector(g.attributes.normal, i).dot(p)).toBeGreaterThan(.18);
      }
      center.divideScalar(32).normalize();
      expect(center.distanceTo(new THREE.Vector3(side ? .184 : -.184, .065, -.055).normalize())).toBeLessThan(1e-6);
      for (let i = side * 96; i < side * 96 + 96; i++) {
        expect(g.index.getX(i)).toBeGreaterThanOrEqual(side * 32);
        expect(g.index.getX(i)).toBeLessThan(side * 32 + 32);
      }
    }
    dispose(bird);
  });

  it('retains the established study radius and keeps the new head parts inside it', () => {
    const bird = flyer(); bird.updateMatrixWorld(true);
    expect(bird.userData.studyRadius).toBeCloseTo(1.3970397635969702, 12);
    for (const part of parts(bird)) for (let i = 0; i < part.geometry.attributes.position.count; i++) {
      const point = vector(part.geometry.attributes.position, i).applyMatrix4(part.matrixWorld);
      expect(point.length()).toBeLessThan(bird.userData.studyRadius);
    }
    dispose(bird);
  });

  it.each([390 / 620, 1440 / 700])('retains finite camera distance for viewport aspect %s', aspect => {
    const bird = flyer(), camera = new THREE.PerspectiveCamera(54, aspect, .1, 900);
    const distance = model.migrationStudyDistance(bird, camera, 1);
    expect(Number.isFinite(distance)).toBe(true);
    expect(distance).toBeGreaterThan(bird.userData.studyRadius);
    const vertical = camera.fov * Math.PI / 360;
    const limitingHalf = Math.min(vertical, Math.atan(Math.tan(vertical) * aspect));
    expect(Math.asin(bird.userData.studyRadius / distance)).toBeLessThan(limitingHalf);
    dispose(bird);
  });

  it('reuses all head buffers, nodes, and materials through wing animation', () => {
    const bird = flyer(), before = resources(bird);
    const snapshots = parts(bird).map(node => ({ node, geometry: node.geometry, material: node.material,
      position: node.position.toArray(), attributes: Object.entries(node.geometry.attributes).map(([key, a]) => [key, a, a.array, [...a.array]]) }));
    for (let i = 0; i < 48; i++) bird.userData.applyWingPhase(i * Math.PI / 12);
    expect(resources(bird)).toEqual(before);
    for (const s of snapshots) {
      expect(s.node.geometry).toBe(s.geometry); expect(s.node.material).toBe(s.material);
      expect(s.node.position.toArray()).toEqual(s.position);
      for (const [key, attribute, array, values] of s.attributes) {
        expect(s.geometry.attributes[key]).toBe(attribute);
        expect(attribute.array).toBe(array); expect([...array]).toEqual(values);
      }
    }
    dispose(bird);
  });

  it('disposes shared bill and eye-ring material exactly once', () => {
    const bird = flyer(), all = resources(bird);
    const listeners = [...all.geometries, ...all.materials].map(resource => {
      const listener = vi.fn(); resource.addEventListener('dispose', listener); return listener;
    });
    dispose(bird);
    for (const listener of listeners) expect(listener).toHaveBeenCalledTimes(1);
  });

  it.each(['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'sandhill_crane', 'bartailed_godwit', 'monarch'])('keeps %s outside the Peregrine-specific facial system', id => {
    const bird = flyer(id), head = bird.getObjectByName(id === 'monarch' ? 'migration-monarch-head' : 'migration-bird-head');
    expect(head.geometry.type).toBe('SphereGeometry');
    expect(head.geometry.parameters.widthSegments).toBe(id === 'ruby_hummingbird' ? 24 : 12);
    expect(head.geometry.parameters.heightSegments).toBe(id === 'ruby_hummingbird' ? 16 : 8);
    if (id === 'ruby_hummingbird') expect(head.geometry.attributes.color.count).toBe(425);
    else expect(head.geometry.attributes.color).toBeUndefined();
    expect(bird.getObjectByName('migration-peregrine-eye-rings')).toBeUndefined();
    const bill = bird.getObjectByName('migration-bird-bill');
    if (id === 'monarch') expect(bill).toBeUndefined();
    else { expect(bill.geometry.type).toBe('ConeGeometry'); expect(bill.material.vertexColors).toBe(false); }
    dispose(bird);
  });
});
