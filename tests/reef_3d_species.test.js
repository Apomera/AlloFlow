import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

// Procedural model and texture builds run several seconds on a busy machine.
vi.setConfig({ testTimeout: 30000 });

// Real three r128 loaded into a fake window, as in tests/reef_3d_engine.test.js.
// REEF3D_SPECIES_SOURCE lets a mutation check point the suite at a scratch copy.
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const SOURCE = readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8');

const EXPECTED_IDS = {
  fish: ['clownfish', 'blue_tang', 'parrotfish', 'bumphead_parrotfish', 'moorish_idol', 'threadfin_butterflyfish', 'emperor_angelfish', 'anthias', 'blue_green_chromis', 'lionfish', 'peacock_grouper',
    'humphead_wrasse', 'cleaner_wrasse', 'clown_triggerfish', 'porcupinefish', 'yellow_boxfish', 'giant_moray', 'whitetip_reef_shark', 'bluespotted_stingray', 'bluestripe_snapper', 'oriental_sweetlips', 'reef_manta'],
  reptile: ['green_turtle', 'hawksbill_turtle'],
  invertebrate: ['magnificent_anemone', 'giant_clam', 'crown_of_thorns', 'blue_sea_star', 'long_spined_urchin', 'nudibranch', 'cleaner_shrimp', 'christmas_tree_worm', 'day_octopus', 'sea_cucumber', 'sea_fan', 'barrel_sponge', 'soft_coral'],
  coral: ['brain_coral', 'staghorn_coral', 'table_coral', 'mushroom_coral', 'boulder_coral', 'cauliflower_coral', 'foliose_coral'],
  structure: ['reef_star', 'reef_ball', 'coral_tree_nursery']
};
const ALL = Object.values(EXPECTED_IDS).flat();
const COLONY = new Set([...EXPECTED_IDS.coral, ...EXPECTED_IDS.structure]);
// Budgets in triangles per organism: [low, high]. School members are per fish.
const BUDGET = { animal: [1500, 6000], colony: [4000, 12000], member: [400, 1500] };
// Corals, sponges and frames do not move; everything else must animate.
const STATIC = ['barrel_sponge', 'brain_coral', 'staghorn_coral', 'table_coral', 'mushroom_coral', 'boulder_coral', 'cauliflower_coral', 'foliose_coral', 'reef_star', 'reef_ball'];

function load() {
  const local = {};
  Object.defineProperty(local, 'THREE', { get() { throw new Error('Reef3DSpecies read a global THREE'); } });
  new Function('window', SOURCE)(local);
  return local;
}
// A load failure (such as reading a global THREE) fails a named test, not the import.
let S = null, loadError = null;
try { S = load().Reef3DSpecies; } catch (error) { loadError = error; }
const SLOW = 300000;

