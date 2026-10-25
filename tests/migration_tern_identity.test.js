import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing tern source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn { createMigrationFlyer, migrationStudyDistance };')(num);
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const roots = new Set();
const flyer = (id = 'arctic_tern') => { const bird = model.createMigrationFlyer(THREE, { id }, 0); roots.add(bird); return bird; };
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

describe('Continuous breeding-adult Arctic Tern head markings', () => {
  it('uses a closed smooth head with finite outward unit normals and bounded colors', () => {
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

  it('connects the full dark cap through crown, forehead and the lowered nape', () => {
    const g = flyer().getObjectByName('migration-bird-head').geometry;
    const crown = sample(g, [0, 1, 0]), forehead = sample(g, [0, .4, -.92]), nape = sample(g, [0, -.2, .98]);
    expect(crown.toArray()).toEqual(forehead.toArray()); expect(crown.toArray()).toEqual(nape.toArray());
    expect(Math.max(...crown.toArray())).toBeLessThan(.2);
    expect(crown.x).toBeCloseTo(17 / 255, 6); expect(crown.y).toBeCloseTo(24 / 255, 6); expect(crown.z).toBeCloseTo(39 / 255, 6);
  });

  it.each([-1, 1])('retains a pale lower cheek and throat on anatomical side %s', side => {
    const g = flyer().getObjectByName('migration-bird-head').geometry;
    const cheek = sample(g, [side, -.2, 0]), throat = sample(g, [0, -.8, -.6]);
    expect(cheek.distanceTo(throat)).toBeLessThan(1e-6);
    expect(Math.min(...cheek.toArray())).toBeGreaterThan(.95);
    expect(cheek.distanceTo(sample(g, [0, -.2, .98]))).toBeGreaterThan(1);
  });

  it('forms one connected dark cap with no detached islands on the lower face', () => {
    const g = flyer().getObjectByName('migration-bird-head').geometry;
    const graph = patchGraph(g, (c, p) => {
      const dark = Math.max(...c.toArray()) < .2;
      if (dark) { expect(p.y).toBeGreaterThan(-.12); if (p.z < 0) expect(p.y).toBeGreaterThan(0); }
      return dark;
    });
    expect(graph.members.size).toBeGreaterThan(100); expect(graph.reached).toEqual(graph.members);
  });

  it('joins the pale lower cheeks through a single continuous throat', () => {
    const graph = patchGraph(flyer().getObjectByName('migration-bird-head').geometry, c => Math.min(...c.toArray()) > .8);
    expect(graph.members.size).toBeGreaterThan(100); expect(graph.reached).toEqual(graph.members);
  });

  it('mirrors every vertex color across the head midline', () => {
    const g = flyer().getObjectByName('migration-bird-head').geometry, colors = new Map();
    for (let i = 0; i < g.attributes.position.count; i++) colors.set(key(point(g.attributes.position, i)), point(g.attributes.color, i));
    for (let i = 0; i < g.attributes.position.count; i++) {
      const p = point(g.attributes.position, i); p.x *= -1;
      expect(colors.get(key(p)).distanceTo(point(g.attributes.color, i))).toBeLessThan(1e-6);
    }
  });

  it('removes the cap shell with one fewer node, geometry and material', () => {
    const bird = flyer(), r = resources(bird);
    // Frozen round36: 21 nodes, 13 geometries and 11 materials.
    expect(r.nodes).toHaveLength(20); expect(r.geometry.size).toBe(12); expect(r.material.size).toBe(10);
    expect(bird.getObjectByName('migration-tern-cap')).toBeUndefined();
    expect(r.nodes.filter(n => n.geometry?.type === 'SphereGeometry' && n.geometry.parameters.radius === .204)).toEqual([]);
    expect(bird.getObjectByName('migration-bird-head').children).toHaveLength(0);
  });

  it('preserves head transform, thin red bill, eye placement, tail streamers and study radius', () => {
    const bird = flyer(), head = bird.getObjectByName('migration-bird-head'), bill = bird.getObjectByName('migration-bird-bill'), r = resources(bird);
    expect(head.position.toArray()).toEqual([0, 0, -.94]); expect(head.scale.toArray()).toEqual([.82, .9, 1.06]);
    expect(head.material.roughness).toBe(.66); expect(head.material.metalness).toBe(0);
    expect(bill.geometry.type).toBe('ConeGeometry'); expect(bill.geometry.parameters.height).toBe(.3);
    expect(bill.geometry.parameters.radius).toBe(.045); expect(bill.rotation.x).toBe(-Math.PI / 2);
    expect(bill.material.color.getHex()).toBe(0xdc2626); expect(bill.material.vertexColors).toBe(false);
    expect(bill.position.x).toBe(0); expect(bill.position.y).toBe(0); expect(bill.position.z).toBeCloseTo(-1.21, 12);
    const eyes = r.nodes.filter(n => n.geometry?.type === 'SphereGeometry' && n.geometry.parameters.radius === .026);
    expect(eyes).toHaveLength(2); expect(eyes[0].geometry).toBe(eyes[1].geometry); expect(eyes[0].material).toBe(eyes[1].material);
    expect(eyes.map(eye => eye.position.x)).toEqual([-.184 * .82, .184 * .82]);
    for (const eye of eyes) { expect(eye.position.y).toBe(.065 * .9); expect(eye.position.z).toBe(-.94 - .055 * 1.06); }
    const streamers = r.nodes.filter(n => n.name === 'migration-tern-tail-streamer');
    expect(streamers).toHaveLength(2); expect(streamers[0].geometry).toBe(streamers[1].geometry); expect(streamers[0].material).toBe(streamers[1].material);
    expect(bird.userData.studyRadius).toBeCloseTo(1.7133632456487038, 12);
  });

  it.each([.63, 1.18])('fits the whole head within the existing camera envelope at aspect %s', aspect => {
    const bird = flyer(), camera = new THREE.PerspectiveCamera(54, aspect, .1, 900); bird.updateMatrixWorld(true);
    const head = bird.getObjectByName('migration-bird-head');
    for (let i = 0; i < head.geometry.attributes.position.count; i++) expect(point(head.geometry.attributes.position, i).applyMatrix4(head.matrixWorld).length()).toBeLessThan(bird.userData.studyRadius);
    const distance = model.migrationStudyDistance(bird, camera, 1), vertical = camera.fov * Math.PI / 360;
    expect(Math.asin(bird.userData.studyRadius / distance)).toBeLessThan(Math.min(vertical, Math.atan(Math.tan(vertical) * aspect)));
  });

  it('keeps head buffers and all resources stable through articulated wing movement', () => {
    const bird = flyer(), before = resources(bird), head = bird.getObjectByName('migration-bird-head');
    const attributes = Object.entries(head.geometry.attributes).map(([name, a]) => ({ name, attribute: a, array: a.array, values: [...a.array] }));
    const position = head.position.toArray();
    for (let i = 0; i < 48; i++) bird.userData.applyWingPhase(i * Math.PI / 12);
    expect(resources(bird)).toEqual(before); expect(head.position.toArray()).toEqual(position);
    for (const a of attributes) { expect(head.geometry.attributes[a.name]).toBe(a.attribute); expect(a.attribute.array).toBe(a.array); expect([...a.array]).toEqual(a.values); }
  });

  it('disposes all shared and colored resources exactly once', () => {
    const bird = flyer(), r = resources(bird), listeners = [...r.geometry, ...r.material].map(resource => {
      const listener = vi.fn(); resource.addEventListener('dispose', listener); return listener;
    });
    dispose(bird); roots.delete(bird); for (const listener of listeners) expect(listener).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['canada_goose', 19, 12, 10, 1.472021990634671], ['snow_goose', 19, 12, 10, 1.472021990634671],
    ['ruby_hummingbird', 19, 12, 10, 1.0713600071840288], ['peregrine', 20, 13, 10, 1.3970397635969702],
    ['sandhill_crane', 21, 13, 11, 1.8432450906802318], ['bartailed_godwit', 21, 13, 11, 1.4888871993803106],
    ['monarch', 17, 9, 4, .729161077552666]
  ])('preserves the separate %s head and resource budget', (id, nodes, geometries, materials, radius) => {
    const bird = flyer(id), head = bird.getObjectByName(id === 'monarch' ? 'migration-monarch-head' : 'migration-bird-head'), r = resources(bird);
    const colored = ['peregrine', 'ruby_hummingbird', 'sandhill_crane', 'canada_goose'].includes(id);
    expect(head.geometry.parameters.widthSegments).toBe(colored ? 24 : 12);
    expect(head.geometry.parameters.heightSegments).toBe(colored ? 16 : 8);
    if (colored) expect(head.geometry.attributes.color.count).toBe(425); else expect(head.geometry.attributes.color).toBeUndefined();
    expect(r.nodes).toHaveLength(nodes); expect(r.geometry.size).toBe(geometries); expect(r.material.size).toBe(materials);
    expect(bird.userData.studyRadius).toBeCloseTo(radius, 12);
  });
});
