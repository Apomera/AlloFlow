import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing hummingbird source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn { createMigrationFlyer, migrationStudyDistance };')(num);
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const flyer = (id = 'ruby_hummingbird') => model.createMigrationFlyer(THREE, { id }, 0);
const point = (attribute, index) => new THREE.Vector3().fromBufferAttribute(attribute, index);
function resources(bird) {
  const nodes = [], geometry = new Set(), material = new Set();
  bird.traverse(node => { nodes.push(node); if (node.geometry) geometry.add(node.geometry); for (const m of Array.isArray(node.material) ? node.material : [node.material]) if (m) material.add(m); });
  return { nodes, geometry, material };
}
function sample(g, direction) {
  const target = new THREE.Vector3(...direction).normalize().multiplyScalar(.2);
  let best = 0, distance = Infinity;
  for (let i = 0; i < g.attributes.position.count; i++) {
    const d = point(g.attributes.position, i).distanceToSquared(target);
    if (d < distance) { best = i; distance = d; }
  }
  return point(g.attributes.color, best);
}
const key = p => p.toArray().map(v => Math.round(v * 1e6) || 0).join(',');

describe('Continuous adult male hummingbird head markings', () => {
  it('keeps a smooth spherical surface with finite normals and bounded vertex colors', () => {
    const bird = flyer(), head = bird.getObjectByName('migration-bird-head'), g = head.geometry;
    expect(g.attributes.position.count).toBe(425); expect(g.index.count / 3).toBe(720);
    expect(head.material.vertexColors).toBe(true); expect(head.material.color.getHex()).toBe(0xffffff);
    for (let i = 0; i < g.attributes.position.count; i++) {
      expect(point(g.attributes.position, i).length()).toBeCloseTo(.2, 6);
      expect(point(g.attributes.normal, i).length()).toBeCloseTo(1, 6);
    }
    expect([...g.attributes.color.array].every(v => Number.isFinite(v) && v >= 0 && v <= 1)).toBe(true);
    dispose(bird);
  });

  it.each([-1, 1])('places ruby below the dark face on anatomical side %s', side => {
    const bird = flyer(), g = bird.getObjectByName('migration-bird-head').geometry;
    const crown = sample(g, [0, 1, 0]), face = sample(g, [side * .93, .32, -.2]);
    const throat = sample(g, [side * .75, -.6, -.25]), chin = sample(g, [0, -.2, -.98]);
    expect(crown.y).toBeGreaterThan(crown.x * 2);
    expect(face.length()).toBeLessThan(.3); expect(chin.length()).toBeLessThan(.3);
    expect(throat.x).toBeGreaterThan(.6); expect(throat.x).toBeGreaterThan(throat.y * 4);
    expect(throat.distanceTo(face)).toBeGreaterThan(.5);
    dispose(bird);
  });

  it('forms one connected throat patch below the face without disconnected red cheek patches', () => {
    const bird = flyer(), g = bird.getObjectByName('migration-bird-head').geometry;
    const red = new Set(), points = new Map(), graph = new Map();
    for (let i = 0; i < g.attributes.position.count; i++) {
      const p = point(g.attributes.position, i), c = point(g.attributes.color, i), id = key(p);
      points.set(i, id);
      if (c.x > .35 && c.x > c.y * 2 && c.x > c.z * 1.7) {
        red.add(id); graph.set(id, new Set()); expect(p.y).toBeLessThan(0);
      }
    }
    expect(red.size).toBeGreaterThan(40);
    for (let i = 0; i < g.index.count; i += 3) {
      const ids = [0, 1, 2].map(j => points.get(g.index.getX(i + j)));
      for (let j = 0; j < 3; j++) {
        const a = ids[j], b = ids[(j + 1) % 3];
        if (red.has(a) && red.has(b)) { graph.get(a).add(b); graph.get(b).add(a); }
      }
    }
    const reached = new Set(), pending = [red.values().next().value];
    while (pending.length) { const id = pending.pop(); if (reached.has(id)) continue; reached.add(id); pending.push(...graph.get(id)); }
    expect(reached).toEqual(red);
    dispose(bird);
  });

  it('mirrors the colored surface across both sides of the head', () => {
    const bird = flyer(), g = bird.getObjectByName('migration-bird-head').geometry, colors = new Map();
    for (let i = 0; i < g.attributes.position.count; i++) colors.set(key(point(g.attributes.position, i)), point(g.attributes.color, i));
    for (let i = 0; i < g.attributes.position.count; i++) {
      const p = point(g.attributes.position, i); p.x *= -1;
      expect(colors.get(key(p)).distanceTo(point(g.attributes.color, i))).toBeLessThan(1e-6);
    }
    dispose(bird);
  });

  it('removes both detached cheek meshes and reduces the model resource budget', () => {
    const bird = flyer(), r = resources(bird);
    expect(r.nodes).toHaveLength(19); expect(r.geometry.size).toBe(12); expect(r.material.size).toBe(10);
    expect(r.nodes.filter(n => n.geometry?.type === 'SphereGeometry' && n.geometry.parameters.radius === .1)).toEqual([]);
    expect([...r.material].every(m => m.color.getHex() !== 0xb91c1c)).toBe(true);
    expect(bird.getObjectByName('migration-bird-head').children).toHaveLength(0);
    dispose(bird);
  });

  it('preserves the long bill, eyes, head placement and established study radius', () => {
    const bird = flyer(), head = bird.getObjectByName('migration-bird-head'), bill = bird.getObjectByName('migration-bird-bill');
    expect(head.position.toArray()).toEqual([0, 0, -.94]); expect(head.scale.toArray()).toEqual([1, 1, 1]);
    expect(bill.geometry.type).toBe('ConeGeometry'); expect(bill.geometry.parameters.height).toBe(.54);
    expect(bill.geometry.parameters.radius).toBe(.035); expect(bill.rotation.x).toBe(-Math.PI / 2);
    expect(bill.position.z).toBeCloseTo(-1.33, 12);
    const eyes = resources(bird).nodes.filter(n => n.geometry?.type === 'SphereGeometry' && n.geometry.parameters.radius === .026);
    expect(eyes).toHaveLength(2); expect(eyes[0].geometry).toBe(eyes[1].geometry); expect(eyes[0].material).toBe(eyes[1].material);
    expect(bird.userData.studyRadius).toBeCloseTo(1.0713600071840288, 12);
    dispose(bird);
  });

  it.each([.63, 1.18])('keeps the colored head inside the existing camera envelope at aspect %s', aspect => {
    const bird = flyer(), camera = new THREE.PerspectiveCamera(54, aspect, .1, 900);
    bird.updateMatrixWorld(true);
    const head = bird.getObjectByName('migration-bird-head');
    for (let i = 0; i < head.geometry.attributes.position.count; i++) expect(point(head.geometry.attributes.position, i).applyMatrix4(head.matrixWorld).length()).toBeLessThan(bird.userData.studyRadius);
    const distance = model.migrationStudyDistance(bird, camera, 1), vertical = camera.fov * Math.PI / 360;
    expect(Math.asin(bird.userData.studyRadius / distance)).toBeLessThan(Math.min(vertical, Math.atan(Math.tan(vertical) * aspect)));
    dispose(bird);
  });

  it('keeps every head buffer and resource stable through wing movement', () => {
    const bird = flyer(), before = resources(bird), head = bird.getObjectByName('migration-bird-head');
    const attributes = Object.entries(head.geometry.attributes).map(([name, a]) => ({ name, attribute: a, array: a.array, values: [...a.array] }));
    const position = head.position.toArray();
    for (let i = 0; i < 48; i++) bird.userData.applyWingPhase(i * Math.PI / 12);
    expect(resources(bird)).toEqual(before); expect(head.position.toArray()).toEqual(position);
    for (const a of attributes) { expect(head.geometry.attributes[a.name]).toBe(a.attribute); expect(a.attribute.array).toBe(a.array); expect([...a.array]).toEqual(a.values); }
    dispose(bird);
  });

  it('disposes all shared and colored resources once', () => {
    const bird = flyer(), r = resources(bird), listeners = [...r.geometry, ...r.material].map(resource => {
      const listener = vi.fn(); resource.addEventListener('dispose', listener); return listener;
    });
    dispose(bird); for (const listener of listeners) expect(listener).toHaveBeenCalledTimes(1);
  });

  it.each(['canada_goose', 'snow_goose', 'arctic_tern', 'peregrine', 'sandhill_crane', 'bartailed_godwit', 'monarch'])('leaves %s outside the hummingbird color and resource branch', id => {
    const bird = flyer(id), head = bird.getObjectByName(id === 'monarch' ? 'migration-monarch-head' : 'migration-bird-head');
    expect(head.geometry.parameters.widthSegments).toBe(id === 'peregrine' ? 24 : 12);
    expect(head.geometry.parameters.heightSegments).toBe(id === 'peregrine' ? 16 : 8);
    expect(head.material.roughness).toBe(id === 'monarch' ? .68 : .66);
    expect(head.material.metalness).toBe(id === 'monarch' ? .04 : 0);
    if (id !== 'peregrine') expect(head.geometry.attributes.color).toBeUndefined();
    dispose(bird);
  });
});