function meshes(root) { const out = []; root.traverse((o) => { if (o.isMesh) out.push(o); }); return out; }
function tris(root) {
  return meshes(root).reduce((n, m) => {
    const g = m.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3;
    return n + t * (m.isInstancedMesh ? m.count : 1);
  }, 0);
}
// Everything that can move or change: geometry, colours, transforms, instances.
function snapshot(root) {
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse((o) => {
    parts.push(Array.from(o.matrixWorld.elements));
    if (o.isMesh) {
      parts.push(Array.from(o.geometry.attributes.position.array));
      if (o.geometry.attributes.color) parts.push(Array.from(o.geometry.attributes.color.array));
      if (o.isInstancedMesh) parts.push(Array.from(o.instanceMatrix.array));
    }
  });
  return parts;
}
function same(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].length !== b[i].length) return false;
    for (let j = 0; j < a[i].length; j++) if (Math.abs(a[i][j] - b[i][j]) > 1e-9) return false;
  }
  return true;
}
function maxChange(a, b) {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) for (let j = 0; j < Math.min(a[i].length, b[i].length); j++) d = Math.max(d, Math.abs(a[i][j] - b[i][j]));
  return d;
}
const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
// Mean surface colour (linear): vertex colours times the mean of any colour map.
function appearance(root) {
  let r = 0, g = 0, b = 0, w = 0;
  for (const m of meshes(root)) {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const mat = mats[0], col = m.geometry.attributes.color, n = m.geometry.attributes.position.count;
    let vr = 1, vg = 1, vb = 1;
    if (mat.vertexColors && col) { vr = vg = vb = 0; for (let i = 0; i < col.count; i++) { vr += col.getX(i); vg += col.getY(i); vb += col.getZ(i); } vr /= col.count; vg /= col.count; vb /= col.count; }
    let tr = 1, tg = 1, tb = 1;
    if (mat.map && mat.map.image && mat.map.image.data) {
      const d = mat.map.image.data, srgb = mat.map.encoding === THREE.sRGBEncoding; let k = 0, aw = 0; tr = tg = tb = 0;
      for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255; if (a < 0.5) continue; k++; aw++; tr += srgb ? lin(d[i] / 255) : d[i] / 255; tg += srgb ? lin(d[i + 1] / 255) : d[i + 1] / 255; tb += srgb ? lin(d[i + 2] / 255) : d[i + 2] / 255; }
      if (k) { tr /= k; tg /= k; tb /= k; }
    }
    const c = mat.color || { r: 1, g: 1, b: 1 };
    r += vr * tr * c.r * n; g += vg * tg * c.g * n; b += vb * tb * c.b * n; w += n;
  }
  r /= w; g /= w; b /= w;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return { r, g, b, lum: 0.2126 * r + 0.7152 * g + 0.0722 * b, sat: max > 0 ? (max - min) / max : 0 };
}
// Share of body-texture texels (sRGB) that pass a colour test.
function texelShare(handle, part, test) {
  const m = handle.root.getObjectByName(handle.root.userData.speciesId + '-' + part), d = m.material.map.image.data;
  let k = 0; for (let i = 0; i < d.length; i += 4) if (test(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255)) k++;
  return k / (d.length / 4);
}
// A part drawn inside a batch mesh: the mesh and the part's vertex range.
function batchPart(root, name) {
  let out = null;
  root.traverse((mesh) => { if (!out && mesh.isMesh && mesh.geometry.userData.batch) { const range = mesh.geometry.userData.batch.find((r) => r.part === name); if (range) out = { mesh, range }; } });
  return out;
}

function rangeBox(root, name) {
  const { mesh, range } = batchPart(root, name), p = mesh.geometry.attributes.position, box = new THREE.Box3(), v = new THREE.Vector3();
  mesh.updateWorldMatrix(true, false);
  for (let i = range.first; i < range.first + range.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld));
  return box;
}
function positions(mesh) { const p = mesh.geometry.attributes.position, out = []; for (let i = 0; i < p.count; i++) out.push([p.getX(i), p.getY(i), p.getZ(i)]); return out; }
function trackingThree() {
  const created = [], disposed = new Map(), T = { ...THREE };
  for (const [name, value] of Object.entries(THREE)) {
    if (typeof value !== 'function' || !value.prototype) continue;
    if (!(value.prototype.isBufferGeometry || value.prototype.isMaterial || value.prototype.isTexture)) continue;
    T[name] = class extends value {
      constructor(...args) { super(...args); created.push(this); }
      dispose() { disposed.set(this, (disposed.get(this) || 0) + 1); return super.dispose(); }
    };
  }
  return { T, created, disposed };
}

