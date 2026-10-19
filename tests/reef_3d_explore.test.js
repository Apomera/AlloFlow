import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Each mount builds a whole 60 m reef: ~0.7 s on an idle machine, but other
// sessions' suites share this one, and under their load a run took 61 s.
vi.setConfig({ testTimeout: 45000 });

// Real three r128 with a stubbed WebGLRenderer, loaded into a fake window the
// way the Reef3D engine tests do. REEF3D_EXPLORE_SOURCE lets a mutation check
// point the suite at a scratch copy. A small stub stands in for
// window.Reef3DSpecies (same API) so the suite never depends on that module.
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const SOURCE = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');
const SPECIES_FILE = 'stem_lab/reef_3d_species.js', HAS_SPECIES = existsSync(SPECIES_FILE);
const CONTROLLER_KEYS = ['clearFocus', 'dispose', 'focus', 'focusNext', 'focusPrevious', 'getState', 'resize', 'setInput', 'setPaused', 'setView', 'swimTo'];
const STATE_KEYS = ['diver', 'drawCalls', 'focused', 'frames', 'nearby', 'paused', 'quality', 'ready', 'reducedMotion', 'triangles', 'view'];
const POP = [
  { id: 'clownfish', count: 4 }, { id: 'magnificent_anemone', count: 2 }, { id: 'blue_tang', count: 2 }, { id: 'brain_coral', count: 6 },
  { id: 'staghorn_coral', count: 4 }, { id: 'giant_moray', count: 1 }, { id: 'green_turtle', count: 2 }, { id: 'reef_manta', count: 1 },
  { id: 'whitetip_reef_shark', count: 1 }, { id: 'bluespotted_stingray', count: 1 }, { id: 'parrotfish', count: 3 }, { id: 'sea_fan', count: 3 },
  { id: 'barrel_sponge', count: 2 }, { id: 'cleaner_wrasse', count: 2 }, { id: 'lionfish', count: 1 }, { id: 'anthias', count: 2 }, { id: 'giant_clam', count: 2 }
];
const STUB_INFO = {
  clownfish: ['fish', 'pair', 0.09, [1, 15], null], magnificent_anemone: ['invertebrate', 'sessile', 0.6, [1, 20], null],
  blue_tang: ['fish', 'school', 0.25, [2, 25], [6, 16]], brain_coral: ['coral', 'sessile', 1.0, [1, 25], null],
  staghorn_coral: ['coral', 'sessile', 1.2, [1, 20], null], giant_moray: ['fish', 'crevice', 2.2, [1, 30], null],
  green_turtle: ['reptile', 'solitary', 1.0, [1, 30], null], reef_manta: ['fish', 'solitary', 3.5, [1, 40], null],
  whitetip_reef_shark: ['fish', 'solitary', 1.6, [2, 40], null], bluespotted_stingray: ['fish', 'bottom', 0.7, [1, 25], null],
  parrotfish: ['fish', 'solitary', 0.45, [1, 25], null], sea_fan: ['invertebrate', 'sessile', 1.0, [4, 40], null],
  barrel_sponge: ['invertebrate', 'sessile', 1.0, [6, 40], null], cleaner_wrasse: ['fish', 'hover', 0.1, [1, 30], null],
  lionfish: ['fish', 'hover', 0.32, [2, 30], null], anthias: ['fish', 'school', 0.1, [3, 30], [18, 44]],
  giant_clam: ['invertebrate', 'sessile', 0.9, [1, 20], null], reef_star: ['structure', 'sessile', 1.0, [1, 20], null],
  reef_ball: ['structure', 'sessile', 1.2, [1, 30], null], coral_tree_nursery: ['structure', 'sessile', 2.6, [3, 20], null]
};

function stubSpecies(log) {
  function info(id) {
    const r = STUB_INFO[id]; if (!r) return null;
    return { id, group: r[0], habit: r[1], lengthM: r[2], depthM: r[3].slice(), schoolSize: r[4] ? r[4].slice() : null };
  }
  function body(T, id, length) {
    const root = new T.Group(), geometry = new T.SphereGeometry(Math.max(0.02, length / 2), 8, 6), material = new T.MeshStandardMaterial({ color: 0xff8844 });
    const mesh = new T.Mesh(geometry, material);
    root.userData.speciesId = id; mesh.userData.speciesId = id; root.add(mesh);
    return { root, mesh, geometry, material };
  }
  return {
    version: '1.0.0', ids: Object.keys(STUB_INFO), info,
    create(T, id, opts) {
      const i = info(id); if (!i) throw new Error('unknown species ' + id);
      log.push({ kind: 'create', id, opts: { ...opts } });
      const b = body(T, id, i.lengthM);
      if (i.group === 'coral' || i.group === 'structure') b.mesh.position.y = i.lengthM / 2;
      return { root: b.root, radius: i.lengthM / 2, update(dt, t, motion) { b.mesh.rotation.y = 0.1 * Math.sin(t); if (motion) b.root.userData.motion = { speed: motion.speed, turn: motion.turn, current: { ...motion.current } }; }, dispose() { b.geometry.dispose(); b.material.dispose(); } };
    },
    createSchool(T, id, count, opts) {
      const i = info(id); log.push({ kind: 'school', id, count, opts: { ...opts } });
      const root = new T.Group(), geometry = new T.SphereGeometry(i.lengthM / 2, 6, 4), material = new T.MeshStandardMaterial();
      root.userData.speciesId = id;
      for (let k = 0; k < count; k++) { const m = new T.Mesh(geometry, material); m.position.set((k % 5) * 0.2 - 0.4, Math.floor(k / 5) * 0.15, (k % 3) * 0.2); m.userData.speciesId = id; root.add(m); }
      return { root, radius: 0.6, update(dt, t, motion) { if (motion) root.userData.motion = { speed: motion.speed, turn: motion.turn, current: { ...motion.current } }; }, dispose() { geometry.dispose(); material.dispose(); } };
    }
  };
}
function trackingThree() {
  const created = [], disposed = new Set();
  const T = { ...THREE };
  for (const [name, value] of Object.entries(THREE)) {
    if (typeof value !== 'function' || !value.prototype) continue;
    if (!(value.prototype.isBufferGeometry || value.prototype.isMaterial || value.prototype.isTexture)) continue;
    T[name] = class extends value {
      constructor(...args) { super(...args); created.push(this); }
      dispose() { disposed.add(this); return super.dispose(); }
    };
  }
  return { T, created, disposed };
}
function site(over = {}) {
  return { seed: 7, depthM: 9, health: { coralCover: 0.7, bleaching: 0.05, algae: 0.1 }, population: POP, restoration: { kind: 'reef_star', units: 10, yearsSince: 2 }, ...over };
}

const cleanups = [];
afterEach(() => { while (cleanups.length) cleanups.pop()(); });

function runtime(options = {}, { species = true, windowExtras = {} } = {}) {
  const frames = new Map(), timers = new Map(), counts = { render: 0, dispose: 0, forceContextLoss: 0 }, log = [], warnings = [];
  const listenerLog = { canvas: new Map(), document: [], window: [] };
  let serial = 0, timerSerial = 0, clock = 1000, renderer = null;
  class Renderer {
    constructor(params) { renderer = this; this.params = params; this.shadowMap = {}; this.info = { render: { calls: 7, triangles: 1234 } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; }
    setPixelRatio(ratio) { this.pixelRatio = ratio; } setSize(w, h) { this.size = [w, h]; }
    render(scene, camera) { counts.render++; this.scene = scene; this.camera = camera; }
    dispose() { counts.dispose++; } forceContextLoss() { counts.forceContextLoss++; }
  }
  const observers = [];
  class FakeResizeObserver { constructor(cb) { this.cb = cb; observers.push(this); } observe(el) { this.target = el; } disconnect() { this.disconnected = true; } }
  const local = {
    innerWidth: 1280, devicePixelRatio: 2, console: { warn(m) { warnings.push(String(m)); }, error() {} },
    requestAnimationFrame(cb) { const id = ++serial; frames.set(id, cb); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    performance: { now: () => clock },
    setTimeout(fn, ms) { const id = ++timerSerial; timers.set(id, { fn, at: clock + ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    ResizeObserver: FakeResizeObserver,
    addEventListener(type, fn, o) { listenerLog.window.push(['add', type]); window.addEventListener(type, fn, o); },
    removeEventListener(type, fn, o) { listenerLog.window.push(['remove', type]); window.removeEventListener(type, fn, o); },
    ...windowExtras
  };
  // The engine must never read a global THREE.
  Object.defineProperty(local, 'THREE', { get() { throw new Error('Reef3DExplore read a global THREE'); } });
  new Function('window', SOURCE)(local);
  const T0 = options.THREE || THREE;
  if (species === 'real') new Function('window', readFileSync(SPECIES_FILE, 'utf8'))(local);
  else if (species) local.Reef3DSpecies = stubSpecies(log);
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  const add = canvas.addEventListener.bind(canvas), remove = canvas.removeEventListener.bind(canvas);
  canvas.addEventListener = (type, fn, o) => { listenerLog.canvas.set(fn, type); add(type, fn, o); };
  canvas.removeEventListener = (type, fn, o) => { listenerLog.canvas.delete(fn); remove(type, fn, o); };
  const docAdd = document.addEventListener, docRemove = document.removeEventListener;
  document.addEventListener = function (type, fn, o) { listenerLog.document.push(['add', type]); return docAdd.call(this, type, fn, o); };
  document.removeEventListener = function (type, fn, o) { listenerLog.document.push(['remove', type]); return docRemove.call(this, type, fn, o); };
  document.body.appendChild(canvas);
  cleanups.push(() => { document.addEventListener = docAdd; document.removeEventListener = docRemove; });
  const states = [], errors = [];
  const controller = local.Reef3DExplore.mount(canvas, { quality: 'low', site: site(), onState: (s) => states.push(s), onError: (e) => errors.push(e), ...options, THREE: { ...T0, WebGLRenderer: Renderer } });
  const t = {
    local, canvas, controller, frames, states, errors, counts, observers, listenerLog, log, warnings,
    get renderer() { return renderer; },
    get scene() { return renderer.scene; },
    get clock() { return clock; },
    step(ms = 50) {
      clock += ms;
      for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
      const queued = [...frames.values()]; frames.clear(); queued.forEach((cb) => cb(clock));
    },
    run(seconds) { for (let i = 0; i < seconds * 20; i++) t.step(50); },
    key(target, key, extra = {}) { const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }); target.dispatchEvent(e); return e; },
    keyUp(target, key) { const e = new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }); target.dispatchEvent(e); return e; },
    pointer(type, x, y) { const e = new MouseEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true }); canvas.dispatchEvent(e); return e; }
  };
  cleanups.push(() => { try { controller.dispose(); } catch (ignore) {} canvas.remove(); });
  return t;
}

