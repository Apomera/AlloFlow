import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies, ID = 'peacock_mantis_shrimp';
const make = (quality = 'high', options = {}) => S.create(T, ID, { quality, seed: 7, ...options });
function meshes(h) { const out = []; h.root.traverse(m => { if (m.isMesh) out.push(m); }); return out; }
function buffers(h) { return meshes(h).map(m => Object.fromEntries(Object.entries(m.geometry.attributes).map(([k, a]) => [k, [...a.array]]))); }
function pose(h) { const out = []; h.root.traverse(n => out.push([...n.position.toArray(), ...n.quaternion.toArray(), ...n.scale.toArray()])); return out; }
function uniforms(m) {
  const s = { uniforms: {}, vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <emissivemap_fragment>' };
  m.material.onBeforeCompile(s); return s.uniforms;
}
function region(g, range) { const b = new T.Box3(), p = g.attributes.position; for (let i = range.first; i < range.first + range.count; i++) b.expandByPoint(new T.Vector3().fromBufferAttribute(p, i)); return b; }
function actualBounds(h) { h.root.updateMatrixWorld(true); const b = new T.Box3(), p = new T.Vector3(); for (const m of meshes(h)) for (let i = 0; i < m.geometry.attributes.position.count; i++) b.expandByPoint(p.fromBufferAttribute(m.geometry.attributes.position, i).applyMatrix4(m.matrixWorld)); return b; }

describe('Peacock mantis shrimp specimen', () => {
  it('registers a substrate-rooted illustrative adult using a nominal body length', () => {
    expect(S.ids).toContain(ID); expect(S.ids.indexOf(ID)).toBeGreaterThan(S.ids.indexOf('bennetts_feather_star'));
    expect(S.info(ID)).toMatchObject({ group: 'invertebrate', habit: 'bottom', lengthM: .14, depthM: [0, 100], origin: 'base', healthStates: ['healthy'] });
    expect(() => S.createSchool(T, ID, 3)).toThrow();
  });
  for (const quality of ['low', 'high']) {
    it('retains finite complete geometry, real substrate contact and two-draw budgets at ' + quality, () => {
      for (const seed of [7, 23]) {
        const h = make(quality, { seed });
        try {
          const ms = meshes(h), b = actualBounds(h), size = b.getSize(new T.Vector3());
          expect(ms).toHaveLength(2); expect(ms.reduce((n, m) => n + m.geometry.index.count / 3, 0)).toBeLessThanOrEqual(quality === 'high' ? 6000 : 1500);
          expect(b.min.y).toBeCloseTo(0, 9); expect(size.x).toBeGreaterThan(.17); expect(size.x).toBeLessThan(.20); expect(size.y).toBeGreaterThan(.04); expect(size.y).toBeLessThan(.05);
          expect(h.radius).toBeGreaterThan(0); expect(Number.isFinite(h.radius)).toBe(true);
          for (const m of ms) {
            expect(m.userData).toMatchObject({ speciesId: ID, group: 'invertebrate' });
            for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite)).toBe(true);
            expect([...m.geometry.index.array].every(i => i >= 0 && i < m.geometry.attributes.position.count)).toBe(true);
            expect(m.material.emissive.getHex()).toBe(0); expect(m.material.transparent).toBe(false);
          }
        } finally { h.dispose(); }
      }
    });
    it('separates six abdominal plates, three walking pairs and folded smashing clubs at ' + quality, () => {
      const h = make(quality);
      try {
        const g = meshes(h)[0].geometry, d = g.userData.mantisShrimp;
        expect(d.adultSex).toBe('unspecified'); expect(d.nominalBodyLengthM).toBe(.14); expect(d.abdomenSegments).toHaveLength(6); expect(d.walkingFeet).toHaveLength(6); expect(d.raptorialClubs).toHaveLength(2);
        const abdomen = d.abdomenSegments.map(r => region(g, r));
        for (let i = 1; i < abdomen.length; i++) { expect(abdomen[i].getCenter(new T.Vector3()).x).toBeLessThan(abdomen[i - 1].getCenter(new T.Vector3()).x); expect(abdomen[i].max.x).toBeGreaterThan(abdomen[i - 1].min.x); }
        for (const side of [-1, 1]) {
          const feet = d.walkingFeet.filter(p => p[2] * side > 0); expect(feet).toHaveLength(3); expect(new Set(feet.map(p => p[0])).size).toBe(3);
          const club = d.raptorialClubs.find(c => c.shoulder[2] * side > 0); expect(club.foldedHeel[0]).toBeLessThan(club.shoulder[0]); expect(club.foldedHeel[0]).toBeGreaterThan(club.elbow[0]);
          expect(region(g, club).getSize(new T.Vector3()).x).toBeGreaterThan(.02);
        }
        const tail = region(g, d.ranges['ridged-telson']), paddles = region(g, d.ranges['four-uropod-paddles']);
        expect(paddles.getSize(new T.Vector3()).z).toBeGreaterThan(tail.getSize(new T.Vector3()).z * 1.5); expect(tail.max.x).toBeLessThan(abdomen[4].max.x);
        expect(d.ranges['quiet-pleopods'].count).toBeGreaterThan(25); expect(d.ranges['paired-antennal-scales'].count).toBeGreaterThan(50);
      } finally { h.dispose(); }
    });
    it('keeps contrasting shell pigments and the telson outside atlas colour islands at ' + quality, () => {
      const h = make(quality);
      try {
        const ms = meshes(h), g = ms[0].geometry, d = g.userData.mantisShrimp, uv = g.attributes.uv, im = ms[0].material.map.image;
        expect(ms[0].material.map).toBe(ms[1].material.map); expect(im.width).toBe(quality === 'high' ? 256 : 128);
        let green = 0, dark = 0, pale = 0, blue = 0;
        for (let i = 0; i < im.data.length; i += 4) { const [r, v, b] = im.data.slice(i, i + 3); green += v > r * 1.15 && v > b * 1.1; dark += r < 65 && v < 70 && b < 65; pale += r > 170 && v > 160 && b > 120 && r < 240; blue += b > r * 1.6 && b > v; }
        expect(green).toBeGreaterThan(80); expect(dark).toBeGreaterThan(20); expect(pale).toBeGreaterThan(20); expect(blue).toBeGreaterThan(80);
        const telson = d.ranges['ridged-telson'];
        for (let i = telson.first; i < telson.first + telson.count; i++) { expect(uv.getX(i)).toBe(.5); expect(uv.getY(i)).toBe(.5); }
        const whitePixel = (Math.floor(im.height * .5) * im.width + Math.floor(im.width * .5)) * 4; expect([...im.data.slice(whitePixel, whitePixel + 3)]).toEqual([255, 255, 255]);
      } finally { h.dispose(); }
    });
    it('keeps two stalked eyes and separate trifid antennules on four local pivots at ' + quality, () => {
      const h = make(quality);
      try {
        const g = meshes(h)[1].geometry, table = g.userData.batch;
        expect(g.userData.mantisShrimp).toMatchObject({ independentEyePair: true, trifidAntennulePair: true, eyesSubglobular: true });
        expect(table.map(p => p.part)).toEqual(['eye-left', 'antennule-left', 'eye-right', 'antennule-right']); expect(table.map(p => p.slot)).toEqual([1, 2, 3, 4]);
        for (const side of ['left', 'right']) {
          const eye = table.find(p => p.part === 'eye-' + side), ant = table.find(p => p.part === 'antennule-' + side), eyeBox = region(g, eye), antBox = region(g, ant);
          expect(eyeBox.max.y).toBeGreaterThan(.04); expect(eyeBox.getSize(new T.Vector3()).z).toBeGreaterThan(.01); expect(antBox.getSize(new T.Vector3()).x).toBeGreaterThan(.035);
          const parent = h.root.getObjectByName(ID + '-eye-' + side); expect(parent.position.y).toBeLessThan(eyeBox.max.y); expect(parent.isGroup).toBe(true);
        }
      } finally { h.dispose(); }
    });
  }
  it('retains the same seeded anatomy across tiers while varying individuals deterministically', () => {
    const a = make(), b = make(), low = make('low'), other = make('high', { seed: 8 });
    try {
      expect(buffers(a)).toEqual(buffers(b)); expect(buffers(a)).not.toEqual(buffers(other));
      const ad = meshes(a)[0].geometry.userData.mantisShrimp, ld = meshes(low)[0].geometry.userData.mantisShrimp;
      expect(ad.scaleM).toBe(ld.scaleM); expect(ad.walkingFeet).toEqual(ld.walkingFeet); expect(ad.raptorialClubs.map(c => c.foldedHeel)).toEqual(ld.raptorialClubs.map(c => c.foldedHeel));
    } finally { a.dispose(); b.dispose(); low.dispose(); other.dispose(); }
  });
  it('gently turns local sensory appendages without drifting the body or uploading geometry', () => {
    const a = make(), b = make();
    try {
      a.root.position.set(3, -2, 4); a.root.rotation.y = .7; b.root.position.copy(a.root.position); b.root.rotation.copy(a.root.rotation);
      const placement = [...a.root.position.toArray(), ...a.root.quaternion.toArray()], geometry = buffers(a), before = pose(a), versions = meshes(a).map(m => Object.values(m.geometry.attributes).map(a => a.version)), u = uniforms(meshes(a)[1]);
      const firstRig = [...u.reefRig.value]; a.update(.016, 2, { current: { x: 1, z: .4, strength: 1 } }); expect(pose(a)).not.toEqual(before); expect([...u.reefRig.value]).not.toEqual(firstRig);
      const prior = pose(a); a.update(.001, 2.001, { current: { x: 1, z: .4, strength: 1 } }); expect(Math.max(...pose(a).flatMap((p, i) => p.map((v, j) => Math.abs(v - prior[i][j]))))).toBeLessThan(.001);
      expect([...a.root.position.toArray(), ...a.root.quaternion.toArray()]).toEqual(placement); expect(buffers(a)).toEqual(geometry); expect(meshes(a).map(m => Object.values(m.geometry.attributes).map(a => a.version))).toEqual(versions);
      a.update(.01, 4); b.update(4, 4); expect(pose(a)).toEqual(pose(b));
    } finally { a.dispose(); b.dispose(); }
  });
  it('fully freezes sensory pivots, buffers and shader rig in reduced motion inspection', () => {
    const h = make('high', { reducedMotion: true });
    try {
      const before = pose(h), geometry = buffers(h), u = uniforms(meshes(h)[1]), rig = [...u.reefRig.value];
      for (const t of [1, 100, 10000]) h.update(.016, t, { current: { x: 1, z: 1, strength: 1 } });
      expect(pose(h)).toEqual(before); expect(buffers(h)).toEqual(geometry); expect([...u.reefRig.value]).toEqual(rig);
    } finally { h.dispose(); }
  });
  it('shares pigment and relief maps and releases each owned resource exactly once', () => {
    const a = make(), b = make(), ms = meshes(a), textures = new Set(ms.flatMap(m => [m.material.map, m.material.bumpMap]));
    let ng = 0, nm = 0, nt = 0; for (const m of ms) { m.geometry.addEventListener('dispose', () => ng++); m.material.addEventListener('dispose', () => nm++); } for (const t of textures) t.addEventListener('dispose', () => nt++);
    expect(ms[0].material.map).toBe(meshes(b)[0].material.map); expect(ms[0].material.bumpMap).toBe(meshes(b)[0].material.bumpMap);
    a.dispose(); a.dispose(); expect([ng, nm, nt]).toEqual([2, 2, 0]); b.dispose(); b.dispose(); expect(nt).toBe(textures.size); expect(() => a.update(.1, 100)).not.toThrow();
  });
  it('retains both pigmented draws without derivative extensions', () => {
    const h = make('low', { derivatives: false }); try { expect(meshes(h)).toHaveLength(2); for (const m of meshes(h)) { expect(m.material.bumpMap).toBeNull(); expect(m.material.map).toBeTruthy(); } expect(() => h.update(.1, 2)).not.toThrow(); } finally { h.dispose(); }
  });
});