describe('Reef3DSpecies contract', () => {
  it('registers only window.Reef3DSpecies 1.0.0 with the exact ids and API', () => {
    expect(loadError && loadError.message, 'loads in a sandbox window without a global THREE').toBe(null);
    const w = load();
    expect(Object.keys(w)).toEqual(['Reef3DSpecies']);
    expect(Object.keys(S).sort()).toEqual(['create', 'createSchool', 'ids', 'info', 'version']);
    expect(S.version).toBe('1.0.0');
    expect([...S.ids].sort()).toEqual([...ALL].sort());
    expect(new Set(S.ids).size).toBe(S.ids.length);
    expect(() => S.create(null, 'clownfish')).toThrow(/THREE/);
    expect(() => S.create(THREE, 'nemo')).toThrow(RangeError);
  });

  it('describes every organism with valid info fields', () => {
    for (const [group, ids] of Object.entries(EXPECTED_IDS)) for (const id of ids) {
      const i = S.info(id);
      expect(i.id).toBe(id);
      expect(i.group, id).toBe(group);
      expect(['school', 'solitary', 'pair', 'sessile', 'bottom', 'crevice', 'hover'], id).toContain(i.habit);
      expect(i.lengthM, id).toBeGreaterThan(0.01);
      expect(i.lengthM, id).toBeLessThan(5);
      expect(i.depthM).toHaveLength(2);
      expect(i.depthM[0], id).toBeGreaterThanOrEqual(0);
      expect(i.depthM[1], id).toBeGreaterThan(i.depthM[0]);
      expect(i.depthM[1], id).toBeLessThanOrEqual(60);
      if (i.habit === 'school') { expect(i.schoolSize[0], id).toBeGreaterThanOrEqual(2); expect(i.schoolSize[1], id).toBeGreaterThan(i.schoolSize[0]); }
      else expect(i.schoolSize, id).toBeNull();
      expect(['centre', 'base', 'crevice'], id).toContain(i.origin);
    }
    expect(S.info('anthias').habit).toBe('school');
    expect(S.info('blue_green_chromis').habit).toBe('school');
    expect(S.info('bluestripe_snapper').habit).toBe('school');
    expect(S.info('giant_moray').habit).toBe('crevice');
    expect(S.info('nemo')).toBeNull();
    // info() hands out copies.
    S.info('clownfish').depthM[0] = 99; expect(S.info('clownfish').depthM[0]).not.toBe(99);
  });
});

describe('Reef3DSpecies models', () => {
  for (const quality of ['low', 'high']) {
    it(`builds every organism on the ${quality} tier: finite, tagged, sized and within budget`, () => {
      const report = [];
      for (const id of ALL) {
        const h = S.create(THREE, id, { seed: 3, quality }), info = S.info(id), ms = meshes(h.root);
        expect(Object.keys(h).filter((k) => ['root', 'update', 'dispose', 'radius'].includes(k)).sort(), id).toEqual(['dispose', 'radius', 'root', 'update']);
        expect(h.root.userData, id).toEqual({ speciesId: id, group: info.group });
        expect(ms.length, id).toBeGreaterThan(0);
        for (const m of ms) {
          expect(m.userData.speciesId, id + ' mesh ' + m.name).toBe(id);
          const a = m.geometry.attributes.position.array;
          let bad = 0; for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) bad++;
          expect(bad, id + ' NaN in ' + m.name).toBe(0);
        }
        expect(Number.isFinite(h.radius) && h.radius > 0, id).toBe(true);
        if (id === 'christmas_tree_worm') { expect(h.radius).toBeGreaterThan(0.05); expect(h.radius).toBeLessThan(0.4); }
        else { expect(h.radius / info.lengthM, id + ' radius vs length').toBeGreaterThan(0.25); expect(h.radius / info.lengthM, id + ' radius vs length').toBeLessThan(1.6); }
        const n = tris(h.root), cap = BUDGET[COLONY.has(id) ? 'colony' : 'animal'][quality === 'low' ? 0 : 1];
        expect(n, `${id} ${quality} triangles`).toBeLessThanOrEqual(cap);
        report.push(n);
        h.dispose();
      }
      expect(report.length).toBe(ALL.length);
    }, SLOW);
  }

  it('builds the same model from the same seed, and varies with the seed', () => {
    let varied = 0;
    for (const id of ALL) {
      const a = S.create(THREE, id, { seed: 11, quality: 'low' }), b = S.create(THREE, id, { seed: 11, quality: 'low' }), c = S.create(THREE, id, { seed: 12, quality: 'low' });
      expect(same(snapshot(a.root), snapshot(b.root)), id + ' same seed').toBe(true);
      expect(a.radius).toBe(b.radius);
      if (!same(snapshot(a.root), snapshot(c.root))) varied++;
      a.dispose(); b.dispose(); c.dispose();
    }
    expect(varied).toBeGreaterThan(ALL.length * 0.8);
  }, SLOW);

  it('faces fish along +X with the origin at the body centre', () => {
    for (const id of ['clownfish', 'blue_tang', 'parrotfish', 'whitetip_reef_shark']) {
      const h = S.create(THREE, id, { seed: 1, quality: 'low' }), body = h.root.getObjectByName(id + '-body');
      const be = new THREE.Box3().setFromObject(body), ee = rangeBox(h.root, 'detail'), L = S.info(id).lengthM;
      expect(ee.getCenter(new THREE.Vector3()).x, id + ' eyes toward +X').toBeGreaterThan(be.getCenter(new THREE.Vector3()).x + 0.1 * L);
      const box = new THREE.Box3().setFromObject(h.root);
      expect(Math.abs((box.min.x + box.max.x) / 2), id + ' centred').toBeLessThan(0.15 * L);
      expect(box.max.x - box.min.x, id + ' length').toBeGreaterThan(0.75 * L);
      expect(box.max.x - box.min.x, id + ' length').toBeLessThan(1.3 * L);
      h.dispose();
    }
  });

  it('reports the picked organism through a raycast hit', () => {
    const h = S.create(THREE, 'peacock_grouper', { seed: 2, quality: 'low' });
    h.root.position.set(5, 1, 0); h.root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(5, 1, 3), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObject(h.root, true)[0];
    expect(hit.object.userData.speciesId).toBe('peacock_grouper');
    h.dispose();
  });
});

