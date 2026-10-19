import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// Real three r128; the habitat is loaded the way the app loads it: a plain
// script that registers itself on window. REEF3D_HABITAT_SOURCE lets a
// mutation check point the suite at a scratch copy.
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const SOURCE = process.env.REEF3D_HABITAT_SOURCE || 'stem_lab/reef_3d_habitat.js';
function load() {
  const win = { console: { warn() {}, error() {} } };
  new Function('window', readFileSync(SOURCE, 'utf8'))(win);
  return win;
}
const habitatWindow = load();
const Habitat = habitatWindow.Reef3DHabitat;
const CATEGORIES = ['hard_coral', 'bleached_coral', 'recently_dead_coral', 'macroalgae', 'rock', 'rubble', 'sand'];
const FORMS = ['branching', 'massive', 'plate', 'encrusting'];
const isCoral = (c) => c.endsWith('_coral');

function sampleLayout(background = { coralCover: 0.45, bleaching: 0.2, algae: 0.3 }) {
  const points = [];
  for (let i = 0; i < 40; i++) {
    const category = CATEGORIES[i % 7];
    // Every coral category meets all four growth forms.
    points.push({ distanceM: i * 0.5, category, coralForm: isCoral(category) ? FORMS[Math.floor(i / 7) % 4] : undefined });
  }
  const families = ['parrotfish', 'surgeonfish', 'butterflyfish', 'grouper', 'snapper'];
  const fish = Array.from({ length: 12 }, (_, i) => ({ id: 'f' + i, family: families[i % 5], alongM: 1 + i * 1.5, offsetM: (i % 2 ? 1 : -1) * (0.4 + (i % 4) * 0.8), heightM: 0.6 }));
  return { lengthM: 20, beltHalfWidthM: 2.5, depthM: 8, points, fish, background };
}
const build = (options = {}) => Habitat.create(THREE, { layout: sampleLayout(), seed: 11, quality: 'high', ...options });
const round = (v) => Math.round(v * 1e5) / 1e5;
function decorFingerprint(h) {
  const out = [];
  h.root.traverse((o) => {
    if (!o.userData.decorative) return;
    if (o.isInstancedMesh) out.push(o.name, Array.from(o.instanceMatrix.array, round).join(','), o.instanceColor ? Array.from(o.instanceColor.array, round).join(',') : '');
    else out.push(o.name, o.position.toArray().map(round).join(','));
  });
  const floor = h.root.getObjectByName('reef-floor');
  out.push(Array.from(floor.geometry.attributes.position.array, round).join(','));
  return out.join('|');
}
function surveyFingerprint(h) {
  return h.surveyObjects.map((o) => {
    const parts = [JSON.stringify(o.userData), o.position.toArray().map(round).join(','), round(o.rotation.y)];
    o.traverse((m) => { if (m.geometry) parts.push(m.name, Array.from(m.geometry.attributes.position.array, round).join(',')); });
    return parts.join(';');
  }).join('|');
}
function decorInstances(h) {
  let n = 0;
  h.root.traverse((o) => { if (o.userData.decorative) n += o.isInstancedMesh ? o.count : 1; });
  return n;
}
function translations(h, kind) {
  const set = new Set(), m = new THREE.Matrix4(), p = new THREE.Vector3();
  h.root.traverse((o) => {
    if (!o.isInstancedMesh || o.name !== 'reef-decor-' + kind) return;
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); p.setFromMatrixPosition(m); set.add(p.toArray().map((v) => v.toFixed(5)).join(',')); }
  });
  return set;
}
// A THREE whose geometries, materials and textures report their own creation and disposal.
function trackingThree() {
  const created = [], disposed = new Map();
  const T = { ...THREE };
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
function libraryShader(material) {
  const lib = material.isMeshStandardMaterial ? THREE.ShaderLib.physical : material.isPointsMaterial ? THREE.ShaderLib.points : THREE.ShaderLib.basic;
  return { uniforms: THREE.UniformsUtils.clone(lib.uniforms), vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
}

describe('Reef3DHabitat contract', () => {
  it('registers only window.Reef3DHabitat with version 1.0.0 and create()', () => {
    expect(Object.keys(habitatWindow).filter((k) => k !== 'console')).toEqual(['Reef3DHabitat']);
    expect(Habitat.version).toBe('1.0.0');
    expect(typeof Habitat.create).toBe('function');
    const h = build();
    expect(h.root.isGroup).toBe(true);
    expect(typeof h.update).toBe('function');
    expect(typeof h.dispose).toBe('function');
    expect(Array.isArray(h.surveyObjects)).toBe(true);
    h.dispose();
  });

  it('builds one survey object per point with the contract userData', () => {
    const layout = sampleLayout(), h = Habitat.create(THREE, { layout, seed: 11, quality: 'high' });
    expect(h.surveyObjects).toHaveLength(40);
    h.surveyObjects.forEach((object, i) => {
      const p = layout.points[i];
      expect(object.isObject3D, `point ${i}`).toBe(true);
      expect(object.userData).toEqual({ surveyPoint: i, category: p.category, coralForm: isCoral(p.category) ? p.coralForm : null });
      let up = object; while (up.parent) up = up.parent;
      expect(up, `point ${i} is in the habitat root`).toBe(h.root);
    });
    h.dispose();
  });

  it('places each object directly under the tape at its distance, with the tape resting on top', () => {
    const layout = sampleLayout(), h = Habitat.create(THREE, { layout, seed: 11, quality: 'high' });
    h.root.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    h.surveyObjects.forEach((object, i) => {
      const d = layout.points[i].distanceM;
      expect(object.position.x).toBeCloseTo(d, 9);
      expect(object.position.z).toBe(0);
      expect(object.position.y).toBeCloseTo(h.floorHeight(d, 0), 9);
      let top = -Infinity;
      object.traverse((m) => {
        if (!m.isMesh) return;
        const pos = m.geometry.attributes.position;
        for (let k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k).applyMatrix4(m.matrixWorld); if (Math.abs(v.z) < 0.02 && Math.abs(v.x - d) < 0.01) top = Math.max(top, v.y); }
      });
      if (top > -Infinity) expect(h.tapeHeight(d), `tape rests on point ${i}`).toBeGreaterThanOrEqual(top);
    });
    const tape = h.root.getObjectByName('reef-tape');
    tape.geometry.computeBoundingBox();
    expect(tape.geometry.boundingBox.min.x).toBeCloseTo(0, 6);
    expect(tape.geometry.boundingBox.max.x).toBeCloseTo(20, 6);
    expect(tape.material.color.r).toBeGreaterThan(tape.material.color.b * 3);
    h.dispose();
  });

  it('marks the tape every 0.5 m with larger marks on each whole metre', () => {
    const h = build(), half = h.root.getObjectByName('reef-tape-marks-half');
    const metre = [...(h.root.getObjectByName('reef-tape-marks-metre').userData.distancesM), ...(h.root.getObjectByName('reef-tape-marks-five').userData.distancesM)].sort((a, b) => a - b);
    expect(half.userData.distancesM).toEqual(Array.from({ length: 20 }, (_, i) => i + 0.5));
    expect(metre).toEqual(Array.from({ length: 21 }, (_, i) => i));
    const size = (name) => { const g = h.root.getObjectByName(name).geometry; g.computeBoundingBox(); return g.boundingBox.getSize(new THREE.Vector3()); };
    const small = size('reef-tape-marks-half'), large = size('reef-tape-marks-metre');
    expect(large.x).toBeGreaterThan(small.x);
    expect(large.z).toBeGreaterThan(small.z);
    h.dispose();
  });

  it('gives the four coral forms distinct shapes and the three coral states distinct looks', () => {
    const layout = sampleLayout(), h = Habitat.create(THREE, { layout, seed: 11, quality: 'high' });
    const heights = {}, vertexCounts = new Set(), looks = {};
    h.surveyObjects.forEach((object, i) => {
      const p = layout.points[i];
      if (!isCoral(p.category)) return;
      const mesh = object.getObjectByName('reef-coral');
      const box = new THREE.Box3().setFromObject(object);
      if (p.category === 'hard_coral') { heights[p.coralForm] = box.max.y - object.position.y; vertexCounts.add(mesh.geometry.attributes.position.count); }
      const shader = libraryShader(mesh.material); mesh.material.onBeforeCompile(shader);
      looks[p.category] = { color: mesh.material.color.clone(), turf: shader.uniforms.reefCoralA.value.y, roughness: mesh.material.roughness, fuzz: !!object.getObjectByName('reef-turf-fuzz') };
    });
    expect(vertexCounts.size).toBe(4);
    expect(heights.encrusting).toBeLessThan(0.1);
    expect(heights.branching).toBeGreaterThan(heights.massive);
    expect(heights.plate).toBeGreaterThan(heights.encrusting * 2);
    const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b, chroma = (c) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
    expect(lum(looks.bleached_coral.color)).toBeGreaterThan(0.8);
    expect(chroma(looks.bleached_coral.color)).toBeLessThan(0.08);
    expect(chroma(looks.hard_coral.color)).toBeGreaterThan(0.08);
    expect(lum(looks.hard_coral.color)).toBeLessThan(0.4);
    expect(looks.bleached_coral.turf).toBe(0);
    expect(looks.bleached_coral.fuzz).toBe(false);
    expect(looks.recently_dead_coral.turf).toBeGreaterThan(0.3);
    expect(looks.recently_dead_coral.fuzz).toBe(true);
    expect(looks.recently_dead_coral.roughness).toBeGreaterThan(looks.bleached_coral.roughness + 0.3);
    h.dispose();
  });

  it('builds macroalgae from surge-flexed blades, and rubble from many fragments', () => {
    const layout = sampleLayout(), h = Habitat.create(THREE, { layout, seed: 11, quality: 'high' });
    const algae = h.surveyObjects[3].getObjectByName('reef-macroalgae');
    expect(algae.geometry.getAttribute('reefBladePhase')).toBeTruthy();
    const phases = new Set(Array.from(algae.geometry.getAttribute('reefBladePhase').array));
    expect(phases.size).toBeGreaterThanOrEqual(10);
    expect(h.surveyObjects[5].getObjectByName('reef-rubble').geometry.attributes.position.count).toBeGreaterThan(200);
    expect(h.surveyObjects[4].getObjectByName('reef-rock')).toBeTruthy();
    expect(h.surveyObjects[6].getObjectByName('reef-sand')).toBeTruthy();
    h.dispose();
  });

  it('leaves no NaN in any geometry position or instance matrix', () => {
    for (const quality of ['high', 'low']) {
      const h = build({ quality });
      h.root.traverse((o) => {
        if (o.geometry) { const a = o.geometry.attributes.position.array; for (let k = 0; k < a.length; k++) if (!Number.isFinite(a[k])) throw new Error(`${o.name} position ${k} is ${a[k]}`); }
        if (o.isInstancedMesh) { const a = o.instanceMatrix.array; for (let k = 0; k < a.length; k++) if (!Number.isFinite(a[k])) throw new Error(`${o.name} matrix ${k}`); }
      });
      h.dispose();
    }
  });
});

describe('Reef3DHabitat seeded placement', () => {
  it('repeats the same decoration for the same seed', () => {
    const a = build(), b = build();
    expect(decorFingerprint(a) === decorFingerprint(b), 'same seed, same decoration').toBe(true);
    expect(surveyFingerprint(a) === surveyFingerprint(b)).toBe(true);
    a.dispose(); b.dispose();
  });

  it('changes decoration but never the survey objects for a different seed', () => {
    const a = build({ seed: 11 }), b = build({ seed: 12 });
    expect(decorFingerprint(a) === decorFingerprint(b), 'decoration should differ').toBe(false);
    expect(surveyFingerprint(a) === surveyFingerprint(b), 'survey objects depend only on the layout').toBe(true);
    a.dispose(); b.dispose();
  });

  it('builds fewer decorative meshes on low, all at high-tier positions, with identical survey objects', () => {
    const high = build({ quality: 'high' }), low = build({ quality: 'low' });
    expect(decorInstances(low)).toBeLessThan(decorInstances(high) * 0.5);
    // Chromebook budget for a 20 m, 40-point transect (measured 137k low / 345k high).
    const triangles = (h) => { let n = 0; h.root.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); }); return n; };
    expect(triangles(low)).toBeLessThan(160000);
    expect(triangles(high)).toBeLessThan(400000);
    expect(surveyFingerprint(low) === surveyFingerprint(high), 'tier never changes survey objects').toBe(true);
    for (const kind of ['bommie', 'rock', 'massive', 'finger', 'antler', 'corymbose', 'plate', 'algae', 'sponge', 'rubble']) {
      const lowSet = translations(low, kind), highSet = translations(high, kind);
      for (const p of lowSet) expect(highSet.has(p), `${kind} at ${p} only exists on low`).toBe(true);
    }
    expect(translations(low, 'bommie').size).toBe(translations(high, 'bommie').size);
    high.dispose(); low.dispose();
  });

  it('does not move anything under reduced motion, and freezes the caustics', () => {
    const moving = build(), still = build({ reducedMotion: true });
    expect(decorFingerprint(moving) === decorFingerprint(still)).toBe(true);
    expect(surveyFingerprint(moving) === surveyFingerprint(still)).toBe(true);
    const clock = (h) => { const floor = h.root.getObjectByName('reef-floor'), s = libraryShader(floor.material); floor.material.onBeforeCompile(s); return s.uniforms.reefCausticTime; };
    const a = clock(still); still.update(0.1, 5); const t1 = a.value; still.update(0.1, 50); expect(a.value).toBe(t1);
    const b = clock(moving); moving.update(0.1, 5); const t2 = b.value; moving.update(0.1, 50); expect(b.value).not.toBe(t2);
    moving.dispose(); still.dispose();
  });

  it('reflects the background reef in coral cover, bleaching and algae', () => {
    const count = (h, kinds) => kinds.reduce((n, k) => n + translations(h, k).size, 0);
    const corals = ['massive', 'finger', 'antler', 'corymbose', 'plate'];
    const sparse = Habitat.create(THREE, { layout: sampleLayout({ coralCover: 0.1, bleaching: 0, algae: 0 }), seed: 11 });
    const dense = Habitat.create(THREE, { layout: sampleLayout({ coralCover: 0.9, bleaching: 0.9, algae: 1 }), seed: 11 });
    expect(count(dense, corals)).toBeGreaterThan(count(sparse, corals) * 1.5);
    expect(count(dense, ['algae'])).toBeGreaterThan(count(sparse, ['algae']) * 2);
    const white = (h) => { let n = 0; h.root.traverse((o) => { if (o.isInstancedMesh && corals.includes(o.name.replace('reef-decor-', ''))) for (let i = 0; i < o.count; i++) if (o.instanceColor.getX(i) === 1 && o.instanceColor.getY(i) === 1 && o.instanceColor.getZ(i) === 1) n++; }); return n; };
    expect(white(sparse)).toBe(0);
    expect(white(dense)).toBeGreaterThan(count(dense, corals) * 0.6);
    sparse.dispose(); dense.dispose();
  });
});