// Every organism once: roots carry userData.exploreUid, instanced groups list theirs.
function census(t) {
  const out = new Map(), m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  t.scene.traverse((o) => {
    if (o.userData && o.userData.exploreUid) out.set(o.userData.exploreUid, { uid: o.userData.exploreUid, speciesId: o.userData.speciesId, pos: o.position.toArray(), object: o });
    // Instanced groups keep every member's matrix; the drawn instances are refilled by distance.
    if (o.isInstancedMesh && o.userData.exploreUids) o.userData.exploreUids.forEach((uid, i) => {
      if (out.has(uid)) return;
      m.fromArray(o.userData.exploreMatrices, i * 16); m.decompose(p, q, s); out.set(uid, { uid, speciesId: o.userData.speciesId, pos: p.toArray(), instanced: true, mesh: o });
    });
  });
  return [...out.values()].sort((a, b) => Number(a.uid.slice(1)) - Number(b.uid.slice(1)));
}
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const fingerprint = (t) => census(t).map((o) => o.uid + ':' + o.speciesId + ':' + o.pos.map(r4).join(',')).join('|');
// Every decorative item placed (whatever is drawn right now), by kind.
function decor(t) {
  const kinds = {};
  t.scene.traverse((o) => { if (o.isInstancedMesh && o.userData.decorative && o.userData.lod === 'near') kinds[o.userData.kind] = (kinds[o.userData.kind] || 0) + o.userData.instances; });
  return kinds;
}
// What is drawn this frame: near and far instances.
function drawn(t) {
  let near = 0, far = 0;
  t.scene.traverse((o) => { if (o.isInstancedMesh && o.userData.decorative && o.visible) { if (o.userData.lod === 'near') near += o.count; else far += o.count; } });
  return { near, far, total: near + far };
}
const CORAL_KINDS = ['finger', 'antler', 'corym', 'massive', 'plate', 'encrust'];
function coralColours(t) {
  const out = [];
  t.scene.traverse((o) => {
    if (!o.isInstancedMesh || !o.userData.decorative || !CORAL_KINDS.includes(o.userData.kind) || !o.instanceColor || !o.visible) return;
    const a = o.instanceColor.array; for (let i = 0; i < o.count; i++) out.push([a[i * 3], a[i * 3 + 1], a[i * 3 + 2]]);
  });
  return out;
}
const saturation = (c) => { const hi = Math.max(...c), lo = Math.min(...c); return hi > 0 ? (hi - lo) / hi : 0; };
const mean = (list) => list.reduce((s, v) => s + v, 0) / Math.max(1, list.length);
function floorBelow(t, x, z) {
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 5, z), new THREE.Vector3(0, -1, 0));
  const hits = ray.intersectObjects([t.scene.getObjectByName('reef-explore-floor'), t.scene.getObjectByName('reef-explore-bommies')], false);
  return hits.length ? hits[0].point.y : -Infinity;
}
const bearingDeg = (dx, dz) => ((Math.atan2(dx, -dz) * 180 / Math.PI) % 360 + 360) % 360;
const angleGap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

describe('Reef3DExplore contract', () => {
  it('registers only window.Reef3DExplore 1.0.0 and refuses to mount without THREE', () => {
    const bare = {};
    new Function('window', SOURCE)(bare);
    expect(Object.keys(bare)).toEqual(['Reef3DExplore']);
    expect(Object.keys(bare.Reef3DExplore).sort()).toEqual(['mount', 'version']);
    expect(bare.Reef3DExplore.version).toBe('1.0.0');
    expect(() => bare.Reef3DExplore.mount(document.createElement('canvas'), { site: site() })).toThrow(/THREE/);
    expect(() => bare.Reef3DExplore.mount(null, { THREE })).toThrow(/canvas/);
  });

  it('mounts with the house renderer settings, builds the reef and reports the contract state', () => {
    const t = runtime();
    expect(Object.keys(t.controller).sort()).toEqual(CONTROLLER_KEYS);
    expect(t.counts.render).toBeGreaterThan(0);
    expect(t.renderer.toneMapping).toBe(THREE.ACESFilmicToneMapping);
    expect(t.renderer.outputEncoding).toBe(THREE.sRGBEncoding);
    expect(t.renderer.pixelRatio).toBe(1);
    expect(t.renderer.shadowMap.enabled).toBe(false);
    expect(t.renderer.size).toEqual([800, 500]);
    for (const name of ['reef-explore-floor', 'reef-explore-bommies', 'reef-explore-organisms', 'reef-explore-diver', 'reef-explore-bubbles', 'reef-explore-motes', 'reef-explore-surface', 'reef-explore-focus', 'reef-explore-mask'])
      expect(t.scene.getObjectByName(name), name).toBeTruthy();
    expect(t.scene.fog.isFogExp2).toBe(true);
    expect(t.canvas.tabIndex).toBe(0);
    const s = t.controller.getState();
    expect(Object.keys(s).sort()).toEqual(STATE_KEYS);
    expect(s).toMatchObject({ ready: true, paused: false, view: 'third', quality: 'low', reducedMotion: false, focused: null, drawCalls: 7, triangles: 1234 });
    expect(Object.keys(s.diver).sort()).toEqual(['depthM', 'headingDeg', 'x', 'y', 'z']);
    expect(s.diver.depthM).toBeCloseTo(-s.diver.y, 1);
    expect(s.diver.depthM).toBeGreaterThan(3);
    expect(Array.isArray(s.nearby)).toBe(true);
    expect(s.nearby.length).toBeLessThanOrEqual(12);
    s.nearby.forEach((n) => { expect(Object.keys(n).sort()).toEqual(['distanceM', 'inView', 'speciesId', 'uid']); expect(n.distanceM).toBeLessThanOrEqual(8); });
    for (let i = 1; i < s.nearby.length; i++) expect(s.nearby[i].distanceM).toBeGreaterThanOrEqual(s.nearby[i - 1].distanceM);
    expect(t.states.length).toBeGreaterThan(0);
    const high = runtime({ quality: 'high' });
    expect(high.renderer.pixelRatio).toBeLessThanOrEqual(1.75);
    expect(high.renderer.shadowMap.enabled).toBe(true);
    expect(runtime({ quality: undefined }, { windowExtras: { navigator: { hardwareConcurrency: 4 } } }).controller.getState().quality).toBe('low');
  });

  it('keeps water and contact effects tied to the rendered camera instead of the world origin', () => {
    const t = runtime();
    const effects = ['reef-explore-surface', 'reef-explore-shaft', 'reef-explore-motes', 'reef-explore-contact-shade'].map((name) => {
      const object = t.scene.getObjectByName(name);
      expect(object, name).toBeTruthy();
      const library = object.isPoints ? THREE.ShaderLib.points : THREE.ShaderLib.basic;
      const shader = { uniforms: {}, vertexShader: library.vertexShader, fragmentShader: library.fragmentShader };
      object.material.onBeforeCompile(shader, t.renderer);
      expect(shader.uniforms.reefWaterEye, name).toBeDefined();
      // r128 leaves its built-in cameraPosition unset on Basic/Points materials
      // without an envMap. No injected water calculation may depend on it.
      expect(shader.vertexShader + shader.fragmentShader, name).not.toMatch(/\bcameraPosition\b/);
      return { object, shader };
    });
    const eye = effects[0].shader.uniforms.reefWaterEye;
    effects.forEach(({ shader }) => expect(shader.uniforms.reefWaterEye).toBe(eye));
    const rig = new THREE.Group(), camera = new THREE.PerspectiveCamera(55, 1.6, 0.1, 60);
    rig.add(camera);
    for (const pose of [[8, -6, 11], [-13, -15, 4]]) {
      rig.position.set(pose[0], -2, pose[2]); camera.position.set(0.7, pose[1], -1.4);
      rig.updateMatrixWorld(true);
      const expected = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
      effects.forEach(({ object, shader }) => {
        // Exercise each effect independently, including when a camera rig adds
        // a world transform that differs from camera.position.
        eye.value.set(0, 0, 0);
        object.onBeforeRender(t.renderer, t.scene, camera);
        expect(shader.uniforms.reefWaterEye.value.toArray(), object.name).toEqual(expected.toArray());
        if (object.isPoints) expect(shader.uniforms.reefSnowCenter.value.toArray()).toEqual(expected.toArray());
      });
    }
  });

  it('holds sun shaft openings in the world while the camera swims and turns', () => {
    for (const quality of ['low', 'high']) {
      const t = runtime({ quality, view: 'first' });
      const beams = [];
      t.scene.traverse((o) => { if (o.name === 'reef-explore-shaft') beams.push(o); });
      expect(beams).toHaveLength(quality === 'high' ? 8 : 4);
      const sun = t.scene.getObjectByName('reef-explore-sun'), cam = t.renderer.camera;
      function openings() {
        t.scene.updateMatrixWorld(true); cam.updateMatrixWorld(true);
        const lightDirection = sun.getWorldPosition(new THREE.Vector3()).sub(sun.target.getWorldPosition(new THREE.Vector3())).normalize();
        return beams.map((beam) => {
          expect(beam.geometry.attributes.position.count).toBe(4);
          expect(beam.geometry.index.count).toBe(6);
          beam.onBeforeRender(t.renderer, t.scene, cam);
          beam.geometry.computeBoundingBox();
          const top = new THREE.Vector3(0, beam.geometry.boundingBox.max.y, 0).applyMatrix4(beam.matrixWorld);
          const bottom = new THREE.Vector3(0, beam.geometry.boundingBox.min.y, 0).applyMatrix4(beam.matrixWorld);
          expect(top.y, quality + ' surface opening').toBeCloseTo(0, 9);
          expect(top.clone().sub(bottom).normalize().cross(lightDirection).length(), quality + ' shared sunlight direction').toBeLessThan(1e-7);
          return top;
        });
      }
      const fixed = openings(), initialEye = cam.position.clone();
      t.controller.setInput({ forward: 1, turn: 0.2, rise: 0.2 });
      for (const seconds of [0.3, 0.4]) {
        t.run(seconds);
        expect(cam.position.distanceTo(initialEye), 'camera actually translated').toBeGreaterThan(0.01);
        openings().forEach((top, i) => expect(top.distanceTo(fixed[i]), quality + ' stationary opening ' + i).toBeLessThan(1e-7));
      }
      t.controller.setPaused(true);
      const pausedOpacity = beams.map((beam) => beam.material.opacity);
      t.run(0.5);
      openings().forEach((top, i) => expect(top.distanceTo(fixed[i])).toBeLessThan(1e-7));
      expect(beams.map((beam) => beam.material.opacity)).toEqual(pausedOpacity);
    }
  });

  it('keeps uids opaque: they never carry the species name', () => {
    const t = runtime();
    census(t).forEach((o) => { expect(o.uid).toMatch(/^r\d+$/); expect(o.uid.includes(o.speciesId)).toBe(false); });
  });
});