describe('Reef3DSpecies schools', () => {
  it('builds a school as instanced meshes with the requested count and moves it as a school', () => {
    // Every schooling species, so a new one cannot skip the member budget.
    const schooling = S.ids.filter((i) => S.info(i).habit === 'school');
    expect(schooling.sort()).toEqual(['anthias', 'blue_green_chromis', 'bluestripe_snapper', 'bumphead_parrotfish']);
    for (const [id, count] of schooling.map((i, k) => [i, [37, 12, 24, 9][k]])) {
      for (const quality of ['low', 'high']) {
        const s = S.createSchool(THREE, id, count, { seed: 4, quality }), ms = meshes(s.root);
        expect(s.count).toBe(count);
        expect(s.root.userData).toEqual({ speciesId: id, group: 'fish' });
        expect(ms.length).toBeGreaterThanOrEqual(3);
        for (const m of ms) { expect(m.isInstancedMesh, id + ' instanced').toBe(true); expect(m.count).toBe(count); expect(m.userData.speciesId).toBe(id); }
        expect(tris(s.root) / count, `${id} ${quality} per member`).toBeLessThanOrEqual(BUDGET.member[quality === 'low' ? 0 : 1]);
        expect(s.radius).toBeGreaterThan(S.info(id).lengthM);
        const before = snapshot(s.root); s.update(0.016, 2.3);
        expect(maxChange(before, snapshot(s.root)), id + ' members move').toBeGreaterThan(1e-4);
        s.dispose(); s.dispose();
      }
    }
    const still = S.createSchool(THREE, 'anthias', 20, { seed: 4, reducedMotion: true }), snap = snapshot(still.root);
    still.update(0.016, 3); still.update(0.016, 9);
    expect(same(snap, snapshot(still.root))).toBe(true);
    // Anthias schools mix orange females with a few magenta males.
    const tints = still.root.getObjectByName('anthias-body').instanceColor.array, males = [];
    for (let i = 0; i < tints.length; i += 3) males.push(tints[i + 2] > 2);
    expect(males.filter(Boolean).length).toBeGreaterThan(0);
    expect(males.filter(Boolean).length).toBeLessThan(males.length / 2);
    still.dispose();
    expect(() => S.createSchool(THREE, 'reef_manta', 5)).toThrow(RangeError);
    expect(() => S.createSchool(THREE, 'giant_moray', 5)).toThrow(RangeError);
    expect(() => S.createSchool(THREE, 'brain_coral', 5)).toThrow(RangeError);
  }, SLOW);
});

