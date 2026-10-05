import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { restoreCLSquidFinReference } from './helpers/cephalopod_squid_fin_reference.js';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8');
function factory(text) {
  const start = text.indexOf('function createCLHuntAnimal('), end = text.indexOf('// Compact, individually owned prey rig.', start);
  if (start < 0 || end <= start) throw Error('Actual animal factory is required');
  return new Function('T', 'species', 'Math', text.slice(start, end) + ';return createCLHuntAnimal(T,species);');
}
const build = factory(source), reference = factory(restoreCLSquidFinReference(source));
const noRandom = Object.assign(Object.create(Math), { random() { throw Error('Fin motion consumed dive RNG'); } });
const allocated = [], state = extra => ({ moving: true, jet: false, strike: 0, camo: 0, substrate: 'sand', reducedMotion: false, ...extra });
function rig(make = build, id = 'humboldtSquid') { const a = make(THREE, { id, bodyColor: 0xbc6048 }, noRandom); allocated.push(a); return a; }
const fins = a => [-1, 1].map(side => a.root.getObjectByName('cl-fin-' + side));
const pose = a => fins(a).map(f => ({ positions: Array.from(f.geometry.attributes.position.array), normals: Array.from(f.geometry.attributes.normal.array) }));
function meshes(a) { const list = []; a.root.traverse(o => { if (o.isMesh) list.push(o); }); return list; }
function owned(a) { return meshes(a).map(o => [o, o.geometry, o.material, Object.values(o.geometry.attributes).map(v => v.array), o.geometry.index?.array, o.instanceMatrix?.array]); }
function sameOwned(a, initial) {
  expect(meshes(a)).toEqual(initial.map(row => row[0]));
  for (const [o, g, m, arrays, index, instances] of initial) {
    expect(o.geometry).toBe(g); expect(o.material).toBe(m);
    Object.values(g.attributes).forEach((v, i) => expect(v.array).toBe(arrays[i]));
    expect(g.index?.array).toBe(index); expect(o.instanceMatrix?.array).toBe(instances);
  }
}
function checkRenderedNormals(fin) {
  const g = fin.geometry, p = g.attributes.position, n = g.attributes.normal, incident = new Set(), face = new THREE.Vector3();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3(), normal = new THREE.Vector3();
  for (let at = 0; at < g.index.count; at += 3) {
    const ids = [0, 1, 2].map(i => g.index.getX(at + i));
    a.fromBufferAttribute(p, ids[0]); b.fromBufferAttribute(p, ids[1]); c.fromBufferAttribute(p, ids[2]);
    face.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
    // The original width envelope collapses at its two endpoints. Only actual
    // nondegenerate rendered faces require corresponding unit vertex normals.
    if (face.lengthSq() < 1e-16) continue;
    face.normalize();
    for (const id of ids) { incident.add(id); normal.fromBufferAttribute(n, id); expect(normal.dot(face), 'Outward normal on a rendered fin face').toBeGreaterThan(0); }
  }
  expect(incident.size).toBeGreaterThan(150);
  for (let i = 0; i < n.count; i++) {
    normal.fromBufferAttribute(n, i); expect(normal.toArray().every(Number.isFinite)).toBe(true);
    if (incident.has(i)) expect(normal.length()).toBeCloseTo(1, 5);
    else { expect(i < 6 || i >= 28 * 6, 'Only original collapsed endpoint vertices may lack a rendered face').toBe(true); expect(normal.length()).toBeLessThanOrEqual(1.00001); }
  }
}
function record(a, excludeFins = false) {
  return meshes(a).filter(o => !excludeFins || !o.name.startsWith('cl-fin-')).map(o => ({
    name: o.name, type: o.type, position: o.position.toArray(), quaternion: o.quaternion.toArray(), scale: o.scale.toArray(),
    attributes: Object.fromEntries(Object.entries(o.geometry.attributes).map(([name, v]) => [name, Array.from(v.array)])),
    index: o.geometry.index ? Array.from(o.geometry.index.array) : null, instances: o.instanceMatrix ? Array.from(o.instanceMatrix.array) : null,
    material: [o.material.type, o.material.color.toArray(), o.material.roughness, o.material.metalness, o.material.side, o.material.opacity, o.material.transparent],
  }));
}
afterEach(() => {
  for (const a of allocated.splice(0)) { const resources = new Set(); meshes(a).forEach(o => { resources.add(o.geometry); resources.add(o.material); }); resources.forEach(r => r.dispose()); }
});

