// Lane H2 harness: Reef3DExplore with a stubbed WebGLRenderer and a manual clock,
// as in the repo's reef_3d_explore suite, plus the tool's real dive sites.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach } from 'vitest';

// Tests run from the repo root (like every 'stem_lab/...' path in these suites).
const REPO = process.cwd().split(String.fromCharCode(92)).join('/') + '/';
export const THREE = createRequire(import.meta.url)('../../vendor/three-r128/three.min.js');
export const SOURCE = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');
export const SPECIES_SOURCE = readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8');
const TOOL = readFileSync(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'utf8');
const toolWin = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
new Function('window', TOOL)(toolWin);
export const X = toolWin.__RR_TEST_EXPORTS__.coralReef;
export function siteOf(id, over = {}) {
  const s = X.EXPLORE_SITES.find((e) => e.id === id);
  return { seed: s.seed, depthM: s.depthM, health: s.health, population: X.populationFor(s), restoration: s.restoration ? { kind: s.restoration.kind, units: s.restoration.units, yearsSince: 4 } : null, ...over };
}

export const STUB_INFO = {
  clownfish: ['fish', 'pair', 0.09, [1, 15], null], magnificent_anemone: ['invertebrate', 'sessile', 0.6, [1, 20], null],
  blue_tang: ['fish', 'school', 0.25, [2, 25], [6, 16]], brain_coral: ['coral', 'sessile', 1.0, [1, 25], null],
  staghorn_coral: ['coral', 'sessile', 1.2, [1, 20], null], table_coral: ['coral', 'sessile', 1.5, [1, 20], null],
  boulder_coral: ['coral', 'sessile', 1.5, [1, 30], null], giant_moray: ['fish', 'crevice', 2.2, [1, 30], null],
  green_turtle: ['reptile', 'solitary', 1.0, [1, 30], null], hawksbill_turtle: ['reptile', 'solitary', 0.8, [1, 30], null],
  reef_manta: ['fish', 'solitary', 3.5, [1, 40], null], parrotfish: ['fish', 'solitary', 0.45, [1, 25], null],
  bumphead_parrotfish: ['fish', 'school', 0.9, [1, 30], [5, 30]], peacock_grouper: ['fish', 'solitary', 0.4, [1, 40], null],
  cleaner_wrasse: ['fish', 'pair', 0.1, [1, 30], null], cleaner_shrimp: ['invertebrate', 'crevice', 0.05, [5, 40], null],
  crown_of_thorns: ['invertebrate', 'bottom', 0.35, [1, 30], null], sea_fan: ['invertebrate', 'sessile', 1.0, [4, 40], null],
  anthias: ['fish', 'school', 0.1, [3, 30], [18, 44]], giant_clam: ['invertebrate', 'sessile', 0.9, [1, 20], null]
};
export const POP = [
  { id: 'clownfish', count: 2 }, { id: 'magnificent_anemone', count: 1 }, { id: 'brain_coral', count: 4 }, { id: 'table_coral', count: 3 },
  { id: 'green_turtle', count: 1 }, { id: 'hawksbill_turtle', count: 1 }, { id: 'reef_manta', count: 1 }, { id: 'parrotfish', count: 3 },
  { id: 'bumphead_parrotfish', count: 1 }, { id: 'peacock_grouper', count: 2 }, { id: 'cleaner_wrasse', count: 2 }, { id: 'cleaner_shrimp', count: 2 },
  { id: 'crown_of_thorns', count: 2 }, { id: 'giant_moray', count: 1 }, { id: 'anthias', count: 1 }
];
export function stubSite(over = {}) {
  return { seed: 5101, depthM: 9, health: { coralCover: 0.55, bleaching: 0, algae: 0.05 }, population: POP, restoration: null, ...over };
}
export function stubSpecies(log = []) {
  function info(id) { const r = STUB_INFO[id]; if (!r) return null; return { id, group: r[0], habit: r[1], lengthM: r[2], depthM: r[3].slice(), schoolSize: r[4] ? r[4].slice() : null, origin: r[0] === 'fish' || r[0] === 'reptile' ? 'centre' : 'base' }; }
  function body(T, id, length) {
    const root = new T.Group(), geometry = new T.SphereGeometry(Math.max(0.02, length / 2), 8, 6), material = new T.MeshStandardMaterial({ color: 0xff8844 });
    const mesh = new T.Mesh(geometry, material); root.userData.speciesId = id; mesh.userData.speciesId = id; root.add(mesh);
    return { root, mesh, geometry, material };
  }
  return {
    version: '1.0.0', ids: Object.keys(STUB_INFO), info,
    create(T, id, opts) {
      const i = info(id); if (!i) throw new Error('unknown species ' + id);
      log.push({ kind: 'create', id, opts: { ...opts } });
      const b = body(T, id, i.lengthM);
      if (i.group === 'coral' || i.group === 'structure') { b.mesh.position.y = i.lengthM / 4; b.mesh.scale.set(1, 0.5, 1); }
      else if (i.origin === 'base') b.mesh.position.y = i.lengthM / 2;
      return { root: b.root, radius: i.lengthM / 2, update(dt, t, motion) { if (motion) b.root.userData.motion = JSON.parse(JSON.stringify(motion)); }, dispose() { b.geometry.dispose(); b.material.dispose(); } };
    },
    createSchool(T, id, count, opts) {
      const i = info(id); log.push({ kind: 'school', id, count, opts: { ...opts } });
      const root = new T.Group(), geometry = new T.SphereGeometry(i.lengthM / 2, 6, 4), material = new T.MeshStandardMaterial();
      root.userData.speciesId = id;
      for (let k = 0; k < count; k++) { const m = new T.Mesh(geometry, material); m.position.set((k % 5) * 0.2 - 0.4, Math.floor(k / 5) * 0.15, (k % 3) * 0.2); m.userData.speciesId = id; root.add(m); }
      return { root, radius: 0.6, update(dt, t, motion) { if (motion) root.userData.motion = JSON.parse(JSON.stringify(motion)); }, dispose() { geometry.dispose(); material.dispose(); } };
    }
  };
}