describe('Reef3DSpecies motion', () => {
  it('keeps schools separated, bounded and deterministic across update cadences', () => {
    const a = S.createSchool(THREE, 'anthias', 37, { seed: 21, quality: 'low' });
    const b = S.createSchool(THREE, 'anthias', 37, { seed: 21, quality: 'low' });
    const motion = { speed: 0.24, turn: 0.3, current: { x: 0.04, z: 0.02, strength: 0.6 } };
    const matrix = new THREE.Matrix4(), p = new THREE.Vector3(), L = S.info('anthias').lengthM;
    try {
      for (let frame = 0; frame <= 120; frame++) {
        const t = frame * 0.1;
        a.update(0.1, t, motion);
        const centers = [], body = a.root.getObjectByName('anthias-body');
        for (let i = 0; i < a.count; i++) {
          body.getMatrixAt(i, matrix); p.setFromMatrixPosition(matrix);
          expect(p.length(), 'animated school stays inside its culling radius').toBeLessThan(a.radius - L * 0.5);
          for (const other of centers) expect(p.distanceTo(other), 'members retain a personal space').toBeGreaterThan(L * 0.43);
          centers.push(p.clone());
        }
      }
      b.update(12, 12, motion);
      expect(same(snapshot(a.root), snapshot(b.root)), 'absolute time is independent of skipped or culled frames').toBe(true);
      const body = a.root.getObjectByName('anthias-body');
      expect(new Set(body.geometry.attributes.reefSchoolBeat.array).size, 'individual stroke phases').toBeGreaterThan(a.count);
    } finally { a.dispose(); b.dispose(); }
  });

  it('responds to swimming speed and turning without moving the placement root', () => {
    const fish = S.create(THREE, 'blue_tang', { seed: 9 });
    const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <emissivemap_fragment>' };
    try {
      fish.root.getObjectByName('blue_tang-body').material.onBeforeCompile(shader);
      fish.root.position.set(3, -7, 4); fish.root.rotation.set(0.02, 0.6, 0.04); fish.root.updateMatrix();
      const rootMatrix = fish.root.matrix.clone();
      fish.update(0.016, 2.4, { speed: 0.02, turn: 0 }); const coast = shader.uniforms.reefSwim.value.y;
      fish.update(0.016, 2.4, { speed: 0.6, turn: 0.8 }); const stroke = shader.uniforms.reefSwim.value.y;
      expect(stroke).toBeGreaterThan(coast * 1.8);
      const fins = [];
      fish.root.traverse((node) => { if (node.userData.part === 'pectoral-pivot') fins.push(node.rotation.y); });
      expect(Math.abs(fins[0] + fins[1]), 'turning has asymmetric fin steering').toBeGreaterThan(0.08);
      fish.root.updateMatrix(); expect(fish.root.matrix.equals(rootMatrix)).toBe(true);
    } finally { fish.dispose(); }
  });

  it('bends rooted sea fans with the world current while preserving their attachment', () => {
    const fan = S.create(THREE, 'sea_fan', { seed: 4, quality: 'low' });
    const geo = fan.root.getObjectByName('sea_fan-trunk').geometry;
    const before = new Float32Array(geo.attributes.position.array);
    try {
      fan.update(0.016, 3, { current: { x: 0.05, z: 0, strength: 0.8 } });
      const right = new Float32Array(geo.attributes.position.array);
      fan.update(0.016, 3, { current: { x: -0.05, z: 0, strength: 0.8 } });
      const left = geo.attributes.position.array; let flex = 0, anchors = 0;
      for (let i = 0; i < before.length; i += 3) {
        if (before[i + 1] <= 0) { expect(right[i]).toBe(before[i]); expect(left[i]).toBe(before[i]); anchors++; }
        if (before[i + 1] > 0.4) flex += right[i] - left[i];
      }
      expect(anchors).toBeGreaterThan(0); expect(flex).toBeGreaterThan(0.1);
      expect(fan.root.position.length()).toBe(0);
    } finally { fan.dispose(); }
  });

  it('animates every living organism locally, and holds still under reduced motion', () => {
    const still = [];
    for (const id of ALL) {
      const h = S.create(THREE, id, { seed: 6, quality: 'low' }), rootM = h.root.matrix.clone();
      h.update(0.016, 0.05); const a = snapshot(h.root); h.update(0.016, 1.9); const b = snapshot(h.root);
      if (maxChange(a, b) < 1e-5) still.push(id);
      h.root.updateMatrix(); expect(h.root.matrix.equals(rootM), id + ' never moves its root').toBe(true);
      h.dispose();
      const r = S.create(THREE, id, { seed: 6, quality: 'low', reducedMotion: true }), s0 = snapshot(r.root);
      for (const t of [0.3, 1.1, 4.7]) r.update(0.05, t);
      expect(maxChange(s0, snapshot(r.root)), id + ' reduced motion').toBeLessThan(1e-9);
      r.dispose();
    }
    expect(still.sort()).toEqual([...STATIC].sort());
  }, SLOW);

  it('opens the moray mouth even at rest and lets christmas tree worms retract', () => {
    const m = S.create(THREE, 'giant_moray', { seed: 1, reducedMotion: true });
    expect(m.root.getObjectByName('giant_moray-jaw-pivot').rotation.z).toBeLessThan(-0.15);
    m.dispose();
    const w = S.create(THREE, 'christmas_tree_worm', { seed: 1 }), worms = w.root.getObjectByName('christmas_tree_worm-worms');
    const scale = () => { const e = new THREE.Matrix4(), s = new THREE.Vector3(); worms.getMatrixAt(0, e); e.decompose(new THREE.Vector3(), new THREE.Quaternion(), s); return s.x; };
    expect(scale()).toBeCloseTo(1, 6);
    w.retract(true); expect(scale()).toBeLessThan(0.1);
    w.retract(false); expect(scale()).toBeCloseTo(1, 6);
    w.dispose();
  });
});