describe('Humboldt squid attached rolling fins', () => {
  it('rolls the live membrane without stretching it, opening its seam or snapping through repeated jet reversals', () => {
    const a = rig(), old = rig(reference), initial = owned(a);
    for (const animal of [a, old]) { animal.root.position.set(12, -4, 7); animal.root.rotation.set(.28, 1.2, -.31, 'YXZ'); animal.root.scale.set(1.3, .8, 1.1); }
    // Construction uses the original reduced-motion still pose. Begin in live
    // motion before measuring continuous jet transitions, as the existing fin
    // tests do; switching between still and animated silhouettes is deliberate.
    for (const animal of [a, old]) animal.update(10000, 0, state());
    let previous = pose(a), maxStep = 0, lateralChange = 0;
    for (let frame = 0; frame < 360; frame++) {
      const settings = state({ jet: Math.floor(frame / 45) % 2 === 1 }), time = 10000 + frame / 60;
      a.update(time, 1 / 60, settings); old.update(time, 1 / 60, settings);
      for (let side = 0; side < 2; side++) {
        const fin = fins(a)[side], p = fin.geometry.attributes.position, before = fins(old)[side].geometry.attributes.position;
        expect(p.count).toBe(174); expect(fin.geometry.index.count / 3).toBe(280); expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
        for (let row = 0; row <= 28; row++) {
          const root = row * 6;
          expect([p.getX(root), p.getY(root), p.getZ(root)], 'Actual breathing mantle seam remains exact').toEqual([before.getX(root), before.getY(root), before.getZ(root)]);
          for (let span = 0; span <= 5; span++) {
            const i = root + span;
            expect(p.getZ(i), 'Longitudinal attachment and sweep remain exact').toBe(before.getZ(i));
            const distance = Math.hypot(p.getX(i) - p.getX(root), p.getY(i) - p.getY(root));
            const oldDistance = Math.hypot(before.getX(i) - before.getX(root), before.getY(i) - before.getY(root));
            expect(Math.abs(distance - oldDistance), 'Rolling must preserve each membrane span length').toBeLessThan(5e-7);
            lateralChange = Math.max(lateralChange, Math.abs(p.getX(i) - before.getX(i)));
            const at = i * 3; maxStep = Math.max(maxStep, Math.hypot(p.array[at] - previous[side].positions[at], p.array[at + 1] - previous[side].positions[at + 1], p.array[at + 2] - previous[side].positions[at + 2]));
          }
        }
        if (frame % 45 === 0 || frame % 45 === 44) checkRenderedNormals(fin);
      }
      previous = pose(a);
    }
    expect(lateralChange, 'The live stroke must include visible lateral roll instead of height-only flex').toBeGreaterThan(.008);
    expect(maxStep, 'Starting and releasing Jet must remain a continuous stroke').toBeLessThan(.035);
    sameOwned(a, initial); expect(initial).toHaveLength(25); expect(new Set(initial.map(row => row[2])).size).toBe(8);
  }, 600000);

  it('preserves original reduced-motion fins and freezes every existing buffer when simulation time stops', () => {
    const a = rig(), old = rig(reference), initial = owned(a);
    for (let frame = 0; frame < 35; frame++) { a.update(frame / 60, 1 / 60, state({ jet: true })); old.update(frame / 60, 1 / 60, state({ jet: true })); }
    const frozen = pose(a);
    for (const jet of [false, true, false, true]) { a.update(90000, 0, state({ jet })); expect(pose(a)).toEqual(frozen); }
    for (const jet of [false, true, false]) {
      a.update(90000, .05, state({ reducedMotion: true, jet })); old.update(90000, .05, state({ reducedMotion: true, jet }));
      expect(pose(a), 'Original reduced-motion silhouette and normals remain exact').toEqual(pose(old));
    }
    sameOwned(a, initial);
  });

  it('preserves Humboldt feeding anatomy and all eleven other species across swimming and strike poses', () => {
    const ids = ['humboldtSquid', 'commonOcto', 'blueRinged', 'mimicOcto', 'giantPacific', 'caribReef', 'coconutOcto', 'cuttlefish', 'bobtailSquid', 'dumboOcto', 'vampireSquid', 'nautilus'];
    for (const id of ids) {
      const a = rig(build, id), old = rig(reference, id);
      for (let frame = 0; frame < 4; frame++) {
        const settings = state({ jet: frame === 1, strike: frame === 2 ? .7 : 0, strikeAim: frame === 2 ? new THREE.Vector3(.8, .3, 1.6) : null, reducedMotion: frame === 3 });
        a.update(2 + frame * .05, .05, settings); old.update(2 + frame * .05, .05, settings); a.tint(); old.tint();
        expect(record(a, id === 'humboldtSquid'), id + ' anatomy outside the accepted squid fins').toEqual(record(old, id === 'humboldtSquid'));
      }
    }
  }, 600000);
});
