import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing godwit source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn { createMigrationFlyer, migrationStudyDistance };')(num);
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const flyer = (id = 'bartailed_godwit') => model.createMigrationFlyer(THREE, { id }, 0);
const point = (attribute, index) => new THREE.Vector3().fromBufferAttribute(attribute, index);
const billOf = bird => bird.getObjectByName('migration-bird-bill');
function resources(bird) {
  const nodes = [], geometry = new Set(), material = new Set();
  bird.traverse(node => { nodes.push(node); if (node.geometry) geometry.add(node.geometry); for (const m of Array.isArray(node.material) ? node.material : [node.material]) if (m) material.add(m); });
  return { nodes, geometry, material };
}

describe('Bar-tailed godwit upturned two-tone bill', () => {
  it('uses one small colored surface with finite unit normals and bounded colors', () => {
    const bird = flyer(), bill = billOf(bird), g = bill.geometry;
    expect(g.attributes.position.count).toBe(74); expect(g.index.count / 3).toBe(144);
    expect(bill.material.vertexColors).toBe(true); expect(bill.material.color.getHex()).toBe(0xffffff);
    expect(bill.children).toHaveLength(0);
    for (const attribute of Object.values(g.attributes)) expect([...attribute.array].every(Number.isFinite)).toBe(true);
    for (let i = 0; i < g.attributes.normal.count; i++) expect(point(g.attributes.normal, i).length()).toBeCloseTo(1, 5);
    expect([...g.attributes.color.array].every(v => v >= 0 && v <= 1)).toBe(true);
    dispose(bird);
  });

  it('closes the bill with outward winding and no zero-area facets', () => {
    const bird = flyer(), g = billOf(bird).geometry, edges = new Map();
    let volume = 0;
    for (let i = 0; i < g.index.count; i += 3) {
      const ids = [0, 1, 2].map(j => g.index.getX(i + j));
      const [a, b, c] = ids.map(id => point(g.attributes.position, id));
      expect(b.clone().sub(a).cross(c.clone().sub(a)).length() / 2).toBeGreaterThan(.0001);
      volume += a.dot(b.clone().cross(c)) / 6;
      for (let e = 0; e < 3; e++) {
        const u = ids[e], v = ids[(e + 1) % 3], key = [u, v].sort((x, y) => x - y).join(':');
        const edge = edges.get(key) || { count: 0, winding: 0 };
        edge.count++; edge.winding += u < v ? 1 : -1; edges.set(key, edge);
      }
    }
    expect(volume).toBeGreaterThan(.003);
    for (const edge of edges.values()) expect(edge).toEqual({ count: 2, winding: 0 });
    dispose(bird);
  });

  it('rises gradually toward the tip while narrowing on both axes', () => {
    const bird = flyer(), g = billOf(bird).geometry;
    const sections = new Map();
    for (let i = 0; i < g.attributes.position.count; i++) {
      const p = point(g.attributes.position, i), key = p.y.toFixed(6);
      if (!sections.has(key)) sections.set(key, []);
      sections.get(key).push(p);
    }
    const rings = [...sections.values()].sort((a, b) => a[0].y - b[0].y).map(points => ({
      along: points[0].y, width: Math.max(...points.map(p => Math.abs(p.x))),
      lower: Math.min(...points.map(p => p.z)), upper: Math.max(...points.map(p => p.z))
    }));
    expect(rings.length).toBeGreaterThanOrEqual(7);
    for (let i = 1; i < rings.length; i++) {
      const a = rings[i - 1], b = rings[i];
      expect(b.width).toBeLessThan(a.width);
      expect(b.upper - b.lower).toBeLessThan(a.upper - a.lower);
      expect((b.upper + b.lower) / 2).toBeGreaterThan((a.upper + a.lower) / 2);
    }
    const tip = rings.at(-1);
    expect(tip.upper).toBeGreaterThan(.05); expect(tip.upper).toBeLessThan(.08);
    expect((tip.upper - rings[0].upper) / (tip.along - rings[0].along)).toBeLessThan(.15);
    dispose(bird);
  });

  it('shows a pink base fading to a dark distal tip on both sides', () => {
    const bird = flyer(), g = billOf(bird).geometry;
    let baseCount = 0, tipCount = 0;
    for (let i = 0; i < g.attributes.position.count; i++) {
      const p = point(g.attributes.position, i), c = point(g.attributes.color, i);
      if (p.y < -.18) { baseCount++; expect(c.x).toBeGreaterThan(.8); expect(c.x).toBeGreaterThan(c.y); expect(c.y).toBeGreaterThan(c.z); }
      if (p.y > .14) { tipCount++; expect(c.length()).toBeLessThan(.3); }
    }
    expect(baseCount).toBeGreaterThan(12); expect(tipCount).toBeGreaterThan(12);
    dispose(bird);
  });

  it('mirrors shape and color about the bill center plane', () => {
    const bird = flyer(), g = billOf(bird).geometry, colors = new Map();
    const key = p => p.toArray().map(v => Math.round(v * 1e6) || 0).join(',');
    for (let i = 0; i < g.attributes.position.count; i++) colors.set(key(point(g.attributes.position, i)), point(g.attributes.color, i));
    for (let i = 0; i < g.attributes.position.count; i++) {
      const p = point(g.attributes.position, i); p.x *= -1;
      expect(colors.has(key(p))).toBe(true);
      expect(colors.get(key(p)).distanceTo(point(g.attributes.color, i))).toBeLessThan(1e-6);
    }
    dispose(bird);
  });

  it('retains the original forward extent and intersects the unchanged head', () => {
    const bird = flyer(), bill = billOf(bird), head = bird.getObjectByName('migration-bird-head');
    expect(head.geometry.parameters.widthSegments).toBe(12); expect(head.geometry.parameters.radius).toBe(.2);
    expect(head.position.toArray()).toEqual([0, 0, -.94]);
    expect(bill.position.toArray()).toEqual([0, 0, -1.37]); expect(bill.rotation.x).toBe(-Math.PI / 2);
    bill.updateMatrix();
    const positions = Array.from({ length: bill.geometry.attributes.position.count }, (_, i) => point(bill.geometry.attributes.position, i).applyMatrix4(bill.matrix));
    expect(Math.min(...positions.map(p => p.z))).toBeCloseTo(-1.68, 6);
    expect(Math.max(...positions.map(p => p.z))).toBeCloseTo(-1.06, 6);
    expect(positions[72].distanceTo(head.position)).toBeLessThan(.2);
    expect(positions[73].y).toBeCloseTo(.064, 6);
    dispose(bird);
  });

  it('keeps scene object, geometry and material counts within the prior budget', () => {
    const bird = flyer(), r = resources(bird);
    expect(r.nodes).toHaveLength(21); expect(r.geometry.size).toBe(13); expect(r.material.size).toBe(11);
    expect([...r.material].every(m => !m.map && !m.normalMap)).toBe(true);
    dispose(bird);
  });

  it.each([.63, 1.18])('fits the subtly raised tip in the camera envelope at aspect %s', aspect => {
    const bird = flyer(), bill = billOf(bird), camera = new THREE.PerspectiveCamera(54, aspect, .1, 900);
    bird.updateMatrixWorld(true);
    expect(bird.userData.studyRadius).toBeCloseTo(1.4888871993803106, 12);
    // The old cone radius was 1.487808002111435. Preserve automatic fitting;
    // the subtle rise needs less than one tenth of one percent more radius.
    expect(bird.userData.studyRadius / 1.487808002111435).toBeLessThan(1.001);
    for (let i = 0; i < bill.geometry.attributes.position.count; i++) expect(point(bill.geometry.attributes.position, i).applyMatrix4(bill.matrixWorld).length()).toBeLessThan(bird.userData.studyRadius);
    const distance = model.migrationStudyDistance(bird, camera, 1), vertical = camera.fov * Math.PI / 360;
    expect(Math.asin(bird.userData.studyRadius / distance)).toBeLessThan(Math.min(vertical, Math.atan(Math.tan(vertical) * aspect)));
    dispose(bird);
  });

  it('keeps bill buffers, material and transform stable throughout wing movement', () => {
    const bird = flyer(), bill = billOf(bird), before = resources(bird), geometry = bill.geometry, material = bill.material;
    const attributes = Object.entries(geometry.attributes).map(([name, a]) => ({ name, attribute: a, array: a.array, values: [...a.array] }));
    const position = bill.position.toArray(), rotation = bill.rotation.toArray();
    for (let i = 0; i < 48; i++) bird.userData.applyWingPhase(i * Math.PI / 12);
    expect(resources(bird)).toEqual(before); expect(bill.geometry).toBe(geometry); expect(bill.material).toBe(material);
    expect(bill.position.toArray()).toEqual(position); expect(bill.rotation.toArray()).toEqual(rotation);
    for (const a of attributes) { expect(geometry.attributes[a.name]).toBe(a.attribute); expect(a.attribute.array).toBe(a.array); expect([...a.array]).toEqual(a.values); }
    dispose(bird);
  });

  it('disposes each resource once', () => {
    const bird = flyer(), r = resources(bird), listeners = [...r.geometry, ...r.material].map(resource => {
      const listener = vi.fn(); resource.addEventListener('dispose', listener); return listener;
    });
    dispose(bird); for (const listener of listeners) expect(listener).toHaveBeenCalledTimes(1);
  });

  it.each(['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'monarch'])('preserves the separate %s bill construction', id => {
    const bird = flyer(id), bill = billOf(bird);
    if (id === 'monarch') expect(bill).toBeUndefined();
    else if (id === 'peregrine') {
      expect(bill.geometry.type).toBe('BufferGeometry'); expect(bill.geometry.attributes.position.count).toBe(74);
      expect(bill.rotation.x).toBe(0); expect(point(bill.geometry.attributes.position, 73).y).toBeLessThan(0);
    } else if (id === 'canada_goose' || id === 'snow_goose') {
      expect(bill.geometry.type).toBe('BufferGeometry'); expect(bill.geometry.attributes.position.count).toBe(114);
      expect(bill.material.vertexColors).toBe(id === 'snow_goose'); expect(bill.rotation.x).toBe(-Math.PI / 2);
      expect(bill.scale.toArray()).toEqual([1.18, 1, .58]);
      if (id === 'snow_goose') expect(bill.geometry.attributes.color.count).toBe(114);
      else { expect(bill.geometry.attributes.color).toBeUndefined(); expect(bill.material.color.getHex()).toBe(0x1f2937); }
    } else {
      expect(bill.geometry.type).toBe('ConeGeometry'); expect(bill.geometry.attributes.color).toBeUndefined();
      expect(bill.material.vertexColors).toBe(false); expect(bill.rotation.x).toBe(-Math.PI / 2);
    }
    dispose(bird);
  });
});
