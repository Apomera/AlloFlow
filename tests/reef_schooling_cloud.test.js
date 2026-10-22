import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 60000 });
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;
const IDS = ['anthias', 'blue_green_chromis', 'bluestripe_snapper', 'bumphead_parrotfish'];
const bodyOf = (s, id) => s.root.getObjectByName(id + '-body');
function centres(s, id) {
  const body = bodyOf(s, id), m = new THREE.Matrix4(), out = [];
  for (let i = 0; i < s.count; i++) { body.getMatrixAt(i, m); out.push(new THREE.Vector3().setFromMatrixPosition(m)); }
  return out;
}
function minGap(points) {
  let gap = Infinity;
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) gap = Math.min(gap, points[i].distanceTo(points[j]));
  return gap;
}
const matrices = s => s.meshes.map(m => Array.from(m.instanceMatrix.array));

describe('coherent irregular reef schooling', () => {
  it('packs a reproducible cloud on both tiers while keeping member variation independent of layout size', () => {
    const a = S.createSchool(THREE, 'anthias', 32, { seed: 31, quality: 'low' });
    const b = S.createSchool(THREE, 'anthias', 32, { seed: 31, quality: 'high' });
    const c = S.createSchool(THREE, 'anthias', 48, { seed: 31, quality: 'low' });
    const d = S.createSchool(THREE, 'anthias', 32, { seed: 32, quality: 'low' });
    try {
      expect(a.graze.members).toEqual(b.graze.members);
      expect(a.graze.members).not.toEqual(d.graze.members);
      expect(Array.from(bodyOf(a, 'anthias').geometry.attributes.reefSchoolBeat.array)).toEqual(Array.from(bodyOf(c, 'anthias').geometry.attributes.reefSchoolBeat.array.slice(0, 32 * 4)));
      const p = a.graze.members.map(v => new THREE.Vector3(v.x, v.y, v.z));
      expect(minGap(p)).toBeGreaterThan(S.info('anthias').lengthM * .8);
      const mean = p.reduce((v, point) => v.add(point), new THREE.Vector3()).multiplyScalar(1 / p.length);
      expect(mean.length()).toBeLessThan(1e-12);
      expect(p.filter(v => v.x > 0).length).toBeGreaterThan(8);
      expect(p.filter(v => v.x < 0).length).toBeGreaterThan(8);
    } finally { a.dispose(); b.dispose(); c.dispose(); d.dispose(); }
  });

  it('keeps dense schools separated throughout bounded collective turns and grazing', () => {
    for (const id of IDS) {
      const L = S.info(id).lengthM, count = S.info(id).schoolSize[1];
      for (const seed of [7, 31]) {
        const s = S.createSchool(THREE, id, count, { seed, quality: 'low' });
        try {
          for (let k = 0; k <= 64; k++) {
            const motion = { speed: L * 1.2, turn: .6, graze: k % 3 === 0 ? 1 : k % 3 === 1 ? .5 : 0 };
            s.update(.7, k * .7, motion);
            expect(minGap(centres(s, id)), id + ' seed ' + seed + ' at ' + k).toBeGreaterThan(L * .48);
          }
        } finally { s.dispose(); }
      }
    }
  });

  it('has smooth per-member positions and headings instead of formation jumps', () => {
    const s = S.createSchool(THREE, 'blue_green_chromis', 60, { seed: 9, quality: 'low' });
    const body = bodyOf(s, 'blue_green_chromis'), m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), scale = new THREE.Vector3(), L = S.info('blue_green_chromis').lengthM;
    const motion = { speed: L * 1.2, turn: .45 };
    try {
      for (const t of [0, 2, 14, 47, 121]) {
        s.update(0, t, motion); const points = centres(s, 'blue_green_chromis'), rotations = [];
        for (let i = 0; i < s.count; i++) { body.getMatrixAt(i, m); m.decompose(p, q, scale); rotations.push(q.clone()); }
        s.update(1 / 60, t + 1 / 60, motion);
        for (let i = 0; i < s.count; i++) {
          body.getMatrixAt(i, m); m.decompose(p, q, scale);
          expect(p.distanceTo(points[i])).toBeLessThan(L * .025);
          expect(q.angleTo(rotations[i])).toBeLessThan(.025);
        }
        expect(rotations.some(r => r.angleTo(rotations[0]) > .01)).toBe(true);
      }
    } finally { s.dispose(); }
  });

  it('returns to exactly the same formation after a long culling gap or different update cadence', () => {
    const a = S.createSchool(THREE, 'bluestripe_snapper', 36, { seed: 11 });
    const b = S.createSchool(THREE, 'bluestripe_snapper', 36, { seed: 11 });
    const motion = { speed: .3, turn: -.65, current: { x: .15, z: -.08, strength: .4 } };
    try {
      for (let i = 0; i < 120; i++) a.update(1 / 30, i / 30, motion);
      a.update(100, 501.7, motion); b.update(1 / 60, 501.7, motion);
      expect(matrices(a)).toEqual(matrices(b));
      a.update(0, 5.2, motion); b.update(9, 5.2, motion);
      expect(matrices(a)).toEqual(matrices(b));
    } finally { a.dispose(); b.dispose(); }
  });

  it('honours reduced motion and preserves the placement root and published grazing stations', () => {
    const s = S.createSchool(THREE, 'bumphead_parrotfish', 30, { seed: 3, reducedMotion: true });
    const initial = matrices(s), members = structuredClone(s.graze.members);
    s.root.position.set(3, -9, 7); s.root.rotation.y = .4;
    try {
      for (const t of [1, 50, 1e6]) s.update(10, t, { speed: 3, turn: 1.2, graze: 1 });
      expect(matrices(s)).toEqual(initial);
      expect(s.root.position.toArray()).toEqual([3, -9, 7]);
      expect(s.root.rotation.y).toBe(.4);
      expect(s.graze.members).toEqual(members);
      expect(s.graze.period).toBe(6);
      expect(s.graze.contact).toBe(.15);
    } finally { s.dispose(); }
  });

  it('keeps all articulated geometry within published culling reach with five instanced draws', () => {
    const vector = new THREE.Vector3(), matrix = new THREE.Matrix4();
    for (const id of IDS) {
      const s = S.createSchool(THREE, id, S.info(id).schoolSize[1], { seed: 27, quality: 'low' });
      try {
        expect(s.meshes).toHaveLength(5);
        const members = structuredClone(s.graze.members);
        for (const t of [0, 1.3, 19.1, 81.7]) {
          s.update(.1, t, { speed: 0, turn: 1.2 }); let reach = 0;
          for (const mesh of s.meshes) {
            expect(mesh.count).toBe(s.count);
            for (let i = 0; i < s.count; i++) {
              mesh.getMatrixAt(i, matrix);
              const a = mesh.geometry.attributes.position;
              for (let k = 0; k < a.count; k++) reach = Math.max(reach, vector.fromBufferAttribute(a, k).applyMatrix4(matrix).length());
            }
          }
          expect(reach).toBeLessThan(s.radius - S.info(id).lengthM * .05);
        }
        expect(s.graze.members).toEqual(members);
      } finally { s.dispose(); }
    }
  });
});
