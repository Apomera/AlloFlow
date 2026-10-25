import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing Canada Goose source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn { createMigrationFlyer, migrationStudyDistance };')(num);
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const roots = new Set();
const flyer = (id = 'canada_goose') => { const bird = model.createMigrationFlyer(THREE, { id }, 0); roots.add(bird); return bird; };
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
  const reached = new Set(), pending = members.size ? [members.values().next().value] : [];
  while (pending.length) { const id = pending.pop(); if (reached.has(id)) continue; reached.add(id); pending.push(...graph.get(id)); }
  return { members, reached };
}

describe('Continuous Canada Goose cheeks and chinstrap', () => {
  it('uses one closed outward-facing sphere with finite unit normals and bounded vertex colors', () => {
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
    const edges = new Map(), vertices = new Set();
    for (let i = 0; i < g.index.count; i += 3) {
      const face = [0, 1, 2].map(j => point(g.attributes.position, g.index.getX(i + j)));
      expect(new THREE.Vector3().subVectors(face[1], face[0]).cross(new THREE.Vector3().subVectors(face[2], face[0])).dot(face[0])).toBeGreaterThan(0);
      const ids = face.map(key); ids.forEach(id => vertices.add(id));
      for (let j = 0; j < 3; j++) { const edge = [ids[j], ids[(j + 1) % 3]].sort().join('|'); edges.set(edge, (edges.get(edge) || 0) + 1); }
    }
    expect([...edges.values()].every(count => count === 2)).toBe(true);
    expect(vertices.size - edges.size + g.index.count / 3).toBe(2);
  });

  it.each([-1, 1])('continues the pale cheek on anatomical side %s into the chin', side => {
    const g = flyer().getObjectByName('migration-bird-head').geometry;
    const cheek = sample(g, [side, -.2, .2]), chin = sample(g, [0, -1, 0]);
    expect(cheek.distanceTo(chin)).toBeLessThan(1e-6);
    expect(cheek.x).toBeCloseTo(248 / 255, 6); expect(cheek.y).toBeCloseTo(250 / 255, 6); expect(cheek.z).toBeCloseTo(252 / 255, 6);
    expect(cheek.distanceTo(sample(g, [0, 0, 1]))).toBeGreaterThan(1);
  });

  it('forms one connected pale marking across both cheeks and the underside without isolated flecks', () => {
    const g = flyer().getObjectByName('migration-bird-head').geometry;
    const graph = patchGraph(g, (c, p) => {
      const pale = Math.min(...c.toArray()) > .8;
      if (pale) { expect(p.y).toBeLessThan(.03); expect(p.z).toBeGreaterThan(-.06); expect(p.z).toBeLessThan(.12); }
      return pale;
    });
    expect(graph.members.size).toBeGreaterThan(50); expect(graph.reached).toEqual(graph.members);
    expect(graph.members.has(key(new THREE.Vector3(0, -.2, 0)))).toBe(true);
    expect(graph.members.has(key(new THREE.Vector3(-.2, 0, 0)))).toBe(true);
    expect(graph.members.has(key(new THREE.Vector3(.2, 0, 0)))).toBe(true);
  });

  it('keeps the crown, forehead, bill-side face and nape dark', () => {
    const g = flyer().getObjectByName('migration-bird-head').geometry;
    const crown = sample(g, [0, 1, 0]);
    expect(crown.x).toBeCloseTo(17 / 255, 6); expect(crown.y).toBeCloseTo(26 / 255, 6); expect(crown.z).toBeCloseTo(36 / 255, 6);
    for (const direction of [[0, .25, -1], [0, -.3, -1], [0, 0, 1]]) expect(sample(g, direction).toArray()).toEqual(crown.toArray());
    const graph = patchGraph(g, c => Math.max(...c.toArray()) < .2);
    expect(graph.members.size).toBeGreaterThan(150); expect(graph.reached).toEqual(graph.members);
  });

  it('mirrors every vertex color across the head midline, including duplicated pole and seam vertices', () => {
    const g = flyer().getObjectByName('migration-bird-head').geometry, colors = new Map();
    for (let i = 0; i < g.attributes.position.count; i++) {
      const p = key(point(g.attributes.position, i)), c = point(g.attributes.color, i);
      if (colors.has(p)) expect(colors.get(p).distanceTo(c)).toBeLessThan(1e-6);
      colors.set(p, c);
    }
    for (let i = 0; i < g.attributes.position.count; i++) {
      const p = point(g.attributes.position, i); p.x *= -1;
      expect(colors.get(key(p)).distanceTo(point(g.attributes.color, i))).toBeLessThan(1e-6);
    }
  });

  it('removes the detached ribbon and exactly one node, geometry and material', () => {
    const bird = flyer(), r = resources(bird);
    // Frozen round37: 20 nodes, 13 geometries and 11 materials.
    expect(r.nodes).toHaveLength(19); expect(r.geometry.size).toBe(12); expect(r.material.size).toBe(10);
    expect(bird.getObjectByName('migration-goose-chinstrap')).toBeUndefined();
    expect(bird.getObjectByName('migration-bird-head').children).toHaveLength(0);
  });

  it('preserves the head transform, broad dark bill, black neck and paired eyes', () => {
    const bird = flyer(), head = bird.getObjectByName('migration-bird-head'), bill = bird.getObjectByName('migration-bird-bill');
    expect(head.position.toArray()).toEqual([0, .1, -1.24]); expect(head.scale.toArray()).toEqual([.93, .84, 1.16]);
    expect(head.material.roughness).toBe(.66); expect(head.material.metalness).toBe(0);
    expect(bill.geometry.type).toBe('BufferGeometry'); expect(bill.geometry.attributes.position.count).toBe(114);
    expect(bill.geometry.attributes.color).toBeUndefined(); expect(bill.material.color.getHex()).toBe(0x1f2937);
    expect(bill.scale.toArray()).toEqual([1.18, 1, .58]); expect(bill.rotation.x).toBe(-Math.PI / 2);
    expect(bill.position.x).toBe(0); expect(bill.position.y).toBeCloseTo(.085, 12); expect(bill.position.z).toBeCloseTo(-1.51, 12);
    const neck = bird.getObjectByName('migration-bird-neck'); expect(neck.material.color.getHex()).toBe(0x111a24);
    expect(neck.geometry.userData.migrationNeckRings).toBe(15); expect(neck.geometry.userData.migrationNeckRadial).toBe(10);
    const eyes = resources(bird).nodes.filter(n => n.geometry?.type === 'SphereGeometry' && n.geometry.parameters.radius === .026);
    expect(eyes).toHaveLength(2); expect(eyes[0].geometry).toBe(eyes[1].geometry); expect(eyes[0].material).toBe(eyes[1].material);
    expect(eyes.map(eye => eye.position.x)).toEqual([-.184 * .93, .184 * .93]);
    for (const eye of eyes) { expect(eye.position.y).toBe(.1 + .065 * .84); expect(eye.position.z).toBe(-1.24 - .055 * 1.16); }
    expect(bird.userData.studyRadius).toBeCloseTo(1.472021990634671, 12);
  });

  it.each([.63, 1.18])('fits the continuous head within the preserved whole-bird envelope at aspect %s', aspect => {
    const bird = flyer(), camera = new THREE.PerspectiveCamera(54, aspect, .1, 900); bird.updateMatrixWorld(true);
    const head = bird.getObjectByName('migration-bird-head');
    for (let i = 0; i < head.geometry.attributes.position.count; i++) expect(point(head.geometry.attributes.position, i).applyMatrix4(head.matrixWorld).length()).toBeLessThan(bird.userData.studyRadius);
    const distance = model.migrationStudyDistance(bird, camera, 1), vertical = camera.fov * Math.PI / 360;
    expect(Math.asin(bird.userData.studyRadius / distance)).toBeLessThan(Math.min(vertical, Math.atan(Math.tan(vertical) * aspect)));
  });

  it('retains all head buffers, transforms and resource identities through articulated wing movement', () => {
    const bird = flyer(), before = resources(bird), head = bird.getObjectByName('migration-bird-head');
    const attributes = Object.entries(head.geometry.attributes).map(([name, a]) => ({ name, attribute: a, array: a.array, values: [...a.array] }));
    const position = head.position.toArray(), scale = head.scale.toArray();
    for (let i = 0; i < 48; i++) bird.userData.applyWingPhase(i * Math.PI / 12);
    expect(resources(bird)).toEqual(before); expect(head.position.toArray()).toEqual(position); expect(head.scale.toArray()).toEqual(scale);
    for (const a of attributes) { expect(head.geometry.attributes[a.name]).toBe(a.attribute); expect(a.attribute.array).toBe(a.array); expect([...a.array]).toEqual(a.values); }
  });

  it('disposes each shared and colored resource exactly once', () => {
    const bird = flyer(), r = resources(bird), listeners = [...r.geometry, ...r.material].map(resource => {
      const listener = vi.fn(); resource.addEventListener('dispose', listener); return listener;
    });
    dispose(bird); roots.delete(bird); for (const listener of listeners) expect(listener).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['snow_goose', 19, 12, 10, 1.472021990634671], ['arctic_tern', 20, 12, 10, 1.7133632456487038],
    ['ruby_hummingbird', 19, 12, 10, 1.0713600071840288], ['peregrine', 20, 13, 10, 1.3970397635969702],
    ['sandhill_crane', 21, 13, 11, 1.8432450906802318], ['bartailed_godwit', 21, 13, 11, 1.4888871993803106],
    ['monarch', 17, 9, 4, .729161077552666]
  ])('preserves the separate %s head and exact resource budget', (id, nodes, geometries, materials, radius) => {
    const bird = flyer(id), head = bird.getObjectByName(id === 'monarch' ? 'migration-monarch-head' : 'migration-bird-head'), r = resources(bird);
    const colored = ['peregrine', 'ruby_hummingbird', 'sandhill_crane', 'arctic_tern'].includes(id);
    expect(head.geometry.parameters.widthSegments).toBe(colored ? 24 : 12);
    expect(head.geometry.parameters.heightSegments).toBe(colored ? 16 : 8);
    if (colored) expect(head.geometry.attributes.color.count).toBe(425); else expect(head.geometry.attributes.color).toBeUndefined();
    expect(r.nodes).toHaveLength(nodes); expect(r.geometry.size).toBe(geometries); expect(r.material.size).toBe(materials);
    expect(bird.userData.studyRadius).toBeCloseTo(radius, 12);
  });
});
