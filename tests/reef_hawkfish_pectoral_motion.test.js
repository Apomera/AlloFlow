import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), local = {};
new Function('window', readFileSync('stem_lab/reef_3d_species.js', 'utf8'))(local);
function make(quality, options = {}) { return local.Reef3DSpecies.create(T, 'longnose_hawkfish', { quality, seed: 7, ...options }); }
function mesh(h) { let found; h.root.traverse(n => { if (n.isMesh) found = n; }); return found; }
function uniforms(m) {
  const s = { uniforms: {}, vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>' };
  m.material.onBeforeCompile(s); return s.uniforms;
}
// Evaluate the existing shared species shader contract, including the rig.
// The unrigged version is the same current-driven body sway at that instant.
function point(m, index, u, rigged = true) {
  const g = m.geometry, part = g.attributes.reefPart, slot = rigged && u.reefBatch.value ? part.getW(index) : 0;
  const p = slot ? new T.Vector3(part.getX(index), part.getY(index), part.getZ(index)) : new T.Vector3().fromBufferAttribute(g.attributes.position, index);
  const shape = u.reefSwimShape.value, swim = u.reefSwim.value;
  let f = Math.max(0, Math.min(1, (shape.x - p.x) / Math.max(shape.x - shape.y, .0001)));
  f = f * f * (3 - 2 * f); p.z += swim.y * f * f * Math.sin(swim.x - swim.z * p.x);
  if (slot) {
    const r = u.reefRig.value, at = (slot - 1) * 20, x = p.x, y = p.y, z = p.z;
    p.set(r[at] * x + r[at + 1] * y + r[at + 2] * z + r[at + 3], r[at + 4] * x + r[at + 5] * y + r[at + 6] * z + r[at + 7], r[at + 8] * x + r[at + 9] * y + r[at + 10] * z + r[at + 11]);
  }
  return p;
}

describe('Perched hawkfish upper pectoral movement', () => {
  for (const quality of ['low', 'high']) {
    it('fans only the free upper webs while roots and support surfaces remain seated at ' + quality, () => {
      const h = make(quality);
      try {
        const m = mesh(h), g = m.geometry, d = g.userData.longnoseHawkfish, u = uniforms(m), across = quality === 'high' ? 4 : 2;
        const versions = Object.values(g.attributes).map(a => a.version), position = g.attributes.position.array.slice();
        let freeEdgeMotion = 0, rootSlip = 0, asymmetry = 0;
        for (const time of [0, .5, 1.2, 3.7, 11, 1000]) {
          h.update(.016, time, { current: { x: 1, z: .7, strength: 1 } });
          const r = u.reefRig.value;
          asymmetry = Math.max(asymmetry, Math.abs(r[6] + r[26]));
          for (const fin of d.pectorals) {
            for (let j = 0; j < fin.count; j++) {
              const index = fin.first + j, rendered = point(m, index, u), distance = rendered.distanceTo(point(m, index, u, false));
              expect(g.boundingBox.containsPoint(rendered)).toBe(true);
              expect(rendered.distanceTo(g.boundingSphere.center)).toBeLessThanOrEqual(g.boundingSphere.radius);
              if (j % (across + 1) === 0) rootSlip = Math.max(rootSlip, distance);
              else freeEdgeMotion = Math.max(freeEdgeMotion, distance);
            }
          }
        }
        // The existing nonlinear body sway and rotated fin normals share the
        // root to within a few micrometres; free edges visibly fan by millimetres.
        expect(rootSlip).toBeLessThan(.000003);
        expect(freeEdgeMotion).toBeGreaterThan(.0004);
        expect(freeEdgeMotion).toBeLessThan(.004);
        expect(asymmetry).toBeGreaterThan(.01);
        for (let i = 0; i < g.attributes.position.count; i++) {
          const onWeb = d.pectorals.some(p => i >= p.first && i < p.first + p.count);
          expect(g.attributes.reefPart.getW(i) > 0).toBe(onWeb);
        }
        expect(g.attributes.position.array).toEqual(position);
        expect(Object.values(g.attributes).map(a => a.version)).toEqual(versions);
      } finally { h.dispose(); }
    });

    it('uses continuous absolute-time poses without drift and retains exact reduced-motion rest at ' + quality, () => {
      const a = make(quality), b = make(quality), still = make(quality, { reducedMotion: true });
      try {
        const ua = uniforms(mesh(a)), ub = uniforms(mesh(b)), us = uniforms(mesh(still));
        a.update(.016, 2); const before = Array.from(ua.reefRig.value);
        a.update(.001, 2.001);
        expect(Math.max(...ua.reefRig.value.map((v, i) => Math.abs(v - before[i])))).toBeLessThan(.0003);
        a.update(.016, 1000); b.update(1000, 1000);
        expect(ua.reefRig.value).toEqual(ub.reefRig.value);
        const rest = mesh(still).geometry.attributes.position.array.slice(), swim = us.reefSwim.value.toArray();
        for (const t of [1, 100, 10000]) still.update(.016, t, { current: { x: 1, z: 1, strength: 1 } });
        expect(us.reefBatch.value).toBe(0);
        expect(mesh(still).geometry.attributes.position.array).toEqual(rest);
        expect(us.reefSwim.value.toArray()).toEqual(swim);
      } finally { a.dispose(); b.dispose(); still.dispose(); }
    });
  }
});
