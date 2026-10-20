// Lane H3 test harness: the explore engine on real three r128 with a stubbed
// WebGLRenderer and a stub Reef3DSpecies, loaded into a fake window the way the
// repo's reef_3d_explore suite does (a trimmed copy of its runtime()).
// REEF3D_EXPLORE_SOURCE points it at a lane copy or a mutation scratch copy.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

export const THREE = createRequire(import.meta.url)('../../vendor/three-r128/three.min.js');
export const SOURCE = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');

const STUB_INFO = {
  clownfish: ['fish', 'pair', 0.09], magnificent_anemone: ['invertebrate', 'sessile', 0.6], blue_tang: ['fish', 'school', 0.25, [6, 16]],
  brain_coral: ['coral', 'sessile', 1.0], staghorn_coral: ['coral', 'sessile', 1.2], parrotfish: ['fish', 'solitary', 0.45],
  sea_fan: ['invertebrate', 'sessile', 1.0], barrel_sponge: ['invertebrate', 'sessile', 1.0], giant_clam: ['invertebrate', 'sessile', 0.9],
  green_turtle: ['reptile', 'solitary', 1.0], reef_star: ['structure', 'sessile', 1.0], reef_ball: ['structure', 'sessile', 1.2],
  coral_tree_nursery: ['structure', 'sessile', 2.6]
};
export const POP = [
  { id: 'clownfish', count: 2 }, { id: 'magnificent_anemone', count: 1 }, { id: 'blue_tang', count: 1 }, { id: 'brain_coral', count: 6 },
  { id: 'staghorn_coral', count: 3 }, { id: 'parrotfish', count: 2 }, { id: 'sea_fan', count: 2 }, { id: 'barrel_sponge', count: 2 },
  { id: 'giant_clam', count: 2 }, { id: 'green_turtle', count: 1 }
];
function stubSpecies() {
  function info(id) {
    const r = STUB_INFO[id]; if (!r) return null;
    return { id, group: r[0], habit: r[1], lengthM: r[2], depthM: [1, 30], schoolSize: r[3] ? r[3].slice() : null };
  }
  return {
    version: '1.0.0', ids: Object.keys(STUB_INFO), info,
    create(T, id) {
      const i = info(id), root = new T.Group(), geometry = new T.SphereGeometry(Math.max(0.02, i.lengthM / 2), 8, 6), material = new T.MeshStandardMaterial({ color: 0xff8844 });
      const mesh = new T.Mesh(geometry, material); root.userData.speciesId = id; mesh.userData.speciesId = id; root.add(mesh);
      if (i.group === 'coral' || i.group === 'structure') mesh.position.y = i.lengthM / 2;
      return { root, radius: i.lengthM / 2, update() {}, dispose() { geometry.dispose(); material.dispose(); } };
    },
    createSchool(T, id, count) {
      const i = info(id), root = new T.Group(), geometry = new T.SphereGeometry(i.lengthM / 2, 6, 4), material = new T.MeshStandardMaterial();
      root.userData.speciesId = id;
      for (let k = 0; k < count; k++) { const m = new T.Mesh(geometry, material); m.position.set((k % 5) * 0.2 - 0.4, Math.floor(k / 5) * 0.15, (k % 3) * 0.2); root.add(m); }
      return { root, radius: 0.6, update() {}, dispose() { geometry.dispose(); material.dispose(); } };
    }
  };
}
export function site(over = {}) {
  return { seed: 7, depthM: 9, health: { coralCover: 0.7, bleaching: 0.05, algae: 0.1 }, population: POP, restoration: null, ...over };
}

const cleanups = [];
export function cleanup() { while (cleanups.length) cleanups.pop()(); }

export function runtime(options = {}, source = SOURCE) {
  const frames = new Map(), timers = new Map(), counts = { render: 0 };
  let serial = 0, timerSerial = 0, clock = 1000, renderer = null;
  class Renderer {
    constructor(params) { renderer = this; this.params = params; this.shadowMap = {}; this.info = { render: { calls: 7, triangles: 1234 } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; }
    setPixelRatio(ratio) { this.pixelRatio = ratio; } setSize(w, h) { this.size = [w, h]; }
    render(scene, camera) { counts.render++; this.scene = scene; this.camera = camera; }
    dispose() {} forceContextLoss() {}
  }
  class FakeResizeObserver { constructor(cb) { this.cb = cb; } observe() {} disconnect() {} }
  const local = {
    innerWidth: 1280, devicePixelRatio: 1, console: { warn() {}, error() {} },
    requestAnimationFrame(cb) { const id = ++serial; frames.set(id, cb); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    performance: { now: () => clock },
    setTimeout(fn, ms) { const id = ++timerSerial; timers.set(id, { fn, at: clock + ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    ResizeObserver: FakeResizeObserver,
    addEventListener(type, fn, o) { window.addEventListener(type, fn, o); },
    removeEventListener(type, fn, o) { window.removeEventListener(type, fn, o); }
  };
  new Function('window', source)(local);
  local.Reef3DSpecies = stubSpecies();
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  document.body.appendChild(canvas);
  const states = [], errors = [];
  const controller = local.Reef3DExplore.mount(canvas, { quality: 'low', site: site(), onState: (s) => states.push(s), onError: (e) => errors.push(e), ...options, THREE: { ...THREE, WebGLRenderer: Renderer } });
  const t = {
    local, canvas, controller, states, errors, counts,
    get renderer() { return renderer; },
    get scene() { return renderer.scene; },
    step(ms = 50) {
      clock += ms;
      for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
      const queued = [...frames.values()]; frames.clear(); queued.forEach((cb) => cb(clock));
    },
    run(seconds, ms = 50) { for (let i = 0; i < seconds * 1000 / ms; i++) t.step(ms); },
    state() { return controller.getState(); },
    b() { return controller.getState().buoyancy; }
  };
  cleanups.push(() => { try { controller.dispose(); } catch (ignore) {} canvas.remove(); });
  return t;
}

// Every organism once, with its world position (roots carry exploreUid; instanced groups list theirs).
export function census(t) {
  const out = new Map(), m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  t.scene.traverse((o) => {
    if (o.userData && o.userData.exploreUid) out.set(o.userData.exploreUid, { uid: o.userData.exploreUid, speciesId: o.userData.speciesId, pos: o.position.toArray() });
    if (o.isInstancedMesh && o.userData.exploreUids) o.userData.exploreUids.forEach((uid, i) => {
      if (out.has(uid)) return;
      m.fromArray(o.userData.exploreMatrices, i * 16); m.decompose(p, q, s); out.set(uid, { uid, speciesId: o.userData.speciesId, pos: p.toArray() });
    });
  });
  return [...out.values()].sort((a, b) => Number(a.uid.slice(1)) - Number(b.uid.slice(1)));
}
export function floorBelow(t, x, z) {
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 5, z), new THREE.Vector3(0, -1, 0));
  const hits = ray.intersectObjects([t.scene.getObjectByName('reef-explore-floor'), t.scene.getObjectByName('reef-explore-bommies')], false);
  return hits.length ? hits[0].point.y : -Infinity;
}
