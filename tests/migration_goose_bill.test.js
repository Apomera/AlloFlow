import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing goose model source: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn { createMigrationFlyer, migrationStudyDistance };')(num);
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const flyer = id => model.createMigrationFlyer(THREE, { id }, 0);
const point = (attribute, index) => new THREE.Vector3().fromBufferAttribute(attribute, index);
const billOf = bird => bird.getObjectByName('migration-bird-bill');
function resources(bird) {
  const nodes = [], geometry = new Set(), material = new Set();
  bird.traverse(node => { nodes.push(node); if (node.geometry) geometry.add(node.geometry); for (const m of Array.isArray(node.material) ? node.material : [node.material]) if (m) material.add(m); });
  return { nodes, geometry, material };
}

describe.each(['canada_goose', 'snow_goose'])('%s rounded bill', id => {
  it('uses one small continuous surface with finite unit normals', () => {
    const bird = flyer(id), bill = billOf(bird), g = bill.geometry;
    expect(g.attributes.position.count).toBe(114); expect(g.index.count / 3).toBe(224);
    expect(bill.children).toHaveLength(0);
    for (const attribute of Object.values(g.attributes)) expect([...attribute.array].every(Number.isFinite)).toBe(true);
    for (let i = 0; i < g.attributes.normal.count; i++) expect(point(g.attributes.normal, i).length()).toBeCloseTo(1, 5);
    dispose(bird);
  });

  it('closes both ends with outward winding and nondegenerate facets', () => {
    const bird = flyer(id), g = billOf(bird).geometry, edges = new Map();
    let volume = 0;
    for (let i = 0; i < g.index.count; i += 3) {
      const ids = [0, 1, 2].map(j => g.index.getX(i + j));
      const [a, b, c] = ids.map(vertex => point(g.attributes.position, vertex));
      expect(b.clone().sub(a).cross(c.clone().sub(a)).length() / 2).toBeGreaterThan(.00008);
      volume += a.dot(b.clone().cross(c)) / 6;
      for (let e = 0; e < 3; e++) {
        const u = ids[e], v = ids[(e + 1) % 3], key = [u, v].sort((x, y) => x - y).join(':');
        const edge = edges.get(key) || { count: 0, winding: 0 };
        edge.count++; edge.winding += u < v ? 1 : -1; edges.set(key, edge);
      }
    }
    expect(volume).toBeGreaterThan(.0037);
    for (const edge of edges.values()) expect(edge).toEqual({ count: 2, winding: 0 });
    dispose(bird);
  });

  it('keeps a broad flattened base and a rounded distal outline', () => {
    const bird = flyer(id), bill = billOf(bird), p = bill.geometry.attributes.position;
    const rings = Array.from({ length: 7 }, (_, ring) => Array.from({ length: 16 }, (_, side) => point(p, ring * 16 + side)));
    const widths = rings.map(ring => Math.max(...ring.map(p => Math.abs(p.x))));
    const depths = rings.map(ring => Math.max(...ring.map(p => Math.abs(p.z))));
    expect(widths[0] * bill.scale.x / (depths[0] * bill.scale.z)).toBeGreaterThan(2);
    for (let i = 1; i < rings.length; i++) { expect(widths[i]).toBeLessThanOrEqual(widths[i - 1]); expect(depths[i]).toBeLessThan(depths[i - 1]); }
    // The end stays broad farther forward than a cone; it rounds off in its
    // last 0.012 model units instead of tapering along the whole length.
    expect(widths[5] / widths[0]).toBeGreaterThan(.5);
    expect(widths[6] / widths[0]).toBeGreaterThan(.29);
    expect(point(p, 113).y - rings[6][0].y).toBeCloseTo(.012, 6);
    dispose(bird);
  });

  it('mirrors shape and any markings about the center plane', () => {
    const bird = flyer(id), g = billOf(bird).geometry, vertices = new Map();
    const key = p => p.toArray().map(v => Math.round(v * 1e6) || 0).join(',');
    for (let i = 0; i < g.attributes.position.count; i++) vertices.set(key(point(g.attributes.position, i)), i);
    for (let i = 0; i < g.attributes.position.count; i++) {
      const p = point(g.attributes.position, i); p.x *= -1;
      expect(vertices.has(key(p))).toBe(true);
      if (g.attributes.color) expect(point(g.attributes.color, vertices.get(key(p))).distanceTo(point(g.attributes.color, i))).toBeLessThan(1e-6);
    }
    dispose(bird);
  });

  it('preserves the original bill transform, forward extent, head and camera envelope', () => {
    const bird = flyer(id), bill = billOf(bird), head = bird.getObjectByName('migration-bird-head');
    expect(head.geometry.parameters.radius).toBe(.2); expect(head.geometry.parameters.widthSegments).toBe(id === 'canada_goose' ? 24 : 12);
    expect(head.geometry.parameters.heightSegments).toBe(id === 'canada_goose' ? 16 : 8);
    expect(head.position.toArray()).toEqual([0, .1, -1.24]);
    expect(bill.position.toArray()).toEqual([0, .085, -1.5099999999999998]);
    expect(bill.scale.toArray()).toEqual([1.18, 1, .58]); expect(bill.rotation.x).toBe(-Math.PI / 2);
    bill.updateMatrix();
    const points = Array.from({ length: bill.geometry.attributes.position.count }, (_, i) => point(bill.geometry.attributes.position, i).applyMatrix4(bill.matrix));
    expect(Math.min(...points.map(p => p.z))).toBeCloseTo(-1.66, 6); expect(Math.max(...points.map(p => p.z))).toBeCloseTo(-1.36, 6);
    expect(points[112].distanceTo(head.position)).toBeLessThan(.2);
    expect(bird.userData.studyRadius).toBeCloseTo(1.472021990634671, 12);
    for (const aspect of [.63, 1.18]) {
      const camera = new THREE.PerspectiveCamera(54, aspect, .1, 900), vertical = camera.fov * Math.PI / 360;
      const distance = model.migrationStudyDistance(bird, camera, 1);
      expect(Math.asin(bird.userData.studyRadius / distance)).toBeLessThan(Math.min(vertical, Math.atan(Math.tan(vertical) * aspect)));
    }
    dispose(bird);
  });

  it('preserves scene resources and does not change the bill during wing movement', () => {
    const bird = flyer(id), bill = billOf(bird), before = resources(bird), g = bill.geometry, material = bill.material;
    expect(before.nodes).toHaveLength(19);
    expect(before.geometry.size).toBe(12); expect(before.material.size).toBe(10);
    expect([...before.material].every(m => !m.map && !m.normalMap)).toBe(true);
    const attributes = Object.entries(g.attributes).map(([name, a]) => ({ name, attribute: a, array: a.array, values: [...a.array] }));
    const position = bill.position.toArray(), rotation = bill.rotation.toArray();
    for (let i = 0; i < 48; i++) bird.userData.applyWingPhase(i * Math.PI / 12);
    expect(resources(bird)).toEqual(before); expect(bill.geometry).toBe(g); expect(bill.material).toBe(material);
    expect(bill.position.toArray()).toEqual(position); expect(bill.rotation.toArray()).toEqual(rotation);
    for (const a of attributes) { expect(g.attributes[a.name]).toBe(a.attribute); expect(a.attribute.array).toBe(a.array); expect([...a.array]).toEqual(a.values); }
    dispose(bird);
  });

  it('disposes each geometry and material once', () => {
    const bird = flyer(id), r = resources(bird), listeners = [...r.geometry, ...r.material].map(resource => {
      const listener = vi.fn(); resource.addEventListener('dispose', listener); return listener;
    });
    dispose(bird); for (const listener of listeners) expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('goose species identification remains distinct', () => {
  it('keeps the Canada bill dark without applying Snow Goose markings', () => {
    const bird = flyer('canada_goose'), bill = billOf(bird);
    expect(bill.geometry.attributes.color).toBeUndefined(); expect(bill.material.vertexColors).toBe(false);
    expect(bill.material.color.getHex()).toBe(0x1f2937);
    dispose(bird);
  });

  it('places the Snow Goose grin on both sides while leaving its ridge, base and nail pink', () => {
    const bird = flyer('snow_goose'), bill = billOf(bird), g = bill.geometry;
    expect(bill.material.vertexColors).toBe(true); expect(bill.material.color.getHex()).toBe(0xffffff);
    expect([...g.attributes.color.array].every(v => v >= 0 && v <= 1)).toBe(true);
    let left = 0, right = 0;
    for (let i = 0; i < g.attributes.color.count; i++) {
      const p = point(g.attributes.position, i), c = point(g.attributes.color, i);
      if (c.x < .4) {
        expect(Math.abs(p.x)).toBeGreaterThan(.055); expect(p.y).toBeGreaterThan(-.08); expect(p.y).toBeLessThan(.09);
        expect(p.z).toBeLessThan(.002); expect(p.z).toBeGreaterThan(-.03);
        if (p.x < 0) left++; else right++;
      }
      if (p.y < -.12 || p.y > .13 || Math.abs(p.x) < .01) { expect(c.x).toBeGreaterThan(.9); expect(c.x).toBeGreaterThan(c.y); }
    }
    expect(left).toBeGreaterThanOrEqual(3); expect(right).toBe(left);
    dispose(bird);
  });

  it.each(['arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit', 'monarch'])('preserves separate %s bill construction', id => {
    const bird = flyer(id), bill = billOf(bird);
    if (id === 'monarch') expect(bill).toBeUndefined();
    else if (id === 'peregrine' || id === 'bartailed_godwit') {
      expect(bill.geometry.type).toBe('BufferGeometry'); expect(bill.geometry.attributes.position.count).toBe(74);
      expect(bill.material.vertexColors).toBe(true); expect(bill.rotation.x).toBe(id === 'peregrine' ? 0 : -Math.PI / 2);
      expect(point(bill.geometry.attributes.position, 73)[id === 'peregrine' ? 'y' : 'z']).toBe(id === 'peregrine' ? Math.fround(-.11) : Math.fround(.064));
    } else {
      expect(bill.geometry.type).toBe('ConeGeometry'); expect(bill.geometry.attributes.color).toBeUndefined();
      expect(bill.material.vertexColors).toBe(false); expect(bill.rotation.x).toBe(-Math.PI / 2);
      expect(bill.geometry.parameters.height).toBe(id === 'arctic_tern' ? .3 : id === 'ruby_hummingbird' ? .54 : .46);
    }
    dispose(bird);
  });
});