describe('Reef3DHabitat shaders and lifecycle', () => {
  it('finds every shader anchor it patches in the real r128 chunks', () => {
    Habitat.shaderWarnings.length = 0;
    for (const derivatives of [true, false]) {
      const h = build({ derivatives }), seen = new Set();
      h.root.traverse((o) => {
        const m = o.material; if (!m || seen.has(m) || !m.onBeforeCompile || m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile) return;
        seen.add(m);
        const shader = libraryShader(m), before = shader.vertexShader + shader.fragmentShader;
        m.onBeforeCompile(shader);
        expect(shader.vertexShader + shader.fragmentShader === before, `${o.name} was not patched`).toBe(false);
        expect(m.customProgramCacheKey().startsWith('reef3d-'), `${o.name} cache key`).toBe(true);
        if (shader.fragmentShader.includes('reefCaustic(')) expect(shader.uniforms.reefCausticMap.value.isTexture, `${o.name} caustic map`).toBe(true);
      });
      expect(seen.size).toBeGreaterThan(8);
      h.dispose();
    }
    expect(Habitat.shaderWarnings).toEqual([]);
  });

  it('disposes every geometry, material and texture it created, once, and is idempotent', () => {
    const { T, created, disposed } = trackingThree();
    const parent = new THREE.Group(), h = Habitat.create(T, { layout: sampleLayout(), seed: 11, quality: 'high' });
    parent.add(h.root);
    expect(created.length).toBeGreaterThan(50);
    expect(created.some((r) => r.isTexture)).toBe(true);
    h.dispose();
    const missed = created.filter((r) => !disposed.has(r)).map((r) => r.type || r.constructor.name);
    expect(missed).toEqual([]);
    expect(h.root.parent).toBeNull();
    expect(h.root.children).toHaveLength(0);
    const calls = [...disposed.values()].reduce((a, b) => a + b, 0);
    expect(() => h.dispose()).not.toThrow();
    expect([...disposed.values()].reduce((a, b) => a + b, 0)).toBe(calls);
    expect(() => h.update(0.016, 1)).not.toThrow();
  });
});
