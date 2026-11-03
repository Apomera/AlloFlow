import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const current = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
function factory(source, visible = true) {
  const start = source.indexOf('function addAccentCone('), end = source.indexOf('function addKeratinCone(', start);
  if (start < 0 || end < 0) throw Error('Accent cone construction missing');
  const material = new T.MeshStandardMaterial(), model = new T.Group();
  return { material, model, cone: new Function('THREE', 'props', 'anatomyAccentMat', 'model', source.slice(start, end) + '\nreturn addAccentCone;')(T, { showBody: visible }, material, model) };
}
function legacyGeometry(base, tip, radius) { return new T.ConeGeometry(radius, base.distanceTo(tip), 10); }
function tuple(g, i) { return ['position', 'normal', 'uv'].flatMap(name => Array.from(g.attributes[name].array.slice(i * g.attributes[name].itemSize, (i + 1) * g.attributes[name].itemSize))).join('|'); }
function edgeError(g, radius) {
  const n = g.parameters.radialSegments, p = g.attributes.position; let maximum = 0;
  for (let i = 0; i < n; i++) {
    const a = new T.Vector3().fromBufferAttribute(p, n + 1 + i), b = new T.Vector3().fromBufferAttribute(p, n + 2 + i);
    const mid = a.add(b).multiplyScalar(.5); maximum = Math.max(maximum, radius - Math.hypot(mid.x, mid.z));
  }
  return maximum;
}
describe('Oviraptor-style display crest tessellation', () => {
  for (const scale of [.03, 1, 12]) {
    it('preserves the exact default cone at scale ' + scale, () => {
      const f = factory(current), base = new T.Vector3(.1, .2, -.3).multiplyScalar(scale), tip = base.clone().add(new T.Vector3(.2, 1.4, .1).multiplyScalar(scale)), radius = .19 * scale;
      const mesh = f.cone(base, tip, radius), old = legacyGeometry(base, tip, radius);
      try {
        for (const name of ['position', 'normal', 'uv']) expect(mesh.geometry.attributes[name].array).toEqual(old.attributes[name].array);
        expect(mesh.geometry.index.array).toEqual(old.index.array); expect(mesh.geometry.parameters.radialSegments).toBe(10);
        expect(mesh.material).toBe(f.material); expect(mesh.castShadow).toBe(true); expect(f.model.children).toEqual([mesh]);
      } finally { old.dispose(); mesh.geometry.dispose(); f.material.dispose(); }
    });
    it('retains every legacy ring sample and authored anchor while reducing outline error at scale ' + scale, () => {
      const f = factory(current), base = new T.Vector3(.1, .2, -.3).multiplyScalar(scale), tip = base.clone().add(new T.Vector3(.2, 1.4, .1).multiplyScalar(scale)), radius = .19 * scale;
      const mesh = f.cone(base, tip, radius, null, 40), g = mesh.geometry, old = legacyGeometry(base, tip, radius);
      try {
        expect(g.parameters.radius).toBe(radius); expect(g.parameters.height).toBe(old.parameters.height); expect(g.parameters.radialSegments).toBe(40);
        const samples = new Set(Array.from({ length: g.attributes.position.count }, (_, i) => tuple(g, i)));
        for (let i = 0; i < old.attributes.position.count; i++) expect(samples.has(tuple(old, i))).toBe(true);
        expect(edgeError(g, radius)).toBeLessThan(edgeError(old, radius) * .1);
        mesh.scale.z = .46; mesh.updateMatrixWorld(true);
        expect(mesh.localToWorld(new T.Vector3(0, -g.parameters.height / 2, 0)).distanceTo(base)).toBeLessThan(scale * 1e-6);
        expect(mesh.localToWorld(new T.Vector3(0, g.parameters.height / 2, 0)).distanceTo(tip)).toBeLessThan(scale * 1e-6);
        for (let i = 0; i < g.attributes.normal.count; i++) expect(new T.Vector3().fromBufferAttribute(g.attributes.normal, i).length()).toBeCloseTo(1, 6);
        expect([...g.attributes.position.array, ...g.attributes.normal.array, ...g.attributes.uv.array].every(Number.isFinite)).toBe(true);
        expect(mesh.material).toBe(f.material); expect(mesh.castShadow).toBe(true);
      } finally { old.dispose(); g.dispose(); f.material.dispose(); }
    });
  }
  it('retains the hidden-body and zero-length guards', () => {
    for (const visible of [false, true]) {
      const f = factory(current, visible), base = new T.Vector3();
      try { expect(f.cone(base, visible ? base : new T.Vector3(0, 1, 0), .1, null, 40)).toBeNull(); expect(f.model.children).toEqual([]); }
      finally { f.material.dispose(); }
    }
  });
  it('keeps unrecognized sampling hints on the established default', () => {
    const f = factory(current), mesh = f.cone(new T.Vector3(), new T.Vector3(0, 1, 0), .1, null, 24);
    try { expect(mesh.geometry.parameters.radialSegments).toBe(10); } finally { mesh.geometry.dispose(); f.material.dispose(); }
  });
});
