import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync('stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;
function members(s, id) {
  const body = s.root.getObjectByName(id + '-body'), matrix = new THREE.Matrix4(), out = [];
  for (let i = 0; i < s.count; i++) {
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), scale = new THREE.Vector3();
    body.getMatrixAt(i, matrix); matrix.decompose(p, q, scale); out.push({ p, q });
  }
  return out;
}
function spread(points) {
  const mean = points.reduce((out, p) => out.add(p), new THREE.Vector3()).multiplyScalar(1 / points.length);
  return points.reduce((out, p) => { out.x += (p.x - mean.x) ** 2; out.cross += (p.y - mean.y) ** 2 + (p.z - mean.z) ** 2; return out; }, { x: 0, cross: 0 });
}

describe('reef school streamline coordination', () => {
  it('gently lengthens a cruising school and narrows its cross-section without changing members or draws', () => {
    for (const id of ['anthias', 'blue_green_chromis', 'bluestripe_snapper']) {
      const school = S.createSchool(THREE, id, 48, { seed: 31, quality: 'low' }), L = S.info(id).lengthM;
      try {
        const stations = structuredClone(school.graze.members);
        school.update(0, 0, { speed: 0, turn: 0 }); const slow = spread(members(school, id).map(m => m.p));
        school.update(0, 0, { speed: L * 2, turn: 0 }); const cruise = spread(members(school, id).map(m => m.p));
        expect(cruise.x / slow.x).toBeGreaterThan(1.1);
        expect(cruise.x / slow.x).toBeLessThan(1.25);
        expect(cruise.cross / slow.cross).toBeLessThan(.98);
        expect(cruise.cross / slow.cross).toBeGreaterThan(.85);
        expect(school.graze.members).toEqual(stations);
        expect(school.meshes).toHaveLength(5);
      } finally { school.dispose(); }
    }
  });

  it('settles to the same feeding positions at every swimming effort', () => {
    const id = 'bumphead_parrotfish', school = S.createSchool(THREE, id, 30, { seed: 7, quality: 'low' }), L = S.info(id).lengthM;
    try {
      for (const time of [0, .9, 4.1, 17]) {
        school.update(0, time, { speed: 0, graze: 1, turn: 0 }); const slow = members(school, id);
        school.update(0, time, { speed: L * 2, graze: 1, turn: 0 }); const fast = members(school, id);
        for (let i = 0; i < school.count; i++) expect(fast[i].p.distanceTo(slow[i].p)).toBeLessThan(1e-7);
      }
    } finally { school.dispose(); }
  });

  it('curves continuously through straight swimming and reverses without a formation or heading snap', () => {
    const id = 'bluestripe_snapper', school = S.createSchool(THREE, id, 60, { seed: 12, quality: 'low' }), L = S.info(id).lengthM;
    try {
      let previous;
      for (let k = 0; k <= 48; k++) {
        school.update(0, 8.3, { speed: L * 1.3, turn: -1.2 + k * .05 });
        const current = members(school, id);
        if (previous) for (let i = 0; i < school.count; i++) {
          expect(current[i].p.distanceTo(previous[i].p)).toBeLessThan(L * .2);
          expect(current[i].q.angleTo(previous[i].q)).toBeLessThan(.08);
        }
        previous = current;
      }
      school.update(0, 8.3, { speed: L * 1.3, turn: -1e-8 }); const left = members(school, id);
      school.update(0, 8.3, { speed: L * 1.3, turn: 1e-8 }); const right = members(school, id);
      for (let i = 0; i < school.count; i++) {
        expect(right[i].p.distanceTo(left[i].p)).toBeLessThan(L * 1e-6);
        expect(right[i].q.angleTo(left[i].q)).toBeLessThan(.001);
      }
    } finally { school.dispose(); }
  });

  it('keeps fast-turning articulated fish inside the existing culling reach', () => {
    const p = new THREE.Vector3(), matrix = new THREE.Matrix4();
    for (const id of ['anthias', 'bluestripe_snapper']) {
      const school = S.createSchool(THREE, id, S.info(id).schoolSize[1], { seed: 27, quality: 'low' }), L = S.info(id).lengthM;
      try {
        for (const time of [0, 3, 19]) for (const turn of [-1.2, 1.2]) {
          school.update(.1, time, { speed: L * 2, turn });
          let furthest = 0;
          for (const mesh of school.meshes) for (let i = 0; i < school.count; i++) {
            mesh.getMatrixAt(i, matrix);
            const vertices = mesh.geometry.attributes.position;
            for (let k = 0; k < vertices.count; k++) furthest = Math.max(furthest, p.fromBufferAttribute(vertices, k).applyMatrix4(matrix).length());
          }
          expect(furthest).toBeLessThan(school.radius - L * .05);
        }
      } finally { school.dispose(); }
    }
  });
});