describe('Reef3DExplore placement', () => {
  it('places exactly the requested population, schools as one object each, and the restoration units', () => {
    const t = runtime(), all = census(t), count = {};
    all.forEach((o) => { count[o.speciesId] = (count[o.speciesId] || 0) + 1; });
    POP.forEach((p) => expect(count[p.id], p.id).toBe(p.count));
    expect(count.reef_star).toBe(10);
    expect(all.length).toBe(POP.reduce((s, p) => s + p.count, 0) + 10);
    const schools = t.log.filter((e) => e.kind === 'school');
    expect(schools.filter((e) => e.id === 'blue_tang')).toHaveLength(2);
    expect(schools.filter((e) => e.id === 'anthias')).toHaveLength(2);
    schools.forEach((e) => { const [lo, hi] = STUB_INFO[e.id][4]; expect(e.count).toBeGreaterThanOrEqual(lo); expect(e.count).toBeLessThanOrEqual(hi); });
    // Corals and structures share GPU buffers: one InstancedMesh per prototype mesh.
    const brain = all.filter((o) => o.speciesId === 'brain_coral');
    expect(brain.every((o) => o.instanced)).toBe(true);
    let tagged = 0;
    t.scene.traverse((o) => { if (o.isMesh && o.parent && o.parent.userData.exploreUid) { expect(o.userData.speciesId).toBe(o.parent.userData.speciesId); tagged++; } });
    expect(tagged).toBeGreaterThan(10);
    // Every option the species module needs is passed through.
    const create = t.log.find((e) => e.kind === 'create' && e.id === 'parrotfish');
    expect(Object.keys(create.opts).sort()).toEqual(['derivatives', 'growth', 'health', 'quality', 'reducedMotion', 'seed']);
    expect(create.opts.derivatives).toBe(true);
    expect(create.opts.quality).toBe('low');
  });

  it('falls back to tagged placeholders when Reef3DSpecies is absent, with the same counts', () => {
    const t = runtime({}, { species: false }), all = census(t), count = {};
    all.forEach((o) => { count[o.speciesId] = (count[o.speciesId] || 0) + 1; });
    POP.forEach((p) => expect(count[p.id], p.id).toBe(p.count));
    let meshes = 0;
    t.scene.getObjectByName('reef-explore-organisms').traverse((o) => { if (o.isMesh) { expect(typeof o.userData.speciesId).toBe('string'); meshes++; } });
    expect(meshes).toBeGreaterThan(20);
  });

  it('places identically for the same seed and differently for another seed', () => {
    const a = runtime(), b = runtime(), c = runtime({ site: site({ seed: 8 }) });
    expect(fingerprint(a)).toBe(fingerprint(b));
    expect(fingerprint(c)).not.toBe(fingerprint(a));
    expect(decor(a)).toEqual(decor(b));
  });

  it('draws fewer decorative instances on the low tier but places and moves the same organisms', () => {
    const low = runtime({ quality: 'low' }), high = runtime({ quality: 'high' });
    expect(fingerprint(low)).toBe(fingerprint(high));
    const dl = Object.values(decor(low)).reduce((s, v) => s + v, 0), dh = Object.values(decor(high)).reduce((s, v) => s + v, 0);
    expect(dl).toBeLessThan(dh * 0.85);
    low.run(3); high.run(3);
    expect(fingerprint(low)).toBe(fingerprint(high));
  });

  it('does not let reduced motion move the placement, and slows the loops', () => {
    const calm = runtime({ reducedMotion: true }), normal = runtime();
    expect(fingerprint(calm)).toBe(fingerprint(normal));
    const startC = census(calm).filter((o) => o.speciesId === 'parrotfish').map((o) => new THREE.Vector3(...o.pos));
    const startN = census(normal).filter((o) => o.speciesId === 'parrotfish').map((o) => new THREE.Vector3(...o.pos));
    calm.run(2); normal.run(2);
    const moved = (t, start) => mean(census(t).filter((o) => o.speciesId === 'parrotfish').map((o, i) => new THREE.Vector3(...o.pos).distanceTo(start[i])));
    const mc = moved(calm, startC), mn = moved(normal, startN);
    expect(mc).toBeGreaterThan(0.01);
    expect(mc).toBeLessThan(mn * 0.7);
    expect(calm.controller.getState().reducedMotion).toBe(true);
  });
});

