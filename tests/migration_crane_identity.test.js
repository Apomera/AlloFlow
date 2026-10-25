import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing crane source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn { createMigrationFlyer, migrationStudyDistance };')(num);
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const roots = new Set();
const flyer = (id = 'sandhill_crane') => { const bird = model.createMigrationFlyer(THREE, { id }, 0); roots.add(bird); return bird; };
afterEach(() => { for (const bird of roots) dispose(bird); roots.clear(); });
const point = (attribute, index) => new THREE.Vector3().fromBufferAttribute(attribute, index);
const key = p => p.toArray().map(v => Math.round(v * 1e6) || 0).join(',');
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
function patchGraph(g, include) {
  const members = new Set(), ids = new Map(), graph = new Map();
  for (let i = 0; i < g.attributes.position.count; i++) {
    const p = point(g.attributes.position, i), id = key(p); ids.set(i, id);
    if (include(point(g.attributes.color, i), p)) { members.add(id); graph.set(id, new Set()); }
  }
  for (let i = 0; i < g.index.count; i += 3) {
    const face = [0, 1, 2].map(j => ids.get(g.index.getX(i + j)));
    for (let j = 0; j < 3; j++) {
      const a = face[j], b = face[(j + 1) % 3];
      if (members.has(a) && members.has(b)) { graph.get(a).add(b); graph.get(b).add(a); }
    }
  }
  const reached = new Set(), pending = [members.values().next().value];
  while (pending.length) { const id = pending.pop(); if (reached.has(id)) continue; reached.add(id); pending.push(...graph.get(id)); }
  return { members, reached };
}

