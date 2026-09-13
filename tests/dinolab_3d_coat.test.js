import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { internals } from './helpers/dino_lab_harness.js';
const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const { dinoFilamentGeometry } = internals();
describe('Dino Lab curved filament clusters', () => {
  for (const length of [.004, .2, 2]) for (const ratio of [.03, .09, .15]) {
    it('makes closed tapered fibers at length ' + length + ' and radius ratio ' + ratio, () => {
      const radius = length * ratio, g = dinoFilamentGeometry(T, length, radius, 123);
      const p = g.attributes.position, normal = g.attributes.normal, colors = g.attributes.color, index = g.index;
      expect(g.parameters.strands).toBe(7); expect(p.count).toBe(154); expect(index.count / 3).toBe(280);
      for (const attribute of [p, normal, colors]) expect([...attribute.array].every(Number.isFinite)).toBe(true);
      for (let i = 0; i < p.count; i++) expect(new T.Vector3().fromBufferAttribute(normal, i).length()).toBeCloseTo(1, 5);
      const edgeCounts = new Map();
      let volume = 0;
      for (let i = 0; i < index.count; i += 3) {
        const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
        const [a, b, c] = ids.map(id => new T.Vector3().fromBufferAttribute(p, id));
        const area = new T.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).length();
        expect(area).toBeGreaterThan(length * radius * 1e-5);
        volume += a.dot(new T.Vector3().crossVectors(b, c)) / 6;
        for (let e = 0; e < 3; e++) { const key = [ids[e], ids[(e + 1) % 3]].sort((x, y) => x - y).join(':'); edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1); }
      }
      expect([...edgeCounts.values()].every(n => n === 2)).toBe(true); expect(volume).toBeGreaterThan(0);
      for (let strand = 0; strand < 7; strand++) {
        const start = strand * 22, root = new T.Vector3().fromBufferAttribute(p, start + 21), tip = new T.Vector3().fromBufferAttribute(p, start + 20);
        expect(root.y).toBe(0); expect(Math.hypot(root.x, root.z)).toBeLessThan(radius * 1.61);
        expect(tip.y).toBeGreaterThan(length * .69); expect(tip.y).toBeLessThanOrEqual(length * 1.00001);
        expect(Math.hypot(tip.x - root.x, tip.z - root.z)).toBeCloseTo(length * .16, 6);
        const lower = new T.Vector3().fromBufferAttribute(p, start).distanceTo(new T.Vector3().fromBufferAttribute(p, start + 2));
        const upper = new T.Vector3().fromBufferAttribute(p, start + 16).distanceTo(new T.Vector3().fromBufferAttribute(p, start + 18));
        expect(upper / lower).toBeLessThan(.34); expect(colors.getX(start + 20)).toBeGreaterThan(colors.getX(start));
      }
      g.dispose();
    });
  }
  it('recreates a seed exactly and varies neighboring clusters', () => {
    const a = dinoFilamentGeometry(T, 1, .08, 72), b = dinoFilamentGeometry(T, 1, .08, 72), c = dinoFilamentGeometry(T, 1, .08, 73);
    expect([...a.attributes.position.array]).toEqual([...b.attributes.position.array]);
    expect([...a.attributes.position.array]).not.toEqual([...c.attributes.position.array]);
    [a, b, c].forEach(g => g.dispose());
  });
  it('scales the whole cluster proportionally', () => {
    const a = dinoFilamentGeometry(T, 1, .08, 92), b = dinoFilamentGeometry(T, .01, .0008, 92);
    a.attributes.position.array.forEach((value, i) => expect(b.attributes.position.array[i]).toBeCloseTo(value * .01, 7));
    a.dispose(); b.dispose();
  });
});