describe('Reef3DSpecies growth and health', () => {
  it('grows corals and overgrows structures', () => {
    for (const id of [...EXPECTED_IDS.coral, ...EXPECTED_IDS.structure]) {
      const a = S.create(THREE, id, { seed: 8, quality: 'low', growth: 0 }), b = S.create(THREE, id, { seed: 8, quality: 'low', growth: 1 });
      const changed = !same(snapshot(a.root), snapshot(b.root)) || Math.abs(appearance(a.root).lum - appearance(b.root).lum) > 1e-3;
      expect(changed, id + ' growth changes the model').toBe(true);
      if (EXPECTED_IDS.coral.includes(id)) expect(b.radius / a.radius, id + ' grows').toBeGreaterThan(1.8);
      else expect(tris(b.root) > tris(a.root) || b.radius > a.radius * 1.05, id + ' gains coral').toBe(true);
      a.dispose(); b.dispose();
    }
    // Growth only applies to corals and structures; a fish ignores it.
    const f1 = S.create(THREE, 'clownfish', { seed: 8, growth: 0 }), f2 = S.create(THREE, 'clownfish', { seed: 8, growth: 1 });
    expect(same(snapshot(f1.root), snapshot(f2.root))).toBe(true); f1.dispose(); f2.dispose();
  }, SLOW);

  it('colours bleached corals white and dead corals as dull skeleton with turf', () => {
    for (const id of EXPECTED_IDS.coral) {
      const look = {};
      for (const health of ['healthy', 'bleached', 'dead']) { const h = S.create(THREE, id, { seed: 9, quality: 'low', health }); look[health] = appearance(h.root); h.dispose(); }
      const dist = (p, q) => Math.hypot(p.r - q.r, p.g - q.g, p.b - q.b);
      expect(look.bleached.lum, id + ' bleached is lighter').toBeGreaterThan(look.healthy.lum * 1.4);
      expect(look.bleached.sat, id + ' bleached is white').toBeLessThan(0.12);
      expect(look.dead.sat, id + ' dead is duller than living tissue').toBeLessThan(look.healthy.sat + 0.05);
      expect(dist(look.dead, look.healthy), id + ' dead vs healthy').toBeGreaterThan(0.03);
      expect(dist(look.dead, look.bleached), id + ' dead vs bleached').toBeGreaterThan(0.1);
      expect(look.dead.lum, id + ' dead is darker than bleached').toBeLessThan(look.bleached.lum);
    }
    // Health is a coral option only.
    const a = S.create(THREE, 'giant_clam', { seed: 9, health: 'dead' }), b = S.create(THREE, 'giant_clam', { seed: 9 });
    expect(same(snapshot(a.root), snapshot(b.root))).toBe(true); a.dispose(); b.dispose();
  }, SLOW);
});