describe('Reef3DExplore living motion', () => {
  it('routes a tall school through water deep enough for every member to stay submerged', () => {
    const school = stubSpecies([]);
    school.info = () => ({ id: 'blue_tang', group: 'fish', habit: 'school', lengthM: 1.2, depthM: [1, 25], schoolSize: [30, 30], origin: 'centre' });
    school.createSchool = (T) => {
      const root = new T.Group(), geometry = new T.SphereGeometry(0.18, 6, 4), material = new T.MeshStandardMaterial();
      const mesh = new T.InstancedMesh(geometry, material, 30), m = new T.Matrix4();
      for (let i = 0; i < 30; i++) mesh.setMatrixAt(i, m.makeTranslation((i % 5 - 2) * 0.6, (Math.floor(i / 5) % 3 - 1) * 0.65, (Math.floor(i / 15) - 0.5) * 0.8));
      root.add(mesh); return { root, radius: 2.6, update() {}, dispose() { geometry.dispose(); material.dispose(); } };
    };
    const t = runtime({ site: site({ seed: 7, depthM: 5, population: [{ id: 'blue_tang', count: 2 }], restoration: null }) }, { species: false, windowExtras: { Reef3DSpecies: school } });
    const schools = census(t), local = new THREE.Matrix4(), world = new THREE.Matrix4(), p = new THREE.Vector3();
    for (let second = 0; second < 60; second++) {
      t.run(1);
      for (const o of schools) {
        o.object.updateMatrixWorld(true); const mesh = o.object.children[0];
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, local); world.multiplyMatrices(mesh.matrixWorld, local); p.setFromMatrixPosition(world);
          expect(p.y + 0.18, 'upper fish remains below water').toBeLessThan(-0.1);
        }
        const c = o.object.position;
        expect(c.y, 'route remains above terrain').toBeGreaterThan(floorBelow(t, c.x, c.z) + 0.6);
      }
    }
    expect(t.errors).toEqual([]);
  });

  it('keeps swimming trajectories clear of the reef and reports bounded swimming effort', () => {
    const t = runtime(), swimmers = census(t).filter((o) => ['parrotfish', 'green_turtle', 'reef_manta', 'whitetip_reef_shark', 'anthias'].includes(o.speciesId));
    let efforts = 0;
    for (let second = 0; second < 35; second++) {
      t.run(1);
      for (const o of swimmers) {
        const p = o.object.position;
        expect(p.toArray().every(Number.isFinite), o.speciesId).toBe(true);
        expect(p.y, o.speciesId + ' floor clearance').toBeGreaterThan(floorBelow(t, p.x, p.z) + 0.05);
        expect(p.y).toBeLessThan(-0.4);
        const motion = o.object.userData.motion;
        if (!motion) continue;
        efforts++;
        expect(Number.isFinite(motion.speed) && Number.isFinite(motion.turn)).toBe(true);
        expect(motion.speed).toBeGreaterThanOrEqual(0);
        expect(motion.speed).toBeLessThan(2.5);
        expect(Math.abs(motion.turn)).toBeLessThan(2);
        expect(motion.current.x).toBeGreaterThan(0.015);
        expect(motion.current.z).toBeGreaterThan(0.008);
        expect(motion.current.strength).toBeGreaterThan(0.1);
        expect(motion.current.strength).toBeLessThanOrEqual(1);
      }
    }
    expect(efforts).toBeGreaterThan(10);
    expect(t.errors).toEqual([]);
  });

  it('glides turtles over reef transitions without vertical teleports', () => {
    const t = runtime(); t.run(1);
    const turtles = census(t).filter((o) => o.speciesId === 'green_turtle').map((o) => o.object);
    expect(turtles.length).toBeGreaterThan(0);
    const previous = turtles.map((o) => o.position.y);
    let largestStep = 0, travel = 0;
    for (let frame = 0; frame < 1200; frame++) {
      t.step(50);
      turtles.forEach((o, i) => {
        const step = Math.abs(o.position.y - previous[i]);
        largestStep = Math.max(largestStep, step); travel += step; previous[i] = o.position.y;
      });
    }
    expect(travel, 'turtles actively change depth').toBeGreaterThan(0.5);
    expect(largestStep, 'no abrupt height step at a collision-grid boundary').toBeLessThan(0.12);
    expect(t.errors).toEqual([]);
  });

  it('keeps the same cruise route at different frame rates and freezes creatures when paused', () => {
    const a = runtime(), b = runtime(); a.step(0); b.step(0);
    a.run(6); for (let k = 0; k < 360; k++) b.step(1000 / 60);
    const aa = census(a), bb = census(b);
    aa.forEach((o, i) => {
      expect(Math.hypot(o.pos[0] - bb[i].pos[0], o.pos[2] - bb[i].pos[2]), o.speciesId).toBeLessThan(0.001);
      expect(Math.abs(o.pos[1] - bb[i].pos[1]), o.speciesId).toBeLessThan(0.1);
    });
    a.controller.setPaused(true); a.run(2);
    const before = census(a).filter((o) => o.object).map((o) => ({ p: o.object.position.toArray(), q: o.object.quaternion.toArray(), motion: JSON.stringify(o.object.userData.motion) }));
    a.run(3);
    const after = census(a).filter((o) => o.object).map((o) => ({ p: o.object.position.toArray(), q: o.object.quaternion.toArray(), motion: JSON.stringify(o.object.userData.motion) }));
    expect(after).toEqual(before);
  });
});

describe('Reef3DExplore diver controls', () => {
  it('moves, turns and rises with keys on the canvas, and eases instead of stopping dead', () => {
    const t = runtime(), c = t.canvas, s0 = t.controller.getState().diver;
    expect(t.key(c, 'w').defaultPrevented).toBe(true);
    t.run(2);
    const s1 = t.controller.getState().diver, dist = Math.hypot(s1.x - s0.x, s1.z - s0.z);
    expect(dist).toBeGreaterThan(0.8);
    expect(angleGap(bearingDeg(s1.x - s0.x, s1.z - s0.z), s0.headingDeg)).toBeLessThan(15);
    t.keyUp(c, 'w'); t.step(); t.step();
    const s2 = t.controller.getState().diver; t.step();
    const s3 = t.controller.getState().diver;
    expect(Math.hypot(s3.x - s2.x, s3.z - s2.z), 'still gliding after release').toBeGreaterThan(0.01);
    t.run(6);
    const s4 = t.controller.getState().diver; t.run(1);
    const s5 = t.controller.getState().diver;
    expect(Math.hypot(s5.x - s4.x, s5.z - s4.z), 'settles').toBeLessThan(0.05);
    const h0 = s5.headingDeg;
    expect(t.key(c, 'ArrowRight').defaultPrevented).toBe(true); t.run(1); t.keyUp(c, 'ArrowRight'); t.run(1);
    expect(angleGap(t.controller.getState().diver.headingDeg, h0)).toBeGreaterThan(20);
    const h1 = t.controller.getState().diver.headingDeg;
    t.key(c, 'a'); t.run(1); t.keyUp(c, 'a'); t.run(1);
    expect(angleGap(t.controller.getState().diver.headingDeg, h1)).toBeGreaterThan(20);
    const y0 = t.controller.getState().diver.y;
    t.key(c, 'PageUp'); t.run(1.5); t.keyUp(c, 'PageUp');
    expect(t.controller.getState().diver.y).toBeGreaterThan(y0 + 0.4);
    const y1 = t.controller.getState().diver.y;
    t.key(c, 'f'); t.run(1); t.keyUp(c, 'f'); t.run(1);
    expect(t.controller.getState().diver.y).toBeLessThan(y1 - 0.3);
    const back0 = t.controller.getState().diver;
    t.key(c, 'ArrowDown'); t.run(2); t.keyUp(c, 'ArrowDown');
    const back1 = t.controller.getState().diver;
    expect(angleGap(bearingDeg(back1.x - back0.x, back1.z - back0.z), back0.headingDeg)).toBeGreaterThan(150);
  });

  it('leaves Tab alone, pauses on Space and ignores window and document keys entirely', () => {
    const t = runtime(), c = t.canvas;
    expect(t.key(c, 'Tab').defaultPrevented).toBe(false);
    expect(t.key(c, 'Tab', { shiftKey: true }).defaultPrevented).toBe(false);
    expect(t.key(c, 'x').defaultPrevented).toBe(false);
    expect(t.key(c, 'Enter').defaultPrevented, 'Enter without a focus is not ours').toBe(false);
    const before = t.controller.getState().diver;
    for (const k of ['w', 'ArrowUp', 'r', 'PageUp', 'd', ' ']) { t.key(window, k); t.key(document, k); }
    t.run(2);
    const after = t.controller.getState();
    expect(after.paused).toBe(false);
    expect(Math.hypot(after.diver.x - before.x, after.diver.z - before.z)).toBeLessThan(0.01);
    expect(t.listenerLog.window.filter(([, type]) => type === 'keydown' || type === 'keyup')).toEqual([]);
    expect(t.listenerLog.document.filter(([, type]) => type === 'keydown' || type === 'keyup')).toEqual([]);
    expect([...t.listenerLog.canvas.values()].filter((type) => type === 'keydown')).toHaveLength(1);
    expect(t.key(c, ' ').defaultPrevented).toBe(true);
    expect(t.controller.getState().paused).toBe(true);
    t.key(c, 'w'); t.run(1);
    expect(t.controller.getState().diver).toEqual(after.diver);
    t.keyUp(c, 'w'); t.key(c, ' ');
    expect(t.controller.getState().paused).toBe(false);
  });

  it('moves the diver with setInput over frames, holding the input until it changes', () => {
    const t = runtime(), s0 = t.controller.getState().diver;
    t.controller.setInput({ forward: 1 });
    t.run(1); const s1 = t.controller.getState().diver;
    t.run(1); const s2 = t.controller.getState().diver;
    const d1 = Math.hypot(s1.x - s0.x, s1.z - s0.z), d2 = Math.hypot(s2.x - s1.x, s2.z - s1.z);
    expect(d1).toBeGreaterThan(0.3);
    expect(d2).toBeGreaterThan(d1 * 0.9);
    t.controller.setInput({ turn: 1 });
    t.run(1);
    expect(angleGap(t.controller.getState().diver.headingDeg, s2.headingDeg)).toBeGreaterThan(20);
    t.controller.setInput({ forward: 0, turn: 0, rise: 1 });
    const y = t.controller.getState().diver.y; t.run(1.5);
    expect(t.controller.getState().diver.y).toBeGreaterThan(y + 0.3);
    t.controller.setInput(null);
    t.run(5); const a = t.controller.getState().diver; t.run(1); const b = t.controller.getState().diver;
    expect(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)).toBeLessThan(0.05);
  });

  it('never lets the diver go below the floor or the reef, or leave the world', () => {
    const t = runtime();
    t.controller.setInput({ forward: 1, rise: -1, turn: 0.02 });
    let turnedBack = false;
    for (let i = 0; i < 2400; i++) {
      t.step(50);
      if (i % 10) continue;
      const d = t.controller.getState().diver;
      expect(Math.abs(d.x), 'inside x').toBeLessThanOrEqual(29.5);
      expect(Math.abs(d.z), 'inside z').toBeLessThanOrEqual(29.5);
      expect(d.y, `above the floor at ${d.x},${d.z}`).toBeGreaterThan(floorBelow(t, d.x, d.z) + 0.35);
      expect(d.y).toBeLessThanOrEqual(-0.9);
      if (Math.max(Math.abs(d.x), Math.abs(d.z)) > 25.5) turnedBack = true;
    }
    expect(turnedBack, 'reached the soft edge').toBe(true);
    // Straight at the edge: the soft boundary turns the diver back toward the reef.
    const u = runtime();
    u.controller.setInput({ forward: 1 });
    let maxEdge = 0;
    for (let i = 0; i < 1200; i++) { u.step(50); const d = u.controller.getState().diver; maxEdge = Math.max(maxEdge, Math.abs(d.x), Math.abs(d.z)); }
    expect(maxEdge).toBeLessThanOrEqual(29.5);
    const d = u.controller.getState().diver;
    expect(Math.max(Math.abs(d.x), Math.abs(d.z))).toBeLessThan(29.4);
  });

  it('settles at a comfortable clearance when sinking onto the reef, not scraping it', () => {
    const t = runtime();
    for (const target of ['brain_coral', 'giant_clam']) {
      const o = census(t).find((c) => c.speciesId === target);
      t.controller.swimTo(o.uid); t.run(20);
      t.controller.setInput({ rise: -1 }); t.run(6);
      const d = t.controller.getState().diver;
      expect(d.y - floorBelow(t, d.x, d.z), target).toBeGreaterThan(0.6);
      t.controller.setInput(null);
    }
  });
});