const cleanups = [];
afterEach(() => { while (cleanups.length) cleanups.pop()(); });

// species: 'stub' (default), 'real' (the lane's Reef3DSpecies) or false (placeholders).
export function runtime(options = {}, { species = 'stub', source = SOURCE } = {}) {
  const frames = new Map(), timers = new Map(), log = [], warnings = [];
  let serial = 0, timerSerial = 0, clock = 1000, renderer = null;
  class Renderer {
    constructor(params) { renderer = this; this.params = params; this.shadowMap = {}; this.info = { render: { calls: 7, triangles: 1234 } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; }
    setPixelRatio(r) { this.pixelRatio = r; } setSize(w, h) { this.size = [w, h]; }
    render(scene, camera) { this.scene = scene; this.camera = camera; }
    dispose() {} forceContextLoss() {}
  }
  const local = {
    innerWidth: 1280, devicePixelRatio: 1, console: { warn(m) { warnings.push(String(m)); }, error() {} },
    requestAnimationFrame(cb) { const id = ++serial; frames.set(id, cb); return id; }, cancelAnimationFrame(id) { frames.delete(id); },
    performance: { now: () => clock },
    setTimeout(fn, ms) { const id = ++timerSerial; timers.set(id, { fn, at: clock + ms }); return id; }, clearTimeout(id) { timers.delete(id); }
  };
  new Function('window', source)(local);
  if (species === 'real') new Function('window', SPECIES_SOURCE)(local);
  else if (species) local.Reef3DSpecies = stubSpecies(log);
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  document.body.appendChild(canvas);
  const errors = [];
  const controller = local.Reef3DExplore.mount(canvas, { quality: 'low', site: stubSite(), onState: () => {}, onError: (e) => errors.push(e), ...options, THREE: { ...THREE, WebGLRenderer: Renderer } });
  const t = {
    local, canvas, controller, errors, log, warnings,
    get renderer() { return renderer; }, get scene() { return renderer.scene; }, get camera() { return renderer.camera; },
    step(ms = 50) {
      clock += ms;
      for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); }
      const queued = [...frames.values()]; frames.clear(); queued.forEach((cb) => cb(clock));
      // The real renderer runs onBeforeRender for every drawn object; the sediment puffs build there.
      const s = t.scene.getObjectByName('reef-explore-sediment'); if (s) s.onBeforeRender(renderer, renderer.scene, renderer.camera);
    },
    run(seconds, ms = 50) { const n = Math.round(seconds * 1000 / ms); for (let i = 0; i < n; i++) t.step(ms); }
  };
  cleanups.push(() => { try { controller.dispose(); } catch (ignore) {} canvas.remove(); });
  return t;
}
// Every organism once: roots carry userData.exploreUid, instanced groups list theirs.
export function census(t) {
  const out = new Map(), m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  t.scene.traverse((o) => {
    if (o.userData && o.userData.exploreUid) out.set(o.userData.exploreUid, { uid: o.userData.exploreUid, speciesId: o.userData.speciesId, pos: o.position.toArray(), object: o });
    if (o.isInstancedMesh && o.userData.exploreUids) o.userData.exploreUids.forEach((uid, i) => {
      if (out.has(uid)) return;
      m.fromArray(o.userData.exploreMatrices, i * 16); m.decompose(p, q, s); out.set(uid, { uid, speciesId: o.userData.speciesId, pos: p.toArray(), instanced: true, mesh: o, index: i });
    });
  });
  return [...out.values()].sort((a, b) => Number(a.uid.slice(1)) - Number(b.uid.slice(1)));
}
export const puffs = (t) => t.scene.getObjectByName('reef-explore-sediment').userData.puffs.map((p) => ({ ...p }));
export function floorBelow(t, x, z) {
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 5, z), new THREE.Vector3(0, -1, 0));
  const hits = ray.intersectObjects([t.scene.getObjectByName('reef-explore-floor'), t.scene.getObjectByName('reef-explore-bommies')], false);
  return hits.length ? hits[0].point.y : -Infinity;
}