describe('Reef3DSpecies look-alikes', () => {
  it('tells the green turtle from the hawksbill by beak and shell', () => {
    const metrics = {};
    for (const id of ['green_turtle', 'hawksbill_turtle']) {
      for (const quality of ['low', 'high']) {
        const h = S.create(THREE, id, { seed: 2, quality });
        const head = positions(h.root.getObjectByName(id + '-head')), xs = head.map((p) => p[0]), maxX = Math.max(...xs), len = maxX - Math.min(...xs);
        const tip = Math.max(...head.filter((p) => p[0] > maxX - 0.15 * len).map((p) => Math.abs(p[2])));
        // Rear outline of the carapace: maximum radius per angle bin over the back third.
        const shell = positions(h.root.getObjectByName(id + '-carapace')).filter((p) => p[1] > -0.005), bins = new Array(40).fill(0);
        for (const p of shell) {
          const a = Math.atan2(p[2], p[0]); if (Math.abs(a) < 2.3) continue;
          const k = Math.min(39, Math.floor(((a < 0 ? a + 2 * Math.PI : a) - 2.3) / ((2 * Math.PI - 4.6) / 40)));
          bins[k] = Math.max(bins[k], Math.hypot(p[0], p[2]));
        }
        const r = bins.filter((v) => v > 0), mean = r.reduce((s, v) => s + v, 0) / r.length;
        let rough = 0; for (let i = 1; i < r.length - 1; i++) rough += Math.abs(r[i] - (r[i - 1] + r[i + 1]) / 2); rough /= (r.length - 2) * mean;
        const tex = h.root.getObjectByName(id + '-carapace').material.map.image.data; let tr = 0, tg = 0, tb = 0;
        for (let i = 0; i < tex.length; i += 4) { tr += tex[i]; tg += tex[i + 1]; tb += tex[i + 2]; }
        metrics[id + quality] = { beak: tip / len, rough, rg: tr / tg, warm: (tr - tb) / (tex.length / 4) / 255 };
        h.dispose();
      }
    }
    for (const q of ['low', 'high']) {
      const g = metrics['green_turtle' + q], k = metrics['hawksbill_turtle' + q];
      expect(k.beak, q + ' hawksbill beak is narrow and pointed').toBeLessThan(g.beak * 0.7);
      expect(k.rough, q + ' hawksbill rear edge is serrated').toBeGreaterThan(g.rough * 3 + 0.004);
      expect(k.rg, q + ' hawksbill shell is amber').toBeGreaterThan(g.rg + 0.12);
    }
  }, SLOW);

  it('tells the blue tang from the emperor angelfish by body marks', () => {
    const tang = S.create(THREE, 'blue_tang', { seed: 1 }), emp = S.create(THREE, 'emperor_angelfish', { seed: 1 });
    const yellow = (r, g, b) => r > 0.7 && g > 0.6 && b < 0.35, black = (r, g, b) => r < 0.12 && g < 0.12 && b < 0.2, blue = (r, g, b) => b > 0.5 && b > r * 1.8;
    expect(texelShare(emp, 'body', yellow), 'emperor has many yellow stripes').toBeGreaterThan(texelShare(tang, 'body', yellow) * 2.5 + 0.05);
    expect(texelShare(tang, 'body', black), 'blue tang has the black palette').toBeGreaterThan(texelShare(emp, 'body', black) * 1.5 + 0.05);
    expect(texelShare(tang, 'body', blue)).toBeGreaterThan(0.3);
    expect(texelShare(emp, 'body', blue)).toBeGreaterThan(0.2);
    // Both have yellow tails: the tail alone must not be the difference.
    const tailYellow = (h) => { const { mesh, range } = batchPart(h.root, 'tail'), c = mesh.geometry.attributes.color; let k = 0; for (let i = range.first; i < range.first + range.count; i++) if (c.getX(i) > 0.4 && c.getY(i) > 0.3 && c.getZ(i) < 0.1) k++; return k / range.count; };
    expect(tailYellow(tang)).toBeGreaterThan(0.4); expect(tailYellow(emp)).toBeGreaterThan(0.4);
    tang.dispose(); emp.dispose();
  });

  it('tells the parrotfish from the bumphead parrotfish by size, forehead and colour', () => {
    const p = S.create(THREE, 'parrotfish', { seed: 1 }), b = S.create(THREE, 'bumphead_parrotfish', { seed: 1 });
    function forehead(h) {
      const pts = positions(h.root.getObjectByName(h.root.userData.speciesId + '-body')), xs = pts.map((q) => q[0]), maxX = Math.max(...xs), L = maxX - Math.min(...xs);
      const top = Math.max(...pts.map((q) => q[1])), front = Math.max(...pts.filter((q) => q[0] > maxX - 0.12 * L).map((q) => q[1]));
      return { ratio: front / top, L };
    }
    const fp = forehead(p), fb = forehead(b);
    expect(fb.L).toBeGreaterThan(fp.L * 1.6);
    expect(fb.ratio, 'bumphead forehead rises steeply at the snout').toBeGreaterThan(0.85);
    expect(fp.ratio, 'parrotfish snout slopes').toBeLessThan(fb.ratio - 0.15);
    const pink = (r, g) => r > 0.55 && r > g + 0.12;
    expect(texelShare(p, 'body', pink), 'parrotfish scales are pink-edged').toBeGreaterThan(0.05);
    expect(texelShare(b, 'body', pink)).toBeLessThan(0.02);
    // Bumphead is a dull grey-green; the parrotfish a vivid teal.
    const vivid = (h) => { const d = h.root.getObjectByName(h.root.userData.speciesId + '-body').material.map.image.data; let s = 0; for (let i = 0; i < d.length; i += 4) { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); s += mx ? (mx - mn) / mx : 0; } return s / (d.length / 4); };
    expect(vivid(b), 'bumphead is dull').toBeLessThan(vivid(p) - 0.2);
    p.dispose(); b.dispose();
  });
});

describe('Reef3DSpecies lifecycle', () => {
  it('disposes every geometry, material and texture it made, exactly once', () => {
    for (const id of [...ALL, 'school:anthias', 'school:bluestripe_snapper']) {
      const { T, created, disposed } = trackingThree(), school = id.startsWith('school:'), sid = school ? id.slice(7) : id;
      const parent = new THREE.Group();
      const h = school ? S.createSchool(T, sid, 9, { seed: 5 }) : S.create(T, sid, { seed: 5, quality: 'high' });
      parent.add(h.root); h.update(0.016, 1);
      expect(created.length, id + ' made resources').toBeGreaterThan(0);
      h.dispose();
      expect(created.filter((r) => !disposed.has(r)).map((r) => r.type || r.constructor.name), id + ' leaks').toEqual([]);
      expect(h.root.parent, id + ' detached').toBe(null);
      expect(() => h.dispose()).not.toThrow();
      expect(() => h.update(0.016, 2)).not.toThrow();
      expect([...disposed.values()].every((n) => n === 1), id + ' disposed once').toBe(true);
    }
  }, SLOW);
});