describe('Continuous adult Sandhill Crane head markings', () => {
  it('uses one smooth closed sphere with finite outward unit normals and bounded colors', () => {
    const head = flyer().getObjectByName('migration-bird-head'), g = head.geometry;
    expect(g.type).toBe('SphereGeometry'); expect(g.attributes.position.count).toBe(425);
    expect(g.index.count / 3).toBe(720); expect(g.attributes.color.count).toBe(425);
    expect(head.material.vertexColors).toBe(true); expect(head.material.color.getHex()).toBe(0xffffff);
    for (let i = 0; i < g.attributes.position.count; i++) {
      const p = point(g.attributes.position, i), normal = point(g.attributes.normal, i);
      expect(p.length()).toBeCloseTo(.2, 6); expect(normal.length()).toBeCloseTo(1, 6);
      expect(p.clone().normalize().dot(normal)).toBeCloseTo(1, 6);
    }
    expect([...g.attributes.color.array].every(v => Number.isFinite(v) && v >= 0 && v <= 1)).toBe(true);
    const edges = new Map();
    for (let i = 0; i < g.index.count; i += 3) {
      const ids = [0, 1, 2].map(j => key(point(g.attributes.position, g.index.getX(i + j))));
      for (let j = 0; j < 3; j++) { const edge = [ids[j], ids[(j + 1) % 3]].sort().join('|'); edges.set(edge, (edges.get(edge) || 0) + 1); }
    }
    expect([...edges.values()].every(count => count === 2)).toBe(true);
  });

  it('places red on the crown and forehead while the nape stays gray', () => {
    const g = flyer().getObjectByName('migration-bird-head').geometry;
    for (const direction of [[0, 1, 0], [0, .4, -.92]]) {
      const color = sample(g, direction); expect(color.x).toBeGreaterThan(.7);
      expect(color.x).toBeGreaterThan(color.y * 5); expect(color.x).toBeGreaterThan(color.z * 5);
    }
    const nape = sample(g, [0, 0, 1]), back = sample(g, [0, .5, .87]);
    expect(nape.toArray()).toEqual(back.toArray());
    expect(nape.x).toBeCloseTo(154 / 255, 6); expect(nape.y).toBeCloseTo(160 / 255, 6); expect(nape.z).toBeCloseTo(166 / 255, 6);
  });

  it.each([-1, 1])('keeps the pale cheek connected to the throat on side %s', side => {
    const g = flyer().getObjectByName('migration-bird-head').geometry;
    const cheek = sample(g, [side, 0, 0]), throat = sample(g, [0, -.6, -.8]);
    expect(cheek.distanceTo(throat)).toBeLessThan(1e-6);
    expect(Math.min(...cheek.toArray())).toBeGreaterThan(.84);
    expect(cheek.distanceTo(sample(g, [0, 0, 1]))).toBeGreaterThan(.4);
  });

  it('forms one connected red crown and forehead patch above the head midline', () => {
    const g = flyer().getObjectByName('migration-bird-head').geometry;
    const graph = patchGraph(g, (c, p) => {
      const red = c.x > c.y * 2 && c.x > c.z * 2;
      if (red) { expect(p.y).toBeGreaterThan(0); expect(p.z).toBeLessThan(.13); }
      return red;
    });
    expect(graph.members.size).toBeGreaterThan(40); expect(graph.reached).toEqual(graph.members);
  });

  it('joins both pale cheeks through one continuous pale throat', () => {
    const g = flyer().getObjectByName('migration-bird-head').geometry;
    const graph = patchGraph(g, c => Math.min(...c.toArray()) > .8);
    expect(graph.members.size).toBeGreaterThan(50); expect(graph.reached).toEqual(graph.members);
  });

  it('mirrors vertex colors exactly across the head midline', () => {
    const g = flyer().getObjectByName('migration-bird-head').geometry, colors = new Map();
    for (let i = 0; i < g.attributes.position.count; i++) colors.set(key(point(g.attributes.position, i)), point(g.attributes.color, i));
    for (let i = 0; i < g.attributes.position.count; i++) {
      const p = point(g.attributes.position, i); p.x *= -1;
      expect(colors.get(key(p)).distanceTo(point(g.attributes.color, i))).toBeLessThan(1e-6);
    }
  });

  it('removes the detached crown and cheek pads with three fewer nodes and two fewer geometries/materials', () => {
    const bird = flyer(), r = resources(bird);
    // Frozen round35: 24 nodes, 15 geometries and 13 materials.
    expect(r.nodes).toHaveLength(21); expect(r.geometry.size).toBe(13); expect(r.material.size).toBe(11);
    expect(bird.getObjectByName('migration-crane-crown')).toBeUndefined();
    expect(bird.getObjectByName('migration-crane-cheek')).toBeUndefined();
    expect(r.nodes.filter(n => n.geometry?.type === 'SphereGeometry' && n.geometry.parameters.radius === .1)).toEqual([]);
    expect(bird.getObjectByName('migration-bird-head').children).toHaveLength(0);
  });

  it('preserves head transform, neck, long straight bill, eyes and the established study radius', () => {
    const bird = flyer(), head = bird.getObjectByName('migration-bird-head'), bill = bird.getObjectByName('migration-bird-bill');
    expect(head.position.toArray()).toEqual([0, .075, -1.5]); expect(head.scale.toArray()).toEqual([.78, .8, 1.05]);
    expect(head.material.roughness).toBe(.66); expect(head.material.metalness).toBe(0);
    expect(bird.getObjectByName('migration-bird-neck').geometry.attributes.position.count).toBe(152);
    expect(bill.geometry.type).toBe('ConeGeometry'); expect(bill.geometry.parameters.height).toBe(.46);
    expect(bill.geometry.parameters.radius).toBe(.055); expect(bill.rotation.x).toBe(-Math.PI / 2);
    expect(bill.position.x).toBe(0); expect(bill.position.y).toBe(.075); expect(bill.position.z).toBeCloseTo(-1.85, 12);
    const eyes = resources(bird).nodes.filter(n => n.geometry?.type === 'SphereGeometry' && n.geometry.parameters.radius === .026);
    expect(eyes).toHaveLength(2); expect(eyes[0].geometry).toBe(eyes[1].geometry); expect(eyes[0].material).toBe(eyes[1].material);
    expect(eyes.map(eye => eye.position.x)).toEqual([-.184 * .78, .184 * .78]);
    for (const eye of eyes) { expect(eye.position.y).toBe(.075 + .065 * .8); expect(eye.position.z).toBe(-1.5 - .055 * 1.05); }
    expect(bird.userData.studyRadius).toBeCloseTo(1.8432450906802318, 12);
  });

  it.each([.63, 1.18])('fits the complete colored head within the existing camera envelope at aspect %s', aspect => {
    const bird = flyer(), camera = new THREE.PerspectiveCamera(54, aspect, .1, 900); bird.updateMatrixWorld(true);
    const head = bird.getObjectByName('migration-bird-head');
    for (let i = 0; i < head.geometry.attributes.position.count; i++) expect(point(head.geometry.attributes.position, i).applyMatrix4(head.matrixWorld).length()).toBeLessThan(bird.userData.studyRadius);
    const distance = model.migrationStudyDistance(bird, camera, 1), vertical = camera.fov * Math.PI / 360;
    expect(Math.asin(bird.userData.studyRadius / distance)).toBeLessThan(Math.min(vertical, Math.atan(Math.tan(vertical) * aspect)));
  });

  it('keeps the head buffers and resources stable throughout articulated wing movement', () => {
    const bird = flyer(), before = resources(bird), head = bird.getObjectByName('migration-bird-head');
    const attributes = Object.entries(head.geometry.attributes).map(([name, a]) => ({ name, attribute: a, array: a.array, values: [...a.array] }));
    const position = head.position.toArray();
    for (let i = 0; i < 48; i++) bird.userData.applyWingPhase(i * Math.PI / 12);
    expect(resources(bird)).toEqual(before); expect(head.position.toArray()).toEqual(position);
    for (const a of attributes) { expect(head.geometry.attributes[a.name]).toBe(a.attribute); expect(a.attribute.array).toBe(a.array); expect([...a.array]).toEqual(a.values); }
  });

  it('disposes every shared and colored resource exactly once', () => {
    const bird = flyer(), r = resources(bird), listeners = [...r.geometry, ...r.material].map(resource => {
      const listener = vi.fn(); resource.addEventListener('dispose', listener); return listener;
    });
    dispose(bird); roots.delete(bird); for (const listener of listeners) expect(listener).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['canada_goose', 19, 12, 10, 1.472021990634671], ['snow_goose', 19, 12, 10, 1.472021990634671],
    ['arctic_tern', 20, 12, 10, 1.7133632456487038], ['ruby_hummingbird', 19, 12, 10, 1.0713600071840288],
    ['peregrine', 20, 13, 10, 1.3970397635969702], ['bartailed_godwit', 21, 13, 11, 1.4888871993803106],
    ['monarch', 17, 9, 4, .729161077552666]
  ])('preserves the separate %s head and resource budget', (id, nodes, geometries, materials, radius) => {
    const bird = flyer(id), head = bird.getObjectByName(id === 'monarch' ? 'migration-monarch-head' : 'migration-bird-head'), r = resources(bird);
    const colored = id === 'peregrine' || id === 'ruby_hummingbird' || id === 'arctic_tern' || id === 'canada_goose';
    expect(head.geometry.parameters.widthSegments).toBe(colored ? 24 : 12);
    expect(head.geometry.parameters.heightSegments).toBe(colored ? 16 : 8);
    if (colored) expect(head.geometry.attributes.color.count).toBe(425); else expect(head.geometry.attributes.color).toBeUndefined();
    expect(r.nodes).toHaveLength(nodes); expect(r.geometry.size).toBe(geometries); expect(r.material.size).toBe(materials);
    expect(bird.userData.studyRadius).toBeCloseTo(radius, 12);
  });
});
