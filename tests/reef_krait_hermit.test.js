import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies, IDS = ['banded_sea_krait', 'white_spotted_hermit_crab'];
const make = (id, quality = 'high', extra = {}) => S.create(T, id, { quality, seed: 7, ...extra });
function meshes(h) { const out = []; h.root.traverse(m => { if (m.isMesh) out.push(m); }); return out; }
function positions(h) { return meshes(h).map(m => [...m.geometry.attributes.position.array]); }
function matrices(h) { h.root.updateMatrixWorld(true); const out = []; h.root.traverse(m => out.push([...m.matrixWorld.elements])); return out; }
function span(p, first, count, axis) { let lo = Infinity, hi = -Infinity; for (let j = first; j < first + count; j++) { lo = Math.min(lo, p.array[j * 3 + axis]); hi = Math.max(hi, p.array[j * 3 + axis]); } return hi - lo; }

describe('Banded sea krait and white-spotted hermit crab specimens', () => {
  it('registers distinct reptile and invertebrate specimens with representative size conventions', () => {
    expect(S.info(IDS[0])).toMatchObject({ group: 'reptile', habit: 'solitary', lengthM: 1.2, depthM: [0, 60], origin: 'centre', healthStates: ['healthy'] });
    expect(S.info(IDS[1])).toMatchObject({ group: 'invertebrate', habit: 'bottom', lengthM: .2, depthM: [0, 50], origin: 'base', healthStates: ['healthy'] });
    for (const id of IDS) { expect(S.ids.filter(x => x === id)).toHaveLength(1); expect(S.info(id).portrait.dir.every(Number.isFinite)).toBe(true); expect(() => S.createSchool(T, id, 3)).toThrow(); }
  });
  for (const id of IDS) for (const quality of ['low', 'high']) {
    it(id + ' has finite, nonemissive anatomy inside unchanged triangle/draw budgets at ' + quality, () => {
      const h = make(id, quality); try { const ms = meshes(h); expect(ms).toHaveLength(id === IDS[0] ? 2 : 3); expect(ms.reduce((n, m) => n + m.geometry.index.count / 3, 0)).toBeLessThanOrEqual(quality === 'low' ? 1500 : 6000); expect(h.radius / S.info(id).lengthM).toBeGreaterThan(.25); expect(h.radius / S.info(id).lengthM).toBeLessThan(1.6);
        expect(h.root.userData).toEqual({ speciesId: id, group: S.info(id).group });
        for (const m of ms) { for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite), m.name).toBe(true); expect([...m.geometry.index.array].every(i => i >= 0 && i < m.geometry.attributes.position.count)).toBe(true); expect(m.material.transparent).toBe(false); expect(m.material.emissive.getHex()).toBe(0); }
      } finally { h.dispose(); }
    });
    it(id + ' animates locally and stays inside conservative bounds at ' + quality, () => {
      const h = make(id, quality); try { h.root.position.set(8, -4, 11); h.root.rotation.set(.1, .7, -.1); const original = positions(h), transforms = matrices(h); let maximum = 0;
        for (const t of [0, 1.6, 10, 10000]) { h.update(.016, t, { speed: 1.6 }); expect(matrices(h)).toEqual(transforms); if (id === IDS[1]) expect(positions(h)[0]).toEqual(original[0]);
          for (const [mi, m] of meshes(h).entries()) { const p = m.geometry.attributes.position; for (let j = 0; j < p.count; j++) { const v = new T.Vector3().fromBufferAttribute(p, j); expect(m.geometry.boundingBox.containsPoint(v), m.name).toBe(true); expect(v.distanceToSquared(m.geometry.boundingSphere.center)).toBeLessThanOrEqual(m.geometry.boundingSphere.radius ** 2 * (1 + 1e-7)); for (let a = 0; a < 3; a++) maximum = Math.max(maximum, Math.abs(p.array[j * 3 + a] - original[mi][j * 3 + a])); } }
        } expect(maximum).toBeGreaterThan(.0001); expect(maximum).toBeLessThan(id === IDS[0] ? .031 : .0035);
      } finally { h.dispose(); }
    });
  }
  for (const id of IDS) {
    it(id + ' is seeded and time-based with continuous motion instead of cumulative drift', () => {
      const a = make(id), b = make(id), other = make(id, 'high', { seed: 8 }); try { expect(positions(a)).toEqual(positions(b)); expect(positions(a)).not.toEqual(positions(other)); a.update(.016, 3); const before = positions(a); a.update(.001, 3.001); const after = positions(a); let delta = 0; for (let m = 0; m < before.length; m++) for (let j = 0; j < before[m].length; j++) delta = Math.max(delta, Math.abs(after[m][j] - before[m][j])); expect(delta).toBeLessThan(.00004); a.update(.01, 7); b.update(7, 7); expect(positions(a)).toEqual(positions(b)); } finally { a.dispose(); b.dispose(); other.dispose(); }
    });
    it(id + ' freezes with reduced motion and retains geometry/color on derivative-free devices', () => {
      const h = make(id, 'low', { reducedMotion: true, derivatives: false }); try { const before = positions(h), transforms = matrices(h); for (const t of [1, 20, 10000]) h.update(.016, t); expect(positions(h)).toEqual(before); expect(matrices(h)).toEqual(transforms); for (const m of meshes(h)) { expect(m.material.bumpMap).toBeNull(); expect(m.geometry.attributes.color).toBeTruthy(); } } finally { h.dispose(); }
    });
    it(id + ' disposes geometry/material exactly once and releases shared textures after the last handle', () => {
      const a = make(id), b = make(id), ms = meshes(a), maps = new Set(ms.flatMap(m => [m.material.map, m.material.bumpMap]).filter(Boolean)); let ng = 0, nm = 0, nt = 0;
      for (const m of ms) { m.geometry.addEventListener('dispose', () => ng++); m.material.addEventListener('dispose', () => nm++); } for (const map of maps) map.addEventListener('dispose', () => nt++); expect(ms[0].material.bumpMap).toBe(meshes(b)[0].material.bumpMap); a.dispose(); a.dispose(); expect([ng, nm, nt]).toEqual([ms.length, ms.length, 0]); b.dispose(); b.dispose(); expect(nt).toBe(maps.size); expect(() => a.update(.1, 4)).not.toThrow();
    });
  }
  it('gives the krait a small yellow-lipped head and a vertical paddle, without fins', () => {
    const h = make(IDS[0]); try { const [body, head] = meshes(h), data = body.geometry.userData.bandedSeaKrait, p = body.geometry.attributes.position, headRange = head.geometry.userData.bandedSeaKrait.ranges.head; expect(data).toMatchObject({ nominalTotalLengthM: 1.2, verticalPaddleTail: true });
      const ring = Math.round((data.rings - 1) * .88), first = ring * data.sides; expect(span(p, first, data.sides, 1) / span(p, first, data.sides, 2)).toBeGreaterThan(5); expect(span(head.geometry.attributes.position, headRange.first, headRange.count, 0)).toBeLessThan(.09); expect(meshes(h).map(m => m.name).join(' ')).not.toMatch(/dorsal|fin-/);
      const centres = []; for (let r = 0; r < data.rings; r++) { const v = new T.Vector3(); for (let s = 0; s < data.sides - 1; s++) v.add(new T.Vector3().fromBufferAttribute(p, r * data.sides + s)); centres.push(v.divideScalar(data.sides - 1)); }
      const scale = centres[0].x / .53, arc = centres.slice(1).reduce((n, v, i) => n + v.distanceTo(centres[i]), 0) + .071 * scale;
      expect(arc / scale).toBeGreaterThan(1.19); expect(arc / scale).toBeLessThan(1.21); expect(Math.max(...centres.map(v => v.y)) - Math.min(...centres.map(v => v.y))).toBeGreaterThan(.05 * scale);
      const col = head.geometry.attributes.color; let yellow = 0; for (let j = 0; j < col.count; j++) if (col.getX(j) > .25 && col.getY(j) > .15 && col.getZ(j) < col.getY(j) * .5) yellow++; expect(yellow / col.count).toBeGreaterThan(.25);
    } finally { h.dispose(); }
  });
  it('paints encircling krait bands, including across the belly', () => {
    const h = make(IDS[0]); try { const image = meshes(h)[0].material.map.image; for (const yf of [.02, .25, .5, .75]) { const y = Math.floor(image.height * yf); let dark = 0, pale = 0, transitions = 0, prev = false; for (let x = 0; x < image.width; x++) { const at = (y * image.width + x) * 4, isDark = image.data[at] < 65 && image.data[at + 1] < 75; if (isDark) dark++; else pale++; if (x && isDark !== prev) transitions++; prev = isDark; } expect(dark / image.width).toBeGreaterThan(.3); expect(pale / image.width).toBeGreaterThan(.4); expect(transitions).toBeGreaterThan(55); } } finally { h.dispose(); }
  });
  it('gives the hermit four exposed walking legs and a larger left claw with separated fingers', () => {
    const h = make(IDS[1]); try { const mesh = meshes(h)[1], data = mesh.geometry.userData.whiteSpottedHermitCrab, p = mesh.geometry.attributes.position; expect(data.walkingLegCount).toBe(4); const walk = data.limbs.filter(l => l.role === 'walking'); expect(walk).toHaveLength(4); const left = data.limbs.find(l => l.name === 'left-cheliped'), right = data.limbs.find(l => l.name === 'right-cheliped'); expect(span(p, left.first, left.count, 1)).toBeGreaterThan(span(p, right.first, right.count, 1) * 1.15); expect(data.limbs.filter(l => /finger/.test(l.name))).toHaveLength(4); expect(walk.every(l => l.tip[1] < .004)).toBe(true); expect(meshes(h)[2].geometry.userData.whiteSpottedHermitCrab.hairCount).toBeGreaterThan(150); } finally { h.dispose(); }
  });
  it('leaves the borrowed shell aperture physically open rather than filling it with a painted cap', () => {
    const h = make(IDS[1]); try { const shell = meshes(h)[0]; expect(shell.geometry.userData.whiteSpottedHermitCrab).toMatchObject({ borrowedShell: true, openAperture: true }); shell.updateMatrixWorld(true); const box = new T.Box3().setFromBufferAttribute(shell.geometry.attributes.position), scale = box.getSize(new T.Vector3()).x / .099;
      const ray = new T.Raycaster(new T.Vector3(.08 * scale, .045 * scale, 0), new T.Vector3(-1, 0, 0)), hits = ray.intersectObject(shell); expect(hits.length).toBeGreaterThan(0); expect(hits[0].distance).toBeGreaterThan(.10 * scale);
    } finally { h.dispose(); }
  });
  it('uses black-rimmed white spots over a red-brown surface', () => {
    const h = make(IDS[1]); try { const mesh = meshes(h)[1], image = mesh.material.map.image; let white = 0, red = 0, dark = 0, count = 0; for (let y = 0; y < image.height * .8; y++) for (let x = 0; x < image.width; x++) { const a = (y * image.width + x) * 4; count++; if (image.data[a] > 180 && image.data[a + 1] > 170) white++; if (image.data[a] > image.data[a + 1] * 1.5) red++; if (image.data[a] < 75 && image.data[a + 1] < 55) dark++; } expect(white / count).toBeGreaterThan(.025); expect(red / count).toBeGreaterThan(.6); expect(dark / count).toBeGreaterThan(.05);
      const cap = mesh.geometry.userData.whiteSpottedHermitCrab.carapace, uv = mesh.geometry.attributes.uv, u = [], v = []; for (let j = cap.first; j < cap.first + cap.count; j++) { u.push(uv.getX(j)); v.push(uv.getY(j)); } expect(Math.max(...u) - Math.min(...u)).toBeGreaterThan(.7); expect(Math.max(...v)).toBeLessThanOrEqual(.81); expect(Math.max(...v) - Math.min(...v)).toBeGreaterThan(.7); expect(mesh.material.bumpMap).toBeTruthy();
    } finally { h.dispose(); }
  });
  it('keeps sensory roots and the shell fixed while antenna tips sweep gently', () => {
    const h = make(IDS[1]); try { const [, , fine] = meshes(h), g = fine.geometry, base = [...g.attributes.position.array], shell = positions(h)[0]; h.update(.016, 3); expect(positions(h)[0]).toEqual(shell); for (const s of g.userData.whiteSpottedHermitCrab.sensory) for (let j = 0; j < s.sides; j++) { const at = (s.first + j) * 3; expect([...g.attributes.position.array.slice(at, at + 3)]).toEqual(base.slice(at, at + 3)); } } finally { h.dispose(); }
  });
});
