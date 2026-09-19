import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { internals } from './helpers/dino_lab_harness.js';
const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const { dinoKeratinGeometry, dinoStudyBounds } = internals();
describe('Dino Lab swept keratin surfaces', () => {
  for (const kind of ['horn', 'claw']) for (const scale of [.01, 1, 10]) {
    it('preserves landmarks and closes the ' + kind + ' surface at scale ' + scale, () => {
      const direction = new T.Vector3(-1, .4, .1).multiplyScalar(scale), original = direction.clone();
      const radius = scale * .09, g = dinoKeratinGeometry(T, direction, radius, kind);
      const p = g.attributes.position, normal = g.attributes.normal, index = g.index;
      expect(direction.equals(original)).toBe(true);
      expect(p.count).toBe(146); expect(index.count / 3).toBe(288);
      expect(new T.Vector3().fromBufferAttribute(p, p.count - 1).length()).toBe(0);
      expect(new T.Vector3().fromBufferAttribute(p, p.count - 2).distanceTo(direction)).toBeLessThan(scale * 1e-6);
      expect([...p.array, ...normal.array].every(Number.isFinite)).toBe(true);
      const edges = new Map(); let volume = 0;
      for (let i = 0; i < index.count; i += 3) {
        const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
        const [a,b,c] = ids.map(id => new T.Vector3().fromBufferAttribute(p,id));
        expect(new T.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).length()).toBeGreaterThan(scale * scale * 1e-5);
        volume += a.dot(new T.Vector3().crossVectors(b,c)) / 6;
        for (let e = 0; e < 3; e++) { const key = [ids[e],ids[(e+1)%3]].sort((x,y)=>x-y).join(':'); edges.set(key, (edges.get(key)||0)+1); }
      }
      expect(volume).toBeGreaterThan(0); expect([...edges.values()].every(n=>n===2)).toBe(true);
      for (let i = 0; i < p.count; i++) expect(new T.Vector3().fromBufferAttribute(normal,i).length()).toBeCloseTo(1,5);
      let previous = Infinity;
      for (let ring = 0; ring < 12; ring++) {
        const center = new T.Vector3(); for (let j = 0; j < 12; j++) center.add(new T.Vector3().fromBufferAttribute(p,ring*12+j)); center.divideScalar(12);
        const sectionRadius = new T.Vector3().fromBufferAttribute(p,ring*12+3).distanceTo(center);
        expect(sectionRadius).toBeLessThan(previous); previous = sectionRadius;
        expect(center.dot(direction.clone().normalize())).toBeCloseTo(direction.length()*ring/12,5);
        if (ring === 6) expect(center.distanceTo(direction.clone().multiplyScalar(.5))).toBeCloseTo(direction.length()*(kind==='horn'?.065:.16),5);
      }
      g.dispose();
    });
  }
  it('keeps the cross-section stable for vertical and near-vertical landmarks', () => {
    for (const direction of [new T.Vector3(0,1,0),new T.Vector3(0,-1,0),new T.Vector3(1e-9,1,0)]) {
      const g = dinoKeratinGeometry(T,direction,.08,'claw');
      expect([...g.attributes.position.array,...g.attributes.normal.array].every(Number.isFinite)).toBe(true);
      expect(g.boundingSphere.radius).toBeGreaterThan(.4); expect(g.boundingSphere.radius).toBeLessThan(.7); g.dispose();
    }
  });
  it('rejects invalid landmarks and zero-width sheaths', () => {
    for (const [direction,radius] of [[new T.Vector3(),.1],[new T.Vector3(Infinity,0,0),.1],[new T.Vector3(0,1,0),0],[new T.Vector3(0,1,0),NaN]]) expect(dinoKeratinGeometry(T,direction,radius,'horn')).toBeNull();
  });
  it('includes distant horns in head studies without expanding torso studies', () => {
    const model = new T.Group(), horn = new T.Mesh(dinoKeratinGeometry(T,new T.Vector3(-2,1,0),.1,'horn'));
    horn.position.set(-2,2,0); horn.userData={dinoAnatomy:true,dinoFeature:'keratin-horn'}; model.add(horn);
    const seed = new T.Box3(new T.Vector3(-1,-1,-1),new T.Vector3(1,1,1));
    const head = dinoStudyBounds(T,model,'head',seed);
    expect(head.min.x).toBeLessThanOrEqual(-4); expect(head.max.y).toBeGreaterThanOrEqual(3);
    expect(dinoStudyBounds(T,model,'torso',seed).equals(seed)).toBe(true); expect(seed.max.y).toBe(1);
  });
});