describe('Reef3DExplore diver rig', () => {
  const pose = (diver) => {
    const out = [];
    diver.traverse((o) => {
      out.push(...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray());
      if (o.isMesh && /diver-fin-/.test(o.name)) out.push(...o.geometry.attributes.position.array);
    });
    return out;
  };

  it('keeps the detailed diver finite and compact, articulates the fins, and freezes the complete pose on pause', () => {
    const t = runtime(), diver = t.scene.getObjectByName('reef-explore-diver'), fins = [];
    let triangles = 0, meshes = 0;
    diver.traverse((o) => {
      if (!o.isMesh) return;
      meshes++;
      triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
      for (const attribute of Object.values(o.geometry.attributes))
        expect(Array.from(attribute.array).every(Number.isFinite), o.name + ' finite attributes').toBe(true);
      if (/diver-fin-/.test(o.name)) fins.push(o);
    });
    expect(meshes).toBeLessThanOrEqual(20);
    expect(triangles).toBeLessThan(15000);
    expect(fins).toHaveLength(2);
    const blade0 = fins.map((f) => Array.from(f.geometry.attributes.position.array));
    const attachment0 = fins.map((f) => f.parent.position.toArray());
    t.controller.setInput({ forward: 1, turn: 0.6, rise: 0.2 }); t.run(1.3);
    fins.forEach((fin, i) => {
      expect(Array.from(fin.geometry.attributes.position.array)).not.toEqual(blade0[i]);
      expect(fin.parent.position.toArray()).toEqual(attachment0[i]);
      expect(Array.from(fin.geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
    });
    const beforePause = pose(diver);
    t.controller.setPaused(true); t.run(2);
    expect(pose(diver)).toEqual(beforePause);
    expect(t.errors).toEqual([]);
  });

  it('keeps reduced-motion idle trim still, while allowing the diver to swim', () => {
    const t = runtime({ reducedMotion: true }), diver = t.scene.getObjectByName('reef-explore-diver');
    const rest = pose(diver);
    t.run(3);
    expect(pose(diver)).toEqual(rest);
    t.controller.setInput({ forward: 1 }); t.run(1.5);
    expect(pose(diver)).not.toEqual(rest);
    t.controller.setPaused(true); const stopped = pose(diver); t.run(1);
    expect(pose(diver)).toEqual(stopped);
  });
});

describe('Reef3DExplore focus, swimTo and picking', () => {
  it('cycles focus nearest-first through what lies near and in front, and focus/clearFocus work', () => {
    const t = runtime({ reducedMotion: true });
    // Beside an anemone with its clownfish there is plenty to cycle through.
    t.controller.swimTo(census(t).find((o) => o.speciesId === 'magnificent_anemone').uid); t.run(4);
    t.controller.clearFocus(); t.controller.setPaused(true); t.step();
    const s = t.controller.getState(), front = s.nearby.filter((n) => n.inView), order = (front.length ? front : s.nearby).map((n) => n.uid);
    expect(order.length).toBeGreaterThan(2);
    const seen = [];
    for (let k = 0; k < order.length + 1; k++) seen.push(t.controller.focusNext());
    expect(seen.slice(0, order.length)).toEqual(order);
    expect(seen[order.length]).toBe(order[0]);
    expect(t.controller.getState().focused.uid).toBe(order[0]);
    expect(t.controller.focusPrevious()).toBe(order[order.length - 1]);
    t.key(t.canvas, 'n'); expect(t.controller.getState().focused.uid).toBe(order[0]);
    t.key(t.canvas, 'N', { shiftKey: true }); expect(t.controller.getState().focused.uid).toBe(order[order.length - 1]);
    const any = census(t).at(-1).uid;
    expect(t.controller.focus(any)).toBe(true);
    expect(t.controller.getState().focused).toMatchObject({ uid: any });
    t.step();
    expect(t.scene.getObjectByName('reef-explore-focus').visible).toBe(true);
    expect(t.controller.focus('nope')).toBe(false);
    expect(t.controller.getState().focused.uid).toBe(any);
    t.controller.clearFocus();
    t.step();
    expect(t.controller.getState().focused).toBeNull();
    expect(t.scene.getObjectByName('reef-explore-focus').visible).toBe(false);
  });

  it('swims to an organism, ends within a few metres facing it, and then stops', () => {
    const t = runtime();
    for (const id of ['brain_coral', 'giant_clam', 'giant_moray']) {
      const target = census(t).filter((o) => o.speciesId === id).sort((a, b) => Math.hypot(b.pos[0], b.pos[2]) - Math.hypot(a.pos[0], a.pos[2]))[0];
      expect(t.controller.swimTo(target.uid)).toBe(true);
      expect(t.controller.getState().focused.uid).toBe(target.uid);
      t.run(20);
      const s = t.controller.getState();
      expect(s.focused.distanceM, id + ' distance').toBeLessThan(4.5);
      const d = s.diver, want = bearingDeg(target.pos[0] - d.x, target.pos[2] - d.z);
      expect(angleGap(d.headingDeg, want), id + ' facing').toBeLessThan(30);
      t.run(1);
      const e = t.controller.getState().diver;
      expect(Math.hypot(e.x - d.x, e.y - d.y, e.z - d.z), id + ' stopped').toBeLessThan(0.05);
      expect(e.y).toBeGreaterThan(floorBelow(t, e.x, e.z) + 0.35);
    }
    expect(t.controller.swimTo('missing')).toBe(false);
  });

  it('cancels the glide when the student takes over, and Enter swims to the focus', () => {
    const t = runtime();
    const far = census(t).filter((o) => o.speciesId === 'brain_coral').sort((a, b) => Math.hypot(b.pos[0], b.pos[2]) - Math.hypot(a.pos[0], a.pos[2]))[0];
    t.controller.focus(far.uid);
    expect(t.key(t.canvas, 'Enter').defaultPrevented).toBe(true);
    t.run(1);
    const a = t.controller.getState().diver; t.run(0.5); const b = t.controller.getState().diver;
    expect(Math.hypot(b.x - a.x, b.z - a.z), 'gliding').toBeGreaterThan(0.1);
    t.controller.setInput({ turn: 1 }); t.run(0.5); t.controller.setInput(null); t.run(6);
    expect(t.controller.getState().focused.distanceM).toBeGreaterThan(4.5);
  });

  it('lists a restoration patch once per structure kind in nearby, so its units never crowd out animals', () => {
    const t = runtime({ site: site({ restoration: { kind: 'reef_star', units: 24, yearsSince: 3 } }) });
    const star = census(t).find((o) => o.speciesId === 'reef_star');
    t.controller.swimTo(star.uid); t.run(20);
    const units = census(t).filter((o) => o.speciesId === 'reef_star'), d = t.controller.getState().diver;
    const within = units.filter((o) => Math.hypot(o.pos[0] - d.x, o.pos[1] - d.y, o.pos[2] - d.z) < 6).length;
    expect(within, 'several units are close').toBeGreaterThan(3);
    const near = t.controller.getState().nearby;
    expect(near.filter((n) => n.speciesId === 'reef_star')).toHaveLength(1);
  });

  it('under reduced motion swimTo is a short glide', () => {
    const t = runtime({ reducedMotion: true });
    const far = census(t).filter((o) => o.speciesId === 'giant_clam')[0];
    t.controller.swimTo(far.uid); t.run(1.5);
    expect(t.controller.getState().focused.distanceM).toBeLessThan(4.5);
  });

  it('focuses an organism tapped on the canvas', () => {
    const t = runtime();
    const clam = census(t).find((o) => o.speciesId === 'giant_clam');
    t.controller.swimTo(clam.uid); t.run(20);
    t.controller.setPaused(true); t.controller.clearFocus(); t.step();
    const centre = new THREE.Box3().setFromObject(clam.object).getCenter(new THREE.Vector3());
    const cam = t.renderer.camera; cam.updateMatrixWorld();
    const ndc = centre.clone().project(cam);
    expect(Math.abs(ndc.x)).toBeLessThan(1); expect(Math.abs(ndc.y)).toBeLessThan(1);
    const x = (ndc.x + 1) / 2 * 800, y = (1 - ndc.y) / 2 * 500;
    t.pointer('pointerdown', x, y); t.pointer('pointerup', x, y);
    expect(t.controller.getState().focused && t.controller.getState().focused.uid).toBe(clam.uid);
    // A drag looks around instead of picking.
    t.controller.clearFocus();
    t.pointer('pointerdown', x, y); t.pointer('pointermove', x + 60, y); t.pointer('pointerup', x + 60, y);
    expect(t.controller.getState().focused).toBeNull();
    // Empty water picks nothing.
    t.pointer('pointerdown', 400, 5); t.pointer('pointerup', 400, 5);
    expect(t.controller.getState().focused).toBeNull();
  });

  it('calls onState when the focus changes, at most five times a second', () => {
    const t = runtime();
    t.run(0.5);
    const before = t.states.length, uid = census(t)[0].uid;
    t.controller.focus(uid); t.run(0.3);
    expect(t.states.slice(before).some((s) => s.focused && s.focused.uid === uid)).toBe(true);
    const mark = t.states.length;
    t.controller.setInput({ forward: 1, turn: 0.4 });
    t.run(3);
    const calls = t.states.length - mark;
    expect(calls).toBeLessThanOrEqual(16);
    expect(calls).toBeGreaterThanOrEqual(3);
    t.controller.setInput(null);
    t.controller.clearFocus(); t.run(0.5);
    expect(t.states.at(-1).focused).toBeNull();
    // Rapid focus changes (each one forces a call) are still capped at one call per 200 ms, and the last one arrives.
    const uids = census(t).map((o) => o.uid), burst = t.states.length;
    for (let k = 0; k < 40; k++) { t.controller.focus(uids[k % uids.length]); t.step(50); }
    t.run(0.5);
    const forced = t.states.length - burst;
    expect(forced).toBeLessThanOrEqual(12);
    expect(forced).toBeGreaterThanOrEqual(5);
    expect(t.states.at(-1).focused.uid).toBe(uids[39 % uids.length]);
    t.controller.clearFocus(); t.run(0.5);
    // Nothing meaningful changes while paused: no more calls.
    t.controller.setPaused(true); t.run(0.5); const quiet = t.states.length; t.run(2);
    expect(t.states.length).toBe(quiet);
  });
});

describe('Reef3DExplore budgets and level of detail', () => {
  const drawnPositions = (t, filter) => {
    const out = [], m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    t.scene.traverse((o) => {
      if (!o.isInstancedMesh || !o.visible || !filter(o)) return;
      for (let i = 0; i < o.count; i++) { m.fromArray(o.instanceMatrix.array, i * 16); m.decompose(p, q, s); out.push(p.clone()); }
    });
    return out;
  };
  it('draws full decor near the camera, stand-ins further out and nothing in the haze, and refills as the diver moves', () => {
    const t = runtime(), cam = t.renderer.camera;
    const near = drawnPositions(t, (o) => o.userData.decorative && o.userData.lod === 'near'), far = drawnPositions(t, (o) => o.userData.lod === 'far');
    expect(near.length).toBeGreaterThan(30);
    expect(far.length).toBeGreaterThan(30);
    near.forEach((p) => expect(p.distanceTo(cam.position)).toBeLessThan(13 + 2.5));
    far.forEach((p) => { expect(p.distanceTo(cam.position)).toBeGreaterThan(13 - 2.5); expect(p.distanceTo(cam.position)).toBeLessThan(25 + 3); });
    const total = Object.values(decor(t)).reduce((s, v) => s + v, 0);
    expect(drawn(t).total).toBeLessThan(total * 0.5);
    const before = near.map((p) => p.toArray().map(r4).join(',')).sort().join('|');
    t.controller.setInput({ forward: 1 }); t.run(8); t.controller.setInput(null); t.run(2);
    const after = drawnPositions(t, (o) => o.userData.decorative && o.userData.lod === 'near');
    after.forEach((p) => expect(p.distanceTo(cam.position)).toBeLessThan(13 + 2.5));
    expect(after.map((p) => p.toArray().map(r4).join(',')).sort().join('|')).not.toBe(before);
  });

  it('draws instanced organisms only within their draw distance', () => {
    const t = runtime(), cam = t.renderer.camera;
    let members = 0, shown = 0;
    t.scene.traverse((o) => { if (o.isInstancedMesh && o.userData.exploreUids) { members += o.userData.exploreUids.length; shown += o.visible ? o.count : 0; } });
    const groupPos = drawnPositions(t, (o) => !!o.userData.exploreUids);
    expect(shown).toBeLessThan(members);
    groupPos.forEach((p) => expect(p.distanceTo(cam.position)).toBeLessThan(24 + 2));
  });

  it('shrinks draw distances when the measured frame is over budget, and recovers when it is not', () => {
    const t = runtime();
    t.run(1);
    const base = drawn(t).total, visibleOrganisms = () => census(t).filter((o) => o.object && o.object.visible).length, orgBase = visibleOrganisms();
    t.renderer.info.render.triangles = 2000000;
    t.run(4);
    expect(drawn(t).total).toBeLessThan(base * 0.8);
    expect(visibleOrganisms()).toBeLessThanOrEqual(orgBase);
    t.renderer.info.render.triangles = 1000;
    t.run(12);
    expect(drawn(t).total).toBeGreaterThanOrEqual(base * 0.95);
    t.renderer.info.render.calls = 900;
    t.run(3);
    expect(drawn(t).total).toBeLessThan(base * 0.9);
  });
});

describe('Reef3DExplore views, health and restoration', () => {
  it('keeps first-person breathing motion gentle and reduced-motion eyes still', () => {
    const t = runtime({ view: 'first' }), cam = t.renderer.camera;
    const origin = cam.position.clone(), rotation = cam.quaternion.clone();
    let displacement = 0, angle = 0;
    for (let i = 0; i < 130; i++) {
      t.step(); displacement = Math.max(displacement, cam.position.distanceTo(origin));
      angle = Math.max(angle, cam.quaternion.angleTo(rotation));
    }
    expect(displacement).toBeGreaterThan(0.008); expect(displacement).toBeLessThan(0.055);
    expect(angle).toBeGreaterThan(0.001); expect(angle).toBeLessThan(0.025);
    const calm = runtime({ view: 'first', reducedMotion: true }), steady = calm.renderer.camera;
    const p = steady.position.toArray(), q = steady.quaternion.toArray();
    calm.run(6);
    expect(steady.position.toArray()).toEqual(p); expect(steady.quaternion.toArray()).toEqual(q);
  });

  it('holds first-person camera and breath effects exactly on pause, while allowing intentional look', () => {
    const t = runtime({ view: 'first' }), cam = t.renderer.camera, bubbles = t.scene.getObjectByName('reef-explore-bubbles');
    const mask = t.scene.getObjectByName('reef-explore-mask');
    t.controller.setInput({ forward: 0.7, turn: 0.5 }); t.run(2.5);
    t.pointer('pointerdown', 400, 250); t.pointer('pointermove', 480, 270); t.pointer('pointerup', 480, 270);
    const snapshot = () => ({ position: cam.position.toArray(), rotation: cam.quaternion.toArray(),
      bubbles: Object.fromEntries(Object.entries(bubbles.geometry.attributes).map(([key, value]) => [key, Array.from(value.array)])),
      breath: mask.material.uniforms.breath.value });
    const active = snapshot(); t.controller.setPaused(true); t.run(2);
    expect(snapshot()).toEqual(active);
    t.pointer('pointerdown', 400, 250); t.pointer('pointermove', 560, 250); t.pointer('pointerup', 560, 250); t.step();
    expect(cam.quaternion.toArray()).not.toEqual(active.rotation);
    t.controller.setView('third'); t.step();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    expect(Math.abs(right.y), 'third-person horizon is level').toBeLessThan(1e-6);
  });

  it('lets intermittent exhaled bubbles rise through peripheral first-person vision', () => {
    const t = runtime({ view: 'first' }), bubbles = t.scene.getObjectByName('reef-explore-bubbles');
    const position = bubbles.geometry.attributes.position, size = bubbles.geometry.attributes.reefBubbleSize;
    t.run(1.8); expect(Array.from(size.array).every((v) => v === 0)).toBe(true);
    let visible = 0, peak = 0;
    for (let frame = 0; frame < 35; frame++) {
      t.step(); let active = 0;
      for (let i = 0; i < size.count; i++) {
        if (size.getX(i) <= 0) continue;
        active++;
        const p = new THREE.Vector3().fromBufferAttribute(position, i).project(t.renderer.camera);
        expect(p.toArray().every(Number.isFinite)).toBe(true);
        if (Math.abs(p.x) < 0.97 && Math.abs(p.y) < 0.95 && p.z > -1 && p.z < 1) visible++;
      }
      peak = Math.max(peak, active);
    }
    expect(peak).toBeGreaterThanOrEqual(5); expect(peak).toBeLessThan(22);
    expect(visible, 'exhaust visible through the mask').toBeGreaterThan(0);
    const mask = t.scene.getObjectByName('reef-explore-mask');
    expect(mask.frustumCulled).toBe(false);
    t.canvas.getBoundingClientRect = () => ({ width: 390, height: 600, left: 0, top: 0 }); t.controller.resize();
    expect(mask.material.uniforms.aspect.value).toBeCloseTo(390 / 600, 6);
    expect(t.renderer.camera.fov).toBeGreaterThan(74); expect(t.renderer.camera.fov).toBeLessThanOrEqual(82);
    const fov = t.renderer.camera.fov; t.run(2); expect(t.renderer.camera.fov).toBe(fov);
    t.controller.setView('third'); expect(t.renderer.camera.fov).toBe(60);
  });

  it('keeps first-person eyes on the organism after an assisted swim', () => {
    const t = runtime({ view: 'first' }), target = census(t).find((o) => o.speciesId === 'giant_clam');
    t.controller.swimTo(target.uid); t.run(20);
    const cam = t.renderer.camera, centre = new THREE.Box3().setFromObject(target.object).getCenter(new THREE.Vector3());
    const toward = centre.clone().sub(cam.position); toward.y = 0; toward.normalize();
    const gaze = cam.getWorldDirection(new THREE.Vector3()); gaze.y = 0; gaze.normalize();
    expect(gaze.dot(toward), 'target remains in front of the mask').toBeGreaterThan(0.99);
  });

  it('looks around on a pointer drag, zooms with the wheel in third view only, and never bobs under reduced motion', () => {
    const t = runtime(), cam = t.renderer.camera, dir = () => { cam.updateMatrixWorld(); return cam.getWorldDirection(new THREE.Vector3()); };
    t.run(1);
    const d0 = dir();
    t.pointer('pointerdown', 400, 250); t.pointer('pointermove', 520, 250); t.pointer('pointermove', 640, 270); t.pointer('pointerup', 640, 270);
    t.run(1);
    expect(dir().angleTo(d0)).toBeGreaterThan(0.3);
    const diver = t.scene.getObjectByName('reef-explore-diver'), far0 = cam.position.distanceTo(diver.position);
    const wheel = (dy) => { const e = new WheelEvent('wheel', { deltaY: dy, cancelable: true }); t.canvas.dispatchEvent(e); return e; };
    expect(wheel(200).defaultPrevented).toBe(true); wheel(200); t.run(2);
    expect(cam.position.distanceTo(diver.position)).toBeGreaterThan(far0 + 0.8);
    t.controller.setView('first'); t.step();
    const head = cam.position.clone(); wheel(-200); wheel(-200); t.step();
    expect(cam.position.distanceTo(head)).toBeLessThan(0.05);
    const calm = runtime({ reducedMotion: true }), lively = runtime();
    calm.run(1); lively.run(1);
    const c0 = calm.renderer.camera.position.clone(), l0 = lively.renderer.camera.position.clone();
    calm.run(2.3); lively.run(2.3);
    expect(calm.renderer.camera.position.distanceTo(c0), 'no bob').toBeLessThan(1e-6);
    expect(lively.renderer.camera.position.distanceTo(l0), 'gentle bob').toBeGreaterThan(0.005);
  });

  it('swings the third-person camera after a swimTo so the diver does not hide the target', () => {
    const t = runtime();
    const target = census(t).find((o) => o.speciesId === 'giant_clam');
    t.controller.swimTo(target.uid); t.run(20);
    const cam = t.renderer.camera, diver = t.scene.getObjectByName('reef-explore-diver');
    const centre = new THREE.Box3().setFromObject(target.object).getCenter(new THREE.Vector3());
    const toTarget = centre.clone().sub(cam.position).normalize(), toDiver = diver.position.clone().sub(cam.position).normalize();
    expect(toTarget.angleTo(toDiver) * 180 / Math.PI, 'target clear of the diver').toBeGreaterThan(7);
    cam.updateMatrixWorld();
    const ndc = centre.clone().project(cam);
    expect(Math.abs(ndc.x)).toBeLessThan(0.8); expect(Math.abs(ndc.y)).toBeLessThan(0.8);
  });

  it('puts the camera behind the diver in third view and at the mask in first view', () => {
    const t = runtime();
    t.run(1);
    const cam = t.renderer.camera, diver = t.scene.getObjectByName('reef-explore-diver'), d = t.controller.getState().diver;
    const back = cam.position.clone().sub(diver.position), fwd = new THREE.Vector3(Math.sin(d.headingDeg * Math.PI / 180), 0, -Math.cos(d.headingDeg * Math.PI / 180));
    expect(back.length()).toBeGreaterThan(2);
    expect(back.dot(fwd)).toBeLessThan(0);
    expect(cam.position.y).toBeGreaterThan(diver.position.y);
    expect(diver.visible).toBe(true);
    expect(t.scene.getObjectByName('reef-explore-mask').visible).toBe(false);
    t.controller.setView('first'); t.step();
    expect(t.controller.getState().view).toBe('first');
    expect(cam.position.distanceTo(diver.position)).toBeLessThan(1);
    expect(diver.visible).toBe(false);
    expect(t.scene.getObjectByName('reef-explore-mask').visible).toBe(true);
    const look = new THREE.Vector3(); cam.getWorldDirection(look); look.y = 0; look.normalize();
    expect(look.dot(fwd)).toBeGreaterThan(0.9);
    t.controller.setView('sideways');
    expect(t.controller.getState().view).toBe('first');
    t.controller.setView('third'); t.step();
    expect(diver.visible).toBe(true);
  });

  it('makes a degraded reef look degraded: fewer and paler corals, more algae', () => {
    const healthy = runtime({ site: site({ health: { coralCover: 0.85, bleaching: 0.02, algae: 0.05 } }) });
    const degraded = runtime({ site: site({ health: { coralCover: 0.15, bleaching: 0.55, algae: 0.7 } }) });
    const dh = decor(healthy), dd = decor(degraded), corals = (k) => CORAL_KINDS.reduce((s, n) => s + (k[n] || 0), 0);
    expect(corals(dd)).toBeLessThan(corals(dh) * 0.6);
    expect(dd.algae || 0).toBeGreaterThan((dh.algae || 0) * 2);
    const sh = mean(coralColours(healthy).map(saturation)), sd = mean(coralColours(degraded).map(saturation));
    expect(sd).toBeLessThan(sh * 0.8);
    // School sizes shrink with the reef; the counts of schools stay as asked.
    const sizes = (t) => mean(t.log.filter((e) => e.kind === 'school').map((e) => e.count));
    expect(sizes(degraded)).toBeLessThan(sizes(healthy));
    // Coral species are built 'bleached' or 'dead' (Reef3DSpecies strings) on a degraded reef, 'healthy' on a good one.
    const states = (t) => t.log.filter((e) => e.kind === 'create' && ['brain_coral', 'staghorn_coral'].includes(e.id)).map((e) => e.opts.health);
    expect(states(degraded).some((h) => h === 'bleached')).toBe(true);
    expect(states(degraded).some((h) => h === 'dead')).toBe(true);
    expect(states(healthy).every((h) => h === 'healthy')).toBe(true);
    expect(healthy.log.filter((e) => e.kind === 'create' && e.id === 'parrotfish').every((e) => e.opts.health === 'healthy')).toBe(true);
  });

  it('keeps soft corals and fans present as a healthy reef becomes densely covered', () => {
    const mixed = runtime({ quality: 'low', site: site({ health: { coralCover: 0.7, bleaching: 0, algae: 0.05 } }) });
    const dense = runtime({ quality: 'low', site: site({ health: { coralCover: 1, bleaching: 0, algae: 0.05 } }) });
    const a = decor(mixed), b = decor(dense);
    // A high hard-coral probability used to consume nearly the whole random
    // interval, accidentally excluding the flexible organisms from thickets.
    expect(b.fan).toBeGreaterThanOrEqual(a.fan * 0.6);
    expect(b.soft).toBeGreaterThanOrEqual(a.soft * 0.75);
    const corals = (k) => CORAL_KINDS.reduce((sum, kind) => sum + (k[kind] || 0), 0);
    expect(corals(b)).toBeGreaterThan(corals(a));
  });

  it('grows the restoration patch: young fragments at year 0, overgrown frames after four years', () => {
    const y0 = runtime({ site: site({ restoration: { kind: 'reef_ball', units: 8, yearsSince: 0 } }) });
    const y2 = runtime({ site: site({ restoration: { kind: 'reef_ball', units: 8, yearsSince: 2 } }) });
    const y5 = runtime({ site: site({ restoration: { kind: 'reef_ball', units: 8, yearsSince: 5 } }) });
    const growth = (t) => t.log.filter((e) => e.kind === 'create' && e.id === 'reef_ball').map((e) => e.opts.growth);
    expect(growth(y0).every((g) => g === 0)).toBe(true);
    expect(growth(y2).every((g) => g === 0.5)).toBe(true);
    expect(growth(y5).every((g) => g === 1)).toBe(true);
    const balls = census(y0).filter((o) => o.speciesId === 'reef_ball');
    expect(balls).toHaveLength(8);
    expect(fingerprint(y0).split('|').filter((s) => s.includes('reef_ball'))).toEqual(fingerprint(y5).split('|').filter((s) => s.includes('reef_ball')));
    // Recruits settle on the rubble around the structures as the patch recovers.
    const recruits = (t) => { let n = 0; t.scene.traverse((o) => { if (o.isInstancedMesh && o.userData.decorative && CORAL_KINDS.includes(o.userData.kind)) n += o.count; }); return n; };
    expect(recruits(y5)).toBeGreaterThan(recruits(y0));
    // The placeholder frames carry visibly bigger coral clumps once grown.
    const p0 = runtime({ site: site({ restoration: { kind: 'reef_star', units: 4, yearsSince: 0 } }) }, { species: false });
    const p5 = runtime({ site: site({ restoration: { kind: 'reef_star', units: 4, yearsSince: 5 } }) }, { species: false });
    const size = (t) => { let r = 0; t.scene.traverse((o) => { if (o.isInstancedMesh && o.userData.speciesId === 'reef_star') { o.geometry.computeBoundingBox(); r = Math.max(r, o.geometry.attributes.position.count); } }); return r; };
    expect(size(p5)).toBeGreaterThan(0);
    const vol = (t) => { const box = new THREE.Box3(); t.scene.traverse((o) => { if (o.isInstancedMesh && o.userData.speciesId === 'reef_star') { const b = new THREE.Box3().setFromBufferAttribute(o.geometry.attributes.position); box.union(b); } }); return box.getSize(new THREE.Vector3()).y; };
    expect(vol(p5)).toBeGreaterThan(vol(p0) * 1.3);
  });
});

describe('Reef3DExplore lifecycle', () => {
  it('handles webglcontextlost: prevents default, stops, reports an Error', () => {
    const t = runtime();
    t.step();
    const event = new Event('webglcontextlost', { cancelable: true });
    t.canvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(t.errors).toHaveLength(1);
    expect(t.errors[0]).toBeInstanceOf(Error);
    expect(t.errors[0].message).toMatch(/graphics context/);
    expect(t.frames.size).toBe(0);
    const renders = t.counts.render;
    t.controller.setInput({ forward: 1 }); t.run(1);
    expect(t.counts.render).toBe(renders);
    expect(t.controller.getState().ready).toBe(false);
    t.controller.dispose();
    expect(t.counts.dispose).toBe(1);
    expect(t.counts.forceContextLoss).toBe(0);
  });

  it('removes every listener, stops the loop and frees every resource, once', () => {
    const { T, created, disposed } = trackingThree();
    const t = runtime({ THREE: T });
    expect(t.listenerLog.canvas.size).toBeGreaterThan(8);
    t.run(1);
    t.controller.dispose();
    expect(t.listenerLog.canvas.size).toBe(0);
    const balance = (log) => log.filter(([kind]) => kind === 'add').length - log.filter(([kind]) => kind === 'remove').length;
    expect(balance(t.listenerLog.document)).toBe(0);
    expect(balance(t.listenerLog.window)).toBe(0);
    expect(t.observers[0].disconnected).toBe(true);
    expect(t.frames.size).toBe(0);
    expect(t.counts).toMatchObject({ dispose: 1, forceContextLoss: 1 });
    expect(created.filter((r) => !disposed.has(r)).map((r) => r.type)).toEqual([]);
    const renders = t.counts.render;
    t.run(1); t.key(t.canvas, 'w'); t.controller.setInput({ forward: 1 }); t.controller.swimTo('r1'); t.controller.focusNext();
    expect(t.counts.render).toBe(renders);
    expect(() => t.controller.dispose()).not.toThrow();
    expect(t.counts).toMatchObject({ dispose: 1, forceContextLoss: 1 });
    expect(t.canvas._reef3dExplore).toBeUndefined();
    expect(t.controller.getState().ready).toBe(false);
  });

  it('frees placeholder resources too, and replaces an earlier controller on the same canvas', () => {
    const { T, created, disposed } = trackingThree();
    const t = runtime({ THREE: T }, { species: false });
    const second = t.local.Reef3DExplore.mount(t.canvas, { THREE: { ...THREE, WebGLRenderer: class { constructor() { this.shadowMap = {}; this.info = { render: {} }; } setPixelRatio() {} setSize() {} render() {} dispose() {} forceContextLoss() {} } }, site: site(), quality: 'low' });
    expect(t.counts.dispose).toBe(1);
    expect(created.filter((r) => !disposed.has(r)).map((r) => r.type)).toEqual([]);
    expect(t.controller.getState().ready).toBe(false);
    second.dispose();
  });
});

describe.skipIf(!HAS_SPECIES)('Reef3DExplore with the real Reef3DSpecies', () => {
  it('shares underwater light with organisms without replacing their swimming shaders', () => {
    const t = runtime({ site: site({ population: [{ id: 'anthias', count: 1 }, { id: 'brain_coral', count: 2 }], restoration: null }) }, { species: 'real' });
    const body = t.scene.getObjectByName('anthias-body');
    let coral;
    t.scene.traverse((o) => { if (o.isInstancedMesh && o.userData.speciesId === 'brain_coral') coral = o; });
    const compile = (mesh) => {
      const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
      mesh.material.onBeforeCompile(shader, t.renderer);
      expect(mesh.receiveShadow).toBe(true);
      expect(shader.fragmentShader).toContain('reefLightCover');
      expect(shader.fragmentShader).toContain('exp(-vec3(0.065,0.018,0.008)');
      const ext = shader.uniforms.reefWaterExtinction.value;
      expect(ext.x).toBeGreaterThan(ext.y);
      expect(ext.y).toBeGreaterThan(ext.z);
      expect(ext.z).toBeGreaterThan(0);
      const waterMix = shader.fragmentShader.indexOf('gl_FragColor.rgb=gl_FragColor.rgb*reefTransmission');
      expect(waterMix).toBeGreaterThan(0);
      expect(waterMix).toBeLessThan(shader.fragmentShader.indexOf('#include <tonemapping_fragment>'));
      expect(shader.fragmentShader).not.toContain('#include <fog_fragment>');
      // The same sunlight visibility masks both direct lighting and caustics.
      expect(shader.fragmentShader).toContain('reefCausticStrength*getShadowMask()*');
      expect(shader.fragmentShader.indexOf('#include <shadowmask_pars_fragment>')).toBeGreaterThan(shader.fragmentShader.indexOf('#include <shadowmap_pars_fragment>'));
      expect(shader.fragmentShader.indexOf('getShadowMask()*')).toBeGreaterThan(shader.fragmentShader.indexOf('#include <lights_fragment_end>'));

      expect(shader.vertexShader.match(/varying vec3 vReefWorld;/g)).toHaveLength(1);
      return shader;
    };
    const fishShader = compile(body), coralShader = compile(coral);
    expect(fishShader.uniforms.reefSwim).toBeDefined();
    expect(fishShader.vertexShader).toContain('reefSchoolBeat');
    expect(body.material.customProgramCacheKey()).toContain('organism-water');
    expect(fishShader.uniforms.reefCausticTime).toBe(coralShader.uniforms.reefCausticTime);
    expect(fishShader.uniforms.reefCausticMap).toBe(coralShader.uniforms.reefCausticMap);
    expect(fishShader.uniforms.reefWaterExtinction).toBe(coralShader.uniforms.reefWaterExtinction);
    expect(fishShader.uniforms.reefWaterScatter).toBe(coralShader.uniforms.reefWaterScatter);
    expect(fishShader.uniforms.reefWaterEye.value.toArray()).toEqual(t.renderer.camera.position.toArray());
    t.step();
    const before = fishShader.uniforms.reefCausticTime.value;
    t.run(3);
    expect(fishShader.uniforms.reefCausticTime.value).toBeGreaterThan(before);
  });

  it('builds every requested organism from the species module, tagged, and frees it all on dispose', () => {
    const { T, created, disposed } = trackingThree();
    const t = runtime({ THREE: T, site: site({ health: { coralCover: 0.3, bleaching: 0.4, algae: 0.5 } }) }, { species: 'real' });
    const all = census(t), count = {};
    all.forEach((o) => { count[o.speciesId] = (count[o.speciesId] || 0) + 1; });
    POP.forEach((p) => expect(count[p.id], p.id).toBe(p.count));
    expect(count.reef_star).toBe(10);
    expect(t.warnings.filter((w) => /placeholder/.test(w)), 'no species fell back to a placeholder').toEqual([]);
    t.scene.getObjectByName('reef-explore-organisms').traverse((o) => { if (o.isMesh) expect(typeof o.userData.speciesId, o.name).toBe('string'); });
    t.run(2);
    expect(t.errors).toEqual([]);
    t.controller.dispose();
    expect(created.filter((r) => !disposed.has(r)).map((r) => r.type)).toEqual([]);
  });
});
